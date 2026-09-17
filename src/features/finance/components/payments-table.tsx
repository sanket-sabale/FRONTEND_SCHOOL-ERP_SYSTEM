import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { formatInr } from "@/lib/formatters";
import { payments } from "@/lib/mock-data";
import type { Payment } from "@/types/erp";

const columns: DataTableColumn<Payment>[] = [
  {
    key: "transaction",
    header: "Transaction",
    cell: (payment) => (
      <div>
        <p className="font-mono text-xs">{payment.id}</p>
        <p className="text-xs text-slate-500">{payment.date}</p>
      </div>
    ),
  },
  { key: "student", header: "Student", cell: (payment) => payment.student },
  { key: "invoice", header: "Invoice", cell: (payment) => payment.invoice },
  { key: "amount", header: "Amount", cell: (payment) => <span className="font-semibold">{formatInr(payment.amount)}</span> },
  { key: "method", header: "Method", cell: (payment) => payment.method },
  {
    key: "status",
    header: "Status",
    cell: (payment) => <Badge tone={payment.status === "Successful" ? "success" : payment.status === "Pending" ? "warning" : "danger"}>{payment.status}</Badge>,
  },
];

export function PaymentsTable() {
  return (
    <Card id="payments">
      <SectionHeader
        title="Payments & Receipts"
        eyebrow="Finance"
        action={<Button className="mobile-full-action" variant="secondary">Generate Report</Button>}
      />
      <DataTable
        columns={columns}
        data={payments}
        emptyDescription="Payments will appear here after invoices are collected for the selected school and academic year."
        emptyTitle="No payments found"
        getRowId={(payment) => payment.id}
        totalLabel="Showing latest 3 finance transactions"
      />
    </Card>
  );
}
