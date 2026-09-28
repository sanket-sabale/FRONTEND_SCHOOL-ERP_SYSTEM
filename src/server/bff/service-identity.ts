import "server-only";
import { GoogleAuth } from "google-auth-library";
import type { BffConfig } from "./config";
import { BffError } from "./errors";

export type ServiceCredential = { token: string; audience: string; expiresAt: number };
export interface ServiceIdentityProvider {
  readonly mode: "cloud-run" | "local-test";
  credential(audience: string): Promise<ServiceCredential>;
}
const unavailable = () => new BffError("BFF_UPSTREAM_UNAVAILABLE", 502);

// Claims are checked for freshness/binding on a token obtained from the trusted
// Google SDK. This is not a substitute for Cloud Run's signature/IAM validation.
export function inspectGoogleIdToken(token: string, audience: string): ServiceCredential {
  try {
    if (token.length > 16384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw unavailable();
    const [headerPart, claimsPart] = token.split(".");
    const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
    const claims = JSON.parse(Buffer.from(claimsPart, "base64url").toString("utf8"));
    if (header.alg !== "RS256" || !["https://accounts.google.com", "accounts.google.com"].includes(claims.iss)
      || claims.aud !== audience || typeof claims.sub !== "string" || !claims.sub
      || !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= Date.now()) throw unavailable();
    return { token, audience, expiresAt: claims.exp * 1000 };
  } catch { throw unavailable(); }
}

class CloudRunServiceIdentity implements ServiceIdentityProvider {
  readonly mode = "cloud-run" as const;
  private readonly auth = new GoogleAuth();
  async credential(audience: string) {
    try {
      const client = await this.auth.getIdTokenClient(audience);
      // Only fetch the service credential. Never use Google's request/retry
      // helper to dispatch Spring login/refresh/logout.
      return inspectGoogleIdToken(await client.idTokenProvider.fetchIdToken(audience), audience);
    } catch { throw unavailable(); }
  }
}

export function createServiceIdentity(config: BffConfig): ServiceIdentityProvider {
  if (config.serviceAuth.mode !== "cloud-run" || !config.serviceAuth.audience) throw unavailable();
  return new CloudRunServiceIdentity();
}

export async function serviceAuthorization(config: BffConfig, provider: ServiceIdentityProvider, timeoutMs: number) {
  if (!provider || provider.mode !== config.serviceAuth.mode
    || (provider.mode === "local-test" && (config.environment !== "development" || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(config.springOrigin).hostname)))) throw unavailable();
  const audience = config.serviceAuth.mode === "cloud-run" ? config.serviceAuth.audience : config.springOrigin;
  if (!audience) throw unavailable();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      provider.credential(audience),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new BffError("BFF_UPSTREAM_UNAVAILABLE", 504)), timeoutMs); }),
    ]);
    if (!value || value.audience !== audience || typeof value.token !== "string" || !/^[A-Za-z0-9._~-]{1,16384}$/.test(value.token)
      || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= Date.now() + config.limits.CLOCK_SKEW_MS) throw unavailable();
    if (provider.mode === "cloud-run" && inspectGoogleIdToken(value.token, audience).expiresAt !== value.expiresAt) throw unavailable();
    return `Bearer ${value.token}`;
  } catch (error) {
    if (error instanceof BffError) throw error;
    throw unavailable();
  } finally { clearTimeout(timer); }
}
