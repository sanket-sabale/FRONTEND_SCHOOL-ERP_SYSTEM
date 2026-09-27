import "server-only";
import type { CredentialReference, SessionRecord } from "./session-contract";

// Pure proposals: callers MUST commit via shared-store CAS before any side effect.
// These are executable contract transitions, not a production coordinator.
const live = (record: SessionRecord, now: number) => now < Math.min(record.idleExpiresAt, record.absoluteExpiresAt);

export function reserveRefresh(record: SessionRecord, owner: string, now: number, leaseMs: number, observedCredentialVersion: number): SessionRecord | null {
  if (record.credentialVersion !== observedCredentialVersion || record.status !== "ACTIVE" || !record.credentials || !live(record, now) || !owner || !Number.isFinite(leaseMs) || leaseMs <= 0) return null;
  return { ...record, version: record.version + 1, status: "REFRESHING", refresh: { owner, fence: record.version + 1, leaseExpiresAt: now + leaseMs, phase: "RESERVED" } };
}

export function markRefreshDispatched(record: SessionRecord, owner: string, fence: number, now: number): SessionRecord | null {
  if (record.status !== "REFRESHING" || !record.refresh || record.refresh.phase !== "RESERVED"
    || record.refresh.owner !== owner || record.refresh.fence !== fence || now >= record.refresh.leaseExpiresAt || !live(record, now)) return null;
  return { ...record, version: record.version + 1, refresh: { ...record.refresh, phase: "DISPATCHED" } };
}

export function completeRefresh(record: SessionRecord, owner: string, fence: number, replacement: CredentialReference, now: number): SessionRecord | null {
  if (record.status !== "REFRESHING" || !record.refresh || record.refresh.phase !== "DISPATCHED"
    || record.refresh.owner !== owner || record.refresh.fence !== fence || now >= record.refresh.leaseExpiresAt
    || replacement.context !== record.context || !live(record, now)) return null;
  return { ...record, version: record.version + 1, credentialVersion: record.credentialVersion + 1, status: "ACTIVE", credentials: replacement, refresh: null };
}

export function failRefresh(record: SessionRecord, owner: string, fence: number): SessionRecord | null {
  if (record.status !== "REFRESHING" || record.refresh?.owner !== owner || record.refresh.fence !== fence) return null;
  return { ...record, version: record.version + 1, status: "INVALID", credentials: null, refresh: null };
}

export function expireRefreshLease(record: SessionRecord, now: number): SessionRecord | null {
  if (record.status !== "REFRESHING" || !record.refresh || now < record.refresh.leaseExpiresAt) return null;
  // Even RESERVED expiry fails closed: no lease takeover ever reuses a token.
  return { ...record, version: record.version + 1, status: "INVALID", credentials: null, refresh: null };
}

export function beginLogout(record: SessionRecord): SessionRecord | null {
  if (record.status === "LOGGING_OUT" || record.status === "DELETED") return null;
  return { ...record, version: record.version + 1, status: "LOGGING_OUT" };
}

export function finishLogout(record: SessionRecord): SessionRecord | null {
  if (record.status !== "LOGGING_OUT") return null;
  // Retain a versioned tombstone until in-flight owners cannot commit. No resurrection.
  return { ...record, version: record.version + 1, status: "DELETED", credentials: null, refresh: null };
}

export function logoutRequest(record: SessionRecord, credential: { context: SessionRecord["context"]; accessToken: string; refreshToken: string }) {
  if (record.status !== "LOGGING_OUT" || record.context !== credential.context || record.refresh !== null) throw new Error("Logout not dispatchable");
  return {
    method: "POST",
    path: record.context === "PLATFORM" ? "/api/platform/auth/logout" : "/api/auth/logout",
    headers: { Authorization: `Bearer ${credential.accessToken}`, "Content-Type": "application/json" },
    body: { refreshToken: credential.refreshToken },
  };
}

export type LogoutOutcome = "CONFIRMED_LOGOUT" | "NETWORK_UNCERTAIN_LOGOUT" | "BACKEND_REJECTED_LOGOUT";
export function logoutOutcome(status: number | null): LogoutOutcome {
  if (status === 204) return "CONFIRMED_LOGOUT";
  return status === null || status >= 500 ? "NETWORK_UNCERTAIN_LOGOUT" : "BACKEND_REJECTED_LOGOUT";
}
