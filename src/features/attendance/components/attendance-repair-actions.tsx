"use client";

import { useActionState, useState } from "react";
import { Button, Field } from "@/components/ui";
import {
  applyAttendanceRepairRequestAction,
  approveAttendanceRepairRequestAction,
  createAttendanceRepairRequestAction,
  rejectAttendanceRepairRequestAction,
  type AttendanceRepairActionState,
} from "@/features/attendance/actions/attendance-repair-actions";

const initialState: AttendanceRepairActionState = { status: "idle" };

export function CreateRepairRequestForm({ attendanceId, disabled }: { attendanceId: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(createAttendanceRepairRequestAction, initialState);
  const [reason, setReason] = useState("Reconstruct missing or invalid academic snapshot from deterministic historical placement evidence.");

  return (
    <form action={formAction} className="grid gap-3">
      <input name="attendanceId" type="hidden" value={attendanceId} />
      <Field label="Repair reason" required>
        <textarea className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" maxLength={500} name="reason" onChange={(event) => setReason(event.target.value)} value={reason} />
      </Field>
      <ActionMessage state={state} />
      <Button disabled={disabled || reason.trim().length < 8} loading={pending} type="submit">Create Repair Request</Button>
    </form>
  );
}

export function RepairReviewActions({ repairId, status }: { repairId: string; status: string }) {
  const [approveState, approveAction, approvePending] = useActionState(approveAttendanceRepairRequestAction, initialState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectAttendanceRepairRequestAction, initialState);
  const [applyState, applyAction, applyPending] = useActionState(applyAttendanceRepairRequestAction, initialState);
  const canReview = status === "pending_review";
  const canApply = status === "approved";

  return (
    <div className="grid gap-4">
      {canReview ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <form action={approveAction} className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3">
            <input name="repairId" type="hidden" value={repairId} />
            <Field label="Approval comment">
              <textarea className="min-h-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" maxLength={500} name="comment" placeholder="Optional approval note" />
            </Field>
            <ActionMessage state={approveState} />
            <Button loading={approvePending} type="submit">Approve Request</Button>
          </form>
          <form action={rejectAction} className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3">
            <input name="repairId" type="hidden" value={repairId} />
            <Field label="Rejection comment" required>
              <textarea className="min-h-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" maxLength={500} name="comment" placeholder="Explain why this repair should not proceed" />
            </Field>
            <ActionMessage state={rejectState} />
            <Button loading={rejectPending} type="submit" variant="destructive">Reject Request</Button>
          </form>
        </div>
      ) : null}
      {canApply ? (
        <form action={applyAction} className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <input name="repairId" type="hidden" value={repairId} />
          <p className="text-sm font-semibold">Apply approved snapshot repair</p>
          <p className="text-sm">This changes only the attendance academic snapshot. Attendance status, remarks, corrections, student placement, guardians, and academic structure are unchanged.</p>
          <ActionMessage state={applyState} />
          <Button loading={applyPending} type="submit" variant="destructive">Apply Repair</Button>
        </form>
      ) : null}
    </div>
  );
}

function ActionMessage({ state }: { state: AttendanceRepairActionState }) {
  if (state.status === "idle") return null;
  return (
    <div className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"}>
      {state.message}
    </div>
  );
}
