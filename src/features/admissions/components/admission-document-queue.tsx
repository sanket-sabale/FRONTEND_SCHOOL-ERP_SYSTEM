"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Skeleton } from "@/components/shared/skeleton";
import { hasPermission } from "@/components/shared/permission-gate";
import { Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { AdmissionDocumentActions } from "@/features/admissions/components/admission-document-actions";
import {
  formatAdmissionDateTime,
  formatAdmissionDocumentStatus,
  formatAdmissionDocumentType,
  getApplicantInitials,
} from "@/features/admissions/components/admission-formatters";
import { AdmissionDocumentStatusBadge } from "@/features/admissions/components/admission-status-badge";
import { useAdmissionDocumentQueue } from "@/features/admissions/hooks/use-admission-applications";
import { admissionDocumentStatuses, admissionDocumentTypes, type AdmissionDocumentQueueFilters, type AdmissionDocumentQueueItem } from "@/features/admissions/types/admission";
import type { StudentAcademicPlacementOption } from "@/features/students/types/student";
import type { TenantScopedQuery } from "@/lib/api/client";
import type { Role } from "@/types/erp";

const pageSizeOptions = [5, 10, 25] as const;

type Props = {
  context: { school: string; campus: string; academicYear: string };
  placementOptions: StudentAcademicPlacementOption[];
  role: Role;
  scope: TenantScopedQuery;
};

export function AdmissionDocumentQueue({ context, placementOptions, role, scope }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const [refreshKey, setRefreshKey] = useState(0);
  const queueState = useAdmissionDocumentQueue(scope, filters, refreshKey);
  const classOptions = uniqueClassOptions(placementOptions);
  const sectionOptions = placementOptions.filter((placement) => !filters.classId || placement.classId === filters.classId);
  const hasActiveFilters = Boolean(filters.query || filters.status || filters.documentType || filters.classId || filters.sectionId || filters.dateFrom || filters.dateTo);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const canVerify = hasPermission(role, "admission.verify_documents");
  const canEdit = hasPermission(role, "admission.edit");

  function updateFilters(nextFilters: Partial<AdmissionDocumentQueueFilters>, options: { resetPage?: boolean } = { resetPage: true }) {
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
    ["search", "status", "documentType", "classId", "sectionId", "dateFrom", "dateTo", "page"].forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        action={<Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/admissions/applications">Applications</Link>}
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Admissions", "Documents"]} />}
        description="Verify uploaded admission documents without loading unrelated tenant records into the browser."
        eyebrow="Admissions"
        title="Document Verification Queue"
      />

      <Card>
        <SectionHeader eyebrow="Queue" title="Search & Filters" action={hasActiveFilters ? <Button onClick={clearFilters} variant="ghost">Clear filters</Button> : null} />
        <div className="grid gap-4 p-4 sm:p-5">
          <form className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); updateFilters({ query: new FormData(event.currentTarget).get("search")?.toString() || undefined }); }}>
            <label className="sr-only" htmlFor="admission-document-search">Search documents</label>
            <input className="h-10 min-w-0 rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={filters.query ?? ""} id="admission-document-search" name="search" placeholder="Search applicant or application number" type="search" />
            <Button type="submit" variant="primary">Search</Button>
          </form>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Status">
              <Select aria-label="Document status" onChange={(event) => updateFilters({ status: event.target.value as AdmissionDocumentQueueFilters["status"] || undefined })} value={filters.status ?? ""}>
                <option value="">All statuses</option>
                {admissionDocumentStatuses.map((status) => <option key={status} value={status}>{formatAdmissionDocumentStatus(status)}</option>)}
              </Select>
            </Field>
            <Field label="Document">
              <Select aria-label="Document type" onChange={(event) => updateFilters({ documentType: event.target.value as AdmissionDocumentQueueFilters["documentType"] || undefined })} value={filters.documentType ?? ""}>
                <option value="">All documents</option>
                {admissionDocumentTypes.map((type) => <option key={type} value={type}>{formatAdmissionDocumentType(type)}</option>)}
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
          title={queueState.status === "success" ? formatResultCount(queueState.data.page, queueState.data.pageSize, queueState.data.total) : "Document queue"}
          action={<div className="responsive-action-row">
            <Field label="Sort">
              <Select aria-label="Sort documents" onChange={(event) => updateFilters({ sortBy: event.target.value as AdmissionDocumentQueueFilters["sortBy"] })} value={filters.sortBy ?? "updatedAt"}>
                <option value="updatedAt">Updated</option>
                <option value="applicantName">Applicant</option>
                <option value="applicationNumber">Application no.</option>
                <option value="documentType">Document</option>
                <option value="status">Status</option>
              </Select>
            </Field>
            <Button loading={queueState.status === "loading"} onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">Refresh</Button>
          </div>}
        />
        {queueState.status === "loading" ? <div className="grid gap-3 p-3 sm:p-5">{[0, 1, 2].map((item) => <Skeleton className="h-20 w-full" key={item} />)}</div> : null}
        {queueState.status === "error" ? <div className="p-4 sm:p-5"><EmptyState title="Unable to load documents" description="Please retry or ask an administrator to review admissions access." /></div> : null}
        {queueState.status === "success" ? <DocumentQueueResults canEdit={canEdit} canVerify={canVerify} data={queueState.data.items} filtered={hasActiveFilters} onClearFilters={clearFilters} /> : null}
        {queueState.status === "success" ? <Pagination onPageChange={(nextPage) => updateFilters({ page: nextPage }, { resetPage: false })} onPageSizeChange={(nextPageSize) => updateFilters({ pageSize: nextPageSize, page: 1 }, { resetPage: false })} page={page} pageSize={pageSize} total={queueState.data.total} totalPages={queueState.data.totalPages} /> : null}
      </Card>
    </div>
  );
}

function DocumentQueueResults({ canEdit, canVerify, data, filtered, onClearFilters }: { canEdit: boolean; canVerify: boolean; data: AdmissionDocumentQueueItem[]; filtered: boolean; onClearFilters: () => void }) {
  if (data.length === 0) {
    return <div className="p-4 sm:p-5"><EmptyState description={filtered ? "Try adjusting document filters." : "No admission documents are queued for this scope."} title={filtered ? "No documents match your filters" : "No documents found"} />{filtered ? <Button className="mt-4" onClick={onClearFilters} variant="secondary">Clear filters</Button> : null}</div>;
  }

  return (
    <div className="divide-y divide-border">
      {data.map((document) => (
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,auto)] lg:items-start sm:p-5" key={document.id}>
          <div className="min-w-0">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface-muted text-xs font-semibold">{getApplicantInitials(document.applicantName)}</span>
              <div className="min-w-0">
                <p className="responsive-text font-medium text-foreground">{document.applicantName}</p>
                <p className="mt-1 font-mono text-xs text-foreground-muted">{document.applicationNumber}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AdmissionDocumentStatusBadge status={document.status} />
              <span className="text-sm text-foreground">{formatAdmissionDocumentType(document.documentType)}</span>
              <span className="text-sm text-foreground-muted">{document.appliedClassName ?? document.appliedClassId}</span>
            </div>
            <p className="mt-2 text-xs text-foreground-muted">Updated {formatAdmissionDateTime(document.updatedAt)} / Reviewer {document.assignedReviewerId ?? "Unassigned"}</p>
            <Link className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" href={`/admissions/applications/${document.applicationId}#documents`}>Open Application 360</Link>
          </div>
          <AdmissionDocumentActions applicationId={document.applicationId} canEdit={canEdit} canVerify={canVerify} document={document} />
        </div>
      ))}
    </div>
  );
}

function Pagination({ onPageChange, onPageSizeChange, page, pageSize, total, totalPages }: { onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void; page: number; pageSize: number; total: number; totalPages: number }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span>Page {page} of {totalPages} / {total.toLocaleString("en-IN")} documents</span>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Select aria-label="Documents per page" className="col-span-2 sm:col-span-1" onChange={(event) => onPageSizeChange(Number(event.target.value))} value={pageSize}>
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option} per page</option>)}
        </Select>
        <Button disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} variant="secondary">Previous</Button>
        <Button disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} variant="secondary">Next</Button>
      </div>
    </div>
  );
}

function filtersFromSearchParams(searchParams: URLSearchParams): AdmissionDocumentQueueFilters {
  const status = searchParams.get("status");
  const documentType = searchParams.get("documentType");
  const sortBy = searchParams.get("sortBy");
  return {
    query: searchParams.get("search") ?? undefined,
    status: isDocumentStatus(status) ? status : undefined,
    documentType: isDocumentType(documentType) ? documentType : undefined,
    classId: searchParams.get("classId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    dateFrom: validDate(searchParams.get("dateFrom")),
    dateTo: validDate(searchParams.get("dateTo")),
    page: toPositiveInt(searchParams.get("page"), 1),
    pageSize: toPageSize(searchParams.get("pageSize")),
    sortBy: isSortBy(sortBy) ? sortBy : "updatedAt",
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

function isSortBy(value: string | null): value is NonNullable<AdmissionDocumentQueueFilters["sortBy"]> {
  return Boolean(value && ["applicantName", "applicationNumber", "documentType", "status", "updatedAt"].includes(value));
}

function isDocumentStatus(value: string | null): value is NonNullable<AdmissionDocumentQueueFilters["status"]> {
  return Boolean(value && admissionDocumentStatuses.some((status) => status === value));
}

function isDocumentType(value: string | null): value is NonNullable<AdmissionDocumentQueueFilters["documentType"]> {
  return Boolean(value && admissionDocumentTypes.some((type) => type === value));
}

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function formatResultCount(page: number, pageSize: number, total: number) {
  if (total === 0) return "No documents found";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return `Showing ${start.toLocaleString("en-IN")}-${end.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} documents`;
}
