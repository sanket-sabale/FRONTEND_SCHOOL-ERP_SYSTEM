"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import type { StaffAttendanceStatus } from "@/features/staff-attendance/types/staff-attendance";
import { ApiError } from "@/lib/api/client";
import { staffAttendanceService } from "@/lib/api/staff-attendance";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StaffAttendanceActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function markStaffAttendanceAction(_state: StaffAttendanceActionState, formData: FormData): Promise<StaffAttendanceActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to mark staff attendance." };
  }

  const staffIds = formData.getAll("staffId").filter((value): value is string => typeof value === "string");
  try {
    await staffAttendanceService.markAttendance({
      ...scope(),
      attendanceDate: getString(formData, "attendanceDate"),
      markedBy: "current-user",
      source: "manual",
      records: staffIds.map((staffId) => ({
        staffId,
        status: getString(formData, `status:${staffId}`) as StaffAttendanceStatus,
        checkIn: getOptionalString(formData, `checkIn:${staffId}`),
        checkOut: getOptionalString(formData, `checkOut:${staffId}`),
        remarks: getOptionalString(formData, `remarks:${staffId}`),
      })),
    });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    return { status: "error", message: "Unable to save staff attendance. Please try again." };
  }

  revalidatePath("/staff/attendance");
  revalidatePath("/staff/attendance/history");
  revalidatePath("/staff");
  return { status: "success", message: "Staff attendance saved successfully." };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  return getString(formData, key) || undefined;
}

function scope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}
