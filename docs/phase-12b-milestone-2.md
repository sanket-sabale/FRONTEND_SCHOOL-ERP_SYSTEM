# Phase 12B — Milestone 2: Production Session Store Adapter Qualification

2026-09-28. Qualification and targeted hardening only. No authentication routes,
UI, cookies, tenant-domain changes, Spring changes or remote provisioning.

## Executive status

**PARTIAL** overall. Authenticated-session repository qualification is locally
verified as detailed below. The full requested persistence scope is not complete:
pre-auth and membership-selection persistence do not exist in the current adapter.
Only their frozen TTL configuration exists. This report does not count configuration
as expiration/persistence tests. Their future implementation must retain the
existing contract, without treating anonymous state as an authenticated session.

- Repository qualification: authenticated Platform/Tenant foundation qualified;
  pre-auth/selection persistence and consumption remain NOT IMPLEMENTED.
- Production qualification: **NOT QUALIFIED — DEPLOYMENT EVIDENCE REQUIRED**.
- Live infrastructure qualification: **NOT QUALIFIED — no GCP/Spring execution**.

## Inspection and implementation map

The current uncommitted D1–D6/Milestone 1 work was inspected and preserved. Initial
`git status`, `git diff --stat` and `git diff --check` were run before edits.
Read Milestone 1, BFF deployment decisions, session contract, actual `docs/RULES.md`,
installed Next BFF guide, package manifest/lockfile, SQL migration, all store,
transition, coordinator, broker, envelope, configuration and related test consumers.
There is no `RULES(1).md` authority.

| Component | Actual responsibility / consumers |
| --- | --- |
| `session-contract.ts` | BrowserSessionStore contract, contexts, pure types; no persistence |
| `session-transitions.ts` | Pure refresh/logout proposals; require shared-store CAS |
| `postgres-session-store.ts` | SessionStore, persistence projection, primary transactions, create/get/CAS/rotate/expire/tombstone cleanup |
| `001-session-store.sql` | Dedicated schoolerp_bff schema; JSON record with generated security columns; unique context/hash key |
| `refresh-coordinator.ts` | Only runtime store consumer; reserve → durable DISPATCHED → one broker invocation → fenced replacement |
| `refresh-broker.ts` | Decrypt, one fixed Spring refresh, verify /me identity, encrypt replacement |
| `credential-envelope.ts` | AES-256-GCM pair; per-envelope random DEK; pinned Cloud KMS wrapper |
| `config.ts`, instrumentation | Explicit environment/numerical validation; startup fails closed |
| `security-observer.ts` | Optional fixed-label, secret-free observer callback; no exporter |
| tests/helpers | Test-only module loader and fixtures, not a production session authority |

No `src/app`, client library or UI consumes the store. Cloud KMS wrapper has no live
route composition yet. A future server composition must pass
`config.limits.KMS_OPERATION_TIMEOUT_MS` to its constructor. No process-local session
or refresh-lock implementation was introduced. The test process module cache is
only a compiler/module cache.

## Frozen architecture and data safety

D1 remains external LB/Armor → Next BFF → private service-authenticated Spring.
D2 remains dedicated Cloud SQL PostgreSQL 17+ HA; local tests use PostgreSQL 17.11.
D3 remains Platform 30m idle/12h absolute, Tenant 8h idle/30d absolute, pre-auth
10m, selection 5m. D4 remains application AES-256-GCM + KMS-wrapped DEK. D5 remains
edge controls plus unchanged Spring limits. D6 timeouts/lease/retention unchanged.

| State | Persisted material |
| --- | --- |
| Platform | Context-bound 64-hex hash; state; schema/row/credential/CSRF versions; created/last-access/idle/absolute/access expiry; account ID and backend session ID; CSRF verifier; encrypted pair envelope/reference; refresh owner/fence/phase/lease; tombstone expiry |
| Tenant | Same lifecycle/envelope fields; account, tenant and membership IDs replace Platform session identity |
| Pre-auth | **No persistence model/adapter exists**; 600000ms config only; cannot authorize a session |
| Membership selection | **No persistence model/adapter exists**; 300000ms config only; upstream selection DTO stays server-only |

No passwords, raw cookie/session IDs, access/refresh tokens, roles, profiles or ERP
business data are serialized. Projection rejects cross-plane identity fields and
non-string identity bindings. Real encrypted credentials were written/read in
PostgreSQL and scanned for plaintext fixture values; decryption required correct
context/session/generation. These are ephemeral test keys, not Cloud KMS evidence.

## Transaction map and hardening

Every adapter operation acquires a bounded pool connection and executes a primary
`BEGIN READ WRITE` transaction. Hot standby authority is forbidden; deployed
primary routing still requires verification. SQL uses synchronous commit, bounded
transaction/statement/lock timeout; no automatic retry. Healthy connections return
to the pool; uncertain/broken transactions destroy their connection.

| Operation | Atomicity / fencing |
| --- | --- |
| Create | Project/validate record, configured lifetime bounds, unique insert/create-if-absent |
| Live load | Primary SELECT statement snapshot, no exclusive read lock |
| Expired load | Re-read FOR UPDATE, fresh DB clock, recheck expiry, atomically INVALID + remove encrypted credentials |
| Update/CAS | FOR UPDATE, authoritative row and credential versions, immutable identity/creation/absolute deadline, increment row version exactly once |
| Reserve / dispatch | CAS and durable owner/fence/phase/lease; no send before committed DISPATCHED is read back |
| Refresh completion | DISPATCHED, unexpired lease, next credential generation and new envelope/reference atomically committed |
| Logout / revoke | LOGGING_OUT blocks refresh; DELETED/INVALID tombstones remove envelope and credential reference |
| Replace session ID | New row insertion + old tombstone in one transaction; collision or injected failure rolls both back |
| Cleanup | Explicit bounded per-key deletion only after DB retention time; no background job added |

The baseline revealed exclusive read locks serializing refresh waiters until the
one-second transaction budget expired. Live reads now use a primary snapshot;
all writes and expiry rechecks retain locks. The contention test verifies that a
live read can finish while a writer is locked and that a conflicting CAS times
out safely. This does not let a read revoke or override a later committed logout.

Added monotonic elapsed-time measurement for refresh waiting and an injectable
proposal clock. Database time remains authoritative after locking for mutation,
expiry and leases. Wall-clock rollback cannot extend the waiter's polling budget.
A proposal clock ahead beyond accepted bounds is rejected; an expired owner is
invalidated, never renewed or taken over. Absolute deadlines never advance on
refresh. Access-token lifetime does not determine browser absolute lifetime.

CSRF version cannot decrease and authentication method cannot mutate through CAS.
Context/identity cannot change through ordinary CAS. ID rotation remains the
explicit transition for a future verified login/switch, not a generic update.

## Pool and KMS operational boundary

| Input | Local test profile | Production rule |
| --- | ---: | --- |
| SESSION_STORE_POOL_MAX | 10 | Required, 1–100; template intentionally empty pending sizing |
| SESSION_STORE_POOL_IDLE_MS | 10000 | Required, 1–3600000; template empty |
| SESSION_STORE_POOL_LIFETIME_MS | 300000 | Required, 1–3600000; template empty; pg seconds conversion |
| SESSION_STORE_CONNECT_TIMEOUT_MS | 2000 | Existing frozen bound for connect/acquire |
| SESSION_STORE_OPERATION_TIMEOUT_MS | 1000 | Existing query/transaction/lock bound |
| KMS_OPERATION_TIMEOUT_MS | 2000 | Existing SDK budget made explicit; required, 1–10000 |

Pool size is per process: deployment must budget max instances × pool max plus
migration/operations headroom against Cloud SQL capacity. No production capacity
was guessed. There is no periodic SELECT-1 health checker; checked operations and
pool error removal validate connectivity. TLS is CA-verified outside development.
Idle lifetime evicts idle connections; maximum lifetime recycles connections after
release and does not interrupt an in-use transaction.

KMS SDK calls have timeout and retry disabled, plus an application deadline so a
stalled provider cannot hang the caller. Direct SDK exceptions are sanitized.
Encrypt response must report the configured pinned version; decrypt accepts only
that envelope key ID and a 32-byte DEK. GCM tag/AAD validation remains mandatory.
Late returned key buffers are wiped and cannot resume a timed-out operation.
No plaintext fallback, automatic key rotation or old-key allowlist was introduced.
SDK test injection does not pretend to exercise IAM or Google availability.

Observer events contain only boundary, operation, success/unavailable and monotonic
latency. No exception, SQL, session key, identity, URL, token, key resource or payload
is passed. A throwing observer cannot affect security decisions. Exporter, alerting,
retention and infrastructure log/heap redaction are NOT live qualified.

## Concurrency evidence

Two actual Node child processes each load their own adapter/coordinator and pool.
They share only PostgreSQL and test orchestration messages. Dispatch evidence is
an append-only SQL table without a uniqueness constraint masking double dispatch.
A test broker supplies a replacement; live Spring rotation is not claimed.

| Scenario | Contenders | Dispatches | Authoritative replacements | Final row version / credential generation |
| --- | ---: | ---: | ---: | --- |
| A | 2 | 1 | 1 | 3 / 1 |
| B | 10 | 1 | 1 | 3 / 1 |
| C | 50 | 1 | 1 | 3 / 1 |
| Refresh vs logout | 2 | 1 | 0 | 4 / 0, DELETED |
| Refresh vs invalidation | 2 | 1 | 0 | 3 / 0, INVALID |

Final-run request outcomes: 2/2 accepted observers, 10/10 accepted observers,
49/50 accepted observers and 1 rejected request at 50 contenders. Replacement
authority remained singular in all three cases. This is not a throughput SLA.

Non-owning refresh requests may successfully observe the winner's new generation;
they are not replacement writers. The runs report accepted observers and rejected
requests separately. A stale-generation call after success may read generation 1
but cannot dispatch the old credential. Duplicate dispatch/completion, stale CAS,
stale logout and altered tenant binding are rejected by persisted fencing.

A kills/restarts → B observes committed state; A logs out → B sees DELETED.
Killing the owner after DISPATCHED leaves the marker durable; replacement processes
cannot send again, and lease expiry invalidates. This is **local deterministic
multi-process evidence**, not Cloud Run multi-instance evidence.

## Failure/recovery evidence

- KMS unavailable, permission denied, stalled provider, wrong version, malformed
  key, wrong KEK, nonce/ciphertext/tag/wrapped-key tampering and wrong AAD reject.
- Real pool exhaustion, connection refusal and stalled PostgreSQL handshake are
  bounded and sanitize errors. Releasing the exhausted pool permits recovery.
- Terminating a PostgreSQL backend mid-transaction rolls back its mutation.
- Injected SQLSTATE 40001 causes a safe error without retry or partial state.
- Real two-transaction deadlock produces a 40P01 victim; both connections recover
  after rollback and session versions remain unchanged.
- Existing lost-COMMIT acknowledgement reconciles primary; failure after dispatch
  retains the durable marker; malformed/429/5xx results never replay credentials.
- PostgreSQL graceful restart and committed-state recovery: PASS in the final run
  (restart/recovery scenario approximately 10.6 seconds). Initial
  Docker default shutdown timeout interrupted checkpointing, causing crash recovery
  longer than the test readiness window. This was observed, not treated as a pass.
  The controlled graceful restart uses a 60-second stop window; runtime operation
  timeouts remain unchanged. No Cloud SQL HA or acknowledged-write-loss claim.

Two baseline lease tests assumed 40–100ms database round trips. They now commit a
valid lease then place its timestamp in the past in the disposable fixture before
checking expiry. No runtime expiry policy or no-takeover assertion was weakened.
Migration DDL uses a separate test administration pool (10-second query budget);
runtime session transactions retain the frozen one-second budget.

## Evidence matrix

PASS means only the named level. — means no evidence claimed.

| Area | Repository | PostgreSQL | Multi-process | Live GCP | Status |
| --- | --- | --- | --- | --- | --- |
| Authenticated session persistence | PASS | PASS | PASS | — | Locally qualified |
| Pre-auth/selection persistence | Config only | — | — | — | NOT IMPLEMENTED |
| CAS/version fencing | PASS | PASS | PASS | — | Locally qualified |
| Refresh concurrency | PASS | PASS | PASS, 2/10/50 | — | Locally qualified |
| Replay protection | BFF generation PASS | PASS | PASS | — | Spring token-family behavior source-audited, not live tested |
| Logout fencing | PASS | PASS | PASS | — | In-flight requests may finish |
| KMS encryption | Injected SDK PASS | Ciphertext PASS | — | — | Live KMS NOT QUALIFIED |
| KMS failure | Injected SDK PASS | — | — | — | Live IAM/outage NOT QUALIFIED |
| DB failure | PASS | PASS | PASS for owner loss | — | HA/restore NOT QUALIFIED |
| Multi-instance state | PASS | PASS | PASS locally | — | Cloud Run NOT QUALIFIED |
| Expiration | Authenticated PASS | PASS | Lease invalidation PASS | — | Pre-auth/selection NOT IMPLEMENTED |
| Leases | PASS | PASS | PASS | — | Deployment clock bounds pending |
| Rate-limit topology | Source audit | — | — | — | NOT QUALIFIED |
| Observability | Safe callback tests PASS | PASS | — | — | Exporter/alerts NOT QUALIFIED |

## Security review: explicit answers

1. **Can two instances share a session?** Yes within the tested primary PostgreSQL
   model: separate processes read/update the same row with persisted CAS.
2. **Can concurrent refreshes both replace?** No in tested 2/10/50 scenarios: one
   dispatch, version 3/generation 1; duplicate completion CAS fails.
3. **Can a stale writer overwrite newer state?** No: locked row/credential versions;
   process snapshot→other writer→stale CAS and stale logout tests reject.
4. **Can an old refresh token be replayed?** BFF cannot redispatch a consumed or
   uncertain generation. Spring owns raw-token usability/family/revocation. Its
   Platform/Tenant refresh services were read; consumed/expired/revoked/wrong-family
   live Spring behavior is NOT tested here. Wrong BFF session/context/generation
   fails authenticated decryption or identity validation.
5. **Can another instance bypass logout?** A fresh authoritative lookup/refresh
   cannot; cross-process tests prove visibility and rejection. A request that read
   ACTIVE before logout can still finish using its already-obtained credential.
   BFF invalidation cannot cancel Spring work or prove Spring revocation.
6. **Can KMS fail into plaintext?** No: envelope/provider tests reject without a
   replacement; no fallback implementation exists.
7. **Can PostgreSQL fail into authentication?** No: safe unavailable error, no local
   session fallback; uncertain dispatch remains fenced.
8. **Can browser input control service identity?** No: unchanged Milestone 1
   configured provider/fresh-header tests remain required and passing.
9. **Can Platform/Tenant state cross?** No through the adapter: key+context,
   credential context, identity projection, immutable CAS binding and AEAD AAD.
10. **Can credentials reach logs?** No tested observer/error path accepts payloads;
    persistence tests scan fixture secrets and production modules avoid raw logging.
    Infrastructure/APM/heap logging remains unverified; this is not a global proof.
11. **Can process memory become session authority?** No production Map/lock store;
    kill/restart tests retain PostgreSQL authority. Test memory is not persistence.
12. **Can forwarded headers manipulate rate limiting?** BFF ignores them. Spring
    `RateLimitKeyResolver` uses servlet `getRemoteAddr()`; no trusted-forwarder
    configuration was found. Spring may aggregate all users under a BFF peer IP.
    Cloud Armor and proxy/source topology require live validation; no workaround
    or Spring limit relaxation was introduced.

## Validation results

| Command | Final result |
| --- | --- |
| `npm test` | PASS, 89 tests |
| `npm run test:bff` | PASS, 63 tests |
| `npm run test:bff:http` | PASS, 21 tests |
| `npm run test:bff:postgres` | PASS, 17 tests including parent |
| `npm run test:bff:qualification` | PASS, 7 tests |
| `npm run test:bff:multiprocess` | PASS, 16 tests including parent |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS, 0 errors; one existing unused `isSameScope` warning in `school-erp-documentation/code/examples/tenant-scoped-query.ts:8` |
| `npm run build` | PASS |
| `git diff --check` | PASS |
| `npm audit --omit=dev --json` | NOT CLEAN: 31 existing advisories; no package additions/upgrades |

The database commands used only
`BFF_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/bff_contract_tests`.
All passing suites have zero skipped/cancelled tests. Initial failures and their
corrections are documented above; no security assertions were removed. Baseline
non-database suites passed 82/56/21; PostgreSQL exposed the contention and test
timing defects described above. Test worker execution required approved sandbox
permissions. No live infrastructure qualification was attempted.

Final route/bundle audit: all 95 tracked pages present in build, no route handlers,
no application/component/feature/client-library diff, no BFF/Google SDK imports in
browser layers, and no checked server-config/service-header/test-secret markers
in browser chunks. Backend git status remains clean. These are scoped static/build
checks, not browser E2E. The disposable database is removed after testing.

## Requested security invariants

| Invariant | Local result | Evidence / boundary |
| --- | --- | --- |
| 1 Browser input cannot become service credential | PASS | Existing HTTP forged-header/provider tests |
| 2 Tenant identity cannot cross sessions | PASS | Immutable tenant binding, session-key AAD and CAS tests |
| 3 Platform cannot become Tenant | PASS | Context key/projection and reciprocal identity tests |
| 4 Tenant cannot become Platform | PASS | Same reciprocal checks |
| 5 Stale version cannot overwrite newer | PASS | Separate-process snapshot/CAS and duplicate completion |
| 6 Consumed generation cannot produce another replacement | PASS for BFF | Dispatch counts, stale generation and killed-owner tests; live Spring token reuse unverified |
| 7 Logout propagates across instances | PASS locally | B reads DELETED after A logout; late completion rejected |
| 8 KMS/DB failure cannot authenticate through fallback | PASS | SDK failure injection, database outages and pool tests |
| 9 No plaintext persistence or sensitive observer events | PASS for tested boundaries | Real encrypted SQL record and event allowlist assertions; live logging unverified |
| 10 Process memory is not authoritative | PASS | Two processes, owner termination/restart and PostgreSQL recovery |

## Exact Milestone 2 changes

- `src/server/bff/config.ts`
- `src/server/bff/postgres-session-store.ts`
- `src/server/bff/credential-envelope.ts`
- `src/server/bff/refresh-coordinator.ts`
- `src/server/bff/security-observer.ts`
- `tests/bff-postgres.test.mjs`
- `tests/bff-qualification.test.mjs`
- `tests/bff-multiprocess.test.mjs`
- `tests/helpers/qualification-fixtures.mjs`
- `tests/helpers/bff-process-worker.mjs`
- `package.json` (scripts only; no dependency change)
- `deploy/bff/runtime.env.template`
- `deploy/bff/README.md`
- `docs/frontend/BFF-DEPLOYMENT-DECISIONS.md`
- `docs/phase-12b-milestone-2.md`

Prior uncommitted Milestone 0.5/1 files and lockfile changes are preserved, not
counted as new Milestone 2 implementation.

## Production qualification and release gates

VERIFIED: only local repository, actual PostgreSQL and local process evidence above.
NOT VERIFIED / BLOCKED BY MISSING INFRASTRUCTURE: approved Spring origin/audience,
project/service identities, Cloud SQL TLS/IAM/primary routing/HA/failover/restore,
Direct VPC/private networking, KMS key versions/IAM/rotation/key loss, Secret Manager,
Cloud Armor/source-rate behavior, LB DNS/certificates, Next/Spring ingress bypass,
live Spring token-family checks, deployed clock skew, pool sizing/capacity,
operational telemetry and browser E2E. No resources or credentials were invented.

Repository gap: pre-auth/selection persistence and expiration/consumption must be
implemented and qualified before their authentication flows are activated.
Existing dependency advisories remain a separate release gate: audit found 31
production advisories (28 moderate, 2 high, 1 critical) in existing Next/Tiptap/sharp.
No new dependency or unrelated upgrade was made; audit is not clean.

## Next milestone

**Milestone 3 — Platform Authentication**. Not started; unresolved persistence and
release gates are not waived by naming the next planned milestone.
