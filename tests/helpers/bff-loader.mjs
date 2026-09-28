import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
const cache = new Map();
export function load(file) {
  const filename = join(process.cwd(), "src/server/bff", `${file}.ts`);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} };
  cache.set(filename,mod);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(output.outputText, {
    module: mod, exports: mod.exports, Buffer, Headers, URL, Request, Response, setTimeout, clearTimeout, console,
    require: name => name === "server-only" ? {} : name.startsWith(".") ? load(join(dirname(file), name)) : require(name),
  }, { filename });
  return mod.exports;
}
export const configModule = load("config");
export function environment(overrides = {}) {
  return { NODE_ENV: "production", BFF_ENVIRONMENT: "production", BFF_COOKIE_MODE: "https",
    BFF_WEB_ORIGIN: "https://schoolerp.com", BFF_SPRING_ORIGIN: "https://spring.invalid",
    BFF_DATABASE_URL: "postgresql://runtime@database.invalid/bff", BFF_DATABASE_CA_PEM: "test-only-ca",
    BFF_KMS_KEY_VERSION: "projects/test-only/locations/asia-south1/keyRings/test/cryptoKeys/test/cryptoKeyVersions/1",
    // Unit-test binding only; never written to a deployment template or used for IAM.
    BFF_SERVICE_AUTH_MODE: "cloud-run", BFF_CLOUD_RUN_AUDIENCE: "urn:schoolerp:unit-test",
    ...Object.fromEntries(Object.entries(configModule.LOCAL_LIMITS).map(([k,v])=>[k,String(v)])), ...overrides };
}
export const configuration = () => configModule.loadBffConfig(environment());
export const testIdentity = { mode: "local-test", async credential(audience) { return { token: "deterministic-service-credential", audience, expiresAt: Date.now()+300000 }; } };
export const platformIdentity = { accountId: "10000000-0000-4000-8000-000000000001", sessionId: "20000000-0000-4000-8000-000000000002", authenticationAssurance:"PASSWORD", roles:["PLATFORM_ADMIN"], permissions:["platform.tenant.read"] };
