import Link from "next/link";
import { Badge, Card, SectionHeader, Select } from "@/components/ui";
import { AttendanceStatusBadge } from "@/features/attendance/components/attendance-status-badge";
import { getAttendanceStatusLabel } from "@/features/attendance/services/attendance-rules";
import { attendanceStatuses } from "@/features/attendance/types/attendance";
import { attendanceService } from "@/lib/api/attendance";
import { tenantContext } from "@/lib/tenant-context";

export async function AttendanceGrid() {
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const response = await attendanceService.getAttendanceRecords(scope, {
    date: "2026-08-12",
    page: 1,
    pageSize: 5,
    sortBy: "studentName",
  });
  const { summary } = response;
  const attendanceSummary = [
    ["Total", summary.totalWorkingDays.toLocaleString("en-IN"), "neutral"],
    ["Present", summary.presentDays.toLocaleString("en-IN"), "success"],
    ["Absent", summary.absentDays.toLocaleString("en-IN"), "danger"],
    ["Late", summary.lateDays.toLocaleString("en-IN"), "warning"],
    ["Leave", summary.leaveDays.toLocaleString("en-IN"), "info"],
  ] as const;

  return (
    <Card id="attendance">
      <SectionHeader
        title="Fast Attendance"
        eyebrow="Grade 8 A / 11 Aug 2026"
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance">
              Open Attendance
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/mark?date=2026-08-12&classId=class-grade-8&sectionId=section-grade-8-a">
              Mark Attendance
            </Link>
          </div>
        }
      />
      <div className="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 min-[480px]:grid-cols-2 sm:p-5 lg:grid-cols-5">
        {attendanceSummary.map(([label, value, tone]) => (
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800" key={label}>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
            <Badge tone={tone}>{label}</Badge>
          </div>
        ))}
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {response.items.map((row) => (
          <div className="grid gap-3 px-5 py-3 sm:grid-cols-[1fr_auto]" key={row.id}>
            <div>
              <p className="font-medium">{row.studentName}</p>
              <p className="text-xs text-slate-500">{row.rollNumber ? `Roll ${row.rollNumber}` : row.admissionNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <AttendanceStatusBadge status={row.status} />
              <Select aria-label={`Attendance status for ${row.studentName}`} defaultValue={row.status}>
                {attendanceStatuses.map((status) => (
                  <option key={status} value={status}>{getAttendanceStatusLabel(status)}</option>
                ))}
              </Select>
            </div>
          </div>
        ))}
        {response.items.length === 0 ? (
          <div className="px-5 py-4 text-sm text-slate-500">
            Attendance records will appear here after a class roster is marked.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
