import type {
  AdmissionApplication,
  AdmissionApplicationStatus,
  AdmissionCycle,
  AdmissionDocument,
  AdmissionDocumentCompletionStatus,
  AdmissionDocumentSummary,
  AdmissionEvaluation,
  AdmissionOperationContext,
  AdmissionReview,
  AdmissionScope,
  AdmissionSeatAvailability,
} from "@/features/admissions/types/admission";
import type { TenantScopedQuery } from "@/lib/api/client";
import type { Permission } from "@/types/erp";

export const admissionStatusTransitions: Record<AdmissionApplicationStatus, AdmissionApplicationStatus[]> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["document_pending", "shortlisted", "rejected"],
  document_pending: ["documents_verified"],
  documents_verified: ["under_review"],
  shortlisted: ["interview_scheduled", "approved", "waitlisted", "rejected"],
  interview_scheduled: ["shortlisted"],
  approved: ["fee_pending"],
  waitlisted: ["approved", "rejected"],
  rejected: [],
  fee_pending: ["confirmed"],
  confirmed: ["enrolled"],
  enrolled: [],
};

export function canTransitionApplicationStatus(currentStatus: AdmissionApplicationStatus, nextStatus: AdmissionApplicationStatus) {
  return admissionStatusTransitions[currentStatus].includes(nextStatus);
}

export function validateAdmissionTransition(
  currentStatus: AdmissionApplicationStatus,
  nextStatus: AdmissionApplicationStatus,
): { valid: true } | { valid: false; message: string } {
  if (canTransitionApplicationStatus(currentStatus, nextStatus)) {
    return { valid: true };
  }

  return {
    valid: false,
    message: `Cannot move admission application from ${formatAdmissionStatus(currentStatus)} to ${formatAdmissionStatus(nextStatus)}.`,
  };
}

export function validateScopeMatch(record: TenantScopedQuery, scope: TenantScopedQuery): { valid: true } | { valid: false; message: string } {
  if (
    record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId
  ) {
    return { valid: true };
  }

  return { valid: false, message: "Admission record is outside the active tenant, school, campus, or academic year scope." };
}

export function isInAdmissionScope(record: TenantScopedQuery & { admissionCycleId?: string }, scope: AdmissionScope) {
  return (
    record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId &&
    (!scope.admissionCycleId || record.admissionCycleId === scope.admissionCycleId)
  );
}

export function validateCycleForScope(cycle: AdmissionCycle, scope: AdmissionScope) {
  const scopeResult = validateScopeMatch(cycle, scope);
  if (!scopeResult.valid) return scopeResult;
  if (scope.admissionCycleId && cycle.id !== scope.admissionCycleId) {
    return { valid: false as const, message: "Admission cycle is outside the requested admission cycle scope." };
  }
  return { valid: true as const };
}

export function validateApplicationCycle(application: AdmissionApplication, cycle: AdmissionCycle) {
  const scopeResult = validateScopeMatch(application, cycle);
  if (!scopeResult.valid) return scopeResult;
  if (application.admissionCycleId !== cycle.id) {
    return { valid: false as const, message: "Admission application does not belong to the selected admission cycle." };
  }
  return { valid: true as const };
}

export function validatePermission(context: AdmissionOperationContext, permission: Permission) {
  if (context.permissions.includes(permission)) {
    return { valid: true as const };
  }

  return { valid: false as const, message: "You do not have permission to perform this admission operation." };
}

export function summarizeAdmissionDocuments(documents: AdmissionDocument[]): AdmissionDocumentSummary {
  const requiredDocuments = documents.filter((document) => document.required);
  return {
    required: requiredDocuments.length,
    verified: requiredDocuments.filter((document) => document.status === "verified").length,
    pending: requiredDocuments.filter((document) => document.status === "uploaded" || document.status === "under_verification").length,
    missing: requiredDocuments.filter((document) => document.status === "required").length,
    rejected: requiredDocuments.filter((document) => document.status === "rejected").length,
  };
}

export function hasVerifiedRequiredDocuments(documents: AdmissionDocument[]) {
  const summary = summarizeAdmissionDocuments(documents);
  return summary.required > 0 && summary.verified === summary.required;
}

export function getAdmissionDocumentCompletionStatus(documents: AdmissionDocument[]): AdmissionDocumentCompletionStatus {
  const summary = summarizeAdmissionDocuments(documents);
  if (summary.required === 0 || summary.missing > 0 || summary.rejected > 0) return "incomplete";
  if (summary.verified === summary.required) return "complete";
  return "pending_verification";
}

export function deriveSeatAvailability(capacity: number, counts: { approved: number; enrolled: number; reserved: number }): AdmissionSeatAvailability["available"] {
  return Math.max(0, capacity - counts.approved - counts.enrolled - counts.reserved);
}

export function getAdmissionDecisionReadiness(input: {
  application: AdmissionApplication;
  documents: AdmissionDocument[];
  reviews: AdmissionReview[];
  evaluations: AdmissionEvaluation[];
  seatAvailable: number;
}) {
  const completedReview = input.reviews.some((review) => review.status === "completed" || Boolean(review.reviewedAt));
  const completedEvaluation = input.evaluations.some((evaluation) => evaluation.status === "completed" && evaluation.result === "recommended");
  const documentsVerified = hasVerifiedRequiredDocuments(input.documents);
  const activeStatus = !["draft", "submitted", "rejected", "approved", "fee_pending", "confirmed", "enrolled"].includes(input.application.status);

  const checks = [
    {
      label: "Application is in review workflow",
      passed: activeStatus,
      message: activeStatus ? "Application can receive a decision." : "Application must be in review, document verified, or shortlist state.",
    },
    {
      label: "Required documents verified",
      passed: documentsVerified,
      message: documentsVerified ? "All required documents are verified." : "Required documents must be verified before decisions.",
    },
    {
      label: "Review completed",
      passed: completedReview,
      message: completedReview ? "Reviewer recommendation is recorded." : "A reviewer must complete the admission review.",
    },
    {
      label: "Evaluation completed",
      passed: completedEvaluation,
      message: completedEvaluation ? "Evaluation result supports progression." : "A completed recommended evaluation is required.",
    },
  ];
  const blockingReasons = checks.filter((check) => !check.passed).map((check) => check.message);
  const warnings = input.seatAvailable <= 0 ? ["No seat is currently available for approval; use waitlist until capacity opens."] : [];

  return {
    eligible: blockingReasons.length === 0,
    checks,
    blockingReasons,
    warnings,
  };
}

export function validateEnrollmentPrerequisites(input: {
  application: AdmissionApplication;
  documents: AdmissionDocument[];
  seatAvailable: number;
}) {
  if (input.application.status === "rejected") {
    return { valid: false as const, message: "Rejected admission applications cannot be enrolled." };
  }

  if (input.application.status !== "confirmed") {
    return { valid: false as const, message: "Admission application must be confirmed before enrollment." };
  }

  if (!hasVerifiedRequiredDocuments(input.documents)) {
    return { valid: false as const, message: "Required admission documents must be verified before enrollment." };
  }

  if (input.seatAvailable <= 0) {
    return { valid: false as const, message: "No seat is available for this admission application." };
  }

  return { valid: true as const };
}

export function formatAdmissionStatus(status: AdmissionApplicationStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
