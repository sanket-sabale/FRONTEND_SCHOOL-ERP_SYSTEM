import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/shared/skeleton";
import { Card, PageHeader } from "@/components/ui";

export default function AttendanceHistoryDetailLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader description="Loading attendance record details." eyebrow="Attendance Record" title="Attendance Details" />
        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="p-4 sm:p-5"><Skeleton className="h-80 w-full" /></Card>
          <Card className="p-4 sm:p-5"><Skeleton className="h-80 w-full" /></Card>
        </section>
      </div>
    </AppShell>
  );
}
