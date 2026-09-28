import "server-only";
import type { Pool, PoolClient } from "pg";
import type { BffConfig } from "./config";
import type { Context } from "./session-contract";
import type { SecurityObserver } from "./security-observer";
import { sessionTransaction } from "./postgres-transaction";
import { pendingLive, proofMatches, type PreAuth, type Selection } from "./pending-auth";

type PendingRecord = PreAuth | Selection;
type Kind = PendingRecord["kind"];
const table = (kind: Kind) => kind === "PRE_AUTH" ? "schoolerp_bff.pre_auth" : "schoolerp_bff.membership_selection";
const hex = (s: unknown): s is string => typeof s === "string" && /^[a-f0-9]{64}$/.test(s);
const uuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const terminal = (r: PendingRecord) => ["CONSUMED", "REVOKED", "EXPIRED"].includes(r.status);
function project(r: PendingRecord): PendingRecord {
  if (!r || !["PRE_AUTH", "SELECTION"].includes(r.kind) || !["PLATFORM", "TENANT"].includes(r.context)
    || !hex(r.key) || !hex(r.csrfVerifier) || r.schemaVersion !== 1
    || ![r.createdAt, r.updatedAt, r.expiresAt, r.version].every(n => Number.isSafeInteger(n) && n >= 0)
    || r.expiresAt <= r.createdAt || r.updatedAt < r.createdAt
    || !(r.kind === "PRE_AUTH" ? ["ACTIVE", "CONSUMING", "CONSUMED", "REVOKED", "EXPIRED"] : ["PENDING", "CONSUMING", "CONSUMED", "REVOKED", "EXPIRED"]).includes(r.status)
    || (r.status === "CONSUMING" ? !hex(r.owner) : r.owner !== null)
    || (terminal(r) ? !Number.isSafeInteger(r.tombstoneExpiresAt) : r.tombstoneExpiresAt !== null)) throw new Error("Invalid pending state");
  const base = { schemaVersion: 1 as const, context: r.context, key: r.key, version: r.version, status: r.status,
    createdAt: r.createdAt, updatedAt: r.updatedAt, expiresAt: r.expiresAt, csrfVerifier: r.csrfVerifier,
    owner: r.owner, tombstoneExpiresAt: r.tombstoneExpiresAt };
  if (r.kind === "PRE_AUTH") {
    if (r.selectionKey !== null && (!hex(r.selectionKey) || r.context !== "TENANT" || r.status !== "CONSUMED")) throw new Error("Invalid pending state");
    return { ...base, kind: r.kind, selectionKey: r.selectionKey };
  }
  if (r.context !== "TENANT" || !hex(r.preAuthKey) || r.credentialVersion !== 0
    || !Number.isSafeInteger(r.backendExpiresAt) || r.expiresAt > r.backendExpiresAt
    || !Array.isArray(r.memberships) || r.memberships.length < 1 || r.memberships.length > 100
    || new Set(r.memberships.map(m => m.membershipId)).size !== r.memberships.length
    || r.memberships.some(m => !uuid(m.membershipId) || !uuid(m.tenantId) || typeof m.tenantName !== "string" || !m.tenantName.trim() || m.tenantName.length > 1000)) throw new Error("Invalid pending state");
  const e = r.envelope;
  if (terminal(r) ? e !== null : !e || !e.keyId || !e.wrappedKey || !e.ciphertext || Buffer.from(e.nonce, "base64").length !== 12 || Buffer.from(e.tag, "base64").length !== 16) throw new Error("Invalid pending state");
  return { ...base, kind: r.kind, context: "TENANT", preAuthKey: r.preAuthKey, credentialVersion: 0,
    backendExpiresAt: r.backendExpiresAt, memberships: r.memberships.map(m => ({ membershipId: m.membershipId, tenantId: m.tenantId, tenantName: m.tenantName })),
    envelope: e ? { keyId: e.keyId, wrappedKey: e.wrappedKey, nonce: e.nonce, ciphertext: e.ciphertext, tag: e.tag } : null };
}

/** Separate unauthenticated records, using the qualified pool and transaction runner.
 * No callback performs external work inside a database transaction. */
export class PostgresPendingAuthStore {
  constructor(private readonly pool: Pool, private readonly limits: BffConfig["limits"], private readonly observer?: SecurityObserver) {}
  private transaction<T>(work: (db: PoolClient, now: number) => Promise<T>) {
    return sessionTransaction(this.pool, this.limits, this.observer, work);
  }
  private async read(db: PoolClient, kind: Kind, context: Context, key: string) {
    const found = await db.query(`SELECT record FROM ${table(kind)} WHERE context=$1 AND key=$2 FOR UPDATE`, [context, key]);
    const r = found.rowCount ? project(found.rows[0].record) : null;
    if (r && (r.kind !== kind || r.context !== context || r.key !== key)) throw new Error("Invalid pending state");
    return r;
  }
  private async clock(db: PoolClient) {
    return Number((await db.query("SELECT floor(extract(epoch from clock_timestamp())*1000)::text AS now")).rows[0].now);
  }
  private async write(db: PoolClient, record: PendingRecord) {
    const r = project(record);
    await db.query(`UPDATE ${table(r.kind)} SET record=$3::jsonb WHERE context=$1 AND key=$2`, [r.context, r.key, JSON.stringify(r)]);
  }
  private end(r: PendingRecord, status: "CONSUMED" | "REVOKED" | "EXPIRED", now: number): PendingRecord {
    return { ...r, status, version: r.version + 1, updatedAt: now, owner: null,
      tombstoneExpiresAt: now + this.limits.TOMBSTONE_RETENTION_MS, ...(r.kind === "SELECTION" ? { envelope: null } : {}) };
  }
  async createPreAuth(context: Context, key: string, csrfVerifier: string): Promise<PreAuth | null> {
    return this.transaction(async (db, now) => {
      const r = project({ kind: "PRE_AUTH", schemaVersion: 1, context, key, csrfVerifier, version: 0,
        status: "ACTIVE", createdAt: now, updatedAt: now, expiresAt: now + this.limits.PREAUTH_TTL_MS,
        owner: null, selectionKey: null, tombstoneExpiresAt: null }) as PreAuth;
      const result = await db.query("INSERT INTO schoolerp_bff.pre_auth(context,key,record) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING", [context, key, JSON.stringify(r)]);
      return result.rowCount === 1 ? r : null;
    });
  }
  async get(kind: "PRE_AUTH", context: Context, key: string): Promise<PreAuth | null>;
  async get(kind: "SELECTION", context: Context, key: string): Promise<Selection | null>;
  async get(kind: Kind, context: Context, key: string): Promise<PendingRecord | null> {
    return this.transaction(async db => {
      const r = await this.read(db, kind, context, key), now = await this.clock(db);
      if (r && !terminal(r) && !pendingLive(r, now)) { const expired = this.end(r, "EXPIRED", now); await this.write(db, expired); return expired; }
      return r;
    });
  }
  async reserve(kind: Kind, context: Context, key: string, version: number, proof: string, owner: string): Promise<PendingRecord | null> {
    if (!hex(owner)) return null;
    return this.transaction(async db => {
      const r = await this.read(db, kind, context, key), now = await this.clock(db);
      if (!r || terminal(r)) return null;
      if (!pendingLive(r, now)) { await this.write(db, this.end(r, "EXPIRED", now)); return null; }
      if (r.version !== version || r.status !== (kind === "PRE_AUTH" ? "ACTIVE" : "PENDING") || !proofMatches(r.csrfVerifier, proof)) return null;
      // Durable dispatch authority. There is deliberately no lease takeover or retry.
      const next = { ...r, status: "CONSUMING" as const, version: r.version + 1, owner, updatedAt: now };
      await this.write(db, next); return next;
    });
  }
  async finish(record: PendingRecord, status: "CONSUMED" | "REVOKED") {
    return this.transaction(async db => {
      const r = await this.read(db, record.kind, record.context, record.key), now = await this.clock(db);
      if (!r || terminal(r) || r.version !== record.version || r.status !== "CONSUMING" || r.owner !== record.owner) return false;
      if (!pendingLive(r, now)) { await this.write(db, this.end(r, "EXPIRED", now)); return false; }
      await this.write(db, this.end(r, status, now)); return true;
    });
  }
  async revoke(kind: Kind, context: Context, key: string, version: number) {
    return this.transaction(async db => {
      const r = await this.read(db, kind, context, key), now = await this.clock(db);
      if (!r || terminal(r) || r.version !== version) return false;
      await this.write(db, this.end(r, "REVOKED", now)); return true;
    });
  }
  async publishSelection(preAuth: PreAuth, input: Selection): Promise<boolean> {
    const s = project(input) as Selection;
    if (s.kind !== "SELECTION" || preAuth.context !== "TENANT" || s.preAuthKey !== preAuth.key || s.csrfVerifier !== preAuth.csrfVerifier
      || s.status !== "PENDING" || s.version !== 0) return false;
    return this.transaction(async db => {
      const p = await this.read(db, "PRE_AUTH", "TENANT", preAuth.key) as PreAuth | null, now = await this.clock(db);
      if (!p || p.status !== "CONSUMING" || p.version !== preAuth.version || p.owner !== preAuth.owner || !pendingLive(p, now)
        || !pendingLive(s, now) || s.csrfVerifier !== p.csrfVerifier || s.createdAt < p.createdAt || s.createdAt > now + this.limits.CLOCK_SKEW_MS
        || s.expiresAt > p.expiresAt || s.expiresAt > s.createdAt + this.limits.MEMBERSHIP_SELECTION_TTL_MS) return false;
      const result = await db.query("INSERT INTO schoolerp_bff.membership_selection(context,key,pre_auth_key,record) VALUES('TENANT',$1,$2,$3::jsonb) ON CONFLICT DO NOTHING", [s.key, s.preAuthKey, JSON.stringify(s)]);
      if (result.rowCount !== 1) return false;
      await this.write(db, { ...this.end(p, "CONSUMED", now), selectionKey: s.key } as PreAuth);
      return true;
    });
  }
  async cleanup() {
    return this.transaction(async (db, now) => {
      // Expiration does not depend on cleanup. Retain terminal records through
      // the replay window; delete children first to preserve origin integrity.
      for (const name of ["membership_selection", "pre_auth"]) {
        const expired = await db.query(`SELECT record FROM schoolerp_bff.${name} WHERE (record->>'expiresAt')::bigint <= $1 AND record->>'status' IN ('ACTIVE','PENDING','CONSUMING') LIMIT 100 FOR UPDATE SKIP LOCKED`, [now]);
        for (const row of expired.rows) await this.write(db, this.end(project(row.record), "EXPIRED", now));
        await db.query(`DELETE FROM schoolerp_bff.${name} WHERE (context,key) IN (SELECT context,key FROM schoolerp_bff.${name} WHERE (record->>'tombstoneExpiresAt')::bigint <= $1 ${name === "pre_auth" ? "AND NOT EXISTS (SELECT 1 FROM schoolerp_bff.membership_selection s WHERE s.pre_auth_key=pre_auth.key AND s.context=pre_auth.context)" : ""} LIMIT 100 FOR UPDATE SKIP LOCKED)`, [now]);
      }
    });
  }
}
