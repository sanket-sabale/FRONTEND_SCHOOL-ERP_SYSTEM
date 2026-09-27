# Phase 12B frontend integration audit

Date: 2026-09-26. Milestone 0: audit and source API contract. Implementation status: **BLOCKED on browser session/security design; no application changes made**. This report distinguishes verified source behavior from recommendations and unexecuted runtime checks.

Subsequent work: [Milestone 0.5](../frontend/BFF-SESSION-CONTRACT.md) records the user-selected BFF architecture and tested security primitives. The original audit below remains historical; deployment/store/lifetime bindings are still open. See its [verification report](phase-12b-milestone-0-5.md).

## Scope and evidence

Read the 39-page `docs/Phase 12B Frontend Integration Specification.pdf` and the user's pasted implementation request. The requested first deliverable is AUDIT ONLY; conceptual endpoint/type examples are not assumed to be implemented APIs.

- Frontend: `D:/SCHOOL ERP SYSTEM/school-erp`, HEAD `4d2e6748c53191d495ec2f403da2a07c08ec2105`. Initial untracked PDF preserved.
- Backend: `D:/SCHOOL ERP SYSTEM/BACKEND/schoolerp`, HEAD `4dc728280317680ce806eed80071daacc26c73fc`; clean on inspection. Java 21, Spring Boot 4.1.1, Gradle wrapper, PostgreSQL/Flyway/Testcontainers.
- Frontend evidence: app route tree; components; features and feature-local services/hooks/types/schemas/actions; lib/api; storage/current-user/tenant-context; config/navigation; stores; tests; package/TypeScript/ESLint/Next configuration.
- Documentation: `docs/ARCHITECTURE.md`, `RULES.md`, `PRD.md`, `DESIGN.md`, `PHASES.md`, `MEMORY.md`, existing Phase 11/12 and admissions/dashboard documentation; README. Older roadmap/status claims are not treated as current runtime evidence.
- Backend evidence: all platform controllers and DTOs, corresponding services, session/refresh/JWT/security configuration, permission enum and V7 migration, common pagination/errors, rate limiting, Phase 12B documentation, API authentication/errors documentation, `SINGLE_ORIGIN_MIGRATION.md`, and platform integration-test source.
- Installed Next.js guides consulted: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and relevant authentication guidance. Layout checks alone cannot secure nested rendering/actions; put verification near protected data and at each entry point.

The [Platform API Contract](../frontend/PLATFORM-API-CONTRACT.md) contains the 23 verified mappings, DTOs, permissions, errors, pagination, rate limits, idempotency and limitations. No external web contract or invented endpoint was used.

## Frontend audit

| Area | Actual implementation | Classification / integration consequence |
| --- | --- | --- |
| Routes | App Router tenant pages for home, academics, admissions, attendance, communication, finance, guardians, staff, students, timetable, profile and security states. Full inventory below. No /platform routes. | ALREADY EXISTS; preserve URLs |
| Layouts / route groups | `src/app/layout.tsx` only; neutral HTML/body/metadata/global CSS. No tenant route-group layout to move. | REUSABLE; add platform-only nested layout/group |
| Shell | `src/components/app-shell.tsx` client component, instantiated by pages/loading/errors; includes fixed school/campus/year selectors, tenant navigation, theme, notifications, command palette, user profile, responsive sidebar. | ALREADY EXISTS; preserve tenant shell; new PlatformAppShell |
| Providers | No global auth/session/query provider or React createContext found. Root layout has no provider tree. | NEEDS NEW IMPLEMENTATION only within platform scope if required |
| Authentication | `/login` renders `features/auth/components/login-card.tsx`; form has no auth submission. `currentSessionRole` is principal; getCurrentUser returns demo identity. | MOCK ONLY, not authenticated tenant access |
| Sessions | No real TenantSession, PlatformSession, refresh coordinator, restoration or backend logout. | NEEDS NEW IMPLEMENTATION; do not relabel current mock as a session |
| API client | `lib/api/client.ts` defines ApiError, toUserMessage and tenant query key, but apiClient.get always throws a mock-mode error. Search found no consumer of apiClient. | ApiError REUSABLE/NEEDS EXTENSION; throwing client UNUSED placeholder |
| HTTP infrastructure | No fetch/axios transport calls found in src; feature API files call in-memory repositories/mock-backed services. | NEEDS NEW IMPLEMENTATION, not a second live transport |
| appStorage | Safe localStorage wrapper with browser/unavailable-storage guards. Used for theme, collapsed sidebar, command-palette recents and communication drafts. | SHARED INFRASTRUCTURE; never store auth credentials here |
| Permissions | `types/erp.ts`, `config/navigation.ts`, `components/shared/permission-gate.tsx`: static tenant roles and .view/action permissions, hasPermission(role, permission). Routes/services use demo role/scope. | MOCK ONLY authority; UI pattern reusable, authority map not reusable for platform |
| Tenant context | `lib/tenant-context.ts` fixed tenant/school/campus/year identifiers; `lib/mock-data.ts` compatibility data/export surface. | MOCK ONLY; cannot authorize live tenant requests |
| Middleware / Proxy | No middleware.ts, proxy.ts or existing route-handler authentication boundary found. | NEEDS NEW IMPLEMENTATION only if selected design needs it |
| Errors | ApiError numeric/network/timeout union; toUserMessage distinguishes 401/403/404/409/422/429. No normalized Spring Problem, field errors, Retry-After or refresh handling. | NEEDS EXTENSION; retain existing mock error compatibility |
| Loading / errors / empty | Many route loading.tsx and client error.tsx files; shared Skeleton, EmptyState, feature-specific error states; retry via reset. Coverage varies by route. | REUSABLE patterns; platform states must use platform shell |
| Design system | Tailwind 4, globals.css semantic tokens/dark mode/responsive utility classes; Button, LinkButton, Card, PageHeader, SectionHeader, Badge, Field, Select, EmptyState. | REUSABLE; no second UI library |
| Other components | shared DataTable, FilterBar, Skeleton, sidebar icon primitives. Existing sidebar/navigation/profile include tenant assumptions. No universal Dialog/Form/Input package inferred from PDF. | REUSABLE primitives; assess coupling before reuse |
| State / hooks | Local React state and feature hooks; stores/ui-store.ts defines UI types/defaults, not an installed global store. No top-level services/hooks/providers/utils directories; equivalents are feature-local or under lib. | ALREADY EXISTS; avoid new global state framework |
| Tests | Seven Node test-runner files for admissions/domain/service/enrollment/communication/finance/architecture; button type fixture. No configured component/browser E2E runner. | REUSABLE domain harness; NEEDS NEW security/component/E2E coverage |
| Environment | No frontend .env file found; no process.env API configuration references in src; Next config enables React compiler only, no upstream rewrite. package.json has dev/build/start/lint/test. | NEEDS NEW explicit server/browser configuration boundary |
| TypeScript / lint | Strict TypeScript, @/* alias, Next generated type includes; ESLint Next core-web-vitals/TypeScript. | REUSABLE; do not weaken checks |

The existing `lib/platform/*` name means platform-neutral utilities (tenant scope, money, dates), not SaaS platform authentication. Its `PermissionContext` contains tenant scope and a tenant Role. Its one-based `Pagination` is not the backend zero-based PageResponse. Existing money is INR-specific. None should be silently cast into the new platform API types.

### Mock and infrastructure classification

No feature service is declared REAL API READY merely because it has TypeScript contracts. The actual platform backend is source-ready for the supported operations; frontend integration remains absent.

| Files / family | Classification | Evidence / disposition |
| --- | --- | --- |
| lib/api students, guardians, academic-structure, student-placements, student-promotions, student-promotion-batches/audit | MOCK ONLY | Mock records/repositories and derived local operations; preserve |
| lib/api attendance, reports, exports, integrity, repairs, repair-batches/audit | MOCK ONLY | Mock attendance and local rule/query orchestration; preserve |
| lib/api staff, accounts, employment, documents, academic-assignments, workload, performance, attendance, leave | MOCK ONLY | Feature mock-backed repositories/services; preserve |
| lib/api admissions, admission-communication, admission-finance | MOCK ONLY | Facades/adapters to feature services and mock-backed workflows; preserve |
| lib/api finance, timetable, communication, student-documents, attachments | MOCK ONLY | In-memory/mock persistence or web attachment adapter; not live backend transport |
| features/admissions/services and features/finance/services/admission-finance-service | MOCK ONLY with reusable domain logic | Real local rules do not imply real HTTP/database authorization |
| features/dashboard/services/dashboard-service | MOCK ONLY | Imports getMockPrincipalDashboardSummary; never use for platform statistics |
| features/*/services/mock-*, admissions/mock, dashboard/mock, lib/mock-data | MOCK ONLY | Demo seed data and compatibility surfaces; not deletion candidates |
| lib/api/academic-placement-adapter | REUSABLE adapter over MOCK ONLY data | Existing domain boundary, no platform auth role |
| lib/api/attachment-contracts, feature schemas/rules/types, lib/platform dates/money/contracts | SHARED INFRASTRUCTURE / REUSABLE selectively | Preserve ownership and avoid importing tenant scope into platform |
| lib/api/client ApiError/toUserMessage/queryKey | SHARED INFRASTRUCTURE / NEEDS EXTENSION | Keep tenant queryKey tenant-only; normalize platform errors without breaking callers |
| lib/api/client apiClient | UNUSED placeholder | No callers found; deliberately throws rather than sends HTTP |
| Existing admission finance compatibility facade, mock-data barrel | LEGACY compatibility boundary, still referenced | Preserve until dedicated migration verifies callers |

## Backend audit summary

| Required audit area | Verified result |
| --- | --- |
| Auth endpoints | POST login/refresh/logout, GET me under /api/platform/auth |
| Delivery/session model | JSON bearer + opaque refresh tokens; database-backed platform session; no backend auth cookies |
| JWT | Separate key pair/issuer/audience; platform_access + PLATFORM claims; account/session/security versions; no tenant/membership claims accepted |
| Permissions | 14 exact platform.* authorities, using .read rather than PDF .view; full list in contract |
| Tenant operations | Paginated list/get, suspend/reactivate/deactivate; no search/status filter or archive API |
| Provisioning | POST tenants with required Idempotency-Key, transaction/hash/advisory lock, administrator invitation and subscription |
| Plans | List latest versions, create, PATCH new immutable version; no GET detail or historical version catalog |
| Subscriptions | List, get by tenant, PATCH; no subscription detail-by-ID/history API |
| Users | List, attach authority to existing active account, assign/remove roles, disable/enable; no password/account creation |
| Audit | List only, paginated, fixed order, JSON-string metadata; no detail/filter endpoint |
| Errors | Common Problem JSON; 400/401/403/404/409/429/500; no verified 422 mapping |
| Rate limits | Remote-address keyed login 5/min, refresh 30/min, platform mutations 60/min by checked-in configuration |
| Refresh | Single-use rotation with lock/replay-family revocation; do not retry an uncertain consumed credential |
| Logout | Requires valid bearer plus owned refresh credential; revokes persisted session/family; 204 success |
| Idempotency | Tenant provisioning only; key reused for identical logical operation, conflicting payload 409 |
| Pagination | Zero-based page, default 25/max 100 size; exact fixed sort literals, not arbitrary sorting |
| Platform/tenant separation | Separate ordered security chains/converters; database state rechecked; cross-plane integration tests present, not rerun |

### Existing tenant authentication: frontend versus backend

Frontend tenant login/session are demo-only. Backend account-first authentication already supports `/api/auth/login` with `loginId` meaning account email, direct token response for one membership and an opaque selection transaction for multiple memberships; selection/switching/me operate on validated membership identity. Backend documentation explicitly supersedes old Host-based tenant selection. Do not turn the frontend school selector into a trusted tenant header.

Backend tenant logout revokes refresh family but differs from platform persisted-session invalidation; do not share session semantics blindly. Tenant frontend migration belongs after the platform slice. Keep demo tenant data clearly separate from any authenticated production tenant identity.

## Specification gaps and security findings

1. **Blocking: browser session contract remains unimplemented.** Backend `SINGLE_ORIGIN_MIGRATION.md` explicitly retains bearer/body tokens and defers browser HttpOnly delivery/CSRF to frontend integration. No verified browser credential store, cookie ownership/path/expiry, BFF session persistence or deployment-wide refresh coordination exists. Returning JSON tokens does not settle these decisions. Per the user's stop rule, do not implement credential storage by guessing.
2. **Cross-origin integration gap:** CORS omits Idempotency-Key from allowed headers and Retry-After/X-Request-ID from exposed headers; allows only two local development origins and no credentials. Direct cross-origin provisioning is blocked. A same-origin BFF avoids browser-to-Spring CORS, but introduces its own cookie/CSRF/session responsibilities.
3. **Refresh concurrency:** backend simultaneous refresh has one winner and replay revokes family. A promise in one browser tab or one Node process is insufficient if credentials are shared across tabs/instances. Lost rotation responses need an explicit fail-closed recovery path. Replay revokes the refresh family, not directly the persisted session in that branch; do not promise stronger access revocation.
4. **Logout correctness:** platform logout needs an unexpired bearer and a matching refresh token. Coordinate refresh/logout, prevent late refresh resurrecting local state, and distinguish confirmed backend revocation from network-uncertain logout. Repeated revoked bearer can return 401.
5. **Capability gaps:** no dashboard aggregate, tenant search/status filter, arbitrary sorting, plan/detail/history, subscription history, audit detail/filtering, settings endpoint or role catalog. Mark unsupported controls unavailable; never fabricate metrics or fetch all pages for filtering.
6. **Provisioning delivery:** default delivery adapter is no-op. The success response proves transactional creation, not delivered invitation. Production onboarding requires a delivery implementation.
7. **User management:** create requires an existing ACTIVE global account. A form asking for password/new-account creation would be incorrect. Grant restrictions and final-super-admin protections remain backend decisions.
8. **Error edge cases:** missing-header and invalid-timezone exception paths require runtime tests; generic advice can map unhandled framework exceptions to 500. Do not document speculative 400 guarantees.
9. **XSS/storage/logging:** no dangerouslySetInnerHTML, token-storage or console logging matches found in src. Rich-text renderer creates React nodes and allowlists http/https/mailto URLs. appStorage also retains communication drafts, not only preferences; this existing data policy is outside the platform change. Source inspection is not a penetration test.
10. **Cookies/CSRF:** no existing frontend cookie contract. Any new cookie-authenticated mutations, including login/logout, need explicit origin/CSRF protection and Secure/HttpOnly/SameSite/path rules. Backend CSRF disablement applies to bearer API only.
11. **Credential leakage/redirects:** no current real credentials or returnTo flow to validate. New implementation must prohibit secrets in URLs, logs, errors, client props/RSC payloads and appStorage. Restrict returnTo to approved local platform routes, including encoded/backslash/protocol-relative cases.
12. **Deployment/cache/source maps:** Next config has no explicit production browser source-map opt-in or security headers. Deployed headers/artifacts were not audited. New authenticated responses must not enter shared caches. BFF proxying must use fixed upstream/allowlisted operations and strip caller-supplied auth/tenant headers.
13. **Rate limiting behind a BFF:** backend uses servlet remote address. All BFF users can share a bucket unless deployment design provides a trusted solution. Do not forward arbitrary client IP headers as authorization/rate-limit truth.

## Proposed architecture and decisions needed before coding

Recommendation, **not an implemented contract**: use a same-origin Next.js backend-for-frontend (BFF), with platform access/refresh tokens held server-side and a distinct opaque HttpOnly platform session cookie in the browser. Keep tenant credentials/session separate. This supports the requested browser restoration without JavaScript-persistent refresh tokens and avoids current cross-origin limitations.

Before implementing this proposal, establish:

- Intended deployment origin, HTTPS/dev behavior and Spring upstream configuration.
- Available durable BFF session store and per-session atomic refresh coordination across workers; no production in-memory-only fallback or direct use of backend private tables.
- Cookie lifetime/path/name, Secure/HttpOnly/SameSite settings; CSRF/origin policy for login, refresh, logout and every mutation.
- Session restoration, expiry/revocation, concurrent-tab behavior, uncertain refresh/logout failure behavior and safe observability.
- Development/test account provisioning and live Spring/PostgreSQL test environment. No credentials should be committed or placed in these docs.

An in-memory browser bearer model is technically compatible with the API but loses restoration on reload and exposes credentials to executing JavaScript; it is not silently selected to satisfy the full phase. Encrypted token cookies alone also do not solve concurrent rotation across requests/instances.

Reuse `lib/api/client.ts` error conventions, but introduce one low-level transport without changing unrelated mock services. Add an explicit platform facade which cannot call tenant paths or accept tenant credentials. Later tenantApi should reject /api/platform paths. No generic useAuth selecting whichever context exists.

Add `src/app/platform/login/page.tsx` outside a protected platform group; protected pages/layout under `src/app/platform/(protected)/...` retain public URLs. Add a platform-local session/DAL boundary and PlatformAppShell using current UI primitives. Root layout and tenant routes need no move. Verify protected data at page/DAL/handler boundaries; a layout/Proxy redirect is supplementary.

## Incremental implementation plan

| Milestone | Smallest coherent change | Required evidence before next step |
| --- | --- | --- |
| 0 Audit + contract | These two documents; resolve session design gate | Source mapping reviewed; baseline results recorded |
| 1 HTTP foundation | Extend compatible ApiError; one transport; typed platform DTOs/facade; fixed URL boundary; timeout/abort/Problem/Retry-After handling | Unit tests for errors, 204, abort, timeout, origin/path/header isolation; tenant tests/typecheck/lint/build |
| 2 Platform authentication | Dedicated login form and real backend login exchange through chosen credential boundary; never publish raw tokens | Valid/invalid credentials, validation, duplicate-submit and 429 tests |
| 3 Session/refresh/logout | Explicit platform session from real me; restoration; atomic single refresh; bounded retry; backend logout | Concurrent 401s, stale responses, rotation-loss, failure, logout races; no secrets in browser storage/logs |
| 4 Route protection | Guard each protected entry/data operation; sanitize platform returnTo; distinguish 401 and 403 | Direct loads/navigation/actions/handlers, expired session and malicious returnTo tests |
| 5 Platform shell | Separate responsive shell/nav using backend me permissions and existing primitives | No tenant selectors, correct permission gates; tenant shell regression |
| 6 Dashboard / first complete slice | Show real me identity/roles and supported operational links; no invented counts | Browser login -> real Spring -> session -> guard -> shell -> dashboard/me; logout -> guarded redirect |
| 7 Tenant management | Backend paginated list/get and permitted lifecycle operations | Bounded requests, supported fixed sort, loading/empty/error/403; unsupported filters absent |
| 8 Provisioning | Exact transactional DTO, planVersion selector, frozen operation/key for uncertain retries | Duplicate/concurrent retry, 409, validation, no false invitation delivery claim |
| 9 Plans/subscriptions | Latest-version list/create/update; tenant subscription get and update | Preserve version IDs, decimal precision and history semantics; no invented history endpoint |
| 10 Platform users | Existing-account authority creation, role grant/remove and enable/disable | Backend denied/self/final-admin cases; stale session handling |
| 11 Platform audit | Paginated safe DTO display | No raw arbitrary metadata; empty/error/permission tests |
| 12 Tenant auth integration | Separate account/membership login/session/client once tenant contract verified | Cross-plane rejection; no demo data presented as production tenant records |
| 13 Security/E2E | Real browser + Next + Spring + PostgreSQL tests and deployment review | All nine user-requested auth/isolation/logout/permission/refresh E2E cases; security and tenant responsive regression |

Milestones 1–6 are implementation checkpoints within the first functional slice; none alone is a completed authentication integration. Stop after that verified slice before expanding into domain screens. For each implementation milestone run typecheck, lint, relevant tests, build, route validation, security review, diff review and tenant regression review; update phase/frontend documents as actual behavior is added. Do not create empty documentation files claiming unbuilt features.

## Verification and limitations

- `npm test`: PASS, 26 tests, 0 failures/skips.
- `npx tsc --noEmit --incremental false`: PASS.
- `npm run lint`: PASS (exit 0), 0 errors; one pre-existing unused `isSameScope` warning in `school-erp-documentation/code/examples/tenant-scoped-query.ts:8`.
- `npm run build`: PASS; Next.js 16.3.0 compiled, typechecked and generated the route table successfully (68 static-generation work items; 95 source page routes plus generated not-found route).
- Route inventory: static/build validation PASS; no /platform routes or live HTTP boundary exists yet. Browser behavior is not covered by build success.
- Backend tests: source inspected only; not run. Existing historical backend reports are not fresh verification.
- Real-stack security E2E and responsive browser regression: NOT RUN in audit-only scope. Existing tenant behavior is protected by making no app changes and running available baseline checks, not by claiming unperformed browser checks.
- No backend, schema, package, authentication, route, or tenant-module changes. No secrets or private environment values recorded.
- Diff review: only the two new audit/contract Markdown files added; user's untracked PDF preserved. `git diff --check` passed for tracked changes; new document checks performed separately.

The audit/contract deliverables are reviewable. Platform implementation must remain blocked until the explicitly deferred browser session contract is established; full Phase 12B is not complete.

## Route and service inventory

The following source-derived inventory is appended during this audit. Route placeholders preserve their App Router names. Source service inventory records direct mock dependencies or delegation; absence of a mock import alone is not proof of live API readiness.

### Routes (95)

`	ext
/academics/academic-years
/academics/classes
/academics
/academics/promotions/[promotionId]
/academics/promotions/audit/[promotionId]
/academics/promotions/audit
/academics/promotions/bulk-preview
/academics/promotions
/academics/sections/[sectionId]/edit
/academics/sections/[sectionId]
/academics/sections/new
/academics/sections
/academics/student-placements
/admissions/applications/[applicationId]
/admissions/applications/new
/admissions/applications
/admissions/documents
/admissions/evaluations
/admissions
/admissions/reviews
/admissions/seats
/attendance/export
/attendance/history/[attendanceId]
/attendance/history
/attendance/integrity/[attendanceId]
/attendance/integrity/audit/[attendanceId]
/attendance/integrity/audit
/attendance/integrity/bulk-repair
/attendance/integrity
/attendance/integrity/repairs/[repairId]
/attendance/integrity/repairs
/attendance/mark
/attendance
/attendance/reports
/communication
/finance/dues
/finance/invoices
/finance
/finance/payments
/finance/receipts
/finance/refunds
/finance/reports
/guardians/[guardianId]
/guardians/new
/guardians
/login
/
/profile
/session-expired
/staff/[staffId]/academic-assignments/new
/staff/[staffId]/academic-assignments
/staff/[staffId]/account/create
/staff/[staffId]/account/link
/staff/[staffId]/account
/staff/[staffId]/documents/[documentId]
/staff/[staffId]/documents/new
/staff/[staffId]/documents
/staff/[staffId]/edit
/staff/[staffId]
/staff/[staffId]/performance/goals
/staff/[staffId]/performance
/staff/[staffId]/performance/reviews/new
/staff/[staffId]/performance/training
/staff/academic-assignments/[assignmentId]
/staff/academic-assignments
/staff/academic-assignments/workload
/staff/attendance/history
/staff/attendance
/staff/departments
/staff/designations
/staff/documents
/staff/hr-operations
/staff/leave
/staff/leave/requests
/staff/new
/staff
/staff/performance
/staff/performance/reviews/[reviewId]
/staff/performance/reviews
/staff/workload/[staffId]
/staff/workload
/students/[studentId]/edit
/students/[studentId]
/students/[studentId]/placement
/students/new
/students
/timetable/classes
/timetable/maker
/timetable
/timetable/rooms
/timetable/settings
/timetable/teachers
/timetable/templates
/timetable/versions
/unauthorized
`

### API boundary files

| File | Direct feature/mock dependency evidence |
| --- | --- |
| academic-placement-adapter.ts | @/features/students/types/student |
| academic-structure.ts | @/features/academic-structure/schemas/academic-structure.schema, @/features/academic-structure/services/academic-structure-rules, @/features/academic-structure/services/mock-academic-structure, @/features/academic-structure/types/academic-structure |
| admission-communication.ts | @/features/admissions/services/admission-communication-service |
| admission-finance.ts | @/features/finance/services/admission-finance-service |
| admissions.ts | @/features/admissions/services/admission-service |
| attachment-contracts.ts |  |
| attachments.ts |  |
| attendance-exports.ts | @/features/attendance/schemas/attendance-export.schema, @/features/attendance/types/attendance-export, @/features/attendance/types/attendance-report |
| attendance-integrity.ts | @/features/attendance/services/attendance-integrity-rules, @/features/attendance/types/attendance-integrity, @/features/attendance/types/attendance |
| attendance-repair-audit.ts | @/features/attendance/schemas/attendance-repair-audit.schema, @/features/attendance/services/attendance-repair-audit-rules, @/features/attendance/types/attendance-repair-audit, @/features/attendance/types/attendance-integrity, @/features/attendance/types/attendance-repair |
| attendance-repair-batches.ts | @/features/attendance/schemas/attendance-repair-batch.schema, @/features/attendance/services/attendance-repair-batch-rules, @/features/attendance/types/attendance-repair-batch |
| attendance-repairs.ts | @/features/attendance/schemas/attendance-repair.schema, @/features/attendance/services/attendance-repair-rules, @/features/attendance/services/mock-attendance-repairs, @/features/attendance/types/attendance-repair |
| attendance-reports.ts | @/features/attendance/schemas/attendance-report.schema, @/features/attendance/services/attendance-report-rules, @/features/attendance/types/attendance, @/features/attendance/types/attendance-report |
| attendance.ts | @/features/attendance/schemas/attendance.schema, @/features/attendance/services/attendance-rules, @/features/attendance/services/attendance-academic-context, @/features/attendance/services/mock-attendance, @/features/attendance/types/attendance |
| client.ts |  |
| communication.ts |  |
| finance.ts | @/features/finance/schemas/finance.schema, @/features/finance/services/finance-rules, @/features/finance/services/mock-finance, @/features/finance/types/finance |
| guardians.ts | @/features/guardians/schemas/guardian.schema, @/features/guardians/services/mock-guardians, @/features/guardians/types/guardian |
| staff-academic-assignments.ts | @/features/staff-academic-assignments/schemas/staff-academic-assignment.schema, @/features/staff-academic-assignments/services/staff-academic-assignment-rules, @/features/staff-academic-assignments/services/mock-staff-academic-assignments, @/features/staff-academic-assignments/types/staff-academic-assignment |
| staff-accounts.ts | @/features/staff-accounts/schemas/staff-account.schema, @/features/staff-accounts/services/staff-account-rules, @/features/staff-accounts/services/mock-staff-accounts, @/features/staff-accounts/types/staff-account |
| staff-attendance.ts | @/features/staff-attendance/schemas/staff-attendance.schema, @/features/staff-attendance/services/staff-attendance-rules, @/features/staff-attendance/services/mock-staff-attendance, @/features/staff-attendance/types/staff-attendance, @/features/staff/types/staff |
| staff-documents.ts | @/features/staff-documents/schemas/staff-document.schema, @/features/staff-documents/services/staff-document-rules, @/features/staff-documents/services/mock-staff-documents, @/features/staff-documents/types/staff-document |
| staff-employment.ts | @/features/staff-employment/schemas/staff-employment.schema, @/features/staff-employment/services/mock-staff-employment, @/features/staff-employment/types/staff-employment |
| staff-leave.ts | @/features/staff-leave/schemas/staff-leave.schema, @/features/staff-leave/services/mock-staff-leave, @/features/staff-leave/services/staff-leave-rules, @/features/staff-leave/types/staff-leave |
| staff-performance.ts | @/features/staff-performance/schemas/staff-performance.schema, @/features/staff-performance/services/staff-performance-rules, @/features/staff-performance/services/mock-staff-performance, @/features/staff-performance/types/staff-performance |
| staff-workload.ts | @/features/staff-workload/schemas/staff-workload.schema, @/features/staff-workload/services/staff-workload-rules, @/features/staff-workload/services/mock-staff-workload, @/features/staff/types/staff, @/features/staff-academic-assignments/types/staff-academic-assignment, @/features/staff-workload/types/staff-workload |
| staff.ts | @/features/staff/schemas/staff.schema, @/features/staff/services/staff-rules, @/features/staff/services/mock-staff, @/features/staff/types/staff |
| student-documents.ts | @/features/students/schemas/student.schema, @/features/students/services/student-documents, @/features/students/types/student |
| student-placements.ts | @/features/student-placements/schemas/student-placement.schema, @/features/students/services/mock-students, @/features/student-placements/services/mock-student-placements, @/features/student-placements/services/student-placement-rules, @/features/student-placements/types/student-placement, @/features/students/types/student |
| student-promotion-audit.ts | @/features/student-promotions/schemas/student-promotion-audit.schema, @/features/student-promotions/services/student-promotion-audit-rules, @/features/student-promotions/types/student-promotion-audit, @/features/student-promotions/types/student-promotion, @/features/student-placements/types/student-placement |
| student-promotion-batches.ts | @/features/student-promotions/schemas/student-promotion-batch.schema, @/features/student-promotions/services/student-promotion-batch-rules, @/features/student-promotions/types/student-promotion-batch |
| student-promotions.ts | @/features/students/services/mock-students, @/features/student-promotions/services/mock-student-promotions, @/features/student-promotions/schemas/student-promotion.schema, @/features/student-promotions/services/student-promotion-rules, @/features/student-promotions/types/student-promotion, @/features/student-placements/types/student-placement |
| students.ts | @/features/students/services/mock-students, @/features/students/schemas/student.schema, @/features/students/services/student-lifecycle, @/features/students/types/student |
| timetable.ts | @/features/academic-structure/services/mock-academic-structure, @/features/staff/services/mock-staff, @/features/timetable/services/timetable-rules, @/features/timetable/services/mock-timetable, @/features/timetable/schemas/timetable.schema, @/features/timetable/types/timetable |
