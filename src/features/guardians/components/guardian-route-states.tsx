import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/shared/skeleton";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export function GuardiansFormSkeleton() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Preparing guardian form." eyebrow="Guardian / Parent Management" title="Add Guardian">
          <Skeleton className="h-24 w-full lg:w-80" />
        </PageHeader>
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <SectionHeader eyebrow="Guardian / Parent" title="Loading section" />
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
