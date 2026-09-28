import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { load, configuration } from "./helpers/bff-loader.mjs";
const { PostgresSessionStore }=load("postgres-session-store");
const { RefreshCoordinator }=load("refresh-coordinator");
const state=load("session-transitions");
const url=process.env.BFF_TEST_DATABASE_URL;
if (!url) throw new Error("BFF_TEST_DATABASE_URL must identify a disposable loopback bff_contract_tests database");
const parsed=new URL(url);
if(!["127.0.0.1","localhost"].includes(parsed.hostname)||parsed.pathname!=="/bff_contract_tests") throw new Error("Refusing non-test database");
const pool=new pg.Pool({connectionString:url,max:12,connectionTimeoutMillis:2000});
// PostgreSQL transaction_timeout terminates the connection as well as the query.
// The production pool has the same non-logging error listener.
pool.on("error",()=>{});
const config=configuration();
const store=new PostgresSessionStore(pool,config.limits);
const envelope=()=>({keyId:"test-only",wrappedKey:randomBytes(48).toString("base64"),nonce:randomBytes(12).toString("base64"),ciphertext:randomBytes(64).toString("base64"),tag:randomBytes(16).toString("base64")});
const record=(context="PLATFORM")=>{
  const now=Date.now();return {key:randomBytes(32).toString("hex"),context,version:0,credentialVersion:0,status:"ACTIVE",createdAt:now,lastAccessedAt:now,
    idleExpiresAt:now+60000,absoluteExpiresAt:now+120000,accessExpiresAt:now+10000,authenticationMethod:"PASSWORD",
    credentials:{context,envelopeId:randomBytes(16).toString("hex")},refresh:null,schemaVersion:1,
    identity:context==="PLATFORM"?{accountId:"account",sessionId:"backend-session"}:{accountId:"account",tenantId:"tenant",membershipId:"membership"},
    csrfVerifier:randomBytes(32).toString("hex"),csrfVersion:0,envelope:envelope(),tombstoneExpiresAt:null};
};
const replacement=()=>({envelope:envelope(),envelopeId:randomBytes(16).toString("hex"),accessExpiresAt:Date.now()+60000});
test("real PostgreSQL 17 transaction and refresh conformance",async t=>{
  try {
    // Database is explicitly disposable. No migrations run from application startup.
    await pool.query("DROP SCHEMA IF EXISTS schoolerp_bff CASCADE");
    await pool.query(readFileSync("deploy/bff/001-session-store.sql","utf8"));
    await t.test("create-if-absent, get, context isolation, projection and CAS conflict",async()=>{
      const r=record();assert.equal(await store.create({...r,password:"must-not-persist",accessToken:"must-not-persist"}),true);assert.equal(await store.create(r),false);
      const saved=await store.get(r.context,r.key);assert.equal(saved.version,0);assert.equal(await store.get("TENANT",r.key),null);
      assert.ok(!JSON.stringify((await pool.query("SELECT record FROM schoolerp_bff.sessions WHERE session_id_hash=$1",[r.key])).rows).includes("must-not-persist"));
      const next={...saved,version:1,lastAccessedAt:saved.lastAccessedAt+1};assert.equal(await store.compareAndSwap(saved,next),true);assert.equal(await store.compareAndSwap(saved,next),false);
      assert.equal(await store.compareAndSwap(next,{...next,version:2,credentialVersion:3}),false);
    });
    for(const deadline of ["idleExpiresAt","absoluteExpiresAt"]) await t.test(`${deadline} expires without cleanup`,async()=>{
      const r=record();r.idleExpiresAt=Date.now()+50;if(deadline==="absoluteExpiresAt")r.absoluteExpiresAt=r.idleExpiresAt;
      assert.equal(await store.create(r),true);await new Promise(r=>setTimeout(r,70));
      const got=await store.get(r.context,r.key);assert.equal(got.status,"INVALID");assert.equal(got.credentials,null);assert.equal(got.envelope,null);
    });
    await t.test("10 contenders on separate pools: one durable dispatch and replacement",async()=>{
      const r=record();await store.create(r);let sends=0;
      const secondPool=new pg.Pool({connectionString:url,max:10});
      secondPool.on("error",()=>{});
      try {
        const secondStore=new PostgresSessionStore(secondPool,config.limits);
        const workers=[new RefreshCoordinator(store,config),new RefreshCoordinator(secondStore,config)];
        const outcomes=await Promise.all(Array.from({length:10},(_,i)=>workers[i%2].refresh(r.context,r.key,0,async current=>{
          sends++;const persisted=await secondStore.get(r.context,r.key);assert.equal(persisted.refresh.phase,"DISPATCHED");assert.equal(persisted.refresh.owner,current.refresh.owner);
          await new Promise(r=>setTimeout(r,80));return replacement();
        })));
        assert.equal(sends,1);assert.ok(outcomes.every(r=>r.credentialVersion===1));assert.equal((await store.get(r.context,r.key)).version,3);
      }finally{await secondPool.end();}
    });
    await t.test("stale owner, stale credential and expired lease cannot take over",async()=>{
      const r=record();await store.create(r);const reserved=state.reserveRefresh(r,"owner",Date.now(),5000,0);assert.equal(await store.compareAndSwap(r,reserved),true);
      assert.equal(state.markRefreshDispatched(reserved,"stale",reserved.refresh.fence,Date.now()),null);
      await pool.query("UPDATE schoolerp_bff.sessions SET record=jsonb_set(record,'{refresh,leaseExpiresAt}','0') WHERE session_id_hash=$1",[r.key]);assert.equal((await store.get(r.context,r.key)).status,"INVALID");
      let sends=0;await assert.rejects(new RefreshCoordinator(store,config).refresh(r.context,r.key,0,async()=>{sends++;return replacement();}));assert.equal(sends,0);
      const fresh=record();await store.create(fresh);await assert.rejects(new RefreshCoordinator(store,config).refresh(fresh.context,fresh.key,3,async()=>{sends++;return replacement();}));assert.equal(sends,0);
    });
    for(const outcome of ["lost response","5xx","429","malformed response"]) await t.test(`${outcome}: invalidate and never send uncertain credential again`,async()=>{
      const r=record();await store.create(r);let sends=0;const worker=new RefreshCoordinator(store,config);
      await assert.rejects(worker.refresh(r.context,r.key,0,async()=>{sends++;if(outcome==="malformed response")return {};throw new Error(outcome);}));
      assert.equal((await store.get(r.context,r.key)).status,"INVALID");
      await assert.rejects(worker.refresh(r.context,r.key,0,async()=>{sends++;return replacement();}));assert.equal(sends,1);
    });
    await t.test("logout during refresh fences late replacement; after logout no dispatch",async()=>{
      const r=record();await store.create(r);let sends=0;
      await assert.rejects(new RefreshCoordinator(store,config).refresh(r.context,r.key,0,async()=>{
        sends++;const current=await store.get(r.context,r.key);const logging=state.beginLogout(current);assert.equal(await store.compareAndSwap(current,logging),true);
        const deleted=state.finishLogout(logging);assert.equal(await store.compareAndSwap(logging,deleted),true);return replacement();
      }));
      const final=await store.get(r.context,r.key);assert.equal(final.status,"DELETED");assert.equal(final.envelope,null);assert.ok(final.tombstoneExpiresAt>Date.now());
      await store.deleteTombstone(r.context,r.key,Number.MAX_SAFE_INTEGER);assert.ok(await store.get(r.context,r.key));
      await assert.rejects(new RefreshCoordinator(store,config).refresh(r.context,r.key,0,async()=>{sends++;return replacement();}));assert.equal(sends,1);
    });
    await t.test("atomic replacement commits both records, collision leaves old record live",async()=>{
      const r=record(),collision=record();await store.create(r);await store.create(collision);
      assert.equal(await store.rotate(r,collision),false);assert.equal((await store.get(r.context,r.key)).status,"ACTIVE");
      const fresh=record();assert.equal(await store.rotate(r,fresh),true);assert.equal((await store.get(r.context,r.key)).status,"DELETED");assert.equal((await store.get(fresh.context,fresh.key)).status,"ACTIVE");
      assert.equal(await store.rotate(r,record()),false);
    });
    await t.test("transaction failure after replacement insert rolls back both changes",async()=>{
      const r=record(),fresh=record();await store.create(r);
      await pool.query("CREATE FUNCTION schoolerp_bff.reject_update() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION ''injected failure''; END'; CREATE TRIGGER fail_update BEFORE UPDATE ON schoolerp_bff.sessions FOR EACH ROW EXECUTE FUNCTION schoolerp_bff.reject_update()");
      try{await assert.rejects(store.rotate(r,fresh));}finally{await pool.query("DROP TRIGGER fail_update ON schoolerp_bff.sessions; DROP FUNCTION schoolerp_bff.reject_update()");}
      assert.equal(await store.get(fresh.context,fresh.key),null);assert.equal((await store.get(r.context,r.key)).status,"ACTIVE");
    });
    await t.test("uncertain CAS reconciles primary; store failure never dispatches",async()=>{
      const r=record();await store.create(r);let sends=0;
      const uncertain={get:store.get.bind(store),compareAndSwap:async(a,b)=>{await store.compareAndSwap(a,b);throw new Error("lost commit acknowledgement");}};
      await new RefreshCoordinator(uncertain,config).refresh(r.context,r.key,0,async()=>{sends++;return replacement();});assert.equal(sends,1);
      const other=record();await store.create(other);
      const unavailable={get:store.get.bind(store),compareAndSwap:async()=>{throw new Error("offline");}};
      await assert.rejects(new RefreshCoordinator(unavailable,config).refresh(other.context,other.key,0,async()=>{sends++;return replacement();}));assert.equal(sends,1);
    });
    await t.test("lock contention is bounded and sanitized",async()=>{
      const r=record();await store.create(r);const blocker=await pool.connect();await blocker.query("BEGIN");await blocker.query("SELECT * FROM schoolerp_bff.sessions WHERE session_id_hash=$1 FOR UPDATE",[r.key]);
      const start=Date.now();try{assert.equal((await store.get(r.context,r.key)).version,0);await assert.rejects(store.compareAndSwap(r,{...r,version:1}),e=>e.code==="BFF_SESSION_STORE_UNAVAILABLE"&&!e.message.includes("postgres"));assert.ok(Date.now()-start<2500);}finally{await blocker.query("ROLLBACK");blocker.release();}
    });
    await t.test("store outage after send retains DISPATCHED across new adapters with no second send",async()=>{
      const r=record();await store.create(r);let offline=false,sends=0;
      const failing={compareAndSwap:store.compareAndSwap.bind(store),get:async(c,k)=>{if(offline)throw new Error("offline");return store.get(c,k);}};
      await assert.rejects(new RefreshCoordinator(failing,config).refresh(r.context,r.key,0,async()=>{sends++;offline=true;return replacement();}));
      const durable=await new PostgresSessionStore(pool,config.limits).get(r.context,r.key);assert.equal(durable.refresh.phase,"DISPATCHED");
      const impatient={...config,limits:{...config.limits,REFRESH_WAITER_TIMEOUT_MS:60}};
      await assert.rejects(new RefreshCoordinator(store,impatient).refresh(r.context,r.key,0,async()=>{sends++;return replacement();}));assert.equal(sends,1);
    });
    await t.test("DISPATCHED expiry invalidates; elapsed tombstones can be deleted but not resurrected by CAS",async()=>{
      const shortStore=new PostgresSessionStore(pool,{...config.limits,TOMBSTONE_RETENTION_MS:40});
      const r=record();await shortStore.create(r);const reserved=state.reserveRefresh(r,"owner",Date.now(),5000,0);assert.equal(await shortStore.compareAndSwap(r,reserved),true);
      const dispatched=state.markRefreshDispatched(reserved,"owner",reserved.refresh.fence,Date.now());assert.equal(await shortStore.compareAndSwap(reserved,dispatched),true);
      await pool.query("UPDATE schoolerp_bff.sessions SET record=jsonb_set(record,'{refresh,leaseExpiresAt}','0') WHERE session_id_hash=$1",[r.key]);const invalid=await shortStore.get(r.context,r.key);assert.equal(invalid.status,"INVALID");
      await new Promise(r=>setTimeout(r,60));await shortStore.deleteTombstone(r.context,r.key,Date.now());assert.equal(await shortStore.get(r.context,r.key),null);
      assert.equal(await shortStore.compareAndSwap(r,{...r,version:1}),false);
    });
  }finally{await pool.end();}
});
