import test from 'node:test';
import assert from 'node:assert/strict';
import {fork,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
import {load,configuration} from './helpers/bff-loader.mjs';
import {testDatabaseUrl} from './helpers/qualification-fixtures.mjs';
import {testWrapper,selectionResponse,springSuccess,choice} from './helpers/pending-fixtures.mjs';
const {createSessionPool}=load('postgres-session-store'),{PostgresPendingAuthStore}=load('postgres-pending-auth-store'),{PendingAuthService}=load('pending-auth-service'),p=load('pending-auth');
const config={...configuration(),environment:'development',databaseUrl:testDatabaseUrl()},kek=randomBytes(32);
function worker(){
 const child=fork('tests/helpers/pending-worker.mjs',[],{env:{...process.env,BFF_TEST_KEK:kek.toString('base64')},stdio:['ignore','ignore','pipe','ipc']});let seq=0;const pending=new Map();
 const ready=new Promise((resolve,reject)=>{child.once('error',reject);child.on('message',m=>{if(m.ready){resolve();return;}const q=pending.get(m.id);if(q){clearTimeout(q.timer);pending.delete(m.id);if(m.error){q.reject(new Error(m.error));}else{q.resolve(m.result);}}});});
 child.on('exit',()=>{for(const q of pending.values()){clearTimeout(q.timer);q.reject(new Error('Worker exited'));}pending.clear();});
 const call=(op,data={})=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{child.kill();reject(new Error('Worker deadline'));},20000);pending.set(id,{resolve,reject,timer});child.send({seq:id,op,...data});});
 return {child,ready,call,async close(){if(child.connected)await call('close');}};
}
test('pending authentication: real PostgreSQL and independent processes',{timeout:240000},async t=>{
 const pool=createSessionPool(config),events=[],store=new PostgresPendingAuthStore(pool,config.limits,e=>events.push(e)),wrapper=testWrapper(kek),service=new PendingAuthService(store,config,wrapper);let a,b;
 const pending=async()=>{const ref=await service.bootstrap('TENANT'),pre=await service.beginLogin('TENANT',ref.id,ref.proof),response=selectionResponse(),selection=await service.publishSelection(pre,response);return {ref,pre,response,selection};};
 try{
 const admin=new pg.Pool({connectionString:config.databaseUrl,query_timeout:10000});try{await admin.query('DROP SCHEMA IF EXISTS schoolerp_bff CASCADE');for(const f of ['001-session-store.sql','002-pending-auth.sql'])await admin.query(readFileSync(`deploy/bff/${f}`,'utf8'));await admin.query('CREATE TABLE schoolerp_bff.pending_dispatch(key text)');}finally{await admin.end();}
 a=worker();b=worker();await Promise.all([a.ready,b.ready]);assert.notEqual(a.child.pid,b.child.pid);
 for(const selection of [false,true])for(const n of [2,10,50])await t.test(`${selection?'selection':'pre-auth'} ${n} contenders across two processes`,async()=>{
 const ref=await a.call('create',{selection}),results=await Promise.all([a.call('consume',{...ref,selection,count:n/2}),b.call('consume',{...ref,selection,count:n/2})]);assert.equal(results.reduce((s,r)=>s+r.accepted,0),1);assert.equal(results.reduce((s,r)=>s+r.rejected,0),n-1);
 const pre=await store.get('PRE_AUTH','TENANT',ref.key),final=selection?await store.get('SELECTION','TENANT',pre.selectionKey):pre;assert.equal(final.status,'CONSUMED');assert.equal(final.version,2);assert.equal(final.envelope??null,null);
 const dispatches=Number((await pool.query('SELECT count(*) FROM schoolerp_bff.pending_dispatch WHERE key=$1',[ref.key])).rows[0].count);assert.equal(dispatches,selection?1:0);assert.equal((await b.call('consume',{...ref,selection,count:1})).accepted,0);
 t.diagnostic(JSON.stringify({kind:selection?'SELECTION':'PRE_AUTH',contenders:n,accepted:1,rejected:n-1,version:final.version,generation:selection?final.credentialVersion:null,dispatches}));
 });
 await t.test('both record categories survive process restart and preserve cross-process visibility',async()=>{
 const pre=await a.call('create'),sel=await a.call('create',{selection:true});const before=await b.call('get',{kind:'PRE_AUTH',key:sel.key});await a.close();a=worker();await a.ready;
 assert.equal((await a.call('get',{kind:'PRE_AUTH',key:pre.key})).status,'ACTIVE');assert.equal((await a.call('get',{kind:'SELECTION',key:before.selectionKey})).status,'PENDING');assert.equal((await b.call('consume',{...sel,selection:true,count:1})).accepted,1);
 });
 await t.test('multi-tab reuse does not rotate proof, ID or lifetime; consuming state cannot be replaced',async()=>{
 const ref=await service.bootstrap('TENANT');const tabs=await Promise.all([service.bootstrap('TENANT',ref.id),service.bootstrap('TENANT',ref.id)]);for(const tab of tabs){assert.equal(tab.id,ref.id);assert.equal(tab.proof,ref.proof);assert.equal(tab.record.expiresAt,ref.record.expiresAt);}
 await service.beginLogin('TENANT',ref.id,ref.proof);await assert.rejects(service.bootstrap('TENANT',ref.id));
 const x=await pending(),tab=await service.bootstrap('TENANT',x.ref.id);assert.equal(tab.id,x.ref.id);assert.equal(tab.proof,x.ref.proof);assert.equal((await store.get('SELECTION','TENANT',x.selection.key)).expiresAt,x.selection.expiresAt);await store.reserve('SELECTION','TENANT',x.selection.key,0,x.ref.proof,'a'.repeat(64));await assert.rejects(service.bootstrap('TENANT',x.ref.id));
 });
 await t.test('stale version, revoked state, context and CSRF reject without authority',async()=>{
 const ref=await service.bootstrap('TENANT');assert.equal(await store.reserve('PRE_AUTH','TENANT',ref.record.key,1,ref.proof,'a'.repeat(64)),null);assert.equal(await store.reserve('PRE_AUTH','PLATFORM',ref.record.key,0,ref.proof,'a'.repeat(64)),null);assert.equal(await store.reserve('PRE_AUTH','TENANT',ref.record.key,0,p.newPreAuthReference('TENANT').proof,'a'.repeat(64)),null);
 assert.equal(await store.revoke('PRE_AUTH','TENANT',ref.record.key,0),true);await assert.rejects(service.beginLogin('TENANT',ref.id,ref.proof));
 const {ref:r,selection}=await pending();assert.equal(await store.revoke('SELECTION','TENANT',selection.key,0),true);await assert.rejects(service.consumeSelection(r.id,r.proof,{membershipId:choice.membershipId},springSuccess()));
 });
 await t.test('expiry is enforced on primary before cleanup and ciphertext is removed',async()=>{
 for(const kind of ['PRE_AUTH','SELECTION']){const ref=kind==='PRE_AUTH'?await service.bootstrap('TENANT'):await pending();const key=kind==='PRE_AUTH'?ref.record.key:ref.selection.key,name=kind==='PRE_AUTH'?'pre_auth':'membership_selection';
 await pool.query(`UPDATE schoolerp_bff.${name} SET record=record || jsonb_build_object('createdAt',1,'expiresAt',2) WHERE key=$1`,[key]);const r=await store.get(kind,'TENANT',key);assert.equal(r.status,'EXPIRED');assert.equal(await store.reserve(kind,'TENANT',key,r.version,(ref.ref??ref).proof,'a'.repeat(64)),null);assert.equal(r.envelope??null,null);}
 });
 await t.test('encrypted credentials cannot be transplanted A to B or B to A; no plaintext persistence',async()=>{
 const x=await pending(),y=await pending();const raw=JSON.stringify((await pool.query('SELECT record FROM schoolerp_bff.membership_selection')).rows);for(const ref of [x,y])assert.equal(raw.includes(ref.response.selectionToken),false);
 await pool.query("UPDATE schoolerp_bff.membership_selection SET record=jsonb_set(record,'{envelope}',$2::jsonb) WHERE key=$1",[x.selection.key,JSON.stringify(y.selection.envelope)]);await pool.query("UPDATE schoolerp_bff.membership_selection SET record=jsonb_set(record,'{envelope}',$2::jsonb) WHERE key=$1",[y.selection.key,JSON.stringify(x.selection.envelope)]);
 let sends=0;for(const ref of [x,y]){await assert.rejects(service.consumeSelection(ref.ref.id,ref.ref.proof,{membershipId:choice.membershipId},springSuccess(()=>sends++)));assert.equal((await store.get('SELECTION','TENANT',ref.selection.key)).status,'REVOKED');}assert.equal(sends,0);
 });
 await t.test('successful selection verifies /me and prepares a fresh encrypted session without activating it',async()=>{
 const x=await pending();let sends=0;const prepared=await service.consumeSelection(x.ref.id,x.ref.proof,{membershipId:choice.membershipId},springSuccess(()=>sends++));assert.equal(sends,1);assert.notEqual(prepared.id,x.ref.id);assert.notEqual(prepared.record.key,x.ref.record.key);assert.equal(prepared.record.identity.accountId,'30000000-0000-4000-8000-000000000001');assert.equal(Number((await pool.query('SELECT count(*) FROM schoolerp_bff.sessions')).rows[0].count),0);await assert.rejects(service.consumeSelection(x.ref.id,x.ref.proof,{membershipId:choice.membershipId},springSuccess(()=>sends++)));assert.equal(sends,1);
 });
 await t.test('upstream errors, malformed success, lost response and /me mismatch all terminate without retry',async()=>{
 const cases=[400,401,403,409,429,500,'timeout','connection','malformed','wrong-me'];
 for(const failure of cases){const x=await pending();let sends=0;const good=springSuccess();const spring={async call(context,op,input){if(op==='select-membership'){sends++;if(typeof failure==='number')return {status:failure,body:{secret:'private'}};if(['timeout','connection'].includes(failure))throw new Error('private');if(failure==='malformed')return {status:200,body:{accessToken:'private'}};}const r=await good.call(context,op,input);if(op==='session'&&failure==='wrong-me')r.body.tenantId='20000000-0000-4000-8000-000000000002';return r;}};
 await assert.rejects(service.consumeSelection(x.ref.id,x.ref.proof,{membershipId:choice.membershipId},spring),e=>e.code==='BFF_SESSION_REQUIRED'&&!e.message.includes('private'));await assert.rejects(service.consumeSelection(x.ref.id,x.ref.proof,{membershipId:choice.membershipId},spring));assert.equal(sends,1);assert.equal((await store.get('SELECTION','TENANT',x.selection.key)).status,'REVOKED');}
 });
 await t.test('KMS failure before publish or before dispatch fails closed',async()=>{
 const bad={keyId:'ephemeral-test-only',async wrap(){throw new Error('private KMS');},async unwrap(){throw new Error('private KMS');}},failing=new PendingAuthService(store,config,bad);
 const ref=await service.bootstrap('TENANT'),pre=await service.beginLogin('TENANT',ref.id,ref.proof);await assert.rejects(failing.publishSelection(pre,selectionResponse()));assert.equal((await store.get('PRE_AUTH','TENANT',ref.record.key)).status,'REVOKED');
 const x=await pending();let sends=0;await assert.rejects(failing.consumeSelection(x.ref.id,x.ref.proof,{membershipId:choice.membershipId},springSuccess(()=>sends++)));assert.equal(sends,0);
 });
 await t.test('transaction interruption rolls back selection insert and pre-auth completion together',async()=>{
 const ref=await service.bootstrap('TENANT'),pre=await service.beginLogin('TENANT',ref.id,ref.proof);await pool.query("CREATE FUNCTION schoolerp_bff.fail_pending() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION USING ERRCODE = ''40001'', MESSAGE = ''private failure''; END'; CREATE TRIGGER fail_pending BEFORE UPDATE ON schoolerp_bff.pre_auth FOR EACH ROW EXECUTE FUNCTION schoolerp_bff.fail_pending()");
 try{await assert.rejects(service.publishSelection(pre,selectionResponse()));}finally{await pool.query('DROP TRIGGER fail_pending ON schoolerp_bff.pre_auth; DROP FUNCTION schoolerp_bff.fail_pending()');}
 assert.equal(Number((await pool.query('SELECT count(*) FROM schoolerp_bff.membership_selection WHERE pre_auth_key=$1',[ref.record.key])).rows[0].count),0);assert.equal((await store.get('PRE_AUTH','TENANT',ref.record.key)).status,'CONSUMING');
 });
 await t.test('pending store pool exhaustion is bounded and recovers without creating state',async()=>{
 const limited=createSessionPool({...config,limits:{...config.limits,SESSION_STORE_POOL_MAX:1,SESSION_STORE_CONNECT_TIMEOUT_MS:100}}),held=await limited.connect(),s=new PostgresPendingAuthStore(limited,config.limits);try{const start=Date.now();await assert.rejects(s.get('PRE_AUTH','TENANT','a'.repeat(64)),e=>e.code==='BFF_SESSION_STORE_UNAVAILABLE');assert.ok(Date.now()-start<1500);}finally{held.release();}assert.equal(await s.get('PRE_AUTH','TENANT','a'.repeat(64)),null);await limited.end();
 });
 await t.test('invalidation during selection and uncertain completion cannot resurrect or replay',async()=>{
 for(const failure of ['revoke','store']){const x=await pending();let sends=0;const good=springSuccess(),spring={async call(context,op,input){if(op==='select-membership'){sends++;const current=await store.get('SELECTION','TENANT',x.selection.key);if(failure==='revoke')await store.revoke('SELECTION','TENANT',current.key,current.version);else await pool.query("CREATE FUNCTION schoolerp_bff.fail_finish() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION USING ERRCODE = ''40001''; END'; CREATE TRIGGER fail_finish BEFORE UPDATE ON schoolerp_bff.membership_selection FOR EACH ROW EXECUTE FUNCTION schoolerp_bff.fail_finish()");}return good.call(context,op,input);}};
 try{await assert.rejects(service.consumeSelection(x.ref.id,x.ref.proof,{membershipId:choice.membershipId},spring));}finally{if(failure==='store')await pool.query('DROP TRIGGER fail_finish ON schoolerp_bff.membership_selection; DROP FUNCTION schoolerp_bff.fail_finish()');}
 assert.equal((await store.get('SELECTION','TENANT',x.selection.key)).status,failure==='store'?'CONSUMING':'REVOKED');await assert.rejects(service.consumeSelection(x.ref.id,x.ref.proof,{membershipId:choice.membershipId},spring));assert.equal(sends,1);
 }
 });
 await t.test('expired cleanup is bounded hygiene; stale completion and duplicated publish cannot revive records',async()=>{
 const x=await pending();assert.equal(await store.publishSelection(x.pre,x.selection),false);const r=await store.reserve('SELECTION','TENANT',x.selection.key,0,x.ref.proof,'a'.repeat(64));assert.ok(r);assert.equal(await store.finish({...r,version:0},'CONSUMED'),false);assert.equal(await store.finish(r,'CONSUMED'),true);assert.equal(await store.finish(r,'CONSUMED'),false);
 const ref=await service.bootstrap('TENANT');await pool.query("UPDATE schoolerp_bff.pre_auth SET record=record||jsonb_build_object('createdAt',1,'expiresAt',2) WHERE key=$1",[ref.record.key]);await store.cleanup();assert.equal((await store.get('PRE_AUTH','TENANT',ref.record.key)).status,'EXPIRED');await pool.query("UPDATE schoolerp_bff.pre_auth SET record=jsonb_set(record,'{tombstoneExpiresAt}','1') WHERE key=$1",[ref.record.key]);await store.cleanup();assert.equal(await store.get('PRE_AUTH','TENANT',ref.record.key),null);
 });
 await t.test('pending connection refusal and handshake timeout fail closed within pool budget',async()=>{
 const sockets=new Set(),server=createServer(s=>{sockets.add(s);s.on('error',()=>{});});await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 for(const refused of [false,true]){if(refused){for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));}const limited=createSessionPool({...config,databaseUrl:`postgresql://postgres@127.0.0.1:${port}/bff_contract_tests`,limits:{...config.limits,SESSION_STORE_CONNECT_TIMEOUT_MS:100}});try{const start=Date.now();await assert.rejects(new PostgresPendingAuthStore(limited,config.limits).get('PRE_AUTH','TENANT','a'.repeat(64)),e=>e.code==='BFF_SESSION_STORE_UNAVAILABLE');assert.ok(Date.now()-start<1500);}finally{await limited.end();}}
 });
 await t.test('pending lock timeout and transaction termination leave original version usable',async()=>{
 const ref=await service.bootstrap('TENANT'),held=await pool.connect();await held.query('BEGIN');await held.query('SELECT record FROM schoolerp_bff.pre_auth WHERE key=$1 FOR UPDATE',[ref.record.key]);try{await assert.rejects(service.beginLogin('TENANT',ref.id,ref.proof));}finally{await held.query('ROLLBACK');held.release();}
 assert.equal((await store.get('PRE_AUTH','TENANT',ref.record.key)).version,0);
 const c=await pool.connect();c.on('error',()=>{});await c.query('BEGIN');const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;await c.query("UPDATE schoolerp_bff.pre_auth SET record=jsonb_set(record,'{version}','99') WHERE key=$1",[ref.record.key]);await pool.query('SELECT pg_terminate_backend($1)',[pid]);c.release(true);assert.equal((await store.get('PRE_AUTH','TENANT',ref.record.key)).version,0);
 });
 await t.test('pending deadlock victim rolls back with no partial consumption',async()=>{
 const x=await service.bootstrap('TENANT'),y=await service.bootstrap('TENANT'),c=await pool.connect(),d=await pool.connect();try{for(const q of [c,d]){await q.query('BEGIN');await q.query("SET LOCAL deadlock_timeout='50ms'; SET LOCAL statement_timeout='1500ms'");}await c.query('SELECT record FROM schoolerp_bff.pre_auth WHERE key=$1 FOR UPDATE',[x.record.key]);await d.query('SELECT record FROM schoolerp_bff.pre_auth WHERE key=$1 FOR UPDATE',[y.record.key]);const lock=async(q,key)=>{try{await q.query('SELECT record FROM schoolerp_bff.pre_auth WHERE key=$1 FOR UPDATE',[key]);await q.query('ROLLBACK');return 'success';}catch(e){await q.query('ROLLBACK');return e.code;}};const results=await Promise.all([lock(c,y.record.key),lock(d,x.record.key)]);assert.ok(results.includes('40P01'));assert.ok(results.includes('success'));}finally{c.release();d.release();}assert.equal((await store.get('PRE_AUTH','TENANT',x.record.key)).status,'ACTIVE');
 });
 await t.test('database restart retains pre-auth, selection and consumption fences across processes',async()=>{
 const execute=promisify(execFile);assert.equal(new URL(config.databaseUrl).port,'55439');const info=JSON.parse((await execute('docker',['inspect','schoolerp-bff-contract-tests'])).stdout)[0];assert.equal(info.Config.Image,'postgres:17');assert.ok(info.Config.Env.includes('POSTGRES_DB=bff_contract_tests'));assert.equal(info.HostConfig.PortBindings['5432/tcp'][0].HostIp,'127.0.0.1');
 const pre=await a.call('create'),sel=await a.call('create',{selection:true}),selected=(await store.get('PRE_AUTH','TENANT',sel.key)).selectionKey;
 await execute('docker',['restart','--timeout','60','schoolerp-bff-contract-tests'],{timeout:90000});let row;const deadline=Date.now()+30000;while(Date.now()<deadline){try{row=await store.get('PRE_AUTH','TENANT',pre.key);break;}catch{await new Promise(r=>setTimeout(r,250));}}assert.equal(row?.status,'ACTIVE');assert.equal((await b.call('get',{kind:'SELECTION',key:selected})).status,'PENDING');assert.equal((await a.call('consume',{...sel,selection:true,count:1})).accepted,1);
 });
 for(const e of events)assert.deepEqual(Object.keys(e).sort(),['boundary','latencyMs','operation','outcome']);
 }finally{await Promise.allSettled([a?.close(),b?.close()]);a?.child.kill();b?.child.kill();await pool.end();}
});
