import { z } from "zod";
import { attendanceStatuses } from "@/features/attendance/types/attendance";

const reportDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.")
  .optional();

export const attendanceReportFiltersSchema = z.object({
  dateFrom: reportDateSchema,
  dateTo: reportDateSchema,
  studentId: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional(),
  campusId: z.string().trim().min(1).optional(),
  academicYearId: z.string().trim().min(1).optional(),
  status: z.enum(attendanceStatuses).optional(),
  correctedOnly: z.boolean().optional(),
  attendanceThreshold: z.number().min(1).max(100).default(75),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["studentName", "attendancePercentage", "absentDays", "lateDays", "className", "sectionName"]).default("attendancePercentage"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
}).superRefine((value, context) => {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    context.addIssue({
      code: "custom",
      message: "Date from must be before date to.",
      path: ["dateFrom"],
    });
  }
});
