import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function AdmissionsLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader description="Preparing admissions foundation data." eyebrow="Admissions Foundation" title="Admissions" />
        <Card>
          <SectionHeader eyebrow="Loading" title="Admission Workspace" />
          <div className="space-y-3 p-4 sm:p-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
