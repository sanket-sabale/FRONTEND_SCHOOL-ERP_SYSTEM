import { Badge, Button, Card, EmptyState, Field, SectionHeader, Select } from "@/components/ui";
import {
  approveAdmissionApplicationAction,
  rejectAdmissionApplicationDecisionAction,
  shortlistAdmissionApplicationAction,
  waitlistAdmissionApplicationAction,
} from "@/features/admissions/actions/admission-actions";
import { formatAdmissionDateTime } from "@/features/admissions/components/admission-formatters";
import type { AdmissionApplicationDetail } from "@/features/admissions/types/admission";

type Props = {
  application: AdmissionApplicationDetail;
  canApprove: boolean;
  canReject: boolean;
  canShortlist: boolean;
  canWaitlist: boolean;
};

export function AdmissionDecisionPanel({ application, canApprove, canReject, canShortlist, canWaitlist }: Props) {
  const readiness = application.decisionReadiness;

  return (
    <Card id="decision">
      <SectionHeader eyebrow="Decision" title="Decision Readiness" />
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-2">
          {readiness.checks.map((check) => (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm" key={check.label}>
              <div>
                <p className="font-medium text-foreground">{check.label}</p>
                <p className="mt-1 text-foreground-muted">{check.message}</p>
              </div>
              <Badge tone={check.passed ? "success" : "warning"}>{check.passed ? "Ready" : "Blocked"}</Badge>
            </div>
          ))}
        </div>
        {readiness.warnings.map((warning) => <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200" key={warning}>{warning}</p>)}

        {application.decisions.length > 0 ? (
          <div className="grid gap-2">
            {application.decisions.map((decision) => (
              <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm" key={decision.id}>
                <div className="flex flex-wrap items-center gap-2"><Badge tone={decision.decision === "approved" ? "success" : decision.decision === "rejected" ? "danger" : "warning"}>{decision.decision}</Badge><span>{formatAdmissionDateTime(decision.decidedAt)}</span></div>
                {decision.reason ? <p className="mt-2 text-foreground-muted">{decision.reason}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No final decision recorded" description="Shortlist, approve, waitlist, or reject when the application is ready." />
        )}

        <div className="grid gap-3 rounded-lg border border-border p-3">
          <form action={shortlistAdmissionApplicationAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input name="applicationId" type="hidden" value={application.id} />
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" name="reason" placeholder="Shortlist reason" />
            <Button disabled={!canShortlist || !readiness.eligible} type="submit" variant="primary">Shortlist</Button>
          </form>
          <form action={approveAdmissionApplicationAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
            <input name="applicationId" type="hidden" value={application.id} />
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" name="reason" placeholder="Approval note" />
            <ReasonCodeSelect />
            <Button disabled={!canApprove || application.status !== "shortlisted" || !readiness.eligible} type="submit" variant="primary">Approve</Button>
          </form>
          <form action={waitlistAdmissionApplicationAction} className="grid gap-2 sm:grid-cols-[100px_minmax(0,1fr)_160px_auto]">
            <input name="applicationId" type="hidden" value={application.id} />
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" min={1} name="waitlistPosition" placeholder="Rank" type="number" />
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" name="reason" placeholder="Waitlist note" />
            <ReasonCodeSelect />
            <Button disabled={!canWaitlist || application.status !== "shortlisted"} type="submit" variant="secondary">Waitlist</Button>
          </form>
          <form action={rejectAdmissionApplicationDecisionAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
            <input name="applicationId" type="hidden" value={application.id} />
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" name="reason" placeholder="Rejection reason" required />
            <ReasonCodeSelect />
            <Button disabled={!canReject || !["under_review", "shortlisted", "waitlisted"].includes(application.status)} type="submit" variant="destructive">Reject</Button>
          </form>
        </div>
      </div>
    </Card>
  );
}

function ReasonCodeSelect() {
  return (
    <Field label="Reason code">
      <Select name="reasonCode" defaultValue="administrative">
        <option value="eligibility">Eligibility</option>
        <option value="documentation">Documentation</option>
        <option value="evaluation">Evaluation</option>
        <option value="capacity">Capacity</option>
        <option value="administrative">Administrative</option>
        <option value="other">Other</option>
      </Select>
    </Field>
  );
}
