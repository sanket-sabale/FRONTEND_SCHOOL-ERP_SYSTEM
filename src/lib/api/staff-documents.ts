import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { createMockAttachmentReference, validateAttachmentDescriptor } from "@/lib/api/attachments";
import {
  staffDocumentCreateSchema,
  staffDocumentFiltersSchema,
  staffDocumentMutationSchema,
  staffDocumentRejectSchema,
} from "@/features/staff-documents/schemas/staff-document.schema";
import {
  applyStaffDocumentExpiry,
  canArchiveStaffDocument,
  canRejectStaffDocument,
  canVerifyStaffDocument,
  classifyStaffDocumentExpiry,
  staffDocumentTypeLabels,
} from "@/features/staff-documents/services/staff-document-rules";
import { mockStaffDocuments, staffDocumentDefinitions } from "@/features/staff-documents/services/mock-staff-documents";
import type {
  StaffDocument,
  StaffDocumentCreateInput,
  StaffDocumentFilters,
  StaffDocumentListResponse,
  StaffDocumentMutationInput,
} from "@/features/staff-documents/types/staff-document";
import { staffService } from "@/lib/api/staff";

let documentRecords = [...mockStaffDocuments];

export const staffDocumentService = {
  async listStaffDocuments(scope: TenantScopedQuery, staffId: string, filters: StaffDocumentFilters = {}): Promise<StaffDocumentListResponse> {
    await ensureStaffInScope(scope, staffId);
    const parsed = staffDocumentFiltersSchema.parse(filters);
    const query = parsed.search?.toLowerCase().trim();
    const documents = documentRecords
      .filter((document) => isDocumentInScope(document, scope, staffId))
      .map(applyStaffDocumentExpiry)
      .filter((document) => !parsed.status || document.status === parsed.status)
      .filter((document) => !parsed.documentType || document.documentType === parsed.documentType)
      .filter((document) => !parsed.expiry || parsed.expiry === "all" || classifyStaffDocumentExpiry(document).state === parsed.expiry)
      .filter((document) => !query || [document.title, document.description, document.attachment.fileName, staffDocumentTypeLabels[document.documentType], document.status].filter(Boolean).join(" ").toLowerCase().includes(query))
      .sort((first, second) => first.title.localeCompare(second.title, "en-IN", { sensitivity: "base" }));

    return {
      documents,
      definitions: staffDocumentDefinitions,
      total: documents.length,
      pending: documents.filter((document) => document.status === "pending").length,
      verified: documents.filter((document) => document.status === "verified").length,
      rejected: documents.filter((document) => document.status === "rejected").length,
      expired: documents.filter((document) => document.status === "expired").length,
      expiringSoon: documents.filter((document) => classifyStaffDocumentExpiry(document).state === "expiring_soon").length,
    };
  },

  async getStaffDocument(scope: TenantScopedQuery, staffId: string, documentId: string) {
    await ensureStaffInScope(scope, staffId);
    const document = documentRecords.find((item) => item.id === documentId && isDocumentInScope(item, scope, staffId));
    return document ? applyStaffDocumentExpiry(document) : null;
  },

  async createStaffDocument(input: StaffDocumentCreateInput) {
    const parsed = staffDocumentCreateSchema.parse(input);
    await ensureStaffInScope(parsed, parsed.staffId);
    const definition = getDocumentDefinition(parsed.documentType);
    const validation = validateAttachmentDescriptor({
      name: parsed.attachment.fileName,
      size: parsed.attachment.fileSize,
      type: parsed.attachment.mimeType,
    });
    if (!validation.ok) throw new ApiError(422, validation.message);

    const replacement = parsed.replacementOfDocumentId
      ? documentRecords.find((document) => document.id === parsed.replacementOfDocumentId && isDocumentInScope(document, parsed, parsed.staffId))
      : undefined;
    if (parsed.replacementOfDocumentId && !replacement) throw new ApiError(404, "Document selected for replacement could not be found.");

    const attachment = createMockAttachmentReference({
      file: {
        name: parsed.attachment.fileName,
        size: parsed.attachment.fileSize,
        type: parsed.attachment.mimeType,
      },
      scope: parsed,
      resource: `staff/${parsed.staffId}/documents`,
    });
    const now = new Date().toISOString();

    if (replacement) {
      documentRecords = documentRecords.map((document) =>
        document.id === replacement.id
          ? { ...document, status: "archived", archivedAt: now, archiveReason: "Replaced by newer version.", updatedAt: now }
          : document,
      );
    }

    const document: StaffDocument = {
      ...parsed,
      id: createDocumentId(parsed.staffId),
      documentType: parsed.documentType,
      category: definition.category,
      title: parsed.title || definition.title,
      description: parsed.description || definition.description,
      attachment,
      status: parsed.expiryDate && isPastDate(parsed.expiryDate) ? "expired" : "pending",
      expiryDate: parsed.expiryDate,
      uploadedAt: now,
      uploadedBy: "current-user",
      version: replacement ? replacement.version + 1 : 1,
      replacementOfDocumentId: replacement?.id,
      createdAt: now,
      updatedAt: now,
    };

    documentRecords = [document, ...documentRecords];
    return document;
  },

  async verifyStaffDocument(input: StaffDocumentMutationInput) {
    const parsed = staffDocumentMutationSchema.parse(input);
    return updateDocument(parsed, (document, now) => {
      if (!canVerifyStaffDocument(document)) throw new ApiError(422, "Only pending or rejected staff documents can be verified.");
      if (applyStaffDocumentExpiry(document).status === "expired") throw new ApiError(422, "Expired documents must be replaced before verification.");
      return {
        ...document,
        status: "verified",
        verifiedAt: now,
        verifiedBy: "current-user",
        verificationNotes: parsed.verificationNotes,
        updatedAt: now,
      };
    });
  },

  async rejectStaffDocument(input: StaffDocumentMutationInput) {
    const parsed = staffDocumentRejectSchema.parse(input);
    return updateDocument(parsed, (document, now) => {
      if (!canRejectStaffDocument(document)) throw new ApiError(422, "Only pending or verified staff documents can be rejected.");
      return {
        ...document,
        status: "rejected",
        verifiedAt: undefined,
        verifiedBy: undefined,
        verificationNotes: parsed.verificationNotes,
        updatedAt: now,
      };
    });
  },

  async archiveStaffDocument(input: StaffDocumentMutationInput) {
    const parsed = staffDocumentMutationSchema.parse(input);
    return updateDocument(parsed, (document, now) => {
      if (!canArchiveStaffDocument(document)) throw new ApiError(422, "This staff document is already archived.");
      return {
        ...document,
        status: "archived",
        archivedAt: now,
        archiveReason: parsed.reason,
        updatedAt: now,
      };
    });
  },
};

async function updateDocument(
  input: TenantScopedQuery & { staffId: string; documentId: string },
  updater: (document: StaffDocument, now: string) => StaffDocument,
) {
  await ensureStaffInScope(input, input.staffId);
  const index = documentRecords.findIndex((document) => document.id === input.documentId && isDocumentInScope(document, input, input.staffId));
  if (index === -1) throw new ApiError(404, "Staff document could not be found in the current staff scope.");
  const current = documentRecords[index];
  if (!current) throw new ApiError(404, "Staff document could not be found in the current staff scope.");
  const next = updater(applyStaffDocumentExpiry(current), new Date().toISOString());
  documentRecords = documentRecords.map((document) => document.id === next.id ? next : document);
  return next;
}

async function ensureStaffInScope(scope: TenantScopedQuery, staffId: string) {
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) throw new ApiError(404, "Staff member could not be found in the current staff scope.");
}

function getDocumentDefinition(documentType: StaffDocument["documentType"]) {
  return staffDocumentDefinitions.find((definition) => definition.documentType === documentType) ?? {
    documentType,
    category: "other" as const,
    title: staffDocumentTypeLabels[documentType],
  };
}

function isDocumentInScope(document: StaffDocument, scope: TenantScopedQuery, staffId: string) {
  return document.staffId === staffId &&
    document.tenantId === scope.tenantId &&
    document.schoolId === scope.schoolId &&
    document.campusId === scope.campusId &&
    document.academicYearId === scope.academicYearId;
}

function isPastDate(value: string) {
  return new Date(`${value}T00:00:00`).getTime() < Date.now();
}

function createDocumentId(staffId: string) {
  let sequence = documentRecords.length + 1;
  let documentId = `staff-doc-${staffId}-${String(sequence).padStart(3, "0")}`;
  while (documentRecords.some((document) => document.id === documentId)) {
    sequence += 1;
    documentId = `staff-doc-${staffId}-${String(sequence).padStart(3, "0")}`;
  }
  return documentId;
}
