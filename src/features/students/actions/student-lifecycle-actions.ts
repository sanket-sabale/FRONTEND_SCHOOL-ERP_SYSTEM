"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import { studentLifecycleSchema } from "@/features/students/schemas/student.schema";
import type { StudentLifecycleAction, StudentLifecycleReason } from "@/features/students/types/student";
import { ApiError } from "@/lib/api/client";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StudentLifecycleActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateStudentLifecycleAction(
  _state: StudentLifecycleActionState,
  formData: FormData,
): Promise<StudentLifecycleActionState> {
  if (!hasPermission(currentSessionRole, "student.archive")) {
    return {
      status: "error",
      message: "You do not have permission to manage student lifecycle changes.",
    };
  }

  const parsed = studentLifecycleSchema.safeParse({
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
    studentId: getString(formData, "studentId"),
    action: getString(formData, "action") as StudentLifecycleAction,
    reason: getOptionalString(formData, "reason") as StudentLifecycleReason | undefined,
    reasonNote: getOptionalString(formData, "reasonNote"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the lifecycle details and try again.",
    };
  }

  try {
    await studentService.updateStudentLifecycle(parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.code === 422) {
      return {
        status: "error",
        message: error.message,
      };
    }

    if (error instanceof ApiError && error.code === 404) {
      return {
        status: "error",
        message: "The student record could not be found in the current school context.",
      };
    }

    return {
      status: "error",
      message: "Unable to update the student lifecycle. Please try again.",
    };
  }

  revalidatePath("/students");
  revalidatePath(`/students/${parsed.data.studentId}`);

  return {
    status: "success",
    message: "Student lifecycle updated successfully.",
  };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || undefined;
}
