# Platform API Contract

Audit date: 2026-09-26. Status: source-verified; live HTTP behavior not verified in this audit.

Backend: `D:/SCHOOL ERP SYSTEM/BACKEND/schoolerp`, commit `4dc728280317680ce806eed80071daacc26c73fc` (clean working tree when inspected). All Java paths below are relative to `src/main/java/com/application/schoolerp/` in that repository. Controllers, DTOs, services, security configuration and migrations take precedence over conceptual PDF examples.

## Common transport and errors

Milestone 1 follow-up (2026-09-27): the fixed BFF transport validates the four
existing auth operations without registering browser handlers. Spring's Platform
and Tenant context cleanup filters generate a new request UUID rather than
preserving incoming `X-Request-ID`. The BFF sends and returns its own generated ID;
end-to-end log correlation is not established. Backend source remains unchanged.

These are Spring Boot endpoints, not existing Next.js Route Handlers. Requests/responses use JSON, except successful 204 responses. UUIDs and instants are JSON strings; Java sets serialize as arrays. Amounts are Java `BigDecimal` (default JSON numeric serialization); no custom string serialization was established. Do not reuse the frontend INR-only money contract without an explicit decimal-safe adapter.

All endpoints except login and refresh require `Authorization: Bearer <platform access token>`. No tenant ID/header or membership selection is needed. Public auth requests should omit stale Authorization headers. No platform controller sets authentication cookies. Browser persistence and any Next.js cookie/BFF contract are **not defined by this backend API**.

Every endpoint inherits these error possibilities: 400 invalid input, 401 missing/invalid authentication where applicable, 403 permission/grant denial where applicable, and 500 unexpected failures. Resource lookups may return 404; domain/database conflicts return 409. Mutation endpoints may return 429. There is no verified 422 mapping. Missing required headers and other framework exceptions need live verification: the catch-all advice can map exceptions not explicitly handled to 500; do not promise 400 for every framework validation failure.

`common/web/ApiProblem.java`, `GlobalExceptionHandler.java`, security problem handlers and `ProblemResponseWriter.java` define `application/problem+json`:

```ts
type ApiProblem = {
  type: string; title: string; status: number; code: string;
  message: string; detail: string; path: string; timestamp: string;
  traceId: string; fieldErrors: { field: string; message: string }[];
  fields: Record<string, string>;
};
```

Codes: `VALIDATION_ERROR`, `INVALID_REQUEST` (400); `AUTHENTICATION_REQUIRED`, `AUTHENTICATION_FAILED`, `INVALID_TOKEN`, `TENANT_CONTEXT_REQUIRED` (401, dependent on failure path); `PERMISSION_DENIED` (403); `RESOURCE_NOT_FOUND` (404); `CONFLICT` (409); `RATE_LIMIT_EXCEEDED` (429); `INTERNAL_ERROR` (500). Branch on HTTP status and stable code, not message text. Do not include rejected credentials in telemetry. `X-Request-ID` corresponds to safe correlation information in `traceId`.

### Rate limiting

`security/ratelimit/RateLimitPolicyResolver.java`, `RateLimitKeyResolver.java`, `RateLimitFilter.java` and `src/main/resources/application.properties`:

| Policy | Endpoints | Checked-in setting |
| --- | --- | --- |
| PLATFORM_LOGIN | POST auth/login | 5 per 1 minute |
| PLATFORM_REFRESH | POST auth/refresh | 30 per 1 minute |
| PLATFORM_MUTATION | Other POST/PATCH/DELETE under /api/platform/ (including logout) | 60 per 1 minute |
| None selected | Platform GET endpoints | No platform GET policy in resolver |

Enabled in checked-in configuration; deployment overrides may differ. Keys use servlet remote address, not untrusted forwarded headers. 429 includes integer `Retry-After` seconds. A reverse proxy/BFF can aggregate users behind one remote address; validate deployment rate-limit behavior before release.

### Browser CORS limitations

`security/config/SecurityConfig.java` allows only `http://localhost:3000` and `http://localhost:5173`; methods GET/POST/PUT/PATCH/DELETE/OPTIONS; request headers Authorization and Content-Type; credentials disabled. It does not expose `Retry-After` or `X-Request-ID`, or allow `Idempotency-Key`. Consequently direct cross-origin provisioning preflight cannot succeed with the required header, and browser JS cannot reliably read those response headers cross-origin. Same-origin infrastructure or an explicit backend CORS change is needed. CSRF is disabled on the stateless bearer API; this is not a CSRF policy for a future cookie-authenticated BFF.

### Pagination, sorting, filtering

All five list endpoints use `common/web/PageResponse.java` and `PaginationPolicy.java`:

```ts
type PageResponse<T> = {
  content: T[]; page: number; size: number; totalElements: number;
  totalPages: number; first: boolean; last: boolean;
};
```

`page` defaults to 0 and must be >= 0. `size` defaults to 25, allowed 1–100 in checked-in configuration. `sort` is an exact allowed literal, **not** general Spring sorting; omit it to use the fixed order. Unsupported values return 400. No list controller accepts search or status filters.

| List | Only accepted sort literal | Actual fixed order |
| --- | --- | --- |
| Tenants | `name,id` | name ascending, id ascending |
| Plans | `code,id` | code ascending, id ascending |
| Subscriptions | `createdAt,id` | createdAt descending, id ascending |
| Users | `email,id` | account.email ascending, accountId ascending |
| Audit | `createdAt,id` | createdAt descending, id descending |

For every non-list operation below, pagination/sorting/filtering are not applicable. For every operation except tenant provisioning, no idempotency-key contract is implemented. Do not automatically retry mutations simply because an HTTP method appears repeatable.

## Authentication

Sources: `platform/auth/PlatformAuthController.java`, `PlatformAuthService.java`, `platform/auth/dto/*`, `platform/session/PlatformRefreshTokenService.java`.

### Login

- Method/path/purpose: `POST /api/platform/auth/login`, authenticate an existing active platform identity.
- Authentication/permission: public credential exchange; account and active platform assignment required, no tenant role accepted as platform authority.
- Request: `{ email, password }`; email nonblank valid email max 320; password nonblank length 12–200.
- Response: 200 `PlatformTokenResponse` below. Invalid credentials/authority: generic 401; DTO errors: 400; rate limit: 429; common errors also apply.
- Rate limiting: PLATFORM_LOGIN. No pagination or idempotency.

```ts
type PlatformTokenResponse = {
  accessToken: string; refreshToken: string; tokenType: string; // emitted as "Bearer"
  expiresIn: number; // access-token lifetime in seconds
  roles: string[];
};
```

Login does not return permissions, account name/email, tenant, membership, or a complete frontend session. Call me after login. Never render or persist the raw response through ordinary appStorage.

### Refresh

- `POST /api/platform/auth/refresh`; public at security chain, authenticated by body credential.
- Request: `{ refreshToken: string }`, nonblank, max 512.
- Response: 200 `PlatformTokenResponse` with replacement access AND refresh token; 400/401/429 plus common errors.
- Permission: no named permission; persisted token/family/session/account/identity/version validity enforced.
- Rate limiting: PLATFORM_REFRESH. No pagination/idempotency. Refresh is **not retry-safe** with the consumed token.

Refresh credentials use 64 random bytes encoded base64url; only SHA-256 hashes persist. Rotation locks the presented token and session. Reuse/unusable token revokes the family and active refresh tokens, audits denial, and returns 401. The reuse branch does **not** call session.revoke(), so do not claim immediate access-JWT revocation from replay alone. Existing access is separately checked against persisted session validity and security versions. Session expiry is fixed at login; issuing a new refresh token does not extend the session's original expiry. Centralize refresh across all requests sharing credentials, including tabs/server workers if the eventual storage model shares them. A lost rotation response must not cause an automatic old-token retry.

### Logout

- `POST /api/platform/auth/logout`; valid platform bearer **and** `{ refreshToken }` required (same validation as refresh).
- No additional named permission; body token must belong to the authenticated account and session.
- Response: 204 no body; invalid/foreign token 401, malformed body 400, rate limit 429; common errors apply.
- Policy: PLATFORM_MUTATION. No idempotency-key guarantee.

Revokes platform session, family, and active refresh tokens. JWT validation reads persisted session state, so revoked platform access is rejected. Repeating with the now-revoked bearer can return 401; do not copy tenant logout's documented idempotent behavior. An expired bearer requires careful refresh/logout coordination. Local UI clearing alone is not proof of backend logout.

### Me

- `GET /api/platform/auth/me`; authenticated platform bearer; no additional named permission.
- Response: 200 `{ accountId: UUID, sessionId: UUID, authenticationAssurance: string, roles: string[], permissions: string[] }`.
- Invalid session/token: 401; common errors apply. No selected rate policy, pagination, filters or idempotency.
- No display name/email, authenticated boolean, tenantId, membershipId or sessionState is returned. Frontend loading/authenticated/error state must be explicitly frontend-owned.

### JWT and authority separation

Sources: `platform/security/PlatformJwtTokenService.java`, `PlatformJwtAuthenticationConverter.java`, `PlatformJwtProperties.java`, `security/config/SecurityConfig.java`, tenant `SchoolJwtAuthenticationConverter.java`.

Platform and tenant use separate RSA key pairs, issuers, audiences and converters/security chains. Platform defaults: issuer `schoolerp-platform-local`, audience `school-erp-platform-api`, access TTL 5 minutes, refresh/session TTL 12 hours. These are checked-in defaults, not verified deployed settings.

Platform claims: standard `iss`, `aud`, `iat`, `nbf`, `exp`, `jti`, `sub` (account UUID); `typ=platform_access`, `authority_plane=PLATFORM`, `platform_session_id`, `credential_version`, `platform_security_version`, `authentication_assurance`, `roles`, `permissions`. Converter rejects tenant_id/membership_id claims and an existing tenant context, checks account/session/identity state and current versions, and rebuilds effective authorities from the database. Decoding a JWT in the browser is not session verification.

## Tenants

Sources: `platform/tenant/PlatformTenantController.java`, `PlatformTenantLifecycleService.java`, `platform/tenant/dto/*`, `platform/provisioning/PlatformTenantProvisioningService.java`, `platform/provisioning/dto/*`.

`TenantResponse = { id, code, name, status, securityVersion }` (id UUID, version integer, other fields strings).

| Operation | Method/path | Permission | Request | Success | Additional expected errors | Rate |
| --- | --- | --- | --- | --- | --- | --- |
| List | GET /api/platform/tenants | platform.tenant.read | page/size/sort as above | 200 PageResponse<TenantResponse> | 400 pagination | None selected |
| Get | GET /api/platform/tenants/{tenantId} | platform.tenant.read | UUID path | 200 TenantResponse | 404 | None selected |
| Provision | POST /api/platform/tenants | platform.tenant.create | CreateTenantRequest + Idempotency-Key | 200 TenantProvisioningResponse | 404 plan version; 409 duplicate/ineligible/conflicting operation | PLATFORM_MUTATION |
| Suspend | POST /api/platform/tenants/{tenantId}/suspend | platform.tenant.lifecycle.manage | UUID + { reason } | 200 TenantResponse | 404, 409 invalid transition | PLATFORM_MUTATION |
| Reactivate | POST /api/platform/tenants/{tenantId}/reactivate | platform.tenant.lifecycle.manage | UUID + { reason } | 200 TenantResponse | 404, 409 invalid transition | PLATFORM_MUTATION |
| Deactivate | POST /api/platform/tenants/{tenantId}/deactivate | platform.tenant.lifecycle.manage | UUID + { reason } | 200 TenantResponse | 404, 409 invalid transition | PLATFORM_MUTATION |

All inherit the common bearer/error contract. Lifecycle reason: nonblank max 500. No archive endpoint exists, although ARCHIVED exists in the domain. Lifecycle invalidation is backend-owned; never revive credentials locally after reactivation.

### Provisioning payload and idempotency

```ts
type CreateTenantRequest = {
  code: string; name: string; initialAdministratorEmail: string;
  initialLoginId: string; planVersionId: string; timezone: string; locale: string;
};
type TenantProvisioningResponse = {
  tenantId: string; accountId: string; membershipId: string;
  subscriptionId: string; tenantStatus: string; invitationDelivery: string;
};
```

All request fields required. Code max 50, regex `[A-Za-z0-9][A-Za-z0-9_-]*`; name max 200; administrator email valid email max 320; login ID max 100; planVersionId UUID; timezone max 60 and Java ZoneId validation; locale max 20, regex `(?i)[a-z]{2,8}(-[a-z0-9]{1,8})*`. Invalid timezone exception mapping requires a live check rather than assuming every invalid zone returns 400.

`Idempotency-Key` required, nonblank max 100, regex `[A-Za-z0-9._:-]+`; UUID is a compatible frontend choice but not a backend requirement. Key is global in the request repository, not scoped to a browser tab. Transaction advisory lock + stored canonical request hash: same key/same completed input returns stored result; differing input or processing state returns 409. Retain the key and frozen request for uncertain-outcome retries. New logical input requires a new operation.

Provisioning atomically creates tenant/configuration, eligible account and invited administrator membership/role, active subscription/history, hashed invitation and audit; final tenant state ACTIVE. No password is accepted. Response invitationDelivery is `POST_COMMIT_DELIVERY_BOUNDARY`, **not confirmation of email delivery**. Default `NoOpPlatformInvitationDelivery` sends nothing. A real delivery adapter is an onboarding dependency.

## Plans

Sources: `platform/subscription/PlatformPlanController.java`, `PlatformPlanService.java`, DTOs and enums in that directory.

| Operation | Method/path | Permission | Request | Success | Additional errors | Rate |
| --- | --- | --- | --- | --- | --- | --- |
| List latest versions | GET /api/platform/plans | platform.plan.read | page/size/sort | 200 PageResponse<PlanResponse> | 400 pagination | None selected |
| Create | POST /api/platform/plans | platform.plan.manage | CreatePlanRequest | 200 PlanResponse | 409 duplicate code | PLATFORM_MUTATION |
| New version/update | PATCH /api/platform/plans/{planId} | platform.plan.manage | UUID + UpdatePlanRequest | 200 PlanResponse | 404 | PLATFORM_MUTATION |

All require bearer and inherit common errors. No idempotency support, detail GET, version-list endpoint or historical-version GET exists. PATCH creates an immutable version; it is not a sparse patch and repeated submissions can create extra versions.

Create: code nonblank max 60, name nonblank max 160, amount required nonnegative max 17 integer/2 fractional digits, currency required exactly 3 characters, billingInterval required `MONTHLY|ANNUAL`, optional effectiveFrom instant (defaults to now), optional entitlements array max 100 (null defaults empty).

Update: same fields except code absent; name/amount/currency/billingInterval remain required. Entitlement input: code nonblank max 100, description nonblank max 300, enabled boolean, nullable numericLimit >= 0 (Java Long). Do not infer ISO-currency validation solely from the three-character DTO constraint.

PlanResponse: `{ id, code, name, status, versionId, version, amount, currency, billingInterval, effectiveFrom, entitlements: [{ code, enabled, numericLimit }] }`. IDs UUID; version integer; amount BigDecimal; effectiveFrom instant; nullable limit Long. Response omits entitlement description. Lists expose highest version number, not a selectable history. Existing subscriptions retain historical version references.

## Subscriptions

Sources: `platform/subscription/PlatformSubscriptionController.java`, `PlatformSubscriptionService.java`, `Subscription.java`, DTOs.

| Operation | Method/path | Permission | Request | Success | Additional errors | Rate |
| --- | --- | --- | --- | --- | --- | --- |
| List | GET /api/platform/subscriptions | platform.subscription.read | page/size/sort | 200 PageResponse<SubscriptionResponse> | 400 pagination | None selected |
| Get for tenant | GET /api/platform/tenants/{tenantId}/subscription | platform.subscription.read | UUID | 200 SubscriptionResponse | 404 | None selected |
| Update | PATCH /api/platform/subscriptions/{subscriptionId} | platform.subscription.manage | UUID + UpdateSubscriptionRequest | 200 SubscriptionResponse | 404 subscription/version, 409 transition | PLATFORM_MUTATION |

All inherit common bearer/errors. No idempotency, subscription-by-ID GET, independent creation endpoint or history-list endpoint exists.

Update: required planVersionId UUID, status `PENDING|ACTIVE|SUSPENDED|CANCELLED|EXPIRED`, optional endsAt instant, required nonblank reason max 500. Response: `{ id, tenantId, tenantName, planId, planVersionId, planCode, status, startsAt, endsAt }`; endsAt may be null. Backend locks and validates changes and appends history. Do not calculate entitlement truth or reconstruct missing historical prices in the frontend.

## Platform Users

Sources: `platform/identity/PlatformIdentityAdminController.java`, `PlatformIdentityAdminService.java`, DTOs.

`PlatformUserResponse = { accountId: UUID, email: string, status: string, roles: string[] }`.

| Operation | Method/path | Permission | Request | Success | Additional errors | Rate |
| --- | --- | --- | --- | --- | --- | --- |
| List | GET /api/platform/users | platform.user.read | page/size/sort | 200 PageResponse<PlatformUserResponse> | 400 pagination | None selected |
| Create platform identity | POST /api/platform/users | platform.user.manage AND platform.role.manage | { email, roles } | 200 PlatformUserResponse | 404 eligible account/role, 409 existing identity | PLATFORM_MUTATION |
| Assign roles | POST /api/platform/users/{accountId}/roles | platform.role.manage | { roles } | 200 PlatformUserResponse | 404; 403 self/grant checks | PLATFORM_MUTATION |
| Remove roles | DELETE /api/platform/users/{accountId}/roles | platform.role.manage | JSON { roles } | 200 PlatformUserResponse | 404; 403 self/grant checks; 409 final super admin | PLATFORM_MUTATION |
| Disable | POST /api/platform/users/{accountId}/disable | platform.user.manage | UUID path, no body | 204 | 404; 403 self-disable; 409 final super admin | PLATFORM_MUTATION |
| Enable | POST /api/platform/users/{accountId}/enable | platform.user.manage | UUID path, no body | 204 | 404; 409 inactive global account | PLATFORM_MUTATION |

All inherit common bearer/errors. No idempotency-key support. Email nonblank valid email max 320. Roles required nonempty set, max 4: `PLATFORM_SUPER_ADMIN`, `PLATFORM_ADMIN`, `PLATFORM_SUPPORT`, `PLATFORM_VIEWER`. Creation attaches authority to an **existing ACTIVE global account**; it does not create a password/account or send an invitation. Role changes are grant-bounded by fresh effective permissions, not role-name hierarchy. Role/status changes invalidate sessions as implemented by the service. There is no user-detail GET, session-management list or role-catalog GET.

## Audit

`GET /api/platform/audit`: bearer + `platform.audit.read`; page/size/sort above; 200 `PageResponse<PlatformAuditResponse>`, common errors and 400 pagination; no selected GET rate policy or idempotency. Sources: `platform/audit/PlatformAuditController.java`, `PlatformAuditQueryService.java`, `PlatformAuditResponse.java`.

Response fields: `id`, `actorAccountId`, `platformSessionId`, `action`, `targetType`, `targetId`, `reason`, `outcome`, `requestId`, `traceId`, `authenticationAssurance`, `metadata`, `createdAt`. IDs UUID, createdAt instant, remaining values strings; actor/session/target/reason/correlation fields may be absent/null according to event. `metadata` is a JSON-encoded **string**, not a typed object. Outcomes: SUCCESS/FAILURE/DENIED. Backend sanitizes metadata, but frontend must display an explicit safe field allowlist and never dump arbitrary raw metadata. No audit-detail GET or actor/action/date filtering exists.

## Exact permission catalog

`platform/identity/PlatformPermissionCode.java` and migration `V7__platform_control_plane_foundation.sql`:

```text
platform.dashboard.read
platform.tenant.read
platform.tenant.create
platform.tenant.lifecycle.manage
platform.plan.read
platform.plan.manage
platform.subscription.read
platform.subscription.manage
platform.user.read
platform.user.manage
platform.role.read
platform.role.manage
platform.audit.read
platform.settings.manage
```

No `.view` aliases. Dashboard/settings/role-read permissions do not imply corresponding endpoints exist. Use `/auth/me` permissions for navigation; backend remains authoritative for operations. No dashboard aggregate or settings controller was found.

## Verification limits and next decisions

Source contract audit covers all 23 platform controller mappings. `PlatformControlPlaneIntegrationTests` includes cross-plane rejection, bounds, refresh replay/concurrency, provisioning rollback/idempotency, role invalidation, audit sanitization and final-admin concurrency. Tests were inspected, not executed in this audit; no browser or deployed-stack success is claimed.

The subsequent [Milestone 0.5 BFF Session Contract](BFF-SESSION-CONTRACT.md) selects opaque HttpOnly browser sessions, server-held credentials, CSRF and fenced refresh/logout semantics. Deployment origin/upstream, shared-store durability, lifetimes, encryption keys and proxy topology remain explicit open decisions. See [integration audit](../phases/phase-12b-frontend-integration-audit.md) for the original baseline and milestone sequence.
