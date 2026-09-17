"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { markStaffAttendanceAction, type StaffAttendanceActionState } from "@/features/staff-attendance/actions/staff-attendance-actions";
import { StaffAttendanceStatusBadge } from "@/features/staff-attendance/components/staff-attendance-status-badge";
import { getStaffAttendanceStatusLabel } from "@/features/staff-attendance/services/staff-attendance-rules";
import { staffAttendanceStatuses, type StaffAttendanceStatus, type StaffAttendanceSummaryRecord } from "@/features/staff-attendance/types/staff-attendance";
import type { StaffDepartmentSummary, StaffDesignationSummary, StaffSummary } from "@/features/staff/types/staff";
import { cn } from "@/lib/utils";

type Draft = { status: StaffAttendanceStatus; checkIn: string; checkOut: string; remarks: string };

type StaffAttendanceWorkstationProps = {
  context: { school: string; campus: string; academicYear: string };
  date: string;
  departments: StaffDepartmentSummary[];
  designations: StaffDesignationSummary[];
  existingRecords: StaffAttendanceSummaryRecord[];
  roster: StaffSummary[];
  selectedDepartmentId?: string;
};

const initialState: StaffAttendanceActionState = { status: "idle" };

export function StaffAttendanceWorkstation({ context, date, departments, existingRecords, roster, selectedDepartmentId }: StaffAttendanceWorkstationProps) {
  const [state, formAction, pending] = useActionState(markStaffAttendanceAction, initialState);
  const existingByStaff = useMemo(() => new Map(existingRecords.map((record) => [record.staffId, record])), [existingRecords]);
  const [query, setQuery] = useState("");
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(roster.map((staff) => {
    const existing = existingByStaff.get(staff.id);
    return [staff.id, { status: existing?.status ?? "present", checkIn: existing?.checkIn ?? "", checkOut: existing?.checkOut ?? "", remarks: existing?.remarks ?? "" }];
  })));
  const visibleRoster = roster.filter((staff) => [staff.displayName, staff.employeeNumber, staff.departmentName, staff.designationName].join(" ").toLowerCase().includes(query.toLowerCase()));
  const summary = summarize(roster, drafts, existingByStaff);

  function updateDraft(staffId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [staffId]: { ...current[staffId], ...patch } }));
  }

  return (
    <div className="erp-container space-y-4 pb-24 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Staff", "Attendance"]} />}
        description="Mark staff attendance quickly with present/absent first and advanced exceptions tucked into row details."
        eyebrow="Staff Attendance"
        title="Staff Attendance"
        action={<Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/staff/attendance/history">History</Link>}
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="grid gap-2 text-sm">
            <ContextLine label="School" value={context.school} />
            <ContextLine label="Campus" value={context.campus} />
            <ContextLine label="Academic Year" value={context.academicYear} />
          </div>
        </Card>
      </PageHeader>

      <Card className="overflow-hidden">
        <form action="/staff/attendance" className="grid gap-3 border-b border-border p-3 sm:p-4 md:grid-cols-3">
          <Field label="Date">
            <input className={inputClasses} name="date" type="date" defaultValue={date} />
          </Field>
          <Field label="Department">
            <Select name="departmentId" defaultValue={selectedDepartmentId ?? ""}>
              <option value="">All departments</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="secondary">Apply</Button>
          </div>
        </form>
        <div className="flex flex-col gap-3 p-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
          <AttendanceSummary summary={summary} />
          <div className="responsive-action-row">
            <Button onClick={() => setDrafts(Object.fromEntries(roster.map((staff) => [staff.id, { ...drafts[staff.id], status: "present" as const }]))) } variant="secondary">Mark all present</Button>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/staff/leave">Leave Queue</Link>
          </div>
        </div>
      </Card>

      <form action={formAction}>
        <input name="attendanceDate" type="hidden" value={date} />
        {roster.map((staff) => <HiddenFields draft={drafts[staff.id]} key={staff.id} staff={staff} />)}

        <Card>
          <SectionHeader eyebrow="Roster" title={`${visibleRoster.length.toLocaleString("en-IN")} staff shown`} />
          <div className="border-b border-border p-3 sm:p-4">
            <Field label="Search staff">
              <input className={inputClasses} onChange={(event) => setQuery(event.target.value)} placeholder="Name or employee number" type="search" value={query} />
            </Field>
          </div>
          {state.status !== "idle" && state.message ? <div className={cn("m-3 rounded-lg border p-3 text-sm font-medium", state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200")}>{state.message}</div> : null}
          {visibleRoster.length === 0 ? (
            <div className="p-4 sm:p-5"><EmptyState description="Try changing filters or search." title="No staff found" /></div>
          ) : (
            <div className="grid gap-3 p-3">
              {visibleRoster.map((staff) => (
                <StaffAttendanceRow
                  draft={drafts[staff.id]}
                  expanded={expandedStaffId === staff.id}
                  key={staff.id}
                  onExpand={() => setExpandedStaffId((current) => current === staff.id ? null : staff.id)}
                  onUpdate={(patch) => updateDraft(staff.id, patch)}
                  staff={staff}
                />
              ))}
            </div>
          )}
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-3 py-3 shadow-[0_-8px_24px_rgb(15_23_42/0.08)] backdrop-blur sm:px-5">
          <div className="erp-container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AttendanceSummary compact summary={summary} />
            <Button loading={pending} type="submit">Save Attendance</Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function StaffAttendanceRow({ draft, expanded, onExpand, onUpdate, staff }: { draft?: Draft; expanded: boolean; onExpand: () => void; onUpdate: (patch: Partial<Draft>) => void; staff: StaffSummary }) {
  if (!draft) return null;
  return (
    <article className="rounded-lg border border-border bg-surface p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_260px_auto] lg:items-center">
        <div className="min-w-0">
          <p className="responsive-text font-semibold text-foreground">{staff.displayName}</p>
          <p className="mt-1 font-mono text-xs text-foreground-muted">{staff.employeeNumber}</p>
          <p className="mt-1 text-xs text-foreground-muted">{staff.departmentName} / {staff.designationName}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["present", "absent"] as const).map((status) => <Button aria-pressed={draft.status === status} key={status} onClick={() => onUpdate({ status })} selected={draft.status === status} variant={draft.status === status ? status === "present" ? "primary" : "destructive" : "secondary"}>{getStaffAttendanceStatusLabel(status)}</Button>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
          <StaffAttendanceStatusBadge status={draft.status} />
          <Button aria-expanded={expanded} onClick={onExpand} variant="ghost">More</Button>
        </div>
      </div>
      {expanded ? (
        <div className="mt-3 grid gap-3 rounded-lg border border-border bg-surface-muted p-3 md:grid-cols-4">
          <Field label="Status">
            <Select onChange={(event) => onUpdate({ status: event.target.value as StaffAttendanceStatus })} value={draft.status}>
              {staffAttendanceStatuses.map((status) => <option key={status} value={status}>{getStaffAttendanceStatusLabel(status)}</option>)}
            </Select>
          </Field>
          <Field label="Check-in"><input className={inputClasses} onChange={(event) => onUpdate({ checkIn: event.target.value })} type="time" value={draft.checkIn} /></Field>
          <Field label="Check-out"><input className={inputClasses} onChange={(event) => onUpdate({ checkOut: event.target.value })} type="time" value={draft.checkOut} /></Field>
          <Field label="Remarks"><input className={inputClasses} onChange={(event) => onUpdate({ remarks: event.target.value })} value={draft.remarks} /></Field>
        </div>
      ) : null}
    </article>
  );
}

function HiddenFields({ draft, staff }: { draft?: Draft; staff: StaffSummary }) {
  if (!draft) return null;
  return (
    <>
      <input name="staffId" type="hidden" value={staff.id} />
      <input name={`status:${staff.id}`} type="hidden" value={draft.status} />
      <input name={`checkIn:${staff.id}`} type="hidden" value={draft.checkIn} />
      <input name={`checkOut:${staff.id}`} type="hidden" value={draft.checkOut} />
      <input name={`remarks:${staff.id}`} type="hidden" value={draft.remarks} />
    </>
  );
}

function AttendanceSummary({ compact = false, summary }: { compact?: boolean; summary: ReturnType<typeof summarize> }) {
  const items = [
    ["Total", summary.total],
    ["Present", summary.present],
    ["Absent", summary.absent],
    ["Late", summary.late],
    ["Half-day", summary.halfDay],
    ["Leave", summary.leave],
    ["Unmarked", summary.unmarked],
  ] as const;
  return <dl className={cn("flex flex-wrap gap-2", compact ? "text-xs" : "text-sm")}>{items.map(([label, value]) => <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted px-2.5 py-1.5" key={label}><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>;
}

function summarize(roster: StaffSummary[], drafts: Record<string, Draft>, existingByStaff: Map<string, StaffAttendanceSummaryRecord>) {
  const summary = { total: roster.length, present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, unmarked: 0 };
  roster.forEach((staff) => {
    const draft = drafts[staff.id];
    if (!existingByStaff.has(staff.id)) summary.unmarked += 1;
    if (draft?.status === "present") summary.present += 1;
    if (draft?.status === "absent") summary.absent += 1;
    if (draft?.status === "late") summary.late += 1;
    if (draft?.status === "half_day") summary.halfDay += 1;
    if (draft?.status === "leave") summary.leave += 1;
  });
  return summary;
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center"><span className="text-foreground-muted">{label}</span><span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span></div>;
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
