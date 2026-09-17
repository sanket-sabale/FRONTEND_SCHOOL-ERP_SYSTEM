import type { TenantScopedQuery } from "@/lib/api/client";

export const academicYearStatuses = ["draft", "active", "closed", "archived"] as const;
export type AcademicYearStatus = (typeof academicYearStatuses)[number];

export const academicStructureStatuses = ["active", "inactive", "archived"] as const;
export type AcademicStructureStatus = (typeof academicStructureStatuses)[number];

export type AcademicYear = TenantScopedQuery & {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type AcademicClass = TenantScopedQuery & {
  id: string;
  code: string;
  displayName: string;
  sortOrder: number;
  status: AcademicStructureStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type Section = TenantScopedQuery & {
  id: string;
  classId: string;
  name: string;
  displayName: string;
  capacity?: number;
  roomId?: string;
  classTeacherId?: string;
  status: AcademicStructureStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type AcademicYearFilters = Partial<TenantScopedQuery> & {
  query?: string;
  status?: AcademicYearStatus;
  currentOnly?: boolean;
};

export type AcademicClassFilters = Partial<TenantScopedQuery> & {
  query?: string;
  status?: AcademicStructureStatus;
  includeArchived?: boolean;
  sortBy?: "displayName" | "code" | "sortOrder" | "status";
  sortDirection?: "asc" | "desc";
};

export type SectionFilters = Partial<TenantScopedQuery> & {
  query?: string;
  classId?: string;
  status?: AcademicStructureStatus;
  includeArchived?: boolean;
  sortBy?: "displayName" | "name" | "capacity" | "status";
  sortDirection?: "asc" | "desc";
};

export type AcademicYearCreateInput = TenantScopedQuery & {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  status?: AcademicYearStatus;
  isCurrent?: boolean;
};

export type AcademicYearUpdateInput = Partial<
  Omit<AcademicYearCreateInput, keyof TenantScopedQuery | "id">
> & TenantScopedQuery & {
  id: string;
};

export type AcademicClassCreateInput = TenantScopedQuery & {
  id?: string;
  code: string;
  displayName: string;
  sortOrder: number;
  status?: AcademicStructureStatus;
};

export type AcademicClassUpdateInput = Partial<
  Omit<AcademicClassCreateInput, keyof TenantScopedQuery | "id">
> & TenantScopedQuery & {
  id: string;
};

export type SectionCreateInput = TenantScopedQuery & {
  id?: string;
  classId: string;
  name: string;
  displayName: string;
  capacity?: number;
  roomId?: string;
  classTeacherId?: string;
  status?: AcademicStructureStatus;
};

export type SectionUpdateInput = Partial<
  Omit<SectionCreateInput, keyof TenantScopedQuery | "id" | "classId">
> & TenantScopedQuery & {
  id: string;
};

export type AcademicStructureStatusInput = TenantScopedQuery & {
  id: string;
  status: AcademicYearStatus | AcademicStructureStatus;
};

export type AcademicStructurePlacementOption = {
  academicYearId: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  sectionCapacity?: number;
};
