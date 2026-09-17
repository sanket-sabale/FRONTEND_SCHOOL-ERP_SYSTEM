"use client";

import { useActionState } from "react";
import { Button, Field, Select } from "@/components/ui";
import { changeStaffAcademicAssignmentStatusAction, type StaffAcademicAssignmentActionState } from "@/features/staff-academic-assignments/actions/staff-academic-assignment-actions";
import { staffAcademicAssignmentStatusLabels } from "@/features/staff-academic-assignments/services/staff-academic-assignment-rules";
import { staffAcademicAssignmentStatuses, type StaffAcademicAssignmentListItem } from "@/features/staff-academic-assignments/types/staff-academic-assignment";

const initialState: StaffAcademicAssignmentActionState = { status: "idle" };
const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";

export function StaffAcademicAssignmentStatusForm({ assignment }: { assignment: StaffAcademicAssignmentListItem }) {
  const [state, formAction, pending] = useActionState(changeStaffAcademicAssignmentStatusAction, initialState);
  return (
    <form action={formAction} className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3">
      <input name="assignmentId" type="hidden" value={assignment.id} />
      <input name="staffId" type="hidden" value={assignment.staffId} />
      <input name="academicYearId" type="hidden" value={assignment.academicYearId} />
      {state.message ? <p className={state.status === "success" ? successClasses : errorClasses}>{state.message}</p> : null}
      <Field label="Change status">
        <Select defaultValue={assignment.status} name="status">
          {staffAcademicAssignmentStatuses.map((status) => <option key={status} value={status}>{staffAcademicAssignmentStatusLabels[status]}</option>)}
        </Select>
      </Field>
      <Field label="End date">
        <input className={inputClasses} name="endDate" type="date" />
      </Field>
      <Button disabled={pending || state.status === "success"} loading={pending} type="submit" variant="secondary">Update Status</Button>
    </form>
  );
}

const successClasses = "rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
const errorClasses = "rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300";
