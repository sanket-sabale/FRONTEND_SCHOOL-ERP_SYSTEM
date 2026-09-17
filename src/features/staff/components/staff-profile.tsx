import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { StaffAccountPanel } from "@/features/staff-accounts/components/staff-account-panel";
import type { StaffAccountView } from "@/features/staff-accounts/types/staff-account";
import { StaffAcademicAssignmentsPanel } from "@/features/staff-academic-assignments/components/staff-academic-assignment-pages";
import type { StaffAcademicAssignmentListResponse } from "@/features/staff-academic-assignments/types/staff-academic-assignment";
import { StaffPerformancePanel } from "@/features/staff-performance/components/staff-performance-panel";
import type { StaffPerformanceSummary } from "@/features/staff-performance/types/staff-performance";
import { StaffWorkloadPanel } from "@/features/staff-workload/components/staff-workload-pages";
import type { StaffWorkloadDetail } from "@/features/staff-workload/types/staff-workload";
import { changeStaffStatusAction } from "@/features/staff/actions/staff-actions";
import { StaffAttendanceStatusBadge } from "@/features/staff-attendance/components/staff-attendance-status-badge";
import type { StaffAttendanceSummary, StaffAttendanceSummaryRecord } from "@/features/staff-attendance/types/staff-attendance";
import { StaffDocumentsPanel } from "@/features/staff-documents/components/staff-documents-panel";
import type { StaffDocumentListResponse } from "@/features/staff-documents/types/staff-document";
import { StaffEmploymentPanel } from "@/features/staff-employment/components/staff-employment-panel";
import type { StaffEmploymentRecord } from "@/features/staff-employment/types/staff-employment";
import { formatStaffDate, getStaffInitials } from "@/features/staff/components/staff-formatters";
import { StaffLifecyclePanel } from "@/features/staff/components/staff-lifecycle-panel";
import { StaffStatusBadge } from "@/features/staff/components/staff-status-badge";
import {
  getEmergencyContactRelationshipLabel,
  getEmploymentTypeLabel,
  getStaffCategoryLabel,
  getStaffPreferredContactMethodLabel,
  getStaffStatusLabel,
} from "@/features/staff/services/staff-rules";
import type { StaffAddress, StaffEmergencyContact, StaffProfile as StaffProfileModel } from "@/features/staff/types/staff";
import type { Role } from "@/types/erp";

type StaffProfileProps = {
  context: {
    school: string;
    campus: string;
    academicYear: string;
  };
  created?: boolean;
  role: Role;
  staff: StaffProfileModel;
  attendanceSummary?: StaffAttendanceSummary;
  accountView?: StaffAccountView;
  academicAssignments?: StaffAcademicAssignmentListResponse;
  performanceSummary?: StaffPerformanceSummary;
  recentAttendance?: StaffAttendanceSummaryRecord[];
  documentsResponse?: StaffDocumentListResponse;
  employmentRecords?: StaffEmploymentRecord[];
  updated?: boolean;
  workloadDetail?: StaffWorkloadDetail | null;
};

export function StaffProfile({ academicAssignments, accountView, attendanceSummary, context, created = false, documentsResponse, employmentRecords = [], performanceSummary, recentAttendance = [], role, staff, updated = false, workloadDetail }: StaffProfileProps) {
  const canManage = hasPermission(role, "hr.manage");
  const primaryEmergencyContact = staff.emergencyContacts?.find((contact) => contact.isPrimary) ?? staff.emergencyContacts?.[0];

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Staff", "Staff Profile", staff.displayName]} />}
        description="Staff 360 overview for identity, contact, organization, employment, emergency, address, and teaching information."
        eyebrow="Staff 360"
        title={staff.displayName}
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/staff">
              Back to Staff
            </Link>
            {canManage ? (
              <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/staff/${encodeURIComponent(staff.id)}/edit`}>
                Edit Staff
              </Link>
            ) : null}
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

      {created || updated ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {created ? "Staff member created successfully." : "Staff details updated successfully."}
        </div>
      ) : null}

      <StaffHero context={context} staff={staff} />
      <StaffProfileSummary context={context} staff={staff} />
      <StaffLifecyclePanel action={changeStaffStatusAction} canManage={canManage} staff={staff} />
      <StaffProfileNav staffId={staff.id} />
      {accountView ? <StaffAccountPanel accountView={accountView} canManage={canManage} staff={staff} /> : null}
      {academicAssignments ? <StaffAcademicAssignmentsPanel canManage={canManage} response={academicAssignments} staff={staff} /> : null}
      <StaffWorkloadPanel detail={workloadDetail} staff={staff} />
      {performanceSummary ? <StaffPerformancePanel canManage={canManage} staff={staff} summary={performanceSummary} /> : null}
      <StaffEmploymentPanel context={context} records={employmentRecords} staff={staff} />
      <StaffAttendanceSnapshot attendanceSummary={attendanceSummary} recentAttendance={recentAttendance} staffId={staff.id} />
      {documentsResponse ? <StaffDocumentsPanel canManageDocuments={canManage} documentsResponse={documentsResponse} staff={staff} /> : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <InfoCard eyebrow="Overview" title="Identity">
          <InfoRow label="Full Name" value={staff.displayName} />
          <InfoRow label="First Name" value={staff.firstName} />
          <InfoRow label="Middle Name" value={staff.middleName} />
          <InfoRow label="Last Name" value={staff.lastName} />
          <InfoRow label="Employee Number" value={staff.employeeNumber} />
        </InfoCard>

        <InfoCard eyebrow="Contact" title="Contact Information">
          <InfoRow label="Mobile" value={staff.contact?.mobileNumber} />
          <InfoRow label="Alternate Phone" value={staff.contact?.alternatePhone} />
          <InfoRow label="Official Email" value={staff.contact?.officialEmail} />
          <InfoRow label="Personal Email" value={staff.contact?.personalEmail} />
          <InfoRow label="Preferred Contact" value={getStaffPreferredContactMethodLabel(staff.contact?.preferredContactMethod)} />
        </InfoCard>

        <InfoCard eyebrow="Employment" title="Employment Information">
          <InfoRow label="Category" value={getStaffCategoryLabel(staff.staffCategory)} />
          <InfoRow label="Employment Type" value={getEmploymentTypeLabel(staff.employmentType)} />
          <InfoRow label="Status" value={getStaffStatusLabel(staff.status)} />
          <InfoRow label="Joining Date" value={formatStaffDate(staff.joiningDate)} />
          <InfoRow label="Confirmation Date" value={formatStaffDate(staff.confirmationDate)} />
          <InfoRow label="Exit Date" value={formatStaffDate(staff.exitDate)} />
          <InfoRow label="Exit Reason" value={staff.exitReason} />
        </InfoCard>

        <InfoCard eyebrow="Organization" title="Organization">
          <InfoRow label="Department" value={staff.departmentName} />
          <InfoRow label="Designation" value={staff.designationName} />
          <InfoRow label="Reporting Manager" value={staff.reportingManagerName} />
          <InfoRow label="Campus" value={context.campus} />
        </InfoCard>

        <InfoCard eyebrow="Emergency" title="Emergency Contact">
          {primaryEmergencyContact ? (
            <EmergencyContactRows contact={primaryEmergencyContact} />
          ) : (
            <EmptyState description="No emergency contact is available for this staff member." title="No emergency contact" />
          )}
        </InfoCard>

        <InfoCard eyebrow="Address" title="Current Address">
          <AddressRows address={staff.currentAddress} />
        </InfoCard>

        <InfoCard eyebrow="Address" title="Permanent Address">
          {staff.permanentAddressSameAsCurrent ? (
            <EmptyState description="Permanent address is marked same as current address." title="Same as current address" />
          ) : (
            <AddressRows address={staff.permanentAddress} />
          )}
        </InfoCard>

        <InfoCard eyebrow="Teaching" title="Teaching Information">
          {staff.staffCategory === "teaching" ? (
            <>
              <InfoRow label="Teacher Code" value={staff.teachingInfo?.teacherCode} />
              <InfoRow label="Subject Areas" value={staff.teachingInfo?.subjectAreas?.join(", ")} />
              <InfoRow label="Academic Department" value={staff.teachingInfo?.academicDepartment} />
              <InfoRow label="Qualification" value={staff.teachingInfo?.qualificationSummary} />
              <InfoRow label="Experience" value={staff.teachingInfo?.experienceSummary} />
            </>
          ) : (
            <EmptyState description="Teaching metadata is available only for teaching staff." title="Not a teaching staff member" />
          )}
        </InfoCard>

        <InfoCard eyebrow="Account" title="Account Linkage">
          {staff.userId ? <InfoRow label="Linked User Account" value={staff.userId} /> : <EmptyState description="No application user account is currently linked to this staff member." title="No user account linked" />}
        </InfoCard>
      </section>
    </div>
  );
}

function StaffProfileNav({ staffId }: { staffId: string }) {
  const items = [
    { href: "#employment", label: "Employment" },
    { href: "#account-access", label: "Account & Access" },
    { href: "#performance", label: "Performance" },
    { href: "#academic-assignments", label: "Academic Assignments" },
    { href: "#workload-scheduling", label: "Workload & Scheduling" },
    { href: "#documents", label: "Documents" },
    { href: `/staff/workload/${encodeURIComponent(staffId)}`, label: "Workload Detail" },
    { href: `/staff/${encodeURIComponent(staffId)}/performance`, label: "Performance Workspace" },
    { href: `/staff/${encodeURIComponent(staffId)}/documents`, label: "Documents Workspace" },
    { href: "/staff/attendance", label: "Attendance" },
    { href: "/staff/leave", label: "Leave" },
  ];
  return (
    <nav aria-label="Staff 360 sections" className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-surface p-2">
      {items.map((item) => (
        <Link className="min-h-9 shrink-0 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function StaffAttendanceSnapshot({ attendanceSummary, recentAttendance, staffId }: { attendanceSummary?: StaffAttendanceSummary; recentAttendance: StaffAttendanceSummaryRecord[]; staffId: string }) {
  const metrics = [
    { label: "Present", value: attendanceSummary?.present ?? 0, tone: "success" },
    { label: "Absent", value: attendanceSummary?.absent ?? 0, tone: "danger" },
    { label: "Late", value: attendanceSummary?.late ?? 0, tone: "warning" },
    { label: "Half-day", value: attendanceSummary?.halfDay ?? 0, tone: "warning" },
    { label: "Leave", value: attendanceSummary?.leave ?? 0, tone: "info" },
  ] as const;

  return (
    <Card>
      <SectionHeader
        eyebrow="Attendance"
        title="Staff Attendance Snapshot"
        action={<Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/staff/attendance/history?staffId=${encodeURIComponent(staffId)}`}>View History</Link>}
      />
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <div className="rounded-lg border border-border bg-surface-muted p-3" key={metric.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{metric.label}</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{metric.value}</p>
              <Badge tone={metric.tone}>{metric.label}</Badge>
            </div>
          ))}
        </div>
        {recentAttendance.length === 0 ? (
          <EmptyState description="No staff attendance has been recorded for this staff member yet." title="No recent attendance" />
        ) : (
          <div className="grid gap-2">
            {recentAttendance.map((record) => (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3 text-sm sm:flex-row sm:items-center sm:justify-between" key={record.id}>
                <div>
                  <p className="font-medium text-foreground">{record.attendanceDate}</p>
                  <p className="text-xs text-foreground-muted">{record.checkIn ?? "--"} / {record.checkOut ?? "--"}</p>
                </div>
                <StaffAttendanceStatusBadge status={record.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export function StaffProfileNotFound({ message = "The requested staff member could not be found." }: { message?: string }) {
  return (
    <div className="erp-container">
      <Card className="mx-auto max-w-xl p-5">
        <SectionHeader eyebrow="Staff Management" title="Staff unavailable" />
        <div className="p-4 sm:p-5">
          <EmptyState description={message} title="Staff unavailable" />
          <Link className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/staff">
            Back to Staff
          </Link>
        </div>
      </Card>
    </div>
  );
}

function StaffHero({ context, staff }: { context: StaffProfileProps["context"]; staff: StaffProfileModel }) {
  return (
    <section className="responsive-panel border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <span aria-label={`${staff.displayName} avatar`} className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-border bg-surface-muted text-xl font-semibold text-foreground sm:h-24 sm:w-24" role="img">
            {getStaffInitials(staff.displayName)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="responsive-text text-2xl font-semibold tracking-tight text-foreground">{staff.displayName}</h2>
              <StaffStatusBadge status={staff.status} />
            </div>
            <p className="mt-2 font-mono text-xs text-foreground-muted">Employee No: {staff.employeeNumber}</p>
            <p className="responsive-text mt-3 text-sm text-foreground">{staff.designationName} / {staff.departmentName}</p>
            <p className="responsive-text mt-1 text-sm text-foreground-muted">{getEmploymentTypeLabel(staff.employmentType)} / {context.campus} / {context.academicYear}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">Tenant-scoped</Badge>
          <Badge tone="neutral">Phase 2</Badge>
        </div>
      </div>
    </section>
  );
}

function StaffProfileSummary({ context, staff }: { context: StaffProfileProps["context"]; staff: StaffProfileModel }) {
  const metrics = [
    { label: "Joined", value: formatStaffDate(staff.joiningDate), tone: "info" },
    { label: "Department", value: staff.departmentName, tone: "neutral" },
    { label: "Designation", value: staff.designationName, tone: "neutral" },
    { label: "Manager", value: staff.reportingManagerName ?? "Not assigned", tone: "neutral" },
    { label: "Academic Year", value: context.academicYear, tone: "info" },
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Staff profile summary">
      {metrics.map((metric) => (
        <Card className="p-4" key={metric.label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{metric.label}</p>
          <p className="responsive-text mt-3 text-lg font-semibold text-foreground">{metric.value}</p>
          <Badge tone={metric.tone}>{metric.label}</Badge>
        </Card>
      ))}
    </section>
  );
}

function EmergencyContactRows({ contact }: { contact: StaffEmergencyContact }) {
  return (
    <>
      <InfoRow label="Name" value={contact.name} />
      <InfoRow label="Relationship" value={getEmergencyContactRelationshipLabel(contact.relationship)} />
      <InfoRow label="Mobile" value={contact.mobileNumber} />
      <InfoRow label="Alternate Number" value={contact.alternateNumber} />
      <InfoRow label="Email" value={contact.email} />
      <InfoRow label="Address" value={contact.address} />
    </>
  );
}

function AddressRows({ address }: { address?: StaffAddress }) {
  return (
    <>
      <InfoRow label="Address Line 1" value={address?.addressLine1} />
      <InfoRow label="Address Line 2" value={address?.addressLine2} />
      <InfoRow label="City" value={address?.city} />
      <InfoRow label="District" value={address?.district} />
      <InfoRow label="State" value={address?.state} />
      <InfoRow label="PIN Code" value={address?.pinCode} />
      <InfoRow label="Country" value={address?.country} />
    </>
  );
}

function InfoCard({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }) {
  return (
    <Card>
      <SectionHeader eyebrow={eyebrow} title={title} />
      <div className="grid gap-3 p-4 sm:p-5">{children}</div>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text text-right font-medium text-foreground">{value || "Not provided"}</span>
    </div>
  );
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span>
    </div>
  );
}
