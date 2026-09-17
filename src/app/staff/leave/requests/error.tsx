"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function StaffLeaveRequestsError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container">
        <PageHeader eyebrow="Staff Leave" title="Unable to load requests" description="The leave request queue could not be loaded." />
        <Card className="p-5">
          <EmptyState description="Try loading the leave request queue again." title="Unable to load leave requests" />
          <Button className="mt-4" onClick={reset} type="button">Retry</Button>
        </Card>
      </div>
    </AppShell>
  );
}
