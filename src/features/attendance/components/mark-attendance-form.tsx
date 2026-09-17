"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select } from "@/components/ui";
import { markAttendanceAction, type AttendanceActionState } from "@/features/attendance/actions/attendance-actions";
import { AttendanceStatusBadge } from "@/features/attendance/components/attendance-status-badge";
import { getAttendanceStatusLabel } from "@/features/attendance/services/attendance-rules";
import { type AttendanceRecordSummary, type AttendanceStatus } from "@/features/attendance/types/attendance";
import { cn } from "@/lib/utils";
import type { StudentAcademicPlacementOption } from "@/features/students/types/student";

const initialState: AttendanceActionState = { status: "idle" };
const primaryStatuses = ["present", "absent"] as const;
const secondaryStatuses = ["late", "excused", "half_day", "leave"] as const;
const rosterFilters = ["all", "unmarked", "absent", "other", "exceptions"] as const;

type RosterFilter = (typeof rosterFilters)[number];

type AttendanceRosterStudent = {
  id: string;
  displayName: string;
  admissionNumber: string;
  classId: string;
  sectionId: string;
  rollNumber?: string;
};

type DraftRecord = {
  status: AttendanceStatus;
  checkInTime: string;
  remarks: string;
};

type MarkAttendanceFormProps = {
  context: { school: string; campus: string; academicYear: string };
  date: string;
  existingRecords: AttendanceRecordSummary[];
  loadError?: string;
  placements: StudentAcademicPlacementOption[];
  roster: AttendanceRosterStudent[];
  selectedClassId?: string;
  selectedSectionId?: string;
};

export function MarkAttendanceForm(props: MarkAttendanceFormProps) {
  const rosterSignature = createRosterSignature(props);
  return <MarkAttendanceWorkstation key={rosterSignature} {...props} />;
}

function MarkAttendanceWorkstation({
  context,
  date,
  existingRecords,
  loadError,
  placements,
  roster,
  selectedClassId,
  selectedSectionId,
}: MarkAttendanceFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(markAttendanceAction, initialState);
  const [records, setRecords] = useState<Record<string, DraftRecord>>(() => createDraftRecords(roster, existingRecords));
  const [initialRecords, setInitialRecords] = useState<Record<string, DraftRecord>>(() => createDraftRecords(roster, existingRecords));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || target?.closest("input, textarea, select, button")) return;
      event.preventDefault();
      searchRef.current?.focus();
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const classOptions = uniqueOptions(placements, "classId", "className");
  const sectionOptions = uniqueOptions(
    placements.filter((placement) => !selectedClassId || placement.classId === selectedClassId),
    "sectionId",
    "sectionName",
  );
  const selectedClassName = classOptions.find((option) => option.value === selectedClassId)?.label;
  const selectedSectionName = sectionOptions.find((option) => option.value === selectedSectionId)?.label;
  const existingByStudent = useMemo(() => new Map(existingRecords.map((record) => [record.studentId, record])), [existingRecords]);
  const summary = useMemo(() => summarizeRoster(roster, records, existingByStudent), [existingByStudent, records, roster]);
  const visibleRoster = useMemo(() => filterRoster(roster, records, existingByStudent, query, filter), [existingByStudent, filter, query, records, roster]);
  const hasSelection = Boolean(selectedClassId && selectedSectionId);
  const hasUnsavedChanges = useMemo(() => !draftRecordsEqual(records, initialRecords), [initialRecords, records]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "classId") params.delete("sectionId");
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateRecord(studentId: string, patch: Partial<DraftRecord>) {
    setRecords((current) => ({
      ...current,
      [studentId]: { ...current[studentId], ...patch },
    }));
  }

  function markAll(status: AttendanceStatus, students = roster) {
    setRecords((current) => {
      const next = { ...current };
      students.forEach((student) => {
        next[student.id] = { ...next[student.id], status };
      });
      return next;
    });
  }

  function resetRecords() {
    const next = createDraftRecords(roster, existingRecords);
    setRecords(next);
    setInitialRecords(next);
    setExpandedStudentId(null);
  }

  return (
    <div className="erp-container space-y-4 pb-24 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Attendance", "Mark"]} />}
        description="Mark attendance for the selected class, section, and date."
        eyebrow="Student Attendance"
        title="Mark Attendance"
        action={
          <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/attendance?date=${date}${selectedClassId ? `&classId=${encodeURIComponent(selectedClassId)}` : ""}${selectedSectionId ? `&sectionId=${encodeURIComponent(selectedSectionId)}` : ""}`}>
            Back to Attendance
          </Link>
        }
      />

      <Card className="overflow-hidden sm:sticky sm:top-0 sm:z-20">
        <div className="grid gap-3 border-b border-border p-3 sm:p-4 lg:grid-cols-[1.2fr_1fr_1fr_0.9fr]">
          <Field label="Academic Year">
            <input className={inputClasses} readOnly value={context.academicYear} />
          </Field>
          <Field label="Class" required>
            <Select onChange={(event) => updateFilter("classId", event.target.value)} value={selectedClassId ?? ""}>
              <option value="">Select class</option>
              {classOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="Section" required>
            <Select disabled={!selectedClassId} onChange={(event) => updateFilter("sectionId", event.target.value)} value={selectedSectionId ?? ""}>
              <option value="">Select section</option>
              {sectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="Date" required>
            <input className={inputClasses} max={todayIsoDate()} onChange={(event) => updateFilter("date", event.target.value)} type="date" value={date} />
          </Field>
        </div>
        {roster.length > 0 ? (
          <div className="flex flex-col gap-3 p-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
            <AttendanceSummary summary={summary} />
            <div className="responsive-action-row">
              {hasUnsavedChanges ? <Badge tone="warning">Unsaved changes</Badge> : <Badge tone="neutral">No unsaved changes</Badge>}
              <Button onClick={() => markAll("present")} variant="secondary">Mark all present</Button>
              {visibleRoster.length > 0 ? <Button onClick={() => markAll("present", visibleRoster)} variant="ghost">Mark visible present</Button> : null}
              <Button onClick={resetRecords} variant="ghost">Reset</Button>
            </div>
          </div>
        ) : null}
      </Card>

      {!hasSelection ? (
        <Card className="p-4 sm:p-5">
          <EmptyState description="Choose a class and section to load the tenant-scoped student roster." title="Select class and section" />
        </Card>
      ) : roster.length === 0 ? (
        <Card className="p-4 sm:p-5">
          <EmptyState
            description={loadError ?? "No current students were found for this class and section in the active academic year."}
            title={loadError ? "Roster could not be loaded" : "No students found"}
          />
        </Card>
      ) : (
        <form action={formAction}>
          <input name="date" type="hidden" value={date} />
          {roster.map((student) => (
            <HiddenAttendanceFields key={student.id} record={records[student.id]} student={student} />
          ))}

          <Card className="overflow-hidden">
            <div className="grid gap-3 border-b border-border p-3 sm:p-4 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-end">
              <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto] md:items-end">
                <Field label="Search students">
                  <input
                    aria-label="Search students by name, roll number, or admission number"
                    className={inputClasses}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Name, roll no., admission no."
                    ref={searchRef}
                    type="search"
                    value={query}
                  />
                </Field>
                <div aria-label="Roster filter" className="flex flex-wrap gap-2" role="group">
                  {rosterFilters.map((item) => (
                    <Button
                      aria-current={filter === item ? "true" : undefined}
                      key={item}
                      onClick={() => setFilter(item)}
                      selected={filter === item}
                      size="sm"
                      variant={filter === item ? "secondary" : "ghost"}
                    >
                      {getFilterLabel(item)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="text-sm text-foreground-muted lg:text-right">
                <span className="font-medium text-foreground">{selectedClassName ?? "Class"}</span>
                {selectedSectionName ? ` / Section ${selectedSectionName}` : ""} / {visibleRoster.length.toLocaleString("en-IN")} shown
              </div>
            </div>

            {state.status !== "idle" ? (
              <div className={cn(
                "mx-3 mt-3 rounded-lg border p-3 text-sm font-medium sm:mx-4",
                state.status === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
              )}>
                {state.message}
              </div>
            ) : null}

            {visibleRoster.length === 0 ? (
              <div className="p-4 sm:p-5">
                <EmptyState
                  description={query || filter !== "all" ? "Try clearing search or switching back to All students." : "Students will appear once the roster has records."}
                  title={query ? "No students match your search" : "No students in this view"}
                />
              </div>
            ) : (
              <>
                <div className="grid gap-3 p-3 sm:hidden">
                  {visibleRoster.map((student, index) => (
                    <AttendanceMobileRow
                      displayIndex={index + 1}
                      expanded={expandedStudentId === student.id}
                      existing={existingByStudent.get(student.id)}
                      key={student.id}
                      onExpand={() => setExpandedStudentId((current) => current === student.id ? null : student.id)}
                      onUpdate={updateRecord}
                      record={records[student.id]}
                      student={student}
                    />
                  ))}
                </div>
                <div className="responsive-table-wrap hidden sm:block">
                  <table className="w-full min-w-[940px] text-left text-sm">
                    <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
                      <tr>
                        <th className="w-14 px-3 py-3 font-semibold">#</th>
                        <th className="sticky left-0 z-10 min-w-[240px] bg-surface-muted px-3 py-3 font-semibold">Student</th>
                        <th className="w-32 px-3 py-3 font-semibold">Roll No.</th>
                        <th className="w-[260px] px-3 py-3 font-semibold">Attendance</th>
                        <th className="w-36 px-3 py-3 font-semibold">Check-in</th>
                        <th className="w-36 px-3 py-3 font-semibold">Remark</th>
                        <th className="w-28 px-3 py-3 text-right font-semibold">More</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibleRoster.map((student, index) => (
                        <AttendanceTableRow
                          displayIndex={index + 1}
                          expanded={expandedStudentId === student.id}
                          existing={existingByStudent.get(student.id)}
                          key={student.id}
                          onExpand={() => setExpandedStudentId((current) => current === student.id ? null : student.id)}
                          onUpdate={updateRecord}
                          record={records[student.id]}
                          student={student}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-3 py-3 shadow-[0_-8px_24px_rgb(15_23_42/0.08)] backdrop-blur sm:px-5">
            <div className="erp-container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <AttendanceSummary summary={summary} compact />
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <Button onClick={() => setFilter("exceptions")} variant="secondary">Review exceptions</Button>
                <Button loading={pending} type="submit">Save Attendance</Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function AttendanceTableRow({
  displayIndex,
  expanded,
  existing,
  onExpand,
  onUpdate,
  record,
  student,
}: AttendanceRowProps) {
  return (
    <>
      <tr className={cn("hover:bg-surface-muted", statusRowClass(record.status))}>
        <td className="px-3 py-2 font-mono text-xs text-foreground-muted">{String(displayIndex).padStart(2, "0")}</td>
        <td className="sticky left-0 bg-surface px-3 py-2">
          <StudentIdentity existing={existing} student={student} />
        </td>
        <td className="px-3 py-2 text-sm text-foreground-muted">{student.rollNumber ? `Roll ${student.rollNumber}` : "Not assigned"}</td>
        <td className="px-3 py-2">
          <PrimaryStatusControls onUpdate={onUpdate} record={record} student={student} />
        </td>
        <td className="px-3 py-2">
          <input
            aria-label={`Check-in time for ${student.displayName}`}
            className={cn(inputClasses, "h-8")}
            onChange={(event) => onUpdate(student.id, { checkInTime: event.target.value })}
            type="time"
            value={record.checkInTime}
          />
        </td>
        <td className="px-3 py-2">
          <Button
            aria-expanded={expanded}
            aria-label={record.remarks ? `Edit remark for ${student.displayName}` : `Add remark for ${student.displayName}`}
            onClick={onExpand}
            size="sm"
            variant={record.remarks ? "secondary" : "ghost"}
          >
            {record.remarks ? "Remark added" : "Add remark"}
          </Button>
        </td>
        <td className="px-3 py-2 text-right">
          <Button aria-expanded={expanded} aria-label={`More attendance options for ${student.displayName}`} onClick={onExpand} size="sm" variant="ghost">
            More
          </Button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-border bg-surface-muted/70">
          <td className="px-3 py-3" colSpan={7}>
            <AdvancedAttendancePanel onUpdate={onUpdate} record={record} student={student} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function AttendanceMobileRow({
  displayIndex,
  expanded,
  existing,
  onExpand,
  onUpdate,
  record,
  student,
}: AttendanceRowProps) {
  return (
    <article className={cn("rounded-lg border border-border bg-surface p-3", statusCardClass(record.status))}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-foreground-muted">{String(displayIndex).padStart(2, "0")}</p>
          <StudentIdentity existing={existing} student={student} />
        </div>
        <AttendanceStatusBadge status={record.status} />
      </div>
      <div className="mt-3">
        <PrimaryStatusControls onUpdate={onUpdate} record={record} student={student} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-foreground-muted">
        <span>{student.rollNumber ? `Roll ${student.rollNumber}` : "Roll not assigned"}</span>
        <Button aria-expanded={expanded} aria-label={`More attendance options for ${student.displayName}`} onClick={onExpand} size="sm" variant="secondary">
          {expanded ? "Hide details" : "More"}
        </Button>
      </div>
      {expanded ? <AdvancedAttendancePanel className="mt-3" onUpdate={onUpdate} record={record} student={student} /> : null}
    </article>
  );
}

type AttendanceRowProps = {
  displayIndex: number;
  expanded: boolean;
  existing?: AttendanceRecordSummary;
  onExpand: () => void;
  onUpdate: (studentId: string, patch: Partial<DraftRecord>) => void;
  record: DraftRecord;
  student: AttendanceRosterStudent;
};

function PrimaryStatusControls({
  onUpdate,
  record,
  student,
}: Pick<AttendanceRowProps, "onUpdate" | "record" | "student">) {
  return (
    <div aria-label={`Primary attendance status for ${student.displayName}`} className="grid grid-cols-2 gap-2" role="group">
      {primaryStatuses.map((status) => (
        <Button
          aria-label={`Mark ${student.displayName} ${getAttendanceStatusLabel(status)}`}
          key={status}
          onClick={() => onUpdate(student.id, { status })}
          selected={record.status === status}
          size="sm"
          variant={record.status === status ? (status === "absent" ? "destructive" : "primary") : "secondary"}
        >
          {getAttendanceStatusLabel(status)}
        </Button>
      ))}
    </div>
  );
}

function AdvancedAttendancePanel({
  className,
  onUpdate,
  record,
  student,
}: Pick<AttendanceRowProps, "onUpdate" | "record" | "student"> & { className?: string }) {
  return (
    <div className={cn("grid gap-3 rounded-lg border border-border bg-surface p-3 lg:grid-cols-[220px_160px_minmax(220px,1fr)] lg:items-end", className)}>
      <Field label="Secondary status">
        <Select
          aria-label={`Secondary attendance status for ${student.displayName}`}
          onChange={(event) => onUpdate(student.id, { status: event.target.value as AttendanceStatus })}
          value={secondaryStatuses.includes(record.status as (typeof secondaryStatuses)[number]) ? record.status : ""}
        >
          <option value="">No secondary status</option>
          {secondaryStatuses.map((status) => <option key={status} value={status}>{getAttendanceStatusLabel(status)}</option>)}
        </Select>
      </Field>
      <Field label="Check-in">
        <input
          aria-label={`Check-in time for ${student.displayName}`}
          className={inputClasses}
          onChange={(event) => onUpdate(student.id, { checkInTime: event.target.value })}
          type="time"
          value={record.checkInTime}
        />
      </Field>
      <Field label="Remark">
        <textarea
          aria-label={`Remark for ${student.displayName}`}
          className="min-h-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950"
          maxLength={300}
          onChange={(event) => onUpdate(student.id, { remarks: event.target.value })}
          placeholder="Optional remark"
          value={record.remarks}
        />
      </Field>
    </div>
  );
}

function StudentIdentity({ existing, student }: { existing?: AttendanceRecordSummary; student: AttendanceRosterStudent }) {
  return (
    <div className="min-w-0">
      <p className="responsive-text font-semibold text-foreground">{student.displayName}</p>
      <p className="mt-1 font-mono text-xs text-foreground-muted">{student.admissionNumber}</p>
      {existing ? (
        <p className="mt-1 text-xs text-foreground-muted">
          Existing: <span className="font-medium text-foreground">{getAttendanceStatusLabel(existing.status)}</span>
        </p>
      ) : null}
    </div>
  );
}

function HiddenAttendanceFields({ record, student }: { record: DraftRecord; student: AttendanceRosterStudent }) {
  return (
    <>
      <input name="studentId" type="hidden" value={student.id} />
      <input name={`classId:${student.id}`} type="hidden" value={student.classId} />
      <input name={`sectionId:${student.id}`} type="hidden" value={student.sectionId} />
      <input name={`status:${student.id}`} type="hidden" value={record.status} />
      <input name={`checkInTime:${student.id}`} type="hidden" value={record.checkInTime} />
      <input name={`remarks:${student.id}`} type="hidden" value={record.remarks} />
    </>
  );
}

function AttendanceSummary({ compact = false, summary }: { compact?: boolean; summary: ReturnType<typeof summarizeRoster> }) {
  const items = [
    { label: "Students", value: summary.total, tone: "neutral" },
    { label: "Present", value: summary.present, tone: "success" },
    { label: "Absent", value: summary.absent, tone: "danger" },
    { label: "Other", value: summary.other, tone: "warning" },
    { label: "Unmarked", value: summary.unmarked, tone: summary.unmarked > 0 ? "danger" : "neutral" },
  ] as const;

  return (
    <dl className={cn("flex flex-wrap gap-2", compact ? "text-xs" : "text-sm")}>
      {items.map((item) => (
        <div className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5", summaryToneClass(item.tone))} key={item.label}>
          <dt className="font-medium">{item.label}</dt>
          <dd className="font-semibold">{item.value.toLocaleString("en-IN")}</dd>
        </div>
      ))}
    </dl>
  );
}

function createDraftRecords(roster: AttendanceRosterStudent[], existingRecords: AttendanceRecordSummary[]) {
  const existingByStudent = new Map(existingRecords.map((record) => [record.studentId, record]));
  const map: Record<string, DraftRecord> = {};
  roster.forEach((student) => {
    const existing = existingByStudent.get(student.id);
    map[student.id] = {
      status: existing?.status ?? "present",
      checkInTime: existing?.checkInTime ?? "",
      remarks: existing?.remarks ?? "",
    };
  });
  return map;
}

function createRosterSignature({
  date,
  existingRecords,
  roster,
  selectedClassId,
  selectedSectionId,
}: MarkAttendanceFormProps) {
  return [
    date,
    selectedClassId ?? "",
    selectedSectionId ?? "",
    roster.map((student) => student.id).join(","),
    existingRecords.map((record) => `${record.studentId}:${record.status}:${record.checkInTime ?? ""}:${record.remarks ?? ""}`).join(","),
  ].join("|");
}

function summarizeRoster(
  roster: AttendanceRosterStudent[],
  records: Record<string, DraftRecord>,
  existingByStudent: Map<string, AttendanceRecordSummary>,
) {
  return roster.reduce(
    (summary, student) => {
      const record = records[student.id];
      if (!record || !existingByStudent.has(student.id)) summary.unmarked += 1;
      if (record?.status === "present") summary.present += 1;
      else if (record?.status === "absent") summary.absent += 1;
      else if (record) summary.other += 1;
      return summary;
    },
    { total: roster.length, present: 0, absent: 0, other: 0, unmarked: 0 },
  );
}

function filterRoster(
  roster: AttendanceRosterStudent[],
  records: Record<string, DraftRecord>,
  existingByStudent: Map<string, AttendanceRecordSummary>,
  query: string,
  filter: RosterFilter,
) {
  const normalized = query.trim().toLowerCase();
  return roster.filter((student) => {
    const record = records[student.id];
    const matchesQuery = !normalized || [student.displayName, student.admissionNumber, student.rollNumber].filter(Boolean).join(" ").toLowerCase().includes(normalized);
    if (!matchesQuery) return false;
    if (filter === "all") return true;
    if (filter === "unmarked") return !existingByStudent.has(student.id);
    if (filter === "absent") return record?.status === "absent";
    if (filter === "other") return Boolean(record && record.status !== "present" && record.status !== "absent");
    return !existingByStudent.has(student.id) || Boolean(record && record.status !== "present");
  });
}

function draftRecordsEqual(first: Record<string, DraftRecord>, second: Record<string, DraftRecord>) {
  const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
  for (const key of keys) {
    if (first[key]?.status !== second[key]?.status) return false;
    if (first[key]?.checkInTime !== second[key]?.checkInTime) return false;
    if (first[key]?.remarks !== second[key]?.remarks) return false;
  }
  return true;
}

function uniqueOptions<T extends Record<string, string>>(items: T[], valueKey: keyof T, labelKey: keyof T) {
  const options = new Map<string, string>();
  items.forEach((item) => options.set(item[valueKey], item[labelKey]));
  return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
}

function getFilterLabel(filter: RosterFilter) {
  if (filter === "all") return "All";
  if (filter === "unmarked") return "Unmarked";
  if (filter === "absent") return "Absent";
  if (filter === "other") return "Other";
  return "Exceptions";
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-sky-950";

function statusRowClass(status: AttendanceStatus) {
  if (status === "present") return "border-l-4 border-l-success";
  if (status === "absent") return "border-l-4 border-l-danger";
  return "border-l-4 border-l-warning";
}

function statusCardClass(status: AttendanceStatus) {
  if (status === "present") return "border-l-4 border-l-success";
  if (status === "absent") return "border-l-4 border-l-danger";
  return "border-l-4 border-l-warning";
}

function summaryToneClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
  if (tone === "danger") return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200";
  return "border-border bg-surface-muted text-foreground";
}
