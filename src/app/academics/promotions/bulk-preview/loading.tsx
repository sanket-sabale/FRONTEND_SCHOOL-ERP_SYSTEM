import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function BulkPromotionPreviewLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Loading bulk promotion readiness workspace." eyebrow="Controlled Bulk Promotion Readiness" title="Bulk Promotion Preview" />
        <Card className="h-40 animate-pulse" />
      </div>
    </AppShell>
  );
}
