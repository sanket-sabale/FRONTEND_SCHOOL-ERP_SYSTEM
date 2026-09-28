import "server-only";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import type { BffConfig } from "./config";
import type { Context, SessionRecord } from "./session-contract";
import type { PersistedSession, SessionStore } from "./postgres-session-store";
import { reserveRefresh, markRefreshDispatched, completeRefresh, failRefresh } from "./session-transitions";
import { BffError } from "./errors";

export type RefreshReplacement = { envelope: NonNullable<PersistedSession["envelope"]>; envelopeId: string; accessExpiresAt: number };
// sendOnce is a server-only broker: decrypt, one Spring call, validate DTO and me
// identity, encrypt new pair. No default broker or live route is supplied here.
export type RefreshBroker = (record: PersistedSession) => Promise<RefreshReplacement>;
export class RefreshCoordinator {
  constructor(private readonly store: SessionStore, private readonly config: BffConfig, private readonly now: () => number = Date.now) {}
  private async commit(previous: SessionRecord, next: SessionRecord) {
    try { return await this.store.compareAndSwap(previous, next); }
    catch {
      // An uncertain COMMIT must be resolved on the primary before a side effect.
      const actual = await this.store.get(previous.context, previous.key);
      return !!actual && actual.version === next.version && actual.status === next.status
        && actual.credentialVersion === next.credentialVersion
        && JSON.stringify(actual.refresh) === JSON.stringify(next.refresh)
        && JSON.stringify(actual.credentials) === JSON.stringify(next.credentials);
    }
  }
  async refresh(context: Context, key: string, observedVersion: number, sendOnce: RefreshBroker): Promise<PersistedSession> {
    const owner = randomUUID(), started = performance.now();
    let current = await this.store.get(context, key);
    if (!current || current.context !== context) throw new BffError("BFF_SESSION_REQUIRED", 401);
    const reserved = reserveRefresh(current, owner, this.now(), this.config.limits.REFRESH_LEASE_MS, observedVersion);
    if (!reserved || !await this.commit(current, reserved)) {
      // Poll only durable state, never a local lock or a second network dispatch.
      while (performance.now() - started < this.config.limits.REFRESH_WAITER_TIMEOUT_MS) {
        current = await this.store.get(context, key);
        if (current?.status === "ACTIVE" && current.credentialVersion > observedVersion) return current;
        if (!current || current.status !== "REFRESHING") break;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new BffError("BFF_REFRESH_REQUIRED", 409);
    }
    current = await this.store.get(context, key);
    if (!current || current.refresh?.owner !== owner) throw new BffError("BFF_REFRESH_REQUIRED", 409);
    const fence = current.refresh.fence;
    const dispatched = markRefreshDispatched(current, owner, fence, this.now());
    if (!dispatched || !await this.commit(current, dispatched)) throw new BffError("BFF_REFRESH_REQUIRED", 409);
    // This invocation alone owns the send. No worker resumes a DISPATCHED record.
    const durable = await this.store.get(context, key);
    if (!durable || durable.version !== dispatched.version || durable.refresh?.owner !== owner || durable.refresh.phase !== "DISPATCHED") throw new BffError("BFF_REFRESH_REQUIRED", 409);
    try {
      const replacement = await sendOnce(durable);
      if (!Number.isSafeInteger(replacement.accessExpiresAt) || replacement.accessExpiresAt <= this.now()) throw new Error();
      const latest = await this.store.get(context, key);
      const complete = latest && completeRefresh(latest, owner, fence, { context, envelopeId: replacement.envelopeId }, this.now());
      if (!latest || !complete || !await this.commit(latest, { ...complete, envelope: replacement.envelope, accessExpiresAt: replacement.accessExpiresAt } as PersistedSession)) throw new Error();
      const final = await this.store.get(context, key);
      if (!final || final.status !== "ACTIVE") throw new Error();
      return final;
    } catch {
      // Lost response, 429, 5xx, malformed response or failed commit: old token is
      // never replayed. If store is down, durable DISPATCHED prevents takeover.
      const latest = await this.store.get(context, key);
      const invalid = latest && failRefresh(latest, owner, fence);
      if (latest && invalid) await this.store.compareAndSwap(latest, invalid);
      throw new BffError("BFF_SESSION_REQUIRED", 401);
    }
  }
}
