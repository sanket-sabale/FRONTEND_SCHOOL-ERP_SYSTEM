import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { CreateRepairRequestForm } from "@/features/attendance/components/attendance-repair-actions";
import { RepairStatusBadge } from "@/features/attendance/components/attendance-repair-queue";
import type { AttendanceSnapshotIntegrityResult } from "@/features/attendance/types/attendance-integrity";
import type { AttendanceSnapshotRepairEvent, AttendanceSnapshotRepairRequest } from "@/features/attendance/types/attendance-repair";

export function AttendanceIntegrityDetail({
  context,
  repairEvents,
  repairRequest,
  result,
}: {
  context: { school: string; campus: string; academicYear: string };
  repairEvents: AttendanceSnapshotRepairEvent[];
  repairRequest?: AttendanceSnapshotRepairRequest | null;
  result: AttendanceSnapshotIntegrityResult;
}) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Attendance", "Snapshot Integrity", result.attendanceId]} />}
        description="Read-only diagnostic view for stored attendance snapshot, resolved placement, and migration repair planning."
        eyebrow="Attendance Integrity Detail"
        title={result.studentName ?? result.studentId}
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity">
              Back to Integrity
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/attendance/history/${encodeURIComponent(result.attendanceId)}`}>
              History Record
            </Link>
          </div>
        }
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="flex flex-wrap gap-2">
            <IntegrityBadge result={result} />
            <Badge tone={result.repairPlan.requiresManualReview ? "warning" : result.repairPossible ? "info" : "neutral"}>
              {repairLabel(result.repairPlan.repairability)}
            </Badge>
            {repairRequest ? <RepairStatusBadge status={repairRequest.status} /> : null}
          </div>
        </Card>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHeader eyebrow="Stored snapshot" title="Immutable Attendance Context" />
          <div className="grid gap-3 p-4 sm:p-5">
            <InfoRow label="Attendance ID" value={result.attendanceId} mono />
            <InfoRow label="Attendance Date" value={formatDate(result.attendanceDate)} />
            <InfoRow label="Student" value={result.studentName ?? result.studentId} />
            <InfoRow label="Admission Number" value={result.admissionNumber} />
            <InfoRow label="Academic Year" value={result.storedSnapshot.academicYearName ?? result.storedSnapshot.academicYearId} />
            <InfoRow label="Class" value={result.storedSnapshot.className ?? result.storedSnapshot.classId} />
            <InfoRow label="Section" value={result.storedSnapshot.sectionName ?? result.storedSnapshot.sectionId} />
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Resolved placement" title="Diagnostic Placement Context" />
          <div className="grid gap-3 p-4 sm:p-5">
            <InfoRow label="Placement ID" value={result.resolvedPlacement?.placementId} mono />
            <InfoRow label="Academic Year" value={result.resolvedPlacement?.academicYearName ?? result.resolvedPlacement?.academicYearId} />
            <InfoRow label="Class" value={result.resolvedPlacement?.className ?? result.resolvedPlacement?.classId} />
            <InfoRow label="Section" value={result.resolvedPlacement?.sectionName ?? result.resolvedPlacement?.sectionId} />
            <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">
              Resolved placement is diagnostic. It is not written back to attendance in Stage 6.
            </div>
          </div>
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="Integrity" title="Diagnostic Result" />
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-3">
          <InfoRow label="Status" value={statusLabel(result.status)} />
          <InfoRow label="Severity" value={statusLabel(result.severity)} />
          <InfoRow label="Automatic Repair Safe" value={result.automaticRepairSafe ? "Yes" : "No"} />
          <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted lg:col-span-3">{result.reason}</div>
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Repair plan" title="Read-only Repair Contract" />
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
          <InfoRow label="Repairability" value={repairLabel(result.repairPlan.repairability)} />
          <InfoRow label="Confidence" value={statusLabel(result.repairPlan.confidence)} />
          <InfoRow label="Manual Review Required" value={result.repairPlan.requiresManualReview ? "Yes" : "No"} />
          <InfoRow label="Automatic Repair Safe" value={result.repairPlan.automaticRepairSafe ? "Yes" : "No"} />
          {result.repairPlan.proposedSnapshot ? (
            <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm lg:col-span-2">
              <p className="font-semibold text-foreground">Proposed snapshot</p>
              <p className="mt-1 text-foreground-muted">
                {result.repairPlan.proposedSnapshot.academicYearName ?? result.repairPlan.proposedSnapshot.academicYearId} / {result.repairPlan.proposedSnapshot.className} / {result.repairPlan.proposedSnapshot.sectionName}
              </p>
            </div>
          ) : (
            <div className="lg:col-span-2">
              <EmptyState description="No deterministic repair snapshot is available for this record." title="No proposed repair" />
            </div>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Controlled repair" title="Review-First Repair Workflow" />
        <div className="grid gap-4 p-4 sm:p-5">
          {repairRequest ? (
            <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm">
              <p className="font-semibold text-foreground">Existing repair request</p>
              <p className="mt-1 text-foreground-muted">{repairRequest.id}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <RepairStatusBadge status={repairRequest.status} />
                <a className="text-sm font-medium text-primary hover:underline" href={`/attendance/integrity/repairs/${encodeURIComponent(repairRequest.id)}`}>View repair request</a>
              </div>
            </div>
          ) : result.repairPlan.proposedSnapshot && result.repairPlan.repairability !== "not_needed" && result.status !== "unresolved" ? (
            <CreateRepairRequestForm attendanceId={result.attendanceId} />
          ) : (
            <EmptyState description="This attendance record is valid, unresolved, or lacks deterministic repair evidence." title="Repair request unavailable" />
          )}
          {repairEvents.length > 0 ? (
            <div className="grid gap-2">
              {repairEvents.map((event) => (
                <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted" key={event.id}>
                  Applied repair {event.repairId} by {event.appliedBy}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function IntegrityBadge({ result }: { result: AttendanceSnapshotIntegrityResult }) {
  const tone = result.severity === "ok" ? "success" : result.severity === "warning" ? "warning" : "danger";
  return <Badge tone={tone}>{statusLabel(result.status)}</Badge>;
}

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm">
      <span className="text-foreground-muted">{label}</span>
      <span className={mono ? "responsive-text text-right font-mono text-xs text-foreground" : "responsive-text text-right font-medium text-foreground"}>{value || "Not available"}</span>
    </div>
  );
}

function repairLabel(value: string) {
  return statusLabel(value.replace("not_needed", "no_repair_needed"));
}

function statusLabel(value: string) {
  return value.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}
