import { Badge, Button, Card, EmptyState, Field, SectionHeader, Select } from "@/components/ui";
import {
  cancelAdmissionEvaluationAction,
  createAdmissionEvaluationAction,
  recordAdmissionEvaluationResultAction,
  startAdmissionEvaluationAction,
} from "@/features/admissions/actions/admission-actions";
import {
  formatAdmissionDateTime,
  formatAdmissionEvaluationStatus,
  formatAdmissionEvaluationType,
} from "@/features/admissions/components/admission-formatters";
import type { AdmissionApplicationDetail, AdmissionReviewer } from "@/features/admissions/types/admission";

type Props = {
  application: AdmissionApplicationDetail;
  reviewers: AdmissionReviewer[];
  canSchedule: boolean;
};

export function AdmissionEvaluationPanel({ application, reviewers, canSchedule }: Props) {
  return (
    <Card id="evaluation">
      <SectionHeader eyebrow="Evaluation" title="Admission Evaluation" />
      <div className="grid gap-4 p-4 sm:p-5">
        {application.evaluations.length > 0 ? (
          <div className="grid gap-3">
            {application.evaluations.map((evaluation) => (
              <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm" key={evaluation.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={evaluation.status === "completed" ? "success" : evaluation.status === "cancelled" ? "danger" : "info"}>{formatAdmissionEvaluationStatus(evaluation.status)}</Badge>
                  <span className="font-medium text-foreground">{evaluation.title ?? formatAdmissionEvaluationType(evaluation.type)}</span>
                </div>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <Info label="Schedule" value={formatAdmissionDateTime(evaluation.scheduledAt)} />
                  <Info label="Evaluator" value={reviewers.find((reviewer) => reviewer.id === evaluation.evaluatorId)?.name ?? evaluation.evaluatorId ?? "Unassigned"} />
                  <Info label="Score" value={evaluation.score === undefined ? "Not scored" : `${evaluation.score}/${evaluation.maxScore ?? 100}`} />
                  <Info label="Result" value={evaluation.result?.replace(/_/g, " ") ?? "Not recorded"} />
                </dl>
                {evaluation.remarks ? <p className="mt-3 text-foreground-muted">{evaluation.remarks}</p> : null}
                {canSchedule && evaluation.status !== "completed" && evaluation.status !== "cancelled" ? (
                  <div className="mt-3 grid gap-2">
                    <form action={startAdmissionEvaluationAction}>
                      <input name="applicationId" type="hidden" value={application.id} />
                      <input name="evaluationId" type="hidden" value={evaluation.id} />
                      <Button disabled={evaluation.status !== "scheduled"} type="submit" variant="secondary">Start Evaluation</Button>
                    </form>
                    <form action={recordAdmissionEvaluationResultAction} className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
                      <input name="applicationId" type="hidden" value={application.id} />
                      <input name="evaluationId" type="hidden" value={evaluation.id} />
                      <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" max={evaluation.maxScore ?? 100} min={0} name="score" placeholder="Score" type="number" />
                      <Select name="result" defaultValue="recommended">
                        <option value="recommended">Recommended</option>
                        <option value="hold">Hold</option>
                        <option value="not_recommended">Not recommended</option>
                      </Select>
                      <Button type="submit" variant="primary">Record Result</Button>
                    </form>
                    <form action={cancelAdmissionEvaluationAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input name="applicationId" type="hidden" value={application.id} />
                      <input name="evaluationId" type="hidden" value={evaluation.id} />
                      <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" name="reason" placeholder="Cancellation reason" />
                      <Button type="submit" variant="ghost">Cancel</Button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No evaluation scheduled" description="Create an interaction, interview, test, or custom evaluation for this application." />
        )}

        {canSchedule ? (
          <form action={createAdmissionEvaluationAction} className="grid gap-3 rounded-lg border border-border p-3">
            <input name="applicationId" type="hidden" value={application.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type">
                <Select name="type" defaultValue="interview">
                  <option value="interview">Interview</option>
                  <option value="interaction">Interaction</option>
                  <option value="test">Test</option>
                  <option value="assessment">Assessment</option>
                  <option value="practical_assessment">Practical assessment</option>
                  <option value="academic_assessment">Academic assessment</option>
                  <option value="custom">Custom</option>
                </Select>
              </Field>
              <Field label="Evaluator">
                <Select name="evaluatorId" defaultValue={reviewers[0]?.id ?? ""}>
                  {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
                </Select>
              </Field>
              <Field label="Title">
                <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" name="title" placeholder="Optional title" />
              </Field>
              <Field label="Schedule">
                <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" name="scheduledAt" type="datetime-local" />
              </Field>
              <Field label="Mode">
                <Select name="mode" defaultValue="in_person">
                  <option value="in_person">In person</option>
                  <option value="online">Online</option>
                  <option value="phone">Phone</option>
                </Select>
              </Field>
              <Field label="Location">
                <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" name="location" placeholder="Room, link, or phone note" />
              </Field>
            </div>
            <Button type="submit" variant="primary">Create Evaluation</Button>
          </form>
        ) : null}
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt><dd className="mt-1 capitalize text-foreground">{value}</dd></div>;
}
