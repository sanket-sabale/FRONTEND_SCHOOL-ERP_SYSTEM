import type { StudentPromotionReadModel } from "@/features/student-promotions/types/student-promotion";
import type { TenantScopedQuery } from "@/lib/api/client";

export const maxStudentPromotionBatchSelection = 100;

export const studentPromotionBatchStatuses = ["draft", "previewed", "prepared", "stale", "requires_review"] as const;
export type StudentPromotionBatchStatus = (typeof studentPromotionBatchStatuses)[number];

export const studentPromotionBatchCandidateStatuses = [
  "eligible",
  "requires_review",
  "blocked",
  "already_promoted",
  "already_prepared",
  "stale",
  "target_unavailable",
  "capacity_conflict",
  "invalid_source",
  "invalid_target",
  "duplicate_target_placement",
] as const;
export type StudentPromotionBatchCandidateStatus = (typeof studentPromotionBatchCandidateStatuses)[number];

export type StudentPromotionBatchSelection = TenantScopedQuery & {
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  candidateIds: string[];
};

export type StudentPromotionBatchCandidate = {
  candidateId: string;
  promotionId?: string;
  studentId?: string;
  studentName?: string;
  admissionNumber?: string;
  sourceAcademicYearId?: string;
  sourceClassId?: string;
  sourceClassName?: string;
  sourceSectionId?: string;
  sourceSectionName?: string;
  targetAcademicYearId?: string;
  targetClassId?: string;
  targetClassName?: string;
  targetSectionId?: string;
  targetSectionName?: string;
  targetSectionCapacity?: number;
  currentOccupancy?: number;
  selectedForTarget?: number;
  projectedOccupancy?: number;
  readiness: StudentPromotionBatchCandidateStatus;
  exclusionReason?: string;
  existingPromotionStatus?: StudentPromotionReadModel["status"];
};

export type StudentPromotionBatchSummary = {
  selectedCount: number;
  eligibleCount: number;
  requiresReviewCount: number;
  blockedCount: number;
  capacityConflictCount: number;
  staleCount: number;
  alreadyPreparedCount: number;
  alreadyPromotedCount: number;
};

export type StudentPromotionBatchGroup = {
  targetAcademicYearId?: string;
  targetClassId?: string;
  targetClassName?: string;
  targetSectionId?: string;
  targetSectionName?: string;
  candidateCount: number;
  projectedOccupancy?: number;
  capacity?: number;
};

export type StudentPromotionBatchPreview = {
  batchId: string;
  generatedAt: string;
  status: StudentPromotionBatchStatus;
  candidates: StudentPromotionBatchCandidate[];
  groups: StudentPromotionBatchGroup[];
  summary: StudentPromotionBatchSummary;
};

export type StudentPromotionBatchSkippedRecord = {
  candidateId: string;
  reason: string;
  status: StudentPromotionBatchCandidateStatus;
};

export type StudentPromotionBatchResult = {
  batchId: string;
  selectedCount: number;
  preparedCount: number;
  skippedCount: number;
  alreadyPreparedCount: number;
  alreadyPromotedCount: number;
  staleCount: number;
  capacityConflictCount: number;
  createdPromotionIds: string[];
  skippedRecords: StudentPromotionBatchSkippedRecord[];
};

export type StudentPromotionBatchPrepareInput = StudentPromotionBatchSelection & {
  requestedBy: string;
  reason: string;
};
