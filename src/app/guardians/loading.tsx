import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/shared/skeleton";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function GuardiansLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Loading guardian records." eyebrow="Guardian / Parent Management" title="Guardian Directory">
          <Skeleton className="h-24 w-full lg:w-80" />
        </PageHeader>
        <Card>
          <SectionHeader eyebrow="Results" title="Loading guardians" />
          <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
            {[0, 1, 2, 3].map((item) => <Skeleton className="h-28 w-full" key={item} />)}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
