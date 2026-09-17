"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import type { StaffDocumentType } from "@/features/staff-documents/types/staff-document";
import { ApiError } from "@/lib/api/client";
import { staffDocumentService } from "@/lib/api/staff-documents";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StaffDocumentActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createStaffDocumentAction(_state: StaffDocumentActionState, formData: FormData): Promise<StaffDocumentActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to upload staff documents." };
  }

  try {
    const staffId = getString(formData, "staffId");
    await staffDocumentService.createStaffDocument({
      ...scope(),
      staffId,
      documentType: getString(formData, "documentType") as StaffDocumentType,
      title: getOptionalString(formData, "title"),
      description: getOptionalString(formData, "description"),
      expiryDate: getOptionalString(formData, "expiryDate"),
      replacementOfDocumentId: getOptionalString(formData, "replacementOfDocumentId"),
      attachment: {
        fileName: getString(formData, "fileName"),
        mimeType: getString(formData, "mimeType"),
        fileSize: getPositiveNumber(formData, "fileSize"),
      },
    });
    revalidateStaffDocuments(staffId);
    return { status: "success", message: "Staff document uploaded successfully." };
  } catch (error) {
    return toActionError(error, "Unable to upload the staff document. Please try again.");
  }
}

export async function verifyStaffDocumentAction(_state: StaffDocumentActionState, formData: FormData): Promise<StaffDocumentActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to verify staff documents." };
  }

  try {
    const staffId = getString(formData, "staffId");
    await staffDocumentService.verifyStaffDocument({
      ...scope(),
      staffId,
      documentId: getString(formData, "documentId"),
      verificationNotes: getOptionalString(formData, "verificationNotes"),
    });
    revalidateStaffDocuments(staffId);
    return { status: "success", message: "Staff document verified successfully." };
  } catch (error) {
    return toActionError(error, "Unable to verify the staff document. Please try again.");
  }
}

export async function rejectStaffDocumentAction(_state: StaffDocumentActionState, formData: FormData): Promise<StaffDocumentActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to reject staff documents." };
  }

  try {
    const staffId = getString(formData, "staffId");
    await staffDocumentService.rejectStaffDocument({
      ...scope(),
      staffId,
      documentId: getString(formData, "documentId"),
      verificationNotes: getString(formData, "verificationNotes"),
    });
    revalidateStaffDocuments(staffId);
    return { status: "success", message: "Staff document rejected." };
  } catch (error) {
    return toActionError(error, "Unable to reject the staff document. Please try again.");
  }
}

export async function archiveStaffDocumentAction(_state: StaffDocumentActionState, formData: FormData): Promise<StaffDocumentActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to archive staff documents." };
  }

  try {
    const staffId = getString(formData, "staffId");
    await staffDocumentService.archiveStaffDocument({
      ...scope(),
      staffId,
      documentId: getString(formData, "documentId"),
      reason: getOptionalString(formData, "reason"),
    });
    revalidateStaffDocuments(staffId);
    return { status: "success", message: "Staff document archived." };
  } catch (error) {
    return toActionError(error, "Unable to archive the staff document. Please try again.");
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

function revalidateStaffDocuments(staffId: string) {
  revalidatePath("/staff");
  revalidatePath(`/staff/${staffId}`);
  revalidatePath(`/staff/${staffId}/documents`);
}

function toActionError(error: unknown, fallback: string): StaffDocumentActionState {
  return error instanceof ApiError ? { status: "error", message: error.message } : { status: "error", message: fallback };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  return getString(formData, key) || undefined;
}

function getPositiveNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) && value > 0 ? value : 0;
}
