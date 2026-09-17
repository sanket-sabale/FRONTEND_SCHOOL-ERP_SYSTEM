import { z } from "zod";
import { attendanceReportFiltersSchema } from "@/features/attendance/schemas/attendance-report.schema";
import {
  attendanceExportColumns,
  attendanceExportFormats,
  attendanceExportScopes,
  attendanceReportPackSections,
} from "@/features/attendance/types/attendance-export";

export const attendanceExportRequestSchema = z.object({
  scope: z.enum(attendanceExportScopes),
  filters: attendanceReportFiltersSchema,
  format: z.enum(attendanceExportFormats),
  columns: z.array(z.enum(attendanceExportColumns)).min(1, "Select at least one export column."),
  includeCorrections: z.boolean(),
  includeSummary: z.boolean(),
  includeDetails: z.boolean(),
  sections: z.array(z.enum(attendanceReportPackSections)).min(1, "Select at least one report pack section."),
  requestedBy: z.string().trim().min(1, "A requester is required."),
}).superRefine((value, context) => {
  if (value.scope === "student" && !value.filters.studentId) {
    context.addIssue({
      code: "custom",
      message: "Select a student for student-scoped export.",
      path: ["filters", "studentId"],
    });
  }

  if (value.scope === "class" && !value.filters.classId) {
    context.addIssue({
      code: "custom",
      message: "Select a class for class-scoped export.",
      path: ["filters", "classId"],
    });
  }

  if (value.scope === "section" && (!value.filters.classId || !value.filters.sectionId)) {
    context.addIssue({
      code: "custom",
      message: "Select a class and section for section-scoped export.",
      path: ["filters", "sectionId"],
    });
  }
});
