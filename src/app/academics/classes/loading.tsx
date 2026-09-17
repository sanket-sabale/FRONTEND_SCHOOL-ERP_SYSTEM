import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";
import { Skeleton } from "@/components/shared/skeleton";

export default function LoadingAcademicClasses() {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader description="Loading class management." eyebrow="Academic Structure" title="Class Management" />
        <Card>
          <SectionHeader eyebrow="Directory" title="Loading classes" />
          <div className="grid gap-3 p-4 sm:p-5">
            {[0, 1, 2].map((item) => <Skeleton className="h-24 w-full" key={item} />)}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
