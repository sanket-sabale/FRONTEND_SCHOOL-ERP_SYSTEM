"use client";

import { useEffect, useMemo, useState } from "react";
import type { AttendanceExportPreview, AttendanceExportRequest } from "@/features/attendance/types/attendance-export";
import { attendanceExportService } from "@/lib/api/attendance-exports";
import type { TenantScopedQuery } from "@/lib/api/client";

export function useAttendanceExportPreview(
  scope: TenantScopedQuery,
  request: AttendanceExportRequest,
  refreshKey = 0,
) {
  const memoizedRequest = useMemo(() => request, [request]);
  const [state, setState] = useState<
    | { status: "loading"; data: null; error: null }
    | { status: "success"; data: AttendanceExportPreview; error: null }
    | { status: "error"; data: null; error: string }
  >({ status: "loading", data: null, error: null });

  useEffect(() => {
    let active = true;

    attendanceExportService
      .getExportPreview(scope, memoizedRequest)
      .then((data) => {
        if (active) setState({ status: "success", data, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", data: null, error: error instanceof Error ? error.message : "Unable to load export preview." });
      });

    return () => {
      active = false;
    };
  }, [memoizedRequest, refreshKey, scope]);

  return state;
}
