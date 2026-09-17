"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { Button, Field, Select } from "@/components/ui";
import type { AdmissionActionState } from "@/features/admissions/actions/admission-actions";
import { formatAdmissionPriority, formatAdmissionSource } from "@/features/admissions/components/admission-formatters";
import { admissionPriorities, admissionSources, type AdmissionApplicationDetail, type AdmissionCycle } from "@/features/admissions/types/admission";
import { formatGuardianRelationshipType, getGuardianInitials } from "@/features/guardians/components/guardian-formatters";
import { guardianRelationshipTypes, type GuardianStudentRelationshipType, type GuardianSummary } from "@/features/guardians/types/guardian";
import { DiscardChangesDialog } from "@/features/students/components/discard-changes-dialog";
import { StudentFormSection, StudentReadOnlyField, StudentTextInput, formatStudentGenderOption } from "@/features/students/components/student-form-controls";
import { studentGenders, type StudentAcademicPlacementOption, type StudentGender } from "@/features/students/types/student";

type Props = {
  action: (state: AdmissionActionState, formData: FormData) => Promise<AdmissionActionState>;
  application?: AdmissionApplicationDetail;
  context: { campus: string; academicYear: string };
  cycles: AdmissionCycle[];
  guardianOptions: GuardianSummary[];
  mode: "create" | "edit";
  placementOptions: StudentAcademicPlacementOption[];
};

type Values = {
  admissionCycleId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: StudentGender;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  previousSchool: string;
  previousGrade: string;
  appliedClassId: string;
  appliedSectionId: string;
  source: string;
  priority: string;
  assignedReviewerId: string;
  guardianId: string;
  guardianSearch: string;
  relationshipType: GuardianStudentRelationshipType;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  canReceiveCommunication: boolean;
  canPickup: boolean;
};

const initialActionState: AdmissionActionState = { status: "idle" };
const reviewerOptions = ["staff-admission-001", "staff-admission-002"] as const;
const guardianCheckboxFields = [
  ["isPrimary", "Primary guardian"],
  ["isEmergencyContact", "Emergency contact"],
  ["canReceiveCommunication", "Can receive communication"],
  ["canPickup", "Pickup authorized"],
] satisfies Array<[Extract<keyof Values, "isPrimary" | "isEmergencyContact" | "canReceiveCommunication" | "canPickup">, string]>;

export function AdmissionApplicationForm({ action, application, context, cycles, guardianOptions, mode, placementOptions }: Props) {
  const router = useRouter();
  const initialValues = useMemo(() => toInitialValues({ application, cycles, placementOptions }), [application, cycles, placementOptions]);
  const [values, setValues] = useState(initialValues);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [actionState, formAction, pending] = useActionState(action, initialActionState);
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const classOptions = useMemo(() => uniqueClassOptions(placementOptions), [placementOptions]);
  const sectionOptions = useMemo(() => placementOptions.filter((placement) => placement.classId === values.appliedClassId), [placementOptions, values.appliedClassId]);
  const filteredGuardians = useMemo(() => {
    const query = values.guardianSearch.trim().toLowerCase();
    if (!query) return guardianOptions.slice(0, 6);
    return guardianOptions.filter((guardian) => [guardian.displayName, guardian.primaryPhone, guardian.email].filter(Boolean).join(" ").toLowerCase().includes(query)).slice(0, 6);
  }, [guardianOptions, values.guardianSearch]);
  const selectedGuardian = guardianOptions.find((guardian) => guardian.id === values.guardianId);
  const canChangeGuardian = mode === "create";

  function updateValue<Key extends keyof Values>(key: Key, value: Values[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updateClass(classId: string) {
    const firstSection = placementOptions.find((placement) => placement.classId === classId)?.sectionId ?? "";
    setValues((current) => ({ ...current, appliedClassId: classId, appliedSectionId: firstSection }));
  }

  function confirmCancel(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty) return;
    event.preventDefault();
    setDiscardOpen(true);
  }

  return (
    <>
      <form action={formAction} className="space-y-4 sm:space-y-5 lg:space-y-6">
        {application ? <input name="applicationId" type="hidden" value={application.id} /> : null}
        {actionState.status !== "idle" && actionState.message ? (
          <div className={`rounded-lg border p-3 text-sm ${actionState.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"}`}>
            {actionState.message}
          </div>
        ) : null}

        <StudentFormSection description="Select the admission cycle and academic placement. School, campus, and academic year are fixed by the active tenant context." eyebrow="Admission" title="Admission Context">
          <Field label="Admission cycle" required>
            <Select name="admissionCycleId" onChange={(event) => updateValue("admissionCycleId", event.target.value)} required value={values.admissionCycleId}>
              {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}
            </Select>
          </Field>
          <StudentReadOnlyField label="Campus" value={context.campus} />
          <StudentReadOnlyField label="Academic year" value={context.academicYear} />
          <Field label="Applied class" required>
            <Select name="appliedClassId" onChange={(event) => updateClass(event.target.value)} required value={values.appliedClassId}>
              {classOptions.map((option) => <option key={option.classId} value={option.classId}>{option.className}</option>)}
            </Select>
          </Field>
          <Field label="Applied section">
            <Select name="appliedSectionId" onChange={(event) => updateValue("appliedSectionId", event.target.value)} value={values.appliedSectionId}>
              <option value="">No section preference</option>
              {sectionOptions.map((option) => <option key={option.sectionId} value={option.sectionId}>{option.sectionName}</option>)}
            </Select>
          </Field>
          {mode === "edit" ? (
            <Field label="Reviewer">
              <Select name="assignedReviewerId" onChange={(event) => updateValue("assignedReviewerId", event.target.value)} value={values.assignedReviewerId}>
                <option value="">Unassigned</option>
                {reviewerOptions.map((reviewer) => <option key={reviewer} value={reviewer}>{reviewer}</option>)}
              </Select>
            </Field>
          ) : null}
        </StudentFormSection>

        <StudentFormSection description="Applicant records remain separate from Student records until a later enrollment phase." eyebrow="Applicant" title="Applicant Information">
          <StudentTextInput label="First name" name="firstName" onChange={(value) => updateValue("firstName", value)} required value={values.firstName} />
          <StudentTextInput label="Middle name" name="middleName" onChange={(value) => updateValue("middleName", value)} value={values.middleName} />
          <StudentTextInput label="Last name" name="lastName" onChange={(value) => updateValue("lastName", value)} required value={values.lastName} />
          <StudentTextInput label="Date of birth" name="dateOfBirth" onChange={(value) => updateValue("dateOfBirth", value)} type="date" value={values.dateOfBirth} />
          <Field label="Gender">
            <Select name="gender" onChange={(event) => updateValue("gender", event.target.value as StudentGender)} value={values.gender}>
              {studentGenders.map((gender) => <option key={gender} value={gender}>{formatStudentGenderOption(gender)}</option>)}
            </Select>
          </Field>
          <StudentTextInput label="Phone" name="phone" onChange={(value) => updateValue("phone", value)} value={values.phone} />
          <StudentTextInput label="Email" name="email" onChange={(value) => updateValue("email", value)} value={values.email} />
          <StudentTextInput label="Previous school" name="previousSchool" onChange={(value) => updateValue("previousSchool", value)} value={values.previousSchool} />
          <StudentTextInput label="Previous grade" name="previousGrade" onChange={(value) => updateValue("previousGrade", value)} value={values.previousGrade} />
        </StudentFormSection>

        <StudentFormSection description="Address is stored on the applicant and stays inside the current tenant application scope." eyebrow="Applicant" title="Address">
          <StudentTextInput label="Address" name="address" onChange={(value) => updateValue("address", value)} value={values.address} />
          <StudentTextInput label="City" name="city" onChange={(value) => updateValue("city", value)} value={values.city} />
          <StudentTextInput label="State" name="state" onChange={(value) => updateValue("state", value)} value={values.state} />
          <StudentTextInput label="Country" name="country" onChange={(value) => updateValue("country", value)} value={values.country} />
          <StudentTextInput label="Postal code" name="postalCode" onChange={(value) => updateValue("postalCode", value)} value={values.postalCode} />
        </StudentFormSection>

        <StudentFormSection description="Source and priority help the admissions office triage intake without changing lifecycle status." eyebrow="Operations" title="Application Details">
          <Field label="Source">
            <Select name="source" onChange={(event) => updateValue("source", event.target.value)} value={values.source}>
              {admissionSources.map((source) => <option key={source} value={source}>{formatAdmissionSource(source)}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select name="priority" onChange={(event) => updateValue("priority", event.target.value)} value={values.priority}>
              {admissionPriorities.map((priority) => <option key={priority} value={priority}>{formatAdmissionPriority(priority)}</option>)}
            </Select>
          </Field>
        </StudentFormSection>

        {canChangeGuardian ? (
          <StudentFormSection description="Link an existing guardian profile. New guardian creation remains in the Guardian module." eyebrow="Guardian" title="Guardian / Parent">
            <input name="guardianId" type="hidden" value={values.guardianId} />
            <Field label="Search guardian">
              <input className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-foreground-muted focus:border-primary focus:ring-2 focus:ring-primary/20" onChange={(event) => updateValue("guardianSearch", event.target.value)} placeholder="Search name, phone, or email" type="search" value={values.guardianSearch} />
            </Field>
            <div className="md:col-span-2">
              {selectedGuardian ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{getGuardianInitials(selectedGuardian.displayName)}</span>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{selectedGuardian.displayName}</p><p className="truncate text-xs text-foreground-muted">{selectedGuardian.primaryPhone}</p></div>
                    </div>
                    <Button onClick={() => updateValue("guardianId", "")} type="button" variant="secondary">Change</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 rounded-xl border border-dashed border-border bg-surface-muted p-3">
                  {filteredGuardians.map((guardian) => (
                    <button className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-2 text-left transition hover:bg-surface-muted" key={guardian.id} onClick={() => setValues((current) => ({ ...current, guardianId: guardian.id, guardianSearch: guardian.displayName }))} type="button">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold">{getGuardianInitials(guardian.displayName)}</span>
                      <span className="min-w-0"><span className="block truncate text-sm font-medium">{guardian.displayName}</span><span className="block truncate text-xs text-foreground-muted">{guardian.primaryPhone}</span></span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-2 text-xs text-foreground-muted"><Link className="font-medium text-primary underline-offset-4 hover:underline" href="/guardians/new">Create Guardian</Link></div>
            </div>
            <Field label="Relationship">
              <Select disabled={!values.guardianId} name="relationshipType" onChange={(event) => updateValue("relationshipType", event.target.value as GuardianStudentRelationshipType)} value={values.relationshipType}>
                {guardianRelationshipTypes.map((relationship) => <option key={relationship} value={relationship}>{formatGuardianRelationshipType(relationship)}</option>)}
              </Select>
            </Field>
            {guardianCheckboxFields.map(([key, label]) => (
              <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground" key={key}>
                <input checked={values[key]} disabled={!values.guardianId} name={key} onChange={(event) => updateValue(key, event.target.checked)} type="checkbox" />
                {label}
              </label>
            ))}
          </StudentFormSection>
        ) : null}

        <div className="sticky bottom-0 z-10 -mx-3 border-t border-border bg-background/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:bg-surface sm:px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground-muted">{dirty ? "You have unsaved admission details." : mode === "create" ? "Save as draft; submission is a separate action." : "Editing is limited by application status and permission."}</p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={application ? `/admissions/applications/${application.id}` : "/admissions/applications"} onClick={confirmCancel}>Cancel</Link>
              <Button disabled={pending || placementOptions.length === 0 || cycles.length === 0} loading={pending} type="submit" variant="primary">{pending ? "Saving..." : mode === "create" ? "Save Draft" : "Update"}</Button>
            </div>
          </div>
        </div>
      </form>
      {discardOpen ? <DiscardChangesDialog onCancel={() => setDiscardOpen(false)} onConfirm={() => router.push(application ? `/admissions/applications/${application.id}` : "/admissions/applications")} title="Discard admission form?" /> : null}
    </>
  );
}

function toInitialValues({ application, cycles, placementOptions }: { application?: AdmissionApplicationDetail; cycles: AdmissionCycle[]; placementOptions: StudentAcademicPlacementOption[] }): Values {
  const firstPlacement = placementOptions[0];
  const guardian = application?.guardians[0];
  return {
    admissionCycleId: application?.admissionCycleId ?? cycles.find((cycle) => cycle.status === "open")?.id ?? cycles[0]?.id ?? "",
    firstName: application?.applicant.firstName ?? "",
    middleName: application?.applicant.middleName ?? "",
    lastName: application?.applicant.lastName ?? "",
    dateOfBirth: application?.applicant.dateOfBirth ?? "",
    gender: application?.applicant.gender ?? "not_specified",
    phone: application?.applicant.phone ?? "",
    email: application?.applicant.email ?? "",
    address: application?.applicant.address?.address ?? "",
    city: application?.applicant.address?.city ?? "",
    state: application?.applicant.address?.state ?? "",
    country: application?.applicant.address?.country ?? "India",
    postalCode: application?.applicant.address?.postalCode ?? "",
    previousSchool: application?.applicant.previousSchool ?? "",
    previousGrade: application?.applicant.previousGrade ?? "",
    appliedClassId: application?.appliedClassId ?? firstPlacement?.classId ?? "",
    appliedSectionId: application?.appliedSectionId ?? firstPlacement?.sectionId ?? "",
    source: application?.source ?? "walk_in",
    priority: application?.priority ?? "normal",
    assignedReviewerId: application?.assignedReviewerId ?? "",
    guardianId: guardian?.guardianId ?? "",
    guardianSearch: guardian?.guardianId ?? "",
    relationshipType: guardian?.relationshipType ?? "mother",
    isPrimary: guardian?.isPrimary ?? true,
    isEmergencyContact: guardian?.isEmergencyContact ?? false,
    canReceiveCommunication: guardian?.canReceiveCommunication ?? true,
    canPickup: guardian?.canPickup ?? true,
  };
}

function uniqueClassOptions(placementOptions: StudentAcademicPlacementOption[]) {
  const options = new Map<string, string>();
  placementOptions.forEach((placement) => options.set(placement.classId, placement.className));
  return Array.from(options.entries()).map(([classId, className]) => ({ classId, className }));
}
