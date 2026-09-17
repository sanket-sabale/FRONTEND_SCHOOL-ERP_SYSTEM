"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import { ApiError } from "@/lib/api/client";
import { staffLeaveService } from "@/lib/api/staff-leave";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StaffLeaveActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createStaffLeaveRequestAction(_state: StaffLeaveActionState, formData: FormData): Promise<StaffLeaveActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to create staff leave requests." };
  }

  try {
    await staffLeaveService.createRequest({
      ...scope(),
      staffId: getString(formData, "staffId"),
      leaveTypeId: getString(formData, "leaveTypeId"),
      startDate: getString(formData, "startDate"),
      endDate: getString(formData, "endDate"),
      reason: getString(formData, "reason"),
      attachmentName: getOptionalString(formData, "attachmentName"),
      status: "pending_approval",
    });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    return { status: "error", message: "Unable to create staff leave request." };
  }

  revalidatePath("/staff/leave");
  revalidatePath("/staff/leave/requests");
  return { status: "success", message: "Leave request created successfully." };
}

export async function reviewStaffLeaveRequestAction(_state: StaffLeaveActionState, formData: FormData): Promise<StaffLeaveActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to review staff leave requests." };
  }

  try {
    await staffLeaveService.reviewRequest({
      ...scope(),
      requestId: getString(formData, "requestId"),
      action: getString(formData, "action") as "approve" | "reject" | "cancel",
      reviewedBy: "current-user",
      reviewerRemarks: getOptionalString(formData, "reviewerRemarks"),
    });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    return { status: "error", message: "Unable to review staff leave request." };
  }

  revalidatePath("/staff/leave");
  revalidatePath("/staff/leave/requests");
  return { status: "success", message: "Leave request updated successfully." };
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
