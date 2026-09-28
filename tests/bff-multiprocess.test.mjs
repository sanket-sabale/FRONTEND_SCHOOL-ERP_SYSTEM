import assert from 'node:assert/strict';
import test from 'node:test';
import {fork,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:net';
import pg from 'pg';
import {load,configuration} from './helpers/bff-loader.mjs';
import {record,replacement,testDatabaseUrl} from './helpers/qualification-fixtures.mjs';
const {PostgresSessionStore,createSessionPool}=load('postgres-session-store');
const {RefreshCoordinator}=load('refresh-coordinator');const state=load('session-transitions');
const url=testDatabaseUrl(),config={...configuration(),environment:'development',databaseUrl:url};
const execute=promisify(execFile);
function worker(){
 const child=fork('tests/helpers/bff-process-worker.mjs',[],{stdio:['ignore','ignore','pipe','ipc']});let seq=0;const pending=new Map(),events=new Map();
 const ready=new Promise((resolve,reject)=>{child.once('error',reject);child.on('message',m=>{if(m.ready)resolve();if(m.event){events.get(m.id)?.();return;}const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);if(m.error){p.reject(new Error(m.error));}else{p.resolve(m.result);}}});});
 child.on('exit',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Worker exited'));}pending.clear();});
 const send=(op,data={})=>{const id=++seq;let signal;const dispatched=new Promise(r=>signal=r);events.set(id,signal);const result=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);child.kill();reject(new Error('Worker deadline'));},20000);pending.set(id,{resolve,reject,timer});child.send({id,op,...data});});return {result,dispatched,release:()=>child.send({release:id})};};
 return {child,ready,send,call:async(op,data)=>send(op,data).result,close:async()=>{if(child.connected)await send('close').result;}};
}
test('PostgreSQL qualification: independent processes, failure and recovery',{timeout:240000},async t=>{
 const pool=createSessionPool(config),events=[],store=new PostgresSessionStore(pool,config.limits,e=>events.push(e));let a,b;
 try {
 const migration=new pg.Pool({connectionString:url,connectionTimeoutMillis:2000,query_timeout:10000});try{await migration.query('DROP SCHEMA IF EXISTS schoolerp_bff CASCADE');await migration.query(readFileSync('deploy/bff/001-session-store.sql','utf8'));await migration.query('CREATE TABLE schoolerp_bff.qualification_dispatch(key text,generation bigint)');}finally{await migration.end();}
 a=worker();b=worker();await Promise.all([a.ready,b.ready]);assert.notEqual(a.child.pid,b.child.pid);
 for(const n of [2,10,50])await t.test(`${n} refresh contenders across two Node processes`,async()=>{
 const r=await a.call('create',{context:'PLATFORM'}),args={context:'PLATFORM',key:r.key};
 const results=await Promise.all([a.call('refresh',{...args,count:n/2}),b.call('refresh',{...args,count:n/2})]);
 const row=await store.get('PLATFORM',r.key),count=Number((await pool.query('SELECT count(*) FROM schoolerp_bff.qualification_dispatch WHERE key=$1',[r.key])).rows[0].count);
 assert.equal(count,1);assert.equal(row.credentialVersion,1);assert.equal(row.version,3);assert.equal(row.status,'ACTIVE');
 const before=count;await b.call('refresh',{...args,count:1,generation:0});assert.equal(Number((await pool.query('SELECT count(*) FROM schoolerp_bff.qualification_dispatch WHERE key=$1',[r.key])).rows[0].count),before);
 t.diagnostic(JSON.stringify({contenders:n,dispatches:count,replacements:row.credentialVersion,version:row.version,generation:row.credentialVersion,acceptedObservers:results.reduce((s,r)=>s+r.accepted,0),rejectedRequests:results.reduce((s,r)=>s+r.rejected,0),staleReplacementAuthorities:n-1}));
 });
 await t.test('visibility, stale CAS, process restart and logout propagation',async()=>{
 const r=await a.call('create',{context:'TENANT'}),args={context:'TENANT',key:r.key};assert.equal((await b.call('get',args)).version,0);await b.call('snapshot',args);assert.equal(await a.call('touch',args),true);assert.equal(await b.call('stale',args),false);
 await a.close();a=worker();await a.ready;assert.equal((await a.call('get',args)).version,1);assert.equal(await a.call('logout',args),true);assert.equal((await b.call('get',args)).status,'DELETED');assert.equal(await b.call('stale',args),false);const outcome=await b.call('refresh',{...args,count:1});assert.equal(outcome.rejected,1);
 assert.equal(await b.call('get',{...args,context:'PLATFORM'}),null);
 });
 for(const action of ['logout','invalidate'])await t.test(`refresh versus ${action} across processes`,async()=>{
 const r=await a.call('create',{context:'PLATFORM'}),args={context:'PLATFORM',key:r.key},run=a.send('refresh',{...args,count:1,hold:true});await run.dispatched;assert.equal(await b.call(action,args),true);run.release();assert.equal((await run.result).rejected,1);const final=await store.get('PLATFORM',r.key);assert.equal(final.credentialVersion,0);assert.equal(final.envelope,null);assert.ok(['DELETED','INVALID'].includes(final.status));
 t.diagnostic(JSON.stringify({race:action,contenders:2,dispatches:1,replacements:0,rejectedRefresh:1,version:final.version,generation:final.credentialVersion}));
 });
 await t.test('tenant identity mutation and stale completion cannot change authority',async()=>{
 const future=record();future.lastAccessedAt=Date.now()+120000;assert.equal(await store.create(future),false);
 const malformed=record();await assert.rejects(store.create({...malformed,credentials:{context:'PLATFORM',envelopeId:{secret:'must-not-persist'}}}));
 const r=record('TENANT');await store.create(r);assert.equal(await store.compareAndSwap(r,{...r,version:1,identity:{...r.identity,tenantId:'other'}}),false);
 const reserved=state.reserveRefresh(r,'owner',Date.now(),30000,0);assert.equal(await store.compareAndSwap(r,reserved),true);const dispatched=state.markRefreshDispatched(reserved,'owner',reserved.refresh.fence,Date.now());assert.equal(await store.compareAndSwap(reserved,dispatched),true);assert.equal(await store.compareAndSwap(reserved,dispatched),false);
 const x=replacement(),done={...state.completeRefresh(dispatched,'owner',reserved.refresh.fence,{context:r.context,envelopeId:x.envelopeId},Date.now()),envelope:x.envelope,accessExpiresAt:x.accessExpiresAt};assert.equal(await store.compareAndSwap(dispatched,done),true);assert.equal(await store.compareAndSwap(dispatched,done),false);assert.equal(await store.compareAndSwap(r,state.beginLogout(r)),false);
 });
 await t.test('pool exhaustion is bounded, sanitized and recovers',async()=>{
 const small=createSessionPool({...config,limits:{...config.limits,SESSION_STORE_POOL_MAX:1,SESSION_STORE_CONNECT_TIMEOUT_MS:100}});const held=await small.connect();const s=new PostgresSessionStore(small,config.limits,e=>events.push(e));
 try{const start=Date.now();await assert.rejects(s.get('PLATFORM','a'.repeat(64)),e=>e.code==='BFF_SESSION_STORE_UNAVAILABLE');assert.ok(Date.now()-start<1500);}finally{held.release();}assert.equal(await s.get('PLATFORM','a'.repeat(64)),null);await small.end();
 });
 await t.test('connection refused and stalled PostgreSQL handshake are bounded',async()=>{
 const sockets=new Set(),server=createServer(s=>{sockets.add(s);s.on('error',()=>{});});await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const make=()=>createSessionPool({...config,databaseUrl:`postgresql://postgres@127.0.0.1:${port}/bff_contract_tests`,limits:{...config.limits,SESSION_STORE_CONNECT_TIMEOUT_MS:100}});
 for(const refused of [false,true]){if(refused){for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));}const p=make();try{const start=Date.now();await assert.rejects(new PostgresSessionStore(p,config.limits).get('PLATFORM','a'.repeat(64)),e=>e.code==='BFF_SESSION_STORE_UNAVAILABLE');assert.ok(Date.now()-start<1500);}finally{await p.end();}}
 });
 await t.test('backend termination rolls back a mutation and adapter recovers',async()=>{
 const r=record();await store.create(r);const client=await pool.connect();await client.query('BEGIN');const pid=(await client.query('SELECT pg_backend_pid() pid')).rows[0].pid;client.on('error',()=>{});await client.query("UPDATE schoolerp_bff.sessions SET record=jsonb_set(record,'{version}','99') WHERE session_id_hash=$1",[r.key]);await pool.query('SELECT pg_terminate_backend($1)',[pid]);client.release(true);assert.equal((await store.get(r.context,r.key)).version,0);
 });
 await t.test('serialization failure is sanitized without retry or partial write',async()=>{
 const r=record();await store.create(r);await pool.query("CREATE FUNCTION schoolerp_bff.inject_serialization() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION USING ERRCODE = ''40001'', MESSAGE = ''private injected failure''; END'; CREATE TRIGGER injected BEFORE UPDATE ON schoolerp_bff.sessions FOR EACH ROW EXECUTE FUNCTION schoolerp_bff.inject_serialization()");
 try{await assert.rejects(store.compareAndSwap(r,{...r,version:1}),e=>e.code==='BFF_SESSION_STORE_UNAVAILABLE'&&!e.message.includes('private'));}finally{await pool.query('DROP TRIGGER injected ON schoolerp_bff.sessions; DROP FUNCTION schoolerp_bff.inject_serialization()');}assert.equal((await store.get(r.context,r.key)).version,0);
 });
 await t.test('terminated refresh owner leaves durable dispatch and cannot be replayed',async()=>{
 const r=await a.call('create',{context:'PLATFORM'}),args={context:'PLATFORM',key:r.key},run=a.send('refresh',{...args,count:1,hold:true});const rejected=assert.rejects(run.result);await run.dispatched;a.child.kill();await rejected;a=worker();await a.ready;
 const row=await store.get('PLATFORM',r.key);assert.equal(row.refresh.phase,'DISPATCHED');
 const limited={...config,limits:{...config.limits,REFRESH_WAITER_TIMEOUT_MS:100}};let sends=0;await assert.rejects(new RefreshCoordinator(store,limited).refresh('PLATFORM',r.key,0,async()=>{sends++;return replacement();}));assert.equal(sends,0);
 await pool.query("UPDATE schoolerp_bff.sessions SET record=jsonb_set(record,'{refresh,leaseExpiresAt}','0') WHERE session_id_hash=$1",[r.key]);assert.equal((await b.call('get',args)).status,'INVALID');assert.equal((await a.call('refresh',{...args,count:1})).rejected,1);
 assert.equal(Number((await pool.query('SELECT count(*) FROM schoolerp_bff.qualification_dispatch WHERE key=$1',[r.key])).rows[0].count),1);
 });
 await t.test('real encrypted credentials persist without plaintext and bind to session/generation',async()=>{
 const {sealCredentials,openCredentials}=load('credential-envelope');const {randomBytes,createCipheriv,createDecipheriv}=await import('node:crypto');const kek=randomBytes(32);
 const wrapper={keyId:'ephemeral-test-key',async wrap(key,aad){const n=randomBytes(12),c=createCipheriv('aes-256-gcm',kek,n);c.setAAD(aad);return Buffer.concat([n,c.update(key),c.final(),c.getAuthTag()]);},async unwrap(id,v,aad){assert.equal(id,this.keyId);const d=createDecipheriv('aes-256-gcm',kek,v.subarray(0,12));d.setAAD(aad);d.setAuthTag(v.subarray(-16));return Buffer.concat([d.update(v.subarray(12,-16)),d.final()]);}};
 const r=record(),binding={environment:'test',context:r.context,sessionKey:r.key,credentialVersion:0};r.envelope=await sealCredentials(wrapper,binding,{accessToken:'persist-access-sensitive',refreshToken:'persist-refresh-sensitive'});await store.create(r);
 const raw=JSON.stringify((await pool.query('SELECT record FROM schoolerp_bff.sessions WHERE session_id_hash=$1',[r.key])).rows);assert.ok(!raw.includes('persist-access-sensitive'));assert.ok(!raw.includes('persist-refresh-sensitive'));
 const saved=await store.get(r.context,r.key);assert.equal((await openCredentials(wrapper,binding,saved.envelope)).accessToken,'persist-access-sensitive');await assert.rejects(openCredentials(wrapper,{...binding,credentialVersion:1},saved.envelope));await assert.rejects(openCredentials(wrapper,{...binding,sessionKey:'b'.repeat(64)},saved.envelope));
 });
 await t.test('real PostgreSQL deadlock victim rolls back and both connections recover',async()=>{
 const x=record(),y=record();await store.create(x);await store.create(y);const c=await pool.connect(),d=await pool.connect();
 try{for(const q of [c,d]){await q.query('BEGIN');await q.query("SET LOCAL deadlock_timeout='50ms'; SET LOCAL statement_timeout='1500ms'");}
 await c.query('SELECT record FROM schoolerp_bff.sessions WHERE session_id_hash=$1 FOR UPDATE',[x.key]);await d.query('SELECT record FROM schoolerp_bff.sessions WHERE session_id_hash=$1 FOR UPDATE',[y.key]);
 const lock=async(q,key)=>{try{await q.query('SELECT record FROM schoolerp_bff.sessions WHERE session_id_hash=$1 FOR UPDATE',[key]);await q.query('ROLLBACK');return 'success';}catch(e){await q.query('ROLLBACK');return e.code;}};
 const outcomes=await Promise.all([lock(c,y.key),lock(d,x.key)]);assert.ok(outcomes.includes('40P01'));assert.ok(outcomes.includes('success'));
 }finally{c.release();d.release();}assert.equal((await store.get(x.context,x.key)).version,0);assert.equal((await store.get(y.context,y.key)).version,0);
 });
 await t.test('database restart preserves committed generation and process visibility',async()=>{
 // Fixed disposable container only; never an environment-selected production target.
 assert.equal(new URL(url).port,'55439');const info=JSON.parse((await execute('docker',['inspect','schoolerp-bff-contract-tests'])).stdout)[0];assert.equal(info.Config.Image,'postgres:17');assert.ok(info.Config.Env.includes('POSTGRES_DB=bff_contract_tests'));assert.equal(info.HostConfig.PortBindings['5432/tcp'][0].HostIp,'127.0.0.1');
 const r=await a.call('create',{context:'PLATFORM'});await a.call('refresh',{context:'PLATFORM',key:r.key,count:1});await execute('docker',['restart','--time','60','schoolerp-bff-contract-tests'],{timeout:90000});
 let current,lastCategory;const deadline=Date.now()+30000;while(Date.now()<deadline){try{current=await store.get('PLATFORM',r.key);break;}catch(e){lastCategory=e.code??'UNAVAILABLE';await new Promise(r=>setTimeout(r,250));}}assert.ok(current,`Recovery deadline: ${lastCategory}`);assert.equal(current.credentialVersion,1);assert.equal((await b.call('get',{context:'PLATFORM',key:r.key})).generation,1);
 });
 assert.ok(events.some(e=>e.outcome==='unavailable'));for(const e of events)assert.deepEqual(Object.keys(e).sort(),['boundary','latencyMs','operation','outcome']);
 }finally{await Promise.allSettled([a?.close(),b?.close()]);a?.child.kill();b?.child.kill();await pool.end();}
});
