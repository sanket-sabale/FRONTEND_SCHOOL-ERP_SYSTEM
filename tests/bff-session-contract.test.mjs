import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file) {
  const filename = join(process.cwd(), "src/server/bff", `${file}.ts`);
  const cjsModule = { exports: {} };
  const output = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(output.outputText, {
    module: cjsModule, exports: cjsModule.exports, Buffer, Headers, URL,
    require: (name) => {
      // Next enforces this import at build time. Unit tests execute on Node only.
      if (name === "server-only") return {};
      if (name.startsWith(".")) return load(join(dirname(file), name));
      return require(name);
    },
  }, { filename });
  return cjsModule.exports;
}
const policy = load("security-policy");
const state = load("session-transitions");
const { safeSession } = load("session-contract");
const now = 1_000_000;
const makeRecord = (context = "PLATFORM") => ({
  key: policy.sessionKey(context, policy.randomOpaqueId()), context, version: 0, credentialVersion: 0,
  status: "ACTIVE", createdAt: now, idleExpiresAt: now + 60_000, absoluteExpiresAt: now + 120_000,
  authenticationMethod: "PASSWORD", credentials: { context, envelopeId: "encrypted-envelope-v0" }, refresh: null,
});
const headers = () => new Headers({ origin: "https://school.example", "content-type": "application/json", "sec-fetch-site": "same-origin" });

test("cookies are opaque, host-only, strict, HttpOnly and Secure with bounded expiry", () => {
  const id = policy.randomOpaqueId();
  assert.match(id, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(id, policy.randomOpaqueId());
  const cookie = policy.sessionCookie("PLATFORM", id, "https", now, now + 30_000);
  for (const fragment of ["__Host-schoolerp_platform_session=", "HttpOnly", "Secure", "SameSite=Strict", "Path=/", "Max-Age=30", "Expires="]) assert.ok(cookie.includes(fragment));
  assert.ok(!cookie.includes("Domain="));
  assert.throws(() => policy.sessionCookie("PLATFORM", "user-1", "https", now, now + 1000));
  assert.throws(() => policy.sessionCookie("PLATFORM", id, "https", now, now));
  assert.match(policy.clearSessionCookie("PLATFORM", "https"), /Max-Age=0/);
  assert.match(policy.clearSessionCookie("PLATFORM", "https"), /HttpOnly; SameSite=Strict; Secure/);
});

test("development exception requires loopback HTTP; HTTPS policy cannot be downgraded", () => {
  assert.equal(policy.validateWebOrigin("http://localhost:3000", "local-http"), "http://localhost:3000");
  for (const origin of ["http://school.example", "https://school.example/path", "https://user@school.example", "null"]) assert.throws(() => policy.validateWebOrigin(origin, "https"));
  assert.throws(() => policy.validateWebOrigin("http://school.example", "local-http"));
  assert.match(policy.sessionCookie("TENANT", policy.randomOpaqueId(), "local-http", now, now + 1000), /^dev_schoolerp_tenant_session=/);
});

test("each route reads only its own cookie; duplicate and malformed cookies fail closed", () => {
  const id = policy.randomOpaqueId();
  for (const [a, b] of [["PLATFORM", "TENANT"], ["TENANT", "PLATFORM"]]) {
    const cookie = `${policy.cookieName(a, "https")}=${id}`;
    assert.equal(policy.readSessionCookie(cookie, b, "https"), null);
    assert.equal(policy.readSessionCookie(cookie, a, "https"), id);
    assert.equal(policy.readSessionCookie(`${cookie}; ${cookie}`, a, "https"), null);
    assert.notEqual(policy.sessionKey(a, id), policy.sessionKey(b, id));
  }
  assert.equal(policy.readSessionCookie("__Host-schoolerp_platform_session=bad", "PLATFORM", "https"), null);
});

test("CSRF rejects missing/mismatched token, origin, fetch metadata and simple content types", () => {
  const token = policy.randomOpaqueId();
  assert.doesNotThrow(() => policy.verifyMutation(headers(), "https://school.example", token, token));
  for (const pair of [[null, token], [token, null], [policy.randomOpaqueId(), token]]) assert.throws(() => policy.verifyMutation(headers(), "https://school.example", ...pair));
  for (const origin of [null, "null", "https://evil.example", "https://sub.school.example"]) {
    const h = headers();
    if (origin === null) h.delete("origin");
    else h.set("origin", origin);
    assert.throws(() => policy.verifyMutation(h, "https://school.example", token, token));
  }
  for (const [name, value] of [["sec-fetch-site", "same-site"], ["sec-fetch-site", "cross-site"], ["content-type", "text/plain"]]) {
    const h = headers(); h.set(name, value);
    assert.throws(() => policy.verifyMutation(h, "https://school.example", token, token));
  }
});

test("server constructs bearer headers; browser authority and cross-context credentials are rejected", () => {
  for (const name of ["Authorization", "X-Tenant-ID", "Proxy-Authorization", "X-Service-Token"]) {
    const h = headers(); h.set(name, "forged");
    assert.throws(() => policy.upstreamHeaders("PLATFORM", { context: "PLATFORM", accessToken: "server-test-secret" }, h));
  }
  for (const [a, b] of [["PLATFORM", "TENANT"], ["TENANT", "PLATFORM"]]) assert.throws(() => policy.upstreamHeaders(a, { context: b, accessToken: "test" }, headers()));
  const h = headers(); h.set("cookie", "private"); h.set("x-forwarded-for", "forged"); h.set("host", "evil.example");
  const upstream = policy.upstreamHeaders("PLATFORM", { context: "PLATFORM", accessToken: "server-test-secret" }, h);
  assert.equal(upstream.get("authorization"), "Bearer server-test-secret");
  for (const name of ["cookie", "origin", "host", "x-forwarded-for"]) assert.equal(upstream.get(name), null);
});

test("auth mappings are fixed, context-specific and cannot accept arbitrary destinations", () => {
  assert.equal(policy.authRoute("PLATFORM", "session").upstreamPath, "/api/platform/auth/me");
  assert.equal(policy.authRoute("TENANT", "session").upstreamPath, "/api/auth/me");
  assert.equal(policy.authRoute("PLATFORM", "refresh").method, "POST");
  for (const op of ["https://evil.example", "../auth/me", "proxy?url=evil"]) assert.throws(() => policy.authRoute("PLATFORM", op));
});

// TEST ONLY model of the required linearizable adapter. This is not a distributed
// store implementation or evidence of failover durability in a real provider.
class AtomicStore {
  constructor(record) { this.record = record; }
  async get() { return structuredClone(this.record); }
  async cas(previous, next) {
    if (this.record.version !== previous.version || this.record.key !== previous.key || this.record.context !== previous.context) return false;
    this.record = structuredClone(next); return true;
  }
}

test("three tabs through two workers share one dispatch and atomically replace credential pair", async () => {
  const store = new AtomicStore(makeRecord());
  let calls = 0;
  const worker = (owner) => async () => {
    const before = await store.get();
    const reserved = state.reserveRefresh(before, owner, now, 1000, 0);
    if (!reserved || !await store.cas(before, reserved)) return "CONCURRENT_OWNER";
    const sent = state.markRefreshDispatched(reserved, owner, reserved.refresh.fence, now);
    assert.ok(await store.cas(reserved, sent)); calls++;
    const replaced = state.completeRefresh(sent, owner, sent.refresh.fence, { context: "PLATFORM", envelopeId: "encrypted-pair-v1" }, now + 1);
    assert.ok(await store.cas(sent, replaced)); return "REFRESHED";
  };
  const a = worker("instance-a"); const b = worker("instance-b");
  const results = await Promise.all([a(), b(), a()]);
  assert.equal(calls, 1);
  assert.equal(results.filter((result) => result === "CONCURRENT_OWNER").length, 2);
  assert.equal(store.record.credentialVersion, 1);
  assert.equal(store.record.credentials.envelopeId, "encrypted-pair-v1");
  assert.equal(store.record.refresh, null);
  assert.equal(state.reserveRefresh(store.record, "delayed-401", now + 1, 1000, 0), null);
});

test("timeout or crashed refresh owner cannot replay old credential or accept late replacement", () => {
  const reserved = state.reserveRefresh(makeRecord(), "owner", now, 1000, 0);
  const sent = state.markRefreshDispatched(reserved, "owner", reserved.refresh.fence, now);
  assert.equal(state.markRefreshDispatched(sent, "owner", sent.refresh.fence, now), null);
  assert.equal(state.reserveRefresh(sent, "takeover", now + 1001, 1000, 0), null);
  const expired = state.expireRefreshLease(sent, now + 1001);
  assert.equal(expired.status, "INVALID"); assert.equal(expired.credentials, null);
  assert.equal(state.completeRefresh(expired, "owner", sent.refresh.fence, { context: "PLATFORM", envelopeId: "late" }, now + 1002), null);
  assert.equal(state.completeRefresh(sent, "owner", sent.refresh.fence, { context: "PLATFORM", envelopeId: "late" }, now + 1002), null);
});

test("confirmed refresh failure, wrong fence/context and browser expiry fail closed", () => {
  assert.equal(state.reserveRefresh(makeRecord(), "owner", now + 120_000, 1000, 0), null);
  const reserved = state.reserveRefresh(makeRecord(), "owner", now, 1000, 0);
  assert.equal(state.markRefreshDispatched(reserved, "other", reserved.refresh.fence, now), null);
  const sent = state.markRefreshDispatched(reserved, "owner", reserved.refresh.fence, now);
  assert.equal(state.completeRefresh(sent, "owner", 999, { context: "PLATFORM", envelopeId: "bad" }, now), null);
  assert.equal(state.completeRefresh(sent, "owner", sent.refresh.fence, { context: "TENANT", envelopeId: "bad" }, now), null);
  const failed = state.failRefresh(sent, "owner", sent.refresh.fence);
  assert.equal(failed.status, "INVALID"); assert.equal(failed.credentials, null);
});

test("logout wins a refresh race and stale CAS cannot resurrect a deleted session", async () => {
  const reserved = state.reserveRefresh(makeRecord(), "owner", now, 1000, 0);
  const sent = state.markRefreshDispatched(reserved, "owner", reserved.refresh.fence, now);
  const store = new AtomicStore(sent);
  const lateSuccess = state.completeRefresh(sent, "owner", sent.refresh.fence, { context: "PLATFORM", envelopeId: "late" }, now + 1);
  const loggingOut = state.beginLogout(sent);
  assert.ok(await store.cas(sent, loggingOut));
  assert.equal(await store.cas(sent, lateSuccess), false);
  assert.equal(state.completeRefresh(loggingOut, "owner", sent.refresh.fence, { context: "PLATFORM", envelopeId: "late" }, now + 1), null);
  assert.equal(state.reserveRefresh(loggingOut, "new", now, 1000, 0), null);
  assert.throws(() => state.logoutRequest(loggingOut, { context: "PLATFORM", accessToken: "test", refreshToken: "test" }));
  const deleted = state.finishLogout(loggingOut); assert.ok(await store.cas(loggingOut, deleted));
  assert.equal(deleted.status, "DELETED"); assert.equal(deleted.credentials, null);
  assert.equal(state.beginLogout(deleted), null);
  assert.equal(await store.cas(sent, lateSuccess), false);
});

test("logout sends correct context bearer/body once; uncertainty differs from confirmation", async () => {
  for (const context of ["PLATFORM", "TENANT"]) {
    const loggingOut = state.beginLogout(makeRecord(context));
    const request = state.logoutRequest(loggingOut, { context, accessToken: "server-access", refreshToken: "server-refresh" });
    let calls = 0;
    const fakeBackend = async (r) => { calls++; assert.equal(r.method, "POST"); assert.equal(r.headers.Authorization, "Bearer server-access"); assert.equal(r.body.refreshToken, "server-refresh"); return 204; };
    assert.equal(state.logoutOutcome(await fakeBackend(request)), "CONFIRMED_LOGOUT"); assert.equal(calls, 1);
    assert.equal(request.path, context === "PLATFORM" ? "/api/platform/auth/logout" : "/api/auth/logout");
  }
  assert.equal(state.logoutOutcome(null), "NETWORK_UNCERTAIN_LOGOUT");
  assert.equal(state.logoutOutcome(503), "NETWORK_UNCERTAIN_LOGOUT");
  assert.equal(state.logoutOutcome(401), "BACKEND_REJECTED_LOGOUT");
});

test("returnTo rejects external, encoded, query, fragment and backslash variants", () => {
  assert.equal(policy.safeReturnTo("/platform/tenants", "PLATFORM"), "/platform/tenants");
  for (const value of ["https://evil.example", "//evil.example", "\\evil.example", "/\\evil.example", "javascript:alert(1)", "data:text/html,x", "%2f%2fevil.example", "%252f%252fevil.example", "/platform/../evil", "/platform/tenants?next=https://evil.example", "/platform/tenants#x", "/students", " /platform/tenants"]) assert.equal(policy.safeReturnTo(value, "PLATFORM"), "/platform/dashboard");
});

test("PASSWORD and future OIDC share safe projections; no server credentials/session metadata leaks", () => {
  const identity = { context: "PLATFORM", accountId: "account", sessionId: "backend-session", authenticationAssurance: "PASSWORD", roles: ["PLATFORM_VIEWER"], permissions: ["platform.tenant.read"] };
  const outputs = ["PASSWORD", "OIDC"].map((method) => safeSession({ ...identity, authenticationMethod: method, identityProvider: "provider", accessToken: "secret", refreshToken: "secret" }, now + 1000));
  assert.equal(JSON.stringify(outputs[0]), JSON.stringify(outputs[1]));
  for (const forbidden of ["sessionId", "authenticationMethod", "identityProvider", "accessToken", "refreshToken", "authenticationAssurance"]) assert.equal(forbidden in outputs[0], false);
  const tenant = safeSession({ context: "TENANT", accountId: "account", tenantId: "tenant", membershipId: "membership", roles: [], permissions: [] }, now + 1000);
  assert.equal(tenant.tenantId, "tenant"); assert.equal(tenant.membershipId, "membership"); assert.equal("sessionId" in tenant, false);
  assert.equal(policy.privateResponseHeaders["Cache-Control"], "private, no-store");
});

test("security modules declare the server-only boundary", () => {
  for (const name of ["session-contract", "security-policy", "session-transitions"]) assert.match(readFileSync(join(process.cwd(), "src/server/bff", `${name}.ts`), "utf8"), /^import "server-only";/);
});
