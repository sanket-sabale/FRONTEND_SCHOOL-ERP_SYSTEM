import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import type { AttendanceRepairQueueResponse, AttendanceSnapshotRepairRequest } from "@/features/attendance/types/attendance-repair";

export function AttendanceRepairQueue({
  context,
  queue,
}: {
  context: { school: string; campus: string; academicYear: string };
  queue: AttendanceRepairQueueResponse;
}) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Attendance", "Snapshot Integrity", "Repair Queue"]} />}
        description="Review, approve, reject, and apply controlled attendance snapshot repair requests one record at a time."
        eyebrow="Attendance Repair"
        title="Repair Queue"
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/integrity">
              Snapshot Integrity
            </Link>
          </div>
        }
      />

      <Card>
        <SectionHeader eyebrow="Requests" title={`${queue.total.toLocaleString("en-IN")} Repair Request${queue.total === 1 ? "" : "s"}`} />
        {queue.items.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState description="No repair requests match the current scope." title="Repair queue is clear" />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Integrity</th>
                    <th className="px-4 py-3">Before</th>
                    <th className="px-4 py-3">Proposed</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queue.items.map((request) => <RepairRow key={request.id} request={request} />)}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {queue.items.map((request) => (
                <article className="rounded-lg border border-border bg-surface-muted p-3" key={request.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{request.studentName ?? request.studentId}</p>
                      <p className="text-xs text-foreground-muted">{formatDate(request.attendanceDate)}</p>
                    </div>
                    <RepairStatusBadge status={request.status} />
                  </div>
                  <p className="mt-3 text-sm text-foreground-muted">Before: {snapshotLabel(request.currentSnapshot.className, request.currentSnapshot.sectionName)}</p>
                  <p className="mt-1 text-sm text-foreground-muted">Proposed: {snapshotLabel(request.proposedSnapshot.className, request.proposedSnapshot.sectionName)}</p>
                  <Link className="mt-3 inline-flex text-sm font-medium text-primary hover:underline" href={`/attendance/integrity/repairs/${encodeURIComponent(request.id)}`}>Review request</Link>
                </article>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function RepairRow({ request }: { request: AttendanceSnapshotRepairRequest }) {
  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{request.studentName ?? request.studentId}</p>
        <p className="text-xs text-foreground-muted">{request.admissionNumber ?? "Admission unavailable"}</p>
      </td>
      <td className="px-4 py-3">{formatDate(request.attendanceDate)}</td>
      <td className="px-4 py-3"><Badge tone="warning">{statusLabel(request.integrityStatus)}</Badge></td>
      <td className="px-4 py-3">{snapshotLabel(request.currentSnapshot.className, request.currentSnapshot.sectionName)}</td>
      <td className="px-4 py-3">{snapshotLabel(request.proposedSnapshot.className, request.proposedSnapshot.sectionName)}</td>
      <td className="px-4 py-3">{statusLabel(request.confidence)}</td>
      <td className="px-4 py-3"><RepairStatusBadge status={request.status} /></td>
      <td className="px-4 py-3"><Link className="text-sm font-medium text-primary hover:underline" href={`/attendance/integrity/repairs/${encodeURIComponent(request.id)}`}>Review</Link></td>
    </tr>
  );
}

export function RepairStatusBadge({ status }: { status: AttendanceSnapshotRepairRequest["status"] }) {
  const tone = status === "applied" ? "success" : status === "failed" || status === "rejected" ? "danger" : status === "approved" ? "info" : "warning";
  return <Badge tone={tone}>{statusLabel(status)}</Badge>;
}

export function snapshotLabel(className?: string, sectionName?: string) {
  if (!className && !sectionName) return "Not available";
  return `${className ?? "Unknown class"} / ${sectionName ?? "Unknown section"}`;
}

export function statusLabel(value: string) {
  return value.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}
