"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/components/shared/permission-gate";
import {
  staffCreateSchema,
  staffStatusChangeSchema,
  staffUpdateSchema,
} from "@/features/staff/schemas/staff.schema";
import type {
  EmploymentType,
  StaffCategory,
  StaffStatus,
} from "@/features/staff/types/staff";
import { ApiError } from "@/lib/api/client";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type StaffFormField =
  | "employeeNumber"
  | "userId"
  | "firstName"
  | "middleName"
  | "lastName"
  | "staffCategory"
  | "employmentType"
  | "status"
  | "joiningDate"
  | "exitDate"
  | "exitReason"
  | "departmentId"
  | "designationId"
  | "reportingManagerId"
  | "mobileNumber"
  | "alternatePhone"
  | "personalEmail"
  | "officialEmail"
  | "preferredContactMethod"
  | "confirmationDate"
  | "currentAddressLine1"
  | "currentAddressLine2"
  | "currentCity"
  | "currentDistrict"
  | "currentState"
  | "currentPinCode"
  | "permanentAddressLine1"
  | "permanentAddressLine2"
  | "permanentCity"
  | "permanentDistrict"
  | "permanentState"
  | "permanentPinCode"
  | "emergencyContactName"
  | "emergencyContactRelationship"
  | "emergencyContactMobile"
  | "emergencyContactAlternate"
  | "emergencyContactEmail"
  | "emergencyContactAddress"
  | "teacherCode"
  | "subjectAreas"
  | "academicDepartment"
  | "qualificationSummary"
  | "experienceSummary";

export type StaffFormActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<StaffFormField, string>>;
};

export type StaffStatusActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"status" | "exitDate" | "exitReason", string>>;
};

export type StaffOrgActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"id" | "code" | "name" | "description" | "staffCategory" | "status", string>>;
};

export async function createStaffAction(_state: StaffFormActionState, formData: FormData): Promise<StaffFormActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to create staff records." };
  }

  const parsed = staffCreateSchema.safeParse({
    ...scope(),
    employeeNumber: getString(formData, "employeeNumber"),
    userId: getOptionalString(formData, "userId"),
    firstName: getString(formData, "firstName"),
    middleName: getOptionalString(formData, "middleName"),
    lastName: getString(formData, "lastName"),
    staffCategory: getString(formData, "staffCategory") as StaffCategory,
    employmentType: getString(formData, "employmentType") as EmploymentType,
    status: getString(formData, "status") as StaffStatus,
    joiningDate: getString(formData, "joiningDate"),
    confirmationDate: getOptionalString(formData, "confirmationDate"),
    exitDate: getOptionalString(formData, "exitDate"),
    exitReason: getOptionalString(formData, "exitReason"),
    departmentId: getString(formData, "departmentId"),
    designationId: getString(formData, "designationId"),
    reportingManagerId: getOptionalString(formData, "reportingManagerId"),
    contact: contactFromForm(formData),
    currentAddress: addressFromForm(formData, "current"),
    permanentAddress: addressFromForm(formData, "permanent"),
    permanentAddressSameAsCurrent: formData.get("permanentAddressSameAsCurrent") === "on",
    emergencyContacts: emergencyContactFromForm(formData),
    teachingInfo: teachingInfoFromForm(formData),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted staff details.",
      fieldErrors: mapFormErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let createdStaffId: string;
  try {
    const staff = await staffService.createStaff(parsed.data);
    createdStaffId = staff.id;
  } catch (error) {
    return toStaffFormError(error);
  }

  revalidatePath("/staff");
  revalidatePath(`/staff/${createdStaffId}`);
  redirect(`/staff/${encodeURIComponent(createdStaffId)}?created=1`);
}

export async function updateStaffAction(staffId: string, _state: StaffFormActionState, formData: FormData): Promise<StaffFormActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to update staff records." };
  }

  const parsed = staffUpdateSchema.safeParse({
    id: staffId,
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
    employeeNumber: getString(formData, "employeeNumber"),
    userId: getOptionalString(formData, "userId"),
    firstName: getString(formData, "firstName"),
    middleName: getOptionalString(formData, "middleName"),
    lastName: getString(formData, "lastName"),
    staffCategory: getString(formData, "staffCategory") as StaffCategory,
    employmentType: getString(formData, "employmentType") as EmploymentType,
    status: getString(formData, "status") as StaffStatus,
    joiningDate: getString(formData, "joiningDate"),
    confirmationDate: getOptionalString(formData, "confirmationDate"),
    exitDate: getOptionalString(formData, "exitDate"),
    exitReason: getOptionalString(formData, "exitReason"),
    departmentId: getString(formData, "departmentId"),
    designationId: getString(formData, "designationId"),
    reportingManagerId: getOptionalString(formData, "reportingManagerId"),
    contact: contactFromForm(formData),
    currentAddress: addressFromForm(formData, "current"),
    permanentAddress: addressFromForm(formData, "permanent"),
    permanentAddressSameAsCurrent: formData.get("permanentAddressSameAsCurrent") === "on",
    emergencyContacts: emergencyContactFromForm(formData),
    teachingInfo: teachingInfoFromForm(formData),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the highlighted staff details and try again.",
      fieldErrors: mapFormErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    await staffService.updateStaff(parsed.data);
  } catch (error) {
    return toStaffFormError(error);
  }

  revalidatePath("/staff");
  revalidatePath(`/staff/${staffId}`);
  redirect(`/staff/${encodeURIComponent(staffId)}?updated=1`);
}

export async function changeStaffStatusAction(_state: StaffStatusActionState, formData: FormData): Promise<StaffStatusActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to manage staff lifecycle status." };
  }

  const parsed = staffStatusChangeSchema.safeParse({
    ...scope(),
    staffId: getString(formData, "staffId"),
    status: getString(formData, "status") as StaffStatus,
    exitDate: getOptionalString(formData, "exitDate"),
    exitReason: getOptionalString(formData, "exitReason"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the lifecycle details and try again.",
      fieldErrors: {
        status: firstError(parsed.error.flatten().fieldErrors.status),
        exitDate: firstError(parsed.error.flatten().fieldErrors.exitDate),
        exitReason: firstError(parsed.error.flatten().fieldErrors.exitReason),
      },
    };
  }

  try {
    await staffService.changeStaffStatus(parsed.data);
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", message: error.message };
    }

    return { status: "error", message: "Unable to update staff status. Please try again." };
  }

  revalidatePath("/staff");
  revalidatePath(`/staff/${parsed.data.staffId}`);
  return { status: "success", message: "Staff lifecycle status updated successfully." };
}

export async function saveStaffDepartmentAction(_state: StaffOrgActionState, formData: FormData): Promise<StaffOrgActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to manage staff departments." };
  }

  const id = getOptionalString(formData, "id");
  try {
    if (id) {
      await staffService.updateDepartment({
        ...scope(),
        id,
        code: getString(formData, "code"),
        name: getString(formData, "name"),
        description: getOptionalString(formData, "description"),
        status: getString(formData, "status") as "active" | "inactive",
      });
    } else {
      await staffService.createDepartment({
        ...scope(),
        code: getString(formData, "code"),
        name: getString(formData, "name"),
        description: getOptionalString(formData, "description"),
        status: getString(formData, "status") as "active" | "inactive",
      });
    }
  } catch (error) {
    return toOrgError(error, "department");
  }

  revalidatePath("/staff");
  revalidatePath("/staff/departments");
  return { status: "success", message: id ? "Department updated successfully." : "Department created successfully." };
}

export async function deactivateStaffDepartmentAction(_state: StaffOrgActionState, formData: FormData): Promise<StaffOrgActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to manage staff departments." };
  }

  try {
    await staffService.deactivateDepartment(scope(), getString(formData, "id"));
  } catch (error) {
    return toOrgError(error, "department");
  }

  revalidatePath("/staff");
  revalidatePath("/staff/departments");
  return { status: "success", message: "Department deactivated successfully." };
}

export async function saveStaffDesignationAction(_state: StaffOrgActionState, formData: FormData): Promise<StaffOrgActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to manage staff designations." };
  }

  const id = getOptionalString(formData, "id");
  try {
    if (id) {
      await staffService.updateDesignation({
        ...scope(),
        id,
        code: getString(formData, "code"),
        name: getString(formData, "name"),
        description: getOptionalString(formData, "description"),
        staffCategory: getOptionalString(formData, "staffCategory") as StaffCategory | undefined,
        status: getString(formData, "status") as "active" | "inactive",
      });
    } else {
      await staffService.createDesignation({
        ...scope(),
        code: getString(formData, "code"),
        name: getString(formData, "name"),
        description: getOptionalString(formData, "description"),
        staffCategory: getOptionalString(formData, "staffCategory") as StaffCategory | undefined,
        status: getString(formData, "status") as "active" | "inactive",
      });
    }
  } catch (error) {
    return toOrgError(error, "designation");
  }

  revalidatePath("/staff");
  revalidatePath("/staff/designations");
  return { status: "success", message: id ? "Designation updated successfully." : "Designation created successfully." };
}

export async function deactivateStaffDesignationAction(_state: StaffOrgActionState, formData: FormData): Promise<StaffOrgActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) {
    return { status: "error", message: "You do not have permission to manage staff designations." };
  }

  try {
    await staffService.deactivateDesignation(scope(), getString(formData, "id"));
  } catch (error) {
    return toOrgError(error, "designation");
  }

  revalidatePath("/staff");
  revalidatePath("/staff/designations");
  return { status: "success", message: "Designation deactivated successfully." };
}

function toStaffFormError(error: unknown): StaffFormActionState {
  if (error instanceof ApiError && error.code === 409) {
    return {
      status: "error",
      message: error.message,
      fieldErrors: error.message.toLowerCase().includes("user")
        ? { userId: error.message }
        : { employeeNumber: error.message },
    };
  }

  if (error instanceof ApiError && error.code === 422) {
    return { status: "error", message: error.message };
  }

  if (error instanceof ApiError && error.code === 404) {
    return { status: "error", message: "The staff record could not be found in the current school context." };
  }

  if (error instanceof ApiError) {
    return { status: "error", message: error.message };
  }

  return { status: "error", message: "Unable to save staff details. Please try again." };
}

function mapFormErrors(errors: Record<string, string[] | undefined>): StaffFormActionState["fieldErrors"] {
  return {
    employeeNumber: firstError(errors.employeeNumber),
    userId: firstError(errors.userId),
    firstName: firstError(errors.firstName),
    middleName: firstError(errors.middleName),
    lastName: firstError(errors.lastName),
    staffCategory: firstError(errors.staffCategory),
    employmentType: firstError(errors.employmentType),
    status: firstError(errors.status),
    joiningDate: firstError(errors.joiningDate),
    exitDate: firstError(errors.exitDate),
    exitReason: firstError(errors.exitReason),
    departmentId: firstError(errors.departmentId),
    designationId: firstError(errors.designationId),
    reportingManagerId: firstError(errors.reportingManagerId),
    confirmationDate: firstError(errors.confirmationDate),
    mobileNumber: firstError(errors.contact),
    alternatePhone: firstError(errors.contact),
    personalEmail: firstError(errors.contact),
    officialEmail: firstError(errors.contact),
    currentPinCode: firstError(errors.currentAddress),
    permanentPinCode: firstError(errors.permanentAddress),
    emergencyContactMobile: firstError(errors.emergencyContacts),
    emergencyContactEmail: firstError(errors.emergencyContacts),
    subjectAreas: firstError(errors.teachingInfo),
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

function firstError(value?: string[]) {
  return value?.[0];
}

function contactFromForm(formData: FormData) {
  return compactObject({
    mobileNumber: getOptionalString(formData, "mobileNumber"),
    alternatePhone: getOptionalString(formData, "alternatePhone"),
    personalEmail: getOptionalString(formData, "personalEmail"),
    officialEmail: getOptionalString(formData, "officialEmail"),
    preferredContactMethod: getOptionalString(formData, "preferredContactMethod"),
  });
}

function addressFromForm(formData: FormData, prefix: "current" | "permanent") {
  return compactObject({
    addressLine1: getOptionalString(formData, `${prefix}AddressLine1`),
    addressLine2: getOptionalString(formData, `${prefix}AddressLine2`),
    city: getOptionalString(formData, `${prefix}City`),
    district: getOptionalString(formData, `${prefix}District`),
    state: getOptionalString(formData, `${prefix}State`),
    pinCode: getOptionalString(formData, `${prefix}PinCode`),
    country: getOptionalString(formData, `${prefix}Country`) ?? "India",
  });
}

function emergencyContactFromForm(formData: FormData) {
  const contact = compactObject({
    name: getOptionalString(formData, "emergencyContactName"),
    relationship: getOptionalString(formData, "emergencyContactRelationship"),
    mobileNumber: getOptionalString(formData, "emergencyContactMobile"),
    alternateNumber: getOptionalString(formData, "emergencyContactAlternate"),
    email: getOptionalString(formData, "emergencyContactEmail"),
    address: getOptionalString(formData, "emergencyContactAddress"),
    isPrimary: true,
  });
  return Object.keys(contact).length > 1 ? [contact] : undefined;
}

function teachingInfoFromForm(formData: FormData) {
  return compactObject({
    teacherCode: getOptionalString(formData, "teacherCode"),
    subjectAreas: splitList(getOptionalString(formData, "subjectAreas")),
    academicDepartment: getOptionalString(formData, "academicDepartment"),
    qualificationSummary: getOptionalString(formData, "qualificationSummary"),
    experienceSummary: getOptionalString(formData, "experienceSummary"),
  });
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "")) as Partial<T>;
}

function splitList(value?: string) {
  if (!value) return undefined;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function toOrgError(error: unknown, entity: "department" | "designation"): StaffOrgActionState {
  if (error instanceof ApiError && error.code === 409) {
    return { status: "error", message: error.message, fieldErrors: { name: error.message, code: error.message } };
  }

  if (error instanceof ApiError && error.code === 422) {
    return { status: "error", message: error.message };
  }

  if (error instanceof ApiError && error.code === 404) {
    return { status: "error", message: `The ${entity} could not be found in the current staff scope.` };
  }

  return { status: "error", message: `Unable to save ${entity}. Please try again.` };
}

function scope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}
