import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";
import { Skeleton } from "@/components/shared/skeleton";

export default function FinanceLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader eyebrow="Finance Core" title="Finance" description="Loading finance dashboard." />
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => <Card className="responsive-card-padding" key={index}><Skeleton className="h-16" /></Card>)}
        </section>
      </div>
    </AppShell>
  );
}
