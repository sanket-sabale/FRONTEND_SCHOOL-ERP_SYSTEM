import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { staffAcademicAssignmentService } from "@/lib/api/staff-academic-assignments";
import { staffService } from "@/lib/api/staff";
import { assignmentWorkloadConfigSchema, staffWorkloadFiltersSchema } from "@/features/staff-workload/schemas/staff-workload.schema";
import {
  calculateWorkload,
  canStaffCarryAcademicWorkload,
  evaluateReadiness,
  formatSlot,
} from "@/features/staff-workload/services/staff-workload-rules";
import {
  mockAssignmentWorkloadConfigs,
  mockStaffAvailabilityRules,
  mockStaffExpectedWorkloads,
} from "@/features/staff-workload/services/mock-staff-workload";
import type { StaffStatus } from "@/features/staff/types/staff";
import type { StaffAcademicAssignmentListItem } from "@/features/staff-academic-assignments/types/staff-academic-assignment";
import type {
  AssignmentWorkloadConfig,
  AssignmentWorkloadConfigInput,
  StaffAvailabilityRule,
  StaffWorkloadDetail,
  StaffWorkloadFilters,
  StaffWorkloadListResponse,
  StaffWorkloadRow,
  StaffWorkloadSummary,
  WorkloadConflict,
} from "@/features/staff-workload/types/staff-workload";

let workloadConfigs = [...mockAssignmentWorkloadConfigs];
const expectedWorkloads = [...mockStaffExpectedWorkloads];
const availabilityRules = [...mockStaffAvailabilityRules];

export const staffWorkloadService = {
  async listWorkloads(scope: TenantScopedQuery, filters: StaffWorkloadFilters = {}): Promise<StaffWorkloadListResponse> {
    const parsed = staffWorkloadFiltersSchema.parse(filters);
    const rows = await buildWorkloadRows(scope);
    const query = parsed.query?.toLowerCase();
    const filtered = rows
      .filter((row) => !query || [row.staffName, row.employeeNumber, row.departmentName, row.designationName, row.calculation.status, row.readiness.status].join(" ").toLowerCase().includes(query))
      .filter((row) => !parsed.status || row.calculation.status === parsed.status)
      .filter((row) => !parsed.readiness || row.readiness.status === parsed.readiness)
      .filter((row) => !parsed.department || row.departmentName === parsed.department)
      .filter((row) => !parsed.designation || row.designationName === parsed.designation)
      .sort((first, second) => compareRows(first, second, parsed.sortBy, parsed.sortDirection));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize));
    const start = (parsed.page - 1) * parsed.pageSize;
    return {
      items: filtered.slice(start, start + parsed.pageSize),
      summary: summarize(rows),
      total,
      page: parsed.page,
      pageSize: parsed.pageSize,
      totalPages,
    };
  },

  async getSummary(scope: TenantScopedQuery): Promise<StaffWorkloadSummary> {
    return summarize(await buildWorkloadRows(scope));
  },

  async getStaffWorkload(scope: TenantScopedQuery, staffId: string): Promise<StaffWorkloadDetail | null> {
    const staff = await staffService.getStaffById(scope, staffId);
    if (!staff) return null;
    const rows = await buildWorkloadRows(scope);
    const row = rows.find((item) => item.staffId === staffId);
    if (!row) return null;
    const assignments = await staffAcademicAssignmentService.getStaffAssignments(scope, staffId);
    const configs = scopedConfigs(scope);
    return {
      ...row,
      assignments: assignments.items.map((assignment) => ({ ...assignment, workloadConfig: configs.find((config) => config.assignmentId === assignment.id) })),
      availability: scopedAvailability(scope).filter((item) => item.staffId === staffId),
      conflictsList: detectConflicts(scope, assignments.items, configs, scopedAvailability(scope)).filter((conflict) => conflict.staffId === staffId || conflict.assignmentIds.some((id) => assignments.items.some((assignment) => assignment.id === id))),
    };
  },

  async configureAssignmentWorkload(input: AssignmentWorkloadConfigInput): Promise<AssignmentWorkloadConfig> {
    const parsed = assignmentWorkloadConfigSchema.parse(input);
    const assignment = await staffAcademicAssignmentService.getAssignment(parsed, parsed.assignmentId);
    if (!assignment) throw new ApiError(404, "Academic assignment could not be found.");
    if (assignment.academicYearId !== parsed.academicYearId) throw new ApiError(422, "Assignment does not belong to the selected academic year.");
    const now = new Date().toISOString();
    const existing = workloadConfigs.find((config) => config.assignmentId === parsed.assignmentId && isSameScope(config, parsed));
    const next: AssignmentWorkloadConfig = {
      ...(existing ?? { tenantId: parsed.tenantId, schoolId: parsed.schoolId, campusId: parsed.campusId, academicYearId: parsed.academicYearId, assignmentId: parsed.assignmentId, slots: [] }),
      weeklyPeriods: parsed.weeklyPeriods,
      contributesToWorkload: parsed.contributesToWorkload,
      schedulingPriority: parsed.schedulingPriority,
      notes: parsed.notes,
      updatedAt: now,
    };
    workloadConfigs = existing
      ? workloadConfigs.map((config) => config.assignmentId === next.assignmentId && isSameScope(config, next) ? next : config)
      : [next, ...workloadConfigs];
    return { ...next };
  },

  async getAssignmentWorkloadConfig(scope: TenantScopedQuery, assignmentId: string) {
    const assignment = await staffAcademicAssignmentService.getAssignment(scope, assignmentId);
    if (!assignment) return null;
    return scopedConfigs(scope).find((config) => config.assignmentId === assignmentId) ?? null;
  },
};

async function buildWorkloadRows(scope: TenantScopedQuery): Promise<StaffWorkloadRow[]> {
  const [staffResponse, assignmentResponse] = await Promise.all([
    staffService.listStaff(scope, { page: 1, pageSize: 100 }),
    staffAcademicAssignmentService.listAssignments(scope, { page: 1, pageSize: 100, status: "active" }),
  ]);
  const configs = scopedConfigs(scope);
  const availability = scopedAvailability(scope);
  const conflicts = detectConflicts(scope, assignmentResponse.items, configs, availability);

  return staffResponse.items.filter((staff) => staff.staffCategory === "teaching" || assignmentResponse.items.some((assignment) => assignment.staffId === staff.id)).map((staff) => {
    const staffAssignments = assignmentResponse.items.filter((assignment) => assignment.staffId === staff.id);
    const activeConfigs = staffAssignments
      .map((assignment) => configs.find((config) => config.assignmentId === assignment.id))
      .filter((config): config is AssignmentWorkloadConfig => Boolean(config?.contributesToWorkload));
    const assignedWeeklyPeriods = activeConfigs.reduce((total, config) => total + (config.weeklyPeriods ?? 0), 0);
    const missingConfiguredAssignments = staffAssignments.filter((assignment) => {
      const config = configs.find((item) => item.assignmentId === assignment.id);
      return !config || config.weeklyPeriods === undefined;
    }).length;
    const expected = scopedExpected(scope).find((item) => item.staffId === staff.id);
    const calculation = calculateWorkload(expected?.expectedWeeklyPeriods, assignedWeeklyPeriods);
    const staffConflicts = conflicts.filter((conflict) => conflict.staffId === staff.id || conflict.assignmentIds.some((id) => staffAssignments.some((assignment) => assignment.id === id)));
    const readiness = evaluateReadiness({
      calculation,
      conflicts: staffConflicts,
      missingConfiguredAssignments,
      staffStatus: staff.status as StaffStatus,
    });
    if (staffAssignments.length > 0 && !canStaffCarryAcademicWorkload(staff.status as StaffStatus)) {
      readiness.blockers.push("Active academic assignment exists for a staff lifecycle state that requires review.");
    }
    return {
      staffId: staff.id,
      staffName: staff.displayName,
      employeeNumber: staff.employeeNumber,
      departmentName: staff.departmentName,
      designationName: staff.designationName,
      staffCategory: staff.staffCategory,
      staffStatus: staff.status,
      activeAssignments: staffAssignments.length,
      missingConfiguredAssignments,
      conflicts: staffConflicts.length,
      calculation,
      readiness,
    };
  });
}

function detectConflicts(scope: TenantScopedQuery, assignments: StaffAcademicAssignmentListItem[], configs: AssignmentWorkloadConfig[], availability: StaffAvailabilityRule[]): WorkloadConflict[] {
  const conflicts: WorkloadConflict[] = [];
  const activeAssignments = assignments.filter((assignment) => assignment.status === "active" && isSameScope(assignment, scope));
  const configByAssignment = new Map(configs.map((config) => [config.assignmentId, config]));

  activeAssignments.forEach((assignment) => {
    const config = configByAssignment.get(assignment.id);
    if (!config || config.weeklyPeriods === undefined) {
      conflicts.push({
        id: `missing-${assignment.id}`,
        type: "missing_workload_configuration",
        severity: "warning",
        message: `${assignment.subjectName} for ${assignment.className} / ${assignment.sectionName} is missing weekly-period configuration.`,
        staffId: assignment.staffId,
        assignmentIds: [assignment.id],
      });
    }
  });

  activeAssignments.forEach((assignment, index) => {
    const config = configByAssignment.get(assignment.id);
    if (!config) return;
    config.slots.forEach((slot) => {
      const unavailable = availability.find((rule) => rule.staffId === assignment.staffId && rule.day === slot.day && rule.period === slot.period && rule.state === "unavailable");
      if (unavailable) {
        conflicts.push({
          id: `unavailable-${assignment.id}-${slot.day}-${slot.period}`,
          type: "staff_unavailable",
          severity: "blocking",
          message: `${assignment.staffName} is unavailable during ${formatSlot(slot.day, slot.period)}.`,
          staffId: assignment.staffId,
          assignmentIds: [assignment.id],
          slot,
        });
      }

      activeAssignments.slice(index + 1).forEach((other) => {
        const otherConfig = configByAssignment.get(other.id);
        if (!otherConfig?.slots.some((otherSlot) => otherSlot.day === slot.day && otherSlot.period === slot.period)) return;
        if (other.staffId === assignment.staffId) {
          conflicts.push({
            id: `staff-${assignment.id}-${other.id}-${slot.day}-${slot.period}`,
            type: "staff_double_booking",
            severity: "blocking",
            message: `${assignment.staffName} has two academic assignments during ${formatSlot(slot.day, slot.period)}.`,
            staffId: assignment.staffId,
            assignmentIds: [assignment.id, other.id],
            slot,
          });
        }
        if (other.classId === assignment.classId && other.sectionId === assignment.sectionId) {
          conflicts.push({
            id: `section-${assignment.id}-${other.id}-${slot.day}-${slot.period}`,
            type: "class_section_double_booking",
            severity: "blocking",
            message: `${assignment.className} / ${assignment.sectionName} has overlapping academic responsibilities during ${formatSlot(slot.day, slot.period)}.`,
            assignmentIds: [assignment.id, other.id],
            classId: assignment.classId,
            sectionId: assignment.sectionId,
            slot,
          });
        }
      });
    });
  });

  return conflicts;
}

function summarize(rows: StaffWorkloadRow[]): StaffWorkloadSummary {
  return {
    totalTeachingStaff: rows.filter((row) => row.staffCategory === "teaching").length,
    workloadConfigured: rows.filter((row) => row.calculation.status !== "not_configured").length,
    balanced: rows.filter((row) => row.calculation.status === "balanced").length,
    underAssigned: rows.filter((row) => row.calculation.status === "under_assigned").length,
    nearCapacity: rows.filter((row) => row.calculation.status === "near_capacity").length,
    overloaded: rows.filter((row) => row.calculation.status === "overloaded").length,
    schedulingConflicts: rows.reduce((total, row) => total + row.conflicts, 0),
    assignmentGaps: rows.reduce((total, row) => total + row.missingConfiguredAssignments, 0),
    ready: rows.filter((row) => row.readiness.status === "ready").length,
    needsConfiguration: rows.filter((row) => row.readiness.status === "needs_configuration").length,
    hasWarnings: rows.filter((row) => row.readiness.status === "has_warnings").length,
    blocked: rows.filter((row) => row.readiness.status === "blocked").length,
  };
}

function scopedConfigs(scope: TenantScopedQuery) {
  return workloadConfigs.filter((config) => isSameScope(config, scope));
}

function scopedExpected(scope: TenantScopedQuery) {
  return expectedWorkloads.filter((workload) => isSameScope(workload, scope));
}

function scopedAvailability(scope: TenantScopedQuery) {
  return availabilityRules.filter((rule) => isSameScope(rule, scope));
}

function compareRows(first: StaffWorkloadRow, second: StaffWorkloadRow, sortBy: NonNullable<StaffWorkloadFilters["sortBy"]>, direction: "asc" | "desc") {
  const firstValue = rowSortValue(first, sortBy);
  const secondValue = rowSortValue(second, sortBy);
  const result = typeof firstValue === "number" && typeof secondValue === "number"
    ? firstValue - secondValue
    : String(firstValue).localeCompare(String(secondValue), "en-IN", { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

function rowSortValue(row: StaffWorkloadRow, sortBy: NonNullable<StaffWorkloadFilters["sortBy"]>) {
  if (sortBy === "assignedWeeklyPeriods") return row.calculation.assignedWeeklyPeriods;
  if (sortBy === "expectedWeeklyPeriods") return row.calculation.expectedWeeklyPeriods ?? -1;
  if (sortBy === "utilizationPercentage") return row.calculation.utilizationPercentage ?? -1;
  if (sortBy === "status") return row.calculation.status;
  if (sortBy === "readiness") return row.readiness.status;
  return row.staffName;
}

function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId && record.academicYearId === scope.academicYearId;
}
