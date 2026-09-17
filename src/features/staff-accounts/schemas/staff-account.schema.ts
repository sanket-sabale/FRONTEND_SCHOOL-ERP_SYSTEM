import { z } from "zod";
import { staffAccountStatuses } from "@/features/staff-accounts/types/staff-account";
import type { Role } from "@/types/erp";

export const availableStaffAccountRoles = ["principal", "teacher", "accountant", "hr", "system-admin"] as const satisfies readonly Role[];

const scopedFields = {
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
};

export const staffAccountCreateSchema = z.object({
  ...scopedFields,
  staffId: z.string().trim().min(1),
  email: z.string().trim().email("Enter a valid email address.").max(120),
  displayName: z.string().trim().min(2).max(120),
  role: z.enum(availableStaffAccountRoles),
});

export const staffAccountLinkSchema = z.object({
  ...scopedFields,
  staffId: z.string().trim().min(1),
  userId: z.string().trim().min(1).max(100),
});

export const staffAccountRoleSchema = z.object({
  ...scopedFields,
  staffId: z.string().trim().min(1),
  role: z.enum(availableStaffAccountRoles),
});

export const staffAccountStatusSchema = z.object({
  ...scopedFields,
  staffId: z.string().trim().min(1),
  status: z.enum(staffAccountStatuses),
});

export const staffAccountUnlinkSchema = z.object({
  ...scopedFields,
  staffId: z.string().trim().min(1),
  reason: z.string().trim().max(500).optional(),
});
