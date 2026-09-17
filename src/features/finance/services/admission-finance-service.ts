import { admissionFinanceMutationSchema, admissionFinanceScopeSchema } from "@/features/finance/schemas/admission-finance.schema";
import type {
  AdmissionFinanceMutationInput,
  AdmissionFinanceSummary,
  AdmissionPaymentSummary,
} from "@/features/admissions/types/admission";
import { ApiError, type TenantScopedQuery } from "@/lib/api/client";

type AdmissionInvoiceRecord = TenantScopedQuery & {
  id: string;
  applicationId: string;
  invoiceNumber: string;
  feeType: "admission_fee";
  amount: number;
  currency: "INR";
  dueDate: string;
  createdAt: string;
};

let invoiceRecords: AdmissionInvoiceRecord[] = [];
let paymentRecords: Array<AdmissionPaymentSummary & TenantScopedQuery & { applicationId: string }> = [];

export const admissionFinanceService = {
  async getApplicationFinancialSummary(scope: TenantScopedQuery, applicationId: string): Promise<AdmissionFinanceSummary> {
    const parsedScope = admissionFinanceScopeSchema.parse(scope);
    const invoice = invoiceRecords.find((record) => record.applicationId === applicationId && isInScope(record, parsedScope));
    const payments = paymentRecords.filter((record) => record.applicationId === applicationId && (!invoice || record.invoiceId === invoice.id) && isInScope(record, parsedScope));
    const paidAmount = payments
      .filter((payment) => payment.status === "successful" && payment.verificationStatus === "verified")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const amount = invoice?.amount ?? 0;
    const outstandingAmount = Math.max(0, amount - paidAmount);
    const hasPendingPayment = payments.some((payment) => payment.status === "pending" || payment.verificationStatus === "pending");
    const isCleared = Boolean(invoice && amount > 0 && outstandingAmount === 0);

    return {
      ...parsedScope,
      applicationId,
      invoiceId: invoice?.id,
      invoiceNumber: invoice?.invoiceNumber,
      feeType: invoice?.feeType,
      amount,
      paidAmount,
      outstandingAmount,
      currency: "INR",
      paymentStatus: !invoice ? "not_started" : isCleared ? "paid" : paidAmount > 0 ? "partially_paid" : hasPendingPayment ? "invoice_pending" : "invoice_pending",
      verificationStatus: !invoice ? "not_required" : isCleared ? "verified" : hasPendingPayment ? "pending" : "pending",
      financialClearanceStatus: !invoice ? "pending" : isCleared ? "cleared" : "pending",
      dueDate: invoice?.dueDate,
      clearedAt: isCleared ? payments.toSorted((first, second) => second.verifiedAt?.localeCompare(first.verifiedAt ?? "") ?? 0)[0]?.verifiedAt : undefined,
      paymentHistory: payments,
    };
  },

  async createAdmissionInvoice(input: AdmissionFinanceMutationInput): Promise<AdmissionFinanceSummary> {
    const parsedInput = admissionFinanceMutationSchema.required({ amount: true, dueDate: true }).parse(input);
    const existing = invoiceRecords.find((record) => record.applicationId === parsedInput.applicationId && isInScope(record, parsedInput));
    if (!existing) {
      invoiceRecords = [
        {
          tenantId: parsedInput.tenantId,
          schoolId: parsedInput.schoolId,
          campusId: parsedInput.campusId,
          academicYearId: parsedInput.academicYearId,
          id: createInvoiceId(),
          applicationId: parsedInput.applicationId,
          invoiceNumber: createInvoiceNumber(parsedInput.applicationId),
          feeType: "admission_fee",
          amount: parsedInput.amount,
          currency: "INR",
          dueDate: parsedInput.dueDate,
          createdAt: new Date().toISOString(),
        },
        ...invoiceRecords,
      ];
    }
    return this.getApplicationFinancialSummary(parsedInput, parsedInput.applicationId);
  },

  async recordPayment(input: AdmissionFinanceMutationInput): Promise<AdmissionFinanceSummary> {
    const parsedInput = admissionFinanceMutationSchema.required({ paidAmount: true, method: true }).parse(input);
    const invoice = invoiceRecords.find((record) => record.applicationId === parsedInput.applicationId && isInScope(record, parsedInput));
    if (!invoice) throw new ApiError(422, "Create the admission invoice before recording payment.");
    if (parsedInput.paidAmount > invoice.amount) throw new ApiError(422, "Payment amount cannot exceed invoice amount.");

    paymentRecords = [
      {
        tenantId: parsedInput.tenantId,
        schoolId: parsedInput.schoolId,
        campusId: parsedInput.campusId,
        academicYearId: parsedInput.academicYearId,
        applicationId: parsedInput.applicationId,
        id: createPaymentId(),
        invoiceId: invoice.id,
        amount: parsedInput.paidAmount,
        method: parsedInput.method,
        status: "pending",
        verificationStatus: "pending",
        paidAt: new Date().toISOString(),
      },
      ...paymentRecords,
    ];
    return this.getApplicationFinancialSummary(parsedInput, parsedInput.applicationId);
  },

  async verifyPayment(input: AdmissionFinanceMutationInput): Promise<AdmissionFinanceSummary> {
    const parsedInput = admissionFinanceMutationSchema.parse(input);
    const payment = paymentRecords.find((record) => record.applicationId === parsedInput.applicationId && record.verificationStatus === "pending" && isInScope(record, parsedInput));
    if (!payment) throw new ApiError(404, "Pending admission payment could not be found.");
    const now = new Date().toISOString();
    paymentRecords = paymentRecords.map((record) => record.id === payment.id ? { ...record, status: "successful", verificationStatus: "verified", verifiedAt: now } : record);
    return this.getApplicationFinancialSummary(parsedInput, parsedInput.applicationId);
  },
};

function isInScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId && record.academicYearId === scope.academicYearId;
}

function createInvoiceId() {
  return `admission-invoice-${Date.now()}`;
}

function createInvoiceNumber(applicationId: string) {
  return `INV-ADM-${applicationId.replace(/[^0-9]/g, "").slice(-6).padStart(6, "0")}`;
}

function createPaymentId() {
  return `admission-payment-${Date.now()}`;
}
