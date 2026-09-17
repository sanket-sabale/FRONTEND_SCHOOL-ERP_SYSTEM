"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function AttendanceBulkRepairError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="The batch repair preview workspace could not be loaded." eyebrow="Attendance Repair Readiness" title="Bulk Repair Preview" />
        <Card className="p-4 sm:p-5">
          <EmptyState description={error.message || "Please retry or return to snapshot integrity."} title="Unable to load bulk preview" />
          <Button className="mt-4" onClick={reset} type="button" variant="secondary">Retry</Button>
        </Card>
      </div>
    </AppShell>
  );
}
