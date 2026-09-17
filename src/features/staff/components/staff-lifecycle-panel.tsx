"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Field, SectionHeader, Select } from "@/components/ui";
import type { StaffStatusActionState } from "@/features/staff/actions/staff-actions";
import { formatStaffDate } from "@/features/staff/components/staff-formatters";
import { StaffStatusBadge } from "@/features/staff/components/staff-status-badge";
import {
  getAllowedStaffStatusTransitions,
  getStaffStatusLabel,
  isTerminalStaffStatus,
} from "@/features/staff/services/staff-rules";
import type { StaffProfile, StaffStatus } from "@/features/staff/types/staff";

type StaffLifecyclePanelProps = {
  action: (state: StaffStatusActionState, formData: FormData) => Promise<StaffStatusActionState>;
  canManage: boolean;
  staff: StaffProfile;
};

const initialActionState: StaffStatusActionState = { status: "idle" };

export function StaffLifecyclePanel({ action, canManage, staff }: StaffLifecyclePanelProps) {
  const transitions = useMemo(() => getAllowedStaffStatusTransitions(staff.status), [staff.status]);
  const [selectedStatus, setSelectedStatus] = useState<StaffStatus | null>(null);

  return (
    <>
      <Card id="lifecycle">
        <SectionHeader eyebrow="Lifecycle" title="Staff Lifecycle" />
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]">
          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Current status</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{getStaffStatusLabel(staff.status)}</p>
              </div>
              <StaffStatusBadge status={staff.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <LifecycleTerm label="Joined" value={formatStaffDate(staff.joiningDate)} />
              <LifecycleTerm label="Exit date" value={formatStaffDate(staff.exitDate)} />
              <LifecycleTerm label="Exit reason" value={staff.exitReason} />
              <LifecycleTerm label="Last updated" value={formatStaffDate(staff.updatedAt.slice(0, 10))} />
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Available actions</p>
                <p className="mt-1 text-sm text-foreground-muted">Transitions come from Staff domain rules.</p>
              </div>
              {canManage ? <Badge tone="info">Authorized</Badge> : <Badge tone="neutral">View only</Badge>}
            </div>

            <div className="mt-4 grid gap-2">
              {canManage && transitions.length > 0 ? (
                <Button onClick={() => setSelectedStatus(transitions[0] ?? null)} variant="primary">
                  Change Status
                </Button>
              ) : (
                <p className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground-muted">
                  {canManage ? "No lifecycle transitions are available from this status." : "You do not have permission to change staff lifecycle status."}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {selectedStatus ? (
        <StaffLifecycleDialog action={action} onClose={() => setSelectedStatus(null)} staff={staff} statuses={transitions} />
      ) : null}
    </>
  );
}

function StaffLifecycleDialog({
  action,
  onClose,
  staff,
  statuses,
}: {
  action: (state: StaffStatusActionState, formData: FormData) => Promise<StaffStatusActionState>;
  onClose: () => void;
  staff: StaffProfile;
  statuses: StaffStatus[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<StaffStatus>(statuses[0] ?? staff.status);
  const [exitDate, setExitDate] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [actionState, formAction, pending] = useActionState(action, initialActionState);
  const requiresExit = isTerminalStaffStatus(status);

  useEffect(() => {
    if (actionState.status !== "success") return;
    router.refresh();
  }, [actionState.status, router]);

  const completed = actionState.status === "success";

  return (
    <div
      aria-describedby="staff-lifecycle-dialog-description"
      aria-labelledby="staff-lifecycle-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/45 p-3"
      role="dialog"
    >
      <form action={formAction} className="w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-2xl sm:p-5">
        <input name="staffId" type="hidden" value={staff.id} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Change Staff Status</p>
            <h2 className="responsive-text mt-1 text-lg font-semibold text-foreground" id="staff-lifecycle-dialog-title">
              {staff.displayName}
            </h2>
          </div>
          <StaffStatusBadge status={staff.status} />
        </div>

        {actionState.status === "success" && actionState.message ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            {actionState.message}
          </div>
        ) : null}
        {actionState.status === "error" && actionState.message ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {actionState.message}
          </div>
        ) : null}

        <p className="mt-3 text-sm leading-6 text-foreground-muted" id="staff-lifecycle-dialog-description">
          Choose one of the lifecycle transitions allowed by the Staff domain. No staff record is deleted.
        </p>

        <dl className="mt-4 grid gap-2 rounded-lg border border-border bg-surface-muted p-3 text-sm">
          <LifecycleTerm label="Employee number" value={staff.employeeNumber} />
          <LifecycleTerm label="Current status" value={getStaffStatusLabel(staff.status)} />
        </dl>

        <div className="mt-4 grid gap-4">
          <Field error={actionState.fieldErrors?.status} label="New status" required>
            <Select disabled={completed} name="status" onChange={(event) => setStatus(event.target.value as StaffStatus)} required value={status}>
              {statuses.map((item) => (
                <option key={item} value={item}>{getStaffStatusLabel(item)}</option>
              ))}
            </Select>
          </Field>
          {requiresExit ? (
            <>
              <Field error={actionState.fieldErrors?.exitDate} label="Exit date" required>
                <input
                  className="h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950"
                  disabled={completed}
                  name="exitDate"
                  onChange={(event) => setExitDate(event.target.value)}
                  required
                  type="date"
                  value={exitDate}
                />
              </Field>
              <Field error={actionState.fieldErrors?.exitReason} label="Exit reason" required>
                <textarea
                  className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 disabled:opacity-60 dark:focus:ring-sky-950"
                  disabled={completed}
                  maxLength={300}
                  name="exitReason"
                  onChange={(event) => setExitReason(event.target.value)}
                  required
                  value={exitReason}
                />
              </Field>
            </>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">
            {completed ? "Close" : "Cancel"}
          </Button>
          <Button disabled={pending || completed} loading={pending} type="submit" variant="primary">
            {pending ? "Updating..." : "Update Status"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function LifecycleTerm({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className="responsive-text mt-1 text-foreground">{value || "Not recorded"}</dd>
    </div>
  );
}
