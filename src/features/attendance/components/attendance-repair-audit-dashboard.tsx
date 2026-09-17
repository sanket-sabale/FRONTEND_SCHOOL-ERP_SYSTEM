import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { getAuditEventLabel, getAuditSourceLabel } from "@/features/attendance/services/attendance-repair-audit-rules";
import type {
  AttendanceRepairAuditExportPreview,
  AttendanceRepairAuditFilters,
  AttendanceRepairAuditListResponse,
  AttendanceRepairAuditRecord,
} from "@/features/attendance/types/attendance-repair-audit";

export function AttendanceRepairAuditDashboard({
  audit,
  context,
  exportPreview,
  filters,
}: {
  audit: AttendanceRepairAuditListResponse;
  context: { school: string; campus: string; academicYear: string };
  exportPreview: AttendanceRepairAuditExportPreview;
  filters: AttendanceRepairAuditFilters;
}) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Attendance", "Integrity", "Audit"]} />}
        description="Read-only review history, repair lifecycle, and evidence reporting for attendance snapshot integrity."
        eyebrow="Attendance Repair Audit"
        title="Audit & Evidence"
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity">
              Snapshot Integrity
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity/repairs">
              Repair Queue
            </Link>
          </div>
        }
      >
        <Card className="responsive-card-padding" variant="muted">
          <p className="text-sm font-semibold text-foreground">{audit.total.toLocaleString("en-IN")} audit record{audit.total === 1 ? "" : "s"}</p>
          <p className="mt-1 text-sm text-foreground-muted">Audit is observational only. Repair state changes remain in the controlled repair workflow.</p>
        </Card>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Integrity Issues" value={audit.summary.totalIntegrityIssues} tone="warning" />
        <Metric label="Deterministic Candidates" value={audit.summary.deterministicCandidates} tone="info" />
        <Metric label="Pending Review" value={audit.summary.pendingReview} tone="warning" />
        <Metric label="Approved" value={audit.summary.approved} tone="info" />
        <Metric label="Applied" value={audit.summary.applied} tone="success" />
        <Metric label="Rejected" value={audit.summary.rejected} tone="danger" />
        <Metric label="Failed" value={audit.summary.failed} tone="danger" />
        <Metric label="Bulk Prepared" value={audit.summary.bulkPreparedRequests} tone="neutral" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card>
          <SectionHeader eyebrow="Filters" title="Audit Filters" />
          <form action="/attendance/integrity/audit" className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Search</span>
              <input className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={filters.query} name="query" placeholder="Student, ID, status" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Integrity status</span>
              <select className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={filters.integrityStatus ?? ""} name="integrityStatus">
                <option value="">All statuses</option>
                {["valid", "missing_snapshot", "invalid_class", "invalid_section", "class_section_mismatch", "scope_mismatch", "placement_mismatch", "academic_year_mismatch", "archived_structure_reference", "unresolved"].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Repair state</span>
              <select className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={filters.repairStatus ?? ""} name="repairStatus">
                <option value="">All states</option>
                {["pending_review", "approved", "rejected", "applied", "failed", "requires_manual_review"].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Source</span>
              <select className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={filters.source ?? ""} name="source">
                <option value="">All sources</option>
                <option value="diagnostic">Diagnostic</option>
                <option value="individual">Individual</option>
                <option value="bulk_preparation">Bulk Preparation</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Attendance from</span>
              <input className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={filters.dateFrom} name="dateFrom" type="date" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Attendance to</span>
              <input className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={filters.dateTo} name="dateTo" type="date" />
            </label>
            <label className="grid gap-1 text-sm lg:col-span-2">
              <span className="font-medium text-foreground">Batch correlation</span>
              <input className="h-10 rounded-lg border border-border bg-surface px-3 font-mono text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={filters.batchCorrelationId} name="batchCorrelationId" placeholder="batch-preview-..." />
            </label>
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 text-sm">
              <input className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-sky-500" defaultChecked={filters.repairedOnly} name="repairedOnly" type="checkbox" value="true" />
              <span className="font-medium text-foreground">Repaired only</span>
            </label>
            <div className="responsive-action-row sm:col-span-2 lg:col-span-3">
              <button className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" type="submit">Apply filters</button>
              <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity/audit">Clear filters</Link>
            </div>
          </form>
        </Card>
        <Card>
          <SectionHeader eyebrow="Export preview" title="Contract Only" />
          <div className="grid gap-3 p-4 sm:p-5">
            <InfoRow label="Preview records" value={exportPreview.recordCount.toLocaleString("en-IN")} />
            <InfoRow label="Included fields" value={exportPreview.includedFields.length.toLocaleString("en-IN")} />
            <InfoRow label="Generated" value={formatDateTime(exportPreview.generatedAt)} />
            <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">
              This is an export contract preview only. Stage 9 does not generate files, download URLs, CSV, Excel, or PDF output.
            </div>
          </div>
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="Audit directory" title="Repair Audit Records" />
        {audit.items.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState description="No audit records match the current filters." title="No audit records" />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Integrity</th>
                    <th className="px-4 py-3">Current Snapshot</th>
                    <th className="px-4 py-3">Proposed</th>
                    <th className="px-4 py-3">Repair State</th>
                    <th className="px-4 py-3">Last Event</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {audit.items.map((record) => <AuditRow key={record.attendanceId} record={record} />)}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 lg:hidden">
              {audit.items.map((record) => <AuditCard key={record.attendanceId} record={record} />)}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text text-right font-medium text-foreground">{value || "Not available"}</span>
    </div>
  );
}

function AuditRow({ record }: { record: AttendanceRepairAuditRecord }) {
  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{record.attendanceDate ? formatDate(record.attendanceDate) : "Date unavailable"}</p>
        <p className="font-mono text-xs text-foreground-muted">{record.attendanceId}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{record.studentName ?? record.studentId ?? "Unknown student"}</p>
        <p className="text-xs text-foreground-muted">{record.admissionNumber ?? "Admission unavailable"}</p>
      </td>
      <td className="px-4 py-3"><StatusBadge value={record.integrityStatus ?? "diagnostic"} /></td>
      <td className="px-4 py-3">{snapshotLabel(record.currentSnapshot.className, record.currentSnapshot.sectionName)}</td>
      <td className="px-4 py-3">{snapshotLabel(record.proposedSnapshot?.className, record.proposedSnapshot?.sectionName)}</td>
      <td className="px-4 py-3"><StatusBadge value={record.repairStatus ?? "no_repair"} /></td>
      <td className="px-4 py-3">
        <p>{record.lastEventType ? getAuditEventLabel(record.lastEventType) : "No event"}</p>
        <p className="text-xs text-foreground-muted">{record.lastActorId ?? "No actor"} / {formatDateTime(record.lastUpdatedAt)}</p>
      </td>
      <td className="px-4 py-3">{getAuditSourceLabel(record.source)}{record.batchCorrelationId ? <p className="font-mono text-xs text-foreground-muted">{record.batchCorrelationId}</p> : null}</td>
      <td className="px-4 py-3"><Link className="text-sm font-medium text-primary hover:underline" href={`/attendance/integrity/audit/${encodeURIComponent(record.attendanceId)}`}>Review</Link></td>
    </tr>
  );
}

function AuditCard({ record }: { record: AttendanceRepairAuditRecord }) {
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{record.studentName ?? record.studentId ?? "Unknown student"}</p>
          <p className="text-xs text-foreground-muted">{record.attendanceDate ? formatDate(record.attendanceDate) : "Date unavailable"}</p>
        </div>
        <StatusBadge value={record.repairStatus ?? record.integrityStatus ?? "diagnostic"} />
      </div>
      <p className="mt-3 text-sm text-foreground-muted">Current: {snapshotLabel(record.currentSnapshot.className, record.currentSnapshot.sectionName)}</p>
      <p className="mt-1 text-sm text-foreground-muted">Proposed: {snapshotLabel(record.proposedSnapshot?.className, record.proposedSnapshot?.sectionName)}</p>
      <p className="mt-1 text-sm text-foreground-muted">Last event: {record.lastEventType ? getAuditEventLabel(record.lastEventType) : "No event"}</p>
      <Link className="mt-3 inline-flex text-sm font-medium text-primary hover:underline" href={`/attendance/integrity/audit/${encodeURIComponent(record.attendanceId)}`}>Review audit</Link>
    </article>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return (
    <Card className="p-4" variant="muted">
      <p className="text-sm text-foreground-muted">{label}</p>
      <div className="mt-3"><Badge tone={tone}>{value.toLocaleString("en-IN")}</Badge></div>
    </Card>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone = ["applied", "valid"].includes(value) ? "success" : ["failed", "rejected", "unresolved"].includes(value) ? "danger" : ["approved", "bulk_preparation"].includes(value) ? "info" : "warning";
  return <Badge tone={tone}>{statusLabel(value)}</Badge>;
}

function statusLabel(value: string) {
  return value.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function snapshotLabel(className?: string, sectionName?: string) {
  if (!className && !sectionName) return "Not available";
  return `${className ?? "Unknown class"} / ${sectionName ?? "Unknown section"}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
