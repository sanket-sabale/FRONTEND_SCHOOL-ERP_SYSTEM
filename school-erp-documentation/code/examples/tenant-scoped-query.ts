type TenantScopedQuery = {
  tenantId: string;
  schoolId: string;
  campusId: string;
  academicYearId: string;
};

function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId
    && record.schoolId === scope.schoolId
    && record.campusId === scope.campusId
    && record.academicYearId === scope.academicYearId;
}
