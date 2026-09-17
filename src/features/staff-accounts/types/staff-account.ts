import type { TenantScopedQuery } from "@/lib/api/client";
import type { Permission, Role } from "@/types/erp";

export const staffAccountStatuses = ["invited", "active", "inactive", "suspended"] as const;
export type StaffAccountStatus = (typeof staffAccountStatuses)[number];

export type StaffUserAccount = TenantScopedQuery & {
  id: string;
  displayName: string;
  email: string;
  username?: string;
  role: Role;
  status: StaffAccountStatus;
  linkedStaffId?: string;
  lastLoginAt?: string;
  invitedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffAccountView = {
  staffId: string;
  linked: boolean;
  account?: StaffUserAccount;
  permissions: Permission[];
  warnings: string[];
  eligibleUsers: StaffUserAccount[];
  roles: Array<{ role: Role; label: string; permissions: Permission[] }>;
};

export type StaffAccountCreateInput = TenantScopedQuery & {
  staffId: string;
  email: string;
  displayName: string;
  role: Role;
};

export type StaffAccountLinkInput = TenantScopedQuery & {
  staffId: string;
  userId: string;
};

export type StaffAccountRoleInput = TenantScopedQuery & {
  staffId: string;
  role: Role;
};

export type StaffAccountStatusInput = TenantScopedQuery & {
  staffId: string;
  status: StaffAccountStatus;
};

export type StaffAccountUnlinkInput = TenantScopedQuery & {
  staffId: string;
  reason?: string;
};
