"use client";

import { useEffect, useMemo, useState } from "react";
import { queryKey, type TenantScopedQuery } from "@/lib/api/client";
import { attendanceService } from "@/lib/api/attendance";
import { attendanceFiltersSchema, attendanceHistoryFiltersSchema } from "@/features/attendance/schemas/attendance.schema";
import type { AttendanceFilters, AttendanceHistoryFilters } from "@/features/attendance/types/attendance";

export function attendanceQuery(scope: TenantScopedQuery, filters: Partial<AttendanceFilters> = {}) {
  const parsedFilters = attendanceFiltersSchema.parse(filters);

  return {
    queryKey: queryKey("attendance", scope, parsedFilters),
    queryFn: () => attendanceService.getAttendanceRecords(scope, parsedFilters),
  };
}

export function useAttendanceRecords(
  scope: TenantScopedQuery,
  filters: Partial<AttendanceFilters> = {},
  refreshKey = 0,
) {
  const parsedFilters = useMemo(() => attendanceFiltersSchema.parse(filters), [filters]);
  const [state, setState] = useState<
    | { status: "loading"; data: null; error: null }
    | { status: "success"; data: Awaited<ReturnType<typeof attendanceService.getAttendanceRecords>>; error: null }
    | { status: "error"; data: null; error: string }
  >({ status: "loading", data: null, error: null });

  useEffect(() => {
    let active = true;

    attendanceService
      .getAttendanceRecords(scope, parsedFilters)
      .then((data) => {
        if (active) setState({ status: "success", data, error: null });
      })
      .catch(() => {
        if (active) setState({ status: "error", data: null, error: "Unable to load attendance records." });
      });

    return () => {
      active = false;
    };
  }, [parsedFilters, refreshKey, scope]);

  return state;
}

export function useAttendanceHistory(
  scope: TenantScopedQuery,
  filters: Partial<AttendanceHistoryFilters> = {},
  refreshKey = 0,
) {
  const parsedFilters = useMemo(() => attendanceHistoryFiltersSchema.parse(filters), [filters]);
  const [state, setState] = useState<
    | { status: "loading"; data: null; error: null }
    | { status: "success"; data: Awaited<ReturnType<typeof attendanceService.getAttendanceHistory>>; error: null }
    | { status: "error"; data: null; error: string }
  >({ status: "loading", data: null, error: null });

  useEffect(() => {
    let active = true;

    attendanceService
      .getAttendanceHistory(scope, parsedFilters)
      .then((data) => {
        if (active) setState({ status: "success", data, error: null });
      })
      .catch(() => {
        if (active) setState({ status: "error", data: null, error: "Unable to load attendance history." });
      });

    return () => {
      active = false;
    };
  }, [parsedFilters, refreshKey, scope]);

  return state;
}
