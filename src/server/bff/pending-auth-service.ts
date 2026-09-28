import "server-only";
import type { BffConfig } from "./config";
import { sessionDeadlines } from "./config";
import type { Context } from "./session-contract";
import { BffError } from "./errors";
import { PostgresPendingAuthStore } from "./postgres-pending-auth-store";
import { openSelectionCredential, sealSelectionCredential, sealCredentials, type KeyWrapper } from "./credential-envelope";
import { hash, newPreAuthReference, pendingLive, preAuthKey, preAuthProof, proofMatches, selectionBinding, type PreAuth, type Selection } from "./pending-auth";
import { randomOpaqueId, sessionKey } from "./security-policy";
import { validateIdentity, validateMembershipChoice, validateSelectionResponse, validateTokenResponse } from "./upstream-contract";
import type { SpringClient } from "./spring-client";
import type { PersistedSession } from "./postgres-session-store";

const required = () => new BffError("BFF_SESSION_REQUIRED", 401);
/** Persistence service only. Future browser bootstrap must enforce exact Origin,
 * Fetch Metadata, JSON, bootstrap marker and approved ingress rate limits first. */
export class PendingAuthService {
  constructor(private readonly store: PostgresPendingAuthStore, private readonly config: BffConfig,
    private readonly wrapper: KeyWrapper, private readonly now: () => number = Date.now) {}
  async bootstrap(context: Context, existingId?: string) {
    if (existingId) {
      const p = await this.store.get("PRE_AUTH", context, preAuthKey(context, existingId));
      if (p?.status === "CONSUMED" && p.selectionKey && context === "TENANT") {
        const selection = await this.store.get("SELECTION", "TENANT", p.selectionKey);
        if (selection && pendingLive(selection, this.now())) {
          const proof = preAuthProof(context, existingId);
          if (selection.status !== "PENDING" || selection.preAuthKey !== p.key || selection.csrfVerifier !== p.csrfVerifier
            || !proofMatches(p.csrfVerifier, proof)) throw required();
          return { id: existingId, proof, record: p };
        }
      }
      if (p && pendingLive(p, this.now())) {
        if (p.status !== "ACTIVE") throw required();
        const proof = preAuthProof(context, existingId);
        if (!proofMatches(p.csrfVerifier, proof)) throw required();
        return { id: existingId, proof, record: p }; // no TTL extension or rotation
      }
    }
    const ref = newPreAuthReference(context);
    const record = await this.store.createPreAuth(context, ref.key, ref.csrfVerifier);
    if (!record) throw required();
    return { id: ref.id, proof: ref.proof, record };
  }
  async beginLogin(context: Context, id: string, proof: string) {
    const p = await this.store.get("PRE_AUTH", context, preAuthKey(context, id));
    if (!p) throw required();
    const reserved = await this.store.reserve("PRE_AUTH", context, p.key, p.version, proof, hash(randomOpaqueId()));
    if (!reserved || reserved.kind !== "PRE_AUTH") throw required();
    return reserved;
  }
  async beginMembershipLogin(id: string, proof: string, body: unknown, spring: Pick<SpringClient, "call">) {
    const preAuth = await this.beginLogin("TENANT", id, proof);
    try {
      const response = await spring.call("TENANT", "login", { browserHeaders: new Headers(), body });
      if (response.status !== 200) throw required();
      return await this.publishSelection(preAuth, response.body);
    } catch {
      await this.store.finish(preAuth, "REVOKED").catch(() => false);
      throw required();
    }
  }
  async publishSelection(preAuth: PreAuth, springResponse: unknown) {
    try {
      if (preAuth.context !== "TENANT" || preAuth.status !== "CONSUMING") throw required();
      const now = this.now(), response = validateSelectionResponse(springResponse, now);
      const metadata: Selection = { kind: "SELECTION", schemaVersion: 1, context: "TENANT", key: hash(randomOpaqueId()),
        preAuthKey: preAuth.key, csrfVerifier: preAuth.csrfVerifier, version: 0, credentialVersion: 0,
        status: "PENDING", createdAt: now, updatedAt: now, backendExpiresAt: Date.parse(response.expiresAt),
        expiresAt: Math.min(preAuth.expiresAt, Date.parse(response.expiresAt), now + this.config.limits.MEMBERSHIP_SELECTION_TTL_MS),
        owner: null, tombstoneExpiresAt: null, memberships: response.memberships, envelope: null };
      if (!pendingLive(metadata, now)) throw required();
      metadata.envelope = await sealSelectionCredential(this.wrapper, selectionBinding(this.config.environment, metadata), response.selectionToken);
      if (!await this.store.publishSelection(preAuth, metadata)) throw required();
      return metadata;
    } catch {
      // Any uncertain publish stays consumed/consuming; never retry login credentials.
      await this.store.finish(preAuth, "REVOKED").catch(() => false);
      throw required();
    }
  }
  async consumeSelection(id: string, proof: string, browserBody: unknown, spring: Pick<SpringClient, "call">) {
    const membershipId = validateMembershipChoice(browserBody);
    const p = await this.store.get("PRE_AUTH", "TENANT", preAuthKey("TENANT", id));
    if (!p || p.status !== "CONSUMED" || !p.selectionKey || !proofMatches(p.csrfVerifier, proof)) throw required();
    const selection = await this.store.get("SELECTION", "TENANT", p.selectionKey);
    if (!selection || selection.preAuthKey !== p.key || selection.csrfVerifier !== p.csrfVerifier
      || !selection.memberships.some(m => m.membershipId === membershipId)) throw required();
    const reserved = await this.store.reserve("SELECTION", "TENANT", selection.key, selection.version, proof, hash(randomOpaqueId()));
    if (!reserved || reserved.kind !== "SELECTION") throw required();
    try {
      // Reservation is durable before decryption/network. A crash or lost response
      // never grants a second owner permission to dispatch the credential.
      const selectionToken = await openSelectionCredential(this.wrapper, selectionBinding(this.config.environment, reserved), reserved.envelope!);
      const response = await spring.call("TENANT", "select-membership", { browserHeaders: new Headers(), body: { selectionToken, membershipId } });
      if (response.status !== 200) throw required();
      const tokens = validateTokenResponse("TENANT", response.body);
      const me = await spring.call("TENANT", "session", { browserHeaders: new Headers(), credential: { context: "TENANT", accessToken: tokens.accessToken } });
      if (me.status !== 200) throw required();
      const identity = validateIdentity("TENANT", me.body), choice = reserved.memberships.find(m => m.membershipId === membershipId)!;
      if (identity.context !== "TENANT" || !("tenantId" in tokens) || identity.membershipId !== membershipId
        || tokens.membershipId !== membershipId || identity.tenantId !== choice.tenantId || tokens.tenantId !== identity.tenantId) throw required();
      const now = this.now(), freshId = randomOpaqueId(), key = sessionKey("TENANT", freshId), csrfProof = randomOpaqueId();
      const envelope = await sealCredentials(this.wrapper, { environment: this.config.environment, context: "TENANT", sessionKey: key, credentialVersion: 0 }, tokens);
      const record: PersistedSession = { key, context: "TENANT", schemaVersion: 1, version: 0, credentialVersion: 0, status: "ACTIVE",
        createdAt: now, lastAccessedAt: now, ...sessionDeadlines(this.config, "TENANT", now),
        accessExpiresAt: now + tokens.expiresInSeconds! * 1000, identity: { accountId: identity.accountId, tenantId: identity.tenantId, membershipId: identity.membershipId },
        authenticationMethod: "PASSWORD", csrfVerifier: hash(csrfProof), csrfVersion: 0,
        credentials: { context: "TENANT", envelopeId: hash(randomOpaqueId()) }, envelope, refresh: null, tombstoneExpiresAt: null };
      if (!await this.store.finish(reserved, "CONSUMED")) throw required();
      // Prepared server-only handoff, NOT an issued/persisted browser session.
      // Future activation must persist this fresh identity before issuing a cookie.
      // Crash after consumption requires reauthentication; no recovery replay.
      return { id: freshId, csrfProof, record };
    } catch {
      await this.store.finish(reserved, "REVOKED").catch(() => false);
      throw required();
    }
  }
}
