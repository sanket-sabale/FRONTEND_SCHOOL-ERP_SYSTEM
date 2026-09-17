import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { staffDocumentService } from "@/lib/api/staff-documents";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffDocumentsIndexPage() {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const scope = getScope();
  const staff = await staffService.listStaff(scope, { pageSize: 100, sortBy: "displayName", sortDirection: "asc" });
  const rows = await Promise.all(staff.items.map(async (item) => {
    const documents = await staffDocumentService.listStaffDocuments(scope, item.id);
    return { staff: item, documents };
  }));

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={["Staff", "Documents"]} />}
          description="Select a staff member to manage HR documents, verification, and expiry tracking."
          eyebrow="Staff Documents"
          title="Staff Documents"
        />
        <Card>
          <SectionHeader eyebrow={tenantContext.academicYear} title={`${rows.length.toLocaleString("en-IN")} staff records`} />
          {rows.length === 0 ? (
            <div className="p-4 sm:p-5"><EmptyState description="Create staff records before adding documents." title="No staff available" /></div>
          ) : (
            <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map(({ documents, staff: item }) => (
                <Link className="rounded-lg border border-border bg-surface-muted p-4 transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/staff/${encodeURIComponent(item.id)}/documents`} key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="responsive-text font-semibold text-foreground">{item.displayName}</p>
                      <p className="mt-1 font-mono text-xs text-foreground-muted">{item.employeeNumber}</p>
                      <p className="mt-2 text-sm text-foreground-muted">{item.departmentName} / {item.designationName}</p>
                    </div>
                    <Badge tone={documents.pending || documents.expired ? "warning" : "success"}>{documents.total} docs</Badge>
                  </div>
                  <p className="mt-3 text-sm text-foreground-muted">{documents.verified} verified / {documents.pending} pending / {documents.expired} expired</p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function getScope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}
