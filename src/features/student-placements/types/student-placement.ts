import type { TenantScopedQuery } from "@/lib/api/client";

export const studentPlacementStatuses = ["active", "ended", "transferred", "withdrawn"] as const;
export type StudentPlacementStatus = (typeof studentPlacementStatuses)[number];

export const studentPlacementReasons = [
  "initial_admission",
  "section_change",
  "class_change",
  "administrative_correction",
  "student_transfer",
  "withdrawal",
  "special_placement",
  "other",
] as const;
export type StudentPlacementReason = (typeof studentPlacementReasons)[number];

export type StudentAcademicPlacement = TenantScopedQuery & {
  id: string;
  studentId: string;
  classId: string;
  sectionId: string;
  status: StudentPlacementStatus;
  startDate: string;
  endDate?: string;
  reason?: StudentPlacementReason;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentAcademicPlacementCreateInput = TenantScopedQuery & {
  id?: string;
  studentId: string;
  classId: string;
  sectionId: string;
  status?: StudentPlacementStatus;
  startDate: string;
  endDate?: string;
  reason?: StudentPlacementReason;
  notes?: string;
};

export type StudentAcademicPlacementUpdateInput = Partial<
  Omit<StudentAcademicPlacementCreateInput, keyof TenantScopedQuery | "id" | "studentId" | "classId" | "sectionId">
> & TenantScopedQuery & {
  id: string;
};

export type StudentAcademicPlacementEndInput = TenantScopedQuery & {
  id: string;
  endDate: string;
  reason: StudentPlacementReason;
};

export type StudentAcademicPlacementTransferInput = TenantScopedQuery & {
  studentId: string;
  fromPlacementId: string;
  toAcademicYearId: string;
  toClassId: string;
  toSectionId: string;
  startDate: string;
  reason: StudentPlacementReason;
};

export type StudentAcademicPlacementFilters = Partial<TenantScopedQuery> & {
  query?: string;
  studentId?: string;
  classId?: string;
  sectionId?: string;
  status?: StudentPlacementStatus;
  allAcademicYears?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: "studentName" | "className" | "startDate" | "status";
  sortDirection?: "asc" | "desc";
};

export type StudentAcademicPlacementReadModel = StudentAcademicPlacement & {
  studentName: string;
  admissionNumber: string;
  academicYearName: string;
  className: string;
  sectionName: string;
  primaryGuardianName?: string;
};

export type AcademicRosterStudent = Pick<
  StudentAcademicPlacementReadModel,
  | "id"
  | "studentId"
  | "studentName"
  | "admissionNumber"
  | "academicYearId"
  | "academicYearName"
  | "classId"
  | "className"
  | "sectionId"
  | "sectionName"
  | "status"
  | "startDate"
  | "endDate"
  | "reason"
  | "primaryGuardianName"
>;

export type AcademicRosterSummary = {
  activeStudentCount: number;
  students: AcademicRosterStudent[];
};

export type AcademicRosterEffectiveDateFilters = {
  effectiveDate: string;
  classId?: string;
  sectionId?: string;
};

export type StudentAcademicPlacementListResponse = {
  items: StudentAcademicPlacementReadModel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
