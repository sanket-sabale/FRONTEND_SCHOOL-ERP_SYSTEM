import type {
  StudentPromotionReason,
  StudentPromotionStatus,
  StudentPromotionValidationCheck,
} from "@/features/student-promotions/types/student-promotion";

export const studentPromotionAuditSources = ["individual", "bulk_preparation", "system_proposal"] as const;
export type StudentPromotionAuditSource = (typeof studentPromotionAuditSources)[number];

export const studentPromotionAuditEventTypes = [
  "promotion_created",
  "bulk_prepared",
  "eligibility_evaluated",
  "requires_review",
  "promotion_reviewed",
  "promotion_applied",
  "promotion_retained",
  "promotion_transferred",
  "promotion_withdrawn",
  "historical_event_unavailable",
] as const;
export type StudentPromotionAuditEventType = (typeof studentPromotionAuditEventTypes)[number];

export type StudentPromotionPlacementEvidence = {
  academicYearId: string;
  academicYearName?: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  placementId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: string;
  evidenceState: "available" | "proposed" | "unavailable";
  evidenceNote?: string;
};

export type StudentPromotionValidationEvidence = {
  overallStatus: "ready" | "requires_review" | "blocked";
  checks: StudentPromotionValidationCheck[];
};

export type StudentPromotionAuditTimelineEvent = {
  eventId: string;
  eventType: StudentPromotionAuditEventType;
  label: string;
  timestamp?: string;
  actorId?: string;
  actorDisplayName?: string;
  description: string;
  status: "info" | "success" | "warning" | "danger";
};

export type StudentPromotionAuditRecord = {
  promotionId: string;
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  status: StudentPromotionStatus;
  reason: StudentPromotionReason;
  source: StudentPromotionAuditSource;
  batchCorrelationId?: string;
  sourcePlacement: StudentPromotionPlacementEvidence;
  targetPlacement: StudentPromotionPlacementEvidence;
  beforePlacement: StudentPromotionPlacementEvidence;
  afterPlacement?: StudentPromotionPlacementEvidence;
  validation: StudentPromotionValidationEvidence;
  proposedBy?: string;
  proposedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  appliedBy?: string;
  appliedAt?: string;
  updatedAt: string;
  lastEvent?: StudentPromotionAuditTimelineEvent;
};

export type StudentPromotionAuditDetail = StudentPromotionAuditRecord & {
  notes?: string;
  timeline: StudentPromotionAuditTimelineEvent[];
  exportPreview: StudentPromotionAuditExportPreview;
};

export type StudentPromotionAuditFilters = {
  search?: string;
  studentId?: string;
  sourceAcademicYearId?: string;
  targetAcademicYearId?: string;
  sourceClassId?: string;
  targetClassId?: string;
  sourceSectionId?: string;
  targetSectionId?: string;
  status?: StudentPromotionStatus;
  reason?: StudentPromotionReason;
  source?: StudentPromotionAuditSource;
  batchCorrelationId?: string;
  dateFrom?: string;
  dateTo?: string;
  appliedOnly?: boolean;
  reviewedOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type StudentPromotionAuditSummary = {
  totalRecords: number;
  pendingReview: number;
  eligible: number;
  requiresReview: number;
  promoted: number;
  retained: number;
  transferred: number;
  withdrawn: number;
  blockedOrUnresolved: number;
  bulkPrepared: number;
  individuallyCreated: number;
  appliedRecords: number;
  reviewedRecords: number;
};

export type StudentPromotionAuditListResponse = {
  items: StudentPromotionAuditRecord[];
  summary: StudentPromotionAuditSummary;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  exportPreview: StudentPromotionAuditExportPreview;
};

export type StudentPromotionAuditExportPreview = {
  recordCount: number;
  generatedAt: string;
  filters: StudentPromotionAuditFilters;
  includedFields: string[];
  exportKind: "preview_only";
  message: string;
};
