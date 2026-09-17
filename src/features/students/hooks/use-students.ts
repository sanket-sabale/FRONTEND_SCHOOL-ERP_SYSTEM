"use client";

import { queryKey, type TenantScopedQuery } from "@/lib/api/client";
import { studentApi, studentService } from "@/lib/api/students";
import { studentFiltersSchema } from "@/features/students/schemas/student.schema";
import type { StudentFilters } from "@/features/students/types/student";
import { useEffect, useMemo, useState } from "react";

export function studentsQuery(scope: TenantScopedQuery, filters: Partial<StudentFilters> = {}) {
  const parsedFilters = studentFiltersSchema.parse(filters);

  return {
    queryKey: queryKey("students", scope, parsedFilters),
    queryFn: () => studentApi.list({ ...scope, ...parsedFilters }),
  };
}

export function useStudents(
  scope: TenantScopedQuery,
  filters: Partial<StudentFilters> = {},
  refreshKey = 0,
) {
  const parsedFilters = useMemo(() => studentFiltersSchema.parse(filters), [filters]);
  const [state, setState] = useState<
    | { status: "loading"; data: null; error: null }
    | { status: "success"; data: Awaited<ReturnType<typeof studentService.getStudents>>; error: null }
    | { status: "error"; data: null; error: string }
  >({ status: "loading", data: null, error: null });

  useEffect(() => {
    let active = true;

    studentService
      .getStudents(scope, parsedFilters)
      .then((data) => {
        if (active) setState({ status: "success", data, error: null });
      })
      .catch(() => {
        if (active) setState({ status: "error", data: null, error: "Unable to load students." });
      });

    return () => {
      active = false;
    };
  }, [parsedFilters, refreshKey, scope]);

  return state;
}
