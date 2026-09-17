import type { AttendanceReportDashboard, AttendanceReportFilters } from "@/features/attendance/types/attendance-report";

export const attendanceExportFormats = ["csv", "xlsx", "pdf"] as const;
export type AttendanceExportFormat = (typeof attendanceExportFormats)[number];

export const attendanceExportScopes = ["student", "class", "section", "date-range", "full-filtered-report"] as const;
export type AttendanceExportScope = (typeof attendanceExportScopes)[number];

export const attendanceExportStatuses = ["queued", "processing", "completed", "failed"] as const;
export type AttendanceExportStatus = (typeof attendanceExportStatuses)[number];

export const attendanceExportColumns = [
  "student",
  "admissionNumber",
  "class",
  "section",
  "date",
  "status",
  "checkInTime",
  "remarks",
  "markedBy",
  "updatedAt",
  "correctionStatus",
] as const;
export type AttendanceExportColumn = (typeof attendanceExportColumns)[number];

export const attendanceReportPackSections = [
  "executive-summary",
  "attendance-overview",
  "daily-attendance-trend",
  "status-distribution",
  "class-performance",
  "section-performance",
  "student-attendance",
  "low-attendance-students",
  "correction-summary",
] as const;
export type AttendanceReportPackSection = (typeof attendanceReportPackSections)[number];

export type AttendanceExportRequest = {
  scope: AttendanceExportScope;
  filters: AttendanceReportFilters;
  format: AttendanceExportFormat;
  columns: AttendanceExportColumn[];
  includeCorrections: boolean;
  includeSummary: boolean;
  includeDetails: boolean;
  sections: AttendanceReportPackSection[];
  requestedBy: string;
};

export type AttendanceExportFileReference = {
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  storageReference?: string;
};

export type AttendanceExportJob = {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  academicYearId: string;
  status: AttendanceExportStatus;
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  format: AttendanceExportFormat;
  scope: AttendanceExportScope;
  filters: AttendanceReportFilters;
  columns: AttendanceExportColumn[];
  includeCorrections: boolean;
  includeSummary: boolean;
  includeDetails: boolean;
  sections: AttendanceReportPackSection[];
  fileReference?: AttendanceExportFileReference;
  error?: string;
};

export type AttendanceExportPreview = {
  request: AttendanceExportRequest;
  dashboard: AttendanceReportDashboard;
  scopeLabel: string;
  periodLabel: string;
  studentCount: number;
  attendanceRecordCount: number;
  correctedRecordCount: number;
  correctionEventCount: number;
  lowAttendanceStudentCount: number;
};
