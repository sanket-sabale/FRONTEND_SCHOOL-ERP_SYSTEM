"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";

export default function MarkAttendanceError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container">
        <Card className="mx-auto max-w-xl">
          <SectionHeader eyebrow="Student Attendance" title="Unable to load roster" />
          <div className="p-4 sm:p-5">
            <EmptyState description="The attendance-taking workspace could not be loaded. Retry or ask an administrator to review access." title="Roster unavailable" />
            <Button className="mt-4" onClick={reset} variant="secondary">Retry</Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
