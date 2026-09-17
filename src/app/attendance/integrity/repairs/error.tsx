"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function AttendanceRepairQueueError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="The repair queue could not be loaded." eyebrow="Attendance Repair" title="Repair Queue" />
        <Card className="p-4 sm:p-5">
          <EmptyState description={error.message || "Please retry or return to snapshot integrity."} title="Unable to load repair queue" />
          <Button className="mt-4" onClick={reset} type="button" variant="secondary">Retry</Button>
        </Card>
      </div>
    </AppShell>
  );
}
