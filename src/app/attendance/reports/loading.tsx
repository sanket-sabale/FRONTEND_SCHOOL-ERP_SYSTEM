import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/shared/skeleton";
import { Card, PageHeader } from "@/components/ui";

export default function AttendanceReportsLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader description="Loading attendance analytics." eyebrow="Attendance Analytics" title="Attendance Reports" />
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <Skeleton className="h-28 w-full" key={item} />)}
        </section>
        <Card className="p-4 sm:p-5"><Skeleton className="h-96 w-full" /></Card>
      </div>
    </AppShell>
  );
}
