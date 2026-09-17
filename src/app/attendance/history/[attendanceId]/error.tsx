"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";

export default function AttendanceHistoryDetailError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container">
        <Card className="mx-auto max-w-xl">
          <SectionHeader eyebrow="Attendance Record" title="Unable to load record" />
          <div className="p-4 sm:p-5">
            <EmptyState description="The attendance record details could not be loaded. Retry or return to attendance history." title="Record unavailable" />
            <Button className="mt-4" onClick={reset} variant="secondary">Retry</Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
