"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function StaffAttendanceError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container">
        <PageHeader eyebrow="Staff Attendance" title="Unable to load staff attendance" description="The attendance workspace could not be prepared." />
        <Card className="p-5">
          <EmptyState description="Try loading the staff attendance workspace again." title="Unable to load staff attendance" />
          <Button className="mt-4" onClick={reset} type="button">Retry</Button>
        </Card>
      </div>
    </AppShell>
  );
}
