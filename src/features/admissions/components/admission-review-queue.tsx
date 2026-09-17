import Link from "next/link";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import {
  assignAdmissionReviewerAction,
  completeAdmissionReviewAction,
  startAdmissionReviewAction,
} from "@/features/admissions/actions/admission-actions";
import {
  formatAdmissionDateTime,
  formatAdmissionReviewDecision,
  formatAdmissionReviewStatus,
} from "@/features/admissions/components/admission-formatters";
import { AdmissionDocumentCompletionBadge, AdmissionStatusBadge } from "@/features/admissions/components/admission-status-badge";
import type { AdmissionReviewer, AdmissionReviewQueueFilters, AdmissionReviewQueueResponse } from "@/features/admissions/types/admission";

type Props = {
  context: { school: string; campus: string; academicYear: string };
  data: AdmissionReviewQueueResponse;
  filters: AdmissionReviewQueueFilters;
  reviewers: AdmissionReviewer[];
};

export function AdmissionReviewQueue({ context, data, filters, reviewers }: Props) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        action={<Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium" href="/admissions/applications">Applications</Link>}
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Admissions", "Reviews"]} />}
        description="Assign reviewers, start reviews, and record recommendations from a tenant-scoped admissions queue."
        eyebrow="Admissions"
        title="Review Queue"
      />

      <Card>
        <SectionHeader eyebrow="Filters" title="Review Workbench" />
        <form className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-5">
          <Field label="Search"><input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" name="search" defaultValue={filters.query ?? ""} placeholder="Applicant or application" /></Field>
          <Field label="View">
            <Select name="view" defaultValue={filters.view ?? "all"}>
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </Select>
          </Field>
          <Field label="Reviewer">
            <Select name="reviewerId" defaultValue={filters.reviewerId ?? ""}>
              <option value="">All reviewers</option>
              {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">All statuses</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="returned">Returned</option>
            </Select>
          </Field>
          <Button className="self-end" type="submit" variant="primary">Apply</Button>
        </form>
      </Card>

      <Card>
        <SectionHeader eyebrow="Results" title={formatResultCount(data.page, data.pageSize, data.total, "applications")} />
        {data.items.length === 0 ? <div className="p-4 sm:p-5"><EmptyState title="No applications found" description="Adjust the review filters or check the selected admission scope." /></div> : null}
        <div className="divide-y divide-border">
          {data.items.map((application) => {
            const reviewerId = application.reviewerId ?? reviewers[0]?.id ?? "";
            return (
              <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px] sm:p-5" key={application.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdmissionStatusBadge status={application.status} />
                    <Badge tone={application.reviewStatus === "completed" ? "success" : application.reviewStatus === "in_progress" ? "warning" : "info"}>{formatAdmissionReviewStatus(application.reviewStatus)}</Badge>
                    <AdmissionDocumentCompletionBadge status={application.documentSummary.verified === application.documentSummary.required ? "complete" : "incomplete"} />
                  </div>
                  <p className="mt-3 responsive-text font-semibold text-foreground">{application.applicantName}</p>
                  <p className="mt-1 font-mono text-xs text-foreground-muted">{application.applicationNumber} / {application.appliedClassName ?? application.appliedClassId}</p>
                  <p className="mt-2 text-sm text-foreground-muted">Reviewer {application.reviewerName ?? application.reviewerId ?? "Unassigned"} / Submitted {formatAdmissionDateTime(application.submittedAt)}</p>
                  {application.recommendation ? <p className="mt-2 text-sm text-foreground">Recommendation: {formatAdmissionReviewDecision(application.recommendation)}</p> : null}
                  <Link className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" href={`/admissions/applications/${application.id}#review`}>Open Application 360</Link>
                </div>
                <div className="grid gap-2">
                  <form action={assignAdmissionReviewerAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input name="applicationId" type="hidden" value={application.id} />
                    <Select name="reviewerId" defaultValue={reviewerId}>
                      {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
                    </Select>
                    <Button type="submit" variant="secondary">Assign</Button>
                  </form>
                  <form action={startAdmissionReviewAction}>
                    <input name="applicationId" type="hidden" value={application.id} />
                    <input name="reviewerId" type="hidden" value={reviewerId} />
                    <Button disabled={!reviewerId || application.reviewStatus === "completed"} type="submit" variant="primary">Start Review</Button>
                  </form>
                  <form action={completeAdmissionReviewAction} className="grid gap-2">
                    <input name="applicationId" type="hidden" value={application.id} />
                    <input name="reviewerId" type="hidden" value={reviewerId} />
                    <Select name="decision" defaultValue="proceed">
                      <option value="proceed">Proceed</option>
                      <option value="hold">Hold</option>
                      <option value="request_information">Request information</option>
                      <option value="reject">Reject</option>
                    </Select>
                    <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" max={100} min={0} name="score" placeholder="Score" type="number" />
                    <Button disabled={!reviewerId} type="submit" variant="primary">Complete</Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function formatResultCount(page: number, pageSize: number, total: number, label: string) {
  if (total === 0) return `No ${label} found`;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return `Showing ${start}-${end} of ${total} ${label}`;
}
