import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StudentProfile, StudentProfileNotFound } from "@/features/students/components/student-profile";
import { attendanceService } from "@/lib/api/attendance";
import { attendanceReportService } from "@/lib/api/attendance-reports";
import { guardianService } from "@/lib/api/guardians";
import { studentDocumentService } from "@/lib/api/student-documents";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ created?: string | string[]; updated?: string | string[]; placementChanged?: string | string[] }>;
}) {
  if (!hasPermission(currentSessionRole, "student.view")) {
    redirect("/unauthorized");
  }

  const { studentId } = await params;
  const query = await searchParams;
  const created = Array.isArray(query.created) ? query.created.includes("1") : query.created === "1";
  const updated = Array.isArray(query.updated) ? query.updated.includes("1") : query.updated === "1";
  const placementChanged = Array.isArray(query.placementChanged) ? query.placementChanged.includes("1") : query.placementChanged === "1";
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };

  if (!isValidStudentId(studentId)) {
    return (
      <AppShell>
        <StudentProfileNotFound message="The student profile URL is not valid. Return to the directory and select a student record." />
      </AppShell>
    );
  }

  const student = await studentService.getStudent(scope, studentId);

  if (!student) {
    return (
      <AppShell>
        <StudentProfileNotFound />
      </AppShell>
    );
  }

  const documentsResponse = await studentDocumentService.getStudentDocuments(scope, studentId);
  const [guardianRecords, guardianDirectory] = await Promise.all([
    guardianService.getStudentGuardians(scope, studentId),
    guardianService.getGuardians(scope, { page: 1, pageSize: 100 }),
  ]);
  const [attendanceSummary, attendanceReport] = await Promise.all([
    attendanceService.getAttendanceSummary(scope, { studentId }),
    attendanceReportService.getReportDashboard(scope, { studentId, page: 1, pageSize: 1 }),
  ]);
  const studentAttendanceReport = attendanceReport.studentReports.items[0];

  return (
    <AppShell>
      <StudentProfile
        context={{
          school: tenantContext.school,
          campus: tenantContext.campus,
          academicYear: tenantContext.academicYear,
        }}
        attendanceSummary={attendanceSummary}
        created={created}
        documentsResponse={documentsResponse}
        guardianRecords={guardianRecords}
        guardianOptions={guardianDirectory.items}
        role={currentSessionRole}
        student={student}
        attendanceRiskLevel={studentAttendanceReport?.riskLevel}
        attendanceTrend={attendanceReport.trend.slice(-5)}
        updated={updated || placementChanged}
      />
    </AppShell>
  );
}

function isValidStudentId(value: string) {
  return /^[a-z0-9_-]{3,64}$/i.test(value);
}
