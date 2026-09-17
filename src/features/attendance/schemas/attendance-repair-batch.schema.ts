import { z } from "zod";
import { maxAttendanceRepairBatchSelection } from "@/features/attendance/types/attendance-repair-batch";

const scopedFields = {
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
};

const attendanceIdSchema = z.string().trim().min(3).max(128).regex(/^[a-z0-9_-]+$/i, "Attendance ID contains invalid characters.");

export const attendanceRepairBatchSelectionSchema = z.object({
  ...scopedFields,
  attendanceIds: z.array(attendanceIdSchema)
    .min(1, "Select at least one attendance record.")
    .max(maxAttendanceRepairBatchSelection, `Select ${maxAttendanceRepairBatchSelection} or fewer attendance records.`)
    .transform((ids) => Array.from(new Set(ids))),
});

export const attendanceRepairBatchPrepareSchema = attendanceRepairBatchSelectionSchema.extend({
  requestedBy: z.string().trim().min(1),
  reason: z.string().trim().min(8, "Batch preparation reason must be at least 8 characters.").max(500),
});
