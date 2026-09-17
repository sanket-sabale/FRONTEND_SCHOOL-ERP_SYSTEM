import { tenantContext } from "@/lib/tenant-context";
import type { AcademicClass, AcademicYear, Section } from "@/features/academic-structure/types/academic-structure";

const activeScope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

export const mockAcademicYears: AcademicYear[] = [
  {
    ...activeScope,
    id: "ay-2026-27",
    name: "2026-27",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    status: "active",
    isCurrent: true,
    createdAt: "2026-03-01T09:00:00+05:30",
    updatedAt: "2026-08-01T09:00:00+05:30",
  },
  {
    ...activeScope,
    academicYearId: "ay-2027-28",
    id: "ay-2027-28",
    name: "2027-28",
    startDate: "2027-04-01",
    endDate: "2028-03-31",
    status: "draft",
    isCurrent: false,
    createdAt: "2026-08-10T09:00:00+05:30",
    updatedAt: "2026-08-10T09:00:00+05:30",
  },
  {
    ...activeScope,
    academicYearId: "ay-2025-26",
    id: "ay-2025-26",
    name: "2025-26",
    startDate: "2025-04-01",
    endDate: "2026-03-31",
    status: "closed",
    isCurrent: false,
    createdAt: "2025-03-01T09:00:00+05:30",
    updatedAt: "2026-04-05T09:00:00+05:30",
  },
  {
    ...activeScope,
    academicYearId: "ay-2024-25",
    id: "ay-2024-25",
    name: "2024-25",
    startDate: "2024-04-01",
    endDate: "2025-03-31",
    status: "archived",
    isCurrent: false,
    createdAt: "2024-03-01T09:00:00+05:30",
    updatedAt: "2025-04-05T09:00:00+05:30",
    archivedAt: "2025-04-05T09:00:00+05:30",
  },
];

export const mockAcademicClasses: AcademicClass[] = [
  academicClass("class-grade-3", "grade-3", "Grade 3", 30),
  academicClass("class-grade-6", "grade-6", "Grade 6", 60),
  academicClass("class-grade-7", "grade-7", "Grade 7", 70),
  academicClass("class-grade-8", "grade-8", "Grade 8", 80),
  academicClass("class-grade-9", "grade-9", "Grade 9", 90),
  academicClass("class-grade-10", "grade-10", "Grade 10", 100),
  academicClass("class-kg", "kg", "KG", 5),
  academicClass("class-ib-year-1-empty", "ib-year-1", "IB Year 1", 110),
  {
    ...academicClass("class-2025-grade-7", "grade-7", "Grade 7", 70),
    academicYearId: "ay-2025-26",
  },
  {
    ...academicClass("class-2027-grade-4", "grade-4", "Grade 4", 40),
    academicYearId: "ay-2027-28",
  },
  {
    ...academicClass("class-2027-grade-7", "grade-7", "Grade 7", 70),
    academicYearId: "ay-2027-28",
  },
  {
    ...academicClass("class-2027-grade-8", "grade-8", "Grade 8", 80),
    academicYearId: "ay-2027-28",
  },
  {
    ...academicClass("class-2027-grade-9", "grade-9", "Grade 9", 90),
    academicYearId: "ay-2027-28",
  },
  {
    ...academicClass("class-2027-grade-10", "grade-10", "Grade 10", 100),
    academicYearId: "ay-2027-28",
  },
  {
    ...academicClass("class-2027-grade-11", "grade-11", "Grade 11", 110),
    academicYearId: "ay-2027-28",
  },
  {
    ...academicClass("class-archived-demo", "legacy-demo", "Legacy Demo Class", 999),
    status: "archived",
    archivedAt: "2026-07-01T09:00:00+05:30",
  },
];

export const mockSections: Section[] = [
  section("section-grade-3-a", "class-grade-3", "A", "A", 36),
  section("section-grade-6-c", "class-grade-6", "C", "C", 40),
  section("section-grade-7-b", "class-grade-7", "B", "B", 38),
  section("section-grade-8-a", "class-grade-8", "A", "A", 42, "room-204", "teacher-priya"),
  section("section-grade-8-b-empty", "class-grade-8", "B", "B", 42, "room-205"),
  {
    ...section("section-grade-8-c-inactive", "class-grade-8", "C", "C", 36, "room-206"),
    status: "inactive",
  },
  section("section-grade-9-a", "class-grade-9", "A", "A", 40),
  section("section-grade-9-b-empty", "class-grade-9", "B", "B", 40),
  section("section-grade-10-b", "class-grade-10", "B", "B", 40),
  section("section-kg-a-empty", "class-kg", "A", "A", 28),
  {
    ...section("section-2025-grade-7-a", "class-2025-grade-7", "A", "A", 38),
    academicYearId: "ay-2025-26",
  },
  {
    ...section("section-2027-grade-4-a", "class-2027-grade-4", "A", "A", 36),
    academicYearId: "ay-2027-28",
  },
  {
    ...section("section-2027-grade-7-c", "class-2027-grade-7", "C", "C", 1),
    academicYearId: "ay-2027-28",
  },
  {
    ...section("section-2027-grade-8-b", "class-2027-grade-8", "B", "B", 38),
    academicYearId: "ay-2027-28",
  },
  {
    ...section("section-2027-grade-9-a", "class-2027-grade-9", "A", "A", 40),
    academicYearId: "ay-2027-28",
  },
  {
    ...section("section-2027-grade-9-b", "class-2027-grade-9", "B", "B", 40),
    academicYearId: "ay-2027-28",
  },
  {
    ...section("section-2027-grade-10-a", "class-2027-grade-10", "A", "A", 40),
    academicYearId: "ay-2027-28",
  },
  {
    ...section("section-2027-grade-11-b", "class-2027-grade-11", "B", "B", 40),
    academicYearId: "ay-2027-28",
  },
  {
    ...section("section-archived-demo-a", "class-archived-demo", "A", "A", 20),
    status: "archived",
    archivedAt: "2026-07-01T09:00:00+05:30",
  },
];

function academicClass(id: string, code: string, displayName: string, sortOrder: number): AcademicClass {
  return {
    ...activeScope,
    id,
    code,
    displayName,
    sortOrder,
    status: "active",
    createdAt: "2026-03-15T09:00:00+05:30",
    updatedAt: "2026-08-01T09:00:00+05:30",
  };
}

function section(
  id: string,
  classId: string,
  name: string,
  displayName: string,
  capacity: number,
  roomId?: string,
  classTeacherId?: string,
): Section {
  return {
    ...activeScope,
    id,
    classId,
    name,
    displayName,
    capacity,
    roomId,
    classTeacherId,
    status: "active",
    createdAt: "2026-03-20T09:00:00+05:30",
    updatedAt: "2026-08-01T09:00:00+05:30",
  };
}
