# Phase 12B — Milestone 1: HTTP Foundation Completion

2026-09-27. Scope: repository HTTP foundation only. No authentication routes,
login/dashboard UI, cookies, tenant authentication integration or Spring changes.
The user's clarification permits required-but-unset production configuration and
deterministic local tests. No deployment value or cloud credential was invented.

## Repository status

| Item | State |
| --- | --- |
| HTTP foundation implemented | YES |
| Service-auth abstraction | IMPLEMENTED |
| Production configuration validation | IMPLEMENTED |
| Deterministic tests | PASS |
| Milestone 1 repository implementation | COMPLETE |
| Production qualification | NOT QUALIFIED — PENDING |

## Inspection and authority

Inspected existing D1–D6 source/configuration, session-store/KMS/refresh boundaries,
tests/scripts, route structure, deployment documents, `docs/ARCHITECTURE.md`,
`PRD.md`, `DESIGN.md` and **`RULES.md`**. `RULES(1).md` does not exist. The Phase 12B
PDF was read as reference material; its broader UI/authentication sequence does
not override this milestone's explicit scope. Installed Next 16.3 BFF and
instrumentation guides were used. Existing uncommitted D1–D6 work was preserved.

The backend remains `D:/SCHOOL ERP SYSTEM/BACKEND/schoolerp`. Rechecked the auth
controllers, DTOs, security/rate-limit contracts and request-ID filters against
[PLATFORM-API-CONTRACT.md](frontend/PLATFORM-API-CONTRACT.md). No new endpoint,
permission, pagination or idempotency guarantee is assumed. Authentication
operations have no pagination or retry/idempotency guarantee. Spring remains the
authority for identities, JWTs, sessions, security versions, permissions and RLS.

## Architecture and ownership

```text
Browser-facing boundary (test-scoped integration only)
  → existing Origin/CSRF policy + bounded JSON reader
  → trusted server context and credential (future route's session resolution)
  → existing explicit operation registry
  → request DTO validation
  → server-generated UUID request ID
  → service identity provider
  → existing fixed Spring HTTP client, one send
  → bounded response parsing + operation-specific validation
  → explicit safe identity projector / safe error
```

`SpringClient` remains the only upstream transport. The Google library fetches an
ID token; its HTTP request/retry helpers are **not** used for Spring requests.
Node core HTTP follows no redirects and performs no authentication retry.
PostgreSQL coordination, encrypted session storage and pure transitions were not
replaced or extended. There is no global session map or refresh lock.

### Service identity

Production/staging require `BFF_SERVICE_AUTH_MODE=cloud-run`, a configured
`BFF_SPRING_ORIGIN`, and an explicit `BFF_CLOUD_RUN_AUDIENCE`. Audience is never
derived from browser headers or guessed from the request origin. Operators must
provide the receiving Cloud Run service URL or a registered custom audience.
The destination and audience may differ for reviewed routing configurations.

The server-only Google provider uses Application Default Credentials/workload
identity through `google-auth-library`. It acquires a Google-issued ID token and
checks bounded format, RS256, issuer, audience and expiry. These local claim
checks are not signature verification: the token originates from the trusted SDK,
and Cloud Run verifies its signature and IAM authorization on invocation.
No service-account key file or new credential is created by this milestone.

Headers are deliberately separate:

| Header | Source and purpose |
| --- | --- |
| `X-Serverless-Authorization` | Server service-identity provider; Cloud Run invocation |
| `Authorization` | Trusted context-tagged user access token; only `/me` and logout |
| `X-Request-ID` | Fresh server-generated UUID v4 for each upstream operation |
| `Accept`, `Content-Type` | Registered JSON transport constants |
| Host / Content-Length | Node transport, derived from configured URL/payload |

This follows [Google's service-to-service authentication guidance](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).
Service identity does not establish Platform Admin or Tenant user authority.
Cloud Run Invoker grants, audience registration and private ingress still need
deployment verification. No IAM permission was created or relaxed.

`local-test` mode requires development plus an explicit loopback destination and
an injected test provider. There is no built-in permissive provider and no
production test-mode fallback. Test credentials and test-only audience bindings
are synthetic fixtures, not purported GCP resources or deployment values. The
checked-in deployment template keeps origin and audience empty.

### Operation registry

The existing registry now records stable IDs, fixed method/path, body policy,
user/service authentication, success status/content type, centralized limit keys,
browser CSRF requirement and response policy. `PLATFORM` and `TENANT` remain
separate namespaces. Context is selected by trusted server code, never a request
body/header/query parameter. No arbitrary method, host, port, scheme, path or URL
parameter is accepted by the transport.

| Platform operation ID | Method/path | Request | Success | User auth / browser projection |
| --- | --- | --- | --- | --- |
| PLATFORM_AUTH_LOGIN | POST `/api/platform/auth/login` | Exact email/password object | 200 JSON token DTO | No user bearer; server-only credentials |
| PLATFORM_AUTH_REFRESH | POST `/api/platform/auth/refresh` | Exact refreshToken object | 200 JSON token DTO | Body credential; server-only credentials |
| PLATFORM_AUTH_LOGOUT | POST `/api/platform/auth/logout` | Exact refreshToken object | 204 empty | Platform bearer; no raw response projector |
| PLATFORM_AUTH_SESSION | GET `/api/platform/auth/me` | No body | 200 JSON identity DTO | Platform bearer; explicit safe session projector |

Tenant's existing equivalent registry entries still map to `/api/auth/*`, with
its distinct expiry/identity/selection response schemas. These validators preserve
the existing transport contract; no tenant login/selection/switch flow is enabled.
No additional business operations were added.

### Requests and responses

Unknown request fields are rejected. Platform email/password bounds match the
verified DTO; refresh tokens have a 512-character BFF limit. Tenant's backend has
no field max for refresh, so this is explicitly a conservative BFF bound. Generic
client headers are never copied. Browser Authorization, service auth, tenant,
membership and platform authority headers are rejected; forwarding/Referer/Cookie/
method-override/correlation headers are ignored rather than trusted. Host, when
provided, must match the explicitly configured web origin.

The reusable browser mutation reader enforces POST, exact Origin, existing
synchronizer-token/Fetch Metadata policy, JSON type, declared and streamed size,
finite read deadline and safe parse errors. It does not resolve sessions or issue
cookies; future handlers must supply trusted context and the server-held proof.
Unsupported browser content type fails the existing CSRF policy with 403. Direct
server transport input with a non-JSON content type is rejected with 415.

Successful upstream DTOs are validated and reconstructed by allowlist. `/me`
validates UUIDs, context-specific identity, roles and permissions. Token responses
validate format/type/expiry and remain server-only. Tenant selection responses
also remain server-only. Unknown fields are discarded. No generic successful
body forwarding function exists. Browser session projection excludes tokens,
envelopes, service identity, backend session ID, assurance and unexpected fields.

Responses enforce exact success status and JSON type, reject compressed/unknown
encodings, count streamed bytes, bound JSON parsing input and reject all 3xx.
Operation-specific request/response caps and connect/total-response deadlines use
the existing typed configuration. Credential acquisition is bounded by the connect
budget and included in the total request deadline. A late provider result cannot
dispatch Spring traffic. SDK credential acquisition may finish after caller
timeout; it cannot cause a late Spring request. No request is retried.

Spring 400/401/403/404/409/429/500 and approved codes retain safe normalization.
Raw detail/message/path/stack/trace/field errors are not reflected. BFF failures
use the same `BffError` model, extended with safe request ID and `INVALID_REQUEST`.
Request size/type/method/read-deadline rejection uses 413/415/405/408 where relevant.
Only private/no-store, referrer policy, Vary, generated request ID and validated
integer Retry-After are returned; upstream cookies/locations/security metadata are
stripped. Neither client nor service provider logs credentials or raw exceptions.

### Correlation limitation verified in Spring source

Both Spring context cleanup filters generate a new UUID, ignore incoming
`X-Request-ID`, and expose the generated value as their response ID/traceId. BFF
propagates its own generated ID but returns that same BFF ID downstream rather
than trusting the upstream header. **Cross-service log correlation is not yet
established by Spring.** A future reviewed backend observability change may accept
trusted incoming IDs or record both. No security identity is inferred from an ID.

## Test-scoped integration

`tests/bff-http-foundation.test.mjs` constructs a handler outside `src/app`. It
uses the real browser boundary and HTTP client, fixed test-only trusted credential,
an injected deterministic service provider and a local HTTP response fixture.
It exercises mutation/CSRF validation → authenticated local send → safe identity
projection. Forged cookies do not supply the user credential. It is not a live
cookie/session resolver or a claim of authentication-route completion.

Tests cover configuration mode/audience requirements, provider absence/failure/
expiry/mismatch/injection/deadline, separate service/user headers, fixed operations,
forged headers, request DTO/size/type rejection, malformed/oversized/unexpected
responses, safe projection/error leakage, generated correlation, CSRF/cookie
primitives and connect/response/read timeouts. Existing PostgreSQL tests continue
to cover durable refresh/CAS/logout behavior; they do not qualify Cloud SQL HA.

## Exact Milestone 1 file changes

| File | Purpose |
| --- | --- |
| `src/server/bff/config.ts` | Required service-auth mode/audience; explicit local-test restrictions |
| `src/server/bff/service-identity.ts` | Server-only Google provider and deterministic provider interface |
| `src/server/bff/security-policy.ts` | Extended existing registry metadata and rejected authority headers |
| `src/server/bff/upstream-contract.ts` | Request/success validators and safe identity projector |
| `src/server/bff/spring-client.ts` | Service header, correlation, validated DTOs and total deadline |
| `src/server/bff/browser-boundary.ts` | Bounded CSRF-protected reader and safe Response helpers; no route |
| `src/server/bff/errors.ts` | Reuse error model with request ID and invalid-request code |
| `tests/helpers/bff-loader.mjs` | Module caching, Web Request/Response globals and test fixtures |
| `tests/bff-foundation.test.mjs` | Adapt existing HTTP fixtures to required identity/validated response |
| `tests/bff-http-foundation.test.mjs` | New Milestone 1 deterministic security/integration suite |
| `package.json` | Direct existing Google-auth dependency; include HTTP suite and focused command |
| `package-lock.json` | Direct dependency declaration without unrelated upgrades |
| `deploy/bff/runtime.env.template` | Cloud Run mode and intentionally empty audience |
| `deploy/bff/README.md` | Runtime inputs and qualification instructions updated |
| `docs/frontend/PLATFORM-API-CONTRACT.md` | Source-confirmed request-ID behavior and foundation coverage |
| `docs/frontend/BFF-SESSION-CONTRACT.md` | Current HTTP foundation cross-reference; release gates retained |
| `docs/frontend/BFF-DEPLOYMENT-DECISIONS.md` | Implemented service-auth boundary distinguished from live verification |
| `docs/phase-12b-milestone-1.md` | Existing report moved from `docs/phases/` to the requested path and finalized |

The Google auth SDK was already installed transitively via KMS at 11.1.0. It is
now a pinned direct dependency because production code imports its supported ID
token API. Node built-ins remain the HTTP transport. No unrelated dependency
upgrade or advisory remediation was mixed into this milestone.

## Validation

| Command | Result |
| --- | --- |
| `npm test` | PASS: 82 tests, 0 failed/skipped |
| `npm run test:bff` | PASS: 56 tests, 0 failed/skipped |
| `npm run test:bff:http` | PASS: 21 tests, 0 failed/skipped |
| `npm run test:bff:postgres` | PASS: 17 tests (16 cases plus parent), disposable local PostgreSQL 17 |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS: 0 errors; one existing unused `isSameScope` warning in `school-erp-documentation/code/examples/tenant-scoped-query.ts:8` |
| `npm run build` | PASS: production build and page generation |
| `git diff --check` | PASS |

Windows sandbox child-process restrictions caused `spawn EPERM`; approved execution
outside the sandbox passed. This was an execution-environment restriction, not a
hidden or skipped failing test. The final extra enum/UUID/pagination-field assertions
passed in the focused suite and the full regression/BFF suites were rerun afterward.
The final PostgreSQL rerun initially returned `ECONNREFUSED` because the disposable
fixture was absent. Recreating the documented loopback-only container resolved
the environment issue; all 17 tests then passed without code or test weakening.
Authentication DTOs have no pagination or role-selection input; unexpected `page`
and `role` fields are rejected rather than inventing business endpoint validators.

All **95 tracked application pages** are present in the production app-paths
manifest; no route handler exists under `src/app`. No tenant application, component,
feature or client-library changes were made. Backend working tree remains clean.
Source import checks found no BFF/Google-auth imports in those browser layers.
Built browser JavaScript contains none of the checked service-header, server-config,
Google-auth or test-credential markers. These checks supplement `server-only`
boundaries; they are not a claim that arbitrary future code cannot leak a secret.
No pre-existing package version changed in the lockfile; Google auth is explicitly
pinned at the already-installed 11.1.0. Earlier D1–D6 changes remain in the working
tree and are not misreported as newly implemented Milestone 1 work.

## Final security review

| Risk | Control and evidence | Remaining limitation |
| --- | --- | --- |
| Arbitrary proxy / SSRF / redirects | Fixed context/method/path registry; override and 3xx rejection tests | Approved production destination and network policy unverified |
| Forged headers / service-user confusion | Fresh headers; rejected browser authority; separate service and user tokens; provider tests | Live Cloud Run token validation and Invoker grants unverified |
| Credential / JWT / refresh-token leakage | Server-only modules; validated response allowlists; malicious-extra-field tests; browser-bundle scan | Future handlers must use safe projectors; no live browser E2E |
| Platform/Tenant confusion | Context-specific registry, credentials, DTOs and cookie tests | Future authentication handlers remain unimplemented |
| CSRF / XSS-assisted actions | Exact origin and synchronizer proof tests; no active auth handlers | CSRF cannot stop same-origin XSS; browser hardening/E2E remain deployment work |
| Error / log / cache leakage | Generic allowlisted problems, generated UUIDs, private/no-store headers, no raw exception logging | Cross-service correlation and operational telemetry not qualified |
| Unbounded input / timeout | Declared and streamed caps, DTO bounds, TLS connect and total/read deadline tests | Load/edge rate limits unverified; token acquisition may finish after caller timeout without dispatch |
| Refresh replay / logout resurrection | One-send transport; existing durable dispatch/CAS/logout tests still pass | Multi-instance failover and store rollback qualification remain Milestone 2 |
| Cookie theft / tampering | Existing opaque, context-bound, secure cookie contract/tests preserved; no issuance | Real browser cookie behavior unverified |
| Store outage / key loss / rotation | Existing fail-closed store and authenticated-envelope tests preserved | Cloud SQL HA, KMS IAM, restore/rotation drills unverified |
| Rate-limit collapse | Existing Spring limits preserved; no trust in forwarded browser identity | Cloud Armor enforcement and trusted proxy topology unverified |
| Dependency exposure | Pinned direct SDK, server-only imports, bundle scan; no unrelated upgrades | Existing dependency advisories remain a deployment release gate |

## Deployment status and remaining gates

| Deployment item | State |
| --- | --- |
| BFF_SPRING_ORIGIN | NOT PROVIDED / NOT LIVE VERIFIED |
| Cloud Run IAM audience | NOT PROVIDED / NOT LIVE VERIFIED |
| Live Cloud Run IAM | NOT VERIFIED |
| Live Spring deployment | NOT VERIFIED |
| Live multi-instance deployment | NOT VERIFIED |
| LB / Cloud Armor / DNS / certificates | NOT VERIFIED |
| Cloud SQL HA / KMS / Secret Manager | NOT VERIFIED |
| Browser production E2E | NOT VERIFIED |

Production must supply real origin/audience and workload identity/Invoker grants,
verify private networking/ingress, and complete prior D1–D6 runtime gates. Existing
dependency advisories remain a release gate; no clean audit is claimed. Config
validation, fixtures and single-node PostgreSQL tests are not cloud qualification.

## Next

Milestone 2 — Production Session Store Adapter Qualification. Not started.
