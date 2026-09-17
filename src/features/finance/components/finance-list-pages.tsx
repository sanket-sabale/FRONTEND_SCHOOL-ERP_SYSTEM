import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { formatFinanceLabel, formatFinanceMoney } from "@/features/finance/components/finance-formatters";
import { FinanceStatusBadge } from "@/features/finance/components/finance-status-badge";
import type { FinanceDuesRecord, FinanceInvoice, FinanceListResponse, FinancePayment, FinanceReceipt, FinanceRefund } from "@/features/finance/types/finance";

type FinanceTableColumn<TItem> = {
  label: string;
  cell: (item: TItem) => React.ReactNode;
};

export function FinanceInvoicesPage({ data }: { data: FinanceListResponse<FinanceInvoice> }) {
  return <FinanceTablePage title="Invoices" eyebrow="Finance Core" description="Tenant-scoped invoices with line-item totals, verified paid amount, outstanding balance, and lifecycle status." data={data} columns={[
    { label: "Invoice", cell: (invoice) => <Stack primary={invoice.invoiceNumber} secondary={invoice.subject.displayName ?? invoice.subject.id} /> },
    { label: "Issue / Due", cell: (invoice) => `${invoice.issueDate} / ${invoice.dueDate}` },
    { label: "Total", cell: (invoice) => formatFinanceMoney(invoice.total) },
    { label: "Balance", cell: (invoice) => formatFinanceMoney(invoice.balance) },
    { label: "Status", cell: (invoice) => <FinanceStatusBadge status={invoice.status} /> },
  ]} />;
}

export function FinancePaymentsPage({ data }: { data: FinanceListResponse<FinancePayment> }) {
  return <FinanceTablePage title="Payments" eyebrow="Collections" description="Payments are separate from invoices and must be verified before they reduce outstanding dues." data={data} columns={[
    { label: "Payment", cell: (payment) => <Stack primary={payment.subject.displayName ?? payment.subject.id} secondary={payment.id} /> },
    { label: "Invoice", cell: (payment) => payment.invoiceNumber },
    { label: "Method", cell: (payment) => formatFinanceLabel(payment.method) },
    { label: "Amount", cell: (payment) => formatFinanceMoney(payment.amount) },
    { label: "Status", cell: (payment) => <FinanceStatusBadge status={payment.status} /> },
  ]} />;
}

export function FinanceReceiptsPage({ data }: { data: FinanceListResponse<FinanceReceipt> }) {
  return <FinanceTablePage title="Receipts" eyebrow="Receipt Identity" description="Receipts are persistent finance records issued after verified payments." data={data} columns={[
    { label: "Receipt", cell: (receipt) => <Stack primary={receipt.receiptNumber} secondary={receipt.paymentId} /> },
    { label: "Invoice", cell: (receipt) => receipt.invoiceNumber },
    { label: "Amount", cell: (receipt) => formatFinanceMoney(receipt.amount) },
    { label: "Issued", cell: (receipt) => receipt.issuedAt.slice(0, 10) },
    { label: "Issued By", cell: (receipt) => receipt.issuedBy },
  ]} />;
}

export function FinanceDuesPage({ data }: { data: FinanceListResponse<FinanceDuesRecord> }) {
  return <FinanceTablePage title="Dues" eyebrow="Outstanding" description="Dues are calculated by Finance from invoice balances and verified payment state." data={data} columns={[
    { label: "Invoice", cell: (due) => <Stack primary={due.invoiceNumber} secondary={due.subject.displayName ?? due.subject.id} /> },
    { label: "Due Date", cell: (due) => due.dueDate },
    { label: "Total", cell: (due) => formatFinanceMoney(due.total) },
    { label: "Outstanding", cell: (due) => formatFinanceMoney(due.outstanding) },
    { label: "Status", cell: (due) => <FinanceStatusBadge status={due.status} /> },
  ]} />;
}

export function FinanceRefundsPage({ data }: { data: FinanceListResponse<FinanceRefund> }) {
  return <FinanceTablePage title="Refunds" eyebrow="Controlled Refunds" description="Refunds are separate from payments and remain service-controlled for future payment-gateway integration." data={data} columns={[
    { label: "Refund", cell: (refund) => <Stack primary={refund.id} secondary={refund.reason} /> },
    { label: "Payment", cell: (refund) => refund.paymentId },
    { label: "Amount", cell: (refund) => formatFinanceMoney(refund.amount) },
    { label: "Requested", cell: (refund) => refund.requestedAt.slice(0, 10) },
    { label: "Status", cell: (refund) => <FinanceStatusBadge status={refund.status} /> },
  ]} />;
}

function FinanceTablePage<TItem extends { id?: string }>({ columns, data, description, eyebrow, title }: { columns: FinanceTableColumn<TItem>[]; data: FinanceListResponse<TItem>; description: string; eyebrow: string; title: string }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Finance", title]} />} description={description} eyebrow={eyebrow} title={title} />
      <Card>
        <SectionHeader title={title} eyebrow={`${data.total} records`} />
        {data.items.length === 0 ? <div className="p-4 sm:p-5"><EmptyState title={`No ${title.toLowerCase()}`} description="No finance records match the current tenant scope and filters." /></div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase text-foreground-muted">
                <tr>{columns.map((column) => <th className="px-4 py-3" key={column.label}>{column.label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((item, index) => <tr key={item.id ?? index}>{columns.map((column) => <td className="px-4 py-3 align-top" key={column.label}>{column.cell(item)}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stack({ primary, secondary }: { primary: string; secondary?: string }) {
  return <div className="min-w-0"><p className="responsive-text font-medium text-foreground">{primary}</p>{secondary ? <p className="mt-1 text-xs text-foreground-muted">{secondary}</p> : null}</div>;
}
