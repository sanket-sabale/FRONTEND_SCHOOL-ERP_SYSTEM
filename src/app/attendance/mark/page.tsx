import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { MarkAttendanceForm } from "@/features/attendance/components/mark-attendance-form";
import { attendanceService } from "@/lib/api/attendance";
import { studentPlacementService } from "@/lib/api/student-placements";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function MarkAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[]; classId?: string | string[]; sectionId?: string | string[] }>;
}) {
  if (!hasPermission(currentSessionRole, "attendance.mark")) redirect("/unauthorized");

  const query = await searchParams;
  const date = getQueryValue(query.date) ?? todayIsoDate();
  const selectedClassId = getQueryValue(query.classId);
  const selectedSectionId = getQueryValue(query.sectionId);
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const placements = await studentService.getAcademicPlacements(scope);
  const validDate = isIsoDate(date) ? date : todayIsoDate();
  let rosterResponse: Awaited<ReturnType<typeof studentPlacementService.getRosterByEffectiveDate>> | null = null;
  let loadError: string | undefined;
  if (selectedClassId && selectedSectionId) {
    try {
      rosterResponse = await studentPlacementService.getRosterByEffectiveDate(scope, {
        classId: selectedClassId,
        sectionId: selectedSectionId,
        effectiveDate: validDate,
      });
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Attendance roster could not be loaded for the selected class and section.";
    }
  }
  const existingRecords = selectedClassId && selectedSectionId
    ? await attendanceService.getClassAttendance(scope, selectedClassId, selectedSectionId, validDate)
    : null;
  const roster = rosterResponse?.students.map((student) => ({
    id: student.studentId,
    displayName: student.studentName,
    admissionNumber: student.admissionNumber,
    classId: student.classId,
    sectionId: student.sectionId,
  })) ?? [];

  return (
    <AppShell>
      <MarkAttendanceForm
        context={{
          school: tenantContext.school,
          campus: tenantContext.campus,
          academicYear: tenantContext.academicYear,
        }}
        date={validDate}
        existingRecords={existingRecords?.items ?? []}
        loadError={loadError}
        placements={placements}
        roster={roster}
        selectedClassId={selectedClassId}
        selectedSectionId={selectedSectionId}
      />
    </AppShell>
  );
}

function getQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
