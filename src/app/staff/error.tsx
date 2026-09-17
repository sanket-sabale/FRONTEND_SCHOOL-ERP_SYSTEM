"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";

export default function StaffError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container">
        <Card className="mx-auto max-w-xl p-5">
          <SectionHeader eyebrow="Staff Management" title="Unable to load staff" />
          <div className="p-4 sm:p-5">
            <EmptyState description="Please retry. If this continues, ask an administrator to review your access." title="Unable to load staff" />
            <Button className="mt-4" onClick={reset} variant="secondary">Retry</Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
