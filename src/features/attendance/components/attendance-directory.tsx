"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Skeleton } from "@/components/shared/skeleton";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { AttendanceStatusBadge } from "@/features/attendance/components/attendance-status-badge";
import { getAttendanceStatusLabel } from "@/features/attendance/services/attendance-rules";
import { useAttendanceRecords } from "@/features/attendance/hooks/use-attendance";
import { attendanceStatuses, type AttendanceFilters, type AttendanceRecordSummary, type AttendanceSortBy, type AttendanceStatus, type AttendanceSummary } from "@/features/attendance/types/attendance";
import type { StudentAcademicPlacementOption } from "@/features/students/types/student";
import type { TenantScopedQuery } from "@/lib/api/client";
import type { Role } from "@/types/erp";

const pageSizeOptions = [10, 25, 50] as const;
const sortOptions: Array<{ label: string; value: AttendanceSortBy }> = [
  { label: "Student", value: "studentName" },
  { label: "Admission number", value: "admissionNumber" },
  { label: "Class", value: "className" },
  { label: "Status", value: "status" },
  { label: "Date", value: "date" },
  { label: "Updated", value: "updatedAt" },
];

export function AttendanceDirectory({
  context,
  placements,
  role,
  scope,
}: {
  context: { school: string; campus: string; academicYear: string };
  placements: StudentAcademicPlacementOption[];
  role: Role;
  scope: TenantScopedQuery;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const [refreshKey, setRefreshKey] = useState(0);
  const attendanceState = useAttendanceRecords(scope, filters, refreshKey);
  const classOptions = uniqueOptions(placements, "classId", "className");
  const sectionOptions = uniqueOptions(
    placements.filter((placement) => !filters.classId || placement.classId === filters.classId),
    "sectionId",
    "sectionName",
  );
  const data = attendanceState.status === "success" ? attendanceState.data : null;
  const hasActiveFilters = Boolean(filters.search || filters.status || filters.classId || filters.sectionId || filters.studentId);

  function updateFilters(nextFilters: Partial<AttendanceFilters>, options: { resetPage?: boolean } = { resetPage: true }) {
    const params = new URLSearchParams(searchParams.toString());
    const updates = { ...nextFilters };
    if (options.resetPage) updates.page = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === null) params.delete(key);
      else params.set(key, String(value));
    });

    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["search", "status", "classId", "sectionId", "studentId", "page"].forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Attendance"]} />}
        description="Track, review, and manage daily student attendance within the active tenant, campus, and academic year."
        eyebrow="Student Attendance"
        title="Attendance Directory"
        action={
          <div className="responsive-action-row">
            {hasPermission(role, "attendance.mark") ? (
              <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/attendance/mark?date=${filters.date ?? todayIsoDate()}${filters.classId ? `&classId=${encodeURIComponent(filters.classId)}` : ""}${filters.sectionId ? `&sectionId=${encodeURIComponent(filters.sectionId)}` : ""}`}>
                Mark Attendance
              </Link>
            ) : null}
            {hasPermission(role, "attendance.history.view") ? (
              <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/history">
                View History
              </Link>
            ) : null}
            {hasPermission(role, "attendance.report") ? (
              <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/reports">
                View Reports
              </Link>
            ) : null}
            <Button loading={attendanceState.status === "loading"} onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">
              Refresh
            </Button>
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

      <AttendanceSummaryCards loading={attendanceState.status === "loading"} summary={data?.summary} />

      <Card>
        <SectionHeader eyebrow="Daily view" title="Date & Filters" action={hasActiveFilters ? <Button onClick={clearFilters} variant="ghost">Clear filters</Button> : null} />
        <div className="grid gap-4 p-4 sm:p-5">
          <DateSelector date={filters.date ?? todayIsoDate()} onDateChange={(date) => updateFilters({ date })} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
            <Field label="Search">
              <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" onChange={(event) => updateFilters({ search: event.target.value || undefined })} placeholder="Student or admission no." type="search" value={filters.search ?? ""} />
            </Field>
            <Field label="Sort">
              <Select onChange={(event) => updateFilters({ sortBy: event.target.value as AttendanceSortBy })} value={filters.sortBy ?? "studentName"}>
                {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Records"
          title={data ? formatResultCount(data.page, data.pageSize, data.total) : "Attendance records"}
          action={
            <Field label="Direction">
              <Select onChange={(event) => updateFilters({ sortDirection: event.target.value as "asc" | "desc" })} value={filters.sortDirection ?? "asc"}>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </Select>
            </Field>
          }
        />
        {attendanceState.status === "loading" ? <AttendanceSkeleton /> : null}
        {attendanceState.status === "error" ? (
          <div className="p-4 sm:p-5">
            <EmptyState description="Please retry. If this continues, ask an administrator to review attendance access." title="Unable to load attendance" />
            <Button className="mt-4" onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">Retry</Button>
          </div>
        ) : null}
        {attendanceState.status === "success" ? (
          <>
            <AttendanceResults data={attendanceState.data.items} filtered={hasActiveFilters} onClearFilters={clearFilters} />
            <AttendancePagination
              onPageChange={(page) => updateFilters({ page }, { resetPage: false })}
              onPageSizeChange={(pageSize) => updateFilters({ page: 1, pageSize }, { resetPage: false })}
              page={filters.page ?? 1}
              pageSize={filters.pageSize ?? 10}
              total={attendanceState.data.total}
              totalPages={attendanceState.data.totalPages}
            />
          </>
        ) : null}
      </Card>
    </div>
  );
}

function AttendanceSummaryCards({ loading, summary }: { loading: boolean; summary?: AttendanceSummary }) {
  const metrics = [
    { label: "Present", value: summary?.presentDays ?? 0, tone: "success" },
    { label: "Absent", value: summary?.absentDays ?? 0, tone: "danger" },
    { label: "Late", value: summary?.lateDays ?? 0, tone: "warning" },
    { label: "Leave", value: summary?.leaveDays ?? 0, tone: "info" },
    { label: "Attendance Rate", value: `${summary?.attendancePercentage ?? 0}%`, tone: "neutral" },
  ] as const;

  return (
    <section aria-label="Attendance summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => (
        <Card className="p-4" key={metric.label}>
          {loading ? <Skeleton className="h-16 w-full" /> : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{metric.label}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold text-foreground">{typeof metric.value === "number" ? metric.value.toLocaleString("en-IN") : metric.value}</p>
                <Badge tone={metric.tone}>{metric.label}</Badge>
              </div>
            </>
          )}
        </Card>
      ))}
    </section>
  );
}

function DateSelector({ date, onDateChange }: { date: string; onDateChange: (date: string) => void }) {
  const today = todayIsoDate();
  const previous = shiftDate(date, -1);
  const next = shiftDate(date, 1);

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
      <Field helperText="Attendance can be reviewed or marked for today and past dates." label="Attendance date">
        <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" max={today} onChange={(event) => onDateChange(event.target.value)} type="date" value={date} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => onDateChange(previous)} variant="secondary">Previous</Button>
        <Button disabled={date >= today} onClick={() => onDateChange(next)} variant="secondary">Next</Button>
        <Button onClick={() => onDateChange(today)} variant="secondary">Today</Button>
      </div>
    </div>
  );
}

function AttendanceResults({ data, filtered, onClearFilters }: { data: AttendanceRecordSummary[]; filtered: boolean; onClearFilters: () => void }) {
  if (data.length === 0) {
    return (
      <div className="p-4 sm:p-5">
        <EmptyState description={filtered ? "Try changing the date, class, section, or status filters." : "Attendance records will appear here once teachers mark attendance."} title={filtered ? "No records match your filters" : "No attendance records"} />
        {filtered ? <Button className="mt-4" onClick={onClearFilters} variant="secondary">Clear filters</Button> : null}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 p-3 sm:hidden">
        {data.map((record) => <AttendanceMobileCard key={record.id} record={record} />)}
      </div>
      <div className="responsive-table-wrap hidden sm:block">
        <table className="responsive-table text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-semibold sm:px-5">Student</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Admission</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Class / Section</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Status</th>
              <th className="hidden px-4 py-3 font-semibold lg:table-cell sm:px-5">Check-in</th>
              <th className="hidden px-4 py-3 font-semibold xl:table-cell sm:px-5">Remarks</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Updated</th>
              <th className="px-4 py-3 text-right font-semibold sm:px-5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((record) => (
              <tr className="hover:bg-surface-muted" key={record.id}>
                <td className="px-4 py-4 sm:px-5"><StudentCell record={record} /></td>
                <td className="px-4 py-4 font-mono text-xs sm:px-5">{record.admissionNumber}</td>
                <td className="px-4 py-4 sm:px-5">{record.className} / Section {record.sectionName}</td>
                <td className="px-4 py-4 sm:px-5"><AttendanceStatusBadge status={record.status} /></td>
                <td className="hidden px-4 py-4 text-foreground-muted lg:table-cell sm:px-5">{record.checkInTime ?? "Not marked"}</td>
                <td className="hidden max-w-xs px-4 py-4 text-foreground-muted xl:table-cell sm:px-5">{record.remarks ?? "No remarks"}</td>
                <td className="px-4 py-4 text-foreground-muted sm:px-5">{formatDateTime(record.updatedAt ?? record.markedAt)}</td>
                <td className="px-4 py-4 text-right sm:px-5">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link className="text-sm font-medium text-primary hover:underline" href={`/attendance/history/${encodeURIComponent(record.id)}`}>History</Link>
                    <Link className="text-sm font-medium text-primary hover:underline" href={`/students/${encodeURIComponent(record.studentId)}`}>Student</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AttendanceMobileCard({ record }: { record: AttendanceRecordSummary }) {
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <StudentCell record={record} />
        <AttendanceStatusBadge status={record.status} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Class / Section</dt><dd className="mt-1">{record.className} / Section {record.sectionName}</dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Check-in</dt><dd className="mt-1">{record.checkInTime ?? "Not marked"}</dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Remarks</dt><dd className="mt-1">{record.remarks ?? "No remarks"}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/attendance/history/${encodeURIComponent(record.id)}`}>History</Link>
        <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/students/${encodeURIComponent(record.studentId)}`}>View Student</Link>
      </div>
    </article>
  );
}

function StudentCell({ record }: { record: AttendanceRecordSummary }) {
  return (
    <div className="min-w-0">
      <p className="responsive-text font-medium text-foreground">{record.studentName}</p>
      <p className="mt-1 text-xs text-foreground-muted">{record.rollNumber ? `Roll ${record.rollNumber}` : record.studentCode ?? "Student record"}</p>
    </div>
  );
}

function AttendancePagination({ onPageChange, onPageSizeChange, page, pageSize, total, totalPages }: { onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void; page: number; pageSize: number; total: number; totalPages: number }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="responsive-text">Page {page} of {totalPages} / {total.toLocaleString("en-IN")} records</span>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Select aria-label="Records per page" className="col-span-2 sm:col-span-1" onChange={(event) => onPageSizeChange(Number(event.target.value))} value={pageSize}>
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option} per page</option>)}
        </Select>
        <Button disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} variant="secondary">Previous</Button>
        <Button disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} variant="secondary">Next</Button>
      </div>
    </div>
  );
}

function AttendanceSkeleton() {
  return (
    <div className="grid gap-3 p-3 sm:p-5">
      {[0, 1, 2, 3].map((item) => <Skeleton className="h-16 w-full" key={item} />)}
    </div>
  );
}

function filtersFromSearchParams(searchParams: URLSearchParams): AttendanceFilters {
  const status = searchParams.get("status");
  const sortBy = searchParams.get("sortBy");
  const sortDirection = searchParams.get("sortDirection");
  const date = searchParams.get("date");

  return {
    date: isIsoDate(date) ? date : todayIsoDate(),
    search: searchParams.get("search") ?? undefined,
    classId: searchParams.get("classId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    studentId: searchParams.get("studentId") ?? undefined,
    status: isAttendanceStatus(status) ? status : undefined,
    page: toPositiveInt(searchParams.get("page"), 1),
    pageSize: toPageSize(searchParams.get("pageSize")),
    sortBy: isAttendanceSortBy(sortBy) ? sortBy : "studentName",
    sortDirection: sortDirection === "desc" ? "desc" : "asc",
  };
}

function uniqueOptions<T extends Record<string, string>>(items: T[], valueKey: keyof T, labelKey: keyof T) {
  const options = new Map<string, string>();
  items.forEach((item) => options.set(item[valueKey], item[labelKey]));
  return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
}

function isAttendanceStatus(value: string | null): value is AttendanceStatus {
  return Boolean(value && attendanceStatuses.includes(value as AttendanceStatus));
}

function isAttendanceSortBy(value: string | null): value is AttendanceSortBy {
  return Boolean(value && sortOptions.some((option) => option.value === value));
}

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toPageSize(value: string | null) {
  const parsed = Number(value);
  return pageSizeOptions.some((option) => option === parsed) ? parsed : 10;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(date: string, offset: number) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + offset);
  return parsed.toISOString().slice(0, 10);
}

function formatDateTime(value?: string) {
  if (!value) return "Not updated";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatResultCount(page: number, pageSize: number, total: number) {
  if (total === 0) return "No attendance records";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return `Showing ${start.toLocaleString("en-IN")}-${end.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} records`;
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span>
    </div>
  );
}
