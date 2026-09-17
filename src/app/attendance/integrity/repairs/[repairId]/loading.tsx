import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function AttendanceRepairDetailLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Loading repair request." eyebrow="Attendance Repair" title="Repair Request" />
        <Card>
          <SectionHeader eyebrow="Loading" title="Before / After" />
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {Array.from({ length: 6 }).map((_, index) => <div className="h-14 animate-pulse rounded-lg bg-surface-muted" key={index} />)}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
