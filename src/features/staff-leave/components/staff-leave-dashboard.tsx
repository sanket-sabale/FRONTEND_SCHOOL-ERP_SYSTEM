"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { createStaffLeaveRequestAction, type StaffLeaveActionState } from "@/features/staff-leave/actions/staff-leave-actions";
import { StaffLeaveStatusBadge } from "@/features/staff-leave/components/staff-leave-status-badge";
import type { StaffLeaveBalance, StaffLeaveListResponse, StaffLeaveType } from "@/features/staff-leave/types/staff-leave";
import type { StaffSummary } from "@/features/staff/types/staff";
import { cn } from "@/lib/utils";

type StaffLeaveDashboardProps = {
  context: { school: string; campus: string; academicYear: string };
  balances: StaffLeaveBalance[];
  leaveTypes: StaffLeaveType[];
  requests: StaffLeaveListResponse;
  staff: StaffSummary[];
};

const initialState: StaffLeaveActionState = { status: "idle" };

export function StaffLeaveDashboard({ context, balances, leaveTypes, requests, staff }: StaffLeaveDashboardProps) {
  const [state, formAction, pending] = useActionState(createStaffLeaveRequestAction, initialState);
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id ?? "");
  const selectedStaff = staff.find((item) => item.id === selectedStaffId);
  const selectedBalances = useMemo(() => balances.filter((balance) => balance.staffId === selectedStaffId), [balances, selectedStaffId]);
  const summary = summarize(requests.items);

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Staff", "Leave"]} />}
        description="Manage staff leave requests, balances, and approval conflicts in the current school context."
        eyebrow="Staff Leave"
        title="Staff Leave"
        action={<Link className={linkButtonClasses} href="/staff/leave/requests">Requests Queue</Link>}
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="grid gap-2 text-sm">
            <ContextLine label="School" value={context.school} />
            <ContextLine label="Campus" value={context.campus} />
            <ContextLine label="Academic Year" value={context.academicYear} />
          </div>
        </Card>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Staff leave summary">
        <Metric label="Pending" value={summary.pending} tone="warning" />
        <Metric label="Approved" value={summary.approved} tone="success" />
        <Metric label="Conflicts" value={summary.conflicts} tone={summary.conflicts ? "warning" : "neutral"} />
        <Metric label="Requests" value={requests.total} tone="info" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <SectionHeader eyebrow="Request Leave" title="Create Staff Leave Request" />
          <form action={formAction} className="grid gap-4 p-4 sm:p-5">
            {state.status !== "idle" && state.message ? <ActionMessage state={state} /> : null}
            <Field label="Staff member">
              <Select name="staffId" onChange={(event) => setSelectedStaffId(event.target.value)} required value={selectedStaffId}>
                {staff.map((item) => <option key={item.id} value={item.id}>{item.displayName} ({item.employeeNumber})</option>)}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Leave type">
                <Select name="leaveTypeId" required>
                  {leaveTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </Select>
              </Field>
              <Field label="Attachment name">
                <input className={inputClasses} name="attachmentName" placeholder="Optional document name" />
              </Field>
              <Field label="Start date">
                <input className={inputClasses} name="startDate" required type="date" />
              </Field>
              <Field label="End date">
                <input className={inputClasses} name="endDate" required type="date" />
              </Field>
            </div>
            <Field label="Reason">
              <textarea className={`${inputClasses} min-h-24 py-2`} name="reason" placeholder="Reason for leave" required />
            </Field>
            <Button loading={pending} type="submit">Submit Request</Button>
          </form>
        </Card>

        <Card>
          <SectionHeader eyebrow={selectedStaff?.employeeNumber ?? "Staff"} title="Leave Balances" />
          {selectedStaff ? (
            <div className="grid gap-3 p-4 sm:p-5">
              <p className="responsive-text text-sm text-foreground-muted">{selectedStaff.displayName} / {selectedStaff.departmentName}</p>
              {leaveTypes.map((type) => {
                const balance = selectedBalances.find((item) => item.leaveTypeId === type.id);
                return (
                  <div className="rounded-lg border border-border bg-surface-muted p-3" key={type.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{type.name}</p>
                      <Badge tone="info">{balance?.available ?? 0} available</Badge>
                    </div>
                    <p className="mt-2 text-xs text-foreground-muted">Allocated {balance?.allocated ?? 0} / Used {balance?.used ?? 0} / Pending {balance?.pending ?? 0}</p>
                  </div>
                );
              })}
            </div>
          ) : <div className="p-4 sm:p-5"><EmptyState description="Create staff records before submitting leave requests." title="No staff available" /></div>}
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="Recent" title="Recent Leave Requests" action={<Link className={linkButtonClasses} href="/staff/leave/requests">View all</Link>} />
        {requests.items.length === 0 ? (
          <div className="p-4 sm:p-5"><EmptyState description="No leave requests have been submitted yet." title="No leave requests" /></div>
        ) : (
          <div className="grid gap-3 p-3">
            {requests.items.slice(0, 6).map((request) => (
              <article className="rounded-lg border border-border bg-surface p-3" key={request.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="responsive-text font-semibold text-foreground">{request.staffName}</p>
                    <p className="mt-1 text-xs text-foreground-muted">{request.leaveTypeName} / {request.startDate} to {request.endDate} / {request.durationDays} day(s)</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {request.conflictStatus === "requires_review" ? <Badge tone="warning">Conflict review</Badge> : null}
                    <StaffLeaveStatusBadge status={request.status} />
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

function summarize(items: StaffLeaveListResponse["items"]) {
  return {
    pending: items.filter((item) => item.status === "pending_approval").length,
    approved: items.filter((item) => item.status === "approved").length,
    conflicts: items.filter((item) => item.conflictStatus === "requires_review").length,
  };
}

function Metric({ label, tone, value }: { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral"; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value.toLocaleString("en-IN")}</p>
      <Badge tone={tone}>{label}</Badge>
    </Card>
  );
}

function ActionMessage({ state }: { state: StaffLeaveActionState }) {
  return <div className={cn("rounded-lg border p-3 text-sm font-medium", state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200")}>{state.message}</div>;
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center"><span className="text-foreground-muted">{label}</span><span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span></div>;
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
