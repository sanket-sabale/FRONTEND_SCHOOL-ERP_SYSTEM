"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader } from "@/components/ui";
import {
  prepareStudentPromotionBatchAction,
  previewStudentPromotionBatchAction,
  type StudentPromotionBatchActionState,
} from "@/features/student-promotions/actions/student-promotion-batch-actions";
import { formatLabel, PromotionBadge } from "@/features/student-promotions/components/student-promotion-management";
import { maxStudentPromotionBatchSelection, type StudentPromotionBatchCandidate, type StudentPromotionBatchPreview } from "@/features/student-promotions/types/student-promotion-batch";
import type { StudentPromotionReadModel } from "@/features/student-promotions/types/student-promotion";

const initialState: StudentPromotionBatchActionState = { status: "idle" };

export function StudentPromotionBatchWorkspace({
  candidates,
  context,
  sourceAcademicYearId,
  targetAcademicYearId,
}: {
  context: { school: string; campus: string; academicYear: string };
  candidates: StudentPromotionReadModel[];
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [previewState, previewAction, previewPending] = useActionState(previewStudentPromotionBatchAction, initialState);
  const [prepareState, prepareAction, preparePending] = useActionState(prepareStudentPromotionBatchAction, initialState);
  const visibleIds = useMemo(() => candidates.map((candidate) => candidate.id), [candidates]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= maxStudentPromotionBatchSelection ? current : [...current, id]);
  }

  function selectVisible() {
    setSelected(visibleIds.slice(0, maxStudentPromotionBatchSelection));
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, "Academics", "Promotions", "Bulk Preview"]} />}
        description="Select promotion candidates, preview readiness, and prepare individual promotion records. This does not promote students."
        eyebrow="Controlled Bulk Promotion Readiness"
        title="Bulk Promotion Preview"
        action={<LinkButton href="/academics/promotions">Promotion Workspace</LinkButton>}
      >
        <Card className="responsive-card-padding" variant="muted">
          <p className="text-sm font-semibold text-foreground">Selected: {selected.length.toLocaleString("en-IN")} / {maxStudentPromotionBatchSelection}</p>
          <p className="mt-1 text-sm text-foreground-muted">Bulk preparation does not promote students. Each student must still be reviewed and applied individually.</p>
        </Card>
      </PageHeader>

      <Card>
        <SectionHeader
          eyebrow="Selection"
          title="Promotion Candidates"
          action={
            <div className="responsive-action-row">
              <Button onClick={allVisibleSelected ? () => setSelected([]) : selectVisible} type="button" variant="secondary">{allVisibleSelected ? "Clear Selection" : "Select Visible"}</Button>
              <Button onClick={() => setSelected([])} type="button" variant="ghost">Clear</Button>
            </div>
          }
        />
        <form action={previewAction}>
          <input name="sourceAcademicYearId" type="hidden" value={sourceAcademicYearId} />
          <input name="targetAcademicYearId" type="hidden" value={targetAcademicYearId} />
          {selected.map((id) => <input key={id} name="candidateId" type="hidden" value={id} />)}
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                <tr>
                  <th className="px-4 py-3">Select</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {candidates.map((candidate) => {
                  const checked = selected.includes(candidate.id);
                  return (
                    <tr key={candidate.id}>
                      <td className="px-4 py-3"><input aria-label={`Select ${candidate.studentName}`} checked={checked} className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-sky-500" onChange={() => toggle(candidate.id)} type="checkbox" /></td>
                      <td className="px-4 py-3"><p className="font-medium text-foreground">{candidate.studentName}</p><p className="text-xs text-foreground-muted">{candidate.admissionNumber}</p></td>
                      <td className="px-4 py-3">{candidate.sourceClassName} / {candidate.sourceSectionName}</td>
                      <td className="px-4 py-3">{candidate.targetClassName ?? "Needs review"} / {candidate.targetSectionName ?? "Needs review"}</td>
                      <td className="px-4 py-3"><PromotionBadge status={candidate.status} /></td>
                      <td className="px-4 py-3"><Badge tone={candidate.validation.valid ? "success" : "warning"}>{candidate.validation.valid ? "Eligible" : "Review"}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-3 lg:hidden">
            {candidates.map((candidate) => {
              const checked = selected.includes(candidate.id);
              return (
                <article className="rounded-lg border border-border bg-surface-muted p-3" key={candidate.id}>
                  <label className="flex items-start gap-3">
                    <input aria-label={`Select ${candidate.studentName}`} checked={checked} className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-sky-500" onChange={() => toggle(candidate.id)} type="checkbox" />
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{candidate.studentName}</span>
                      <span className="mt-2 block text-sm text-foreground-muted">Source: {candidate.sourceClassName} / {candidate.sourceSectionName}</span>
                      <span className="mt-1 block text-sm text-foreground-muted">Target: {candidate.targetClassName ?? "Needs review"} / {candidate.targetSectionName ?? "Needs review"}</span>
                      <span className="mt-2 inline-flex"><PromotionBadge status={candidate.status} /></span>
                    </span>
                  </label>
                </article>
              );
            })}
          </div>
          <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-surface/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground-muted">{selected.length.toLocaleString("en-IN")} selected. Limit {maxStudentPromotionBatchSelection.toLocaleString("en-IN")}.</p>
            <Button disabled={selected.length === 0} loading={previewPending} type="submit">Preview Promotions</Button>
          </div>
        </form>
      </Card>

      <ActionMessage state={previewState} />
      {previewState.preview ? <BatchPreview prepareAction={prepareAction} preparePending={preparePending} preview={previewState.preview} selected={selected} sourceAcademicYearId={sourceAcademicYearId} targetAcademicYearId={targetAcademicYearId} /> : null}
      <ActionMessage state={prepareState} />
      {prepareState.result ? <BatchResult result={prepareState.result} /> : null}
    </div>
  );
}

function BatchPreview({ prepareAction, preparePending, preview, selected, sourceAcademicYearId, targetAcademicYearId }: { prepareAction: (payload: FormData) => void; preparePending: boolean; preview: StudentPromotionBatchPreview; selected: string[]; sourceAcademicYearId: string; targetAcademicYearId: string }) {
  return (
    <Card>
      <SectionHeader eyebrow="Preview" title="Bulk Promotion Preview" />
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <Metric label="Selected" value={preview.summary.selectedCount} />
        <Metric label="Eligible" value={preview.summary.eligibleCount} tone="success" />
        <Metric label="Requires Review" value={preview.summary.requiresReviewCount} tone="warning" />
        <Metric label="Blocked" value={preview.summary.blockedCount} tone="danger" />
        <Metric label="Capacity Conflicts" value={preview.summary.capacityConflictCount} tone="danger" />
        <Metric label="Stale" value={preview.summary.staleCount} tone="warning" />
        <Metric label="Already Prepared" value={preview.summary.alreadyPreparedCount} tone="neutral" />
        <Metric label="Already Promoted" value={preview.summary.alreadyPromotedCount} tone="info" />
      </div>
      <div className="grid gap-4 border-t border-border p-4 sm:p-5 xl:grid-cols-[1fr_1fr]">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Target groups</h3>
          <div className="mt-3 grid gap-2">
            {preview.groups.length === 0 ? <EmptyState description="No target groups in this preview." title="No groups" /> : preview.groups.map((group) => (
              <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm" key={`${group.targetClassId}:${group.targetSectionId}`}>
                <p className="font-medium text-foreground">{group.candidateCount} candidate{group.candidateCount === 1 ? "" : "s"} target {group.targetClassName ?? "Unknown class"} / {group.targetSectionName ?? "Unknown section"}</p>
                <p className="mt-1 text-foreground-muted">Projected occupancy: {group.projectedOccupancy ?? "Unknown"} / {group.capacity ?? "No capacity"}</p>
              </div>
            ))}
          </div>
        </div>
        <form action={prepareAction} className="grid gap-3">
          <input name="sourceAcademicYearId" type="hidden" value={sourceAcademicYearId} />
          <input name="targetAcademicYearId" type="hidden" value={targetAcademicYearId} />
          {selected.map((id) => <input key={id} name="candidateId" type="hidden" value={id} />)}
          <Field label="Preparation reason" required>
            <textarea className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue="Prepare individual promotion records from controlled bulk preview." maxLength={500} name="reason" />
          </Field>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">Prepare creates individual promotion records only. It does not approve, apply, or mutate student placements.</div>
          <Button disabled={preview.summary.eligibleCount === 0} loading={preparePending} type="submit">Prepare Individual Records</Button>
        </form>
      </div>
      <div className="grid gap-3 p-4 sm:p-5">
        {preview.candidates.map((candidate) => <CandidateCard candidate={candidate} key={candidate.candidateId} />)}
      </div>
    </Card>
  );
}

function CandidateCard({ candidate }: { candidate: StudentPromotionBatchCandidate }) {
  const tone = candidate.readiness === "eligible" ? "success" : candidate.readiness === "capacity_conflict" || candidate.readiness === "blocked" ? "danger" : "warning";
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-medium text-foreground">{candidate.studentName ?? candidate.candidateId}</p><p className="mt-1 text-foreground-muted">{candidate.sourceClassName ?? "Unknown source"} to {candidate.targetClassName ?? "Unknown target"}</p></div>
        <Badge tone={tone}>{formatLabel(candidate.readiness)}</Badge>
      </div>
      <p className="mt-3 text-foreground-muted">Projected capacity: {candidate.projectedOccupancy ?? "Unknown"} / {candidate.targetSectionCapacity ?? "No capacity"}</p>
      {candidate.exclusionReason ? <p className="mt-2 rounded-lg border border-border bg-surface p-2 text-foreground-muted">{candidate.exclusionReason}</p> : null}
      {candidate.promotionId ? <Link className="mt-3 inline-flex text-sm font-medium text-primary hover:underline" href={`/academics/promotions/${encodeURIComponent(candidate.promotionId)}`}>Open individual record</Link> : null}
    </article>
  );
}

function BatchResult({ result }: { result: NonNullable<StudentPromotionBatchActionState["result"]> }) {
  return (
    <Card>
      <SectionHeader eyebrow="Result" title="Promotion Records Prepared" />
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <Metric label="Selected" value={result.selectedCount} />
        <Metric label="Prepared" value={result.preparedCount} tone="success" />
        <Metric label="Skipped" value={result.skippedCount} tone="warning" />
        <Metric label="Capacity Conflicts" value={result.capacityConflictCount} tone="danger" />
      </div>
      <div className="grid gap-3 p-4 pt-0 sm:p-5 sm:pt-0">
        {result.createdPromotionIds.map((id) => <Link className="text-sm font-medium text-primary hover:underline" href={`/academics/promotions/${encodeURIComponent(id)}`} key={id}>Open prepared promotion {id}</Link>)}
        {result.skippedRecords.map((record) => <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted" key={record.candidateId}>{record.candidateId}: {record.reason}</div>)}
      </div>
    </Card>
  );
}

function ActionMessage({ state }: { state: StudentPromotionBatchActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return <Card className={state.status === "error" ? "border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100" : "p-4 text-sm text-foreground-muted"}>{state.message}</Card>;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <Card className="p-4" variant="muted"><p className="text-sm text-foreground-muted">{label}</p><div className="mt-3"><Badge tone={tone}>{value.toLocaleString("en-IN")}</Badge></div></Card>;
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={href}>{children}</Link>;
}
