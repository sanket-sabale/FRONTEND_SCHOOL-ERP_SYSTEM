import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function StaffLeaveLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader eyebrow="Staff Leave" title="Loading leave workspace" description="Preparing balances and request forms." />
        <Card className="h-24 animate-pulse bg-surface-muted" />
        <Card className="h-96 animate-pulse bg-surface-muted" />
      </div>
    </AppShell>
  );
}
