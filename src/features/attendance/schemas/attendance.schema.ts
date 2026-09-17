import { z } from "zod";
import { attendanceSources, attendanceStatuses } from "@/features/attendance/types/attendance";

const scopedFields = {
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
};

export const attendanceDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");

const attendanceTimeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, "Use HH:MM time format.")
  .optional();

export const attendanceStatusSchema = z.enum(attendanceStatuses);

export const attendanceRemarksSchema = z.string().trim().max(300).optional();

export const attendanceFiltersSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  schoolId: z.string().trim().min(1).optional(),
  campusId: z.string().trim().min(1).optional(),
  academicYearId: z.string().trim().min(1).optional(),
  date: attendanceDateSchema.optional(),
  dateFrom: attendanceDateSchema.optional(),
  dateTo: attendanceDateSchema.optional(),
  classId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional(),
  studentId: z.string().trim().min(1).optional(),
  status: attendanceStatusSchema.optional(),
  search: z.string().trim().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["studentName", "admissionNumber", "className", "status", "date", "updatedAt"]).default("studentName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

export const attendanceHistoryFiltersSchema = attendanceFiltersSchema.extend({
  admissionNumber: z.string().trim().optional(),
  correctedOnly: z.boolean().optional(),
  markedBy: z.string().trim().optional(),
  correctedBy: z.string().trim().optional(),
});

export const markAttendanceEntrySchema = z.object({
  studentId: z.string().trim().min(1),
  classId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1),
  status: attendanceStatusSchema,
  checkInTime: attendanceTimeSchema,
  checkOutTime: attendanceTimeSchema,
  remarks: attendanceRemarksSchema,
});

export const markAttendanceSchema = z.object({
  ...scopedFields,
  date: attendanceDateSchema,
  records: z.array(markAttendanceEntrySchema).min(1),
  markedBy: z.string().trim().min(1).optional(),
  source: z.enum(attendanceSources).default("manual"),
});

export const updateAttendanceSchema = z.object({
  ...scopedFields,
  id: z.string().trim().min(1),
  status: attendanceStatusSchema.optional(),
  checkInTime: attendanceTimeSchema,
  checkOutTime: attendanceTimeSchema,
  remarks: attendanceRemarksSchema,
  updatedBy: z.string().trim().min(1).optional(),
});

export const attendanceCorrectionReasonSchema = z
  .string()
  .trim()
  .min(8, "Correction reason must be at least 8 characters.")
  .max(500, "Correction reason must be 500 characters or fewer.");

export const attendanceCorrectionSchema = z.object({
  ...scopedFields,
  attendanceId: z.string().trim().min(1),
  newStatus: attendanceStatusSchema,
  reason: attendanceCorrectionReasonSchema,
  correctedBy: z.string().trim().min(1),
});
