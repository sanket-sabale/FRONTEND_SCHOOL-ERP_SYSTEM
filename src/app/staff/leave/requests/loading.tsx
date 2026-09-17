import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function StaffLeaveRequestsLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader eyebrow="Staff Leave" title="Loading requests" description="Preparing leave request queue." />
        <Card className="h-28 animate-pulse bg-surface-muted" />
        <Card className="h-80 animate-pulse bg-surface-muted" />
      </div>
    </AppShell>
  );
}
