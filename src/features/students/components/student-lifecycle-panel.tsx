"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Field, SectionHeader, Select } from "@/components/ui";
import type { StudentLifecycleActionState } from "@/features/students/actions/student-lifecycle-actions";
import { formatStudentDate } from "@/features/students/components/student-formatters";
import { StudentStatusBadge, getStudentStatusLabel } from "@/features/students/components/student-status-badge";
import {
  getAvailableStudentLifecycleTransitions,
  studentLifecycleReasonLabels,
  type StudentLifecycleTransition,
} from "@/features/students/services/student-lifecycle";
import {
  studentLifecycleReasons,
  type StudentLifecycleReason,
  type StudentProfile,
} from "@/features/students/types/student";

type StudentLifecyclePanelProps = {
  action: (state: StudentLifecycleActionState, formData: FormData) => Promise<StudentLifecycleActionState>;
  canManageLifecycle: boolean;
  student: StudentProfile;
};

const initialActionState: StudentLifecycleActionState = { status: "idle" };

export function StudentLifecyclePanel({ action, canManageLifecycle, student }: StudentLifecyclePanelProps) {
  const transitions = useMemo(() => getAvailableStudentLifecycleTransitions(student.status), [student.status]);
  const [selectedTransition, setSelectedTransition] = useState<StudentLifecycleTransition | null>(null);

  function openDialog(transition: StudentLifecycleTransition) {
    setSelectedTransition(transition);
  }

  return (
    <>
      <Card id="lifecycle">
        <SectionHeader eyebrow="Lifecycle" title="Student Lifecycle" />
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
          <div className="grid gap-3">
            <div className="rounded-lg border border-border bg-surface-muted p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Current status</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{getStudentStatusLabel(student.status)}</p>
                </div>
                <StudentStatusBadge status={student.status} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <LifecycleTerm label="Status changed" value={formatStudentDate(student.statusChangedAt?.slice(0, 10))} />
                <LifecycleTerm label="Lifecycle reason" value={student.lifecycleReason ? studentLifecycleReasonLabels[student.lifecycleReason] : undefined} />
                <LifecycleTerm label="Archive date" value={formatStudentDate(student.archivedAt?.slice(0, 10))} />
                <LifecycleTerm label="Recovery" value={student.status === "archived" ? "Restore to inactive status is supported." : "Archive preserves the historical record."} />
              </dl>
              {student.lifecycleReasonNote ? (
                <p className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground-muted">{student.lifecycleReasonNote}</p>
              ) : null}
            </div>

            <EmptyState
              description="Lifecycle history will appear here when a real audit event store is connected."
              title="No lifecycle history available"
            />
          </div>

          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Available actions</p>
                <p className="mt-1 text-sm text-foreground-muted">Actions are limited by lifecycle policy and permission.</p>
              </div>
              {canManageLifecycle ? <Badge tone="info">Authorized</Badge> : <Badge tone="neutral">View only</Badge>}
            </div>

            <div className="mt-4 grid gap-2">
              {canManageLifecycle && transitions.length > 0 ? (
                transitions.map((transition) => (
                  <Button
                    aria-label={`${transition.label} ${student.displayName}`}
                    key={transition.action}
                    onClick={() => openDialog(transition)}
                    variant={transition.destructive ? "secondary" : "primary"}
                  >
                    {transition.label}
                  </Button>
                ))
              ) : (
                <p className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground-muted">
                  {canManageLifecycle ? "No lifecycle actions are available from this status." : "You do not have permission to change student lifecycle status."}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {selectedTransition ? (
        <StudentLifecycleDialog
          action={action}
          onClose={() => setSelectedTransition(null)}
          student={student}
          transition={selectedTransition}
        />
      ) : null}
    </>
  );
}

function StudentLifecycleDialog({
  action,
  onClose,
  student,
  transition,
}: {
  action: (state: StudentLifecycleActionState, formData: FormData) => Promise<StudentLifecycleActionState>;
  onClose: () => void;
  student: StudentProfile;
  transition: StudentLifecycleTransition;
}) {
  const router = useRouter();
  const [reason, setReason] = useState<StudentLifecycleReason>(defaultReasonForAction(transition));
  const [reasonNote, setReasonNote] = useState("");
  const [actionState, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (actionState.status !== "success") return;

    router.refresh();
  }, [actionState.status, router]);

  const completed = actionState.status === "success";

  return (
    <div
      aria-describedby="student-lifecycle-dialog-description"
      aria-labelledby="student-lifecycle-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/45 p-3"
      role="dialog"
    >
      <form action={formAction} className="w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-2xl sm:p-5">
        <input name="studentId" type="hidden" value={student.id} />
        <input name="action" type="hidden" value={transition.action} />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Confirm lifecycle action</p>
            <h2 className="responsive-text mt-1 text-lg font-semibold text-foreground" id="student-lifecycle-dialog-title">
              {transition.label} {student.displayName}
            </h2>
          </div>
          <StudentStatusBadge status={student.status} />
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

        <p className="mt-3 text-sm leading-6 text-foreground-muted" id="student-lifecycle-dialog-description">
          {transition.description} The student record, admission number, and historical information are preserved.
          {transition.targetStatus === "archived" ? " Archived students are hidden from normal directory views unless the Archived status filter is selected." : ""}
        </p>

        <dl className="mt-4 grid gap-2 rounded-lg border border-border bg-surface-muted p-3 text-sm">
          <LifecycleTerm label="Admission number" value={student.admissionNumber} />
          <LifecycleTerm label="Current status" value={getStudentStatusLabel(student.status)} />
          <LifecycleTerm label="New status" value={getStudentStatusLabel(transition.targetStatus)} />
        </dl>

        <div className="mt-4 grid gap-4">
          <Field label="Reason" required={transition.requiresReason}>
            <Select
              disabled={completed}
              name="reason"
              onChange={(event) => setReason(event.target.value as StudentLifecycleReason)}
              required={transition.requiresReason}
              value={reason}
            >
              {studentLifecycleReasons.map((item) => (
                <option key={item} value={item}>{studentLifecycleReasonLabels[item]}</option>
              ))}
            </Select>
          </Field>
          <Field
            helperText={reason === "other" ? "Required when Other is selected." : "Optional context for future audit review."}
            label="Reason details"
            required={reason === "other"}
          >
            <textarea
              className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 disabled:opacity-60 dark:focus:ring-sky-950"
              disabled={completed}
              maxLength={500}
              name="reasonNote"
              onChange={(event) => setReasonNote(event.target.value)}
              required={reason === "other"}
              value={reasonNote}
            />
          </Field>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">
            {completed ? "Close" : "Cancel"}
          </Button>
          <Button disabled={pending || completed} loading={pending} type="submit" variant="primary">
            {pending ? "Updating..." : transition.label}
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

function defaultReasonForAction(transition: StudentLifecycleTransition): StudentLifecycleReason {
  if (transition.action === "transfer") return "student_transferred";
  if (transition.action === "withdraw") return "student_withdrew";
  if (transition.action === "graduate") return "completed_academic_lifecycle";
  if (transition.action === "restore" || transition.action === "activate") return "status_correction";
  return "administrative_reason";
}
