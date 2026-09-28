// Invoked only by the isolated Spring Testcontainers fixture. No credentials are
// accepted in CLI arguments or written to disk/output. No production IAM claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {load,configuration,testIdentity} from './bff-loader.mjs';
import {testDatabaseUrl} from './qualification-fixtures.mjs';
import {testWrapper} from './pending-fixtures.mjs';
const {SpringClient}=load('spring-client'),{createSessionPool}=load('postgres-session-store'),{PostgresPendingAuthStore}=load('postgres-pending-auth-store'),{PendingAuthService}=load('pending-auth-service');
const {openSelectionCredential}=load('credential-envelope'),{selectionBinding,projectChoices}=load('pending-auth');
let pool,phase='configuration';
try {
 const origin=process.env.BFF_LOCAL_SPRING_ORIGIN,parsed=new URL(origin);assert.ok(parsed.protocol==='http:'&&parsed.hostname==='127.0.0.1');
 const config={...configuration(),environment:'development',springOrigin:origin,serviceAuth:{mode:'local-test'},databaseUrl:testDatabaseUrl()};
 assert.ok(process.env.BFF_LOCAL_TEST_PASSWORD);
 const admin=new pg.Pool({connectionString:config.databaseUrl,query_timeout:10000});try{await admin.query('DROP SCHEMA IF EXISTS schoolerp_bff CASCADE');for(const f of ['001-session-store.sql','002-pending-auth.sql'])await admin.query(readFileSync(`deploy/bff/${f}`,'utf8'));}finally{await admin.end();}
 pool=createSessionPool(config);const wrapper=testWrapper(),store=new PostgresPendingAuthStore(pool,config.limits),service=new PendingAuthService(store,config,wrapper),spring=new SpringClient(config,testIdentity);
 const input={loginId:'beta.teacher@example.test',password:process.env.BFF_LOCAL_TEST_PASSWORD};
 const login=async()=>{const ref=await service.bootstrap('TENANT');const selection=await service.beginMembershipLogin(ref.id,ref.proof,input,spring);return {ref,selection};};
 phase='login-selection-expiry-projection';const x=await login(),y=await login();assert.equal(x.selection.memberships.length,2);assert.equal(new Set(x.selection.memberships.map(m=>m.tenantId)).size,2);assert.ok(x.selection.expiresAt>Date.now()&&x.selection.expiresAt<=Date.now()+300000);assert.equal('accountId' in x.selection,false);const safe=JSON.stringify(projectChoices(x.selection,Date.now()));assert.equal(safe.includes('selectionToken'),false);
 phase='transaction-substitution';await assert.rejects(openSelectionCredential(wrapper,selectionBinding(config.environment,x.selection),y.selection.envelope));await assert.rejects(openSelectionCredential(wrapper,selectionBinding(config.environment,y.selection),x.selection.envelope));
 phase='spring-ownership';const raw=await openSelectionCredential(wrapper,selectionBinding(config.environment,x.selection),x.selection.envelope);const wrong=await spring.call('TENANT','select-membership',{browserHeaders:new Headers(),body:{selectionToken:raw,membershipId:process.env.BFF_LOCAL_TEST_MEMBERSHIP_B}});assert.equal(wrong.status,401);assert.equal(wrong.body.code,'AUTHENTICATION_FAILED');
 phase='isolated-single-membership-account';const other=await spring.call('TENANT','login',{browserHeaders:new Headers(),body:{loginId:'m2b-isolated@example.test',password:process.env.BFF_LOCAL_TEST_PASSWORD}});assert.equal(other.status,200);assert.equal('selectionToken' in other.body,false);const otherMe=await spring.call('TENANT','session',{browserHeaders:new Headers(),credential:{context:'TENANT',accessToken:other.body.accessToken}});assert.equal(otherMe.status,200);assert.equal(otherMe.body.accountId,process.env.BFF_LOCAL_TEST_ACCOUNT_B);
 phase='selection-me-fresh-handoff';const prepared=await service.consumeSelection(x.ref.id,x.ref.proof,{membershipId:x.selection.memberships[0].membershipId},spring);assert.equal(prepared.record.identity.accountId,process.env.BFF_LOCAL_TEST_ACCOUNT_A);assert.notEqual(prepared.id,x.ref.id);
 phase='consumed-replay';await assert.rejects(service.consumeSelection(x.ref.id,x.ref.proof,{membershipId:x.selection.memberships[0].membershipId},spring));const replay=await spring.call('TENANT','select-membership',{browserHeaders:new Headers(),body:{selectionToken:raw,membershipId:x.selection.memberships[0].membershipId}});assert.equal(replay.status,401);
 phase='no-local-auth-activation';assert.equal(Number((await pool.query('SELECT count(*) FROM schoolerp_bff.sessions')).rows[0].count),0);
 console.log('PASS: real local Spring login, selection, expiry bounds, ownership, /me, replay, BFF binding and encrypted handoff; no browser authentication activated.');
} catch { console.error(`FAIL: local Spring qualification phase ${phase}`);process.exitCode=1; }
finally {await pool?.end();}
