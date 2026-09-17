"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function AttendanceIntegrityError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="The attendance integrity workspace could not be loaded." eyebrow="Attendance Integrity" title="Snapshot Integrity" />
        <Card className="p-4 sm:p-5">
          <EmptyState description={error.message || "Please retry or return to attendance history."} title="Unable to load diagnostics" />
          <Button className="mt-4" onClick={reset} type="button" variant="secondary">Retry</Button>
        </Card>
      </div>
    </AppShell>
  );
}
