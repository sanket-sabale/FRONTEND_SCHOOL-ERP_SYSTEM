import { tenantContext } from "@/lib/tenant-context";
import type { StaffUserAccount } from "@/features/staff-accounts/types/staff-account";

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

const secondTenantScope = {
  tenantId: "tenant-demo-west",
  schoolId: "school-demo-west",
  campusId: "campus-demo-central",
  academicYearId: "ay-2026-27",
};

export const mockStaffUserAccounts: StaffUserAccount[] = [
  account("user-anita-sharma", "Anita Sharma", "anita.sharma@sps.example", "teacher", "active", "staff-001", "2026-08-21T08:45:00+05:30"),
  account("user-priya-kulkarni", "Priya Kulkarni", "priya.kulkarni@sps.example", "accountant", "active", "staff-003", "2026-08-20T10:15:00+05:30"),
  account("user-neha-joshi", "Neha Joshi", "neha.joshi@sps.example", "hr", "inactive", "staff-005"),
  account("user-vikram-kadam", "Vikram Kadam", "vikram.kadam@sps.example", "teacher", "active", "staff-008", "2026-08-18T11:05:00+05:30"),
  account("user-kavita-bendre", "Kavita Bendre", "kavita.bendre@sps.example", "teacher", "active", "staff-011", "2024-03-20T09:30:00+05:30"),
  account("user-unlinked-hr", "Office HR User", "office.hr@sps.example", "hr", "active"),
  account("user-unlinked-teacher", "Unlinked Teacher", "unlinked.teacher@sps.example", "teacher", "invited"),
  account("user-cross-tenant-anita", "Anita Sharma", "anita.sharma@west.example", "teacher", "active", undefined, undefined, secondTenantScope),
];

function account(
  id: string,
  displayName: string,
  email: string,
  role: StaffUserAccount["role"],
  status: StaffUserAccount["status"],
  linkedStaffId?: string,
  lastLoginAt?: string,
  customScope = scope,
): StaffUserAccount {
  return {
    ...customScope,
    id,
    displayName,
    email,
    username: email.split("@")[0],
    role,
    status,
    linkedStaffId,
    lastLoginAt,
    invitedAt: status === "invited" ? "2026-08-15T09:00:00+05:30" : undefined,
    createdAt: "2026-04-01T09:00:00+05:30",
    updatedAt: "2026-08-01T09:00:00+05:30",
  };
}
