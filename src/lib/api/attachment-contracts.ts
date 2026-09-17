import { ApiError } from "@/lib/api/client";
import type {
  AttachmentKind,
  AttachmentValidationResult,
  CommunicationScope,
} from "@/types/communication";

export type AttachmentDescriptor = {
  name: string;
  size: number;
  type: string;
};

export const communicationUploadPolicy = {
  maxFileSizeBytes: 25 * 1024 * 1024,
  maxFilesPerMessage: 5,
  maxFilenameLength: 140,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"],
};

export function validateAttachmentDescriptor(file: AttachmentDescriptor): AttachmentValidationResult {
  const sanitizedName = sanitizeFilename(file.name);
  const extension = getExtension(sanitizedName);

  if (!sanitizedName || sanitizedName.length > communicationUploadPolicy.maxFilenameLength || sanitizedName !== file.name.replaceAll("\\", "_").replaceAll("/", "_")) {
    return { ok: false, code: "INVALID_FILENAME", message: "This filename is not supported. Please rename the file and try again." };
  }

  if (!communicationUploadPolicy.allowedMimeTypes.includes(file.type) || !communicationUploadPolicy.allowedExtensions.includes(extension)) {
    return { ok: false, code: "INVALID_FILE_TYPE", message: "This file type isn't supported. Please choose a PDF, image, Word, Excel, PowerPoint, text, or CSV file." };
  }

  if (file.size > communicationUploadPolicy.maxFileSizeBytes) {
    return { ok: false, code: "FILE_TOO_LARGE", message: `This file is too large. Maximum allowed size is ${formatFileSize(communicationUploadPolicy.maxFileSizeBytes)}.` };
  }

  return { ok: true };
}

export function createMockAttachmentReference({
  file,
  scope,
  resource,
}: {
  file: AttachmentDescriptor;
  scope: Pick<CommunicationScope, "tenantId" | "schoolId" | "campusId">;
  resource: string;
}) {
  const validation = validateAttachmentDescriptor(file);
  if (!validation.ok) throw new ApiError(422, validation.message);

  const name = sanitizeFilename(file.name);
  const attachmentId = `att-${Date.now()}-${Math.round(file.size)}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return {
    attachmentId,
    fileName: name,
    mimeType: file.type,
    fileSize: file.size,
    kind: getAttachmentKind(file.type, name),
    reference: `mock://${attachmentId}`,
    storageKey: `tenants/${scope.tenantId}/schools/${scope.schoolId}/campuses/${scope.campusId}/${resource}/${attachmentId}`,
  };
}

export function sanitizeFilename(name: string) {
  return name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replaceAll("..", ".")
    .replaceAll("\\", "_")
    .replaceAll("/", "_")
    .trim();
}

export function getAttachmentKind(mimeType: string, filename: string): AttachmentKind {
  const extension = getExtension(filename);
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf" || extension === ".pdf") return "pdf";
  if ([".doc", ".docx"].includes(extension)) return "word";
  if ([".xls", ".xlsx"].includes(extension)) return "excel";
  if ([".ppt", ".pptx"].includes(extension)) return "powerpoint";
  if ([".txt", ".csv"].includes(extension)) return "text";

  return "file";
}

export function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function getExtension(filename: string) {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : "";
}
