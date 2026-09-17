import { tenantContext } from "@/lib/tenant-context";
import type { StaffDocument, StaffDocumentDefinition, StaffDocumentType } from "@/features/staff-documents/types/staff-document";

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

export const staffDocumentDefinitions: StaffDocumentDefinition[] = [
  { documentType: "identity_proof", category: "identity", title: "Identity Proof", description: "Government identity proof metadata.", allowExpiry: true },
  { documentType: "address_proof", category: "identity", title: "Address Proof", allowExpiry: true },
  { documentType: "pan", category: "compliance", title: "PAN", description: "PAN document metadata. Do not store raw PAN values in this phase." },
  { documentType: "educational_certificate", category: "education", title: "Educational Certificate" },
  { documentType: "experience_certificate", category: "experience", title: "Experience Certificate" },
  { documentType: "appointment_letter", category: "employment", title: "Appointment Letter" },
  { documentType: "offer_letter", category: "employment", title: "Offer Letter" },
  { documentType: "joining_document", category: "employment", title: "Joining Document" },
  { documentType: "contract", category: "employment", title: "Contract", allowExpiry: true },
  { documentType: "bank_document", category: "finance", title: "Bank Document" },
  { documentType: "other", category: "other", title: "Other Document", allowExpiry: true },
];

export const mockStaffDocuments: StaffDocument[] = [
  documentRecord("staff-doc-001-id", "staff-001", "identity_proof", "Anita Sharma Identity Proof", "identity-proof-anita.pdf", "application/pdf", 264000, "verified", "2028-05-20", 1, "hr-office", "2026-04-01T10:00:00+05:30", "hr-manager", "2026-04-02T12:00:00+05:30", "Verified against original document."),
  documentRecord("staff-doc-001-contract", "staff-001", "contract", "Employment Contract", "contract-anita.pdf", "application/pdf", 392000, "pending", "2026-09-12", 1, "hr-office", "2026-08-12T09:10:00+05:30"),
  documentRecord("staff-doc-002-medical", "staff-002", "other", "Fitness Certificate", "fitness-rahul.pdf", "application/pdf", 188000, "expired", "2026-07-30", 2, "hr-office", "2026-06-10T11:15:00+05:30"),
  documentRecord("staff-doc-003-degree", "staff-003", "educational_certificate", "B.Ed Certificate", "bed-priya.pdf", "application/pdf", 442000, "rejected", undefined, 1, "hr-office", "2026-05-04T13:45:00+05:30", undefined, undefined, "Certificate scan is incomplete."),
  documentRecord("staff-doc-004-pan", "staff-004", "pan", "PAN Document", "pan-vikram.pdf", "application/pdf", 146000, "verified", undefined, 1, "hr-office", "2026-04-11T10:30:00+05:30", "hr-manager", "2026-04-11T16:00:00+05:30", "Verified metadata only."),
  documentRecord("staff-doc-005-appointment", "staff-005", "appointment_letter", "Appointment Letter", "appointment-neha.pdf", "application/pdf", 210000, "archived", undefined, 1, "hr-office", "2026-03-15T09:25:00+05:30"),
  {
    ...documentRecord("staff-doc-west-001-id", "staff-west-001", "identity_proof", "Other Tenant Identity", "identity-other-tenant.pdf", "application/pdf", 156000, "verified", undefined, 1, "hr-office", "2026-04-01T10:00:00+05:30"),
    tenantId: "tenant-west",
    schoolId: "school-west",
    campusId: "campus-west",
    academicYearId: "ay-west-2026",
  },
];

function documentRecord(
  id: string,
  staffId: string,
  documentType: StaffDocumentType,
  title: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
  status: StaffDocument["status"],
  expiryDate: string | undefined,
  version: number,
  uploadedBy: string,
  uploadedAt: string,
  verifiedBy?: string,
  verifiedAt?: string,
  verificationNotes?: string,
): StaffDocument {
  const definition = staffDocumentDefinitions.find((item) => item.documentType === documentType) ?? staffDocumentDefinitions[staffDocumentDefinitions.length - 1];
  return {
    ...scope,
    id,
    staffId,
    documentType,
    category: definition.category,
    title,
    description: definition.description,
    attachment: {
      attachmentId: `att-${id}`,
      fileName,
      mimeType,
      fileSize,
      kind: mimeType.startsWith("image/") ? "image" : "pdf",
      reference: `mock://att-${id}`,
      storageKey: `tenants/${scope.tenantId}/schools/${scope.schoolId}/campuses/${scope.campusId}/staff/${staffId}/documents/att-${id}`,
    },
    status,
    expiryDate,
    verificationNotes,
    uploadedAt,
    uploadedBy,
    verifiedAt,
    verifiedBy,
    version,
    archivedAt: status === "archived" ? "2026-06-01T09:00:00+05:30" : undefined,
    createdAt: uploadedAt,
    updatedAt: verifiedAt ?? uploadedAt,
  };
}
