"use client";

import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export default function BulkPromotionPreviewError() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="The bulk promotion preview workspace could not be loaded." eyebrow="Controlled Bulk Promotion Readiness" title="Bulk Promotion Preview" />
        <Card className="p-4 sm:p-5">
          <EmptyState description="Refresh the page or return to the promotion workspace." title="Bulk preview unavailable" />
        </Card>
      </div>
    </AppShell>
  );
}
