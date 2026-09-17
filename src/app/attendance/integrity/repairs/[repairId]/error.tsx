"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function AttendanceRepairDetailError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="The repair request could not be loaded." eyebrow="Attendance Repair" title="Repair Request" />
        <Card className="p-4 sm:p-5">
          <EmptyState description={error.message || "Please retry or return to the repair queue."} title="Unable to load repair request" />
          <Button className="mt-4" onClick={reset} type="button" variant="secondary">Retry</Button>
        </Card>
      </div>
    </AppShell>
  );
}
