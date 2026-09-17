import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { getAuditEventLabel, getAuditSourceLabel } from "@/features/attendance/services/attendance-repair-audit-rules";
import type { AttendanceAcademicSnapshot } from "@/features/attendance/types/attendance-integrity";
import type { AttendanceRepairAuditDetail as AuditDetail } from "@/features/attendance/types/attendance-repair-audit";

export function AttendanceRepairAuditDetail({
  context,
  detail,
}: {
  context: { school: string; campus: string; academicYear: string };
  detail: AuditDetail;
}) {
  const { record, timeline } = detail;

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Attendance", "Audit", record.attendanceId]} />}
        description="Read-only evidence view for attendance snapshot integrity and repair lifecycle history."
        eyebrow="Attendance Repair Audit"
        title={record.studentName ?? record.studentId ?? record.attendanceId}
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity/audit">
              Audit Directory
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/attendance/history/${encodeURIComponent(record.attendanceId)}`}>
              Attendance History
            </Link>
          </div>
        }
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={record.integrityStatus ?? "diagnostic"} />
            <StatusBadge value={record.repairStatus ?? "no_repair"} />
            <Badge tone="neutral">{getAuditSourceLabel(record.source)}</Badge>
          </div>
        </Card>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHeader eyebrow="Attendance context" title="Attendance Record" />
          <div className="grid gap-3 p-4 sm:p-5">
            <InfoRow label="Attendance ID" value={record.attendanceId} mono />
            <InfoRow label="Student" value={record.studentName ?? record.studentId} />
            <InfoRow label="Admission Number" value={record.admissionNumber} />
            <InfoRow label="Attendance Date" value={record.attendanceDate ? formatDate(record.attendanceDate) : undefined} />
            <InfoRow label="Attendance Status" value={record.attendanceStatus ? statusLabel(record.attendanceStatus) : undefined} />
            <InfoRow label="Source" value={getAuditSourceLabel(record.source)} />
            <InfoRow label="Batch Correlation" value={record.batchCorrelationId} mono />
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Integrity" title="Diagnostic Evidence" />
          <div className="grid gap-3 p-4 sm:p-5">
            <InfoRow label="Integrity Status" value={record.integrityStatus ? statusLabel(record.integrityStatus) : undefined} />
            <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">{record.integrityReason ?? "No diagnostic reason available."}</div>
            <InfoRow label="Resolved Placement" value={snapshotLabel(record.resolvedSnapshot)} />
            <InfoRow label="Proposed Snapshot" value={snapshotLabel(record.proposedSnapshot)} />
            <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">
              Evidence is derived from attendance snapshot diagnostics, effective placement, and academic structure scope checks.
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SnapshotCard eyebrow="Before" title="Original Snapshot" snapshot={record.currentSnapshot} />
        <SnapshotCard eyebrow="After" title="Proposed / Applied Snapshot" snapshot={record.proposedSnapshot} />
      </section>

      <Card>
        <SectionHeader eyebrow="Repair" title="Repair Lifecycle" />
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-3">
          <InfoRow label="Repair ID" value={record.repairId} mono />
          <InfoRow label="Repair Status" value={record.repairStatus ? statusLabel(record.repairStatus) : "No repair request"} />
          <InfoRow label="Last Actor" value={record.lastActorId} />
          <InfoRow label="Last Event" value={record.lastEventType ? getAuditEventLabel(record.lastEventType) : undefined} />
          <InfoRow label="Last Updated" value={formatDateTime(record.lastUpdatedAt)} />
          <InfoRow label="Academic Snapshot Only" value="Yes" />
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Timeline" title="Chronological Audit Events" />
        <ol className="grid gap-3 p-4 sm:p-5">
          {timeline.length === 0 ? (
            <li><EmptyState description="No audit events are available for this record." title="No timeline" /></li>
          ) : timeline.map((event) => (
            <li className="rounded-lg border border-border bg-surface-muted p-4" key={event.eventId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{getAuditEventLabel(event.eventType)}</p>
                  <p className="mt-1 text-sm text-foreground-muted">{event.reason ?? event.comment ?? "No event note available."}</p>
                </div>
                <Badge tone="neutral">{formatDateTime(event.timestamp)}</Badge>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <InfoRow label="Actor" value={event.actorDisplayName ?? event.actorId} />
                <InfoRow label="Repair ID" value={event.repairId} mono />
                <InfoRow label="Before" value={snapshotLabel(event.beforeSnapshot)} />
                <InfoRow label="After" value={snapshotLabel(event.afterSnapshot)} />
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function SnapshotCard({ eyebrow, title, snapshot }: { eyebrow: string; title: string; snapshot?: AttendanceAcademicSnapshot }) {
  return (
    <Card>
      <SectionHeader eyebrow={eyebrow} title={title} />
      <div className="grid gap-3 p-4 sm:p-5">
        <InfoRow label="Academic Year" value={snapshot?.academicYearName ?? snapshot?.academicYearId} />
        <InfoRow label="Class" value={snapshot?.className ?? snapshot?.classId} />
        <InfoRow label="Section" value={snapshot?.sectionName ?? snapshot?.sectionId} />
        <InfoRow label="Placement Evidence" value={snapshot?.placementId} mono />
        <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">Academic snapshot only. Attendance status, student placement, and student profile are not changed by audit reporting.</div>
      </div>
    </Card>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm">
      <span className="text-foreground-muted">{label}</span>
      <span className={mono ? "responsive-text text-right font-mono text-xs text-foreground" : "responsive-text text-right font-medium text-foreground"}>{value || "Not available"}</span>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone = ["applied", "valid"].includes(value) ? "success" : ["failed", "rejected", "unresolved"].includes(value) ? "danger" : ["approved"].includes(value) ? "info" : "warning";
  return <Badge tone={tone}>{statusLabel(value)}</Badge>;
}

function snapshotLabel(snapshot?: AttendanceAcademicSnapshot) {
  if (!snapshot) return "Not available";
  if (!snapshot.className && !snapshot.sectionName) return snapshot.academicYearName ?? snapshot.academicYearId ?? "Not available";
  return `${snapshot.academicYearName ?? snapshot.academicYearId ?? "Unknown year"} / ${snapshot.className ?? "Unknown class"} / ${snapshot.sectionName ?? "Unknown section"}`;
}

function statusLabel(value: string) {
  return value.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
