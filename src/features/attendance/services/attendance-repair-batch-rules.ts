import type { AttendanceRepairBatchCandidate, AttendanceRepairBatchSummary } from "@/features/attendance/types/attendance-repair-batch";
import type { AttendanceSnapshotIntegrityResult } from "@/features/attendance/types/attendance-integrity";
import type { AttendanceSnapshotRepairRequest } from "@/features/attendance/types/attendance-repair";
import { validateRepairRequestEligibility } from "@/features/attendance/services/attendance-repair-rules";

const activeRepairStatuses = new Set(["pending_review", "approved", "requires_manual_review"]);

export function buildBatchCandidate(
  integrity: AttendanceSnapshotIntegrityResult | null,
  existingRepair?: AttendanceSnapshotRepairRequest | null,
): AttendanceRepairBatchCandidate {
  if (!integrity) {
    return {
      attendanceId: "unknown",
      currentSnapshot: {},
      evidenceSource: "none",
      eligibility: "excluded",
      exclusionReason: "Attendance record could not be resolved in the current scope.",
    };
  }

  const base = {
    attendanceId: integrity.attendanceId,
    studentId: integrity.studentId,
    studentName: integrity.studentName,
    admissionNumber: integrity.admissionNumber,
    attendanceDate: integrity.attendanceDate,
    integrityStatus: integrity.status,
    currentSnapshot: integrity.storedSnapshot,
    proposedSnapshot: integrity.repairPlan.proposedSnapshot,
    evidenceSource: integrity.repairPlan.proposedSnapshot ? "resolved_placement" as const : "none" as const,
    existingRepairId: existingRepair?.id,
    existingRepairStatus: existingRepair?.status,
  };

  if (integrity.status === "valid" || integrity.status === "archived_structure_reference") {
    return {
      ...base,
      eligibility: "already_valid",
      exclusionReason: "Stored snapshot is already valid or historically readable.",
    };
  }

  if (existingRepair?.status === "applied") {
    return {
      ...base,
      eligibility: "already_repaired",
      exclusionReason: "A repair request has already been applied.",
    };
  }

  if (existingRepair && activeRepairStatuses.has(existingRepair.status)) {
    return {
      ...base,
      eligibility: "already_requested",
      exclusionReason: "An active repair request already exists.",
    };
  }

  const eligibility = validateRepairRequestEligibility(integrity);
  if (!eligibility.valid) {
    return {
      ...base,
      eligibility: integrity.status === "unresolved" ? "excluded" : "warning",
      exclusionReason: eligibility.message,
    };
  }

  return {
    ...base,
    eligibility: "eligible",
  };
}

export function summarizeBatchCandidates(candidates: AttendanceRepairBatchCandidate[]): AttendanceRepairBatchSummary {
  return {
    selectedCount: candidates.length,
    eligibleCount: count(candidates, "eligible"),
    excludedCount: candidates.filter((candidate) => ["excluded", "warning"].includes(candidate.eligibility)).length,
    alreadyValidCount: count(candidates, "already_valid"),
    alreadyRequestedCount: count(candidates, "already_requested"),
    alreadyRepairedCount: count(candidates, "already_repaired"),
    unresolvedCount: candidates.filter((candidate) => candidate.integrityStatus === "unresolved").length,
    warningCount: count(candidates, "warning"),
    staleCount: count(candidates, "stale"),
    deterministicRepairCount: candidates.filter((candidate) => candidate.eligibility === "eligible" && Boolean(candidate.proposedSnapshot)).length,
  };
}

function count(candidates: AttendanceRepairBatchCandidate[], status: AttendanceRepairBatchCandidate["eligibility"]) {
  return candidates.filter((candidate) => candidate.eligibility === status).length;
}
