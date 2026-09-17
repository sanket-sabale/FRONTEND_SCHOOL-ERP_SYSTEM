import type { AttendanceSnapshotIntegrityResult } from "@/features/attendance/types/attendance-integrity";
import type { AttendanceSnapshotRepairRequest } from "@/features/attendance/types/attendance-repair";
import type { AttendanceRecord } from "@/features/attendance/types/attendance";

export type RepairRuleResult = { valid: true } | { valid: false; message: string };

const repairEligibleStatuses = new Set([
  "missing_snapshot",
  "invalid_class",
  "invalid_section",
  "class_section_mismatch",
  "academic_year_mismatch",
]);

export function validateRepairRequestEligibility(result: AttendanceSnapshotIntegrityResult): RepairRuleResult {
  if (!repairEligibleStatuses.has(result.status)) {
    return { valid: false, message: "This attendance snapshot is not eligible for controlled repair." };
  }

  if (!result.repairPlan.proposedSnapshot?.classId || !result.repairPlan.proposedSnapshot.sectionId || !result.repairPlan.proposedSnapshot.academicYearId) {
    return { valid: false, message: "A deterministic proposed snapshot is required before a repair request can be created." };
  }

  if (result.status === "unresolved" || result.repairPlan.requiresManualReview && !result.repairPlan.proposedSnapshot) {
    return { valid: false, message: "Unresolved or ambiguous placement evidence requires manual review outside controlled repair." };
  }

  return { valid: true };
}

export function validateNoActiveRepairRequest(requests: AttendanceSnapshotRepairRequest[], attendanceId: string): RepairRuleResult {
  const active = requests.find((request) =>
    request.attendanceId === attendanceId &&
    ["pending_review", "approved", "requires_manual_review"].includes(request.status),
  );
  if (active) return { valid: false, message: "An active repair request already exists for this attendance record." };
  return { valid: true };
}

export function validateRepairCanApprove(request: AttendanceSnapshotRepairRequest): RepairRuleResult {
  if (request.status !== "pending_review") return { valid: false, message: "Only pending repair requests can be approved." };
  return { valid: true };
}

export function validateRepairCanReject(request: AttendanceSnapshotRepairRequest, comment?: string): RepairRuleResult {
  if (request.status !== "pending_review") return { valid: false, message: "Only pending repair requests can be rejected." };
  if (!comment || comment.trim().length < 8) return { valid: false, message: "Rejection requires a review comment of at least 8 characters." };
  return { valid: true };
}

export function validateRepairCanApply(request: AttendanceSnapshotRepairRequest): RepairRuleResult {
  if (request.status === "applied") return { valid: false, message: "This repair has already been applied." };
  if (request.status !== "approved") return { valid: false, message: "Only approved repair requests can be applied." };
  return { valid: true };
}

export function validateSnapshotStillMatchesReview(record: AttendanceRecord, request: AttendanceSnapshotRepairRequest): RepairRuleResult {
  if (
    normalize(record.academicYearId) !== normalize(request.currentSnapshot.academicYearId) ||
    normalize(record.classId) !== normalize(request.currentSnapshot.classId) ||
    normalize(record.sectionId) !== normalize(request.currentSnapshot.sectionId)
  ) {
    return { valid: false, message: "Attendance snapshot changed after review. Repair requires a new request." };
  }

  return { valid: true };
}

function normalize(value?: string) {
  return value || "";
}
