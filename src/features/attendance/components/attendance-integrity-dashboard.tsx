import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { RepairStatusBadge } from "@/features/attendance/components/attendance-repair-queue";
import type { AttendanceSnapshotIntegrityListResponse, AttendanceSnapshotIntegrityResult } from "@/features/attendance/types/attendance-integrity";
import type { AttendanceSnapshotRepairRequest } from "@/features/attendance/types/attendance-repair";

export function AttendanceIntegrityDashboard({
  context,
  diagnostics,
  repairRequests,
}: {
  context: { school: string; campus: string; academicYear: string };
  diagnostics: AttendanceSnapshotIntegrityListResponse;
  repairRequests: AttendanceSnapshotRepairRequest[];
}) {
  const { summary, migrationReadiness } = diagnostics;
  const repairByAttendance = new Map(repairRequests.map((request) => [request.attendanceId, request]));

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Attendance", "Snapshot Integrity"]} />}
        description="Read-only diagnostics for attendance academic snapshots, placement consistency, and migration readiness."
        eyebrow="Attendance Integrity"
        title="Snapshot Integrity"
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/history">
              Attendance History
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/reports">
              Reports
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity/repairs">
              Repair Queue
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity/audit">
              Audit
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity/bulk-repair">
              Preview Repair
            </Link>
          </div>
        }
      >
        <Card className="responsive-card-padding" variant="muted">
          <p className="text-sm font-medium text-foreground">Migration readiness</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{summary.readinessPercentage}%</p>
          <p className="mt-1 text-sm text-foreground-muted">Valid or historically readable snapshots.</p>
        </Card>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Attendance Records" value={summary.totalRecords} />
        <Metric label="Valid Snapshots" value={summary.validRecords} tone="success" />
        <Metric label="Legacy / Missing" value={summary.missingSnapshotRecords} tone="warning" />
        <Metric label="Blocked / Invalid" value={summary.blockedRecords} tone="danger" />
        <Metric label="Repairable" value={summary.repairableRecords} tone="info" />
        <Metric label="Manual Review" value={summary.manualReviewRecords} tone="warning" />
        <Metric label="Unresolved" value={summary.unresolvedRecords} tone="danger" />
        <Metric label="Warnings" value={summary.warningRecords} tone="warning" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHeader eyebrow="Blocking issues" title="Migration Blockers" />
          <IssueList items={migrationReadiness.blockingIssues} empty="No blocking snapshot issues were found." />
        </Card>
        <Card>
          <SectionHeader eyebrow="Warnings" title="Historical Warnings" />
          <IssueList items={migrationReadiness.warnings} empty="No warning-level snapshot issues were found." />
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="Diagnostics" title="Attendance Snapshot Records" />
        {diagnostics.items.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState description="No attendance records exist in the current academic scope." title="No records to inspect" />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3">Record</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Stored Snapshot</th>
                    <th className="px-4 py-3">Resolved Placement</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Repair</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {diagnostics.items.map((item) => {
                    const repair = repairByAttendance.get(item.attendanceId);
                    return (
                    <tr key={item.attendanceId}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{formatDate(item.attendanceDate)}</p>
                        <p className="font-mono text-xs text-foreground-muted">{item.attendanceId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.studentName ?? item.studentId}</p>
                        <p className="text-xs text-foreground-muted">{item.admissionNumber ?? "Admission unavailable"}</p>
                      </td>
                      <td className="px-4 py-3">{snapshotLabel(item.storedSnapshot.className, item.storedSnapshot.sectionName)}</td>
                      <td className="px-4 py-3">{snapshotLabel(item.resolvedPlacement?.className, item.resolvedPlacement?.sectionName)}</td>
                      <td className="px-4 py-3"><IntegrityBadge item={item} /></td>
                      <td className="px-4 py-3">{repair ? <RepairStatusBadge status={repair.status} /> : item.repairPlan.proposedSnapshot ? <Badge tone="info">Repairable</Badge> : <Badge tone="neutral">No Repair</Badge>}</td>
                      <td className="px-4 py-3">
                        <Link className="text-sm font-medium text-primary hover:underline" href={`/attendance/integrity/${encodeURIComponent(item.attendanceId)}`}>Inspect</Link>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {diagnostics.items.map((item) => {
                const repair = repairByAttendance.get(item.attendanceId);
                return (
                <article className="rounded-lg border border-border bg-surface-muted p-3" key={item.attendanceId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item.studentName ?? item.studentId}</p>
                      <p className="text-xs text-foreground-muted">{formatDate(item.attendanceDate)}</p>
                    </div>
                    <div className="grid justify-items-end gap-1">
                      <IntegrityBadge item={item} />
                      {repair ? <RepairStatusBadge status={repair.status} /> : null}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-foreground-muted">Stored: {snapshotLabel(item.storedSnapshot.className, item.storedSnapshot.sectionName)}</p>
                  <p className="mt-1 text-sm text-foreground-muted">Resolved: {snapshotLabel(item.resolvedPlacement?.className, item.resolvedPlacement?.sectionName)}</p>
                  <Link className="mt-3 inline-flex text-sm font-medium text-primary hover:underline" href={`/attendance/integrity/${encodeURIComponent(item.attendanceId)}`}>Inspect record</Link>
                </article>
              );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
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

function IssueList({ items, empty }: { items: string[]; empty: string }) {
  return (
    <div className="p-4 sm:p-5">
      {items.length === 0 ? <EmptyState description={empty} title="Clear" /> : (
        <ul className="grid gap-2">
          {items.map((item) => <li className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted" key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

function IntegrityBadge({ item }: { item: AttendanceSnapshotIntegrityResult }) {
  const tone = item.severity === "ok" ? "success" : item.severity === "warning" ? "warning" : "danger";
  return <Badge tone={tone}>{statusLabel(item.status)}</Badge>;
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
