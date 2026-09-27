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
