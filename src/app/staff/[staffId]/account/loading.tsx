import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function StaffAccountLoading() {
  return <AppShell><div className="erp-container space-y-4"><PageHeader eyebrow="Account & Access" title="Loading account access" description="Preparing staff account details." /><Card className="h-80 animate-pulse bg-surface-muted" /></div></AppShell>;
}
