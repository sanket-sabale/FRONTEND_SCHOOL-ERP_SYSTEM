import { z } from "zod";
import {
  guardianRelationshipTypes,
  studentDocumentStatuses,
  studentDocumentTypes,
  studentDocumentVerificationStatuses,
  studentLifecycleActions,
  studentLifecycleReasons,
  studentGenders,
  studentStatuses,
} from "@/features/students/types/student";

export const studentFiltersSchema = z.object({
  query: z.string().trim().optional(),
  tenantId: z.string().trim().min(1).optional(),
  schoolId: z.string().trim().min(1).optional(),
  campusId: z.string().trim().min(1).optional(),
  academicYearId: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional(),
  status: z.enum(studentStatuses).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["displayName", "admissionNumber", "className", "admissionDate", "status"]).default("displayName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

export const guardianRelationshipSchema = z.object({
  guardianId: z.string().trim().min(1),
  relationship: z.enum(guardianRelationshipTypes),
  isPrimary: z.boolean().default(false),
});

const admissionNumberSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[A-Z0-9][A-Z0-9/-]*$/i, "Admission number may contain letters, numbers, hyphens, and slashes.");

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");

export const studentCreateSchema = z.object({
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
  admissionNumber: admissionNumberSchema,
  studentCode: z.string().trim().min(1).max(32).optional(),
  firstName: z.string().trim().min(1).max(80),
  middleName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80),
  dateOfBirth: isoDateSchema.optional(),
  gender: z.enum(studentGenders),
  status: z.enum(studentStatuses).default("pending"),
  classId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1),
  rollNumber: z.string().trim().min(1).max(20).optional(),
  admissionDate: isoDateSchema,
  guardians: z.array(guardianRelationshipSchema).default([]),
});

export const studentUpdateSchema = studentCreateSchema
  .omit({
    academicYearId: true,
    campusId: true,
    tenantId: true,
    schoolId: true,
  })
  .partial()
  .extend({
    id: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
    schoolId: z.string().trim().min(1),
    campusId: z.string().trim().min(1).optional(),
    academicYearId: z.string().trim().min(1).optional(),
    status: z.enum(studentStatuses).optional(),
    guardians: z.array(guardianRelationshipSchema).optional(),
  });

export const studentLifecycleSchema = z.object({
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
  studentId: z.string().trim().min(1),
  action: z.enum(studentLifecycleActions),
  reason: z.enum(studentLifecycleReasons).optional(),
  reasonNote: z.string().trim().max(500).optional(),
});

const fileMetadataSchema = z.object({
  fileName: z.string().trim().min(1).max(140),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().positive().max(25 * 1024 * 1024),
});

export const studentDocumentFiltersSchema = z.object({
  status: z.enum(studentDocumentStatuses).optional(),
  verificationStatus: z.enum(studentDocumentVerificationStatuses).optional(),
  required: z.boolean().optional(),
});

export const studentDocumentCreateSchema = z.object({
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
  studentId: z.string().trim().min(1),
  documentType: z.enum(studentDocumentTypes),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  attachment: fileMetadataSchema,
  expiresAt: isoDateSchema.optional(),
});

export const studentDocumentMutationSchema = z.object({
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
  studentId: z.string().trim().min(1),
  documentId: z.string().trim().min(1),
});

export const studentDocumentRejectSchema = studentDocumentMutationSchema.extend({
  rejectionReason: z.string().trim().min(1).max(500),
});

export const studentDocumentArchiveSchema = studentDocumentMutationSchema.extend({
  reason: z.string().trim().max(500).optional(),
});
