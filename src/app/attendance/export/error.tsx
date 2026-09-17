"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function AttendanceExportError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader description="The attendance export workspace could not be loaded." eyebrow="Attendance Reporting" title="Export / Report Pack" />
        <Card className="p-4 sm:p-5">
          <EmptyState description={error.message || "Please retry or return to attendance reports."} title="Unable to load attendance export" />
          <Button className="mt-4" onClick={reset} variant="secondary">Retry</Button>
        </Card>
      </div>
    </AppShell>
  );
}
