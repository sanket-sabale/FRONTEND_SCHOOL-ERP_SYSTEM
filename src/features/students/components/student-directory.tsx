"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Skeleton } from "@/components/shared/skeleton";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { hasPermission } from "@/components/shared/permission-gate";
import { useStudents } from "@/features/students/hooks/use-students";
import { formatGuardianRelationship, formatStudentDate, getStudentInitials } from "@/features/students/components/student-formatters";
import { getStudentStatusLabel, StudentStatusBadge } from "@/features/students/components/student-status-badge";
import { studentStatuses, type StudentFilters, type StudentSortBy, type StudentStatus, type StudentSummary } from "@/features/students/types/student";
import type { TenantScopedQuery } from "@/lib/api/client";
import type { Role } from "@/types/erp";

const pageSizeOptions = [5, 10, 25] as const;
const sortOptions: Array<{ label: string; value: StudentSortBy }> = [
  { label: "Student name", value: "displayName" },
  { label: "Admission number", value: "admissionNumber" },
  { label: "Admission date", value: "admissionDate" },
  { label: "Class", value: "className" },
  { label: "Status", value: "status" },
];

type StudentDirectoryProps = {
  role: Role;
  scope: TenantScopedQuery;
  context: {
    group: string;
    school: string;
    campus: string;
    academicYear: string;
  };
};

export function StudentDirectory({ context, role, scope }: StudentDirectoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const optionsFilters = useMemo<StudentFilters>(
    () => ({ page: 1, pageSize: 100, sortBy: "className", sortDirection: "asc" }),
    [],
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const studentsState = useStudents(scope, filters, refreshKey);
  const optionsState = useStudents(scope, optionsFilters);

  const allStudents = optionsState.status === "success" ? optionsState.data.items : [];
  const classOptions = uniqueOptions(allStudents, "classId", "className");
  const sectionOptions = uniqueOptions(
    allStudents.filter((student) => !filters.classId || student.classId === filters.classId),
    "sectionId",
    "sectionName",
  );
  const currentData = studentsState.status === "success" ? studentsState.data : null;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const totalPages = currentData?.totalPages ?? 1;
  const hasActiveFilters = Boolean(filters.query || filters.status || filters.classId || filters.sectionId);

  function updateFilters(nextFilters: Partial<StudentFilters>, options: { resetPage?: boolean } = { resetPage: true }) {
    const params = new URLSearchParams(searchParams.toString());
    const updates = { ...nextFilters };
    if (options.resetPage) updates.page = 1;

    Object.entries(updates).forEach(([key, value]) => {
      const paramKey = key === "query" ? "search" : key;
      if (value === undefined || value === "" || value === null) params.delete(paramKey);
      else params.set(paramKey, String(value));
    });

    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["search", "status", "classId", "sectionId", "page"].forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Students"]} />}
        description="Find, review, and manage student records within the active school, campus, and academic year context."
        eyebrow="Student Management"
        title="Student Directory"
        action={
          hasPermission(role, "student.create") ? (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
              href="/students/new"
            >
              Add Student
            </Link>
          ) : null
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

      <StudentSummaryMetrics loading={optionsState.status === "loading"} students={allStudents} total={currentData?.total} />

      <Card>
        <SectionHeader
          eyebrow="Directory"
          title="Search & Filters"
          action={
            hasActiveFilters ? (
              <Button onClick={clearFilters} variant="ghost">
                Clear filters
              </Button>
            ) : null
          }
        />
        <div className="grid gap-4 p-4 sm:p-5">
          <StudentSearch
            initialQuery={filters.query ?? ""}
            key={filters.query ?? "empty-search"}
            onClear={() => updateFilters({ query: undefined })}
            onSearch={(query) => updateFilters({ query: query || undefined })}
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Academic Year">
              <Select aria-label="Academic year" disabled value={scope.academicYearId}>
                <option value={scope.academicYearId}>{context.academicYear}</option>
              </Select>
            </Field>
            <Field label="Campus">
              <Select aria-label="Campus" disabled value={scope.campusId}>
                <option value={scope.campusId}>{context.campus}</option>
              </Select>
            </Field>
            <Field helperText="Current students excludes archived records unless Archived is selected." label="Lifecycle status">
              <Select
                aria-label="Filter by status"
                onChange={(event) => updateFilters({ status: event.target.value ? event.target.value as StudentStatus : undefined })}
                value={filters.status ?? ""}
              >
                <option value="">Current students</option>
                {studentStatuses.map((status) => (
                  <option key={status} value={status}>{getStudentStatusLabel(status)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Class">
              <Select
                aria-label="Filter by class"
                onChange={(event) => updateFilters({ classId: event.target.value || undefined, sectionId: undefined })}
                value={filters.classId ?? ""}
              >
                <option value="">All classes</option>
                {classOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Section">
              <Select
                aria-label="Filter by section"
                onChange={(event) => updateFilters({ sectionId: event.target.value || undefined })}
                value={filters.sectionId ?? ""}
              >
                <option value="">All sections</option>
                {sectionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <ActiveFilterChips
            classOptions={classOptions}
            filters={filters}
            onClear={updateFilters}
            sectionOptions={sectionOptions}
          />
        </div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Results"
          title={currentData ? formatResultCount(currentData.page, currentData.pageSize, currentData.total) : "Student results"}
          action={
            <div className="responsive-action-row">
              <Field label="Sort">
                <Select
                  aria-label="Sort students"
                  onChange={(event) => updateFilters({ sortBy: event.target.value as StudentSortBy })}
                  value={filters.sortBy ?? "displayName"}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Direction">
                <Select
                  aria-label="Sort direction"
                  onChange={(event) => updateFilters({ sortDirection: event.target.value as "asc" | "desc" })}
                  value={filters.sortDirection ?? "asc"}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </Select>
              </Field>
              <Button loading={studentsState.status === "loading"} onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">
                Refresh
              </Button>
            </div>
          }
        />
        {studentsState.status === "loading" ? <StudentResultsSkeleton /> : null}
        {studentsState.status === "error" ? (
          <div className="p-4 sm:p-5">
            <EmptyState title="Unable to load students" description="Please retry. If this continues, ask an administrator to review your access." />
            <Button className="mt-4" onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">
              Retry
            </Button>
          </div>
        ) : null}
        {studentsState.status === "success" ? (
          <StudentResults
            canArchive={hasPermission(role, "student.archive")}
            canUpdate={hasPermission(role, "student.update")}
            data={studentsState.data.items}
            filtered={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        ) : null}
        {studentsState.status === "success" ? (
          <StudentPagination
            onPageChange={(nextPage) => updateFilters({ page: nextPage }, { resetPage: false })}
            onPageSizeChange={(nextPageSize) => updateFilters({ pageSize: nextPageSize, page: 1 }, { resetPage: false })}
            page={page}
            pageSize={pageSize}
            total={studentsState.data.total}
            totalPages={totalPages}
          />
        ) : null}
      </Card>
    </div>
  );
}

function StudentSummaryMetrics({ loading, students, total }: { loading: boolean; students: StudentSummary[]; total?: number }) {
  const active = students.filter((student) => student.status === "active").length;
  const pending = students.filter((student) => student.status === "pending").length;
  const other = students.filter((student) => !["active", "pending"].includes(student.status)).length;
  const metrics = [
    { label: "Total Students", value: total ?? students.length, tone: "info" },
    { label: "Active", value: active, tone: "success" },
    { label: "Pending", value: pending, tone: "warning" },
    { label: "Inactive / Other", value: other, tone: "neutral" },
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Student summary">
      {metrics.map((metric) => (
        <Card className="p-4" key={metric.label}>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{metric.label}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold text-foreground">{metric.value.toLocaleString("en-IN")}</p>
                <Badge tone={metric.tone}>{metric.label}</Badge>
              </div>
            </>
          )}
        </Card>
      ))}
    </section>
  );
}

function StudentSearch({
  initialQuery,
  onClear,
  onSearch,
}: {
  initialQuery: string;
  onClear: () => void;
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(query.trim());
  }

  return (
    <form className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_auto]" onSubmit={submitSearch}>
      <label className="sr-only" htmlFor="student-search">Search students</label>
      <div className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-950">
        <SearchIcon />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
          id="student-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, admission number, student code, guardian..."
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear search text"
            className="rounded-md px-2 py-1 text-xs font-semibold text-foreground-muted hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            onClick={() => {
              setQuery("");
              onClear();
            }}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>
      <Button type="submit" variant="primary">Search</Button>
    </form>
  );
}

function StudentResults({
  canArchive,
  canUpdate,
  data,
  filtered,
  onClearFilters,
}: {
  canArchive: boolean;
  canUpdate: boolean;
  data: StudentSummary[];
  filtered: boolean;
  onClearFilters: () => void;
}) {
  if (data.length === 0) {
    return (
      <div className="p-4 sm:p-5">
        <EmptyState
          description={filtered ? "Try adjusting your search or filters." : "Student records will appear here once they are available for this tenant context."}
          title={filtered ? "No students match your filters" : "No students found"}
        />
        {filtered ? (
          <Button className="mt-4" onClick={onClearFilters} variant="secondary">
            Clear filters
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 p-3 sm:hidden">
        {data.map((student) => (
          <StudentMobileCard canArchive={canArchive} canUpdate={canUpdate} key={student.id} student={student} />
        ))}
      </div>
      <div className="responsive-table-wrap hidden sm:block">
        <table className="responsive-table text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-semibold sm:px-5">Student</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Admission Number</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Class / Section</th>
              <th className="hidden px-4 py-3 font-semibold lg:table-cell sm:px-5">Campus</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Status</th>
              <th className="hidden px-4 py-3 font-semibold xl:table-cell sm:px-5">Admission Date</th>
              <th className="px-4 py-3 text-right font-semibold sm:px-5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((student) => (
              <tr className="hover:bg-surface-muted" key={student.id}>
                <td className="px-4 py-4 sm:px-5">
                  <StudentIdentity student={student} />
                </td>
                <td className="px-4 py-4 sm:px-5">
                  <span className="font-mono text-xs text-foreground">{student.admissionNumber}</span>
                  {student.studentCode ? <p className="mt-1 font-mono text-[11px] text-foreground-muted">{student.studentCode}</p> : null}
                </td>
                <td className="px-4 py-4 sm:px-5">
                  <p className="font-medium text-foreground">{student.className}</p>
                  <p className="text-xs text-foreground-muted">Section {student.sectionName}{student.rollNumber ? ` / Roll ${student.rollNumber}` : ""}</p>
                </td>
                <td className="hidden px-4 py-4 text-foreground-muted lg:table-cell sm:px-5">Current campus</td>
                <td className="px-4 py-4 sm:px-5">
                  <StudentStatusBadge status={student.status} />
                </td>
                <td className="hidden px-4 py-4 text-foreground-muted xl:table-cell sm:px-5">{formatStudentDate(student.admissionDate)}</td>
                <td className="px-4 py-4 text-right sm:px-5">
                  <StudentActions canArchive={canArchive} canUpdate={canUpdate} student={student} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StudentMobileCard({ canArchive, canUpdate, student }: { canArchive: boolean; canUpdate: boolean; student: StudentSummary }) {
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <StudentIdentity student={student} />
        <StudentStatusBadge status={student.status} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Admission</dt>
          <dd className="mt-1 font-mono text-xs text-foreground">{student.admissionNumber}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Class / Section</dt>
          <dd className="mt-1 text-foreground">{student.className} / Section {student.sectionName}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <StudentActions canArchive={canArchive} canUpdate={canUpdate} student={student} />
      </div>
    </article>
  );
}

function StudentIdentity({ student }: { student: StudentSummary }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface text-xs font-semibold text-foreground">
        {getStudentInitials(student.displayName)}
      </span>
      <div className="min-w-0">
        <p className="responsive-text font-medium text-foreground">{student.displayName}</p>
        <p className="responsive-text mt-1 text-xs text-foreground-muted">
          {student.primaryGuardian ? `${student.primaryGuardian.name} / ${formatGuardianRelationship(student.primaryGuardian.relationship)}` : "Guardian not linked"}
        </p>
      </div>
    </div>
  );
}

function StudentActions({ canArchive, canUpdate, student }: { canArchive: boolean; canUpdate: boolean; student: StudentSummary }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Link
        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        href={`/students/${encodeURIComponent(student.id)}`}
      >
        View Profile
      </Link>
      {canUpdate ? (
        <Link
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          href={`/students/${encodeURIComponent(student.id)}/edit`}
        >
          Edit
        </Link>
      ) : null}
      {canArchive ? (
        <Link
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          href={`/students/${encodeURIComponent(student.id)}#lifecycle`}
        >
          Lifecycle
        </Link>
      ) : null}
    </div>
  );
}

function ActiveFilterChips({
  classOptions,
  filters,
  onClear,
  sectionOptions,
}: {
  classOptions: Array<{ label: string; value: string }>;
  filters: StudentFilters;
  onClear: (filters: Partial<StudentFilters>) => void;
  sectionOptions: Array<{ label: string; value: string }>;
}) {
  const chips = [
    filters.query ? { label: `Search: ${filters.query}`, onRemove: () => onClear({ query: undefined }) } : null,
    filters.status ? { label: `Status: ${getStudentStatusLabel(filters.status)}`, onRemove: () => onClear({ status: undefined }) } : null,
    filters.classId ? { label: `Class: ${findOptionLabel(classOptions, filters.classId)}`, onRemove: () => onClear({ classId: undefined, sectionId: undefined }) } : null,
    filters.sectionId ? { label: `Section: ${findOptionLabel(sectionOptions, filters.sectionId)}`, onRemove: () => onClear({ sectionId: undefined }) } : null,
  ].filter((chip): chip is { label: string; onRemove: () => void } => Boolean(chip));

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Active student filters">
      {chips.map((chip) => (
        <button
          className="inline-flex min-h-8 items-center gap-2 rounded-md border border-border bg-surface-muted px-2.5 text-xs font-medium text-foreground transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          key={chip.label}
          onClick={chip.onRemove}
          type="button"
        >
          {chip.label}
          <span aria-hidden="true">x</span>
        </button>
      ))}
    </div>
  );
}

function StudentPagination({
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  total,
  totalPages,
}: {
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="responsive-text">Page {page} of {totalPages} / {total.toLocaleString("en-IN")} students</span>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Select
          aria-label="Students per page"
          className="col-span-2 sm:col-span-1"
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          value={pageSize}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>{option} per page</option>
          ))}
        </Select>
        <Button disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} variant="secondary">
          Previous
        </Button>
        <Button disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} variant="secondary">
          Next
        </Button>
      </div>
    </div>
  );
}

function StudentResultsSkeleton() {
  return (
    <div className="grid gap-3 p-3 sm:p-5">
      <div className="hidden gap-3 sm:grid">
        {[0, 1, 2, 3, 4].map((item) => (
          <Skeleton className="h-16 w-full" key={item} />
        ))}
      </div>
      <div className="grid gap-3 sm:hidden">
        {[0, 1, 2].map((item) => (
          <Skeleton className="h-36 w-full" key={item} />
        ))}
      </div>
    </div>
  );
}

function filtersFromSearchParams(searchParams: URLSearchParams): StudentFilters {
  const status = searchParams.get("status");
  const sortBy = searchParams.get("sortBy");
  const sortDirection = searchParams.get("sortDirection");

  return {
    query: searchParams.get("search") ?? undefined,
    status: isStudentStatus(status) ? status : undefined,
    classId: searchParams.get("classId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    page: toPositiveInt(searchParams.get("page"), 1),
    pageSize: toPageSize(searchParams.get("pageSize")),
    sortBy: isStudentSortBy(sortBy) ? sortBy : "displayName",
    sortDirection: sortDirection === "desc" ? "desc" : "asc",
  };
}

function uniqueOptions<T extends StudentSummary>(students: T[], valueKey: "classId" | "sectionId", labelKey: "className" | "sectionName") {
  const options = new Map<string, string>();
  students.forEach((student) => options.set(student[valueKey], student[labelKey]));

  return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
}

function findOptionLabel(options: Array<{ label: string; value: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function isStudentStatus(value: string | null): value is StudentStatus {
  return Boolean(value && studentStatuses.includes(value as StudentStatus));
}

function isStudentSortBy(value: string | null): value is StudentSortBy {
  return Boolean(value && sortOptions.some((option) => option.value === value));
}

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toPageSize(value: string | null) {
  const parsed = Number(value);
  return pageSizeOptions.some((option) => option === parsed) ? parsed : 10;
}

function formatResultCount(page: number, pageSize: number, total: number) {
  if (total === 0) return "No students found";

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return `Showing ${start.toLocaleString("en-IN")}-${end.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} students`;
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-foreground-muted" fill="none" viewBox="0 0 24 24">
      <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
