# BFF deployment/security decisions D1–D6

2026-09-27. **D1–D6 PARTIAL**: approved policy values are frozen and repository
bindings are implemented; deployment and operational qualification remain release
gates. No authentication route, cookie issuer or UI authentication is active.

## Evidence and authority

Inspected `docs/DESIGN.md`, `ARCHITECTURE.md`, `PRD.md`, **`RULES.md`**, the BFF
contract and transition primitives, existing API client/storage/AppShell/routes,
scripts and tests. `RULES(1).md` does not exist and is not authoritative.
The Phase 12B PDF is supporting specification material; the user's current task
sets this milestone's scope. Existing tenant modules and mock services are intact.

Spring source at `D:/SCHOOL ERP SYSTEM/BACKEND/schoolerp` remains authoritative:
PlatformAuthController/AuthService, PlatformRefreshTokenService,
PlatformJwtProperties, tenant AuthController/AuthService/MembershipSessionService,
RefreshTokenService, JwtProperties, SecurityConfig, RateLimitKeyResolver and
application.properties; see [verified endpoint contract](PLATFORM-API-CONTRACT.md).
Platform login/refresh/logout/me are `/api/platform/auth/{login,refresh,logout,me}`;
Tenant uses `/api/auth/{login,refresh,logout,me}`. Tenant selection/switch and
membership listing exist but are not registered as live BFF handlers.

Platform access defaults to 5 minutes, fixed backend session and refresh to 12
hours. Tenant access defaults to 10 minutes, refresh to 30 days and rotates with
a new expiry; its browser absolute lifetime is independently bounded. Selection
is five minutes. Platform verifies persisted session/account credential and
security versions; tenant verifies its account/membership/security state. Tenant
logout revokes its refresh family, not necessarily an already-issued access JWT.
Neither `/me` supplies an absolute session deadline. Spring rejection wins over
all BFF metadata. No Spring source or security settings were changed.

## Frozen decisions

| Decision | Value | Repository evidence | Runtime gate |
| --- | --- | --- | --- |
| D1 | GCP `asia-south1`; global external HTTPS ALB + Armor; Next ingress `internal-and-cloud-load-balancing`; Spring `internal`; Direct VPC egress | Explicit origin config, deployment checklist | Project, services, network, IAM, DNS, TLS, ingress unverified |
| D2 | Cloud SQL PostgreSQL 17+ HA; dedicated BFF DB/schema `schoolerp_bff` | SQL migration; pg adapter; real PostgreSQL transaction tests | Cloud SQL provisioning, primary-only routing, HA durability/failover unverified |
| D3 | Platform idle 30m/absolute 12h; Tenant idle 8h/absolute 30d; pre-auth 10m; selection 5m; lead/skew 60s | Typed config, lifetime helper, store fences, tests | Compare deployed Spring TTLs; clock monitoring; no live session issuance |
| D4 | AES-256-GCM pair envelope + KMS-wrapped random data key; pinned KMS version; Secret Manager runtime config | AEAD and Cloud KMS boundary; tamper/AAD tests | Actual keys, IAM, KMS calls, restore and key-loss drills unverified |
| D5 | Cloud Armor edge policies; preserve Spring limits; no browser proxy identity | Fresh-header client, policy below | Preview/load tests, trusted proxy model and rate-limit aggregation unresolved |
| D6 | Explicit startup-validated limits below; one-send refresh | Config, HTTP limits, durable coordinator, tests | Capacity, real latency, clock and multi-instance failure tests |

Production target origin: `https://schoolerp.com`. Staging target:
`https://staging.schoolerp.com`. Local: `http://localhost:3000`. **DNS ownership,
records and certificates have not been verified.** Origins come only from explicit
deployment configuration. Host/Origin/Referer/forwarding headers do not configure
either destination or authority.

```text
Browser
  ↓
External HTTPS Application Load Balancer (TLS)
  ↓
Cloud Armor (attached to LB backend service)
  ↓
Next.js + BFF — Cloud Run asia-south1
  ↓ private/VPC
Spring Boot — internal Cloud Run asia-south1
  ↓
PostgreSQL — ERP business data (Spring only)

Next.js BFF
  ↓ Direct VPC egress
BFF Session Store — separate Cloud SQL PostgreSQL HA boundary
  ↓ encrypted envelopes; BFF performs wrap/unwrap
Cloud KMS — environment-specific key version
```

The second diagram is a logical security dependency: PostgreSQL does not call
KMS. The BFF encrypts/decrypts outside database transactions; only ciphertext is
stored. It never queries ERP business tables.

Google documents the ingress setting and internal connectivity requirements in
[Cloud Run ingress](https://docs.cloud.google.com/run/docs/securing/ingress) and
[private networking](https://docs.cloud.google.com/run/docs/securing/private-networking).
Direct VPC egress is outbound connectivity, not Direct VPC ingress. Verify the
subnet/private Google access/egress route combination in the actual project.
Private network access and IAM invocation are separate controls. The implemented
server-only service-auth provider uses a workload ID token in
`X-Serverless-Authorization`, preserving Spring's bearer Authorization header;
see [service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).

## D2 persistence and failure behavior

`SessionStore` extends the original `BrowserSessionStore`. The pure Milestone 0.5
transitions remain separate. `PostgresSessionStore` uses `pg`, primary reads,
`SELECT … FOR UPDATE`, expected row/credential versions, a unique context/hash
key, transactions and synchronous commit. PostgreSQL 17 `transaction_timeout`
bounds the whole transaction; statement/lock timeouts are also set. Connection
acquisition is bounded. No automatic transaction retry or process-local authority.
Milestone 2 qualifies this with separate Node processes. Live reads use primary
statement snapshots; mutations and expired-row rechecks retain row locks. Every
transaction requires READ WRITE so the read optimization cannot enable hot-standby
session authority. See the [Milestone 2 evidence and remaining gaps](../phase-12b-milestone-2.md).

The JSON record has a strict write projection plus explicit generated SQL columns
for hash/context/status/schema/row/credential versions, creation/access/idle/
absolute/access-token times, identity binding, encrypted envelope/reference,
CSRF verifier/version, refresh owner/fence/phase/lease in `refresh_attempt`, and
tombstone expiry. Identity is only account+backend session for Platform or
account+tenant+membership for Tenant. No profile, role catalog or business data.
Hash is SHA-256 of context and random session ID; raw cookies/IDs are never stored.

Create uses a unique constraint. CAS checks the locked authoritative row's version
and credential generation. Atomic rotation inserts the replacement and tombstones
the old record in one transaction; an injected failure after insertion proves
rollback of both changes. Expiry uses database time after row lock acquisition,
not a caller-supplied future clock. Cleanup cannot authorize an expired record.
Tombstones clear encrypted credentials and are retained 15 minutes; cleanup is an
explicit operation, not a configured background scheduler in this milestone.

Credentials and envelope reference commit with the new generation in one row.
Ciphertext produced for a losing CAS never becomes an orphan database row: discard
it from memory. External envelope storage is not used. Session deletion removes
the last durable ciphertext reference. Database backups may retain old ciphertext
under the backup retention policy; restrict and expire those backups separately.

Refresh reserves one owner, durably marks DISPATCHED, reads it back, then sends
once. Competing workers poll store state for at most five seconds. Expired owner
leases invalidate rather than permit takeover. An uncertain CAS reads the primary
before proceeding; failed reconciliation denies the operation. Network ambiguity,
429, 5xx, malformed DTO or identity mismatch invalidates; a store outage after send
leaves DISPATCHED, which cannot authorize a second send and expires to INVALID.
Logout fencing prevents a late replacement from restoring a deleted session.
In-flight Spring requests may still finish; local invalidation is not proof of
backend revocation.

Cloud SQL HA uses synchronous zonal replication before acknowledging a commit,
according to [Google's HA documentation](https://docs.cloud.google.com/sql/docs/postgres/high-availability).
That provider statement is **not** a tested failover result for this project.
Do not read from replicas or promote an asynchronous/older restored copy and reuse
sessions. On rollback/restore, quarantine the old session database, invalidate all
sessions, provision a fresh empty session boundary, and require reauthentication.
No automatic disaster-recovery procedure is implemented.

## D3/D6 runtime configuration

All nondevelopment values are required. Missing, noninteger, zero, negative,
unbounded or inconsistent limits fail validation. Database URL TLS overrides are
rejected; deployed SQL uses CA-verified TLS. Missing origin, upstream, database CA,
database URL, KMS resource, or cookie mode fails. Production cannot select the
development profile. The template is deliberately incomplete without real inputs.

| Variable | Approved value |
| --- | ---: |
| BFF_UPSTREAM_CONNECT_TIMEOUT_MS | 2000 |
| BFF_UPSTREAM_RESPONSE_TIMEOUT_MS | 10000 |
| SESSION_STORE_CONNECT_TIMEOUT_MS | 2000 |
| SESSION_STORE_OPERATION_TIMEOUT_MS | 1000 |
| SESSION_STORE_POOL_MAX | Required deployment sizing; local test profile 10 |
| SESSION_STORE_POOL_IDLE_MS | Required deployment sizing; local test profile 10000 |
| SESSION_STORE_POOL_LIFETIME_MS | Required deployment sizing; local test profile 300000 |
| KMS_OPERATION_TIMEOUT_MS | 2000; existing SDK deadline now configuration-backed |
| REFRESH_LEASE_MS | 30000 |
| REFRESH_WAITER_TIMEOUT_MS | 5000 |
| TOMBSTONE_RETENTION_MS | 900000 |
| PREAUTH_TTL_MS | 600000 |
| MEMBERSHIP_SELECTION_TTL_MS | 300000 |
| REFRESH_LEAD_MS | 60000 |
| CLOCK_SKEW_MS | 60000 |
| AUTH_REQUEST_MAX_BYTES | 65536 |
| NORMAL_BFF_REQUEST_MAX_BYTES | 1048576 |
| AUTH_RESPONSE_MAX_BYTES | 262144 |
| PLATFORM_IDLE_TIMEOUT_MS | 1800000 |
| PLATFORM_ABSOLUTE_TIMEOUT_MS | 43200000 |
| TENANT_IDLE_TIMEOUT_MS | 28800000 |
| TENANT_ABSOLUTE_TIMEOUT_MS | 2592000000 |

Next's installed instrumentation guide says `register` runs before a server is
ready. `src/instrumentation.ts` validates at production startup and emits only
environment, cookie mode and numerical limits. It does not connect to KMS/SQL,
issue cookies or activate handlers. Builds require no runtime secrets. An
unconfigured development mock UI remains available; opting into local BFF config
uses explicitly documented local numerical values, never a default secret.

The installed Next version printed a ready banner and kept a listener open after
a rejected instrumentation promise in a startup probe. The hook therefore
explicitly exits on configuration failure. A repeated production startup probe
exited with code 1 and only the safe configuration-failure message. A ready banner
alone is not evidence of a healthy deployment. Node 22+ is required by the KMS SDK;
local validation used Node 22.13.1.

Access-token `expiresIn`/`expiresInSeconds` is used only for access expiry. The
lifetime helper derives absolute deadlines from session creation and configured
context policy. Refresh never advances idle/absolute deadlines. Approved activity
may advance idle only within the original absolute bound; future routes must use
that helper. Pre-auth/selection/normal-business request limits are configured but
their handlers do not exist yet. Monitor latency, store failures/CAS conflicts,
clock offset, refresh uncertainty and rate-limit outcomes without identifiers,
headers, credential bodies or raw errors. Metrics/exporter wiring remains work.
Milestone 2 supplies optional fixed-label latency/outcome observer callbacks for
store transactions and KMS calls; no payload or raw error is accepted by them.
Exporter/alert wiring remains deployment work. Pre-auth and membership-selection
records still do not exist in the authenticated-session adapter; their configured
TTLs alone are not proof of persistent lifecycle/consumption behavior.

## D4 encryption and operations

Each pair uses a new random 256-bit data key, 96-bit nonce and 128-bit GCM tag.
AAD binds format version, environment, context, session hash and credential
version. Cloud KMS wraps the data key with the same AAD. Database stores key ID,
wrapped data key, nonce, ciphertext and tag. The application performs AEAD;
database encryption-at-rest or KMS alone is not the envelope implementation.
See [Google envelope encryption](https://docs.cloud.google.com/kms/docs/envelope-encryption).

- Security/platform operations owns KMS lifecycle and approved rotations; BFF
  runtime only encrypts/decrypts its environment's key. Migration/DB roles have no
  KMS role. Use workload identity/ADC and narrowly scoped Secret Manager access.
- Development, staging and production use separate resources, databases and
  identities. Unit tests inject an ephemeral test-only wrapper, not a runtime key.
- Key version is pinned. No automatic rotation. This implementation intentionally
  rejects an envelope from another key version. A planned rotation must drain/
  invalidate existing sessions and switch the pinned version, or first implement
  and review an explicit read-key allowlist/migration. Do not silently repoint keys.
- Keep old versions recoverable for approved backup retention; restrict key
  destruction separately from runtime permissions. KMS keys are not exported into
  database backups. Key loss is fail-closed reauthentication, not plaintext fallback.
- A restore must not resurrect refresh dispatch history. Invalidate restored
  sessions even if keys remain decryptable. Verify key access and backup recovery
  in staging, with no production credentials copied to test environments.
- Buffers are wiped where practical; JavaScript strings and runtime memory cannot
  provide guaranteed zeroization. Disable heap/body/header capture in telemetry.

## D5 edge policies and proxy assumptions

Separate Cloud Armor rules, ordered most-specific first, with preview initially:

| Class | Match target | Initial preview threshold per edge client IP |
| --- | --- | --- |
| Login | both BFF namespaces, exact `/login`, POST | 10/min |
| Refresh | both exact `/refresh`, POST | 60/min |
| Other auth | security bootstrap, logout, membership operations | 60/min |
| High-risk mutations | explicitly registered future admin/business mutations | 60/min |
| General | remaining traffic, including read polling | 600/min |

These are starting **test proposals**, not claims of an enforced policy. Operators
must evaluate NAT/shared-school traffic, abuse, false positives and quota before
enforcement. Use edge-derived client IP, not a user-supplied header; no XFF-based
authentication or tenant authority. Preview itself does not block traffic.
See [Cloud Armor rate limiting](https://docs.cloud.google.com/armor/docs/rate-limiting-overview).

Spring remains enabled: Platform login 5/min, refresh 30/min, other mutation
60/min; Tenant login 10/min, refresh/logout 60/min, discovery 30/min,
selection/switch 20/min (checked-in defaults). The servlet remote address may be
the BFF. Rate-limit collapse is an unresolved deployment gate. Verify the full
ingress path before any trusted-proxy configuration change; do not forward a
browser X-Forwarded-For as authority or simply disable Spring limits.

## HTTP foundation and remaining gates

Server-only SpringClient accepts context plus a registered operation, never a URL
or method from the caller. It uses core Node HTTP with fixed configured origin,
separate connect and total response deadlines, no redirects, no retry, fresh
headers, request/streamed response limits and JSON parsing. Success bodies remain
server-only; future handlers must project safe DTOs, never forward raw results.
Only safe cache/referrer headers and bounded integer Retry-After survive.
Problem normalization preserves known 400/401/403/404/409/429/500 and known codes,
with generic messages; no upstream detail/path/stack/field message reflection.
BFF-owned CSRF/session/refresh/store/upstream codes are defined separately.

The refresh broker validates token shape, queries existing `/me`, checks the
persisted identity binding, encrypts the new pair and commits via the coordinator.
Tests use a local HTTP fixture and injected broker failures, not live Spring.
There is no generic proxy, business endpoint transport, selection/switch handler,
OAuth callback, cookie issuance or UI authentication. Milestone 1 implements the
service-identity provider and request/response validators with deterministic tests;
see the [repository report](../phase-12b-milestone-1.md). Production requires explicit
`BFF_SERVICE_AUTH_MODE=cloud-run` and `BFF_CLOUD_RUN_AUDIENCE`. Live IAM transport
verification and authentication route integration remain pending. A successfully
validated config is not a connectivity probe.

Release verification still requires actual GCP project/service IDs, DNS ownership,
certificates, LB/Armor policy, default URL bypass testing, internal Spring access,
Cloud SQL HA + TLS + least-privilege grants, KMS/Secret Manager access, observed
clock bounds, deployed Spring lifetimes, multi-process/multi-instance failover,
store rollback drill, browser E2E and real Spring integration. No remote resources
were provisioned or applied here.

Dependency release gate: the network-enabled `npm audit --omit=dev --json`
reported 31 production-tree advisories (28 moderate, 2 high, 1 critical) in the
existing Next/Tiptap/sharp tree. None were attributed to the added pg/KMS packages.
These packages were not upgraded in this scoped foundation change; dependency
remediation and regression testing are required before production release.

## Security review: control, test, limitation

| Threat | Implemented control | Evidence/test | Remaining limitation |
| --- | --- | --- | --- |
| Credential leakage | Server-only modules; strict persistence/projection; AEAD | AEAD roundtrip/AAD tests; SQL write projection; UI import audit | Live logs/APM and heap capture unverified |
| CSRF | Exact origin, Strict cookies, synchronizer primitive | Existing cookie/CSRF tests | No live routes or browser E2E |
| XSS-assisted actions | HttpOnly keeps token material out of JS | Cookie/projection tests | Same-origin XSS can act as user; CSP/UI review still needed |
| SSRF | Configured origin + registered operations | Invalid URL/host/method and fixed-path fixture | VPC egress restrictions unverified |
| Arbitrary proxying | No catchall or user URL | Registry tests; route audit | New mappings require review |
| Forged headers | Reject browser bearer/tenant authority, fresh headers | HTTP fixture sees no Cookie/Origin/CSRF/XFF | Runtime ingress config unverified |
| Tenant context confusion | Backend identity binding + fixed namespace | Wrong-context credential/store tests | Live switch integration deferred |
| Platform/Tenant session confusion | Separate cookie names, hashes, credentials | Existing reciprocal cookie and context tests | Backend cross-plane E2E pending |
| Refresh replay | DISPATCHED before single send, no takeover | PostgreSQL ten-contender + uncertainty tests | HA acknowledged-write loss must be ruled out |
| Refresh race | Locked CAS, version/generation/owner fences | Ten contenders on separate pools; stale owner/version | Separate Cloud Run instances untested |
| Logout race | LOGGING_OUT/DELETED fence, encrypted pair removal | Logout during/after refresh tests | Cannot cancel already-running Spring work |
| Cookie theft | Secure/HttpOnly/Strict, finite independent deadlines | Cookie and lifetime tests | Stolen opaque cookie remains a bearer credential |
| Cookie tampering | Random opaque ID, context hash lookup | Format/duplicate/missing lookup tests | Browser issuance intentionally absent |
| Store outage | Safe error, no local fallback, no uncertain send | CAS failure + bounded lock test | Real outage/failover chaos pending |
| Store rollback | Synchronous commit; restore invalidation procedure | Local rollback injection test | Provider rollback/restore drill pending |
| Key loss | Decrypt fails closed | Wrong-key test | Live KMS loss drill pending |
| Key rotation | Pinned ID, no automatic key migration | Wrong-version envelope rejection | Rotation invalidation procedure not exercised |
| Cache leakage | Private no-store; safe response headers | HTTP response/header tests | CDN/LB cache bypass verification pending |
| Log leakage | Generic errors, config allowlist, no driver error logging | Error-redaction/config projection tests | Infrastructure log redaction pending |
| Rate-limit collapse | Armor policy proposal, unchanged Spring controls | Source audit; safe 429/Retry-After test | Trusted proxy/load testing is a release blocker |
| Redirect abuse | Core HTTP follows none; all 3xx rejected | Local redirect fixture; safe returnTo tests | LB redirect/certificate verification pending |

## Progression

Milestone 1 — HTTP Foundation completion → Milestone 2 — Production Session Store
Adapter qualification (adapter code now exists) → Milestone 3 — Platform
Authentication. Do not skip to UI authentication. Runtime evidence and final
command results are recorded in the appended Milestone 0.5 follow-up.
