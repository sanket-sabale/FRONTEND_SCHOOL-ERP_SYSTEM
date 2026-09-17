import Link from "next/link";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import { defaultAttendanceThreshold, getAttendanceRiskLevel, getRiskLabel, getRiskTone } from "@/features/attendance/services/attendance-report-rules";
import type { AttendanceSummary } from "@/features/attendance/types/attendance";
import type { AttendanceRiskLevel, AttendanceTrendPoint } from "@/features/attendance/types/attendance-report";

export function StudentAttendanceSummaryCard({
  riskLevel,
  studentId,
  summary,
  trend = [],
}: {
  riskLevel?: AttendanceRiskLevel;
  studentId: string;
  summary: AttendanceSummary;
  trend?: AttendanceTrendPoint[];
}) {
  const hasData = summary.totalWorkingDays > 0;
  const currentRisk = riskLevel ?? getAttendanceRiskLevel(summary.attendancePercentage, defaultAttendanceThreshold);

  return (
    <Card id="attendance">
      <SectionHeader
        eyebrow="Attendance"
        title="Attendance Summary"
        action={
          <div className="responsive-action-row">
            <Link className="text-sm font-medium text-primary hover:underline" href={`/attendance?studentId=${encodeURIComponent(studentId)}`}>Open Attendance</Link>
            <Link className="text-sm font-medium text-primary hover:underline" href={`/attendance/history?studentId=${encodeURIComponent(studentId)}`}>View History</Link>
            <Link className="text-sm font-medium text-primary hover:underline" href={`/attendance/reports?studentId=${encodeURIComponent(studentId)}`}>Attendance Report</Link>
            <Link className="text-sm font-medium text-primary hover:underline" href={`/attendance/export?studentId=${encodeURIComponent(studentId)}&exportScope=student`}>Export</Link>
          </div>
        }
      />
      <div className="p-4 sm:p-5">
        {!hasData ? (
          <EmptyState description="Attendance records for this student will appear here after daily attendance is marked." title="No attendance data" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Attendance Rate" tone="success" value={`${summary.attendancePercentage}%`} />
            <Metric label="Risk" tone={getRiskTone(currentRisk)} value={getRiskLabel(currentRisk)} />
            <Metric label="Present" tone="success" value={summary.presentDays.toLocaleString("en-IN")} />
            <Metric label="Absent" tone="danger" value={summary.absentDays.toLocaleString("en-IN")} />
            <Metric label="Late" tone="warning" value={summary.lateDays.toLocaleString("en-IN")} />
            <Metric label="Half-day" tone="warning" value={summary.halfDayDays.toLocaleString("en-IN")} />
            <Metric label="Leave / Excused" tone="info" value={(summary.leaveDays + summary.excusedDays).toLocaleString("en-IN")} />
            <RecentTrend trend={trend} />
          </div>
        )}
      </div>
    </Card>
  );
}

function RecentTrend({ trend }: { trend: AttendanceTrendPoint[] }) {
  if (trend.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted p-3 sm:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Recent Trend</p>
        <p className="mt-3 text-sm text-foreground-muted">Recent trend appears after attendance is recorded across multiple dates.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3 sm:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Recent Trend</p>
      <div className="mt-3 grid gap-2">
        {trend.map((point) => (
          <div className="grid gap-1" key={point.date}>
            <div className="flex items-center justify-between gap-3 text-xs text-foreground-muted">
              <span>{formatDate(point.date)}</span>
              <span>{point.attendancePercentage}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface" role="img" aria-label={`${point.attendancePercentage}% attendance on ${formatDate(point.date)}`}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, point.attendancePercentage)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, tone, value }: { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral"; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-xl font-semibold text-foreground">{value}</p>
        <Badge tone={tone}>{label}</Badge>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`));
}
