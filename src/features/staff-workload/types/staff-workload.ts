import type { TenantScopedQuery } from "@/lib/api/client";
import type { StaffAcademicAssignmentListItem } from "@/features/staff-academic-assignments/types/staff-academic-assignment";

export const workloadPeriods = ["weekly"] as const;
export type WorkloadPeriod = (typeof workloadPeriods)[number];

export const workloadStatuses = ["not_configured", "under_assigned", "balanced", "near_capacity", "overloaded"] as const;
export type WorkloadStatus = (typeof workloadStatuses)[number];

export const schedulingReadinessStatuses = ["ready", "needs_configuration", "has_warnings", "blocked"] as const;
export type SchedulingReadinessStatus = (typeof schedulingReadinessStatuses)[number];

export const staffAvailabilityStates = ["available", "unavailable", "preferred"] as const;
export type StaffAvailabilityState = (typeof staffAvailabilityStates)[number];

export const workloadConflictTypes = ["staff_double_booking", "class_section_double_booking", "staff_unavailable", "missing_workload_configuration"] as const;
export type WorkloadConflictType = (typeof workloadConflictTypes)[number];

export const workloadDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
export type WorkloadDay = (typeof workloadDays)[number];

export type WorkloadSlot = {
  day: WorkloadDay;
  period: number;
};

export type AssignmentWorkloadConfig = TenantScopedQuery & {
  assignmentId: string;
  weeklyPeriods?: number;
  contributesToWorkload: boolean;
  schedulingPriority: "low" | "normal" | "high";
  slots: WorkloadSlot[];
  notes?: string;
  updatedAt: string;
};

export type StaffAvailabilityRule = TenantScopedQuery & {
  id: string;
  staffId: string;
  day: WorkloadDay;
  period: number;
  state: StaffAvailabilityState;
  notes?: string;
  updatedAt: string;
};

export type StaffExpectedWorkload = TenantScopedQuery & {
  staffId: string;
  period: WorkloadPeriod;
  expectedWeeklyPeriods?: number;
  notes?: string;
  updatedAt: string;
};

export type WorkloadCalculation = {
  expectedWeeklyPeriods?: number;
  assignedWeeklyPeriods: number;
  utilizationPercentage?: number;
  remainingCapacity?: number;
  overloadPeriods: number;
  status: WorkloadStatus;
};

export type WorkloadConflict = {
  id: string;
  type: WorkloadConflictType;
  severity: "warning" | "blocking";
  message: string;
  staffId?: string;
  assignmentIds: string[];
  classId?: string;
  sectionId?: string;
  slot?: WorkloadSlot;
};

export type SchedulingReadiness = {
  status: SchedulingReadinessStatus;
  warnings: string[];
  blockers: string[];
};

export type StaffWorkloadRow = {
  staffId: string;
  staffName: string;
  employeeNumber: string;
  departmentName: string;
  designationName: string;
  staffCategory: string;
  staffStatus: string;
  activeAssignments: number;
  missingConfiguredAssignments: number;
  conflicts: number;
  calculation: WorkloadCalculation;
  readiness: SchedulingReadiness;
};

export type StaffWorkloadDetail = StaffWorkloadRow & {
  assignments: Array<StaffAcademicAssignmentListItem & { workloadConfig?: AssignmentWorkloadConfig }>;
  availability: StaffAvailabilityRule[];
  conflictsList: WorkloadConflict[];
};

export type StaffWorkloadSummary = {
  totalTeachingStaff: number;
  workloadConfigured: number;
  balanced: number;
  underAssigned: number;
  nearCapacity: number;
  overloaded: number;
  schedulingConflicts: number;
  assignmentGaps: number;
  ready: number;
  needsConfiguration: number;
  hasWarnings: number;
  blocked: number;
};

export type StaffWorkloadFilters = {
  query?: string;
  status?: WorkloadStatus;
  readiness?: SchedulingReadinessStatus;
  department?: string;
  designation?: string;
  sortBy?: "staffName" | "assignedWeeklyPeriods" | "expectedWeeklyPeriods" | "utilizationPercentage" | "status" | "readiness";
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type StaffWorkloadListResponse = {
  items: StaffWorkloadRow[];
  summary: StaffWorkloadSummary;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AssignmentWorkloadConfigInput = TenantScopedQuery & {
  assignmentId: string;
  weeklyPeriods?: number;
  contributesToWorkload?: boolean;
  schedulingPriority?: AssignmentWorkloadConfig["schedulingPriority"];
  notes?: string;
};
