import Link from "next/link";
import { Card, EmptyState, SectionHeader } from "@/components/ui";

export function GuardianNotFound() {
  return (
    <div className="erp-container">
      <Card className="mx-auto max-w-xl p-5">
        <SectionHeader eyebrow="Guardian / Parent Management" title="Guardian not found" />
        <div className="p-4 sm:p-5">
          <EmptyState description="The guardian record does not exist in the current school context or is no longer available." title="Guardian not found" />
          <Link className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/guardians">Back to Guardians</Link>
        </div>
      </Card>
    </div>
  );
}
