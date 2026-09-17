import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { createMockAttachmentReference, validateAttachmentDescriptor } from "@/lib/api/attachments";
import { studentService } from "@/lib/api/students";
import {
  studentDocumentArchiveSchema,
  studentDocumentCreateSchema,
  studentDocumentFiltersSchema,
  studentDocumentMutationSchema,
  studentDocumentRejectSchema,
} from "@/features/students/schemas/student.schema";
import {
  mockStudentDocuments,
  studentDocumentRequirements,
  studentDocumentTypeLabels,
} from "@/features/students/services/student-documents";
import type {
  StudentDocument,
  StudentDocumentArchiveInput,
  StudentDocumentCreateInput,
  StudentDocumentFilters,
  StudentDocumentListResponse,
  StudentDocumentVerificationInput,
} from "@/features/students/types/student";

let documentRecords = [...mockStudentDocuments];

export const studentDocumentService = {
  async getStudentDocuments(scope: TenantScopedQuery, studentId: string, filters: StudentDocumentFilters = {}): Promise<StudentDocumentListResponse> {
    await ensureStudentInScope(scope, studentId);
    const parsedFilters = studentDocumentFiltersSchema.parse(filters);
    const documents = documentRecords
      .filter((document) => isDocumentInScope(document, scope, studentId))
      .map(applyExpiryState)
      .filter((document) => parsedFilters.status ? document.status === parsedFilters.status : document.status !== "archived")
      .filter((document) => !parsedFilters.verificationStatus || document.verificationStatus === parsedFilters.verificationStatus)
      .filter((document) => parsedFilters.required === undefined || document.isRequired === parsedFilters.required)
      .sort((first, second) => first.title.localeCompare(second.title, "en-IN", { sensitivity: "base" }));

    const requiredTotal = studentDocumentRequirements.filter((requirement) => requirement.isRequired).length;
    const requiredComplete = studentDocumentRequirements
      .filter((requirement) => requirement.isRequired)
      .filter((requirement) =>
        documents.some(
          (document) =>
            document.documentType === requirement.documentType &&
            document.status === "active" &&
            document.verificationStatus === "verified",
        ),
      ).length;

    return {
      documents,
      requirements: studentDocumentRequirements,
      requiredTotal,
      requiredComplete,
    };
  },

  async createStudentDocument(input: StudentDocumentCreateInput) {
    const parsedInput = studentDocumentCreateSchema.parse(input);
    await ensureStudentInScope(parsedInput, parsedInput.studentId);
    const requirement = getDocumentRequirement(parsedInput.documentType);
    const validation = validateAttachmentDescriptor({
      name: parsedInput.attachment.fileName,
      size: parsedInput.attachment.fileSize,
      type: parsedInput.attachment.mimeType,
    });

    if (!validation.ok) {
      throw new ApiError(422, validation.message);
    }

    const attachment = createMockAttachmentReference({
      file: {
        name: parsedInput.attachment.fileName,
        size: parsedInput.attachment.fileSize,
        type: parsedInput.attachment.mimeType,
      },
      scope: parsedInput,
      resource: `students/${parsedInput.studentId}/documents`,
    });
    const now = new Date().toISOString();

    documentRecords = documentRecords.map((document) =>
      isDocumentInScope(document, parsedInput, parsedInput.studentId) &&
      document.documentType === parsedInput.documentType &&
      document.status === "active"
        ? {
            ...document,
            status: "archived",
            archivedAt: now,
            updatedAt: now,
          }
        : document,
    );

    const document: StudentDocument = {
      id: createDocumentId(parsedInput.studentId),
      tenantId: parsedInput.tenantId,
      schoolId: parsedInput.schoolId,
      campusId: parsedInput.campusId,
      academicYearId: parsedInput.academicYearId,
      studentId: parsedInput.studentId,
      documentType: parsedInput.documentType,
      category: requirement.category,
      title: parsedInput.title || requirement.title || studentDocumentTypeLabels[parsedInput.documentType],
      description: parsedInput.description || requirement.description,
      attachment,
      status: "active",
      verificationStatus: parsedInput.expiresAt && isPastDate(parsedInput.expiresAt) ? "expired" : "pending",
      expiresAt: parsedInput.expiresAt,
      uploadedAt: now,
      uploadedBy: "current-user",
      isRequired: requirement.isRequired,
      createdAt: now,
      updatedAt: now,
    };

    documentRecords = [document, ...documentRecords];
    return document;
  },

  async verifyStudentDocument(input: StudentDocumentVerificationInput) {
    const parsedInput = studentDocumentMutationSchema.parse(input);
    return updateDocument(parsedInput, (document, now) => {
      if (document.status === "archived") throw new ApiError(422, "Archived documents cannot be verified.");
      if (document.verificationStatus === "expired") throw new ApiError(422, "Expired documents must be replaced before verification.");

      return {
        ...document,
        verificationStatus: "verified",
        rejectionReason: undefined,
        verifiedAt: now,
        verifiedBy: "current-user",
        updatedAt: now,
      };
    });
  },

  async rejectStudentDocument(input: StudentDocumentVerificationInput) {
    const parsedInput = studentDocumentRejectSchema.parse(input);
    return updateDocument(parsedInput, (document, now) => {
      if (document.status === "archived") throw new ApiError(422, "Archived documents cannot be rejected.");

      return {
        ...document,
        verificationStatus: "rejected",
        rejectionReason: parsedInput.rejectionReason,
        verifiedAt: undefined,
        verifiedBy: undefined,
        updatedAt: now,
      };
    });
  },

  async archiveStudentDocument(input: StudentDocumentArchiveInput) {
    const parsedInput = studentDocumentArchiveSchema.parse(input);
    return updateDocument(parsedInput, (document, now) => {
      if (document.status === "archived") throw new ApiError(422, "This document is already archived.");

      return {
        ...document,
        status: "archived",
        archivedAt: now,
        updatedAt: now,
      };
    });
  },

  async restoreStudentDocument(input: StudentDocumentArchiveInput) {
    const parsedInput = studentDocumentArchiveSchema.parse(input);
    return updateDocument(parsedInput, (document, now) => {
      if (document.status !== "archived") throw new ApiError(422, "Only archived documents can be restored.");

      return {
        ...document,
        status: "active",
        archivedAt: undefined,
        updatedAt: now,
      };
    });
  },
};

async function updateDocument(
  input: TenantScopedQuery & { studentId: string; documentId: string },
  updater: (document: StudentDocument, now: string) => StudentDocument,
) {
  await ensureStudentInScope(input, input.studentId);
  const index = documentRecords.findIndex((document) => isDocumentInScope(document, input, input.studentId) && document.id === input.documentId);
  if (index === -1) throw new ApiError(404, "Student document could not be found.");

  const current = documentRecords[index];
  if (!current) throw new ApiError(404, "Student document could not be found.");

  const next = updater(applyExpiryState(current), new Date().toISOString());
  documentRecords = documentRecords.map((document) => (document.id === next.id ? next : document));
  return next;
}

async function ensureStudentInScope(scope: TenantScopedQuery, studentId: string) {
  const student = await studentService.getStudent(scope, studentId);
  if (!student) throw new ApiError(404, "Student could not be found in the current school context.");
}

function isDocumentInScope(document: StudentDocument, scope: TenantScopedQuery, studentId: string) {
  return (
    document.studentId === studentId &&
    document.tenantId === scope.tenantId &&
    document.schoolId === scope.schoolId &&
    document.campusId === scope.campusId &&
    document.academicYearId === scope.academicYearId
  );
}

function getDocumentRequirement(documentType: StudentDocument["documentType"]) {
  return studentDocumentRequirements.find((requirement) => requirement.documentType === documentType) ?? {
    documentType,
    category: "other",
    title: studentDocumentTypeLabels[documentType],
    isRequired: false,
  };
}

function applyExpiryState(document: StudentDocument): StudentDocument {
  if (document.status === "archived" || !document.expiresAt || !isPastDate(document.expiresAt)) return document;
  if (document.verificationStatus === "expired") return document;

  return {
    ...document,
    verificationStatus: "expired",
  };
}

function isPastDate(value: string) {
  return new Date(`${value}T00:00:00`).getTime() < Date.now();
}

function createDocumentId(studentId: string) {
  let sequence = documentRecords.length + 1;
  let documentId = `doc-${studentId}-${String(sequence).padStart(3, "0")}`;

  while (documentRecords.some((document) => document.id === documentId)) {
    sequence += 1;
    documentId = `doc-${studentId}-${String(sequence).padStart(3, "0")}`;
  }

  return documentId;
}
