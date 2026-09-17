"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/components/shared/permission-gate";
import { studentUpdateSchema } from "@/features/students/schemas/student.schema";
import type { StudentStatus, StudentGender } from "@/features/students/types/student";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StudentEditField =
  | "firstName"
  | "middleName"
  | "lastName"
  | "dateOfBirth"
  | "gender"
  | "status"
  | "admissionNumber"
  | "studentCode"
  | "rollNumber"
  | "admissionDate";

export type StudentEditActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<StudentEditField, string>>;
};

export async function updateStudentAction(studentId: string, _state: StudentEditActionState, formData: FormData): Promise<StudentEditActionState> {
  if (!hasPermission(currentSessionRole, "student.update")) {
    return {
      status: "error",
      message: "You do not have permission to update student records.",
    };
  }

  const parsed = studentUpdateSchema.safeParse({
    id: studentId,
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
    firstName: getString(formData, "firstName"),
    middleName: getOptionalString(formData, "middleName"),
    lastName: getString(formData, "lastName"),
    dateOfBirth: getOptionalString(formData, "dateOfBirth"),
    gender: getString(formData, "gender") as StudentGender | undefined,
    status: getString(formData, "status") as StudentStatus | undefined,
    admissionNumber: getString(formData, "admissionNumber"),
    studentCode: getOptionalString(formData, "studentCode"),
    rollNumber: getOptionalString(formData, "rollNumber"),
    admissionDate: getString(formData, "admissionDate"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the highlighted fields and try again.",
      fieldErrors: mapFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    await studentService.updateStudent(parsed.data);
  } catch {
    return {
      status: "error",
      message: "Unable to update student details. Please try again.",
    };
  }

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${encodeURIComponent(studentId)}?updated=1`);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || undefined;
}

function mapFieldErrors(errors: Record<string, string[] | undefined>): StudentEditActionState["fieldErrors"] {
  return {
    firstName: firstError(errors.firstName),
    middleName: firstError(errors.middleName),
    lastName: firstError(errors.lastName),
    dateOfBirth: firstError(errors.dateOfBirth),
    gender: firstError(errors.gender),
    status: firstError(errors.status),
    admissionNumber: firstError(errors.admissionNumber),
    studentCode: firstError(errors.studentCode),
    rollNumber: firstError(errors.rollNumber),
    admissionDate: firstError(errors.admissionDate),
  };
}

function firstError(value?: string[]) {
  return value?.[0];
}
