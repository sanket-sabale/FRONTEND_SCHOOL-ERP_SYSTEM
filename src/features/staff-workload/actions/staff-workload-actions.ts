"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import { ApiError } from "@/lib/api/client";
import { staffAcademicAssignmentService } from "@/lib/api/staff-academic-assignments";
import { staffWorkloadService } from "@/lib/api/staff-workload";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StaffWorkloadActionState = { status: "idle" | "success" | "error"; message?: string };

export async function configureAssignmentWorkloadAction(_state: StaffWorkloadActionState, formData: FormData): Promise<StaffWorkloadActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) return { status: "error", message: "You do not have permission to configure staff workload." };
  try {
    const assignmentId = getString(formData, "assignmentId");
    const academicYearId = getString(formData, "academicYearId") || tenantContext.academicYearId;
    const scope = {
      tenantId: tenantContext.tenantId,
      schoolId: tenantContext.schoolId,
      campusId: tenantContext.campusId,
      academicYearId,
    };
    const assignment = await staffAcademicAssignmentService.getAssignment(scope, assignmentId);
    await staffWorkloadService.configureAssignmentWorkload({
      ...scope,
      assignmentId,
      weeklyPeriods: getOptionalNumber(formData, "weeklyPeriods"),
      contributesToWorkload: getString(formData, "contributesToWorkload") === "on",
      schedulingPriority: getString(formData, "schedulingPriority") as "low" | "normal" | "high",
      notes: getOptionalString(formData, "notes"),
    });
    revalidatePath("/staff/workload");
    revalidatePath(`/staff/workload/${assignment?.staffId ?? ""}`);
    revalidatePath("/staff/academic-assignments");
    revalidatePath(`/staff/academic-assignments/${assignmentId}`);
    if (assignment?.staffId) {
      revalidatePath(`/staff/${assignment.staffId}`);
      revalidatePath(`/staff/${assignment.staffId}/academic-assignments`);
    }
    return { status: "success", message: "Assignment workload configuration updated." };
  } catch (error) {
    return toActionError(error, "Unable to configure assignment workload.");
  }
}

function toActionError(error: unknown, fallback: string): StaffWorkloadActionState {
  return error instanceof ApiError ? { status: "error", message: error.message } : { status: "error", message: fallback };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  return getString(formData, key) || undefined;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value === "" ? undefined : Number(value);
}
