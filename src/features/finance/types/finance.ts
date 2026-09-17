import type { TenantScope, AuditEvent, EntityReference, Pagination, PermissionContext } from "@/lib/platform/contracts";
import type { Money } from "@/lib/platform/money";

export const financeEntityTypes = ["fee_structure", "fee_assignment", "assessment", "invoice", "payment", "receipt", "refund"] as const;
export type FinanceEntityType = (typeof financeEntityTypes)[number];

export const feeCategories = ["tuition", "admission", "transport", "library", "exam", "activity", "hostel", "other"] as const;
export type FeeCategory = (typeof feeCategories)[number];

export const feeFrequencies = ["one_time", "monthly", "quarterly", "annual"] as const;
export type FeeFrequency = (typeof feeFrequencies)[number];

export const financeRecordStatuses = ["draft", "active", "inactive", "archived"] as const;
export type FinanceRecordStatus = (typeof financeRecordStatuses)[number];

export const assessmentStatuses = ["assessed", "invoiced", "waived", "cancelled"] as const;
export type FeeAssessmentStatus = (typeof assessmentStatuses)[number];

export const invoiceStatuses = ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const paymentMethods = ["cash", "bank_transfer", "upi", "card", "cheque", "online_gateway", "other"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentStatuses = ["recorded", "pending_verification", "verified", "rejected", "reversed"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const refundStatuses = ["requested", "approved", "rejected", "processed"] as const;
export type RefundStatus = (typeof refundStatuses)[number];

export type FeeStructure = TenantScope & {
  id: string;
  name: string;
  code: string;
  category: FeeCategory;
  amount: Money;
  frequency: FeeFrequency;
  effectiveFrom: string;
  effectiveTo?: string;
  status: FinanceRecordStatus;
  createdAt: string;
  updatedAt: string;
};

export type FeeAssignmentSubjectType = "student" | "class" | "section" | "admission";

export type FeeAssignment = TenantScope & {
  id: string;
  feeStructureId: string;
  subject: EntityReference<FeeAssignmentSubjectType>;
  status: FinanceRecordStatus;
  assignedAt: string;
  assignedBy: string;
};

export type FeeAssessment = TenantScope & {
  id: string;
  assignmentId: string;
  feeStructureId: string;
  subject: EntityReference<FeeAssignmentSubjectType>;
  amount: Money;
  dueDate: string;
  source: "scheduled" | "manual" | "admission";
  periodLabel: string;
  status: FeeAssessmentStatus;
  createdAt: string;
};

export type InvoiceLineItem = {
  id: string;
  feeStructureId?: string;
  description: string;
  category: FeeCategory;
  amount: Money;
};

export type FinanceInvoice = TenantScope & {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subject: EntityReference<"student" | "admission">;
  payer?: EntityReference<"guardian" | "student" | "applicant">;
  lineItems: InvoiceLineItem[];
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
  paid: Money;
  balance: Money;
  status: InvoiceStatus;
  source: "fee_assessment" | "admission" | "manual";
  assessmentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type FinancePayment = TenantScope & {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  subject: EntityReference<"student" | "admission">;
  amount: Money;
  method: PaymentMethod;
  externalReference?: string;
  idempotencyKey?: string;
  recordedAt: string;
  recordedBy: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  status: PaymentStatus;
};

export type FinanceReceipt = TenantScope & {
  id: string;
  receiptNumber: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: Money;
  issuedAt: string;
  issuedBy: string;
};

export type FinanceRefund = TenantScope & {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount: Money;
  reason: string;
  requestedAt: string;
  requestedBy: string;
  approvedAt?: string;
  approvedBy?: string;
  processedAt?: string;
  processedBy?: string;
  status: RefundStatus;
};

export type FinanceDashboardSummary = {
  todayCollection: Money;
  totalBilled: Money;
  totalCollected: Money;
  totalOutstanding: Money;
  overdueAmount: Money;
  pendingVerificationCount: number;
  collectionRate: number;
  paymentsByMethod: Array<{ method: PaymentMethod; amount: Money; count: number }>;
  recentInvoices: FinanceInvoice[];
  recentPayments: FinancePayment[];
};

export type FinanceDuesRecord = TenantScope & {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  subject: EntityReference<"student" | "admission">;
  dueDate: string;
  total: Money;
  paid: Money;
  outstanding: Money;
  status: "open" | "overdue" | "due_soon" | "cleared";
};

export type StudentFinanceSummary = TenantScope & {
  studentId: string;
  totalBilled: Money;
  totalPaid: Money;
  totalOutstanding: Money;
  overdueAmount: Money;
  recentInvoices: FinanceInvoice[];
  recentPayments: FinancePayment[];
};

export type FinanceListResponse<TItem> = Pagination & {
  items: TItem[];
};

export type FinanceFilters = {
  query?: string;
  status?: string;
  subjectId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type FinancePaymentInput = PermissionContext & {
  invoiceId: string;
  amount: Money;
  method: PaymentMethod;
  externalReference?: string;
  idempotencyKey?: string;
};

export type FinancePaymentVerificationInput = PermissionContext & {
  paymentId: string;
  reason?: string;
};

export type FinanceRefundInput = PermissionContext & {
  paymentId: string;
  amount: Money;
  reason: string;
  refundId?: string;
};

export type FinanceAuditEvent = AuditEvent<FinanceEntityType>;
