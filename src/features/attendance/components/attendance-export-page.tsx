"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Skeleton } from "@/components/shared/skeleton";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { requestAttendanceExportAction, type AttendanceExportActionState } from "@/features/attendance/actions/attendance-export-actions";
import { AttendanceStatusBadge } from "@/features/attendance/components/attendance-status-badge";
import { getAttendanceStatusLabel } from "@/features/attendance/services/attendance-rules";
import { getRiskLabel, getRiskTone } from "@/features/attendance/services/attendance-report-rules";
import { useAttendanceExportPreview } from "@/features/attendance/hooks/use-attendance-export-preview";
import { attendanceStatuses, type AttendanceStatus } from "@/features/attendance/types/attendance";
import {
  attendanceExportColumns,
  attendanceExportFormats,
  attendanceExportScopes,
  attendanceReportPackSections,
  type AttendanceExportColumn,
  type AttendanceExportFormat,
  type AttendanceExportRequest,
  type AttendanceExportScope,
  type AttendanceReportPackSection,
  type AttendanceExportPreview as AttendanceExportPreviewModel,
} from "@/features/attendance/types/attendance-export";
import type { AttendanceReportFilters } from "@/features/attendance/types/attendance-report";
import type { StudentAcademicPlacementOption, StudentSummary } from "@/features/students/types/student";
import type { TenantScopedQuery } from "@/lib/api/client";

const initialState: AttendanceExportActionState = { status: "idle" };

const defaultColumns: AttendanceExportColumn[] = ["student", "admissionNumber", "class", "section", "date", "status", "correctionStatus"];
const defaultSections: AttendanceReportPackSection[] = ["executive-summary", "attendance-overview", "daily-attendance-trend", "student-attendance", "low-attendance-students", "correction-summary"];

export function AttendanceExportPage({
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
  const [actionState, formAction, pending] = useActionState(requestAttendanceExportAction, initialState);
  const [exportScope, setExportScope] = useState<AttendanceExportScope>(getExportScope(searchParams.get("exportScope")));
  const [format, setFormat] = useState<AttendanceExportFormat>(getExportFormat(searchParams.get("format")));
  const [columns, setColumns] = useState<AttendanceExportColumn[]>(defaultColumns);
  const [sections, setSections] = useState<AttendanceReportPackSection[]>(defaultSections);
  const [includeCorrections, setIncludeCorrections] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const classOptions = uniqueOptions(placements, "classId", "className");
  const sectionOptions = uniqueOptions(placements.filter((placement) => !filters.classId || placement.classId === filters.classId), "sectionId", "sectionName");
  const request = useMemo<AttendanceExportRequest>(() => ({
    scope: exportScope,
    filters,
    format,
    columns,
    includeCorrections,
    includeSummary,
    includeDetails,
    sections,
    requestedBy: "current-user",
  }), [columns, exportScope, filters, format, includeCorrections, includeDetails, includeSummary, sections]);
  const previewState = useAttendanceExportPreview(scope, request, refreshKey);

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

  function clearFilters() {
    router.push(pathname);
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Attendance", "Export"]} />}
        description="Configure attendance report packs and export requests using the same report data used by attendance analytics."
        eyebrow="Attendance Reporting"
        title="Export / Report Pack"
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/reports">
              Reports
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/history">
              History
            </Link>
            <Button loading={previewState.status === "loading"} onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">Refresh</Button>
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

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <SectionHeader eyebrow="Filters" title="Report Scope" action={<Button onClick={clearFilters} variant="ghost">Clear filters</Button>} />
          <div className="grid gap-4 p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-2">
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
              <Field label="Attendance status">
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
              <Field helperText="Used to identify low-attendance students." label="Attendance threshold">
                <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" max={100} min={1} onChange={(event) => updateFilters({ attendanceThreshold: Number(event.target.value) || undefined })} type="number" value={filters.attendanceThreshold ?? 75} />
              </Field>
            </div>
          </div>
        </Card>

        <form action={formAction}>
          <input name="dateFrom" type="hidden" value={filters.dateFrom ?? ""} />
          <input name="dateTo" type="hidden" value={filters.dateTo ?? ""} />
          <input name="studentId" type="hidden" value={filters.studentId ?? ""} />
          <input name="classId" type="hidden" value={filters.classId ?? ""} />
          <input name="sectionId" type="hidden" value={filters.sectionId ?? ""} />
          <input name="status" type="hidden" value={filters.status ?? ""} />
          <input name="attendanceThreshold" type="hidden" value={filters.attendanceThreshold ?? 75} />
          <input name="correctedOnly" type="hidden" value={filters.correctedOnly ? "true" : ""} />
          <input name="includeCorrections" type="hidden" value={includeCorrections ? "true" : ""} />
          <input name="includeSummary" type="hidden" value={includeSummary ? "true" : ""} />
          <input name="includeDetails" type="hidden" value={includeDetails ? "true" : ""} />
          <Card>
            <SectionHeader eyebrow="Report pack" title="Export Configuration" />
            <div className="grid gap-5 p-4 sm:p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Export scope">
                  <Select name="exportScope" onChange={(event) => setExportScope(event.target.value as AttendanceExportScope)} value={exportScope}>
                    {attendanceExportScopes.map((item) => <option key={item} value={item}>{getScopeName(item)}</option>)}
                  </Select>
                </Field>
                <Field label="Output format">
                  <Select name="format" onChange={(event) => setFormat(event.target.value as AttendanceExportFormat)} value={format}>
                    {attendanceExportFormats.map((item) => <option key={item} value={item}>{getFormatName(item)}</option>)}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3">
                <p className="text-sm font-semibold text-foreground">Included detail</p>
                <CheckboxRow checked={includeSummary} label="Summary metrics" name="toggle-include-summary" onChange={setIncludeSummary} />
                <CheckboxRow checked={includeDetails} label="Detailed attendance rows" name="toggle-include-details" onChange={setIncludeDetails} />
                <CheckboxRow checked={includeCorrections} label="Correction transparency" name="toggle-include-corrections" onChange={setIncludeCorrections} />
              </div>

              <Checklist
                items={attendanceReportPackSections}
                label="Report pack sections"
                name="sections"
                onChange={(value) => setSections(value as AttendanceReportPackSection[])}
                selected={sections}
              />
              <Checklist
                items={attendanceExportColumns}
                label="Export columns"
                name="columns"
                onChange={(value) => setColumns(value as AttendanceExportColumn[])}
                selected={columns}
              />

              {actionState.status !== "idle" ? (
                <div className={actionState.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"}>
                  <p className="font-semibold">{actionState.status === "success" ? "Export request queued" : "Export request failed"}</p>
                  <p className="mt-1">{actionState.message}</p>
                  {actionState.jobId ? <p className="mt-2 font-mono text-xs">Job {actionState.jobId} / {actionState.jobStatus}</p> : null}
                </div>
              ) : null}

              <Button disabled={previewState.status !== "success" || pending} loading={pending} type="submit">
                Request Export
              </Button>
              <p className="text-xs leading-5 text-foreground-muted">
                This stage records a future-backend-ready export request. The mock frontend does not generate, upload, or download files.
              </p>
            </div>
          </Card>
        </form>
      </section>

      {previewState.status === "loading" ? <ExportSkeleton /> : null}
      {previewState.status === "error" ? (
        <Card className="p-4 sm:p-5">
          <EmptyState description={previewState.error} title="Preview unavailable" />
        </Card>
      ) : null}
      {previewState.status === "success" ? <ExportPreview data={previewState.data} /> : null}
    </div>
  );
}

function ExportPreview({ data }: { data: AttendanceExportPreviewModel }) {
  const metrics = [
    { label: "Scope", value: data.scopeLabel, tone: "info" },
    { label: "Students", value: data.studentCount.toLocaleString("en-IN"), tone: "neutral" },
    { label: "Attendance Records", value: data.attendanceRecordCount.toLocaleString("en-IN"), tone: "success" },
    { label: "Corrected Records", value: data.correctedRecordCount.toLocaleString("en-IN"), tone: "warning" },
    { label: "Low Attendance", value: data.lowAttendanceStudentCount.toLocaleString("en-IN"), tone: "danger" },
    { label: "Correction Events", value: data.correctionEventCount.toLocaleString("en-IN"), tone: "warning" },
  ] as const;

  return (
    <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <SectionHeader eyebrow="Preview" title="What Will Be Exported" />
        <div className="grid gap-3 p-4 sm:p-5 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div className="rounded-lg border border-border bg-surface-muted p-3" key={metric.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{metric.label}</p>
              <p className="responsive-text mt-3 text-lg font-semibold text-foreground">{metric.value}</p>
              <Badge tone={metric.tone}>{metric.label}</Badge>
            </div>
          ))}
          <div className="rounded-lg border border-border bg-surface-muted p-3 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Period</p>
            <p className="responsive-text mt-3 text-sm font-medium text-foreground">{data.periodLabel}</p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Operational view" title="Low Attendance Students" />
        <div className="grid gap-3 p-4 sm:p-5">
          {data.dashboard.lowAttendanceStudents.length === 0 ? (
            <EmptyState description="No students are below the selected attendance threshold." title="No low-attendance exceptions" />
          ) : data.dashboard.lowAttendanceStudents.map((student) => (
            <article className="rounded-lg border border-border bg-surface-muted p-3" key={student.studentId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link className="font-semibold text-foreground hover:underline" href={`/students/${encodeURIComponent(student.studentId)}`}>{student.studentName}</Link>
                  <p className="mt-1 font-mono text-xs text-foreground-muted">{student.admissionNumber}</p>
                  <p className="mt-1 text-sm text-foreground-muted">{student.className} / Section {student.sectionName}</p>
                </div>
                <Badge tone={getRiskTone(student.riskLevel)}>{getRiskLabel(student.riskLevel)}</Badge>
              </div>
              <p className="mt-3 text-sm text-foreground-muted">{student.attendancePercentage}% attendance / Absent {student.absentDays} of {student.totalDays} tracked days</p>
            </article>
          ))}
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <SectionHeader eyebrow="Transparency" title="Correction Summary" />
        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-3">
          <Metric label="Corrected Records" value={data.dashboard.correctionMetrics.correctedRecordCount.toLocaleString("en-IN")} tone="warning" />
          <Metric label="Correction Events" value={data.dashboard.correctionMetrics.correctionEventCount.toLocaleString("en-IN")} tone="info" />
          <Metric label="Corrected Share" value={`${data.dashboard.correctionMetrics.correctedRecordPercentage}%`} tone="neutral" />
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <SectionHeader eyebrow="Status distribution" title="Included Attendance Statuses" />
        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
          {data.dashboard.statusDistribution.map((item) => (
            <div className="rounded-lg border border-border bg-surface-muted p-3" key={item.status}>
              <div className="flex items-center justify-between gap-3">
                <AttendanceStatusBadge status={item.status} />
                <span className="text-sm font-medium text-foreground">{item.count.toLocaleString("en-IN")} / {item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function Checklist<T extends string>({ items, label, name, onChange, selected }: { items: readonly T[]; label: string; name: string; onChange: (value: T[]) => void; selected: T[] }) {
  return (
    <fieldset className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3">
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-foreground" key={item}>
            <input
              checked={selected.includes(item)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              name={name}
              onChange={() => onChange(toggleSelected(selected, item))}
              type="checkbox"
              value={item}
            />
            <span>{toTitle(item)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CheckboxRow({ checked, label, name, onChange }: { checked: boolean; label: string; name: string; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-foreground">
      <input checked={checked} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" name={name} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

function Metric({ label, tone, value }: { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral"; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-3 text-xl font-semibold text-foreground">{value}</p>
      <Badge tone={tone}>{label}</Badge>
    </div>
  );
}

function ExportSkeleton() {
  return <div className="grid gap-4">{[0, 1, 2].map((item) => <Skeleton className="h-40 w-full" key={item} />)}</div>;
}

function filtersFromSearchParams(searchParams: URLSearchParams): AttendanceReportFilters {
  const status = searchParams.get("status");
  return {
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    studentId: searchParams.get("studentId") ?? undefined,
    classId: searchParams.get("classId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    status: isAttendanceStatus(status) ? status : undefined,
    correctedOnly: searchParams.get("correctedOnly") === "true",
    attendanceThreshold: toThreshold(searchParams.get("attendanceThreshold")),
    page: 1,
    pageSize: 100,
    sortBy: "attendancePercentage",
    sortDirection: "asc",
  };
}

function getExportScope(value: string | null): AttendanceExportScope {
  return attendanceExportScopes.includes(value as AttendanceExportScope) ? value as AttendanceExportScope : "full-filtered-report";
}

function getExportFormat(value: string | null): AttendanceExportFormat {
  return attendanceExportFormats.includes(value as AttendanceExportFormat) ? value as AttendanceExportFormat : "csv";
}

function isAttendanceStatus(value: string | null): value is AttendanceStatus {
  return Boolean(value && attendanceStatuses.includes(value as AttendanceStatus));
}

function toggleSelected<T>(selected: T[], item: T) {
  return selected.includes(item) ? selected.filter((value) => value !== item) : [...selected, item];
}

function toThreshold(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : 75;
}

function uniqueOptions<T extends Record<string, string>>(items: T[], valueKey: keyof T, labelKey: keyof T) {
  const options = new Map<string, string>();
  items.forEach((item) => options.set(item[valueKey], item[labelKey]));
  return Array.from(options.entries()).map(([value, optionLabel]) => ({ value, label: optionLabel }));
}

function getScopeName(value: AttendanceExportScope) {
  if (value === "full-filtered-report") return "Full filtered report";
  if (value === "date-range") return "Date range";
  return toTitle(value);
}

function getFormatName(value: AttendanceExportFormat) {
  if (value === "csv") return "CSV";
  if (value === "xlsx") return "Excel workbook";
  return "PDF report pack";
}

function toTitle(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 text-sm min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center"><span className="text-foreground-muted">{label}</span><span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span></div>;
}
