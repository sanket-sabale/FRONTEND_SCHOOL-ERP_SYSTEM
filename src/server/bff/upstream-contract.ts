import "server-only";
import type { Context, VerifiedIdentity } from "./session-contract";
import { safeSession } from "./session-contract";
import type { AuthOperation } from "./security-policy";
import { BffError } from "./errors";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid DTO");
  return value as Record<string, unknown>; // narrowed object; fields remain unknown
}
function text(value: unknown, max: number, min = 1): string {
  if (typeof value !== "string" || value.length < min || value.length > max || !value.trim()) throw new Error("Invalid DTO");
  return value;
}
function uuid(value: unknown) {
  const result = text(value, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result)) throw new Error("Invalid DTO");
  return result;
}
function strings(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 1024) throw new Error("Invalid DTO");
  return value.map(item => text(item, 256));
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new Error("Invalid DTO");
}

export function validateRequest(context: Context, operation: AuthOperation, body: unknown) {
  try {
    if (operation === "session") { if (body !== undefined) throw new Error(); return undefined; }
    const value = object(body);
    if (operation === "login") {
      const field = context === "PLATFORM" ? "email" : "loginId";
      exactKeys(value, [field, "password"]);
      const login = text(value[field], 320);
      if (!/^[^\s@]+@[^\s@]+$/.test(login)) throw new Error();
      const password = text(value.password, 200, context === "PLATFORM" ? 12 : 1);
      return context === "PLATFORM" ? { email: login, password } : { loginId: login, password };
    }
    if (operation === "select-membership") {
      if (context !== "TENANT") throw new Error();
      exactKeys(value, ["selectionToken", "membershipId"]);
      return { selectionToken: text(value.selectionToken, 200), membershipId: uuid(value.membershipId) };
    }
    exactKeys(value, ["refreshToken"]);
    // Platform DTO max 512; Tenant has no field max, so the BFF imposes the
    // same conservative bound on its server-held, generated refresh credential.
    return { refreshToken: text(value.refreshToken, 512) };
  } catch { throw new BffError("INVALID_REQUEST", 400); }
}

export function validateIdentity(context: Context, body: unknown): VerifiedIdentity {
  try {
    const value = object(body);
    const common = { accountId: uuid(value.accountId), roles: strings(value.roles), permissions: strings(value.permissions) };
    if (context === "PLATFORM") {
      if ("tenantId" in value || "membershipId" in value) throw new Error();
      return { ...common, context, sessionId: uuid(value.sessionId), authenticationAssurance: text(value.authenticationAssurance, 128) };
    }
    if ("sessionId" in value || "authenticationAssurance" in value) throw new Error();
    return { ...common, context, tenantId: uuid(value.tenantId), membershipId: uuid(value.membershipId) };
  } catch { throw new BffError("BFF_UPSTREAM_UNAVAILABLE", 502); }
}

export function validateTokenResponse(context: Context, body: unknown) {
  try {
    const value = object(body);
    const accessToken = text(value.accessToken, 16384), refreshToken = text(value.refreshToken, 512);
    if (!/^[A-Za-z0-9._~-]+$/.test(accessToken) || value.tokenType !== "Bearer") throw new Error();
    const expiry = value[context === "PLATFORM" ? "expiresIn" : "expiresInSeconds"];
    if (typeof expiry !== "number" || !Number.isSafeInteger(expiry) || expiry <= 0 || expiry > 86400) throw new Error();
    const common = { accessToken, refreshToken, tokenType: "Bearer" as const, roles: strings(value.roles) };
    if (context === "PLATFORM") {
      if ("tenantId" in value || "membershipId" in value || "expiresInSeconds" in value) throw new Error();
      return { ...common, expiresIn: expiry };
    }
    if ("expiresIn" in value) throw new Error();
    return { ...common, expiresInSeconds: expiry, tenantId: uuid(value.tenantId), membershipId: uuid(value.membershipId) };
  } catch { throw new BffError("BFF_UPSTREAM_UNAVAILABLE", 502); }
}

export function validateSuccess(context: Context, operation: AuthOperation, body: unknown) {
  if (operation === "logout") {
    if (body !== null) throw new BffError("BFF_UPSTREAM_UNAVAILABLE", 502);
    return null;
  }
  if (operation === "session") return validateIdentity(context, body);
  // Preserve the existing tenant contract without activating tenant auth flows.
  if (context === "TENANT" && operation === "login" && object(body).status === "MEMBERSHIP_SELECTION_REQUIRED") {
    return validateSelectionResponse(body);
  }
  return validateTokenResponse(context, body);
}

// The only browser projection in this milestone. Raw login/refresh/selection
// results have NO generic browser projector. Routes remain unregistered.
export function projectBrowserIdentity(context: Context, body: unknown, expiresAt: number) {
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) throw new BffError("BFF_SESSION_REQUIRED", 401);
  return safeSession(validateIdentity(context, body), expiresAt);
}

export type MembershipChoice = { membershipId: string; tenantId: string; tenantName: string };
export function validateSelectionResponse(body: unknown, now?: number) {
  try {
    const value = object(body);
    if (value.status !== "MEMBERSHIP_SELECTION_REQUIRED" || !Array.isArray(value.memberships) || value.memberships.length < 1 || value.memberships.length > 100) throw new Error();
    const expiresAt = text(value.expiresAt, 64), expiry = Date.parse(expiresAt);
    if (!Number.isSafeInteger(expiry) || (now !== undefined && expiry <= now)) throw new Error();
    const memberships = value.memberships.map(item => { const m = object(item); return { membershipId: uuid(m.membershipId), tenantId: uuid(m.tenantId), tenantName: text(m.tenantName, 1000) }; });
    if (new Set(memberships.map(m => m.membershipId)).size !== memberships.length) throw new Error();
    return { status: "MEMBERSHIP_SELECTION_REQUIRED" as const, selectionToken: text(value.selectionToken, 200), expiresAt, memberships };
  } catch { throw new BffError("BFF_UPSTREAM_UNAVAILABLE", 502); }
}
export function validateMembershipChoice(body: unknown) {
  try { const value = object(body); exactKeys(value, ["membershipId"]); return uuid(value.membershipId); }
  catch { throw new BffError("INVALID_REQUEST", 400); }
}
