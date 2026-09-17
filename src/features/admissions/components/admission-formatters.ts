import type {
  AdmissionApplicationStatus,
  AdmissionDocumentCompletionStatus,
  AdmissionDocumentStatus,
  AdmissionDocumentType,
  AdmissionEvaluationStatus,
  AdmissionEvaluationType,
  AdmissionPriority,
  AdmissionReviewDecision,
  AdmissionReviewStatus,
  AdmissionSource,
} from "@/features/admissions/types/admission";

export type AdmissionTone = "success" | "warning" | "danger" | "info" | "neutral";

export const admissionStatusMeta: Record<AdmissionApplicationStatus, { label: string; description: string; tone: AdmissionTone }> = {
  draft: { label: "Draft", description: "Application is saved but not submitted.", tone: "neutral" },
  submitted: { label: "Submitted", description: "Application is ready for admissions review.", tone: "info" },
  under_review: { label: "Under Review", description: "Admissions team is reviewing the application.", tone: "warning" },
  document_pending: { label: "Document Pending", description: "Required documents need upload or correction.", tone: "warning" },
  documents_verified: { label: "Documents Verified", description: "Required documents are verified.", tone: "success" },
  shortlisted: { label: "Shortlisted", description: "Application is shortlisted for later phases.", tone: "info" },
  interview_scheduled: { label: "Interview Scheduled", description: "Evaluation is scheduled for a later phase.", tone: "info" },
  approved: { label: "Approved", description: "Application has been approved.", tone: "success" },
  waitlisted: { label: "Waitlisted", description: "Application is waiting for a seat decision.", tone: "warning" },
  rejected: { label: "Rejected", description: "Application will not proceed.", tone: "danger" },
  fee_pending: { label: "Fee Pending", description: "Finance integration belongs to a later phase.", tone: "warning" },
  confirmed: { label: "Confirmed", description: "Application is confirmed for enrollment.", tone: "success" },
  enrolled: { label: "Enrolled", description: "Student enrollment is complete.", tone: "success" },
};

export const admissionDocumentStatusMeta: Record<AdmissionDocumentStatus, { label: string; description: string; tone: AdmissionTone }> = {
  required: { label: "Required", description: "Document has not been uploaded yet.", tone: "neutral" },
  uploaded: { label: "Uploaded", description: "Document is uploaded and awaiting verification.", tone: "info" },
  under_verification: { label: "Under Verification", description: "Document is being checked by admissions.", tone: "warning" },
  verified: { label: "Verified", description: "Document has passed verification.", tone: "success" },
  rejected: { label: "Rejected", description: "Document needs a corrected upload.", tone: "danger" },
};

export const admissionDocumentCompletionMeta: Record<AdmissionDocumentCompletionStatus, { label: string; tone: AdmissionTone }> = {
  incomplete: { label: "Incomplete", tone: "warning" },
  pending_verification: { label: "Pending Verification", tone: "info" },
  complete: { label: "Complete", tone: "success" },
};

export function formatAdmissionStatus(status: AdmissionApplicationStatus) {
  return admissionStatusMeta[status].label;
}

export function formatAdmissionDocumentStatus(status: AdmissionDocumentStatus) {
  return admissionDocumentStatusMeta[status].label;
}

export function formatAdmissionDocumentCompletion(status: AdmissionDocumentCompletionStatus) {
  return admissionDocumentCompletionMeta[status].label;
}

export function formatAdmissionDocumentType(type: AdmissionDocumentType) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatAdmissionReviewStatus(status: AdmissionReviewStatus) {
  return formatWords(status);
}

export function formatAdmissionReviewDecision(decision: AdmissionReviewDecision) {
  return formatWords(decision);
}

export function formatAdmissionEvaluationType(type: AdmissionEvaluationType) {
  return formatWords(type);
}

export function formatAdmissionEvaluationStatus(status: AdmissionEvaluationStatus) {
  return formatWords(status);
}

export function formatAdmissionSource(source: AdmissionSource) {
  return formatWords(source);
}

export function formatAdmissionPriority(priority: AdmissionPriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function formatAdmissionDate(value?: string) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export function formatAdmissionDateTime(value?: string) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function getApplicantInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AP";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 0, style: "currency" }).format(amount);
}

function formatWords(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
