"use client";

import { useActionState } from "react";
import { Button, Card, EmptyState, Field, Select } from "@/components/ui";
import {
  archiveAcademicClassAction,
  createAcademicClassAction,
  updateAcademicClassAction,
  type AcademicActionState,
} from "@/features/academic-structure/actions/academic-structure-actions";
import {
  academicStructureStatuses,
  type AcademicClass,
  type AcademicStructureStatus,
  type AcademicYear,
  type Section,
} from "@/features/academic-structure/types/academic-structure";
import { cn } from "@/lib/utils";

const initialState: AcademicActionState = { status: "idle" };

export function AcademicClassCreateForm({
  academicYears,
  canManage,
  selectedAcademicYearId,
}: {
  academicYears: AcademicYear[];
  canManage: boolean;
  selectedAcademicYearId: string;
}) {
  const [state, formAction, pending] = useActionState(createAcademicClassAction, initialState);
  const eligibleYears = academicYears.filter((year) => year.status !== "archived");

  if (!canManage) return null;

  return (
    <Card id="create-class">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Class Catalog</p>
        <h2 className="responsive-text text-lg font-semibold text-foreground">Create Class</h2>
      </div>
      <form action={formAction} className="grid gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-5">
        <ActionError state={state} />
        <Field error={state.fieldErrors?.academicYearId} label="Academic year" required>
          <Select defaultValue={selectedAcademicYearId} name="academicYearId" required>
            {eligibleYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </Select>
        </Field>
        <Field error={state.fieldErrors?.code} label="Code" required>
          <input className={inputClasses} name="code" placeholder="grade-11" required />
        </Field>
        <Field error={state.fieldErrors?.displayName} label="Display name" required>
          <input className={inputClasses} name="displayName" placeholder="Grade 11" required />
        </Field>
        <Field error={state.fieldErrors?.sortOrder} label="Sort order" required>
          <input className={inputClasses} min="0" name="sortOrder" required type="number" />
        </Field>
        <Field error={state.fieldErrors?.status} label="Status" required>
          <Select defaultValue="active" name="status" required>
            {academicStructureStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </Select>
        </Field>
        <div className="md:col-span-2 xl:col-span-5">
          <Button disabled={pending || eligibleYears.length === 0} loading={pending} type="submit">Create Class</Button>
        </div>
      </form>
    </Card>
  );
}

export function AcademicClassList({
  academicClasses,
  canManage,
  sectionCounts,
  studentCounts,
}: {
  academicClasses: AcademicClass[];
  canManage: boolean;
  sectionCounts: Record<string, number>;
  studentCounts: Record<string, number>;
}) {
  if (academicClasses.length === 0) {
    return <EmptyState description="No classes match the current filters. Classes can exist even before students are assigned." title="No classes found" />;
  }

  return (
    <div className="space-y-3">
      <div className="responsive-table-wrap hidden lg:block">
        <table className="responsive-table text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Class</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Sort</th>
              <th className="px-4 py-3 font-semibold">Sections</th>
              <th className="px-4 py-3 font-semibold">Students</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              {canManage ? <th className="px-4 py-3 font-semibold">Manage</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {academicClasses.map((academicClass) => (
              <AcademicClassTableRow
                academicClass={academicClass}
                canManage={canManage}
                key={academicClass.id}
                sectionCount={sectionCounts[academicClass.id] ?? 0}
                studentCount={studentCounts[academicClass.id] ?? 0}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 lg:hidden">
        {academicClasses.map((academicClass) => (
          <AcademicClassCard
            academicClass={academicClass}
            canManage={canManage}
            key={academicClass.id}
            sectionCount={sectionCounts[academicClass.id] ?? 0}
            studentCount={studentCounts[academicClass.id] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

export function buildSectionCounts(sections: Section[]) {
  return sections.reduce<Record<string, number>>((counts, section) => {
    counts[section.classId] = (counts[section.classId] ?? 0) + 1;
    return counts;
  }, {});
}

function AcademicClassTableRow({ academicClass, canManage, sectionCount, studentCount }: { academicClass: AcademicClass; canManage: boolean; sectionCount: number; studentCount: number }) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <p className="font-semibold text-foreground">{academicClass.displayName}</p>
        <p className="mt-1 font-mono text-xs text-foreground-muted">{academicClass.id}</p>
      </td>
      <td className="px-4 py-4">{academicClass.code}</td>
      <td className="px-4 py-4">{academicClass.sortOrder}</td>
      <td className="px-4 py-4">{sectionCount}</td>
      <td className="px-4 py-4">{studentCount}</td>
      <td className="px-4 py-4"><StatusPill status={academicClass.status} /></td>
      {canManage ? <td className="px-4 py-4"><AcademicClassEditForm academicClass={academicClass} sectionCount={sectionCount} /></td> : null}
    </tr>
  );
}

function AcademicClassCard({ academicClass, canManage, sectionCount, studentCount }: { academicClass: AcademicClass; canManage: boolean; sectionCount: number; studentCount: number }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="responsive-text font-semibold text-foreground">{academicClass.displayName}</p>
          <p className="mt-1 text-sm text-foreground-muted">{academicClass.code} / Sort {academicClass.sortOrder}</p>
        </div>
        <StatusPill status={academicClass.status} />
      </div>
      <p className="mt-2 text-sm text-foreground-muted">{sectionCount} active section{sectionCount === 1 ? "" : "s"} / {studentCount} placed student{studentCount === 1 ? "" : "s"}</p>
      {canManage ? <div className="mt-3"><AcademicClassEditForm academicClass={academicClass} sectionCount={sectionCount} /></div> : null}
    </article>
  );
}

function AcademicClassEditForm({ academicClass, sectionCount }: { academicClass: AcademicClass; sectionCount: number }) {
  const [updateState, updateAction, updatePending] = useActionState(updateAcademicClassAction, initialState);
  const [archiveState, archiveAction, archivePending] = useActionState(archiveAcademicClassAction, initialState);
  const disabled = academicClass.status === "archived";

  return (
    <div className="grid gap-2">
      <form action={updateAction} className="grid gap-2 xl:grid-cols-2">
        <ActionError state={updateState} />
        <input name="id" type="hidden" value={academicClass.id} />
        <input name="academicYearId" type="hidden" value={academicClass.academicYearId} />
        <label className="grid gap-1 text-xs font-medium text-foreground-muted">
          Code
          <input className={inputClasses} defaultValue={academicClass.code} disabled={disabled} name="code" required />
        </label>
        <label className="grid gap-1 text-xs font-medium text-foreground-muted">
          Name
          <input className={inputClasses} defaultValue={academicClass.displayName} disabled={disabled} name="displayName" required />
        </label>
        <label className="grid gap-1 text-xs font-medium text-foreground-muted">
          Sort
          <input className={inputClasses} defaultValue={academicClass.sortOrder} disabled={disabled} min="0" name="sortOrder" required type="number" />
        </label>
        <label className="grid gap-1 text-xs font-medium text-foreground-muted">
          Status
          <Select defaultValue={academicClass.status} disabled={disabled} name="status">
            {academicStructureStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </Select>
        </label>
        <Button className="xl:col-span-2" disabled={disabled || updatePending} loading={updatePending} size="sm" type="submit" variant="secondary">Save</Button>
      </form>
      {academicClass.status !== "archived" ? (
        <form action={archiveAction}>
          <ActionError state={archiveState} />
          <input name="id" type="hidden" value={academicClass.id} />
          <input name="academicYearId" type="hidden" value={academicClass.academicYearId} />
          <Button disabled={archivePending || sectionCount > 0} loading={archivePending} size="sm" type="submit" variant="ghost">
            {sectionCount > 0 ? "Archive blocked by sections" : "Archive"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function ActionError({ state }: { state: AcademicActionState }) {
  if (state.status !== "error" || !state.message) return null;
  return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 xl:col-span-full">{state.message}</div>;
}

function StatusPill({ status }: { status: AcademicStructureStatus }) {
  const classes = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    inactive: "border-amber-200 bg-amber-50 text-amber-700",
    archived: "border-slate-300 bg-slate-100 text-slate-600",
  }[status];

  return <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-medium", classes)}>{formatStatus(status)}</span>;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60";
