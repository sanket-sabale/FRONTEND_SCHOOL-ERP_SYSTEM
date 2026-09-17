import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { FinanceDashboard } from "@/features/finance/components/finance-dashboard";
import { financeService } from "@/lib/api/finance";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function FinancePage() {
  if (!hasPermission(currentSessionRole, "fees.view")) redirect("/unauthorized");
  const summary = await financeService.getDashboard(getScope());
  return (
    <AppShell>
      <FinanceDashboard context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }} summary={summary} />
    </AppShell>
  );
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
