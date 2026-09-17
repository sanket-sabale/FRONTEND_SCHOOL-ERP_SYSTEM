import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { mockStudentGuardians, mockStudents, toStudentSummary } from "@/features/students/services/mock-students";
import { studentCreateSchema, studentFiltersSchema, studentLifecycleSchema, studentUpdateSchema } from "@/features/students/schemas/student.schema";
import { validateStudentLifecycleTransition } from "@/features/students/services/student-lifecycle";
import { academicPlacementAdapter } from "@/lib/api/academic-placement-adapter";
import { studentPlacementService } from "@/lib/api/student-placements";
import type {
  Student,
  StudentAcademicPlacementOption,
  StudentCreateInput,
  StudentFilters,
  StudentLifecycleInput,
  StudentLifecycleResult,
  StudentListResponse,
  StudentProfile,
  StudentSummary,
  StudentUpdateInput,
} from "@/features/students/types/student";

export type StudentListParams = TenantScopedQuery & StudentFilters;

type StudentRepository = {
  getStudents(scope: TenantScopedQuery, filters?: StudentFilters): Promise<StudentListResponse>;
  getStudent(scope: TenantScopedQuery, studentId: string): Promise<StudentProfile | null>;
  getAcademicPlacements(scope: TenantScopedQuery): Promise<StudentAcademicPlacementOption[]>;
  createStudent(input: StudentCreateInput): Promise<Student>;
  updateStudent(input: StudentUpdateInput): Promise<Student>;
  updateStudentLifecycle(input: StudentLifecycleInput): Promise<StudentLifecycleResult>;
  archiveStudent(scope: TenantScopedQuery, studentId: string): Promise<Student>;
};

let studentRecords = [...mockStudents];

const mockStudentRepository: StudentRepository = {
  async getStudents(scope, filters = {}) {
    const parsedFilters = studentFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    const page = parsedFilters.page;
    const pageSize = parsedFilters.pageSize;
    const activePlacements = await studentPlacementService.getStudentsByPlacement(scope, {
      status: "active",
      page: 1,
      pageSize: 100,
      sortBy: "studentName",
    });
    const activePlacementByStudent = new Map(activePlacements.items.map((placement) => [placement.studentId, placement]));

    const filtered = studentRecords
      .filter((student) => isInScope(student, scope))
      .map((student) => toStudentSummary(student, activePlacementByStudent.get(student.id)))
      .filter((student) => {
        if (!query) return true;

        return [
          student.displayName,
          student.admissionNumber,
          student.studentCode,
          student.className,
          student.sectionName,
          student.primaryGuardian?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .filter((student) => !parsedFilters.campusId || student.campusId === parsedFilters.campusId)
      .filter((student) => !parsedFilters.academicYearId || student.academicYearId === parsedFilters.academicYearId)
      .filter((student) => !parsedFilters.classId || student.classId === parsedFilters.classId)
      .filter((student) => !parsedFilters.sectionId || student.sectionId === parsedFilters.sectionId)
      .filter((student) => !parsedFilters.status || student.status === parsedFilters.status)
      .filter((student) => parsedFilters.status ? true : student.status !== "archived")
      .sort((first, second) => compareStudents(first, second, parsedFilters.sortBy, parsedFilters.sortDirection));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  },
  async getStudent(scope, studentId) {
    const student = studentRecords.find((record) => record.id === studentId && isInScope(record, scope));
    return student ? toStudentProfile(scope, student) : null;
  },
  async getAcademicPlacements(scope) {
    return academicPlacementAdapter.getPlacementOptions(scope);
  },
  async createStudent(input) {
    const parsedInput = studentCreateSchema.parse(input);
    ensureUniqueAdmissionNumber(
      {
        tenantId: parsedInput.tenantId,
        schoolId: parsedInput.schoolId,
        campusId: parsedInput.campusId,
        academicYearId: parsedInput.academicYearId,
      },
      parsedInput.admissionNumber,
    );
    await ensureSupportedAcademicPlacement(
      {
        tenantId: parsedInput.tenantId,
        schoolId: parsedInput.schoolId,
        campusId: parsedInput.campusId,
        academicYearId: parsedInput.academicYearId,
      },
      parsedInput.classId,
      parsedInput.sectionId,
    );

    const now = new Date().toISOString();
    const studentId = createMockStudentId();
    const placement = await academicPlacementAdapter.validatePlacement(
      {
        tenantId: parsedInput.tenantId,
        schoolId: parsedInput.schoolId,
        campusId: parsedInput.campusId,
        academicYearId: parsedInput.academicYearId,
      },
      parsedInput.classId,
      parsedInput.sectionId,
    );
    const student: Student = {
      id: studentId,
      tenantId: parsedInput.tenantId,
      schoolId: parsedInput.schoolId,
      campusId: parsedInput.campusId,
      academicYearId: parsedInput.academicYearId,
      admissionNumber: parsedInput.admissionNumber,
      studentCode: parsedInput.studentCode,
      firstName: parsedInput.firstName,
      middleName: parsedInput.middleName,
      lastName: parsedInput.lastName,
      displayName: [parsedInput.firstName, parsedInput.middleName, parsedInput.lastName].filter(Boolean).join(" "),
      dateOfBirth: parsedInput.dateOfBirth,
      gender: parsedInput.gender,
      status: parsedInput.status,
      statusChangedAt: now,
      academic: {
        academicYearId: parsedInput.academicYearId,
        classId: parsedInput.classId,
        className: placement?.className,
        sectionId: parsedInput.sectionId,
        sectionName: placement?.sectionName,
        rollNumber: parsedInput.rollNumber,
      },
      admissionDate: parsedInput.admissionDate,
      guardians: parsedInput.guardians.map((guardian) => ({
        ...guardian,
        studentId,
      })),
      createdAt: now,
      updatedAt: now,
    };

    studentRecords = [student, ...studentRecords];
    await studentPlacementService.createStudentPlacement({
      tenantId: parsedInput.tenantId,
      schoolId: parsedInput.schoolId,
      campusId: parsedInput.campusId,
      academicYearId: parsedInput.academicYearId,
      studentId: student.id,
      classId: parsedInput.classId,
      sectionId: parsedInput.sectionId,
      status: "active",
      startDate: parsedInput.admissionDate,
      reason: "initial_admission",
    }, student);
    return student;
  },
  async updateStudent(input) {
    const parsedInput = studentUpdateSchema.parse(input);
    const index = studentRecords.findIndex(
      (student) =>
        student.id === parsedInput.id &&
        student.tenantId === parsedInput.tenantId &&
        student.schoolId === parsedInput.schoolId &&
        (!parsedInput.campusId || student.campusId === parsedInput.campusId) &&
        (!parsedInput.academicYearId || student.academicYearId === parsedInput.academicYearId),
    );

    if (index === -1) {
      throw new ApiError(404, "Student could not be found.");
    }

    const current = studentRecords[index];
    if (!current) {
      throw new ApiError(404, "Student could not be found.");
    }

    if (parsedInput.admissionNumber && parsedInput.admissionNumber !== current.admissionNumber) {
      ensureUniqueAdmissionNumber(
        {
          tenantId: current.tenantId,
          schoolId: current.schoolId,
          campusId: current.campusId,
          academicYearId: current.academicYearId,
        },
        parsedInput.admissionNumber,
        current.id,
      );
    }

    const next: Student = {
      ...current,
      admissionNumber: parsedInput.admissionNumber ?? current.admissionNumber,
      studentCode: parsedInput.studentCode ?? current.studentCode,
      firstName: parsedInput.firstName ?? current.firstName,
      middleName: parsedInput.middleName ?? current.middleName,
      lastName: parsedInput.lastName ?? current.lastName,
      dateOfBirth: parsedInput.dateOfBirth ?? current.dateOfBirth,
      gender: parsedInput.gender ?? current.gender,
      status: parsedInput.status ?? current.status,
      campusId: parsedInput.campusId ?? current.campusId,
      academicYearId: parsedInput.academicYearId ?? current.academicYearId,
      academic: {
        ...current.academic,
        academicYearId: parsedInput.academicYearId ?? current.academic.academicYearId,
        classId: parsedInput.classId ?? current.academic.classId,
        className: parsedInput.classId && parsedInput.classId !== current.academic.classId ? undefined : current.academic.className,
        sectionId: parsedInput.sectionId ?? current.academic.sectionId,
        sectionName: parsedInput.sectionId && parsedInput.sectionId !== current.academic.sectionId ? undefined : current.academic.sectionName,
        rollNumber: parsedInput.rollNumber ?? current.academic.rollNumber,
      },
      admissionDate: parsedInput.admissionDate ?? current.admissionDate,
      guardians: parsedInput.guardians
        ? parsedInput.guardians.map((guardian) => ({ ...guardian, studentId: current.id }))
        : current.guardians,
      updatedAt: new Date().toISOString(),
    };
    next.displayName = [next.firstName, next.middleName, next.lastName].filter(Boolean).join(" ");

    studentRecords = studentRecords.map((student) => (student.id === next.id ? next : student));
    return next;
  },
  async updateStudentLifecycle(input) {
    const parsedInput = studentLifecycleSchema.parse(input);
    const index = studentRecords.findIndex(
      (student) =>
        student.id === parsedInput.studentId &&
        student.tenantId === parsedInput.tenantId &&
        student.schoolId === parsedInput.schoolId &&
        student.campusId === parsedInput.campusId &&
        student.academicYearId === parsedInput.academicYearId,
    );

    if (index === -1) {
      throw new ApiError(404, "Student could not be found.");
    }

    const current = studentRecords[index];
    if (!current) {
      throw new ApiError(404, "Student could not be found.");
    }

    const validation = validateStudentLifecycleTransition({
      action: parsedInput.action,
      currentStatus: current.status,
      reason: parsedInput.reason,
      reasonNote: parsedInput.reasonNote,
    });

    if (!validation.valid) {
      throw new ApiError(422, validation.message);
    }

    const changedAt = new Date().toISOString();
    const next: Student = {
      ...current,
      status: validation.transition.targetStatus,
      statusChangedAt: changedAt,
      lifecycleReason: parsedInput.reason,
      lifecycleReasonNote: parsedInput.reasonNote,
      archivedAt: validation.transition.targetStatus === "archived" ? changedAt : undefined,
      updatedAt: changedAt,
    };

    studentRecords = studentRecords.map((record) => (record.id === current.id ? next : record));

    return {
      student: next,
      previousStatus: current.status,
      newStatus: next.status,
      reason: parsedInput.reason,
      reasonNote: parsedInput.reasonNote,
      changedAt,
    };
  },
  async archiveStudent(scope, studentId) {
    const result = await this.updateStudentLifecycle({
      ...scope,
      studentId,
      action: "archive",
      reason: "administrative_reason",
    });

    return result.student;
  },
};

export const studentService = {
  getStudents(scope: TenantScopedQuery, filters?: StudentFilters) {
    return mockStudentRepository.getStudents(scope, filters);
  },
  getStudent(scope: TenantScopedQuery, studentId: string) {
    return mockStudentRepository.getStudent(scope, studentId);
  },
  getAcademicPlacements(scope: TenantScopedQuery) {
    return mockStudentRepository.getAcademicPlacements(scope);
  },
  createStudent(input: StudentCreateInput) {
    return mockStudentRepository.createStudent(input);
  },
  updateStudent(input: StudentUpdateInput) {
    return mockStudentRepository.updateStudent(input);
  },
  updateStudentLifecycle(input: StudentLifecycleInput) {
    return mockStudentRepository.updateStudentLifecycle(input);
  },
  archiveStudent(scope: TenantScopedQuery, studentId: string) {
    return mockStudentRepository.archiveStudent(scope, studentId);
  },
};

export const studentApi = {
  async list(params: StudentListParams) {
    const { tenantId, schoolId, campusId, academicYearId, ...filters } = params;
    const response = await studentService.getStudents(
      { tenantId, schoolId, campusId, academicYearId },
      filters,
    );

    return {
      data: response.items,
      page: response.page,
      pageSize: response.pageSize,
      total: response.total,
      totalPages: response.totalPages,
    };
  },
};

function isInScope(student: Student, scope: TenantScopedQuery) {
  return (
    student.tenantId === scope.tenantId &&
    student.schoolId === scope.schoolId &&
    student.campusId === scope.campusId &&
    student.academicYearId === scope.academicYearId
  );
}

function compareStudents(
  first: StudentSummary,
  second: StudentSummary,
  sortBy: keyof Pick<StudentSummary, "displayName" | "admissionNumber" | "admissionDate" | "status"> | "className",
  sortDirection: "asc" | "desc",
) {
  const firstValue = sortBy === "className" ? `${first.className} ${first.sectionName}` : first[sortBy];
  const secondValue = sortBy === "className" ? `${second.className} ${second.sectionName}` : second[sortBy];
  const result = String(firstValue ?? "").localeCompare(String(secondValue ?? ""), "en-IN", {
    numeric: true,
    sensitivity: "base",
  });

  return sortDirection === "asc" ? result : -result;
}

function ensureUniqueAdmissionNumber(scope: TenantScopedQuery, admissionNumber: string, ignoredStudentId?: string) {
  const exists = studentRecords.some(
    (student) =>
      student.id !== ignoredStudentId &&
      isInScope(student, scope) &&
      student.admissionNumber.toLowerCase() === admissionNumber.toLowerCase(),
  );

  if (exists) {
    throw new ApiError(409, "Admission number already exists for this academic year.");
  }
}

function ensureSupportedAcademicPlacement(scope: TenantScopedQuery, classId: string, sectionId: string) {
  return academicPlacementAdapter.validatePlacement(scope, classId, sectionId);
}

function createMockStudentId() {
  let sequence = studentRecords.length + 1;
  let studentId = `stu-${String(sequence).padStart(3, "0")}`;

  while (studentRecords.some((student) => student.id === studentId)) {
    sequence += 1;
    studentId = `stu-${String(sequence).padStart(3, "0")}`;
  }

  return studentId;
}

async function toStudentProfile(scope: TenantScopedQuery, student: Student): Promise<StudentProfile> {
  const placements = await studentPlacementService.getStudentsByPlacement(scope, {
    studentId: student.id,
    page: 1,
    pageSize: 100,
    sortBy: "startDate",
    sortDirection: "desc",
    allAcademicYears: true,
  });
  const currentPlacement = placements.items.find((placement) => placement.status === "active" && placement.academicYearId === scope.academicYearId);
  return {
    ...student,
    academic: currentPlacement
      ? {
          ...student.academic,
          academicYearId: currentPlacement.academicYearId,
          classId: currentPlacement.classId,
          className: currentPlacement.className,
          sectionId: currentPlacement.sectionId,
          sectionName: currentPlacement.sectionName,
        }
      : student.academic,
    guardianSummaries: student.guardians.map((guardian) => ({
      ...guardian,
      name: mockStudentGuardians.find((item) => item.id === guardian.guardianId)?.name,
    })),
    currentPlacement,
    placementHistory: placements.items,
  };
}
