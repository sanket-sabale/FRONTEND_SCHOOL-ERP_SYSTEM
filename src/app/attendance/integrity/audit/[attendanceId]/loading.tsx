import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function AttendanceRepairAuditDetailLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Loading attendance repair audit evidence." eyebrow="Attendance Repair Audit" title="Audit Detail" />
        <Card>
          <SectionHeader eyebrow="Loading" title="Evidence" />
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">{Array.from({ length: 8 }).map((_, index) => <div className="h-14 animate-pulse rounded-lg bg-surface-muted" key={index} />)}</div>
        </Card>
      </div>
    </AppShell>
  );
}
