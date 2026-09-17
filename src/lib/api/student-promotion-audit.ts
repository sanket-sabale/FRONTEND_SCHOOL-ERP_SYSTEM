import { studentPromotionAuditDetailSchema, studentPromotionAuditFiltersSchema } from "@/features/student-promotions/schemas/student-promotion-audit.schema";
import {
  buildPromotionAuditSummary,
  eventLabel,
  getPromotionAuditSource,
  sortPromotionAuditEvents,
  toValidationEvidence,
} from "@/features/student-promotions/services/student-promotion-audit-rules";
import type {
  StudentPromotionAuditDetail,
  StudentPromotionAuditExportPreview,
  StudentPromotionAuditFilters,
  StudentPromotionAuditListResponse,
  StudentPromotionAuditRecord,
  StudentPromotionAuditTimelineEvent,
  StudentPromotionPlacementEvidence,
} from "@/features/student-promotions/types/student-promotion-audit";
import type { StudentPromotionReadModel } from "@/features/student-promotions/types/student-promotion";
import type { StudentAcademicPlacementReadModel } from "@/features/student-placements/types/student-placement";
import { studentPlacementService } from "@/lib/api/student-placements";
import { studentPromotionService } from "@/lib/api/student-promotions";
import type { TenantScopedQuery } from "@/lib/api/client";

const auditExportFields = [
  "Promotion ID",
  "Student",
  "Admission Number",
  "Status",
  "Reason",
  "Source Academic Year",
  "Source Class",
  "Source Section",
  "Target Academic Year",
  "Target Class",
  "Target Section",
  "Promotion Source",
  "Batch Correlation",
  "Proposed By",
  "Reviewed By",
  "Applied By",
  "Updated At",
];

export const studentPromotionAuditService = {
  async getPromotionAudit(scope: TenantScopedQuery, filters: StudentPromotionAuditFilters = {}): Promise<StudentPromotionAuditListResponse> {
    const parsed = studentPromotionAuditFiltersSchema.parse(filters);
    const sourceAcademicYearId = parsed.sourceAcademicYearId ?? scope.academicYearId;
    const response = await studentPromotionService.getPromotions({ ...scope, academicYearId: sourceAcademicYearId }, {
      sourceAcademicYearId,
      targetAcademicYearId: parsed.targetAcademicYearId ?? "ay-2027-28",
      classId: parsed.sourceClassId ?? parsed.targetClassId ?? parsed.sourceSectionId ?? parsed.targetSectionId,
      status: parsed.status,
      query: parsed.search,
      page: 1,
      pageSize: 100,
      sortBy: "updatedAt",
      sortDirection: "desc",
    });
    const records = await Promise.all(response.items.map((promotion) => toAuditRecord(scope, promotion)));
    const filtered = records.filter((record): record is StudentPromotionAuditRecord => Boolean(record)).filter((record) => matchesFilters(record, parsed));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize));
    const start = (parsed.page - 1) * parsed.pageSize;
    const pageItems = filtered.slice(start, start + parsed.pageSize);

    return {
      items: pageItems,
      summary: buildPromotionAuditSummary(filtered),
      total,
      page: parsed.page,
      pageSize: parsed.pageSize,
      totalPages,
      exportPreview: buildExportPreview(filtered.length, parsed),
    };
  },

  async getPromotionAuditDetail(scope: TenantScopedQuery, promotionId: string): Promise<StudentPromotionAuditDetail | null> {
    const parsed = studentPromotionAuditDetailSchema.safeParse({ promotionId });
    if (!parsed.success) return null;
    const promotion = await studentPromotionService.getPromotion(scope, parsed.data.promotionId);
    if (!promotion) return null;
    const record = await toAuditRecord(scope, promotion);
    if (!record) return null;
    const timeline = buildTimeline(record, promotion);
    return {
      ...record,
      notes: promotion.notes,
      timeline,
      lastEvent: timeline.at(-1),
      exportPreview: buildExportPreview(1, { page: 1, pageSize: 1 }),
    };
  },

  getPromotionAuditExportPreview(filters: StudentPromotionAuditFilters, recordCount: number): StudentPromotionAuditExportPreview {
    return buildExportPreview(recordCount, studentPromotionAuditFiltersSchema.parse(filters));
  },
};

async function toAuditRecord(scope: TenantScopedQuery, promotion: StudentPromotionReadModel): Promise<StudentPromotionAuditRecord | null> {
  const source = getPromotionAuditSource(promotion.promotionSource, promotion.proposedBy);
  const beforePlacement: StudentPromotionPlacementEvidence = {
    academicYearId: promotion.sourceAcademicYearId,
    academicYearName: promotion.sourceAcademicYearName,
    classId: promotion.sourceClassId,
    className: promotion.sourceClassName,
    sectionId: promotion.sourceSectionId,
    sectionName: promotion.sourceSectionName,
    placementId: promotion.sourcePlacementId,
    effectiveFrom: promotion.sourcePlacementStartDate,
    effectiveTo: promotion.sourcePlacementEndDate,
    status: promotion.sourcePlacementEndDate ? "ended" : "historical source",
    evidenceState: "available",
    evidenceNote: "Historical source placement is preserved as promotion evidence.",
  };
  const targetPlacement = await resolveTargetPlacement(scope, promotion);
  const validation = toValidationEvidence(promotion.validation);
  const record: StudentPromotionAuditRecord = {
    promotionId: promotion.id,
    studentId: promotion.studentId,
    studentName: promotion.studentName,
    admissionNumber: promotion.admissionNumber,
    status: promotion.status,
    reason: promotion.reason,
    source,
    batchCorrelationId: promotion.batchCorrelationId,
    sourcePlacement: beforePlacement,
    targetPlacement,
    beforePlacement,
    afterPlacement: promotion.status === "promoted" ? targetPlacement : undefined,
    validation,
    proposedBy: promotion.proposedBy,
    proposedAt: promotion.proposedAt,
    reviewedBy: promotion.reviewedBy,
    reviewedAt: promotion.reviewedAt,
    appliedBy: promotion.appliedBy,
    appliedAt: promotion.appliedAt,
    updatedAt: promotion.updatedAt,
  };
  const timeline = buildTimeline(record, promotion);
  return {
    ...record,
    lastEvent: timeline.at(-1),
  };
}

async function resolveTargetPlacement(scope: TenantScopedQuery, promotion: StudentPromotionReadModel): Promise<StudentPromotionPlacementEvidence> {
  const proposed: StudentPromotionPlacementEvidence = {
    academicYearId: promotion.targetAcademicYearId,
    academicYearName: promotion.targetAcademicYearName,
    classId: promotion.targetClassId,
    className: promotion.targetClassName,
    sectionId: promotion.targetSectionId,
    sectionName: promotion.targetSectionName,
    evidenceState: "proposed",
    evidenceNote: promotion.status === "promoted" ? "Promotion is applied; stored target placement evidence was not found in the mock placement repository." : "Target placement not yet applied.",
  };
  if (promotion.status !== "promoted") return proposed;

  const targetScope = { ...scope, academicYearId: promotion.targetAcademicYearId };
  const placements = await studentPlacementService.getStudentsByPlacement(targetScope, {
    studentId: promotion.studentId,
    allAcademicYears: true,
    page: 1,
    pageSize: 100,
  }).catch(() => undefined);
  const target = placements?.items.find((placement) =>
    placement.academicYearId === promotion.targetAcademicYearId &&
    placement.classId === promotion.targetClassId &&
    placement.sectionId === promotion.targetSectionId
  );
  return target ? placementEvidence(target, "available", "New target placement was found in StudentAcademicPlacement history.") : proposed;
}

function placementEvidence(placement: StudentAcademicPlacementReadModel, evidenceState: StudentPromotionPlacementEvidence["evidenceState"], evidenceNote: string): StudentPromotionPlacementEvidence {
  return {
    academicYearId: placement.academicYearId,
    academicYearName: placement.academicYearName,
    classId: placement.classId,
    className: placement.className,
    sectionId: placement.sectionId,
    sectionName: placement.sectionName,
    placementId: placement.id,
    effectiveFrom: placement.startDate,
    effectiveTo: placement.endDate,
    status: placement.status,
    evidenceState,
    evidenceNote,
  };
}

function buildTimeline(record: StudentPromotionAuditRecord, promotion: StudentPromotionReadModel): StudentPromotionAuditTimelineEvent[] {
  const events: StudentPromotionAuditTimelineEvent[] = [
    event(record, "promotion_created", record.proposedAt, record.proposedBy, `${record.studentName} was added to promotion review from ${record.sourcePlacement.className ?? "source class"} to ${record.targetPlacement.className ?? "target class pending"}.`, "info"),
  ];

  if (record.source === "bulk_preparation") {
    events.push(event(record, "bulk_prepared", record.proposedAt, record.proposedBy, `Prepared from bulk promotion readiness${record.batchCorrelationId ? ` (${record.batchCorrelationId})` : ""}. Individual review and apply remain required.`, "info"));
  }

  events.push(event(record, "eligibility_evaluated", promotion.updatedAt, undefined, `Readiness evaluated as ${record.validation.overallStatus.replaceAll("_", " ")}.`, record.validation.overallStatus === "ready" ? "success" : record.validation.overallStatus === "blocked" ? "danger" : "warning"));

  if (record.status === "requires_review") {
    events.push(event(record, "requires_review", promotion.updatedAt, record.reviewedBy, promotion.notes ?? "Promotion requires administrator review before it can be applied.", "warning"));
  }
  if (record.status === "retained") events.push(event(record, "promotion_retained", promotion.updatedAt, record.reviewedBy, promotion.notes ?? "Student retained; no target placement was applied.", "info"));
  if (record.status === "transferred") events.push(event(record, "promotion_transferred", promotion.updatedAt, record.reviewedBy, promotion.notes ?? "Student transferred; no promotion placement was applied.", "warning"));
  if (record.status === "withdrawn") events.push(event(record, "promotion_withdrawn", promotion.updatedAt, record.reviewedBy, promotion.notes ?? "Student withdrawn; no promotion placement was applied.", "warning"));
  if (record.reviewedAt) events.push(event(record, "promotion_reviewed", record.reviewedAt, record.reviewedBy, "Promotion review decision was recorded.", "info"));
  if (record.appliedAt) events.push(event(record, "promotion_applied", record.appliedAt, record.appliedBy, "Promotion was applied to academic placement only. Attendance and student profile history were not rewritten.", "success"));
  if (!record.reviewedAt && !record.appliedAt && record.status !== "requires_review") {
    events.push(event(record, "historical_event_unavailable", undefined, undefined, "No review or application event evidence is available yet.", "warning"));
  }

  return sortPromotionAuditEvents(events);
}

function event(
  record: StudentPromotionAuditRecord,
  eventType: StudentPromotionAuditTimelineEvent["eventType"],
  timestamp: string | undefined,
  actorId: string | undefined,
  description: string,
  status: StudentPromotionAuditTimelineEvent["status"],
): StudentPromotionAuditTimelineEvent {
  return {
    eventId: `${record.promotionId}:${eventType}:${timestamp ?? "unavailable"}`,
    eventType,
    label: eventLabel(eventType),
    timestamp,
    actorId,
    actorDisplayName: actorId,
    description,
    status,
  };
}

function matchesFilters(record: StudentPromotionAuditRecord, filters: Required<Pick<StudentPromotionAuditFilters, "page" | "pageSize">> & StudentPromotionAuditFilters) {
  const search = filters.search?.toLowerCase().trim();
  if (search && ![
    record.promotionId,
    record.studentId,
    record.studentName,
    record.admissionNumber,
    record.sourcePlacement.className,
    record.sourcePlacement.sectionName,
    record.targetPlacement.className,
    record.targetPlacement.sectionName,
    record.status,
    record.reason,
    record.batchCorrelationId,
  ].filter(Boolean).join(" ").toLowerCase().includes(search)) return false;
  if (filters.studentId && record.studentId !== filters.studentId) return false;
  if (filters.sourceAcademicYearId && record.sourcePlacement.academicYearId !== filters.sourceAcademicYearId) return false;
  if (filters.targetAcademicYearId && record.targetPlacement.academicYearId !== filters.targetAcademicYearId) return false;
  if (filters.sourceClassId && record.sourcePlacement.classId !== filters.sourceClassId) return false;
  if (filters.targetClassId && record.targetPlacement.classId !== filters.targetClassId) return false;
  if (filters.sourceSectionId && record.sourcePlacement.sectionId !== filters.sourceSectionId) return false;
  if (filters.targetSectionId && record.targetPlacement.sectionId !== filters.targetSectionId) return false;
  if (filters.status && record.status !== filters.status) return false;
  if (filters.reason && record.reason !== filters.reason) return false;
  if (filters.source && record.source !== filters.source) return false;
  if (filters.batchCorrelationId && record.batchCorrelationId !== filters.batchCorrelationId) return false;
  if (filters.appliedOnly && !record.appliedAt) return false;
  if (filters.reviewedOnly && !record.reviewedAt) return false;
  if (filters.dateFrom && record.updatedAt.slice(0, 10) < filters.dateFrom) return false;
  if (filters.dateTo && record.updatedAt.slice(0, 10) > filters.dateTo) return false;
  return true;
}

function buildExportPreview(recordCount: number, filters: StudentPromotionAuditFilters): StudentPromotionAuditExportPreview {
  return {
    recordCount,
    generatedAt: new Date().toISOString(),
    filters,
    includedFields: auditExportFields,
    exportKind: "preview_only",
    message: "Export preview only. Stage 12 does not generate CSV, Excel, PDF, download URLs, or backend export jobs.",
  };
}
