import { z } from "zod";
import { feeCategories, feeFrequencies, financeRecordStatuses, invoiceStatuses, paymentMethods, paymentStatuses, refundStatuses } from "@/features/finance/types/finance";

const requiredId = z.string().trim().min(1);
const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);
const moneySchema = z.object({
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.literal("INR"),
});

export const financeScopeSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
});

export const permissionContextSchema = financeScopeSchema.extend({
  actorId: requiredId,
  role: z.enum(["principal", "teacher", "accountant", "hr", "system-admin"]),
});

export const financeFiltersSchema = z.object({
  query: z.string().trim().optional(),
  status: z.string().trim().optional(),
  subjectId: z.string().trim().optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(25),
});

export const feeStructureSchema = financeScopeSchema.extend({
  id: requiredId.optional(),
  name: requiredId,
  code: requiredId,
  category: z.enum(feeCategories),
  amount: moneySchema,
  frequency: z.enum(feeFrequencies),
  effectiveFrom: isoDate,
  effectiveTo: isoDate.optional(),
  status: z.enum(financeRecordStatuses).default("active"),
});

export const invoiceFilterSchema = financeFiltersSchema.extend({
  status: z.enum(invoiceStatuses).optional(),
});

export const paymentFilterSchema = financeFiltersSchema.extend({
  status: z.enum(paymentStatuses).optional(),
  method: z.enum(paymentMethods).optional(),
});

export const refundFilterSchema = financeFiltersSchema.extend({
  status: z.enum(refundStatuses).optional(),
});

export const financePaymentInputSchema = permissionContextSchema.extend({
  invoiceId: requiredId,
  amount: moneySchema,
  method: z.enum(paymentMethods),
  externalReference: z.string().trim().optional(),
  idempotencyKey: z.string().trim().optional(),
});

export const paymentVerificationSchema = permissionContextSchema.extend({
  paymentId: requiredId,
  reason: z.string().trim().optional(),
});

export const financeRefundInputSchema = permissionContextSchema.extend({
  paymentId: requiredId,
  amount: moneySchema,
  reason: z.string().trim().min(3),
  refundId: z.string().trim().optional(),
});
