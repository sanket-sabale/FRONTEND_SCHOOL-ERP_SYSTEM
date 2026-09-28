import test from 'node:test';
import assert from 'node:assert/strict';
import {load,configuration} from './helpers/bff-loader.mjs';
import {testWrapper,selectionResponse,choice} from './helpers/pending-fixtures.mjs';
const p=load('pending-auth'),crypto=load('credential-envelope'),contract=load('upstream-contract'),policy=load('security-policy');
const record=()=>({kind:'SELECTION',schemaVersion:1,context:'TENANT',key:'a'.repeat(64),preAuthKey:'b'.repeat(64),csrfVerifier:'c'.repeat(64),credentialVersion:0,version:0,status:'PENDING',createdAt:1000,updatedAt:1000,expiresAt:2000,backendExpiresAt:2000,memberships:[choice],owner:null,tombstoneExpiresAt:null});
test('pre-auth hash/proof domains and cookie context separation',()=>{
 const r=p.newPreAuthReference('TENANT');assert.equal(r.id.length,43);assert.notEqual(r.key,policy.sessionKey('TENANT',r.id));assert.notEqual(r.key,p.preAuthKey('PLATFORM',r.id));assert.notEqual(r.proof,p.preAuthProof('PLATFORM',r.id));assert.equal(p.proofMatches(r.csrfVerifier,r.proof),true);assert.equal(p.proofMatches(r.csrfVerifier,p.newPreAuthReference('TENANT').proof),false);
 const cookie=p.preAuthCookie('TENANT',r.id,'https',1000,601000);assert.match(cookie,/^__Host-schoolerp_tenant_session_preauth=/);for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/'])assert.ok(cookie.includes(flag));assert.ok(!cookie.includes('Domain='));assert.equal(policy.readSessionCookie(cookie,'TENANT','https'),null);
});
test('exact expiry and terminal states reject independently of cleanup',()=>{
 for(const status of ['ACTIVE','PENDING','CONSUMING']){const r={...record(),status};for(const now of [1000,1999])assert.equal(p.pendingLive(r,now),true);for(const now of [2000,2001])assert.equal(p.pendingLive(r,now),false);}
 for(const status of ['CONSUMED','REVOKED','EXPIRED','UNKNOWN'])assert.equal(p.pendingLive({...record(),status},1000),false);
});
test('selection envelope rejects every immutable binding substitution and ciphertext tamper',async()=>{
 const wrapper=testWrapper(),r=record(),binding=p.selectionBinding('test',r),secret='opaque-selection-credential';const envelope=await crypto.sealSelectionCredential(wrapper,binding,secret);assert.equal(await crypto.openSelectionCredential(wrapper,binding,envelope),secret);
 for(const patch of [{key:'d'.repeat(64)},{preAuthKey:'d'.repeat(64)},{csrfVerifier:'d'.repeat(64)},{credentialVersion:1},{expiresAt:1999},{backendExpiresAt:1999},{createdAt:999},{context:'PLATFORM'},{memberships:[{...choice,membershipId:'10000000-0000-4000-8000-000000000002'}]}])await assert.rejects(crypto.openSelectionCredential(wrapper,p.selectionBinding('test',{...r,...patch}),envelope));
 await assert.rejects(crypto.openSelectionCredential(wrapper,p.selectionBinding('other',r),envelope));
 for(const field of ['ciphertext','tag','nonce','wrappedKey']){const value=Buffer.from(envelope[field],'base64');value[0]^=1;await assert.rejects(crypto.openSelectionCredential(wrapper,binding,{...envelope,[field]:value.toString('base64')}));}
 await assert.rejects(crypto.openSelectionCredential(wrapper,binding,{...envelope,keyId:'wrong-version'}));await assert.rejects(crypto.openSelectionCredential(testWrapper(),binding,envelope));
 const other=await crypto.sealSelectionCredential(wrapper,p.selectionBinding('test',{...r,key:'d'.repeat(64)}),'other');await assert.rejects(crypto.openSelectionCredential(wrapper,binding,other));
});
test('selection contract and browser projection are bounded and discard authority/secrets',()=>{
 const input=selectionResponse(1000),valid=contract.validateSelectionResponse({...input,accountId:'unsafe',roles:['ADMIN']},1000);assert.equal('accountId' in valid,false);
 for(const patch of [{status:'AUTHENTICATED'},{selectionToken:''},{selectionToken:'a'.repeat(201)},{expiresAt:'bad'},{expiresAt:new Date(1000).toISOString()},{memberships:[]},{memberships:Array(101).fill(choice)},{memberships:[choice,choice]},{memberships:[{...choice,membershipId:'bad'}]}])assert.throws(()=>contract.validateSelectionResponse({...input,...patch},1000));
 const safe=p.projectChoices({...record(),envelope:{ciphertext:'hidden'},selectionToken:'hidden',accountId:'hidden'},1000);assert.deepEqual(Object.keys(safe).sort(),['expiresAt','memberships','status']);assert.ok(!JSON.stringify(safe).includes('hidden'));assert.throws(()=>p.projectChoices({...record(),status:'CONSUMING'},1000));
 assert.equal(contract.validateMembershipChoice({membershipId:choice.membershipId}),choice.membershipId);
 for(const field of ['accountId','tenantId','roles','permissions','selectionToken','accessToken','refreshToken'])assert.throws(()=>contract.validateMembershipChoice({membershipId:choice.membershipId,[field]:'unsafe'}));
});
test('selection remains a fixed Tenant-only server operation and existing CSRF/Origin boundary applies',()=>{
 assert.equal(policy.authRoute('TENANT','select-membership').upstreamPath,'/api/auth/select-membership');assert.throws(()=>policy.authRoute('PLATFORM','select-membership'));
 assert.throws(()=>contract.validateRequest('PLATFORM','select-membership',{selectionToken:'opaque',membershipId:choice.membershipId}));
 const ref=p.newPreAuthReference('TENANT'),headers=new Headers({'origin':configuration().origin,'content-type':'application/json','sec-fetch-site':'same-origin'});policy.verifyMutation(headers,configuration().origin,ref.proof,ref.proof);
 for(const patch of [{origin:'https://untrusted.invalid'},{'x-tenant-id':'forged'},{authorization:'Bearer forged'},{'x-serverless-authorization':'Bearer forged'},{'sec-fetch-site':'cross-site'}])assert.throws(()=>policy.verifyMutation(new Headers({...Object.fromEntries(headers),...patch}),configuration().origin,ref.proof,ref.proof));
});
test('bootstrap and selection HTTP primitives require admission, exact Origin, JSON, CSRF and bounded bodies',async()=>{
 const boundary=load('pending-browser-boundary'),config=configuration(),ref=p.newPreAuthReference('TENANT');
 const request=(body={},patch={})=>new Request(config.origin+'/api/bff/tenant/bootstrap',{method:'POST',headers:{origin:config.origin,'content-type':'application/json','x-schoolerp-bootstrap':'1','x-schoolerp-csrf':ref.proof,...patch},body:JSON.stringify(body)});
 await boundary.readPreAuthBootstrap(request(),config,async()=>true);
 await assert.rejects(boundary.readPreAuthBootstrap(request(),config,async()=>false),e=>e.status===429);
 await assert.rejects(boundary.readPreAuthBootstrap(request(),config,async()=>{throw new Error();}));
 for(const headers of [{origin:'https://other.invalid'},{'x-schoolerp-bootstrap':'0'},{'content-type':'text/plain'},{'sec-fetch-site':'cross-site'},{authorization:'Bearer forged'}])await assert.rejects(boundary.readPreAuthBootstrap(request({},headers),config,async()=>true));
 await assert.rejects(boundary.readPreAuthBootstrap(request({accountId:'forged'}),config,async()=>true));
 const body={membershipId:choice.membershipId};assert.equal((await boundary.readSelectionMutation(request(body),config,ref.proof,async()=>true)).membershipId,choice.membershipId);
 await assert.rejects(boundary.readSelectionMutation(request(body),config,p.newPreAuthReference('TENANT').proof,async()=>true));
 await assert.rejects(boundary.readSelectionMutation(request(body),config,ref.proof,async()=>false),e=>e.status===429);
 await assert.rejects(boundary.readSelectionMutation(request({membershipId:'a'.repeat(70000)}),config,ref.proof,async()=>true),e=>e.status===413);
 const response=boundary.membershipChoicesResponse(record(),1000,'10000000-0000-4000-8000-000000000001');assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('set-cookie'),null);assert.ok(!JSON.stringify(await response.json()).includes('envelope'));
});
test('selection encryption inherits bounded KMS denial, timeout, malformed and unavailable failure behavior',async()=>{
 const binding=p.selectionBinding('test',record()),keyId='projects/test/locations/test/keyRings/test/cryptoKeys/test/cryptoKeyVersions/1';
 for(const mode of ['denied','unavailable','timeout','malformed','wrong-version']){
 const client={async encrypt(){if(mode==='timeout')return new Promise(()=>{});if(['denied','unavailable'].includes(mode))throw new Error('sensitive failure');return [{ciphertext:mode==='malformed'?null:Buffer.from('bad'),name:'wrong-version'}];},async decrypt(){throw new Error('sensitive failure');}};
 const wrapper=new crypto.CloudKmsKeyWrapper(keyId,20,client);await assert.rejects(crypto.sealSelectionCredential(wrapper,binding,'opaque'),e=>e.message==='Credential encryption unavailable');
 }
 const w=testWrapper(),wrongPayload=await crypto.sealCredentials(w,binding,{accessToken:'test',refreshToken:'test'});await assert.rejects(crypto.openSelectionCredential(w,binding,wrongPayload));
});
