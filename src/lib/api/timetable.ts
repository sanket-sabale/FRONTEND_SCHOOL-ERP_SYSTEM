import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { mockAcademicClasses, mockSections } from "@/features/academic-structure/services/mock-academic-structure";
import { mockStaffRecords } from "@/features/staff/services/mock-staff";
import { isSameScope, validateSchedule, validateTimetable, canPublishTimetable } from "@/features/timetable/services/timetable-rules";
import {
  mockTimetableRooms,
  mockTimetableSchedules,
  mockTimetables,
  mockTimetableSubjects,
  mockTimetableTemplates,
  mockTimetableVersions,
} from "@/features/timetable/services/mock-timetable";
import {
  timetableConfigurationSchema,
  timetableCreateSchema,
  timetableEntryCreateSchema,
  timetableEntryUpdateSchema,
  timetableFiltersSchema,
  timetablePublishSchema,
} from "@/features/timetable/schemas/timetable.schema";
import type {
  Timetable,
  TimetableConfiguration,
  TimetableCreateInput,
  TimetableEntryInput,
  TimetableEntryUpdateInput,
  TimetableFilters,
  TimetablePublishInput,
  TimetableSchedule,
  TimetableSummary,
  TimetableValidationResult,
} from "@/features/timetable/types/timetable";

let timetableRecords = [...mockTimetables];
let scheduleRecords = [...mockTimetableSchedules];

type TimetableRepository = {
  listTimetables(scope: TenantScopedQuery, filters?: TimetableFilters): Promise<Timetable[]>;
  getTimetable(scope: TenantScopedQuery, timetableId: string): Promise<Timetable | null>;
  listSchedules(scope: TenantScopedQuery): Promise<TimetableSchedule[]>;
  getSchedule(scope: TenantScopedQuery, scheduleId?: string): Promise<TimetableSchedule>;
  updateSchedule(schedule: TimetableSchedule): Promise<TimetableSchedule>;
  getConfiguration(scope: TenantScopedQuery, configurationId?: string): Promise<TimetableConfiguration>;
  updateConfiguration(configuration: TimetableConfiguration): Promise<TimetableConfiguration>;
  getWorkspaceData(scope: TenantScopedQuery): Promise<TimetableWorkspaceData>;
  createTimetable(input: TimetableCreateInput): Promise<Timetable>;
  upsertEntry(input: TimetableEntryInput | TimetableEntryUpdateInput): Promise<Timetable>;
  deleteEntry(scope: TenantScopedQuery, timetableId: string, entryId: string): Promise<Timetable>;
  saveDraft(scope: TenantScopedQuery, timetableId: string): Promise<Timetable>;
  validate(scope: TenantScopedQuery, timetableId: string): Promise<TimetableValidationResult>;
  publish(input: TimetablePublishInput): Promise<Timetable>;
  getSummary(scope: TenantScopedQuery): Promise<TimetableSummary>;
};

export type TimetableWorkspaceData = {
  timetables: Timetable[];
  schedule: TimetableSchedule;
  schedules: TimetableSchedule[];
  configuration: TimetableConfiguration;
  classes: typeof mockAcademicClasses;
  sections: typeof mockSections;
  teachers: typeof mockStaffRecords;
  subjects: typeof mockTimetableSubjects;
  rooms: typeof mockTimetableRooms;
  templates: typeof mockTimetableTemplates;
  versions: typeof mockTimetableVersions;
};

const mockTimetableRepository: TimetableRepository = {
  async listTimetables(scope, filters = {}) {
    const parsed = timetableFiltersSchema.parse(filters);
    return timetableRecords
      .filter((timetable) => isSameScope(timetable, scope))
      .filter((timetable) => !parsed.timetableId || timetable.id === parsed.timetableId)
      .filter((timetable) => !parsed.status || timetable.status === parsed.status)
      .filter((timetable) => !parsed.classId || timetable.entries.some((entry) => entry.classId === parsed.classId))
      .filter((timetable) => !parsed.sectionId || timetable.entries.some((entry) => entry.sectionId === parsed.sectionId))
      .filter((timetable) => !parsed.teacherId || timetable.entries.some((entry) => entry.teacherId === parsed.teacherId))
      .filter((timetable) => !parsed.roomId || timetable.entries.some((entry) => entry.roomId === parsed.roomId))
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  },

  async getTimetable(scope, timetableId) {
    return timetableRecords.find((timetable) => timetable.id === timetableId && isSameScope(timetable, scope)) ?? null;
  },

  async listSchedules(scope) {
    return scheduleRecords
      .filter((schedule) => isSameScope(schedule, scope))
      .filter((schedule) => schedule.status !== "archived")
      .sort((first, second) => first.name.localeCompare(second.name, "en-IN", { sensitivity: "base" }))
      .map((schedule) => clone(schedule));
  },

  async getSchedule(scope, scheduleId) {
    const schedule = scheduleRecords.find((item) => isSameScope(item, scope) && item.status !== "archived" && (!scheduleId || item.id === scheduleId));
    if (!schedule) throw new ApiError(404, "Timetable schedule could not be found in the current scope.");
    return clone(schedule);
  },

  async updateSchedule(schedule) {
    const parsed = timetableConfigurationSchema.parse(schedule);
    ensureValid(validateSchedule(parsed));
    const next = normalizeSchedule({ ...parsed, updatedAt: new Date().toISOString() });
    scheduleRecords = scheduleRecords.map((item) => item.id === next.id && isSameScope(item, next) ? next : item);
    return clone(next);
  },

  async getConfiguration(scope, configurationId) {
    return this.getSchedule(scope, configurationId);
  },

  async updateConfiguration(configuration) {
    return this.updateSchedule(configuration);
  },

  async getWorkspaceData(scope) {
    const timetables = await this.listTimetables(scope);
    const selectedTimetable = timetables.find((item) => item.status === "draft") ?? timetables[0];
    const schedules = await this.listSchedules(scope);
    const schedule = await this.getSchedule(scope, selectedTimetable?.scheduleId ?? schedules[0]?.id);
    return {
      timetables,
      schedule,
      schedules,
      configuration: schedule,
      classes: mockAcademicClasses.filter((item) => isSameScope(item, scope)),
      sections: mockSections.filter((item) => isSameScope(item, scope)),
      teachers: mockStaffRecords.filter((item) => isSameScope(item, scope) && item.staffCategory === "teaching" && item.status === "active"),
      subjects: mockTimetableSubjects.filter((item) => isSameScope(item, scope) && item.status === "active"),
      rooms: mockTimetableRooms.filter((item) => isSameScope(item, scope) && item.status === "active"),
      templates: mockTimetableTemplates.filter((item) => isSameScope(item, scope)),
      versions: mockTimetableVersions.filter((item) => isSameScope(item, scope)),
    };
  },

  async createTimetable(input) {
    const parsed = timetableCreateSchema.parse(input);
    await this.getSchedule(parsed, parsed.scheduleId);
    const now = new Date().toISOString();
    const timetable: Timetable = {
      ...parsed,
      id: createId("tt", parsed.name),
      configurationId: parsed.configurationId ?? parsed.scheduleId,
      status: "draft",
      entries: [],
      versionNumber: 1,
      createdAt: now,
      updatedAt: now,
    };
    timetableRecords = [timetable, ...timetableRecords];
    return clone(timetable);
  },

  async upsertEntry(input) {
    const now = new Date().toISOString();

    if ("id" in input) {
      const parsed = timetableEntryUpdateSchema.parse(input);
      const current = getTimetableOrThrow(parsed, parsed.timetableId);
      ensureDraft(current);
      const entries: Timetable["entries"] = current.entries.map((entry) => entry.id === parsed.id ? {
        ...entry,
        classId: parsed.classId ?? entry.classId,
        sectionId: parsed.sectionId ?? entry.sectionId,
        rowId: parsed.rowId ?? entry.rowId,
        columnId: parsed.columnId ?? entry.columnId,
        dayOfWeek: parsed.dayOfWeek ?? entry.dayOfWeek,
        periodId: parsed.periodId ?? entry.periodId,
        cellTypeId: parsed.cellTypeId ?? entry.cellTypeId,
        content: parsed.content ?? entry.content,
        subjectId: parsed.subjectId ?? entry.subjectId,
        teacherId: parsed.teacherId ?? entry.teacherId,
        roomId: parsed.roomId ?? entry.roomId,
        notes: parsed.notes ?? entry.notes,
        status: parsed.status ?? entry.status,
      } : entry);
      const next = { ...current, entries, updatedAt: now };
      timetableRecords = timetableRecords.map((item) => item.id === next.id ? next : item);
      return clone(next);
    }

    const parsed = timetableEntryCreateSchema.parse(input);
    const current = getTimetableOrThrow(parsed, parsed.timetableId);
    ensureDraft(current);
    const entries: Timetable["entries"] = [
      ...current.entries,
      {
        ...parsed,
        id: createId("tte", `${parsed.dayOfWeek}-${parsed.periodId}`),
        status: "assigned",
      },
    ];
    const next = { ...current, entries, updatedAt: now };
    timetableRecords = timetableRecords.map((item) => item.id === next.id ? next : item);
    return clone(next);
  },

  async deleteEntry(scope, timetableId, entryId) {
    const current = getTimetableOrThrow(scope, timetableId);
    ensureDraft(current);
    const next = { ...current, entries: current.entries.filter((entry) => entry.id !== entryId), updatedAt: new Date().toISOString() };
    timetableRecords = timetableRecords.map((item) => item.id === next.id ? next : item);
    return clone(next);
  },

  async saveDraft(scope, timetableId) {
    const current = getTimetableOrThrow(scope, timetableId);
    ensureDraft(current);
    const next = { ...current, status: "draft" as const, updatedAt: new Date().toISOString() };
    timetableRecords = timetableRecords.map((item) => item.id === next.id ? next : item);
    return clone(next);
  },

  async validate(scope, timetableId) {
    const timetable = getTimetableOrThrow(scope, timetableId);
    const schedule = await this.getSchedule(scope, timetable.scheduleId);
    return validateTimetable(timetable, schedule, mockTimetableSubjects.filter((item) => isSameScope(item, scope)), mockTimetableRooms.filter((item) => isSameScope(item, scope)));
  },

  async publish(input) {
    const parsed = timetablePublishSchema.parse(input);
    const current = getTimetableOrThrow(parsed, parsed.timetableId);
    ensureDraft(current);
    const result = await this.validate(parsed, parsed.timetableId);
    ensureValid(canPublishTimetable(result));
    const next = {
      ...current,
      status: "published" as const,
      effectiveFrom: parsed.effectiveFrom,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    timetableRecords = timetableRecords.map((item) => item.id === next.id ? next : item.id !== next.id && item.status === "published" && isSameScope(item, next) ? { ...item, status: "archived" as const } : item);
    return clone(next);
  },

  async getSummary(scope) {
    const data = await this.getWorkspaceData(scope);
    const draftTimetable = data.timetables.find((item) => item.status === "draft");
    const publishedTimetable = data.timetables.find((item) => item.status === "published");
    const activeTimetable = draftTimetable ?? publishedTimetable;
    const validation = activeTimetable ? await this.validate(scope, activeTimetable.id) : { conflicts: [] };
    return {
      activeTimetable,
      draftTimetable,
      publishedTimetable,
      activeScheduleCount: data.schedules.filter((schedule) => schedule.status === "active").length,
      totalClasses: data.classes.length,
      totalTeachers: data.teachers.length,
      totalRooms: data.rooms.length,
      totalPeriods: data.schedule.periods.filter((period) => period.isActive).length,
      conflictCount: validation.conflicts.length,
      lastUpdated: activeTimetable?.updatedAt,
    };
  },
};

export const timetableService = {
  listTimetables: (scope: TenantScopedQuery, filters?: TimetableFilters) => mockTimetableRepository.listTimetables(scope, filters),
  getTimetable: (scope: TenantScopedQuery, timetableId: string) => mockTimetableRepository.getTimetable(scope, timetableId),
  listSchedules: (scope: TenantScopedQuery) => mockTimetableRepository.listSchedules(scope),
  getSchedule: (scope: TenantScopedQuery, scheduleId?: string) => mockTimetableRepository.getSchedule(scope, scheduleId),
  updateSchedule: (schedule: TimetableSchedule) => mockTimetableRepository.updateSchedule(schedule),
  getConfiguration: (scope: TenantScopedQuery, configurationId?: string) => mockTimetableRepository.getConfiguration(scope, configurationId),
  updateConfiguration: (configuration: TimetableConfiguration) => mockTimetableRepository.updateConfiguration(configuration),
  getWorkspaceData: (scope: TenantScopedQuery) => mockTimetableRepository.getWorkspaceData(scope),
  createTimetable: (input: TimetableCreateInput) => mockTimetableRepository.createTimetable(input),
  upsertEntry: (input: TimetableEntryInput | TimetableEntryUpdateInput) => mockTimetableRepository.upsertEntry(input),
  deleteEntry: (scope: TenantScopedQuery, timetableId: string, entryId: string) => mockTimetableRepository.deleteEntry(scope, timetableId, entryId),
  saveDraft: (scope: TenantScopedQuery, timetableId: string) => mockTimetableRepository.saveDraft(scope, timetableId),
  validate: (scope: TenantScopedQuery, timetableId: string) => mockTimetableRepository.validate(scope, timetableId),
  publish: (input: TimetablePublishInput) => mockTimetableRepository.publish(input),
  getSummary: (scope: TenantScopedQuery) => mockTimetableRepository.getSummary(scope),
};

function getTimetableOrThrow(scope: TenantScopedQuery, timetableId: string) {
  const timetable = timetableRecords.find((item) => item.id === timetableId && isSameScope(item, scope));
  if (!timetable) throw new ApiError(404, "Timetable could not be found in the current scope.");
  return timetable;
}

function ensureDraft(timetable: Timetable) {
  if (timetable.status !== "draft") throw new ApiError(409, "Only draft timetables can be edited.");
}

function ensureValid(result: { valid: true } | { valid: false; message: string }) {
  if (!result.valid) throw new ApiError(422, result.message);
}

function createId(prefix: string, value: string) {
  return `${prefix}-${value}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeSchedule(schedule: TimetableSchedule): TimetableSchedule {
  const periods = [...schedule.periods]
    .sort((first, second) => first.order - second.order)
    .map((period, index) => ({ ...period, scheduleId: schedule.id, order: index + 1, isTeaching: period.type === "teaching" }));
  const columns = [...schedule.columns].sort((first, second) => first.order - second.order).map((column, index) => ({ ...column, order: index + 1 }));
  const rows = [...schedule.rows].sort((first, second) => first.order - second.order).map((row, index) => ({ ...row, order: index + 1 }));
  const cells = schedule.cells.filter((cell) => rows.some((row) => row.id === cell.rowId) && columns.some((column) => column.id === cell.columnId));
  const layout = {
    ...schedule.layout,
    tenantId: schedule.tenantId,
    schoolId: schedule.schoolId,
    campusId: schedule.campusId,
    columns,
    rows,
    cellTypes: schedule.cellTypes,
    cells,
    updatedAt: schedule.updatedAt,
  };

  return {
    ...schedule,
    workingDays: columns.filter((column) => column.type === "day" && column.visible).map((column) => column.dayKey ?? column.id),
    periods,
    columns,
    rows,
    cells,
    layout,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
