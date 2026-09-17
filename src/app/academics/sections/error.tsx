"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, PageHeader } from "@/components/ui";

export default function SectionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          description="The section directory could not be loaded. Try again without losing the current ERP shell context."
          eyebrow="Academic Structure"
          title="Section Management"
        />
        <Card className="p-4 sm:p-5">
          <p className="text-sm font-semibold text-danger">Sections could not be loaded.</p>
          <p className="mt-1 text-sm text-foreground-muted">{error.message || "An unexpected error occurred."}</p>
          <Button className="mt-4" onClick={reset} type="button" variant="secondary">Try Again</Button>
        </Card>
      </div>
    </AppShell>
  );
}
