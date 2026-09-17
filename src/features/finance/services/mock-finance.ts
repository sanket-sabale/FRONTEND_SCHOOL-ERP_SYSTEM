import { tenantContext } from "@/lib/tenant-context";
import { money, zeroMoney } from "@/lib/platform/money";
import type { TenantScope } from "@/lib/platform/contracts";
import type {
  FeeAssessment,
  FeeAssignment,
  FeeStructure,
  FinanceAuditEvent,
  FinanceInvoice,
  FinancePayment,
  FinanceReceipt,
  FinanceRefund,
  InvoiceLineItem,
} from "@/features/finance/types/finance";

export const financeScope: TenantScope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

export const otherFinanceScope: TenantScope = {
  tenantId: "tenant-demo-west",
  schoolId: "school-demo-west",
  campusId: "campus-demo-central",
  academicYearId: "ay-2026-27",
};

export const mockFeeStructures: FeeStructure[] = [
  fee("fee-admission", "Admission Fee", "ADM-2026", "admission", "25000.00", "one_time"),
  fee("fee-tuition-q1", "Quarter 1 Tuition", "TUI-Q1-2026", "tuition", "42000.00", "quarterly"),
  fee("fee-transport", "Transport Fee", "TRN-2026", "transport", "12000.00", "quarterly"),
  fee("fee-library", "Library Fee", "LIB-2026", "library", "2500.00", "annual"),
  fee("fee-west-admission", "Admission Fee", "ADM-WEST-2026", "admission", "20000.00", "one_time", otherFinanceScope),
];

export const mockFeeAssignments: FeeAssignment[] = [
  assignment("assign-student-001-tuition", "fee-tuition-q1", "student", "student-001", "Aarav Sharma"),
  assignment("assign-student-001-transport", "fee-transport", "student", "student-001", "Aarav Sharma"),
  assignment("assign-adm-app-001", "fee-admission", "admission", "app-001", "Riya Deshmukh"),
  assignment("assign-student-002-library", "fee-library", "student", "student-002", "Isha Patil"),
  assignment("assign-west", "fee-west-admission", "student", "student-west-001", "West Student", otherFinanceScope),
];

export const mockFeeAssessments: FeeAssessment[] = [
  assessment("assessment-001", "assign-student-001-tuition", "fee-tuition-q1", "student", "student-001", "Aarav Sharma", "42000.00", "2026-07-10", "Quarter 1"),
  assessment("assessment-002", "assign-student-001-transport", "fee-transport", "student", "student-001", "Aarav Sharma", "12000.00", "2026-07-10", "Quarter 1"),
  assessment("assessment-003", "assign-adm-app-001", "fee-admission", "admission", "app-001", "Riya Deshmukh", "25000.00", "2026-06-20", "Admission"),
  assessment("assessment-004", "assign-student-002-library", "fee-library", "student", "student-002", "Isha Patil", "2500.00", "2026-08-05", "Annual"),
  assessment("assessment-west", "assign-west", "fee-west-admission", "student", "student-west-001", "West Student", "20000.00", "2026-06-20", "Admission", otherFinanceScope),
];

export const mockFinanceInvoices: FinanceInvoice[] = [
  invoice("inv-001", "FIN-2026-0001", "student", "student-001", "Aarav Sharma", "2026-07-01", "2026-07-10", [
    line("line-001", "fee-tuition-q1", "Quarter 1 Tuition", "tuition", "42000.00"),
    line("line-002", "fee-transport", "Transport Fee", "transport", "12000.00"),
  ], ["assessment-001", "assessment-002"], "fee_assessment"),
  invoice("inv-002", "FIN-2026-0002", "admission", "app-001", "Riya Deshmukh", "2026-06-15", "2026-06-20", [
    line("line-003", "fee-admission", "Admission Fee", "admission", "25000.00"),
  ], ["assessment-003"], "admission"),
  invoice("inv-003", "FIN-2026-0003", "student", "student-002", "Isha Patil", "2026-08-01", "2026-08-05", [
    line("line-004", "fee-library", "Library Fee", "library", "2500.00"),
  ], ["assessment-004"], "fee_assessment"),
  invoice("inv-west", "FIN-WEST-0001", "student", "student-west-001", "West Student", "2026-06-15", "2026-06-20", [
    line("line-west", "fee-west-admission", "Admission Fee", "admission", "20000.00"),
  ], ["assessment-west"], "fee_assessment", otherFinanceScope),
];

export const mockFinancePayments: FinancePayment[] = [
  payment("pay-001", "inv-001", "FIN-2026-0001", "student", "student-001", "Aarav Sharma", "30000.00", "upi", "verified", "UPI-001", "idem-001", "2026-07-04T10:30:00+05:30", "user-priya-kulkarni", "2026-07-04T11:00:00+05:30", "user-priya-kulkarni"),
  payment("pay-002", "inv-002", "FIN-2026-0002", "admission", "app-001", "Riya Deshmukh", "25000.00", "bank_transfer", "verified", "BANK-ADM-001", "idem-002", "2026-06-16T09:30:00+05:30", "user-priya-kulkarni", "2026-06-16T10:00:00+05:30", "user-priya-kulkarni"),
  payment("pay-003", "inv-003", "FIN-2026-0003", "student", "student-002", "Isha Patil", "2500.00", "cash", "pending_verification", "CASH-003", "idem-003", "2026-08-04T12:00:00+05:30", "user-priya-kulkarni"),
  payment("pay-west", "inv-west", "FIN-WEST-0001", "student", "student-west-001", "West Student", "20000.00", "cash", "verified", "WEST-001", "idem-west", "2026-06-16T09:30:00+05:30", "user-west", "2026-06-16T10:00:00+05:30", "user-west", otherFinanceScope),
];

export const mockFinanceReceipts: FinanceReceipt[] = [
  receipt("receipt-001", "RCPT-2026-0001", "pay-001", "inv-001", "FIN-2026-0001", "30000.00", "2026-07-04T11:00:00+05:30", "user-priya-kulkarni"),
  receipt("receipt-002", "RCPT-2026-0002", "pay-002", "inv-002", "FIN-2026-0002", "25000.00", "2026-06-16T10:00:00+05:30", "user-priya-kulkarni"),
];

export const mockFinanceRefunds: FinanceRefund[] = [
  {
    ...financeScope,
    id: "refund-001",
    paymentId: "pay-001",
    invoiceId: "inv-001",
    amount: money("5000.00"),
    reason: "Transport route discontinued",
    requestedAt: "2026-07-20T10:00:00+05:30",
    requestedBy: "user-priya-kulkarni",
    status: "requested",
  },
];

export const mockFinanceAuditEvents: FinanceAuditEvent[] = [];

function fee(id: string, name: string, code: string, category: FeeStructure["category"], amount: string, frequency: FeeStructure["frequency"], scope = financeScope): FeeStructure {
  return { ...scope, id, name, code, category, amount: money(amount), frequency, effectiveFrom: "2026-04-01", status: "active", createdAt: "2026-04-01T09:00:00+05:30", updatedAt: "2026-04-01T09:00:00+05:30" };
}

function assignment(id: string, feeStructureId: string, type: FeeAssignment["subject"]["type"], subjectId: string, displayName: string, scope = financeScope): FeeAssignment {
  return { ...scope, id, feeStructureId, subject: { id: subjectId, type, displayName }, status: "active", assignedAt: "2026-04-02T09:00:00+05:30", assignedBy: "user-priya-kulkarni" };
}

function assessment(id: string, assignmentId: string, feeStructureId: string, type: FeeAssessment["subject"]["type"], subjectId: string, displayName: string, amount: string, dueDate: string, periodLabel: string, scope = financeScope): FeeAssessment {
  return { ...scope, id, assignmentId, feeStructureId, subject: { id: subjectId, type, displayName }, amount: money(amount), dueDate, source: type === "admission" ? "admission" : "scheduled", periodLabel, status: "invoiced", createdAt: "2026-04-03T09:00:00+05:30" };
}

function line(id: string, feeStructureId: string, description: string, category: InvoiceLineItem["category"], amount: string): InvoiceLineItem {
  return { id, feeStructureId, description, category, amount: money(amount) };
}

function invoice(id: string, invoiceNumber: string, type: FinanceInvoice["subject"]["type"], subjectId: string, displayName: string, issueDate: string, dueDate: string, lineItems: InvoiceLineItem[], assessmentIds: string[], source: FinanceInvoice["source"], scope = financeScope): FinanceInvoice {
  const subtotal = lineItems.reduce((total, item) => ({ amount: (Number(total.amount) + Number(item.amount.amount)).toFixed(2), currency: "INR" as const }), zeroMoney());
  return { ...scope, id, invoiceNumber, issueDate, dueDate, subject: { id: subjectId, type, displayName }, payer: { id: subjectId, type: type === "student" ? "student" : "applicant", displayName }, lineItems, subtotal, discount: zeroMoney(), tax: zeroMoney(), total: subtotal, paid: zeroMoney(), balance: subtotal, status: "issued", source, assessmentIds, createdAt: `${issueDate}T09:00:00+05:30`, updatedAt: `${issueDate}T09:00:00+05:30` };
}

function payment(id: string, invoiceId: string, invoiceNumber: string, type: FinancePayment["subject"]["type"], subjectId: string, displayName: string, amount: string, method: FinancePayment["method"], status: FinancePayment["status"], externalReference: string, idempotencyKey: string, recordedAt: string, recordedBy: string, verifiedAt?: string, verifiedBy?: string, scope = financeScope): FinancePayment {
  return { ...scope, id, invoiceId, invoiceNumber, subject: { id: subjectId, type, displayName }, amount: money(amount), method, externalReference, idempotencyKey, recordedAt, recordedBy, verifiedAt, verifiedBy, status };
}

function receipt(id: string, receiptNumber: string, paymentId: string, invoiceId: string, invoiceNumber: string, amount: string, issuedAt: string, issuedBy: string, scope = financeScope): FinanceReceipt {
  return { ...scope, id, receiptNumber, paymentId, invoiceId, invoiceNumber, amount: money(amount), issuedAt, issuedBy };
}
