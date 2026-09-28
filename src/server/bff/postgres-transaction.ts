import "server-only";
import type { Pool, PoolClient } from "pg";
import type { BffConfig } from "./config";
import { BffError } from "./errors";
import { performance } from "node:perf_hooks";
import { observe, type SecurityObserver } from "./security-observer";

export async function sessionTransaction<T>(pool: Pool, limits: BffConfig["limits"], observer: SecurityObserver | undefined, work: (db: PoolClient, now: number) => Promise<T>): Promise<T> {
    let db: PoolClient | undefined;
    const started = performance.now();
    let failed = false;
    const onConnectionError = () => { failed = true; };
    try {
      db = await pool.connect();
      db.on("error", onConnectionError);
      // Live lookups also require the primary. READ WRITE rejects hot standbys;
      // removing a read lock must not silently permit stale replica authority.
      await db.query("BEGIN READ WRITE");
      // PostgreSQL 17 transaction_timeout bounds the entire transaction, including
      // application pauses. lock/statement timeouts alone do not do that.
      await db.query("SELECT set_config('transaction_timeout',$1,true), set_config('statement_timeout',$1,true), set_config('lock_timeout',$1,true), set_config('synchronous_commit','on',true)", [String(limits.SESSION_STORE_OPERATION_TIMEOUT_MS)]);
      const clock = await db.query("SELECT floor(extract(epoch from clock_timestamp()) * 1000)::text AS now");
      const result = await work(db, Number(clock.rows[0].now));
      if (failed) throw new Error("Session connection unavailable");
      await db.query("COMMIT");
      return result;
    } catch {
      failed = true;
      if (db) { try { await db.query("ROLLBACK"); } catch { /* destroy uncertain connection below */ } }
      throw new BffError("BFF_SESSION_STORE_UNAVAILABLE", 503);
    } finally {
      db?.release(failed);
      // Destroyed connections can emit a final error after their query rejects.
      // Keep the handler on those; healthy idle connections belong to the pool.
      if (!failed) db?.removeListener("error", onConnectionError);
      observe(observer, { boundary: "session-store", operation: "transaction", outcome: failed ? "unavailable" : "success", latencyMs: Math.max(0, performance.now() - started) });
    }
}
