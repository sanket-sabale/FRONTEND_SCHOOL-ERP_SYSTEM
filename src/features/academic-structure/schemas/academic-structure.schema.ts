import { z } from "zod";
import {
  academicStructureStatuses,
  academicYearStatuses,
} from "@/features/academic-structure/types/academic-structure";

const requiredId = z.string().trim().min(1);
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");

const scopedFields = {
  tenantId: requiredId,
  schoolId: requiredId,
  campusId: requiredId,
  academicYearId: requiredId,
};

const optionalScopedFields = {
  tenantId: requiredId.optional(),
  schoolId: requiredId.optional(),
  campusId: requiredId.optional(),
  academicYearId: requiredId.optional(),
};

const capacitySchema = z.number().int().positive().max(500).optional();

export const academicYearFiltersSchema = z.object({
  ...optionalScopedFields,
  query: z.string().trim().optional(),
  status: z.enum(academicYearStatuses).optional(),
  currentOnly: z.boolean().optional(),
});

export const academicClassFiltersSchema = z.object({
  ...optionalScopedFields,
  query: z.string().trim().optional(),
  status: z.enum(academicStructureStatuses).optional(),
  includeArchived: z.boolean().optional(),
  sortBy: z.enum(["displayName", "code", "sortOrder", "status"]).default("sortOrder"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

export const sectionFiltersSchema = z.object({
  ...optionalScopedFields,
  query: z.string().trim().optional(),
  classId: requiredId.optional(),
  status: z.enum(academicStructureStatuses).optional(),
  includeArchived: z.boolean().optional(),
  sortBy: z.enum(["displayName", "name", "capacity", "status"]).default("displayName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

export const academicYearSchema = z.object({
  ...scopedFields,
  id: requiredId,
  name: z.string().trim().min(3).max(40),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  status: z.enum(academicYearStatuses),
  isCurrent: z.boolean(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
  archivedAt: z.string().trim().min(1).optional(),
});

export const academicYearCreateSchema = academicYearSchema
  .omit({ id: true, createdAt: true, updatedAt: true, archivedAt: true })
  .extend({
    id: requiredId.optional(),
    status: z.enum(academicYearStatuses).default("draft"),
    isCurrent: z.boolean().default(false),
  });

export const academicYearUpdateSchema = academicYearCreateSchema
  .omit({ tenantId: true, schoolId: true, campusId: true, academicYearId: true })
  .partial()
  .extend({
    id: requiredId,
    ...scopedFields,
  });

export const academicClassSchema = z.object({
  ...scopedFields,
  id: requiredId,
  code: z.string().trim().min(1).max(40),
  displayName: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().min(0).max(1000),
  status: z.enum(academicStructureStatuses),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
  archivedAt: z.string().trim().min(1).optional(),
});

export const academicClassCreateSchema = academicClassSchema
  .omit({ id: true, createdAt: true, updatedAt: true, archivedAt: true })
  .extend({
    id: requiredId.optional(),
    status: z.enum(academicStructureStatuses).default("active"),
  });

export const academicClassUpdateSchema = academicClassCreateSchema
  .omit({ tenantId: true, schoolId: true, campusId: true, academicYearId: true })
  .partial()
  .extend({
    id: requiredId,
    ...scopedFields,
  });

export const sectionSchema = z.object({
  ...scopedFields,
  id: requiredId,
  classId: requiredId,
  name: z.string().trim().min(1).max(40),
  displayName: z.string().trim().min(1).max(80),
  capacity: capacitySchema,
  roomId: requiredId.optional(),
  classTeacherId: requiredId.optional(),
  status: z.enum(academicStructureStatuses),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
  archivedAt: z.string().trim().min(1).optional(),
});

export const sectionCreateSchema = sectionSchema
  .omit({ id: true, createdAt: true, updatedAt: true, archivedAt: true })
  .extend({
    id: requiredId.optional(),
    status: z.enum(academicStructureStatuses).default("active"),
  });

export const sectionUpdateSchema = sectionCreateSchema
  .omit({ tenantId: true, schoolId: true, campusId: true, academicYearId: true, classId: true })
  .partial()
  .extend({
    id: requiredId,
    ...scopedFields,
  });

export const academicStructureArchiveSchema = z.object({
  ...scopedFields,
  id: requiredId,
});

export const academicYearStatusSchema = z.object({
  ...scopedFields,
  id: requiredId,
  status: z.enum(academicYearStatuses),
});

export const academicStructureStatusSchema = z.object({
  ...scopedFields,
  id: requiredId,
  status: z.enum(academicStructureStatuses),
});
