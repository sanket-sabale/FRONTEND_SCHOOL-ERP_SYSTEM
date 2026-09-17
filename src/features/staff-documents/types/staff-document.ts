import type { TenantScopedQuery } from "@/lib/api/client";

export const staffDocumentCategories = ["identity", "employment", "education", "experience", "finance", "compliance", "other"] as const;
export type StaffDocumentCategory = (typeof staffDocumentCategories)[number];

export const staffDocumentTypes = [
  "identity_proof",
  "address_proof",
  "pan",
  "educational_certificate",
  "experience_certificate",
  "appointment_letter",
  "offer_letter",
  "joining_document",
  "contract",
  "bank_document",
  "other",
] as const;
export type StaffDocumentType = (typeof staffDocumentTypes)[number];

export const staffDocumentStatuses = ["pending", "verified", "rejected", "expired", "archived"] as const;
export type StaffDocumentStatus = (typeof staffDocumentStatuses)[number];

export type StaffAttachmentKind = "image" | "pdf" | "word" | "excel" | "powerpoint" | "text" | "file";

export type StaffDocumentAttachment = {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  kind: StaffAttachmentKind;
  reference: string;
  storageKey?: string;
};

export type StaffDocument = TenantScopedQuery & {
  id: string;
  staffId: string;
  documentType: StaffDocumentType;
  category: StaffDocumentCategory;
  title: string;
  description?: string;
  attachment: StaffDocumentAttachment;
  status: StaffDocumentStatus;
  expiryDate?: string;
  verificationNotes?: string;
  uploadedAt: string;
  uploadedBy: string;
  verifiedAt?: string;
  verifiedBy?: string;
  version: number;
  replacementOfDocumentId?: string;
  archivedAt?: string;
  archiveReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffDocumentDefinition = {
  documentType: StaffDocumentType;
  category: StaffDocumentCategory;
  title: string;
  description?: string;
  allowExpiry?: boolean;
};

export type StaffDocumentCreateInput = TenantScopedQuery & {
  staffId: string;
  documentType: StaffDocumentType;
  title?: string;
  description?: string;
  attachment: Omit<StaffDocumentAttachment, "attachmentId" | "kind" | "reference" | "storageKey">;
  expiryDate?: string;
  replacementOfDocumentId?: string;
};

export type StaffDocumentMutationInput = TenantScopedQuery & {
  staffId: string;
  documentId: string;
  verificationNotes?: string;
  reason?: string;
};

export type StaffDocumentFilters = {
  search?: string;
  documentType?: StaffDocumentType;
  status?: StaffDocumentStatus;
  expiry?: "all" | "no_expiry" | "valid" | "expiring_soon" | "expired";
};

export type StaffDocumentListResponse = {
  documents: StaffDocument[];
  definitions: StaffDocumentDefinition[];
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  expired: number;
  expiringSoon: number;
};
