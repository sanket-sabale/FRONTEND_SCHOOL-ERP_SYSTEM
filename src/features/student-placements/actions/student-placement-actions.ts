"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/components/shared/permission-gate";
import { studentPlacementTransferSchema } from "@/features/student-placements/schemas/student-placement.schema";
import type { StudentPlacementReason } from "@/features/student-placements/types/student-placement";
import { ApiError } from "@/lib/api/client";
import { studentPlacementService } from "@/lib/api/student-placements";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StudentPlacementActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

const idleState: StudentPlacementActionState = { status: "idle" };

export async function transferStudentPlacementAction(_state: StudentPlacementActionState = idleState, formData: FormData): Promise<StudentPlacementActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage") || !hasPermission(currentSessionRole, "student.update")) {
    return { status: "error", message: "You do not have permission to change student academic placements." };
  }

  const studentId = getString(formData, "studentId");
  const toAcademicYearId = getString(formData, "toAcademicYearId");
  const parsed = studentPlacementTransferSchema.safeParse({
    ...scope(toAcademicYearId),
    studentId,
    fromPlacementId: getString(formData, "fromPlacementId"),
    toAcademicYearId,
    toClassId: getString(formData, "toClassId"),
    toSectionId: getString(formData, "toSectionId"),
    startDate: getString(formData, "startDate"),
    reason: getString(formData, "reason") as StudentPlacementReason,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the highlighted fields.",
      fieldErrors: Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0]])),
    };
  }

  try {
    await studentPlacementService.transferStudentPlacement(parsed.data);
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    return { status: "error", message: "Student placement could not be changed." };
  }

  revalidatePath("/academics/student-placements");
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/students/${studentId}/placement`);
  redirect(`/students/${encodeURIComponent(studentId)}?placementChanged=1`);
}

function scope(academicYearId: string) {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId,
  };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
