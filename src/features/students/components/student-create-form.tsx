"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { Button, Field, Select } from "@/components/ui";
import { formatGuardianRelationshipType, getGuardianInitials } from "@/features/guardians/components/guardian-formatters";
import {
  guardianRelationshipTypes,
  type GuardianStudentRelationshipType,
  type GuardianSummary,
} from "@/features/guardians/types/guardian";
import type { StudentCreateActionState } from "@/features/students/actions/student-create-actions";
import { DiscardChangesDialog } from "@/features/students/components/discard-changes-dialog";
import { StudentFormSection, StudentReadOnlyField, StudentTextInput, formatStudentGenderOption } from "@/features/students/components/student-form-controls";
import { getStudentStatusLabel } from "@/features/students/components/student-status-badge";
import {
  studentGenders,
  studentStatuses,
  type StudentAcademicPlacementOption,
  type StudentGender,
  type StudentStatus,
} from "@/features/students/types/student";

type StudentCreateFormProps = {
  action: (state: StudentCreateActionState, formData: FormData) => Promise<StudentCreateActionState>;
  context: {
    campus: string;
    academicYear: string;
  };
  guardianOptions: GuardianSummary[];
  placementOptions: StudentAcademicPlacementOption[];
};

type StudentCreateValues = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: StudentGender;
  status: StudentStatus;
  admissionNumber: string;
  studentCode: string;
  classId: string;
  sectionId: string;
  rollNumber: string;
  admissionDate: string;
  guardianId: string;
  guardianSearch: string;
  relationshipType: GuardianStudentRelationshipType;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  canReceiveAcademicCommunication: boolean;
  canReceiveFeeCommunication: boolean;
  canReceiveAttendanceCommunication: boolean;
  canReceiveGeneralCommunication: boolean;
};

type GuardianPermissionField =
  | "canReceiveAcademicCommunication"
  | "canReceiveAttendanceCommunication"
  | "canReceiveFeeCommunication"
  | "canReceiveGeneralCommunication";

const initialActionState: StudentCreateActionState = { status: "idle" };

export function StudentCreateForm({ action, context, guardianOptions, placementOptions }: StudentCreateFormProps) {
  const router = useRouter();
  const initialValues = useMemo(() => toInitialValues(placementOptions), [placementOptions]);
  const [values, setValues] = useState(initialValues);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [actionState, formAction, pending] = useActionState(action, initialActionState);
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const classOptions = useMemo(() => uniqueClassOptions(placementOptions), [placementOptions]);
  const sectionOptions = useMemo(
    () => placementOptions.filter((placement) => placement.classId === values.classId),
    [placementOptions, values.classId],
  );
  const filteredGuardians = useMemo(() => {
    const query = values.guardianSearch.trim().toLowerCase();
    if (!query) return guardianOptions.slice(0, 6);

    return guardianOptions
      .filter((guardian) => {
        const haystack = [guardian.displayName, guardian.primaryPhone, guardian.email].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 6);
  }, [guardianOptions, values.guardianSearch]);
  const selectedGuardian = guardianOptions.find((guardian) => guardian.id === values.guardianId);

  function updateValue<Key extends keyof StudentCreateValues>(key: Key, value: StudentCreateValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updateClass(classId: string) {
    const firstSection = placementOptions.find((placement) => placement.classId === classId)?.sectionId ?? "";
    setValues((current) => ({ ...current, classId, sectionId: firstSection }));
  }

  function confirmCancel(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty) return;
    event.preventDefault();
    setDiscardOpen(true);
  }

  function selectGuardian(guardian: GuardianSummary) {
    setValues((current) => ({
      ...current,
      guardianId: guardian.id,
      guardianSearch: guardian.displayName,
    }));
  }

  function clearGuardian() {
    setValues((current) => ({
      ...current,
      guardianId: "",
      guardianSearch: "",
      isPrimary: true,
      isEmergencyContact: false,
    }));
  }

  return (
    <>
      <form action={formAction} className="space-y-4 sm:space-y-5 lg:space-y-6">
        {actionState.status === "error" && actionState.message ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {actionState.message}
          </div>
        ) : null}

        <StudentFormSection description="Enter only the student identity fields currently supported by the Student domain." eyebrow="Admission" title="Student Information">
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

        <StudentFormSection description="Admission details are scoped to the active campus and academic year." eyebrow="Admission" title="Admission Information">
          <StudentTextInput
            error={actionState.fieldErrors?.admissionNumber}
            helperText="Use the official school admission number."
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

        <StudentFormSection description="Select a supported class and section from the current academic context." eyebrow="Admission" title="Academic Placement">
          <Field error={actionState.fieldErrors?.classId} label="Class" required>
            <Select
              name="classId"
              onChange={(event) => updateClass(event.target.value)}
              required
              value={values.classId}
            >
              {classOptions.map((option) => (
                <option key={option.classId} value={option.classId}>{option.className}</option>
              ))}
            </Select>
          </Field>
          <Field error={actionState.fieldErrors?.sectionId} label="Section" required>
            <Select
              name="sectionId"
              onChange={(event) => updateValue("sectionId", event.target.value)}
              required
              value={values.sectionId}
            >
              {sectionOptions.map((option) => (
                <option key={`${option.classId}-${option.sectionId}`} value={option.sectionId}>Section {option.sectionName}</option>
              ))}
            </Select>
          </Field>
          <StudentTextInput
            error={actionState.fieldErrors?.rollNumber}
            label="Roll number"
            name="rollNumber"
            onChange={(value) => updateValue("rollNumber", value)}
            value={values.rollNumber}
          />
        </StudentFormSection>

        <StudentFormSection description="Guardian / Parent links are created through the Guardian relationship service, preserving the many-to-many family model." eyebrow="Admission" title="Guardian / Parent">
          <input name="guardianId" type="hidden" value={values.guardianId} />
          <Field error={actionState.fieldErrors?.guardianId} label="Search guardian">
            <input
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-foreground-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => updateValue("guardianSearch", event.target.value)}
              placeholder="Search by guardian name, phone, or email"
              type="search"
              value={values.guardianSearch}
            />
          </Field>
          <div className="md:col-span-2">
            {selectedGuardian ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                      {getGuardianInitials(selectedGuardian.displayName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{selectedGuardian.displayName}</p>
                      <p className="truncate text-xs text-foreground-muted">
                        {maskPhone(selectedGuardian.primaryPhone)}
                        {selectedGuardian.email ? ` · ${selectedGuardian.email}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button onClick={clearGuardian} type="button" variant="secondary">Change Guardian</Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-surface-muted p-3">
                {filteredGuardians.length ? (
                  <div className="space-y-2">
                    {filteredGuardians.map((guardian) => (
                      <button
                        className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-2 text-left transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                        key={guardian.id}
                        onClick={() => selectGuardian(guardian)}
                        type="button"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">
                          {getGuardianInitials(guardian.displayName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">{guardian.displayName}</span>
                          <span className="block truncate text-xs text-foreground-muted">{maskPhone(guardian.primaryPhone)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground-muted">No active guardians match this search in the current school context.</p>
                )}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
              <span>Need a new guardian record?</span>
              <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/guardians/new">Create Guardian</Link>
            </div>
          </div>
          <Field error={actionState.fieldErrors?.relationshipType} label="Relationship">
            <Select
              disabled={!values.guardianId}
              name="relationshipType"
              onChange={(event) => updateValue("relationshipType", event.target.value as GuardianStudentRelationshipType)}
              value={values.relationshipType}
            >
              {guardianRelationshipTypes.map((relationship) => (
                <option key={relationship} value={relationship}>{formatGuardianRelationshipType(relationship)}</option>
              ))}
            </Select>
          </Field>
          <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground">
            <input checked={values.isPrimary} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" disabled={!values.guardianId} name="isPrimary" onChange={(event) => updateValue("isPrimary", event.target.checked)} type="checkbox" />
            Primary guardian
          </label>
          <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground">
            <input checked={values.isEmergencyContact} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" disabled={!values.guardianId} name="isEmergencyContact" onChange={(event) => updateValue("isEmergencyContact", event.target.checked)} type="checkbox" />
            Emergency contact
          </label>
          <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground">
            <input checked={values.canPickup} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" disabled={!values.guardianId} name="canPickup" onChange={(event) => updateValue("canPickup", event.target.checked)} type="checkbox" />
            Pickup authorized
          </label>
          <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
            {([
              ["canReceiveAcademicCommunication", "Academic communication"],
              ["canReceiveAttendanceCommunication", "Attendance communication"],
              ["canReceiveFeeCommunication", "Fee communication"],
              ["canReceiveGeneralCommunication", "General communication"],
            ] satisfies Array<[GuardianPermissionField, string]>).map(([key, label]) => (
              <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground" key={key}>
                <input
                  checked={values[key]}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  disabled={!values.guardianId}
                  name={key}
                  onChange={(event) => updateValue(key, event.target.checked)}
                  type="checkbox"
                />
                {label}
              </label>
            ))}
          </div>
        </StudentFormSection>

        <StudentFormSection description="Student contact fields are intentionally unavailable until the Student domain supports them." eyebrow="Admission" title="Contact Information">
          <StudentReadOnlyField label="Phone" value="Not supported in current domain" />
          <StudentReadOnlyField label="Email" value="Not supported in current domain" />
          <StudentReadOnlyField label="Address" value="Not supported in current domain" />
        </StudentFormSection>

        <div className="sticky bottom-0 z-10 -mx-3 border-t border-border bg-background/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:bg-surface sm:px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground-muted">
              {dirty ? "You have unsaved admission details." : "Complete the required fields to create a student record."}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Link
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                href="/students"
                onClick={confirmCancel}
              >
                Cancel
              </Link>
              <Button disabled={pending || placementOptions.length === 0} loading={pending} type="submit" variant="primary">
                {pending ? "Creating..." : "Create Student"}
              </Button>
            </div>
          </div>
        </div>
      </form>
      {discardOpen ? (
        <DiscardChangesDialog
          onCancel={() => setDiscardOpen(false)}
          onConfirm={() => router.push("/students")}
          title="Discard admission form?"
        />
      ) : null}
    </>
  );
}

function toInitialValues(placementOptions: StudentAcademicPlacementOption[]): StudentCreateValues {
  const firstPlacement = placementOptions[0];

  return {
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "not_specified",
    status: "pending",
    admissionNumber: "",
    studentCode: "",
    classId: firstPlacement?.classId ?? "",
    sectionId: firstPlacement?.sectionId ?? "",
    rollNumber: "",
    admissionDate: "",
    guardianId: "",
    guardianSearch: "",
    relationshipType: "mother",
    isPrimary: true,
    isEmergencyContact: false,
    canPickup: true,
    canReceiveAcademicCommunication: true,
    canReceiveFeeCommunication: true,
    canReceiveAttendanceCommunication: true,
    canReceiveGeneralCommunication: true,
  };
}

function uniqueClassOptions(placementOptions: StudentAcademicPlacementOption[]) {
  const options = new Map<string, string>();
  placementOptions.forEach((placement) => options.set(placement.classId, placement.className));

  return Array.from(options.entries()).map(([classId, className]) => ({ classId, className }));
}

function maskPhone(phone: string) {
  if (phone.length <= 6) return phone;
  return `${phone.slice(0, 4)} XXXXX ${phone.slice(-3)}`;
}
