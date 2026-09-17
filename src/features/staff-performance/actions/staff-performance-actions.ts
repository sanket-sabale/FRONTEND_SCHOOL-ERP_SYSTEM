"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import type {
  HrNoteCategory,
  PerformanceRating,
  PerformanceReviewStatus,
  PerformanceReviewType,
  StaffGoalCategory,
  StaffGoalPriority,
  StaffGoalStatus,
  StaffTrainingStatus,
  StaffTrainingType,
} from "@/features/staff-performance/types/staff-performance";
import { ApiError } from "@/lib/api/client";
import { staffPerformanceService } from "@/lib/api/staff-performance";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StaffPerformanceActionState = { status: "idle" | "success" | "error"; message?: string };

export async function createPerformanceReviewAction(_state: StaffPerformanceActionState, formData: FormData): Promise<StaffPerformanceActionState> {
  if (!canManage()) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffPerformanceService.createReview({
      ...scope(),
      staffId,
      reviewPeriodStart: getString(formData, "reviewPeriodStart"),
      reviewPeriodEnd: getString(formData, "reviewPeriodEnd"),
      reviewType: getString(formData, "reviewType") as PerformanceReviewType,
      reviewerName: getString(formData, "reviewerName"),
      status: getOptionalString(formData, "status") as PerformanceReviewStatus | undefined,
      overallRating: getOptionalNumber(formData, "overallRating") as PerformanceRating | undefined,
      strengths: getOptionalString(formData, "strengths"),
      improvementAreas: getOptionalString(formData, "improvementAreas"),
      reviewerComments: getOptionalString(formData, "reviewerComments"),
      reviewDate: getOptionalString(formData, "reviewDate"),
      nextReviewDate: getOptionalString(formData, "nextReviewDate"),
    });
    revalidateStaffPerformance(staffId);
    return { status: "success", message: "Performance review created." };
  } catch (error) {
    return toActionError(error, "Unable to create the performance review.");
  }
}

export async function createStaffGoalAction(_state: StaffPerformanceActionState, formData: FormData): Promise<StaffPerformanceActionState> {
  if (!canManage()) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffPerformanceService.createGoal({
      ...scope(),
      staffId,
      title: getString(formData, "title"),
      description: getOptionalString(formData, "description"),
      category: getString(formData, "category") as StaffGoalCategory,
      targetDate: getString(formData, "targetDate"),
      status: getOptionalString(formData, "status") as StaffGoalStatus | undefined,
      progress: getOptionalNumber(formData, "progress"),
      priority: getOptionalString(formData, "priority") as StaffGoalPriority | undefined,
    });
    revalidateStaffPerformance(staffId);
    return { status: "success", message: "Staff goal created." };
  } catch (error) {
    return toActionError(error, "Unable to create the staff goal.");
  }
}

export async function createStaffTrainingAction(_state: StaffPerformanceActionState, formData: FormData): Promise<StaffPerformanceActionState> {
  if (!canManage()) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffPerformanceService.createTraining({
      ...scope(),
      staffId,
      title: getString(formData, "title"),
      provider: getOptionalString(formData, "provider"),
      trainingType: getString(formData, "trainingType") as StaffTrainingType,
      startDate: getString(formData, "startDate"),
      endDate: getOptionalString(formData, "endDate"),
      durationHours: getOptionalNumber(formData, "durationHours"),
      status: getOptionalString(formData, "status") as StaffTrainingStatus | undefined,
      remarks: getOptionalString(formData, "remarks"),
    });
    revalidateStaffPerformance(staffId);
    return { status: "success", message: "Training record created." };
  } catch (error) {
    return toActionError(error, "Unable to create the training record.");
  }
}

export async function createStaffHrNoteAction(_state: StaffPerformanceActionState, formData: FormData): Promise<StaffPerformanceActionState> {
  if (!canManage()) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffPerformanceService.createHrNote({
      ...scope(),
      staffId,
      category: getString(formData, "category") as HrNoteCategory,
      title: getString(formData, "title"),
      body: getString(formData, "body"),
      createdBy: "Principal",
    });
    revalidateStaffPerformance(staffId);
    return { status: "success", message: "Private HR note added." };
  } catch (error) {
    return toActionError(error, "Unable to add the HR note.");
  }
}

export async function transitionReviewAction(_state: StaffPerformanceActionState, formData: FormData): Promise<StaffPerformanceActionState> {
  if (!canManage()) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffPerformanceService.transitionReview({ ...scope(), staffId, recordId: getString(formData, "recordId"), status: getString(formData, "status") as PerformanceReviewStatus });
    revalidateStaffPerformance(staffId);
    return { status: "success", message: "Review status updated." };
  } catch (error) {
    return toActionError(error, "Unable to update review status.");
  }
}

export async function transitionGoalAction(_state: StaffPerformanceActionState, formData: FormData): Promise<StaffPerformanceActionState> {
  if (!canManage()) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffPerformanceService.transitionGoal({ ...scope(), staffId, recordId: getString(formData, "recordId"), status: getString(formData, "status") as StaffGoalStatus });
    revalidateStaffPerformance(staffId);
    return { status: "success", message: "Goal status updated." };
  } catch (error) {
    return toActionError(error, "Unable to update goal status.");
  }
}

export async function transitionTrainingAction(_state: StaffPerformanceActionState, formData: FormData): Promise<StaffPerformanceActionState> {
  if (!canManage()) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffPerformanceService.transitionTraining({ ...scope(), staffId, recordId: getString(formData, "recordId"), status: getString(formData, "status") as StaffTrainingStatus });
    revalidateStaffPerformance(staffId);
    return { status: "success", message: "Training status updated." };
  } catch (error) {
    return toActionError(error, "Unable to update training status.");
  }
}

function canManage() {
  return hasPermission(currentSessionRole, "hr.manage");
}

function forbidden(): StaffPerformanceActionState {
  return { status: "error", message: "You do not have permission to manage staff HR operations." };
}

function scope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}

function revalidateStaffPerformance(staffId: string) {
  revalidatePath("/staff/performance");
  revalidatePath("/staff/performance/reviews");
  revalidatePath("/staff/hr-operations");
  revalidatePath(`/staff/${staffId}`);
  revalidatePath(`/staff/${staffId}/performance`);
  revalidatePath(`/staff/${staffId}/performance/goals`);
  revalidatePath(`/staff/${staffId}/performance/training`);
}

function toActionError(error: unknown, fallback: string): StaffPerformanceActionState {
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
  const raw = getString(formData, key);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
