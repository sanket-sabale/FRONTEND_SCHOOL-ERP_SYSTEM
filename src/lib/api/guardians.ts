import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { studentService } from "@/lib/api/students";
import {
  guardianCreateSchema,
  guardianFiltersSchema,
  guardianRelationshipEndSchema,
  guardianRelationshipSchema,
  guardianRelationshipUpdateSchema,
  guardianUpdateSchema,
} from "@/features/guardians/schemas/guardian.schema";
import { mockGuardianRelationships, mockGuardians } from "@/features/guardians/services/mock-guardians";
import type {
  Guardian,
  GuardianCreateInput,
  GuardianFilters,
  GuardianListResponse,
  GuardianProfile,
  GuardianRelationshipInput,
  GuardianRelationshipUpdateInput,
  GuardianStudentRecord,
  GuardianStudentRelationship,
  GuardianSummary,
  GuardianUpdateInput,
  StudentGuardianRecord,
} from "@/features/guardians/types/guardian";

let guardianRecords = [...mockGuardians];
let relationshipRecords = [...mockGuardianRelationships];

export const guardianService = {
  async getGuardians(scope: TenantScopedQuery, filters: GuardianFilters = {}): Promise<GuardianListResponse> {
    const parsedFilters = guardianFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    const page = parsedFilters.page;
    const pageSize = parsedFilters.pageSize;
    const filtered = guardianRecords
      .filter((guardian) => isGuardianInScope(guardian, scope))
      .filter((guardian) => parsedFilters.status ? guardian.status === parsedFilters.status : guardian.status !== "archived")
      .filter((guardian) => !parsedFilters.verificationStatus || guardian.verificationStatus === parsedFilters.verificationStatus)
      .filter((guardian) => {
        if (!query) return true;
        return [guardian.displayName, guardian.primaryPhone, guardian.email, guardian.city].filter(Boolean).join(" ").toLowerCase().includes(query);
      })
      .map((guardian) => toGuardianSummary(guardian, scope))
      .sort((first, second) => first.displayName.localeCompare(second.displayName, "en-IN", { sensitivity: "base" }));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  async getGuardian(scope: TenantScopedQuery, guardianId: string): Promise<GuardianProfile | null> {
    const guardian = guardianRecords.find((record) => record.id === guardianId && isGuardianInScope(record, scope));
    if (!guardian) return null;

    return {
      ...guardian,
      students: await getGuardianStudentRecords(scope, guardian.id),
    };
  },

  async createGuardian(input: GuardianCreateInput) {
    const parsedInput = guardianCreateSchema.parse(input);
    ensureUniqueGuardianContact(parsedInput);
    const now = new Date().toISOString();
    const guardian: Guardian = {
      ...parsedInput,
      id: createGuardianId(),
      displayName: [parsedInput.firstName, parsedInput.middleName, parsedInput.lastName].filter(Boolean).join(" "),
      status: "active",
      verificationStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };

    guardianRecords = [guardian, ...guardianRecords];
    return guardian;
  },

  async updateGuardian(input: GuardianUpdateInput) {
    const parsedInput = guardianUpdateSchema.parse(input);
    const guardian = getScopedGuardianOrThrow(parsedInput, parsedInput.id);
    const next: Guardian = {
      ...guardian,
      ...parsedInput,
      displayName: [
        parsedInput.firstName ?? guardian.firstName,
        parsedInput.middleName ?? guardian.middleName,
        parsedInput.lastName ?? guardian.lastName,
      ].filter(Boolean).join(" "),
      updatedAt: new Date().toISOString(),
    };
    guardianRecords = guardianRecords.map((record) => (record.id === next.id ? next : record));
    return next;
  },

  async archiveGuardian(scope: TenantScopedQuery, guardianId: string) {
    const guardian = getScopedGuardianOrThrow(scope, guardianId);
    const now = new Date().toISOString();
    const next = { ...guardian, status: "archived" as const, archivedAt: now, updatedAt: now };
    guardianRecords = guardianRecords.map((record) => (record.id === guardianId ? next : record));
    return next;
  },

  async restoreGuardian(scope: TenantScopedQuery, guardianId: string) {
    const guardian = getScopedGuardianOrThrow(scope, guardianId);
    const next = { ...guardian, status: "active" as const, archivedAt: undefined, updatedAt: new Date().toISOString() };
    guardianRecords = guardianRecords.map((record) => (record.id === guardianId ? next : record));
    return next;
  },

  async getStudentGuardians(scope: TenantScopedQuery, studentId: string): Promise<StudentGuardianRecord[]> {
    await ensureStudentInScope(scope, studentId);
    return relationshipRecords
      .filter((relationship) => isRelationshipInScope(relationship, scope) && relationship.studentId === studentId && !relationship.endDate)
      .map((relationship) => {
        const guardian = getScopedGuardianOrThrow(scope, relationship.guardianId);
        return { ...relationship, guardian };
      })
      .sort((first, second) => Number(second.isPrimary) - Number(first.isPrimary));
  },

  async getGuardianStudents(scope: TenantScopedQuery, guardianId: string) {
    getScopedGuardianOrThrow(scope, guardianId);
    return getGuardianStudentRecords(scope, guardianId);
  },

  async createRelationship(input: GuardianRelationshipInput) {
    const parsedInput = guardianRelationshipSchema.parse(input);
    await ensureStudentInScope(parsedInput, parsedInput.studentId);
    const guardian = getScopedGuardianOrThrow(parsedInput, parsedInput.guardianId);
    if (guardian.status === "archived") throw new ApiError(422, "Archived guardians cannot be linked to students.");
    ensureNoDuplicateActiveRelationship(parsedInput);
    const now = new Date().toISOString();
    const relationship: GuardianStudentRelationship = {
      ...parsedInput,
      id: createRelationshipId(parsedInput.studentId),
      isPrimary: parsedInput.isPrimary,
      isEmergencyContact: parsedInput.isEmergencyContact,
      canPickup: parsedInput.canPickup,
      canReceiveAcademicCommunication: parsedInput.canReceiveAcademicCommunication,
      canReceiveFeeCommunication: parsedInput.canReceiveFeeCommunication,
      canReceiveAttendanceCommunication: parsedInput.canReceiveAttendanceCommunication,
      canReceiveGeneralCommunication: parsedInput.canReceiveGeneralCommunication,
      custodyStatus: parsedInput.custodyStatus,
      startDate: parsedInput.startDate ?? now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };

    if (relationship.isPrimary) unsetOtherPrimary(parsedInput, relationship.studentId);
    relationshipRecords = [relationship, ...relationshipRecords];
    return relationship;
  },

  async updateRelationship(input: GuardianRelationshipUpdateInput) {
    const parsedInput = guardianRelationshipUpdateSchema.parse(input);
    const current = getScopedRelationshipOrThrow(parsedInput, parsedInput.relationshipId);
    const next: GuardianStudentRelationship = {
      ...current,
      ...parsedInput,
      updatedAt: new Date().toISOString(),
    };
    if (next.isPrimary) unsetOtherPrimary(parsedInput, next.studentId, next.id);
    relationshipRecords = relationshipRecords.map((record) => (record.id === next.id ? next : record));
    return next;
  },

  async endRelationship(input: TenantScopedQuery & { relationshipId: string; endDate?: string; notes?: string }) {
    const parsedInput = guardianRelationshipEndSchema.parse(input);
    const current = getScopedRelationshipOrThrow(parsedInput, parsedInput.relationshipId);
    const next = {
      ...current,
      endDate: parsedInput.endDate ?? new Date().toISOString().slice(0, 10),
      notes: parsedInput.notes ?? current.notes,
      isPrimary: false,
      updatedAt: new Date().toISOString(),
    };
    relationshipRecords = relationshipRecords.map((record) => (record.id === next.id ? next : record));
    return next;
  },
};

async function getGuardianStudentRecords(scope: TenantScopedQuery, guardianId: string): Promise<GuardianStudentRecord[]> {
  const relationships = relationshipRecords.filter((relationship) => isRelationshipInScope(relationship, scope) && relationship.guardianId === guardianId && !relationship.endDate);
  const records: GuardianStudentRecord[] = [];
  for (const relationship of relationships) {
    const student = await studentService.getStudent(scope, relationship.studentId);
    if (student) {
      records.push({ ...relationship, student: {
        id: student.id,
        tenantId: student.tenantId,
        schoolId: student.schoolId,
        campusId: student.campusId,
        academicYearId: student.academicYearId,
        admissionNumber: student.admissionNumber,
        studentCode: student.studentCode,
        displayName: student.displayName,
        avatarUrl: student.avatarUrl,
        gender: student.gender,
        status: student.status,
        admissionDate: student.admissionDate,
        classId: student.academic.classId,
        className: student.academic.className ?? student.academic.classId,
        sectionId: student.academic.sectionId,
        sectionName: student.academic.sectionName ?? student.academic.sectionId,
        rollNumber: student.academic.rollNumber,
      } });
    }
  }
  return records;
}

async function ensureStudentInScope(scope: TenantScopedQuery, studentId: string) {
  const student = await studentService.getStudent(scope, studentId);
  if (!student) throw new ApiError(404, "Student could not be found in the current school context.");
}

function toGuardianSummary(guardian: Guardian, scope: TenantScopedQuery): GuardianSummary {
  return {
    id: guardian.id,
    tenantId: guardian.tenantId,
    schoolId: guardian.schoolId,
    campusId: guardian.campusId,
    academicYearId: guardian.academicYearId,
    displayName: guardian.displayName,
    primaryPhone: guardian.primaryPhone,
    email: guardian.email,
    status: guardian.status,
    verificationStatus: guardian.verificationStatus,
    studentCount: relationshipRecords.filter((relationship) => isRelationshipInScope(relationship, scope) && relationship.guardianId === guardian.id && !relationship.endDate).length,
  };
}

function ensureUniqueGuardianContact(input: GuardianCreateInput) {
  const exists = guardianRecords.some((guardian) => isGuardianInScope(guardian, input) && guardian.primaryPhone === input.primaryPhone && guardian.status !== "archived");
  if (exists) throw new ApiError(409, "A guardian with this primary phone already exists in the current school context.");
}

function ensureNoDuplicateActiveRelationship(input: GuardianRelationshipInput) {
  const exists = relationshipRecords.some(
    (relationship) =>
      isRelationshipInScope(relationship, input) &&
      relationship.guardianId === input.guardianId &&
      relationship.studentId === input.studentId &&
      relationship.relationshipType === input.relationshipType &&
      !relationship.endDate,
  );
  if (exists) throw new ApiError(409, "This guardian is already linked to the student with the selected relationship.");
}

function unsetOtherPrimary(scope: TenantScopedQuery, studentId: string, ignoredRelationshipId?: string) {
  relationshipRecords = relationshipRecords.map((relationship) =>
    isRelationshipInScope(relationship, scope) &&
    relationship.studentId === studentId &&
    relationship.id !== ignoredRelationshipId &&
    !relationship.endDate
      ? { ...relationship, isPrimary: false, updatedAt: new Date().toISOString() }
      : relationship,
  );
}

function getScopedGuardianOrThrow(scope: TenantScopedQuery, guardianId: string) {
  const guardian = guardianRecords.find((record) => record.id === guardianId && isGuardianInScope(record, scope));
  if (!guardian) throw new ApiError(404, "Guardian could not be found in the current school context.");
  return guardian;
}

function getScopedRelationshipOrThrow(scope: TenantScopedQuery, relationshipId: string) {
  const relationship = relationshipRecords.find((record) => record.id === relationshipId && isRelationshipInScope(record, scope));
  if (!relationship) throw new ApiError(404, "Guardian relationship could not be found.");
  return relationship;
}

function isGuardianInScope(guardian: Guardian, scope: TenantScopedQuery) {
  return guardian.tenantId === scope.tenantId && guardian.schoolId === scope.schoolId && guardian.campusId === scope.campusId && guardian.academicYearId === scope.academicYearId;
}

function isRelationshipInScope(relationship: GuardianStudentRelationship, scope: TenantScopedQuery) {
  return relationship.tenantId === scope.tenantId && relationship.schoolId === scope.schoolId && relationship.campusId === scope.campusId && relationship.academicYearId === scope.academicYearId;
}

function createGuardianId() {
  return `guardian-${Date.now()}`;
}

function createRelationshipId(studentId: string) {
  return `rel-${studentId}-${Date.now()}`;
}
