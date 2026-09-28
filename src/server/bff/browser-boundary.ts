import "server-only";
import { randomUUID } from "node:crypto";
import type { BffConfig } from "./config";
import type { Context } from "./session-contract";
import { privateResponseHeaders, verifyMutation } from "./security-policy";
import { projectBrowserIdentity } from "./upstream-contract";
import { BffError } from "./errors";

export function safeRequestId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid correlation ID");
  return value;
}

// Reusable boundary, not an App Router handler. Caller selects context and
// resolves the expected proof from trusted session state, never from the body.
export async function readBrowserMutation(request: Request, config: BffConfig, expectedProof: string) {
  if (request.method !== "POST") throw new BffError("INVALID_REQUEST", 405);
  try { verifyMutation(request.headers, config.origin, request.headers.get("x-schoolerp-csrf"), expectedProof); }
  catch { throw new BffError("BFF_CSRF_REJECTED", 403); }
  return readBoundedAuthJson(request, config);
}

export async function readBoundedAuthJson(request: Request, config: BffConfig) {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > config.limits.AUTH_REQUEST_MAX_BYTES)) throw new BffError("INVALID_REQUEST", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new BffError("INVALID_REQUEST", 400);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); reject(new BffError("INVALID_REQUEST", 408)); }, config.limits.BFF_UPSTREAM_RESPONSE_TIMEOUT_MS);
  });
  try {
    const chunks: Buffer[] = []; let size = 0;
    while (true) {
      const result = await Promise.race([reader.read(), timeout]);
      if (timedOut) throw new BffError("INVALID_REQUEST", 408);
      if (result.done) break;
      size += result.value.byteLength;
      if (size > config.limits.AUTH_REQUEST_MAX_BYTES) throw new BffError("INVALID_REQUEST", 413);
      chunks.push(Buffer.from(result.value));
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof BffError) throw error;
    throw new BffError("INVALID_REQUEST", 400);
  } finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}

export function browserSessionResponse(context: Context, identity: unknown, expiresAt: number, requestId: string) {
  return Response.json(projectBrowserIdentity(context, identity, expiresAt), {
    headers: { ...privateResponseHeaders, "X-Request-ID": safeRequestId(requestId) },
  });
}

export function browserFailureResponse(error: unknown) {
  const known = error instanceof BffError;
  const requestId = known && error.requestId ? safeRequestId(error.requestId) : randomUUID();
  return Response.json({ status: known ? error.status : 500, code: known ? error.code : "INTERNAL_ERROR", message: "The request could not be completed.", requestId }, {
    status: known ? error.status : 500, headers: { ...privateResponseHeaders, "X-Request-ID": requestId },
  });
}
