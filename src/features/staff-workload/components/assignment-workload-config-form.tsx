"use client";

import { useActionState } from "react";
import { Button, Field, Select } from "@/components/ui";
import { configureAssignmentWorkloadAction, type StaffWorkloadActionState } from "@/features/staff-workload/actions/staff-workload-actions";
import type { AssignmentWorkloadConfig } from "@/features/staff-workload/types/staff-workload";

const initialState: StaffWorkloadActionState = { status: "idle" };

export function AssignmentWorkloadConfigForm({
  academicYearId,
  assignmentId,
  config,
}: {
  academicYearId: string;
  assignmentId: string;
  config?: AssignmentWorkloadConfig | null;
}) {
  const [state, action, pending] = useActionState(configureAssignmentWorkloadAction, initialState);

  return (
    <form action={action} className="grid gap-4">
      <input name="assignmentId" type="hidden" value={assignmentId} />
      <input name="academicYearId" type="hidden" value={academicYearId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field helperText="Leave empty when workload is not configured yet." label="Weekly periods">
          <input
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950"
            defaultValue={config?.weeklyPeriods ?? ""}
            min={0}
            max={60}
            name="weeklyPeriods"
            type="number"
          />
        </Field>
        <Field label="Scheduling priority">
          <Select defaultValue={config?.schedulingPriority ?? "normal"} name="schedulingPriority">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </Select>
        </Field>
      </div>
      <label className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 text-sm font-medium text-foreground">
        <input defaultChecked={config?.contributesToWorkload ?? true} name="contributesToWorkload" type="checkbox" />
        Contributes to academic workload
      </label>
      <Field label="Notes">
        <textarea
          className="min-h-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950"
          defaultValue={config?.notes ?? ""}
          name="notes"
        />
      </Field>
      {state.message ? (
        <p className={state.status === "success" ? "text-sm font-medium text-emerald-700 dark:text-emerald-300" : "text-sm font-medium text-danger"} role="status">
          {state.message}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">{pending ? "Saving..." : "Save Workload Configuration"}</Button>
    </form>
  );
}
