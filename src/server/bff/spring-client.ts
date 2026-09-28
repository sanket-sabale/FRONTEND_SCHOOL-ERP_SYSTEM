import "server-only";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { BffConfig } from "./config";
import type { Context } from "./session-contract";
import { authRoute, privateResponseHeaders, rejectBrowserAuthority } from "./security-policy";
import { BffError, normalizeProblem } from "./errors";
import { createServiceIdentity, serviceAuthorization, type ServiceIdentityProvider } from "./service-identity";
import { validateRequest, validateSuccess } from "./upstream-contract";

export type SpringOperation = "login" | "session" | "refresh" | "logout" | "select-membership";
export type SpringResult = { status: number; body: unknown; headers: Record<string, string>; requestId: string };
type SpringInput = { browserHeaders: Headers; body?: unknown; credential?: { context: Context; accessToken: string } };
export class SpringClient {
  private readonly identity: ServiceIdentityProvider;
  constructor(private readonly config: BffConfig, identity?: ServiceIdentityProvider) {
    this.identity = identity ?? createServiceIdentity(config);
  }
  async call(context: Context, operation: SpringOperation, input: SpringInput): Promise<SpringResult> {
    const requestId = randomUUID();
    try { return await this.execute(context, operation, input, requestId); }
    catch (error) {
      if (error instanceof BffError) throw new BffError(error.code, error.status, requestId);
      throw new BffError("BFF_UPSTREAM_UNAVAILABLE", 502, requestId);
    }
  }
  private async execute(context: Context, operation: SpringOperation, input: SpringInput, requestId: string): Promise<SpringResult> {
    const started = performance.now();
    rejectBrowserAuthority(input.browserHeaders);
    if (Object.keys(input).some(key => !["browserHeaders", "body", "credential"].includes(key))) throw new BffError("BFF_UPSTREAM_UNAVAILABLE", 502);
    const host = input.browserHeaders.get("host");
    if (host && host !== new URL(this.config.origin).host) throw new BffError("BFF_UPSTREAM_UNAVAILABLE", 502);
    const route = authRoute(context, operation); // runtime allowlist; no URL/path/method parameter
    const url = new URL(route.upstreamPath, this.config.springOrigin);
    if (url.origin !== this.config.springOrigin) throw new BffError("BFF_UPSTREAM_UNAVAILABLE", 502);
    const contentType = input.browserHeaders.get("content-type");
    if (contentType && contentType.split(";")[0].trim().toLowerCase() !== "application/json") throw new BffError("INVALID_REQUEST", 415);
    const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json", "X-Request-ID": requestId };
    if (route.userAuthentication) {
      if (!input.credential || input.credential.context !== context || !/^[A-Za-z0-9._~-]+$/.test(input.credential.accessToken)) throw new BffError("BFF_SESSION_REQUIRED", 401);
      headers.Authorization = `Bearer ${input.credential.accessToken}`;
    } else if (input.credential) throw new BffError("BFF_SESSION_REQUIRED", 401);
    const validatedBody = validateRequest(context, operation, input.body);
    const payload = validatedBody === undefined ? undefined : JSON.stringify(validatedBody);
    if (payload && Buffer.byteLength(payload) > this.config.limits[route.requestLimit]) throw new BffError("INVALID_REQUEST", 413);
    headers["X-Serverless-Authorization"] = await serviceAuthorization(this.config, this.identity, this.config.limits[route.connectTimeout]);
    // The total response budget includes service credential acquisition. A late
    // provider result can never start an upstream request after its deadline.
    const remaining = this.config.limits[route.responseTimeout] - (performance.now() - started);
    if (remaining <= 0) throw new BffError("BFF_UPSTREAM_UNAVAILABLE", 504);
    // Node core HTTP makes exactly one send, follows no redirects, has no retry
    // middleware, and cannot inherit a browser's Cookie/Origin/tenant headers.
    return new Promise((resolve, reject) => {
      const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
      let finished = false;
      const fail = (status = 502) => {
        if (finished) return;
        finished = true; clearTimeout(connectTimer); clearTimeout(responseTimer);
        req.destroy(); reject(new BffError("BFF_UPSTREAM_UNAVAILABLE", status));
      };
      const req = transport(url, { method: route.method, headers, agent: false }, (res) => {
        const status = res.statusCode ?? 502;
        if (status >= 300 && status < 400) { res.destroy(); fail(); return; }
        const declared = res.headers["content-length"];
        if (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity") { res.destroy(); fail(); return; }
        if (declared && (!/^\d+$/.test(declared) || Number(declared) > this.config.limits[route.responseLimit])) { res.destroy(); fail(); return; }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > this.config.limits[route.responseLimit]) { res.destroy(); fail(); }
          else chunks.push(chunk);
        });
        res.on("error", () => fail());
        res.on("aborted", () => fail());
        res.on("end", () => {
          if (finished) return;
          try {
            if (performance.now() - started >= this.config.limits[route.responseTimeout]) { fail(504); return; }
            const type = res.headers["content-type"]?.split(";")[0].trim();
            if (status !== 204 && type !== "application/json" && type !== "application/problem+json") { fail(); return; }
            if (status < 400 && (status !== route.successStatus || (route.responseType !== "empty" && type !== route.responseType))) { fail(); return; }
            const body: unknown = status === 204 ? null : JSON.parse(Buffer.concat(chunks).toString("utf8"));
            const safeHeaders: Record<string, string> = { ...privateResponseHeaders, "X-Request-ID": requestId };
            const retry = res.headers["retry-after"];
            if (status === 429 && typeof retry === "string" && /^\d{1,5}$/.test(retry)) safeHeaders["Retry-After"] = retry;
            const problem = status >= 400 ? normalizeProblem(status, body) : null;
            const validated = problem ?? validateSuccess(context, operation, body);
            finished = true; clearTimeout(connectTimer); clearTimeout(responseTimer);
            // Validated token DTOs remain server-only; use an explicit browser projector.
            resolve({ status: problem?.status ?? status, body: validated, headers: safeHeaders, requestId });
          } catch { fail(); }
        });
      });
      const connectTimer = setTimeout(() => fail(504), Math.min(remaining, this.config.limits[route.connectTimeout]));
      const responseTimer = setTimeout(() => fail(504), remaining);
      req.on("socket", socket => socket.once(url.protocol === "https:" ? "secureConnect" : "connect", () => clearTimeout(connectTimer)));
      req.on("error", () => fail());
      req.end(payload);
    });
  }
}
