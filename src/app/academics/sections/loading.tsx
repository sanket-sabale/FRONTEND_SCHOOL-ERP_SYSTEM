import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function SectionsLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          description="Loading authoritative section records from Academic Structure."
          eyebrow="Academic Structure"
          title="Section Management"
        />
        <Card className="p-4 sm:p-5">
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="h-14 animate-pulse rounded-lg bg-surface-muted" key={index} />
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
