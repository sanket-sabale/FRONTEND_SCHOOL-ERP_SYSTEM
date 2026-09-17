import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { StaffAttendanceStatusBadge } from "@/features/staff-attendance/components/staff-attendance-status-badge";
import { staffAttendanceStatuses, type StaffAttendanceListResponse } from "@/features/staff-attendance/types/staff-attendance";
import type { StaffDepartmentSummary } from "@/features/staff/types/staff";

export function StaffAttendanceHistory({ context, data, departments, filters }: { context: { school: string; campus: string; academicYear: string }; data: StaffAttendanceListResponse; departments: StaffDepartmentSummary[]; filters: { dateFrom?: string; dateTo?: string; departmentId?: string; staffId?: string; status?: string; search?: string } }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", "Attendance", "History"]} />} description="Review staff attendance history by date, staff, department, and status." eyebrow="Staff Attendance" title="Attendance History" action={<Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/staff/attendance">Mark Attendance</Link>} />
      <Card>
        <SectionHeader eyebrow="Filters" title="History Filters" />
        <form action="/staff/attendance/history" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          {filters.staffId ? <input name="staffId" type="hidden" value={filters.staffId} /> : null}
          <Field label="From"><input className={inputClasses} name="dateFrom" type="date" defaultValue={filters.dateFrom} /></Field>
          <Field label="To"><input className={inputClasses} name="dateTo" type="date" defaultValue={filters.dateTo} /></Field>
          <Field label="Department"><Select name="departmentId" defaultValue={filters.departmentId ?? ""}><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select></Field>
          <Field label="Status"><Select name="status" defaultValue={filters.status ?? ""}><option value="">All statuses</option>{staffAttendanceStatuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</Select></Field>
          <Field label="Search"><input className={inputClasses} name="search" defaultValue={filters.search} placeholder="Staff or employee no." /></Field>
          <button className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 lg:col-span-5" type="submit">Apply Filters</button>
        </form>
      </Card>
      <Card>
        <SectionHeader eyebrow={context.academicYear} title={`${data.total.toLocaleString("en-IN")} attendance records`} />
        {data.items.length === 0 ? <div className="p-4 sm:p-5"><EmptyState description="No staff attendance records match the selected filters." title="No attendance history" /></div> : (
          <div className="responsive-table-wrap">
            <table className="responsive-table text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted"><tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Marked by</th></tr></thead>
              <tbody className="divide-y divide-border">{data.items.map((record) => <tr key={record.id}><td className="px-4 py-3"><p className="font-medium text-foreground">{record.staffName}</p><p className="font-mono text-xs text-foreground-muted">{record.employeeNumber}</p></td><td className="px-4 py-3">{record.attendanceDate}</td><td className="px-4 py-3">{record.departmentName}</td><td className="px-4 py-3"><StaffAttendanceStatusBadge status={record.status} /></td><td className="px-4 py-3">{record.checkIn ?? "--"} / {record.checkOut ?? "--"}</td><td className="px-4 py-3">{record.markedBy ?? "Not recorded"}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
