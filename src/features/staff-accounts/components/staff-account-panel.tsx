"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, SectionHeader, Select } from "@/components/ui";
import {
  assignStaffAccountRoleAction,
  unlinkStaffAccountAction,
  updateStaffAccountStatusAction,
  type StaffAccountActionState,
} from "@/features/staff-accounts/actions/staff-account-actions";
import { StaffAccountStatusBadge } from "@/features/staff-accounts/components/staff-account-status-badge";
import { StaffPermissionSummary } from "@/features/staff-accounts/components/staff-permission-summary";
import { getRoleLabel } from "@/features/staff-accounts/services/staff-account-rules";
import { staffAccountStatuses, type StaffAccountView } from "@/features/staff-accounts/types/staff-account";
import type { StaffProfile } from "@/features/staff/types/staff";

const initialState: StaffAccountActionState = { status: "idle" };

export function StaffAccountPanel({ accountView, canManage, staff }: { accountView: StaffAccountView; canManage: boolean; staff: StaffProfile }) {
  const [unlinkOpen, setUnlinkOpen] = useState(false);

  return (
    <>
      <Card id="account-access">
        <SectionHeader
          eyebrow="Account & Access"
          title="Application Account"
          action={<Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/account`}>Manage Access</Link>}
        />
        <div className="grid gap-4 p-4 sm:p-5">
          {accountView.warnings.length > 0 ? (
            <div className="grid gap-2">
              {accountView.warnings.map((warning) => <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100" key={warning}>{warning}</p>)}
            </div>
          ) : null}

          {accountView.account ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
              <div className="rounded-lg border border-border bg-surface-muted p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Linked Account</p>
                    <p className="responsive-text mt-2 text-lg font-semibold text-foreground">{accountView.account.displayName}</p>
                    <p className="mt-1 text-sm text-foreground-muted">{accountView.account.email}</p>
                  </div>
                  <StaffAccountStatusBadge status={accountView.account.status} />
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <AccountTerm label="Username" value={accountView.account.username} />
                  <AccountTerm label="Role" value={getRoleLabel(accountView.account.role)} />
                  <AccountTerm label="Last Login" value={formatDateTime(accountView.account.lastLoginAt)} />
                  <AccountTerm label="Linked User ID" value={accountView.account.id} />
                </dl>
              </div>
              <div className="rounded-lg border border-border bg-surface-muted p-3">
                <p className="text-sm font-semibold text-foreground">Access Controls</p>
                {canManage ? (
                  <div className="mt-3 grid gap-3">
                    <RoleForm accountView={accountView} staffId={staff.id} />
                    <StatusForm accountView={accountView} staffId={staff.id} />
                    <Button onClick={() => setUnlinkOpen(true)} variant="secondary">Unlink Account</Button>
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg border border-border bg-surface p-3 text-sm text-foreground-muted">You can view account access but cannot modify it.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-4">
              <EmptyState description="Staff profile and application login account are separate records." title="No application account is linked" />
              {canManage ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/account/link`}>Link Existing Account</Link>
                  <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/account/create`}>Create Mock Invite</Link>
                </div>
              ) : null}
            </div>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Permission Summary</p>
              {accountView.account ? <Badge tone="info">{getRoleLabel(accountView.account.role)}</Badge> : <Badge tone="neutral">No role</Badge>}
            </div>
            <StaffPermissionSummary permissions={accountView.permissions} />
          </section>
        </div>
      </Card>
      {unlinkOpen ? <UnlinkDialog onClose={() => setUnlinkOpen(false)} staffId={staff.id} /> : null}
    </>
  );
}

function RoleForm({ accountView, staffId }: { accountView: StaffAccountView; staffId: string }) {
  const [state, formAction, pending] = useActionState(assignStaffAccountRoleAction, initialState);
  return (
    <form action={formAction} className="grid gap-2">
      <input name="staffId" type="hidden" value={staffId} />
      {state.message ? <ActionMessage state={state} /> : null}
      <Field label="Role">
        <Select defaultValue={accountView.account?.role} name="role">
          {accountView.roles.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
        </Select>
      </Field>
      <Button disabled={pending || state.status === "success"} loading={pending} size="sm" type="submit" variant="secondary">Update Role</Button>
    </form>
  );
}

function StatusForm({ accountView, staffId }: { accountView: StaffAccountView; staffId: string }) {
  const [state, formAction, pending] = useActionState(updateStaffAccountStatusAction, initialState);
  return (
    <form action={formAction} className="grid gap-2">
      <input name="staffId" type="hidden" value={staffId} />
      {state.message ? <ActionMessage state={state} /> : null}
      <Field label="Account status">
        <Select defaultValue={accountView.account?.status} name="status">
          {staffAccountStatuses.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
        </Select>
      </Field>
      <Button disabled={pending || state.status === "success"} loading={pending} size="sm" type="submit" variant="secondary">Update Status</Button>
    </form>
  );
}

function UnlinkDialog({ onClose, staffId }: { onClose: () => void; staffId: string }) {
  const [state, formAction, pending] = useActionState(unlinkStaffAccountAction, initialState);
  return (
    <div aria-modal="true" className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-slate-950/45 p-3" role="dialog">
      <form action={formAction} className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-2xl sm:p-5">
        <input name="staffId" type="hidden" value={staffId} />
        <h2 className="text-lg font-semibold text-foreground">Unlink Account</h2>
        <p className="mt-2 text-sm text-foreground-muted">This removes only the Staff to User relationship. The application user account is not deleted.</p>
        {state.message ? <ActionMessage state={state} /> : null}
        <Field label="Reason">
          <textarea className={`${inputClasses} min-h-24 py-2`} maxLength={500} name="reason" />
        </Field>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">{state.status === "success" ? "Close" : "Cancel"}</Button>
          <Button disabled={pending || state.status === "success"} loading={pending} type="submit" variant="secondary">{pending ? "Saving..." : "Unlink"}</Button>
        </div>
      </form>
    </div>
  );
}

function AccountTerm({ label, value }: { label: string; value?: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt><dd className="responsive-text mt-1 text-foreground">{value || "Not available"}</dd></div>;
}

function ActionMessage({ state }: { state: StaffAccountActionState }) {
  return <p className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"}>{state.message}</p>;
}

function formatDateTime(value?: string) {
  if (!value) return undefined;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
