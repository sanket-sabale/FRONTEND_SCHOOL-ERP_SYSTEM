import "server-only";
import { randomUUID } from "node:crypto";
import type { BffConfig } from "./config";
import { openCredentials, sealCredentials, type KeyWrapper } from "./credential-envelope";
import type { RefreshBroker } from "./refresh-coordinator";
import type { SpringClient } from "./spring-client";

export function createRefreshBroker(config: BffConfig, wrapper: KeyWrapper, client: SpringClient): RefreshBroker {
  return async record => {
    if (!record.envelope) throw new Error("Refresh unavailable");
    const binding = { environment: config.environment, context: record.context, sessionKey: record.key, credentialVersion: record.credentialVersion };
    const old = await openCredentials(wrapper, binding, record.envelope);
    const requestStartedAt = Date.now();
    const response = await client.call(record.context, "refresh", { browserHeaders: new Headers(), body: { refreshToken: old.refreshToken } });
    const token = response.body;
    if (response.status !== 200 || !token || typeof token !== "object") throw new Error("Refresh unavailable");
    const t = token as Record<string, unknown>;
    const expiry = t[record.context === "PLATFORM" ? "expiresIn" : "expiresInSeconds"];
    if (typeof t.accessToken !== "string" || !/^[A-Za-z0-9._~-]+$/.test(t.accessToken) || typeof t.refreshToken !== "string" || !t.refreshToken
      || t.tokenType !== "Bearer" || typeof expiry !== "number" || !Number.isSafeInteger(expiry) || expiry <= 0 || expiry > 86400) throw new Error("Refresh unavailable");
    const me = await client.call(record.context, "session", { browserHeaders: new Headers(), credential: { context: record.context, accessToken: t.accessToken } });
    if (me.status !== 200 || !me.body || typeof me.body !== "object") throw new Error("Refresh unavailable");
    const identity = me.body as Record<string, unknown>;
    for (const [key, value] of Object.entries(record.identity)) if (identity[key] !== value) throw new Error("Refresh unavailable");
    const envelope = await sealCredentials(wrapper, { ...binding, credentialVersion: record.credentialVersion + 1 }, { accessToken: t.accessToken, refreshToken: t.refreshToken });
    return { envelope, envelopeId: randomUUID(), accessExpiresAt: requestStartedAt + expiry * 1000 - config.limits.CLOCK_SKEW_MS };
  };
}
