import { z } from "zod";
import { guardianRelationshipTypes } from "@/features/guardians/types/guardian";
import { studentGenders } from "@/features/students/types/student";
import {
  admissionApplicationStatuses,
  admissionCommunicationEvents,
  admissionCycleStatuses,
  admissionDecisionTypes,
  admissionDocumentStatuses,
  admissionDocumentTypes,
  admissionEnrollmentStatuses,
  admissionEvaluationStatuses,
  admissionEvaluationTypes,
  admissionPriorities,
  admissionReviewDecisions,
  admissionReviewStatuses,
  admissionSources,
} from "@/features/admissions/types/admission";

const requiredId = z.string().trim().min(1);
const optionalText = z.string().trim().max(160).optional();
const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");
const isoDateTimeSchema = z.string().trim().min(1);
const phoneSchema = z.string().trim().min(7).max(20).regex(/^[+0-9 ()-]+$/, "Use a valid phone number.").optional();

export const admissionScopeSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  admissionCycleId: requiredId.optional(),
});

export const admissionCycleSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  id: requiredId,
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(32),
  status: z.enum(admissionCycleStatuses),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  applicationStartDate: isoDateSchema,
  applicationEndDate: isoDateSchema,
  description: z.string().trim().max(500).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  archivedAt: isoDateTimeSchema.optional(),
});

export const applicantAddressSchema = z.object({
  address: z.string().trim().max(240).optional(),
  city: optionalText,
  state: optionalText,
  country: optionalText,
  postalCode: z.string().trim().max(20).optional(),
});

export const applicantSchema = z.object({
  id: requiredId,
  tenantId: requiredId,
  firstName: z.string().trim().min(1).max(80),
  middleName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(1).max(180),
  dateOfBirth: isoDateSchema.optional(),
  gender: z.enum(studentGenders).optional(),
  phone: phoneSchema,
  email: z.string().trim().email().max(160).optional(),
  address: applicantAddressSchema.optional(),
  previousSchool: optionalText,
  previousGrade: optionalText,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const admissionGuardianRelationshipSchema = z.object({
  applicantId: requiredId,
  guardianId: requiredId,
  relationshipType: z.enum(guardianRelationshipTypes),
  isPrimary: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  canReceiveCommunication: z.boolean().default(true),
  canPickup: z.boolean().default(false),
});

export const admissionApplicationSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  id: requiredId,
  admissionCycleId: requiredId,
  applicationNumber: z.string().trim().min(3).max(40),
  applicantId: requiredId,
  appliedClassId: requiredId,
  appliedSectionId: requiredId.optional(),
  status: z.enum(admissionApplicationStatuses),
  source: z.enum(admissionSources),
  priority: z.enum(admissionPriorities),
  assignedReviewerId: requiredId.optional(),
  submittedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const admissionApplicationFiltersSchema = z.object({
  tenantId: requiredId.optional(),
  schoolId: requiredId.optional(),
  campusId: requiredId.optional(),
  academicYearId: requiredId.optional(),
  admissionCycleId: requiredId.optional(),
  query: z.string().trim().optional(),
  status: z.enum(admissionApplicationStatuses).optional(),
  source: z.enum(admissionSources).optional(),
  assignedReviewerId: requiredId.optional(),
  classId: requiredId.optional(),
  sectionId: requiredId.optional(),
  documentStatus: z.enum(["incomplete", "pending_verification", "complete", ...admissionDocumentStatuses]).optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["applicationNumber", "applicantName", "status", "submittedAt", "createdAt"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const admissionDocumentQueueFiltersSchema = z.object({
  tenantId: requiredId.optional(),
  schoolId: requiredId.optional(),
  campusId: requiredId.optional(),
  academicYearId: requiredId.optional(),
  admissionCycleId: requiredId.optional(),
  query: z.string().trim().optional(),
  status: z.enum(admissionDocumentStatuses).optional(),
  documentType: z.enum(admissionDocumentTypes).optional(),
  classId: requiredId.optional(),
  sectionId: requiredId.optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["applicantName", "applicationNumber", "documentType", "status", "updatedAt"]).default("updatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const admissionDocumentSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  id: requiredId,
  applicationId: requiredId,
  documentType: z.enum(admissionDocumentTypes),
  status: z.enum(admissionDocumentStatuses),
  required: z.boolean(),
  uploadedAt: isoDateTimeSchema.optional(),
  uploadedBy: requiredId.optional(),
  verifiedAt: isoDateTimeSchema.optional(),
  verifiedBy: requiredId.optional(),
  rejectionReason: z.string().trim().max(500).optional(),
  version: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const admissionReviewSchema = z.object({
  id: requiredId,
  applicationId: requiredId,
  reviewerId: requiredId,
  decision: z.enum(admissionReviewDecisions),
  score: z.number().min(0).max(100).optional(),
  remarks: z.string().trim().max(1000).optional(),
  reviewedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const admissionEvaluationSchema = z.object({
  id: requiredId,
  applicationId: requiredId,
  type: z.enum(admissionEvaluationTypes),
  scheduledAt: isoDateTimeSchema.optional(),
  location: z.string().trim().max(160).optional(),
  mode: z.enum(["in_person", "online", "phone"]).optional(),
  evaluatorId: requiredId.optional(),
  score: z.number().min(0).max(100).optional(),
  result: z.enum(["recommended", "hold", "not_recommended"]).optional(),
  remarks: z.string().trim().max(1000).optional(),
  status: z.enum(admissionEvaluationStatuses),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const admissionDecisionSchema = z.object({
  id: requiredId,
  applicationId: requiredId,
  decision: z.enum(admissionDecisionTypes),
  decidedBy: requiredId,
  reason: z.string().trim().max(500).optional(),
  decidedAt: isoDateTimeSchema,
  exceptionId: requiredId.optional(),
});

export const admissionEnrollmentSchema = z.object({
  id: requiredId,
  applicationId: requiredId,
  studentId: requiredId.optional(),
  academicYearId: requiredId,
  classId: requiredId,
  sectionId: requiredId.optional(),
  admissionNumber: z.string().trim().min(3).max(40).optional(),
  enrolledAt: isoDateTimeSchema.optional(),
  enrolledBy: requiredId.optional(),
  status: z.enum(admissionEnrollmentStatuses),
});

export const admissionSeatCapacitySchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  id: requiredId,
  admissionCycleId: requiredId,
  classId: requiredId,
  sectionId: requiredId.optional(),
  capacity: z.number().int().nonnegative(),
});

export const admissionCreateApplicationSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  admissionCycleId: requiredId,
  firstName: z.string().trim().min(1).max(80),
  middleName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80),
  dateOfBirth: isoDateSchema.optional(),
  gender: z.enum(studentGenders).optional(),
  phone: phoneSchema,
  email: z.string().trim().email().max(160).optional(),
  address: applicantAddressSchema.optional(),
  previousSchool: optionalText,
  previousGrade: optionalText,
  appliedClassId: requiredId,
  appliedSectionId: requiredId.optional(),
  source: z.enum(admissionSources).default("walk_in"),
  priority: z.enum(admissionPriorities).default("normal"),
  guardians: z.array(admissionGuardianRelationshipSchema).default([]),
});

export const admissionUpdateApplicationSchema = admissionCreateApplicationSchema
  .omit({
    firstName: true,
    lastName: true,
  })
  .partial()
  .extend({
    id: requiredId,
    tenantId: requiredId,
    schoolId: requiredId,
    campusId: requiredId,
    academicYearId: requiredId,
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    assignedReviewerId: requiredId.optional(),
  });

export const admissionStatusTransitionSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  applicationId: requiredId,
  nextStatus: z.enum(admissionApplicationStatuses),
  actorId: requiredId,
  reason: z.string().trim().max(500).optional(),
});

export const admissionDocumentUploadSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  applicationId: requiredId,
  documentId: requiredId,
  actorId: requiredId,
  fileName: z.string().trim().min(1).max(160),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024),
});

export const admissionDocumentVerificationSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  applicationId: requiredId,
  documentId: requiredId,
  actorId: requiredId,
  rejectionReason: z.string().trim().min(10).max(500).optional(),
});

export const admissionReviewQueueFiltersSchema = z.object({
  tenantId: requiredId.optional(),
  schoolId: requiredId.optional(),
  campusId: requiredId.optional(),
  academicYearId: requiredId.optional(),
  admissionCycleId: requiredId.optional(),
  query: z.string().trim().optional(),
  view: z.enum(["all", "my", "unassigned", "in_progress", "completed"]).default("all"),
  status: z.enum(admissionReviewStatuses).optional(),
  reviewerId: requiredId.optional(),
  classId: requiredId.optional(),
  sectionId: requiredId.optional(),
  documentStatus: z.enum(["incomplete", "pending_verification", "complete", ...admissionDocumentStatuses]).optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["applicantName", "applicationNumber", "reviewStatus", "submittedAt", "updatedAt"]).default("updatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const admissionReviewAssignmentSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  applicationId: requiredId,
  reviewerId: requiredId.optional(),
  actorId: requiredId,
});

export const admissionReviewCompletionSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  applicationId: requiredId,
  reviewerId: requiredId,
  decision: z.enum(admissionReviewDecisions),
  score: z.number().min(0).max(100).optional(),
  remarks: z.string().trim().max(1000).optional(),
  actorId: requiredId,
});

export const admissionEvaluationQueueFiltersSchema = z.object({
  tenantId: requiredId.optional(),
  schoolId: requiredId.optional(),
  campusId: requiredId.optional(),
  academicYearId: requiredId.optional(),
  admissionCycleId: requiredId.optional(),
  query: z.string().trim().optional(),
  view: z.enum(["all", "my", "upcoming", "today", "completed", "cancelled"]).default("all"),
  type: z.enum(admissionEvaluationTypes).optional(),
  status: z.enum(admissionEvaluationStatuses).optional(),
  evaluatorId: requiredId.optional(),
  classId: requiredId.optional(),
  sectionId: requiredId.optional(),
  result: z.enum(["recommended", "hold", "not_recommended"]).optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["applicantName", "applicationNumber", "type", "status", "scheduledAt", "updatedAt"]).default("updatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const admissionEvaluationInputSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  applicationId: requiredId,
  evaluationId: requiredId.optional(),
  type: z.enum(admissionEvaluationTypes).optional(),
  title: z.string().trim().max(160).optional(),
  scheduledAt: isoDateTimeSchema.optional(),
  durationMinutes: z.number().int().positive().max(480).optional(),
  location: z.string().trim().max(160).optional(),
  mode: z.enum(["in_person", "online", "phone"]).optional(),
  evaluatorId: requiredId.optional(),
  maxScore: z.number().min(1).max(500).optional(),
  score: z.number().min(0).max(500).optional(),
  result: z.enum(["recommended", "hold", "not_recommended"]).optional(),
  remarks: z.string().trim().max(1000).optional(),
  actorId: requiredId,
  reason: z.string().trim().max(500).optional(),
});

export const admissionDecisionInputSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  applicationId: requiredId,
  actorId: requiredId,
  reason: z.string().trim().max(500).optional(),
  reasonCode: z.enum(["eligibility", "documentation", "evaluation", "capacity", "administrative", "other"]).optional(),
  waitlistPosition: z.number().int().positive().optional(),
});

export const admissionSeatFiltersSchema = z.object({
  tenantId: requiredId.optional(),
  schoolId: requiredId.optional(),
  campusId: requiredId.optional(),
  academicYearId: requiredId.optional(),
  admissionCycleId: requiredId.optional(),
  classId: requiredId.optional(),
  sectionId: requiredId.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
});

export const admissionSeatCapacityInputSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  id: requiredId.optional(),
  admissionCycleId: requiredId,
  classId: requiredId,
  sectionId: requiredId.optional(),
  capacity: z.number().int().nonnegative().max(1000),
  actorId: requiredId,
});

export const admissionEnrollmentInputSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  applicationId: requiredId,
  actorId: requiredId,
  classId: requiredId.optional(),
  sectionId: requiredId.optional(),
});

export const admissionCommunicationInputSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  applicationId: requiredId,
  actorId: requiredId,
  event: z.enum(admissionCommunicationEvents),
  message: z.string().trim().max(1000).optional(),
});
