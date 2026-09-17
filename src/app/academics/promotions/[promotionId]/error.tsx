"use client";

import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export default function AcademicPromotionDetailError() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="The promotion detail could not be loaded." eyebrow="Promotion Review" title="Student Promotion" />
        <Card className="p-4 sm:p-5">
          <EmptyState description="The promotion record may be unavailable or outside the active scope." title="Promotion detail unavailable" />
        </Card>
      </div>
    </AppShell>
  );
}
