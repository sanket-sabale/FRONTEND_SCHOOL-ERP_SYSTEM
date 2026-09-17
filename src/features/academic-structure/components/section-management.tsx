"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useActionState, useMemo, useState } from "react";
import { Button, Card, EmptyState, Field, Select } from "@/components/ui";
import {
  archiveSectionAction,
  createSectionAction,
  restoreSectionAction,
  updateSectionAction,
  type AcademicActionState,
} from "@/features/academic-structure/actions/academic-structure-actions";
import {
  academicStructureStatuses,
  type AcademicClass,
  type AcademicStructureStatus,
  type AcademicYear,
  type Section,
} from "@/features/academic-structure/types/academic-structure";
import type { AcademicRosterSummary } from "@/features/student-placements/types/student-placement";
import { DiscardChangesDialog } from "@/features/students/components/discard-changes-dialog";
import { cn } from "@/lib/utils";

const initialState: AcademicActionState = { status: "idle" };

type SectionContext = {
  academicClass?: AcademicClass;
  academicYear?: AcademicYear;
};

export function SectionCreateForm({
  academicClasses,
  academicYears,
  selectedAcademicYearId,
}: {
  academicClasses: AcademicClass[];
  academicYears: AcademicYear[];
  selectedAcademicYearId: string;
}) {
  const [state, formAction, pending] = useActionState(createSectionAction, initialState);
  const eligibleYears = academicYears.filter((year) => year.status !== "archived" && year.status !== "closed");
  const initialYearId = eligibleYears.some((year) => year.id === selectedAcademicYearId)
    ? selectedAcademicYearId
    : eligibleYears[0]?.id ?? "";
  const [academicYearId, setAcademicYearId] = useState(initialYearId);
  const eligibleClasses = useMemo(
    () => academicClasses.filter((academicClass) => academicClass.academicYearId === academicYearId && academicClass.status === "active"),
    [academicClasses, academicYearId],
  );
  const [classId, setClassId] = useState(eligibleClasses[0]?.id ?? "");

  function handleYearChange(nextAcademicYearId: string) {
    setAcademicYearId(nextAcademicYearId);
    const nextClass = academicClasses.find(
      (academicClass) => academicClass.academicYearId === nextAcademicYearId && academicClass.status === "active",
    );
    setClassId(nextClass?.id ?? "");
  }

  return (
    <Card>
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Section Catalog</p>
        <h2 className="responsive-text text-lg font-semibold text-foreground">Create Section</h2>
      </div>
      <form action={formAction} className="grid gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
        <ActionError state={state} />
        <Field error={state.fieldErrors?.academicYearId} label="Academic year" required>
          <Select
            disabled={pending || eligibleYears.length === 0}
            name="academicYearId"
            onChange={(event) => handleYearChange(event.target.value)}
            required
            value={academicYearId}
          >
            {eligibleYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </Select>
        </Field>
        <Field error={state.fieldErrors?.classId} helperText={eligibleClasses.length === 0 ? "No active classes are available for this academic year." : undefined} label="Class" required>
          <Select
            disabled={pending || eligibleClasses.length === 0}
            name="classId"
            onChange={(event) => setClassId(event.target.value)}
            required
            value={classId}
          >
            {eligibleClasses.map((academicClass) => <option key={academicClass.id} value={academicClass.id}>{academicClass.displayName}</option>)}
          </Select>
        </Field>
        <Field error={state.fieldErrors?.name} label="Section name" required>
          <input className={inputClasses} disabled={pending} name="name" placeholder="A" required />
        </Field>
        <Field error={state.fieldErrors?.displayName} label="Display name" required>
          <input className={inputClasses} disabled={pending} name="displayName" placeholder="Section A" required />
        </Field>
        <Field error={state.fieldErrors?.capacity} label="Capacity">
          <input className={inputClasses} disabled={pending} min="1" name="capacity" placeholder="40" type="number" />
        </Field>
        <Field error={state.fieldErrors?.roomId} label="Room">
          <input className={inputClasses} disabled={pending} name="roomId" placeholder="room-201" />
        </Field>
        <Field error={state.fieldErrors?.classTeacherId} label="Class teacher">
          <input className={inputClasses} disabled={pending} name="classTeacherId" placeholder="teacher-id" />
        </Field>
        <Field error={state.fieldErrors?.status} label="Status" required>
          <Select defaultValue="active" disabled={pending} name="status" required>
            {academicStructureStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </Select>
        </Field>
        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
          <Button disabled={pending || !academicYearId || !classId} loading={pending} type="submit">Create Section</Button>
          <LinkButton href="/academics/sections">Cancel</LinkButton>
        </div>
      </form>
    </Card>
  );
}

export function SectionList({
  canManage,
  sectionContexts,
  sections,
}: {
  canManage: boolean;
  sectionContexts: Record<string, SectionContext>;
  sections: Section[];
}) {
  if (sections.length === 0) {
    return (
      <EmptyState
        description="No sections match the current filters. Sections can exist before students, attendance, or guardian records reference them."
        title="No sections found"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="responsive-table-wrap hidden lg:block">
        <table className="responsive-table text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Section</th>
              <th className="px-4 py-3 font-semibold">Class</th>
              <th className="px-4 py-3 font-semibold">Academic Year</th>
              <th className="px-4 py-3 font-semibold">Capacity</th>
              <th className="px-4 py-3 font-semibold">Room</th>
              <th className="px-4 py-3 font-semibold">Class Teacher</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sections.map((section) => (
              <tr className="align-top" key={section.id}>
                <td className="px-4 py-4">
                  <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={`/academics/sections/${section.id}`}>
                    {section.displayName}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-foreground-muted">{section.id}</p>
                </td>
                <td className="px-4 py-4">{sectionContexts[section.id]?.academicClass?.displayName ?? "Unknown class"}</td>
                <td className="px-4 py-4">{sectionContexts[section.id]?.academicYear?.name ?? section.academicYearId}</td>
                <td className="px-4 py-4">{formatOptional(section.capacity)}</td>
                <td className="px-4 py-4">{section.roomId ?? "Not assigned"}</td>
                <td className="px-4 py-4">{section.classTeacherId ?? "Not assigned"}</td>
                <td className="px-4 py-4"><StatusPill status={section.status} /></td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <LinkButton href={`/academics/sections/${section.id}`}>View</LinkButton>
                    {canManage ? <LinkButton href={`/academics/sections/${section.id}/edit`}>Edit</LinkButton> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 lg:hidden">
        {sections.map((section) => (
          <article className="rounded-lg border border-border bg-surface p-3" key={section.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="responsive-text font-semibold text-primary underline-offset-4 hover:underline" href={`/academics/sections/${section.id}`}>
                  {section.displayName}
                </Link>
                <p className="mt-1 text-sm text-foreground-muted">
                  {sectionContexts[section.id]?.academicClass?.displayName ?? "Unknown class"} / {sectionContexts[section.id]?.academicYear?.name ?? section.academicYearId}
                </p>
              </div>
              <StatusPill status={section.status} />
            </div>
            <dl className="mt-3 grid gap-2 text-sm min-[480px]:grid-cols-2">
              <InfoLine label="Capacity" value={formatOptional(section.capacity)} />
              <InfoLine label="Room" value={section.roomId ?? "Not assigned"} />
              <InfoLine label="Class Teacher" value={section.classTeacherId ?? "Not assigned"} />
              <InfoLine label="Name" value={section.name} />
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <LinkButton href={`/academics/sections/${section.id}`}>View</LinkButton>
              {canManage ? <LinkButton href={`/academics/sections/${section.id}/edit`}>Edit</LinkButton> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function SectionEditForm({
  academicClass,
  academicYear,
  section,
}: {
  academicClass: AcademicClass;
  academicYear: AcademicYear;
  section: Section;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateSectionAction, initialState);
  const [values, setValues] = useState({
    name: section.name,
    displayName: section.displayName,
    capacity: section.capacity?.toString() ?? "",
    roomId: section.roomId ?? "",
    classTeacherId: section.classTeacherId ?? "",
    status: section.status,
  });
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const isDirty = values.name !== section.name
    || values.displayName !== section.displayName
    || values.capacity !== (section.capacity?.toString() ?? "")
    || values.roomId !== (section.roomId ?? "")
    || values.classTeacherId !== (section.classTeacherId ?? "")
    || values.status !== section.status;

  function updateValue(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleCancel() {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    router.push(`/academics/sections/${section.id}`);
  }

  return (
    <>
      <Card>
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Section Catalog</p>
          <h2 className="responsive-text text-lg font-semibold text-foreground">Edit {section.displayName}</h2>
        </div>
        <form action={formAction} className="grid gap-3 p-4 sm:p-5 md:grid-cols-2">
          <ActionError state={state} />
          <input name="id" type="hidden" value={section.id} />
          <input name="academicYearId" type="hidden" value={section.academicYearId} />
          <ReadOnlyField label="Academic year" value={academicYear.name} />
          <ReadOnlyField label="Class" value={academicClass.displayName} />
          <Field error={state.fieldErrors?.name} label="Section name" required>
            <input className={inputClasses} disabled={pending} name="name" onChange={(event) => updateValue("name", event.target.value)} required value={values.name} />
          </Field>
          <Field error={state.fieldErrors?.displayName} label="Display name" required>
            <input className={inputClasses} disabled={pending} name="displayName" onChange={(event) => updateValue("displayName", event.target.value)} required value={values.displayName} />
          </Field>
          <Field error={state.fieldErrors?.capacity} label="Capacity">
            <input className={inputClasses} disabled={pending} min="1" name="capacity" onChange={(event) => updateValue("capacity", event.target.value)} type="number" value={values.capacity} />
          </Field>
          <Field error={state.fieldErrors?.roomId} label="Room">
            <input className={inputClasses} disabled={pending} name="roomId" onChange={(event) => updateValue("roomId", event.target.value)} value={values.roomId} />
          </Field>
          <Field error={state.fieldErrors?.classTeacherId} label="Class teacher">
            <input className={inputClasses} disabled={pending} name="classTeacherId" onChange={(event) => updateValue("classTeacherId", event.target.value)} value={values.classTeacherId} />
          </Field>
          <Field error={state.fieldErrors?.status} label="Status" required>
            <Select disabled={pending} name="status" onChange={(event) => updateValue("status", event.target.value)} required value={values.status}>
              {academicStructureStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
            </Select>
          </Field>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button disabled={pending || !isDirty} loading={pending} type="submit">Save Section</Button>
            <Button onClick={handleCancel} type="button" variant="secondary">Cancel</Button>
          </div>
        </form>
      </Card>
      {showDiscardDialog ? (
        <DiscardChangesDialog
          onCancel={() => setShowDiscardDialog(false)}
          onConfirm={() => router.push(`/academics/sections/${section.id}`)}
        />
      ) : null}
    </>
  );
}

export function SectionDetailCard({
  academicClass,
  academicYear,
  canManage,
  roster,
  section,
}: {
  academicClass: AcademicClass;
  academicYear: AcademicYear;
  canManage: boolean;
  roster: AcademicRosterSummary;
  section: Section;
}) {
  return (
    <Card>
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Section Detail</p>
            <h2 className="responsive-text text-xl font-semibold text-foreground">{section.displayName}</h2>
            <p className="mt-1 font-mono text-xs text-foreground-muted">{section.id}</p>
          </div>
          <StatusPill status={section.status} />
        </div>
      </div>
      <dl className="grid gap-3 p-4 text-sm sm:p-5 md:grid-cols-2 xl:grid-cols-3">
        <InfoLine label="Academic year" value={academicYear.name} />
        <InfoLine label="Class" value={academicClass.displayName} />
        <InfoLine label="Section name" value={section.name} />
        <InfoLine label="Capacity" value={formatOptional(section.capacity)} />
        <InfoLine label="Room" value={section.roomId ?? "Not assigned"} />
        <InfoLine label="Class teacher" value={section.classTeacherId ?? "Not assigned"} />
        <InfoLine label="Tenant" value={section.tenantId} />
        <InfoLine label="School" value={section.schoolId} />
        <InfoLine label="Campus" value={section.campusId} />
      </dl>
      <div className="flex flex-wrap gap-2 border-t border-border p-4 sm:p-5">
        <LinkButton href="/academics/sections">Back to Sections</LinkButton>
        {canManage ? <LinkButton href={`/academics/sections/${section.id}/edit`}>Edit Section</LinkButton> : null}
        {canManage ? <SectionLifecycleActions section={section} /> : null}
      </div>
      <div className="border-t border-border p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Current Student Roster</p>
            <h3 className="responsive-text text-lg font-semibold text-foreground">{roster.activeStudentCount.toLocaleString("en-IN")} active placement{roster.activeStudentCount === 1 ? "" : "s"}</h3>
          </div>
          <LinkButton href={`/academics/student-placements?academicYearId=${section.academicYearId}&classId=${section.classId}&sectionId=${section.id}&status=active`}>
            Open Placement Directory
          </LinkButton>
        </div>
        <SectionRoster roster={roster} />
      </div>
    </Card>
  );
}

function SectionRoster({ roster }: { roster: AcademicRosterSummary }) {
  if (roster.students.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState description="No students currently have an active placement in this section." title="No current students" />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="responsive-table-wrap hidden lg:block">
        <table className="responsive-table text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Admission</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Effective From</th>
              <th className="px-4 py-3 font-semibold">Guardian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {roster.students.map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-4">
                  <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={`/students/${student.studentId}`}>
                    {student.studentName}
                  </Link>
                </td>
                <td className="px-4 py-4">{student.admissionNumber}</td>
                <td className="px-4 py-4">{formatStatus(student.status)}</td>
                <td className="px-4 py-4">{student.startDate}</td>
                <td className="px-4 py-4">{student.primaryGuardianName ?? "Not linked"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 lg:hidden">
        {roster.students.map((student) => (
          <article className="rounded-lg border border-border bg-surface p-3" key={student.id}>
            <Link className="responsive-text font-semibold text-primary underline-offset-4 hover:underline" href={`/students/${student.studentId}`}>
              {student.studentName}
            </Link>
            <p className="mt-1 text-sm text-foreground-muted">{student.admissionNumber} / {formatStatus(student.status)}</p>
            <p className="mt-1 text-sm text-foreground-muted">Effective from {student.startDate}</p>
            <p className="mt-1 text-sm text-foreground-muted">Guardian: {student.primaryGuardianName ?? "Not linked"}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function SectionLifecycleActions({ section }: { section: Section }) {
  const [archiveState, archiveAction, archivePending] = useActionState(archiveSectionAction, initialState);
  const [restoreState, restoreAction, restorePending] = useActionState(restoreSectionAction, initialState);

  if (section.status === "archived") {
    return (
      <form action={restoreAction}>
        <ActionError state={restoreState} />
        <input name="id" type="hidden" value={section.id} />
        <input name="academicYearId" type="hidden" value={section.academicYearId} />
        <Button disabled={restorePending} loading={restorePending} type="submit" variant="secondary">Restore Section</Button>
      </form>
    );
  }

  return (
    <form action={archiveAction}>
      <ActionError state={archiveState} />
      <input name="id" type="hidden" value={section.id} />
      <input name="academicYearId" type="hidden" value={section.academicYearId} />
      <Button disabled={archivePending} loading={archivePending} type="submit" variant="ghost">Archive Section</Button>
    </form>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
      <span className="font-medium text-foreground-muted">{label}</span>
      <span className="responsive-text font-semibold text-foreground">{value}</span>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className="responsive-text font-medium text-foreground">{value}</dd>
    </div>
  );
}

function ActionError({ state }: { state: AcademicActionState }) {
  if (state.status !== "error" || !state.message) return null;
  return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 md:col-span-full">{state.message}</div>;
}

function StatusPill({ status }: { status: AcademicStructureStatus }) {
  const classes = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    inactive: "border-amber-200 bg-amber-50 text-amber-700",
    archived: "border-slate-300 bg-slate-100 text-slate-600",
  }[status];

  return <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-medium", classes)}>{formatStatus(status)}</span>;
}

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={href}>
      {children}
    </Link>
  );
}

function formatOptional(value?: number) {
  return typeof value === "number" ? value.toLocaleString("en-IN") : "Not set";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60";
