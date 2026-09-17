import { tenantContext } from "@/lib/tenant-context";
import type { AcademicSubject, StaffAcademicAssignment } from "@/features/staff-academic-assignments/types/staff-academic-assignment";
import type { TenantScopedQuery } from "@/lib/api/client";

const activeScope: TenantScopedQuery = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

const secondTenantScope: TenantScopedQuery = {
  tenantId: "tenant-demo-west",
  schoolId: "school-demo-west",
  campusId: "campus-demo-central",
  academicYearId: "ay-2026-27",
};

export const mockAcademicSubjects: AcademicSubject[] = [
  subject("subject-mathematics", "MAT", "Mathematics", ["class-grade-8", "class-grade-9", "class-grade-10"]),
  subject("subject-english", "ENG", "English", ["class-grade-6", "class-grade-7", "class-grade-8"]),
  subject("subject-science", "SCI", "Science", ["class-grade-7", "class-grade-8", "class-grade-9"]),
  subject("subject-social-studies", "SST", "Social Studies", ["class-grade-6", "class-grade-7", "class-grade-8"]),
  subject("subject-computer", "ICT", "Computer Studies", ["class-grade-8", "class-grade-9", "class-grade-10"]),
  subject("subject-evs", "EVS", "EVS", ["class-grade-3"]),
  { ...subject("subject-archived-demo", "OLD", "Legacy Subject"), status: "inactive" },
  subject("subject-west-mathematics", "MAT", "Mathematics", ["class-grade-8"], secondTenantScope),
];

export const mockStaffAcademicAssignments: StaffAcademicAssignment[] = [
  assignment("assignment-001", "staff-001", "class-grade-8", "section-grade-8-a", "subject-mathematics", "subject_teacher", "active", true, "2026-04-01"),
  assignment("assignment-002", "staff-001", "class-grade-9", "section-grade-9-a", "subject-science", "subject_teacher", "active", false, "2026-04-01"),
  assignment("assignment-003", "staff-002", "class-grade-8", "section-grade-8-b-empty", "subject-english", "class_teacher", "active", true, "2026-04-01"),
  assignment("assignment-004", "staff-002", "class-grade-7", "section-grade-7-b", "subject-social-studies", "subject_teacher", "planned", false, "2026-09-01"),
  assignment("assignment-005", "staff-007", "class-grade-6", "section-grade-6-c", "subject-english", "assistant_teacher", "active", false, "2026-04-01"),
  assignment("assignment-006", "staff-009", "class-grade-10", "section-grade-10-b", "subject-computer", "co_teacher", "active", false, "2026-06-01"),
  assignment("assignment-009", "staff-007", "class-grade-8", "section-grade-8-a", "subject-science", "assistant_teacher", "active", false, "2026-06-15", undefined, "Readiness scenario for class-section coverage review."),
  assignment("assignment-007", "staff-011", "class-2025-grade-7", "section-2025-grade-7-a", "subject-english", "subject_teacher", "ended", false, "2025-04-01", "2026-03-31", "Previous year ended assignment.", { academicYearId: "ay-2025-26" }),
  assignment("assignment-008", "staff-008", "class-grade-8", "section-grade-8-a", "subject-science", "assistant_teacher", "cancelled", false, "2026-07-01", undefined, "Cancelled due to staff lifecycle review."),
  assignment("assignment-west-001", "staff-west-001", "class-grade-8", "section-grade-8-a", "subject-west-mathematics", "subject_teacher", "active", true, "2026-04-01", undefined, undefined, secondTenantScope),
];

function subject(id: string, code: string, name: string, classIds?: string[], scope = activeScope): AcademicSubject {
  return { ...scope, id, code, name, classIds, status: "active" };
}

function assignment(id: string, staffId: string, classId: string, sectionId: string, subjectId: string, assignmentType: StaffAcademicAssignment["assignmentType"], status: StaffAcademicAssignment["status"], isPrimary: boolean, startDate: string, endDate?: string, notes?: string, scope: Partial<TenantScopedQuery> = {}): StaffAcademicAssignment {
  const scoped = { ...activeScope, ...scope };
  return { ...scoped, id, staffId, classId, sectionId, subjectId, assignmentType, status, isPrimary, startDate, endDate, notes, createdAt: `${startDate}T09:00:00+05:30`, updatedAt: `${endDate ?? startDate}T09:00:00+05:30` };
}
