import type { TenantScopedQuery } from "@/lib/api/client";

export const staffAcademicAssignmentTypes = ["class_teacher", "subject_teacher", "assistant_teacher", "co_teacher", "academic_coordinator", "department_head"] as const;
export type StaffAcademicAssignmentType = (typeof staffAcademicAssignmentTypes)[number];

export const staffAcademicAssignmentStatuses = ["planned", "active", "ended", "cancelled"] as const;
export type StaffAcademicAssignmentStatus = (typeof staffAcademicAssignmentStatuses)[number];

export type AcademicSubject = TenantScopedQuery & {
  id: string;
  code: string;
  name: string;
  status: "active" | "inactive";
  classIds?: string[];
};

export type StaffAcademicAssignment = TenantScopedQuery & {
  id: string;
  staffId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  assignmentType: StaffAcademicAssignmentType;
  status: StaffAcademicAssignmentStatus;
  isPrimary: boolean;
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffAcademicAssignmentInput = TenantScopedQuery & {
  staffId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  assignmentType: StaffAcademicAssignmentType;
  status?: StaffAcademicAssignmentStatus;
  isPrimary?: boolean;
  startDate: string;
  endDate?: string;
  notes?: string;
};

export type StaffAcademicAssignmentStatusInput = TenantScopedQuery & {
  assignmentId: string;
  status: StaffAcademicAssignmentStatus;
  endDate?: string;
};

export type StaffAcademicAssignmentFilters = Partial<TenantScopedQuery> & {
  query?: string;
  staffId?: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  assignmentType?: StaffAcademicAssignmentType;
  status?: StaffAcademicAssignmentStatus;
  primary?: boolean;
  page?: number;
  pageSize?: number;
};

export type StaffAcademicAssignmentListItem = StaffAcademicAssignment & {
  staffName: string;
  employeeNumber: string;
  academicYearName: string;
  className: string;
  sectionName: string;
  subjectName: string;
};

export type StaffAcademicAssignmentListResponse = {
  items: StaffAcademicAssignmentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type StaffAcademicWorkload = {
  staffId: string;
  staffName: string;
  employeeNumber: string;
  activeAssignments: number;
  classCount: number;
  sectionCount: number;
  subjectCount: number;
  weeklyPeriods?: number;
  status: "informational" | "under_assigned" | "normal" | "high" | "overloaded";
};

export type StaffAcademicAssignmentOptions = {
  academicYears: Array<{ id: string; name: string; status: string }>;
  classes: Array<{ id: string; name: string; academicYearId: string }>;
  sections: Array<{ id: string; name: string; classId: string; academicYearId: string }>;
  subjects: Array<{ id: string; name: string; status: string }>;
};
