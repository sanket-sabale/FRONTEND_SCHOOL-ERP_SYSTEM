import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function AcademicPromotionDetailLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Loading promotion review evidence." eyebrow="Promotion Review" title="Student Promotion" />
        <Card className="h-40 animate-pulse" />
      </div>
    </AppShell>
  );
}
