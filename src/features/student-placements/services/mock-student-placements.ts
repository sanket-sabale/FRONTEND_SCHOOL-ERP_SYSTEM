import { tenantContext } from "@/lib/tenant-context";
import { grade8BAdditionalStudentSeeds } from "@/features/students/services/mock-students";
import type { StudentAcademicPlacement } from "@/features/student-placements/types/student-placement";

const activeScope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

export const mockStudentAcademicPlacements: StudentAcademicPlacement[] = [
  placement("sap-stu-001-2026-8a-old", "stu-001", "class-grade-8", "section-grade-8-a", "2026-04-02", "transferred", "2026-08-12", "section_change"),
  placement("sap-stu-001-2026-8b", "stu-001", "class-grade-8", "section-grade-8-b-empty", "2026-08-13", "active", undefined, "section_change"),
  placement("sap-stu-002-2026-10b", "stu-002", "class-grade-10", "section-grade-10-b", "2026-04-04", "active", undefined, "initial_admission"),
  placement("sap-stu-003-2026-6c", "stu-003", "class-grade-6", "section-grade-6-c", "2026-04-08", "active", undefined, "initial_admission"),
  placement("sap-stu-003-2026-overlap-diagnostic", "stu-003", "class-grade-6", "section-grade-6-c", "2026-08-10", "ended", "2026-08-12", "administrative_correction"),
  placement("sap-stu-004-2026-3a", "stu-004", "class-grade-3", "section-grade-3-a", "2026-04-10", "active", undefined, "initial_admission"),
  placement("sap-stu-005-2025-7a", "stu-005", "class-2025-grade-7", "section-2025-grade-7-a", "2025-04-06", "ended", "2026-03-31", "initial_admission", "ay-2025-26"),
  placement("sap-stu-005-2026-9a", "stu-005", "class-grade-9", "section-grade-9-a", "2026-04-01", "transferred", "2026-07-29", "student_transfer"),
  placement("sap-stu-006-2026-7b", "stu-006", "class-grade-7", "section-grade-7-b", "2026-04-12", "active", undefined, "initial_admission"),
  placement("sap-stu-007-2026-8b", "stu-007", "class-grade-8", "section-grade-8-b-empty", "2026-04-03", "active", undefined, "initial_admission"),
  placement("sap-stu-008-2026-8b", "stu-008", "class-grade-8", "section-grade-8-b-empty", "2026-04-03", "active", undefined, "initial_admission"),
  placement("sap-stu-009-2026-8b", "stu-009", "class-grade-8", "section-grade-8-b-empty", "2026-04-04", "active", undefined, "initial_admission"),
  placement("sap-stu-010-2026-8b", "stu-010", "class-grade-8", "section-grade-8-b-empty", "2026-04-05", "active", undefined, "initial_admission"),
  placement("sap-stu-011-2026-8b", "stu-011", "class-grade-8", "section-grade-8-b-empty", "2026-04-05", "active", undefined, "initial_admission"),
  placement("sap-stu-012-2026-8b", "stu-012", "class-grade-8", "section-grade-8-b-empty", "2026-04-06", "active", undefined, "initial_admission"),
  placement("sap-stu-013-2026-8b", "stu-013", "class-grade-8", "section-grade-8-b-empty", "2026-04-07", "active", undefined, "initial_admission"),
  placement("sap-stu-014-2026-8b", "stu-014", "class-grade-8", "section-grade-8-b-empty", "2026-04-07", "active", undefined, "initial_admission"),
  ...grade8BAdditionalStudentSeeds.map((seed, index) =>
    placement(
      `sap-${seed.studentId}-2026-8b`,
      seed.studentId,
      "class-grade-8",
      "section-grade-8-b-empty",
      `2026-04-${String(8 + Math.floor(index / 5)).padStart(2, "0")}`,
      "active",
      undefined,
      "initial_admission",
    ),
  ),
];

function placement(
  id: string,
  studentId: string,
  classId: string,
  sectionId: string,
  startDate: string,
  status: StudentAcademicPlacement["status"],
  endDate?: string,
  reason?: StudentAcademicPlacement["reason"],
  academicYearId = tenantContext.academicYearId,
): StudentAcademicPlacement {
  return {
    ...activeScope,
    academicYearId,
    id,
    studentId,
    classId,
    sectionId,
    status,
    startDate,
    endDate,
    reason,
    createdAt: `${startDate}T09:00:00+05:30`,
    updatedAt: endDate ? `${endDate}T09:00:00+05:30` : "2026-08-01T09:00:00+05:30",
  };
}
