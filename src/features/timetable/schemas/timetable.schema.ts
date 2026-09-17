import { z } from "zod";
import { timetableColumnTypes, timetableEntryStatuses, timetablePeriodTypes, timetableStatuses } from "@/features/timetable/types/timetable";

const scopedSchema = z.object({
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
});

const optionalScopedSchema = scopedSchema.partial();
const timeSchema = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm time format.");
const displaySchema = z.object({
  subject: z.boolean(),
  teacher: z.boolean(),
  room: z.boolean(),
  classSection: z.boolean(),
  activity: z.boolean(),
});

const columnSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1).max(80),
  type: z.enum(timetableColumnTypes),
  order: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  visible: z.boolean(),
  editable: z.boolean(),
  dayKey: z.string().trim().min(1).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

const rowSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1).max(80),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  type: z.string().trim().min(1),
  order: z.number().int().nonnegative(),
  height: z.number().int().positive(),
  visible: z.boolean(),
  editable: z.boolean(),
  description: z.string().trim().max(240).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

const cellTypeSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  category: z.enum(["instructional", "non_instructional", "resource", "custom"]),
  requiresSubject: z.boolean().optional(),
  requiresTeacher: z.boolean().optional(),
  requiresClass: z.boolean().optional(),
  requiresRoom: z.boolean().optional(),
  supportsActivity: z.boolean().optional(),
  defaultEditable: z.boolean(),
  defaultDisplay: displaySchema,
  active: z.boolean(),
});

const cellConfigurationSchema = z.object({
  id: z.string().trim().min(1),
  rowId: z.string().trim().min(1),
  columnId: z.string().trim().min(1),
  cellTypeId: z.string().trim().min(1),
  editable: z.boolean(),
  display: displaySchema,
  rowSpan: z.number().int().positive().optional(),
  columnSpan: z.number().int().positive().optional(),
  mergedIntoCellId: z.string().trim().min(1).optional(),
});

const layoutSchema = scopedSchema.extend({
  id: z.string().trim().min(1),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional(),
  columns: z.array(columnSchema).min(1),
  rows: z.array(rowSchema).min(1),
  cellTypes: z.array(cellTypeSchema).min(1),
  cells: z.array(cellConfigurationSchema),
  status: z.enum(["active", "inactive", "archived"]),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export const timetableFiltersSchema = optionalScopedSchema.extend({
  timetableId: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional(),
  teacherId: z.string().trim().min(1).optional(),
  subjectId: z.string().trim().min(1).optional(),
  roomId: z.string().trim().min(1).optional(),
  status: z.enum(timetableStatuses).optional(),
});

export const timetableCreateSchema = scopedSchema.extend({
  name: z.string().trim().min(3).max(120),
  scheduleId: z.string().trim().min(1),
  configurationId: z.string().trim().min(1).optional(),
});

export const timetableEntryCreateSchema = scopedSchema.extend({
  timetableId: z.string().trim().min(1),
  classId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1),
  rowId: z.string().trim().min(1),
  columnId: z.string().trim().min(1),
  dayOfWeek: z.string().trim().min(1).optional(),
  periodId: z.string().trim().min(1).optional(),
  cellTypeId: z.string().trim().min(1).optional(),
  content: z.object({
    subjectId: z.string().trim().min(1).optional(),
    teacherId: z.string().trim().min(1).optional(),
    classId: z.string().trim().min(1).optional(),
    sectionId: z.string().trim().min(1).optional(),
    roomId: z.string().trim().min(1).optional(),
    activityLabel: z.string().trim().max(120).optional(),
    customText: z.string().trim().max(240).optional(),
  }).optional(),
  subjectId: z.string().trim().min(1).optional(),
  teacherId: z.string().trim().min(1).optional(),
  roomId: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const timetableEntryUpdateSchema = timetableEntryCreateSchema
  .omit({ classId: true, sectionId: true, rowId: true, columnId: true, dayOfWeek: true, periodId: true, cellTypeId: true, content: true, subjectId: true, teacherId: true, roomId: true, notes: true })
  .extend({
    id: z.string().trim().min(1),
    classId: z.string().trim().min(1).optional(),
    sectionId: z.string().trim().min(1).optional(),
    rowId: z.string().trim().min(1).optional(),
    columnId: z.string().trim().min(1).optional(),
    dayOfWeek: z.string().trim().min(1).optional(),
    periodId: z.string().trim().min(1).optional(),
    cellTypeId: z.string().trim().min(1).optional(),
    content: z.object({
      subjectId: z.string().trim().min(1).optional(),
      teacherId: z.string().trim().min(1).optional(),
      classId: z.string().trim().min(1).optional(),
      sectionId: z.string().trim().min(1).optional(),
      roomId: z.string().trim().min(1).optional(),
      activityLabel: z.string().trim().max(120).optional(),
      customText: z.string().trim().max(240).optional(),
    }).optional(),
    subjectId: z.string().trim().min(1).optional(),
    teacherId: z.string().trim().min(1).optional(),
    roomId: z.string().trim().min(1).optional(),
    status: z.enum(timetableEntryStatuses).optional(),
    notes: z.string().trim().max(500).optional(),
  });

export const timetablePeriodSchema = scopedSchema.extend({
  id: z.string().trim().min(1),
  scheduleId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(60),
  startTime: timeSchema,
  endTime: timeSchema,
  type: z.enum(timetablePeriodTypes),
  order: z.number().int().nonnegative(),
  isTeaching: z.boolean(),
  isActive: z.boolean(),
  height: z.number().int().positive().optional(),
  description: z.string().trim().max(240).optional(),
});

export const timetableScheduleSchema = scopedSchema.extend({
  id: z.string().trim().min(1),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional(),
  workingDays: z.array(z.string().trim().min(1)).min(1),
  periods: z.array(timetablePeriodSchema).min(1),
  columns: z.array(columnSchema).min(1),
  rows: z.array(rowSchema).min(1),
  cellTypes: z.array(cellTypeSchema).min(1),
  cells: z.array(cellConfigurationSchema),
  layout: layoutSchema,
  status: z.enum(["active", "inactive", "archived"]),
  defaultRoomRequiredForSubjectIds: z.array(z.string().trim().min(1)).optional(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export const timetableConfigurationSchema = timetableScheduleSchema;

export const timetablePublishSchema = scopedSchema.extend({
  timetableId: z.string().trim().min(1),
  effectiveFrom: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
