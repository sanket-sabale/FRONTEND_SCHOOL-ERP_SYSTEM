import { z } from "zod";
import { staffDocumentStatuses, staffDocumentTypes } from "@/features/staff-documents/types/staff-document";

const scopedFields = {
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
};

const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");

const fileMetadataSchema = z.object({
  fileName: z.string().trim().min(1).max(140),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().positive().max(25 * 1024 * 1024),
});

export const staffDocumentFiltersSchema = z.object({
  search: z.string().trim().optional(),
  documentType: z.enum(staffDocumentTypes).optional(),
  status: z.enum(staffDocumentStatuses).optional(),
  expiry: z.enum(["all", "no_expiry", "valid", "expiring_soon", "expired"]).optional(),
});

export const staffDocumentCreateSchema = z.object({
  ...scopedFields,
  staffId: z.string().trim().min(1),
  documentType: z.enum(staffDocumentTypes),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  attachment: fileMetadataSchema,
  expiryDate: isoDateSchema.optional(),
  replacementOfDocumentId: z.string().trim().min(1).optional(),
});

export const staffDocumentMutationSchema = z.object({
  ...scopedFields,
  staffId: z.string().trim().min(1),
  documentId: z.string().trim().min(1),
  verificationNotes: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(500).optional(),
});

export const staffDocumentRejectSchema = staffDocumentMutationSchema.extend({
  verificationNotes: z.string().trim().min(1).max(500),
});
