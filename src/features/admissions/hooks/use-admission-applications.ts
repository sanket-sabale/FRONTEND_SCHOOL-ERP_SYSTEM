"use client";

import { useEffect, useMemo, useState } from "react";
import { admissionApplicationFiltersSchema, admissionDocumentQueueFiltersSchema } from "@/features/admissions/schemas/admission.schema";
import type { AdmissionApplicationFilters, AdmissionDocumentQueueFilters } from "@/features/admissions/types/admission";
import { admissionService } from "@/lib/api/admissions";
import type { TenantScopedQuery } from "@/lib/api/client";

export function useAdmissionApplications(
  scope: TenantScopedQuery,
  filters: Partial<AdmissionApplicationFilters> = {},
  refreshKey = 0,
) {
  const parsedFilters = useMemo(() => admissionApplicationFiltersSchema.parse(filters), [filters]);
  const [state, setState] = useState<
    | { status: "loading"; data: null; error: null }
    | { status: "success"; data: Awaited<ReturnType<typeof admissionService.getApplications>>; error: null }
    | { status: "error"; data: null; error: string }
  >({ status: "loading", data: null, error: null });

  useEffect(() => {
    let active = true;
    admissionService
      .getApplications(scope, parsedFilters)
      .then((data) => {
        if (active) setState({ status: "success", data, error: null });
      })
      .catch(() => {
        if (active) setState({ status: "error", data: null, error: "Unable to load admission applications." });
      });

    return () => {
      active = false;
    };
  }, [parsedFilters, refreshKey, scope]);

  return state;
}

export function useAdmissionDocumentQueue(
  scope: TenantScopedQuery,
  filters: Partial<AdmissionDocumentQueueFilters> = {},
  refreshKey = 0,
) {
  const parsedFilters = useMemo(() => admissionDocumentQueueFiltersSchema.parse(filters), [filters]);
  const [state, setState] = useState<
    | { status: "loading"; data: null; error: null }
    | { status: "success"; data: Awaited<ReturnType<typeof admissionService.getDocumentQueue>>; error: null }
    | { status: "error"; data: null; error: string }
  >({ status: "loading", data: null, error: null });

  useEffect(() => {
    let active = true;
    admissionService
      .getDocumentQueue(scope, parsedFilters)
      .then((data) => {
        if (active) setState({ status: "success", data, error: null });
      })
      .catch(() => {
        if (active) setState({ status: "error", data: null, error: "Unable to load admission document queue." });
      });

    return () => {
      active = false;
    };
  }, [parsedFilters, refreshKey, scope]);

  return state;
}
