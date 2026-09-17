import type { Permission, Role } from "@/types/erp";

export type TenantScope = {
  tenantId: string;
  schoolId: string;
  campusId: string;
  academicYearId: string;
};

export type PermissionContext = TenantScope & {
  actorId: string;
  role: Role;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type SortDirection = "asc" | "desc";

export type ApiResponse<TData> =
  | { success: true; data: TData; meta?: Record<string, unknown> }
  | { success: false; error: DomainError };

export type ServiceResult<TData> =
  | { ok: true; data: TData }
  | { ok: false; error: DomainError };

export type DomainErrorCode =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "invalid_state"
  | "duplicate_operation"
  | "tenant_scope_violation"
  | "business_rule"
  | "unavailable";

export type DomainError = {
  code: DomainErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type EntityReference<TEntity extends string = string> = {
  id: string;
  type: TEntity;
  displayName?: string;
};

export type AuditEvent<TEntity extends string = string, TAction extends string = string> = TenantScope & {
  id: string;
  actorId: string;
  action: TAction;
  entity: EntityReference<TEntity>;
  timestamp: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type PermissionRequirement = {
  permission: Permission;
  reason: string;
};

export function isSameTenantScope(record: TenantScope, scope: TenantScope) {
  return record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId;
}

export function createPagination(page: number, pageSize: number, total: number): Pagination {
  const safePageSize = Math.min(Math.max(Math.trunc(pageSize || 25), 1), 100);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(Math.trunc(page || 1), 1), totalPages);
  return { page: safePage, pageSize: safePageSize, total, totalPages };
}
