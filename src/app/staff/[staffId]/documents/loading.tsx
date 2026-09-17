import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function StaffDocumentsLoading() {
  return <AppShell><div className="erp-container space-y-4"><PageHeader eyebrow="Staff Documents" title="Loading documents" description="Preparing staff document records." /><Card className="h-96 animate-pulse bg-surface-muted" /></div></AppShell>;
}
