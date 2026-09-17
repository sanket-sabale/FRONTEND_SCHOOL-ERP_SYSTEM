import { z } from "zod";
import { staffAcademicAssignmentStatuses, staffAcademicAssignmentTypes } from "@/features/staff-academic-assignments/types/staff-academic-assignment";

const idSchema = z.string().trim().min(3).max(120).regex(/^[a-z0-9_-]+$/i);
const dateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);

const scopedSchema = z.object({
  tenantId: z.string().min(1),
  schoolId: z.string().min(1),
  campusId: z.string().min(1),
  academicYearId: idSchema,
});

export const staffAcademicAssignmentFiltersSchema = z.object({
  query: z.string().trim().max(120).optional(),
  staffId: idSchema.optional(),
  academicYearId: idSchema.optional(),
  classId: idSchema.optional(),
  sectionId: idSchema.optional(),
  subjectId: idSchema.optional(),
  assignmentType: z.enum(staffAcademicAssignmentTypes).optional(),
  status: z.enum(staffAcademicAssignmentStatuses).optional(),
  primary: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

export const staffAcademicAssignmentCreateSchema = scopedSchema.extend({
  staffId: idSchema,
  classId: idSchema,
  sectionId: idSchema,
  subjectId: idSchema,
  assignmentType: z.enum(staffAcademicAssignmentTypes),
  status: z.enum(staffAcademicAssignmentStatuses).default("planned"),
  isPrimary: z.coerce.boolean().default(false),
  startDate: dateSchema,
  endDate: dateSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
}).superRefine((value, ctx) => {
  if (value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({ code: "custom", message: "Assignment end date must be after start date.", path: ["endDate"] });
  }
});

export const staffAcademicAssignmentStatusSchema = scopedSchema.extend({
  assignmentId: idSchema,
  status: z.enum(staffAcademicAssignmentStatuses),
  endDate: dateSchema.optional(),
});
