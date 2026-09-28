// Separate Node process with its own pool, module cache and coordinator.
import {load,configuration} from './bff-loader.mjs';
import {record,replacement,testDatabaseUrl} from './qualification-fixtures.mjs';
const {PostgresSessionStore,createSessionPool}=load('postgres-session-store');
const {RefreshCoordinator}=load('refresh-coordinator');const state=load('session-transitions');
const config={...configuration(),environment:'development',databaseUrl:testDatabaseUrl()};
const pool=createSessionPool(config),store=new PostgresSessionStore(pool,config.limits);
let snapshot;
const summary=r=>r?{status:r.status,version:r.version,generation:r.credentialVersion}:null;
process.on('message',async m=>{
 try {
 let result;
 if(m.op==='create'){const r=record(m.context);await store.create(r);result={key:r.key,...summary(r)};}
 else if(m.op==='get')result=summary(await store.get(m.context,m.key));
 else if(m.op==='snapshot'){snapshot=await store.get(m.context,m.key);result=summary(snapshot);}
 else if(m.op==='stale')result=await store.compareAndSwap(snapshot,{...snapshot,version:snapshot.version+1});
 else if(m.op==='touch'){const r=await store.get(m.context,m.key);result=await store.compareAndSwap(r,{...r,version:r.version+1});}
 else if(m.op==='logout'||m.op==='invalidate'){const r=await store.get(m.context,m.key);const next=m.op==='logout'?state.beginLogout(r):{...r,version:r.version+1,status:'INVALID',credentials:null,refresh:null};result=await store.compareAndSwap(r,next);if(m.op==='logout'&&result)result=await store.compareAndSwap(next,state.finishLogout(next));}
 else if(m.op==='refresh'){
 const outcomes=await Promise.allSettled(Array.from({length:m.count},()=>new RefreshCoordinator(store,config).refresh(m.context,m.key,m.generation??0,async r=>{
 // Append-only audit: deliberately no unique constraint hiding duplicate dispatch.
 await pool.query('INSERT INTO schoolerp_bff.qualification_dispatch(key,generation) VALUES($1,$2)',[r.key,r.credentialVersion]);
 if(m.hold){process.send({event:'dispatched',id:m.id});await new Promise(resolve=>{const release=x=>{if(x.release===m.id){process.off('message',release);resolve();}};process.on('message',release);});}
 return replacement();
 })));
 result={accepted:outcomes.filter(x=>x.status==='fulfilled').length,rejected:outcomes.filter(x=>x.status==='rejected').length,errors:outcomes.filter(x=>x.status==='rejected').map(x=>x.reason.code??'UNAVAILABLE')};
 }
 else if(m.op==='close'){await pool.end();process.send({id:m.id,result:true});process.disconnect();return;}
 else if(m.release)return;
 else throw new Error('Unknown operation');
 process.send({id:m.id,result});
 }catch(e){process.send({id:m.id,error:e.code??'UNAVAILABLE'});}
});
await pool.query('SELECT 1');process.send({ready:true});
