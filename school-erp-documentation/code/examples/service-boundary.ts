export const staffWorkloadService = {
  async getStaffWorkload(scope: TenantScopedQuery, staffId: string) {
    const staff = await staffService.getStaffById(scope, staffId);
    if (!staff) return null;
    return calculateTenantScopedWorkload(scope, staff);
  },
};
