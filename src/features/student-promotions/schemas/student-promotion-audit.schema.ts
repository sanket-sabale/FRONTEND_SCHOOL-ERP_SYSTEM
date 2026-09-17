import { z } from "zod";
import { studentPromotionAuditSources } from "@/features/student-promotions/types/student-promotion-audit";
import { studentPromotionReasons, studentPromotionStatuses } from "@/features/student-promotions/types/student-promotion";

const optionalId = z.string().trim().min(1).max(160).optional();
const optionalText = z.string().trim().max(160).optional();
const optionalDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

export const studentPromotionAuditFiltersSchema = z.object({
  search: optionalText,
  studentId: optionalId,
  sourceAcademicYearId: optionalId,
  targetAcademicYearId: optionalId,
  sourceClassId: optionalId,
  targetClassId: optionalId,
  sourceSectionId: optionalId,
  targetSectionId: optionalId,
  status: z.enum(studentPromotionStatuses).optional(),
  reason: z.enum(studentPromotionReasons).optional(),
  source: z.enum(studentPromotionAuditSources).optional(),
  batchCorrelationId: optionalText,
  dateFrom: optionalDate,
  dateTo: optionalDate,
  appliedOnly: z.boolean().optional(),
  reviewedOnly: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(25),
});

export const studentPromotionAuditDetailSchema = z.object({
  promotionId: z.string().trim().regex(/^[a-z0-9_-]{3,160}$/i),
});
