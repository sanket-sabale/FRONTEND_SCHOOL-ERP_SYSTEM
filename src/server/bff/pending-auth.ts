import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Context } from "./session-contract";
import type { CredentialEnvelope } from "./credential-envelope";
import type { MembershipChoice } from "./upstream-contract";
import { randomOpaqueId, sessionCookie, cookieName, type CookieEnvironment } from "./security-policy";

export type PendingStatus = "ACTIVE" | "PENDING" | "CONSUMING" | "CONSUMED" | "REVOKED" | "EXPIRED";
export type PreAuth = {
  kind: "PRE_AUTH"; schemaVersion: 1; context: Context; key: string; version: number;
  status: PendingStatus; createdAt: number; updatedAt: number; expiresAt: number;
  csrfVerifier: string; owner: string | null; selectionKey: string | null;
  tombstoneExpiresAt: number | null;
};
export type Selection = Omit<PreAuth, "kind" | "selectionKey" | "context"> & {
  kind: "SELECTION"; context: "TENANT"; preAuthKey: string; credentialVersion: 0;
  backendExpiresAt: number; memberships: MembershipChoice[]; envelope: CredentialEnvelope | null;
};
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function preAuthKey(context: Context, id: string) {
  if (!["PLATFORM", "TENANT"].includes(context) || !/^[A-Za-z0-9_-]{43}$/.test(id)) throw new Error("Invalid pre-auth identifier");
  return hash(`pre-auth:${context}:${id}`);
}
// Domain-separated derivation permits safe multi-tab bootstrap reuse without
// persisting the synchronizer secret or rotating another tab's transaction.
export function preAuthProof(context: Context, id: string) {
  preAuthKey(context, id);
  return createHash("sha256").update(`pre-auth-csrf:${context}:${id}`).digest("base64url");
}
export function proofMatches(verifier: string, proof: string) {
  return /^[a-f0-9]{64}$/.test(verifier) && /^[A-Za-z0-9_-]{43}$/.test(proof)
    && timingSafeEqual(Buffer.from(verifier), Buffer.from(hash(proof)));
}
export function preAuthCookie(context: Context, id: string, mode: CookieEnvironment, now: number, expiresAt: number) {
  return sessionCookie(context, id, mode, now, expiresAt).replace(`${cookieName(context, mode)}=`, `${cookieName(context, mode)}_preauth=`);
}
export function newPreAuthReference(context: Context) {
  const id = randomOpaqueId(), proof = preAuthProof(context, id);
  return { id, proof, key: preAuthKey(context, id), csrfVerifier: hash(proof) };
}
export function pendingLive(record: PreAuth | Selection, now: number) {
  return now < record.expiresAt && ["ACTIVE", "PENDING", "CONSUMING"].includes(record.status);
}
export function selectionBinding(environment: string, record: Selection) {
  return { environment, context: record.context, sessionKey: record.key, credentialVersion: record.credentialVersion,
    transactionBinding: hash(JSON.stringify([record.kind, record.schemaVersion, record.preAuthKey, record.csrfVerifier,
      record.createdAt, record.expiresAt, record.backendExpiresAt, record.memberships])) };
}
export function projectChoices(record: Selection, now: number) {
  if (record.context !== "TENANT" || record.status !== "PENDING" || !pendingLive(record, now)) throw new Error("Selection unavailable");
  return { status: "MEMBERSHIP_SELECTION_REQUIRED", expiresAt: new Date(record.expiresAt).toISOString(),
    memberships: record.memberships.map(m => ({ membershipId: m.membershipId, tenantId: m.tenantId, tenantName: m.tenantName })) };
}
