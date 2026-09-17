import type {
  StudentPromotionBatchCandidate,
  StudentPromotionBatchGroup,
  StudentPromotionBatchSummary,
} from "@/features/student-promotions/types/student-promotion-batch";

export function summarizePromotionBatchCandidates(candidates: StudentPromotionBatchCandidate[]): StudentPromotionBatchSummary {
  return {
    selectedCount: candidates.length,
    eligibleCount: count(candidates, "eligible"),
    requiresReviewCount: count(candidates, "requires_review"),
    blockedCount: candidates.filter((candidate) => ["blocked", "invalid_source", "invalid_target", "target_unavailable", "duplicate_target_placement"].includes(candidate.readiness)).length,
    capacityConflictCount: count(candidates, "capacity_conflict"),
    staleCount: count(candidates, "stale"),
    alreadyPreparedCount: count(candidates, "already_prepared"),
    alreadyPromotedCount: count(candidates, "already_promoted"),
  };
}

export function buildPromotionBatchGroups(candidates: StudentPromotionBatchCandidate[]): StudentPromotionBatchGroup[] {
  const groups = new Map<string, StudentPromotionBatchCandidate[]>();
  candidates
    .filter((candidate) => candidate.targetClassId && candidate.targetSectionId)
    .forEach((candidate) => {
      const key = [candidate.targetAcademicYearId, candidate.targetClassId, candidate.targetSectionId].join(":");
      groups.set(key, [...(groups.get(key) ?? []), candidate]);
    });

  return Array.from(groups.values()).map((items) => {
    const first = items[0];
    return {
      targetAcademicYearId: first?.targetAcademicYearId,
      targetClassId: first?.targetClassId,
      targetClassName: first?.targetClassName,
      targetSectionId: first?.targetSectionId,
      targetSectionName: first?.targetSectionName,
      candidateCount: items.length,
      projectedOccupancy: first?.projectedOccupancy,
      capacity: first?.targetSectionCapacity,
    };
  });
}

export function applyProjectedCapacity(candidates: StudentPromotionBatchCandidate[]) {
  const targetCounts = new Map<string, number>();
  candidates.forEach((candidate) => {
    if (candidate.targetSectionId) targetCounts.set(candidate.targetSectionId, (targetCounts.get(candidate.targetSectionId) ?? 0) + 1);
  });

  return candidates.map((candidate) => {
    const selectedForTarget = candidate.targetSectionId ? targetCounts.get(candidate.targetSectionId) ?? 0 : 0;
    const projectedOccupancy = candidate.currentOccupancy === undefined ? undefined : candidate.currentOccupancy + selectedForTarget;
    if (
      candidate.readiness === "eligible" &&
      candidate.targetSectionCapacity !== undefined &&
      projectedOccupancy !== undefined &&
      projectedOccupancy > candidate.targetSectionCapacity
    ) {
      return {
        ...candidate,
        selectedForTarget,
        projectedOccupancy,
        readiness: "capacity_conflict" as const,
        exclusionReason: `Projected occupancy ${projectedOccupancy}/${candidate.targetSectionCapacity} exceeds target section capacity.`,
      };
    }
    return { ...candidate, selectedForTarget, projectedOccupancy };
  });
}

function count(candidates: StudentPromotionBatchCandidate[], status: StudentPromotionBatchCandidate["readiness"]) {
  return candidates.filter((candidate) => candidate.readiness === status).length;
}
