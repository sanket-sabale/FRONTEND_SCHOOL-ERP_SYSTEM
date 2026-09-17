import type { TenantScopedQuery } from "@/lib/api/client";

export const timetableStatuses = ["draft", "published", "archived"] as const;
export type TimetableStatus = (typeof timetableStatuses)[number];

export const timetableEntryStatuses = ["assigned", "cancelled"] as const;
export type TimetableEntryStatus = (typeof timetableEntryStatuses)[number];

export const timetablePeriodTypes = ["teaching", "break", "lunch", "assembly", "activity", "other"] as const;
export type TimetablePeriodType = (typeof timetablePeriodTypes)[number];

export const timetableDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type TimetableDay = string;

export type TimetableDayDefinition = {
  id: TimetableDay;
  label: string;
};

export const timetableDayOptions: TimetableDayDefinition[] = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
];

export type TimetablePeriod = TenantScopedQuery & {
  id: string;
  scheduleId: string;
  name: string;
  startTime: string;
  endTime: string;
  type: TimetablePeriodType;
  order: number;
  isTeaching: boolean;
  isActive: boolean;
  height?: number;
  description?: string;
};

export const timetableColumnTypes = ["time", "day", "teacher", "class", "room", "custom"] as const;
export type TimetableColumnType = (typeof timetableColumnTypes)[number];

export const timetableCellTypeCategories = ["instructional", "non_instructional", "resource", "custom"] as const;
export type TimetableCellTypeCategory = (typeof timetableCellTypeCategories)[number];

export type TimetableColumn = {
  id: string;
  label: string;
  type: TimetableColumnType;
  order: number;
  width: number;
  visible: boolean;
  editable: boolean;
  dayKey?: string;
  metadata?: Record<string, string>;
};

export type TimetableRow = {
  id: string;
  label: string;
  startTime?: string;
  endTime?: string;
  type: TimetablePeriodType | string;
  order: number;
  height: number;
  visible: boolean;
  editable: boolean;
  description?: string;
  metadata?: Record<string, string>;
};

export type TimetableCellType = {
  id: string;
  name: string;
  description?: string;
  category: TimetableCellTypeCategory;
  requiresSubject?: boolean;
  requiresTeacher?: boolean;
  requiresClass?: boolean;
  requiresRoom?: boolean;
  supportsActivity?: boolean;
  defaultEditable: boolean;
  defaultDisplay: TimetableCellDisplay;
  active: boolean;
};

export type TimetableCellDisplay = {
  subject: boolean;
  teacher: boolean;
  room: boolean;
  classSection: boolean;
  activity: boolean;
};

export type TimetableCellContent = {
  subjectId?: string;
  teacherId?: string;
  classId?: string;
  sectionId?: string;
  roomId?: string;
  activityLabel?: string;
  customText?: string;
};

export type TimetableCellConfiguration = {
  id: string;
  rowId: string;
  columnId: string;
  cellTypeId: string;
  editable: boolean;
  display: TimetableCellDisplay;
  rowSpan?: number;
  columnSpan?: number;
  mergedIntoCellId?: string;
};

export type TimetableLayout = TenantScopedQuery & {
  id: string;
  name: string;
  description?: string;
  columns: TimetableColumn[];
  rows: TimetableRow[];
  cellTypes: TimetableCellType[];
  cells: TimetableCellConfiguration[];
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type TimetableSchedule = TenantScopedQuery & {
  id: string;
  name: string;
  description?: string;
  workingDays: TimetableDay[];
  periods: TimetablePeriod[];
  layout: TimetableLayout;
  columns: TimetableColumn[];
  rows: TimetableRow[];
  cellTypes: TimetableCellType[];
  cells: TimetableCellConfiguration[];
  status: "active" | "inactive" | "archived";
  defaultRoomRequiredForSubjectIds?: string[];
  createdAt: string;
  updatedAt: string;
};

export type TimetableConfiguration = TimetableSchedule;

export type TimetableEntry = TenantScopedQuery & {
  id: string;
  timetableId: string;
  classId: string;
  sectionId: string;
  rowId: string;
  columnId: string;
  dayOfWeek?: TimetableDay;
  periodId?: string;
  cellTypeId?: string;
  content?: TimetableCellContent;
  subjectId?: string;
  teacherId?: string;
  roomId?: string;
  status: TimetableEntryStatus;
  notes?: string;
};

export type Timetable = TenantScopedQuery & {
  id: string;
  scheduleId: string;
  configurationId: string;
  name: string;
  status: TimetableStatus;
  entries: TimetableEntry[];
  versionNumber: number;
  effectiveFrom?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TimetableTemplate = TenantScopedQuery & {
  id: string;
  name: string;
  description: string;
  scheduleId: string;
  configurationId: string;
  sourceTimetableId?: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type TimetableVersion = TenantScopedQuery & {
  id: string;
  timetableId: string;
  versionNumber: number;
  status: TimetableStatus;
  publishedAt?: string;
  createdAt: string;
  summary: string;
};

export type TimetableSubject = TenantScopedQuery & {
  id: string;
  code: string;
  name: string;
  requiresRoomType?: "laboratory" | "computer_lab" | "library" | "auditorium";
  status: "active" | "inactive";
};

export type TimetableRoom = TenantScopedQuery & {
  id: string;
  name: string;
  code: string;
  roomType: "classroom" | "laboratory" | "computer_lab" | "library" | "auditorium";
  capacity?: number;
  status: "active" | "maintenance" | "inactive";
};

export type TimetableResourceOption = {
  id: string;
  label: string;
  description?: string;
};

export type TimetableConflictType =
  | "class_conflict"
  | "teacher_conflict"
  | "room_conflict"
  | "missing_assignment"
  | "resource_constraint"
  | "invalid_structure"
  | "invalid_cell";

export type TimetableConflict = {
  id: string;
  type: TimetableConflictType;
  severity: "error" | "warning";
  timetableId: string;
  entryId?: string;
  dayOfWeek?: TimetableDay;
  periodId?: string;
  rowId?: string;
  columnId?: string;
  title: string;
  message: string;
  relatedEntryIds: string[];
  resolutionHints: string[];
};

export type TimetableValidationResult = {
  valid: boolean;
  conflicts: TimetableConflict[];
};

export type TimetableFilters = Partial<TenantScopedQuery> & {
  timetableId?: string;
  classId?: string;
  sectionId?: string;
  teacherId?: string;
  subjectId?: string;
  roomId?: string;
  status?: TimetableStatus;
};

export type TimetableSummary = {
  activeTimetable?: Timetable;
  draftTimetable?: Timetable;
  publishedTimetable?: Timetable;
  activeScheduleCount: number;
  totalClasses: number;
  totalTeachers: number;
  totalRooms: number;
  totalPeriods: number;
  conflictCount: number;
  lastUpdated?: string;
};

export type TimetableEntryInput = TenantScopedQuery & {
  timetableId: string;
  classId: string;
  sectionId: string;
  rowId: string;
  columnId: string;
  dayOfWeek?: TimetableDay;
  periodId?: string;
  cellTypeId?: string;
  content?: TimetableCellContent;
  subjectId?: string;
  teacherId?: string;
  roomId?: string;
  notes?: string;
};

export type TimetableEntryUpdateInput = Partial<
  Omit<TimetableEntryInput, keyof TenantScopedQuery | "timetableId">
> & TenantScopedQuery & {
  id: string;
  timetableId: string;
  status?: TimetableEntryStatus;
};

export type TimetableCreateInput = TenantScopedQuery & {
  name: string;
  scheduleId: string;
  configurationId?: string;
};

export type TimetablePublishInput = TenantScopedQuery & {
  timetableId: string;
  effectiveFrom?: string;
};
