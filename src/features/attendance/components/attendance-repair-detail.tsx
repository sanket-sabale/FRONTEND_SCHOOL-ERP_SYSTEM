import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { RepairReviewActions } from "@/features/attendance/components/attendance-repair-actions";
import { RepairStatusBadge, snapshotLabel, statusLabel } from "@/features/attendance/components/attendance-repair-queue";
import type { AttendanceSnapshotRepairEvent, AttendanceSnapshotRepairRequest } from "@/features/attendance/types/attendance-repair";

export function AttendanceRepairDetail({
  context,
  events,
  request,
}: {
  context: { school: string; campus: string; academicYear: string };
  events: AttendanceSnapshotRepairEvent[];
  request: AttendanceSnapshotRepairRequest;
}) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Attendance", "Repair Queue", request.id]} />}
        description="Controlled review for a repair that changes academic snapshot context only."
        eyebrow="Attendance Snapshot Repair"
        title={request.studentName ?? request.studentId}
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity/repairs">
              Repair Queue
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/attendance/integrity/${encodeURIComponent(request.attendanceId)}`}>
              Integrity Detail
            </Link>
          </div>
        }
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="flex flex-wrap gap-2">
            <RepairStatusBadge status={request.status} />
            <Badge tone="warning">{statusLabel(request.integrityStatus)}</Badge>
          </div>
        </Card>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SnapshotCard eyebrow="Before" title="Reviewed Snapshot" snapshot={request.currentSnapshot} />
        <SnapshotCard eyebrow="Proposed After" title="Repair Snapshot" snapshot={request.proposedSnapshot} />
      </section>

      <Card>
        <SectionHeader eyebrow="Evidence" title="Historical Placement Evidence" />
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-3">
          <InfoRow label="Student" value={request.studentName ?? request.studentId} />
          <InfoRow label="Admission Number" value={request.admissionNumber} />
          <InfoRow label="Attendance Date" value={formatDate(request.attendanceDate)} />
          <InfoRow label="Attendance Status" value={request.attendanceStatus ? statusLabel(request.attendanceStatus) : undefined} />
          <InfoRow label="Confidence" value={statusLabel(request.confidence)} />
          <InfoRow label="Requested By" value={request.requestedBy} />
          <InfoRow label="Requested At" value={formatDateTime(request.requestedAt)} />
          <InfoRow label="Reviewer" value={request.reviewerId} />
          <InfoRow label="Reviewed At" value={formatDateTime(request.reviewedAt)} />
          <InfoRow label="Applied By" value={request.appliedBy} />
          <InfoRow label="Applied At" value={formatDateTime(request.appliedAt)} />
          <InfoRow label="Failure Reason" value={request.failureReason} />
          <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted lg:col-span-3">{request.reason}</div>
          {request.reviewComment ? <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted lg:col-span-3">{request.reviewComment}</div> : null}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Review actions" title="Approve, Reject, or Apply" />
        <div className="p-4 sm:p-5">
          {["pending_review", "approved"].includes(request.status) ? (
            <RepairReviewActions repairId={request.id} status={request.status} />
          ) : (
            <EmptyState description="This repair request is not in a state that accepts review actions." title="No action available" />
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Repair history" title="Applied Repair Events" />
        <div className="grid gap-3 p-4 sm:p-5">
          {events.length === 0 ? (
            <EmptyState description="No applied repair event exists for this request." title="No repair event" />
          ) : events.map((event) => (
            <article className="rounded-lg border border-border bg-surface-muted p-3" key={event.id}>
              <p className="font-medium text-foreground">{snapshotLabel(event.beforeSnapshot.className, event.beforeSnapshot.sectionName)} to {snapshotLabel(event.afterSnapshot.className, event.afterSnapshot.sectionName)}</p>
              <p className="mt-1 text-sm text-foreground-muted">Applied by {event.appliedBy} on {formatDateTime(event.appliedAt)}</p>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SnapshotCard({ eyebrow, title, snapshot }: { eyebrow: string; title: string; snapshot: AttendanceSnapshotRepairRequest["currentSnapshot"] }) {
  return (
    <Card>
      <SectionHeader eyebrow={eyebrow} title={title} />
      <div className="grid gap-3 p-4 sm:p-5">
        <InfoRow label="Academic Year" value={snapshot.academicYearName ?? snapshot.academicYearId} />
        <InfoRow label="Class" value={snapshot.className ?? snapshot.classId} />
        <InfoRow label="Section" value={snapshot.sectionName ?? snapshot.sectionId} />
        <InfoRow label="Placement Evidence" value={snapshot.placementId} mono />
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
