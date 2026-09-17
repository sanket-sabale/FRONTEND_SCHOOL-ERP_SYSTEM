"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, SectionHeader } from "@/components/ui";

export default function AcademicPromotionAuditDetailError() {
  return (
    <AppShell>
      <div className="erp-container">
        <Card className="mx-auto max-w-xl">
          <SectionHeader eyebrow="Promotion Evidence" title="Promotion evidence unavailable" />
          <div className="p-4 sm:p-5">
            <EmptyState description="This promotion evidence record could not be loaded safely." title="Promotion unavailable" />
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/academics/promotions/audit">Back to Promotion Audit</Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
