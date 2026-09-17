import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function StaffDocumentDetailLoading() {
  return <AppShell><div className="erp-container space-y-4"><PageHeader eyebrow="Staff Documents" title="Loading document" description="Preparing staff document detail." /><Card className="h-80 animate-pulse bg-surface-muted" /></div></AppShell>;
}
