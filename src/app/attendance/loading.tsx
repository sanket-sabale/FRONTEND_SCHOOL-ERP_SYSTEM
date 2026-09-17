import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/shared/skeleton";
import { Card, PageHeader } from "@/components/ui";

export default function AttendanceLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader description="Loading attendance records." eyebrow="Student Attendance" title="Attendance Directory" />
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((item) => <Skeleton className="h-28 w-full" key={item} />)}
        </section>
        <Card className="p-4 sm:p-5">
          <Skeleton className="h-72 w-full" />
        </Card>
      </div>
    </AppShell>
  );
}
