"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/components/shared/permission-gate";
import type { GuardianStudentRelationshipType } from "@/features/guardians/types/guardian";
import { ApiError } from "@/lib/api/client";
import { guardianService } from "@/lib/api/guardians";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type GuardianActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createGuardianAction(_state: GuardianActionState, formData: FormData): Promise<GuardianActionState> {
  if (!hasPermission(currentSessionRole, "guardian.create")) return { status: "error", message: "You do not have permission to create guardians." };

  let guardianId = "";
  try {
    const guardian = await guardianService.createGuardian({
      ...scope(),
      firstName: getString(formData, "firstName"),
      middleName: getOptionalString(formData, "middleName"),
      lastName: getString(formData, "lastName"),
      occupation: getOptionalString(formData, "occupation"),
      employer: getOptionalString(formData, "employer"),
      email: getOptionalString(formData, "email"),
      primaryPhone: getString(formData, "primaryPhone"),
      alternatePhone: getOptionalString(formData, "alternatePhone"),
      address: getOptionalString(formData, "address"),
      city: getOptionalString(formData, "city"),
      state: getOptionalString(formData, "state"),
      country: getOptionalString(formData, "country"),
      postalCode: getOptionalString(formData, "postalCode"),
      preferredLanguage: getOptionalString(formData, "preferredLanguage"),
    });
    guardianId = guardian.id;
  } catch (error) {
    return toActionError(error, "Unable to create guardian. Please review the form and try again.");
  }

  revalidatePath("/guardians");
  redirect(`/guardians/${encodeURIComponent(guardianId)}?created=1`);
}

export async function linkGuardianToStudentAction(_state: GuardianActionState, formData: FormData): Promise<GuardianActionState> {
  if (!hasPermission(currentSessionRole, "guardian.link")) return { status: "error", message: "You do not have permission to link guardians." };

  const studentId = getString(formData, "studentId");
  try {
    await guardianService.createRelationship({
      ...scope(),
      studentId,
      guardianId: getString(formData, "guardianId"),
      relationshipType: getString(formData, "relationshipType") as GuardianStudentRelationshipType,
      isPrimary: formData.get("isPrimary") === "on",
      isEmergencyContact: formData.get("isEmergencyContact") === "on",
      canPickup: formData.get("canPickup") === "on",
      canReceiveAcademicCommunication: formData.get("canReceiveAcademicCommunication") === "on",
      canReceiveFeeCommunication: formData.get("canReceiveFeeCommunication") === "on",
      canReceiveAttendanceCommunication: formData.get("canReceiveAttendanceCommunication") === "on",
      canReceiveGeneralCommunication: formData.get("canReceiveGeneralCommunication") === "on",
      notes: getOptionalString(formData, "notes"),
    });
  } catch (error) {
    return toActionError(error, "Guardian relationship could not be created.");
  }

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/guardians");
  return { status: "success", message: "Guardian linked to student." };
}

export async function updateGuardianRelationshipAction(_state: GuardianActionState, formData: FormData): Promise<GuardianActionState> {
  if (!hasPermission(currentSessionRole, "guardian.manage")) return { status: "error", message: "You do not have permission to manage guardian relationships." };
  const studentId = getString(formData, "studentId");
  try {
    await guardianService.updateRelationship({
      ...scope(),
      relationshipId: getString(formData, "relationshipId"),
      relationshipType: getString(formData, "relationshipType") as GuardianStudentRelationshipType,
      isPrimary: formData.get("isPrimary") === "on",
      isEmergencyContact: formData.get("isEmergencyContact") === "on",
      canPickup: formData.get("canPickup") === "on",
      canReceiveAcademicCommunication: formData.get("canReceiveAcademicCommunication") === "on",
      canReceiveFeeCommunication: formData.get("canReceiveFeeCommunication") === "on",
      canReceiveAttendanceCommunication: formData.get("canReceiveAttendanceCommunication") === "on",
      canReceiveGeneralCommunication: formData.get("canReceiveGeneralCommunication") === "on",
      notes: getOptionalString(formData, "notes"),
    });
  } catch (error) {
    return toActionError(error, "Guardian relationship could not be updated.");
  }
  revalidatePath(`/students/${studentId}`);
  return { status: "success", message: "Guardian relationship updated." };
}

export async function endGuardianRelationshipAction(_state: GuardianActionState, formData: FormData): Promise<GuardianActionState> {
  if (!hasPermission(currentSessionRole, "guardian.manage")) return { status: "error", message: "You do not have permission to end guardian relationships." };
  const studentId = getString(formData, "studentId");
  try {
    await guardianService.endRelationship({
      ...scope(),
      relationshipId: getString(formData, "relationshipId"),
      notes: getOptionalString(formData, "notes"),
    });
  } catch (error) {
    return toActionError(error, "Guardian relationship could not be ended.");
  }
  revalidatePath(`/students/${studentId}`);
  return { status: "success", message: "Guardian relationship ended." };
}

export async function archiveGuardianAction(_state: GuardianActionState, formData: FormData): Promise<GuardianActionState> {
  if (!hasPermission(currentSessionRole, "guardian.archive")) return { status: "error", message: "You do not have permission to archive guardians." };
  const guardianId = getString(formData, "guardianId");
  try {
    await guardianService.archiveGuardian(scope(), guardianId);
  } catch (error) {
    return toActionError(error, "Guardian could not be archived.");
  }
  revalidatePath("/guardians");
  revalidatePath(`/guardians/${guardianId}`);
  return { status: "success", message: "Guardian archived." };
}

export async function restoreGuardianAction(_state: GuardianActionState, formData: FormData): Promise<GuardianActionState> {
  if (!hasPermission(currentSessionRole, "guardian.archive")) return { status: "error", message: "You do not have permission to restore guardians." };
  const guardianId = getString(formData, "guardianId");
  try {
    await guardianService.restoreGuardian(scope(), guardianId);
  } catch (error) {
    return toActionError(error, "Guardian could not be restored.");
  }
  revalidatePath("/guardians");
  revalidatePath(`/guardians/${guardianId}`);
  return { status: "success", message: "Guardian restored." };
}

function scope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}

function toActionError(error: unknown, fallback: string): GuardianActionState {
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
