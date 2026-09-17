import { z } from "zod";
import { staffEmploymentEventTypes } from "@/features/staff-employment/types/staff-employment";

const scopedFields = {
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
};

const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");

export const staffEmploymentRecordSchema = z.object({
  ...scopedFields,
  staffId: z.string().trim().min(1),
  eventType: z.enum(staffEmploymentEventTypes),
  effectiveDate: isoDateSchema,
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  departmentId: z.string().trim().min(1).optional(),
  designationId: z.string().trim().min(1).optional(),
  employmentType: z.string().trim().min(1).max(80).optional(),
  reportingManagerId: z.string().trim().min(1).optional(),
  probationEndDate: isoDateSchema.optional(),
  noticePeriodDays: z.number().int().min(0).max(365).optional(),
  reason: z.string().trim().max(500).optional(),
  recordedBy: z.string().trim().min(1).max(80).optional(),
});
