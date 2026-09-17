"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/components/shared/permission-gate";
import { studentPromotionApplySchema, studentPromotionUpdateSchema } from "@/features/student-promotions/schemas/student-promotion.schema";
import type { StudentPromotionReason, StudentPromotionStatus } from "@/features/student-promotions/types/student-promotion";
import { ApiError } from "@/lib/api/client";
import { studentPromotionService } from "@/lib/api/student-promotions";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StudentPromotionActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

const idleState: StudentPromotionActionState = { status: "idle" };

export async function updateStudentPromotionFormAction(formData: FormData): Promise<void> {
  const result = await updateStudentPromotionAction(idleState, formData);
  if (result.status === "error") throw new Error(result.message ?? "Promotion could not be updated.");
}

export async function applyStudentPromotionFormAction(formData: FormData): Promise<void> {
  const result = await applyStudentPromotionAction(idleState, formData);
  if (result.status === "error") throw new Error(result.message ?? "Promotion could not be applied.");
}

export async function updateStudentPromotionAction(_state: StudentPromotionActionState = idleState, formData: FormData): Promise<StudentPromotionActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to review promotions." };
  }

  const promotionId = getString(formData, "id");
  const sourceAcademicYearId = getString(formData, "sourceAcademicYearId");
  const parsed = studentPromotionUpdateSchema.safeParse({
    ...scope(sourceAcademicYearId),
    id: promotionId,
    targetClassId: getOptionalString(formData, "targetClassId"),
    targetSectionId: getOptionalString(formData, "targetSectionId"),
    status: getOptionalString(formData, "status") as StudentPromotionStatus | undefined,
    reason: getOptionalString(formData, "reason") as StudentPromotionReason | undefined,
    notes: getOptionalString(formData, "notes"),
    reviewedBy: "current-user",
  });

  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);

  try {
    await studentPromotionService.updatePromotion(parsed.data);
  } catch (error) {
    return toActionError(error, "Promotion could not be updated.");
  }

  revalidatePromotionRoutes(promotionId);
  redirect(`/academics/promotions/${encodeURIComponent(promotionId)}?updated=1`);
}

export async function applyStudentPromotionAction(_state: StudentPromotionActionState = idleState, formData: FormData): Promise<StudentPromotionActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to apply promotions." };
  }

  const promotionId = getString(formData, "id");
  const sourceAcademicYearId = getString(formData, "sourceAcademicYearId");
  const parsed = studentPromotionApplySchema.safeParse({
    ...scope(sourceAcademicYearId),
    id: promotionId,
    appliedBy: "current-user",
    startDate: getString(formData, "startDate"),
    notes: getOptionalString(formData, "notes"),
  });

  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);

  try {
    await studentPromotionService.applyPromotion(parsed.data);
  } catch (error) {
    return toActionError(error, "Promotion could not be applied.");
  }

  revalidatePromotionRoutes(promotionId);
  redirect(`/academics/promotions/${encodeURIComponent(promotionId)}?promoted=1`);
}

function revalidatePromotionRoutes(promotionId: string) {
  revalidatePath("/academics/promotions");
  revalidatePath(`/academics/promotions/${promotionId}`);
  revalidatePath("/academics/student-placements");
  revalidatePath("/students");
  revalidatePath("/attendance/history");
}

function scope(academicYearId: string) {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId,
  };
}

function validationError(errors: Record<string, string[] | undefined>): StudentPromotionActionState {
  return {
    status: "error",
    message: "Please review the highlighted fields.",
    fieldErrors: Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, value?.[0]])),
  };
}

function toActionError(error: unknown, fallback: string): StudentPromotionActionState {
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
