import { Badge } from "@/components/ui";
import { formatFinanceLabel } from "@/features/finance/components/finance-formatters";
import type { InvoiceStatus, PaymentStatus, RefundStatus } from "@/features/finance/types/finance";

type FinanceStatus = InvoiceStatus | PaymentStatus | RefundStatus | "active" | "inactive" | "archived" | "draft" | "open" | "due_soon" | "cleared";

export function FinanceStatusBadge({ status }: { status: FinanceStatus }) {
  const tone =
    status === "paid" || status === "verified" || status === "processed" || status === "cleared" || status === "active"
      ? "success"
      : status === "overdue" || status === "rejected" || status === "cancelled"
        ? "danger"
        : status === "partially_paid" || status === "pending_verification" || status === "requested" || status === "due_soon"
          ? "warning"
          : "neutral";

  return <Badge tone={tone}>{formatFinanceLabel(status)}</Badge>;
}
