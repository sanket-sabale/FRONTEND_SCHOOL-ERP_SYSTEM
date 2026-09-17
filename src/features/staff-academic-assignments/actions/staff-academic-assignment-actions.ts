"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import type { StaffAcademicAssignmentStatus, StaffAcademicAssignmentType } from "@/features/staff-academic-assignments/types/staff-academic-assignment";
import { ApiError } from "@/lib/api/client";
import { staffAcademicAssignmentService } from "@/lib/api/staff-academic-assignments";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StaffAcademicAssignmentActionState = { status: "idle" | "success" | "error"; message?: string };

export async function createStaffAcademicAssignmentAction(_state: StaffAcademicAssignmentActionState, formData: FormData): Promise<StaffAcademicAssignmentActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) return { status: "error", message: "You do not have permission to manage academic assignments." };
  try {
    const staffId = getString(formData, "staffId");
    await staffAcademicAssignmentService.createAssignment({
      ...scope(getString(formData, "academicYearId") || tenantContext.academicYearId),
      staffId,
      classId: getString(formData, "classId"),
      sectionId: getString(formData, "sectionId"),
      subjectId: getString(formData, "subjectId"),
      assignmentType: getString(formData, "assignmentType") as StaffAcademicAssignmentType,
      status: getOptionalString(formData, "status") as StaffAcademicAssignmentStatus | undefined,
      isPrimary: getString(formData, "isPrimary") === "on",
      startDate: getString(formData, "startDate"),
      endDate: getOptionalString(formData, "endDate"),
      notes: getOptionalString(formData, "notes"),
    });
    revalidateAssignments(staffId);
    return { status: "success", message: "Academic assignment created." };
  } catch (error) {
    return toActionError(error, "Unable to create academic assignment.");
  }
}

export async function changeStaffAcademicAssignmentStatusAction(_state: StaffAcademicAssignmentActionState, formData: FormData): Promise<StaffAcademicAssignmentActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) return { status: "error", message: "You do not have permission to manage academic assignments." };
  try {
    await staffAcademicAssignmentService.changeAssignmentStatus({
      ...scope(getString(formData, "academicYearId") || tenantContext.academicYearId),
      assignmentId: getString(formData, "assignmentId"),
      status: getString(formData, "status") as StaffAcademicAssignmentStatus,
      endDate: getOptionalString(formData, "endDate"),
    });
    revalidateAssignments(getOptionalString(formData, "staffId"));
    return { status: "success", message: "Assignment status updated." };
  } catch (error) {
    return toActionError(error, "Unable to update assignment status.");
  }
}

function scope(academicYearId: string) {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId };
}

function revalidateAssignments(staffId?: string) {
  revalidatePath("/staff/academic-assignments");
  revalidatePath("/staff/academic-assignments/workload");
  revalidatePath("/staff");
  if (staffId) {
    revalidatePath(`/staff/${staffId}`);
    revalidatePath(`/staff/${staffId}/academic-assignments`);
  }
}

function toActionError(error: unknown, fallback: string): StaffAcademicAssignmentActionState {
  return error instanceof ApiError ? { status: "error", message: error.message } : { status: "error", message: fallback };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  return getString(formData, key) || undefined;
}
