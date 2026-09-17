import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Button, Card, EmptyState, Field, LinkButton, PageHeader, SectionHeader, Select } from "@/components/ui";
import {
  formatAuditDateTime,
  formatAuditLabel,
  PromotionAuditSourceBadge,
  PromotionAuditStatusBadge,
} from "@/features/student-promotions/components/student-promotion-audit-states";
import { studentPromotionAuditSources } from "@/features/student-promotions/types/student-promotion-audit";
import { studentPromotionReasons, studentPromotionStatuses } from "@/features/student-promotions/types/student-promotion";
import type { AcademicClass, AcademicYear, Section } from "@/features/academic-structure/types/academic-structure";
import type { StudentPromotionAuditFilters, StudentPromotionAuditListResponse, StudentPromotionAuditRecord } from "@/features/student-promotions/types/student-promotion-audit";

export function StudentPromotionAuditDashboard({
  academicClasses,
  academicYears,
  context,
  filters,
  sections,
  audit,
}: {
  context: { school: string; campus: string; academicYear: string };
  audit: StudentPromotionAuditListResponse;
  academicYears: AcademicYear[];
  academicClasses: AcademicClass[];
  sections: Section[];
  filters: StudentPromotionAuditFilters;
}) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, "Academics", "Promotions", "Promotion Audit"]} />}
        description="Read-only promotion evidence for academic-year transition decisions, batch preparation source, and placement outcomes."
        eyebrow="Promotion Review Audit"
        title="Promotion Audit"
        action={<LinkButton href="/academics/promotions">Promotion Workspace</LinkButton>}
      >
        <Card className="responsive-card-padding" variant="muted">
          <p className="text-sm font-semibold text-foreground">Promotion evidence is view-only.</p>
          <p className="mt-1 text-sm text-foreground-muted">Audit pages do not apply promotions, mutate placements, or rewrite historical academic records.</p>
        </Card>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Total Records" value={audit.summary.totalRecords} />
        <Metric label="Pending Review" value={audit.summary.pendingReview} tone="warning" />
        <Metric label="Eligible" value={audit.summary.eligible} tone="success" />
        <Metric label="Requires Review" value={audit.summary.requiresReview} tone="warning" />
        <Metric label="Promoted" value={audit.summary.promoted} tone="info" />
        <Metric label="Bulk Prepared" value={audit.summary.bulkPrepared} tone="neutral" />
        <Metric label="Retained" value={audit.summary.retained} tone="neutral" />
        <Metric label="Transferred" value={audit.summary.transferred + audit.summary.withdrawn} tone="danger" />
        <Metric label="Blocked" value={audit.summary.blockedOrUnresolved} tone="danger" />
        <Metric label="Reviewed" value={audit.summary.reviewedRecords} tone="info" />
        <Metric label="Applied" value={audit.summary.appliedRecords} tone="success" />
        <Metric label="Individual" value={audit.summary.individuallyCreated} tone="neutral" />
      </section>

      <Card>
        <SectionHeader eyebrow="Filters" title="Audit Directory" />
        <form className="grid gap-3 border-b border-border p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-6">
          <Field label="Search">
            <input className={inputClasses} defaultValue={filters.search ?? ""} name="search" placeholder="Student, ID, class, batch" type="search" />
          </Field>
          <Field label="Source year">
            <Select defaultValue={filters.sourceAcademicYearId ?? ""} name="sourceAcademicYearId">
              <option value="">All source years</option>
              {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </Select>
          </Field>
          <Field label="Target year">
            <Select defaultValue={filters.targetAcademicYearId ?? ""} name="targetAcademicYearId">
              <option value="">All target years</option>
              {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </Select>
          </Field>
          <Field label="Source class">
            <Select defaultValue={filters.sourceClassId ?? ""} name="sourceClassId">
              <option value="">All source classes</option>
              {academicClasses.map((academicClass) => <option key={academicClass.id} value={academicClass.id}>{academicClass.displayName}</option>)}
            </Select>
          </Field>
          <Field label="Target class">
            <Select defaultValue={filters.targetClassId ?? ""} name="targetClassId">
              <option value="">All target classes</option>
              {academicClasses.map((academicClass) => <option key={academicClass.id} value={academicClass.id}>{academicClass.displayName}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select defaultValue={filters.status ?? ""} name="status">
              <option value="">All statuses</option>
              {studentPromotionStatuses.map((status) => <option key={status} value={status}>{formatAuditLabel(status)}</option>)}
            </Select>
          </Field>
          <Field label="Source section">
            <Select defaultValue={filters.sourceSectionId ?? ""} name="sourceSectionId">
              <option value="">All source sections</option>
              {sections.map((section) => <option key={section.id} value={section.id}>Section {section.displayName}</option>)}
            </Select>
          </Field>
          <Field label="Target section">
            <Select defaultValue={filters.targetSectionId ?? ""} name="targetSectionId">
              <option value="">All target sections</option>
              {sections.map((section) => <option key={section.id} value={section.id}>Section {section.displayName}</option>)}
            </Select>
          </Field>
          <Field label="Reason">
            <Select defaultValue={filters.reason ?? ""} name="reason">
              <option value="">All reasons</option>
              {studentPromotionReasons.map((reason) => <option key={reason} value={reason}>{formatAuditLabel(reason)}</option>)}
            </Select>
          </Field>
          <Field label="Source">
            <Select defaultValue={filters.source ?? ""} name="source">
              <option value="">All sources</option>
              {studentPromotionAuditSources.map((source) => <option key={source} value={source}>{formatAuditLabel(source)}</option>)}
            </Select>
          </Field>
          <Field label="From date">
            <input className={inputClasses} defaultValue={filters.dateFrom ?? ""} name="dateFrom" type="date" />
          </Field>
          <Field label="To date">
            <input className={inputClasses} defaultValue={filters.dateTo ?? ""} name="dateTo" type="date" />
          </Field>
          <Field label="Batch correlation">
            <input className={inputClasses} defaultValue={filters.batchCorrelationId ?? ""} name="batchCorrelationId" placeholder="Batch ID" />
          </Field>
          <label className="flex min-h-9 items-center gap-2 text-sm font-medium text-foreground">
            <input className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-sky-500" defaultChecked={Boolean(filters.appliedOnly)} name="appliedOnly" type="checkbox" value="true" />
            Applied only
          </label>
          <label className="flex min-h-9 items-center gap-2 text-sm font-medium text-foreground">
            <input className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-sky-500" defaultChecked={Boolean(filters.reviewedOnly)} name="reviewedOnly" type="checkbox" value="true" />
            Reviewed only
          </label>
          <div className="responsive-action-row md:col-span-2 xl:col-span-6">
            <Button type="submit">Apply filters</Button>
            <LinkButton href="/academics/promotions/audit">Clear</LinkButton>
          </div>
        </form>
        {audit.items.length === 0 ? (
          <div className="p-4 sm:p-5"><EmptyState description="No promotion audit records match the selected filters." title="No audit records found" /></div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Origin</th>
                    <th className="px-4 py-3">Last Event</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {audit.items.map((record) => <AuditRow key={record.promotionId} record={record} />)}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 lg:hidden">
              {audit.items.map((record) => <AuditCard key={record.promotionId} record={record} />)}
            </div>
          </>
        )}
      </Card>

      <Card className="p-4 sm:p-5" variant="muted">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Export Preview</p>
            <p className="mt-1 text-sm text-foreground-muted">{audit.exportPreview.message}</p>
          </div>
          <Badge tone="info">{audit.exportPreview.recordCount.toLocaleString("en-IN")} records</Badge>
        </div>
        <p className="mt-3 text-xs text-foreground-muted">Generated: {formatAuditDateTime(audit.exportPreview.generatedAt)}</p>
      </Card>
    </div>
  );
}

function AuditRow({ record }: { record: StudentPromotionAuditRecord }) {
  return (
    <tr>
      <td className="px-4 py-3"><p className="font-medium text-foreground">{record.studentName}</p><p className="text-xs text-foreground-muted">{record.admissionNumber ?? record.studentId}</p></td>
      <td className="px-4 py-3">{record.sourcePlacement.className ?? "Unavailable"} / {record.sourcePlacement.sectionName ?? "Unavailable"}</td>
      <td className="px-4 py-3">{record.targetPlacement.className ?? "Target pending"} / {record.targetPlacement.sectionName ?? "Target pending"}</td>
      <td className="px-4 py-3"><PromotionAuditStatusBadge status={record.status} /></td>
      <td className="px-4 py-3"><div className="grid gap-1"><PromotionAuditSourceBadge source={record.source} />{record.batchCorrelationId ? <span className="text-xs text-foreground-muted">{record.batchCorrelationId}</span> : null}</div></td>
      <td className="px-4 py-3"><p className="font-medium text-foreground">{record.lastEvent?.label ?? "Evidence unavailable"}</p><p className="text-xs text-foreground-muted">{formatAuditDateTime(record.lastEvent?.timestamp)}</p></td>
      <td className="px-4 py-3"><Link className="text-sm font-medium text-primary hover:underline" href={`/academics/promotions/audit/${encodeURIComponent(record.promotionId)}`}>View Evidence</Link></td>
    </tr>
  );
}

function AuditCard({ record }: { record: StudentPromotionAuditRecord }) {
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-medium text-foreground">{record.studentName}</p><p className="text-xs text-foreground-muted">{record.admissionNumber ?? record.studentId}</p></div>
        <PromotionAuditStatusBadge status={record.status} />
      </div>
      <p className="mt-3 text-sm text-foreground-muted">Source: {record.sourcePlacement.className ?? "Unavailable"} / {record.sourcePlacement.sectionName ?? "Unavailable"}</p>
      <p className="mt-1 text-sm text-foreground-muted">Target: {record.targetPlacement.className ?? "Target pending"} / {record.targetPlacement.sectionName ?? "Target pending"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <PromotionAuditSourceBadge source={record.source} />
        <Badge tone={record.validation.overallStatus === "ready" ? "success" : record.validation.overallStatus === "blocked" ? "danger" : "warning"}>{formatAuditLabel(record.validation.overallStatus)}</Badge>
      </div>
      {record.batchCorrelationId ? <p className="mt-2 text-xs text-foreground-muted">Batch: {record.batchCorrelationId}</p> : null}
      <Link className="mt-3 inline-flex text-sm font-medium text-primary hover:underline" href={`/academics/promotions/audit/${encodeURIComponent(record.promotionId)}`}>View promotion evidence</Link>
    </article>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <Card className="p-4" variant="muted"><p className="text-sm text-foreground-muted">{label}</p><div className="mt-3"><Badge tone={tone}>{value.toLocaleString("en-IN")}</Badge></div></Card>;
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
