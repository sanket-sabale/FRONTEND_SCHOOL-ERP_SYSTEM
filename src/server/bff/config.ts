import "server-only";
import { validateWebOrigin } from "./security-policy";

// Approved values are an explicit local profile and a deployment template, never
// implicit production defaults. All values must be supplied in staging/production.
export const LOCAL_LIMITS = {
  BFF_UPSTREAM_CONNECT_TIMEOUT_MS: 2000, BFF_UPSTREAM_RESPONSE_TIMEOUT_MS: 10000,
  SESSION_STORE_CONNECT_TIMEOUT_MS: 2000, SESSION_STORE_OPERATION_TIMEOUT_MS: 1000,
  SESSION_STORE_POOL_MAX: 10, SESSION_STORE_POOL_IDLE_MS: 10000, SESSION_STORE_POOL_LIFETIME_MS: 300000,
  KMS_OPERATION_TIMEOUT_MS: 2000,
  REFRESH_LEASE_MS: 30000, REFRESH_WAITER_TIMEOUT_MS: 5000,
  TOMBSTONE_RETENTION_MS: 900000, PREAUTH_TTL_MS: 600000,
  MEMBERSHIP_SELECTION_TTL_MS: 300000, REFRESH_LEAD_MS: 60000, CLOCK_SKEW_MS: 60000,
  AUTH_REQUEST_MAX_BYTES: 65536, NORMAL_BFF_REQUEST_MAX_BYTES: 1048576,
  AUTH_RESPONSE_MAX_BYTES: 262144,
  PLATFORM_IDLE_TIMEOUT_MS: 1800000, PLATFORM_ABSOLUTE_TIMEOUT_MS: 43200000,
  TENANT_IDLE_TIMEOUT_MS: 28800000, TENANT_ABSOLUTE_TIMEOUT_MS: 2592000000,
} as const;
type Limits = { readonly [K in keyof typeof LOCAL_LIMITS]: number };
export type BffConfig = Readonly<{
  environment: "development" | "staging" | "production";
  origin: string; springOrigin: string; cookieMode: "https" | "local-http";
  databaseUrl: string; databaseCa: string | undefined; kmsKey: string;
  serviceAuth: Readonly<{ mode: "cloud-run"; audience: string } | { mode: "local-test" }>;
  limits: Limits;
}>;

export function loadBffConfig(env: NodeJS.ProcessEnv): BffConfig {
  const fail = (name: string): never => { throw new Error(`Invalid or missing BFF configuration: ${name}`); };
  const environment = env.BFF_ENVIRONMENT;
  if (environment !== "development" && environment !== "staging" && environment !== "production") return fail("BFF_ENVIRONMENT");
  if (env.NODE_ENV === "production" && environment === "development") return fail("BFF_ENVIRONMENT");
  const local = environment === "development";
  const cookieMode = env.BFF_COOKIE_MODE;
  if (cookieMode !== "https" && !(local && cookieMode === "local-http")) return fail("BFF_COOKIE_MODE");
  let origin: string;
  try { origin = validateWebOrigin(env.BFF_WEB_ORIGIN ?? "", cookieMode); } catch { return fail("BFF_WEB_ORIGIN"); }
  let spring: URL;
  let database: URL;
  try { spring = new URL(env.BFF_SPRING_ORIGIN ?? ""); } catch { return fail("BFF_SPRING_ORIGIN"); }
  if (spring.origin !== env.BFF_SPRING_ORIGIN || spring.username || spring.password
    || (spring.protocol !== "https:" && !(local && spring.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(spring.hostname)))) return fail("BFF_SPRING_ORIGIN");
  const mode = env.BFF_SERVICE_AUTH_MODE;
  let serviceAuth: BffConfig["serviceAuth"];
  if (mode === "cloud-run") {
    const audience = env.BFF_CLOUD_RUN_AUDIENCE;
    // Audience is separately supplied: traffic-tag/custom routing origins need
    // not equal the canonical receiving-service audience. Never infer it.
    if (!audience || audience.length > 2048 || /[\s\x00-\x1f\x7f]/.test(audience)) return fail("BFF_CLOUD_RUN_AUDIENCE");
    serviceAuth = Object.freeze({ mode, audience });
  } else if (mode === "local-test" && local && ["localhost", "127.0.0.1", "[::1]"].includes(spring.hostname)) {
    serviceAuth = Object.freeze({ mode });
  } else return fail("BFF_SERVICE_AUTH_MODE");
  try { database = new URL(env.BFF_DATABASE_URL ?? ""); } catch { return fail("BFF_DATABASE_URL"); }
  // No URL TLS overrides; verified TLS is configured by the driver boundary.
  if (!["postgres:", "postgresql:"].includes(database.protocol) || !database.hostname || database.pathname === "/" || database.search || database.hash) return fail("BFF_DATABASE_URL");
  if (!local && !env.BFF_DATABASE_CA_PEM) return fail("BFF_DATABASE_CA_PEM");
  const kmsKey = env.BFF_KMS_KEY_VERSION ?? "";
  if (!/^projects\/[^/]+\/locations\/asia-south1\/keyRings\/[^/]+\/cryptoKeys\/[^/]+\/cryptoKeyVersions\/[1-9][0-9]*$/.test(kmsKey)) return fail("BFF_KMS_KEY_VERSION");
  const limits = {} as { -readonly [K in keyof Limits]: number };
  const timerLimits = new Set<string>(["BFF_UPSTREAM_CONNECT_TIMEOUT_MS", "BFF_UPSTREAM_RESPONSE_TIMEOUT_MS",
    "SESSION_STORE_CONNECT_TIMEOUT_MS", "SESSION_STORE_OPERATION_TIMEOUT_MS", "REFRESH_LEASE_MS", "REFRESH_WAITER_TIMEOUT_MS"]);
  for (const key of Object.keys(LOCAL_LIMITS) as (keyof Limits)[]) {
    const raw = env[key] ?? (local ? String(LOCAL_LIMITS[key]) : "");
    if (!/^[1-9][0-9]*$/.test(raw)) return fail(key);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value > (key.endsWith("_BYTES") ? 16_777_216 : 2_592_000_000)) return fail(key);
    if (key === "SESSION_STORE_POOL_MAX" && value > 100) return fail(key);
    if ((key === "SESSION_STORE_POOL_IDLE_MS" || key === "SESSION_STORE_POOL_LIFETIME_MS") && value > 3600000) return fail(key);
    if (key === "KMS_OPERATION_TIMEOUT_MS" && value > 10000) return fail(key);
    // Node timers overflow above 2^31-1; bound operational waits much more tightly.
    if (timerLimits.has(key) && value > 120_000) return fail(key);
    limits[key] = value;
  }
  if (limits.BFF_UPSTREAM_CONNECT_TIMEOUT_MS > limits.BFF_UPSTREAM_RESPONSE_TIMEOUT_MS
    || limits.BFF_UPSTREAM_RESPONSE_TIMEOUT_MS >= limits.REFRESH_LEASE_MS
    || limits.SESSION_STORE_OPERATION_TIMEOUT_MS >= limits.REFRESH_LEASE_MS
    || limits.REFRESH_WAITER_TIMEOUT_MS >= limits.REFRESH_LEASE_MS
    || limits.TOMBSTONE_RETENTION_MS <= limits.REFRESH_LEASE_MS + 2 * limits.CLOCK_SKEW_MS
    || limits.PLATFORM_IDLE_TIMEOUT_MS > limits.PLATFORM_ABSOLUTE_TIMEOUT_MS
    || limits.TENANT_IDLE_TIMEOUT_MS > limits.TENANT_ABSOLUTE_TIMEOUT_MS) return fail("limit relationships");
  return Object.freeze({ environment, origin, springOrigin: spring.origin, cookieMode,
    databaseUrl: database.href, databaseCa: env.BFF_DATABASE_CA_PEM, kmsKey, serviceAuth, limits: Object.freeze(limits) });
}

export function observableConfig(config: BffConfig) {
  // Deliberately excludes URLs, database credentials, CA material and key resource IDs.
  return { environment: config.environment, cookieMode: config.cookieMode, serviceAuthMode: config.serviceAuth.mode, limits: config.limits };
}

export function sessionDeadlines(config: BffConfig, context: "PLATFORM" | "TENANT", createdAt: number, now = createdAt) {
  const absoluteExpiresAt = createdAt + config.limits[`${context}_ABSOLUTE_TIMEOUT_MS`];
  return { absoluteExpiresAt, idleExpiresAt: Math.min(absoluteExpiresAt, now + config.limits[`${context}_IDLE_TIMEOUT_MS`]) };
}
