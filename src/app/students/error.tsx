"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, SectionHeader } from "@/components/ui";

export default function StudentsError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <Card className="mx-auto max-w-xl p-5">
        <SectionHeader eyebrow="Student Management" title="Unable to load students" />
        <p className="mt-4 text-sm leading-6 text-foreground-muted">
          Please retry. If this continues, ask your school administrator to review your access.
        </p>
        <Button className="mt-5" onClick={reset} variant="secondary">
          Retry
        </Button>
      </Card>
    </AppShell>
  );
}
