import { Badge, Button, Card, EmptyState, Field, SectionHeader, Select } from "@/components/ui";
import { sendAdmissionCommunicationAction } from "@/features/admissions/actions/admission-actions";
import { formatAdmissionDateTime } from "@/features/admissions/components/admission-formatters";
import type { AdmissionApplicationDetail, AdmissionCommunicationIntent } from "@/features/admissions/types/admission";

type Props = {
  application: AdmissionApplicationDetail;
  communications: AdmissionCommunicationIntent[];
  canSend: boolean;
};

export function AdmissionCommunicationPanel({ application, communications, canSend }: Props) {
  return (
    <Card id="communication">
      <SectionHeader eyebrow="Communication" title="Admission Communication" />
      <div className="grid gap-4 p-4 sm:p-5">
        {communications.length > 0 ? (
          <div className="grid gap-2">
            {communications.map((item) => (
              <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm" key={item.id}>
                <div className="flex flex-wrap items-center gap-2"><Badge tone={item.status === "sent" ? "success" : item.status === "failed" ? "danger" : "warning"}>{item.status}</Badge><span className="font-medium text-foreground">{item.subject}</span></div>
                <p className="mt-2 text-foreground-muted">{item.message}</p>
                <p className="mt-2 text-xs text-foreground-muted">Recipients {item.recipientGuardianIds.length} / Sent {formatAdmissionDateTime(item.sentAt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No admission communication" description="Messages sent from this panel appear in the existing Communication Center." />
        )}
        {canSend ? (
          <form action={sendAdmissionCommunicationAction} className="grid gap-3 rounded-lg border border-border p-3">
            <input name="applicationId" type="hidden" value={application.id} />
            <Field label="Event">
              <Select name="event" defaultValue="application_submitted">
                <option value="application_submitted">Application submitted</option>
                <option value="document_rejected">Document rejected</option>
                <option value="evaluation_scheduled">Evaluation scheduled</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="approved">Approved</option>
                <option value="fee_assessment_created">Fee assessment created</option>
                <option value="payment_verified">Payment verified</option>
                <option value="admission_confirmed">Admission confirmed</option>
                <option value="enrolled">Enrollment completed</option>
              </Select>
            </Field>
            <textarea className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm" name="message" placeholder="Optional message for guardians" />
            <Button type="submit" variant="primary">Send Update</Button>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
