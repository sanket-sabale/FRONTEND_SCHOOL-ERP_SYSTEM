"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import { ApiError } from "@/lib/api/client";
import { attendanceRepairBatchService } from "@/lib/api/attendance-repair-batches";
import { currentSessionRole, getCurrentUser } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";
import type { AttendanceRepairBatchPreview, AttendanceRepairBatchResult } from "@/features/attendance/types/attendance-repair-batch";

export type AttendanceRepairBatchActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  preview?: AttendanceRepairBatchPreview;
  result?: AttendanceRepairBatchResult;
};

const initialError = "Batch repair preview could not be prepared.";

export async function previewAttendanceRepairBatchAction(_state: AttendanceRepairBatchActionState, formData: FormData): Promise<AttendanceRepairBatchActionState> {
  if (!hasPermission(currentSessionRole, "attendance.integrity.view")) {
    return { status: "error", message: "You do not have permission to preview attendance repair batches." };
  }

  try {
    const preview = await attendanceRepairBatchService.getBatchPreview({
      ...scope(),
      attendanceIds: getAttendanceIds(formData),
    });
    return { status: "success", message: "Batch preview generated. No attendance records were modified.", preview };
  } catch (error) {
    return toActionError(error, initialError);
  }
}

export async function prepareAttendanceRepairBatchAction(_state: AttendanceRepairBatchActionState, formData: FormData): Promise<AttendanceRepairBatchActionState> {
  if (!hasPermission(currentSessionRole, "attendance.manage")) {
    return { status: "error", message: "You do not have permission to prepare attendance repair requests." };
  }

  try {
    const result = await attendanceRepairBatchService.prepareRepairRequests({
      ...scope(),
      attendanceIds: getAttendanceIds(formData),
      requestedBy: getCurrentUser(currentSessionRole).id,
      reason: getString(formData, "reason") || "Prepared from controlled batch repair preview.",
    });
    revalidatePath("/attendance/integrity");
    revalidatePath("/attendance/integrity/bulk-repair");
    revalidatePath("/attendance/integrity/repairs");
    return { status: "success", message: `${result.preparedCount.toLocaleString("en-IN")} repair request${result.preparedCount === 1 ? "" : "s"} prepared. No attendance snapshots were changed.`, result };
  } catch (error) {
    return toActionError(error, "Repair requests could not be prepared from this batch.");
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

function getAttendanceIds(formData: FormData) {
  return formData.getAll("attendanceId").filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toActionError(error: unknown, fallback: string): AttendanceRepairBatchActionState {
  if (error instanceof ApiError) return { status: "error", message: error.message };
  if (error instanceof Error) return { status: "error", message: error.message };
  return { status: "error", message: fallback };
}
