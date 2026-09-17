import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Select } from "@/components/ui";
import { AssignmentWorkloadConfigForm } from "@/features/staff-workload/components/assignment-workload-config-form";
import { ReadinessBadge, WorkloadStatusBadge } from "@/features/staff-workload/components/staff-workload-badges";
import { formatSlot, readinessLabels, workloadDayLabels, workloadStatusLabels } from "@/features/staff-workload/services/staff-workload-rules";
import type { StaffWorkloadDetail, StaffWorkloadFilters, StaffWorkloadListResponse, StaffWorkloadRow } from "@/features/staff-workload/types/staff-workload";
import type { StaffProfile } from "@/features/staff/types/staff";

export function StaffWorkloadDashboardPage({ filters, response }: { filters: StaffWorkloadFilters; response: StaffWorkloadListResponse }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Staff", "Workload & Scheduling"]} />}
        description="Review expected teaching load, configured academic responsibility, readiness gaps, and scheduling conflicts."
        eyebrow="Staff Operations"
        title="Workload & Scheduling"
        action={<Link className={linkButtonClasses} href="/staff/academic-assignments">Academic Assignments</Link>}
      />
      <SummaryGrid response={response} />
      <Card>
        <SectionHeader eyebrow={`${response.total} staff`} title="Teaching Workload" />
        <WorkloadFilters filters={filters} />
        <div className="grid gap-2 p-4 sm:p-5">
          {response.items.length === 0 ? <EmptyState description="No staff workload rows match the current filters." title="No workload records" /> : response.items.map((row) => <WorkloadRowCard key={row.staffId} row={row} />)}
        </div>
        <Pagination response={response} />
      </Card>
    </div>
  );
}

export function StaffWorkloadDetailPage({ canManage, detail }: { canManage: boolean; detail: StaffWorkloadDetail }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Staff", "Workload", detail.staffName]} />}
        description="Detailed academic workload, assignment configuration, availability, readiness, and detected conflicts."
        eyebrow="Workload Detail"
        title={detail.staffName}
        action={<div className="responsive-action-row"><Link className={linkButtonClasses} href="/staff/workload">Back to Workload</Link><Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(detail.staffId)}`}>Staff 360</Link></div>}
      />
      <WorkloadMetricBand row={detail} />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow={`${detail.assignments.length} assignments`} title="Academic Assignment Workload" />
          <div className="grid gap-3 p-4 sm:p-5">
            {detail.assignments.length === 0 ? <EmptyState description="No active academic assignments exist for this staff member." title="No assignments" /> : detail.assignments.map((assignment) => (
              <div className="rounded-lg border border-border bg-surface-muted p-3" key={assignment.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <Link className="responsive-text text-sm font-semibold text-foreground underline-offset-4 hover:underline" href={`/staff/academic-assignments/${encodeURIComponent(assignment.id)}`}>{assignment.subjectName}</Link>
                    <p className="text-xs text-foreground-muted">{assignment.className} / {assignment.sectionName}</p>
                    <p className="text-xs text-foreground-muted">Weekly periods: {assignment.workloadConfig?.weeklyPeriods ?? "Not configured"}</p>
                    {assignment.workloadConfig?.slots.length ? <p className="text-xs text-foreground-muted">Slots: {assignment.workloadConfig.slots.map((slot) => formatSlot(slot.day, slot.period)).join(", ")}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={assignment.workloadConfig?.weeklyPeriods === undefined ? "warning" : "success"}>{assignment.workloadConfig?.weeklyPeriods === undefined ? "Workload not configured" : "Configured"}</Badge>
                    <Badge tone="neutral">{assignment.status}</Badge>
                  </div>
                </div>
                {canManage ? (
                  <details className="mt-3 rounded-lg border border-border bg-surface p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-foreground">Configure workload</summary>
                    <div className="mt-3">
                      <AssignmentWorkloadConfigForm academicYearId={assignment.academicYearId} assignmentId={assignment.id} config={assignment.workloadConfig} />
                    </div>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
        <div className="grid gap-4">
          <ReadinessCard detail={detail} />
          <AvailabilityCard detail={detail} />
          <ConflictsCard detail={detail} />
        </div>
      </section>
    </div>
  );
}

export function StaffWorkloadPanel({ detail, staff }: { detail?: StaffWorkloadDetail | null; staff: StaffProfile }) {
  return (
    <Card id="workload-scheduling">
      <SectionHeader eyebrow="Workload & Scheduling" title="Academic Workload Readiness" action={<Link className={linkButtonClasses} href={`/staff/workload/${encodeURIComponent(staff.id)}`}>View Detail</Link>} />
      <div className="grid gap-3 p-4 sm:p-5">
        {!detail ? (
          <EmptyState description="No academic workload information is available for this staff member in the current scope." title="No workload record" />
        ) : (
          <>
            <WorkloadMetricBand row={detail} compact />
            <div className="flex flex-wrap gap-2">
              <WorkloadStatusBadge status={detail.calculation.status} />
              <ReadinessBadge status={detail.readiness.status} />
              <Badge tone={detail.conflicts > 0 ? "danger" : "success"}>{detail.conflicts} conflicts</Badge>
              <Badge tone={detail.missingConfiguredAssignments > 0 ? "warning" : "success"}>{detail.missingConfiguredAssignments} gaps</Badge>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function SummaryGrid({ response }: { response: StaffWorkloadListResponse }) {
  const summary = response.summary;
  const metrics = [
    ["Teaching Staff", summary.totalTeachingStaff, "info"],
    ["Configured", summary.workloadConfigured, "success"],
    ["Balanced", summary.balanced, "success"],
    ["Under Assigned", summary.underAssigned, "info"],
    ["Near Capacity", summary.nearCapacity, "warning"],
    ["Overloaded", summary.overloaded, "danger"],
    ["Conflicts", summary.schedulingConflicts, summary.schedulingConflicts ? "danger" : "success"],
    ["Assignment Gaps", summary.assignmentGaps, summary.assignmentGaps ? "warning" : "success"],
  ] as const;
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workload summary">
      {metrics.map(([label, value, tone]) => (
        <Card className="p-4" key={label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          <Badge tone={tone}>{label}</Badge>
        </Card>
      ))}
    </section>
  );
}

function WorkloadFilters({ filters }: { filters: StaffWorkloadFilters }) {
  return (
    <form className="grid gap-3 border-b border-border p-4 sm:grid-cols-[minmax(0,1fr)_180px_180px_auto] sm:p-5" method="get">
      <label className="grid gap-1 text-sm font-medium text-foreground">
        Search
        <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={filters.query ?? ""} name="query" placeholder="Teacher, department, designation..." />
      </label>
      <label className="grid gap-1 text-sm font-medium text-foreground">
        Status
        <Select defaultValue={filters.status ?? ""} name="status">
          <option value="">All statuses</option>
          {Object.entries(workloadStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-foreground">
        Readiness
        <Select defaultValue={filters.readiness ?? ""} name="readiness">
          <option value="">All readiness</option>
          {Object.entries(readinessLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </label>
      <button className="inline-flex min-h-9 items-center justify-center self-end rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" type="submit">Apply</button>
    </form>
  );
}

function WorkloadRowCard({ row }: { row: StaffWorkloadRow }) {
  return (
    <Link className="rounded-lg border border-border bg-surface-muted p-3 transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/staff/workload/${encodeURIComponent(row.staffId)}`}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.8fr)_minmax(220px,0.9fr)] lg:items-center">
        <div className="min-w-0">
          <p className="responsive-text text-sm font-semibold text-foreground">{row.staffName}</p>
          <p className="text-xs text-foreground-muted">{row.employeeNumber} / {row.departmentName} / {row.designationName}</p>
        </div>
        <div className="grid gap-1 text-sm text-foreground-muted">
          <span>Assigned: <strong className="text-foreground">{row.calculation.assignedWeeklyPeriods}</strong></span>
          <span>Expected: <strong className="text-foreground">{row.calculation.expectedWeeklyPeriods ?? "Not configured"}</strong></span>
          <span>Utilization: <strong className="text-foreground">{row.calculation.utilizationPercentage ? `${row.calculation.utilizationPercentage}%` : "--"}</strong></span>
        </div>
        <div className="flex flex-wrap gap-2">
          <WorkloadStatusBadge status={row.calculation.status} />
          <ReadinessBadge status={row.readiness.status} />
          <Badge tone={row.conflicts ? "danger" : "success"}>{row.conflicts} conflicts</Badge>
        </div>
      </div>
    </Link>
  );
}

function WorkloadMetricBand({ compact = false, row }: { compact?: boolean; row: StaffWorkloadRow }) {
  const metrics = [
    ["Expected", row.calculation.expectedWeeklyPeriods ?? "Not configured"],
    ["Assigned", row.calculation.assignedWeeklyPeriods],
    ["Utilization", row.calculation.utilizationPercentage ? `${row.calculation.utilizationPercentage}%` : "--"],
    ["Remaining", row.calculation.remainingCapacity ?? "--"],
    ["Overload", row.calculation.overloadPeriods],
  ];
  return (
    <section className={`grid gap-3 ${compact ? "sm:grid-cols-2 xl:grid-cols-5" : "sm:grid-cols-2 xl:grid-cols-5"}`} aria-label="Workload calculation">
      {metrics.map(([label, value]) => (
        <div className="rounded-lg border border-border bg-surface-muted p-3" key={label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
          <p className="responsive-text mt-2 text-lg font-semibold text-foreground">{value}</p>
        </div>
      ))}
    </section>
  );
}

function ReadinessCard({ detail }: { detail: StaffWorkloadDetail }) {
  return (
    <Card>
      <SectionHeader eyebrow="Scheduling Readiness" title="Readiness" action={<ReadinessBadge status={detail.readiness.status} />} />
      <div className="grid gap-2 p-4 sm:p-5">
        {[...detail.readiness.blockers, ...detail.readiness.warnings].length === 0 ? <EmptyState description="No readiness blockers or warnings were found." title="Ready for scheduling" /> : [...detail.readiness.blockers, ...detail.readiness.warnings].map((item) => <p className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground" key={item}>{item}</p>)}
      </div>
    </Card>
  );
}

function AvailabilityCard({ detail }: { detail: StaffWorkloadDetail }) {
  return (
    <Card>
      <SectionHeader eyebrow={`${detail.availability.length} rules`} title="Academic Availability" />
      <div className="grid gap-2 p-4 sm:p-5">
        {detail.availability.length === 0 ? <EmptyState description="No availability preferences are configured for this staff member." title="No availability rules" /> : detail.availability.map((item) => (
          <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm" key={item.id}>
            <p className="font-medium text-foreground">{workloadDayLabels[item.day]} / Period {item.period}</p>
            <p className="text-foreground-muted">{item.state.replaceAll("_", " ")}{item.notes ? ` / ${item.notes}` : ""}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ConflictsCard({ detail }: { detail: StaffWorkloadDetail }) {
  return (
    <Card>
      <SectionHeader eyebrow={`${detail.conflictsList.length} conflicts`} title="Conflict Detection" />
      <div className="grid gap-2 p-4 sm:p-5">
        {detail.conflictsList.length === 0 ? <EmptyState description="No scheduling conflicts were detected for this staff member." title="No conflicts" /> : detail.conflictsList.map((conflict) => (
          <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm" key={conflict.id}>
            <div className="mb-2"><Badge tone={conflict.severity === "blocking" ? "danger" : "warning"}>{conflict.type.replaceAll("_", " ")}</Badge></div>
            <p className="text-foreground">{conflict.message}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Pagination({ response }: { response: StaffWorkloadListResponse }) {
  return (
    <div className="flex flex-col gap-2 border-t border-border p-4 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <span>Showing {response.total === 0 ? 0 : (response.page - 1) * response.pageSize + 1}-{Math.min(response.total, response.page * response.pageSize)} of {response.total}</span>
      <div className="flex gap-2">
        <Link aria-disabled={response.page <= 1} className={linkButtonClasses} href={`/staff/workload?page=${Math.max(1, response.page - 1)}`}>Previous</Link>
        <Link aria-disabled={response.page >= response.totalPages} className={linkButtonClasses} href={`/staff/workload?page=${Math.min(response.totalPages, response.page + 1)}`}>Next</Link>
      </div>
    </div>
  );
}

const linkButtonClasses = "inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
