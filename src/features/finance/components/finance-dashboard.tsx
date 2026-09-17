import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { formatFinanceLabel, formatFinanceMoney } from "@/features/finance/components/finance-formatters";
import { FinanceStatusBadge } from "@/features/finance/components/finance-status-badge";
import type { FinanceDashboardSummary } from "@/features/finance/types/finance";

export function FinanceDashboard({ context, summary }: { context: { school: string; campus: string; academicYear: string }; summary: FinanceDashboardSummary }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Finance", context.academicYear]} />}
        description="Tenant-scoped finance core for invoices, verified collections, dues, receipts, refunds, and reporting foundations."
        eyebrow="Finance Core"
        title="Finance"
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="grid gap-2 text-sm">
            <ContextLine label="School" value={context.school} />
            <ContextLine label="Campus" value={context.campus} />
            <ContextLine label="Pending verification" value={String(summary.pendingVerificationCount)} />
          </div>
        </Card>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Today" value={formatFinanceMoney(summary.todayCollection)} tone="info" />
        <Metric label="Billed" value={formatFinanceMoney(summary.totalBilled)} />
        <Metric label="Collected" value={formatFinanceMoney(summary.totalCollected)} tone="success" />
        <Metric label="Outstanding" value={formatFinanceMoney(summary.totalOutstanding)} tone="warning" />
        <Metric label="Overdue" value={formatFinanceMoney(summary.overdueAmount)} tone="danger" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader title="Recent Invoices" eyebrow="Billing" action={<FinanceLink href="/finance/invoices" label="Open invoices" />} />
          <div className="divide-y divide-border">
            {summary.recentInvoices.map((invoice) => (
              <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5" key={invoice.id}>
                <div className="min-w-0">
                  <p className="responsive-text font-semibold text-foreground">{invoice.invoiceNumber}</p>
                  <p className="mt-1 text-sm text-foreground-muted">{invoice.subject.displayName} / Due {invoice.dueDate}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="font-semibold text-foreground">{formatFinanceMoney(invoice.balance)}</span>
                  <FinanceStatusBadge status={invoice.status} />
                </div>
              </div>
            ))}
            {summary.recentInvoices.length === 0 ? <div className="p-4 sm:p-5"><EmptyState title="No invoices" description="Invoices will appear after fee assessments are billed." /></div> : null}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Payment Methods" eyebrow="Collections" action={<FinanceLink href="/finance/payments" label="Open payments" />} />
          <div className="space-y-3 p-4 sm:p-5">
            {summary.paymentsByMethod.map((method) => (
              <div className="rounded-lg border border-border bg-surface-muted p-3" key={method.method}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{formatFinanceLabel(method.method)}</p>
                    <p className="mt-1 text-xs text-foreground-muted">{method.count} verified payment{method.count === 1 ? "" : "s"}</p>
                  </div>
                  <Badge tone="success">{formatFinanceMoney(method.amount)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <SectionHeader title="Recent Payments" eyebrow="Verification" />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase text-foreground-muted">
              <tr><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summary.recentPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3"><p className="font-medium text-foreground">{payment.subject.displayName}</p><p className="font-mono text-xs text-foreground-muted">{payment.id}</p></td>
                  <td className="px-4 py-3">{payment.invoiceNumber}</td>
                  <td className="px-4 py-3">{formatFinanceLabel(payment.method)}</td>
                  <td className="px-4 py-3 font-semibold">{formatFinanceMoney(payment.amount)}</td>
                  <td className="px-4 py-3"><FinanceStatusBadge status={payment.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, tone = "neutral", value }: { label: string; tone?: "success" | "warning" | "danger" | "info" | "neutral"; value: string }) {
  return <Card className="responsive-card-padding"><p className="text-sm text-foreground-muted">{label}</p><p className="responsive-text mt-2 text-xl font-semibold text-foreground">{value}</p><Badge tone={tone}>Finance</Badge></Card>;
}

function FinanceLink({ href, label }: { href: string; label: string }) {
  return <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={href}>{label}</Link>;
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 min-[480px]:grid-cols-[auto_1fr]"><span className="text-foreground-muted">{label}</span><span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span></div>;
}
