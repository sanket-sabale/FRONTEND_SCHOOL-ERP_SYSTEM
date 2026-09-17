"use client";

import { useActionState } from "react";
import { Button, Card, EmptyState, Field, Select } from "@/components/ui";
import {
  archiveAcademicYearAction,
  createAcademicYearAction,
  updateAcademicYearAction,
  type AcademicActionState,
} from "@/features/academic-structure/actions/academic-structure-actions";
import { academicYearStatuses, type AcademicYear } from "@/features/academic-structure/types/academic-structure";
import { cn } from "@/lib/utils";

const initialState: AcademicActionState = { status: "idle" };

export function AcademicYearCreateForm({ canManage }: { canManage: boolean }) {
  const [state, formAction, pending] = useActionState(createAcademicYearAction, initialState);

  if (!canManage) return null;

  return (
    <Card id="create-academic-year">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Academic Year</p>
        <h2 className="responsive-text text-lg font-semibold text-foreground">Create Academic Year</h2>
      </div>
      <form action={formAction} className="grid gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-5">
        <ActionError state={state} />
        <Field error={state.fieldErrors?.name} label="Name" required>
          <input className={inputClasses} name="name" placeholder="2027-28" required />
        </Field>
        <Field error={state.fieldErrors?.startDate} label="Start date" required>
          <input className={inputClasses} name="startDate" required type="date" />
        </Field>
        <Field error={state.fieldErrors?.endDate} label="End date" required>
          <input className={inputClasses} name="endDate" required type="date" />
        </Field>
        <Field error={state.fieldErrors?.status} label="Status" required>
          <Select name="status" required defaultValue="draft">
            {academicYearStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </Select>
        </Field>
        <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground md:col-span-2 xl:col-span-1 xl:mt-6">
          <input className="h-4 w-4 rounded border-border text-primary focus:ring-primary" name="isCurrent" type="checkbox" />
          Set as current
        </label>
        <div className="md:col-span-2 xl:col-span-5">
          <Button disabled={pending} loading={pending} type="submit">Create Academic Year</Button>
        </div>
      </form>
    </Card>
  );
}

export function AcademicYearList({ academicYears, canManage }: { academicYears: AcademicYear[]; canManage: boolean }) {
  if (academicYears.length === 0) {
    return <EmptyState description="No academic years match the current filters." title="No academic years found" />;
  }

  return (
    <div className="space-y-3">
      <div className="responsive-table-wrap hidden lg:block">
        <table className="responsive-table text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Academic Year</th>
              <th className="px-4 py-3 font-semibold">Dates</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Current</th>
              {canManage ? <th className="px-4 py-3 font-semibold">Manage</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {academicYears.map((academicYear) => (
              <AcademicYearTableRow academicYear={academicYear} canManage={canManage} key={academicYear.id} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 lg:hidden">
        {academicYears.map((academicYear) => (
          <AcademicYearCard academicYear={academicYear} canManage={canManage} key={academicYear.id} />
        ))}
      </div>
    </div>
  );
}

function AcademicYearTableRow({ academicYear, canManage }: { academicYear: AcademicYear; canManage: boolean }) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <p className="font-semibold text-foreground">{academicYear.name}</p>
        <p className="mt-1 font-mono text-xs text-foreground-muted">{academicYear.id}</p>
      </td>
      <td className="px-4 py-4">{academicYear.startDate} to {academicYear.endDate}</td>
      <td className="px-4 py-4"><StatusPill status={academicYear.status} /></td>
      <td className="px-4 py-4">{academicYear.isCurrent ? "Current" : "Historical"}</td>
      {canManage ? <td className="px-4 py-4"><AcademicYearEditForm academicYear={academicYear} /></td> : null}
    </tr>
  );
}

function AcademicYearCard({ academicYear, canManage }: { academicYear: AcademicYear; canManage: boolean }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="responsive-text font-semibold text-foreground">{academicYear.name}</p>
          <p className="mt-1 text-sm text-foreground-muted">{academicYear.startDate} to {academicYear.endDate}</p>
        </div>
        <StatusPill status={academicYear.status} />
      </div>
      <p className="mt-2 text-sm text-foreground-muted">{academicYear.isCurrent ? "Current academic year" : "Historical academic year"}</p>
      {canManage ? <div className="mt-3"><AcademicYearEditForm academicYear={academicYear} /></div> : null}
    </article>
  );
}

function AcademicYearEditForm({ academicYear }: { academicYear: AcademicYear }) {
  const [updateState, updateAction, updatePending] = useActionState(updateAcademicYearAction, initialState);
  const [archiveState, archiveAction, archivePending] = useActionState(archiveAcademicYearAction, initialState);
  const disabled = academicYear.status === "archived";

  return (
    <div className="grid gap-2">
      <form action={updateAction} className="grid gap-2 xl:grid-cols-2">
        <ActionError state={updateState} />
        <input name="id" type="hidden" value={academicYear.id} />
        <label className="grid gap-1 text-xs font-medium text-foreground-muted">
          Name
          <input className={inputClasses} defaultValue={academicYear.name} disabled={disabled} name="name" required />
        </label>
        <label className="grid gap-1 text-xs font-medium text-foreground-muted">
          Status
          <Select defaultValue={academicYear.status} disabled={disabled} name="status">
            {academicYearStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-foreground-muted">
          Start
          <input className={inputClasses} defaultValue={academicYear.startDate} disabled={disabled} name="startDate" required type="date" />
        </label>
        <label className="grid gap-1 text-xs font-medium text-foreground-muted">
          End
          <input className={inputClasses} defaultValue={academicYear.endDate} disabled={disabled} name="endDate" required type="date" />
        </label>
        <label className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 text-xs text-foreground xl:col-span-2">
          <input className="h-4 w-4 rounded border-border text-primary focus:ring-primary" defaultChecked={academicYear.isCurrent} disabled={disabled} name="isCurrent" type="checkbox" />
          Current academic year
        </label>
        <Button className="xl:col-span-2" disabled={disabled || updatePending} loading={updatePending} size="sm" type="submit" variant="secondary">Save</Button>
      </form>
      {academicYear.status !== "archived" ? (
        <form action={archiveAction}>
          <ActionError state={archiveState} />
          <input name="id" type="hidden" value={academicYear.id} />
          <Button disabled={archivePending} loading={archivePending} size="sm" type="submit" variant="ghost">Archive</Button>
        </form>
      ) : null}
    </div>
  );
}

function ActionError({ state }: { state: AcademicActionState }) {
  if (state.status !== "error" || !state.message) return null;
  return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 md:col-span-2 xl:col-span-full">{state.message}</div>;
}

function StatusPill({ status }: { status: AcademicYear["status"] }) {
  const classes = {
    draft: "border-slate-200 bg-slate-50 text-slate-700",
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    closed: "border-amber-200 bg-amber-50 text-amber-700",
    archived: "border-slate-300 bg-slate-100 text-slate-600",
  }[status];

  return <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-medium", classes)}>{formatStatus(status)}</span>;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60";
