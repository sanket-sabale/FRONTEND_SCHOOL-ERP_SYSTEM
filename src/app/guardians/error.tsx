"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";

export default function GuardiansError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <Card className="mx-auto max-w-xl p-5">
        <SectionHeader eyebrow="Guardian / Parent Management" title="Unable to load guardians" />
        <div className="p-4 sm:p-5">
          <EmptyState description="Please retry. If this continues, ask an administrator to review your access." title="Unable to load guardians" />
          <Button className="mt-4" onClick={reset} variant="secondary">Retry</Button>
        </div>
      </Card>
    </AppShell>
  );
}
