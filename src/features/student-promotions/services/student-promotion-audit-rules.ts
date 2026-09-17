import type {
  StudentPromotionAuditEventType,
  StudentPromotionAuditRecord,
  StudentPromotionAuditSource,
  StudentPromotionAuditSummary,
  StudentPromotionAuditTimelineEvent,
  StudentPromotionValidationEvidence,
} from "@/features/student-promotions/types/student-promotion-audit";
import type { StudentPromotionValidationResult } from "@/features/student-promotions/types/student-promotion";

export function buildPromotionAuditSummary(records: StudentPromotionAuditRecord[]): StudentPromotionAuditSummary {
  return {
    totalRecords: records.length,
    pendingReview: records.filter((record) => record.status === "pending").length,
    eligible: records.filter((record) => record.status === "eligible").length,
    requiresReview: records.filter((record) => record.status === "requires_review").length,
    promoted: records.filter((record) => record.status === "promoted").length,
    retained: records.filter((record) => record.status === "retained").length,
    transferred: records.filter((record) => record.status === "transferred").length,
    withdrawn: records.filter((record) => record.status === "withdrawn").length,
    blockedOrUnresolved: records.filter((record) => record.validation.overallStatus === "blocked").length,
    bulkPrepared: records.filter((record) => record.source === "bulk_preparation").length,
    individuallyCreated: records.filter((record) => record.source === "individual").length,
    appliedRecords: records.filter((record) => Boolean(record.appliedAt)).length,
    reviewedRecords: records.filter((record) => Boolean(record.reviewedAt)).length,
  };
}

export function toValidationEvidence(validation: StudentPromotionValidationResult): StudentPromotionValidationEvidence {
  const hasFailure = validation.checks.some((check) => check.status === "failed");
  return {
    overallStatus: hasFailure ? "blocked" : validation.requiresReview ? "requires_review" : "ready",
    checks: validation.checks,
  };
}

export function getPromotionAuditSource(source?: "individual" | "bulk_preparation", proposedBy?: string): StudentPromotionAuditSource {
  if (source === "bulk_preparation") return "bulk_preparation";
  if (proposedBy === "system-proposal") return "system_proposal";
  return "individual";
}

export function sortPromotionAuditEvents(events: StudentPromotionAuditTimelineEvent[]) {
  return [...events].sort((first, second) => {
    if (!first.timestamp && !second.timestamp) return first.label.localeCompare(second.label);
    if (!first.timestamp) return 1;
    if (!second.timestamp) return -1;
    return new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime();
  });
}

export function eventLabel(eventType: StudentPromotionAuditEventType) {
  return eventType.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
