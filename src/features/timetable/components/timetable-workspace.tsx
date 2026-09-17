"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { hasPermission } from "@/components/shared/permission-gate";
import { cn } from "@/lib/utils";
import { formatClassSection, formatPeriodType } from "@/features/timetable/components/timetable-formatters";
import { TimetableStatusBadge } from "@/features/timetable/components/timetable-status-badge";
import { validateSchedule, validateTimetable } from "@/features/timetable/services/timetable-rules";
import type { TimetableWorkspaceData } from "@/lib/api/timetable";
import type {
  Timetable,
  TimetableCellConfiguration,
  TimetableCellContent,
  TimetableCellDisplay,
  TimetableCellType,
  TimetableColumn,
  TimetableColumnType,
  TimetableConflict,
  TimetableEntry,
  TimetablePeriodType,
  TimetableRow,
  TimetableSchedule,
} from "@/features/timetable/types/timetable";
import type { Role } from "@/types/erp";

type DesignerMode = "edit" | "preview";
type SelectionAnchor = { rowId: string; columnId: string };
type HistorySnapshot = { schedule: TimetableSchedule; entries: TimetableEntry[] };
type StructuredClipboard = {
  cellTypeId?: string;
  content?: TimetableCellContent;
  display?: TimetableCellDisplay;
  editable?: boolean;
};

const rowTypeOptions: TimetablePeriodType[] = ["teaching", "assembly", "break", "lunch", "activity", "other"];
const columnTypeOptions: TimetableColumnType[] = ["day", "teacher", "class", "room", "custom"];
const defaultDisplay: TimetableCellDisplay = { subject: true, teacher: true, room: true, classSection: false, activity: false };

export function TimetableWorkspace({
  context,
  data,
  role,
}: {
  context: { school: string; campus: string; academicYear: string };
  data: TimetableWorkspaceData;
  role: Role;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTimetable = data.timetables.find((item) => item.status === "draft") ?? data.timetables[0];
  const initialSchedule = data.schedules.find((schedule) => schedule.id === (searchParams.get("scheduleId") ?? initialTimetable?.scheduleId)) ?? data.schedule;
  const initialClassId = searchParams.get("classId") ?? data.classes[0]?.id ?? "";
  const initialSectionId = searchParams.get("sectionId") ?? data.sections.find((section) => section.classId === initialClassId)?.id ?? "";
  const [timetable, setTimetable] = useState<Timetable | undefined>(initialTimetable ? { ...initialTimetable, scheduleId: initialSchedule.id, configurationId: initialSchedule.id } : undefined);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [entries, setEntries] = useState(initialTimetable?.entries ?? []);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [selectedSectionId, setSelectedSectionId] = useState(initialSectionId);
  const [mode, setMode] = useState<DesignerMode>("edit");
  const [selection, setSelection] = useState<SelectionAnchor[]>([]);
  const [anchor, setAnchor] = useState<SelectionAnchor | null>(null);
  const [clipboard, setClipboard] = useState<StructuredClipboard | null>(null);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [redoHistory, setRedoHistory] = useState<HistorySnapshot[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const canEditData = hasPermission(role, "timetable.update") && timetable?.status !== "published";
  const canConfigure = hasPermission(role, "timetable.configure") || hasPermission(role, "timetable.manage");
  const canEditCells = hasPermission(role, "timetable.cell.configure") || canConfigure;
  const visibleColumns = useMemo(() => schedule.columns.filter((column) => column.visible).sort((first, second) => first.order - second.order), [schedule.columns]);
  const visibleRows = useMemo(() => schedule.rows.filter((row) => row.visible).sort((first, second) => first.order - second.order), [schedule.rows]);
  const classOptions = data.classes.filter((item) => item.status === "active");
  const sectionOptions = data.sections.filter((item) => item.classId === selectedClassId && item.status === "active");
  const selectedClass = data.classes.find((item) => item.id === selectedClassId);
  const selectedSection = data.sections.find((item) => item.id === selectedSectionId);
  const entriesForSection = entries.filter((entry) => entry.classId === selectedClassId && entry.sectionId === selectedSectionId);
  const selectedCell = selection[selection.length - 1] ?? null;
  const selectedEntry = selectedCell ? findEntry(entriesForSection, selectedCell) : undefined;
  const selectedCellConfig = selectedCell ? getCellConfig(schedule, selectedCell.rowId, selectedCell.columnId) : undefined;
  const scheduleValidation = useMemo(() => validateSchedule(schedule), [schedule]);
  const timetableValidation = useMemo(
    () => timetable ? validateTimetable({ ...timetable, entries, scheduleId: schedule.id, configurationId: schedule.id }, schedule, data.subjects, data.rooms) : { valid: true, conflicts: [] },
    [data.rooms, data.subjects, entries, schedule, timetable],
  );
  const isPublished = timetable?.status === "published";

  function commit(next: Partial<HistorySnapshot>, statusMessage?: string) {
    setHistory((items) => [...items, { schedule, entries }]);
    setRedoHistory([]);
    if (next.schedule) setSchedule(next.schedule);
    if (next.entries) setEntries(next.entries);
    setMessage(statusMessage ?? "Designer draft updated.");
  }

  function syncUrl(next: { classId?: string; sectionId?: string; scheduleId?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateClass(classId: string) {
    const section = data.sections.find((item) => item.classId === classId && item.status === "active");
    setSelectedClassId(classId);
    setSelectedSectionId(section?.id ?? "");
    syncUrl({ classId, sectionId: section?.id, scheduleId: schedule.id });
  }

  function updateSection(sectionId: string) {
    setSelectedSectionId(sectionId);
    syncUrl({ classId: selectedClassId, sectionId, scheduleId: schedule.id });
  }

  function updateSchedule(scheduleId: string) {
    const nextSchedule = data.schedules.find((item) => item.id === scheduleId);
    if (!nextSchedule) return;
    commit({ schedule: nextSchedule }, `Loaded ${nextSchedule.name}.`);
    setSelection([]);
    if (timetable) setTimetable({ ...timetable, scheduleId: nextSchedule.id, configurationId: nextSchedule.id });
    syncUrl({ classId: selectedClassId, sectionId: selectedSectionId, scheduleId: nextSchedule.id });
  }

  function selectCell(cell: SelectionAnchor, extend = false) {
    if (extend && anchor) {
      setSelection(rectangleSelection(anchor, cell, visibleRows, visibleColumns));
    } else {
      setAnchor(cell);
      setSelection([cell]);
    }
  }

  function addRow() {
    if (!canConfigure) return;
    const rows = orderedRows(schedule.rows);
    const last = rows.at(-1);
    const startTime = last?.endTime ?? "00:00";
    const endTime = addMinutes(startTime, 45);
    const order = rows.length + 1;
    const row: TimetableRow = {
      id: `row-local-${Date.now()}`,
      label: `Custom Row ${order}`,
      startTime,
      endTime,
      type: "teaching",
      order,
      height: 112,
      visible: true,
      editable: true,
    };
    const period = rowToPeriod(schedule, row);
    const next = normalizeScheduleLayout({ ...schedule, rows: [...rows, row], periods: [...schedule.periods, period] });
    commit({ schedule: next }, "Row added.");
  }

  function addColumn() {
    if (!canConfigure) return;
    const columns = orderedColumns(schedule.columns);
    const order = columns.length;
    const column: TimetableColumn = {
      id: `column-local-${Date.now()}`,
      label: `Custom Column ${order}`,
      type: "custom",
      order,
      width: 152,
      visible: true,
      editable: true,
    };
    const next = normalizeScheduleLayout({ ...schedule, columns: [...columns, column] });
    commit({ schedule: next }, "Column added.");
  }

  function updateRow(rowId: string, changes: Partial<TimetableRow>) {
    if (!canConfigure) return;
    const rows = schedule.rows.map((row) => row.id === rowId ? { ...row, ...changes } : row);
    const periods = rows.map((row) => rowToPeriod(schedule, row));
    commit({ schedule: normalizeScheduleLayout({ ...schedule, rows, periods }) }, "Row updated.");
  }

  function updateColumn(columnId: string, changes: Partial<TimetableColumn>) {
    if (!canConfigure) return;
    const columns = schedule.columns.map((column) => column.id === columnId ? { ...column, ...changes } : column);
    const workingDays = columns.filter((column) => column.visible && column.type === "day").sort((first, second) => first.order - second.order).map((column) => column.dayKey ?? column.id);
    commit({ schedule: normalizeScheduleLayout({ ...schedule, columns, workingDays }) }, "Column updated.");
  }

  function moveRow(rowId: string, direction: -1 | 1) {
    const rows = moveOrderedItem(orderedRows(schedule.rows), rowId, direction).map((row, index) => ({ ...row, order: index + 1 }));
    const periods = rows.map((row) => rowToPeriod(schedule, row));
    commit({ schedule: normalizeScheduleLayout({ ...schedule, rows, periods }) }, "Row order updated.");
  }

  function moveColumn(columnId: string, direction: -1 | 1) {
    const timeColumn = schedule.columns.find((column) => column.type === "time");
    const editableColumns = orderedColumns(schedule.columns).filter((column) => column.type !== "time");
    const moved = moveOrderedItem(editableColumns, columnId, direction).map((column, index) => ({ ...column, order: index + 1 }));
    const columns = timeColumn ? [{ ...timeColumn, order: 0 }, ...moved] : moved;
    const workingDays = columns.filter((column) => column.visible && column.type === "day").map((column) => column.dayKey ?? column.id);
    commit({ schedule: normalizeScheduleLayout({ ...schedule, columns, workingDays }) }, "Column order updated.");
  }

  function deleteRows() {
    if (!canConfigure || selection.length === 0) return;
    const rowIds = new Set(selection.map((cell) => cell.rowId));
    const rows = schedule.rows.filter((row) => !rowIds.has(row.id)).map((row, index) => ({ ...row, order: index + 1 }));
    const periods = rows.map((row) => rowToPeriod(schedule, row));
    const nextEntries = entries.filter((entry) => !rowIds.has(entry.rowId));
    commit({ schedule: normalizeScheduleLayout({ ...schedule, rows, periods }), entries: nextEntries }, "Selected row content removed.");
    setSelection([]);
  }

  function deleteColumns() {
    if (!canConfigure || selection.length === 0) return;
    const columnIds = new Set(selection.map((cell) => cell.columnId));
    const columns = schedule.columns.filter((column) => column.type === "time" || !columnIds.has(column.id)).map((column, index) => ({ ...column, order: column.type === "time" ? 0 : index }));
    const workingDays = columns.filter((column) => column.visible && column.type === "day").map((column) => column.dayKey ?? column.id);
    const nextEntries = entries.filter((entry) => !columnIds.has(entry.columnId));
    commit({ schedule: normalizeScheduleLayout({ ...schedule, columns, workingDays }), entries: nextEntries }, "Selected column content removed.");
    setSelection([]);
  }

  function copySelection() {
    if (!selectedCell) return;
    setClipboard({
      cellTypeId: selectedEntry?.cellTypeId ?? selectedCellConfig?.cellTypeId,
      content: entryContent(selectedEntry),
      display: selectedCellConfig?.display,
      editable: selectedCellConfig?.editable,
    });
    setMessage("Structured cell copied.");
  }

  function pasteSelection() {
    if (!clipboard || selection.length === 0 || !canEditData) return;
    const nextEntries = upsertEntries(selection, clipboard);
    const nextSchedule = clipboard.display || clipboard.editable !== undefined || clipboard.cellTypeId
      ? updateCells(schedule, selection, clipboard)
      : schedule;
    commit({ entries: nextEntries, schedule: nextSchedule }, "Structured cell pasted.");
  }

  function clearSelection() {
    if (selection.length === 0 || !canEditData) return;
    const selectedKeys = new Set(selection.map(cellKey));
    commit({ entries: entries.filter((entry) => !selectedKeys.has(cellKey(entry))) }, "Selected cells cleared.");
  }

  function duplicateSelection() {
    if (!selectedCell || !canEditData) return;
    copySelection();
    setMessage("Cell duplicated into structured clipboard. Select a target and paste.");
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setRedoHistory((items) => [...items, { schedule, entries }]);
    setHistory((items) => items.slice(0, -1));
    setSchedule(previous.schedule);
    setEntries(previous.entries);
    setMessage("Undo applied.");
  }

  function redo() {
    const next = redoHistory.at(-1);
    if (!next) return;
    setHistory((items) => [...items, { schedule, entries }]);
    setRedoHistory((items) => items.slice(0, -1));
    setSchedule(next.schedule);
    setEntries(next.entries);
    setMessage("Redo applied.");
  }

  function publish() {
    if (!timetable) return;
    if (!scheduleValidation.valid || !timetableValidation.valid) {
      setMessage("Resolve layout and timetable validation issues before publishing.");
      return;
    }
    setTimetable({ ...timetable, status: "published", publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setMessage("Timetable published locally.");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const ctrl = event.ctrlKey || event.metaKey;
    if (ctrl && event.key.toLowerCase() === "c") {
      event.preventDefault();
      copySelection();
    } else if (ctrl && event.key.toLowerCase() === "v") {
      event.preventDefault();
      pasteSelection();
    } else if (ctrl && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    } else if (event.key === "Delete") {
      event.preventDefault();
      clearSelection();
    } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key) && selectedCell) {
      event.preventDefault();
      const next = adjacentCell(selectedCell, event.key, visibleRows, visibleColumns);
      if (next) selectCell(next, event.shiftKey);
    } else if (event.key === "Escape") {
      setSelection([]);
      setAnchor(null);
    }
  }

  function upsertEntries(cells: SelectionAnchor[], copied: StructuredClipboard) {
    const selectedKeys = new Set(cells.map(cellKey));
    const remaining = entries.filter((entry) => !selectedKeys.has(cellKey(entry)));
    const additions = cells.map((cell): TimetableEntry => {
      const column = schedule.columns.find((item) => item.id === cell.columnId);
      const content = copied.content ?? {};
      return {
        tenantId: schedule.tenantId,
        schoolId: schedule.schoolId,
        campusId: schedule.campusId,
        academicYearId: schedule.academicYearId,
        id: `tte-local-${cell.rowId}-${cell.columnId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timetableId: timetable?.id ?? "tt-local",
        classId: content.classId ?? selectedClassId,
        sectionId: content.sectionId ?? selectedSectionId,
        rowId: cell.rowId,
        columnId: cell.columnId,
        dayOfWeek: column?.dayKey,
        periodId: cell.rowId,
        cellTypeId: copied.cellTypeId,
        content: { ...content, classId: content.classId ?? selectedClassId, sectionId: content.sectionId ?? selectedSectionId },
        subjectId: content.subjectId,
        teacherId: content.teacherId,
        roomId: content.roomId,
        status: "assigned",
      };
    });
    return [...remaining, ...additions];
  }

  if (!timetable) {
    return <div className="erp-container"><EmptyState title="No timetable available" description="Create a draft timetable before opening the maker." /></div>;
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6" onKeyDown={handleKeyDown}>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Timetable Designer"]} />}
        description="Design rows, columns, cell behavior, and timetable content in one structured spreadsheet-like workspace."
        eyebrow="Timetable Management"
        title="Flexible Timetable Designer"
        action={<TimetableStatusBadge status={timetable.status} />}
      />

      <Card>
        <SectionHeader eyebrow="Designer" title={timetable.name} action={<Badge tone={scheduleValidation.valid && timetableValidation.valid ? "success" : "danger"}>{timetableValidation.conflicts.length} issues</Badge>} />
        <div className="grid gap-4 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Class">
              <Select value={selectedClassId} onChange={(event) => updateClass(event.target.value)}>
                {classOptions.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Section">
              <Select value={selectedSectionId} onChange={(event) => updateSection(event.target.value)}>
                {sectionOptions.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Layout / Schedule">
              <Select value={schedule.id} onChange={(event) => updateSchedule(event.target.value)}>
                {data.schedules.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="Mode">
              <Select value={mode} onChange={(event) => setMode(event.target.value as DesignerMode)}>
                <option value="edit">Edit Mode</option>
                <option value="preview">Preview Mode</option>
              </Select>
            </Field>
          </div>
          <DesignerToolbar
            canConfigure={canConfigure && mode === "edit" && !isPublished}
            canEdit={canEditData && mode === "edit"}
            canRedo={redoHistory.length > 0}
            canUndo={history.length > 0}
            clipboardReady={Boolean(clipboard)}
            onAddColumn={addColumn}
            onAddRow={addRow}
            onClear={clearSelection}
            onCopy={copySelection}
            onDeleteColumn={deleteColumns}
            onDeleteRow={deleteRows}
            onDuplicate={duplicateSelection}
            onPaste={pasteSelection}
            onPublish={publish}
            onRedo={redo}
            onSaveDraft={() => setMessage("Designer draft saved locally.")}
            onUndo={undo}
            onValidate={() => setMessage(scheduleValidation.valid && timetableValidation.valid ? "Layout and timetable are valid." : "Validation found issues to resolve.")}
            mode={mode}
            onModeChange={setMode}
          />
          {message ? <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-foreground-muted" role="status">{message}</p> : null}
          {!scheduleValidation.valid ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">{scheduleValidation.message}</p> : null}
        </div>
      </Card>

      <div className="grid min-h-[640px] gap-4 xl:grid-cols-[270px_minmax(0,1fr)_340px]">
        <DesignerConfigurationPanel
          canConfigure={canConfigure && mode === "edit" && !isPublished}
          columns={visibleColumns}
          onAddColumn={addColumn}
          onAddRow={addRow}
          onMoveColumn={moveColumn}
          onMoveRow={moveRow}
          onUpdateColumn={updateColumn}
          onUpdateRow={updateRow}
          rows={visibleRows}
        />
        <TimetableCanvas
          columns={visibleColumns}
          conflicts={timetableValidation.conflicts}
          entries={entriesForSection}
          mode={mode}
          onCopy={copySelection}
          onDropCell={(source, target) => {
            if (!canEditData || mode !== "edit") return;
            const sourceEntry = findEntry(entriesForSection, source);
            if (!sourceEntry) return;
            const targetColumn = schedule.columns.find((column) => column.id === target.columnId);
            const nextEntries = entries.map((entry) => entry.id === sourceEntry.id ? { ...entry, rowId: target.rowId, columnId: target.columnId, periodId: target.rowId, dayOfWeek: targetColumn?.dayKey } : entry);
            commit({ entries: nextEntries }, "Cell moved.");
          }}
          onPaste={pasteSelection}
          onSelectCell={selectCell}
          rows={visibleRows}
          schedule={schedule}
          selectedCells={selection}
          subjects={data.subjects}
          teachers={data.teachers}
          rooms={data.rooms}
          key={selectedCell ? cellKey(selectedCell) : "empty"}
        />
        <CellInspector
          canConfigure={canEditCells && mode === "edit" && !isPublished}
          canEdit={canEditData && mode === "edit"}
          cell={selectedCell}
          cellConfig={selectedCellConfig}
          classLabel={formatClassSection(selectedClass?.displayName, selectedSection?.displayName)}
          columns={visibleColumns}
          entry={selectedEntry}
          onClear={clearSelection}
          onSave={(next) => {
            if (!selectedCell) return;
            const configPayload = next.config ? updateCells(schedule, [selectedCell], next.config) : schedule;
            const contentPayload = next.content ? upsertEntries([selectedCell], { cellTypeId: next.config?.cellTypeId ?? selectedCellConfig?.cellTypeId, content: next.content }) : entries;
            commit({ schedule: configPayload, entries: contentPayload }, "Cell configuration saved.");
          }}
          rows={visibleRows}
          schedule={schedule}
          subjects={data.subjects}
          teachers={data.teachers}
          rooms={data.rooms}
        />
      </div>
    </div>
  );
}

function DesignerToolbar(props: {
  canConfigure: boolean;
  canEdit: boolean;
  canRedo: boolean;
  canUndo: boolean;
  clipboardReady: boolean;
  mode: DesignerMode;
  onAddColumn: () => void;
  onAddRow: () => void;
  onClear: () => void;
  onCopy: () => void;
  onDeleteColumn: () => void;
  onDeleteRow: () => void;
  onDuplicate: () => void;
  onModeChange: (mode: DesignerMode) => void;
  onPaste: () => void;
  onPublish: () => void;
  onRedo: () => void;
  onSaveDraft: () => void;
  onUndo: () => void;
  onValidate: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="responsive-action-row">
        <Button disabled={!props.canUndo} onClick={props.onUndo} variant="secondary">Undo</Button>
        <Button disabled={!props.canRedo} onClick={props.onRedo} variant="secondary">Redo</Button>
        <Button disabled={!props.canConfigure} onClick={props.onAddRow} variant="secondary">Add Row</Button>
        <Button disabled={!props.canConfigure} onClick={props.onAddColumn} variant="secondary">Add Column</Button>
        <Button disabled={!props.canEdit} onClick={props.onCopy} variant="secondary">Copy</Button>
        <Button disabled={!props.canEdit || !props.clipboardReady} onClick={props.onPaste} variant="secondary">Paste</Button>
        <Button disabled={!props.canEdit} onClick={props.onDuplicate} variant="secondary">Duplicate</Button>
        <Button disabled={!props.canEdit} onClick={props.onClear} variant="secondary">Clear</Button>
      </div>
      <div className="responsive-action-row">
        <Button selected={props.mode === "edit"} onClick={() => props.onModeChange("edit")} variant="outline">Edit</Button>
        <Button selected={props.mode === "preview"} onClick={() => props.onModeChange("preview")} variant="outline">Preview</Button>
        <Button disabled={!props.canConfigure} onClick={props.onDeleteRow} variant="outline">Delete Row</Button>
        <Button disabled={!props.canConfigure} onClick={props.onDeleteColumn} variant="outline">Delete Column</Button>
        <Button onClick={props.onValidate} variant="outline">Validate</Button>
        <Button disabled={!props.canEdit} onClick={props.onSaveDraft} variant="secondary">Save Draft</Button>
        <Button disabled={!props.canEdit} onClick={props.onPublish}>Publish</Button>
      </div>
    </div>
  );
}

function DesignerConfigurationPanel(props: {
  canConfigure: boolean;
  columns: TimetableColumn[];
  onAddColumn: () => void;
  onAddRow: () => void;
  onMoveColumn: (columnId: string, direction: -1 | 1) => void;
  onMoveRow: (rowId: string, direction: -1 | 1) => void;
  onUpdateColumn: (columnId: string, changes: Partial<TimetableColumn>) => void;
  onUpdateRow: (rowId: string, changes: Partial<TimetableRow>) => void;
  rows: TimetableRow[];
}) {
  const editableColumns = props.columns.filter((column) => column.type !== "time");
  return (
    <Card className="overflow-hidden">
      <SectionHeader eyebrow="Configuration" title="Layout Controls" />
      <div className="grid gap-4 p-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Columns</h2>
            <Button disabled={!props.canConfigure} onClick={props.onAddColumn} size="sm" variant="secondary">Add</Button>
          </div>
          <div className="grid gap-2">
            {editableColumns.map((column, index) => (
              <article className="rounded-lg border border-border bg-surface-muted p-3" key={column.id}>
                <input aria-label={`${column.label} label`} className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" disabled={!props.canConfigure} value={column.label} onChange={(event) => props.onUpdateColumn(column.id, { label: event.target.value })} />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Select disabled={!props.canConfigure} value={column.type} onChange={(event) => props.onUpdateColumn(column.id, { type: event.target.value as TimetableColumnType })}>
                    {columnTypeOptions.map((type) => <option key={type} value={type}>{formatPeriodType(type as TimetablePeriodType)}</option>)}
                  </Select>
                  <input aria-label={`${column.label} width`} className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-foreground outline-none" disabled={!props.canConfigure} min={96} type="number" value={column.width} onChange={(event) => props.onUpdateColumn(column.id, { width: Number(event.target.value) })} />
                </div>
                <div className="mt-2 flex gap-2">
                  <Button disabled={!props.canConfigure || index === 0} onClick={() => props.onMoveColumn(column.id, -1)} size="sm" variant="secondary">Up</Button>
                  <Button disabled={!props.canConfigure || index === editableColumns.length - 1} onClick={() => props.onMoveColumn(column.id, 1)} size="sm" variant="secondary">Down</Button>
                  <label className="ml-auto flex items-center gap-2 text-xs text-foreground-muted"><input checked={column.visible} disabled={!props.canConfigure} type="checkbox" onChange={(event) => props.onUpdateColumn(column.id, { visible: event.target.checked })} />Visible</label>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Rows</h2>
            <Button disabled={!props.canConfigure} onClick={props.onAddRow} size="sm" variant="secondary">Add</Button>
          </div>
          <div className="grid gap-2">
            {props.rows.map((row, index) => (
              <article className="rounded-lg border border-border bg-surface-muted p-3" key={row.id}>
                <input aria-label={`${row.label} row label`} className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-sm text-foreground outline-none" disabled={!props.canConfigure} value={row.label} onChange={(event) => props.onUpdateRow(row.id, { label: event.target.value })} />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input aria-label={`${row.label} start time`} className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-foreground outline-none" disabled={!props.canConfigure} type="time" value={row.startTime ?? ""} onChange={(event) => props.onUpdateRow(row.id, { startTime: event.target.value })} />
                  <input aria-label={`${row.label} end time`} className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-foreground outline-none" disabled={!props.canConfigure} type="time" value={row.endTime ?? ""} onChange={(event) => props.onUpdateRow(row.id, { endTime: event.target.value })} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Select disabled={!props.canConfigure} value={row.type} onChange={(event) => props.onUpdateRow(row.id, { type: event.target.value })}>
                    {rowTypeOptions.map((type) => <option key={type} value={type}>{formatPeriodType(type)}</option>)}
                  </Select>
                  <input aria-label={`${row.label} height`} className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-foreground outline-none" disabled={!props.canConfigure} min={56} type="number" value={row.height} onChange={(event) => props.onUpdateRow(row.id, { height: Number(event.target.value) })} />
                </div>
                <div className="mt-2 flex gap-2">
                  <Button disabled={!props.canConfigure || index === 0} onClick={() => props.onMoveRow(row.id, -1)} size="sm" variant="secondary">Up</Button>
                  <Button disabled={!props.canConfigure || index === props.rows.length - 1} onClick={() => props.onMoveRow(row.id, 1)} size="sm" variant="secondary">Down</Button>
                  <label className="ml-auto flex items-center gap-2 text-xs text-foreground-muted"><input checked={row.visible} disabled={!props.canConfigure} type="checkbox" onChange={(event) => props.onUpdateRow(row.id, { visible: event.target.checked })} />Visible</label>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TimetableCanvas(props: {
  columns: TimetableColumn[];
  conflicts: TimetableConflict[];
  entries: TimetableEntry[];
  mode: DesignerMode;
  onCopy: () => void;
  onDropCell: (source: SelectionAnchor, target: SelectionAnchor) => void;
  onPaste: () => void;
  onSelectCell: (cell: SelectionAnchor, extend?: boolean) => void;
  rows: TimetableRow[];
  schedule: TimetableSchedule;
  selectedCells: SelectionAnchor[];
  subjects: TimetableWorkspaceData["subjects"];
  teachers: TimetableWorkspaceData["teachers"];
  rooms: TimetableWorkspaceData["rooms"];
}) {
  const selectedKeys = new Set(props.selectedCells.map(cellKey));
  return (
    <Card className="overflow-hidden">
      <SectionHeader eyebrow={props.mode === "preview" ? "Preview" : "Canvas"} title={props.schedule.name} />
      <div className="hidden md:block">
        <div className="responsive-table-wrap">
          <div className="grid" style={{ minWidth: props.columns.reduce((sum, column) => sum + column.width, 0), gridTemplateColumns: props.columns.map((column) => `${column.width}px`).join(" ") }}>
            {props.columns.map((column) => (
              <div className="border-b border-r border-border bg-surface-muted px-3 py-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted" key={column.id}>{column.label}</div>
            ))}
            {props.rows.map((row) => props.columns.map((column) => {
              if (column.type === "time") {
                return (
                  <div className="sticky left-0 z-10 border-b border-r border-border bg-surface px-3 py-3 text-sm" key={`${row.id}-${column.id}`} style={{ minHeight: row.height }}>
                    <p className="font-medium text-foreground">{row.label}</p>
                    <p className="mt-1 text-xs text-foreground-muted">{[row.startTime, row.endTime].filter(Boolean).join(" - ") || row.type}</p>
                  </div>
                );
              }
              const cell = { rowId: row.id, columnId: column.id };
              const entry = findEntry(props.entries, cell);
              const config = getCellConfig(props.schedule, row.id, column.id);
              const conflicts = props.conflicts.filter((conflict) => conflict.relatedEntryIds.includes(entry?.id ?? ""));
              return (
                <DesignerCell
                  cell={cell}
                  column={column}
                  config={config}
                  conflicts={conflicts}
                  entry={entry}
                  key={`${row.id}-${column.id}`}
                  mode={props.mode}
                  onCopy={props.onCopy}
                  onDropCell={props.onDropCell}
                  onPaste={props.onPaste}
                  onSelect={props.onSelectCell}
                  row={row}
                  rooms={props.rooms}
                  selected={selectedKeys.has(cellKey(cell))}
                  subjects={props.subjects}
                  teachers={props.teachers}
                />
              );
            }))}
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-3 md:hidden">
        {props.columns.filter((column) => column.type !== "time").map((column) => (
          <article className="rounded-lg border border-border bg-surface-muted p-3" key={column.id}>
            <h3 className="font-semibold text-foreground">{column.label}</h3>
            <div className="mt-3 grid gap-2">
              {props.rows.map((row) => {
                const entry = findEntry(props.entries, { rowId: row.id, columnId: column.id });
                return <MobileCell key={`${row.id}-${column.id}`} entry={entry} row={row} rooms={props.rooms} subjects={props.subjects} teachers={props.teachers} />;
              })}
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

function DesignerCell(props: {
  cell: SelectionAnchor;
  column: TimetableColumn;
  config?: TimetableCellConfiguration;
  conflicts: TimetableConflict[];
  entry?: TimetableEntry;
  mode: DesignerMode;
  onCopy: () => void;
  onDropCell: (source: SelectionAnchor, target: SelectionAnchor) => void;
  onPaste: () => void;
  onSelect: (cell: SelectionAnchor, extend?: boolean) => void;
  row: TimetableRow;
  rooms: TimetableWorkspaceData["rooms"];
  selected: boolean;
  subjects: TimetableWorkspaceData["subjects"];
  teachers: TimetableWorkspaceData["teachers"];
}) {
  const display = props.config?.display ?? defaultDisplay;
  const content = entryContent(props.entry);
  const subject = props.subjects.find((item) => item.id === content.subjectId);
  const teacher = props.teachers.find((item) => item.id === content.teacherId);
  const room = props.rooms.find((item) => item.id === content.roomId);
  const hasConflict = props.conflicts.length > 0;
  const locked = props.config?.editable === false || props.mode === "preview";
  return (
    <button
      aria-label={`${props.column.label} ${props.row.label}`}
      className={cn(
        "min-h-20 border-b border-r border-border bg-surface px-3 py-3 text-left text-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-700",
        props.selected && "bg-blue-50 ring-2 ring-inset ring-primary dark:bg-blue-950",
        hasConflict && "bg-rose-50 dark:bg-rose-950",
        locked && "cursor-default",
      )}
      draggable={props.mode === "edit" && Boolean(props.entry)}
      onClick={(event) => props.mode === "edit" ? props.onSelect(props.cell, event.shiftKey) : undefined}
      onContextMenu={(event) => {
        event.preventDefault();
        props.onSelect(props.cell, event.shiftKey);
      }}
      onDragStart={(event) => event.dataTransfer.setData("application/x-timetable-cell", JSON.stringify(props.cell))}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData("application/x-timetable-cell");
        if (!raw) return;
        props.onDropCell(JSON.parse(raw) as SelectionAnchor, props.cell);
      }}
      style={{ minHeight: props.row.height }}
      type="button"
    >
      <span className="block min-w-0">
        {display.activity && (content.activityLabel || content.customText) ? <span className="responsive-text block font-semibold text-foreground">{content.activityLabel ?? content.customText}</span> : null}
        {display.subject && subject ? <span className="responsive-text block font-semibold text-foreground">{subject.name}</span> : null}
        {display.teacher && teacher ? <span className="responsive-text mt-1 block text-xs text-foreground-muted">{teacher.displayName}</span> : null}
        {display.room && room ? <span className="responsive-text mt-1 block text-xs text-foreground-muted">{room.name}</span> : null}
        {!subject && !teacher && !room && !content.activityLabel && !content.customText ? <span className="font-medium text-primary">{locked ? props.config?.cellTypeId ?? "Empty" : "+ Configure"}</span> : null}
        {hasConflict ? <span className="mt-2 inline-flex rounded-md border border-rose-200 bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">Conflict</span> : null}
      </span>
    </button>
  );
}

function CellInspector(props: {
  canConfigure: boolean;
  canEdit: boolean;
  cell: SelectionAnchor | null;
  cellConfig?: TimetableCellConfiguration;
  classLabel: string;
  columns: TimetableColumn[];
  entry?: TimetableEntry;
  onClear: () => void;
  onSave: (next: { config?: Partial<TimetableCellConfiguration>; content?: TimetableCellContent }) => void;
  rows: TimetableRow[];
  schedule: TimetableSchedule;
  subjects: TimetableWorkspaceData["subjects"];
  teachers: TimetableWorkspaceData["teachers"];
  rooms: TimetableWorkspaceData["rooms"];
}) {
  const cellType = props.schedule.cellTypes.find((type) => type.id === props.cellConfig?.cellTypeId) ?? props.schedule.cellTypes[0];
  const content = entryContent(props.entry);
  const [draftCellTypeId, setDraftCellTypeId] = useState(cellType?.id ?? "");
  const [draftContent, setDraftContent] = useState<TimetableCellContent>(content);
  const [draftDisplay, setDraftDisplay] = useState<TimetableCellDisplay>(props.cellConfig?.display ?? cellType?.defaultDisplay ?? defaultDisplay);
  const [editable, setEditable] = useState(props.cellConfig?.editable ?? cellType?.defaultEditable ?? true);

  if (!props.cell) {
    return <Card><SectionHeader eyebrow="Inspector" title="No Cell Selected" /><div className="p-4"><EmptyState title="Select a cell" description="Choose a canvas cell to configure type, content, display, and editability." /></div></Card>;
  }

  const row = props.rows.find((item) => item.id === props.cell?.rowId);
  const column = props.columns.find((item) => item.id === props.cell?.columnId);
  const draftType = props.schedule.cellTypes.find((type) => type.id === draftCellTypeId);

  return (
    <Card className="overflow-hidden">
      <SectionHeader eyebrow="Inspector" title="Cell Inspector" />
      <div className="grid gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{column?.label} / {row?.label}</p>
          <p className="mt-1 text-sm text-foreground-muted">{props.classLabel}</p>
        </div>
        <Field label="Cell Type">
          <Select disabled={!props.canConfigure} value={draftCellTypeId} onChange={(event) => {
            const nextType = props.schedule.cellTypes.find((type) => type.id === event.target.value);
            setDraftCellTypeId(event.target.value);
            if (nextType) {
              setDraftDisplay(nextType.defaultDisplay);
              setEditable(nextType.defaultEditable);
            }
          }}>
            {props.schedule.cellTypes.filter((type) => type.active).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </Select>
        </Field>
        {draftType?.requiresSubject ? (
          <Field label="Subject">
            <Select disabled={!props.canEdit} value={draftContent.subjectId ?? ""} onChange={(event) => setDraftContent({ ...draftContent, subjectId: event.target.value || undefined })}>
              <option value="">Select subject</option>
              {props.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </Select>
          </Field>
        ) : null}
        {draftType?.requiresTeacher || draftType?.supportsActivity ? (
          <Field label="Teacher">
            <Select disabled={!props.canEdit} value={draftContent.teacherId ?? ""} onChange={(event) => setDraftContent({ ...draftContent, teacherId: event.target.value || undefined })}>
              <option value="">Select teacher</option>
              {props.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.displayName}</option>)}
            </Select>
          </Field>
        ) : null}
        {draftType?.requiresRoom || draftType?.requiresSubject ? (
          <Field label="Room">
            <Select disabled={!props.canEdit} value={draftContent.roomId ?? ""} onChange={(event) => setDraftContent({ ...draftContent, roomId: event.target.value || undefined })}>
              <option value="">No room</option>
              {props.rooms.map((room) => <option key={room.id} value={room.id}>{room.name} / {room.roomType.replace("_", " ")}</option>)}
            </Select>
          </Field>
        ) : null}
        {draftType?.supportsActivity || draftType?.category !== "instructional" ? (
          <Field label="Activity / Custom Text">
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" disabled={!props.canEdit} value={draftContent.activityLabel ?? draftContent.customText ?? ""} onChange={(event) => setDraftContent({ ...draftContent, activityLabel: event.target.value || undefined, customText: event.target.value || undefined })} />
          </Field>
        ) : null}
        <div className="grid gap-2 rounded-lg border border-border bg-surface-muted p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Display</p>
          {Object.keys(draftDisplay).map((key) => (
            <label className="flex items-center gap-2 text-sm text-foreground" key={key}>
              <input checked={draftDisplay[key as keyof TimetableCellDisplay]} disabled={!props.canConfigure} type="checkbox" onChange={(event) => setDraftDisplay({ ...draftDisplay, [key]: event.target.checked })} />
              {formatPeriodType(key as TimetablePeriodType)}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input checked={editable} disabled={!props.canConfigure} type="checkbox" onChange={(event) => setEditable(event.target.checked)} />
          Editable
        </label>
        <div className="responsive-action-row justify-between">
          <Button disabled={!props.canEdit} onClick={props.onClear} variant="destructive">Clear</Button>
          <Button disabled={!props.canEdit && !props.canConfigure} onClick={() => props.onSave({ config: { cellTypeId: draftCellTypeId, display: draftDisplay, editable }, content: draftContent })}>Save Cell</Button>
        </div>
      </div>
    </Card>
  );
}

function MobileCell({ entry, row, rooms, subjects, teachers }: { entry?: TimetableEntry; row: TimetableRow; rooms: TimetableWorkspaceData["rooms"]; subjects: TimetableWorkspaceData["subjects"]; teachers: TimetableWorkspaceData["teachers"] }) {
  const content = entryContent(entry);
  const subject = subjects.find((item) => item.id === content.subjectId);
  const teacher = teachers.find((item) => item.id === content.teacherId);
  const room = rooms.find((item) => item.id === content.roomId);
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{[row.startTime, row.endTime].filter(Boolean).join(" - ") || row.type} / {row.label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{content.activityLabel ?? content.customText ?? subject?.name ?? "Empty"}</p>
      <p className="mt-1 text-xs text-foreground-muted">{[teacher?.displayName, room?.name].filter(Boolean).join(" / ") || "No resource assigned"}</p>
    </div>
  );
}

function findEntry(entries: TimetableEntry[], cell: SelectionAnchor) {
  return entries.find((entry) => entry.rowId === cell.rowId && entry.columnId === cell.columnId);
}

function getCellConfig(schedule: TimetableSchedule, rowId: string, columnId: string) {
  return schedule.cells.find((cell) => cell.rowId === rowId && cell.columnId === columnId);
}

function entryContent(entry?: TimetableEntry): TimetableCellContent {
  return {
    subjectId: entry?.content?.subjectId ?? entry?.subjectId,
    teacherId: entry?.content?.teacherId ?? entry?.teacherId,
    roomId: entry?.content?.roomId ?? entry?.roomId,
    classId: entry?.content?.classId ?? entry?.classId,
    sectionId: entry?.content?.sectionId ?? entry?.sectionId,
    activityLabel: entry?.content?.activityLabel,
    customText: entry?.content?.customText,
  };
}

function cellKey(cell: SelectionAnchor | Pick<TimetableEntry, "rowId" | "columnId">) {
  return `${cell.rowId}:${cell.columnId}`;
}

function rectangleSelection(start: SelectionAnchor, end: SelectionAnchor, rows: TimetableRow[], columns: TimetableColumn[]) {
  const startRow = rows.findIndex((row) => row.id === start.rowId);
  const endRow = rows.findIndex((row) => row.id === end.rowId);
  const canvasColumns = columns.filter((column) => column.type !== "time");
  const startColumn = canvasColumns.findIndex((column) => column.id === start.columnId);
  const endColumn = canvasColumns.findIndex((column) => column.id === end.columnId);
  if (startRow < 0 || endRow < 0 || startColumn < 0 || endColumn < 0) return [end];
  const rowRange = [Math.min(startRow, endRow), Math.max(startRow, endRow)];
  const columnRange = [Math.min(startColumn, endColumn), Math.max(startColumn, endColumn)];
  return rows.slice(rowRange[0], rowRange[1] + 1).flatMap((row) => canvasColumns.slice(columnRange[0], columnRange[1] + 1).map((column) => ({ rowId: row.id, columnId: column.id })));
}

function adjacentCell(cell: SelectionAnchor, key: string, rows: TimetableRow[], columns: TimetableColumn[]) {
  const canvasColumns = columns.filter((column) => column.type !== "time");
  const rowIndex = rows.findIndex((row) => row.id === cell.rowId);
  const columnIndex = canvasColumns.findIndex((column) => column.id === cell.columnId);
  const nextRow = key === "ArrowUp" ? rowIndex - 1 : key === "ArrowDown" ? rowIndex + 1 : rowIndex;
  const nextColumn = key === "ArrowLeft" ? columnIndex - 1 : key === "ArrowRight" ? columnIndex + 1 : columnIndex;
  const row = rows[nextRow];
  const column = canvasColumns[nextColumn];
  return row && column ? { rowId: row.id, columnId: column.id } : null;
}

function updateCells(schedule: TimetableSchedule, cells: SelectionAnchor[], changes: Partial<TimetableCellConfiguration> | StructuredClipboard) {
  const selectedKeys = new Set(cells.map(cellKey));
  const existing = schedule.cells.filter((cell) => !selectedKeys.has(cellKey(cell)));
  const additions = cells.map((cell) => {
    const current = getCellConfig(schedule, cell.rowId, cell.columnId);
    const type = schedule.cellTypes.find((item) => item.id === (changes.cellTypeId ?? current?.cellTypeId)) ?? schedule.cellTypes[0];
    return {
      id: current?.id ?? `cell-${cell.rowId}-${cell.columnId}`,
      rowId: cell.rowId,
      columnId: cell.columnId,
      cellTypeId: changes.cellTypeId ?? current?.cellTypeId ?? type?.id ?? "cell-custom",
      editable: changes.editable ?? current?.editable ?? type?.defaultEditable ?? true,
      display: changes.display ?? current?.display ?? type?.defaultDisplay ?? defaultDisplay,
      rowSpan: "rowSpan" in changes ? changes.rowSpan : current?.rowSpan,
      columnSpan: "columnSpan" in changes ? changes.columnSpan : current?.columnSpan,
      mergedIntoCellId: "mergedIntoCellId" in changes ? changes.mergedIntoCellId : current?.mergedIntoCellId,
    };
  });
  return normalizeScheduleLayout({ ...schedule, cells: [...existing, ...additions] });
}

function normalizeScheduleLayout(schedule: TimetableSchedule): TimetableSchedule {
  const columns = orderedColumns(schedule.columns).map((column, index) => ({ ...column, order: column.type === "time" ? 0 : index }));
  const rows = orderedRows(schedule.rows).map((row, index) => ({ ...row, order: index + 1 }));
  const periods = rows.map((row) => rowToPeriod(schedule, row));
  const existingCells = new Map(schedule.cells.map((cell) => [cellKey(cell), cell]));
  const cells = rows.flatMap((row) =>
    columns.filter((column) => column.type !== "time").map((column) => {
      const existing = existingCells.get(`${row.id}:${column.id}`);
      const type = existing ? schedule.cellTypes.find((item) => item.id === existing.cellTypeId) : defaultTypeForRow(schedule.cellTypes, row);
      return existing ?? {
        id: `cell-${row.id}-${column.id}`,
        rowId: row.id,
        columnId: column.id,
        cellTypeId: type?.id ?? "cell-custom",
        editable: type?.defaultEditable ?? true,
        display: type?.defaultDisplay ?? defaultDisplay,
      };
    }),
  );
  const layout = {
    ...schedule.layout,
    columns,
    rows,
    cellTypes: schedule.cellTypes,
    cells,
    updatedAt: new Date().toISOString(),
  };
  return { ...schedule, columns, rows, periods, cells, layout, workingDays: columns.filter((column) => column.visible && column.type === "day").map((column) => column.dayKey ?? column.id) };
}

function defaultTypeForRow(types: TimetableCellType[], row: TimetableRow) {
  if (row.type === "break") return types.find((type) => type.id === "cell-break");
  if (row.type === "lunch") return types.find((type) => type.id === "cell-lunch") ?? types.find((type) => type.id === "cell-break");
  if (row.type === "assembly") return types.find((type) => type.id === "cell-assembly");
  if (row.type === "activity") return types.find((type) => type.id === "cell-discovery") ?? types.find((type) => type.id === "cell-activity");
  return types.find((type) => type.id === "cell-lecture") ?? types.find((type) => type.id === "cell-subject") ?? types[0];
}

function rowToPeriod(schedule: TimetableSchedule, row: TimetableRow) {
  return {
    tenantId: schedule.tenantId,
    schoolId: schedule.schoolId,
    campusId: schedule.campusId,
    academicYearId: schedule.academicYearId,
    id: row.id,
    scheduleId: schedule.id,
    name: row.label,
    startTime: row.startTime ?? "00:00",
    endTime: row.endTime ?? "00:00",
    type: row.type as TimetablePeriodType,
    order: row.order,
    isTeaching: row.type === "teaching",
    isActive: row.visible,
    height: row.height,
    description: row.description,
  };
}

function orderedRows(rows: TimetableRow[]) {
  return [...rows].sort((first, second) => first.order - second.order);
}

function orderedColumns(columns: TimetableColumn[]) {
  return [...columns].sort((first, second) => first.order - second.order);
}

function moveOrderedItem<T extends { id: string }>(items: T[], id: string, direction: -1 | 1) {
  const next = [...items];
  const index = next.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= next.length) return next;
  const [item] = next.splice(index, 1);
  if (item) next.splice(target, 0, item);
  return next;
}

function addMinutes(time: string, minutes: number) {
  const [hours = "0", mins = "0"] = time.split(":");
  const date = new Date(2000, 0, 1, Number(hours), Number(mins));
  date.setMinutes(date.getMinutes() + minutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
