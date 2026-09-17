import { rolePermissions } from "@/config/navigation";
import type { StaffStatus } from "@/features/staff/types/staff";
import type { Permission, Role } from "@/types/erp";
import type { StaffAccountStatus } from "@/features/staff-accounts/types/staff-account";

export const roleLabels: Record<Role, string> = {
  principal: "Principal",
  teacher: "Teacher",
  accountant: "Accountant",
  hr: "HR Administrator",
  "system-admin": "System Administrator",
};

export const staffAccountStatusLabels: Record<StaffAccountStatus, string> = {
  invited: "Invited",
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
};

export function getStaffAccountStatusLabel(status: StaffAccountStatus) {
  return staffAccountStatusLabels[status];
}

export function getRoleLabel(role: Role) {
  return roleLabels[role];
}

export function getPermissionsForRole(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}

export function canAttachAccountToStaff(status: StaffStatus) {
  return status === "active" || status === "on_leave";
}

export function canActivateAccountForStaff(status: StaffStatus) {
  return status === "active" || status === "on_leave";
}

export function canTransitionAccountStatus(current: StaffAccountStatus, next: StaffAccountStatus, staffStatus: StaffStatus) {
  if (current === next) return true;
  if (next === "active" && !canActivateAccountForStaff(staffStatus)) return false;

  const allowedTransitions: Record<StaffAccountStatus, StaffAccountStatus[]> = {
    invited: ["active", "inactive"],
    active: ["inactive", "suspended"],
    inactive: ["active"],
    suspended: ["active", "inactive"],
  };

  return allowedTransitions[current].includes(next);
}

export function getStaffAccountWarnings(staffStatus: StaffStatus, accountStatus?: StaffAccountStatus) {
  const warnings: string[] = [];
  if (["resigned", "terminated", "retired", "inactive"].includes(staffStatus) && accountStatus && accountStatus !== "inactive") {
    warnings.push("This staff member is exited or inactive but the application account is not inactive.");
  }
  if (staffStatus === "suspended" && accountStatus === "active") {
    warnings.push("This staff member is suspended while the application account is active. Review access before continuing.");
  }
  return warnings;
}

export function formatPermissionLabel(permission: Permission) {
  return permission
    .split(".")
    .map((part) => part.replaceAll("-", " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
