"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, SectionHeader } from "@/components/ui";

export default function CommunicationError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <Card className="mx-auto max-w-xl p-5">
        <SectionHeader title="Unable to load conversations" eyebrow="Communication" />
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Please try again. If this continues, ask your school administrator to check your access.
        </p>
        <Button className="mt-5" onClick={reset} variant="secondary">
          Retry
        </Button>
      </Card>
    </AppShell>
  );
}
