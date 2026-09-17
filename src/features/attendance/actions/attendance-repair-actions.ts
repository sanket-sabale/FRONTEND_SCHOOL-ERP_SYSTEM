"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import { ApiError } from "@/lib/api/client";
import { attendanceRepairService } from "@/lib/api/attendance-repairs";
import { currentSessionRole, getCurrentUser } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type AttendanceRepairActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createAttendanceRepairRequestAction(_state: AttendanceRepairActionState, formData: FormData): Promise<AttendanceRepairActionState> {
  if (!hasPermission(currentSessionRole, "attendance.manage")) {
    return { status: "error", message: "You do not have permission to create repair requests." };
  }

  const attendanceId = getString(formData, "attendanceId");
  try {
    await attendanceRepairService.createRepairRequest({
      ...scope(),
      attendanceId,
      requestedBy: getCurrentUser(currentSessionRole).id,
      reason: getString(formData, "reason"),
    });
    revalidateRepairPaths(attendanceId);
    return { status: "success", message: "Repair request created for review." };
  } catch (error) {
    return toActionError(error, "Repair request could not be created.");
  }
}

export async function approveAttendanceRepairRequestAction(_state: AttendanceRepairActionState, formData: FormData): Promise<AttendanceRepairActionState> {
  if (!hasPermission(currentSessionRole, "attendance.manage")) {
    return { status: "error", message: "You do not have permission to approve repair requests." };
  }

  return mutateRepair(formData, "approve");
}

export async function rejectAttendanceRepairRequestAction(_state: AttendanceRepairActionState, formData: FormData): Promise<AttendanceRepairActionState> {
  if (!hasPermission(currentSessionRole, "attendance.manage")) {
    return { status: "error", message: "You do not have permission to reject repair requests." };
  }

  return mutateRepair(formData, "reject");
}

export async function applyAttendanceRepairRequestAction(_state: AttendanceRepairActionState, formData: FormData): Promise<AttendanceRepairActionState> {
  if (!hasPermission(currentSessionRole, "attendance.manage")) {
    return { status: "error", message: "You do not have permission to apply repair requests." };
  }

  return mutateRepair(formData, "apply");
}

async function mutateRepair(formData: FormData, operation: "approve" | "reject" | "apply"): Promise<AttendanceRepairActionState> {
  const repairId = getString(formData, "repairId");
  const actorId = getCurrentUser(currentSessionRole).id;
  try {
    const result = operation === "approve"
      ? await attendanceRepairService.approveRepairRequest({ ...scope(), repairId, actorId, comment: getOptionalString(formData, "comment") })
      : operation === "reject"
        ? await attendanceRepairService.rejectRepairRequest({ ...scope(), repairId, actorId, comment: getString(formData, "comment") })
        : await attendanceRepairService.applyRepairRequest({ ...scope(), repairId, actorId, comment: getOptionalString(formData, "comment") });
    revalidateRepairPaths(result.attendanceId, repairId);
    if (operation === "apply" && result.status === "failed") {
      return { status: "error", message: result.failureReason ?? "Repair could not be applied." };
    }
    return { status: "success", message: operation === "approve" ? "Repair request approved." : operation === "reject" ? "Repair request rejected." : "Repair applied to attendance snapshot." };
  } catch (error) {
    return toActionError(error, `Repair request could not be ${operation === "apply" ? "applied" : `${operation}d`}.`);
  }
}

function revalidateRepairPaths(attendanceId: string, repairId?: string) {
  revalidatePath("/attendance");
  revalidatePath("/attendance/history");
  revalidatePath("/attendance/reports");
  revalidatePath("/attendance/export");
  revalidatePath("/attendance/integrity");
  revalidatePath("/attendance/integrity/repairs");
  revalidatePath(`/attendance/integrity/${attendanceId}`);
  revalidatePath(`/attendance/history/${attendanceId}`);
  if (repairId) revalidatePath(`/attendance/integrity/repairs/${repairId}`);
}

function scope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}

function toActionError(error: unknown, fallback: string): AttendanceRepairActionState {
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
