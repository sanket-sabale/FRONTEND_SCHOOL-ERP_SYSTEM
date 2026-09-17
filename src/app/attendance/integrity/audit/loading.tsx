import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function AttendanceRepairAuditLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Loading attendance repair audit records." eyebrow="Attendance Repair Audit" title="Audit & Evidence" />
        <Card>
          <SectionHeader eyebrow="Loading" title="Audit Directory" />
          <div className="grid gap-3 p-4 sm:p-5">{Array.from({ length: 6 }).map((_, index) => <div className="h-16 animate-pulse rounded-lg bg-surface-muted" key={index} />)}</div>
        </Card>
      </div>
    </AppShell>
  );
}
