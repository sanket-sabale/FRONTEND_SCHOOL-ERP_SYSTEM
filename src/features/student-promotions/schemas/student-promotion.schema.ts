import { z } from "zod";
import { studentPromotionReasons, studentPromotionStatuses } from "@/features/student-promotions/types/student-promotion";

const requiredId = z.string().trim().min(1);
const optionalId = z.string().trim().min(1).optional();
const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");

const scopedFields = {
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
};

const optionalScopedFields = {
  tenantId: optionalId,
  schoolId: optionalId,
  campusId: optionalId,
  academicYearId: optionalId,
};

export const studentPromotionFiltersSchema = z.object({
  ...optionalScopedFields,
  sourceAcademicYearId: optionalId,
  targetAcademicYearId: optionalId,
  classId: optionalId,
  sectionId: optionalId,
  status: z.enum(studentPromotionStatuses).optional(),
  query: z.string().trim().optional(),
  sortBy: z.enum(["studentName", "sourceClassName", "targetClassName", "status", "updatedAt"]).default("studentName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(25),
});

export const transitionReadinessQuerySchema = z.object({
  ...scopedFields,
  sourceAcademicYearId: requiredId,
  targetAcademicYearId: requiredId,
});

export const studentPromotionCreateSchema = z.object({
  ...scopedFields,
  studentId: requiredId,
  sourceAcademicYearId: requiredId,
  targetAcademicYearId: requiredId,
  targetClassId: optionalId,
  targetSectionId: optionalId,
  reason: z.enum(studentPromotionReasons).default("annual_promotion"),
  notes: z.string().trim().max(500).optional(),
  proposedBy: requiredId,
  promotionSource: z.enum(["individual", "bulk_preparation"]).optional(),
  batchCorrelationId: z.string().trim().min(3).max(128).optional(),
});

export const studentPromotionUpdateSchema = z.object({
  ...scopedFields,
  id: requiredId,
  targetClassId: optionalId,
  targetSectionId: optionalId,
  status: z.enum(studentPromotionStatuses).optional(),
  reason: z.enum(studentPromotionReasons).optional(),
  notes: z.string().trim().max(500).optional(),
  reviewedBy: optionalId,
});

export const studentPromotionApplySchema = z.object({
  ...scopedFields,
  id: requiredId,
  appliedBy: requiredId,
  startDate: isoDateSchema,
  notes: z.string().trim().max(500).optional(),
});
