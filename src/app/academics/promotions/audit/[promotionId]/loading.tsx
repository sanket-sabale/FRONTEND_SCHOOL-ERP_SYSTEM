import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function AcademicPromotionAuditDetailLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader eyebrow="Promotion Evidence" title="Loading evidence" />
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card className="h-56 animate-pulse p-4" />
          <Card className="h-56 animate-pulse p-4" />
        </div>
        <Card className="h-72 animate-pulse p-4" />
      </div>
    </AppShell>
  );
}
