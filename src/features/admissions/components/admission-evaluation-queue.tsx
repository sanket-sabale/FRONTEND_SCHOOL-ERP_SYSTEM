import Link from "next/link";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import {
  createAdmissionEvaluationAction,
  recordAdmissionEvaluationResultAction,
  startAdmissionEvaluationAction,
} from "@/features/admissions/actions/admission-actions";
import {
  formatAdmissionDateTime,
  formatAdmissionEvaluationStatus,
  formatAdmissionEvaluationType,
} from "@/features/admissions/components/admission-formatters";
import type { AdmissionEvaluationQueueFilters, AdmissionEvaluationQueueResponse, AdmissionReviewer } from "@/features/admissions/types/admission";

type Props = {
  context: { school: string; campus: string; academicYear: string };
  data: AdmissionEvaluationQueueResponse;
  filters: AdmissionEvaluationQueueFilters;
  reviewers: AdmissionReviewer[];
};

export function AdmissionEvaluationQueue({ context, data, filters, reviewers }: Props) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        action={<Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium" href="/admissions/reviews">Review Queue</Link>}
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Admissions", "Evaluations"]} />}
        description="Schedule and complete interviews, interactions, tests, assessments, and custom admission evaluations."
        eyebrow="Admissions"
        title="Evaluation Queue"
      />

      <Card>
        <SectionHeader eyebrow="Filters" title="Evaluation Workbench" />
        <form className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-5">
          <Field label="Search"><input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" name="search" defaultValue={filters.query ?? ""} placeholder="Applicant or evaluation" /></Field>
          <Field label="View">
            <Select name="view" defaultValue={filters.view ?? "all"}>
              <option value="all">All</option>
              <option value="upcoming">Upcoming</option>
              <option value="today">Today</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <Field label="Evaluator">
            <Select name="evaluatorId" defaultValue={filters.evaluatorId ?? ""}>
              <option value="">All evaluators</option>
              {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">All statuses</option>
              <option value="planned">Planned</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No show</option>
            </Select>
          </Field>
          <Button className="self-end" type="submit" variant="primary">Apply</Button>
        </form>
      </Card>

      <Card>
        <SectionHeader eyebrow="Results" title={data.total === 0 ? "No evaluations found" : `Showing ${data.items.length} of ${data.total} evaluations`} />
        {data.items.length === 0 ? <div className="p-4 sm:p-5"><EmptyState title="No evaluations found" description="Create evaluations from an Application 360 page or adjust filters." /></div> : null}
        <div className="divide-y divide-border">
          {data.items.map((evaluation) => (
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_330px] sm:p-5" key={evaluation.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={evaluation.status === "completed" ? "success" : evaluation.status === "cancelled" ? "danger" : "info"}>{formatAdmissionEvaluationStatus(evaluation.status)}</Badge>
                  <Badge tone="neutral">{formatAdmissionEvaluationType(evaluation.type)}</Badge>
                </div>
                <p className="mt-3 responsive-text font-semibold text-foreground">{evaluation.applicantName}</p>
                <p className="mt-1 font-mono text-xs text-foreground-muted">{evaluation.applicationNumber} / {evaluation.appliedClassName ?? evaluation.appliedClassId}</p>
                <p className="mt-2 text-sm text-foreground-muted">Scheduled {formatAdmissionDateTime(evaluation.scheduledAt)} / {reviewers.find((reviewer) => reviewer.id === evaluation.evaluatorId)?.name ?? evaluation.evaluatorId ?? "Unassigned"}</p>
                <Link className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" href={`/admissions/applications/${evaluation.applicationId}#evaluation`}>Open Application 360</Link>
              </div>
              <div className="grid gap-2">
                <form action={startAdmissionEvaluationAction}>
                  <input name="applicationId" type="hidden" value={evaluation.applicationId} />
                  <input name="evaluationId" type="hidden" value={evaluation.id} />
                  <Button disabled={evaluation.status !== "scheduled"} type="submit" variant="secondary">Start Evaluation</Button>
                </form>
                <form action={recordAdmissionEvaluationResultAction} className="grid gap-2">
                  <input name="applicationId" type="hidden" value={evaluation.applicationId} />
                  <input name="evaluationId" type="hidden" value={evaluation.id} />
                  <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" max={evaluation.maxScore ?? 100} min={0} name="score" placeholder="Score" type="number" />
                  <Select name="result" defaultValue="recommended">
                    <option value="recommended">Recommended</option>
                    <option value="hold">Hold</option>
                    <option value="not_recommended">Not recommended</option>
                  </Select>
                  <Button disabled={evaluation.status === "completed" || evaluation.status === "cancelled"} type="submit" variant="primary">Record Result</Button>
                </form>
                <form action={createAdmissionEvaluationAction} className="grid gap-2">
                  <input name="applicationId" type="hidden" value={evaluation.applicationId} />
                  <input name="type" type="hidden" value={evaluation.type} />
                  <input name="evaluatorId" type="hidden" value={evaluation.evaluatorId ?? reviewers[0]?.id ?? ""} />
                  <Button type="submit" variant="ghost">Add Follow-up</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
