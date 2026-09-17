import { ApiError } from "@/lib/api/client";
import {
  createMockAttachmentReference,
  getAttachmentKind,
  sanitizeFilename,
  validateAttachmentDescriptor,
} from "@/lib/api/attachment-contracts";
import type {
  AttachmentValidationResult,
  CommunicationScope,
  MessageAttachment,
} from "@/types/communication";

type UploadAttachmentInput = {
  file: File;
  conversationId: string;
};

type UploadAttachmentResult = {
  attachment: MessageAttachment;
};

type StorageAdapter = {
  upload(scope: CommunicationScope, input: UploadAttachmentInput): Promise<UploadAttachmentResult>;
};

const mockStorageAdapter: StorageAdapter = {
  async upload(scope, input) {
    const validation = validateAttachmentFile(input.file);
    if (!validation.ok) throw new ApiError(422, validation.message);

    const name = sanitizeFilename(input.file.name);
    const kind = getAttachmentKind(input.file.type, name);
    const objectUrl = kind === "image" ? URL.createObjectURL(input.file) : undefined;
    const attachmentId = `att-${Date.now()}-${Math.round(input.file.size)}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const attachment: MessageAttachment = {
      id: attachmentId,
      name,
      size: input.file.size,
      mimeType: input.file.type,
      kind,
      reference: `mock://${attachmentId}`,
      storageKey: `tenants/${scope.tenantId}/communications/${input.conversationId}/${attachmentId}`,
      status: "uploaded",
      url: objectUrl,
      thumbnailUrl: objectUrl,
      metadata: {
        uploadedBy: scope.userId,
        schoolId: scope.schoolId,
        campusId: scope.campusId,
      },
    };

    return { attachment };
  },
};

export const attachmentService = {
  validateAttachmentFile,
  validateAttachmentDescriptor,
  createMockAttachmentReference,
  uploadAttachment(scope: CommunicationScope, input: UploadAttachmentInput) {
    return mockStorageAdapter.upload(scope, input);
  },
};

export function validateAttachmentFile(file: File): AttachmentValidationResult {
  return validateAttachmentDescriptor({
    name: file.name,
    size: file.size,
    type: file.type,
  });
}
