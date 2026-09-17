"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select } from "@/components/ui";
import { linkStaffAccountAction, type StaffAccountActionState } from "@/features/staff-accounts/actions/staff-account-actions";
import { StaffAccountStatusBadge } from "@/features/staff-accounts/components/staff-account-status-badge";
import { getRoleLabel } from "@/features/staff-accounts/services/staff-account-rules";
import type { StaffAccountView } from "@/features/staff-accounts/types/staff-account";
import type { StaffProfile } from "@/features/staff/types/staff";

const initialState: StaffAccountActionState = { status: "idle" };

export function StaffAccountLinkPage({ accountView, staff }: { accountView: StaffAccountView; staff: StaffProfile }) {
  const [state, formAction, pending] = useActionState(linkStaffAccountAction, initialState);
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", staff.displayName, "Account", "Link"]} />} description="Link an eligible existing application user to this staff member." eyebrow="Account & Access" title="Link Existing Account" action={<Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/account`}>Back to Account</Link>} />
      <Card className="mx-auto max-w-3xl">
        {accountView.account ? (
          <div className="p-4 sm:p-5"><EmptyState description="Unlink the current account before linking another one." title="Account already linked" /></div>
        ) : accountView.eligibleUsers.length === 0 ? (
          <div className="p-4 sm:p-5"><EmptyState description="No eligible unlinked user accounts are available in this school context." title="No eligible accounts" /></div>
        ) : (
          <form action={formAction} className="grid gap-4 p-4 sm:p-5">
            <input name="staffId" type="hidden" value={staff.id} />
            <p className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">Staff profile and application login account are separate records. Linking does not change passwords or send email.</p>
            {state.message ? <ActionMessage state={state} /> : null}
            <Field label="Eligible account" required>
              <Select name="userId" required>
                {accountView.eligibleUsers.map((user) => <option key={user.id} value={user.id}>{user.displayName} / {user.email} / {getRoleLabel(user.role)}</option>)}
              </Select>
            </Field>
            <div className="grid gap-3">
              {accountView.eligibleUsers.slice(0, 4).map((user) => (
                <div className="rounded-lg border border-border bg-surface-muted p-3" key={user.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{user.displayName}</p>
                    <div className="flex gap-2"><StaffAccountStatusBadge status={user.status} /><Badge tone="info">{getRoleLabel(user.role)}</Badge></div>
                  </div>
                  <p className="mt-1 text-sm text-foreground-muted">{user.email}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/account`}>Cancel</Link>
              <Button disabled={pending || state.status === "success"} loading={pending} type="submit">Link Account</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

function ActionMessage({ state }: { state: StaffAccountActionState }) {
  return <p className={state.status === "success" ? successClasses : errorClasses}>{state.message}</p>;
}

const successClasses = "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
const errorClasses = "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200";
const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
