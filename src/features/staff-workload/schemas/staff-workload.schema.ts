import { z } from "zod";
import { schedulingReadinessStatuses, workloadDays, workloadStatuses } from "@/features/staff-workload/types/staff-workload";

const idSchema = z.string().trim().min(3).max(120).regex(/^[a-z0-9_-]+$/i);

export const staffWorkloadFiltersSchema = z.object({
  query: z.string().trim().max(120).optional(),
  status: z.enum(workloadStatuses).optional(),
  readiness: z.enum(schedulingReadinessStatuses).optional(),
  department: z.string().trim().max(120).optional(),
  designation: z.string().trim().max(120).optional(),
  sortBy: z.enum(["staffName", "assignedWeeklyPeriods", "expectedWeeklyPeriods", "utilizationPercentage", "status", "readiness"]).default("staffName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export const assignmentWorkloadConfigSchema = z.object({
  tenantId: z.string().min(1),
  schoolId: z.string().min(1),
  campusId: z.string().min(1),
  academicYearId: idSchema,
  assignmentId: idSchema,
  weeklyPeriods: z.coerce.number().int().min(0).max(60).optional(),
  contributesToWorkload: z.coerce.boolean().default(true),
  schedulingPriority: z.enum(["low", "normal", "high"]).default("normal"),
  notes: z.string().trim().max(500).optional(),
});

export const staffAvailabilityRuleSchema = z.object({
  tenantId: z.string().min(1),
  schoolId: z.string().min(1),
  campusId: z.string().min(1),
  academicYearId: idSchema,
  staffId: idSchema,
  day: z.enum(workloadDays),
  period: z.coerce.number().int().min(1).max(12),
  state: z.enum(["available", "unavailable", "preferred"]),
  notes: z.string().trim().max(500).optional(),
});
