import { invoiceFilterSchema, paymentFilterSchema, paymentVerificationSchema, financePaymentInputSchema, financeRefundInputSchema, financeScopeSchema, financeFiltersSchema, refundFilterSchema } from "@/features/finance/schemas/finance.schema";
import { assertPaymentCanBeRecorded, assertPaymentCanBeVerified, assertRefundCanBeRequested, calculateLineTotal, isSameFinanceScope, recalculateInvoice, requireFinancePermission } from "@/features/finance/services/finance-rules";
import { mockFeeAssessments, mockFeeAssignments, mockFeeStructures, mockFinanceAuditEvents, mockFinanceInvoices, mockFinancePayments, mockFinanceReceipts, mockFinanceRefunds } from "@/features/finance/services/mock-finance";
import type { FeeAssessment, FeeAssignment, FeeStructure, FinanceAuditEvent, FinanceDashboardSummary, FinanceDuesRecord, FinanceFilters, FinanceInvoice, FinanceListResponse, FinancePayment, FinancePaymentInput, FinancePaymentVerificationInput, FinanceReceipt, FinanceRefund, FinanceRefundInput, StudentFinanceSummary } from "@/features/finance/types/finance";
import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { createPagination, type PermissionContext } from "@/lib/platform/contracts";
import { currentTimestamp, todayIsoDate } from "@/lib/platform/dates";
import { addMoney, compareMoney, subtractMoney, zeroMoney } from "@/lib/platform/money";

const feeStructures = [...mockFeeStructures];
const feeAssignments = [...mockFeeAssignments];
const feeAssessments = [...mockFeeAssessments];
const invoices = recalculateAllInvoices([...mockFinanceInvoices], mockFinancePayments, mockFinanceRefunds);
let payments = [...mockFinancePayments];
let receipts = [...mockFinanceReceipts];
let refunds = [...mockFinanceRefunds];
let auditEvents = [...mockFinanceAuditEvents];

export const financeService = {
  async getDashboard(scope: TenantScopedQuery): Promise<FinanceDashboardSummary> {
    const parsed = financeScopeSchema.parse(scope);
    const scopedInvoices = recalculateAllInvoices(invoices.filter((invoice) => isSameFinanceScope(invoice, parsed)), payments, refunds);
    const scopedPayments = payments.filter((payment) => isSameFinanceScope(payment, parsed));
    const verifiedPayments = scopedPayments.filter((payment) => payment.status === "verified");
    const today = todayIsoDate();

    const totalBilled = scopedInvoices.reduce((total, invoice) => invoice.status === "cancelled" ? total : addMoney(total, invoice.total), zeroMoney());
    const totalCollected = verifiedPayments.reduce((total, payment) => addMoney(total, payment.amount), zeroMoney());
    const totalOutstanding = scopedInvoices.reduce((total, invoice) => addMoney(total, invoice.balance), zeroMoney());
    const overdueAmount = scopedInvoices.filter((invoice) => invoice.status === "overdue").reduce((total, invoice) => addMoney(total, invoice.balance), zeroMoney());
    const todayCollection = verifiedPayments.filter((payment) => payment.verifiedAt?.slice(0, 10) === today || payment.recordedAt.slice(0, 10) === today).reduce((total, payment) => addMoney(total, payment.amount), zeroMoney());

    return {
      todayCollection,
      totalBilled,
      totalCollected,
      totalOutstanding,
      overdueAmount,
      pendingVerificationCount: scopedPayments.filter((payment) => payment.status === "pending_verification" || payment.status === "recorded").length,
      collectionRate: compareMoney(totalBilled, zeroMoney()) === 0 ? 0 : Math.round((Number(totalCollected.amount) / Number(totalBilled.amount)) * 1000) / 10,
      paymentsByMethod: getPaymentsByMethod(verifiedPayments),
      recentInvoices: scopedInvoices.toSorted((first, second) => second.issueDate.localeCompare(first.issueDate)).slice(0, 5),
      recentPayments: scopedPayments.toSorted((first, second) => second.recordedAt.localeCompare(first.recordedAt)).slice(0, 5),
    };
  },

  async listFeeStructures(scope: TenantScopedQuery, filters: FinanceFilters = {}): Promise<FinanceListResponse<FeeStructure>> {
    const parsed = financeFiltersSchema.parse(filters);
    const query = parsed.query?.toLowerCase();
    return paginate(feeStructures
      .filter((fee) => isSameFinanceScope(fee, scope))
      .filter((fee) => !parsed.status || fee.status === parsed.status)
      .filter((fee) => !query || [fee.name, fee.code, fee.category, fee.frequency].join(" ").toLowerCase().includes(query))
      .toSorted((first, second) => first.name.localeCompare(second.name, "en-IN", { sensitivity: "base" })), parsed.page, parsed.pageSize);
  },

  async listAssignments(scope: TenantScopedQuery, filters: FinanceFilters = {}): Promise<FinanceListResponse<FeeAssignment>> {
    const parsed = financeFiltersSchema.parse(filters);
    return paginate(feeAssignments.filter((assignment) => isSameFinanceScope(assignment, scope)).filter((assignment) => !parsed.subjectId || assignment.subject.id === parsed.subjectId), parsed.page, parsed.pageSize);
  },

  async listAssessments(scope: TenantScopedQuery, filters: FinanceFilters = {}): Promise<FinanceListResponse<FeeAssessment>> {
    const parsed = financeFiltersSchema.parse(filters);
    return paginate(feeAssessments.filter((assessment) => isSameFinanceScope(assessment, scope)).filter((assessment) => !parsed.subjectId || assessment.subject.id === parsed.subjectId), parsed.page, parsed.pageSize);
  },

  async listInvoices(scope: TenantScopedQuery, filters: FinanceFilters = {}): Promise<FinanceListResponse<FinanceInvoice>> {
    const parsed = invoiceFilterSchema.parse(filters);
    const query = parsed.query?.toLowerCase();
    const records = recalculateAllInvoices(invoices.filter((invoice) => isSameFinanceScope(invoice, scope)), payments, refunds)
      .filter((invoice) => !parsed.status || invoice.status === parsed.status)
      .filter((invoice) => !parsed.subjectId || invoice.subject.id === parsed.subjectId)
      .filter((invoice) => !parsed.dateFrom || invoice.issueDate >= parsed.dateFrom)
      .filter((invoice) => !parsed.dateTo || invoice.issueDate <= parsed.dateTo)
      .filter((invoice) => !query || [invoice.invoiceNumber, invoice.subject.displayName, invoice.status].filter(Boolean).join(" ").toLowerCase().includes(query))
      .toSorted((first, second) => second.issueDate.localeCompare(first.issueDate) || second.invoiceNumber.localeCompare(first.invoiceNumber));
    return paginate(records, parsed.page, parsed.pageSize);
  },

  async getInvoice(scope: TenantScopedQuery, invoiceId: string) {
    const invoice = recalculateAllInvoices(invoices, payments, refunds).find((record) => record.id === invoiceId && isSameFinanceScope(record, scope));
    return invoice ?? null;
  },

  async listPayments(scope: TenantScopedQuery, filters: FinanceFilters & { method?: string } = {}): Promise<FinanceListResponse<FinancePayment>> {
    const parsed = paymentFilterSchema.parse(filters);
    const query = parsed.query?.toLowerCase();
    return paginate(payments
      .filter((payment) => isSameFinanceScope(payment, scope))
      .filter((payment) => !parsed.status || payment.status === parsed.status)
      .filter((payment) => !parsed.method || payment.method === parsed.method)
      .filter((payment) => !parsed.subjectId || payment.subject.id === parsed.subjectId)
      .filter((payment) => !query || [payment.invoiceNumber, payment.subject.displayName, payment.externalReference, payment.status, payment.method].filter(Boolean).join(" ").toLowerCase().includes(query))
      .toSorted((first, second) => second.recordedAt.localeCompare(first.recordedAt)), parsed.page, parsed.pageSize);
  },

  async listReceipts(scope: TenantScopedQuery, filters: FinanceFilters = {}): Promise<FinanceListResponse<FinanceReceipt>> {
    const parsed = financeFiltersSchema.parse(filters);
    return paginate(receipts.filter((receipt) => isSameFinanceScope(receipt, scope)).toSorted((first, second) => second.issuedAt.localeCompare(first.issuedAt)), parsed.page, parsed.pageSize);
  },

  async listDues(scope: TenantScopedQuery, filters: FinanceFilters = {}): Promise<FinanceListResponse<FinanceDuesRecord>> {
    const parsed = financeFiltersSchema.parse(filters);
    const today = todayIsoDate();
    const records = recalculateAllInvoices(invoices.filter((invoice) => isSameFinanceScope(invoice, scope)), payments, refunds)
      .filter((invoice) => invoice.status !== "cancelled")
      .map((invoice) => {
        const cleared = compareMoney(invoice.balance, zeroMoney()) === 0;
        const status: FinanceDuesRecord["status"] = cleared ? "cleared" : invoice.dueDate < today ? "overdue" : daysUntil(invoice.dueDate, today) <= 7 ? "due_soon" : "open";
        return { ...scope, id: invoice.id, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, subject: invoice.subject, dueDate: invoice.dueDate, total: invoice.total, paid: invoice.paid, outstanding: invoice.balance, status };
      })
      .filter((due) => !parsed.subjectId || due.subject.id === parsed.subjectId)
      .filter((due) => !parsed.status || due.status === parsed.status)
      .filter((due) => compareMoney(due.outstanding, zeroMoney()) > 0)
      .toSorted((first, second) => first.dueDate.localeCompare(second.dueDate));
    return paginate(records, parsed.page, parsed.pageSize);
  },

  async listRefunds(scope: TenantScopedQuery, filters: FinanceFilters = {}): Promise<FinanceListResponse<FinanceRefund>> {
    const parsed = refundFilterSchema.parse(filters);
    return paginate(refunds.filter((refund) => isSameFinanceScope(refund, scope)).filter((refund) => !parsed.status || refund.status === parsed.status), parsed.page, parsed.pageSize);
  },

  async getStudentFinanceSummary(scope: TenantScopedQuery, studentId: string): Promise<StudentFinanceSummary> {
    const studentInvoices = recalculateAllInvoices(invoices.filter((invoice) => isSameFinanceScope(invoice, scope) && invoice.subject.type === "student" && invoice.subject.id === studentId), payments, refunds);
    const studentPayments = payments.filter((payment) => isSameFinanceScope(payment, scope) && payment.subject.type === "student" && payment.subject.id === studentId);
    return {
      ...scope,
      studentId,
      totalBilled: studentInvoices.reduce((total, invoice) => addMoney(total, invoice.total), zeroMoney()),
      totalPaid: studentPayments.filter((payment) => payment.status === "verified").reduce((total, payment) => addMoney(total, payment.amount), zeroMoney()),
      totalOutstanding: studentInvoices.reduce((total, invoice) => addMoney(total, invoice.balance), zeroMoney()),
      overdueAmount: studentInvoices.filter((invoice) => invoice.status === "overdue").reduce((total, invoice) => addMoney(total, invoice.balance), zeroMoney()),
      recentInvoices: studentInvoices.slice(0, 5),
      recentPayments: studentPayments.slice(0, 5),
    };
  },

  async recordPayment(input: FinancePaymentInput): Promise<FinancePayment> {
    const parsed = financePaymentInputSchema.parse(input);
    requireFinancePermission(parsed);
    const invoice = await this.getInvoice(parsed, parsed.invoiceId);
    if (!invoice) throw new ApiError(404, "Invoice could not be found in the current finance scope.");
    if (payments.some((payment) => isSameFinanceScope(payment, parsed) && payment.idempotencyKey && payment.idempotencyKey === parsed.idempotencyKey)) {
      throw new ApiError(409, "A payment with this idempotency key already exists.");
    }
    if (parsed.externalReference && payments.some((payment) => isSameFinanceScope(payment, parsed) && payment.externalReference === parsed.externalReference)) {
      throw new ApiError(409, "A payment with this reference already exists.");
    }
    assertPaymentCanBeRecorded(invoice, parsed.amount);
    const now = currentTimestamp();
    const payment: FinancePayment = { ...scopeFrom(parsed), id: createId("pay"), invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, subject: invoice.subject, amount: parsed.amount, method: parsed.method, externalReference: parsed.externalReference, idempotencyKey: parsed.idempotencyKey, recordedAt: now, recordedBy: parsed.actorId, status: "pending_verification" };
    payments = [payment, ...payments];
    recordAudit(parsed, "payment.recorded", "payment", payment.id, undefined, payment.status);
    return payment;
  },

  async verifyPayment(input: FinancePaymentVerificationInput): Promise<{ payment: FinancePayment; receipt: FinanceReceipt; invoice: FinanceInvoice }> {
    const parsed = paymentVerificationSchema.parse(input);
    requireFinancePermission(parsed);
    const payment = payments.find((record) => record.id === parsed.paymentId && isSameFinanceScope(record, parsed));
    if (!payment) throw new ApiError(404, "Payment could not be found in the current finance scope.");
    assertPaymentCanBeVerified(payment);
    const now = currentTimestamp();
    const nextPayment: FinancePayment = { ...payment, status: "verified", verifiedAt: now, verifiedBy: parsed.actorId };
    payments = payments.map((record) => record.id === payment.id ? nextPayment : record);
    const receipt = issueReceipt(parsed, nextPayment);
    const invoice = await this.getInvoice(parsed, payment.invoiceId);
    if (!invoice) throw new ApiError(404, "Invoice could not be found after payment verification.");
    recordAudit(parsed, "payment.verified", "payment", payment.id, payment.status, nextPayment.status);
    return { payment: nextPayment, receipt, invoice };
  },

  async rejectPayment(input: FinancePaymentVerificationInput): Promise<FinancePayment> {
    const parsed = paymentVerificationSchema.required({ reason: true }).parse(input);
    requireFinancePermission(parsed);
    const payment = payments.find((record) => record.id === parsed.paymentId && isSameFinanceScope(record, parsed));
    if (!payment) throw new ApiError(404, "Payment could not be found in the current finance scope.");
    assertPaymentCanBeVerified(payment);
    const now = currentTimestamp();
    const nextPayment = { ...payment, status: "rejected" as const, rejectedAt: now, rejectionReason: parsed.reason };
    payments = payments.map((record) => record.id === payment.id ? nextPayment : record);
    recordAudit(parsed, "payment.rejected", "payment", payment.id, payment.status, nextPayment.status);
    return nextPayment;
  },

  async requestRefund(input: FinanceRefundInput): Promise<FinanceRefund> {
    const parsed = financeRefundInputSchema.parse(input);
    requireFinancePermission(parsed);
    const payment = payments.find((record) => record.id === parsed.paymentId && isSameFinanceScope(record, parsed));
    if (!payment) throw new ApiError(404, "Payment could not be found in the current finance scope.");
    assertRefundCanBeRequested(payment, parsed.amount);
    if (parsed.refundId && refunds.some((refund) => refund.id === parsed.refundId && isSameFinanceScope(refund, parsed))) {
      throw new ApiError(409, "A refund with this idempotent refund ID already exists.");
    }
    const refund: FinanceRefund = { ...scopeFrom(parsed), id: parsed.refundId ?? createId("refund"), paymentId: payment.id, invoiceId: payment.invoiceId, amount: parsed.amount, reason: parsed.reason, requestedAt: currentTimestamp(), requestedBy: parsed.actorId, status: "requested" };
    refunds = [refund, ...refunds];
    recordAudit(parsed, "refund.requested", "refund", refund.id, undefined, refund.status);
    return refund;
  },

  async getAuditEvents(scope: TenantScopedQuery): Promise<FinanceAuditEvent[]> {
    return auditEvents.filter((event) => isSameFinanceScope(event, scope));
  },
};

function paginate<TItem>(items: TItem[], page: number, pageSize: number): FinanceListResponse<TItem> {
  const pagination = createPagination(page, pageSize, items.length);
  const start = (pagination.page - 1) * pagination.pageSize;
  return { ...pagination, items: items.slice(start, start + pagination.pageSize) };
}

function recalculateAllInvoices(records: FinanceInvoice[], paymentRecords: FinancePayment[], refundRecords: FinanceRefund[]) {
  const today = todayIsoDate();
  return records.map((invoice) => {
    const subtotal = calculateLineTotal(invoice.lineItems);
    return recalculateInvoice({ ...invoice, subtotal, total: subtractMoney(addMoney(subtotal, invoice.tax), invoice.discount) }, paymentRecords, refundRecords, today);
  });
}

function getPaymentsByMethod(paymentRecords: FinancePayment[]) {
  const groups = new Map<FinancePayment["method"], { amount: ReturnType<typeof zeroMoney>; count: number }>();
  for (const payment of paymentRecords) {
    const current = groups.get(payment.method) ?? { amount: zeroMoney(), count: 0 };
    groups.set(payment.method, { amount: addMoney(current.amount, payment.amount), count: current.count + 1 });
  }
  return Array.from(groups, ([method, value]) => ({ method, amount: value.amount, count: value.count }));
}

function issueReceipt(context: PermissionContext, payment: FinancePayment): FinanceReceipt {
  const existing = receipts.find((receipt) => receipt.paymentId === payment.id && isSameFinanceScope(receipt, context));
  if (existing) return existing;
  const receipt: FinanceReceipt = { ...scopeFrom(context), id: createId("receipt"), receiptNumber: createReceiptNumber(), paymentId: payment.id, invoiceId: payment.invoiceId, invoiceNumber: payment.invoiceNumber, amount: payment.amount, issuedAt: currentTimestamp(), issuedBy: context.actorId };
  receipts = [receipt, ...receipts];
  recordAudit(context, "receipt.issued", "receipt", receipt.id, undefined, "issued");
  return receipt;
}

function recordAudit(context: PermissionContext, action: string, entityType: FinanceAuditEvent["entity"]["type"], entityId: string, previousState?: string, newState?: string) {
  auditEvents = [{
    ...scopeFrom(context),
    id: createId("audit"),
    actorId: context.actorId,
    action,
    entity: { id: entityId, type: entityType },
    timestamp: currentTimestamp(),
    previousState,
    newState,
  }, ...auditEvents];
}

function scopeFrom(scope: TenantScopedQuery) {
  return { tenantId: scope.tenantId, schoolId: scope.schoolId, campusId: scope.campusId, academicYearId: scope.academicYearId };
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createReceiptNumber() {
  return `RCPT-2026-${String(receipts.length + 1).padStart(4, "0")}`;
}

function daysUntil(dueDate: string, today: string) {
  const due = Date.UTC(Number(dueDate.slice(0, 4)), Number(dueDate.slice(5, 7)) - 1, Number(dueDate.slice(8, 10)));
  const current = Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)));
  return Math.ceil((due - current) / 86_400_000);
}
