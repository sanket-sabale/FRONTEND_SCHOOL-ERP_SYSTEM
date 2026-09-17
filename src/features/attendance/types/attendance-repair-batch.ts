import type { TenantScopedQuery } from "@/lib/api/client";
import type { AttendanceAcademicSnapshot, AttendanceSnapshotIntegrityStatus } from "@/features/attendance/types/attendance-integrity";
import type { AttendanceRepairStatus } from "@/features/attendance/types/attendance-repair";

export const maxAttendanceRepairBatchSelection = 100;

export const attendanceRepairBatchCandidateStatuses = [
  "eligible",
  "warning",
  "excluded",
  "already_valid",
  "already_requested",
  "already_repaired",
  "stale",
] as const;

export type AttendanceRepairBatchCandidateStatus = (typeof attendanceRepairBatchCandidateStatuses)[number];

export type AttendanceRepairBatchSelection = TenantScopedQuery & {
  attendanceIds: string[];
};

export type AttendanceRepairBatchCandidate = {
  attendanceId: string;
  studentId?: string;
  studentName?: string;
  admissionNumber?: string;
  attendanceDate?: string;
  integrityStatus?: AttendanceSnapshotIntegrityStatus;
  currentSnapshot: AttendanceAcademicSnapshot;
  proposedSnapshot?: AttendanceAcademicSnapshot;
  evidenceSource: "stored_snapshot" | "resolved_placement" | "none";
  eligibility: AttendanceRepairBatchCandidateStatus;
  exclusionReason?: string;
  existingRepairId?: string;
  existingRepairStatus?: AttendanceRepairStatus;
};

export type AttendanceRepairBatchSummary = {
  selectedCount: number;
  eligibleCount: number;
  excludedCount: number;
  alreadyValidCount: number;
  alreadyRequestedCount: number;
  alreadyRepairedCount: number;
  unresolvedCount: number;
  warningCount: number;
  staleCount: number;
  deterministicRepairCount: number;
};

export type AttendanceRepairBatchGroup = {
  academicYearId?: string;
  academicYearName?: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  attendanceRecordCount: number;
  studentCount: number;
  dateFrom?: string;
  dateTo?: string;
  integrityStatuses: AttendanceSnapshotIntegrityStatus[];
};

export type AttendanceRepairBatchPreview = {
  batchId: string;
  generatedAt: string;
  candidates: AttendanceRepairBatchCandidate[];
  groups: AttendanceRepairBatchGroup[];
  summary: AttendanceRepairBatchSummary;
};

export type AttendanceRepairBatchSkippedRecord = {
  attendanceId: string;
  reason: string;
  status: AttendanceRepairBatchCandidateStatus;
};

export type AttendanceRepairBatchResult = {
  batchId: string;
  selectedCount: number;
  preparedCount: number;
  skippedCount: number;
  alreadyValidCount: number;
  alreadyRequestedCount: number;
  staleCount: number;
  unresolvedCount: number;
  createdRepairIds: string[];
  skippedRecords: AttendanceRepairBatchSkippedRecord[];
};

export type AttendanceRepairBatchPrepareInput = AttendanceRepairBatchSelection & {
  requestedBy: string;
  reason: string;
};
