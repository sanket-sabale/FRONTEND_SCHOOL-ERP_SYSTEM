"use client";

import { useEffect, useMemo, useState } from "react";
import { queryKey, type TenantScopedQuery } from "@/lib/api/client";
import { staffFiltersSchema } from "@/features/staff/schemas/staff.schema";
import type { StaffFilters } from "@/features/staff/types/staff";
import { staffService } from "@/lib/api/staff";

export function staffQuery(scope: TenantScopedQuery, filters: Partial<StaffFilters> = {}) {
  const parsedFilters = staffFiltersSchema.parse(filters);

  return {
    queryKey: queryKey("staff", scope, parsedFilters),
    queryFn: () => staffService.listStaff(scope, parsedFilters),
  };
}

export function useStaff(
  scope: TenantScopedQuery,
  filters: Partial<StaffFilters> = {},
  refreshKey = 0,
) {
  const parsedFilters = useMemo(() => staffFiltersSchema.parse(filters), [filters]);
  const [state, setState] = useState<
    | { status: "loading"; data: null; error: null }
    | { status: "success"; data: Awaited<ReturnType<typeof staffService.listStaff>>; error: null }
    | { status: "error"; data: null; error: string }
  >({ status: "loading", data: null, error: null });

  useEffect(() => {
    let active = true;

    staffService
      .listStaff(scope, parsedFilters)
      .then((data) => {
        if (active) setState({ status: "success", data, error: null });
      })
      .catch(() => {
        if (active) setState({ status: "error", data: null, error: "Unable to load staff." });
      });

    return () => {
      active = false;
    };
  }, [parsedFilters, refreshKey, scope]);

  return state;
}
