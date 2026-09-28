import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { load, configuration, environment, configModule, testIdentity, platformIdentity } from "./helpers/bff-loader.mjs";
const { SpringClient }=load("spring-client");
const contract=load("upstream-contract");
const boundary=load("browser-boundary");
const policy=load("security-policy");
const service=load("service-identity");
const {BffError}=load("errors");
const request=(body={refreshToken:"test-refresh"})=>({browserHeaders:new Headers(),body});
const tokens={accessToken:"test-user-access",refreshToken:"test-user-refresh",tokenType:"Bearer",expiresIn:300,roles:["PLATFORM_ADMIN"]};
async function fixture(handler,run,{provider=testIdentity,limits={}}={}) {
  const server=createServer(handler);await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const base=configuration();const config={...base,environment:"development",serviceAuth:{mode:"local-test"},springOrigin:`http://127.0.0.1:${server.address().port}`,limits:{...base.limits,...limits}};
  try{await run(new SpringClient(config,provider),config);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}
const json=(response,value,status=200,extra={})=>{response.writeHead(status,{"Content-Type":"application/json",...extra});response.end(JSON.stringify(value));};

test("production requires mode and audience; test mode cannot downgrade production or use remote hosts",()=>{
  for(const override of [{BFF_SERVICE_AUTH_MODE:undefined},{BFF_CLOUD_RUN_AUDIENCE:undefined},{BFF_CLOUD_RUN_AUDIENCE:""},{BFF_CLOUD_RUN_AUDIENCE:"bad\nvalue"},{BFF_SERVICE_AUTH_MODE:"local-test"}]) assert.throws(()=>configModule.loadBffConfig(environment(override)));
  assert.throws(()=>configModule.loadBffConfig(environment({NODE_ENV:"test",BFF_ENVIRONMENT:"development",BFF_SERVICE_AUTH_MODE:"local-test"})));
  const local=configModule.loadBffConfig(environment({NODE_ENV:"test",BFF_ENVIRONMENT:"development",BFF_SERVICE_AUTH_MODE:"local-test",BFF_SPRING_ORIGIN:"http://127.0.0.1:3001"}));
  assert.equal(local.serviceAuth.mode,"local-test");assert.throws(()=>new SpringClient(local));
  const template=readFileSync("deploy/bff/runtime.env.template","utf8");assert.match(template,/^BFF_SPRING_ORIGIN=\r?$/m);assert.match(template,/^BFF_CLOUD_RUN_AUDIENCE=\r?$/m);
});

test("service identity is separate from end-user JWT and request ID is generated/propagated safely",async()=>{
  let seen;
  await fixture((q,r)=>{seen=q.headers;assert.equal(q.url,"/api/platform/auth/me");assert.equal(q.method,"GET");json(r,{...platformIdentity,accessToken:"never-project",envelope:{secret:1}},200,{"X-Request-ID":"upstream-untrusted"});},async client=>{
    const result=await client.call("PLATFORM","session",{browserHeaders:new Headers({"X-Request-ID":"browser-untrusted",Cookie:"forged",Referer:"forged","X-Forwarded-For":"forged","X-Forwarded-Host":"forged","X-Forwarded-Proto":"forged","X-HTTP-Method-Override":"DELETE"}),credential:{context:"PLATFORM",accessToken:"end-user-jwt"}});
    assert.equal(seen.authorization,"Bearer end-user-jwt");assert.equal(seen["x-serverless-authorization"],"Bearer deterministic-service-credential");
    assert.equal(seen["x-request-id"],result.requestId);assert.equal(boundary.safeRequestId(result.requestId),result.requestId);assert.equal(result.headers["X-Request-ID"],result.requestId);
    for(const key of ["cookie","referer","x-forwarded-for","x-forwarded-host","x-forwarded-proto","x-http-method-override"])assert.equal(seen[key],undefined);
    const response=boundary.browserSessionResponse("PLATFORM",result.body,Date.now()+60000,result.requestId);const text=await response.text();
    for(const secret of ["end-user-jwt","deterministic-service-credential","never-project","envelope","sessionId","authenticationAssurance"])assert.ok(!text.includes(secret));
    assert.equal(response.headers.get("x-request-id"),result.requestId);assert.equal(response.headers.get("set-cookie"),null);
    const second=await client.call("PLATFORM","session",{browserHeaders:new Headers(),credential:{context:"PLATFORM",accessToken:"end-user-jwt"}});assert.notEqual(second.requestId,result.requestId);
  });
});

for(const [name,credential] of [
  ["missing",()=>null],["expired",audience=>({token:"test",audience,expiresAt:Date.now()-1})],
  ["wrong audience",()=>({token:"test",audience:"wrong-test-binding",expiresAt:Date.now()+300000})],
  ["header injection",audience=>({token:"test\r\nAuthorization: evil",audience,expiresAt:Date.now()+300000})],
])test(`service authentication rejects ${name} without an upstream send`,async()=>{
  await fixture(()=>assert.fail("must not dispatch"),async client=>{await assert.rejects(client.call("PLATFORM","refresh",request()),e=>e.code==="BFF_UPSTREAM_UNAVAILABLE");},{provider:{mode:"local-test",credential:async a=>credential(a)}});
});
test("credential provider failure and deadline are sanitized; late provider cannot dispatch",async()=>{
  for(const provider of [{mode:"local-test",credential:async()=>{throw new Error("private-service-secret");}},{mode:"local-test",credential:async a=>{await new Promise(r=>setTimeout(r,60));return testIdentity.credential(a);}}]) {
    await fixture(()=>assert.fail("late send"),async client=>{await assert.rejects(client.call("PLATFORM","refresh",request()),e=>!e.message.includes("private-service-secret"));await new Promise(r=>setTimeout(r,80));},{provider,limits:{BFF_UPSTREAM_CONNECT_TIMEOUT_MS:20}});
  }
});
test("Google-issued token structure checks audience, issuer, algorithm and expiry without claiming signature verification",()=>{
  const encode=x=>Buffer.from(JSON.stringify(x)).toString("base64url");const audience="urn:schoolerp:unit-test";
  const claims={iss:"https://accounts.google.com",aud:audience,sub:"unit-test-subject",exp:Math.floor(Date.now()/1000)+300};
  const jwt=(c=claims,h={alg:"RS256"})=>`${encode(h)}.${encode(c)}.${encode("not-a-signature")}`;
  assert.equal(service.inspectGoogleIdToken(jwt(),audience).audience,audience);
  for(const c of [{...claims,exp:1},{...claims,aud:"wrong"},{...claims,iss:"wrong"}])assert.throws(()=>service.inspectGoogleIdToken(jwt(c),audience));
  assert.throws(()=>service.inspectGoogleIdToken(jwt(claims,{alg:"none"}),audience));
  assert.throws(()=>service.inspectGoogleIdToken("not-a-jwt",audience));
});

test("browser cannot inject service/user/context authority or destination/method override",async()=>{
  await fixture(()=>assert.fail("must not dispatch"),async client=>{
    for(const name of ["Authorization","X-Serverless-Authorization","X-Service-Token","X-Tenant-ID","X-Membership-ID","X-Platform-Role","X-Permissions","Host"])await assert.rejects(client.call("PLATFORM","refresh",{...request(),browserHeaders:new Headers({[name]:"forged"})}));
    for(const key of ["url","host","scheme","port","method","path"])await assert.rejects(client.call("PLATFORM","refresh",{...request(),[key]:"forged"}));
  });
});
test("valid request DTO is accepted, invalid shape/extra authority/content type/size rejected",async()=>{
  let sends=0;
  await fixture((q,r)=>{sends++;let body="";q.on("data",c=>body+=c);q.on("end",()=>{assert.deepEqual(JSON.parse(body),{email:"admin@localhost",password:"a-password-long-enough"});json(r,tokens);});},async client=>{
    const valid={email:"admin@localhost",password:"a-password-long-enough"};await client.call("PLATFORM","login",request(valid));
    for(const bad of [null,[],{}, {...valid,password:"short"},{...valid,email:"invalid"},{...valid,tenantId:"forged"},{...valid,password:"x".repeat(201)},{...valid,page:-1},{...valid,role:"INVALID"}])await assert.rejects(client.call("PLATFORM","login",request(bad)));
    await assert.rejects(client.call("PLATFORM","login",{...request(valid),browserHeaders:new Headers({"Content-Type":"text/plain"})}));assert.equal(sends,1);
  });
  await fixture(()=>assert.fail("oversized request sent"),async client=>{await assert.rejects(client.call("PLATFORM","refresh",request()),e=>e.status===413);},{limits:{AUTH_REQUEST_MAX_BYTES:10}});
});

for(const [name,value,status,type] of [
  ["malformed DTO",{accountId:1},200,"application/json"],
  ["wrong context",{...platformIdentity,tenantId:randomUUID()},200,"application/json"],
  ["wrong success status",platformIdentity,201,"application/json"],
  ["unexpected content type",platformIdentity,200,"text/html"],
  ["problem document as success",platformIdentity,200,"application/problem+json"],
])test(`successful response rejects ${name}`,async()=>{
  await fixture((_q,r)=>{r.writeHead(status,{"Content-Type":type});r.end(JSON.stringify(value));},async client=>{await assert.rejects(client.call("PLATFORM","session",{browserHeaders:new Headers(),credential:{context:"PLATFORM",accessToken:"user"}}));});
});
test("validated token response strips unknown fields and never has a browser-token projector",async()=>{
  assert.throws(()=>contract.validateTokenResponse("PLATFORM",{...tokens,tokenType:"Basic"}));
  assert.throws(()=>contract.validateIdentity("PLATFORM",{...platformIdentity,accountId:"malformed-uuid"}));
  await fixture((_q,r)=>json(r,{...tokens,debug:"secret",internalHost:"secret",serviceCredential:"secret"}),async client=>{
    const result=await client.call("PLATFORM","refresh",request());assert.equal(result.body.refreshToken,tokens.refreshToken);assert.equal(result.body.debug,undefined);
    assert.throws(()=>boundary.browserSessionResponse("PLATFORM",result.body,Date.now()+60000,result.requestId));
  });
});
test("tenant existing DTO validation stays context-specific without adding tenant flows",()=>{
  const tenant={accountId:randomUUID(),tenantId:randomUUID(),membershipId:randomUUID(),roles:["TEACHER"],permissions:[]};
  assert.equal(contract.validateIdentity("TENANT",tenant).tenantId,tenant.tenantId);
  assert.throws(()=>contract.validateIdentity("PLATFORM",tenant));assert.throws(()=>contract.validateIdentity("TENANT",platformIdentity));
  const tenantToken={accessToken:"tenant",refreshToken:"refresh",tokenType:"Bearer",expiresInSeconds:600,roles:[],tenantId:tenant.tenantId,membershipId:tenant.membershipId};
  assert.equal(contract.validateTokenResponse("TENANT",tenantToken).expiresInSeconds,600);assert.throws(()=>contract.validateTokenResponse("PLATFORM",tenantToken));
});

test("test-scoped browser mutation → trusted session → IAM fixture → safe identity projection",async()=>{
  const proof=policy.randomOpaqueId();let sends=0;
  await fixture((_q,r)=>{sends++;json(r,{...platformIdentity,refreshToken:"upstream-secret",stack:"internal"});},async(client,config)=>{
    // Test-only handler, deliberately outside src/app. No production auth route.
    const handler=async req=>{
      try{await boundary.readBrowserMutation(req,config,proof);const result=await client.call("PLATFORM","session",{browserHeaders:req.headers,credential:{context:"PLATFORM",accessToken:"fixture-server-held-user"}});return boundary.browserSessionResponse("PLATFORM",result.body,Date.now()+60000,result.requestId);}catch(e){return boundary.browserFailureResponse(e);}
    };
    const headers={Origin:config.origin,"Content-Type":"application/json","X-SchoolERP-CSRF":proof,"Sec-Fetch-Site":"same-origin"};
    const make=h=>new Request(`${config.origin}/test-only`,{method:"POST",headers:h,body:"{}"});
    const response=await handler(make(headers));assert.equal(response.status,200);const body=await response.text();assert.ok(!body.includes("upstream-secret"));assert.ok(!body.includes("fixture-server-held-user"));
    for(const bad of [{...headers,Origin:"null"},{...headers,"X-SchoolERP-CSRF":"invalid"},{...headers,"Sec-Fetch-Site":"cross-site"}])assert.equal((await handler(make(bad))).status,403);
    assert.equal(sends,1);
  });
});
test("bounded browser body rejects size, malformed JSON, unsupported content type and slow stream",async()=>{
  const config=configuration(),proof=policy.randomOpaqueId();const headers={Origin:config.origin,"Content-Type":"application/json","X-SchoolERP-CSRF":proof};
  const make=(body,h=headers)=>new Request(config.origin,{method:"POST",headers:h,body});
  await assert.rejects(boundary.readBrowserMutation(make("{"),config,proof),e=>e.status===400);
  await assert.rejects(boundary.readBrowserMutation(make("{}",{...headers,"Content-Type":"text/plain"}),config,proof),e=>e.status===403);
  await assert.rejects(boundary.readBrowserMutation(make('"'+'x'.repeat(100)+'"'),{...config,limits:{...config.limits,AUTH_REQUEST_MAX_BYTES:20}},proof),e=>e.status===413);
  const stream=new ReadableStream({start(){}});const req=new Request(config.origin,{method:"POST",headers,body:stream,duplex:"half"});
  await assert.rejects(boundary.readBrowserMutation(req,{...config,limits:{...config.limits,BFF_UPSTREAM_RESPONSE_TIMEOUT_MS:25}},proof),e=>e.status===408);
});
test("TLS connect timeout is distinct from response deadline",async()=>{
  const sockets=new Set();const server=createTcpServer(s=>{sockets.add(s);s.on("error",()=>{});s.on("close",()=>sockets.delete(s));});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const base=configuration();const client=new SpringClient({...base,environment:"development",serviceAuth:{mode:"local-test"},springOrigin:`https://127.0.0.1:${server.address().port}`,limits:{...base.limits,BFF_UPSTREAM_CONNECT_TIMEOUT_MS:35,BFF_UPSTREAM_RESPONSE_TIMEOUT_MS:2000}},testIdentity);
  try{const start=Date.now();await assert.rejects(client.call("PLATFORM","refresh",request()),e=>e.status===504);assert.ok(Date.now()-start<1500);}finally{for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));}
});
test("safe errors and correlation never reflect raw exceptions; server modules have no credential logging",async()=>{
  const result=boundary.browserFailureResponse(new Error("password secret SQL internal-host stack"));assert.equal(result.status,500);const text=await result.text();for(const s of ["password","secret","SQL","internal-host","stack"])assert.ok(!text.includes(s));
  const known=boundary.browserFailureResponse(new BffError("BFF_UPSTREAM_UNAVAILABLE",502,randomUUID()));assert.equal(known.status,502);
  for(const value of ["forged", "x".repeat(300),"a\r\nb"])assert.throws(()=>boundary.safeRequestId(value));
  for(const file of readdirSync("src/server/bff").filter(f=>f.endsWith(".ts"))) {const src=readFileSync(`src/server/bff/${file}`,"utf8");assert.match(src,/import "server-only"/);assert.doesNotMatch(src,/console\.(log|error|warn|info|debug)\(/);}
});
