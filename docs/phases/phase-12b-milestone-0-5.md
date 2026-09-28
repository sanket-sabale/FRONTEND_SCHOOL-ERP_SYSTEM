# Milestone 0.5 — Browser Session and Thin BFF Contract

Date: 2026-09-26. Status: **PARTIAL — contract and executable proof delivered; deployment bindings remain OPEN.** No live auth/BFF route or production store was implemented.

## A. What was audited

Existing architecture/design/product/rules, Phase 12B PDF/audit/API contract, frontend storage/routes/client, platform and tenant Spring controllers/DTOs/refresh/logout/security configuration. RULES(1).md absent; existing docs/RULES.md used. Source inspection confirms tenant and platform session differences. Installed Next guides and primary browser-security guidance reviewed.

## B. Architectural decisions

Thin same-origin BFF; opaque browser cookie; server-only encrypted credentials; independent platform/tenant context. No business authorization duplication. GET does not rotate tokens: safe refresh-required response leads to CSRF-protected POST. Failed/unknown refresh never replays old credentials.

## C. Browser session contract

Durable shared record, finite configured idle/absolute bounds, context-bound hashed ID, atomic CAS and tombstones. Store outage fails closed. Store adapter and numeric deployment limits are not guessed.

## D. Platform session contract

Safe me projection contains accountId, roles and permissions with explicit PLATFORM context and BFF expiry. Backend sessionId and credential pair stay server-side. Backend persisted session invalidation is preserved.

## E. Tenant session contract

Separate TENANT projection also contains backend-verified tenantId/membershipId. No fabricated backend sessionId. Membership selection token stays server-side. Tenant logout's residual access-token validity is explicitly documented.

## F. Cookie contract

Distinct __Host-schoolerp_platform_session and __Host-schoolerp_tenant_session, 256-bit opaque values, HttpOnly/Secure/SameSite=Strict/Path=/, no Domain. Local HTTP exception uses different dev names on loopback only. Rotation/deletion/expiry policies documented.

## G. BFF routing contract

Fixed /api/bff/platform and /api/bff/tenant handlers map to verified Spring operations. Server builds authority headers; no arbitrary proxy, tenant-header trust, redirects or browser-supplied bearer. Routes are proposed, not active.

## H. Refresh coordination

Shared CAS owner/fence, durable dispatch marker, credential generation and atomic encrypted-pair replacement. Expired owner cannot be replaced by a worker replaying its credential. Logout blocks late completion. Tests use an explicitly test-only atomic store model, not a real multi-instance service.

## I. CSRF

Exact configured Origin, JSON, same-origin Fetch Metadata when present, context/session-bound custom-header token. Separate strictly protected pre-auth bootstrap contract. SameSite/CORS alone are insufficient. Bootstrap route remains unimplemented.

## J. OAuth compatibility

PASSWORD/OIDC provenance stays server-side; safe session projection is unchanged. No OAuth endpoint invented. Callback ownership, transaction binding, state/nonce/PKCE and Strict-cookie compatibility are future backend/broker decisions.

## K. Mobile compatibility

Native clients retain direct Spring APIs with separately designed native authentication. Next cookies/CSRF are web-only.

## L. Threats covered

Contract addresses XSS credential theft, CSRF, SSRF, forged headers, context confusion, concurrent refresh, lost responses, logout races, forged tenant selection, cookie tampering and cookie theft. HttpOnly is not claimed to prevent all hijacking or XSS-driven actions.

## M. Files changed

- docs/frontend/BFF-SESSION-CONTRACT.md — normative contract/open decisions.
- src/server/bff/session-contract.ts — server record/store interface and safe projections.
- src/server/bff/security-policy.ts — cookie/origin/CSRF/header/route/redirect primitives.
- src/server/bff/session-transitions.ts — pure fenced transition proposals and logout request/outcome mapping.
- tests/bff-session-contract.test.mjs — security/transition contract tests.
- package.json — include focused suite in existing npm test.
- Existing API contract/audit — cross-reference new contract, preserve original audit history.
- This report.

No existing shell, route, mock, tenant module, backend or dependency version changed.

## N. Tests executed

`node --test tests/bff-session-contract.test.mjs`: PASS, 14 tests, including the final stale credential-generation check. `npm test`: PASS after final edits, 40 tests (26 existing + 14 new), no failures/skips. Node worker spawning initially failed with sandbox EPERM; reruns with approved escalation succeeded.

Model tests are not live Spring/PostgreSQL/browser tests. No configured browser E2E suite exists; no auth routes exist yet to exercise. No production deployment verification claimed.

## O. TypeScript / ESLint / build / routes

- `npx tsc --noEmit --incremental false`: PASS in initial standalone check; final Next production build TypeScript stage also PASS.
- `npm run lint`: PASS after fixing the new test-loader variable name and expression. Zero errors; one pre-existing unused isSameScope warning in school-erp-documentation/code/examples/tenant-scoped-query.ts:8.
- `npm run build`: PASS. Initial sandbox build compiled but TypeScript worker failed with spawn EPERM; approved escalated rerun completed all stages.
- Route/source-manifest comparison: PASS, all 95 source page routes retained, no BFF route handlers added.
- `git diff --check` and explicit new-file whitespace checks: PASS. No existing UI imports the new server primitives. Backend working tree unchanged.
- Browser E2E, live backend and production/store failover validation: NOT RUN; no such runtime integration added by this contract milestone.

## P. Backend changes potentially required

Deployment-specific trusted proxy/rate-limit configuration after topology decision; optionally explicit expiry metadata if deployed TTL alignment is insufficient. Future OAuth requires a real verified backend completion contract. None applied here.

## Q. Backend changes not required

No Spring cookie authentication, Security redesign, RBAC duplication, CORS broadening for server-to-server calls, token replay weakening, tenant resolver change or business/schema rewrite.

## R. Open decisions

Production/staging origins, upstream, store provider/consistency/failover, lifetimes, encryption/KMS, proxy/rate limits, lease/timeout/retention bounds and live test environment. Requested deployment inputs have not been supplied during this milestone; no values assumed. OAuth-specific work can remain deferred separately.

## S. Risks

Uncertain refresh/logout may leave backend credentials valid until expiry; local invalidation is not backend revocation. A store failover that loses dispatch history is unacceptable. Shared BFF egress can collapse users into backend rate-limit buckets. Current primitives are not a deployable session system.

## T. Recommended next milestone

Resolve contract D1–D6 deployment bindings, then Milestone 1 HTTP Foundation. Pure transport/error work can proceed independently, but live cookie/authentication must not ship with guessed storage, lifetimes or topology.

---

## Follow-up — D1–D6 implementation, 2026-09-27

**Status: D1–D6 PARTIAL.** The historical Milestone 0.5 results above are preserved.
Approved D1–D6 values are frozen in the updated contract and the new
[deployment decision document](../frontend/BFF-DEPLOYMENT-DECISIONS.md).
Repository implementation and local database evidence do not establish live
GCP/Spring readiness. No authentication route or cookie issuer was activated.

### A. Exact changed files

| File | Change |
| --- | --- |
| `src/instrumentation.ts` | Fail-closed production startup validation; safe config summary |
| `src/server/bff/config.ts` | Typed environment/config limits and independent lifetime policy |
| `src/server/bff/credential-envelope.ts` | AEAD credential pair, KMS wrapping and pinned key IDs |
| `src/server/bff/errors.ts` | Safe Spring problem allowlist and BFF-owned errors |
| `src/server/bff/postgres-session-store.ts` | Production pg adapter, strict persistence model, bounded transactions/CAS |
| `src/server/bff/refresh-coordinator.ts` | Durable ownership/dispatch, bounded wait and no uncertain replay |
| `src/server/bff/refresh-broker.ts` | One-send refresh, DTO/me identity checks and new encrypted pair |
| `src/server/bff/spring-client.ts` | Fixed server-only HTTP transport, limits, safe headers/errors |
| `src/server/bff/session-contract.ts` | Comment updated to describe adapter existence; types/invariants retained |
| `deploy/bff/001-session-store.sql` | Dedicated schema and explicit persistence columns |
| `deploy/bff/runtime.env.template` | Approved numerical values; empty required deployment resource inputs |
| `deploy/bff/README.md` | Provisioning/verification checklist and isolated PostgreSQL test instructions |
| `tests/bff-foundation.test.mjs` | Config, AEAD, broker, HTTP/error boundary tests |
| `tests/bff-postgres.test.mjs` | Real PostgreSQL transaction/concurrency/failure tests |
| `tests/helpers/bff-loader.mjs` | Node-only test loader and non-secret config fixtures |
| `package.json` | pg/KMS dependencies, Node 22 requirement, focused test commands |
| `package-lock.json` | Locked dependencies; existing package versions preserved |
| `docs/frontend/BFF-SESSION-CONTRACT.md` | D1–D6 bindings replace open policy values; runtime gates retained |
| `docs/frontend/BFF-DEPLOYMENT-DECISIONS.md` | Decisions, rationale, operational gates and full security review |
| `docs/phases/phase-12b-milestone-0-5.md` | This appended follow-up only |

### B. Decisions and evidence

| Decision | Value | Status | Evidence |
| --- | --- | --- | --- |
| D1 | GCP asia-south1, LB/Armor, restricted Next/internal Spring, explicit schoolerp.com/staging/localhost targets | Contract bound; deployment unverified | Config and deployment checklist; current Google docs reviewed |
| D2 | Cloud SQL PostgreSQL 17+ HA, dedicated schoolerp_bff boundary | Adapter implemented; local PostgreSQL verified | 16 integration cases plus parent test; provider HA not tested |
| D3 | Platform 30m idle/12h absolute; Tenant 8h/30d; pre-auth 10m; selection 5m; lead/skew 60s | Implemented/tested | Typed config, lifetime helper, store expiry/fencing tests |
| D4 | AES-256-GCM + KMS-wrapped data key, AAD and pinned version; Secret Manager | Code/crypto tests complete; live KMS unverified | Roundtrip, tamper, wrong-key/context/environment/version tests |
| D5 | Cloud Armor preview policy proposals; existing Spring limits preserved | Contract bound; runtime unresolved | Source audit and header/429 tests; proxy/load tests pending |
| D6 | Explicit limits in runtime.env.template | Implemented/tested | Startup rejection, HTTP limits, SQL transaction timeout and refresh coordination tests |

### C. Architecture

```text
Browser → External HTTPS LB → Cloud Armor → Next.js BFF
                                              ↓ private/VPC
                                         Spring Boot → ERP PostgreSQL

Next.js BFF → BFF Session Store (separate Cloud SQL PostgreSQL HA)
                        ↓ logical encryption dependency
                       KMS (BFF performs wrapping/unwrapping)
```

### D. Implemented security properties

Preserved separate Platform/Tenant cookies, contexts and fixed namespaces, opaque
hash-addressed sessions, HttpOnly/Secure/Strict production cookie primitives,
exact-origin and CSRF primitives, and Spring's final authorization authority.
Added encrypted credential persistence, row/generation/owner fencing, durable
dispatch, atomic replacement/tombstones, SQL expiry checks, no refresh takeover or
retry, fail-closed errors/configuration, bounded fixed-origin HTTP transport,
fresh headers and safe response/error projection. No process-local session or
refresh lock is authoritative. No route consumes credentials or emits cookies.

The decision document records **control, test and remaining limitation** for each
requested threat: leakage, CSRF/XSS, SSRF/proxying, forged headers, both forms of
context confusion, refresh replay/race, logout race, cookie theft/tampering,
store outage/rollback, key loss/rotation, caching/logs, rate limits and redirects.

### E. Validation results

| Exact command/check | Result |
| --- | --- |
| `npm test` | PASS — 61 tests, 1 suite; zero failures/skips |
| `npm run test:bff` | PASS — 35 tests; zero failures/skips |
| `npm run test:bff:postgres` with `BFF_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/bff_contract_tests` | PASS — 17 tests (16 cases + parent), actual PostgreSQL 17; zero failures/skips |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS — zero errors; existing isSameScope warning at school-erp-documentation/code/examples/tenant-scoped-query.ts:8 |
| `npm run build` | PASS — Next 16.3.0, 95 existing source pages plus generated not-found, 68 static generation work items |
| `git diff --check` | PASS |
| `node node_modules/next/dist/bin/next start -p 3017` without BFF configuration | Expected rejection — exit 1; safe error, no configured BFF startup |
| Source routes compared with `.next/server/app-paths-manifest.json` | 95/95 present; no BFF handlers |
| Source UI imports and `.next/static` JS scan for server config/persistence and fixture-secret markers | No matches |
| Backend git status | Unchanged, clean |
| `npm audit --omit=dev --json` with network access | 31 existing production-tree advisories: 28 moderate, 2 high, 1 critical; release blocker |

Windows sandbox subprocess failures required approved reruns for tests/build.
Initial database timeout testing exposed pg checked-out connection error handling;
the adapter now handles terminal errors without leaking driver details. Final
PostgreSQL suite passed. Production startup testing exposed Next's retained
listener after a rejected instrumentation promise; explicit failure exit was
implemented and rechecked. The disposable PostgreSQL container is removed after
validation. No ERP database was used.

### F. Runtime evidence boundaries

| Claim | Evidence level |
| --- | --- |
| Implemented in repository | Yes — files above |
| Configured locally | Disposable PostgreSQL and local HTTP fixtures only; no retained production config |
| Validated with tests | Yes — unit/HTTP fixtures and real single-node PostgreSQL transactions |
| Validated against live GCP | No |
| Validated against live Spring | No — source inspection and fixtures only |
| Validated against real multi-instance deployment | No — separate pg pools/coordinator objects in one Node test process, not separate Cloud Run instances |
| Browser E2E/cookie runtime behavior | Not run; auth routes intentionally absent |

### G. Remaining blockers

Actual GCP project/configuration, DNS and certificates; Cloud Run deployments and
service-to-service IAM header integration; Cloud SQL HA/private TLS/grants; KMS
and Secret Manager provisioning; LB/default-run.app/internal ingress checks;
Cloud Armor preview/load tuning; Spring per-BFF rate-limit aggregation; clock and
capacity monitoring; multi-instance failover/rollback/key-loss drills; browser
E2E and live Spring integration; existing dependency advisories. The full
deployment decision document distinguishes these from code already tested.

### H. Next milestone

**Milestone 1 — HTTP Foundation completion → Milestone 2 — Production Session
Store Adapter → Milestone 3 — Platform Authentication.** Adapter code is now
present; Milestone 2 must qualify real deployment durability and integration.
Do not skip directly to UI authentication.
