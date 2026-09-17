import { hasPermission } from "@/components/shared/permission-gate";
import type { PermissionContext, TenantScope } from "@/lib/platform/contracts";
import { addMoney, compareMoney, isPositiveMoney, subtractMoney, zeroMoney } from "@/lib/platform/money";
import type { FinanceInvoice, FinancePayment, FinanceRefund, InvoiceLineItem } from "@/features/finance/types/finance";
import { ApiError } from "@/lib/api/client";

export function requireFinancePermission(context: PermissionContext, permission = "fees.view" as const) {
  if (!hasPermission(context.role, permission)) {
    throw new ApiError(403, "You do not have permission to perform this finance operation.");
  }
}

export function isSameFinanceScope(record: TenantScope, scope: TenantScope) {
  return record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId;
}

export function calculateLineTotal(lineItems: InvoiceLineItem[]) {
  return lineItems.reduce((total, line) => addMoney(total, line.amount), zeroMoney());
}

export function recalculateInvoice(invoice: FinanceInvoice, payments: FinancePayment[], refunds: FinanceRefund[], today: string): FinanceInvoice {
  const verifiedPaid = payments
    .filter((payment) => payment.invoiceId === invoice.id && payment.status === "verified")
    .reduce((total, payment) => addMoney(total, payment.amount), zeroMoney(invoice.total.currency));
  const processedRefunds = refunds
    .filter((refund) => refund.invoiceId === invoice.id && refund.status === "processed")
    .reduce((total, refund) => addMoney(total, refund.amount), zeroMoney(invoice.total.currency));
  const netPaid = subtractMoney(verifiedPaid, processedRefunds);
  const balance = maxZero(subtractMoney(invoice.total, netPaid));
  const paidComparison = compareMoney(balance, zeroMoney(invoice.total.currency));
  const status = invoice.status === "cancelled"
    ? "cancelled"
    : paidComparison === 0
      ? "paid"
      : compareMoney(netPaid, zeroMoney(invoice.total.currency)) > 0
        ? "partially_paid"
        : invoice.dueDate < today
          ? "overdue"
          : "issued";

  return { ...invoice, paid: maxZero(netPaid), balance, status, updatedAt: invoice.updatedAt };
}

export function assertPaymentCanBeRecorded(invoice: FinanceInvoice, amount = zeroMoney()) {
  if (invoice.status === "cancelled") throw new ApiError(422, "Cancelled invoices cannot receive payments.");
  if (!isPositiveMoney(amount)) throw new ApiError(422, "Payment amount must be greater than zero.");
  if (compareMoney(amount, invoice.balance) > 0) throw new ApiError(422, "Payment amount cannot exceed the outstanding invoice balance.");
}

export function assertPaymentCanBeVerified(payment: FinancePayment) {
  if (payment.status !== "pending_verification" && payment.status !== "recorded") {
    throw new ApiError(409, "Only recorded or pending verification payments can be verified.");
  }
}

export function assertRefundCanBeRequested(payment: FinancePayment, amount = zeroMoney()) {
  if (payment.status !== "verified") throw new ApiError(422, "Only verified payments can be refunded.");
  if (!isPositiveMoney(amount)) throw new ApiError(422, "Refund amount must be greater than zero.");
  if (compareMoney(amount, payment.amount) > 0) throw new ApiError(422, "Refund amount cannot exceed the original payment amount.");
}

function maxZero(value: ReturnType<typeof zeroMoney>) {
  return compareMoney(value, zeroMoney(value.currency)) < 0 ? zeroMoney(value.currency) : value;
}
