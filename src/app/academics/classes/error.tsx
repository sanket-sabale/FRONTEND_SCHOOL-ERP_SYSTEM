"use client";

import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";

export default function AcademicClassesError({ reset }: { reset: () => void }) {
  return (
    <div className="erp-container py-6">
      <Card>
        <SectionHeader eyebrow="Academic Structure" title="Unable to load classes" />
        <div className="p-4 sm:p-5">
          <EmptyState description="The class management workflow could not be loaded. Refresh and try again." title="Class management unavailable" />
          <Button className="mt-4" onClick={reset} variant="secondary">Try Again</Button>
        </div>
      </Card>
    </div>
  );
}
