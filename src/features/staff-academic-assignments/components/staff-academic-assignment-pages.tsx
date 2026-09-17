import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { StaffAcademicAssignmentForm } from "@/features/staff-academic-assignments/components/staff-academic-assignment-form";
import { StaffAcademicAssignmentStatusForm } from "@/features/staff-academic-assignments/components/staff-academic-assignment-status-form";
import { StaffAcademicAssignmentStatusBadge } from "@/features/staff-academic-assignments/components/staff-academic-assignment-status-badge";
import { staffAcademicAssignmentTypeLabels } from "@/features/staff-academic-assignments/services/staff-academic-assignment-rules";
import { AssignmentWorkloadConfigForm } from "@/features/staff-workload/components/assignment-workload-config-form";
import type { AssignmentWorkloadConfig } from "@/features/staff-workload/types/staff-workload";
import type { StaffAcademicAssignmentListItem, StaffAcademicAssignmentListResponse, StaffAcademicAssignmentOptions, StaffAcademicWorkload } from "@/features/staff-academic-assignments/types/staff-academic-assignment";
import type { StaffProfile } from "@/features/staff/types/staff";

export function StaffAcademicAssignmentsPage({ response }: { response: StaffAcademicAssignmentListResponse }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", "Academic Assignments"]} />} description="Assign teachers to academic year, class, section, and subject responsibilities." eyebrow="Staff Academics" title="Academic Assignments" action={<div className="responsive-action-row"><Link className={linkButtonClasses} href="/staff/academic-assignments/workload">Workload View</Link></div>} />
      <AssignmentList response={response} />
    </div>
  );
}

export function StaffAssignmentDetailPage({ assignment, canManage, workloadConfig }: { assignment: StaffAcademicAssignmentListItem; canManage: boolean; workloadConfig?: AssignmentWorkloadConfig | null }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", "Academic Assignments", assignment.staffName]} />} description="Academic assignment detail is tenant-scoped and read-only in this view." eyebrow="Assignment Detail" title={assignment.subjectName} action={<div className="responsive-action-row"><Link className={linkButtonClasses} href="/staff/academic-assignments">Back to Assignments</Link><Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(assignment.staffId)}`}>Staff 360</Link></div>} />
      <Card>
        <SectionHeader eyebrow={assignment.employeeNumber} title={assignment.staffName} action={<StaffAcademicAssignmentStatusBadge status={assignment.status} />} />
        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2">
          <Info label="Academic Year" value={assignment.academicYearName} />
          <Info label="Class / Section" value={`${assignment.className} / ${assignment.sectionName}`} />
          <Info label="Subject" value={assignment.subjectName} />
          <Info label="Assignment Type" value={staffAcademicAssignmentTypeLabels[assignment.assignmentType]} />
          <Info label="Primary" value={assignment.isPrimary ? "Primary responsibility" : "Secondary responsibility"} />
          <Info label="Weekly Periods" value={workloadConfig?.weeklyPeriods === undefined ? "Workload not configured" : `${workloadConfig.weeklyPeriods} periods/week`} />
          <Info label="Scheduling Priority" value={workloadConfig?.schedulingPriority ?? "Normal"} />
          <Info label="Start / End" value={`${assignment.startDate} / ${assignment.endDate ?? "Open"}`} />
          <Info label="Notes" value={assignment.notes ?? "No notes"} />
          <Info label="Updated" value={assignment.updatedAt} />
        </div>
      </Card>
      <Card>
        <SectionHeader eyebrow="Phase 8" title="Workload Configuration" action={<Badge tone={workloadConfig?.weeklyPeriods === undefined ? "warning" : "success"}>{workloadConfig?.weeklyPeriods === undefined ? "Needs configuration" : "Configured"}</Badge>} />
        <div className="grid gap-3 p-4 sm:p-5">
          <p className="text-sm text-foreground-muted">Weekly periods are used for operational workload and scheduling readiness. Timetable slots are not generated in this phase.</p>
          {canManage ? <AssignmentWorkloadConfigForm academicYearId={assignment.academicYearId} assignmentId={assignment.id} config={workloadConfig} /> : null}
        </div>
      </Card>
      {canManage ? <Card className="p-4 sm:p-5"><StaffAcademicAssignmentStatusForm assignment={assignment} /></Card> : null}
    </div>
  );
}

export function StaffAssignmentsForProfilePage({ canManage, response, staff }: { canManage: boolean; response: StaffAcademicAssignmentListResponse; staff: StaffProfile }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", staff.displayName, "Academic Assignments"]} />} description="Review class, section, subject, and primary academic responsibilities." eyebrow="Staff Academics" title="Academic Assignments" action={<div className="responsive-action-row"><Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}`}>Back to Profile</Link>{canManage ? <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/academic-assignments/new`}>Add Assignment</Link> : null}</div>} />
      <AssignmentList response={response} />
    </div>
  );
}

export function StaffAssignmentCreatePage({ options, staff }: { options: StaffAcademicAssignmentOptions; staff: StaffProfile }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", staff.displayName, "New Assignment"]} />} description="Create a validated staff academic assignment. Invalid academic combinations are rejected by the service." eyebrow="Staff Academics" title="New Academic Assignment" action={<Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/academic-assignments`}>Back to Assignments</Link>} />
      <StaffAcademicAssignmentForm options={options} staffId={staff.id} />
    </div>
  );
}

export function StaffAcademicWorkloadPage({ workloads }: { workloads: StaffAcademicWorkload[] }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", "Academic Assignments", "Workload"]} />} description="Informational workload based on active academic assignments. Weekly periods are not configured until timetable integration exists." eyebrow="Staff Academics" title="Workload View" action={<Link className={linkButtonClasses} href="/staff/academic-assignments">Assignments</Link>} />
      <Card>
        <SectionHeader eyebrow={`${workloads.length} teachers`} title="Assignment-based Workload" />
        <div className="grid gap-2 p-4 sm:p-5">
          {workloads.length === 0 ? <EmptyState description="No active academic assignments exist in the current year." title="No workload records" /> : workloads.map((item) => (
            <div className="rounded-lg border border-border bg-surface-muted p-3" key={item.staffId}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="responsive-text text-sm font-semibold text-foreground">{item.staffName}</p>
                  <p className="text-xs text-foreground-muted">{item.employeeNumber} / {item.classCount} classes / {item.sectionCount} sections / {item.subjectCount} subjects</p>
                </div>
                <div className="flex flex-wrap gap-2"><Badge tone="info">{item.activeAssignments} assignments</Badge><Badge tone={item.status === "overloaded" ? "danger" : item.status === "high" ? "warning" : "neutral"}>{item.status.replaceAll("_", " ")}</Badge></div>
              </div>
              <p className="mt-2 text-xs text-foreground-muted">Weekly periods: Not configured</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function StaffAcademicAssignmentsPanel({ canManage, response, staff }: { canManage: boolean; response: StaffAcademicAssignmentListResponse; staff: StaffProfile }) {
  return (
    <Card id="academic-assignments">
      <SectionHeader eyebrow="Academic Assignments" title="Current Academic Responsibilities" action={<Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/academic-assignments`}>View All</Link>} />
      <div className="grid gap-3 p-4 sm:p-5">
        {response.items.length === 0 ? <EmptyState description="No academic assignments exist for this staff member in the current scope." title="No academic assignments" /> : response.items.slice(0, 4).map((item) => <AssignmentCard assignment={item} key={item.id} />)}
        {canManage ? <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/academic-assignments/new`}>Add Assignment</Link> : null}
      </div>
    </Card>
  );
}

function AssignmentList({ response }: { response: StaffAcademicAssignmentListResponse }) {
  return (
    <Card>
      <SectionHeader eyebrow={`${response.total} records`} title="Assignments" />
      <div className="grid gap-2 p-4 sm:p-5">
        {response.items.length === 0 ? <EmptyState description="No academic assignments found for the current filters." title="No academic assignments" /> : response.items.map((assignment) => <AssignmentCard assignment={assignment} key={assignment.id} />)}
      </div>
    </Card>
  );
}

function AssignmentCard({ assignment }: { assignment: StaffAcademicAssignmentListItem }) {
  return (
    <Link className="rounded-lg border border-border bg-surface-muted p-3 transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/staff/academic-assignments/${encodeURIComponent(assignment.id)}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="responsive-text text-sm font-semibold text-foreground">{assignment.staffName}</p>
          <p className="text-xs text-foreground-muted">{assignment.className} / Section {assignment.sectionName} / {assignment.subjectName}</p>
          <p className="text-xs text-foreground-muted">{staffAcademicAssignmentTypeLabels[assignment.assignmentType]} / {assignment.academicYearName}</p>
        </div>
        <div className="flex flex-wrap gap-2"><StaffAcademicAssignmentStatusBadge status={assignment.status} />{assignment.isPrimary ? <Badge tone="info">Primary</Badge> : <Badge tone="neutral">Secondary</Badge>}</div>
      </div>
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-surface-muted p-3"><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p><p className="responsive-text mt-1 text-sm font-medium text-foreground">{value}</p></div>;
}

const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
