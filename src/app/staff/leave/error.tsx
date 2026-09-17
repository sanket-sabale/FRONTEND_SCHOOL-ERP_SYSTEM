"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function StaffLeaveError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container">
        <PageHeader eyebrow="Staff Leave" title="Unable to load staff leave" description="The leave workspace could not be prepared." />
        <Card className="p-5">
          <EmptyState description="Try loading the staff leave workspace again." title="Unable to load staff leave" />
          <Button className="mt-4" onClick={reset} type="button">Retry</Button>
        </Card>
      </div>
    </AppShell>
  );
}
