"use client";

import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";

export default function AcademicYearsError({ reset }: { reset: () => void }) {
  return (
    <div className="erp-container py-6">
      <Card>
        <SectionHeader eyebrow="Academic Structure" title="Unable to load academic years" />
        <div className="p-4 sm:p-5">
          <EmptyState description="The academic year workflow could not be loaded. Refresh and try again." title="Academic years unavailable" />
          <Button className="mt-4" onClick={reset} variant="secondary">Try Again</Button>
        </div>
      </Card>
    </div>
  );
}
