import { academicStructureService } from "@/lib/api/academic-structure";
import { attendanceIntegrityService } from "@/lib/api/attendance-integrity";
import { attendanceService } from "@/lib/api/attendance";
import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import {
  attendanceRepairCreateSchema,
  attendanceRepairFiltersSchema,
  attendanceRepairMutationSchema,
} from "@/features/attendance/schemas/attendance-repair.schema";
import {
  validateNoActiveRepairRequest,
  validateRepairCanApply,
  validateRepairCanApprove,
  validateRepairCanReject,
  validateRepairRequestEligibility,
  validateSnapshotStillMatchesReview,
} from "@/features/attendance/services/attendance-repair-rules";
import { mockAttendanceRepairEvents, mockAttendanceRepairRequests } from "@/features/attendance/services/mock-attendance-repairs";
import type {
  AttendanceRepairCreateInput,
  AttendanceRepairFilters,
  AttendanceRepairMutationInput,
  AttendanceRepairQueueResponse,
  AttendanceSnapshotRepairEvent,
  AttendanceSnapshotRepairRequest,
} from "@/features/attendance/types/attendance-repair";

let repairRequests = [...mockAttendanceRepairRequests];
let repairEvents = [...mockAttendanceRepairEvents];

export const attendanceRepairService = {
  async getRepairQueue(scope: TenantScopedQuery, filters: AttendanceRepairFilters = {}): Promise<AttendanceRepairQueueResponse> {
    const parsedFilters = attendanceRepairFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    const filtered = repairRequests
      .filter((request) => isRepairInScope(request, scope))
      .filter((request) => !parsedFilters.status || request.status === parsedFilters.status)
      .filter((request) => !parsedFilters.integrityStatus || request.integrityStatus === parsedFilters.integrityStatus)
      .filter((request) => !parsedFilters.studentId || request.studentId === parsedFilters.studentId)
      .filter((request) => !parsedFilters.classId || request.proposedSnapshot.classId === parsedFilters.classId || request.currentSnapshot.classId === parsedFilters.classId)
      .filter((request) => !parsedFilters.sectionId || request.proposedSnapshot.sectionId === parsedFilters.sectionId || request.currentSnapshot.sectionId === parsedFilters.sectionId)
      .filter((request) => !parsedFilters.dateFrom || request.attendanceDate >= parsedFilters.dateFrom)
      .filter((request) => !parsedFilters.dateTo || request.attendanceDate <= parsedFilters.dateTo)
      .filter((request) => !query || [
        request.attendanceId,
        request.studentName,
        request.admissionNumber,
        request.integrityStatus,
        request.status,
        request.currentSnapshot.className,
        request.currentSnapshot.sectionName,
        request.proposedSnapshot.className,
        request.proposedSnapshot.sectionName,
      ].filter(Boolean).join(" ").toLowerCase().includes(query))
      .sort((first, second) => statusRank(first.status) - statusRank(second.status) || second.requestedAt.localeCompare(first.requestedAt));

    const page = parsedFilters.page;
    const pageSize = parsedFilters.pageSize;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize).map(cloneRepairRequest),
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  async getRepairRequest(scope: TenantScopedQuery, repairId: string) {
    const request = repairRequests.find((item) => item.id === repairId && isRepairInScope(item, scope));
    return request ? cloneRepairRequest(request) : null;
  },

  async getRepairRequestForAttendance(scope: TenantScopedQuery, attendanceId: string) {
    const request = repairRequests.find((item) => item.attendanceId === attendanceId && isRepairInScope(item, scope));
    return request ? cloneRepairRequest(request) : null;
  },

  async getRepairRequests(scope: TenantScopedQuery) {
    return repairRequests.filter((request) => isRepairInScope(request, scope)).map(cloneRepairRequest);
  },

  async createRepairRequest(input: AttendanceRepairCreateInput) {
    const parsedInput = attendanceRepairCreateSchema.parse(input);
    const integrity = await attendanceIntegrityService.getAttendanceSnapshotIntegrityDetail(parsedInput, parsedInput.attendanceId);
    if (!integrity) throw new ApiError(404, "Attendance integrity record could not be found.");
    ensureValid(validateRepairRequestEligibility(integrity));
    ensureValid(validateNoActiveRepairRequest(repairRequests.filter((request) => isRepairInScope(request, parsedInput)), parsedInput.attendanceId));
    if (!integrity.repairPlan.proposedSnapshot?.academicYearId || !integrity.repairPlan.proposedSnapshot.classId || !integrity.repairPlan.proposedSnapshot.sectionId) {
      throw new ApiError(422, "Repair request requires a complete proposed academic snapshot.");
    }

    const now = new Date().toISOString();
    const request: AttendanceSnapshotRepairRequest = {
      ...parsedInput,
      id: createRepairId(parsedInput.attendanceId),
      studentId: integrity.studentId,
      studentName: integrity.studentName,
      admissionNumber: integrity.admissionNumber,
      attendanceDate: integrity.attendanceDate,
      attendanceStatus: integrity.attendanceStatus,
      requestedAt: now,
      source: parsedInput.source ?? "individual",
      batchCorrelationId: parsedInput.batchCorrelationId,
      integrityStatus: integrity.status,
      currentSnapshot: integrity.storedSnapshot,
      proposedSnapshot: integrity.repairPlan.proposedSnapshot,
      confidence: integrity.repairPlan.confidence === "high" ? "high" : integrity.repairPlan.confidence === "medium" ? "medium" : "low",
      status: "pending_review",
    };

    repairRequests = [request, ...repairRequests];
    return cloneRepairRequest(request);
  },

  async approveRepairRequest(input: AttendanceRepairMutationInput) {
    const parsedInput = attendanceRepairMutationSchema.parse(input);
    const current = getRepairOrThrow(parsedInput, parsedInput.repairId);
    ensureValid(validateRepairCanApprove(current));
    const next: AttendanceSnapshotRepairRequest = {
      ...current,
      status: "approved",
      reviewerId: parsedInput.actorId,
      reviewedAt: new Date().toISOString(),
      reviewComment: parsedInput.comment,
    };
    repairRequests = repairRequests.map((request) => (request.id === next.id ? next : request));
    return cloneRepairRequest(next);
  },

  async rejectRepairRequest(input: AttendanceRepairMutationInput) {
    const parsedInput = attendanceRepairMutationSchema.parse(input);
    const current = getRepairOrThrow(parsedInput, parsedInput.repairId);
    ensureValid(validateRepairCanReject(current, parsedInput.comment));
    const next: AttendanceSnapshotRepairRequest = {
      ...current,
      status: "rejected",
      reviewerId: parsedInput.actorId,
      reviewedAt: new Date().toISOString(),
      reviewComment: parsedInput.comment,
    };
    repairRequests = repairRequests.map((request) => (request.id === next.id ? next : request));
    return cloneRepairRequest(next);
  },

  async applyRepairRequest(input: AttendanceRepairMutationInput) {
    const parsedInput = attendanceRepairMutationSchema.parse(input);
    const current = getRepairOrThrow(parsedInput, parsedInput.repairId);
    ensureValid(validateRepairCanApply(current));

    const record = await attendanceService.getAttendanceSnapshotRecord(parsedInput, current.attendanceId);
    if (!record) throw new ApiError(404, "Attendance record could not be found.");
    const staleCheck = validateSnapshotStillMatchesReview(record, current);
    if (!staleCheck.valid) {
      return failRepair(current, staleCheck.message);
    }

    const academicScope = { ...parsedInput, academicYearId: current.proposedSnapshot.academicYearId ?? parsedInput.academicYearId };
    const [academicYear, academicClass, section, integrity] = await Promise.all([
      academicStructureService.getAcademicYear(academicScope, academicScope.academicYearId),
      academicStructureService.getClass(academicScope, current.proposedSnapshot.classId ?? ""),
      academicStructureService.getSection(academicScope, current.proposedSnapshot.sectionId ?? ""),
      attendanceIntegrityService.getAttendanceSnapshotIntegrityDetail(parsedInput, current.attendanceId),
    ]);
    if (!academicYear || !academicClass || !section || section.classId !== academicClass.id || academicClass.academicYearId !== academicScope.academicYearId || section.academicYearId !== academicScope.academicYearId) {
      return failRepair(current, "Proposed academic structure is no longer valid.");
    }
    if (!integrity?.repairPlan.proposedSnapshot || integrity.status === "unresolved") {
      return failRepair(current, "Placement evidence is no longer deterministic.");
    }

    await attendanceService.repairAttendanceSnapshot({
      ...parsedInput,
      attendanceId: current.attendanceId,
      beforeAcademicYearId: current.currentSnapshot.academicYearId,
      beforeClassId: current.currentSnapshot.classId,
      beforeSectionId: current.currentSnapshot.sectionId,
      academicYearId: academicScope.academicYearId,
      classId: academicClass.id,
      sectionId: section.id,
    });

    const now = new Date().toISOString();
    const next: AttendanceSnapshotRepairRequest = {
      ...current,
      status: "applied",
      appliedBy: parsedInput.actorId,
      appliedAt: now,
    };
    const event: AttendanceSnapshotRepairEvent = {
      tenantId: current.tenantId,
      schoolId: current.schoolId,
      campusId: current.campusId,
      academicYearId: current.academicYearId,
      id: `repair-event-${current.id}`,
      repairId: current.id,
      attendanceId: current.attendanceId,
      beforeSnapshot: current.currentSnapshot,
      afterSnapshot: current.proposedSnapshot,
      requestedBy: current.requestedBy,
      approvedBy: current.reviewerId,
      appliedBy: parsedInput.actorId,
      requestedAt: current.requestedAt,
      approvedAt: current.reviewedAt,
      appliedAt: now,
      reviewComment: current.reviewComment,
      repairReason: current.reason,
    };

    repairRequests = repairRequests.map((request) => (request.id === next.id ? next : request));
    if (!repairEvents.some((item) => item.repairId === current.id)) repairEvents = [...repairEvents, event];
    return cloneRepairRequest(next);
  },

  async getRepairHistory(scope: TenantScopedQuery, attendanceId?: string) {
    return repairEvents
      .filter((event) => isRepairInScope(event, scope))
      .filter((event) => !attendanceId || event.attendanceId === attendanceId)
      .map((event) => ({ ...event }));
  },
};

function getRepairOrThrow(scope: TenantScopedQuery, repairId: string) {
  const repair = repairRequests.find((request) => request.id === repairId && isRepairInScope(request, scope));
  if (!repair) throw new ApiError(404, "Repair request could not be found.");
  return repair;
}

function failRepair(current: AttendanceSnapshotRepairRequest, message: string) {
  const next: AttendanceSnapshotRepairRequest = {
    ...current,
    status: "failed",
    failureReason: message,
  };
  repairRequests = repairRequests.map((request) => (request.id === next.id ? next : request));
  return cloneRepairRequest(next);
}

function ensureValid(result: { valid: true } | { valid: false; message: string }) {
  if (!result.valid) throw new ApiError(422, result.message);
}

function isRepairInScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId && record.academicYearId === scope.academicYearId;
}

function cloneRepairRequest(request: AttendanceSnapshotRepairRequest): AttendanceSnapshotRepairRequest {
  return {
    ...request,
    currentSnapshot: { ...request.currentSnapshot },
    proposedSnapshot: { ...request.proposedSnapshot },
  };
}

function createRepairId(attendanceId: string) {
  return `repair-${attendanceId}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function statusRank(status: AttendanceSnapshotRepairRequest["status"]) {
  const order: Record<AttendanceSnapshotRepairRequest["status"], number> = {
    pending_review: 1,
    approved: 2,
    requires_manual_review: 3,
    failed: 4,
    rejected: 5,
    applied: 6,
  };
  return order[status];
}
