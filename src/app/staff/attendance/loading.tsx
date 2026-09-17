import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function StaffAttendanceLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader eyebrow="Staff Attendance" title="Loading attendance" description="Preparing the staff roster and attendance controls." />
        <Card className="h-36 animate-pulse bg-surface-muted" />
        <Card className="h-96 animate-pulse bg-surface-muted" />
      </div>
    </AppShell>
  );
}
