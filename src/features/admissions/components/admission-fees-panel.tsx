import { Badge, Button, Card, EmptyState, Field, SectionHeader, Select } from "@/components/ui";
import {
  createAdmissionInvoiceAction,
  recordAdmissionPaymentAction,
  verifyAdmissionPaymentAction,
} from "@/features/admissions/actions/admission-actions";
import { formatAdmissionDate, formatAdmissionDateTime, formatCurrency } from "@/features/admissions/components/admission-formatters";
import type { AdmissionApplicationDetail, AdmissionFinanceSummary } from "@/features/admissions/types/admission";

type Props = {
  application: AdmissionApplicationDetail;
  finance: AdmissionFinanceSummary;
  canManageFees: boolean;
};

export function AdmissionFeesPanel({ application, finance, canManageFees }: Props) {
  const canCreateInvoice = canManageFees && application.status === "approved" && !finance.invoiceId;
  const canRecordPayment = canManageFees && Boolean(finance.invoiceId) && finance.outstandingAmount > 0;
  const canVerifyPayment = canManageFees && finance.paymentHistory.some((payment) => payment.verificationStatus === "pending");

  return (
    <Card id="fees">
      <SectionHeader eyebrow="Fees" title="Finance Clearance" />
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Fee Amount" value={formatCurrency(finance.amount)} />
          <Metric label="Paid" value={formatCurrency(finance.paidAmount)} />
          <Metric label="Outstanding" value={formatCurrency(finance.outstandingAmount)} />
          <Metric label="Due Date" value={formatAdmissionDate(finance.dueDate)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={finance.paymentStatus === "paid" ? "success" : finance.paymentStatus === "not_started" ? "neutral" : "warning"}>{finance.paymentStatus.replace(/_/g, " ")}</Badge>
          <Badge tone={finance.verificationStatus === "verified" ? "success" : finance.verificationStatus === "rejected" ? "danger" : "info"}>{finance.verificationStatus.replace(/_/g, " ")}</Badge>
          <Badge tone={finance.financialClearanceStatus === "cleared" ? "success" : "warning"}>{finance.financialClearanceStatus.replace(/_/g, " ")}</Badge>
        </div>
        {finance.invoiceId ? (
          <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm">
            <p className="font-medium text-foreground">{finance.invoiceNumber}</p>
            <p className="mt-1 text-foreground-muted">Admission fee invoice owned by Finance boundary.</p>
          </div>
        ) : (
          <EmptyState title="No admission invoice" description="Create a finance-owned admission invoice after approval." />
        )}
        {finance.paymentHistory.length > 0 ? (
          <div className="grid gap-2">
            {finance.paymentHistory.map((payment) => (
              <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm" key={payment.id}>
                <div className="flex flex-wrap items-center gap-2"><Badge tone={payment.verificationStatus === "verified" ? "success" : "warning"}>{payment.verificationStatus}</Badge><span>{formatCurrency(payment.amount)} via {payment.method}</span></div>
                <p className="mt-1 text-foreground-muted">Paid {formatAdmissionDateTime(payment.paidAt)} / Verified {formatAdmissionDateTime(payment.verifiedAt)}</p>
              </div>
            ))}
          </div>
        ) : null}
        {canManageFees ? (
          <div className="grid gap-3 rounded-lg border border-border p-3">
            <form action={createAdmissionInvoiceAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
              <input name="applicationId" type="hidden" value={application.id} />
              <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" min={1} name="amount" placeholder="Amount" type="number" defaultValue={25000} />
              <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" name="dueDate" type="date" defaultValue="2026-09-30" />
              <Button disabled={!canCreateInvoice} type="submit" variant="primary">Create Invoice</Button>
            </form>
            <form action={recordAdmissionPaymentAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
              <input name="applicationId" type="hidden" value={application.id} />
              <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" min={1} name="paidAmount" placeholder="Paid amount" type="number" defaultValue={finance.outstandingAmount || 25000} />
              <Field label="Method">
                <Select name="method" defaultValue="UPI">
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cash">Cash</option>
                </Select>
              </Field>
              <Button disabled={!canRecordPayment} type="submit" variant="secondary">Record Payment</Button>
            </form>
            <form action={verifyAdmissionPaymentAction}>
              <input name="applicationId" type="hidden" value={application.id} />
              <Button disabled={!canVerifyPayment} type="submit" variant="primary">Verify Payment</Button>
            </form>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-surface-muted p-3"><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p><p className="mt-2 text-lg font-semibold text-foreground">{value}</p></div>;
}
