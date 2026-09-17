import Link from "next/link";
import { Badge, Button, Card, Field, SectionHeader, Select } from "@/components/ui";
import {
  completeAdmissionEnrollmentAction,
  confirmAdmissionAction,
} from "@/features/admissions/actions/admission-actions";
import { formatAdmissionDateTime } from "@/features/admissions/components/admission-formatters";
import type { AdmissionApplicationDetail, AdmissionEnrollmentReadiness } from "@/features/admissions/types/admission";
import type { StudentAcademicPlacementOption } from "@/features/students/types/student";

type Props = {
  application: AdmissionApplicationDetail;
  readiness: AdmissionEnrollmentReadiness;
  placementOptions: StudentAcademicPlacementOption[];
  canConfirm: boolean;
  canEnroll: boolean;
};

export function AdmissionEnrollmentPanel({ application, readiness, placementOptions, canConfirm, canEnroll }: Props) {
  const enrollment = application.enrollment;
  const classOptions = uniqueClassOptions(placementOptions);
  const sectionOptions = placementOptions.filter((placement) => placement.classId === application.appliedClassId);

  return (
    <Card id="enrollment">
      <SectionHeader eyebrow="Enrollment" title="Admission Enrollment" />
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-2">
          {readiness.checks.map((check) => (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm" key={check.label}>
              <div>
                <p className="font-medium text-foreground">{check.label}</p>
                <p className="mt-1 text-foreground-muted">{check.message}</p>
              </div>
              <Badge tone={check.passed ? "success" : "warning"}>{check.passed ? "Ready" : "Blocked"}</Badge>
            </div>
          ))}
        </div>
        {enrollment ? (
          <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={enrollment.status === "enrolled" ? "success" : "info"}>{enrollment.status}</Badge><span className="font-medium text-foreground">{enrollment.admissionNumber ?? "Admission number pending"}</span></div>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <Info label="Confirmed" value={formatAdmissionDateTime(enrollment.confirmedAt)} />
              <Info label="Enrolled" value={formatAdmissionDateTime(enrollment.enrolledAt)} />
              <Info label="Class" value={application.appliedClassName ?? enrollment.classId} />
              <Info label="Section" value={application.appliedSectionName ?? enrollment.sectionId ?? "Not assigned"} />
            </dl>
            {enrollment.studentId ? <Link className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" href={`/students/${enrollment.studentId}`}>Open Student Profile</Link> : null}
          </div>
        ) : null}
        <div className="grid gap-3 rounded-lg border border-border p-3">
          <form action={confirmAdmissionAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input name="applicationId" type="hidden" value={application.id} />
            <Field label="Class">
              <Select name="classId" defaultValue={application.appliedClassId}>
                {classOptions.map((option) => <option key={option.classId} value={option.classId}>{option.className}</option>)}
              </Select>
            </Field>
            <Field label="Section">
              <Select name="sectionId" defaultValue={application.appliedSectionId ?? sectionOptions[0]?.sectionId ?? ""}>
                {sectionOptions.map((option) => <option key={option.sectionId} value={option.sectionId}>{option.sectionName}</option>)}
              </Select>
            </Field>
            <Button className="self-end" disabled={!canConfirm || !readiness.eligible || Boolean(enrollment)} type="submit" variant="primary">Confirm</Button>
          </form>
          <form action={completeAdmissionEnrollmentAction}>
            <input name="applicationId" type="hidden" value={application.id} />
            <Button disabled={!canEnroll || enrollment?.status !== "confirmed"} type="submit" variant="primary">Complete Enrollment</Button>
          </form>
        </div>
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt><dd className="mt-1 text-foreground">{value}</dd></div>;
}

function uniqueClassOptions(placementOptions: StudentAcademicPlacementOption[]) {
  const options = new Map<string, string>();
  placementOptions.forEach((placement) => options.set(placement.classId, placement.className));
  return Array.from(options.entries()).map(([classId, className]) => ({ classId, className }));
}
