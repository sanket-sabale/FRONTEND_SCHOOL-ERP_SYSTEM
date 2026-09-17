import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function AttendanceIntegrityDetailLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Loading attendance snapshot diagnostics." eyebrow="Attendance Integrity" title="Record Integrity" />
        <Card>
          <SectionHeader eyebrow="Loading" title="Record Details" />
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {Array.from({ length: 8 }).map((_, index) => <div className="h-12 animate-pulse rounded-lg bg-surface-muted" key={index} />)}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
