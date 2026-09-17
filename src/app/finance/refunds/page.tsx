import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { FinanceRefundsPage } from "@/features/finance/components/finance-list-pages";
import { refundStatuses } from "@/features/finance/types/finance";
import { financeService } from "@/lib/api/finance";
import { currentSessionRole } from "@/lib/current-user";
import { readEnumQueryParam, readNumberQueryParam } from "@/lib/query-params";
import { tenantContext } from "@/lib/tenant-context";

export default async function FinanceRefundsRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!hasPermission(currentSessionRole, "fees.view")) redirect("/unauthorized");
  const query = await searchParams;
  const data = await financeService.listRefunds(getScope(), { status: readEnumQueryParam(query.status, refundStatuses), page: readNumberQueryParam(query.page, 1), pageSize: readNumberQueryParam(query.pageSize, 25) });
  return <AppShell><FinanceRefundsPage data={data} /></AppShell>;
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
