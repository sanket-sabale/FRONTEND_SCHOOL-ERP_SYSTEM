import { z } from "zod";
import {
  disciplinaryStatuses,
  hrNoteCategories,
  performanceRatings,
  performanceReviewStatuses,
  performanceReviewTypes,
  staffGoalCategories,
  staffGoalPriorities,
  staffGoalStatuses,
  trainingStatuses,
  trainingTypes,
} from "@/features/staff-performance/types/staff-performance";

const idSchema = z.string().trim().min(3).max(100).regex(/^[a-z0-9_-]+$/i);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const scopedSchema = z.object({
  tenantId: z.string().min(1),
  schoolId: z.string().min(1),
  campusId: z.string().min(1),
  academicYearId: z.string().min(1),
});

export const staffPerformanceFiltersSchema = z.object({
  query: z.string().trim().max(120).optional(),
  status: z.enum(performanceReviewStatuses).optional(),
  reviewType: z.enum(performanceReviewTypes).optional(),
  staffId: idSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

export const staffPerformanceReviewSchema = scopedSchema.extend({
  staffId: idSchema,
  reviewPeriodStart: dateSchema,
  reviewPeriodEnd: dateSchema,
  reviewType: z.enum(performanceReviewTypes),
  reviewerName: z.string().trim().min(2).max(120),
  status: z.enum(performanceReviewStatuses).default("draft"),
  overallRating: z.coerce.number().pipe(z.union(performanceRatings.map((rating) => z.literal(rating)) as [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>])).optional(),
  strengths: z.string().trim().max(1200).optional(),
  improvementAreas: z.string().trim().max(1200).optional(),
  reviewerComments: z.string().trim().max(1600).optional(),
  staffComments: z.string().trim().max(1600).optional(),
  reviewDate: dateSchema.optional(),
  nextReviewDate: dateSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.reviewPeriodEnd < value.reviewPeriodStart) {
    ctx.addIssue({ code: "custom", message: "Review period end date must be after the start date.", path: ["reviewPeriodEnd"] });
  }
  if (value.nextReviewDate && value.reviewDate && value.nextReviewDate <= value.reviewDate) {
    ctx.addIssue({ code: "custom", message: "Next review date must be after the review date.", path: ["nextReviewDate"] });
  }
});

export const staffGoalSchema = scopedSchema.extend({
  staffId: idSchema,
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional(),
  category: z.enum(staffGoalCategories),
  targetDate: dateSchema,
  status: z.enum(staffGoalStatuses).default("not_started"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  priority: z.enum(staffGoalPriorities).default("medium"),
});

export const staffTrainingSchema = scopedSchema.extend({
  staffId: idSchema,
  title: z.string().trim().min(3).max(180),
  provider: z.string().trim().max(140).optional(),
  trainingType: z.enum(trainingTypes),
  startDate: dateSchema,
  endDate: dateSchema.optional(),
  durationHours: z.coerce.number().min(0.5).max(500).optional(),
  status: z.enum(trainingStatuses).default("planned"),
  remarks: z.string().trim().max(1200).optional(),
}).superRefine((value, ctx) => {
  if (value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({ code: "custom", message: "Training end date must be after the start date.", path: ["endDate"] });
  }
});

export const staffHrNoteSchema = scopedSchema.extend({
  staffId: idSchema,
  category: z.enum(hrNoteCategories),
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(5).max(2000),
  createdBy: z.string().trim().min(2).max(120),
});

export const staffStatusTransitionSchema = scopedSchema.extend({
  staffId: idSchema,
  recordId: idSchema,
  status: z.union([
    z.enum(performanceReviewStatuses),
    z.enum(staffGoalStatuses),
    z.enum(trainingStatuses),
    z.enum(disciplinaryStatuses),
  ]),
});
