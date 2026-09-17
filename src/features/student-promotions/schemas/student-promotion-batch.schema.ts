import { z } from "zod";
import { maxStudentPromotionBatchSelection } from "@/features/student-promotions/types/student-promotion-batch";

const requiredId = z.string().trim().min(1);

const scopedFields = {
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
};

export const studentPromotionBatchSelectionSchema = z.object({
  ...scopedFields,
  sourceAcademicYearId: requiredId,
  targetAcademicYearId: requiredId,
  candidateIds: z.array(requiredId).min(1, "Select at least one promotion candidate.").max(maxStudentPromotionBatchSelection),
});

export const studentPromotionBatchPrepareSchema = studentPromotionBatchSelectionSchema.extend({
  requestedBy: requiredId,
  reason: z.string().trim().min(1).max(500),
});
