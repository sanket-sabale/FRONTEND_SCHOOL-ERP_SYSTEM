"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { correctAttendanceAction, type AttendanceActionState } from "@/features/attendance/actions/attendance-actions";
import { AttendanceStatusBadge } from "@/features/attendance/components/attendance-status-badge";
import { getAttendanceStatusLabel } from "@/features/attendance/services/attendance-rules";
import { attendanceStatuses, type AttendanceHistoryDetail as AttendanceHistoryDetailModel, type AttendanceStatus } from "@/features/attendance/types/attendance";
import type { Role } from "@/types/erp";

const initialState: AttendanceActionState = { status: "idle" };

export function AttendanceHistoryDetail({
  detail,
  role,
}: {
  detail: AttendanceHistoryDetailModel;
  role: Role;
}) {
  const canCorrect = hasPermission(role, "attendance.correct");
  const [formState, formAction, pending] = useActionState(correctAttendanceAction, initialState);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>(detail.record.currentStatus);
  const [reason, setReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const reasonValid = reason.trim().length >= 8;
  const changed = newStatus !== detail.record.currentStatus;
  const canSubmit = canCorrect && changed && reasonValid;
  const timeline = useMemo(() => buildTimeline(detail), [detail]);

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Attendance", "History", detail.record.studentName]} />}
        description="Review the current attendance state, original marking, and immutable correction history for this record."
        eyebrow="Attendance Record"
        title={`${detail.record.studentName} / ${formatDate(detail.record.attendanceDate)}`}
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/history">
              Back to History
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/students/${encodeURIComponent(detail.record.studentId)}`}>
              View Student
            </Link>
          </div>
        }
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="flex flex-wrap gap-2">
            <AttendanceStatusBadge status={detail.record.currentStatus} />
            {detail.record.isCorrected ? <Badge tone="warning">{detail.record.correctionCount} correction{detail.record.correctionCount === 1 ? "" : "s"}</Badge> : <Badge tone="neutral">Original record</Badge>}
          </div>
        </Card>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <SectionHeader eyebrow="Record details" title="Attendance Details" />
          <div className="grid gap-3 p-4 sm:p-5 sm:grid-cols-2">
            <InfoRow label="Student" value={detail.record.studentName} />
            <InfoRow label="Admission Number" value={detail.record.admissionNumber} />
            <InfoRow label="Class" value={detail.record.className} />
            <InfoRow label="Section" value={detail.record.sectionName} />
            <InfoRow label="Academic Context Source" value={detail.record.academicContextSource === "stored_snapshot" ? "Stored snapshot" : "Resolved placement fallback"} />
            <InfoRow label="Attendance Date" value={formatDate(detail.record.attendanceDate)} />
            <InfoRow label="Original Status" value={getAttendanceStatusLabel(detail.record.originalStatus)} />
            <InfoRow label="Current Status" value={getAttendanceStatusLabel(detail.record.currentStatus)} />
            <InfoRow label="Marked By" value={detail.record.markedBy} />
            <InfoRow label="Marked At" value={formatDateTime(detail.record.markedAt)} />
            <InfoRow label="Last Modified By" value={detail.record.lastModifiedBy} />
            <InfoRow label="Last Modified At" value={formatDateTime(detail.record.lastModifiedAt)} />
            <InfoRow label="Correction Count" value={detail.record.correctionCount.toLocaleString("en-IN")} />
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Controlled correction" title="Correct Attendance" />
          <div className="p-4 sm:p-5">
            {!canCorrect ? (
              <EmptyState description="You can view attendance history, but your role cannot correct attendance records." title="Correction unavailable" />
            ) : (
              <form action={formAction} className="grid gap-4">
                <input name="attendanceId" type="hidden" value={detail.record.id} />
                <Field label="Current status">
                  <Select disabled value={detail.record.currentStatus}>
                    <option value={detail.record.currentStatus}>{getAttendanceStatusLabel(detail.record.currentStatus)}</option>
                  </Select>
                </Field>
                <Field error={!changed && newStatus === detail.record.currentStatus ? "Choose a different status before review." : undefined} label="New status" required>
                  <Select name="newStatus" onChange={(event) => setNewStatus(event.target.value as AttendanceStatus)} value={newStatus}>
                    {attendanceStatuses.map((status) => <option key={status} value={status}>{getAttendanceStatusLabel(status)}</option>)}
                  </Select>
                </Field>
                <Field error={reason && !reasonValid ? "Reason must be at least 8 characters." : undefined} label="Correction reason" required>
                  <textarea className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" maxLength={500} name="reason" onChange={(event) => setReason(event.target.value)} placeholder="Explain why this attendance record needs correction." value={reason} />
                </Field>

                {reviewing ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    <p className="font-semibold">Review correction before saving</p>
                    <p className="mt-2">Student: {detail.record.studentName}</p>
                    <p>Date: {formatDate(detail.record.attendanceDate)}</p>
                    <p>Current: {getAttendanceStatusLabel(detail.record.currentStatus)}</p>
                    <p>New: {getAttendanceStatusLabel(newStatus)}</p>
                    <p className="mt-2">Reason: {reason}</p>
                  </div>
                ) : null}

                {formState.status !== "idle" ? (
                  <div className={formState.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"}>
                    {formState.message}
                  </div>
                ) : null}

                <div className="responsive-action-row">
                  <Button disabled={!changed || !reasonValid} onClick={() => setReviewing(true)} type="button" variant="secondary">Review Correction</Button>
                  <Button disabled={!canSubmit || !reviewing} loading={pending} type="submit" variant="destructive">Confirm Correction</Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="Correction timeline" title="Immutable History" />
        <div className="grid gap-3 p-4 sm:p-5">
          {timeline.map((item, index) => (
            <article className="rounded-lg border border-border bg-surface-muted p-4" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-foreground-muted">{item.description}</p>
                </div>
                <Badge tone={item.tone}>{index === 0 ? "Original" : `Correction #${index}`}</Badge>
              </div>
              {item.reason ? <p className="mt-3 rounded-lg border border-border bg-surface p-3 text-sm text-foreground-muted">{item.reason}</p> : null}
              <p className="mt-3 text-xs text-foreground-muted">{item.actor} / {formatDateTime(item.timestamp)}</p>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function buildTimeline(detail: AttendanceHistoryDetailModel) {
  const items: Array<{
    id: string;
    title: string;
    description: string;
    reason?: string;
    actor: string;
    timestamp?: string;
    tone: "neutral" | "warning";
  }> = [
    {
      id: `${detail.record.id}-original`,
      title: "Original Attendance",
      description: getAttendanceStatusLabel(detail.record.originalStatus),
      actor: detail.record.markedBy ?? "Unknown user",
      timestamp: detail.record.markedAt,
      tone: "neutral" as const,
    },
    ...detail.corrections.map((correction) => ({
      id: correction.id,
      title: `Correction #${correction.correctionNumber}`,
      description: `${getAttendanceStatusLabel(correction.previousStatus)} to ${getAttendanceStatusLabel(correction.newStatus)}`,
      reason: correction.reason,
      actor: correction.correctedBy,
      timestamp: correction.correctedAt,
      tone: "warning" as const,
    })),
  ];

  return items;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text text-right font-medium text-foreground">{value || "Not provided"}</span>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
