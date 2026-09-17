"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { hasPermission } from "@/components/shared/permission-gate";
import {
  getGuardianInitials,
  getGuardianStatusLabel,
  getGuardianVerificationLabel,
} from "@/features/guardians/components/guardian-formatters";
import { guardianStatuses, guardianVerificationStatuses, type GuardianListResponse } from "@/features/guardians/types/guardian";
import type { Role } from "@/types/erp";

export function GuardianDirectory({
  context,
  data,
  role,
}: {
  context: { school: string; campus: string; academicYear: string };
  data: GuardianListResponse;
  role: Role;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => ({
    search: searchParams.get("search") ?? "",
    status: searchParams.get("status") ?? "",
    verificationStatus: searchParams.get("verificationStatus") ?? "",
  }), [searchParams]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Guardian / Parents"]} />}
        description="Manage guardian records and student relationship foundations within the active school context."
        eyebrow="Guardian / Parent Management"
        title="Guardian Directory"
        action={hasPermission(role, "guardian.create") ? (
          <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/guardians/new">
            Add Guardian
          </Link>
        ) : null}
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="grid gap-2 text-sm">
            <ContextLine label="School" value={context.school} />
            <ContextLine label="Campus" value={context.campus} />
            <ContextLine label="Academic Year" value={context.academicYear} />
          </div>
        </Card>
      </PageHeader>

      <Card>
        <SectionHeader eyebrow="Directory" title="Search & Filters" />
        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-3">
          <Field label="Search">
            <input
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950"
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search guardian name or contact..."
              type="search"
              value={filters.search}
            />
          </Field>
          <Field label="Status">
            <Select onChange={(event) => updateFilter("status", event.target.value)} value={filters.status}>
              <option value="">Current guardians</option>
              {guardianStatuses.map((status) => <option key={status} value={status}>{getGuardianStatusLabel(status)}</option>)}
            </Select>
          </Field>
          <Field label="Verification">
            <Select onChange={(event) => updateFilter("verificationStatus", event.target.value)} value={filters.verificationStatus}>
              <option value="">All verification states</option>
              {guardianVerificationStatuses.map((status) => <option key={status} value={status}>{getGuardianVerificationLabel(status)}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Results" title={`${data.total.toLocaleString("en-IN")} guardians`} />
        {data.items.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState description="No guardians match the current tenant-scoped filters." title="No guardians found" />
          </div>
        ) : (
          <div className="grid gap-3 p-3 sm:p-5 lg:grid-cols-2">
            {data.items.map((guardian) => (
              <article className="rounded-lg border border-border bg-surface-muted p-4" key={guardian.id}>
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border bg-surface text-sm font-semibold text-foreground">{getGuardianInitials(guardian.displayName)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className="responsive-text font-semibold text-foreground hover:underline" href={`/guardians/${encodeURIComponent(guardian.id)}`}>{guardian.displayName}</Link>
                      <Badge tone={guardian.status === "active" ? "success" : "neutral"}>{getGuardianStatusLabel(guardian.status)}</Badge>
                      <Badge tone={guardian.verificationStatus === "verified" ? "success" : "warning"}>{getGuardianVerificationLabel(guardian.verificationStatus)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-foreground-muted">{guardian.primaryPhone}{guardian.email ? ` / ${guardian.email}` : ""}</p>
                    <p className="mt-1 text-sm text-foreground-muted">{guardian.studentCount} linked student{guardian.studentCount === 1 ? "" : "s"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span>
    </div>
  );
}
