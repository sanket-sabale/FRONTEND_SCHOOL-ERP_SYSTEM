import { attendanceRepairAuditExportRequestSchema, attendanceRepairAuditFiltersSchema } from "@/features/attendance/schemas/attendance-repair-audit.schema";
import { buildAuditSummary, sortAuditEvents } from "@/features/attendance/services/attendance-repair-audit-rules";
import type {
  AttendanceRepairAuditDetail,
  AttendanceRepairAuditEvent,
  AttendanceRepairAuditExportPreview,
  AttendanceRepairAuditExportRequest,
  AttendanceRepairAuditFilters,
  AttendanceRepairAuditListResponse,
  AttendanceRepairAuditRecord,
} from "@/features/attendance/types/attendance-repair-audit";
import type { AttendanceSnapshotIntegrityResult } from "@/features/attendance/types/attendance-integrity";
import type { AttendanceSnapshotRepairEvent, AttendanceSnapshotRepairRequest } from "@/features/attendance/types/attendance-repair";
import type { TenantScopedQuery } from "@/lib/api/client";
import { attendanceIntegrityService } from "@/lib/api/attendance-integrity";
import { attendanceRepairService } from "@/lib/api/attendance-repairs";

export const attendanceRepairAuditService = {
  async getRepairAudit(scope: TenantScopedQuery, filters: AttendanceRepairAuditFilters = {}): Promise<AttendanceRepairAuditListResponse> {
    const parsedFilters = attendanceRepairAuditFiltersSchema.parse(filters);
    const records = await buildAuditRecords(scope);
    const query = parsedFilters.query?.toLowerCase().trim();
    const filtered = records
      .filter((record) => !parsedFilters.dateFrom || (record.attendanceDate ?? "") >= parsedFilters.dateFrom)
      .filter((record) => !parsedFilters.dateTo || (record.attendanceDate ?? "") <= parsedFilters.dateTo)
      .filter((record) => !parsedFilters.studentId || record.studentId === parsedFilters.studentId)
      .filter((record) => !parsedFilters.classId || record.currentSnapshot.classId === parsedFilters.classId || record.proposedSnapshot?.classId === parsedFilters.classId)
      .filter((record) => !parsedFilters.sectionId || record.currentSnapshot.sectionId === parsedFilters.sectionId || record.proposedSnapshot?.sectionId === parsedFilters.sectionId)
      .filter((record) => !parsedFilters.integrityStatus || record.integrityStatus === parsedFilters.integrityStatus)
      .filter((record) => !parsedFilters.repairStatus || record.repairStatus === parsedFilters.repairStatus)
      .filter((record) => !parsedFilters.actorId || record.events.some((event) => event.actorId === parsedFilters.actorId))
      .filter((record) => !parsedFilters.batchCorrelationId || record.batchCorrelationId === parsedFilters.batchCorrelationId)
      .filter((record) => !parsedFilters.source || record.source === parsedFilters.source)
      .filter((record) => !parsedFilters.eventType || record.events.some((event) => event.eventType === parsedFilters.eventType))
      .filter((record) => !parsedFilters.eventDateFrom || record.events.some((event) => (event.timestamp ?? "") >= parsedFilters.eventDateFrom!))
      .filter((record) => !parsedFilters.eventDateTo || record.events.some((event) => (event.timestamp ?? "") <= parsedFilters.eventDateTo!))
      .filter((record) => parsedFilters.repairedOnly ? record.repairStatus === "applied" : true)
      .filter((record) => !query || [
        record.attendanceId,
        record.studentName,
        record.admissionNumber,
        record.integrityStatus,
        record.repairStatus,
        record.currentSnapshot.className,
        record.currentSnapshot.sectionName,
        record.proposedSnapshot?.className,
        record.proposedSnapshot?.sectionName,
        record.batchCorrelationId,
      ].filter(Boolean).join(" ").toLowerCase().includes(query))
      .sort((first, second) => String(second.lastUpdatedAt ?? second.attendanceDate ?? "").localeCompare(String(first.lastUpdatedAt ?? first.attendanceDate ?? "")));

    const page = parsedFilters.page;
    const pageSize = parsedFilters.pageSize;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      summary: buildAuditSummary(filtered),
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  async getRepairAuditDetail(scope: TenantScopedQuery, attendanceId: string): Promise<AttendanceRepairAuditDetail | null> {
    if (!/^[a-z0-9_-]{3,128}$/i.test(attendanceId)) return null;
    const records = await buildAuditRecords(scope);
    const record = records.find((item) => item.attendanceId === attendanceId);
    return record ? { record, timeline: sortAuditEvents(record.events) } : null;
  },

  async getRepairAuditTimeline(scope: TenantScopedQuery, attendanceId: string) {
    const detail = await this.getRepairAuditDetail(scope, attendanceId);
    return detail?.timeline ?? [];
  },

  async getRepairAuditSummary(scope: TenantScopedQuery, filters: AttendanceRepairAuditFilters = {}) {
    const response = await this.getRepairAudit(scope, { ...filters, page: 1, pageSize: 100 });
    return response.summary;
  },

  async getRepairAuditExportPreview(scope: TenantScopedQuery, request: AttendanceRepairAuditExportRequest): Promise<AttendanceRepairAuditExportPreview> {
    const parsedRequest = attendanceRepairAuditExportRequestSchema.parse(request);
    const response = await this.getRepairAudit(scope, { ...parsedRequest.filters, page: 1, pageSize: 100 });
    return {
      recordCount: response.total,
      selectedFilters: parsedRequest.filters,
      includedFields: parsedRequest.includedFields,
      generatedAt: new Date().toISOString(),
    };
  },
};

async function buildAuditRecords(scope: TenantScopedQuery): Promise<AttendanceRepairAuditRecord[]> {
  const [diagnostics, repairRequests, repairEvents] = await Promise.all([
    attendanceIntegrityService.getAttendanceSnapshotIntegrity(scope),
    attendanceRepairService.getRepairRequests(scope),
    attendanceRepairService.getRepairHistory(scope),
  ]);
  const repairByAttendance = new Map(repairRequests.map((request) => [request.attendanceId, request]));
  const eventsByAttendance = new Map<string, AttendanceSnapshotRepairEvent[]>();
  repairEvents.forEach((event) => eventsByAttendance.set(event.attendanceId, [...(eventsByAttendance.get(event.attendanceId) ?? []), event]));

  return diagnostics.items.map((integrity) => {
    const request = repairByAttendance.get(integrity.attendanceId);
    const appliedEvents = eventsByAttendance.get(integrity.attendanceId) ?? [];
    return buildAuditRecord(integrity, request, appliedEvents);
  });
}

function buildAuditRecord(
  integrity: AttendanceSnapshotIntegrityResult,
  request: AttendanceSnapshotRepairRequest | undefined,
  appliedEvents: AttendanceSnapshotRepairEvent[],
): AttendanceRepairAuditRecord {
  const events = buildEvents(integrity, request, appliedEvents);
  const sortedEvents = sortAuditEvents(events);
  const last = sortedEvents.at(-1);
  return {
    attendanceId: integrity.attendanceId,
    studentId: integrity.studentId,
    studentName: integrity.studentName,
    admissionNumber: integrity.admissionNumber,
    attendanceDate: integrity.attendanceDate,
    attendanceStatus: integrity.attendanceStatus,
    integrityStatus: integrity.status,
    integrityReason: integrity.reason,
    currentSnapshot: integrity.storedSnapshot,
    resolvedSnapshot: integrity.resolvedPlacement,
    proposedSnapshot: request?.proposedSnapshot ?? integrity.repairPlan.proposedSnapshot,
    repairId: request?.id,
    repairStatus: request?.status,
    source: request?.source ?? "diagnostic",
    batchCorrelationId: request?.batchCorrelationId,
    lastEventType: last?.eventType,
    lastActorId: last?.actorId,
    lastUpdatedAt: last?.timestamp,
    events: sortedEvents,
  };
}

function buildEvents(
  integrity: AttendanceSnapshotIntegrityResult,
  request: AttendanceSnapshotRepairRequest | undefined,
  appliedEvents: AttendanceSnapshotRepairEvent[],
): AttendanceRepairAuditEvent[] {
  const events: AttendanceRepairAuditEvent[] = [{
    eventId: `diagnostic-${integrity.attendanceId}`,
    attendanceId: integrity.attendanceId,
    eventType: integrity.status === "unresolved" ? "manual_review_required" : "diagnostic_detected",
    timestamp: integrity.attendanceDate ? `${integrity.attendanceDate}T00:00:00+05:30` : undefined,
    reason: integrity.reason,
    beforeSnapshot: integrity.storedSnapshot,
    afterSnapshot: integrity.resolvedPlacement,
    integrityStatus: integrity.status,
  }];

  if (request) {
    if (request.source === "bulk_preparation") {
      events.push({
        eventId: `batch-${request.id}`,
        attendanceId: request.attendanceId,
        repairId: request.id,
        eventType: "batch_prepared",
        actorId: request.requestedBy,
        actorDisplayName: request.requestedBy,
        timestamp: request.requestedAt,
        reason: "Repair request prepared from controlled bulk preview.",
        beforeSnapshot: request.currentSnapshot,
        afterSnapshot: request.proposedSnapshot,
        integrityStatus: request.integrityStatus,
        repairStatus: request.status,
        batchCorrelationId: request.batchCorrelationId,
      });
    }
    events.push({
      eventId: `created-${request.id}`,
      attendanceId: request.attendanceId,
      repairId: request.id,
      eventType: "repair_request_created",
      actorId: request.requestedBy,
      actorDisplayName: request.requestedBy,
      timestamp: request.requestedAt,
      reason: request.reason,
      beforeSnapshot: request.currentSnapshot,
      afterSnapshot: request.proposedSnapshot,
      integrityStatus: request.integrityStatus,
      repairStatus: request.status,
      batchCorrelationId: request.batchCorrelationId,
    });
    if (request.status === "approved" || request.status === "applied" || request.status === "failed") {
      events.push({
        eventId: `approved-${request.id}`,
        attendanceId: request.attendanceId,
        repairId: request.id,
        eventType: "repair_request_approved",
        actorId: request.reviewerId,
        actorDisplayName: request.reviewerId,
        timestamp: request.reviewedAt,
        comment: request.reviewComment,
        beforeSnapshot: request.currentSnapshot,
        afterSnapshot: request.proposedSnapshot,
        integrityStatus: request.integrityStatus,
        repairStatus: request.status,
        batchCorrelationId: request.batchCorrelationId,
      });
    }
    if (request.status === "rejected") {
      events.push({
        eventId: `rejected-${request.id}`,
        attendanceId: request.attendanceId,
        repairId: request.id,
        eventType: "repair_request_rejected",
        actorId: request.reviewerId,
        actorDisplayName: request.reviewerId,
        timestamp: request.reviewedAt,
        comment: request.reviewComment,
        beforeSnapshot: request.currentSnapshot,
        afterSnapshot: request.proposedSnapshot,
        integrityStatus: request.integrityStatus,
        repairStatus: request.status,
        batchCorrelationId: request.batchCorrelationId,
      });
    }
    if (request.status === "failed") {
      events.push({
        eventId: `failed-${request.id}`,
        attendanceId: request.attendanceId,
        repairId: request.id,
        eventType: request.failureReason?.toLowerCase().includes("changed after review") ? "repair_stale" : "repair_request_failed",
        actorId: request.appliedBy,
        actorDisplayName: request.appliedBy,
        timestamp: request.appliedAt ?? request.reviewedAt,
        reason: request.failureReason,
        beforeSnapshot: request.currentSnapshot,
        afterSnapshot: request.proposedSnapshot,
        integrityStatus: request.integrityStatus,
        repairStatus: request.status,
        batchCorrelationId: request.batchCorrelationId,
      });
    }
    if (request.status === "requires_manual_review") {
      events.push({
        eventId: `manual-review-${request.id}`,
        attendanceId: request.attendanceId,
        repairId: request.id,
        eventType: "manual_review_required",
        actorId: request.reviewerId,
        actorDisplayName: request.reviewerId,
        timestamp: request.reviewedAt ?? request.requestedAt,
        reason: request.failureReason ?? "Repair request requires manual review.",
        comment: request.reviewComment,
        beforeSnapshot: request.currentSnapshot,
        afterSnapshot: request.proposedSnapshot,
        integrityStatus: request.integrityStatus,
        repairStatus: request.status,
        batchCorrelationId: request.batchCorrelationId,
      });
    }
  }

  appliedEvents.forEach((event) => {
    events.push({
      eventId: event.id,
      attendanceId: event.attendanceId,
      repairId: event.repairId,
      eventType: "repair_request_applied",
      actorId: event.appliedBy,
      actorDisplayName: event.appliedBy,
      timestamp: event.appliedAt,
      reason: event.repairReason,
      comment: event.reviewComment,
      beforeSnapshot: event.beforeSnapshot,
      afterSnapshot: event.afterSnapshot,
      integrityStatus: request?.integrityStatus,
      repairStatus: "applied",
      batchCorrelationId: request?.batchCorrelationId,
    });
  });

  return events;
}
