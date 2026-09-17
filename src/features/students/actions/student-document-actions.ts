"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import type { StudentDocumentType } from "@/features/students/types/student";
import { ApiError } from "@/lib/api/client";
import { studentDocumentService } from "@/lib/api/student-documents";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StudentDocumentActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createStudentDocumentAction(_state: StudentDocumentActionState, formData: FormData): Promise<StudentDocumentActionState> {
  if (!hasPermission(currentSessionRole, "student.manage")) {
    return { status: "error", message: "You do not have permission to upload student documents." };
  }

  try {
    const studentId = getString(formData, "studentId");
    await studentDocumentService.createStudentDocument({
      ...scope(),
      studentId,
      documentType: getString(formData, "documentType") as StudentDocumentType,
      title: getOptionalString(formData, "title"),
      description: getOptionalString(formData, "description"),
      expiresAt: getOptionalString(formData, "expiresAt"),
      attachment: {
        fileName: getString(formData, "fileName"),
        mimeType: getString(formData, "mimeType"),
        fileSize: getPositiveNumber(formData, "fileSize"),
      },
    });

    revalidateStudentDocuments(studentId);
    return { status: "success", message: "Student document uploaded successfully." };
  } catch (error) {
    return toActionError(error, "Unable to upload the student document. Please try again.");
  }
}

export async function verifyStudentDocumentAction(_state: StudentDocumentActionState, formData: FormData): Promise<StudentDocumentActionState> {
  if (!hasPermission(currentSessionRole, "student.manage")) {
    return { status: "error", message: "You do not have permission to verify student documents." };
  }

  try {
    const studentId = getString(formData, "studentId");
    await studentDocumentService.verifyStudentDocument({
      ...scope(),
      studentId,
      documentId: getString(formData, "documentId"),
    });

    revalidateStudentDocuments(studentId);
    return { status: "success", message: "Student document verified successfully." };
  } catch (error) {
    return toActionError(error, "Unable to verify the student document. Please try again.");
  }
}

export async function rejectStudentDocumentAction(_state: StudentDocumentActionState, formData: FormData): Promise<StudentDocumentActionState> {
  if (!hasPermission(currentSessionRole, "student.manage")) {
    return { status: "error", message: "You do not have permission to reject student documents." };
  }

  try {
    const studentId = getString(formData, "studentId");
    await studentDocumentService.rejectStudentDocument({
      ...scope(),
      studentId,
      documentId: getString(formData, "documentId"),
      rejectionReason: getString(formData, "rejectionReason"),
    });

    revalidateStudentDocuments(studentId);
    return { status: "success", message: "Student document rejected." };
  } catch (error) {
    return toActionError(error, "Unable to reject the student document. Please try again.");
  }
}

export async function archiveStudentDocumentAction(_state: StudentDocumentActionState, formData: FormData): Promise<StudentDocumentActionState> {
  if (!hasPermission(currentSessionRole, "student.manage")) {
    return { status: "error", message: "You do not have permission to archive student documents." };
  }

  try {
    const studentId = getString(formData, "studentId");
    await studentDocumentService.archiveStudentDocument({
      ...scope(),
      studentId,
      documentId: getString(formData, "documentId"),
      reason: getOptionalString(formData, "reason"),
    });

    revalidateStudentDocuments(studentId);
    return { status: "success", message: "Student document archived." };
  } catch (error) {
    return toActionError(error, "Unable to archive the student document. Please try again.");
  }
}

export async function restoreStudentDocumentAction(_state: StudentDocumentActionState, formData: FormData): Promise<StudentDocumentActionState> {
  if (!hasPermission(currentSessionRole, "student.manage")) {
    return { status: "error", message: "You do not have permission to restore student documents." };
  }

  try {
    const studentId = getString(formData, "studentId");
    await studentDocumentService.restoreStudentDocument({
      ...scope(),
      studentId,
      documentId: getString(formData, "documentId"),
      reason: getOptionalString(formData, "reason"),
    });

    revalidateStudentDocuments(studentId);
    return { status: "success", message: "Student document restored." };
  } catch (error) {
    return toActionError(error, "Unable to restore the student document. Please try again.");
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

function revalidateStudentDocuments(studentId: string) {
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
}

function toActionError(error: unknown, fallback: string): StudentDocumentActionState {
  if (error instanceof ApiError) {
    return { status: "error", message: error.message };
  }

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

function getPositiveNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) && value > 0 ? value : 0;
}
