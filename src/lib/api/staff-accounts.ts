import { rolePermissions } from "@/config/navigation";
import {
  staffAccountCreateSchema,
  staffAccountLinkSchema,
  staffAccountRoleSchema,
  staffAccountStatusSchema,
  staffAccountUnlinkSchema,
} from "@/features/staff-accounts/schemas/staff-account.schema";
import {
  canActivateAccountForStaff,
  canAttachAccountToStaff,
  canTransitionAccountStatus,
  getPermissionsForRole,
  getRoleLabel,
  getStaffAccountWarnings,
} from "@/features/staff-accounts/services/staff-account-rules";
import { mockStaffUserAccounts } from "@/features/staff-accounts/services/mock-staff-accounts";
import type {
  StaffAccountCreateInput,
  StaffAccountLinkInput,
  StaffAccountRoleInput,
  StaffAccountStatusInput,
  StaffAccountUnlinkInput,
  StaffAccountView,
  StaffUserAccount,
} from "@/features/staff-accounts/types/staff-account";
import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { staffService } from "@/lib/api/staff";
import type { Role } from "@/types/erp";

let userAccounts = [...mockStaffUserAccounts];

export const staffAccountService = {
  async getStaffAccountView(scope: TenantScopedQuery, staffId: string): Promise<StaffAccountView> {
    const staff = await ensureStaffInScope(scope, staffId);
    const linkedByStaff = staff.userId ? userAccounts.find((user) => user.id === staff.userId && isSameScope(user, scope)) : undefined;
    const linkedByUser = userAccounts.find((user) => user.linkedStaffId === staff.id && isSameScope(user, scope));
    const account = linkedByStaff ?? linkedByUser;
    const permissions = account ? getPermissionsForRole(account.role) : [];
    return {
      staffId: staff.id,
      linked: Boolean(account),
      account: account ? { ...account } : undefined,
      permissions,
      warnings: getStaffAccountWarnings(staff.status, account?.status),
      eligibleUsers: await this.listEligibleUsers(scope, staff.id),
      roles: (Object.keys(rolePermissions) as Role[]).map((role) => ({ role, label: getRoleLabel(role), permissions: getPermissionsForRole(role) })),
    };
  },

  async listEligibleUsers(scope: TenantScopedQuery, staffId: string) {
    await ensureStaffInScope(scope, staffId);
    return userAccounts
      .filter((user) => isSameScope(user, scope))
      .filter((user) => !user.linkedStaffId)
      .sort((first, second) => first.displayName.localeCompare(second.displayName, "en-IN", { sensitivity: "base" }))
      .map((user) => ({ ...user }));
  },

  async createAccount(input: StaffAccountCreateInput) {
    const parsed = staffAccountCreateSchema.parse(input);
    const staff = await ensureStaffInScope(parsed, parsed.staffId);
    if (!canAttachAccountToStaff(staff.status)) throw new ApiError(422, "Only active or on-leave staff can receive a new application account.");
    ensureStaffHasNoAccount(parsed, staff.id, staff.userId);
    ensureUniqueEmail(parsed, parsed.email);
    const now = new Date().toISOString();
    const user: StaffUserAccount = {
      id: createUserId(parsed.email),
      tenantId: parsed.tenantId,
      schoolId: parsed.schoolId,
      campusId: parsed.campusId,
      academicYearId: parsed.academicYearId,
      displayName: parsed.displayName,
      email: parsed.email,
      username: parsed.email.split("@")[0],
      role: parsed.role,
      status: "invited",
      linkedStaffId: staff.id,
      invitedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    userAccounts = [user, ...userAccounts];
    await staffService.updateStaff({ ...parsed, id: staff.id, userId: user.id });
    return { ...user };
  },

  async linkAccount(input: StaffAccountLinkInput) {
    const parsed = staffAccountLinkSchema.parse(input);
    const staff = await ensureStaffInScope(parsed, parsed.staffId);
    if (!canAttachAccountToStaff(staff.status)) throw new ApiError(422, "Only active or on-leave staff can be linked to an application account.");
    ensureStaffHasNoAccount(parsed, staff.id, staff.userId);
    const user = userAccounts.find((account) => account.id === parsed.userId);
    if (!user) throw new ApiError(404, "Application user account could not be found.");
    if (!isSameScope(user, parsed)) throw new ApiError(403, "This account belongs to another school.");
    if (user.linkedStaffId) throw new ApiError(409, "This user is already linked to another staff member.");
    const next = { ...user, linkedStaffId: staff.id, updatedAt: new Date().toISOString() };
    userAccounts = userAccounts.map((account) => account.id === next.id ? next : account);
    await staffService.updateStaff({ ...parsed, id: staff.id, userId: next.id });
    return { ...next };
  },

  async unlinkAccount(input: StaffAccountUnlinkInput) {
    const parsed = staffAccountUnlinkSchema.parse(input);
    const staff = await ensureStaffInScope(parsed, parsed.staffId);
    const user = staff.userId ? userAccounts.find((account) => account.id === staff.userId && isSameScope(account, parsed)) : userAccounts.find((account) => account.linkedStaffId === staff.id && isSameScope(account, parsed));
    if (!user) throw new ApiError(404, "No linked application account was found for this staff member.");
    const next = { ...user, linkedStaffId: undefined, updatedAt: new Date().toISOString() };
    userAccounts = userAccounts.map((account) => account.id === next.id ? next : account);
    await staffService.updateStaff({ ...parsed, id: staff.id, userId: null });
    return { ...next };
  },

  async assignRole(input: StaffAccountRoleInput) {
    const parsed = staffAccountRoleSchema.parse(input);
    const staff = await ensureStaffInScope(parsed, parsed.staffId);
    const user = getLinkedUser(parsed, staff.id, staff.userId);
    const next = { ...user, role: parsed.role, updatedAt: new Date().toISOString() };
    userAccounts = userAccounts.map((account) => account.id === next.id ? next : account);
    return { ...next };
  },

  async updateAccountStatus(input: StaffAccountStatusInput) {
    const parsed = staffAccountStatusSchema.parse(input);
    const staff = await ensureStaffInScope(parsed, parsed.staffId);
    if (parsed.status === "active" && !canActivateAccountForStaff(staff.status)) {
      throw new ApiError(422, "This staff lifecycle status does not allow account activation.");
    }
    const user = getLinkedUser(parsed, staff.id, staff.userId);
    if (!canTransitionAccountStatus(user.status, parsed.status, staff.status)) {
      throw new ApiError(422, "This account status transition is not allowed.");
    }
    const next = { ...user, status: parsed.status, updatedAt: new Date().toISOString() };
    userAccounts = userAccounts.map((account) => account.id === next.id ? next : account);
    return { ...next };
  },

  getRawAccounts(scope: TenantScopedQuery) {
    return userAccounts.filter((account) => isSameScope(account, scope)).map((account) => ({ ...account }));
  },
};

async function ensureStaffInScope(scope: TenantScopedQuery, staffId: string) {
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) throw new ApiError(404, "Staff member not found.");
  return staff;
}

function ensureStaffHasNoAccount(scope: TenantScopedQuery, staffId: string, staffUserId?: string | null) {
  if (staffUserId) throw new ApiError(409, "This staff member already has a linked application account.");
  const linkedUser = userAccounts.find((user) => user.linkedStaffId === staffId && isSameScope(user, scope));
  if (linkedUser) throw new ApiError(409, "This staff member already has a linked application account.");
}

function getLinkedUser(scope: TenantScopedQuery, staffId: string, staffUserId?: string | null) {
  const user = staffUserId ? userAccounts.find((account) => account.id === staffUserId && isSameScope(account, scope)) : userAccounts.find((account) => account.linkedStaffId === staffId && isSameScope(account, scope));
  if (!user) throw new ApiError(404, "No linked application account was found for this staff member.");
  return user;
}

function ensureUniqueEmail(scope: TenantScopedQuery, email: string) {
  const exists = userAccounts.some((user) => user.email.toLowerCase() === email.toLowerCase() && isSameScope(user, scope));
  if (exists) throw new ApiError(409, "An application account with this email already exists.");
}

function createUserId(email: string) {
  const slug = email.toLowerCase().split("@")[0].replace(/[^a-z0-9]+/g, "-");
  let userId = `user-${slug}`;
  let suffix = 1;
  while (userAccounts.some((user) => user.id === userId)) {
    suffix += 1;
    userId = `user-${slug}-${suffix}`;
  }
  return userId;
}

function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId;
}
