import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Card, PageHeader } from "@/components/ui";
import { GuardianCreateForm } from "@/features/guardians/components/guardian-create-form";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default function NewGuardianPage() {
  if (!hasPermission(currentSessionRole, "guardian.create")) redirect("/unauthorized");

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={["Guardian / Parents", "New Guardian"]} />}
          description="Create a guardian record that can later be linked to one or more students."
          eyebrow="Guardian / Parent Management"
          title="Add Guardian"
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <span className="text-foreground-muted">{tenantContext.school}</span>
              <span className="font-medium text-foreground">{tenantContext.campus} / {tenantContext.academicYear}</span>
            </div>
          </Card>
        </PageHeader>
        <GuardianCreateForm />
      </div>
    </AppShell>
  );
}
