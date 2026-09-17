"use client";

import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function AdmissionsError({ error }: { error: Error }) {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader description="The admissions foundation route could not load." eyebrow="Admissions Foundation" title="Admissions" />
        <Card>
          <SectionHeader eyebrow="Error" title="Admission Workspace Unavailable" />
          <p className="p-4 text-sm text-foreground-muted sm:p-5">{error.message}</p>
        </Card>
      </div>
    </AppShell>
  );
}
