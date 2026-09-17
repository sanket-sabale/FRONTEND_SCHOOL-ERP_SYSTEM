"use client";

import { useEffect, useMemo, useState } from "react";
import type { TenantScopedQuery } from "@/lib/api/client";
import { attendanceReportFiltersSchema } from "@/features/attendance/schemas/attendance-report.schema";
import type { AttendanceReportFilters } from "@/features/attendance/types/attendance-report";
import { attendanceReportService } from "@/lib/api/attendance-reports";

export function useAttendanceReports(
  scope: TenantScopedQuery,
  filters: Partial<AttendanceReportFilters> = {},
  refreshKey = 0,
) {
  const parsedFilters = useMemo(() => attendanceReportFiltersSchema.parse(filters), [filters]);
  const [state, setState] = useState<
    | { status: "loading"; data: null; error: null }
    | { status: "success"; data: Awaited<ReturnType<typeof attendanceReportService.getReportDashboard>>; error: null }
    | { status: "error"; data: null; error: string }
  >({ status: "loading", data: null, error: null });

  useEffect(() => {
    let active = true;

    attendanceReportService
      .getReportDashboard(scope, parsedFilters)
      .then((data) => {
        if (active) setState({ status: "success", data, error: null });
      })
      .catch(() => {
        if (active) setState({ status: "error", data: null, error: "Unable to load attendance reports." });
      });

    return () => {
      active = false;
    };
  }, [parsedFilters, refreshKey, scope]);

  return state;
}
