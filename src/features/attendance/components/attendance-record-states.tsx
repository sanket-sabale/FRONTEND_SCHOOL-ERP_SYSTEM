import Link from "next/link";
import { Card, EmptyState, SectionHeader } from "@/components/ui";

export function AttendanceRecordNotFound() {
  return (
    <div className="erp-container">
      <Card className="mx-auto max-w-xl">
        <SectionHeader eyebrow="Attendance History" title="Attendance record not found" />
        <div className="p-4 sm:p-5">
          <EmptyState description="The attendance record does not exist or is outside the active school context." title="Record unavailable" />
          <Link className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/attendance/history">
            Back to Attendance History
          </Link>
        </div>
      </Card>
    </div>
  );
}
