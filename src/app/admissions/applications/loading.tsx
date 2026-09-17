import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function AdmissionApplicationsLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader description="Preparing application directory." eyebrow="Admissions" title="Admission Applications" />
        <Card>
          <SectionHeader eyebrow="Loading" title="Application Results" />
          <div className="grid gap-3 p-4 sm:p-5">
            <div className="h-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
