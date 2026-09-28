import "server-only";

const codes: Record<number, readonly string[]> = {
  400: ["VALIDATION_ERROR", "INVALID_REQUEST"],
  401: ["AUTHENTICATION_REQUIRED", "AUTHENTICATION_FAILED", "INVALID_TOKEN", "TENANT_CONTEXT_REQUIRED"],
  403: ["PERMISSION_DENIED"], 404: ["RESOURCE_NOT_FOUND"], 409: ["CONFLICT"],
  429: ["RATE_LIMIT_EXCEEDED"], 500: ["INTERNAL_ERROR"],
};
const messages: Record<number, string> = {
  400: "Please review the request.", 401: "Please sign in again.", 403: "This action is not permitted.",
  404: "The resource was not found.", 409: "Please refresh and review the current state.",
  429: "Too many requests. Please wait.", 500: "The request could not be completed.",
};
export type BffErrorCode = "RATE_LIMIT_EXCEEDED" | "INVALID_REQUEST" | "BFF_CSRF_REJECTED" | "BFF_SESSION_REQUIRED" | "BFF_REFRESH_REQUIRED" | "BFF_SESSION_STORE_UNAVAILABLE" | "BFF_UPSTREAM_UNAVAILABLE";
export class BffError extends Error {
  constructor(public readonly code: BffErrorCode, public readonly status: number, public readonly requestId?: string) { super("The request could not be completed."); }
}
export function normalizeProblem(status: number, body: unknown) {
  const stableStatus = codes[status] ? status : 502;
  const candidate = body && typeof body === "object" && "code" in body ? body.code : undefined;
  const code = typeof candidate === "string" && codes[status]?.includes(candidate) ? candidate : codes[status]?.[0] ?? "BFF_UPSTREAM_UNAVAILABLE";
  return { status: stableStatus, code, message: messages[stableStatus] ?? "The service is unavailable." };
}
