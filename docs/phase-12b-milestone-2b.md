# Phase 12B — Milestone 2B: Pre-auth and Membership Selection Persistence

Date: 2026-09-28. **OPTION A — APPROVED**.

## Executive status

**COMPLETE — repository implementation and local qualification.**

**Production qualification: NOT QUALIFIED. Milestone 3: NOT STARTED.**
No browser authentication handler, cookie issuance, Platform login flow, auth UI,
tenant mock integration or remote infrastructure was activated.

The previous accountId clarification is resolved by Option A: BFF owns transaction
integrity; Spring owns canonical account and membership authority. Pending selection
is neither an authenticated account nor a TenantSession. Successful selection and
`/api/auth/me` verification prepare a fresh encrypted server-only session handoff.
This milestone does not persist/activate that handoff or emit its cookie.

## Source audit

Inspected the working tree, M1/M2 reports, frozen D1–D6 decisions, actual
`docs/RULES.md` (not RULES(1).md), architecture/PRD/design, installed Next BFF guide,
manifest/lockfile and runtime consumers. Preserved previous uncommitted work.

| Boundary | Inspected/reused components |
| --- | --- |
| Persistence | `postgres-session-store.ts`, migration 001, qualified pool, primary transactions, CAS, retention |
| Refresh/logout | `session-contract.ts`, `session-transitions.ts`, `refresh-coordinator.ts`, `refresh-broker.ts`; unchanged in 2B |
| Encryption | `credential-envelope.ts`, pinned KMS version, timeout, AAD, `security-observer.ts` |
| HTTP | Spring client, service identity, security policy, upstream contract, browser boundary, safe errors |
| Configuration | Existing D1–D6 limits and runtime template; no new production values |
| Spring | Actual MembershipSelectionResponse, MembershipChoice, MembershipSessionService, AuthController, security chains, authentication fixtures |

Spring returns status, selectionToken, expiresAt and membership choices, **not
accountId**. It binds the token hash to its account and enforces membership
ownership. No account lookup, invented claim/API, RBAC or Spring runtime change.

## Persistence model and atomic lifecycle

Migration 002 adds two tables in the existing isolated `schoolerp_bff` schema.
Authenticated sessions remain in `sessions`. The existing transaction runner was
extracted without changing its behavior: primary READ WRITE, synchronous commit,
PostgreSQL 17 transaction/statement/lock timeouts, rollback, sanitized errors and
fixed observer events. KMS and HTTP calls never occur inside SQL transactions.

| Record | Persisted fields | Lifecycle |
| --- | --- | --- |
| Pre-auth | Context, identifier hash, schema/version, timestamps/expiry, CSRF verifier hash, hashed owner, selection reference, tombstone deadline | ACTIVE → CONSUMING → CONSUMED; REVOKED/EXPIRED terminal branches |
| Selection | TENANT, transaction hash, originating pre-auth hash, schema/version, credential generation 0, timestamps, local/backend expiry, CSRF verifier, encrypted envelope, safe choices, hashed owner, tombstone deadline | PENDING → CONSUMING → CONSUMED; REVOKED/EXPIRED terminal branches |

Neither table stores passwords, raw cookies/IDs, CSRF secrets, plaintext tokens,
account authority, roles, permissions or ERP data. Explicit projection discards
unknown fields. Primary keys, unique origin-to-selection binding and a context-bound
foreign key enforce identity/relationship integrity. Expiry and cleanup are indexed.

`FOR UPDATE`, database time obtained after lock acquisition, expected version,
state and owner determine the sole consumer. Selection publication and pre-auth
consumption commit together. Stale versions/owners, duplicate publication/completion,
expired and terminal records cannot be reused. An uncertain reservation never
authorizes a network send. No process-local lock is authoritative.

Server TTLs: pre-auth 600000ms; selection at most 300000ms, also capped by original
pre-auth and Spring expiry. Unit tests cover T0, TTL−1, TTL and TTL+1; exact expiry
rejects. PostgreSQL reads/reservations enforce expiry before cleanup. Explicit
cleanup processes at most 100 expired and 100 retained terminal rows per table per
transaction using SKIP LOCKED, children before parents. No scheduler was installed.

### Multi-tab, cookie and fixation behavior

Bootstrap reuses the valid reference/proof without extending expiry. It preserves
that reference while selection is pending and rejects replacement while consumption
is in progress. Terminal/expired references can be replaced without mutating others.

The inactive serializer uses the documented `_preauth` suffix:
`__Host-schoolerp_{platform|tenant}_session_preauth`, HttpOnly, Secure,
SameSite=Strict, Path=/, no Domain. Existing loopback-only development policy remains.
No cookie-emitting handler exists.

Domain-separated SHA-256 derivation from the 256-bit opaque reference supports
multi-tab synchronizer-proof recovery without persisting the proof. Cookie,
record key and proof use separate domains. Only a verifier hash is persisted.
The proof is not authentication. A successful verified selection generates a
fresh authenticated ID and fresh CSRF proof; it never upgrades the pre-auth ID.

## Option A encryption, dispatch and identity verification

`beginMembershipLogin` carries the reserved pre-auth transaction through the fixed
Spring login and selection publication in one server operation. Browser selection
input contains only membershipId, never a selection token, accountId, tenantId,
roles or permissions. Spring alone determines ownership and account validity.

The existing AES-256-GCM implementation is shared, with a typed selection payload.
Existing access/refresh envelope AAD remains compatible. Selection AAD additionally
binds purpose, environment, TENANT context, transaction hash, credential generation,
originating pre-auth hash, CSRF verifier, creation/local/backend expiry and choices.
A↔B ciphertext swaps, metadata tampering, wrong keys/versions and malformed payloads
fail closed. Production uses the existing Cloud KMS KEK boundary; local tests use
ephemeral test KEKs or injected KMS SDK behavior. No plaintext fallback.

CONSUMING is committed **before decryption/network dispatch**. There is no takeover
lease or automatic retry. Successful selection validates the token DTO and calls
the fixed `/api/auth/me`; tenant/membership must agree with both choice and token
response. Canonical account identity comes only from `/me`. A fresh encrypted
session is prepared, selection consumption commits, then a server-only handoff
is returned. It is not browser JSON or an activated local session.

Network ambiguity, upstream 400/401/403/409/429/5xx, malformed success, wrong `/me`,
KMS failure and uncertain final store commit return no handoff. State becomes
REVOKED when possible; storage outage leaves CONSUMING, which grants no new dispatch.
Recovery is reauthentication with a fresh transaction. There is no claim of
exactly-once network delivery. Spring can create a session whose response is lost;
local failure cannot retract that remote operation. Revocation during dispatch
prevents local completion, not an already accepted remote request.

## Browser boundary, rate limits and observability

Inactive HTTP primitives enforce exact configured Origin, Fetch Metadata, JSON,
body/deadline bounds, bootstrap marker, existing synchronizer CSRF verification,
membership-only input, explicit rate-admission callback and private/no-store safe
choice projection. There is no default permissive admission provider. Future
handlers must resolve authenticated state before considering anonymous bootstrap.

The registry adds only TENANT `POST /api/auth/select-membership`. Platform cannot
invoke it. Existing service identity remains separate from user bearer JWT;
fresh headers, no browser authority/forwarding headers, no redirects and one-send
transport behavior remain intact. No new route is registered under `src/app`.

Spring still keys rate limits on servlet remote address and may aggregate clients
behind the BFF. The isolated Spring test fixture explicitly disables its rate
limiter; these tests do not qualify rate-limit capacity. Cloud Armor, trusted
client-IP topology, bootstrap quotas and deployed telemetry remain release gates.
Untrusted X-Forwarded-For is never made authoritative.

Observer fields remain boundary/operation/outcome/latency only. No payloads, tokens,
proofs or IDs are logged. Errors are sanitized. The new Spring fixture disables
MockMvc request dumps even on assertion failure. Deployed exporters are unverified.

## Local Spring fixture and evidence

Classification: **EXISTING FIXTURE FOUND**, extended by a minimal **NEW TEST-ONLY
FIXTURE CREATED** for the real HTTP BFF integration scenario.

- The user-running `http://localhost:8080` returned a real 401
  AUTHENTICATION_FAILED Problem Details response for an invalid selection probe.
  Its database was not seeded or modified.
- Existing AuthSecurityIntegrationTests, AuthenticationTestClient and
  TestcontainersConfiguration provide the approved isolated seed/migration setup.
- New Milestone2bLocalContractTests reuses that fixture, adds a third-tenant
  single-membership account, and generates temporary credentials in memory.
  No new password is stored in source, disk, command arguments or output.
- A separate loopback Spring server on a random port uses Testcontainers PostgreSQL.
  The Node harness uses the real SpringClient and BFF PostgreSQL adapter, with a
  test KEK/service provider. This does not exercise Google IAM.
- Verified multi-membership login, two distinct tenant choices, expiry bounds,
  encrypted persistence, symmetric transaction ciphertext rejection, Spring
  foreign-account membership rejection, successful selection, `/me` canonical
  account, fresh handoff, consumed replay and server-expired-token rejection.
- Account B's single membership correctly returns tokens directly. Its own `/me`
  proves identity isolation. Two independent pending transactions prove symmetric
  BFF substitution rejection; no nonexistent Account B selection token is invented.

This is local HTTP integration evidence, not successful-login evidence against
the user's already-running port 8080, and not production qualification.

## Concurrency and restart evidence

Every row used real PostgreSQL and two independent Node processes with separate
pools/module state. A successful consumer completed the authoritative transition.

| State | Contenders | Successful | Rejected | Final version | Credential generation | Spring dispatches |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Pre-auth | 2 | 1 | 1 | 2 | N/A | 0 |
| Pre-auth | 10 | 1 | 9 | 2 | N/A | 0 |
| Pre-auth | 50 | 1 | 49 | 2 | N/A | 0 |
| Selection | 2 | 1 | 1 | 2 | 0, one-use | 1 |
| Selection | 10 | 1 | 9 | 2 | 0, one-use | 1 |
| Selection | 50 | 1 | 49 | 2 | 0, one-use | 1 |

Both categories survived process restart and a real disposable PostgreSQL restart.
Existing authenticated 2/10/50 refresh regression retained one dispatch/replacement,
generation 1 and version 3. No deployed Cloud Run multi-instance claim is made.

## Security invariants — 28/28 locally verified

| # | Invariant | Evidence |
| --- | --- | --- |
| 1 | Durable pre-auth | PostgreSQL visibility/process and DB restart |
| 2 | Server expiry | Primary DB clock and unit time boundaries |
| 3 | Expired pre-auth rejects | Expiry-before-cleanup test |
| 4 | Atomic pre-auth consumption | 2/10/50 process contention |
| 5 | Pre-auth replay rejects | Re-consume/stale-version tests |
| 6 | Durable selection | Atomic publication and restart |
| 7 | Encrypted at rest | Raw SQL inspection and AES roundtrip |
| 8 | No credential swap | A↔B ciphertext tests, local Spring harness |
| 9 | No CSRF swap | Verifier/reservation and AEAD binding tests |
| 10 | No context swap | Context lookup, fixed registry, AEAD tests |
| 11 | One consumer | Six PostgreSQL multi-process scenarios |
| 12 | Selection restart survival | Worker exit/restart test |
| 13 | Independent BFF processes | Separate Node processes/pools |
| 14 | Spring account authority | Real local selection and `/me` |
| 15 | Spring membership authority | Real foreign-membership rejection |
| 16 | No browser account authority | Strict request DTO negative tests |
| 17 | No browser tenant authority | DTO and forged-header tests |
| 18 | No selection credential to browser | Safe projection and built bundle scan |
| 19 | No credential logging | Fixed observer shape, sanitized errors/source audit |
| 20 | Ambiguous outcome fails closed | Lost response and uncertain completion tests |
| 21 | Pre-auth is not authenticated | Separate table/types; no session inserted |
| 22 | Selection is not TenantSession | Separate state; no pending accountId |
| 23 | Fresh authenticated ID boundary | Verified `/me` then fresh encrypted handoff; no activation |
| 24 | Platform/Tenant separation | Cookie/key/operation/AEAD tests |
| 25 | DB fails closed | Refusal/timeouts/pool/rollback/deadlock/restart tests |
| 26 | KMS fails closed | Denial/outage/timeout/version/tamper/malformed tests |
| 27 | Upstream failure cannot authenticate | Error matrix, `/me` mismatch, empty sessions table |
| 28 | Existing M2 intact | PostgreSQL/HTTP/KMS/refresh/multiprocess regression |

Limits: CAS/AEAD do not detect a privileged administrator restoring an internally
valid old snapshot. Backup/restore must invalidate restored browser state. CSRF
does not stop XSS-assisted same-origin actions. Cookie theft, real TLS/ingress and
browser behavior require later deployment/browser tests. A future session activation
must persist the prepared fresh record before cookie issuance; a crash after
selection consumption requires reauthentication, not replay.

## Commands and results

Database suites run sequentially against their disposable schema. Node totals
include the parent test where Node reports it.

| Command | Result |
| --- | --- |
| `npm test` | PASS — 96 tests |
| `npm run test:bff` | PASS — 70 tests |
| `npm run test:bff:http` | PASS — 21 tests |
| `npm run test:bff:postgres` | PASS — 17 tests |
| `npm run test:bff:qualification` | PASS — 7 tests |
| `npm run test:bff:multiprocess` | PASS — 16 tests |
| `npm run test:bff:pending` | PASS — 7 tests |
| `npm run test:bff:pending:postgres` | PASS — 23 tests (22 scenarios + parent) |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS — zero errors, one existing documentation-example warning |
| `npm run build` | PASS — 95 existing application pages retained |
| `git diff --check` | PASS |
| `npm audit --omit=dev --json` | Exit 1 — 31 existing advisories: 28 moderate, 2 high, 1 critical |

The first sandboxed npm test could not spawn workers (EPERM); the same command
passed with permitted process execution. One pending DB run overlapped build,
TypeScript and lint and hit two fail-closed store timeouts. The isolated rerun used
unchanged 1-second transaction limits; no retry or weakened assertion was added.
This is not a sustained-load capacity qualification.

Backend command (from the sibling Spring checkout):

```powershell
$env:BFF_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55439/bff_contract_tests'
$env:BFF_FRONTEND_QUALIFICATION_ROOT='D:\SCHOOL ERP SYSTEM\school-erp'
.\gradlew.bat --gradle-user-home .gradle-user-home test --tests com.application.schoolerp.AuthSecurityIntegrationTests --tests com.application.schoolerp.Milestone2bLocalContractTests --rerun-tasks --console=plain
```

PASS — 18 tests (17 existing + 1 new real HTTP scenario), zero failures/skips.
Use `--rerun-tasks`: Gradle does not track the external Node harness as an input.
No production Spring source/build configuration or dependency changed.

## Exact Milestone 2B changes

Paths are relative to the frontend checkout unless marked backend. Earlier
uncommitted D1–D6/M1/M2 files are preserved, not attributed wholesale to this task.

- `src/server/bff/pending-auth.ts`: pending types, hash/proof/cookie/binding/projection.
- `src/server/bff/postgres-pending-auth-store.ts`: atomic persistence and cleanup.
- `src/server/bff/pending-auth-service.ts`: bound broker and fresh handoff.
- `src/server/bff/pending-browser-boundary.ts`: inactive HTTP security primitives.
- `src/server/bff/postgres-transaction.ts`: extracted existing transaction runner.
- `src/server/bff/postgres-session-store.ts`: delegates to that same runner.
- `src/server/bff/credential-envelope.ts`: shared payload encryption, selection type.
- `src/server/bff/security-policy.ts`: fixed Tenant selection operation.
- `src/server/bff/spring-client.ts`: selection operation type.
- `src/server/bff/upstream-contract.ts`: strict selection DTOs/projection.
- `src/server/bff/browser-boundary.ts`: shared bounded JSON reader.
- `src/server/bff/errors.ts`: existing rate-limit code in BFF error type.
- `deploy/bff/002-pending-auth.sql`: additive isolated migration.
- `deploy/bff/README.md`: migration/qualification instructions.
- `package.json`: focused scripts and unit-suite inclusion, no dependency changes.
- `tests/bff-pending-auth.test.mjs`: unit/HTTP/encryption boundaries.
- `tests/bff-pending-postgres.test.mjs`: PostgreSQL/process/failure qualification.
- `tests/helpers/pending-fixtures.mjs`: ephemeral test crypto/DTO helpers.
- `tests/helpers/pending-worker.mjs`: independent-process worker.
- `tests/helpers/live-spring-pending.mjs`: real HTTP Spring harness.
- `docs/frontend/BFF-SESSION-CONTRACT.md`: Option A follow-up.
- `docs/phase-12b-milestone-2b.md`: this report supersedes the resolved stop.
- Backend `src/test/java/com/application/schoolerp/Milestone2bLocalContractTests.java`:
  isolated fixture extension, no runtime changes.

## Qualification boundary and remaining gates

**VERIFIED:** repository implementation, deterministic crypto/HTTP, real local
PostgreSQL transactions/failures/restart, independent Node-process behavior, real
local Spring HTTP/contract integration, source and browser-bundle separation.

**NOT VERIFIED / RELEASE GATE:** Cloud SQL HA/failover/TLS/IAM, real Cloud KMS/IAM/
rotation/key-loss recovery, Cloud Run IAM/ingress, private networking, Cloud Armor,
trusted client-IP rate limiting, DNS/certificates, deployed observability, backup
restore/rollback invalidation, deployed multi-instance operation and browser E2E.
Production Spring origin and IAM audience remain intentionally unset. Existing
dependency advisories remain separate release gates; no dependency modernization.

Apply migration 001 then 002 with the migration owner. Qualify cleanup scheduling,
backup/restore and rate admission before activating routes. No remote resources
were applied. Disposable qualification containers are removed afterward; the
user's running Spring/database are left intact.

**Milestone 3 — NOT STARTED.** Next planned stage is Platform Authentication after
review; no implementation of it is included here.
