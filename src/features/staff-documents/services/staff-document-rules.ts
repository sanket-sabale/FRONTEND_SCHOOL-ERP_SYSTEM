import type { StaffDocument, StaffDocumentCategory, StaffDocumentStatus, StaffDocumentType } from "@/features/staff-documents/types/staff-document";

export const staffDocumentTypeLabels: Record<StaffDocumentType, string> = {
  identity_proof: "Identity Proof",
  address_proof: "Address Proof",
  pan: "PAN",
  educational_certificate: "Educational Certificate",
  experience_certificate: "Experience Certificate",
  appointment_letter: "Appointment Letter",
  offer_letter: "Offer Letter",
  joining_document: "Joining Document",
  contract: "Contract",
  bank_document: "Bank Document",
  other: "Other",
};

export const staffDocumentCategoryLabels: Record<StaffDocumentCategory, string> = {
  identity: "Identity",
  employment: "Employment",
  education: "Education",
  experience: "Experience",
  finance: "Finance",
  compliance: "Compliance",
  other: "Other",
};

export const staffDocumentStatusLabels: Record<StaffDocumentStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
  expired: "Expired",
  archived: "Archived",
};

export const expiringSoonWindowDays = 30;

export function getStaffDocumentStatusLabel(status: StaffDocumentStatus) {
  return staffDocumentStatusLabels[status];
}

export function classifyStaffDocumentExpiry(document: Pick<StaffDocument, "expiryDate" | "status">) {
  if (!document.expiryDate) return { state: "no_expiry" as const, label: "No expiry" };
  const days = daysUntil(document.expiryDate);
  if (days < 0) return { state: "expired" as const, label: `Expired ${Math.abs(days)} day(s) ago` };
  if (days <= expiringSoonWindowDays) return { state: "expiring_soon" as const, label: `Expires in ${days} day(s)` };
  return { state: "valid" as const, label: `Valid until ${formatDate(document.expiryDate)}` };
}

export function applyStaffDocumentExpiry(document: StaffDocument): StaffDocument {
  if (document.status === "archived" || !document.expiryDate) return document;
  return daysUntil(document.expiryDate) < 0 && document.status !== "expired" ? { ...document, status: "expired" } : document;
}

export function canVerifyStaffDocument(document: StaffDocument) {
  return document.status === "pending" || document.status === "rejected";
}

export function canRejectStaffDocument(document: StaffDocument) {
  return document.status === "pending" || document.status === "verified";
}

export function canArchiveStaffDocument(document: StaffDocument) {
  return document.status !== "archived";
}

function daysUntil(date: string) {
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86_400_000);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}
