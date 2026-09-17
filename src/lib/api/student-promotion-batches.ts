import { ApiError } from "@/lib/api/client";
import { studentPromotionService } from "@/lib/api/student-promotions";
import {
  studentPromotionBatchPrepareSchema,
  studentPromotionBatchSelectionSchema,
} from "@/features/student-promotions/schemas/student-promotion-batch.schema";
import {
  applyProjectedCapacity,
  buildPromotionBatchGroups,
  summarizePromotionBatchCandidates,
} from "@/features/student-promotions/services/student-promotion-batch-rules";
import type {
  StudentPromotionBatchCandidate,
  StudentPromotionBatchPrepareInput,
  StudentPromotionBatchPreview,
  StudentPromotionBatchResult,
  StudentPromotionBatchSelection,
} from "@/features/student-promotions/types/student-promotion-batch";

export const studentPromotionBatchService = {
  validateBatchSelection(selection: StudentPromotionBatchSelection) {
    return studentPromotionBatchSelectionSchema.parse(selection);
  },

  async getBatchPreview(selection: StudentPromotionBatchSelection): Promise<StudentPromotionBatchPreview> {
    const parsed = studentPromotionBatchSelectionSchema.parse(selection);
    const candidates = applyProjectedCapacity(await buildCandidates(parsed));
    return {
      batchId: createBatchId(),
      generatedAt: new Date().toISOString(),
      status: candidates.some((candidate) => candidate.readiness === "stale") ? "stale" : candidates.some((candidate) => candidate.readiness !== "eligible") ? "requires_review" : "previewed",
      candidates,
      groups: buildPromotionBatchGroups(candidates),
      summary: summarizePromotionBatchCandidates(candidates),
    };
  },

  async preparePromotionRecords(input: StudentPromotionBatchPrepareInput): Promise<StudentPromotionBatchResult> {
    const parsed = studentPromotionBatchPrepareSchema.parse(input);
    const preview = await this.getBatchPreview(parsed);
    const createdPromotionIds: string[] = [];
    const skippedRecords: StudentPromotionBatchResult["skippedRecords"] = [];

    for (const candidate of preview.candidates) {
      if (candidate.readiness !== "eligible" || !candidate.studentId || !candidate.targetClassId || !candidate.targetSectionId) {
        skippedRecords.push({
          candidateId: candidate.candidateId,
          reason: candidate.exclusionReason ?? "Candidate is not eligible for promotion preparation.",
          status: candidate.readiness,
        });
        continue;
      }

      try {
        const promotion = await studentPromotionService.createPromotion({
          tenantId: parsed.tenantId,
          schoolId: parsed.schoolId,
          campusId: parsed.campusId,
          academicYearId: parsed.sourceAcademicYearId,
          studentId: candidate.studentId,
          sourceAcademicYearId: parsed.sourceAcademicYearId,
          targetAcademicYearId: parsed.targetAcademicYearId,
          targetClassId: candidate.targetClassId,
          targetSectionId: candidate.targetSectionId,
          reason: "annual_promotion",
          notes: parsed.reason,
          proposedBy: parsed.requestedBy,
          promotionSource: "bulk_preparation",
          batchCorrelationId: preview.batchId,
        });
        createdPromotionIds.push(promotion.id);
      } catch (error) {
        skippedRecords.push({
          candidateId: candidate.candidateId,
          reason: error instanceof ApiError ? error.message : "Promotion record could not be prepared after revalidation.",
          status: "stale",
        });
      }
    }

    return {
      batchId: preview.batchId,
      selectedCount: preview.summary.selectedCount,
      preparedCount: createdPromotionIds.length,
      skippedCount: skippedRecords.length,
      alreadyPreparedCount: skippedRecords.filter((record) => record.status === "already_prepared").length,
      alreadyPromotedCount: skippedRecords.filter((record) => record.status === "already_promoted").length,
      staleCount: skippedRecords.filter((record) => record.status === "stale").length,
      capacityConflictCount: skippedRecords.filter((record) => record.status === "capacity_conflict").length,
      createdPromotionIds,
      skippedRecords,
    };
  },
};

async function buildCandidates(selection: StudentPromotionBatchSelection): Promise<StudentPromotionBatchCandidate[]> {
  const response = await studentPromotionService.getPromotions({ ...selection, academicYearId: selection.sourceAcademicYearId }, {
    sourceAcademicYearId: selection.sourceAcademicYearId,
    targetAcademicYearId: selection.targetAcademicYearId,
    page: 1,
    pageSize: 100,
  });
  const promotionById = new Map(response.items.map((promotion) => [promotion.id, promotion]));

  return selection.candidateIds.map((candidateId) => {
    const promotion = promotionById.get(candidateId);
    if (!promotion) {
      return {
        candidateId,
        readiness: "stale",
        currentOccupancy: undefined,
        exclusionReason: "Candidate could not be found during revalidation.",
      };
    }

    const failedCheck = promotion.validation.checks.find((check) => check.status === "failed");
    const capacityCheck = promotion.validation.checks.find((check) => check.key === "capacity" && check.status === "failed");
    let readiness: StudentPromotionBatchCandidate["readiness"] = "eligible";
    let exclusionReason = promotion.validation.requiresReview ? "Candidate requires individual review." : undefined;
    if (promotion.status === "promoted") readiness = "already_promoted";
    else if (["pending", "eligible", "requires_review"].includes(promotion.status)) readiness = promotion.status === "eligible" ? "eligible" : "already_prepared";
    if (capacityCheck) readiness = "capacity_conflict";
    else if (failedCheck?.key === "target-duplicate") readiness = "duplicate_target_placement";
    else if (failedCheck?.key?.startsWith("source")) readiness = "invalid_source";
    else if (failedCheck?.key?.startsWith("target")) readiness = "invalid_target";
    else if (!promotion.validation.valid && readiness === "eligible") readiness = "requires_review";
    if (readiness !== "eligible") exclusionReason = failedCheck?.message ?? exclusionReason ?? "Candidate is not eligible for bulk preparation.";

    const capacityMatch = promotion.validation.checks.find((check) => check.key === "capacity")?.message.match(/(\d+)\/(\d+)/);
    const currentOccupancy = capacityMatch ? Number(capacityMatch[1]) : undefined;
    const targetSectionCapacity = capacityMatch ? Number(capacityMatch[2]) : undefined;

    return {
      candidateId,
      promotionId: promotion.id,
      studentId: promotion.studentId,
      studentName: promotion.studentName,
      admissionNumber: promotion.admissionNumber,
      sourceAcademicYearId: promotion.sourceAcademicYearId,
      sourceClassId: promotion.sourceClassId,
      sourceClassName: promotion.sourceClassName,
      sourceSectionId: promotion.sourceSectionId,
      sourceSectionName: promotion.sourceSectionName,
      targetAcademicYearId: promotion.targetAcademicYearId,
      targetClassId: promotion.targetClassId,
      targetClassName: promotion.targetClassName,
      targetSectionId: promotion.targetSectionId,
      targetSectionName: promotion.targetSectionName,
      targetSectionCapacity,
      currentOccupancy,
      readiness,
      exclusionReason,
      existingPromotionStatus: promotion.status,
    };
  });
}

function createBatchId() {
  return `promotion-batch-${Date.now()}`;
}
