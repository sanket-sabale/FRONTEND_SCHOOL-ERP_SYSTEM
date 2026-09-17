export type ApiErrorCode =
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 429
  | 500
  | "NETWORK"
  | "TIMEOUT";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type TenantScopedQuery = {
  tenantId: string;
  schoolId: string;
  campusId: string;
  academicYearId: string;
};

export function queryKey(resource: string, scope: TenantScopedQuery, filters?: Record<string, unknown>) {
  return [resource, scope.tenantId, scope.schoolId, scope.campusId, scope.academicYearId, filters ?? {}] as const;
}

export const apiClient = {
  async get<T>(url: string): Promise<T> {
    throw new ApiError(500, `Mock API is active. No HTTP request was made for ${url}.`);
  },
};

export function toUserMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 401) return "Your session has expired. Please sign in again.";
    if (error.code === 403) return "You do not have permission to perform this action.";
    if (error.code === 404) return "The requested record could not be found.";
    if (error.code === 409) return "This record changed recently. Please refresh and review the latest version.";
    if (error.code === 422) return "Please review the highlighted fields and try again.";
    if (error.code === 429) return "Too many requests. Please wait a moment and try again.";
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
