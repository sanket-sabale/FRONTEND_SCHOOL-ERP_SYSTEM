import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function AttendanceBulkRepairLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Loading controlled batch repair preview." eyebrow="Attendance Repair Readiness" title="Bulk Repair Preview" />
        <Card>
          <SectionHeader eyebrow="Loading" title="Selection" />
          <div className="grid gap-3 p-4 sm:p-5">{Array.from({ length: 6 }).map((_, index) => <div className="h-14 animate-pulse rounded-lg bg-surface-muted" key={index} />)}</div>
        </Card>
      </div>
    </AppShell>
  );
}
