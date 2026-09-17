import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Button, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { updateStudentLifecycleAction } from "@/features/students/actions/student-lifecycle-actions";
import { StudentDocumentsPanel } from "@/features/students/components/student-documents-panel";
import { StudentLifecyclePanel } from "@/features/students/components/student-lifecycle-panel";
import { StudentStatusBadge, getStudentStatusLabel } from "@/features/students/components/student-status-badge";
import { StudentAttendanceSummaryCard } from "@/features/attendance/components/student-attendance-summary";
import { StudentGuardianFamily } from "@/features/guardians/components/student-guardian-family";
import {
  formatStudentDate,
  formatStudentGender,
  getStudentInitials,
} from "@/features/students/components/student-formatters";
import type { GuardianSummary, StudentGuardianRecord } from "@/features/guardians/types/guardian";
import type { AttendanceSummary } from "@/features/attendance/types/attendance";
import type { AttendanceRiskLevel, AttendanceTrendPoint } from "@/features/attendance/types/attendance-report";
import type { StudentDocumentListResponse, StudentProfile as StudentProfileModel } from "@/features/students/types/student";
import type { Role } from "@/types/erp";
import { hasPermission } from "@/components/shared/permission-gate";

type StudentProfileProps = {
  context: {
    school: string;
    campus: string;
    academicYear: string;
  };
  role: Role;
  student: StudentProfileModel;
  documentsResponse: StudentDocumentListResponse;
  guardianOptions: GuardianSummary[];
  guardianRecords: StudentGuardianRecord[];
  attendanceSummary: AttendanceSummary;
  attendanceRiskLevel?: AttendanceRiskLevel;
  attendanceTrend: AttendanceTrendPoint[];
  created?: boolean;
  updated?: boolean;
};

const futureProfileSections = [
  { id: "overview", label: "Overview", active: true },
  { id: "attendance", label: "Attendance" },
  { id: "fees", label: "Fees" },
  { id: "assessments", label: "Assessments" },
  { id: "assignments", label: "Assignments" },
  { id: "timetable", label: "Timetable" },
  { id: "communication", label: "Communication" },
  { id: "documents", label: "Documents", active: true },
];

export function StudentProfile({ attendanceRiskLevel, attendanceSummary, attendanceTrend, context, role, student, documentsResponse, guardianOptions, guardianRecords, created = false, updated = false }: StudentProfileProps) {
  const canUpdate = hasPermission(role, "student.update") && student.status !== "archived";
  const canManageLifecycle = hasPermission(role, "student.archive");
  const canManageDocuments = hasPermission(role, "student.manage");
  const canManageGuardians = hasPermission(role, "guardian.manage") || hasPermission(role, "guardian.link");
  const primaryGuardian = guardianRecords.find((guardian) => guardian.isPrimary) ?? guardianRecords[0];

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Students", "Student Profile", student.displayName]} />}
        description="Student 360 overview for identity, academic placement, guardian context, and future ERP module connections."
        eyebrow="Student 360"
        title={student.displayName}
        action={
          <div className="responsive-action-row">
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
              href="/students"
            >
              Back to Students
            </Link>
            {canUpdate ? (
              <Link
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                href={`/students/${encodeURIComponent(student.id)}/edit`}
              >
                Edit Student
              </Link>
            ) : null}
            {canUpdate ? (
              <Link
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                href={`/students/${encodeURIComponent(student.id)}/placement`}
              >
                Change Placement
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
          {created ? "Student created successfully." : "Student details updated successfully."}
        </div>
      ) : null}

      <StudentHero context={context} primaryGuardianName={primaryGuardian?.guardian.displayName} student={student} />
      <StudentProfileNavigation />
      <StudentProfileSummary context={context} student={student} />
      <StudentLifecyclePanel action={updateStudentLifecycleAction} canManageLifecycle={canManageLifecycle} student={student} />
      <StudentDocumentsPanel canManageDocuments={canManageDocuments} documentsResponse={documentsResponse} student={student} />

      <section className="grid gap-4 xl:grid-cols-2">
        <StudentAttendanceSummaryCard riskLevel={attendanceRiskLevel} studentId={student.id} summary={attendanceSummary} trend={attendanceTrend} />
        <StudentPersonalInfo student={student} />
        <StudentAcademicInfo context={context} student={student} />
        <StudentGuardianFamily availableGuardians={guardianOptions} canManage={canManageGuardians} guardians={guardianRecords} studentId={student.id} />
        <StudentContactInfo />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <StudentQuickActions />
        <StudentActivity />
      </section>
    </div>
  );
}

export function StudentProfileNotFound({ message = "The student you're looking for doesn't exist or is no longer available." }: { message?: string }) {
  return (
    <div className="erp-container">
      <Card className="mx-auto max-w-xl p-5">
        <SectionHeader eyebrow="Student Management" title="Student not found" />
        <div className="p-4 sm:p-5">
          <EmptyState description={message} title="Student not found" />
          <Link
            className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            href="/students"
          >
            Back to Student Directory
          </Link>
        </div>
      </Card>
    </div>
  );
}

function StudentHero({
  context,
  primaryGuardianName,
  student,
}: {
  context: StudentProfileProps["context"];
  primaryGuardianName?: string;
  student: StudentProfileModel;
}) {
  return (
    <section className="responsive-panel border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <span
            aria-label={`${student.displayName} avatar`}
            className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-border bg-surface-muted text-xl font-semibold text-foreground sm:h-24 sm:w-24"
            role="img"
          >
            {getStudentInitials(student.displayName)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="responsive-text text-2xl font-semibold tracking-tight text-foreground">{student.displayName}</h2>
              <StudentStatusBadge status={student.status} />
            </div>
            <p className="mt-2 font-mono text-xs text-foreground-muted">Admission No: {student.admissionNumber}</p>
            {student.studentCode ? <p className="mt-1 font-mono text-xs text-foreground-muted">Student Code: {student.studentCode}</p> : null}
            <p className="responsive-text mt-3 text-sm text-foreground">
              {student.currentPlacement?.className ?? student.academic.className ?? student.academic.classId} / Section {student.currentPlacement?.sectionName ?? student.academic.sectionName ?? student.academic.sectionId}
              {student.academic.rollNumber ? ` / Roll ${student.academic.rollNumber}` : ""}
            </p>
            <p className="responsive-text mt-1 text-sm text-foreground-muted">{context.campus} / {context.academicYear}</p>
            {primaryGuardianName ? <p className="responsive-text mt-2 text-sm text-foreground-muted">Primary guardian: {primaryGuardianName}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">Tenant-scoped</Badge>
          <Badge tone="neutral">Overview foundation</Badge>
        </div>
      </div>
    </section>
  );
}

function StudentProfileNavigation() {
  return (
    <nav aria-label="Student profile sections" className="scrollbar-hidden flex gap-2 overflow-x-auto rounded-xl border border-border bg-surface p-2">
      {futureProfileSections.map((section) => (
        <button
          aria-current={section.active ? "page" : undefined}
          aria-disabled={!section.active}
          className={
            section.active
              ? "min-h-9 shrink-0 rounded-lg bg-sky-50 px-3 text-sm font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-200"
              : "min-h-9 shrink-0 cursor-not-allowed rounded-lg px-3 text-sm font-medium text-foreground-muted opacity-70"
          }
          disabled={!section.active}
          key={section.id}
          type="button"
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}

function StudentProfileSummary({ context, student }: { context: StudentProfileProps["context"]; student: StudentProfileModel }) {
  const metrics = [
    { label: "Admission Date", value: formatStudentDate(student.admissionDate), tone: "info" },
    { label: "Current Class", value: student.currentPlacement?.className ?? student.academic.className ?? student.academic.classId, tone: "neutral" },
    { label: "Section", value: student.currentPlacement?.sectionName ?? student.academic.sectionName ?? student.academic.sectionId, tone: "neutral" },
    { label: "Status", value: getStudentStatusLabel(student.status), tone: "success" },
    { label: "Academic Year", value: context.academicYear, tone: "info" },
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Student profile summary">
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

function StudentPersonalInfo({ student }: { student: StudentProfileModel }) {
  return (
    <InfoCard eyebrow="Overview" title="Personal Information">
      <InfoRow label="Full Name" value={student.displayName} />
      <InfoRow label="First Name" value={student.firstName} />
      <InfoRow label="Middle Name" value={student.middleName} />
      <InfoRow label="Last Name" value={student.lastName} />
      <InfoRow label="Date of Birth" value={formatStudentDate(student.dateOfBirth)} />
      <InfoRow label="Gender" value={formatStudentGender(student.gender)} />
      <InfoRow label="Student Status" value={getStudentStatusLabel(student.status)} />
      <InfoRow label="Admission Date" value={formatStudentDate(student.admissionDate)} />
    </InfoCard>
  );
}

function StudentAcademicInfo({ context, student }: { context: StudentProfileProps["context"]; student: StudentProfileModel }) {
  return (
    <InfoCard eyebrow="Academics" title="Academic Information">
      <InfoRow label="Admission Number" value={student.admissionNumber} />
      <InfoRow label="Student Code" value={student.studentCode} />
      <InfoRow label="Academic Year" value={student.currentPlacement?.academicYearName ?? context.academicYear} />
      <InfoRow label="Class" value={student.currentPlacement?.className ?? student.academic.className ?? student.academic.classId} />
      <InfoRow label="Section" value={student.currentPlacement?.sectionName ?? student.academic.sectionName ?? student.academic.sectionId} />
      <InfoRow label="Placement Status" value={student.currentPlacement ? formatPlacementStatus(student.currentPlacement.status) : "Legacy read model"} />
      <InfoRow label="Placement Start Date" value={formatStudentDate(student.currentPlacement?.startDate)} />
      <InfoRow label="Roll Number" value={student.academic.rollNumber} />
      <InfoRow label="Campus" value={context.campus} />
      <InfoRow label="Current Academic Status" value={getStudentStatusLabel(student.status)} />
      <div className="grid gap-2">
        <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/students/${encodeURIComponent(student.id)}/placement`}>
          View Placement Workflow
        </Link>
      </div>
      <PlacementHistory student={student} />
    </InfoCard>
  );
}

function PlacementHistory({ student }: { student: StudentProfileModel }) {
  if (student.placementHistory.length === 0) {
    return <EmptyState description="No placement history exists yet for this student." title="No placement history" />;
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Placement History</p>
      {student.placementHistory.map((placement) => (
        <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm" key={placement.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">{placement.academicYearName} / {placement.className} / Section {placement.sectionName}</p>
              <p className="mt-1 text-foreground-muted">
                Started {formatStudentDate(placement.startDate)}
                {placement.endDate ? ` / Ended ${formatStudentDate(placement.endDate)}` : ""}
              </p>
              {placement.reason ? <p className="mt-1 text-foreground-muted">Reason: {formatPlacementStatus(placement.reason)}</p> : null}
            </div>
            <Badge tone={placement.status === "active" ? "success" : "neutral"}>{formatPlacementStatus(placement.status)}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function StudentContactInfo() {
  return (
    <InfoCard eyebrow="Contact" title="Contact Information">
      <EmptyState
        description="Phone, email, address, and emergency contact fields are not part of the current Student domain foundation."
        title="No contact information available"
      />
    </InfoCard>
  );
}

function StudentQuickActions() {
  const actions = ["Attendance", "Fees", "Assessments", "Communication", "Documents"];

  return (
    <InfoCard eyebrow="Workspace" title="Quick Actions">
      <div className="grid gap-2 sm:grid-cols-2">
        {actions.map((action) => (
          <Button aria-disabled="true" disabled key={action} variant="secondary">
            {action}
            <span className="text-xs font-normal">Coming later</span>
          </Button>
        ))}
      </div>
    </InfoCard>
  );
}

function StudentActivity() {
  return (
    <InfoCard eyebrow="Activity" title="Recent Activity">
      <EmptyState
        description="No student activity service is connected yet. This area is reserved for future audited student events."
        title="No student activity available"
      />
    </InfoCard>
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

function formatPlacementStatus(value: string) {
  return value.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span>
    </div>
  );
}
