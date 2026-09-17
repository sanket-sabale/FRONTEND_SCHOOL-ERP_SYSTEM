"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { reviewStaffLeaveRequestAction, type StaffLeaveActionState } from "@/features/staff-leave/actions/staff-leave-actions";
import { StaffLeaveStatusBadge } from "@/features/staff-leave/components/staff-leave-status-badge";
import { getStaffLeaveStatusLabel } from "@/features/staff-leave/services/staff-leave-rules";
import { staffLeaveStatuses, type StaffLeaveListResponse, type StaffLeaveRequestSummary } from "@/features/staff-leave/types/staff-leave";
import type { StaffDepartmentSummary } from "@/features/staff/types/staff";
import { cn } from "@/lib/utils";

type StaffLeaveRequestsProps = {
  context: { school: string; campus: string; academicYear: string };
  departments: StaffDepartmentSummary[];
  filters: { search?: string; status?: string; departmentId?: string; dateFrom?: string; dateTo?: string };
  requests: StaffLeaveListResponse;
};

const initialState: StaffLeaveActionState = { status: "idle" };

export function StaffLeaveRequests({ context, departments, filters, requests }: StaffLeaveRequestsProps) {
  const [state, formAction, pending] = useActionState(reviewStaffLeaveRequestAction, initialState);
  const [activeRequest, setActiveRequest] = useState<StaffLeaveRequestSummary | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "cancel">("approve");

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Staff", "Leave", "Requests"]} />}
        description="Review, approve, reject, or cancel staff leave requests with attendance conflicts made explicit."
        eyebrow="Staff Leave"
        title="Leave Requests"
        action={<Link className={linkButtonClasses} href="/staff/leave">Create Request</Link>}
      />

      <Card>
        <SectionHeader eyebrow={context.academicYear} title="Request Filters" />
        <form action="/staff/leave/requests" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Search"><input className={inputClasses} name="search" defaultValue={filters.search} placeholder="Staff, employee no., reason" /></Field>
          <Field label="Status">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">All statuses</option>
              {staffLeaveStatuses.map((status) => <option key={status} value={status}>{getStaffLeaveStatusLabel(status)}</option>)}
            </Select>
          </Field>
          <Field label="Department">
            <Select name="departmentId" defaultValue={filters.departmentId ?? ""}>
              <option value="">All departments</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </Select>
          </Field>
          <Field label="From"><input className={inputClasses} name="dateFrom" type="date" defaultValue={filters.dateFrom} /></Field>
          <Field label="To"><input className={inputClasses} name="dateTo" type="date" defaultValue={filters.dateTo} /></Field>
          <div className="flex items-end"><Button type="submit" variant="secondary">Apply</Button></div>
        </form>
      </Card>

      {state.status !== "idle" && state.message ? (
        <div className={cn("rounded-lg border p-3 text-sm font-medium", state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200")}>{state.message}</div>
      ) : null}

      <Card>
        <SectionHeader eyebrow="Queue" title={`${requests.total.toLocaleString("en-IN")} leave request(s)`} />
        {requests.items.length === 0 ? (
          <div className="p-4 sm:p-5"><EmptyState description="No leave requests match the current filters." title="No leave requests" /></div>
        ) : (
          <>
            <div className="hidden responsive-table-wrap lg:block">
              <table className="responsive-table text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
                  <tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Leave</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.items.map((request) => (
                    <tr className="hover:bg-surface-muted/60" key={request.id}>
                      <td className="px-4 py-3"><p className="font-medium text-foreground">{request.staffName}</p><p className="font-mono text-xs text-foreground-muted">{request.employeeNumber}</p></td>
                      <td className="px-4 py-3"><p>{request.leaveTypeName}</p><p className="text-xs text-foreground-muted">{request.reason}</p></td>
                      <td className="px-4 py-3">{request.startDate} to {request.endDate}<p className="text-xs text-foreground-muted">{request.durationDays} day(s)</p></td>
                      <td className="px-4 py-3">{request.availableBalance}</td>
                      <td className="px-4 py-3"><StatusCluster request={request} /></td>
                      <td className="px-4 py-3"><Button onClick={() => setActiveRequest(request)} variant="secondary">Review</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 lg:hidden">
              {requests.items.map((request) => (
                <article className="rounded-lg border border-border bg-surface p-3" key={request.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="responsive-text font-semibold text-foreground">{request.staffName}</p>
                      <p className="font-mono text-xs text-foreground-muted">{request.employeeNumber}</p>
                      <p className="mt-2 text-sm text-foreground-muted">{request.leaveTypeName} / {request.startDate} to {request.endDate}</p>
                    </div>
                    <StatusCluster request={request} />
                  </div>
                  <p className="mt-3 text-sm text-foreground">{request.reason}</p>
                  <Button className="mt-3 w-full" onClick={() => setActiveRequest(request)} variant="secondary">Review</Button>
                </article>
              ))}
            </div>
          </>
        )}
      </Card>

      {activeRequest ? (
        <div aria-labelledby="leave-review-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
          <form action={formAction} className="w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-xl sm:p-5">
            <input name="requestId" type="hidden" value={activeRequest.id} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Review Leave</p>
                <h2 className="responsive-text mt-1 text-lg font-semibold text-foreground" id="leave-review-title">{activeRequest.staffName}</h2>
                <p className="mt-1 text-sm text-foreground-muted">{activeRequest.leaveTypeName} / {activeRequest.startDate} to {activeRequest.endDate}</p>
              </div>
              <StaffLeaveStatusBadge status={activeRequest.status} />
            </div>
            {activeRequest.conflictStatus === "requires_review" ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">{activeRequest.conflictReason}</div> : null}
            <div className="mt-4 grid gap-3">
              <Field label="Action">
                <Select name="action" onChange={(event) => setAction(event.target.value as "approve" | "reject" | "cancel")} value={action}>
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                  <option value="cancel">Cancel</option>
                </Select>
              </Field>
              <Field label={action === "reject" ? "Reviewer remarks (required)" : "Reviewer remarks"}>
                <textarea className={`${inputClasses} min-h-24 py-2`} name="reviewerRemarks" required={action === "reject"} placeholder="Add decision notes" />
              </Field>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button onClick={() => setActiveRequest(null)} type="button" variant="secondary">Cancel</Button>
              <Button loading={pending} type="submit">Update Request</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function StatusCluster({ request }: { request: StaffLeaveRequestSummary }) {
  return <div className="flex flex-wrap gap-2">{request.conflictStatus === "requires_review" ? <Badge tone="warning">Conflict</Badge> : null}<StaffLeaveStatusBadge status={request.status} /></div>;
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
