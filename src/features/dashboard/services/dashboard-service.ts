import { hasPermission } from "@/components/shared/permission-gate";
import { getMockPrincipalDashboardSummary } from "@/features/dashboard/mock/dashboard-mock";
import type { PrincipalDashboardSummary } from "@/features/dashboard/types/dashboard";
import type { TenantScopedQuery } from "@/lib/api/client";
import type { Role } from "@/types/erp";

export const dashboardService = {
  async getPrincipalSummary(scope: TenantScopedQuery, role: Role): Promise<PrincipalDashboardSummary> {
    const summary = getMockPrincipalDashboardSummary(scope);

    return {
      ...summary,
      kpis: summary.kpis.filter((item) => hasPermission(role, item.permission)),
      changes: summary.changes.filter((item) => hasPermission(role, item.permission)),
      actions: summary.actions.filter((item) => hasPermission(role, item.permission)),
      exceptions: summary.exceptions.filter((item) => hasPermission(role, item.permission)),
      intelligence: summary.intelligence.filter((item) => hasPermission(role, item.permission)),
      operations: summary.operations.filter((item) => hasPermission(role, item.permission)),
      activities: summary.activities.filter((item) => hasPermission(role, item.permission)),
      quickActions: summary.quickActions.filter((item) => hasPermission(role, item.permission)),
    };
  },

  getDashboardKpis(scope: TenantScopedQuery, role: Role) {
    return this.getPrincipalSummary(scope, role).then((summary) => summary.kpis);
  },

  getDashboardChanges(scope: TenantScopedQuery, role: Role) {
    return this.getPrincipalSummary(scope, role).then((summary) => summary.changes);
  },

  getDashboardActions(scope: TenantScopedQuery, role: Role) {
    return this.getPrincipalSummary(scope, role).then((summary) => summary.actions);
  },

  getDashboardExceptions(scope: TenantScopedQuery, role: Role) {
    return this.getPrincipalSummary(scope, role).then((summary) => summary.exceptions);
  },
};
