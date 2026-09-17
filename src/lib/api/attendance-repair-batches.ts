import { ApiError } from "@/lib/api/client";
import { attendanceIntegrityService } from "@/lib/api/attendance-integrity";
import { attendanceRepairService } from "@/lib/api/attendance-repairs";
import {
  attendanceRepairBatchPrepareSchema,
  attendanceRepairBatchSelectionSchema,
} from "@/features/attendance/schemas/attendance-repair-batch.schema";
import { buildBatchCandidate, summarizeBatchCandidates } from "@/features/attendance/services/attendance-repair-batch-rules";
import type {
  AttendanceRepairBatchCandidate,
  AttendanceRepairBatchGroup,
  AttendanceRepairBatchPrepareInput,
  AttendanceRepairBatchPreview,
  AttendanceRepairBatchResult,
  AttendanceRepairBatchSelection,
} from "@/features/attendance/types/attendance-repair-batch";

export const attendanceRepairBatchService = {
  validateBatchSelection(selection: AttendanceRepairBatchSelection) {
    return attendanceRepairBatchSelectionSchema.parse(selection);
  },

  async getBatchPreview(selection: AttendanceRepairBatchSelection): Promise<AttendanceRepairBatchPreview> {
    const parsedSelection = attendanceRepairBatchSelectionSchema.parse(selection);
    const candidates = await buildCandidates(parsedSelection);
    return {
      batchId: createBatchId(),
      generatedAt: new Date().toISOString(),
      candidates,
      groups: buildGroups(candidates),
      summary: summarizeBatchCandidates(candidates),
    };
  },

  async prepareRepairRequests(input: AttendanceRepairBatchPrepareInput): Promise<AttendanceRepairBatchResult> {
    const parsedInput = attendanceRepairBatchPrepareSchema.parse(input);
    const preview = await this.getBatchPreview(parsedInput);
    const createdRepairIds: string[] = [];
    const skippedRecords: AttendanceRepairBatchResult["skippedRecords"] = [];

    for (const candidate of preview.candidates) {
      if (candidate.eligibility !== "eligible") {
        skippedRecords.push({
          attendanceId: candidate.attendanceId,
          reason: candidate.exclusionReason ?? "Record is not eligible for repair request preparation.",
          status: candidate.eligibility,
        });
        continue;
      }

      try {
        const request = await attendanceRepairService.createRepairRequest({
          tenantId: parsedInput.tenantId,
          schoolId: parsedInput.schoolId,
          campusId: parsedInput.campusId,
          academicYearId: parsedInput.academicYearId,
          attendanceId: candidate.attendanceId,
          requestedBy: parsedInput.requestedBy,
          reason: parsedInput.reason,
          source: "bulk_preparation",
          batchCorrelationId: preview.batchId,
        });
        createdRepairIds.push(request.id);
      } catch (error) {
        skippedRecords.push({
          attendanceId: candidate.attendanceId,
          reason: error instanceof ApiError ? error.message : "Repair request could not be prepared after revalidation.",
          status: "stale",
        });
      }
    }

    return {
      batchId: preview.batchId,
      selectedCount: preview.summary.selectedCount,
      preparedCount: createdRepairIds.length,
      skippedCount: skippedRecords.length,
      alreadyValidCount: skippedRecords.filter((record) => record.status === "already_valid").length,
      alreadyRequestedCount: skippedRecords.filter((record) => record.status === "already_requested" || record.status === "already_repaired").length,
      staleCount: skippedRecords.filter((record) => record.status === "stale").length,
      unresolvedCount: skippedRecords.filter((record) => record.status === "excluded").length,
      createdRepairIds,
      skippedRecords,
    };
  },
};

async function buildCandidates(scope: AttendanceRepairBatchSelection): Promise<AttendanceRepairBatchCandidate[]> {
  const candidates = await Promise.all(scope.attendanceIds.map(async (attendanceId) => {
    const [integrity, repair] = await Promise.all([
      attendanceIntegrityService.getAttendanceSnapshotIntegrityDetail(scope, attendanceId),
      attendanceRepairService.getRepairRequestForAttendance(scope, attendanceId),
    ]);
    const candidate = buildBatchCandidate(integrity, repair);
    return integrity ? candidate : { ...candidate, attendanceId };
  }));

  return candidates;
}

function buildGroups(candidates: AttendanceRepairBatchCandidate[]): AttendanceRepairBatchGroup[] {
  const groups = new Map<string, AttendanceRepairBatchCandidate[]>();
  candidates
    .filter((candidate) => candidate.eligibility === "eligible" && candidate.proposedSnapshot)
    .forEach((candidate) => {
      const snapshot = candidate.proposedSnapshot;
      const key = [snapshot?.academicYearId, snapshot?.classId, snapshot?.sectionId].join(":");
      groups.set(key, [...(groups.get(key) ?? []), candidate]);
    });

  return Array.from(groups.values()).map((items) => {
    const first = items[0]?.proposedSnapshot;
    const dates = items.map((item) => item.attendanceDate).filter((date): date is string => Boolean(date)).sort();
    return {
      academicYearId: first?.academicYearId,
      academicYearName: first?.academicYearName,
      classId: first?.classId,
      className: first?.className,
      sectionId: first?.sectionId,
      sectionName: first?.sectionName,
      attendanceRecordCount: items.length,
      studentCount: new Set(items.map((item) => item.studentId).filter(Boolean)).size,
      dateFrom: dates[0],
      dateTo: dates.at(-1),
      integrityStatuses: Array.from(new Set(items.map((item) => item.integrityStatus).filter((status): status is NonNullable<typeof status> => Boolean(status)))),
    };
  });
}

function createBatchId() {
  return `batch-preview-${Date.now()}`;
}
