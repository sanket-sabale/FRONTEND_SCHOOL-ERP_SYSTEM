import { z } from "zod";
import {
  guardianCustodyStatuses,
  guardianRelationshipTypes,
  guardianStatuses,
  guardianVerificationStatuses,
} from "@/features/guardians/types/guardian";

const requiredId = z.string().trim().min(1);
const optionalText = z.string().trim().max(120).optional();
const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[+0-9 ()-]+$/, "Use a valid phone number.");
const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");

export const guardianFiltersSchema = z.object({
  tenantId: requiredId.optional(),
  schoolId: requiredId.optional(),
  campusId: requiredId.optional(),
  academicYearId: requiredId.optional(),
  query: z.string().trim().optional(),
  status: z.enum(guardianStatuses).optional(),
  verificationStatus: z.enum(guardianVerificationStatuses).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
});

export const guardianCreateSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  firstName: z.string().trim().min(1).max(80),
  middleName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80),
  occupation: optionalText,
  employer: optionalText,
  email: z.string().trim().email().max(160).optional(),
  primaryPhone: phoneSchema,
  alternatePhone: phoneSchema.optional(),
  address: z.string().trim().max(240).optional(),
  city: optionalText,
  state: optionalText,
  country: optionalText,
  postalCode: z.string().trim().max(20).optional(),
  preferredLanguage: optionalText,
});

export const guardianUpdateSchema = guardianCreateSchema
  .omit({
    tenantId: true,
    schoolId: true,
    campusId: true,
    academicYearId: true,
  })
  .partial()
  .extend({
    id: requiredId,
    tenantId: requiredId,
    schoolId: requiredId,
    campusId: requiredId,
    academicYearId: requiredId,
    status: z.enum(guardianStatuses).optional(),
    verificationStatus: z.enum(guardianVerificationStatuses).optional(),
  });

export const guardianRelationshipSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  guardianId: requiredId,
  studentId: requiredId,
  relationshipType: z.enum(guardianRelationshipTypes),
  isPrimary: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  canPickup: z.boolean().default(false),
  canReceiveAcademicCommunication: z.boolean().default(true),
  canReceiveFeeCommunication: z.boolean().default(true),
  canReceiveAttendanceCommunication: z.boolean().default(true),
  canReceiveGeneralCommunication: z.boolean().default(true),
  custodyStatus: z.enum(guardianCustodyStatuses).default("not_specified"),
  notes: z.string().trim().max(500).optional(),
  startDate: isoDateSchema.optional(),
});

export const guardianRelationshipUpdateSchema = guardianRelationshipSchema
  .omit({
    guardianId: true,
    studentId: true,
  })
  .partial()
  .extend({
    relationshipId: requiredId,
    tenantId: requiredId,
    schoolId: requiredId,
    campusId: requiredId,
    academicYearId: requiredId,
  });

export const guardianRelationshipEndSchema = z.object({
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
  relationshipId: requiredId,
  endDate: isoDateSchema.optional(),
  notes: z.string().trim().max(500).optional(),
});
