import type { StaffStatus } from "@/features/staff/types/staff";
import type {
  SchedulingReadiness,
  StaffAvailabilityState,
  WorkloadCalculation,
  WorkloadConflict,
  WorkloadDay,
  WorkloadStatus,
} from "@/features/staff-workload/types/staff-workload";

export const workloadStatusLabels: Record<WorkloadStatus, string> = {
  not_configured: "Not configured",
  under_assigned: "Under assigned",
  balanced: "Balanced",
  near_capacity: "Near capacity",
  overloaded: "Overloaded",
};

export const readinessLabels: Record<SchedulingReadiness["status"], string> = {
  ready: "Ready",
  needs_configuration: "Needs configuration",
  has_warnings: "Has warnings",
  blocked: "Blocked",
};

export const availabilityLabels: Record<StaffAvailabilityState, string> = {
  available: "Available",
  unavailable: "Unavailable",
  preferred: "Preferred",
};

export const workloadDayLabels: Record<WorkloadDay, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export const workloadThresholds = {
  underAssignedBelow: 85,
  balancedFrom: 95,
  balancedTo: 105,
  nearCapacityTo: 115,
} as const;

export function calculateWorkload(expectedWeeklyPeriods: number | undefined, assignedWeeklyPeriods: number): WorkloadCalculation {
  if (!expectedWeeklyPeriods || expectedWeeklyPeriods <= 0) {
    return {
      expectedWeeklyPeriods,
      assignedWeeklyPeriods,
      overloadPeriods: 0,
      status: "not_configured",
    };
  }

  const utilizationPercentage = roundOne((assignedWeeklyPeriods / expectedWeeklyPeriods) * 100);
  const remainingCapacity = Math.max(0, expectedWeeklyPeriods - assignedWeeklyPeriods);
  const overloadPeriods = Math.max(0, assignedWeeklyPeriods - expectedWeeklyPeriods);

  return {
    expectedWeeklyPeriods,
    assignedWeeklyPeriods,
    utilizationPercentage,
    remainingCapacity,
    overloadPeriods,
    status: classifyWorkload(utilizationPercentage),
  };
}

export function classifyWorkload(utilizationPercentage: number): WorkloadStatus {
  if (utilizationPercentage < workloadThresholds.underAssignedBelow) return "under_assigned";
  if (utilizationPercentage >= workloadThresholds.balancedFrom && utilizationPercentage <= workloadThresholds.balancedTo) return "balanced";
  if (utilizationPercentage > workloadThresholds.nearCapacityTo) return "overloaded";
  return "near_capacity";
}

export function canStaffCarryAcademicWorkload(status: StaffStatus) {
  return status === "active" || status === "on_leave";
}

export function evaluateReadiness({
  calculation,
  conflicts,
  missingConfiguredAssignments,
  staffStatus,
}: {
  calculation: WorkloadCalculation;
  conflicts: WorkloadConflict[];
  missingConfiguredAssignments: number;
  staffStatus: StaffStatus;
}): SchedulingReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!canStaffCarryAcademicWorkload(staffStatus)) blockers.push("Staff lifecycle status is not eligible for active academic workload.");
  if (conflicts.some((conflict) => conflict.severity === "blocking")) blockers.push("Scheduling conflicts must be reviewed before timetable planning.");
  if (missingConfiguredAssignments > 0) warnings.push(`${missingConfiguredAssignments} active assignment${missingConfiguredAssignments === 1 ? "" : "s"} missing weekly-period configuration.`);
  if (calculation.status === "not_configured") warnings.push("Expected weekly workload is not configured.");
  if (calculation.status === "overloaded") warnings.push("Assigned weekly periods exceed expected workload.");
  if (calculation.status === "under_assigned") warnings.push("Assigned weekly periods are below expected workload.");

  if (blockers.length > 0) return { status: "blocked", warnings, blockers };
  if (calculation.status === "not_configured" || missingConfiguredAssignments > 0) return { status: "needs_configuration", warnings, blockers };
  if (warnings.length > 0 || calculation.status === "near_capacity") return { status: "has_warnings", warnings, blockers };
  return { status: "ready", warnings, blockers };
}

export function formatSlot(day: WorkloadDay, period: number) {
  return `${workloadDayLabels[day]} Period ${period}`;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}
