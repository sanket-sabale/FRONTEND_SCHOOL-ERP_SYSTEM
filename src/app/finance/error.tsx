"use client";

import { AppShell } from "@/components/app-shell";
import { Button, EmptyState } from "@/components/ui";

export default function FinanceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell>
      <div className="erp-container">
        <EmptyState title="Finance could not load" description="Refresh the finance workspace and try again." />
        <div className="mt-4"><Button onClick={reset}>Retry</Button></div>
      </div>
    </AppShell>
  );
}
