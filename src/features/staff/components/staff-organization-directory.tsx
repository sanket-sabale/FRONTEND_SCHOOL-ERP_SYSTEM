"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import type { StaffOrgActionState } from "@/features/staff/actions/staff-actions";
import {
  getStaffCategoryLabel,
} from "@/features/staff/services/staff-rules";
import {
  staffCategories,
  type StaffCategory,
  type StaffDepartmentSummary,
  type StaffDesignationSummary,
} from "@/features/staff/types/staff";
import type { Role } from "@/types/erp";

type OrgEntity = StaffDepartmentSummary | StaffDesignationSummary;

type StaffOrganizationDirectoryProps = {
  context: {
    school: string;
    campus: string;
    academicYear: string;
  };
  entities: OrgEntity[];
  kind: "department" | "designation";
  query?: string;
  role: Role;
  saveAction: (state: StaffOrgActionState, formData: FormData) => Promise<StaffOrgActionState>;
  deactivateAction: (state: StaffOrgActionState, formData: FormData) => Promise<StaffOrgActionState>;
};

const initialActionState: StaffOrgActionState = { status: "idle" };

export function StaffOrganizationDirectory({ context, entities, kind, query, role, saveAction, deactivateAction }: StaffOrganizationDirectoryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveState, formAction, pending] = useActionState(saveAction, initialActionState);
  const [deactivateState, deactivateFormAction, deactivatePending] = useActionState(deactivateAction, initialActionState);
  const editingEntity = useMemo(() => entities.find((entity) => entity.id === editingId), [editingId, entities]);
  const title = kind === "department" ? "Departments" : "Designations";
  const singular = kind === "department" ? "Department" : "Designation";
  const canManage = hasPermission(role, "hr.manage");

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Staff", title]} />}
        description={`Manage staff ${title.toLowerCase()} for the active school context. Records are deactivated rather than deleted.`}
        eyebrow="Staff Organization"
        title={title}
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/staff">
              Staff Directory
            </Link>
          </div>
        }
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="grid gap-2 text-sm">
            <ContextLine label="School" value={context.school} />
            <ContextLine label="Campus" value={context.campus} />
            <ContextLine label="Academic Year" value={context.academicYear} />
          </div>
        </Card>
      </PageHeader>

      {canManage ? (
        <Card>
          <SectionHeader eyebrow="Manage" title={editingEntity ? `Edit ${singular}` : `Create ${singular}`} />
          <form action={formAction} className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
          <input name="id" type="hidden" value={editingEntity?.id ?? ""} />
          {saveState.status !== "idle" && saveState.message ? (
            <div className={saveState.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 md:col-span-2" : "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300 md:col-span-2"}>
              {saveState.message}
            </div>
          ) : null}
          <TextInput defaultValue={editingEntity?.name ?? ""} error={saveState.fieldErrors?.name} label={`${singular} name`} name="name" required />
          <TextInput defaultValue={editingEntity?.code ?? ""} error={saveState.fieldErrors?.code} label="Code" name="code" required />
          <Field error={saveState.fieldErrors?.status} label="Status" required>
            <Select defaultValue={editingEntity?.status ?? "active"} name="status" required>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          {kind === "designation" ? (
            <Field error={saveState.fieldErrors?.staffCategory} label="Category">
              <Select defaultValue={(editingEntity as StaffDesignationSummary | undefined)?.staffCategory ?? ""} name="staffCategory">
                <option value="">Any category</option>
                {staffCategories.map((category) => <option key={category} value={category}>{getStaffCategoryLabel(category)}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field error={saveState.fieldErrors?.description} label="Description">
            <textarea className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={editingEntity?.description ?? ""} maxLength={240} name="description" />
          </Field>
          <div className="flex flex-col gap-2 md:col-span-2 sm:flex-row sm:justify-end">
            {editingEntity ? <Button onClick={() => setEditingId(null)} type="button" variant="secondary">Cancel Edit</Button> : null}
            <Button disabled={pending} loading={pending} type="submit" variant="primary">{editingEntity ? `Save ${singular}` : `Create ${singular}`}</Button>
          </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <SectionHeader eyebrow="Directory" title={`${entities.length.toLocaleString("en-IN")} ${title}`} />
        <form action={kind === "department" ? "/staff/departments" : "/staff/designations"} className="grid gap-3 border-b border-border p-4 sm:grid-cols-[minmax(220px,1fr)_auto] sm:p-5">
          <label className="sr-only" htmlFor={`${kind}-search`}>Search {title}</label>
          <input className="h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={query ?? ""} id={`${kind}-search`} name="search" placeholder={`Search ${title.toLowerCase()} by name or code`} type="search" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        {deactivateState.status !== "idle" && deactivateState.message ? (
          <div className={deactivateState.status === "success" ? "m-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "m-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"}>
            {deactivateState.message}
          </div>
        ) : null}
        {entities.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState description={query ? `No ${title.toLowerCase()} match "${query}".` : `Create the first staff ${singular.toLowerCase()} for this tenant.`} title={`No ${title.toLowerCase()} found`} />
          </div>
        ) : (
          <>
            <div className="responsive-table-wrap hidden sm:block">
              <table className="responsive-table text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Name</th>
                    <th className="px-4 py-3 sm:px-5">Code</th>
                    {kind === "designation" ? <th className="px-4 py-3 sm:px-5">Category</th> : null}
                    <th className="px-4 py-3 sm:px-5">Staff</th>
                    <th className="px-4 py-3 sm:px-5">Status</th>
                    <th className="px-4 py-3 text-right sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entities.map((entity) => (
                    <OrgRow canManage={canManage} deactivateFormAction={deactivateFormAction} deactivatePending={deactivatePending} entity={entity} key={entity.id} kind={kind} onEdit={() => setEditingId(entity.id)} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 sm:hidden">
              {entities.map((entity) => (
                <OrgCard canManage={canManage} deactivateFormAction={deactivateFormAction} deactivatePending={deactivatePending} entity={entity} key={entity.id} kind={kind} onEdit={() => setEditingId(entity.id)} />
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function OrgRow({ canManage, deactivateFormAction, deactivatePending, entity, kind, onEdit }: { canManage: boolean; deactivateFormAction: (formData: FormData) => void; deactivatePending: boolean; entity: OrgEntity; kind: "department" | "designation"; onEdit: () => void }) {
  return (
    <tr className="hover:bg-surface-muted">
      <td className="px-4 py-4 sm:px-5">
        <p className="font-medium text-foreground">{entity.name}</p>
        {entity.description ? <p className="mt-1 text-xs text-foreground-muted">{entity.description}</p> : null}
      </td>
      <td className="px-4 py-4 font-mono text-xs text-foreground sm:px-5">{entity.code}</td>
      {kind === "designation" ? <td className="px-4 py-4 text-foreground-muted sm:px-5">{(entity as StaffDesignationSummary).staffCategory ? getStaffCategoryLabel((entity as StaffDesignationSummary).staffCategory as StaffCategory) : "Any"}</td> : null}
      <td className="px-4 py-4 sm:px-5">{entity.staffCount.toLocaleString("en-IN")}</td>
      <td className="px-4 py-4 sm:px-5"><Badge tone={entity.status === "active" ? "success" : "neutral"}>{entity.status === "active" ? "Active" : "Inactive"}</Badge></td>
      <td className="px-4 py-4 text-right sm:px-5">{canManage ? <OrgActions deactivateFormAction={deactivateFormAction} deactivatePending={deactivatePending} entity={entity} onEdit={onEdit} /> : <span className="text-xs text-foreground-muted">View only</span>}</td>
    </tr>
  );
}

function OrgCard({ canManage, deactivateFormAction, deactivatePending, entity, kind, onEdit }: { canManage: boolean; deactivateFormAction: (formData: FormData) => void; deactivatePending: boolean; entity: OrgEntity; kind: "department" | "designation"; onEdit: () => void }) {
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{entity.name}</p>
          <p className="mt-1 font-mono text-xs text-foreground-muted">{entity.code}</p>
          {kind === "designation" ? <p className="mt-1 text-xs text-foreground-muted">{(entity as StaffDesignationSummary).staffCategory ? getStaffCategoryLabel((entity as StaffDesignationSummary).staffCategory as StaffCategory) : "Any category"}</p> : null}
        </div>
        <Badge tone={entity.status === "active" ? "success" : "neutral"}>{entity.status === "active" ? "Active" : "Inactive"}</Badge>
      </div>
      <p className="mt-3 text-sm text-foreground-muted">{entity.staffCount.toLocaleString("en-IN")} linked staff</p>
      {canManage ? <div className="mt-4"><OrgActions deactivateFormAction={deactivateFormAction} deactivatePending={deactivatePending} entity={entity} onEdit={onEdit} /></div> : null}
    </article>
  );
}

function OrgActions({ deactivateFormAction, deactivatePending, entity, onEdit }: { deactivateFormAction: (formData: FormData) => void; deactivatePending: boolean; entity: OrgEntity; onEdit: () => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button onClick={onEdit} type="button" variant="secondary">Edit</Button>
      {entity.status === "active" ? (
        <form action={deactivateFormAction}>
          <input name="id" type="hidden" value={entity.id} />
          <Button disabled={deactivatePending} loading={deactivatePending} type="submit" variant="secondary">Deactivate</Button>
        </form>
      ) : null}
    </div>
  );
}

function TextInput({ defaultValue, error, label, name, required }: { defaultValue: string; error?: string; label: string; name: string; required?: boolean }) {
  return (
    <Field error={error} label={label} required={required}>
      <input className="h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" defaultValue={defaultValue} name={name} required={required} />
    </Field>
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
