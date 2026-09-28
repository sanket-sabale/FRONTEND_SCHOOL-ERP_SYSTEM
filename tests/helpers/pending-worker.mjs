import {load,configuration} from './bff-loader.mjs';
import {testDatabaseUrl} from './qualification-fixtures.mjs';
import {testWrapper,selectionResponse,springSuccess,choice} from './pending-fixtures.mjs';
const {createSessionPool}=load('postgres-session-store'),{PostgresPendingAuthStore}=load('postgres-pending-auth-store'),{PendingAuthService}=load('pending-auth-service');
const config={...configuration(),environment:'development',databaseUrl:testDatabaseUrl()},pool=createSessionPool(config),store=new PostgresPendingAuthStore(pool,config.limits),service=new PendingAuthService(store,config,testWrapper(Buffer.from(process.env.BFF_TEST_KEK,'base64')));
process.on('message',async m=>{
 try{
 let result;
 if(m.op==='create'){const r=await service.bootstrap(m.context??'TENANT');if(m.selection){const pre=await service.beginLogin('TENANT',r.id,r.proof);await service.publishSelection(pre,selectionResponse());}result={id:r.id,proof:r.proof,key:r.record.key};}
 else if(m.op==='get'){const r=await store.get(m.kind,m.context??'TENANT',m.key);result=r?{status:r.status,version:r.version,selectionKey:r.selectionKey}:null;}
 else if(m.op==='consume'){
 const outcomes=await Promise.allSettled(Array.from({length:m.count},async()=>{
 if(m.selection){const spring=springSuccess();const broker={async call(context,operation,input){if(operation==='select-membership')await pool.query('INSERT INTO schoolerp_bff.pending_dispatch(key) VALUES($1)',[m.key]);return spring.call(context,operation,input);}};await service.consumeSelection(m.id,m.proof,{membershipId:choice.membershipId},broker);}
 else {const r=await service.beginLogin('TENANT',m.id,m.proof);if(!await store.finish(r,'CONSUMED'))throw new Error();}
 }));result={accepted:outcomes.filter(r=>r.status==='fulfilled').length,rejected:outcomes.filter(r=>r.status==='rejected').length};
 }else if(m.op==='close'){await pool.end();process.send({id:m.seq,result:true});process.disconnect();return;}
 else throw new Error();
 process.send({id:m.seq,result});
 }catch{process.send({id:m.seq,error:'UNAVAILABLE'});}
});
await pool.query('SELECT 1');process.send({ready:true});
