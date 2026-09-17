"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Skeleton } from "@/components/shared/skeleton";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import {
  admissionDocumentCompletionMeta,
  admissionStatusMeta,
  formatAdmissionDateTime,
  formatAdmissionDocumentCompletion,
  formatAdmissionSource,
  getApplicantInitials,
} from "@/features/admissions/components/admission-formatters";
import { AdmissionDocumentCompletionBadge, AdmissionStatusBadge } from "@/features/admissions/components/admission-status-badge";
import { useAdmissionApplications } from "@/features/admissions/hooks/use-admission-applications";
import { admissionApplicationStatuses, admissionSources, type AdmissionApplicationFilters, type AdmissionApplicationSummary, type AdmissionCycle, type AdmissionDocumentCompletionStatus, type AdmissionSummary } from "@/features/admissions/types/admission";
import type { StudentAcademicPlacementOption } from "@/features/students/types/student";
import type { TenantScopedQuery } from "@/lib/api/client";
import type { Role } from "@/types/erp";

const pageSizeOptions = [5, 10, 25] as const;
const documentCompletionOptions = Object.keys(admissionDocumentCompletionMeta) as AdmissionDocumentCompletionStatus[];
const reviewerOptions = ["staff-admission-001", "staff-admission-002"] as const;

type Props = {
  context: { school: string; campus: string; academicYear: string };
  cycles: AdmissionCycle[];
  placementOptions: StudentAcademicPlacementOption[];
  role: Role;
  scope: TenantScopedQuery;
  summary: AdmissionSummary;
};

export function AdmissionApplicationDirectory({ context, cycles, placementOptions, role, scope, summary }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const [refreshKey, setRefreshKey] = useState(0);
  const applicationsState = useAdmissionApplications(scope, filters, refreshKey);
  const classOptions = uniqueClassOptions(placementOptions);
  const sectionOptions = placementOptions.filter((placement) => !filters.classId || placement.classId === filters.classId);
  const currentData = applicationsState.status === "success" ? applicationsState.data : null;
  const hasActiveFilters = Boolean(filters.query || filters.status || filters.admissionCycleId || filters.source || filters.assignedReviewerId || filters.classId || filters.sectionId || filters.documentStatus || filters.dateFrom || filters.dateTo);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;

  function updateFilters(nextFilters: Partial<AdmissionApplicationFilters>, options: { resetPage?: boolean } = { resetPage: true }) {
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
    ["search", "status", "admissionCycleId", "source", "assignedReviewerId", "classId", "sectionId", "documentStatus", "dateFrom", "dateTo", "page"].forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        action={hasPermission(role, "admission.create") ? <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/admissions/applications/new">New Application</Link> : null}
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Admissions", "Applications"]} />}
        description="Search, filter, and manage admission applications inside the active school, campus, and academic year scope."
        eyebrow="Admissions"
        title="Admission Applications"
      />

      <ApplicationSummaryMetrics summary={summary} />

      <Card>
        <SectionHeader eyebrow="Directory" title="Search & Filters" action={hasActiveFilters ? <Button onClick={clearFilters} variant="ghost">Clear filters</Button> : null} />
        <div className="grid gap-4 p-4 sm:p-5">
          <ApplicationSearch
            initialQuery={filters.query ?? ""}
            key={filters.query ?? "empty-search"}
            onClear={() => updateFilters({ query: undefined })}
            onSearch={(query) => updateFilters({ query: query || undefined })}
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Campus">
              <Select aria-label="Campus" disabled value={scope.campusId}><option value={scope.campusId}>{context.campus}</option></Select>
            </Field>
            <Field label="Academic Year">
              <Select aria-label="Academic year" disabled value={scope.academicYearId}><option value={scope.academicYearId}>{context.academicYear}</option></Select>
            </Field>
            <Field label="Cycle">
              <Select aria-label="Admission cycle" onChange={(event) => updateFilters({ admissionCycleId: event.target.value || undefined })} value={filters.admissionCycleId ?? ""}>
                <option value="">All cycles</option>
                {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select aria-label="Application status" onChange={(event) => updateFilters({ status: event.target.value as AdmissionApplicationFilters["status"] || undefined })} value={filters.status ?? ""}>
                <option value="">All statuses</option>
                {admissionApplicationStatuses.map((status) => <option key={status} value={status}>{admissionStatusMeta[status].label}</option>)}
              </Select>
            </Field>
            <Field label="Documents">
              <Select aria-label="Document completion" onChange={(event) => updateFilters({ documentStatus: event.target.value as AdmissionApplicationFilters["documentStatus"] || undefined })} value={filters.documentStatus ?? ""}>
                <option value="">Any document state</option>
                {documentCompletionOptions.map((status) => <option key={status} value={status}>{formatAdmissionDocumentCompletion(status)}</option>)}
              </Select>
            </Field>
            <Field label="Source">
              <Select aria-label="Application source" onChange={(event) => updateFilters({ source: event.target.value as AdmissionApplicationFilters["source"] || undefined })} value={filters.source ?? ""}>
                <option value="">All sources</option>
                {admissionSources.map((source) => <option key={source} value={source}>{formatAdmissionSource(source)}</option>)}
              </Select>
            </Field>
            <Field label="Class">
              <Select aria-label="Applied class" onChange={(event) => updateFilters({ classId: event.target.value || undefined, sectionId: undefined })} value={filters.classId ?? ""}>
                <option value="">All classes</option>
                {classOptions.map((option) => <option key={option.classId} value={option.classId}>{option.className}</option>)}
              </Select>
            </Field>
            <Field label="Section">
              <Select aria-label="Applied section" onChange={(event) => updateFilters({ sectionId: event.target.value || undefined })} value={filters.sectionId ?? ""}>
                <option value="">All sections</option>
                {sectionOptions.map((option) => <option key={option.sectionId} value={option.sectionId}>{option.sectionName}</option>)}
              </Select>
            </Field>
            <Field label="Reviewer">
              <Select aria-label="Assigned reviewer" onChange={(event) => updateFilters({ assignedReviewerId: event.target.value || undefined })} value={filters.assignedReviewerId ?? ""}>
                <option value="">All reviewers</option>
                {reviewerOptions.map((reviewer) => <option key={reviewer} value={reviewer}>{reviewer}</option>)}
              </Select>
            </Field>
            <Field label="Date from">
              <input className="h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" onChange={(event) => updateFilters({ dateFrom: event.target.value || undefined })} type="date" value={filters.dateFrom ?? ""} />
            </Field>
            <Field label="Date to">
              <input className="h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" onChange={(event) => updateFilters({ dateTo: event.target.value || undefined })} type="date" value={filters.dateTo ?? ""} />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Results"
          title={currentData ? formatResultCount(currentData.page, currentData.pageSize, currentData.total) : "Application results"}
          action={<div className="responsive-action-row">
            <Field label="Sort">
              <Select aria-label="Sort applications" onChange={(event) => updateFilters({ sortBy: event.target.value as AdmissionApplicationFilters["sortBy"] })} value={filters.sortBy ?? "createdAt"}>
                <option value="createdAt">Created</option>
                <option value="applicationNumber">Application no.</option>
                <option value="applicantName">Applicant</option>
                <option value="status">Status</option>
                <option value="submittedAt">Submitted</option>
              </Select>
            </Field>
            <Field label="Direction">
              <Select aria-label="Sort direction" onChange={(event) => updateFilters({ sortDirection: event.target.value as "asc" | "desc" })} value={filters.sortDirection ?? "desc"}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </Select>
            </Field>
            <Button loading={applicationsState.status === "loading"} onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">Refresh</Button>
          </div>}
        />
        {applicationsState.status === "loading" ? <ResultsSkeleton /> : null}
        {applicationsState.status === "error" ? <div className="p-4 sm:p-5"><EmptyState title="Unable to load applications" description="Please retry or ask an administrator to review admissions access." /></div> : null}
        {applicationsState.status === "success" ? (
          <ApplicationResults
            canEdit={hasPermission(role, "admission.edit")}
            canSubmit={hasPermission(role, "admission.submit")}
            data={applicationsState.data.items}
            filtered={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        ) : null}
        {applicationsState.status === "success" ? (
          <Pagination
            label="applications"
            onPageChange={(nextPage) => updateFilters({ page: nextPage }, { resetPage: false })}
            onPageSizeChange={(nextPageSize) => updateFilters({ pageSize: nextPageSize, page: 1 }, { resetPage: false })}
            page={page}
            pageSize={pageSize}
            total={applicationsState.data.total}
            totalPages={applicationsState.data.totalPages}
          />
        ) : null}
      </Card>
    </div>
  );
}

function ApplicationSummaryMetrics({ summary }: { summary: AdmissionSummary }) {
  const metrics = [
    { label: "Total Applications", value: summary.totalApplications, tone: "info" },
    { label: "Pending Review", value: summary.pendingReview, tone: "warning" },
    { label: "Documents Pending", value: summary.documentsPending, tone: "warning" },
    { label: "Approved", value: summary.approved, tone: "success" },
    { label: "Enrolled", value: summary.enrolled, tone: "success" },
    { label: "Seats Available", value: summary.seatsAvailable, tone: "neutral" },
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Admission application summary">
      {metrics.map((metric) => (
        <Card className="p-4" key={metric.label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{metric.label}</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-2xl font-semibold text-foreground">{metric.value.toLocaleString("en-IN")}</p>
            <Badge tone={metric.tone}>{metric.label}</Badge>
          </div>
        </Card>
      ))}
    </section>
  );
}

function ApplicationSearch({ initialQuery, onClear, onSearch }: { initialQuery: string; onClear: () => void; onSearch: (query: string) => void }) {
  const [query, setQuery] = useState(initialQuery);
  return (
    <form className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); onSearch(query.trim()); }}>
      <label className="sr-only" htmlFor="admission-application-search">Search applications</label>
      <div className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-950">
        <input className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted" id="admission-application-search" onChange={(event) => setQuery(event.target.value)} placeholder="Search application number, applicant, phone, email..." type="search" value={query} />
        {query ? <button className="rounded-md px-2 py-1 text-xs font-semibold text-foreground-muted hover:bg-surface" onClick={() => { setQuery(""); onClear(); }} type="button">Clear</button> : null}
      </div>
      <Button type="submit" variant="primary">Search</Button>
    </form>
  );
}

function ApplicationResults({ canEdit, canSubmit, data, filtered, onClearFilters }: { canEdit: boolean; canSubmit: boolean; data: AdmissionApplicationSummary[]; filtered: boolean; onClearFilters: () => void }) {
  if (data.length === 0) {
    return <div className="p-4 sm:p-5"><EmptyState description={filtered ? "Try adjusting your search or filters." : "Applications will appear once they are created for this admission scope."} title={filtered ? "No applications match your filters" : "No applications found"} />{filtered ? <Button className="mt-4" onClick={onClearFilters} variant="secondary">Clear filters</Button> : null}</div>;
  }

  return (
    <>
      <div className="grid gap-3 p-3 lg:hidden">
        {data.map((application) => <ApplicationMobileCard application={application} canEdit={canEdit} canSubmit={canSubmit} key={application.id} />)}
      </div>
      <div className="responsive-table-wrap hidden lg:block">
        <table className="responsive-table text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Application</th>
              <th className="px-4 py-3 font-semibold">Applicant</th>
              <th className="px-4 py-3 font-semibold">Applied Class</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Documents</th>
              <th className="px-4 py-3 font-semibold">Reviewer</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((application) => <ApplicationTableRow application={application} canEdit={canEdit} canSubmit={canSubmit} key={application.id} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ApplicationTableRow({ application, canEdit, canSubmit }: { application: AdmissionApplicationSummary; canEdit: boolean; canSubmit: boolean }) {
  return (
    <tr className="hover:bg-surface-muted">
      <td className="px-4 py-4"><span className="font-mono text-xs">{application.applicationNumber}</span><p className="mt-1 text-xs text-foreground-muted">{formatAdmissionDateTime(application.updatedAt)}</p></td>
      <td className="px-4 py-4"><ApplicantIdentity application={application} /></td>
      <td className="px-4 py-4"><p className="font-medium text-foreground">{application.appliedClassName}</p><p className="text-xs text-foreground-muted">{application.appliedSectionName ?? "Section not assigned"}</p></td>
      <td className="px-4 py-4"><AdmissionStatusBadge status={application.status} /></td>
      <td className="px-4 py-4"><DocumentCompletion application={application} /></td>
      <td className="px-4 py-4 text-foreground-muted">{application.assignedReviewerId ?? "Unassigned"}</td>
      <td className="px-4 py-4 text-foreground-muted">{formatAdmissionDateTime(application.submittedAt)}</td>
      <td className="px-4 py-4 text-right"><ApplicationActions application={application} canEdit={canEdit} canSubmit={canSubmit} /></td>
    </tr>
  );
}

function ApplicationMobileCard({ application, canEdit, canSubmit }: { application: AdmissionApplicationSummary; canEdit: boolean; canSubmit: boolean }) {
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <ApplicantIdentity application={application} />
        <AdmissionStatusBadge status={application.status} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Application</dt><dd className="mt-1 font-mono text-xs">{application.applicationNumber}</dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Class</dt><dd className="mt-1">{application.appliedClassName}</dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Documents</dt><dd className="mt-1"><DocumentCompletion application={application} /></dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Submitted</dt><dd className="mt-1">{formatAdmissionDateTime(application.submittedAt)}</dd></div>
      </dl>
      <div className="mt-4"><ApplicationActions application={application} canEdit={canEdit} canSubmit={canSubmit} /></div>
    </article>
  );
}

function ApplicantIdentity({ application }: { application: AdmissionApplicationSummary }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface text-xs font-semibold text-foreground">{getApplicantInitials(application.applicantName)}</span>
      <div className="min-w-0">
        <p className="responsive-text font-medium text-foreground">{application.applicantName}</p>
        <p className="responsive-text mt-1 text-xs text-foreground-muted">{application.applicantPhone ?? application.applicantEmail ?? "Contact not recorded"}</p>
      </div>
    </div>
  );
}

function DocumentCompletion({ application }: { application: AdmissionApplicationSummary }) {
  const summary = application.documentSummary;
  const state = summary.missing > 0 || summary.rejected > 0 ? "incomplete" : summary.verified === summary.required ? "complete" : "pending_verification";
  return <div className="grid gap-1"><AdmissionDocumentCompletionBadge status={state} /><span className="text-xs text-foreground-muted">{summary.verified}/{summary.required} required verified</span></div>;
}

function ApplicationActions({ application, canEdit, canSubmit }: { application: AdmissionApplicationSummary; canEdit: boolean; canSubmit: boolean }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/admissions/applications/${encodeURIComponent(application.id)}`}>View</Link>
      {canEdit && (application.status === "draft" || application.status === "under_review") ? <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/admissions/applications/${encodeURIComponent(application.id)}#edit`}>Edit</Link> : null}
      {canSubmit && application.status === "draft" ? <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/admissions/applications/${encodeURIComponent(application.id)}#submit`}>Submit</Link> : null}
    </div>
  );
}

function Pagination({ label, onPageChange, onPageSizeChange, page, pageSize, total, totalPages }: { label: string; onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void; page: number; pageSize: number; total: number; totalPages: number }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="responsive-text">Page {page} of {totalPages} / {total.toLocaleString("en-IN")} {label}</span>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Select aria-label={`${label} per page`} className="col-span-2 sm:col-span-1" onChange={(event) => onPageSizeChange(Number(event.target.value))} value={pageSize}>
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option} per page</option>)}
        </Select>
        <Button disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} variant="secondary">Previous</Button>
        <Button disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} variant="secondary">Next</Button>
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return <div className="grid gap-3 p-3 sm:p-5">{[0, 1, 2, 3].map((item) => <Skeleton className="h-16 w-full" key={item} />)}</div>;
}

function filtersFromSearchParams(searchParams: URLSearchParams): AdmissionApplicationFilters {
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const sortBy = searchParams.get("sortBy");
  const documentStatus = searchParams.get("documentStatus");
  return {
    query: searchParams.get("search") ?? undefined,
    status: isAdmissionStatus(status) ? status : undefined,
    admissionCycleId: searchParams.get("admissionCycleId") ?? undefined,
    source: isAdmissionSource(source) ? source : undefined,
    assignedReviewerId: searchParams.get("assignedReviewerId") ?? undefined,
    classId: searchParams.get("classId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    documentStatus: isDocumentCompletionStatus(documentStatus) ? documentStatus : undefined,
    dateFrom: validDate(searchParams.get("dateFrom")),
    dateTo: validDate(searchParams.get("dateTo")),
    page: toPositiveInt(searchParams.get("page"), 1),
    pageSize: toPageSize(searchParams.get("pageSize")),
    sortBy: isSortBy(sortBy) ? sortBy : "createdAt",
    sortDirection: searchParams.get("sortDirection") === "asc" ? "asc" : "desc",
  };
}

function uniqueClassOptions(placementOptions: StudentAcademicPlacementOption[]) {
  const options = new Map<string, string>();
  placementOptions.forEach((placement) => options.set(placement.classId, placement.className));
  return Array.from(options.entries()).map(([classId, className]) => ({ classId, className }));
}

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toPageSize(value: string | null) {
  const parsed = Number(value);
  return pageSizeOptions.some((option) => option === parsed) ? parsed : 10;
}

function isSortBy(value: string | null): value is NonNullable<AdmissionApplicationFilters["sortBy"]> {
  return Boolean(value && ["applicationNumber", "applicantName", "status", "submittedAt", "createdAt"].includes(value));
}

function isAdmissionStatus(value: string | null): value is NonNullable<AdmissionApplicationFilters["status"]> {
  return Boolean(value && admissionApplicationStatuses.some((status) => status === value));
}

function isAdmissionSource(value: string | null): value is NonNullable<AdmissionApplicationFilters["source"]> {
  return Boolean(value && admissionSources.some((source) => source === value));
}

function isDocumentCompletionStatus(value: string | null): value is AdmissionDocumentCompletionStatus {
  return Boolean(value && documentCompletionOptions.some((status) => status === value));
}

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function formatResultCount(page: number, pageSize: number, total: number) {
  if (total === 0) return "No applications found";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return `Showing ${start.toLocaleString("en-IN")}-${end.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} applications`;
}
