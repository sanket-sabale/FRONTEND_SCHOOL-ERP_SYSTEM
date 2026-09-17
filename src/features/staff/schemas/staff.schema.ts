import { z } from "zod";
import {
  emergencyContactRelationships,
  employmentTypes,
  staffCategories,
  staffPreferredContactMethods,
  staffStatuses,
} from "@/features/staff/types/staff";

const scopedFields = {
  tenantId: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
};

const optionalScopedFields = {
  tenantId: z.string().trim().min(1).optional(),
  schoolId: z.string().trim().min(1).optional(),
  campusId: z.string().trim().min(1).optional(),
  academicYearId: z.string().trim().min(1).optional(),
};

export const staffEmployeeNumberSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[A-Z0-9][A-Z0-9/-]*$/i, "Employee number may contain letters, numbers, hyphens, and slashes.");

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");

const nameSchema = z.string().trim().min(1).max(80);
const optionalNameSchema = z.string().trim().min(1).max(80).optional();
const referenceIdSchema = z.string().trim().min(1).max(80);
const optionalUserIdSchema = z.string().trim().min(1).max(80).nullable().optional();
const exitReasonSchema = z.string().trim().min(3).max(300).optional();
const optionalEmailSchema = z.string().trim().email("Enter a valid email address.").max(120).optional();
const optionalPhoneSchema = z
  .string()
  .trim()
  .regex(/^(\+91[-\s]?)?[6-9]\d{9}$|^\d{6,15}$/, "Enter a valid phone number.")
  .optional();
const optionalPinCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter a valid 6-digit PIN code.")
  .optional();
const optionalShortTextSchema = z.string().trim().min(1).max(120).optional();
const optionalLongTextSchema = z.string().trim().min(1).max(500).optional();
const orgStatusSchema = z.enum(["active", "inactive"]);

export const staffContactSchema = z.object({
  mobileNumber: optionalPhoneSchema,
  alternatePhone: optionalPhoneSchema,
  personalEmail: optionalEmailSchema,
  officialEmail: optionalEmailSchema,
  preferredContactMethod: z.enum(staffPreferredContactMethods).optional(),
});

export const staffAddressSchema = z.object({
  addressLine1: optionalShortTextSchema,
  addressLine2: optionalShortTextSchema,
  city: optionalShortTextSchema,
  district: optionalShortTextSchema,
  state: optionalShortTextSchema,
  pinCode: optionalPinCodeSchema,
  country: optionalShortTextSchema.default("India").optional(),
});

export const staffEmergencyContactSchema = z.object({
  name: optionalShortTextSchema,
  relationship: z.enum(emergencyContactRelationships).optional(),
  mobileNumber: optionalPhoneSchema,
  alternateNumber: optionalPhoneSchema,
  email: optionalEmailSchema,
  address: optionalLongTextSchema,
  isPrimary: z.boolean().optional(),
});

export const staffTeachingInfoSchema = z.object({
  subjectAreas: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  academicDepartment: optionalShortTextSchema,
  teacherCode: z.string().trim().min(2).max(40).optional(),
  qualificationSummary: optionalLongTextSchema,
  experienceSummary: optionalLongTextSchema,
});

export const staffFiltersSchema = z.object({
  ...optionalScopedFields,
  query: z.string().trim().optional(),
  staffCategory: z.enum(staffCategories).optional(),
  employmentType: z.enum(employmentTypes).optional(),
  status: z.enum(staffStatuses).optional(),
  departmentId: z.string().trim().min(1).optional(),
  designationId: z.string().trim().min(1).optional(),
  joiningDateFrom: isoDateSchema.optional(),
  joiningDateTo: isoDateSchema.optional(),
  userLinked: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z
    .enum(["displayName", "employeeNumber", "departmentName", "designationName", "joiningDate", "status"])
    .default("displayName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

export const staffCreateSchema = z.object({
  ...scopedFields,
  employeeNumber: staffEmployeeNumberSchema,
  userId: optionalUserIdSchema,
  firstName: nameSchema,
  middleName: optionalNameSchema,
  lastName: nameSchema,
  staffCategory: z.enum(staffCategories),
  employmentType: z.enum(employmentTypes),
  status: z.enum(staffStatuses).default("active"),
  joiningDate: isoDateSchema,
  confirmationDate: isoDateSchema.optional(),
  exitDate: isoDateSchema.optional(),
  exitReason: exitReasonSchema,
  departmentId: referenceIdSchema,
  designationId: referenceIdSchema,
  reportingManagerId: referenceIdSchema.optional(),
  contact: staffContactSchema.optional(),
  currentAddress: staffAddressSchema.optional(),
  permanentAddress: staffAddressSchema.optional(),
  permanentAddressSameAsCurrent: z.boolean().optional(),
  emergencyContacts: z.array(staffEmergencyContactSchema).max(2).optional(),
  teachingInfo: staffTeachingInfoSchema.optional(),
});

export const staffUpdateSchema = staffCreateSchema
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
  });

export const staffStatusChangeSchema = z.object({
  ...scopedFields,
  staffId: z.string().trim().min(1),
  status: z.enum(staffStatuses),
  exitDate: isoDateSchema.optional(),
  exitReason: exitReasonSchema,
});

export const staffIdSchema = z.object({
  ...scopedFields,
  staffId: z.string().trim().min(1),
});

export const staffOrgEntityFiltersSchema = z.object({
  query: z.string().trim().optional(),
  status: orgStatusSchema.optional(),
});

export const staffDepartmentSchema = z.object({
  ...scopedFields,
  id: z.string().trim().min(1).max(80).optional(),
  code: z.string().trim().min(2).max(16).regex(/^[A-Z0-9-]+$/i, "Department code may contain letters, numbers, and hyphens."),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(1).max(240).optional(),
  status: orgStatusSchema.default("active"),
});

export const staffDesignationSchema = z.object({
  ...scopedFields,
  id: z.string().trim().min(1).max(80).optional(),
  code: z.string().trim().min(2).max(16).regex(/^[A-Z0-9-]+$/i, "Designation code may contain letters, numbers, and hyphens."),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(1).max(240).optional(),
  staffCategory: z.enum(staffCategories).optional(),
  status: orgStatusSchema.default("active"),
});
