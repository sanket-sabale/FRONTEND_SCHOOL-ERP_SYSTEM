import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/shared/skeleton";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function StudentCreateLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          description="Preparing the student admission workflow."
          eyebrow="Student Management"
          title="Add Student"
        >
          <Skeleton className="h-28 w-full lg:w-80" />
        </PageHeader>

        {[0, 1, 2, 3].map((item) => (
          <Card key={item}>
            <SectionHeader eyebrow="Admission" title="Loading section" />
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
