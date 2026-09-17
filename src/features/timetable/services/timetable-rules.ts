import type { TenantScopedQuery } from "@/lib/api/client";
import type {
  Timetable,
  TimetableConflict,
  TimetableEntry,
  TimetableRoom,
  TimetableSchedule,
  TimetableSubject,
  TimetableValidationResult,
} from "@/features/timetable/types/timetable";

export type RuleResult = { valid: true } | { valid: false; message: string };

export function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return (
    record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId
  );
}

export function validateSchedule(schedule: TimetableSchedule): RuleResult {
  if (schedule.columns.filter((column) => column.visible).length === 0) {
    return { valid: false, message: "At least one visible column is required." };
  }

  if (schedule.rows.filter((row) => row.visible).length === 0) {
    return { valid: false, message: "At least one visible row is required." };
  }

  const periods = [...schedule.periods].filter((period) => period.isActive).sort((first, second) => first.order - second.order);
  const rows = [...schedule.rows].filter((row) => row.visible).sort((first, second) => first.order - second.order);
  const columns = [...schedule.columns].filter((column) => column.visible).sort((first, second) => first.order - second.order);
  const rowResult = validateOrderedItems(rows, "row");
  if (!rowResult.valid) return rowResult;
  const columnResult = validateOrderedItems(columns, "column");
  if (!columnResult.valid) return columnResult;

  if (schedule.cellTypes.filter((type) => type.active).length === 0) {
    return { valid: false, message: "At least one active cell type is required." };
  }

  const names = new Set<string>();
  for (const period of periods) {
    if (!period.name.trim()) {
      return { valid: false, message: "Period names are required." };
    }

    const normalizedName = period.name.trim().toLowerCase();
    if (names.has(normalizedName)) {
      return { valid: false, message: "Period names must be unique within a schedule." };
    }
    names.add(normalizedName);

    if (period.endTime <= period.startTime) {
      return { valid: false, message: `${period.name} must end after it starts.` };
    }
  }

  for (let index = 1; index < periods.length; index += 1) {
    const previous = periods[index - 1];
    const current = periods[index];
    if (previous && current && current.startTime < previous.endTime) {
      return { valid: false, message: `${current.name} overlaps with ${previous.name}.` };
    }
  }

  for (const row of rows) {
    if (row.startTime && row.endTime && row.endTime <= row.startTime) {
      return { valid: false, message: `${row.label} must end after it starts.` };
    }
  }

  const rowIds = new Set(schedule.rows.map((row) => row.id));
  const columnIds = new Set(schedule.columns.map((column) => column.id));
  const cellTypeIds = new Set(schedule.cellTypes.map((type) => type.id));
  for (const cell of schedule.cells) {
    if (!rowIds.has(cell.rowId) || !columnIds.has(cell.columnId)) {
      return { valid: false, message: "Every configured cell must reference an existing row and column." };
    }
    if (!cellTypeIds.has(cell.cellTypeId)) {
      return { valid: false, message: "Every configured cell must reference a valid cell type." };
    }
    if (cell.mergedIntoCellId && !schedule.cells.some((item) => item.id === cell.mergedIntoCellId)) {
      return { valid: false, message: "Merged cells must reference an existing parent cell." };
    }
  }

  return { valid: true };
}

export const validatePeriodTimes = validateSchedule;

export function validateTimetable(
  timetable: Timetable,
  schedule: TimetableSchedule,
  subjects: TimetableSubject[],
  rooms: TimetableRoom[],
): TimetableValidationResult {
  const conflicts: TimetableConflict[] = [];
  const teachingRowIds = new Set(schedule.rows.filter((row) => row.visible && row.type === "teaching").map((row) => row.id));
  const activeRowIds = new Set(schedule.rows.filter((row) => row.visible).map((row) => row.id));
  const activeColumnIds = new Set(schedule.columns.filter((column) => column.visible).map((column) => column.id));
  const dayColumns = new Map(schedule.columns.filter((column) => column.type === "day").map((column) => [column.dayKey ?? column.id, column]));
  const cellTypes = new Map(schedule.cellTypes.map((type) => [type.id, type]));
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const activeEntries = timetable.entries.filter((entry) => entry.status === "assigned");

  for (const entry of activeEntries) {
    const rowId = entry.rowId ?? entry.periodId;
    const columnId = entry.columnId ?? (entry.dayOfWeek ? dayColumns.get(entry.dayOfWeek)?.id : undefined);
    if (!rowId || !activeRowIds.has(rowId)) {
      conflicts.push(conflict("invalid_cell", timetable.id, entry, "Row is not active", "This assignment uses a row that is not active in the selected layout.", [entry.id], ["Move the assignment to an active row or reactivate the row."]));
      continue;
    }

    if (!columnId || !activeColumnIds.has(columnId)) {
      conflicts.push(conflict("invalid_cell", timetable.id, entry, "Column is not active", "This assignment uses a column that is not active in the selected layout.", [entry.id], ["Move the assignment to an active column or reactivate the column."]));
      continue;
    }

    if (entry.dayOfWeek && !dayColumns.has(entry.dayOfWeek)) {
      conflicts.push(conflict("resource_constraint", timetable.id, entry, "Day is not in schedule", "This assignment uses a day that is not active in the selected schedule.", [entry.id], ["Move the assignment to an enabled working day or update the schedule."]));
    }

    const cellConfiguration = schedule.cells.find((cell) => cell.rowId === rowId && cell.columnId === columnId);
    const cellType = entry.cellTypeId ? cellTypes.get(entry.cellTypeId) : cellConfiguration ? cellTypes.get(cellConfiguration.cellTypeId) : undefined;
    const subjectId = entry.content?.subjectId ?? entry.subjectId;
    const teacherId = entry.content?.teacherId ?? entry.teacherId;
    const roomId = entry.content?.roomId ?? entry.roomId;
    const customText = entry.content?.customText;
    const activityLabel = entry.content?.activityLabel;

    if (cellConfiguration?.editable === false && (subjectId || teacherId || roomId || customText || activityLabel)) {
      conflicts.push(conflict("invalid_cell", timetable.id, entry, "Cell is locked", "This cell is configured as read-only but contains editable timetable content.", [entry.id], ["Unlock the cell or clear the content."]));
    }

    if (cellType?.requiresSubject && !subjectId) {
      conflicts.push(conflict("missing_assignment", timetable.id, entry, "Missing subject", "This cell type requires a subject.", [entry.id], ["Select a subject before publishing."]));
    }

    if (cellType?.requiresTeacher && !teacherId) {
      conflicts.push(conflict("missing_assignment", timetable.id, entry, "Missing teacher", "This cell type requires a teacher.", [entry.id], ["Select a teacher before publishing."]));
    }

    if (!teachingRowIds.has(rowId) && cellType?.category !== "instructional") continue;
    if (!subjectId || !teacherId) {
      conflicts.push(conflict("missing_assignment", timetable.id, entry, "Missing assignment", "Subject and teacher are required for teaching periods.", [entry.id], ["Add a subject and teacher before publishing."]));
    }

    const subject = subjectId ? subjectById.get(subjectId) : undefined;
    const room = roomId ? roomById.get(roomId) : undefined;
    if (subject?.requiresRoomType && (!room || room.roomType !== subject.requiresRoomType)) {
      conflicts.push(conflict("resource_constraint", timetable.id, entry, "Room requirement not met", `${subject.name} requires ${formatRoomType(subject.requiresRoomType)}.`, [entry.id], ["Choose a room that matches the subject requirement."]));
    }
  }

  findDuplicateSlots(activeEntries, (entry) => `${entry.classId}:${entry.sectionId}:${entry.columnId ?? entry.dayOfWeek}:${entry.rowId ?? entry.periodId}`).forEach((entries) => {
    conflicts.push(conflict("class_conflict", timetable.id, entries[0], "Class conflict", "This class section has multiple assignments in the same period.", entries.map((entry) => entry.id), ["Move one assignment to another period or clear the duplicate."]));
  });

  findDuplicateSlots(activeEntries.filter((entry) => entry.content?.teacherId ?? entry.teacherId), (entry) => `${entry.content?.teacherId ?? entry.teacherId}:${entry.columnId ?? entry.dayOfWeek}:${entry.rowId ?? entry.periodId}`).forEach((entries) => {
    conflicts.push(conflict("teacher_conflict", timetable.id, entries[0], "Teacher conflict", "A teacher is assigned to more than one class in this period.", entries.map((entry) => entry.id), ["Change the teacher or move one class to a different period."]));
  });

  findDuplicateSlots(activeEntries.filter((entry) => entry.content?.roomId ?? entry.roomId), (entry) => `${entry.content?.roomId ?? entry.roomId}:${entry.columnId ?? entry.dayOfWeek}:${entry.rowId ?? entry.periodId}`).forEach((entries) => {
    conflicts.push(conflict("room_conflict", timetable.id, entries[0], "Room conflict", "A room is assigned to more than one class in this period.", entries.map((entry) => entry.id), ["Choose a different room or period for one assignment."]));
  });

  return { valid: conflicts.every((item) => item.severity !== "error"), conflicts };
}

export function canPublishTimetable(result: TimetableValidationResult): RuleResult {
  if (!result.valid) return { valid: false, message: "Resolve timetable conflicts before publishing." };
  return { valid: true };
}

function findDuplicateSlots(entries: TimetableEntry[], keyFor: (entry: TimetableEntry) => string) {
  const buckets = new Map<string, TimetableEntry[]>();
  entries.forEach((entry) => buckets.set(keyFor(entry), [...(buckets.get(keyFor(entry)) ?? []), entry]));
  return Array.from(buckets.values()).filter((bucket) => bucket.length > 1);
}

function conflict(
  type: TimetableConflict["type"],
  timetableId: string,
  entry: TimetableEntry | undefined,
  title: string,
  message: string,
  relatedEntryIds: string[],
  resolutionHints: string[],
): TimetableConflict {
  return {
    id: `${type}-${entry?.dayOfWeek ?? "scope"}-${entry?.periodId ?? "missing"}-${relatedEntryIds.join("-")}`,
    type,
    severity: "error",
    timetableId,
    entryId: entry?.id,
    dayOfWeek: entry?.dayOfWeek,
    periodId: entry?.periodId,
    rowId: entry?.rowId,
    columnId: entry?.columnId,
    title,
    message,
    relatedEntryIds,
    resolutionHints,
  };
}

function validateOrderedItems(items: Array<{ label: string; order: number }>, label: "row" | "column"): RuleResult {
  const orders = new Set<number>();
  const names = new Set<string>();
  for (const item of items) {
    if (!item.label.trim()) return { valid: false, message: `Every ${label} needs a label.` };
    if (orders.has(item.order)) return { valid: false, message: `${label} order must be unique and deterministic.` };
    orders.add(item.order);
    const normalized = item.label.trim().toLowerCase();
    if (names.has(normalized)) return { valid: false, message: `${label} labels must be unique.` };
    names.add(normalized);
  }
  return { valid: true };
}

function formatRoomType(value: NonNullable<TimetableSubject["requiresRoomType"]>) {
  return value.replace("_", " ");
}
