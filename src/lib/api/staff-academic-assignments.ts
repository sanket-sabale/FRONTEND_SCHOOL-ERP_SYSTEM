import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { academicStructureService } from "@/lib/api/academic-structure";
import { staffService } from "@/lib/api/staff";
import { staffAcademicAssignmentCreateSchema, staffAcademicAssignmentFiltersSchema, staffAcademicAssignmentStatusSchema } from "@/features/staff-academic-assignments/schemas/staff-academic-assignment.schema";
import { canStaffReceiveActiveAcademicAssignment, canTransitionAssignmentStatus, classifyAssignmentWorkload } from "@/features/staff-academic-assignments/services/staff-academic-assignment-rules";
import { mockAcademicSubjects, mockStaffAcademicAssignments } from "@/features/staff-academic-assignments/services/mock-staff-academic-assignments";
import type {
  AcademicSubject,
  StaffAcademicAssignment,
  StaffAcademicAssignmentFilters,
  StaffAcademicAssignmentInput,
  StaffAcademicAssignmentListItem,
  StaffAcademicAssignmentOptions,
  StaffAcademicAssignmentStatusInput,
  StaffAcademicWorkload,
} from "@/features/staff-academic-assignments/types/staff-academic-assignment";

let assignments = [...mockStaffAcademicAssignments];
const subjects = [...mockAcademicSubjects];

export const staffAcademicAssignmentService = {
  async getOptions(scope: TenantScopedQuery): Promise<StaffAcademicAssignmentOptions> {
    const academicYears = await academicStructureService.getAcademicYears(scope);
    const classGroups = await Promise.all(academicYears.map((year) => academicStructureService.getClasses({ ...scope, academicYearId: year.id }, { includeArchived: true })));
    const sectionGroups = await Promise.all(academicYears.map((year) => academicStructureService.getSections({ ...scope, academicYearId: year.id }, { includeArchived: true })));
    const classes = classGroups.flat();
    const sections = sectionGroups.flat();
    return {
      academicYears: academicYears.map((year) => ({ id: year.id, name: year.name, status: year.status })),
      classes: classes.map((item) => ({ id: item.id, name: item.displayName, academicYearId: item.academicYearId })),
      sections: sections.map((item) => ({ id: item.id, name: item.displayName, classId: item.classId, academicYearId: item.academicYearId })),
      subjects: subjects.filter((subject) => isSameScopeOrCampus(subject, scope)).map((subject) => ({ id: subject.id, name: subject.name, status: subject.status })),
    };
  },

  async listAssignments(scope: TenantScopedQuery, filters: StaffAcademicAssignmentFilters = {}) {
    const parsed = staffAcademicAssignmentFiltersSchema.parse(filters);
    const effectiveScope = { ...scope, academicYearId: parsed.academicYearId ?? scope.academicYearId };
    const query = parsed.query?.toLowerCase();
    const enriched = await enrichAssignments(effectiveScope, assignments.filter((item) => isSameScope(item, effectiveScope)))
      .then((items) => items
        .filter((item) => !parsed.staffId || item.staffId === parsed.staffId)
        .filter((item) => !parsed.classId || item.classId === parsed.classId)
        .filter((item) => !parsed.sectionId || item.sectionId === parsed.sectionId)
        .filter((item) => !parsed.subjectId || item.subjectId === parsed.subjectId)
        .filter((item) => !parsed.assignmentType || item.assignmentType === parsed.assignmentType)
        .filter((item) => !parsed.status || item.status === parsed.status)
        .filter((item) => parsed.primary === undefined || item.isPrimary === parsed.primary)
        .filter((item) => !query || [item.staffName, item.employeeNumber, item.className, item.sectionName, item.subjectName, item.assignmentType, item.status].join(" ").toLowerCase().includes(query))
        .sort((first, second) => `${first.className} ${first.sectionName} ${first.subjectName}`.localeCompare(`${second.className} ${second.sectionName} ${second.subjectName}`, "en-IN", { numeric: true, sensitivity: "base" })));
    const total = enriched.length;
    const page = parsed.page;
    const pageSize = parsed.pageSize;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return { items: enriched.slice(start, start + pageSize), total, page, pageSize, totalPages };
  },

  async getAssignment(scope: TenantScopedQuery, assignmentId: string) {
    const assignment = assignments.find((item) => item.id === assignmentId && isSameScope(item, scope));
    if (!assignment) return null;
    const [item] = await enrichAssignments(scope, [assignment]);
    return item ?? null;
  },

  async getStaffAssignments(scope: TenantScopedQuery, staffId: string) {
    await ensureStaff(scope, staffId);
    return this.listAssignments(scope, { staffId, page: 1, pageSize: 100 });
  },

  async createAssignment(input: StaffAcademicAssignmentInput) {
    const parsed = staffAcademicAssignmentCreateSchema.parse(input);
    const staff = await ensureStaff(parsed, parsed.staffId);
    if ((parsed.status === "active" || parsed.status === "planned") && !canStaffReceiveActiveAcademicAssignment(staff.status)) {
      throw new ApiError(422, "This staff lifecycle status is not eligible for academic assignment.");
    }
    const academicYear = await academicStructureService.getAcademicYear(parsed, parsed.academicYearId);
    if (!academicYear) throw new ApiError(404, "Academic year could not be found.");
    if (parsed.status === "active" && !["active", "draft"].includes(academicYear.status)) throw new ApiError(422, "Closed or archived academic years cannot receive active assignments.");
    const academicClass = await academicStructureService.getClass(parsed, parsed.classId);
    if (!academicClass) throw new ApiError(404, "Class could not be found.");
    if (academicClass.status !== "active") throw new ApiError(422, "Only active classes can receive staff assignments.");
    const section = await academicStructureService.getSection(parsed, parsed.sectionId);
    if (!section) throw new ApiError(404, "Section could not be found.");
    if (section.classId !== academicClass.id) throw new ApiError(422, "Selected section does not belong to the selected class.");
    if (section.status !== "active") throw new ApiError(422, "Only active sections can receive staff assignments.");
    const subject = getSubjectOrThrow(parsed, parsed.subjectId);
    if (subject.status !== "active") throw new ApiError(422, "Inactive subjects cannot be assigned.");
    if (subject.classIds?.length && !subject.classIds.includes(academicClass.id)) throw new ApiError(422, "Selected subject is not configured for the selected class.");
    ensureNoDuplicate(parsed, parsed);
    ensureNoPrimaryConflict(parsed, parsed);
    const now = new Date().toISOString();
    const assignment: StaffAcademicAssignment = { ...parsed, id: createId(parsed.staffId, parsed.subjectId), status: parsed.status, isPrimary: parsed.isPrimary, createdAt: now, updatedAt: now };
    assignments = [assignment, ...assignments];
    return { ...assignment };
  },

  async changeAssignmentStatus(input: StaffAcademicAssignmentStatusInput) {
    const parsed = staffAcademicAssignmentStatusSchema.parse(input);
    const current = assignments.find((item) => item.id === parsed.assignmentId && isSameScope(item, parsed));
    if (!current) throw new ApiError(404, "Academic assignment could not be found.");
    if (!canTransitionAssignmentStatus(current.status, parsed.status)) throw new ApiError(422, "This assignment status transition is not allowed.");
    if (parsed.status === "active") {
      const staff = await ensureStaff(parsed, current.staffId);
      if (!canStaffReceiveActiveAcademicAssignment(staff.status)) throw new ApiError(422, "This staff lifecycle status is not eligible for active academic assignment.");
      ensureNoDuplicate(parsed, { ...current, status: parsed.status }, current.id);
      ensureNoPrimaryConflict(parsed, { ...current, status: parsed.status }, current.id);
    }
    const next = { ...current, status: parsed.status, endDate: parsed.status === "ended" ? parsed.endDate ?? new Date().toISOString().slice(0, 10) : current.endDate, updatedAt: new Date().toISOString() };
    assignments = assignments.map((item) => item.id === next.id ? next : item);
    return { ...next };
  },

  async listWorkload(scope: TenantScopedQuery): Promise<StaffAcademicWorkload[]> {
    const active = await this.listAssignments(scope, { status: "active", page: 1, pageSize: 100 });
    const staffMap = new Map<string, StaffAcademicAssignmentListItem[]>();
    active.items.forEach((item) => staffMap.set(item.staffId, [...(staffMap.get(item.staffId) ?? []), item]));
    return Array.from(staffMap.entries()).map(([staffId, items]) => ({
      staffId,
      staffName: items[0]?.staffName ?? staffId,
      employeeNumber: items[0]?.employeeNumber ?? "--",
      activeAssignments: items.length,
      classCount: new Set(items.map((item) => item.classId)).size,
      sectionCount: new Set(items.map((item) => item.sectionId)).size,
      subjectCount: new Set(items.map((item) => item.subjectId)).size,
      status: classifyAssignmentWorkload(items.length),
    })).sort((first, second) => second.activeAssignments - first.activeAssignments);
  },
};

async function enrichAssignments(scope: TenantScopedQuery, records: StaffAcademicAssignment[]): Promise<StaffAcademicAssignmentListItem[]> {
  const staff = await staffService.listStaff(scope, { page: 1, pageSize: 100 });
  const [years, classes, sections] = await Promise.all([
    academicStructureService.getAcademicYears(scope),
    academicStructureService.getClasses(scope, { includeArchived: true }),
    academicStructureService.getSections(scope, { includeArchived: true }),
  ]);
  return records.flatMap((assignment) => {
    const staffRecord = staff.items.find((item) => item.id === assignment.staffId);
    const year = years.find((item) => item.id === assignment.academicYearId);
    const klass = classes.find((item) => item.id === assignment.classId);
    const section = sections.find((item) => item.id === assignment.sectionId);
    const subject = subjects.find((item) => item.id === assignment.subjectId && isSameScopeOrCampus(item, assignment));
    if (!staffRecord || !year || !klass || !section || !subject) return [];
    return [{ ...assignment, staffName: staffRecord.displayName, employeeNumber: staffRecord.employeeNumber, academicYearName: year.name, className: klass.displayName, sectionName: section.displayName, subjectName: subject.name }];
  });
}

async function ensureStaff(scope: TenantScopedQuery, staffId: string) {
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) throw new ApiError(404, "Staff member not found.");
  return staff;
}

function getSubjectOrThrow(scope: TenantScopedQuery, subjectId: string): AcademicSubject {
  const subject = subjects.find((item) => item.id === subjectId && isSameScopeOrCampus(item, scope));
  if (!subject) throw new ApiError(404, "Subject could not be found.");
  return subject;
}

function ensureNoDuplicate(scope: TenantScopedQuery, next: Pick<StaffAcademicAssignment, "staffId" | "academicYearId" | "classId" | "sectionId" | "subjectId" | "assignmentType" | "status">, ignoreId?: string) {
  const duplicate = assignments.find((item) => item.id !== ignoreId && isSameScope(item, scope) && item.status === "active" && next.status === "active" && item.staffId === next.staffId && item.classId === next.classId && item.sectionId === next.sectionId && item.subjectId === next.subjectId && item.assignmentType === next.assignmentType);
  if (duplicate) throw new ApiError(409, "This teacher already has an active assignment for the selected class, section, subject, and assignment type.");
}

function ensureNoPrimaryConflict(scope: TenantScopedQuery, next: Pick<StaffAcademicAssignment, "classId" | "sectionId" | "subjectId" | "assignmentType" | "status" | "isPrimary">, ignoreId?: string) {
  if (!next.isPrimary || next.status !== "active") return;
  const conflict = assignments.find((item) => item.id !== ignoreId && isSameScope(item, scope) && item.status === "active" && item.isPrimary && item.classId === next.classId && item.sectionId === next.sectionId && (next.assignmentType === "class_teacher" ? item.assignmentType === "class_teacher" : item.subjectId === next.subjectId && item.assignmentType === next.assignmentType));
  if (conflict) throw new ApiError(409, "A primary responsibility already exists for this class/section/subject context.");
}

function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId && record.academicYearId === scope.academicYearId;
}

function isSameScopeOrCampus(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId && (record.academicYearId === scope.academicYearId || record.academicYearId === "ay-2026-27");
}

function createId(staffId: string, subjectId: string) {
  return `assignment-${staffId}-${subjectId}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
