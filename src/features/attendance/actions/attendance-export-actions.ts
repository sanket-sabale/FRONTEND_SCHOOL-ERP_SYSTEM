"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import { attendanceStatuses, type AttendanceStatus } from "@/features/attendance/types/attendance";
import {
  attendanceExportColumns,
  attendanceExportFormats,
  attendanceExportScopes,
  attendanceReportPackSections,
  type AttendanceExportColumn,
  type AttendanceExportFormat,
  type AttendanceExportScope,
  type AttendanceReportPackSection,
} from "@/features/attendance/types/attendance-export";
import type { AttendanceReportFilters } from "@/features/attendance/types/attendance-report";
import { attendanceExportService } from "@/lib/api/attendance-exports";
import { ApiError } from "@/lib/api/client";
import { currentSessionRole, getCurrentUser } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type AttendanceExportActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  jobId?: string;
  jobStatus?: string;
};

export async function requestAttendanceExportAction(
  _state: AttendanceExportActionState,
  formData: FormData,
): Promise<AttendanceExportActionState> {
  if (!hasPermission(currentSessionRole, "attendance.report")) {
    return { status: "error", message: "You do not have permission to request attendance exports." };
  }

  try {
    const job = await attendanceExportService.requestExport(scope(), {
      scope: getExportScope(formData),
      filters: getReportFilters(formData),
      format: getExportFormat(formData),
      columns: getColumns(formData),
      includeCorrections: getBoolean(formData, "includeCorrections"),
      includeSummary: getBoolean(formData, "includeSummary"),
      includeDetails: getBoolean(formData, "includeDetails"),
      sections: getSections(formData),
      requestedBy: getCurrentUser(currentSessionRole).id,
    });

    revalidatePath("/attendance/export");
    return {
      status: "success",
      jobId: job.id,
      jobStatus: job.status,
      message: "Export request queued. The mock service records the request contract only; no downloadable file is generated until a real export worker exists.",
    };
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    if (error instanceof Error) return { status: "error", message: error.message };
    return { status: "error", message: "Attendance export could not be requested. Please review the configuration and try again." };
  }
}

function scope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}

function getReportFilters(formData: FormData): AttendanceReportFilters {
  const status = getOptionalString(formData, "status");
  return {
    dateFrom: getOptionalString(formData, "dateFrom"),
    dateTo: getOptionalString(formData, "dateTo"),
    studentId: getOptionalString(formData, "studentId"),
    classId: getOptionalString(formData, "classId"),
    sectionId: getOptionalString(formData, "sectionId"),
    status: isAttendanceStatus(status) ? status : undefined,
    correctedOnly: getBoolean(formData, "correctedOnly"),
    attendanceThreshold: getNumber(formData, "attendanceThreshold", 75),
    page: 1,
    pageSize: 100,
    sortBy: "attendancePercentage",
    sortDirection: "asc",
  };
}

function getExportScope(formData: FormData): AttendanceExportScope {
  const value = getString(formData, "exportScope");
  return attendanceExportScopes.includes(value as AttendanceExportScope) ? value as AttendanceExportScope : "full-filtered-report";
}

function getExportFormat(formData: FormData): AttendanceExportFormat {
  const value = getString(formData, "format");
  return attendanceExportFormats.includes(value as AttendanceExportFormat) ? value as AttendanceExportFormat : "csv";
}

function getColumns(formData: FormData): AttendanceExportColumn[] {
  return formData.getAll("columns").filter((value): value is AttendanceExportColumn => (
    typeof value === "string" && attendanceExportColumns.includes(value as AttendanceExportColumn)
  ));
}

function getSections(formData: FormData): AttendanceReportPackSection[] {
  return formData.getAll("sections").filter((value): value is AttendanceReportPackSection => (
    typeof value === "string" && attendanceReportPackSections.includes(value as AttendanceReportPackSection)
  ));
}

function isAttendanceStatus(value?: string): value is AttendanceStatus {
  return Boolean(value && attendanceStatuses.includes(value as AttendanceStatus));
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || undefined;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "true";
}

function getNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}
