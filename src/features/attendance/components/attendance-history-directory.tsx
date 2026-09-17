"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Skeleton } from "@/components/shared/skeleton";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { AttendanceStatusBadge } from "@/features/attendance/components/attendance-status-badge";
import { getAttendanceStatusLabel } from "@/features/attendance/services/attendance-rules";
import { useAttendanceHistory } from "@/features/attendance/hooks/use-attendance";
import { attendanceStatuses, type AttendanceHistoryFilters, type AttendanceHistoryRecord, type AttendanceSortBy, type AttendanceStatus } from "@/features/attendance/types/attendance";
import type { StudentAcademicPlacementOption } from "@/features/students/types/student";
import type { TenantScopedQuery } from "@/lib/api/client";

const pageSizeOptions = [10, 25, 50] as const;

export function AttendanceHistoryDirectory({
  context,
  placements,
  scope,
}: {
  context: { school: string; campus: string; academicYear: string };
  placements: StudentAcademicPlacementOption[];
  scope: TenantScopedQuery;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const [refreshKey, setRefreshKey] = useState(0);
  const historyState = useAttendanceHistory(scope, filters, refreshKey);
  const classOptions = uniqueOptions(placements, "classId", "className");
  const sectionOptions = uniqueOptions(placements.filter((placement) => !filters.classId || placement.classId === filters.classId), "sectionId", "sectionName");
  const hasActiveFilters = Boolean(filters.search || filters.status || filters.classId || filters.sectionId || filters.studentId || filters.dateFrom || filters.dateTo || filters.correctedOnly || filters.admissionNumber);
  const data = historyState.status === "success" ? historyState.data : null;

  function updateFilters(nextFilters: Partial<AttendanceHistoryFilters>, options: { resetPage?: boolean } = { resetPage: true }) {
    const params = new URLSearchParams(searchParams.toString());
    const updates = { ...nextFilters };
    if (options.resetPage) updates.page = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === null || value === false) params.delete(key);
      else params.set(key, String(value));
    });

    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    router.push(pathname);
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Attendance", "History"]} />}
        description="Review historical student attendance, identify corrected records, and open audit-ready correction timelines."
        eyebrow="Attendance History"
        title="Attendance History"
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance">
              Attendance Directory
            </Link>
            <Button loading={historyState.status === "loading"} onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">Refresh</Button>
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

      <section aria-label="Attendance history summary" className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="History Records" loading={historyState.status === "loading"} tone="neutral" value={data?.total ?? 0} />
        <SummaryCard label="Corrected Records" loading={historyState.status === "loading"} tone="warning" value={data?.correctedCount ?? 0} />
        <SummaryCard label="Correction Events" loading={historyState.status === "loading"} tone="info" value={data?.correctionCount ?? 0} />
      </section>

      <Card>
        <SectionHeader eyebrow="History filters" title="Search & Filters" action={hasActiveFilters ? <Button onClick={clearFilters} variant="ghost">Clear filters</Button> : null} />
        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-6">
          <Field label="Search">
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" onChange={(event) => updateFilters({ search: event.target.value || undefined })} placeholder="Student name" type="search" value={filters.search ?? ""} />
          </Field>
          <Field label="Admission number">
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" onChange={(event) => updateFilters({ admissionNumber: event.target.value || undefined })} placeholder="SPS-2026" value={filters.admissionNumber ?? ""} />
          </Field>
          <Field label="From date">
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" max={todayIsoDate()} onChange={(event) => updateFilters({ dateFrom: event.target.value || undefined })} type="date" value={filters.dateFrom ?? ""} />
          </Field>
          <Field label="To date">
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" max={todayIsoDate()} onChange={(event) => updateFilters({ dateTo: event.target.value || undefined })} type="date" value={filters.dateTo ?? ""} />
          </Field>
          <Field label="Status">
            <Select onChange={(event) => updateFilters({ status: event.target.value ? event.target.value as AttendanceStatus : undefined })} value={filters.status ?? ""}>
              <option value="">All statuses</option>
              {attendanceStatuses.map((status) => <option key={status} value={status}>{getAttendanceStatusLabel(status)}</option>)}
            </Select>
          </Field>
          <Field label="Correction state">
            <Select onChange={(event) => updateFilters({ correctedOnly: event.target.value === "true" ? true : undefined })} value={filters.correctedOnly ? "true" : ""}>
              <option value="">All records</option>
              <option value="true">Corrected only</option>
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
          <Field label="Sort">
            <Select onChange={(event) => updateFilters({ sortBy: event.target.value as AttendanceSortBy })} value={filters.sortBy ?? "date"}>
              <option value="date">Date</option>
              <option value="studentName">Student</option>
              <option value="admissionNumber">Admission number</option>
              <option value="className">Class</option>
              <option value="status">Status</option>
              <option value="updatedAt">Last modified</option>
            </Select>
          </Field>
          <Field label="Direction">
            <Select onChange={(event) => updateFilters({ sortDirection: event.target.value as "asc" | "desc" })} value={filters.sortDirection ?? "desc"}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Results" title={data ? formatResultCount(data.page, data.pageSize, data.total) : "Attendance history"} />
        {historyState.status === "loading" ? <HistorySkeleton /> : null}
        {historyState.status === "error" ? (
          <div className="p-4 sm:p-5">
            <EmptyState description="Please retry. If this continues, ask an administrator to review your attendance history access." title="Unable to load history" />
            <Button className="mt-4" onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">Retry</Button>
          </div>
        ) : null}
        {historyState.status === "success" ? (
          <>
            <HistoryResults data={historyState.data.items} filtered={hasActiveFilters} onClearFilters={clearFilters} />
            <Pagination
              onPageChange={(page) => updateFilters({ page }, { resetPage: false })}
              onPageSizeChange={(pageSize) => updateFilters({ page: 1, pageSize }, { resetPage: false })}
              page={filters.page ?? 1}
              pageSize={filters.pageSize ?? 10}
              total={historyState.data.total}
              totalPages={historyState.data.totalPages}
            />
          </>
        ) : null}
      </Card>
    </div>
  );
}

function HistoryResults({ data, filtered, onClearFilters }: { data: AttendanceHistoryRecord[]; filtered: boolean; onClearFilters: () => void }) {
  if (data.length === 0) {
    return (
      <div className="p-4 sm:p-5">
        <EmptyState description={filtered ? "Try adjusting the history filters." : "Attendance history will appear after attendance is marked."} title={filtered ? "No history matches your filters" : "No attendance history"} />
        {filtered ? <Button className="mt-4" onClick={onClearFilters} variant="secondary">Clear filters</Button> : null}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 p-3 sm:hidden">
        {data.map((record) => <HistoryMobileCard key={record.id} record={record} />)}
      </div>
      <div className="responsive-table-wrap hidden sm:block">
        <table className="responsive-table text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-semibold sm:px-5">Student</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Admission No.</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Class / Section</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Date</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Status</th>
              <th className="hidden px-4 py-3 font-semibold lg:table-cell sm:px-5">Marked</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Corrected</th>
              <th className="hidden px-4 py-3 font-semibold xl:table-cell sm:px-5">Last Modified</th>
              <th className="px-4 py-3 text-right font-semibold sm:px-5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((record) => (
              <tr className="hover:bg-surface-muted" key={record.id}>
                <td className="px-4 py-4 sm:px-5"><StudentCell record={record} /></td>
                <td className="px-4 py-4 font-mono text-xs sm:px-5">{record.admissionNumber}</td>
                <td className="px-4 py-4 sm:px-5">{record.className} / Section {record.sectionName}</td>
                <td className="px-4 py-4 sm:px-5">{formatDate(record.attendanceDate)}</td>
                <td className="px-4 py-4 sm:px-5"><AttendanceStatusBadge status={record.currentStatus} /></td>
                <td className="hidden px-4 py-4 text-foreground-muted lg:table-cell sm:px-5">{record.markedBy ?? "Unknown"}<br />{formatDateTime(record.markedAt)}</td>
                <td className="px-4 py-4 sm:px-5"><CorrectionBadge record={record} /></td>
                <td className="hidden px-4 py-4 text-foreground-muted xl:table-cell sm:px-5">{formatDateTime(record.lastModifiedAt)}</td>
                <td className="px-4 py-4 text-right sm:px-5"><Link className="text-sm font-medium text-primary hover:underline" href={`/attendance/history/${encodeURIComponent(record.id)}`}>View Details</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function HistoryMobileCard({ record }: { record: AttendanceHistoryRecord }) {
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <StudentCell record={record} />
        <AttendanceStatusBadge status={record.currentStatus} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Date</dt><dd className="mt-1">{formatDate(record.attendanceDate)}</dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Class / Section</dt><dd className="mt-1">{record.className} / Section {record.sectionName}</dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Correction</dt><dd className="mt-1"><CorrectionBadge record={record} /></dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Last modified</dt><dd className="mt-1">{formatDateTime(record.lastModifiedAt)}</dd></div>
      </dl>
      <Link className="mt-4 inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/attendance/history/${encodeURIComponent(record.id)}`}>View Details</Link>
    </article>
  );
}

function CorrectionBadge({ record }: { record: AttendanceHistoryRecord }) {
  if (!record.isCorrected) return <Badge tone="neutral">Original</Badge>;
  return <Badge tone="warning">Corrected: {getAttendanceStatusLabel(record.originalStatus)} to {getAttendanceStatusLabel(record.currentStatus)}</Badge>;
}

function StudentCell({ record }: { record: AttendanceHistoryRecord }) {
  return (
    <div className="min-w-0">
      <p className="responsive-text font-medium text-foreground">{record.studentName}</p>
      <p className="mt-1 text-xs text-foreground-muted">{record.rollNumber ? `Roll ${record.rollNumber}` : record.studentCode ?? "Student record"}</p>
    </div>
  );
}

function SummaryCard({ label, loading, tone, value }: { label: string; loading: boolean; tone: "success" | "warning" | "danger" | "info" | "neutral"; value: number }) {
  return (
    <Card className="p-4">
      {loading ? <Skeleton className="h-16 w-full" /> : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-2xl font-semibold text-foreground">{value.toLocaleString("en-IN")}</p>
            <Badge tone={tone}>{label}</Badge>
          </div>
        </>
      )}
    </Card>
  );
}

function Pagination({ onPageChange, onPageSizeChange, page, pageSize, total, totalPages }: { onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void; page: number; pageSize: number; total: number; totalPages: number }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="responsive-text">Page {page} of {totalPages} / {total.toLocaleString("en-IN")} history records</span>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Select aria-label="History records per page" className="col-span-2 sm:col-span-1" onChange={(event) => onPageSizeChange(Number(event.target.value))} value={pageSize}>
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option} per page</option>)}
        </Select>
        <Button disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} variant="secondary">Previous</Button>
        <Button disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} variant="secondary">Next</Button>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return <div className="grid gap-3 p-3 sm:p-5">{[0, 1, 2, 3].map((item) => <Skeleton className="h-16 w-full" key={item} />)}</div>;
}

function filtersFromSearchParams(searchParams: URLSearchParams): AttendanceHistoryFilters {
  const status = searchParams.get("status");
  const sortBy = searchParams.get("sortBy");
  const sortDirection = searchParams.get("sortDirection");
  return {
    search: searchParams.get("search") ?? undefined,
    admissionNumber: searchParams.get("admissionNumber") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    classId: searchParams.get("classId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    studentId: searchParams.get("studentId") ?? undefined,
    status: isAttendanceStatus(status) ? status : undefined,
    correctedOnly: searchParams.get("correctedOnly") === "true",
    page: toPositiveInt(searchParams.get("page"), 1),
    pageSize: toPageSize(searchParams.get("pageSize")),
    sortBy: isAttendanceSortBy(sortBy) ? sortBy : "date",
    sortDirection: sortDirection === "asc" ? "asc" : "desc",
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
  return Boolean(value && ["studentName", "admissionNumber", "className", "status", "date", "updatedAt"].includes(value));
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

function formatDate(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatResultCount(page: number, pageSize: number, total: number) {
  if (total === 0) return "No history records";
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
