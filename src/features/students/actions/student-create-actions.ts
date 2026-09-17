"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/components/shared/permission-gate";
import { studentCreateSchema } from "@/features/students/schemas/student.schema";
import type { GuardianStudentRelationshipType } from "@/features/guardians/types/guardian";
import type { StudentGender, StudentStatus } from "@/features/students/types/student";
import { ApiError } from "@/lib/api/client";
import { guardianService } from "@/lib/api/guardians";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StudentCreateField =
  | "firstName"
  | "middleName"
  | "lastName"
  | "dateOfBirth"
  | "gender"
  | "status"
  | "admissionNumber"
  | "studentCode"
  | "classId"
  | "sectionId"
  | "rollNumber"
  | "admissionDate"
  | "guardianId"
  | "relationshipType";

export type StudentCreateActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<StudentCreateField, string>>;
};

export async function createStudentAction(_state: StudentCreateActionState, formData: FormData): Promise<StudentCreateActionState> {
  if (!hasPermission(currentSessionRole, "student.create")) {
    return {
      status: "error",
      message: "You do not have permission to create student records.",
    };
  }

  const guardianId = getOptionalString(formData, "guardianId");
  const relationshipType = getOptionalString(formData, "relationshipType") as GuardianStudentRelationshipType | undefined;
  if (guardianId && !relationshipType) {
    return {
      status: "error",
      message: "Please choose how this guardian is related to the student.",
      fieldErrors: { relationshipType: "Select a guardian relationship." },
    };
  }

  const relationshipOptions = guardianId && relationshipType
    ? {
        guardianId,
        relationshipType,
        isPrimary: formData.get("isPrimary") === "on",
        isEmergencyContact: formData.get("isEmergencyContact") === "on",
        canPickup: formData.get("canPickup") === "on",
        canReceiveAcademicCommunication: formData.get("canReceiveAcademicCommunication") === "on",
        canReceiveFeeCommunication: formData.get("canReceiveFeeCommunication") === "on",
        canReceiveAttendanceCommunication: formData.get("canReceiveAttendanceCommunication") === "on",
        canReceiveGeneralCommunication: formData.get("canReceiveGeneralCommunication") === "on",
      }
    : null;

  const parsed = studentCreateSchema.safeParse({
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
    classId: getString(formData, "classId"),
    sectionId: getString(formData, "sectionId"),
    rollNumber: getOptionalString(formData, "rollNumber"),
    admissionDate: getString(formData, "admissionDate"),
    guardians: [],
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: mapFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let createdStudentId: string;
  try {
    if (relationshipOptions) {
      if (!hasPermission(currentSessionRole, "guardian.link")) {
        return {
          status: "error",
          message: "You do not have permission to link guardians during admission.",
          fieldErrors: { guardianId: "Guardian linking requires permission." },
        };
      }

      const guardian = await guardianService.getGuardian(scope(), relationshipOptions.guardianId);
      if (!guardian) {
        return {
          status: "error",
          message: "Selected guardian could not be found in the current school context.",
          fieldErrors: { guardianId: "Select a valid guardian from the current school context." },
        };
      }

      if (guardian.status === "archived") {
        return {
          status: "error",
          message: "Archived guardians cannot be linked during admission.",
          fieldErrors: { guardianId: "Select an active guardian." },
        };
      }
    }

    const student = await studentService.createStudent(parsed.data);
    createdStudentId = student.id;

    if (relationshipOptions) {
      await guardianService.createRelationship({
        ...scope(),
        studentId: student.id,
        ...relationshipOptions,
      });
    }
  } catch (error) {
    if (error instanceof ApiError && error.code === 409) {
      return {
        status: "error",
        message: "Admission number already exists for this academic year.",
        fieldErrors: {
          admissionNumber: "Admission number already exists for this academic year.",
        },
      };
    }

    if (error instanceof ApiError && error.code === 422) {
      return {
        status: "error",
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          classId: "Selected class and section are not available for this academic year.",
          sectionId: "Selected class and section are not available for this academic year.",
        },
      };
    }

    if (error instanceof ApiError && error.code === 404) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {
          guardianId: "Review the selected guardian and try again.",
        },
      };
    }

    if (error instanceof ApiError) {
      return {
        status: "error",
        message: error.message,
      };
    }

    return {
      status: "error",
      message: "Unable to create the student. Please try again.",
    };
  }

  revalidatePath("/students");
  revalidatePath("/guardians");
  revalidatePath(`/students/${createdStudentId}`);
  redirect(`/students/${encodeURIComponent(createdStudentId)}?created=1`);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || undefined;
}

function mapFieldErrors(errors: Record<string, string[] | undefined>): StudentCreateActionState["fieldErrors"] {
  return {
    firstName: firstError(errors.firstName),
    middleName: firstError(errors.middleName),
    lastName: firstError(errors.lastName),
    dateOfBirth: firstError(errors.dateOfBirth),
    gender: firstError(errors.gender),
    status: firstError(errors.status),
    admissionNumber: firstError(errors.admissionNumber),
    studentCode: firstError(errors.studentCode),
    classId: firstError(errors.classId),
    sectionId: firstError(errors.sectionId),
    rollNumber: firstError(errors.rollNumber),
    admissionDate: firstError(errors.admissionDate),
    guardianId: firstError(errors.guardians),
    relationshipType: firstError(errors.guardians),
  };
}

function scope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}

function firstError(value?: string[]) {
  return value?.[0];
}
