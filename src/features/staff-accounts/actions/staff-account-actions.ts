"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/components/shared/permission-gate";
import type { StaffAccountStatus } from "@/features/staff-accounts/types/staff-account";
import { ApiError } from "@/lib/api/client";
import { staffAccountService } from "@/lib/api/staff-accounts";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";
import type { Role } from "@/types/erp";

export type StaffAccountActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createStaffAccountAction(_state: StaffAccountActionState, formData: FormData): Promise<StaffAccountActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffAccountService.createAccount({
      ...scope(),
      staffId,
      displayName: getString(formData, "displayName"),
      email: getString(formData, "email"),
      role: getString(formData, "role") as Role,
    });
    revalidateStaffAccount(staffId);
    return { status: "success", message: "Mock account invitation created and linked to staff." };
  } catch (error) {
    return toActionError(error, "Unable to create staff account.");
  }
}

export async function linkStaffAccountAction(_state: StaffAccountActionState, formData: FormData): Promise<StaffAccountActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffAccountService.linkAccount({ ...scope(), staffId, userId: getString(formData, "userId") });
    revalidateStaffAccount(staffId);
    return { status: "success", message: "Application account linked to staff." };
  } catch (error) {
    return toActionError(error, "Unable to link staff account.");
  }
}

export async function unlinkStaffAccountAction(_state: StaffAccountActionState, formData: FormData): Promise<StaffAccountActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffAccountService.unlinkAccount({ ...scope(), staffId, reason: getOptionalString(formData, "reason") });
    revalidateStaffAccount(staffId);
    return { status: "success", message: "Application account unlinked. The user account was not deleted." };
  } catch (error) {
    return toActionError(error, "Unable to unlink staff account.");
  }
}

export async function assignStaffAccountRoleAction(_state: StaffAccountActionState, formData: FormData): Promise<StaffAccountActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffAccountService.assignRole({ ...scope(), staffId, role: getString(formData, "role") as Role });
    revalidateStaffAccount(staffId);
    return { status: "success", message: "Account role updated." };
  } catch (error) {
    return toActionError(error, "Unable to update account role.");
  }
}

export async function updateStaffAccountStatusAction(_state: StaffAccountActionState, formData: FormData): Promise<StaffAccountActionState> {
  if (!hasPermission(currentSessionRole, "hr.manage")) return forbidden();
  try {
    const staffId = getString(formData, "staffId");
    await staffAccountService.updateAccountStatus({ ...scope(), staffId, status: getString(formData, "status") as StaffAccountStatus });
    revalidateStaffAccount(staffId);
    return { status: "success", message: "Account status updated." };
  } catch (error) {
    return toActionError(error, "Unable to update account status.");
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

function revalidateStaffAccount(staffId: string) {
  revalidatePath("/staff");
  revalidatePath(`/staff/${staffId}`);
  revalidatePath(`/staff/${staffId}/account`);
  revalidatePath(`/staff/${staffId}/account/link`);
  revalidatePath(`/staff/${staffId}/account/create`);
}

function forbidden(): StaffAccountActionState {
  return { status: "error", message: "You do not have permission to change account access." };
}

function toActionError(error: unknown, fallback: string): StaffAccountActionState {
  return error instanceof ApiError ? { status: "error", message: error.message } : { status: "error", message: fallback };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  return getString(formData, key) || undefined;
}
