import "server-only";
import { Pool, type PoolClient } from "pg";
import type { BffConfig } from "./config";
import type { BrowserSessionStore, Context, SessionRecord } from "./session-contract";
import type { CredentialEnvelope } from "./credential-envelope";
import type { SecurityObserver } from "./security-observer";
import { sessionTransaction } from "./postgres-transaction";

export type IdentityBinding = { accountId: string; sessionId: string } | { accountId: string; tenantId: string; membershipId: string };
export type PersistedSession = SessionRecord & {
  schemaVersion: 1; lastAccessedAt: number; accessExpiresAt: number;
  identity: IdentityBinding; csrfVerifier: string; csrfVersion: number;
  envelope: CredentialEnvelope | null; tombstoneExpiresAt: number | null;
};
export interface SessionStore extends BrowserSessionStore {
  get(context: Context, key: string): Promise<PersistedSession | null>;
}
const terminal = (s: SessionRecord) => s.status === "INVALID" || s.status === "DELETED";
function project(input: SessionRecord): PersistedSession {
  const r = input as PersistedSession;
  if (!/^[a-f0-9]{64}$/.test(r.key) || !["PLATFORM", "TENANT"].includes(r.context)
    || r.schemaVersion !== 1 || !["ACTIVE", "REFRESHING", "LOGGING_OUT", "INVALID", "DELETED"].includes(r.status)
    || !["PASSWORD", "OIDC"].includes(r.authenticationMethod)
    || !r.identity?.accountId || !/^[a-f0-9]{64}$/.test(r.csrfVerifier)
    || (r.context === "PLATFORM" ? !("sessionId" in r.identity) : !("tenantId" in r.identity) || !("membershipId" in r.identity))) throw new Error("Invalid session record");
  for (const n of [r.version, r.credentialVersion, r.createdAt, r.lastAccessedAt, r.idleExpiresAt, r.absoluteExpiresAt, r.accessExpiresAt, r.csrfVersion]) {
    if (!Number.isSafeInteger(n) || n < 0) throw new Error("Invalid session record");
  }
  if (r.idleExpiresAt > r.absoluteExpiresAt || r.createdAt > r.lastAccessedAt
    || Boolean(r.credentials) !== Boolean(r.envelope) || (r.credentials && r.credentials.context !== r.context)
    || (terminal(r) && (r.credentials || r.refresh))
    || (r.status === "REFRESHING" && !r.refresh)
    || (r.status === "ACTIVE" && (!r.credentials || r.refresh))) throw new Error("Invalid session record");
  if (r.credentials && (typeof r.credentials.envelopeId !== "string" || !r.credentials.envelopeId || r.credentials.envelopeId.length > 256)) throw new Error("Invalid credential reference");
  if (r.refresh && (!r.refresh.owner || !Number.isSafeInteger(r.refresh.fence) || !Number.isSafeInteger(r.refresh.leaseExpiresAt)
    || !["RESERVED", "DISPATCHED"].includes(r.refresh.phase))) throw new Error("Invalid session record");
  const e = r.envelope;
  const identityFields = r.context === "PLATFORM" ? [r.identity.accountId, (r.identity as { sessionId: string }).sessionId]
    : [r.identity.accountId, (r.identity as { tenantId: string }).tenantId, (r.identity as { membershipId: string }).membershipId];
  if (identityFields.some(value => typeof value !== "string" || !value || value.length > 256)
    || (r.context === "PLATFORM" ? "tenantId" in r.identity || "membershipId" in r.identity : "sessionId" in r.identity)) throw new Error("Invalid identity binding");
  if (e && (!e.keyId || !e.wrappedKey || !e.ciphertext || Buffer.from(e.nonce, "base64").length !== 12 || Buffer.from(e.tag, "base64").length !== 16)) throw new Error("Invalid envelope");
  // Never serialize a caller's object wholesale: no passwords, tokens, roles or profile.
  return { key: r.key, context: r.context, version: r.version, credentialVersion: r.credentialVersion,
    status: r.status, createdAt: r.createdAt, idleExpiresAt: r.idleExpiresAt, absoluteExpiresAt: r.absoluteExpiresAt,
    authenticationMethod: r.authenticationMethod, credentials: r.credentials ? { context: r.context, envelopeId: r.credentials.envelopeId } : null,
    refresh: r.refresh ? { owner: r.refresh.owner, fence: r.refresh.fence, leaseExpiresAt: r.refresh.leaseExpiresAt, phase: r.refresh.phase } : null,
    schemaVersion: 1, lastAccessedAt: r.lastAccessedAt, accessExpiresAt: r.accessExpiresAt,
    identity: r.context === "PLATFORM" && "sessionId" in r.identity ? { accountId: r.identity.accountId, sessionId: r.identity.sessionId }
      : { accountId: r.identity.accountId, tenantId: (r.identity as { tenantId: string }).tenantId, membershipId: (r.identity as { membershipId: string }).membershipId },
    csrfVerifier: r.csrfVerifier, csrfVersion: r.csrfVersion,
    envelope: e ? { keyId: e.keyId, wrappedKey: e.wrappedKey, nonce: e.nonce, ciphertext: e.ciphertext, tag: e.tag } : null,
    tombstoneExpiresAt: r.tombstoneExpiresAt ?? null };
}

export function createSessionPool(config: BffConfig) {
  const pool = new Pool({ connectionString: config.databaseUrl, max: config.limits.SESSION_STORE_POOL_MAX,
    idleTimeoutMillis: config.limits.SESSION_STORE_POOL_IDLE_MS,
    maxLifetimeSeconds: config.limits.SESSION_STORE_POOL_LIFETIME_MS / 1000,
    connectionTimeoutMillis: config.limits.SESSION_STORE_CONNECT_TIMEOUT_MS,
    query_timeout: config.limits.SESSION_STORE_OPERATION_TIMEOUT_MS,
    ssl: config.environment === "development" ? false : { rejectUnauthorized: true, ca: config.databaseCa },
    application_name: "schoolerp-bff" });
  pool.on("error", () => { /* checked operations fail closed; never print driver secrets */ });
  return pool;
}

export class PostgresSessionStore implements SessionStore {
  constructor(private readonly pool: Pool, private readonly limits: BffConfig["limits"], private readonly observer?: SecurityObserver) {}
  private async transaction<T>(work: (db: PoolClient, now: number) => Promise<T>): Promise<T> {
    return sessionTransaction(this.pool, this.limits, this.observer, work);
  }
  private async read(db: PoolClient, context: Context, key: string) {
    const result = await db.query("SELECT record FROM schoolerp_bff.sessions WHERE context=$1 AND session_id_hash=$2 FOR UPDATE", [context, key]);
    return result.rowCount ? project(result.rows[0].record) : null;
  }
  private async clock(db: PoolClient) {
    return Number((await db.query("SELECT floor(extract(epoch from clock_timestamp()) * 1000)::text AS now")).rows[0].now);
  }
  private async write(db: PoolClient, r: PersistedSession) {
    await db.query("UPDATE schoolerp_bff.sessions SET record=$3::jsonb WHERE context=$1 AND session_id_hash=$2", [r.context, r.key, JSON.stringify(r)]);
  }
  private invalidate(r: PersistedSession, now: number): PersistedSession {
    return { ...r, version: r.version + 1, status: "INVALID", credentials: null, envelope: null, refresh: null, tombstoneExpiresAt: now + this.limits.TOMBSTONE_RETENTION_MS };
  }
  private expired(r: PersistedSession, now: number) {
    return now >= Math.min(r.idleExpiresAt, r.absoluteExpiresAt) || (r.status === "REFRESHING" && !!r.refresh && now >= r.refresh.leaseExpiresAt);
  }
  async create(input: SessionRecord) {
    const r = project(input);
    if (r.version !== 0 || r.status !== "ACTIVE" || r.credentialVersion !== 0) throw new Error("Invalid initial session");
    return this.transaction(async (db, now) => {
      if (this.expired(r, now) || r.createdAt > now + this.limits.CLOCK_SKEW_MS
        || r.lastAccessedAt > now + this.limits.CLOCK_SKEW_MS
        || r.absoluteExpiresAt > r.createdAt + this.limits[`${r.context}_ABSOLUTE_TIMEOUT_MS`]
        || r.idleExpiresAt > r.lastAccessedAt + this.limits[`${r.context}_IDLE_TIMEOUT_MS`]) return false;
      const result = await db.query("INSERT INTO schoolerp_bff.sessions(record) VALUES($1::jsonb) ON CONFLICT DO NOTHING", [JSON.stringify(r)]);
      return result.rowCount === 1;
    });
  }
  async get(context: Context, key: string) {
    return this.transaction(async (db) => {
      // A live lookup needs a primary statement snapshot, not an exclusive lock.
      // Only expiry mutates; re-read under lock before invalidating. This avoids
      // serializing every refresh waiter behind other readers.
      const found = await db.query("SELECT record, floor(extract(epoch from clock_timestamp()) * 1000)::text AS now FROM schoolerp_bff.sessions WHERE context=$1 AND session_id_hash=$2", [context, key]);
      let r = found.rowCount ? project(found.rows[0].record) : null;
      if (!r || terminal(r) || !this.expired(r, Number(found.rows[0].now))) return r;
      r = await this.read(db, context, key);
      const now = await this.clock(db);
      if (r && !terminal(r) && this.expired(r, now)) {
        const invalid = this.invalidate(r, now); await this.write(db, invalid); return invalid;
      }
      return r;
    });
  }
  async compareAndSwap(previous: SessionRecord, input: SessionRecord) {
    // Pure transitions retain persistence metadata through object spread. Terminal
    // proposals are normalized here to remove encrypted credentials atomically.
    const next = project({ ...input, ...(terminal(input) ? { envelope: null } : {}) });
    if (next.context !== previous.context || next.key !== previous.key || next.version !== previous.version + 1) return false;
    return this.transaction(async (db) => {
      const current = await this.read(db, previous.context, previous.key);
      const now = await this.clock(db);
      if (!current || terminal(current) || current.version !== previous.version || current.credentialVersion !== previous.credentialVersion) return false;
      if (this.expired(current, now)) { await this.write(db, this.invalidate(current, now)); return false; }
      if (current.createdAt !== next.createdAt || current.absoluteExpiresAt !== next.absoluteExpiresAt
        || next.csrfVersion < current.csrfVersion || current.authenticationMethod !== next.authenticationMethod
        || next.lastAccessedAt < current.lastAccessedAt || next.lastAccessedAt > now + this.limits.CLOCK_SKEW_MS
        || next.idleExpiresAt > next.lastAccessedAt + this.limits[`${next.context}_IDLE_TIMEOUT_MS`]
        || JSON.stringify(current.identity) !== JSON.stringify(next.identity)
        || (current.status === "LOGGING_OUT" && next.status !== "DELETED" && next.status !== "INVALID")) return false;
      const replacement = next.credentialVersion === current.credentialVersion + 1;
      if (replacement) {
        if (current.status !== "REFRESHING" || current.refresh?.phase !== "DISPATCHED" || next.status !== "ACTIVE"
          || next.credentials?.envelopeId === current.credentials?.envelopeId || JSON.stringify(next.envelope) === JSON.stringify(current.envelope)) return false;
      } else if (next.credentialVersion !== current.credentialVersion || (!terminal(next) && (JSON.stringify(next.credentials) !== JSON.stringify(current.credentials) || JSON.stringify(next.envelope) !== JSON.stringify(current.envelope)))) return false;
      if (current.status === "ACTIVE" && next.status === "REFRESHING"
        && (next.refresh?.phase !== "RESERVED" || next.refresh.fence !== next.version || next.refresh.leaseExpiresAt <= now || next.refresh.leaseExpiresAt > now + this.limits.REFRESH_LEASE_MS + this.limits.CLOCK_SKEW_MS)) return false;
      if (current.status === "REFRESHING" && next.status === "REFRESHING"
        && (current.refresh?.phase !== "RESERVED" || next.refresh?.phase !== "DISPATCHED" || next.refresh.owner !== current.refresh.owner || next.refresh.fence !== current.refresh.fence || next.refresh.leaseExpiresAt !== current.refresh.leaseExpiresAt)) return false;
      if (current.status === "REFRESHING" && next.status === "ACTIVE" && !replacement) return false;
      if (terminal(next)) next.tombstoneExpiresAt = now + this.limits.TOMBSTONE_RETENTION_MS;
      await this.write(db, next); return true;
    });
  }
  async rotate(previous: SessionRecord, input: SessionRecord) {
    const replacement = project(input);
    if (previous.context !== replacement.context || previous.key === replacement.key || replacement.version !== 0 || replacement.credentialVersion !== 0 || replacement.status !== "ACTIVE") return false;
    return this.transaction(async (db) => {
      const old = await this.read(db, previous.context, previous.key);
      const now = await this.clock(db);
      if (!old || old.status !== "ACTIVE" || old.version !== previous.version || old.credentialVersion !== previous.credentialVersion || this.expired(old, now) || this.expired(replacement, now)) return false;
      if (replacement.createdAt > now + this.limits.CLOCK_SKEW_MS
        || replacement.lastAccessedAt > now + this.limits.CLOCK_SKEW_MS
        || replacement.absoluteExpiresAt > replacement.createdAt + this.limits[`${replacement.context}_ABSOLUTE_TIMEOUT_MS`]
        || replacement.idleExpiresAt > replacement.lastAccessedAt + this.limits[`${replacement.context}_IDLE_TIMEOUT_MS`]) return false;
      const result = await db.query("INSERT INTO schoolerp_bff.sessions(record) VALUES($1::jsonb) ON CONFLICT DO NOTHING", [JSON.stringify(replacement)]);
      if (result.rowCount !== 1) return false;
      await this.write(db, { ...this.invalidate(old, now), status: "DELETED" });
      return true;
    });
  }
  async expire(context: Context, key: string, _now: number) {
    void _now; // authoritative database clock; caller cannot force a future expiry
    await this.get(context, key);
  }
  async deleteTombstone(context: Context, key: string, _after: number) {
    void _after;
    await this.transaction(async (db, now) => {
      const r = await this.read(db, context, key);
      if (r && terminal(r) && r.tombstoneExpiresAt !== null && now >= r.tombstoneExpiresAt) await db.query("DELETE FROM schoolerp_bff.sessions WHERE context=$1 AND session_id_hash=$2", [context, key]);
    });
  }
}
