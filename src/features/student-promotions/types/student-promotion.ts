import type { AcademicClass, AcademicYear, Section } from "@/features/academic-structure/types/academic-structure";
import type { StudentAcademicPlacementReadModel } from "@/features/student-placements/types/student-placement";
import type { TenantScopedQuery } from "@/lib/api/client";

export const studentPromotionStatuses = [
  "pending",
  "eligible",
  "promoted",
  "retained",
  "transferred",
  "withdrawn",
  "requires_review",
] as const;
export type StudentPromotionStatus = (typeof studentPromotionStatuses)[number];

export const studentPromotionReasons = [
  "annual_promotion",
  "retained",
  "section_change",
  "administrative_correction",
  "student_transfer",
  "withdrawal",
  "manual_review",
] as const;
export type StudentPromotionReason = (typeof studentPromotionReasons)[number];

export type StudentPromotion = TenantScopedQuery & {
  id: string;
  studentId: string;
  sourceAcademicYearId: string;
  sourceClassId: string;
  sourceSectionId: string;
  sourcePlacementId: string;
  targetAcademicYearId: string;
  targetClassId?: string;
  targetSectionId?: string;
  status: StudentPromotionStatus;
  reason: StudentPromotionReason;
  notes?: string;
  proposedAt: string;
  proposedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  appliedAt?: string;
  appliedBy?: string;
  promotionSource?: "individual" | "bulk_preparation";
  batchCorrelationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentPromotionReadModel = StudentPromotion & {
  studentName: string;
  admissionNumber: string;
  sourceAcademicYearName: string;
  sourceClassName: string;
  sourceSectionName: string;
  sourcePlacementStartDate: string;
  sourcePlacementEndDate?: string;
  targetAcademicYearName: string;
  targetClassName?: string;
  targetSectionName?: string;
  validation: StudentPromotionValidationResult;
};

export type StudentPromotionCreateInput = TenantScopedQuery & {
  studentId: string;
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  targetClassId?: string;
  targetSectionId?: string;
  reason?: StudentPromotionReason;
  notes?: string;
  proposedBy: string;
  promotionSource?: "individual" | "bulk_preparation";
  batchCorrelationId?: string;
};

export type StudentPromotionUpdateInput = TenantScopedQuery & {
  id: string;
  targetClassId?: string;
  targetSectionId?: string;
  status?: StudentPromotionStatus;
  reason?: StudentPromotionReason;
  notes?: string;
  reviewedBy?: string;
};

export type StudentPromotionApplyInput = TenantScopedQuery & {
  id: string;
  appliedBy: string;
  startDate: string;
  notes?: string;
};

export type StudentPromotionFilters = Partial<TenantScopedQuery> & {
  sourceAcademicYearId?: string;
  targetAcademicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: StudentPromotionStatus;
  query?: string;
  sortBy?: "studentName" | "sourceClassName" | "targetClassName" | "status" | "updatedAt";
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type TransitionReadinessCheck = {
  key: string;
  label: string;
  status: "passed" | "warning" | "failed";
  severity: "info" | "warning" | "critical";
  message: string;
};

export type TransitionReadinessSummary = {
  students: number;
  eligible: number;
  requiresReview: number;
  promoted: number;
  retained: number;
  transferred: number;
  withdrawn: number;
};

export type TransitionReadiness = {
  sourceYearId: string;
  targetYearId: string;
  ready: boolean;
  sourceYear?: AcademicYear;
  targetYear?: AcademicYear;
  checks: TransitionReadinessCheck[];
  summary: TransitionReadinessSummary;
};

export type StudentPromotionValidationCheck = {
  key: string;
  label: string;
  status: "passed" | "warning" | "failed";
  message: string;
};

export type StudentPromotionValidationResult = {
  valid: boolean;
  requiresReview: boolean;
  checks: StudentPromotionValidationCheck[];
};

export type StudentPromotionProposalContext = {
  sourcePlacement: StudentAcademicPlacementReadModel;
  sourceYear: AcademicYear;
  targetYear: AcademicYear;
  sourceClass: AcademicClass;
  sourceSection: Section;
  targetClass?: AcademicClass;
  targetSection?: Section;
};

export type StudentPromotionListResponse = {
  items: StudentPromotionReadModel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  readiness: TransitionReadiness;
};
