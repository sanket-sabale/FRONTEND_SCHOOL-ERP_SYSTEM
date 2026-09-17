import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { academicStructureService } from "@/lib/api/academic-structure";
import {
  studentPlacementCreateSchema,
  studentPlacementEndSchema,
  studentPlacementFiltersSchema,
  studentPlacementTransferSchema,
  studentPlacementUpdateSchema,
} from "@/features/student-placements/schemas/student-placement.schema";
import { mockStudentGuardians, mockStudents } from "@/features/students/services/mock-students";
import { mockStudentAcademicPlacements } from "@/features/student-placements/services/mock-student-placements";
import {
  isSameScope,
  validateActivePlacementDates,
  validateNoDuplicateActivePlacement,
  validatePlacementCanTransfer,
  validatePlacementDates,
  validateStructureCanReceivePlacement,
  validateStructureInScope,
  validateStudentInScope,
} from "@/features/student-placements/services/student-placement-rules";
import type {
  StudentAcademicPlacement,
  StudentAcademicPlacementCreateInput,
  StudentAcademicPlacementEndInput,
  StudentAcademicPlacementFilters,
  StudentAcademicPlacementListResponse,
  StudentAcademicPlacementReadModel,
  StudentAcademicPlacementTransferInput,
  StudentAcademicPlacementUpdateInput,
  AcademicRosterEffectiveDateFilters,
  AcademicRosterSummary,
} from "@/features/student-placements/types/student-placement";
import type { Student } from "@/features/students/types/student";

type StudentPlacementRepository = {
  getStudentPlacements(scope: TenantScopedQuery, studentId: string): Promise<StudentAcademicPlacement[]>;
  getStudentPlacement(scope: TenantScopedQuery, placementId: string): Promise<StudentAcademicPlacement | null>;
  getActiveStudentPlacement(scope: TenantScopedQuery, studentId: string, academicYearId: string): Promise<StudentAcademicPlacement | null>;
  getEffectiveStudentPlacement(scope: TenantScopedQuery, studentId: string, date: string): Promise<StudentAcademicPlacement | null>;
  getEffectiveStudentPlacementCandidates(scope: TenantScopedQuery, studentId: string, date: string): Promise<StudentAcademicPlacementReadModel[]>;
  getStudentsByPlacement(scope: TenantScopedQuery, filters?: StudentAcademicPlacementFilters): Promise<StudentAcademicPlacementListResponse>;
  getRosterByEffectiveDate(scope: TenantScopedQuery, filters: AcademicRosterEffectiveDateFilters): Promise<AcademicRosterSummary>;
  getClassRoster(scope: TenantScopedQuery, classId: string): Promise<AcademicRosterSummary>;
  getSectionRoster(scope: TenantScopedQuery, sectionId: string): Promise<AcademicRosterSummary>;
  createStudentPlacement(input: StudentAcademicPlacementCreateInput, student?: Student): Promise<StudentAcademicPlacement>;
  updateStudentPlacement(input: StudentAcademicPlacementUpdateInput): Promise<StudentAcademicPlacement>;
  endStudentPlacement(input: StudentAcademicPlacementEndInput): Promise<StudentAcademicPlacement>;
  transferStudentPlacement(input: StudentAcademicPlacementTransferInput): Promise<{ endedPlacement: StudentAcademicPlacement; newPlacement: StudentAcademicPlacement }>;
};

let placementRecords = [...mockStudentAcademicPlacements];
let placementStudentRecords = [...mockStudents];

const mockStudentPlacementRepository: StudentPlacementRepository = {
  async getStudentPlacements(scope, studentId) {
    ensureStudentInScope(scope, studentId);
    return placementRecords
      .filter((placement) => placement.studentId === studentId && isSameTenantSchoolCampus(placement, scope))
      .sort((first, second) => second.startDate.localeCompare(first.startDate));
  },

  async getStudentPlacement(scope, placementId) {
    return placementRecords.find((placement) => placement.id === placementId && isSameScope(placement, scope)) ?? null;
  },

  async getActiveStudentPlacement(scope, studentId, academicYearId) {
    ensureStudentInScope({ ...scope, academicYearId }, studentId);
    return placementRecords.find(
      (placement) =>
        placement.studentId === studentId &&
        placement.academicYearId === academicYearId &&
        placement.status === "active" &&
        isSameScope(placement, { ...scope, academicYearId }),
    ) ?? null;
  },

  async getEffectiveStudentPlacement(scope, studentId, date) {
    ensureStudentInScope(scope, studentId);
    return placementRecords
      .filter((placement) => placement.studentId === studentId && isSameScope(placement, scope))
      .filter((placement) => placement.startDate <= date && (!placement.endDate || placement.endDate >= date))
      .sort((first, second) => second.startDate.localeCompare(first.startDate))[0] ?? null;
  },

  async getEffectiveStudentPlacementCandidates(scope, studentId, date) {
    ensureStudentInScope(scope, studentId);
    const readModels = await Promise.all(
      placementRecords
        .filter((placement) => placement.studentId === studentId && isSameScope(placement, scope))
        .filter((placement) => placement.startDate <= date && (!placement.endDate || placement.endDate >= date))
        .map((placement) => toReadModel(scope, placement)),
    );

    return readModels
      .filter((placement): placement is StudentAcademicPlacementReadModel => Boolean(placement))
      .sort((first, second) => second.startDate.localeCompare(first.startDate));
  },

  async getStudentsByPlacement(scope, filters = {}) {
    const parsedFilters = studentPlacementFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    const readModels = await Promise.all(
      placementRecords
        .filter((placement) => parsedFilters.allAcademicYears ? isSameTenantSchoolCampus(placement, scope) : isSameScope(placement, scope))
        .filter((placement) => !parsedFilters.studentId || placement.studentId === parsedFilters.studentId)
        .filter((placement) => !parsedFilters.classId || placement.classId === parsedFilters.classId)
        .filter((placement) => !parsedFilters.sectionId || placement.sectionId === parsedFilters.sectionId)
        .filter((placement) => !parsedFilters.status || placement.status === parsedFilters.status)
        .map((placement) => toReadModel(scope, placement)),
    );
    const filtered = readModels
      .filter((placement): placement is StudentAcademicPlacementReadModel => Boolean(placement))
      .filter((placement) => !query || [
        placement.studentName,
        placement.admissionNumber,
        placement.className,
        placement.sectionName,
        placement.academicYearName,
        placement.status,
      ].join(" ").toLowerCase().includes(query))
      .sort((first, second) => compareReadModels(first, second, parsedFilters.sortBy, parsedFilters.sortDirection));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / parsedFilters.pageSize));
    const start = (parsedFilters.page - 1) * parsedFilters.pageSize;

    return {
      items: filtered.slice(start, start + parsedFilters.pageSize),
      total,
      page: parsedFilters.page,
      pageSize: parsedFilters.pageSize,
      totalPages,
    };
  },

  async getRosterByEffectiveDate(scope, filters) {
    if (filters.classId) await ensureClassInScope(scope, filters.classId);
    if (filters.sectionId) {
      const section = await ensureSectionInScope(scope, filters.sectionId);
      if (filters.classId && section.classId !== filters.classId) {
        throw new ApiError(422, "Selected section does not belong to the selected class.");
      }
    }

    const readModels = await Promise.all(
      placementRecords
        .filter((placement) => isSameScope(placement, scope))
        .filter((placement) => placement.startDate <= filters.effectiveDate && (!placement.endDate || placement.endDate >= filters.effectiveDate))
        .filter((placement) => !filters.classId || placement.classId === filters.classId)
        .filter((placement) => !filters.sectionId || placement.sectionId === filters.sectionId)
        .map((placement) => toReadModel(scope, placement)),
    );
    const students = readModels
      .filter((placement): placement is StudentAcademicPlacementReadModel => Boolean(placement))
      .sort((first, second) => first.studentName.localeCompare(second.studentName, "en-IN", { numeric: true, sensitivity: "base" }));

    return {
      activeStudentCount: students.length,
      students,
    };
  },

  async getClassRoster(scope, classId) {
    await ensureClassInScope(scope, classId);
    const response = await this.getStudentsByPlacement(scope, {
      classId,
      status: "active",
      page: 1,
      pageSize: 100,
      sortBy: "studentName",
    });

    return {
      activeStudentCount: response.total,
      students: response.items,
    };
  },

  async getSectionRoster(scope, sectionId) {
    await ensureSectionInScope(scope, sectionId);
    const response = await this.getStudentsByPlacement(scope, {
      sectionId,
      status: "active",
      page: 1,
      pageSize: 100,
      sortBy: "studentName",
    });

    return {
      activeStudentCount: response.total,
      students: response.items,
    };
  },

  async createStudentPlacement(input, providedStudent) {
    const parsedInput = studentPlacementCreateSchema.parse(input);
    if (providedStudent && !placementStudentRecords.some((student) => student.id === providedStudent.id)) {
      placementStudentRecords = [providedStudent, ...placementStudentRecords];
    }
    const student = providedStudent ?? ensureStudentInScope(parsedInput, parsedInput.studentId);
    ensureValid(validateStudentInScope(student, parsedInput));
    ensureValid(validatePlacementDates(parsedInput.startDate, parsedInput.endDate));
    ensureValid(validateActivePlacementDates(parsedInput.status, parsedInput.endDate));
    if (parsedInput.status === "active") {
      ensureValid(validateNoDuplicateActivePlacement(placementRecords, parsedInput, parsedInput.studentId));
    }
    await validateAcademicStructure(parsedInput, parsedInput.classId, parsedInput.sectionId, parsedInput.status === "active");

    const now = new Date().toISOString();
    const placement: StudentAcademicPlacement = {
      ...parsedInput,
      id: parsedInput.id ?? createPlacementId(parsedInput.studentId, parsedInput.classId, parsedInput.sectionId),
      createdAt: now,
      updatedAt: now,
    };

    placementRecords = [placement, ...placementRecords];
    return placement;
  },

  async updateStudentPlacement(input) {
    const parsedInput = studentPlacementUpdateSchema.parse(input);
    const current = getPlacementOrThrow(parsedInput, parsedInput.id);
    if (current.status !== "active" && parsedInput.status === "active") {
      throw new ApiError(422, "Ended placements cannot silently become active through ordinary editing.");
    }

    const next: StudentAcademicPlacement = {
      ...current,
      status: parsedInput.status ?? current.status,
      startDate: parsedInput.startDate ?? current.startDate,
      endDate: parsedInput.endDate ?? current.endDate,
      reason: parsedInput.reason ?? current.reason,
      notes: parsedInput.notes ?? current.notes,
      updatedAt: new Date().toISOString(),
    };

    ensureValid(validatePlacementDates(next.startDate, next.endDate));
    ensureValid(validateActivePlacementDates(next.status, next.endDate));
    placementRecords = placementRecords.map((placement) => (placement.id === next.id ? next : placement));
    return next;
  },

  async endStudentPlacement(input) {
    const parsedInput = studentPlacementEndSchema.parse(input);
    const current = getPlacementOrThrow(parsedInput, parsedInput.id);
    if (current.status !== "active") {
      throw new ApiError(422, "Only active placements can be ended.");
    }
    ensureValid(validatePlacementDates(current.startDate, parsedInput.endDate));

    const next: StudentAcademicPlacement = {
      ...current,
      status: parsedInput.reason === "student_transfer" ? "transferred" : "ended",
      endDate: parsedInput.endDate,
      reason: parsedInput.reason,
      updatedAt: new Date().toISOString(),
    };
    placementRecords = placementRecords.map((placement) => (placement.id === next.id ? next : placement));
    return next;
  },

  async transferStudentPlacement(input) {
    const parsedInput = studentPlacementTransferSchema.parse(input);
    const current = getPlacementOrThrow(parsedInput, parsedInput.fromPlacementId);
    ensureValid(validatePlacementCanTransfer(current));
    if (current.studentId !== parsedInput.studentId) {
      throw new ApiError(422, "Selected placement does not belong to this student.");
    }
    ensureValid(validatePlacementDates(current.startDate, parsedInput.startDate));

    const endedPlacement = await this.endStudentPlacement({
      tenantId: current.tenantId,
      schoolId: current.schoolId,
      campusId: current.campusId,
      academicYearId: current.academicYearId,
      id: current.id,
      endDate: previousIsoDate(parsedInput.startDate),
      reason: parsedInput.reason,
    });
    const newPlacement = await this.createStudentPlacement({
      tenantId: parsedInput.tenantId,
      schoolId: parsedInput.schoolId,
      campusId: parsedInput.campusId,
      academicYearId: parsedInput.toAcademicYearId,
      studentId: parsedInput.studentId,
      classId: parsedInput.toClassId,
      sectionId: parsedInput.toSectionId,
      status: "active",
      startDate: parsedInput.startDate,
      reason: parsedInput.reason,
    });

    return { endedPlacement, newPlacement };
  },
};

export const studentPlacementService = {
  getStudentPlacements(scope: TenantScopedQuery, studentId: string) {
    return mockStudentPlacementRepository.getStudentPlacements(scope, studentId);
  },
  getStudentPlacement(scope: TenantScopedQuery, placementId: string) {
    return mockStudentPlacementRepository.getStudentPlacement(scope, placementId);
  },
  getActiveStudentPlacement(scope: TenantScopedQuery, studentId: string, academicYearId: string) {
    return mockStudentPlacementRepository.getActiveStudentPlacement(scope, studentId, academicYearId);
  },
  getEffectiveStudentPlacement(scope: TenantScopedQuery, studentId: string, date: string) {
    return mockStudentPlacementRepository.getEffectiveStudentPlacement(scope, studentId, date);
  },
  getEffectiveStudentPlacementCandidates(scope: TenantScopedQuery, studentId: string, date: string) {
    return mockStudentPlacementRepository.getEffectiveStudentPlacementCandidates(scope, studentId, date);
  },
  getStudentsByPlacement(scope: TenantScopedQuery, filters?: StudentAcademicPlacementFilters) {
    return mockStudentPlacementRepository.getStudentsByPlacement(scope, filters);
  },
  getRosterByEffectiveDate(scope: TenantScopedQuery, filters: AcademicRosterEffectiveDateFilters) {
    return mockStudentPlacementRepository.getRosterByEffectiveDate(scope, filters);
  },
  getClassRoster(scope: TenantScopedQuery, classId: string) {
    return mockStudentPlacementRepository.getClassRoster(scope, classId);
  },
  getSectionRoster(scope: TenantScopedQuery, sectionId: string) {
    return mockStudentPlacementRepository.getSectionRoster(scope, sectionId);
  },
  createStudentPlacement(input: StudentAcademicPlacementCreateInput, student?: Student) {
    return mockStudentPlacementRepository.createStudentPlacement(input, student);
  },
  updateStudentPlacement(input: StudentAcademicPlacementUpdateInput) {
    return mockStudentPlacementRepository.updateStudentPlacement(input);
  },
  endStudentPlacement(input: StudentAcademicPlacementEndInput) {
    return mockStudentPlacementRepository.endStudentPlacement(input);
  },
  transferStudentPlacement(input: StudentAcademicPlacementTransferInput) {
    return mockStudentPlacementRepository.transferStudentPlacement(input);
  },
};

async function validateAcademicStructure(scope: TenantScopedQuery, classId: string, sectionId: string, requiresActiveTarget: boolean) {
  const [academicYear, academicClass, section] = await Promise.all([
    academicStructureService.getAcademicYear(scope, scope.academicYearId),
    academicStructureService.getClass(scope, classId),
    academicStructureService.getSection(scope, sectionId),
  ]);
  if (!academicYear) throw new ApiError(404, "Academic year could not be found in the current campus scope.");
  if (!academicClass) throw new ApiError(404, "Class could not be found in the current academic scope.");
  if (!section) throw new ApiError(404, "Section could not be found in the current academic scope.");

  ensureValid(validateStructureInScope(academicYear, academicClass, section, scope));
  if (requiresActiveTarget) ensureValid(validateStructureCanReceivePlacement(academicYear, academicClass, section));
}

async function ensureClassInScope(scope: TenantScopedQuery, classId: string) {
  const academicClass = await academicStructureService.getClass(scope, classId);
  if (!academicClass) throw new ApiError(404, "Class could not be found in the current academic scope.");
  return academicClass;
}

async function ensureSectionInScope(scope: TenantScopedQuery, sectionId: string) {
  const section = await academicStructureService.getSection(scope, sectionId);
  if (!section) throw new ApiError(404, "Section could not be found in the current academic scope.");
  return section;
}

function ensureStudentInScope(scope: TenantScopedQuery, studentId: string) {
  const student = placementStudentRecords.find((record) => record.id === studentId && isSameTenantSchoolCampus(record, scope));
  if (!student) throw new ApiError(404, "Student could not be found in the current tenant, school, and campus scope.");
  return student;
}

function getPlacementOrThrow(scope: TenantScopedQuery, placementId: string) {
  const placement = placementRecords.find((record) => record.id === placementId && isSameScope(record, scope));
  if (!placement) throw new ApiError(404, "Placement could not be found in the current academic scope.");
  return placement;
}

async function toReadModel(scope: TenantScopedQuery, placement: StudentAcademicPlacement): Promise<StudentAcademicPlacementReadModel | null> {
  const student = placementStudentRecords.find((record) => record.id === placement.studentId && isSameTenantSchoolCampus(record, scope));
  const placementScope = { ...scope, academicYearId: placement.academicYearId };
  const [academicYear, academicClass, section] = await Promise.all([
    academicStructureService.getAcademicYear(placementScope, placement.academicYearId),
    academicStructureService.getClass(placementScope, placement.classId),
    academicStructureService.getSection(placementScope, placement.sectionId),
  ]);
  if (!student || !academicYear || !academicClass || !section) return null;

  return {
    ...placement,
    studentName: student.displayName,
    admissionNumber: student.admissionNumber,
    academicYearName: academicYear.name,
    className: academicClass.displayName,
    sectionName: section.displayName,
    primaryGuardianName: getPrimaryGuardianName(student),
  };
}

function getPrimaryGuardianName(student: Student) {
  const primaryGuardian = student.guardians.find((guardian) => guardian.isPrimary) ?? student.guardians[0];
  return primaryGuardian ? mockStudentGuardians.find((guardian) => guardian.id === primaryGuardian.guardianId)?.name : undefined;
}

function compareReadModels(
  first: StudentAcademicPlacementReadModel,
  second: StudentAcademicPlacementReadModel,
  sortBy: NonNullable<StudentAcademicPlacementFilters["sortBy"]>,
  sortDirection: "asc" | "desc",
) {
  const firstValue = first[sortBy];
  const secondValue = second[sortBy];
  const result = String(firstValue).localeCompare(String(secondValue), "en-IN", { numeric: true, sensitivity: "base" });
  return sortDirection === "asc" ? result : -result;
}

function ensureValid(result: { valid: true } | { valid: false; message: string }) {
  if (!result.valid) throw new ApiError(422, result.message);
}

function isSameTenantSchoolCampus(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId;
}

function createPlacementId(studentId: string, classId: string, sectionId: string) {
  return `sap-${studentId}-${classId}-${sectionId}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function previousIsoDate(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}
