"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function StaffAttendanceHistoryError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container">
        <PageHeader eyebrow="Staff Attendance" title="Unable to load history" description="Attendance history could not be loaded." />
        <Card className="p-5">
          <EmptyState description="Try loading the history again." title="Unable to load attendance history" />
          <Button className="mt-4" onClick={reset} type="button">Retry</Button>
        </Card>
      </div>
    </AppShell>
  );
}
