import { z } from "zod";
import {
  studentPlacementReasons,
  studentPlacementStatuses,
} from "@/features/student-placements/types/student-placement";

const requiredId = z.string().trim().min(1);
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");

const scopedFields = {
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
};

const optionalScopedFields = {
  tenantId: requiredId.optional(),
  schoolId: requiredId.optional(),
  campusId: requiredId.optional(),
  academicYearId: requiredId.optional(),
};

export const studentPlacementFiltersSchema = z.object({
  ...optionalScopedFields,
  query: z.string().trim().optional(),
  studentId: requiredId.optional(),
  classId: requiredId.optional(),
  sectionId: requiredId.optional(),
  status: z.enum(studentPlacementStatuses).optional(),
  allAcademicYears: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["studentName", "className", "startDate", "status"]).default("studentName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

export const studentPlacementCreateSchema = z.object({
  ...scopedFields,
  id: requiredId.optional(),
  studentId: requiredId,
  classId: requiredId,
  sectionId: requiredId,
  status: z.enum(studentPlacementStatuses).default("active"),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional(),
  reason: z.enum(studentPlacementReasons).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const studentPlacementUpdateSchema = studentPlacementCreateSchema
  .omit({ studentId: true, classId: true, sectionId: true, tenantId: true, schoolId: true, campusId: true, academicYearId: true })
  .partial()
  .extend({
    id: requiredId,
    ...scopedFields,
  });

export const studentPlacementEndSchema = z.object({
  ...scopedFields,
  id: requiredId,
  endDate: isoDateSchema,
  reason: z.enum(studentPlacementReasons),
});

export const studentPlacementTransferSchema = z.object({
  ...scopedFields,
  studentId: requiredId,
  fromPlacementId: requiredId,
  toAcademicYearId: requiredId,
  toClassId: requiredId,
  toSectionId: requiredId,
  startDate: isoDateSchema,
  reason: z.enum(studentPlacementReasons),
});
