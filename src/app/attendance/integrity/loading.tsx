import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";

export default function AttendanceIntegrityLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Inspecting attendance snapshot integrity." eyebrow="Attendance Integrity" title="Snapshot Integrity" />
        <Card>
          <SectionHeader eyebrow="Loading" title="Diagnostics" />
          <div className="grid gap-3 p-4 sm:grid-cols-4 sm:p-5">
            {Array.from({ length: 8 }).map((_, index) => <div className="h-20 animate-pulse rounded-lg bg-surface-muted" key={index} />)}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
