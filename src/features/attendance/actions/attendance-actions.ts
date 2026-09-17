"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import { attendanceStatuses, type AttendanceStatus } from "@/features/attendance/types/attendance";
import { ApiError } from "@/lib/api/client";
import { attendanceService } from "@/lib/api/attendance";
import { currentSessionRole, getCurrentUser } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type AttendanceActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function markAttendanceAction(_state: AttendanceActionState, formData: FormData): Promise<AttendanceActionState> {
  if (!hasPermission(currentSessionRole, "attendance.mark")) {
    return { status: "error", message: "You do not have permission to mark student attendance." };
  }

  const studentIds = formData.getAll("studentId").filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  const records = studentIds.map((studentId) => ({
    studentId,
    classId: getString(formData, `classId:${studentId}`),
    sectionId: getString(formData, `sectionId:${studentId}`),
    status: getString(formData, `status:${studentId}`) as AttendanceStatus,
    checkInTime: getOptionalString(formData, `checkInTime:${studentId}`),
    checkOutTime: getOptionalString(formData, `checkOutTime:${studentId}`),
    remarks: getOptionalString(formData, `remarks:${studentId}`),
  }));

  if (records.some((record) => !attendanceStatuses.includes(record.status))) {
    return { status: "error", message: "Please select a valid attendance status for every student." };
  }

  try {
    await attendanceService.markAttendance({
      ...scope(),
      date: getString(formData, "date"),
      records,
      markedBy: getCurrentUser(currentSessionRole).id,
      source: "manual",
    });
  } catch (error) {
    return toActionError(error, "Attendance could not be saved. Please review the records and try again.");
  }

  revalidatePath("/attendance");
  revalidatePath("/attendance/mark");
  studentIds.forEach((studentId) => revalidatePath(`/students/${studentId}`));
  return { status: "success", message: "Attendance saved successfully." };
}

export async function correctAttendanceAction(_state: AttendanceActionState, formData: FormData): Promise<AttendanceActionState> {
  if (!hasPermission(currentSessionRole, "attendance.correct")) {
    return { status: "error", message: "You do not have permission to correct attendance." };
  }

  const attendanceId = getString(formData, "attendanceId");
  try {
    const result = await attendanceService.correctAttendance({
      ...scope(),
      attendanceId,
      newStatus: getString(formData, "newStatus") as AttendanceStatus,
      reason: getString(formData, "reason"),
      correctedBy: getCurrentUser(currentSessionRole).id,
    });

    revalidatePath("/attendance");
    revalidatePath("/attendance/history");
    revalidatePath(`/attendance/history/${attendanceId}`);
    revalidatePath(`/students/${result.record.studentId}`);
    return { status: "success", message: "Attendance correction saved with history." };
  } catch (error) {
    return toActionError(error, "Attendance correction could not be saved.");
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

function toActionError(error: unknown, fallback: string): AttendanceActionState {
  if (error instanceof ApiError) return { status: "error", message: error.message };
  return { status: "error", message: fallback };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || undefined;
}
