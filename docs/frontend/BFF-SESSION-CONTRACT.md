# Browser Session + Thin Next.js BFF Security Contract

Milestone 0.5 · 2026-09-26 · Contract version 0.5

**Status: security invariants and executable transition contract defined; deployment bindings OPEN. Not a deployed BFF or a production-readiness claim.** The user's Milestone 0.5 instruction selects opaque HttpOnly cookies and server-held credentials. It supersedes the earlier audit's open choice between browser bearer storage and a BFF. It does not supply store, topology or lifetime values; those remain explicit release gates.

## 1. Purpose, scope and evidence

Keep backend access/refresh credentials out of browser JavaScript while retaining Spring Boot as the identity, authorization and business authority. This document specifies the web boundary; it does not change tenant ERP behavior or implement login/business routes.

Source audit: frontend `src/app`, AppShell, `lib/api/client.ts`, `lib/storage.ts`, existing [Phase 12B audit](../phases/phase-12b-frontend-integration-audit.md), [Platform API Contract](PLATFORM-API-CONTRACT.md), `docs/DESIGN.md`, `ARCHITECTURE.md`, `PRD.md`, `RULES.md`, and the previously read 39-page Phase 12B PDF. Requested `RULES(1).md` was not found; the existing `docs/RULES.md` is used, with no substitute rules invented.

Backend remains `D:/SCHOOL ERP SYSTEM/BACKEND/schoolerp`. Verified platform controller/DTO/session/converter and tenant `auth/web/AuthController.java`, `auth/dto/*`, `auth/application/AuthService.java`, `auth/token/RefreshTokenService.java`, `security/jwt/JwtProperties.java`, and security configuration. Platform/tenant behavior is not assumed identical. No configured OAuth login/callback implementation was found; an OAuth client dependency alone is not an endpoint contract.

Installed Next.js 16.3 guides: Route Handlers, backend-for-frontend, cookies and authentication. Cookie access is asynchronous; mutation occurs in a Route Handler/Server Function before streaming, not during Server Component rendering. Layout/Proxy checks are supplementary; protected entry points and backend requests remain guarded.

External guidance reviewed: the BFF pattern keeps tokens server-side, uses hardened cookies and restricts outbound destinations. HttpOnly does not stop malicious JavaScript from issuing requests through the browser. These principles align with [RFC 10017, section 6.1](https://www.rfc-editor.org/rfc/rfc10017.html#section-6.1). Origin checking and synchronizer-token protection are informed by [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). Project-specific choices below are this contract, not invented Spring behavior.

## 2. Architecture and non-goals

```text
Browser --platform opaque cookie--> Platform BFF --platform bearer--> /api/platform/**
Browser --tenant opaque cookie----> Tenant BFF ----tenant bearer----> /api/** excluding /api/platform/**
                           |                                  |
                 shared durable session store             Spring Boot
                 encrypted credential envelopes       authority/business rules
```

BFF duties: cookie/session lookup, CSRF/origin validation, auth exchanges, credential attachment, refresh/logout coordination, explicit upstream mapping, safe errors and correlation. It does not maintain a permissions database, resolve tenant authority from Host, aggregate business data, calculate subscriptions, access Spring private tables, or bypass backend authorization.

No generic useAuth, generic credential resolver or arbitrary proxy. Separate PlatformSession/TenantSession, brokers, namespaces and facades. A browser can hold both cookies simultaneously; each route reads only its own context. Being a platform administrator confers no tenant session. Shared low-level cryptography, policy and CAS transitions do not choose context from browser input.

Non-goals: platform screens, tenant rewrite, mock migration, new Spring auth system, OAuth implementation, provider configuration, mobile login, business transport, session-store vendor selection and deployment qualification. No new BFF routes are active in this milestone.

## 3. Verified backend differences

| Detail | Platform | Tenant |
| --- | --- | --- |
| Login | POST /api/platform/auth/login; email/password (password 12–200) | POST /api/auth/login; loginId account email/password (max 200) |
| Token response | accessToken, refreshToken, tokenType, expiresIn, roles | accessToken, refreshToken, tokenType, expiresInSeconds, tenantId, membershipId, roles |
| Me | accountId, sessionId, authenticationAssurance, roles, permissions | accountId, tenantId, membershipId, roles, permissions |
| Backend session ID | Supplied by me | Not supplied; do not invent one |
| Checked-in lifetimes | Access 5 minutes; refresh and fixed session 12 hours | Access 10 minutes; refresh token 30 days; rotation creates a new expiry |
| Refresh | Public POST /api/platform/auth/refresh, body refreshToken, rotating single-use | Public POST /api/auth/refresh, body refreshToken, rotating single-use |
| Logout | Valid bearer + matching refresh; 204; persisted platform session/family revoked | Valid tenant bearer + refresh; owned family revoked, 204; access JWT may remain valid until expiry/security-version invalidation |
| Context choice | Active platform identity/roles in Spring | Account-first one-membership tokens or membership-selection transaction |

Defaults are not verified deployed values. Neither me response contains absolute session expiry. Platform token response's expiresIn is access lifetime only. Tenant has no verified platform-style absolute session deadline. Never compute either from the wrong field or assume infinite browser sliding lifetime. Backend rejection always overrides BFF metadata.

## 4. Cookie contract

| Property | Platform | Tenant |
| --- | --- | --- |
| HTTPS name | __Host-schoolerp_platform_session | __Host-schoolerp_tenant_session |
| Value | Independently generated 32 random bytes, unpadded base64url (43 characters) | Same format, independent ID |
| Secure / HttpOnly | true / true | true / true |
| SameSite | Strict | Strict |
| Path | / | / |
| Domain | Omitted | Omitted |
| Max-Age / Expires | floor((absoluteExpiresAt - now)/1000), corresponding UTC deadline | Same formula |
| Idle validity | Enforced by store even if cookie remains | Same |

Session IDs contain no identity, tenant, JWT, refresh token or serialized object. Lookup keys are SHA-256(context + ':' + ID), separate by environment and namespace. Format validation is not authentication: a modified but well-formed ID still needs an existing record. Reject duplicate same-name cookies, malformed values and context mismatch. Do not log raw IDs or their reusable hashes.

Rotate ID and CSRF binding on successful login/reauthentication and successful tenant membership switch; old record is atomically tombstoned. Do not rotate on every refresh: that creates competing Set-Cookie writes across tabs. There is no periodic rotation schedule invented here. Never upgrade an anonymous/pre-auth ID into an authenticated one. One current session per browser cookie per context; unrelated devices' sessions are not globally revoked.

Deletion uses the same name, Path, flags and no Domain, with Max-Age=0 and epoch Expires. Delete only the selected context. Server invalidation is authoritative; clearing a cookie alone is insufficient.

Explicit local HTTP exception: opt-in development mode, loopback origin only (`localhost`, `127.0.0.1`, `::1`), names `dev_schoolerp_platform_session` and `dev_schoolerp_tenant_session`, Secure omitted, all other restrictions retained. Production/staging use HTTPS names and must refuse local mode. Never use a __Host name without Secure. The primitive takes an explicit mode; future startup configuration must enforce environment binding. No production origin is inferred from Host.

## 5. Session store and secret storage

The store adapter is **not selected or implemented**. Its conformance contract requires:

- Expected O(1) namespace/key lookup and record updates, expiry checked on every authenticated operation; TTL is cleanup, not authorization.
- Atomic create-if-absent, linearizable get/CAS, atomic old-ID invalidation + replacement creation, explicit expire, versioned tombstone and eventual tombstone deletion.
- Shared state and fencing across all Next workers/instances; no process-local fallback. Per-process promise deduplication may optimize but cannot authorize dispatch.
- Durable acknowledged refresh-dispatch records that survive failover. If a store can roll back an acknowledged DISPATCHED marker, it cannot safely coordinate single-use credentials. Store/provider choice must establish this property; a Redis name alone does not establish it.
- Finite lease/deadline and bounded wait; values depend on upstream timeout, clock bounds and topology (OPEN). Once a lease expires, this contract invalidates the session rather than allowing refresh takeover—even for RESERVED. This deliberately favors safety over availability.
- On unavailable/ambiguous store read/write: deny credential use, return 503; no cookie-derived or memory-derived bypass. Reconcile a timed-out CAS by authoritative read before any dispatch. If reconciliation is impossible, no dispatch.

Record schema in `src/server/bff/session-contract.ts` is the executable **transition subset**, not a production persistence schema. Full adapter record must include: context-bound key, schema/version/generation, createdAt, lastAccessedAt (for approved POST activity), idleExpiresAt, absoluteExpiresAt, accessExpiresAt, method/provider metadata when verified, current credential-envelope reference, credentialVersion, CSRF verifier, safe identity binding established by me, status and refresh attempt. Platform identity binding may retain backend sessionId server-side; tenant retains accountId/tenantId/membershipId and has no invented backend session ID.

Credential envelope: access + refresh pair encrypted together with authenticated encryption, key ID and unique nonce; associated data binds environment, context, session key and credential version. Keys come from a managed secret/KMS boundary, separate from stored ciphertext and backups. Access restricted to BFF runtime/adapter; encryption-at-rest and TLS on store connections required. Never store credentials in generic app data. The envelope reference is not a browser field. Version/CAS commits the pair atomically; secret-store writes before failed CAS require orphan cleanup. Garbage collection must not expose or replay an orphan pair. Key rotation, retention and restore policy are OPEN deployment decisions.

Session records contain no business objects, tenant lists, subscription data or permission catalog. Safe roles/permissions snapshots, if retained briefly for UI, are never backend authorization. Avoid persisting them unless needed; fetch me for restoration, not before every business request.

## 6. Safe browser session projections

Browser session endpoint returns a discriminated safe view:

```ts
type PlatformSession = {
  authenticated: true; context: 'PLATFORM'; accountId: string;
  roles: string[]; permissions: string[]; expiresAt: string;
};
type TenantSession = {
  authenticated: true; context: 'TENANT'; accountId: string;
  tenantId: string; membershipId: string;
  roles: string[]; permissions: string[]; expiresAt: string;
};
```

These are BFF DTOs, not claimed Spring DTOs. expiresAt means **BFF effective expiry** (minimum current idle/absolute deadline), not backend refresh/session expiry. Other identity fields come only from the corresponding successfully validated me response. No fabricated name/email/account profile. Platform sessionId/assurance are omitted from the browser projection unless a later UX requirement justifies them. Never spread an upstream token response/record into JSON or RSC props. Unauthenticated response has authenticated:false and the explicit context, without identity fields.

Runtime response validation and secret-safe error normalization are Milestone 1/2 work; TypeScript does not validate JSON. `safeSession` is an allowlist projector for already validated identity, not a validator. method PASSWORD/OIDC and optional provider identifier are server-only metadata; current backend assurance is not reinterpreted as a universal method enum.

## 7. Origin, headers and CSRF

One configured canonical browser origin per deployment. `https://schoolerp.com` is a historical architecture target, **not confirmed deployment configuration**. Development may explicitly configure `http://localhost:3000`. Startup rejects invalid origin, non-HTTPS outside local exception, credentials/path/query/fragment. Staging/preview domains require explicit environment entries, not a wildcard. Do not derive allowlists from Origin, Referer, Host or forwarded headers. Trusted ingress routing must bind requests to that configured deployment.

All state-changing routes require exact Origin match; missing/null Origin rejected with 403, no Referer fallback. If Sec-Fetch-Site is supplied, require same-origin (same-site subdomain is insufficient). Require application/json and `X-SchoolERP-CSRF` containing a context/session-bound unpredictable synchronizer token, verified in constant time against server state. No permissive CORS/preflight for BFF. SameSite is defense in depth, not the whole policy.

CSRF proof is not an authentication credential: it may exist transiently in client memory and is sent only in a custom header; never URL/localStorage/logs. It cannot authorize without the matching HttpOnly cookie. Rotate with session ID, expire with the associated record. GET/HEAD must not rotate credentials, update idle deadlines or perform business mutations.

### Pre-authentication bootstrap and restoration

Login also needs CSRF. Proposed `POST /api/bff/{context}/security/bootstrap` is a **new BFF-only** operation, no Spring endpoint. It requires exact Origin, same-origin Fetch Metadata when present, application/json and `X-SchoolERP-Bootstrap: 1`; it is the sole synchronizer-token bootstrap exception because there is no token yet. No CORS access, bounded body, rate limit and short-lived pre-auth records. Issue a separate opaque HttpOnly pre-auth cookie (same flags; `_preauth` suffix) and return its CSRF proof. Pre-auth cannot authorize data/refresh/logout. With a live selected-context session, bootstrap returns its existing proof without rotating ID or extending lifetime. Never overwrite an existing valid pre-auth record solely for another tab.

Pre-auth cookie TTL, quota and selection-transaction TTL bounds are OPEN; no defaults silently enabled. POST login consumes pre-auth proof and creates a fresh authenticated record, then returns the new proof in the safe response. GET session can expose a previously established CSRF proof to same-origin code with no-store, but cannot create one or modify state. Bootstrap endpoint is deliberately not part of the auth mapping proof code; it requires a real store before implementation.

### Header policy

| Boundary | Policy |
| --- | --- |
| Browser -> BFF | Validate Content-Type/Accept; consume Cookie, Origin, Fetch Metadata and CSRF locally. Reject Authorization, Proxy-Authorization, X-Tenant-ID, internal/service auth assertions. |
| BFF -> Spring | Construct new headers: JSON Content-Type/Accept; attach selected server bearer only for authenticated mapping. Login/refresh omit stale bearer. No Cookie, Origin, CSRF, browser Host or forwarded auth/context headers. |
| Provisioning | Validate Idempotency-Key against backend syntax; explicitly forward only on provision mapping. Preserve key with frozen body across uncertain retries. |
| Correlation | Generate safe server request ID; propagate supported X-Request-ID after validation, never arbitrary incoming trace baggage. |
| Spring -> browser | Safe content type/DTO, normalized error, validated Retry-After and safe correlation. Never pass upstream Set-Cookie, Authorization, WWW-Authenticate internals or unvalidated Location. |

Whitelist construction drops all unspecified internal headers even if not on the explicit rejection list. Request/response headers and bodies must not be captured by proxy/APM/access logs on auth routes.

## 8. Fixed BFF routing contract

Paths below are **proposed BFF routes, not implemented routes**. Context is determined by the registered handler, not body/query/header input.

| Browser method/path | Fixed Spring mapping | Browser body / response |
| --- | --- | --- |
| POST /api/bff/platform/login | POST /api/platform/auth/login | email/password -> safe PlatformSession + new CSRF proof/cookie |
| GET /api/bff/platform/session | GET /api/platform/auth/me | No body -> safe projection |
| POST /api/bff/platform/refresh | POST /api/platform/auth/refresh | Empty object + CSRF; refresh credential resolved server-side |
| POST /api/bff/platform/logout | POST /api/platform/auth/logout | Empty object + CSRF -> safe logout outcome |
| POST /api/bff/tenant/login | POST /api/auth/login | loginId/password -> safe session OR safe membership choices |
| GET /api/bff/tenant/session | GET /api/auth/me | Safe TenantSession |
| POST /api/bff/tenant/refresh | POST /api/auth/refresh | Empty object + CSRF; server-only credential |
| POST /api/bff/tenant/logout | POST /api/auth/logout | Empty object + CSRF -> safe outcome |
| POST /api/bff/tenant/select-membership | POST /api/auth/select-membership | membershipId only; selectionToken held server-side |
| POST /api/bff/tenant/switch-membership | POST /api/auth/switch-membership | membershipId command; Spring verifies ownership |
| GET /api/bff/tenant/memberships | GET /api/auth/memberships | Backend-authorized choices |

Future platform domain handlers map one-to-one to the 23 verified endpoints in PLATFORM-API-CONTRACT.md; no wildcard rewrite to arbitrary Spring paths. Dynamic UUIDs validated as path segments; query keys allowlisted for the operation. No `url`, host, scheme, encoded slash, path traversal or arbitrary method forwarding. Fixed server-configured Spring origin, reject redirects (`redirect: error`), restricted network egress/TLS verification. Never follow a redirect with credentials. No backend base URL or secret in NEXT_PUBLIC variables.

All browser responses including errors/session/refresh/logout are `Cache-Control: private, no-store`, `Vary: Cookie, Origin`, `Referrer-Policy: no-referrer`. CDN/proxy must bypass cache for these routes; Set-Cookie alone is not a cache policy. Upstream requests use no-store. Do not put personalized data in use cache/unstable_cache/shared module caches. Intra-request memoization may avoid duplicate me calls without crossing users.

## 9. Login, selection and session restoration

Login: validate origin/CSRF/body -> Spring credential exchange -> validate token DTO -> provision a server-only PENDING record/envelope -> call corresponding me -> validate identity/context -> atomically activate fresh browser session and consume pre-auth -> set HttpOnly cookie and return safe projection. Failure at any step never publishes an authenticated cookie. Store failure after backend login can leave an orphan backend session; attempt bounded best-effort logout with known owned credentials, record uncertainty without exposing them, and fail browser login. Password exists only for the request and must not be retained.

Tenant multi-membership: store the backend opaque selectionToken encrypted in a context-bound short-lived pre-auth transaction, bounded by backend expiresAt. Return only offered membershipId/tenantId/tenantName choices and a selection-required indicator. Selection consumes server transaction atomically; concurrent or uncertain selection fails closed, never replays the one-use token. Spring remains the authority over membership validity. No TenantSession before selection/me succeeds.

Tenant switch: serialized session mutation, cancel/drain old-scope requests, call real switch endpoint, verify me using new credentials, create new ID/CSRF binding, atomically invalidate old ID, clear client tenant-dependent state. No client-supplied tenantId establishes scope. Backend switching creates independent refresh families: old-family logout/cleanup and uncertain-result handling must be explicitly tested in tenant implementation; no claim that switching globally revokes old tokens. Do not display demo records under the new authenticated identity.

Restoration: UNKNOWN -> GET context/session with cookie -> lookup/expiry check -> me using current bearer -> AUTHENTICATED. Missing/expired/invalid session -> UNAUTHENTICATED/EXPIRED. Store/network failure -> ERROR, never false login success. If access renewal is needed, GET returns a safe `BFF_REFRESH_REQUIRED` control response (409); browser bootstraps existing CSRF proof if necessary and performs POST refresh, then retries GET once. Server Component rendering cannot trigger refresh as a GET side effect; render a renewal boundary and let the protected POST complete. This satisfies both reload restoration and the user's GET-no-state-change rule.

## 10. Lifetimes and activity

OPEN: idle/absolute durations for each context, pre-auth and selection bounds, refresh lead time, clock-skew budget and operational deadlines. Required configuration must have no production defaults inferred from examples. Cookie expiry is absolute; server record idle expiry can terminate earlier. POST refresh or explicit CSRF-protected POST activity may advance idle deadline only up to absolute deadline. GET/prefetch/background polling must not prolong sessions. Last-access bookkeeping is committed with approved mutations, not a hidden GET write.

Platform BFF absolute deadline must be no later than a verified conservative backend session bound. Current backend does not return that bound; use a deployment-owned TTL contract aligned with actual Spring configuration and a conservative login-request start time/clock budget, or separately propose a minimal expiry metadata addition. Do not invent a backend expiry field. Backend is still authoritative if it rejects earlier. Tenant BFF must have its own finite absolute cap even though refresh rotation currently extends token expiry. Access expiry is calculated conservatively from respective expiresIn/expiresInSeconds, never used to bypass Spring validation.

## 11. Refresh state machine and distributed ownership

```text
ACTIVE/VALID -> REFRESH_REQUIRED -> CAS RESERVED(owner,fence,lease)
            -> CAS DISPATCHED -> ONE Spring refresh
            -> validate response -> persist encrypted replacement pair
            -> CAS ACTIVE(new credentialVersion, no owner)

Other contenders -> CONCURRENT_OWNER -> bounded wait/read -> use committed new version
401/invalid result -> CONFIRMED_INVALID -> INVALID (no usable credentials)
Timeout/disconnect/5xx/malformed result/write ambiguity/owner expiry
                  -> UNKNOWN_OUTCOME -> INVALID -> reauthenticate
```

The atomic unit includes both access/refresh credentials and their version. Each attempt records the credential version it observed. A delayed 401 for old version N must reuse already committed N+1, not rotate N+1 again. After CAS RESERVED, only that owner/fence may commit DISPATCHED. **Confirm durable DISPATCHED before sending HTTP.** One attempt permits one network send; HTTP client/proxy retries disabled for refresh. Never dispatch after a CAS timeout without reconciliation.

Lease expiry is not permission to replay: Spring does not understand the BFF fence. Another worker invalidates, rather than resending the old credential. A paused owner checks/commits dispatch before network use; any late response cannot commit if session version/status/fence changed. This can strand a backend family but prevents browser resurrection. Local cancellation does not prove Spring canceled. Do not promise exactly-once delivery over a failing network; guarantee no second BFF dispatch of a possibly consumed credential.

Current transition proof conservatively invalidates even expired RESERVED attempts. It models ownership/CAS; real adapter must test crash-after-dispatch-marker, response loss, store failover, credential-envelope write failure and clock behavior before production.

Refresh 401 is confirmed invalid. For 429, preserve safe Retry-After for UX and do not auto retry; the initial contract terminates the attempted browser session conservatively. Availability-friendly recovery from provably pre-controller throttling would be a separate reviewed extension, never a blind retry. No repeated use of the old credential after unknown outcome.

### Request retry policy

Maximum one coordinated refresh and one retry of an eligible original protected request. 403 never refreshes or logs out. A second 401 ends the selected browser session. Auth endpoints never recurse into this policy.

GET transport returns refresh-required rather than mutating session; POST refresh coordinates across workers, then the client repeats GET once. Mutations may perform one coordinated renewal before sending, or after a confirmed Spring authentication rejection whose no-business-effect provenance has been verified. Do not replay ambiguous network/5xx mutations. Provisioning retries retain the same key/body; other writes have no inferred idempotency guarantee. Do not blindly replay arbitrary POST because a proxy supplied an unverified 401. This is a deliberate constraint on the prompt's conceptual retry arrow, not a change to Spring semantics.

## 12. Logout state machine and races

```text
ACTIVE -> CAS LOGGING_OUT (all new credential use denied)
       -> Spring logout with current owned bearer + refresh, if safely available
       -> 204: CONFIRMED_LOGOUT / BACKEND_REVOKED (platform session; tenant family)
       -> CAS DELETED tombstone, erase envelope, clear selected cookie
       -> UNAUTHENTICATED

Network/5xx -> NETWORK_UNCERTAIN_LOGOUT -> local tombstone + cookie clear
401/403/429 -> BACKEND_REJECTED_LOGOUT -> local tombstone + cookie clear
```

Logout intent is stored before any network call. It fences all refresh completions; a late result cannot reactivate, extend expiry or set a cookie. If refresh is already RESERVED/DISPATCHED, the initial contract makes logout local and marks backend revocation unconfirmed instead of racing the consumed credential. No new refresh is started after logout intent. An expired bearer may cause backend logout rejection: still invalidate locally, **do not claim backend revocation**. A later dedicated revocation-only cleanup worker could use a known late replacement, but is not part of this milestone and must never reactivate the session.

For an idle ACTIVE session with usable bearer, call logout once using the known pair. On uncertain network result do not replay automatically. Delete credential references and retain non-authenticating tombstone/outcome for a bounded retention period sufficient to reject all outstanding writes; missing record must never be recreated by an update. Tombstone retention/request limits are OPEN operational values. Browser local logout succeeds only after durable invalidation; store outage cannot be represented as confirmed local deletion. Clear cookie and return safe 503/uncertain outcome, flag unavailable server revocation, reject subsequent store-unavailable requests.

Repeated logout with no cookie is harmless no-op after origin/custom-header validation, clearing the selected cookie again. With a tombstoned cookie, retain a non-authenticating CSRF verifier long enough to acknowledge repeat safely; never require reauthentication to log out again. Browser outcome `{ authenticated:false, context, logoutOutcome }` is safe. Missing-cookie repetition must not claim a fresh backend call or revoke the other context. Already-sent business operations cannot be undone by logout; response delivery must recheck the tombstone and suppress stale sensitive output where feasible.

## 13. Browser states

| State | Allowed next states / behavior |
| --- | --- |
| UNKNOWN | AUTHENTICATED after me; UNAUTHENTICATED/EXPIRED on authoritative absence; ERROR on infrastructure failure |
| AUTHENTICATED | EXPIRING, LOGGING_OUT, EXPIRED, ERROR; permissions only guide UI |
| EXPIRING | POST REFRESHING; never an automatic GET mutation |
| REFRESHING | AUTHENTICATED on committed pair + verification; INVALID on confirmed/unknown failure; LOGGING_OUT wins |
| INVALID | UNAUTHENTICATED with local invalidation; no credential replay |
| LOGGING_OUT | UNAUTHENTICATED with confirmed or explicit uncertain revocation result |
| ERROR | Retry safe read/recover by login; do not show protected content as if authenticated |

BroadcastChannel may notify other tabs of logout, but never transports tokens and is not the security authority. Every request reads shared status. Authentication-method metadata does not change this machine.

## 14. OAuth/OIDC and mobile compatibility

Current password broker and future OIDC broker must both terminate in Spring-verified canonical identity and application credentials, followed by the same browser-session activation. No Google-specific booleans or provider roles become application authority. Server-only method PASSWORD/OIDC is operational provenance; unknown future methods require a reviewed broker, not browser selection. Provider identifiers are optional server metadata.

Future work needs a verified backend authentication completion contract, explicit OAuth client ownership (BFF or Spring), issuer/client/redirect URI registration, authorization-code exchange, PKCE, state/nonce, replay expiry, issuer/audience/signature verification and account linking policy. None of those endpoints are invented here. Provider tokens/secrets remain at the server OAuth boundary and never enter application browser DTOs.

Strict session cookies generally are not sent on cross-site provider callbacks. Do not weaken the ordinary session cookie silently. Future callback binding needs a separate short-lived transaction cookie with explicitly reviewed SameSite behavior (for example Lax for a top-level GET callback) plus server-held state/nonce/PKCE and exact redirect binding. It is not an authenticated application session. Form POST callbacks need separate analysis. Callback URLs may carry protocol-required short-lived code/state; scrub logs/referrers and redirect promptly to a clean local route. No OAuth route enabled until that design is verified.

Native mobile will authenticate directly with Spring using a separately designed native flow/secure storage, never depend on Next cookies or CSRF headers. BFF does not change canonical Spring bearer APIs or embed web concerns into business DTOs.

## 15. Errors, rate limiting and performance

Preserve verified backend status/code semantics (400/401/403/404/409/429/500) through a safe allowlist, not raw upstream message/body reflection. Extend existing ApiError compatibly in Milestone 1. BFF-owned codes are explicitly new: BFF_CSRF_REJECTED (403), BFF_SESSION_REQUIRED (401), BFF_REFRESH_REQUIRED (409), BFF_SESSION_STORE_UNAVAILABLE (503), BFF_UPSTREAM_UNAVAILABLE (502/504 as appropriate). Generic user messages; no credential-state internals, stacks or database details. Runtime response parsing must be bounded and reject malformed token DTOs without logging them.

Validate and propagate Retry-After; no automatic auth retry. Spring remote-address limiting may group all users behind the BFF: checked-in platform login 5/min, refresh 30/min, mutations 60/min. Existing policy may be operationally unsuitable through a shared egress. Required deployment decision: approved trusted ingress/IP resolution or adjusted backend per-BFF policy plus shared edge limits. Never trust browser X-Forwarded-For; adding that header alone does not fix servlet remote address. No rate-limit code changed here.

Common data path: one session lookup -> fixed Spring request. No me before each business API; Spring already validates bearer/security versions. Me at login/restoration and explicit safe-session refresh. No backend business DB queries or N+1 aggregation in BFF. Store record bounded; request body/response size, timeout, waiter count and edge quotas must be configured before routes go live. Server time/clock bounds and metrics determine operational limits, not guessed values.

## 16. Threat model and failures

| Threat | Contract control | Residual / evidence limit |
| --- | --- | --- |
| A XSS token theft | Server-held credentials, explicit safe projection, server-only imports | XSS can still act as user/read data; CSP/dependency hygiene remain necessary |
| B CSRF | Origin + strict cookie + bound header token; bootstrap tightly limited | Same-origin XSS defeats CSRF; runtime browser tests still required |
| C arbitrary destination | Registered method/path, fixed upstream, no redirects, egress restriction | Deployment network policy not verified |
| D forged Authorization | Reject browser auth; construct upstream headers afresh | Runtime wiring not yet implemented |
| E/F wrong security context | Distinct cookies, hash namespaces, credential tags, fixed route context | Backend cross-plane E2E still required |
| G concurrent refresh | Durable CAS owner/fence/dispatched marker | Model tests do not prove provider durability |
| H refresh timeout | UNKNOWN_OUTCOME -> INVALID; never replay | Backend orphan can remain until expiry |
| I logout/refresh race | LOGGING_OUT fence/tombstone; late writes denied | Existing in-flight backend work not rolled back |
| J forged tenant selector | Backend select/switch and me only | UI must clear old tenant data after switch |
| K modified cookie | Random ID + hashed lookup + context/status/expiry | Well-formed random value is not automatically valid |
| L stolen cookie | TLS/Secure/HttpOnly/Strict, finite limits, rotation/invalidation | Cookie is a bearer credential; possession can hijack session, HttpOnly is not absolute prevention |
| Store outage/rollback | Fail closed; no memory fallback; no dispatch without durable record | Store choice/failover evidence outstanding |
| Late login/switch responses | Serialize pre-auth/context activation; versioned replacement | Browser cookie response ordering needs focused E2E before auth release |

No IP/user-agent binding as invented authentication. Monitoring may detect anomalies but does not redefine backend authority.

## 17. Deployment and observability

Require Node-capable Next deployment, HTTPS origin/ingress, fixed reachable Spring origin, environment-separated store/encryption keys, shared authoritative clock semantics, cache bypass and restricted log access. Browser connects only to same-origin BFF; server-to-server calls do not require broadening Spring CORS. Existing canonical native/bearer paths remain available under their own deployment controls.

Safe telemetry: random per-request correlation, operation name/context, normalized outcome/status, latency, CAS contention, wait timeout, refresh uncertainty, store unavailability and logout revocation outcome. No Cookie/Set-Cookie/Authorization, credential bodies, passwords, raw IDs/hash keys, OAuth codes/state/secrets or rich identity payloads. Disable body/header capture in application, ingress, APM and analytics; errors must be redacted at source. Record deployment tests for log redaction before release.

## 18. Open decisions and evidence needed

| ID | OPEN DECISION | Required evidence / gate |
| --- | --- | --- |
| D1 | Production/staging/local origins and Spring upstream | Deployment configuration owned by operator; HTTPS/ingress trust list; blocks live routing |
| D2 | Store provider, consistency and failover durability | Chosen managed shared store and tested linearizable CAS/no-dispatch-marker rollback; blocks real sessions |
| D3 | Idle/absolute lifetimes per context; pre-auth lifetime; clock budget | Approved policy + deployed Spring TTL; no backend me expiry assumed; blocks cookie issuance |
| D4 | Encryption key management, backups, envelope retention | KMS/secret ownership/rotation/restore access evidence; blocks persisted credentials |
| D5 | Proxy topology and rate-limit identity | Trusted ingress model/load test; prevents collective throttling without spoofed client IP |
| D6 | Timeouts/lease/wait bounds/tombstone retention/size limits | Deployment latency/clock constraints + fault tests; blocks coordinator adapter |
| D7 | Future OAuth completion/client ownership/callback policy | Actual Spring capability and provider-independent ADR; does not block password-only foundation |
| D8 | Browser E2E/test environment and accounts | Approved nonproduction stack and data; no secrets in repo; blocks claims of live validation |

No silent values selected. Architectural shape is fixed by this contract; missing deployment bindings keep Milestone 0.5 **PARTIAL** rather than falsely fully frozen. Milestone 1 pure HTTP/error primitives can be developed from verified contracts, but live cookie/auth implementation must wait for D1–D6. Next recommended action is to resolve those bindings, then Milestone 1 HTTP Foundation.

## 19. Backend changes and verification scope

No backend code change is required for this documentation/primitive milestone. Password bearer endpoints, Spring Security, DTOs, RBAC, tenant resolution, rotation/replay rules and database business services remain intact. Same-origin BFF does not need Spring cookie auth or relaxed CORS. A deployment rate-limit/trusted-proxy adjustment may be required after D5 is decided. Optional explicit backend expiry metadata requires a separate justified change if configuration alignment cannot supply a safe bound. OAuth remains future backend/broker work, not a guessed route.

Added `src/server/bff/session-contract.ts`, `security-policy.ts`, `session-transitions.ts` and focused tests. Primitives are not imported by existing UI and do not create an HTTP client/store. The transition functions propose changes; only an adapter's successful CAS authorizes side effects. The test-only AtomicStore models linearizable CAS in one process; it is deliberately not usable as a production adapter. Fake backend callbacks prove request construction, not live Spring logout.

Tests cover cookie flags/format/deletion, contexts, CSRF/origin, headers/fixed auth paths, three concurrent contenders/two worker objects, atomic replacement, lease expiry/no replay, stale fences, logout race/deletion/repetition, uncertainty, returnTo and PASSWORD/OIDC-safe projections. Missing production proof: store adapter conformance/failover, actual request retry wiring, bootstrap/selection/switch routes, cookie browser behavior and real-stack E2E. These remain acceptance tests for subsequent milestones.

Validation results are recorded in [Milestone 0.5 report](../phases/phase-12b-milestone-0-5.md).
