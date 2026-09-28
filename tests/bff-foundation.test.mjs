import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { load, configModule, environment, configuration, testIdentity, platformIdentity } from "./helpers/bff-loader.mjs";
const { SpringClient } = load("spring-client");
const { sealCredentials, openCredentials } = load("credential-envelope");
const { createRefreshBroker } = load("refresh-broker");

for (const [name, overrides] of [
  ["missing origin", { BFF_WEB_ORIGIN: undefined }], ["HTTP origin", { BFF_WEB_ORIGIN: "http://schoolerp.com" }],
  ["overflowing timer", { BFF_UPSTREAM_RESPONSE_TIMEOUT_MS: "2592000000" }],
  ["local cookie mode", { BFF_COOKIE_MODE: "local-http" }], ["invalid timeout", { REFRESH_LEASE_MS: "0" }],
  ["missing encryption", { BFF_KMS_KEY_VERSION: undefined }], ["missing database", { BFF_DATABASE_URL: undefined }],
  ["missing upstream", { BFF_SPRING_ORIGIN: undefined }], ["missing operational value", { CLOCK_SKEW_MS: undefined }],
  ["production development mode", { BFF_ENVIRONMENT: "development" }], ["URL TLS bypass", { BFF_DATABASE_URL: "postgres://db/bff?sslmode=disable" }],
]) test(`configuration rejects ${name}`, () => assert.throws(() => configModule.loadBffConfig(environment(overrides))));
test("lifetime policies preserve absolute deadline across activity and do not use access expiry", () => {
  const c = configuration();
  assert.equal(configModule.sessionDeadlines(c, "PLATFORM", 0).idleExpiresAt, 1800000);
  assert.equal(configModule.sessionDeadlines(c, "PLATFORM", 0, 43200000).absoluteExpiresAt, 43200000);
  assert.equal(configModule.sessionDeadlines(c, "TENANT", 0).absoluteExpiresAt, 2592000000);
  assert.ok(!JSON.stringify(configModule.observableConfig(c)).includes("postgres"));
});

// Test-only KEK. Production exports only the Cloud KMS implementation.
const kek = randomBytes(32);
const wrapper = {
  keyId: "test-key-v1",
  async wrap(key, aad) { const nonce=randomBytes(12); const c=createCipheriv("aes-256-gcm",kek,nonce); c.setAAD(aad); return Buffer.concat([nonce,c.update(key),c.final(),c.getAuthTag()]); },
  async unwrap(id, value, aad) { assert.equal(id,this.keyId); const d=createDecipheriv("aes-256-gcm",kek,value.subarray(0,12));d.setAAD(aad);d.setAuthTag(value.subarray(-16));return Buffer.concat([d.update(value.subarray(12,-16)),d.final()]); },
};
test("AEAD binds environment, context, session and credential version and rejects tampering/key loss", async () => {
  const binding={environment:"test",context:"PLATFORM",sessionKey:"a".repeat(64),credentialVersion:0};
  const envelope=await sealCredentials(wrapper,binding,{accessToken:"access-secret",refreshToken:"refresh-secret"});
  assert.ok(!JSON.stringify(envelope).includes("secret"));
  assert.equal((await openCredentials(wrapper,binding,envelope)).refreshToken,"refresh-secret");
  for(const override of [{environment:"production"},{context:"TENANT"},{sessionKey:"b".repeat(64)},{credentialVersion:1}]) await assert.rejects(openCredentials(wrapper,{...binding,...override},envelope));
  await assert.rejects(openCredentials(wrapper,binding,{...envelope,tag:randomBytes(16).toString("base64")}));
  await assert.rejects(openCredentials(wrapper,binding,{...envelope,keyId:"missing-key"}));
});

test("refresh broker validates Spring token DTO and identity before re-encrypting", async()=>{
  const config=configuration(); const r={key:"c".repeat(64),context:"PLATFORM",credentialVersion:0,identity:{accountId:"account",sessionId:"session"}};
  const binding={environment:config.environment,context:r.context,sessionKey:r.key,credentialVersion:0};
  r.envelope=await sealCredentials(wrapper,binding,{accessToken:"old-access",refreshToken:"old-refresh"});
  let sends=0;
  const client={call:async(context,op,input)=>{assert.equal(context,"PLATFORM");if(op==="refresh"){sends++;assert.equal(input.body.refreshToken,"old-refresh");return {status:200,body:{accessToken:"new-access",refreshToken:"new-refresh",tokenType:"Bearer",expiresIn:300}};}return {status:200,body:{accountId:"account",sessionId:"session"}};}};
  const result=await createRefreshBroker(config,wrapper,client)(r);assert.equal(sends,1);
  assert.equal((await openCredentials(wrapper,{...binding,credentialVersion:1},result.envelope)).refreshToken,"new-refresh");
  for(const response of [{status:429,body:{}},{status:500,body:{}},{status:200,body:{accessToken:"x",refreshToken:"x",tokenType:"Bearer",expiresInSeconds:300}}]) {
    let attempts=0;await assert.rejects(createRefreshBroker(config,wrapper,{call:async()=>{attempts++;return response;}})(r));assert.equal(attempts,1);
  }
  await assert.rejects(createRefreshBroker(config,wrapper,{call:async(c,op,input)=>op==="session"?{status:200,body:{accountId:"other",sessionId:"session"}}:client.call(c,op,input)})(r));
});

async function withServer(handler, run, limits={}) {
  const server=createServer(handler); await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const config=configuration(); const client=new SpringClient({...config,environment:"development",serviceAuth:{mode:"local-test"},springOrigin:`http://127.0.0.1:${server.address().port}`,limits:{...config.limits,...limits}},testIdentity);
  try { await run(client); } finally { server.closeAllConnections();await new Promise(resolve=>server.close(resolve)); }
}
test("fixed context/path/method and fresh headers; unsafe response headers stripped", async () => {
  await withServer((req,res)=>{
    assert.equal(req.url,"/api/platform/auth/me"); assert.equal(req.method,"GET"); assert.equal(req.headers.authorization,"Bearer server-token");
    for(const key of ["cookie","origin","x-schoolerp-csrf","x-forwarded-for","x-tenant-id"]) assert.equal(req.headers[key],undefined);
    res.writeHead(200,{"Content-Type":"application/json","Set-Cookie":"bad=1",Location:"https://evil.invalid","X-Internal":"secret"});res.end(JSON.stringify(platformIdentity));
  },async client=>{
    const result=await client.call("PLATFORM","session",{browserHeaders:new Headers({Cookie:"session=secret",Origin:"https://schoolerp.com","X-SchoolERP-CSRF":"proof","X-Forwarded-For":"forged"}),credential:{context:"PLATFORM",accessToken:"server-token"}});
    assert.equal(result.headers["Cache-Control"],"private, no-store");assert.equal(Object.keys(result.headers).length,4);
  });
});
test("arbitrary URL, host, method, browser authority and cross-context credentials rejected before send", async () => {
  await withServer(()=>assert.fail("must not send"),async client=>{
    for(const operation of ["https://evil.invalid","//evil.invalid","DELETE","../login"]) await assert.rejects(client.call("PLATFORM",operation,{browserHeaders:new Headers()}));
    for(const extra of [{url:"https://evil.invalid"},{method:"DELETE"},{host:"evil.invalid"}]) await assert.rejects(client.call("PLATFORM","login",{browserHeaders:new Headers(),...extra}));
    for(const key of ["Authorization","X-Tenant-ID","Host"]) await assert.rejects(client.call("TENANT","login",{browserHeaders:new Headers({[key]:"forged"})}));
    for(const context of ["PLATFORM","TENANT"]) await assert.rejects(client.call(context,"session",{browserHeaders:new Headers(),credential:{context:context==="PLATFORM"?"TENANT":"PLATFORM",accessToken:"token"}}));
  });
});
for(const [name,handler,limits] of [
  ["redirect",(_q,r)=>{r.writeHead(302,{Location:"http://127.0.0.1/other"});r.end();},{}],
  ["malformed JSON",(_q,r)=>{r.writeHead(200,{"Content-Type":"application/json"});r.end('{');},{}],
  ["oversized streamed response",(_q,r)=>{r.writeHead(200,{"Content-Type":"application/json"});r.end('x'.repeat(300));},{AUTH_RESPONSE_MAX_BYTES:100}],
  ["timeout",()=>{}, {BFF_UPSTREAM_RESPONSE_TIMEOUT_MS:30}],
]) test(`HTTP rejects ${name} without retry`,async()=>{let sends=0;await withServer((q,r)=>{sends++;handler(q,r);},async c=>{await assert.rejects(c.call("PLATFORM","refresh",{browserHeaders:new Headers(),body:{refreshToken:"test"}}));assert.equal(sends,1);},limits);});
test("Spring problem normalization preserves statuses/codes without reflecting internals",async()=>{
  const codes={400:"VALIDATION_ERROR",401:"INVALID_TOKEN",403:"PERMISSION_DENIED",404:"RESOURCE_NOT_FOUND",409:"CONFLICT",429:"RATE_LIMIT_EXCEEDED",500:"INTERNAL_ERROR"};
  for(const [status,code] of Object.entries(codes)) await withServer((_q,r)=>{r.writeHead(Number(status),{"Content-Type":"application/problem+json","Retry-After":"12"});r.end(JSON.stringify({status:Number(status),code,detail:"secret stack database token",message:"secret",traceId:"secret"}));},async c=>{
    const result=await c.call("PLATFORM","refresh",{browserHeaders:new Headers(),body:{refreshToken:"test"}});
    assert.equal(result.status,Number(status));assert.equal(result.body.code,code);assert.ok(!JSON.stringify(result).includes("secret"));
    assert.equal(result.headers["Retry-After"],status==="429"?"12":undefined);
  });
});
