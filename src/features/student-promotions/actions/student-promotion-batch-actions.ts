"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import { ApiError } from "@/lib/api/client";
import { studentPromotionBatchService } from "@/lib/api/student-promotion-batches";
import { currentSessionRole, getCurrentUser } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";
import type { StudentPromotionBatchPreview, StudentPromotionBatchResult } from "@/features/student-promotions/types/student-promotion-batch";

export type StudentPromotionBatchActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  preview?: StudentPromotionBatchPreview;
  result?: StudentPromotionBatchResult;
};

export async function previewStudentPromotionBatchAction(_state: StudentPromotionBatchActionState, formData: FormData): Promise<StudentPromotionBatchActionState> {
  if (!hasPermission(currentSessionRole, "academic.view")) {
    return { status: "error", message: "You do not have permission to preview promotions." };
  }

  try {
    const preview = await studentPromotionBatchService.getBatchPreview({
      ...scope(getString(formData, "sourceAcademicYearId")),
      sourceAcademicYearId: getString(formData, "sourceAcademicYearId"),
      targetAcademicYearId: getString(formData, "targetAcademicYearId"),
      candidateIds: getCandidateIds(formData),
    });
    return { status: "success", message: "Bulk promotion preview generated. No students were promoted.", preview };
  } catch (error) {
    return toActionError(error, "Promotion preview could not be generated.");
  }
}

export async function prepareStudentPromotionBatchAction(_state: StudentPromotionBatchActionState, formData: FormData): Promise<StudentPromotionBatchActionState> {
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to prepare promotion records." };
  }

  try {
    const result = await studentPromotionBatchService.preparePromotionRecords({
      ...scope(getString(formData, "sourceAcademicYearId")),
      sourceAcademicYearId: getString(formData, "sourceAcademicYearId"),
      targetAcademicYearId: getString(formData, "targetAcademicYearId"),
      candidateIds: getCandidateIds(formData),
      requestedBy: getCurrentUser(currentSessionRole).id,
      reason: getString(formData, "reason") || "Prepared from controlled bulk promotion preview.",
    });
    revalidatePath("/academics/promotions");
    revalidatePath("/academics/promotions/bulk-preview");
    return { status: "success", message: `${result.preparedCount.toLocaleString("en-IN")} individual promotion record${result.preparedCount === 1 ? "" : "s"} prepared. No placements were changed.`, result };
  } catch (error) {
    return toActionError(error, "Promotion records could not be prepared from this selection.");
  }
}

function scope(academicYearId: string) {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId,
  };
}

function getCandidateIds(formData: FormData) {
  return formData.getAll("candidateId").filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toActionError(error: unknown, fallback: string): StudentPromotionBatchActionState {
  if (error instanceof ApiError) return { status: "error", message: error.message };
  if (error instanceof Error) return { status: "error", message: error.message };
  return { status: "error", message: fallback };
}
