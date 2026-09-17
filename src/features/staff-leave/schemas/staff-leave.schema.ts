import { z } from "zod";
import { staffLeaveStatuses } from "@/features/staff-leave/types/staff-leave";

const scopedFields = {
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
};

const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");

export const staffLeaveFiltersSchema = z.object({
  staffId: z.string().trim().min(1).optional(),
  leaveTypeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  status: z.enum(staffLeaveStatuses).optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  search: z.string().trim().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(25),
});

export const staffLeaveRequestSchema = z.object({
  ...scopedFields,
  staffId: z.string().trim().min(1),
  leaveTypeId: z.string().trim().min(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  reason: z.string().trim().min(3).max(500),
  attachmentName: z.string().trim().min(1).max(160).optional(),
  status: z.enum(staffLeaveStatuses).default("pending_approval"),
});

export const staffLeaveReviewSchema = z.object({
  ...scopedFields,
  requestId: z.string().trim().min(1),
  action: z.enum(["approve", "reject", "cancel"]),
  reviewedBy: z.string().trim().min(1),
  reviewerRemarks: z.string().trim().min(3).max(500).optional(),
});
