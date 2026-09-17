import { z } from "zod";
import { attendanceRepairStatuses } from "@/features/attendance/types/attendance-repair";
import { attendanceRepairAuditEventTypes } from "@/features/attendance/types/attendance-repair-audit";
import { attendanceSnapshotIntegrityStatuses } from "@/features/attendance/types/attendance-integrity";

const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.").optional();

export const attendanceRepairAuditFiltersSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  schoolId: z.string().trim().min(1).optional(),
  campusId: z.string().trim().min(1).optional(),
  academicYearId: z.string().trim().min(1).optional(),
  dateFrom: isoDateSchema,
  dateTo: isoDateSchema,
  eventDateFrom: isoDateSchema,
  eventDateTo: isoDateSchema,
  studentId: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional(),
  integrityStatus: z.enum(attendanceSnapshotIntegrityStatuses).optional(),
  repairStatus: z.enum(attendanceRepairStatuses).optional(),
  eventType: z.enum(attendanceRepairAuditEventTypes).optional(),
  actorId: z.string().trim().min(1).optional(),
  batchCorrelationId: z.string().trim().min(1).optional(),
  source: z.enum(["individual", "bulk_preparation", "diagnostic"]).optional(),
  repairedOnly: z.boolean().optional(),
  query: z.string().trim().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export const attendanceRepairAuditExportRequestSchema = z.object({
  filters: attendanceRepairAuditFiltersSchema,
  includedFields: z.array(z.string().trim().min(1)).min(1).max(24),
  requestedBy: z.string().trim().optional(),
});
