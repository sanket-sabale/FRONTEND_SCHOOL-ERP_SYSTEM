import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/shared/skeleton";
import { Card, PageHeader } from "@/components/ui";

export default function MarkAttendanceLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader description="Loading the attendance roster." eyebrow="Student Attendance" title="Mark Attendance" />
        <Card className="p-4 sm:p-5">
          <Skeleton className="h-24 w-full" />
        </Card>
        <Card className="p-4 sm:p-5">
          <Skeleton className="h-96 w-full" />
        </Card>
      </div>
    </AppShell>
  );
}
