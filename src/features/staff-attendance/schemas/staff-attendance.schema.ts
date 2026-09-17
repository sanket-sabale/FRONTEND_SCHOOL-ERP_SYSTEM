import { z } from "zod";
import { staffAttendanceSources, staffAttendanceStatuses } from "@/features/staff-attendance/types/staff-attendance";

const scopedFields = {
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
};

const optionalScopedFields = {
  tenantId: z.string().trim().min(1).optional(),
  schoolId: z.string().trim().min(1).optional(),
  campusId: z.string().trim().min(1).optional(),
  academicYearId: z.string().trim().min(1).optional(),
};

const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");
const timeSchema = z.string().trim().regex(/^\d{2}:\d{2}$/, "Use HH:mm time format.").optional();

export const staffAttendanceFiltersSchema = z.object({
  ...optionalScopedFields,
  attendanceDate: isoDateSchema.optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  staffId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  designationId: z.string().trim().min(1).optional(),
  staffCategory: z.string().trim().min(1).optional(),
  employmentType: z.string().trim().min(1).optional(),
  status: z.enum(staffAttendanceStatuses).optional(),
  search: z.string().trim().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(25),
  sortBy: z.enum(["staffName", "employeeNumber", "attendanceDate", "status", "departmentName"]).default("staffName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

export const staffAttendanceMarkSchema = z.object({
  ...scopedFields,
  attendanceDate: isoDateSchema,
  records: z.array(z.object({
    staffId: z.string().trim().min(1),
    status: z.enum(staffAttendanceStatuses),
    checkIn: timeSchema,
    checkOut: timeSchema,
    remarks: z.string().trim().max(300).optional(),
  })).min(1),
  markedBy: z.string().trim().min(1).optional(),
  source: z.enum(staffAttendanceSources).default("manual"),
});
