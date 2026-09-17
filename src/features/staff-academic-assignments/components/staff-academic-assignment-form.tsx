"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Card, Field, Select, SectionHeader } from "@/components/ui";
import { createStaffAcademicAssignmentAction, type StaffAcademicAssignmentActionState } from "@/features/staff-academic-assignments/actions/staff-academic-assignment-actions";
import { staffAcademicAssignmentStatusLabels, staffAcademicAssignmentTypeLabels } from "@/features/staff-academic-assignments/services/staff-academic-assignment-rules";
import { staffAcademicAssignmentStatuses, staffAcademicAssignmentTypes, type StaffAcademicAssignmentOptions } from "@/features/staff-academic-assignments/types/staff-academic-assignment";

const initialState: StaffAcademicAssignmentActionState = { status: "idle" };
const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";

export function StaffAcademicAssignmentForm({ options, staffId }: { options: StaffAcademicAssignmentOptions; staffId: string }) {
  const [state, formAction, pending] = useActionState(createStaffAcademicAssignmentAction, initialState);
  return (
    <Card>
      <SectionHeader eyebrow="Academic Assignment" title="Create Assignment" />
      <form action={formAction} className="grid gap-4 p-4 sm:p-5">
        <input name="staffId" type="hidden" value={staffId} />
        {state.message ? <p className={state.status === "success" ? successClasses : errorClasses}>{state.message}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Academic year" required><Select name="academicYearId">{options.academicYears.map((year) => <option key={year.id} value={year.id}>{year.name} / {year.status}</option>)}</Select></Field>
          <Field label="Class" required><Select name="classId">{options.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Section" required><Select name="sectionId">{options.sections.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.classId}</option>)}</Select></Field>
          <Field label="Subject" required><Select name="subjectId">{options.subjects.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.status}</option>)}</Select></Field>
          <Field label="Assignment type" required><Select name="assignmentType">{staffAcademicAssignmentTypes.map((type) => <option key={type} value={type}>{staffAcademicAssignmentTypeLabels[type]}</option>)}</Select></Field>
          <Field label="Status" required><Select name="status">{staffAcademicAssignmentStatuses.map((status) => <option key={status} value={status}>{staffAcademicAssignmentStatusLabels[status]}</option>)}</Select></Field>
          <Field label="Start date" required><input className={inputClasses} name="startDate" type="date" /></Field>
          <Field label="End date"><input className={inputClasses} name="endDate" type="date" /></Field>
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 text-sm font-medium text-foreground">
          <input className="h-4 w-4" name="isPrimary" type="checkbox" />
          Primary responsibility
        </label>
        <Field label="Notes"><textarea className={`${inputClasses} min-h-24 py-2`} name="notes" /></Field>
        <div className="responsive-action-row">
          <Button disabled={pending || state.status === "success"} loading={pending} type="submit">Create Assignment</Button>
          <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staffId)}/academic-assignments`}>View Assignments</Link>
        </div>
      </form>
    </Card>
  );
}

const successClasses = "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
const errorClasses = "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200";
