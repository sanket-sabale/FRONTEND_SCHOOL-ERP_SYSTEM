import { z } from "zod";
import { attendanceRepairStatuses } from "@/features/attendance/types/attendance-repair";
import { attendanceSnapshotIntegrityStatuses } from "@/features/attendance/types/attendance-integrity";

const scopedFields = {
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
};

const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.").optional();

export const attendanceRepairFiltersSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  schoolId: z.string().trim().min(1).optional(),
  campusId: z.string().trim().min(1).optional(),
  academicYearId: z.string().trim().min(1).optional(),
  status: z.enum(attendanceRepairStatuses).optional(),
  integrityStatus: z.enum(attendanceSnapshotIntegrityStatuses).optional(),
  studentId: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional(),
  dateFrom: isoDateSchema,
  dateTo: isoDateSchema,
  query: z.string().trim().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export const attendanceRepairCreateSchema = z.object({
  ...scopedFields,
  attendanceId: z.string().trim().min(1),
  requestedBy: z.string().trim().min(1),
  reason: z.string().trim().min(8, "Repair reason must be at least 8 characters.").max(500),
  source: z.enum(["individual", "bulk_preparation"]).optional(),
  batchCorrelationId: z.string().trim().min(3).max(128).optional(),
});

export const attendanceRepairMutationSchema = z.object({
  ...scopedFields,
  repairId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  comment: z.string().trim().max(500).optional(),
});
