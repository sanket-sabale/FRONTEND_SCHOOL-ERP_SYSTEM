"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Skeleton } from "@/components/shared/skeleton";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { formatStaffDate, getStaffInitials } from "@/features/staff/components/staff-formatters";
import { StaffStatusBadge } from "@/features/staff/components/staff-status-badge";
import {
  getEmploymentTypeLabel,
  getStaffCategoryLabel,
  getStaffStatusLabel,
} from "@/features/staff/services/staff-rules";
import { useStaff } from "@/features/staff/hooks/use-staff";
import {
  employmentTypes,
  staffCategories,
  staffStatuses,
  type EmploymentType,
  type StaffCategory,
  type StaffDepartment,
  type StaffDesignation,
  type StaffFilters,
  type StaffSortBy,
  type StaffStatus,
  type StaffSummary,
} from "@/features/staff/types/staff";
import type { TenantScopedQuery } from "@/lib/api/client";
import type { Role } from "@/types/erp";

const pageSizeOptions = [10, 25, 50, 100] as const;
const sortOptions: Array<{ label: string; value: StaffSortBy }> = [
  { label: "Name", value: "displayName" },
  { label: "Employee number", value: "employeeNumber" },
  { label: "Joining date", value: "joiningDate" },
  { label: "Department", value: "departmentName" },
  { label: "Designation", value: "designationName" },
  { label: "Status", value: "status" },
];

type StaffDirectoryProps = {
  context: {
    school: string;
    campus: string;
    academicYear: string;
  };
  departments: StaffDepartment[];
  designations: StaffDesignation[];
  role: Role;
  scope: TenantScopedQuery;
};

export function StaffDirectory({ context, departments, designations, role, scope }: StaffDirectoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const summaryFilters = useMemo<StaffFilters>(
    () => ({ page: 1, pageSize: 100, sortBy: "displayName", sortDirection: "asc" }),
    [],
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const staffState = useStaff(scope, filters, refreshKey);
  const summaryState = useStaff(scope, summaryFilters);
  const summaryStaff = summaryState.status === "success" ? summaryState.data.items : [];
  const currentData = staffState.status === "success" ? staffState.data : null;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const totalPages = currentData?.totalPages ?? 1;
  const hasActiveFilters = Boolean(filters.query || filters.status || filters.staffCategory || filters.employmentType || filters.departmentId || filters.designationId || filters.joiningDateFrom || filters.joiningDateTo);
  const canManage = hasPermission(role, "hr.manage");

  function updateFilters(nextFilters: Partial<StaffFilters>, options: { resetPage?: boolean } = { resetPage: true }) {
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
    ["search", "status", "staffCategory", "employmentType", "departmentId", "designationId", "joiningDateFrom", "joiningDateTo", "page"].forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Staff"]} />}
        description="Manage teaching, administrative, and support staff inside the active school, campus, and academic year context."
        eyebrow="Staff Management"
        title="Staff Directory"
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/staff/departments">
              Departments
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/staff/designations">
              Designations
            </Link>
            {canManage ? (
              <Link
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                href="/staff/new"
              >
                Add Staff
              </Link>
            ) : null}
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

      <StaffSummaryMetrics loading={summaryState.status === "loading"} staff={summaryStaff} total={currentData?.total} />

      <Card>
        <SectionHeader
          eyebrow="Directory"
          title="Search & Filters"
          action={hasActiveFilters ? <Button onClick={clearFilters} variant="ghost">Clear filters</Button> : null}
        />
        <div className="grid gap-4 p-4 sm:p-5">
          <StaffSearch
            initialQuery={filters.query ?? ""}
            key={filters.query ?? "empty-search"}
            onClear={() => updateFilters({ query: undefined })}
            onSearch={(query) => updateFilters({ query: query || undefined })}
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <Field label="Status">
              <Select aria-label="Filter by status" onChange={(event) => updateFilters({ status: toStaffStatus(event.target.value) })} value={filters.status ?? ""}>
                <option value="">All statuses</option>
                {staffStatuses.map((status) => (
                  <option key={status} value={status}>{getStaffStatusLabel(status)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select aria-label="Filter by category" onChange={(event) => updateFilters({ staffCategory: toStaffCategory(event.target.value) })} value={filters.staffCategory ?? ""}>
                <option value="">All categories</option>
                {staffCategories.map((category) => (
                  <option key={category} value={category}>{getStaffCategoryLabel(category)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Employment">
              <Select aria-label="Filter by employment type" onChange={(event) => updateFilters({ employmentType: toEmploymentType(event.target.value) })} value={filters.employmentType ?? ""}>
                <option value="">All types</option>
                {employmentTypes.map((type) => (
                  <option key={type} value={type}>{getEmploymentTypeLabel(type)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Department">
              <Select aria-label="Filter by department" onChange={(event) => updateFilters({ departmentId: event.target.value || undefined })} value={filters.departmentId ?? ""}>
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Designation">
              <Select aria-label="Filter by designation" onChange={(event) => updateFilters({ designationId: event.target.value || undefined })} value={filters.designationId ?? ""}>
                <option value="">All designations</option>
                {designations.map((designation) => (
                  <option key={designation.id} value={designation.id}>{designation.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Joined from">
              <input className="h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" onChange={(event) => updateFilters({ joiningDateFrom: event.target.value || undefined })} type="date" value={filters.joiningDateFrom ?? ""} />
            </Field>
            <Field label="Joined to">
              <input className="h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" onChange={(event) => updateFilters({ joiningDateTo: event.target.value || undefined })} type="date" value={filters.joiningDateTo ?? ""} />
            </Field>
          </div>
          <ActiveStaffFilterChips departments={departments} designations={designations} filters={filters} onClear={updateFilters} />
        </div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Results"
          title={currentData ? formatResultCount(currentData.page, currentData.pageSize, currentData.total) : "Staff results"}
          action={
            <div className="responsive-action-row">
              <Field label="Sort">
                <Select aria-label="Sort staff" onChange={(event) => updateFilters({ sortBy: event.target.value as StaffSortBy })} value={filters.sortBy ?? "displayName"}>
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Direction">
                <Select aria-label="Sort direction" onChange={(event) => updateFilters({ sortDirection: event.target.value as "asc" | "desc" })} value={filters.sortDirection ?? "asc"}>
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </Select>
              </Field>
              <Button loading={staffState.status === "loading"} onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">
                Refresh
              </Button>
            </div>
          }
        />
        {staffState.status === "loading" ? <StaffResultsSkeleton /> : null}
        {staffState.status === "error" ? (
          <div className="p-4 sm:p-5">
            <EmptyState title="Unable to load staff" description="Please retry. If this continues, ask an administrator to review your access." />
            <Button className="mt-4" onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">Retry</Button>
          </div>
        ) : null}
        {staffState.status === "success" ? (
          <StaffResults canManage={canManage} data={staffState.data.items} filtered={hasActiveFilters} onClearFilters={clearFilters} />
        ) : null}
        {staffState.status === "success" ? (
          <StaffPagination
            onPageChange={(nextPage) => updateFilters({ page: nextPage }, { resetPage: false })}
            onPageSizeChange={(nextPageSize) => updateFilters({ pageSize: nextPageSize, page: 1 }, { resetPage: false })}
            page={page}
            pageSize={pageSize}
            total={staffState.data.total}
            totalPages={totalPages}
          />
        ) : null}
      </Card>
    </div>
  );
}

function StaffSummaryMetrics({ loading, staff, total }: { loading: boolean; staff: StaffSummary[]; total?: number }) {
  const metrics = [
    { label: "Total Staff", value: total ?? staff.length, tone: "info" },
    { label: "Active", value: staff.filter((item) => item.status === "active").length, tone: "success" },
    { label: "On Leave", value: staff.filter((item) => item.status === "on_leave").length, tone: "info" },
    { label: "Suspended", value: staff.filter((item) => item.status === "suspended").length, tone: "warning" },
    { label: "Inactive", value: staff.filter((item) => item.status === "inactive").length, tone: "neutral" },
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Staff summary">
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

function StaffSearch({ initialQuery, onClear, onSearch }: { initialQuery: string; onClear: () => void; onSearch: (query: string) => void }) {
  const [query, setQuery] = useState(initialQuery);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(query.trim());
  }

  return (
    <form className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_auto]" onSubmit={submitSearch}>
      <label className="sr-only" htmlFor="staff-search">Search staff</label>
      <div className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-950">
        <SearchIcon />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
          id="staff-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, employee number, email, phone, department..."
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

function StaffResults({ canManage, data, filtered, onClearFilters }: { canManage: boolean; data: StaffSummary[]; filtered: boolean; onClearFilters: () => void }) {
  if (data.length === 0) {
    return (
      <div className="p-4 sm:p-5">
        <EmptyState
          description={filtered ? "Try another search or clear your filters." : "Add your first staff member to start building the school HR directory."}
          title={filtered ? "No staff match your filters" : "No Staff Yet"}
        />
        {filtered ? <Button className="mt-4" onClick={onClearFilters} variant="secondary">Clear filters</Button> : null}
        {!filtered && canManage ? (
          <Link className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/staff/new">
            Add Staff
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 p-3 sm:hidden">
        {data.map((staff) => <StaffMobileCard canManage={canManage} key={staff.id} staff={staff} />)}
      </div>
      <div className="responsive-table-wrap hidden sm:block">
        <table className="responsive-table text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-semibold sm:px-5">Staff</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Employee ID</th>
              <th className="hidden px-4 py-3 font-semibold lg:table-cell sm:px-5">Category</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Department</th>
              <th className="hidden px-4 py-3 font-semibold xl:table-cell sm:px-5">Designation</th>
              <th className="hidden px-4 py-3 font-semibold xl:table-cell sm:px-5">Employment</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Status</th>
              <th className="hidden px-4 py-3 font-semibold lg:table-cell sm:px-5">Joined</th>
              <th className="px-4 py-3 text-right font-semibold sm:px-5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((staff) => (
              <tr className="hover:bg-surface-muted" key={staff.id}>
                <td className="px-4 py-4 sm:px-5"><StaffIdentity staff={staff} /></td>
                <td className="px-4 py-4 sm:px-5"><span className="font-mono text-xs text-foreground">{staff.employeeNumber}</span></td>
                <td className="hidden px-4 py-4 text-foreground-muted lg:table-cell sm:px-5">{getStaffCategoryLabel(staff.staffCategory)}</td>
                <td className="px-4 py-4 sm:px-5">{staff.departmentName}</td>
                <td className="hidden px-4 py-4 xl:table-cell sm:px-5">{staff.designationName}</td>
                <td className="hidden px-4 py-4 text-foreground-muted xl:table-cell sm:px-5">{getEmploymentTypeLabel(staff.employmentType)}</td>
                <td className="px-4 py-4 sm:px-5"><StaffStatusBadge status={staff.status} /></td>
                <td className="hidden px-4 py-4 text-foreground-muted lg:table-cell sm:px-5">{formatStaffDate(staff.joiningDate)}</td>
                <td className="px-4 py-4 text-right sm:px-5"><StaffActions canManage={canManage} staff={staff} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StaffMobileCard({ canManage, staff }: { canManage: boolean; staff: StaffSummary }) {
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <StaffIdentity staff={staff} />
        <StaffStatusBadge status={staff.status} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Employee ID</dt>
          <dd className="mt-1 font-mono text-xs text-foreground">{staff.employeeNumber}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Department</dt>
          <dd className="mt-1 text-foreground">{staff.departmentName} / {staff.designationName}</dd>
        </div>
      </dl>
      <div className="mt-4"><StaffActions canManage={canManage} staff={staff} /></div>
    </article>
  );
}

function StaffIdentity({ staff }: { staff: StaffSummary }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface text-xs font-semibold text-foreground">
        {getStaffInitials(staff.displayName)}
      </span>
      <div className="min-w-0">
        <p className="responsive-text font-medium text-foreground">{staff.displayName}</p>
        <p className="responsive-text mt-1 text-xs text-foreground-muted">{staff.designationName}</p>
      </div>
    </div>
  );
}

function StaffActions({ canManage, staff }: { canManage: boolean; staff: StaffSummary }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/staff/${encodeURIComponent(staff.id)}`}>
        View
      </Link>
      {canManage ? (
        <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/staff/${encodeURIComponent(staff.id)}/edit`}>
          Edit
        </Link>
      ) : null}
      {canManage ? (
        <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/staff/${encodeURIComponent(staff.id)}#lifecycle`}>
          Status
        </Link>
      ) : null}
    </div>
  );
}

function ActiveStaffFilterChips({ departments, designations, filters, onClear }: { departments: StaffDepartment[]; designations: StaffDesignation[]; filters: StaffFilters; onClear: (filters: Partial<StaffFilters>) => void }) {
  const chips = [
    filters.query ? { label: `Search: ${filters.query}`, onRemove: () => onClear({ query: undefined }) } : null,
    filters.status ? { label: `Status: ${getStaffStatusLabel(filters.status)}`, onRemove: () => onClear({ status: undefined }) } : null,
    filters.staffCategory ? { label: `Category: ${getStaffCategoryLabel(filters.staffCategory)}`, onRemove: () => onClear({ staffCategory: undefined }) } : null,
    filters.employmentType ? { label: `Employment: ${getEmploymentTypeLabel(filters.employmentType)}`, onRemove: () => onClear({ employmentType: undefined }) } : null,
    filters.departmentId ? { label: `Department: ${findOptionName(departments, filters.departmentId)}`, onRemove: () => onClear({ departmentId: undefined }) } : null,
    filters.designationId ? { label: `Designation: ${findOptionName(designations, filters.designationId)}`, onRemove: () => onClear({ designationId: undefined }) } : null,
    filters.joiningDateFrom ? { label: `Joined from: ${filters.joiningDateFrom}`, onRemove: () => onClear({ joiningDateFrom: undefined }) } : null,
    filters.joiningDateTo ? { label: `Joined to: ${filters.joiningDateTo}`, onRemove: () => onClear({ joiningDateTo: undefined }) } : null,
  ].filter((chip): chip is { label: string; onRemove: () => void } => Boolean(chip));

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Active staff filters">
      {chips.map((chip) => (
        <button className="inline-flex min-h-8 items-center gap-2 rounded-md border border-border bg-surface-muted px-2.5 text-xs font-medium text-foreground transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" key={chip.label} onClick={chip.onRemove} type="button">
          {chip.label}
          <span aria-hidden="true">x</span>
        </button>
      ))}
    </div>
  );
}

function StaffPagination({ onPageChange, onPageSizeChange, page, pageSize, total, totalPages }: { onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void; page: number; pageSize: number; total: number; totalPages: number }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="responsive-text">Page {page} of {totalPages} / {total.toLocaleString("en-IN")} staff</span>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Select aria-label="Staff per page" className="col-span-2 sm:col-span-1" onChange={(event) => onPageSizeChange(Number(event.target.value))} value={pageSize}>
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>{option} per page</option>
          ))}
        </Select>
        <Button disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} variant="secondary">Previous</Button>
        <Button disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} variant="secondary">Next</Button>
      </div>
    </div>
  );
}

function StaffResultsSkeleton() {
  return (
    <div className="grid gap-3 p-3 sm:p-5">
      <div className="hidden gap-3 sm:grid">
        {[0, 1, 2, 3, 4].map((item) => <Skeleton className="h-16 w-full" key={item} />)}
      </div>
      <div className="grid gap-3 sm:hidden">
        {[0, 1, 2].map((item) => <Skeleton className="h-32 w-full" key={item} />)}
      </div>
    </div>
  );
}

function filtersFromSearchParams(searchParams: URLSearchParams): StaffFilters {
  const status = searchParams.get("status");
  const staffCategory = searchParams.get("staffCategory");
  const employmentType = searchParams.get("employmentType");
  const sortBy = searchParams.get("sortBy");
  const sortDirection = searchParams.get("sortDirection");

  return {
    query: searchParams.get("search") ?? undefined,
    status: toStaffStatus(status ?? ""),
    staffCategory: toStaffCategory(staffCategory ?? ""),
    employmentType: toEmploymentType(employmentType ?? ""),
    departmentId: searchParams.get("departmentId") ?? undefined,
    designationId: searchParams.get("designationId") ?? undefined,
    joiningDateFrom: searchParams.get("joiningDateFrom") ?? undefined,
    joiningDateTo: searchParams.get("joiningDateTo") ?? undefined,
    page: toPositiveInt(searchParams.get("page"), 1),
    pageSize: toPageSize(searchParams.get("pageSize")),
    sortBy: isStaffSortBy(sortBy) ? sortBy : "displayName",
    sortDirection: sortDirection === "desc" ? "desc" : "asc",
  };
}

function isStaffSortBy(value: string | null): value is StaffSortBy {
  return Boolean(value && sortOptions.some((option) => option.value === value));
}

function toStaffStatus(value: string): StaffStatus | undefined {
  return staffStatuses.includes(value as StaffStatus) ? value as StaffStatus : undefined;
}

function toStaffCategory(value: string): StaffCategory | undefined {
  return staffCategories.includes(value as StaffCategory) ? value as StaffCategory : undefined;
}

function toEmploymentType(value: string): EmploymentType | undefined {
  return employmentTypes.includes(value as EmploymentType) ? value as EmploymentType : undefined;
}

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toPageSize(value: string | null) {
  const parsed = Number(value);
  return pageSizeOptions.some((option) => option === parsed) ? parsed : 25;
}

function formatResultCount(page: number, pageSize: number, total: number) {
  if (total === 0) return "No staff found";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return `Showing ${start.toLocaleString("en-IN")}-${end.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} staff`;
}

function findOptionName(options: Array<{ id: string; name: string }>, value: string) {
  return options.find((option) => option.id === value)?.name ?? value;
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
