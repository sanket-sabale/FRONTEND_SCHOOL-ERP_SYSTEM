import { AppShell } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";

export default function AcademicPromotionsLoading() {
  return (
    <AppShell>
      <div className="erp-container space-y-4">
        <PageHeader description="Loading academic promotion planning records." eyebrow="Academic Year Transition" title="Student Promotions" />
        <Card className="h-40 animate-pulse" />
      </div>
    </AppShell>
  );
}
