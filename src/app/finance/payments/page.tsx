import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { FinancePaymentsPage } from "@/features/finance/components/finance-list-pages";
import { paymentMethods, paymentStatuses } from "@/features/finance/types/finance";
import { financeService } from "@/lib/api/finance";
import { currentSessionRole } from "@/lib/current-user";
import { readEnumQueryParam, readNumberQueryParam, readQueryParam } from "@/lib/query-params";
import { tenantContext } from "@/lib/tenant-context";

export default async function FinancePaymentsRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!hasPermission(currentSessionRole, "fees.view")) redirect("/unauthorized");
  const query = await searchParams;
  const data = await financeService.listPayments(getScope(), { query: readQueryParam(query.query), status: readEnumQueryParam(query.status, paymentStatuses), method: readEnumQueryParam(query.method, paymentMethods), page: readNumberQueryParam(query.page, 1), pageSize: readNumberQueryParam(query.pageSize, 25) });
  return <AppShell><FinancePaymentsPage data={data} /></AppShell>;
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
