"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Skeleton } from "@/components/shared/skeleton";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { AttendanceStatusBadge } from "@/features/attendance/components/attendance-status-badge";
import { getAttendanceStatusLabel } from "@/features/attendance/services/attendance-rules";
import { getRiskLabel, getRiskTone } from "@/features/attendance/services/attendance-report-rules";
import { useAttendanceReports } from "@/features/attendance/hooks/use-attendance-reports";
import { attendanceStatuses, type AttendanceStatus } from "@/features/attendance/types/attendance";
import type {
  AttendanceReportDashboard as AttendanceReportDashboardModel,
  AttendanceReportFilters,
  AttendanceReportSortBy,
  ClassAttendanceReport,
  LowAttendanceStudent,
  SectionAttendanceReport,
  StudentAttendanceReport,
} from "@/features/attendance/types/attendance-report";
import type { StudentAcademicPlacementOption, StudentSummary } from "@/features/students/types/student";
import type { TenantScopedQuery } from "@/lib/api/client";

const pageSizeOptions = [10, 25, 50] as const;

export function AttendanceReportDashboard({
  context,
  placements,
  scope,
  studentOptions,
}: {
  context: { school: string; campus: string; academicYear: string };
  placements: StudentAcademicPlacementOption[];
  scope: TenantScopedQuery;
  studentOptions: StudentSummary[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const [refreshKey, setRefreshKey] = useState(0);
  const reportsState = useAttendanceReports(scope, filters, refreshKey);
  const classOptions = uniqueOptions(placements, "classId", "className");
  const sectionOptions = uniqueOptions(placements.filter((placement) => !filters.classId || placement.classId === filters.classId), "sectionId", "sectionName");
  const hasActiveFilters = Boolean(filters.studentId || filters.classId || filters.sectionId || filters.status || filters.correctedOnly || filters.dateFrom || filters.dateTo);

  function updateFilters(nextFilters: Partial<AttendanceReportFilters>, options: { resetPage?: boolean } = { resetPage: true }) {
    const params = new URLSearchParams(searchParams.toString());
    const updates = { ...nextFilters };
    if (options.resetPage) updates.page = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === null || value === false) params.delete(key);
      else params.set(key, String(value));
    });

    router.push(`${pathname}?${params.toString()}`);
  }

  function applyPreset(preset: "today" | "yesterday" | "week" | "month" | "last-month") {
    const range = getPresetRange(preset);
    updateFilters({ dateFrom: range.dateFrom, dateTo: range.dateTo });
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Attendance", "Reports"]} />}
        description="Analyze attendance across students, classes, sections, corrections, and date ranges."
        eyebrow="Attendance Analytics"
        title="Attendance Reports"
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance">
              Attendance
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/history">
              History
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/attendance/export?${searchParams.toString()}`}>
              Export
            </Link>
            <Button loading={reportsState.status === "loading"} onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">Refresh</Button>
          </div>
        }
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="grid gap-2 text-sm">
            <ContextLine label="School" value={context.school} />
            <ContextLine label="Campus" value={context.campus} />
            <ContextLine label="Academic Year" value={context.academicYear} />
          </div>
        </Card>
      </PageHeader>

      <Card>
        <SectionHeader eyebrow="Report filters" title="Scope & Date Range" action={hasActiveFilters ? <Button onClick={() => router.push(pathname)} variant="ghost">Clear filters</Button> : null} />
        <div className="grid gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => applyPreset("today")} variant="secondary">Today</Button>
            <Button onClick={() => applyPreset("yesterday")} variant="secondary">Yesterday</Button>
            <Button onClick={() => applyPreset("week")} variant="secondary">This week</Button>
            <Button onClick={() => applyPreset("month")} variant="secondary">This month</Button>
            <Button onClick={() => applyPreset("last-month")} variant="secondary">Last month</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Field label="Date from">
              <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" max={todayIsoDate()} onChange={(event) => updateFilters({ dateFrom: event.target.value || undefined })} type="date" value={filters.dateFrom ?? ""} />
            </Field>
            <Field label="Date to">
              <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" max={todayIsoDate()} onChange={(event) => updateFilters({ dateTo: event.target.value || undefined })} type="date" value={filters.dateTo ?? ""} />
            </Field>
            <Field label="Student">
              <Select onChange={(event) => updateFilters({ studentId: event.target.value || undefined })} value={filters.studentId ?? ""}>
                <option value="">All students</option>
                {studentOptions.map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Class">
              <Select onChange={(event) => updateFilters({ classId: event.target.value || undefined, sectionId: undefined })} value={filters.classId ?? ""}>
                <option value="">All classes</option>
                {classOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
            <Field label="Section">
              <Select onChange={(event) => updateFilters({ sectionId: event.target.value || undefined })} value={filters.sectionId ?? ""}>
                <option value="">All sections</option>
                {sectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select onChange={(event) => updateFilters({ status: event.target.value ? event.target.value as AttendanceStatus : undefined })} value={filters.status ?? ""}>
                <option value="">All statuses</option>
                {attendanceStatuses.map((status) => <option key={status} value={status}>{getAttendanceStatusLabel(status)}</option>)}
              </Select>
            </Field>
            <Field label="Corrections">
              <Select onChange={(event) => updateFilters({ correctedOnly: event.target.value === "true" ? true : undefined })} value={filters.correctedOnly ? "true" : ""}>
                <option value="">All records</option>
                <option value="true">Corrected only</option>
              </Select>
            </Field>
            <Field helperText="Used for attention indicators." label="Attendance threshold">
              <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" max={100} min={1} onChange={(event) => updateFilters({ attendanceThreshold: Number(event.target.value) || undefined })} type="number" value={filters.attendanceThreshold ?? 75} />
            </Field>
            <Field label="Sort students">
              <Select onChange={(event) => updateFilters({ sortBy: event.target.value as AttendanceReportSortBy })} value={filters.sortBy ?? "attendancePercentage"}>
                <option value="attendancePercentage">Attendance %</option>
                <option value="studentName">Student name</option>
                <option value="absentDays">Absent days</option>
                <option value="lateDays">Late days</option>
              </Select>
            </Field>
            <Field label="Direction">
              <Select onChange={(event) => updateFilters({ sortDirection: event.target.value as "asc" | "desc" })} value={filters.sortDirection ?? "asc"}>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      {reportsState.status === "loading" ? <ReportSkeleton /> : null}
      {reportsState.status === "error" ? (
        <Card className="p-4 sm:p-5">
          <EmptyState description="Please review filters and retry. If this continues, ask an administrator to review report access." title="Unable to load attendance reports" />
          <Button className="mt-4" onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">Retry</Button>
        </Card>
      ) : null}
      {reportsState.status === "success" ? <ReportContent data={reportsState.data} filters={filters} onPageChange={(page) => updateFilters({ page }, { resetPage: false })} onPageSizeChange={(pageSize) => updateFilters({ page: 1, pageSize }, { resetPage: false })} /> : null}
    </div>
  );
}

function ReportContent({ data, filters, onPageChange, onPageSizeChange }: { data: AttendanceReportDashboardModel; filters: AttendanceReportFilters; onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void }) {
  if (data.summary.totalAttendanceRecords === 0) {
    return <Card className="p-4 sm:p-5"><EmptyState description="No attendance records match the selected reporting filters." title="No report data" /></Card>;
  }

  return (
    <>
      <SummaryCards data={data} />
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AttendanceTrend data={data} />
        <StatusDistribution data={data} />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <ClassPerformance items={data.classReports.items} />
        <SectionPerformance items={data.sectionReports.items} />
      </section>
      <LowAttendanceStudents items={data.lowAttendanceStudents} />
      <StudentReports data={data.studentReports} filters={filters} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
      <CorrectionMetrics data={data} />
    </>
  );
}

function SummaryCards({ data }: { data: AttendanceReportDashboardModel }) {
  const metrics = [
    { label: "Overall Attendance", value: `${data.summary.attendancePercentage}%`, context: `${data.summary.totalAttendanceRecords} records`, tone: "success" },
    { label: "Present", value: data.summary.presentCount.toLocaleString("en-IN"), context: "Present records", tone: "success" },
    { label: "Absent", value: data.summary.absentCount.toLocaleString("en-IN"), context: `${data.summary.absencePercentage}% absence`, tone: "danger" },
    { label: "Late", value: data.summary.lateCount.toLocaleString("en-IN"), context: `${data.summary.latePercentage}% late`, tone: "warning" },
    { label: "Leave", value: (data.summary.leaveCount + data.summary.excusedCount + data.summary.halfDayCount).toLocaleString("en-IN"), context: "Leave, excused, half-day", tone: "info" },
    { label: "Students Tracked", value: data.summary.totalStudents.toLocaleString("en-IN"), context: "Current filter scope", tone: "neutral" },
    { label: "Corrected Records", value: data.summary.correctedRecordCount.toLocaleString("en-IN"), context: `${data.summary.correctedRecordPercentage}% corrected`, tone: "warning" },
  ] as const;

  return (
    <section aria-label="Attendance report summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card className="p-4" key={metric.label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{metric.label}</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{metric.value}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-foreground-muted">{metric.context}</p>
            <Badge tone={metric.tone}>{metric.label}</Badge>
          </div>
        </Card>
      ))}
    </section>
  );
}

function AttendanceTrend({ data }: { data: AttendanceReportDashboardModel }) {
  return (
    <Card>
      <SectionHeader eyebrow="Trend" title="Attendance Trend" />
      <div className="grid gap-3 p-4 sm:p-5" aria-label="Attendance trend by date">
        {data.trend.length === 0 ? <EmptyState description="No daily attendance records are available for this range." title="No trend data" /> : data.trend.map((point) => (
          <div className="grid gap-2" key={point.date}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{formatDate(point.date)}</span>
              <span className="text-foreground-muted">{point.attendancePercentage}% attendance</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`${point.attendancePercentage}% attendance on ${formatDate(point.date)}`}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, point.attendancePercentage)}%` }} />
            </div>
            <p className="text-xs text-foreground-muted">Present {point.presentCount} / Absent {point.absentCount} / Late {point.lateCount}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatusDistribution({ data }: { data: AttendanceReportDashboardModel }) {
  return (
    <Card>
      <SectionHeader eyebrow="Distribution" title="Status Distribution" />
      <div className="grid gap-3 p-4 sm:p-5">
        {data.statusDistribution.map((item) => (
          <div className="grid gap-2" key={item.status}>
            <div className="flex items-center justify-between gap-3">
              <AttendanceStatusBadge status={item.status} />
              <span className="text-sm text-foreground-muted">{item.count.toLocaleString("en-IN")} / {item.percentage}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`${getAttendanceStatusLabel(item.status)} ${item.percentage}%`}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, item.percentage)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ClassPerformance({ items }: { items: ClassAttendanceReport[] }) {
  return (
    <Card>
      <SectionHeader eyebrow="Classes" title="Class Performance" />
      <PerformanceList items={items} getKey={(item) => item.classId} getLabel={(item) => item.className} />
    </Card>
  );
}

function SectionPerformance({ items }: { items: SectionAttendanceReport[] }) {
  return (
    <Card>
      <SectionHeader eyebrow="Sections" title="Section Performance" />
      <PerformanceList items={items} getKey={(item) => `${item.classId}:${item.sectionId}`} getLabel={(item) => `${item.className} / Section ${item.sectionName}`} />
    </Card>
  );
}

function PerformanceList<T extends ClassAttendanceReport | SectionAttendanceReport>({ items, getKey, getLabel }: { items: T[]; getKey: (item: T) => string; getLabel: (item: T) => string }) {
  if (items.length === 0) return <div className="p-4 sm:p-5"><EmptyState description="No class or section report data matches the selected filters." title="No performance data" /></div>;
  return (
    <div className="grid gap-3 p-4 sm:p-5">
      {items.map((item) => (
        <article className="rounded-lg border border-border bg-surface-muted p-3" key={getKey(item)}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">{getLabel(item)}</p>
              <p className="mt-1 text-sm text-foreground-muted">{item.totalStudents} student{item.totalStudents === 1 ? "" : "s"} tracked</p>
            </div>
            <Badge tone={item.attendancePercentage >= 75 ? "success" : "warning"}>{item.attendancePercentage}%</Badge>
          </div>
          <p className="mt-3 text-sm text-foreground-muted">Present {item.presentCount} / Absent {item.absentCount} / Late {item.lateCount} / Leave {item.leaveCount}</p>
          {item.correctedCount ? <p className="mt-1 text-xs text-foreground-muted">{item.correctedCount} corrected record{item.correctedCount === 1 ? "" : "s"}</p> : null}
        </article>
      ))}
    </div>
  );
}

function LowAttendanceStudents({ items }: { items: LowAttendanceStudent[] }) {
  return (
    <Card>
      <SectionHeader eyebrow="Attention" title="Students Requiring Attention" />
      <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
        {items.length === 0 ? <EmptyState description="No students are below the selected attendance threshold." title="No threshold exceptions" /> : items.map((student) => (
          <article className="rounded-lg border border-border bg-surface-muted p-3" key={student.studentId}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link className="font-semibold text-foreground hover:underline" href={`/students/${encodeURIComponent(student.studentId)}`}>{student.studentName}</Link>
                <p className="mt-1 font-mono text-xs text-foreground-muted">{student.admissionNumber}</p>
                <p className="mt-1 text-sm text-foreground-muted">{student.className} / Section {student.sectionName}</p>
              </div>
              <Badge tone={getRiskTone(student.riskLevel)}>{getRiskLabel(student.riskLevel)}</Badge>
            </div>
            <p className="mt-3 text-sm text-foreground-muted">{student.attendancePercentage}% attendance against {student.threshold}% threshold.</p>
            <p className="mt-1 text-xs text-foreground-muted">Absent {student.absentDays} / {student.totalDays} tracked days</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

function StudentReports({ data, filters, onPageChange, onPageSizeChange }: { data: AttendanceReportDashboardModel["studentReports"]; filters: AttendanceReportFilters; onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void }) {
  return (
    <Card>
      <SectionHeader eyebrow="Students" title="Student Attendance Report" />
      {data.items.length === 0 ? <div className="p-4 sm:p-5"><EmptyState description="No student attendance rows match the selected filters." title="No student report data" /></div> : (
        <>
          <div className="responsive-table-wrap hidden sm:block">
            <table className="responsive-table text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold sm:px-5">Student</th>
                  <th className="px-4 py-3 font-semibold sm:px-5">Class / Section</th>
                  <th className="px-4 py-3 font-semibold sm:px-5">Attendance</th>
                  <th className="px-4 py-3 font-semibold sm:px-5">Absent</th>
                  <th className="px-4 py-3 font-semibold sm:px-5">Late</th>
                  <th className="px-4 py-3 font-semibold sm:px-5">Risk</th>
                  <th className="px-4 py-3 text-right font-semibold sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((student) => <StudentReportRow key={student.studentId} student={student} />)}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-3 sm:hidden">
            {data.items.map((student) => <StudentReportCard key={student.studentId} student={student} />)}
          </div>
          <Pagination data={data} filters={filters} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
        </>
      )}
    </Card>
  );
}

function StudentReportRow({ student }: { student: StudentAttendanceReport }) {
  return (
    <tr className="hover:bg-surface-muted">
      <td className="px-4 py-4 sm:px-5"><p className="font-medium text-foreground">{student.studentName}</p><p className="mt-1 font-mono text-xs text-foreground-muted">{student.admissionNumber}</p></td>
      <td className="px-4 py-4 sm:px-5">{student.className} / Section {student.sectionName}</td>
      <td className="px-4 py-4 sm:px-5">{student.attendancePercentage}% / {student.totalDays} days</td>
      <td className="px-4 py-4 sm:px-5">{student.absentDays}</td>
      <td className="px-4 py-4 sm:px-5">{student.lateDays}</td>
      <td className="px-4 py-4 sm:px-5"><Badge tone={getRiskTone(student.riskLevel)}>{getRiskLabel(student.riskLevel)}</Badge></td>
      <td className="px-4 py-4 text-right sm:px-5"><Link className="text-sm font-medium text-primary hover:underline" href={`/students/${encodeURIComponent(student.studentId)}`}>View Student</Link></td>
    </tr>
  );
}

function StudentReportCard({ student }: { student: StudentAttendanceReport }) {
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{student.studentName}</p>
          <p className="mt-1 font-mono text-xs text-foreground-muted">{student.admissionNumber}</p>
        </div>
        <Badge tone={getRiskTone(student.riskLevel)}>{getRiskLabel(student.riskLevel)}</Badge>
      </div>
      <p className="mt-3 text-sm text-foreground-muted">{student.className} / Section {student.sectionName}</p>
      <p className="mt-1 text-sm text-foreground-muted">{student.attendancePercentage}% attendance / {student.absentDays} absent / {student.lateDays} late</p>
      <Link className="mt-4 inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/students/${encodeURIComponent(student.studentId)}`}>View Student</Link>
    </article>
  );
}

function CorrectionMetrics({ data }: { data: AttendanceReportDashboardModel }) {
  return (
    <Card>
      <SectionHeader eyebrow="Corrections" title="Correction Metrics" />
      <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-3">
        <Metric label="Corrected Records" value={data.correctionMetrics.correctedRecordCount.toLocaleString("en-IN")} tone="warning" />
        <Metric label="Correction Events" value={data.correctionMetrics.correctionEventCount.toLocaleString("en-IN")} tone="info" />
        <Metric label="Corrected Share" value={`${data.correctionMetrics.correctedRecordPercentage}%`} tone="neutral" />
      </div>
    </Card>
  );
}

function Metric({ label, tone, value }: { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral"; value: string }) {
  return <div className="rounded-lg border border-border bg-surface-muted p-3"><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p><p className="mt-3 text-xl font-semibold text-foreground">{value}</p><Badge tone={tone}>{label}</Badge></div>;
}

function Pagination({ data, filters, onPageChange, onPageSizeChange }: { data: AttendanceReportDashboardModel["studentReports"]; filters: AttendanceReportFilters; onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="responsive-text">Page {data.page} of {data.totalPages} / {data.total.toLocaleString("en-IN")} students</span>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Select aria-label="Students per report page" className="col-span-2 sm:col-span-1" onChange={(event) => onPageSizeChange(Number(event.target.value))} value={filters.pageSize ?? data.pageSize}>
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option} per page</option>)}
        </Select>
        <Button disabled={data.page <= 1} onClick={() => onPageChange(Math.max(1, data.page - 1))} variant="secondary">Previous</Button>
        <Button disabled={data.page >= data.totalPages} onClick={() => onPageChange(Math.min(data.totalPages, data.page + 1))} variant="secondary">Next</Button>
      </div>
    </div>
  );
}

function ReportSkeleton() {
  return <div className="grid gap-4">{[0, 1, 2, 3].map((item) => <Skeleton className="h-40 w-full" key={item} />)}</div>;
}

function filtersFromSearchParams(searchParams: URLSearchParams): AttendanceReportFilters {
  const status = searchParams.get("status");
  const sortBy = searchParams.get("sortBy");
  const sortDirection = searchParams.get("sortDirection");
  return {
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    studentId: searchParams.get("studentId") ?? undefined,
    classId: searchParams.get("classId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    status: isAttendanceStatus(status) ? status : undefined,
    correctedOnly: searchParams.get("correctedOnly") === "true",
    attendanceThreshold: toThreshold(searchParams.get("attendanceThreshold")),
    page: toPositiveInt(searchParams.get("page"), 1),
    pageSize: toPageSize(searchParams.get("pageSize")),
    sortBy: isReportSortBy(sortBy) ? sortBy : "attendancePercentage",
    sortDirection: sortDirection === "desc" ? "desc" : "asc",
  };
}

function getPresetRange(preset: "today" | "yesterday" | "week" | "month" | "last-month") {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);
  if (preset === "yesterday") {
    start.setDate(today.getDate() - 1);
    end.setDate(today.getDate() - 1);
  }
  if (preset === "week") start.setDate(today.getDate() - 6);
  if (preset === "month") start.setDate(1);
  if (preset === "last-month") {
    start.setMonth(today.getMonth() - 1, 1);
    end.setDate(0);
  }
  return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
}

function uniqueOptions<T extends Record<string, string>>(items: T[], valueKey: keyof T, labelKey: keyof T) {
  const options = new Map<string, string>();
  items.forEach((item) => options.set(item[valueKey], item[labelKey]));
  return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
}

function isAttendanceStatus(value: string | null): value is AttendanceStatus {
  return Boolean(value && attendanceStatuses.includes(value as AttendanceStatus));
}

function isReportSortBy(value: string | null): value is AttendanceReportSortBy {
  return Boolean(value && ["studentName", "attendancePercentage", "absentDays", "lateDays", "className", "sectionName"].includes(value));
}

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toPageSize(value: string | null) {
  const parsed = Number(value);
  return pageSizeOptions.some((option) => option === parsed) ? parsed : 10;
}

function toThreshold(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : 75;
}

function todayIsoDate() {
  return toIsoDate(new Date());
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 text-sm min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center"><span className="text-foreground-muted">{label}</span><span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span></div>;
}
