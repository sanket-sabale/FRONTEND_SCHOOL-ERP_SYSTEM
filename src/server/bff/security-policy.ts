import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Context } from "./session-contract";

export type CookieEnvironment = "https" | "local-http";
const opaquePattern = /^[A-Za-z0-9_-]{43}$/;

export function randomOpaqueId() { return randomBytes(32).toString("base64url"); }

export function sessionKey(context: Context, id: string) {
  if (!opaquePattern.test(id)) throw new Error("Invalid opaque identifier");
  return createHash("sha256").update(`${context}:${id}`).digest("hex");
}

export function cookieName(context: Context, environment: CookieEnvironment) {
  return `${environment === "https" ? "__Host-" : "dev_"}schoolerp_${context.toLowerCase()}_session`;
}

export function sessionCookie(context: Context, id: string, environment: CookieEnvironment, now: number, expiresAt: number) {
  sessionKey(context, id);
  if (!Number.isFinite(now) || !Number.isFinite(expiresAt) || expiresAt <= now) throw new Error("Invalid expiry");
  return `${cookieName(context, environment)}=${id}; Path=/; HttpOnly; SameSite=Strict${environment === "https" ? "; Secure" : ""}; Max-Age=${Math.floor((expiresAt - now) / 1000)}; Expires=${new Date(expiresAt).toUTCString()}`;
}

export function clearSessionCookie(context: Context, environment: CookieEnvironment) {
  return `${cookieName(context, environment)}=; Path=/; HttpOnly; SameSite=Strict${environment === "https" ? "; Secure" : ""}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function readSessionCookie(header: string, context: Context, environment: CookieEnvironment) {
  const name = cookieName(context, environment);
  const values = header.split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${name}=`));
  if (values.length !== 1) return null; // Duplicate cookies are ambiguous, not first-wins.
  const value = values[0].slice(name.length + 1);
  return opaquePattern.test(value) ? value : null;
}

export function validateWebOrigin(origin: string, environment: CookieEnvironment) {
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password) throw new Error("Expected a canonical origin");
  if (environment === "https" && url.protocol !== "https:") throw new Error("HTTPS required");
  if (environment === "local-http" && (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new Error("Local HTTP only");
  return origin;
}

export function rejectBrowserAuthority(headers: Headers) {
  for (const [name] of headers) {
    if (["authorization", "proxy-authorization", "x-tenant-id", "x-internal-auth", "x-service-token"].includes(name)) throw new Error("Browser authority rejected");
  }
}

export function verifyMutation(headers: Headers, trustedOrigin: string, suppliedToken: string | null, expectedToken: string | null) {
  rejectBrowserAuthority(headers);
  if (headers.get("origin") !== trustedOrigin || headers.get("origin") === "null") throw new Error("Origin rejected");
  const site = headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") throw new Error("Cross-origin request rejected");
  if (headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new Error("JSON required");
  if (!suppliedToken || !expectedToken || !opaquePattern.test(suppliedToken) || !opaquePattern.test(expectedToken)
    || !timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(expectedToken))) throw new Error("CSRF rejected");
}

// This registry proves the auth boundary only. Business mappings must be individually
// added from verified controllers; no generic URL/path forwarding is permitted.
export type AuthOperation = "login" | "session" | "refresh" | "logout";
export function authRoute(context: Context, operation: AuthOperation) {
  if (!["PLATFORM", "TENANT"].includes(context) || !["login", "session", "refresh", "logout"].includes(operation)) throw new Error("Operation not allowed");
  const prefix = context === "PLATFORM" ? "/api/platform/auth" : "/api/auth";
  return {
    context,
    method: operation === "session" ? "GET" : "POST",
    upstreamPath: `${prefix}/${operation === "session" ? "me" : operation}`,
    browserPath: `/api/bff/${context.toLowerCase()}/${operation}`,
  };
}

export function upstreamHeaders(context: Context, credential: { context: Context; accessToken: string }, browserHeaders: Headers) {
  rejectBrowserAuthority(browserHeaders);
  if (credential.context !== context) throw new Error("Credential context mismatch");
  // Build afresh. Never copy Host, Cookie, forwarding headers or arbitrary metadata.
  return new Headers({ "content-type": "application/json", accept: "application/json", authorization: `Bearer ${credential.accessToken}` });
}

export function safeReturnTo(value: string | null, context: Context) {
  const fallback = context === "PLATFORM" ? "/platform/dashboard" : "/";
  const allowed = context === "PLATFORM"
    ? ["/platform/dashboard", "/platform/tenants", "/platform/plans", "/platform/subscriptions", "/platform/users", "/platform/audit"]
    : ["/", "/students", "/staff", "/admissions", "/finance", "/attendance", "/communication", "/timetable"];
  // Deliberately allow only exact static paths: no query, fragment, encoding or slash normalization.
  return value !== null && allowed.includes(value) ? value : fallback;
}

export const privateResponseHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie, Origin", "Referrer-Policy": "no-referrer" };
