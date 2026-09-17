import Link from "next/link";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import { dashboardService } from "@/features/dashboard/services/dashboard-service";
import { clampPercent } from "@/features/dashboard/utils/dashboard-calculations";
import type {
  DashboardActivity,
  DashboardActionItem,
  DashboardChange,
  DashboardDimension,
  DashboardException,
  DashboardIntelligencePanel,
  DashboardKpi,
  DashboardOperationItem,
  DashboardQuickAction,
  DashboardRiskSignal,
  DashboardSeverity,
  DashboardTone,
  DashboardTrendDirection,
  PrincipalDashboardSummary,
} from "@/features/dashboard/types/dashboard";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

const linkButtonClasses = "inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
const textLinkClasses = "text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";

export async function PrincipalDashboard() {
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const summary = await dashboardService.getPrincipalSummary(scope, currentSessionRole);

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <DashboardContextHeader summary={summary} />
      <ExecutiveKpis kpis={summary.kpis} />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]" aria-label="Executive dashboard decisions">
        <div className="grid gap-4">
          <WhatsChanged changes={summary.changes} />
          <SchoolPerformance dimensions={summary.performance} />
        </div>
        <ActionCenter actions={summary.actions} quickActions={summary.quickActions} />
      </section>
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]" aria-label="Exceptions and intelligence">
        <ExceptionCenter exceptions={summary.exceptions} />
        <IntelligencePanels panels={summary.intelligence} />
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]" aria-label="Student risk and school operations">
        <StudentRiskIntelligence risks={summary.studentRisks} />
        <TodaysOperations operations={summary.operations} />
      </section>
      <RecentActivity activities={summary.activities} />
    </div>
  );
}

function DashboardContextHeader({ summary }: { summary: PrincipalDashboardSummary }) {
  return (
    <section className="responsive-panel border border-border bg-surface p-4 shadow-sm sm:p-5" aria-labelledby="dashboard-title">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,auto)] lg:items-start">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">Executive School Control Center</p>
          <h1 className="responsive-text mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl" id="dashboard-title">
            {summary.context.school} operations dashboard
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground-muted">
            A permission-aware, tenant-scoped snapshot for decisions, exceptions, approvals, and drill-down into operational records.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="info">Tenant scoped</Badge>
            <Badge tone="success">RBAC filtered</Badge>
            <Badge tone="neutral">{summary.context.dataSourceLabel}</Badge>
          </div>
        </div>
        <Card className="responsive-card-padding" variant="muted" aria-label="Current school scope">
          <div className="grid gap-2 text-sm">
            <ContextLine label="Education Group" value={summary.context.group} />
            <ContextLine label="School" value={summary.context.school} />
            <ContextLine label="Campus" value={summary.context.campus} />
            <ContextLine label="Academic Year" value={summary.context.academicYear} />
            <ContextLine label="Current Date" value={summary.context.currentDateLabel} />
            <ContextLine label="Data Freshness" value={summary.context.dataFreshnessLabel} />
          </div>
        </Card>
      </div>
    </section>
  );
}

function ExecutiveKpis({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <section aria-labelledby="executive-kpis-title">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Executive KPI Layer</p>
        <h2 className="text-lg font-semibold text-foreground" id="executive-kpis-title">School status at a glance</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Link className="group block min-w-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={kpi.href} key={kpi.id}>
            <Card className="flex h-full flex-col p-4 transition-colors group-hover:border-border-strong group-hover:bg-surface-muted motion-reduce:transition-none" variant="interactive">
              <div className="flex items-start justify-between gap-3">
                <p className="responsive-text text-sm font-medium text-foreground-muted">{kpi.label}</p>
                <Badge tone={kpi.tone}>{kpi.status}</Badge>
              </div>
              <p className="responsive-text mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{kpi.value}</p>
              <p className="mt-2 text-sm text-foreground-muted">{kpi.secondaryMetric}</p>
              <dl className="mt-4 grid gap-2 text-xs text-foreground-muted">
                <MetricLine label="Change" value={`${trendLabel(kpi.trend)}: ${kpi.comparison}`} />
                <MetricLine label="Target" value={kpi.target} />
              </dl>
              <p className="mt-4 text-sm leading-5 text-foreground-muted">{kpi.description}</p>
              <span className="mt-4 text-sm font-medium text-primary">View records</span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function WhatsChanged({ changes }: { changes: DashboardChange[] }) {
  return (
    <Card>
      <SectionHeader eyebrow="What's changed" title="Period Comparisons" />
      <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2">
        {changes.map((change) => (
          <Link className="rounded-lg border border-border bg-surface-muted p-3 transition hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 motion-reduce:transition-none" href={change.href} key={change.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="responsive-text font-semibold text-foreground">{change.label}</p>
                <p className="mt-1 text-sm text-foreground-muted">{change.current} now / {change.previous} before</p>
              </div>
              <Badge tone={change.tone}>{change.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-foreground-muted">{trendLabel(change.direction)}: {change.absoluteChange}{change.percentChange ? ` / ${change.percentChange}` : ""}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function SchoolPerformance({ dimensions }: { dimensions: DashboardDimension[] }) {
  return (
    <Card>
      <SectionHeader eyebrow="School health" title="Transparent Performance Summary" />
      <div className="grid gap-3 p-4 sm:p-5">
        {dimensions.map((dimension) => {
          const value = Number.parseFloat(dimension.value);
          return (
            <div className="grid gap-2" key={dimension.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{dimension.label}</p>
                  <p className="text-xs text-foreground-muted">Actual {dimension.value} / Target {dimension.target} / Change {dimension.change}</p>
                </div>
                <Badge tone={dimension.tone}>{dimension.status}</Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`${dimension.label}: ${dimension.value} against ${dimension.target}. ${dimension.status}.`}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${clampPercent(Number.isFinite(value) ? value : 0)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ActionCenter({ actions, quickActions }: { actions: DashboardActionItem[]; quickActions: DashboardQuickAction[] }) {
  return (
    <Card id="action-center">
      <SectionHeader eyebrow="Action center" title="Approvals & Next Actions" />
      <div className="grid gap-3 p-4 sm:p-5">
        {actions.length === 0 ? <EmptyState description="No permitted dashboard actions are waiting in the current scope." title="No actions waiting" /> : actions.map((action) => (
          <article className="rounded-lg border border-border bg-surface-muted p-3" key={action.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="responsive-text font-semibold text-foreground">{action.title}</p>
                <p className="mt-1 text-sm leading-5 text-foreground-muted">{action.description}</p>
              </div>
              <SeverityBadge severity={action.severity} />
            </div>
            <dl className="mt-3 grid gap-2 text-xs text-foreground-muted sm:grid-cols-2">
              <MetricLine label="Owner" value={action.assignedTo} />
              <MetricLine label="Status" value={action.status} />
            </dl>
            <Link className={`${textLinkClasses} mt-3 inline-flex`} href={action.actionUrl}>Open filtered workflow</Link>
          </article>
        ))}
      </div>
      <div className="border-t border-border p-4 sm:p-5">
        <p className="text-sm font-semibold text-foreground">Quick actions</p>
        <div className="mt-3 grid gap-2">
          {quickActions.map((action) => (
            <Link className={linkButtonClasses} href={action.href} key={action.id}>{action.label}</Link>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ExceptionCenter({ exceptions }: { exceptions: DashboardException[] }) {
  return (
    <Card id="exception-center">
      <SectionHeader eyebrow="Exception center" title="Aggregated Risks" />
      <div className="grid gap-3 p-4 sm:p-5">
        {exceptions.map((exception) => (
          <article className="rounded-lg border border-border bg-surface-muted p-3" key={exception.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="responsive-text font-semibold text-foreground">{exception.count.toLocaleString("en-IN")} {exception.title}</p>
                <p className="mt-1 text-sm leading-5 text-foreground-muted">{exception.reason}</p>
              </div>
              <SeverityBadge severity={exception.severity} />
            </div>
            <p className="mt-3 text-xs text-foreground-muted">{exception.sourceModule} / {exception.age}</p>
            <Link className={`${textLinkClasses} mt-3 inline-flex`} href={exception.actionUrl}>{exception.actionLabel}</Link>
          </article>
        ))}
      </div>
    </Card>
  );
}

function IntelligencePanels({ panels }: { panels: DashboardIntelligencePanel[] }) {
  return (
    <section className="grid gap-4" aria-label="School intelligence panels">
      {panels.map((panel) => (
        <Card id={panel.id} key={panel.id}>
          <SectionHeader eyebrow={panel.eyebrow} title={panel.title} />
          <div className="p-4 sm:p-5">
            <p className="text-sm leading-6 text-foreground-muted">{panel.summary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {panel.metrics.map((metric) => {
                const content = (
                  <div className="rounded-lg border border-border bg-surface-muted p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground-muted">{metric.label}</p>
                      <Badge tone={metric.tone}>{metric.label}</Badge>
                    </div>
                    <p className="responsive-text mt-3 text-xl font-semibold text-foreground">{metric.value}</p>
                    <p className="mt-1 text-xs text-foreground-muted">{metric.helper}</p>
                  </div>
                );
                return metric.href ? (
                  <Link className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={metric.href} key={metric.label}>{content}</Link>
                ) : (
                  <div key={metric.label}>{content}</div>
                );
              })}
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}

function StudentRiskIntelligence({ risks }: { risks: DashboardRiskSignal[] }) {
  return (
    <Card>
      <SectionHeader eyebrow="Student intelligence" title="Risk Signals Without Double Counting" />
      <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-3">
        {risks.map((risk) => (
          <article className="rounded-lg border border-border bg-surface-muted p-3" key={risk.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="responsive-text font-semibold text-foreground hover:underline" href={risk.actionUrl}>{risk.studentName}</Link>
                <p className="mt-1 text-xs text-foreground-muted">{risk.classSection}</p>
              </div>
              <SeverityBadge severity={risk.primaryRisk} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {risk.signals.map((signal) => <Badge key={signal} tone="neutral">{signal}</Badge>)}
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

function TodaysOperations({ operations }: { operations: DashboardOperationItem[] }) {
  return (
    <Card>
      <SectionHeader eyebrow="Today's operations" title="Operational Timeline" />
      <div className="grid gap-3 p-4 sm:p-5">
        {operations.map((item) => (
          <article className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-lg border border-border bg-surface-muted p-3" key={item.id}>
            <time className="text-sm font-semibold text-primary">{item.time}</time>
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="responsive-text font-semibold text-foreground">{item.title}</p>
                <Badge tone={item.tone}>{item.status}</Badge>
              </div>
              <p className="mt-1 text-sm leading-5 text-foreground-muted">{item.description}</p>
              <Link className={`${textLinkClasses} mt-2 inline-flex`} href={item.href}>Open context</Link>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

function RecentActivity({ activities }: { activities: DashboardActivity[] }) {
  return (
    <Card>
      <SectionHeader eyebrow="Recent activity" title="Audit-Safe Activity Feed" />
      <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-3">
        {activities.map((activity) => (
          <article className="rounded-lg border border-border bg-surface-muted p-3" key={activity.id}>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{activity.occurredAtLabel}</p>
            <p className="responsive-text mt-2 font-semibold text-foreground">{activity.title}</p>
            <p className="mt-1 text-sm leading-5 text-foreground-muted">{activity.description}</p>
            <Link className={`${textLinkClasses} mt-3 inline-flex`} href={activity.href}>View detail</Link>
          </article>
        ))}
      </div>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: DashboardSeverity }) {
  const toneBySeverity: Record<DashboardSeverity, DashboardTone> = {
    critical: "danger",
    high: "danger",
    medium: "warning",
    low: "info",
  };
  return <Badge tone={toneBySeverity[severity]}>{severity}</Badge>;
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-medium text-foreground-muted">{label}</dt>
      <dd className="responsive-text text-foreground">{value}</dd>
    </div>
  );
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span>
    </div>
  );
}

function trendLabel(direction: DashboardTrendDirection) {
  if (direction === "up") return "Up";
  if (direction === "down") return "Down";
  return "Flat";
}
