import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function StaffAccountLinkLoading() {
  return <AppShell><div className="erp-container space-y-4"><PageHeader eyebrow="Account & Access" title="Loading eligible accounts" description="Preparing account link options." /><Card className="h-80 animate-pulse bg-surface-muted" /></div></AppShell>;
}
