import { z } from "zod";

const requiredId = z.string().trim().min(1);

export const admissionFinanceScopeSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
});

export const admissionFinanceMutationSchema = admissionFinanceScopeSchema.extend({
  applicationId: requiredId,
  actorId: requiredId,
  amount: z.number().positive().max(1_000_000).optional(),
  paidAmount: z.number().positive().max(1_000_000).optional(),
  method: z.enum(["UPI", "Card", "Net Banking", "Cash"]).optional(),
  dueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
