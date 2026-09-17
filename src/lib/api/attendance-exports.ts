import { attendanceExportRequestSchema } from "@/features/attendance/schemas/attendance-export.schema";
import type { AttendanceExportJob, AttendanceExportPreview, AttendanceExportRequest } from "@/features/attendance/types/attendance-export";
import type { AttendanceReportFilters } from "@/features/attendance/types/attendance-report";
import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { attendanceReportService } from "@/lib/api/attendance-reports";

const exportJobs = new Map<string, AttendanceExportJob>();

export const attendanceExportService = {
  async getExportPreview(scope: TenantScopedQuery, request: AttendanceExportRequest): Promise<AttendanceExportPreview> {
    const parsedRequest = attendanceExportRequestSchema.parse(request);
    const dashboard = await attendanceReportService.getReportDashboard(scope, normalizeReportFilters(parsedRequest.filters));

    return {
      request: parsedRequest,
      dashboard,
      scopeLabel: getScopeLabel(parsedRequest),
      periodLabel: getPeriodLabel(parsedRequest.filters),
      studentCount: dashboard.summary.totalStudents,
      attendanceRecordCount: dashboard.summary.totalAttendanceRecords,
      correctedRecordCount: dashboard.summary.correctedRecordCount,
      correctionEventCount: dashboard.summary.correctionEventCount,
      lowAttendanceStudentCount: dashboard.lowAttendanceStudents.length,
    };
  },

  async requestExport(scope: TenantScopedQuery, request: AttendanceExportRequest): Promise<AttendanceExportJob> {
    const preview = await this.getExportPreview(scope, request);

    if (preview.attendanceRecordCount === 0) {
      throw new ApiError(422, "No attendance records match the selected export filters.");
    }

    const now = new Date().toISOString();
    const job: AttendanceExportJob = {
      id: createJobId(now),
      tenantId: scope.tenantId,
      schoolId: scope.schoolId,
      campusId: scope.campusId,
      academicYearId: scope.academicYearId,
      status: "queued",
      requestedBy: preview.request.requestedBy,
      requestedAt: now,
      format: preview.request.format,
      scope: preview.request.scope,
      filters: preview.request.filters,
      columns: preview.request.columns,
      includeCorrections: preview.request.includeCorrections,
      includeSummary: preview.request.includeSummary,
      includeDetails: preview.request.includeDetails,
      sections: preview.request.sections,
    };

    exportJobs.set(job.id, job);
    return job;
  },

  async getExportJob(_scope: TenantScopedQuery, jobId: string): Promise<AttendanceExportJob | null> {
    return exportJobs.get(jobId) ?? null;
  },
};

function normalizeReportFilters(filters: AttendanceReportFilters): AttendanceReportFilters {
  return {
    ...filters,
    page: 1,
    pageSize: 100,
  };
}

function getScopeLabel(request: AttendanceExportRequest) {
  if (request.scope === "student") return "Selected student";
  if (request.scope === "class") return "Selected class";
  if (request.scope === "section") return "Selected class section";
  if (request.scope === "date-range") return "Date range";
  return "Full filtered report";
}

function getPeriodLabel(filters: AttendanceReportFilters) {
  if (filters.dateFrom && filters.dateTo) return `${filters.dateFrom} to ${filters.dateTo}`;
  if (filters.dateFrom) return `From ${filters.dateFrom}`;
  if (filters.dateTo) return `Until ${filters.dateTo}`;
  return "All attendance dates in the current academic scope";
}

function createJobId(timestamp: string) {
  const compactTimestamp = timestamp.replace(/[-:.TZ]/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `attendance-export-${compactTimestamp}-${suffix}`;
}
