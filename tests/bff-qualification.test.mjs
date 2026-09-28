import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { load, configuration, environment, configModule } from './helpers/bff-loader.mjs';
const {CloudKmsKeyWrapper,sealCredentials,openCredentials}=load('credential-envelope');
const {createSessionPool}=load('postgres-session-store');
const keyId=configuration().kmsKey;
const binding={environment:'test',context:'PLATFORM',sessionKey:'a'.repeat(64),credentialVersion:0};
const credentials={accessToken:'qualification-access-secret',refreshToken:'qualification-refresh-secret'};
function sdk() {
 const kek=randomBytes(32);return {
 async encrypt(q,options){assert.equal(options.retry,null);assert.ok(options.timeout>0);const nonce=randomBytes(12),c=createCipheriv('aes-256-gcm',kek,nonce);c.setAAD(q.additionalAuthenticatedData);return [{name:q.name,ciphertext:Buffer.concat([nonce,c.update(q.plaintext),c.final(),c.getAuthTag()])}];},
 async decrypt(q,options){assert.equal(options.retry,null);assert.equal(q.name,keyId.replace(/\/cryptoKeyVersions\/[^/]+$/,''));const v=q.ciphertext,d=createDecipheriv('aes-256-gcm',kek,v.subarray(0,12));d.setAAD(q.additionalAuthenticatedData);d.setAuthTag(v.subarray(-16));return [{plaintext:Buffer.concat([d.update(v.subarray(12,-16)),d.final()])}];}
 };
}
test('KMS SDK boundary: pinned version, AES roundtrip, AAD and ciphertext tampering',async()=>{
 const events=[],wrapper=new CloudKmsKeyWrapper(keyId,100,sdk(),e=>events.push(e));const envelope=await sealCredentials(wrapper,binding,credentials);
 assert.deepEqual(JSON.parse(JSON.stringify(await openCredentials(wrapper,binding,envelope))),credentials);
 assert.ok(!JSON.stringify(envelope).includes('qualification-'));
 for(const field of ['wrappedKey','nonce','ciphertext','tag']){const bytes=Buffer.from(envelope[field],'base64');bytes[0]^=1;await assert.rejects(openCredentials(wrapper,binding,{...envelope,[field]:bytes.toString('base64')}));}
 for(const override of [{environment:'other'},{context:'TENANT'},{sessionKey:'b'.repeat(64)},{credentialVersion:1}])await assert.rejects(openCredentials(wrapper,{...binding,...override},envelope));
 await assert.rejects(openCredentials(wrapper,binding,{...envelope,keyId:keyId.replace(/1$/,'2')}));
 await assert.rejects(openCredentials(new CloudKmsKeyWrapper(keyId,100,sdk()),binding,envelope));
 assert.ok(events.length>0);for(const e of events)assert.deepEqual(Object.keys(e).sort(),['boundary','latencyMs','operation','outcome']);assert.ok(!JSON.stringify(events).includes('secret'));
});
for(const category of ['unavailable','permission-denied','timeout','wrong-version','invalid-ciphertext'])test(`KMS ${category} fails closed at SDK boundary`,async()=>{
 const good=sdk(),envelope=await sealCredentials(new CloudKmsKeyWrapper(keyId,100,good),binding,credentials);
 const failure=async()=>{if(category==='timeout')return new Promise(()=>{});throw new Error('private credential '+category);};
 const bad={encrypt:failure,decrypt:failure};if(category==='wrong-version')bad.encrypt=async()=>[{name:'unapproved-version',ciphertext:randomBytes(48)}];if(category==='invalid-ciphertext')bad.decrypt=async()=>[{plaintext:Buffer.alloc(3)}];
 const wrapper=new CloudKmsKeyWrapper(keyId,30,bad);const start=Date.now();
 await assert.rejects(sealCredentials(wrapper,binding,credentials),e=>e.message==='Credential encryption unavailable');
 await assert.rejects(openCredentials(wrapper,binding,envelope),e=>e.message==='Credential encryption unavailable');assert.ok(Date.now()-start<1500);
});
test('pool limits required, bounded, overridable and driver-applied; frozen lifetime values preserved',async()=>{
 for(const override of [{SESSION_STORE_POOL_MAX:undefined},{SESSION_STORE_POOL_MAX:'101'},{SESSION_STORE_POOL_IDLE_MS:'0'},{SESSION_STORE_POOL_LIFETIME_MS:'3600001'},{KMS_OPERATION_TIMEOUT_MS:'10001'}])assert.throws(()=>configModule.loadBffConfig(environment(override)));
 const c=configModule.loadBffConfig(environment({SESSION_STORE_POOL_MAX:'3',SESSION_STORE_POOL_IDLE_MS:'9000',SESSION_STORE_POOL_LIFETIME_MS:'60000'}));const pool=createSessionPool(c);
 try {assert.equal(pool.options.max,3);assert.equal(pool.options.idleTimeoutMillis,9000);assert.equal(pool.options.maxLifetimeSeconds,60);assert.equal(pool.options.connectionTimeoutMillis,2000);assert.equal(pool.options.query_timeout,1000);assert.equal(pool.options.ssl.rejectUnauthorized,true);}finally{await pool.end();}
 assert.equal(c.limits.PREAUTH_TTL_MS,600000);assert.equal(c.limits.MEMBERSHIP_SELECTION_TTL_MS,300000);
 assert.equal(configModule.sessionDeadlines(c,'PLATFORM',0).absoluteExpiresAt,43200000);assert.equal(configModule.sessionDeadlines(c,'TENANT',0).idleExpiresAt,28800000);
});
