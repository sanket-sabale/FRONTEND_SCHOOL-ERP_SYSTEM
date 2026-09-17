import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import {
  academicClassCreateSchema,
  academicClassFiltersSchema,
  academicClassUpdateSchema,
  academicStructureArchiveSchema,
  academicYearCreateSchema,
  academicYearFiltersSchema,
  academicYearUpdateSchema,
  sectionCreateSchema,
  sectionFiltersSchema,
  sectionUpdateSchema,
} from "@/features/academic-structure/schemas/academic-structure.schema";
import {
  isSameScope,
  isSameTenantSchoolCampus,
  validateAcademicYearDates,
  validateAcademicYearCanBeArchived,
  validateAcademicYearCanReceiveClasses,
  validateAcademicYearStatusTransition,
  validateClassCanBeArchived,
  validateClassCanReceiveSection,
  validateClassStatusTransition,
  validateClassAndSectionShareScope,
  validateNoDuplicateCurrentAcademicYear,
  validateSectionCanReceiveStudents,
  validateSectionStatusTransition,
  validateUniqueClassCode,
  validateUniqueSectionName,
} from "@/features/academic-structure/services/academic-structure-rules";
import {
  mockAcademicClasses,
  mockAcademicYears,
  mockSections,
} from "@/features/academic-structure/services/mock-academic-structure";
import type {
  AcademicClass,
  AcademicClassCreateInput,
  AcademicClassFilters,
  AcademicClassUpdateInput,
  AcademicStructurePlacementOption,
  AcademicYear,
  AcademicYearCreateInput,
  AcademicYearFilters,
  AcademicYearUpdateInput,
  Section,
  SectionCreateInput,
  SectionFilters,
  SectionUpdateInput,
} from "@/features/academic-structure/types/academic-structure";

type AcademicStructureRepository = {
  getAcademicYears(scope: TenantScopedQuery, filters?: AcademicYearFilters): Promise<AcademicYear[]>;
  getAcademicYear(scope: TenantScopedQuery, academicYearId: string): Promise<AcademicYear | null>;
  getClasses(scope: TenantScopedQuery, filters?: AcademicClassFilters): Promise<AcademicClass[]>;
  getClass(scope: TenantScopedQuery, classId: string): Promise<AcademicClass | null>;
  getSections(scope: TenantScopedQuery, filters?: SectionFilters): Promise<Section[]>;
  getSection(scope: TenantScopedQuery, sectionId: string): Promise<Section | null>;
  getSectionsByClass(scope: TenantScopedQuery, classId: string): Promise<Section[]>;
  getSectionsByAcademicYear(scope: TenantScopedQuery, academicYearId: string): Promise<Section[]>;
  getPlacementOptions(scope: TenantScopedQuery): Promise<AcademicStructurePlacementOption[]>;
  createAcademicYear(input: AcademicYearCreateInput): Promise<AcademicYear>;
  updateAcademicYear(input: AcademicYearUpdateInput): Promise<AcademicYear>;
  createClass(input: AcademicClassCreateInput): Promise<AcademicClass>;
  updateClass(input: AcademicClassUpdateInput): Promise<AcademicClass>;
  createSection(input: SectionCreateInput): Promise<Section>;
  updateSection(input: SectionUpdateInput): Promise<Section>;
  archiveAcademicYear(scope: TenantScopedQuery, academicYearId: string): Promise<AcademicYear>;
  archiveClass(scope: TenantScopedQuery, classId: string): Promise<AcademicClass>;
  archiveSection(scope: TenantScopedQuery, sectionId: string): Promise<Section>;
  restoreSection(scope: TenantScopedQuery, sectionId: string): Promise<Section>;
  validatePlacement(scope: TenantScopedQuery, classId: string, sectionId: string): Promise<AcademicStructurePlacementOption>;
};

let academicYearRecords = [...mockAcademicYears];
let academicClassRecords = [...mockAcademicClasses];
let sectionRecords = [...mockSections];

const mockAcademicStructureRepository: AcademicStructureRepository = {
  async getAcademicYears(scope, filters = {}) {
    const parsedFilters = academicYearFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    return academicYearRecords
      .filter((year) => isSameTenantSchoolCampus(year, scope))
      .filter((year) => !parsedFilters.academicYearId || year.id === parsedFilters.academicYearId)
      .filter((year) => !parsedFilters.status || year.status === parsedFilters.status)
      .filter((year) => parsedFilters.currentOnly ? year.isCurrent : true)
      .filter((year) => !query || [year.name, year.status, year.startDate, year.endDate].join(" ").toLowerCase().includes(query))
      .sort((first, second) => second.startDate.localeCompare(first.startDate));
  },

  async getAcademicYear(scope, academicYearId) {
    return academicYearRecords.find((year) => year.id === academicYearId && isSameTenantSchoolCampus(year, scope)) ?? null;
  },

  async getClasses(scope, filters = {}) {
    const parsedFilters = academicClassFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    const filtered = academicClassRecords
      .filter((academicClass) => isSameScope(academicClass, scope))
      .filter((academicClass) => parsedFilters.includeArchived ? true : academicClass.status !== "archived")
      .filter((academicClass) => !parsedFilters.status || academicClass.status === parsedFilters.status)
      .filter((academicClass) => !query || [academicClass.displayName, academicClass.code, academicClass.status].join(" ").toLowerCase().includes(query));

    return sortClasses(filtered, parsedFilters.sortBy, parsedFilters.sortDirection);
  },

  async getClass(scope, classId) {
    return academicClassRecords.find((academicClass) => academicClass.id === classId && isSameScope(academicClass, scope)) ?? null;
  },

  async getSections(scope, filters = {}) {
    const parsedFilters = sectionFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    const filtered = sectionRecords
      .filter((section) => isSameScope(section, scope))
      .filter((section) => parsedFilters.includeArchived ? true : section.status !== "archived")
      .filter((section) => !parsedFilters.classId || section.classId === parsedFilters.classId)
      .filter((section) => !parsedFilters.status || section.status === parsedFilters.status)
      .filter((section) => !query || [section.name, section.displayName, section.roomId, section.classTeacherId, section.status].filter(Boolean).join(" ").toLowerCase().includes(query));

    return sortSections(filtered, parsedFilters.sortBy, parsedFilters.sortDirection);
  },

  async getSection(scope, sectionId) {
    return sectionRecords.find((section) => section.id === sectionId && isSameScope(section, scope)) ?? null;
  },

  async getSectionsByClass(scope, classId) {
    getClassOrThrow(scope, classId);
    return this.getSections(scope, { classId, includeArchived: true });
  },

  async getSectionsByAcademicYear(scope, academicYearId) {
    return this.getSections({ ...scope, academicYearId }, { includeArchived: true });
  },

  async getPlacementOptions(scope) {
    const classes = await this.getClasses(scope, { status: "active" });
    const sections = await this.getSections(scope, { status: "active" });
    const classMap = new Map(classes.map((academicClass) => [academicClass.id, academicClass]));

    return sections
      .flatMap((section) => {
        const academicClass = classMap.get(section.classId);
        if (!academicClass) return [];

        return [{
          academicYearId: section.academicYearId,
          classId: academicClass.id,
          className: academicClass.displayName,
          sectionId: section.id,
          sectionName: section.displayName,
          sectionCapacity: section.capacity,
        }];
      })
      .sort((first, second) =>
        `${first.className} ${first.sectionName}`.localeCompare(`${second.className} ${second.sectionName}`, "en-IN", {
          numeric: true,
          sensitivity: "base",
        }),
      );
  },

  async createAcademicYear(input) {
    const parsedInput = academicYearCreateSchema.parse(input);
    ensureValidRule(validateAcademicYearDates(parsedInput.startDate, parsedInput.endDate));
    if (parsedInput.isCurrent) {
      ensureValidRule(validateNoDuplicateCurrentAcademicYear(academicYearRecords, parsedInput));
    }

    const now = new Date().toISOString();
    const id = parsedInput.id ?? createId("ay", parsedInput.name);
    const academicYear: AcademicYear = {
      ...parsedInput,
      id,
      academicYearId: id,
      createdAt: now,
      updatedAt: now,
    };

    academicYearRecords = [academicYear, ...academicYearRecords];
    return academicYear;
  },

  async updateAcademicYear(input) {
    const parsedInput = academicYearUpdateSchema.parse(input);
    const current = getAcademicYearOrThrow(parsedInput, parsedInput.id);
    const next: AcademicYear = {
      ...current,
      name: parsedInput.name ?? current.name,
      startDate: parsedInput.startDate ?? current.startDate,
      endDate: parsedInput.endDate ?? current.endDate,
      status: parsedInput.status ?? current.status,
      isCurrent: parsedInput.isCurrent ?? current.isCurrent,
      updatedAt: new Date().toISOString(),
    };

    ensureValidRule(validateAcademicYearDates(next.startDate, next.endDate));
    ensureValidRule(validateAcademicYearStatusTransition(current.status, next.status));
    if (next.status === "archived") {
      ensureValidRule(validateAcademicYearCanBeArchived(current));
      next.isCurrent = false;
      next.archivedAt = next.archivedAt ?? new Date().toISOString();
    }
    if (next.isCurrent) {
      ensureValidRule(validateNoDuplicateCurrentAcademicYear(academicYearRecords, next, next.id));
    }

    academicYearRecords = academicYearRecords.map((year) => (year.id === next.id ? next : year));
    return next;
  },

  async createClass(input) {
    const parsedInput = academicClassCreateSchema.parse(input);
    const academicYear = ensureAcademicYearInScope(parsedInput);
    ensureValidRule(validateAcademicYearCanReceiveClasses(academicYear));
    ensureValidRule(validateUniqueClassCode(academicClassRecords, parsedInput, parsedInput.code));

    const now = new Date().toISOString();
    const academicClass: AcademicClass = {
      ...parsedInput,
      id: parsedInput.id ?? createId("class", parsedInput.code),
      createdAt: now,
      updatedAt: now,
    };

    academicClassRecords = [...academicClassRecords, academicClass];
    return academicClass;
  },

  async updateClass(input) {
    const parsedInput = academicClassUpdateSchema.parse(input);
    const current = getClassOrThrow(parsedInput, parsedInput.id);
    const next: AcademicClass = {
      ...current,
      code: parsedInput.code ?? current.code,
      displayName: parsedInput.displayName ?? current.displayName,
      sortOrder: parsedInput.sortOrder ?? current.sortOrder,
      status: parsedInput.status ?? current.status,
      archivedAt: parsedInput.status === "archived" ? new Date().toISOString() : current.archivedAt,
      updatedAt: new Date().toISOString(),
    };

    ensureValidRule(validateClassStatusTransition(current.status, next.status));
    if (next.status === "archived") {
      ensureValidRule(validateClassCanBeArchived(current, sectionRecords));
    }
    ensureValidRule(validateUniqueClassCode(academicClassRecords, next, next.code, next.id));
    academicClassRecords = academicClassRecords.map((academicClass) => (academicClass.id === next.id ? next : academicClass));
    return next;
  },

  async createSection(input) {
    const parsedInput = sectionCreateSchema.parse(input);
    const academicYear = ensureAcademicYearInScope(parsedInput);
    ensureValidRule(validateAcademicYearCanReceiveClasses(academicYear));
    const academicClass = getClassOrThrow(parsedInput, parsedInput.classId);
    ensureValidRule(validateClassAndSectionShareScope(academicClass, parsedInput));
    ensureValidRule(validateClassCanReceiveSection(academicClass));
    ensureValidRule(validateUniqueSectionName(sectionRecords, parsedInput, parsedInput.classId, parsedInput.name));

    const now = new Date().toISOString();
    const section: Section = {
      ...parsedInput,
      id: parsedInput.id ?? createId("section", `${academicClass.code}-${parsedInput.name}`),
      createdAt: now,
      updatedAt: now,
    };

    sectionRecords = [...sectionRecords, section];
    return section;
  },

  async updateSection(input) {
    const parsedInput = sectionUpdateSchema.parse(input);
    const current = getSectionOrThrow(parsedInput, parsedInput.id);
    const academicClass = getClassOrThrow(parsedInput, current.classId);
    ensureValidRule(validateClassAndSectionShareScope(academicClass, current));
    const next: Section = {
      ...current,
      name: parsedInput.name ?? current.name,
      displayName: parsedInput.displayName ?? current.displayName,
      capacity: parsedInput.capacity ?? current.capacity,
      roomId: parsedInput.roomId ?? current.roomId,
      classTeacherId: parsedInput.classTeacherId ?? current.classTeacherId,
      status: parsedInput.status ?? current.status,
      archivedAt: parsedInput.status === "archived" ? new Date().toISOString() : parsedInput.status ? undefined : current.archivedAt,
      updatedAt: new Date().toISOString(),
    };

    ensureValidRule(validateSectionStatusTransition(current.status, next.status));
    ensureValidRule(validateUniqueSectionName(sectionRecords, next, next.classId, next.name, next.id));
    if (next.status === "active" || next.status === "inactive") {
      ensureValidRule(validateClassCanReceiveSection(academicClass));
    }

    sectionRecords = sectionRecords.map((section) => (section.id === next.id ? next : section));
    return next;
  },

  async archiveAcademicYear(scope, academicYearId) {
    academicStructureArchiveSchema.parse({ ...scope, id: academicYearId });
    const current = getAcademicYearOrThrow(scope, academicYearId);
    ensureValidRule(validateAcademicYearCanBeArchived(current));
    ensureValidRule(validateAcademicYearStatusTransition(current.status, "archived"));
    const next: AcademicYear = { ...current, status: "archived", isCurrent: false, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    academicYearRecords = academicYearRecords.map((year) => (year.id === next.id ? next : year));
    return next;
  },

  async archiveClass(scope, classId) {
    academicStructureArchiveSchema.parse({ ...scope, id: classId });
    return this.updateClass({ ...scope, id: classId, status: "archived" });
  },

  async archiveSection(scope, sectionId) {
    academicStructureArchiveSchema.parse({ ...scope, id: sectionId });
    return this.updateSection({ ...scope, id: sectionId, status: "archived" });
  },

  async restoreSection(scope, sectionId) {
    academicStructureArchiveSchema.parse({ ...scope, id: sectionId });
    return this.updateSection({ ...scope, id: sectionId, status: "active" });
  },

  async validatePlacement(scope, classId, sectionId) {
    const academicClass = getClassOrThrow(scope, classId);
    const section = getSectionOrThrow(scope, sectionId);
    if (section.classId !== academicClass.id) {
      throw new ApiError(422, "Selected section does not belong to the selected class.");
    }
    ensureValidRule(validateSectionCanReceiveStudents(section, academicClass));

    return {
      academicYearId: scope.academicYearId,
      classId: academicClass.id,
      className: academicClass.displayName,
      sectionId: section.id,
      sectionName: section.displayName,
      sectionCapacity: section.capacity,
    };
  },
};

export const academicStructureService = {
  getAcademicYears(scope: TenantScopedQuery, filters?: AcademicYearFilters) {
    return mockAcademicStructureRepository.getAcademicYears(scope, filters);
  },
  getAcademicYear(scope: TenantScopedQuery, academicYearId: string) {
    return mockAcademicStructureRepository.getAcademicYear(scope, academicYearId);
  },
  getClasses(scope: TenantScopedQuery, filters?: AcademicClassFilters) {
    return mockAcademicStructureRepository.getClasses(scope, filters);
  },
  getClass(scope: TenantScopedQuery, classId: string) {
    return mockAcademicStructureRepository.getClass(scope, classId);
  },
  getSections(scope: TenantScopedQuery, filters?: SectionFilters) {
    return mockAcademicStructureRepository.getSections(scope, filters);
  },
  getSection(scope: TenantScopedQuery, sectionId: string) {
    return mockAcademicStructureRepository.getSection(scope, sectionId);
  },
  getSectionsByClass(scope: TenantScopedQuery, classId: string) {
    return mockAcademicStructureRepository.getSectionsByClass(scope, classId);
  },
  getSectionsByAcademicYear(scope: TenantScopedQuery, academicYearId: string) {
    return mockAcademicStructureRepository.getSectionsByAcademicYear(scope, academicYearId);
  },
  getPlacementOptions(scope: TenantScopedQuery) {
    return mockAcademicStructureRepository.getPlacementOptions(scope);
  },
  validatePlacement(scope: TenantScopedQuery, classId: string, sectionId: string) {
    return mockAcademicStructureRepository.validatePlacement(scope, classId, sectionId);
  },
  createAcademicYear(input: AcademicYearCreateInput) {
    return mockAcademicStructureRepository.createAcademicYear(input);
  },
  updateAcademicYear(input: AcademicYearUpdateInput) {
    return mockAcademicStructureRepository.updateAcademicYear(input);
  },
  createClass(input: AcademicClassCreateInput) {
    return mockAcademicStructureRepository.createClass(input);
  },
  updateClass(input: AcademicClassUpdateInput) {
    return mockAcademicStructureRepository.updateClass(input);
  },
  createSection(input: SectionCreateInput) {
    return mockAcademicStructureRepository.createSection(input);
  },
  updateSection(input: SectionUpdateInput) {
    return mockAcademicStructureRepository.updateSection(input);
  },
  archiveAcademicYear(scope: TenantScopedQuery, academicYearId: string) {
    return mockAcademicStructureRepository.archiveAcademicYear(scope, academicYearId);
  },
  archiveClass(scope: TenantScopedQuery, classId: string) {
    return mockAcademicStructureRepository.archiveClass(scope, classId);
  },
  archiveSection(scope: TenantScopedQuery, sectionId: string) {
    return mockAcademicStructureRepository.archiveSection(scope, sectionId);
  },
  restoreSection(scope: TenantScopedQuery, sectionId: string) {
    return mockAcademicStructureRepository.restoreSection(scope, sectionId);
  },
};

function ensureAcademicYearInScope(scope: TenantScopedQuery) {
  const academicYear = academicYearRecords.find((year) => year.id === scope.academicYearId && isSameTenantSchoolCampus(year, scope));
  if (!academicYear) {
    throw new ApiError(404, "Academic year could not be found in the current campus scope.");
  }
  return academicYear;
}

function getAcademicYearOrThrow(scope: TenantScopedQuery, academicYearId: string) {
  const academicYear = academicYearRecords.find((year) => year.id === academicYearId && isSameTenantSchoolCampus(year, scope));
  if (!academicYear) throw new ApiError(404, "Academic year could not be found in the current campus scope.");
  return academicYear;
}

function getClassOrThrow(scope: TenantScopedQuery, classId: string) {
  const academicClass = academicClassRecords.find((record) => record.id === classId && isSameScope(record, scope));
  if (!academicClass) throw new ApiError(404, "Class could not be found in the current academic scope.");
  return academicClass;
}

function getSectionOrThrow(scope: TenantScopedQuery, sectionId: string) {
  const section = sectionRecords.find((record) => record.id === sectionId && isSameScope(record, scope));
  if (!section) throw new ApiError(404, "Section could not be found in the current academic scope.");
  return section;
}

function ensureValidRule(result: { valid: true } | { valid: false; message: string }) {
  if (!result.valid) throw new ApiError(422, result.message);
}

function createId(prefix: string, value: string) {
  return `${prefix}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
}

function sortClasses(classes: AcademicClass[], sortBy: NonNullable<AcademicClassFilters["sortBy"]>, sortDirection: "asc" | "desc") {
  return [...classes].sort((first, second) => {
    const firstValue = sortBy === "sortOrder" ? first.sortOrder : first[sortBy];
    const secondValue = sortBy === "sortOrder" ? second.sortOrder : second[sortBy];
    const result = typeof firstValue === "number" && typeof secondValue === "number"
      ? firstValue - secondValue
      : String(firstValue).localeCompare(String(secondValue), "en-IN", { numeric: true, sensitivity: "base" });
    return sortDirection === "asc" ? result : -result;
  });
}

function sortSections(sections: Section[], sortBy: NonNullable<SectionFilters["sortBy"]>, sortDirection: "asc" | "desc") {
  return [...sections].sort((first, second) => {
    const firstValue = sortBy === "capacity" ? first.capacity ?? 0 : first[sortBy];
    const secondValue = sortBy === "capacity" ? second.capacity ?? 0 : second[sortBy];
    const result = typeof firstValue === "number" && typeof secondValue === "number"
      ? firstValue - secondValue
      : String(firstValue).localeCompare(String(secondValue), "en-IN", { numeric: true, sensitivity: "base" });
    return sortDirection === "asc" ? result : -result;
  });
}
