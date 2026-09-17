import { Badge, Button, Card, EmptyState, Field, SectionHeader, Select } from "@/components/ui";
import {
  assignAdmissionReviewerAction,
  completeAdmissionReviewAction,
  startAdmissionReviewAction,
  unassignAdmissionReviewerAction,
} from "@/features/admissions/actions/admission-actions";
import {
  formatAdmissionDateTime,
  formatAdmissionReviewDecision,
  formatAdmissionReviewStatus,
} from "@/features/admissions/components/admission-formatters";
import type { AdmissionApplicationDetail, AdmissionReviewer } from "@/features/admissions/types/admission";

type Props = {
  application: AdmissionApplicationDetail;
  reviewers: AdmissionReviewer[];
  canReview: boolean;
};

export function AdmissionReviewPanel({ application, reviewers, canReview }: Props) {
  const latestReview = application.reviews.toSorted((first, second) => second.updatedAt.localeCompare(first.updatedAt))[0];
  const reviewerId = latestReview?.reviewerId ?? application.assignedReviewerId ?? reviewers[0]?.id;
  const reviewerName = reviewers.find((reviewer) => reviewer.id === reviewerId)?.name ?? reviewerId ?? "Unassigned";

  return (
    <Card id="review">
      <SectionHeader eyebrow="Review" title="Admissions Review" />
      <div className="grid gap-4 p-4 sm:p-5">
        {latestReview ? (
          <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={latestReview.status === "completed" ? "success" : latestReview.status === "in_progress" ? "warning" : "info"}>{formatAdmissionReviewStatus(latestReview.status ?? "assigned")}</Badge>
              <span className="font-medium text-foreground">{reviewerName}</span>
            </div>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <Info label="Recommendation" value={formatAdmissionReviewDecision(latestReview.decision)} />
              <Info label="Score" value={latestReview.score === undefined ? "Not scored" : `${latestReview.score}/100`} />
              <Info label="Assigned" value={formatAdmissionDateTime(latestReview.assignedAt)} />
              <Info label="Completed" value={formatAdmissionDateTime(latestReview.completedAt ?? latestReview.reviewedAt)} />
            </dl>
            {latestReview.remarks ? <p className="mt-3 text-foreground-muted">{latestReview.remarks}</p> : null}
          </div>
        ) : (
          <EmptyState title="No review started" description="Assign a reviewer to begin the admissions review workflow." />
        )}

        {canReview ? (
          <div className="grid gap-3 rounded-lg border border-border p-3">
            <form action={assignAdmissionReviewerAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input name="applicationId" type="hidden" value={application.id} />
              <Select aria-label="Reviewer" name="reviewerId" defaultValue={reviewerId ?? ""}>
                {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
              </Select>
              <Button type="submit" variant="secondary">Assign</Button>
              <Button formAction={unassignAdmissionReviewerAction} type="submit" variant="ghost">Unassign</Button>
            </form>
            <form action={startAdmissionReviewAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input name="applicationId" type="hidden" value={application.id} />
              <input name="reviewerId" type="hidden" value={reviewerId ?? ""} />
              <Button disabled={!reviewerId || latestReview?.status === "completed"} type="submit" variant="primary">Start Review</Button>
            </form>
            <form action={completeAdmissionReviewAction} className="grid gap-3">
              <input name="applicationId" type="hidden" value={application.id} />
              <input name="reviewerId" type="hidden" value={reviewerId ?? ""} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Decision">
                  <Select name="decision" defaultValue={latestReview?.decision ?? "proceed"}>
                    <option value="proceed">Proceed</option>
                    <option value="hold">Hold</option>
                    <option value="request_information">Request information</option>
                    <option value="reject">Reject</option>
                  </Select>
                </Field>
                <Field label="Score">
                  <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" max={100} min={0} name="score" type="number" defaultValue={latestReview?.score ?? ""} />
                </Field>
              </div>
              <textarea className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm" name="remarks" placeholder="Review remarks" defaultValue={latestReview?.remarks ?? ""} />
              <Button disabled={!reviewerId} type="submit" variant="primary">Complete Review</Button>
            </form>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt><dd className="mt-1 text-foreground">{value}</dd></div>;
}
