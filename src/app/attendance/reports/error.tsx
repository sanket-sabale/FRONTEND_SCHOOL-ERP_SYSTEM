"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";

export default function AttendanceReportsError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container">
        <Card className="mx-auto max-w-xl">
          <SectionHeader eyebrow="Attendance Analytics" title="Unable to load reports" />
          <div className="p-4 sm:p-5">
            <EmptyState description="The attendance report workspace could not be loaded. Retry or ask an administrator to review report access." title="Reports unavailable" />
            <Button className="mt-4" onClick={reset} variant="secondary">Retry</Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
