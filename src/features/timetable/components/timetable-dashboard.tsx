import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { TimetableStatusBadge } from "@/features/timetable/components/timetable-status-badge";
import { formatDateTime } from "@/features/timetable/components/timetable-formatters";
import type { TimetableSummary } from "@/features/timetable/types/timetable";
import type { Role } from "@/types/erp";
import { hasPermission } from "@/components/shared/permission-gate";

export function TimetableDashboard({
  context,
  role,
  summary,
}: {
  context: { school: string; campus: string; academicYear: string };
  role: Role;
  summary: TimetableSummary;
}) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Timetable"]} />}
        description="Plan, validate, and publish class, teacher, and room schedules from one tenant-scoped timetable workspace."
        eyebrow="Timetable Management"
        title="Scheduling Workspace"
        action={<TimetableActions canManage={hasPermission(role, "timetable.manage")} />}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Timetable summary">
        <Metric label="Schedules" value={summary.activeScheduleCount} />
        <Metric label="Classes" value={summary.totalClasses} />
        <Metric label="Teachers" value={summary.totalTeachers} />
        <Metric label="Rooms" value={summary.totalRooms} />
        <Metric label="Periods" value={summary.totalPeriods} />
        <Metric label="Conflicts" value={summary.conflictCount} tone={summary.conflictCount > 0 ? "danger" : "success"} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <SectionHeader eyebrow="Current planning" title="Timetable State" />
          <div className="grid gap-3 p-4 sm:p-5">
            {summary.activeTimetable ? (
              <article className="rounded-lg border border-border bg-surface-muted p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="responsive-text text-lg font-semibold text-foreground">{summary.activeTimetable.name}</h2>
                    <p className="mt-1 text-sm text-foreground-muted">Version {summary.activeTimetable.versionNumber} / Updated {formatDateTime(summary.lastUpdated)}</p>
                  </div>
                  <TimetableStatusBadge status={summary.activeTimetable.status} />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <StateLine label="Draft" value={summary.draftTimetable?.name ?? "No active draft"} />
                  <StateLine label="Published" value={summary.publishedTimetable?.name ?? "Not published"} />
                </div>
              </article>
            ) : (
              <EmptyState title="No timetable yet" description="Create a draft timetable to start scheduling this academic year." />
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Actions" title="Quick Actions" />
          <div className="grid gap-2 p-4 sm:p-5">
            <QuickLink href="/timetable/maker" label={summary.draftTimetable ? "Continue Draft" : "Open Maker"} />
            <QuickLink href="/timetable/classes" label="Class View" />
            <QuickLink href="/timetable/teachers" label="Teacher View" />
            <QuickLink href="/timetable/rooms" label="Room View" />
            <QuickLink href="/timetable/settings" label="Manage Schedules" />
            <QuickLink href="/timetable/templates" label="Manage Templates" />
            <QuickLink href="/timetable/versions" label="Version History" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function TimetableActions({ canManage }: { canManage: boolean }) {
  return (
    <div className="responsive-action-row">
      <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/timetable/maker">
        Open Maker
      </Link>
      {canManage ? <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/timetable/settings">Settings</Link> : null}
    </div>
  );
}

function Metric({ label, value, tone = "info" }: { label: string; value: number; tone?: "success" | "danger" | "info" }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className={`mt-3 text-2xl font-semibold ${tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-foreground"}`}>{value.toLocaleString("en-IN")}</p>
    </Card>
  );
}

function StateLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="responsive-text mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="flex min-h-10 items-center justify-between rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={href}>
      {label}
      <span aria-hidden="true">-&gt;</span>
    </Link>
  );
}
