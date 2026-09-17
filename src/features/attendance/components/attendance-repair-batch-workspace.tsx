"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader } from "@/components/ui";
import {
  prepareAttendanceRepairBatchAction,
  previewAttendanceRepairBatchAction,
  type AttendanceRepairBatchActionState,
} from "@/features/attendance/actions/attendance-repair-batch-actions";
import { RepairStatusBadge, snapshotLabel, statusLabel } from "@/features/attendance/components/attendance-repair-queue";
import { maxAttendanceRepairBatchSelection, type AttendanceRepairBatchCandidate, type AttendanceRepairBatchPreview } from "@/features/attendance/types/attendance-repair-batch";
import type { AttendanceSnapshotIntegrityListResponse } from "@/features/attendance/types/attendance-integrity";
import type { AttendanceSnapshotRepairRequest } from "@/features/attendance/types/attendance-repair";

const initialState: AttendanceRepairBatchActionState = { status: "idle" };

export function AttendanceRepairBatchWorkspace({
  context,
  diagnostics,
  repairRequests,
}: {
  context: { school: string; campus: string; academicYear: string };
  diagnostics: AttendanceSnapshotIntegrityListResponse;
  repairRequests: AttendanceSnapshotRepairRequest[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [previewState, previewAction, previewPending] = useActionState(previewAttendanceRepairBatchAction, initialState);
  const [prepareState, prepareAction, preparePending] = useActionState(prepareAttendanceRepairBatchAction, initialState);
  const repairByAttendance = useMemo(() => new Map(repairRequests.map((request) => [request.attendanceId, request])), [repairRequests]);
  const visibleIds = diagnostics.items.map((item) => item.attendanceId);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= maxAttendanceRepairBatchSelection ? current : [...current, id]);
  }

  function selectVisible() {
    setSelected(visibleIds.slice(0, maxAttendanceRepairBatchSelection));
  }

  function clearSelection() {
    setSelected([]);
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Attendance", "Snapshot Integrity", "Bulk Repair Preview"]} />}
        description="Select attendance integrity records, preview eligibility, and prepare individual repair requests. This never applies repairs."
        eyebrow="Attendance Repair Readiness"
        title="Bulk Repair Preview"
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity">
              Snapshot Integrity
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity/repairs">
              Repair Queue
            </Link>
          </div>
        }
      >
        <Card className="responsive-card-padding" variant="muted">
          <p className="text-sm font-semibold text-foreground">Selected: {selected.length.toLocaleString("en-IN")} / {maxAttendanceRepairBatchSelection}</p>
          <p className="mt-1 text-sm text-foreground-muted">Bulk selection prepares repair requests. It does not automatically modify attendance records.</p>
          <p className="mt-1 text-sm text-foreground-muted">Use Preview Repair first, then Prepare Repair Requests for eligible records only.</p>
        </Card>
      </PageHeader>

      <Card>
        <SectionHeader
          eyebrow="Selection"
          title="Integrity Records"
          action={
            <div className="responsive-action-row">
              <Button onClick={allVisibleSelected ? clearSelection : selectVisible} type="button" variant="secondary">{allVisibleSelected ? "Clear Selection" : "Select Visible Records"}</Button>
              <Button onClick={clearSelection} type="button" variant="ghost">Clear</Button>
            </div>
          }
        />
        <form action={previewAction}>
          {selected.map((id) => <input key={id} name="attendanceId" type="hidden" value={id} />)}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                <tr>
                  <th className="px-4 py-3">Select</th>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Stored</th>
                  <th className="px-4 py-3">Proposed</th>
                  <th className="px-4 py-3">Integrity</th>
                  <th className="px-4 py-3">Repair</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {diagnostics.items.map((item) => {
                  const repair = repairByAttendance.get(item.attendanceId);
                  const checked = selected.includes(item.attendanceId);
                  return (
                    <tr key={item.attendanceId}>
                      <td className="px-4 py-3">
                        <input aria-label={`Select attendance record ${item.attendanceId}`} checked={checked} className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-sky-500" onChange={() => toggle(item.attendanceId)} type="checkbox" />
                      </td>
                      <td className="px-4 py-3"><p className="font-medium text-foreground">{formatDate(item.attendanceDate)}</p><p className="font-mono text-xs text-foreground-muted">{item.attendanceId}</p></td>
                      <td className="px-4 py-3">{item.studentName ?? item.studentId}</td>
                      <td className="px-4 py-3">{snapshotLabel(item.storedSnapshot.className, item.storedSnapshot.sectionName)}</td>
                      <td className="px-4 py-3">{snapshotLabel(item.repairPlan.proposedSnapshot?.className, item.repairPlan.proposedSnapshot?.sectionName)}</td>
                      <td className="px-4 py-3"><Badge tone={item.severity === "ok" ? "success" : item.severity === "warning" ? "warning" : "danger"}>{statusLabel(item.status)}</Badge></td>
                      <td className="px-4 py-3">{repair ? <RepairStatusBadge status={repair.status} /> : item.repairPlan.proposedSnapshot ? <Badge tone="info">Repairable</Badge> : <Badge tone="neutral">No Repair</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-3 md:hidden">
            {diagnostics.items.map((item) => {
              const repair = repairByAttendance.get(item.attendanceId);
              const checked = selected.includes(item.attendanceId);
              return (
                <article className="rounded-lg border border-border bg-surface-muted p-3" key={item.attendanceId}>
                  <label className="flex items-start gap-3">
                    <input aria-label={`Select attendance record ${item.attendanceId}`} checked={checked} className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-sky-500" onChange={() => toggle(item.attendanceId)} type="checkbox" />
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{item.studentName ?? item.studentId}</span>
                      <span className="block text-xs text-foreground-muted">{formatDate(item.attendanceDate)}</span>
                      <span className="mt-2 block text-sm text-foreground-muted">Stored: {snapshotLabel(item.storedSnapshot.className, item.storedSnapshot.sectionName)}</span>
                      <span className="mt-1 block text-sm text-foreground-muted">Proposed: {snapshotLabel(item.repairPlan.proposedSnapshot?.className, item.repairPlan.proposedSnapshot?.sectionName)}</span>
                      <span className="mt-2 flex flex-wrap gap-2">{repair ? <RepairStatusBadge status={repair.status} /> : <Badge tone="neutral">{statusLabel(item.status)}</Badge>}</span>
                    </span>
                  </label>
                </article>
              );
            })}
          </div>
          <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-surface/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground-muted">{selected.length.toLocaleString("en-IN")} selected. Limit {maxAttendanceRepairBatchSelection.toLocaleString("en-IN")}.</p>
            <Button disabled={selected.length === 0} loading={previewPending} type="submit">Preview Repair</Button>
          </div>
        </form>
      </Card>

      <ActionMessage state={previewState} />
      {previewState.preview ? <BatchPreview preview={previewState.preview} prepareAction={prepareAction} preparePending={preparePending} selected={selected} /> : null}
      <ActionMessage state={prepareState} />
      {prepareState.result ? <BatchResult result={prepareState.result} /> : null}
    </div>
  );
}

function BatchPreview({ prepareAction, preparePending, preview, selected }: { prepareAction: (payload: FormData) => void; preparePending: boolean; preview: AttendanceRepairBatchPreview; selected: string[] }) {
  return (
    <Card>
      <SectionHeader eyebrow="Preview" title="Batch Repair Preview" />
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <Metric label="Selected" value={preview.summary.selectedCount} />
        <Metric label="Eligible" value={preview.summary.eligibleCount} tone="success" />
        <Metric label="Excluded" value={preview.summary.excludedCount} tone="danger" />
        <Metric label="Existing Requests" value={preview.summary.alreadyRequestedCount} tone="warning" />
        <Metric label="Already Valid" value={preview.summary.alreadyValidCount} tone="neutral" />
        <Metric label="Unresolved" value={preview.summary.unresolvedCount} tone="danger" />
        <Metric label="Warnings" value={preview.summary.warningCount} tone="warning" />
        <Metric label="Deterministic Repairs" value={preview.summary.deterministicRepairCount} tone="info" />
      </div>
      <div className="grid gap-4 border-t border-border p-4 sm:p-5 xl:grid-cols-[1fr_1fr]">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Groups</h3>
          <div className="mt-3 grid gap-2">
            {preview.groups.length === 0 ? <EmptyState description="No eligible deterministic repair groups in this selection." title="No groups" /> : preview.groups.map((group) => (
              <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm" key={`${group.academicYearId}:${group.classId}:${group.sectionId}`}>
                <p className="font-medium text-foreground">{group.attendanceRecordCount} record{group.attendanceRecordCount === 1 ? "" : "s"} would be prepared for {snapshotLabel(group.className, group.sectionName)}</p>
                <p className="mt-1 text-foreground-muted">{group.studentCount} student{group.studentCount === 1 ? "" : "s"} / {group.dateFrom ?? "No date"} to {group.dateTo ?? "No date"}</p>
              </div>
            ))}
          </div>
        </div>
        <form action={prepareAction} className="grid gap-3">
          {selected.map((id) => <input key={id} name="attendanceId" type="hidden" value={id} />)}
          <Field label="Preparation reason" required>
            <textarea className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" maxLength={500} name="reason" defaultValue="Prepare individual repair requests from controlled batch preview." />
          </Field>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Prepare Repair Requests creates individual pending review requests only. It does not approve or apply repairs.
          </div>
          <Button disabled={preview.summary.eligibleCount === 0} loading={preparePending} type="submit">Prepare Repair Requests</Button>
        </form>
      </div>
      <div className="grid gap-3 p-4 sm:p-5">
        {preview.candidates.map((candidate) => <CandidateCard candidate={candidate} key={candidate.attendanceId} />)}
      </div>
    </Card>
  );
}

function CandidateCard({ candidate }: { candidate: AttendanceRepairBatchCandidate }) {
  const tone = candidate.eligibility === "eligible" ? "success" : candidate.eligibility === "already_requested" ? "warning" : candidate.eligibility === "already_valid" ? "neutral" : "danger";
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{candidate.studentName ?? candidate.attendanceId}</p>
          <p className="mt-1 text-foreground-muted">{candidate.attendanceDate ? formatDate(candidate.attendanceDate) : "Date unavailable"}</p>
        </div>
        <Badge tone={tone}>{statusLabel(candidate.eligibility)}</Badge>
      </div>
      <p className="mt-3 text-foreground-muted">Current: {snapshotLabel(candidate.currentSnapshot.className, candidate.currentSnapshot.sectionName)}</p>
      <p className="mt-1 text-foreground-muted">Proposed: {snapshotLabel(candidate.proposedSnapshot?.className, candidate.proposedSnapshot?.sectionName)}</p>
      {candidate.existingRepairStatus ? <p className="mt-1 text-foreground-muted">Existing repair: {statusLabel(candidate.existingRepairStatus)}</p> : null}
      {candidate.exclusionReason ? <p className="mt-2 rounded-lg border border-border bg-surface p-2 text-foreground-muted">{candidate.exclusionReason}</p> : null}
    </article>
  );
}

function BatchResult({ result }: { result: NonNullable<AttendanceRepairBatchActionState["result"]> }) {
  return (
    <Card>
      <SectionHeader eyebrow="Result" title="Repair Requests Prepared" />
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <Metric label="Selected" value={result.selectedCount} />
        <Metric label="Prepared" value={result.preparedCount} tone="success" />
        <Metric label="Skipped" value={result.skippedCount} tone="warning" />
        <Metric label="Existing Requests" value={result.alreadyRequestedCount} tone="warning" />
      </div>
      {result.skippedRecords.length > 0 ? (
        <div className="grid gap-2 border-t border-border p-4 sm:p-5">
          {result.skippedRecords.map((record) => <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted" key={`${record.attendanceId}:${record.status}`}>{record.attendanceId}: {record.reason}</div>)}
        </div>
      ) : null}
    </Card>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <div className="mt-2"><Badge tone={tone}>{value.toLocaleString("en-IN")}</Badge></div>
    </div>
  );
}

function ActionMessage({ state }: { state: AttendanceRepairBatchActionState }) {
  if (state.status === "idle") return null;
  return <div className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"}>{state.message}</div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}
