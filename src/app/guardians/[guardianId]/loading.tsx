import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/shared/skeleton";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function GuardianProfileLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Loading guardian profile." eyebrow="Guardian 360" title="Guardian Profile">
          <Skeleton className="h-24 w-full lg:w-80" />
        </PageHeader>
        <Card>
          <SectionHeader eyebrow="Relationships" title="Loading linked students" />
          <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
