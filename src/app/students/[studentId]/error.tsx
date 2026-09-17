"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";

export default function StudentProfileError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <Card className="mx-auto max-w-xl p-5">
        <SectionHeader eyebrow="Student Management" title="Unable to load student profile" />
        <div className="p-4 sm:p-5">
          <EmptyState
            description="Please retry. If this continues, ask your school administrator to review your access."
            title="Unable to load student profile"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={reset} variant="secondary">
              Retry
            </Button>
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
              href="/students"
            >
              Back to Students
            </Link>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
