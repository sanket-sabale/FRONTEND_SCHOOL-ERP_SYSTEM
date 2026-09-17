import { tenantContext } from "@/lib/tenant-context";
import type { StudentPromotion } from "@/features/student-promotions/types/student-promotion";

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

export const mockStudentPromotions: StudentPromotion[] = [
  promotion("promo-stu-001-2027", "stu-001", "sap-stu-001-2026-8b", "class-grade-8", "section-grade-8-b-empty", "class-2027-grade-9", "section-2027-grade-9-b", "eligible", "annual_promotion", "Deterministic Class 8 to Class 9 promotion prepared from controlled bulk readiness.", {
    batchCorrelationId: "promotion-batch-stage-11-001",
    promotionSource: "bulk_preparation",
  }),
  promotion("promo-stu-002-2027", "stu-002", "sap-stu-002-2026-10b", "class-grade-10", "section-grade-10-b", "class-2027-grade-11", "section-2027-grade-11-b", "pending", "annual_promotion", "Target Grade 11 B exists and is awaiting review."),
  promotion("promo-stu-003-2027", "stu-003", "sap-stu-003-2026-6c", "class-grade-6", "section-grade-6-c", "class-2027-grade-7", "section-2027-grade-7-c", "requires_review", "manual_review", "Target section C is at capacity and requires administrator review."),
  promotion("promo-stu-004-2027", "stu-004", "sap-stu-004-2026-3a", "class-grade-3", "section-grade-3-a", "class-2027-grade-4", "section-2027-grade-4-a", "promoted", "annual_promotion", "Already promoted through the controlled workflow.", {
    appliedAt: "2026-08-13T10:40:00+05:30",
    appliedBy: "current-user",
    reviewedAt: "2026-08-13T10:30:00+05:30",
    reviewedBy: "current-user",
  }),
  promotion("promo-stu-005-retained-2027", "stu-005", "sap-stu-005-2026-9a", "class-grade-9", "section-grade-9-a", "class-grade-9", "section-grade-9-a", "retained", "retained", "Student retained in the same academic level pending transfer formalities."),
  promotion("promo-stu-006-transferred-2027", "stu-006", "sap-stu-006-2026-7b", "class-grade-7", "section-grade-7-b", undefined, undefined, "transferred", "student_transfer", "Student transferred out; no target placement should be created."),
];

function promotion(
  id: string,
  studentId: string,
  sourcePlacementId: string,
  sourceClassId: string,
  sourceSectionId: string,
  targetClassId: string | undefined,
  targetSectionId: string | undefined,
  status: StudentPromotion["status"],
  reason: StudentPromotion["reason"],
  notes: string,
  lifecycle: Partial<Pick<StudentPromotion, "reviewedAt" | "reviewedBy" | "appliedAt" | "appliedBy" | "promotionSource" | "batchCorrelationId">> = {},
): StudentPromotion {
  return {
    ...scope,
    id,
    studentId,
    sourceAcademicYearId: "ay-2026-27",
    sourceClassId,
    sourceSectionId,
    sourcePlacementId,
    targetAcademicYearId: status === "retained" ? "ay-2026-27" : "ay-2027-28",
    targetClassId,
    targetSectionId,
    status,
    reason,
    notes,
    proposedAt: "2026-08-13T10:00:00+05:30",
    proposedBy: "current-user",
    createdAt: "2026-08-13T10:00:00+05:30",
    updatedAt: lifecycle.appliedAt ?? lifecycle.reviewedAt ?? "2026-08-13T10:00:00+05:30",
    ...lifecycle,
  };
}
