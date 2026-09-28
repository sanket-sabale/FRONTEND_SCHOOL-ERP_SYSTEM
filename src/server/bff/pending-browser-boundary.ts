import "server-only";
import type { BffConfig } from "./config";
import { BffError } from "./errors";
import { readBoundedAuthJson, readBrowserMutation, safeRequestId } from "./browser-boundary";
import { privateResponseHeaders, rejectBrowserAuthority } from "./security-policy";
import { projectChoices, type Selection } from "./pending-auth";
import { validateMembershipChoice } from "./upstream-contract";

// No route registration or cookie emission. An actual route must supply an
// approved rate-limit admission function; there is no process-memory fallback.
export async function readPreAuthBootstrap(request: Request, config: BffConfig, admit: () => Promise<boolean>) {
  if (request.method !== "POST") throw new BffError("INVALID_REQUEST", 405);
  try {
    rejectBrowserAuthority(request.headers);
    if (request.headers.get("origin") !== config.origin || request.headers.get("x-schoolerp-bootstrap") !== "1"
      || (request.headers.has("sec-fetch-site") && request.headers.get("sec-fetch-site") !== "same-origin")
      || request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new Error();
  } catch { throw new BffError("BFF_CSRF_REJECTED", 403); }
  if (!await admit()) throw new BffError("RATE_LIMIT_EXCEEDED", 429);
  const body = await readBoundedAuthJson(request, config);
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) throw new BffError("INVALID_REQUEST", 400);
}
export async function readSelectionMutation(request: Request, config: BffConfig, expectedProof: string, admit: () => Promise<boolean>) {
  const membershipId = validateMembershipChoice(await readBrowserMutation(request, config, expectedProof));
  if (!await admit()) throw new BffError("RATE_LIMIT_EXCEEDED", 429);
  return { membershipId };
}
export function membershipChoicesResponse(record: Selection, now: number, requestId: string) {
  return Response.json(projectChoices(record, now), { headers: { ...privateResponseHeaders, "X-Request-ID": safeRequestId(requestId) } });
}
