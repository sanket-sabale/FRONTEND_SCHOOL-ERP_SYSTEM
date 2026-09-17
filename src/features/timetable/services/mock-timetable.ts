import { tenantContext } from "@/lib/tenant-context";
import type {
  Timetable,
  TimetableDay,
  TimetableEntry,
  TimetableCellDisplay,
  TimetableCellType,
  TimetableColumn,
  TimetableLayout,
  TimetablePeriod,
  TimetableRow,
  TimetableRoom,
  TimetableSchedule,
  TimetableSubject,
  TimetableTemplate,
  TimetableVersion,
} from "@/features/timetable/types/timetable";
import type { TenantScopedQuery } from "@/lib/api/client";

const tenantAScope: TenantScopedQuery = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

const tenantBScope: TenantScopedQuery = {
  tenantId: "tenant-demo-west",
  schoolId: "school-demo-west",
  campusId: "campus-demo-central",
  academicYearId: "ay-2026-27",
};

const tenantCScope: TenantScopedQuery = {
  tenantId: "tenant-demo-south",
  schoolId: "school-demo-south",
  campusId: "campus-demo-main",
  academicYearId: "ay-2026-27",
};

export const mockTimetableSubjects: TimetableSubject[] = [
  ...subjectsForScope(tenantAScope, ""),
  ...subjectsForScope(tenantBScope, "west-"),
  ...subjectsForScope(tenantCScope, "south-"),
];

export const mockTimetableRooms: TimetableRoom[] = [
  ...roomsForScope(tenantAScope, ""),
  ...roomsForScope(tenantBScope, "west-"),
  ...roomsForScope(tenantCScope, "south-"),
];

type TimetableScheduleSeed = Omit<TimetableSchedule, "layout" | "columns" | "rows" | "cellTypes" | "cells">;

const baseTimetableSchedules: TimetableScheduleSeed[] = [
  {
    ...tenantAScope,
    id: "tt-schedule-secondary",
    name: "Secondary Regular Schedule",
    description: "Five-day schedule with eight active rows including break and lunch.",
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    periods: [
      period("tt-schedule-secondary", "period-morning-circle", "Morning Circle", "07:45", "08:00", "assembly", 1, false, tenantAScope),
      period("tt-schedule-secondary", "period-foundation", "Foundation Block", "08:00", "08:45", "teaching", 2, true, tenantAScope),
      period("tt-schedule-secondary", "period-applied-learning", "Applied Learning", "08:45", "09:30", "teaching", 3, true, tenantAScope),
      period("tt-schedule-secondary", "period-short-break", "Short Break", "09:30", "09:45", "break", 4, false, tenantAScope),
      period("tt-schedule-secondary", "period-lab-studio", "Lab Studio", "09:45", "10:30", "teaching", 5, true, tenantAScope),
      period("tt-schedule-secondary", "period-language-block", "Language Block", "10:30", "11:15", "teaching", 6, true, tenantAScope),
      period("tt-schedule-secondary", "period-lunch", "Lunch", "11:15", "11:55", "lunch", 7, false, tenantAScope),
      period("tt-schedule-secondary", "period-enrichment", "Enrichment", "11:55", "12:40", "activity", 8, false, tenantAScope),
    ],
    status: "active",
    defaultRoomRequiredForSubjectIds: ["subject-science", "subject-computer", "subject-library"],
    createdAt: "2026-08-01T09:00:00+05:30",
    updatedAt: "2026-08-20T10:30:00+05:30",
  },
  {
    ...tenantAScope,
    id: "tt-schedule-primary",
    name: "Primary Compact Schedule",
    description: "Alternate schedule for younger classes with shorter teaching blocks.",
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    periods: [
      period("tt-schedule-primary", "primary-gathering", "Gathering", "08:15", "08:30", "assembly", 1, false, tenantAScope),
      period("tt-schedule-primary", "primary-block-a", "Discovery A", "08:30", "09:05", "teaching", 2, true, tenantAScope),
      period("tt-schedule-primary", "primary-block-b", "Discovery B", "09:05", "09:40", "teaching", 3, true, tenantAScope),
      period("tt-schedule-primary", "primary-snack", "Snack Break", "09:40", "10:00", "break", 4, false, tenantAScope),
      period("tt-schedule-primary", "primary-block-c", "Discovery C", "10:00", "10:35", "teaching", 5, true, tenantAScope),
      period("tt-schedule-primary", "primary-activity", "Activity Studio", "10:35", "11:10", "activity", 6, false, tenantAScope),
    ],
    status: "active",
    createdAt: "2026-08-01T09:00:00+05:30",
    updatedAt: "2026-08-18T09:00:00+05:30",
  },
  {
    ...tenantBScope,
    id: "tt-schedule-west-extended",
    name: "West Six-Day Extended Schedule",
    description: "Six working days and nine active rows with different names and timings.",
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    periods: [
      period("tt-schedule-west-extended", "west-briefing", "House Briefing", "07:30", "07:45", "assembly", 1, false, tenantBScope),
      period("tt-schedule-west-extended", "west-lecture-1", "Morning Lecture", "07:45", "08:30", "teaching", 2, true, tenantBScope),
      period("tt-schedule-west-extended", "west-lecture-2", "Lecture 2", "08:30", "09:15", "teaching", 3, true, tenantBScope),
      period("tt-schedule-west-extended", "west-break", "Campus Break", "09:15", "09:30", "break", 4, false, tenantBScope),
      period("tt-schedule-west-extended", "west-lecture-3", "Lecture 3", "09:30", "10:15", "teaching", 5, true, tenantBScope),
      period("tt-schedule-west-extended", "west-lecture-4", "Lecture 4", "10:15", "11:00", "teaching", 6, true, tenantBScope),
      period("tt-schedule-west-extended", "west-reset", "Reset Break", "11:00", "11:10", "break", 7, false, tenantBScope),
      period("tt-schedule-west-extended", "west-lunch", "Midday Meal", "11:10", "11:50", "lunch", 8, false, tenantBScope),
      period("tt-schedule-west-extended", "west-lab", "Discovery Studio", "11:50", "12:35", "activity", 9, true, tenantBScope),
      period("tt-schedule-west-extended", "west-club", "Saturday Club", "12:35", "13:20", "activity", 10, false, tenantBScope),
    ],
    status: "active",
    createdAt: "2026-08-01T09:00:00+05:30",
    updatedAt: "2026-08-20T10:30:00+05:30",
  },
  {
    ...tenantCScope,
    id: "tt-schedule-south-compact",
    name: "South Compact Schedule",
    description: "Five working days and six active rows with a shorter school day.",
    workingDays: ["day-1", "day-2", "day-3"],
    periods: [
      period("tt-schedule-south-compact", "south-prayer", "Prayer", "08:10", "08:25", "assembly", 1, false, tenantCScope),
      period("tt-schedule-south-compact", "south-block-1", "Learning Block A", "08:25", "09:05", "teaching", 2, true, tenantCScope),
      period("tt-schedule-south-compact", "south-block-2", "Learning Block B", "09:05", "09:45", "teaching", 3, true, tenantCScope),
      period("tt-schedule-south-compact", "south-refresh", "Refresh Break", "09:45", "10:00", "break", 4, false, tenantCScope),
      period("tt-schedule-south-compact", "south-block-3", "Learning Block C", "10:00", "10:40", "teaching", 5, true, tenantCScope),
      period("tt-schedule-south-compact", "south-project", "Project Circle", "10:40", "11:20", "activity", 6, false, tenantCScope),
    ],
    status: "active",
    createdAt: "2026-08-01T09:00:00+05:30",
    updatedAt: "2026-08-20T10:30:00+05:30",
  },
];

export const mockTimetableSchedules: TimetableSchedule[] = baseTimetableSchedules.map(withLayout);

export const mockTimetableConfigurations = mockTimetableSchedules;

export const mockTimetables: Timetable[] = [
  {
    ...tenantAScope,
    id: "tt-published-regular",
    scheduleId: "tt-schedule-secondary",
    configurationId: "tt-schedule-secondary",
    name: "Middle School Regular Timetable",
    status: "published",
    versionNumber: 2,
    effectiveFrom: "2026-06-15",
    publishedAt: "2026-06-14T16:00:00+05:30",
    entries: [
      entry("tte-pub-8a-mon-p1", "tt-published-regular", "class-grade-8", "section-grade-8-a", "monday", "period-foundation", "subject-math", "staff-001", "room-204", tenantAScope),
      entry("tte-pub-8a-mon-p2", "tt-published-regular", "class-grade-8", "section-grade-8-a", "monday", "period-applied-learning", "subject-english", "staff-002", "room-204", tenantAScope),
      entry("tte-pub-8a-mon-p3", "tt-published-regular", "class-grade-8", "section-grade-8-a", "monday", "period-lab-studio", "subject-science", "staff-009", "room-science-lab", tenantAScope),
      entry("tte-pub-8a-tue-p1", "tt-published-regular", "class-grade-8", "section-grade-8-a", "tuesday", "period-foundation", "subject-hindi", "staff-013", "room-204", tenantAScope),
      entry("tte-pub-8a-tue-p2", "tt-published-regular", "class-grade-8", "section-grade-8-a", "tuesday", "period-applied-learning", "subject-computer", "staff-014", "room-computer-lab", tenantAScope),
      entry("tte-pub-9a-mon-p1", "tt-published-regular", "class-grade-9", "section-grade-9-a", "monday", "period-foundation", "subject-science", "staff-009", "room-science-lab", tenantAScope),
    ],
    createdAt: "2026-06-01T09:00:00+05:30",
    updatedAt: "2026-06-14T16:00:00+05:30",
  },
  {
    ...tenantAScope,
    id: "tt-draft-regular",
    scheduleId: "tt-schedule-secondary",
    configurationId: "tt-schedule-secondary",
    name: "August Draft Timetable",
    status: "draft",
    versionNumber: 3,
    entries: [
      entry("tte-draft-8a-mon-p1", "tt-draft-regular", "class-grade-8", "section-grade-8-a", "monday", "period-foundation", "subject-math", "staff-001", "room-204", tenantAScope),
      entry("tte-draft-8a-mon-p2", "tt-draft-regular", "class-grade-8", "section-grade-8-a", "monday", "period-applied-learning", "subject-english", "staff-002", "room-204", tenantAScope),
      entry("tte-draft-8a-mon-p3", "tt-draft-regular", "class-grade-8", "section-grade-8-a", "monday", "period-lab-studio", "subject-science", "staff-009", "room-204", tenantAScope),
      entry("tte-draft-8b-mon-p3", "tt-draft-regular", "class-grade-8", "section-grade-8-b-empty", "monday", "period-lab-studio", "subject-hindi", "staff-009", "room-205", tenantAScope),
      entry("tte-draft-9a-mon-p3", "tt-draft-regular", "class-grade-9", "section-grade-9-a", "monday", "period-lab-studio", "subject-history", "staff-002", "room-204", tenantAScope),
      entry("tte-draft-8a-tue-p1", "tt-draft-regular", "class-grade-8", "section-grade-8-a", "tuesday", "period-foundation", "subject-hindi", "staff-013", "room-204", tenantAScope),
      entry("tte-draft-8a-tue-p2", "tt-draft-regular", "class-grade-8", "section-grade-8-a", "tuesday", "period-applied-learning", "subject-computer", "staff-014", "room-computer-lab", tenantAScope),
      entry("tte-draft-8a-wed-p1", "tt-draft-regular", "class-grade-8", "section-grade-8-a", "wednesday", "period-foundation", undefined, undefined, undefined, tenantAScope),
    ],
    createdAt: "2026-08-01T09:00:00+05:30",
    updatedAt: "2026-08-28T15:20:00+05:30",
  },
  timetableForTenant("tt-west-draft", "tt-schedule-west-extended", "West Extended Draft", tenantBScope),
  timetableForTenant("tt-south-draft", "tt-schedule-south-compact", "South Compact Draft", tenantCScope),
];

export const mockTimetableTemplates: TimetableTemplate[] = [
  template("tt-template-primary", "Primary timetable", "Reusable base for Grade 1 to Grade 5 sections.", "tt-schedule-primary", tenantAScope),
  template("tt-template-secondary", "Secondary timetable", "Regular middle and secondary school working week.", "tt-schedule-secondary", tenantAScope),
  template("tt-template-half-day", "Half-day schedule", "Compressed day for events, exams, or extreme weather.", "tt-schedule-primary", tenantAScope),
];

export const mockTimetableVersions: TimetableVersion[] = [
  version("ttv-1", "tt-published-regular", 1, "published", "2026-06-01T16:00:00+05:30", "Initial regular timetable published.", tenantAScope),
  version("ttv-2", "tt-published-regular", 2, "published", "2026-06-14T16:00:00+05:30", "Science lab allocation updated.", tenantAScope),
  version("ttv-3", "tt-draft-regular", 3, "draft", undefined, "August draft with conflict review pending.", tenantAScope),
];

function subjectsForScope(scope: TenantScopedQuery, prefix: string): TimetableSubject[] {
  return [
    subject(`${prefix}subject-math`, "MATH", "Mathematics", undefined, scope),
    subject(`${prefix}subject-english`, "ENG", "English", undefined, scope),
    subject(`${prefix}subject-science`, "SCI", "Science", "laboratory", scope),
    subject(`${prefix}subject-hindi`, "HIN", "Hindi", undefined, scope),
    subject(`${prefix}subject-history`, "HIS", "History", undefined, scope),
    subject(`${prefix}subject-computer`, "ICT", "Computer Science", "computer_lab", scope),
    subject(`${prefix}subject-library`, "LIB", "Library", "library", scope),
  ];
}

function roomsForScope(scope: TenantScopedQuery, prefix: string): TimetableRoom[] {
  return [
    room(`${prefix}room-201`, "Room 201", "201", "classroom", 42, scope),
    room(`${prefix}room-204`, "Room 204", "204", "classroom", 42, scope),
    room(`${prefix}room-science-lab`, "Science Lab", "SLAB", "laboratory", 36, scope),
    room(`${prefix}room-computer-lab`, "Computer Lab", "CLAB", "computer_lab", 36, scope),
    room(`${prefix}room-library`, "Library", "LIB", "library", 60, scope),
  ];
}

function subject(id: string, code: string, name: string, requiresRoomType?: TimetableSubject["requiresRoomType"], scope: TenantScopedQuery = tenantAScope): TimetableSubject {
  return { ...scope, id, code, name, requiresRoomType, status: "active" };
}

function room(id: string, name: string, code: string, roomType: TimetableRoom["roomType"], capacity: number, scope: TenantScopedQuery = tenantAScope): TimetableRoom {
  return { ...scope, id, name, code, roomType, capacity, status: "active" };
}

function period(scheduleId: string, id: string, name: string, startTime: string, endTime: string, type: TimetablePeriod["type"], order: number, isTeaching: boolean, scope: TenantScopedQuery): TimetablePeriod {
  return { ...scope, id, scheduleId, name, startTime, endTime, type, order, isTeaching, isActive: true, height: type === "teaching" ? 112 : 72 };
}

function entry(id: string, timetableId: string, classId: string, sectionId: string, dayOfWeek: TimetableDay, periodId: string, subjectId: string | undefined, teacherId: string | undefined, roomId: string | undefined, scope: TenantScopedQuery): TimetableEntry {
  return {
    ...scope,
    id,
    timetableId,
    classId,
    sectionId,
    rowId: periodId,
    columnId: columnIdForDay(dayOfWeek),
    dayOfWeek,
    periodId,
    cellTypeId: "cell-subject",
    content: { subjectId, teacherId, roomId, classId, sectionId },
    subjectId,
    teacherId,
    roomId,
    status: "assigned",
  };
}

function timetableForTenant(id: string, scheduleId: string, name: string, scope: TenantScopedQuery): Timetable {
  return {
    ...scope,
    id,
    scheduleId,
    configurationId: scheduleId,
    name,
    status: "draft",
    versionNumber: 1,
    entries: [],
    createdAt: "2026-08-01T09:00:00+05:30",
    updatedAt: "2026-08-01T09:00:00+05:30",
  };
}

function template(id: string, name: string, description: string, scheduleId: string, scope: TenantScopedQuery): TimetableTemplate {
  return {
    ...scope,
    id,
    name,
    description,
    scheduleId,
    configurationId: scheduleId,
    status: "active",
    createdAt: "2026-08-01T09:00:00+05:30",
    updatedAt: "2026-08-20T09:00:00+05:30",
  };
}

function version(id: string, timetableId: string, versionNumber: number, status: TimetableVersion["status"], publishedAt: string | undefined, summary: string, scope: TenantScopedQuery): TimetableVersion {
  return {
    ...scope,
    id,
    timetableId,
    versionNumber,
    status,
    publishedAt,
    createdAt: publishedAt ?? "2026-08-28T15:20:00+05:30",
    summary,
  };
}

function withLayout(schedule: Omit<TimetableSchedule, "layout" | "columns" | "rows" | "cellTypes" | "cells">): TimetableSchedule {
  const columns = columnsForSchedule(schedule);
  const rows = schedule.periods.map((period): TimetableRow => ({
    id: period.id,
    label: period.name,
    startTime: period.startTime,
    endTime: period.endTime,
    type: period.type,
    order: period.order,
    height: period.height ?? 96,
    visible: period.isActive,
    editable: true,
    description: period.description,
  }));
  const cellTypes = defaultCellTypes();
  const cells = rows.flatMap((row) =>
    columns.filter((column) => column.type !== "time").map((column) => {
      const cellType = row.type === "break"
        ? cellTypes.find((type) => type.id === "cell-break")
        : row.type === "lunch"
          ? cellTypes.find((type) => type.id === "cell-lunch")
        : row.type === "assembly"
          ? cellTypes.find((type) => type.id === "cell-assembly")
          : row.type === "activity"
            ? cellTypes.find((type) => type.id === "cell-discovery")
            : cellTypes.find((type) => type.id === "cell-lecture");
      const resolvedType = cellType ?? cellTypes[0];
      return {
        id: `cell-${row.id}-${column.id}`,
        rowId: row.id,
        columnId: column.id,
        cellTypeId: resolvedType.id,
        editable: resolvedType.defaultEditable,
        display: resolvedType.defaultDisplay,
        columnSpan: row.type === "break" || row.type === "lunch" ? columns.filter((item) => item.type !== "time").length : undefined,
      };
    }),
  );
  const layout: TimetableLayout = {
    tenantId: schedule.tenantId,
    schoolId: schedule.schoolId,
    campusId: schedule.campusId,
    academicYearId: schedule.academicYearId,
    id: `${schedule.id}-layout`,
    name: `${schedule.name} Layout`,
    description: schedule.description,
    columns,
    rows,
    cellTypes,
    cells,
    status: schedule.status,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };

  return { ...schedule, columns, rows, cellTypes, cells, layout };
}

function columnsForSchedule(schedule: Pick<TimetableSchedule, "id" | "workingDays">): TimetableColumn[] {
  const customLabels = schedule.id === "tt-schedule-south-compact"
    ? new Map([
        ["day-1", "Day 1"],
        ["day-2", "Studio Day"],
        ["day-3", "Community Day"],
      ])
    : new Map<string, string>();

  return [
    { id: "column-time", label: "Session", type: "time", order: 0, width: 156, visible: true, editable: false },
    ...schedule.workingDays.map((day, index) => ({
      id: columnIdForDay(day),
      label: customLabels.get(day) ?? titleize(day),
      type: "day" as const,
      order: index + 1,
      width: 152,
      visible: true,
      editable: true,
      dayKey: day,
    })),
  ];
}

function defaultCellTypes(): TimetableCellType[] {
  const display = (overrides: Partial<TimetableCellDisplay> = {}): TimetableCellDisplay => ({
    subject: false,
    teacher: false,
    room: false,
    classSection: false,
    activity: false,
    ...overrides,
  });

  return [
    { id: "cell-lecture", name: "Lecture", description: "Instructional timetable cell with subject, teacher, and room references.", category: "instructional", requiresSubject: true, requiresTeacher: true, requiresRoom: false, defaultEditable: true, defaultDisplay: display({ subject: true, teacher: true, room: true }), active: true },
    { id: "cell-subject", name: "Subject", category: "instructional", requiresSubject: true, requiresTeacher: true, requiresRoom: false, defaultEditable: true, defaultDisplay: display({ subject: true, teacher: true, room: true }), active: true },
    { id: "cell-teacher", name: "Teacher", category: "resource", requiresTeacher: true, defaultEditable: true, defaultDisplay: display({ teacher: true, classSection: true }), active: true },
    { id: "cell-class", name: "Class", category: "resource", requiresClass: true, defaultEditable: true, defaultDisplay: display({ classSection: true, subject: true }), active: true },
    { id: "cell-break", name: "Break", category: "non_instructional", supportsActivity: true, defaultEditable: true, defaultDisplay: display({ activity: true }), active: true },
    { id: "cell-lunch", name: "Lunch", category: "non_instructional", supportsActivity: true, defaultEditable: true, defaultDisplay: display({ activity: true }), active: true },
    { id: "cell-assembly", name: "Assembly", category: "non_instructional", requiresTeacher: false, supportsActivity: true, defaultEditable: true, defaultDisplay: display({ activity: true, teacher: true }), active: true },
    { id: "cell-discovery", name: "Discovery", category: "instructional", supportsActivity: true, requiresTeacher: true, defaultEditable: true, defaultDisplay: display({ activity: true, teacher: true, classSection: true }), active: true },
    { id: "cell-activity", name: "Activity", category: "custom", supportsActivity: true, requiresTeacher: false, defaultEditable: true, defaultDisplay: display({ activity: true, teacher: true }), active: true },
    { id: "cell-free", name: "Free", category: "custom", defaultEditable: true, defaultDisplay: display({ activity: true }), active: true },
    { id: "cell-custom", name: "Custom", category: "custom", defaultEditable: true, defaultDisplay: display({ activity: true }), active: true },
  ];
}

function columnIdForDay(day: string) {
  return `column-${day.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function titleize(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
