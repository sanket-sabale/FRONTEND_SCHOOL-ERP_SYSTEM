import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function AcademicPromotionAuditLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader eyebrow="Promotion Review Audit" title="Promotion Audit" />
        <Card className="h-32 animate-pulse p-4" variant="muted" />
        <Card className="h-96 animate-pulse p-4" />
      </div>
    </AppShell>
  );
}
