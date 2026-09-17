import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function AttendanceRepairQueueLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Loading controlled snapshot repair requests." eyebrow="Attendance Repair" title="Repair Queue" />
        <Card>
          <SectionHeader eyebrow="Loading" title="Requests" />
          <div className="grid gap-3 p-4 sm:p-5">
            {Array.from({ length: 5 }).map((_, index) => <div className="h-16 animate-pulse rounded-lg bg-surface-muted" key={index} />)}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
