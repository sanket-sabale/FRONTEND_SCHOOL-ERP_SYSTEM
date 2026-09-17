"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { Button, Field, Select } from "@/components/ui";
import type { StudentEditActionState } from "@/features/students/actions/student-edit-actions";
import { DiscardChangesDialog } from "@/features/students/components/discard-changes-dialog";
import { formatStudentDate } from "@/features/students/components/student-formatters";
import { StudentFormSection, StudentReadOnlyField, StudentTextInput, formatStudentGenderOption } from "@/features/students/components/student-form-controls";
import { getStudentStatusLabel } from "@/features/students/components/student-status-badge";
import {
  studentGenders,
  studentStatuses,
  type StudentGender,
  type StudentProfile,
  type StudentStatus,
} from "@/features/students/types/student";

type StudentEditFormProps = {
  action: (state: StudentEditActionState, formData: FormData) => Promise<StudentEditActionState>;
  context: {
    campus: string;
    academicYear: string;
  };
  student: StudentProfile;
};

type StudentEditValues = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: StudentGender;
  status: StudentStatus;
  admissionNumber: string;
  studentCode: string;
  rollNumber: string;
  admissionDate: string;
};

const initialActionState: StudentEditActionState = { status: "idle" };

export function StudentEditForm({ action, context, student }: StudentEditFormProps) {
  const router = useRouter();
  const initialValues = useMemo(() => toFormValues(student), [student]);
  const [values, setValues] = useState(initialValues);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [actionState, formAction, pending] = useActionState(action, initialActionState);
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const profileHref = `/students/${encodeURIComponent(student.id)}`;

  function updateValue<Key extends keyof StudentEditValues>(key: Key, value: StudentEditValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function confirmCancel(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty) return;
    event.preventDefault();
    setDiscardOpen(true);
  }

  return (
    <>
    <form action={formAction} className="space-y-4 sm:space-y-5 lg:space-y-6">
      {actionState.status === "error" && actionState.message ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {actionState.message}
        </div>
      ) : null}

      <StudentFormSection description="Core identity fields currently supported by the Student domain." eyebrow="Edit" title="Student Information">
        <StudentTextInput
          error={actionState.fieldErrors?.firstName}
          label="First name"
          name="firstName"
          onChange={(value) => updateValue("firstName", value)}
          required
          value={values.firstName}
        />
        <StudentTextInput
          error={actionState.fieldErrors?.middleName}
          label="Middle name"
          name="middleName"
          onChange={(value) => updateValue("middleName", value)}
          value={values.middleName}
        />
        <StudentTextInput
          error={actionState.fieldErrors?.lastName}
          label="Last name"
          name="lastName"
          onChange={(value) => updateValue("lastName", value)}
          required
          value={values.lastName}
        />
        <StudentTextInput
          error={actionState.fieldErrors?.dateOfBirth}
          label="Date of birth"
          name="dateOfBirth"
          onChange={(value) => updateValue("dateOfBirth", value)}
          type="date"
          value={values.dateOfBirth}
        />
        <Field error={actionState.fieldErrors?.gender} label="Gender" required>
          <Select
            name="gender"
            onChange={(event) => updateValue("gender", event.target.value as StudentGender)}
            required
            value={values.gender}
          >
            {studentGenders.map((gender) => (
              <option key={gender} value={gender}>{formatStudentGenderOption(gender)}</option>
            ))}
          </Select>
        </Field>
        <Field error={actionState.fieldErrors?.status} label="Student status" required>
          <Select
            name="status"
            onChange={(event) => updateValue("status", event.target.value as StudentStatus)}
            required
            value={values.status}
          >
            {studentStatuses.map((status) => (
              <option key={status} value={status}>{getStudentStatusLabel(status)}</option>
            ))}
          </Select>
        </Field>
      </StudentFormSection>

      <StudentFormSection description="Academic contract fields use current tenant, campus, and academic year context." eyebrow="Edit" title="Academic Information">
        <StudentTextInput
          error={actionState.fieldErrors?.admissionNumber}
          label="Admission number"
          name="admissionNumber"
          onChange={(value) => updateValue("admissionNumber", value)}
          required
          value={values.admissionNumber}
        />
        <StudentTextInput
          error={actionState.fieldErrors?.studentCode}
          label="Student code"
          name="studentCode"
          onChange={(value) => updateValue("studentCode", value)}
          value={values.studentCode}
        />
        <StudentReadOnlyField label="Current Class" value={student.currentPlacement?.className ?? student.academic.className ?? student.academic.classId} />
        <StudentReadOnlyField label="Current Section" value={student.currentPlacement?.sectionName ?? student.academic.sectionName ?? student.academic.sectionId} />
        <div className="md:col-span-2 rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">
          <p className="font-medium text-foreground">Academic placement is managed as historical placement records.</p>
          <p className="mt-1">Use the placement workflow to change class or section without overwriting history.</p>
          <Link className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" href={`/students/${encodeURIComponent(student.id)}/placement`}>
            Change Academic Placement
          </Link>
        </div>
        <StudentTextInput
          error={actionState.fieldErrors?.rollNumber}
          label="Roll number"
          name="rollNumber"
          onChange={(value) => updateValue("rollNumber", value)}
          value={values.rollNumber}
        />
        <StudentTextInput
          error={actionState.fieldErrors?.admissionDate}
          label="Admission date"
          name="admissionDate"
          onChange={(value) => updateValue("admissionDate", value)}
          required
          type="date"
          value={values.admissionDate}
        />
        <StudentReadOnlyField label="Campus" value={context.campus} />
        <StudentReadOnlyField label="Academic year" value={context.academicYear} />
      </StudentFormSection>

      <StudentFormSection description="Guardian / Parent relationships are managed through the Guardian relationship service so history and primary guardian rules are preserved." eyebrow="Edit" title="Guardian / Parent">
        <div className="md:col-span-2 rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">
          {student.guardianSummaries.length ? (
            <div className="space-y-1">
              <p className="font-medium text-foreground">Linked guardians are managed from the Student 360 Guardian & Family section.</p>
              <p>Use relationship actions there to link, update, set primary, or end guardian relationships without overwriting history.</p>
            </div>
          ) : (
            <p>No guardian relationship is linked to this student yet. Add one from the Student 360 Guardian & Family section.</p>
          )}
          <Link className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" href={`${profileHref}#guardians`}>
            Manage Guardian Relationships
          </Link>
        </div>
      </StudentFormSection>

      <StudentFormSection description="Contact fields are intentionally unavailable until the Student domain supports them." eyebrow="Edit" title="Contact Information">
        <StudentReadOnlyField label="Phone" value="Not supported in current domain" />
        <StudentReadOnlyField label="Email" value="Not supported in current domain" />
        <StudentReadOnlyField label="Address" value="Not supported in current domain" />
      </StudentFormSection>

      <div className="sticky bottom-0 z-10 -mx-3 border-t border-border bg-background/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:bg-surface sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground-muted">
            {dirty ? "You have unsaved student changes." : `Last updated ${formatStudentDate(student.updatedAt.slice(0, 10))}.`}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
              href={profileHref}
              onClick={confirmCancel}
            >
              Cancel
            </Link>
            <Button disabled={!dirty || pending} loading={pending} type="submit" variant="primary">
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </form>
    {discardOpen ? (
      <DiscardChangesDialog
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => router.push(profileHref)}
        title="Discard student changes?"
      />
    ) : null}
    </>
  );
}

function toFormValues(student: StudentProfile): StudentEditValues {
  return {
    firstName: student.firstName,
    middleName: student.middleName ?? "",
    lastName: student.lastName,
    dateOfBirth: student.dateOfBirth ?? "",
    gender: student.gender,
    status: student.status,
    admissionNumber: student.admissionNumber,
    studentCode: student.studentCode ?? "",
    rollNumber: student.academic.rollNumber ?? "",
    admissionDate: student.admissionDate,
  };
}
