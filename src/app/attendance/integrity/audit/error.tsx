"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function AttendanceRepairAuditError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="The attendance repair audit workspace could not be loaded." eyebrow="Attendance Repair Audit" title="Audit & Evidence" />
        <Card className="p-4 sm:p-5">
          <EmptyState description={error.message || "Please retry or return to snapshot integrity."} title="Unable to load audit" />
          <Button className="mt-4" onClick={reset} type="button" variant="secondary">Retry</Button>
        </Card>
      </div>
    </AppShell>
  );
}
