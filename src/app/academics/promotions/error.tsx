"use client";

import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export default function AcademicPromotionsError() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="The academic promotion workspace could not be loaded." eyebrow="Academic Year Transition" title="Student Promotions" />
        <Card className="p-4 sm:p-5">
          <EmptyState description="Refresh the page or return to academic structure." title="Promotion workspace unavailable" />
        </Card>
      </div>
    </AppShell>
  );
}
