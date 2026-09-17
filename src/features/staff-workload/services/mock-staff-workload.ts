import { tenantContext } from "@/lib/tenant-context";
import type { TenantScopedQuery } from "@/lib/api/client";
import type { AssignmentWorkloadConfig, StaffAvailabilityRule, StaffExpectedWorkload } from "@/features/staff-workload/types/staff-workload";

const activeScope: TenantScopedQuery = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

const secondTenantScope: TenantScopedQuery = {
  tenantId: "tenant-demo-west",
  schoolId: "school-demo-west",
  campusId: "campus-demo-central",
  academicYearId: "ay-2026-27",
};

export const mockStaffExpectedWorkloads: StaffExpectedWorkload[] = [
  expected("staff-001", 30, "Balanced demonstration teacher."),
  expected("staff-002", 30, "Under assigned demonstration teacher."),
  expected("staff-007", undefined, "Expected workload intentionally not configured."),
  expected("staff-009", 30, "Overloaded demonstration teacher."),
  expected("staff-west-001", 30, "Second tenant workload.", secondTenantScope),
];

export const mockAssignmentWorkloadConfigs: AssignmentWorkloadConfig[] = [
  config("assignment-001", 18, [{ day: "monday", period: 3 }, { day: "tuesday", period: 2 }, { day: "wednesday", period: 4 }], "high"),
  config("assignment-002", 12, [{ day: "monday", period: 3 }, { day: "thursday", period: 1 }]),
  config("assignment-003", 24, [{ day: "monday", period: 1 }, { day: "tuesday", period: 3 }, { day: "friday", period: 4 }]),
  config("assignment-006", 34, [{ day: "thursday", period: 2 }, { day: "friday", period: 2 }], "high"),
  config("assignment-009", 4, [{ day: "monday", period: 3 }], "normal", activeScope, "Creates a class-section readiness conflict with Grade 8-A Mathematics."),
  config("assignment-007", 20, [{ day: "monday", period: 2 }], "normal", activeScope, "Ended assignment should not contribute to current workload."),
  config("assignment-west-001", 30, [{ day: "monday", period: 3 }], "high", secondTenantScope),
];

export const mockStaffAvailabilityRules: StaffAvailabilityRule[] = [
  availability("availability-staff-001-mon-1", "staff-001", "monday", 1, "preferred", "Prefers first period for senior mathematics."),
  availability("availability-staff-002-tue-3", "staff-002", "tuesday", 3, "available"),
  availability("availability-staff-009-thu-2", "staff-009", "thursday", 2, "unavailable", "Administrative duty during this period."),
  availability("availability-west-001-mon-3", "staff-west-001", "monday", 3, "available", undefined, secondTenantScope),
];

function expected(staffId: string, expectedWeeklyPeriods?: number, notes?: string, scope = activeScope): StaffExpectedWorkload {
  return { ...scope, staffId, period: "weekly", expectedWeeklyPeriods, notes, updatedAt: "2026-08-01T09:00:00+05:30" };
}

function config(
  assignmentId: string,
  weeklyPeriods: number | undefined,
  slots: AssignmentWorkloadConfig["slots"],
  schedulingPriority: AssignmentWorkloadConfig["schedulingPriority"] = "normal",
  scope = activeScope,
  notes?: string,
): AssignmentWorkloadConfig {
  return {
    ...scope,
    assignmentId,
    weeklyPeriods,
    contributesToWorkload: true,
    schedulingPriority,
    slots,
    notes,
    updatedAt: "2026-08-01T09:00:00+05:30",
  };
}

function availability(
  id: string,
  staffId: string,
  day: StaffAvailabilityRule["day"],
  period: number,
  state: StaffAvailabilityRule["state"],
  notes?: string,
  scope = activeScope,
): StaffAvailabilityRule {
  return { ...scope, id, staffId, day, period, state, notes, updatedAt: "2026-08-01T09:00:00+05:30" };
}
