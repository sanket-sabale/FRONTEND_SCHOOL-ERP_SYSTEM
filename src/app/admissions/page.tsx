import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { admissionService } from "@/lib/api/admissions";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

export default async function AdmissionsPage() {
  if (!hasPermission(currentSessionRole, "admission.view")) {
    redirect("/unauthorized");
  }

  const [cycles, summary, applications, seats] = await Promise.all([
    admissionService.getAdmissionCycles(scope),
    admissionService.getAdmissionSummary(scope),
    admissionService.getApplications(scope, { page: 1, pageSize: 5 }),
    admissionService.getSeatAvailability(scope),
  ]);
  const activeCycle = cycles.find((cycle) => cycle.status === "open") ?? cycles[0];

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={["Admissions", tenantContext.academicYear]} />}
          description="Phase 0-2 admissions foundation: scoped cycles, application contracts, review states, document checks, seat capacity, and enrollment readiness rules."
          eyebrow="Admissions Foundation"
          title="Admissions"
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="Cycle" value={activeCycle?.name ?? "No cycle configured"} />
              <ContextLine label="Status" value={activeCycle?.status ?? "Unavailable"} />
              <ContextLine label="Campus" value={tenantContext.campus} />
            </div>
          </Card>
        </PageHeader>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Applications" value={summary.totalApplications} helper="Tenant-scoped intake records" />
          <MetricCard label="Pending review" value={summary.pendingReview} helper="Submitted or under review" tone="warning" />
          <MetricCard label="Documents pending" value={summary.documentsPending} helper="Verification bottleneck" tone="info" />
          <MetricCard label="Seats available" value={summary.seatsAvailable} helper="Configured capacity balance" tone="success" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <Card>
            <SectionHeader
              eyebrow="Application contract"
              title="Recent Applications"
              action={<Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/admissions/applications">Open Directory</Link>}
            />
            <div className="divide-y divide-border">
              {applications.items.map((application) => (
                <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5" key={application.id}>
                  <div className="min-w-0">
                    <p className="responsive-text font-semibold text-foreground">{application.applicantName}</p>
                    <p className="mt-1 text-sm text-foreground-muted">
                      {application.applicationNumber} / {application.appliedClassName}
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      Required documents: {application.documentSummary.verified}/{application.documentSummary.required} verified
                    </p>
                  </div>
                  <Badge tone={application.status === "document_pending" ? "warning" : "info"}>
                    {application.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
              {applications.items.length === 0 ? (
                <div className="p-4 sm:p-5">
                  <EmptyState description="No applications exist for the active admission scope." title="No applications" />
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <SectionHeader
              eyebrow="Documents"
              title="Verification Queue"
              action={<Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/admissions/documents">Open Queue</Link>}
            />
            <div className="space-y-3 p-4 sm:p-5">
              {seats.map((seat) => (
                <div className="rounded-lg border border-border bg-surface-muted p-3" key={seat.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="responsive-text text-sm font-semibold text-foreground">{seat.classId.replace("class-", "").replace(/-/g, " ")}</p>
                      <p className="mt-1 text-xs text-foreground-muted">Capacity {seat.capacity}</p>
                    </div>
                    <Badge tone={seat.available > 0 ? "success" : "danger"}>{seat.available} open</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-foreground-muted">
                    <span>Approved {seat.approved}</span>
                    <span>Reserved {seat.reserved}</span>
                    <span>Enrolled {seat.enrolled}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({
  helper,
  label,
  tone = "neutral",
  value,
}: {
  helper: string;
  label: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
  value: number;
}) {
  return (
    <Card className="responsive-card-padding">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-foreground-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value.toLocaleString("en-IN")}</p>
          <p className="mt-2 text-xs text-foreground-muted">{helper}</p>
        </div>
        <Badge tone={tone}>Phase 2</Badge>
      </div>
    </Card>
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
