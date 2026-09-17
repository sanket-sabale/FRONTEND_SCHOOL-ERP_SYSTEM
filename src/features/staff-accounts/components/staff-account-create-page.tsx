"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button, Card, EmptyState, Field, PageHeader, Select } from "@/components/ui";
import { createStaffAccountAction, type StaffAccountActionState } from "@/features/staff-accounts/actions/staff-account-actions";
import { getRoleLabel } from "@/features/staff-accounts/services/staff-account-rules";
import type { StaffAccountView } from "@/features/staff-accounts/types/staff-account";
import type { StaffProfile } from "@/features/staff/types/staff";

const initialState: StaffAccountActionState = { status: "idle" };

export function StaffAccountCreatePage({ accountView, staff }: { accountView: StaffAccountView; staff: StaffProfile }) {
  const [state, formAction, pending] = useActionState(createStaffAccountAction, initialState);
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", staff.displayName, "Account", "Create"]} />} description="Create a mock invitation account and link it to this staff member." eyebrow="Account & Access" title="Create Mock Invite" action={<Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/account`}>Back to Account</Link>} />
      <Card className="mx-auto max-w-3xl">
        {accountView.account ? (
          <div className="p-4 sm:p-5"><EmptyState description="This staff member already has a linked application account." title="Account already linked" /></div>
        ) : (
          <form action={formAction} className="grid gap-4 p-4 sm:p-5">
            <input name="staffId" type="hidden" value={staff.id} />
            <p className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">This creates a mock invited account only. No password is stored and no real email is sent in this phase.</p>
            {state.message ? <p className={state.status === "success" ? successClasses : errorClasses}>{state.message}</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Display name" required>
                <input className={inputClasses} name="displayName" required defaultValue={staff.displayName} />
              </Field>
              <Field label="Email" required>
                <input className={inputClasses} name="email" required type="email" defaultValue={staff.contact?.officialEmail ?? ""} />
              </Field>
              <Field label="Role" required>
                <Select name="role" required defaultValue={staff.staffCategory === "teaching" ? "teacher" : staff.staffCategory === "accounts_finance" ? "accountant" : staff.staffCategory === "hr" ? "hr" : "teacher"}>
                  {accountView.roles.map((role) => <option key={role.role} value={role.role}>{getRoleLabel(role.role)}</option>)}
                </Select>
              </Field>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/account`}>Cancel</Link>
              <Button disabled={pending || state.status === "success"} loading={pending} type="submit">Create Mock Invite</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
const successClasses = "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
const errorClasses = "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200";
const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
