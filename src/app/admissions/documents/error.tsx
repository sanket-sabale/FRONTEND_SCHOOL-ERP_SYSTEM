"use client";

import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function AdmissionDocumentsError({ error }: { error: Error }) {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader description="The document queue could not load." eyebrow="Admissions" title="Document Verification Queue" />
        <Card>
          <SectionHeader eyebrow="Error" title="Document Queue Unavailable" />
          <p className="p-4 text-sm text-foreground-muted sm:p-5">{error.message}</p>
        </Card>
      </div>
    </AppShell>
  );
}
