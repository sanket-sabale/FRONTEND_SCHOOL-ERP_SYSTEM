"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { Button, Field, Select } from "@/components/ui";
import type { StaffFormActionState } from "@/features/staff/actions/staff-actions";
import {
  StaffFormSection,
  StaffReadOnlyField,
  StaffTextInput,
} from "@/features/staff/components/staff-form-controls";
import {
  getEmergencyContactRelationshipLabel,
  getEmploymentTypeLabel,
  getStaffCategoryLabel,
  getStaffPreferredContactMethodLabel,
  getStaffStatusLabel,
  isTerminalStaffStatus,
} from "@/features/staff/services/staff-rules";
import {
  emergencyContactRelationships,
  employmentTypes,
  staffCategories,
  staffPreferredContactMethods,
  staffStatuses,
  type EmergencyContactRelationship,
  type EmploymentType,
  type StaffCategory,
  type StaffDepartment,
  type StaffDesignation,
  type StaffPreferredContactMethod,
  type StaffProfile,
  type StaffStatus,
  type StaffSummary,
} from "@/features/staff/types/staff";
import { DiscardChangesDialog } from "@/features/students/components/discard-changes-dialog";

type StaffFormProps = {
  action: (state: StaffFormActionState, formData: FormData) => Promise<StaffFormActionState>;
  context: {
    campus: string;
    academicYear: string;
  };
  departments: StaffDepartment[];
  designations: StaffDesignation[];
  managerOptions: StaffSummary[];
  mode: "create" | "edit";
  staff?: StaffProfile;
};

type StaffFormValues = {
  employeeNumber: string;
  userId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  staffCategory: StaffCategory;
  employmentType: EmploymentType;
  status: StaffStatus;
  joiningDate: string;
  confirmationDate: string;
  exitDate: string;
  exitReason: string;
  departmentId: string;
  designationId: string;
  reportingManagerId: string;
  mobileNumber: string;
  alternatePhone: string;
  personalEmail: string;
  officialEmail: string;
  preferredContactMethod: StaffPreferredContactMethod;
  currentAddressLine1: string;
  currentAddressLine2: string;
  currentCity: string;
  currentDistrict: string;
  currentState: string;
  currentPinCode: string;
  currentCountry: string;
  permanentAddressSameAsCurrent: boolean;
  permanentAddressLine1: string;
  permanentAddressLine2: string;
  permanentCity: string;
  permanentDistrict: string;
  permanentState: string;
  permanentPinCode: string;
  permanentCountry: string;
  emergencyContactName: string;
  emergencyContactRelationship: EmergencyContactRelationship;
  emergencyContactMobile: string;
  emergencyContactAlternate: string;
  emergencyContactEmail: string;
  emergencyContactAddress: string;
  teacherCode: string;
  subjectAreas: string;
  academicDepartment: string;
  qualificationSummary: string;
  experienceSummary: string;
};

const initialActionState: StaffFormActionState = { status: "idle" };

export function StaffForm({ action, context, departments, designations, managerOptions, mode, staff }: StaffFormProps) {
  const router = useRouter();
  const initialValues = useMemo(() => toInitialValues(departments, designations, staff), [departments, designations, staff]);
  const [values, setValues] = useState(initialValues);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [actionState, formAction, pending] = useActionState(action, initialActionState);
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const categoryDesignations = designations.filter((designation) => !designation.staffCategory || designation.staffCategory === values.staffCategory);
  const showExitFields = isTerminalStaffStatus(values.status) || Boolean(values.exitDate);

  function updateValue<Key extends keyof StaffFormValues>(key: Key, value: StaffFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updateCategory(staffCategory: StaffCategory) {
    const nextDesignation = designations.find((designation) => designation.staffCategory === staffCategory)?.id ?? "";
    setValues((current) => ({
      ...current,
      staffCategory,
      designationId: nextDesignation || current.designationId,
    }));
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

        <StaffFormSection description="Capture the staff member's identity and employee number. Employee number remains unique within the tenant." title="Identity">
          <StaffTextInput error={actionState.fieldErrors?.firstName} label="First name" name="firstName" onChange={(value) => updateValue("firstName", value)} required value={values.firstName} />
          <StaffTextInput error={actionState.fieldErrors?.middleName} label="Middle name" name="middleName" onChange={(value) => updateValue("middleName", value)} value={values.middleName} />
          <StaffTextInput error={actionState.fieldErrors?.lastName} label="Last name" name="lastName" onChange={(value) => updateValue("lastName", value)} required value={values.lastName} />
          <StaffTextInput error={actionState.fieldErrors?.employeeNumber} helperText="Must be unique within the tenant." label="Employee number" name="employeeNumber" onChange={(value) => updateValue("employeeNumber", value)} required value={values.employeeNumber} />
        </StaffFormSection>

        <StaffFormSection description="Assign category, employment type, department, designation, and dates while preserving lifecycle rules." title="Employment">
          <Field error={actionState.fieldErrors?.staffCategory} label="Category" required>
            <Select name="staffCategory" onChange={(event) => updateCategory(event.target.value as StaffCategory)} required value={values.staffCategory}>
              {staffCategories.map((category) => <option key={category} value={category}>{getStaffCategoryLabel(category)}</option>)}
            </Select>
          </Field>
          <Field error={actionState.fieldErrors?.employmentType} label="Employment type" required>
            <Select name="employmentType" onChange={(event) => updateValue("employmentType", event.target.value as EmploymentType)} required value={values.employmentType}>
              {employmentTypes.map((type) => <option key={type} value={type}>{getEmploymentTypeLabel(type)}</option>)}
            </Select>
          </Field>
          <Field error={actionState.fieldErrors?.departmentId} label="Department" required>
            <Select name="departmentId" onChange={(event) => updateValue("departmentId", event.target.value)} required value={values.departmentId}>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </Select>
          </Field>
          <Field error={actionState.fieldErrors?.designationId} label="Designation" required>
            <Select name="designationId" onChange={(event) => updateValue("designationId", event.target.value)} required value={values.designationId}>
              {categoryDesignations.map((designation) => <option key={designation.id} value={designation.id}>{designation.name}</option>)}
            </Select>
          </Field>
          <StaffTextInput error={actionState.fieldErrors?.joiningDate} label="Joining date" name="joiningDate" onChange={(value) => updateValue("joiningDate", value)} required type="date" value={values.joiningDate} />
          <StaffTextInput error={actionState.fieldErrors?.confirmationDate} label="Confirmation date" name="confirmationDate" onChange={(value) => updateValue("confirmationDate", value)} type="date" value={values.confirmationDate} />
          <Field error={actionState.fieldErrors?.status} label="Status" required>
            <Select name="status" onChange={(event) => updateValue("status", event.target.value as StaffStatus)} required value={values.status}>
              {staffStatuses.map((status) => <option key={status} value={status}>{getStaffStatusLabel(status)}</option>)}
            </Select>
          </Field>
          {showExitFields ? (
            <>
              <StaffTextInput error={actionState.fieldErrors?.exitDate} label="Exit date" name="exitDate" onChange={(value) => updateValue("exitDate", value)} required={isTerminalStaffStatus(values.status)} type="date" value={values.exitDate} />
              <Field error={actionState.fieldErrors?.exitReason} label="Exit reason" required={isTerminalStaffStatus(values.status)}>
                <textarea className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" maxLength={300} name="exitReason" onChange={(event) => updateValue("exitReason", event.target.value)} required={isTerminalStaffStatus(values.status)} value={values.exitReason} />
              </Field>
            </>
          ) : null}
        </StaffFormSection>

        <StaffFormSection description="Maintain phone and email details. Official email is protected from duplicates inside the tenant." title="Contact Information">
          <StaffTextInput error={actionState.fieldErrors?.mobileNumber} label="Mobile number" name="mobileNumber" onChange={(value) => updateValue("mobileNumber", value)} value={values.mobileNumber} />
          <StaffTextInput error={actionState.fieldErrors?.alternatePhone} label="Alternate phone" name="alternatePhone" onChange={(value) => updateValue("alternatePhone", value)} value={values.alternatePhone} />
          <StaffTextInput error={actionState.fieldErrors?.personalEmail} label="Personal email" name="personalEmail" onChange={(value) => updateValue("personalEmail", value)} value={values.personalEmail} />
          <StaffTextInput error={actionState.fieldErrors?.officialEmail} label="Official email" name="officialEmail" onChange={(value) => updateValue("officialEmail", value)} value={values.officialEmail} />
          <Field error={actionState.fieldErrors?.preferredContactMethod} label="Preferred contact method">
            <Select name="preferredContactMethod" onChange={(event) => updateValue("preferredContactMethod", event.target.value as StaffPreferredContactMethod)} value={values.preferredContactMethod}>
              {staffPreferredContactMethods.map((method) => <option key={method} value={method}>{getStaffPreferredContactMethodLabel(method)}</option>)}
            </Select>
          </Field>
        </StaffFormSection>

        <StaffFormSection description="Select a tenant-scoped reporting manager. Self-manager and circular reporting relationships are rejected by the service." title="Organization">
          <Field error={actionState.fieldErrors?.reportingManagerId} label="Reporting manager">
            <Select name="reportingManagerId" onChange={(event) => updateValue("reportingManagerId", event.target.value)} value={values.reportingManagerId}>
              <option value="">No reporting manager</option>
              {managerOptions.filter((manager) => manager.id !== staff?.id).map((manager) => (
                <option key={manager.id} value={manager.id}>{manager.displayName} / {manager.designationName}</option>
              ))}
            </Select>
          </Field>
        </StaffFormSection>

        <StaffFormSection description="Capture current and permanent address details. Keep the permanent address linked to current address when they are the same." title="Address">
          <StaffTextInput label="Current address line 1" name="currentAddressLine1" onChange={(value) => updateValue("currentAddressLine1", value)} value={values.currentAddressLine1} />
          <StaffTextInput label="Current address line 2" name="currentAddressLine2" onChange={(value) => updateValue("currentAddressLine2", value)} value={values.currentAddressLine2} />
          <StaffTextInput label="Current city" name="currentCity" onChange={(value) => updateValue("currentCity", value)} value={values.currentCity} />
          <StaffTextInput label="Current district" name="currentDistrict" onChange={(value) => updateValue("currentDistrict", value)} value={values.currentDistrict} />
          <StaffTextInput label="Current state" name="currentState" onChange={(value) => updateValue("currentState", value)} value={values.currentState} />
          <StaffTextInput error={actionState.fieldErrors?.currentPinCode} label="Current PIN code" name="currentPinCode" onChange={(value) => updateValue("currentPinCode", value)} value={values.currentPinCode} />
          <StaffTextInput label="Current country" name="currentCountry" onChange={(value) => updateValue("currentCountry", value)} value={values.currentCountry} />
          <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground">
            <input checked={values.permanentAddressSameAsCurrent} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" name="permanentAddressSameAsCurrent" onChange={(event) => updateValue("permanentAddressSameAsCurrent", event.target.checked)} type="checkbox" />
            Permanent address same as current
          </label>
          {!values.permanentAddressSameAsCurrent ? (
            <>
              <StaffTextInput label="Permanent address line 1" name="permanentAddressLine1" onChange={(value) => updateValue("permanentAddressLine1", value)} value={values.permanentAddressLine1} />
              <StaffTextInput label="Permanent address line 2" name="permanentAddressLine2" onChange={(value) => updateValue("permanentAddressLine2", value)} value={values.permanentAddressLine2} />
              <StaffTextInput label="Permanent city" name="permanentCity" onChange={(value) => updateValue("permanentCity", value)} value={values.permanentCity} />
              <StaffTextInput label="Permanent district" name="permanentDistrict" onChange={(value) => updateValue("permanentDistrict", value)} value={values.permanentDistrict} />
              <StaffTextInput label="Permanent state" name="permanentState" onChange={(value) => updateValue("permanentState", value)} value={values.permanentState} />
              <StaffTextInput error={actionState.fieldErrors?.permanentPinCode} label="Permanent PIN code" name="permanentPinCode" onChange={(value) => updateValue("permanentPinCode", value)} value={values.permanentPinCode} />
              <StaffTextInput label="Permanent country" name="permanentCountry" onChange={(value) => updateValue("permanentCountry", value)} value={values.permanentCountry} />
            </>
          ) : null}
        </StaffFormSection>

        <StaffFormSection description="Store one primary emergency contact for this phase." title="Emergency Contact">
          <StaffTextInput error={actionState.fieldErrors?.emergencyContactName} label="Contact name" name="emergencyContactName" onChange={(value) => updateValue("emergencyContactName", value)} value={values.emergencyContactName} />
          <Field error={actionState.fieldErrors?.emergencyContactRelationship} label="Relationship">
            <Select name="emergencyContactRelationship" onChange={(event) => updateValue("emergencyContactRelationship", event.target.value as EmergencyContactRelationship)} value={values.emergencyContactRelationship}>
              {emergencyContactRelationships.map((relationship) => <option key={relationship} value={relationship}>{getEmergencyContactRelationshipLabel(relationship)}</option>)}
            </Select>
          </Field>
          <StaffTextInput error={actionState.fieldErrors?.emergencyContactMobile} label="Mobile number" name="emergencyContactMobile" onChange={(value) => updateValue("emergencyContactMobile", value)} value={values.emergencyContactMobile} />
          <StaffTextInput error={actionState.fieldErrors?.emergencyContactAlternate} label="Alternate number" name="emergencyContactAlternate" onChange={(value) => updateValue("emergencyContactAlternate", value)} value={values.emergencyContactAlternate} />
          <StaffTextInput error={actionState.fieldErrors?.emergencyContactEmail} label="Email" name="emergencyContactEmail" onChange={(value) => updateValue("emergencyContactEmail", value)} value={values.emergencyContactEmail} />
          <Field error={actionState.fieldErrors?.emergencyContactAddress} label="Address">
            <textarea className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" maxLength={500} name="emergencyContactAddress" onChange={(event) => updateValue("emergencyContactAddress", event.target.value)} value={values.emergencyContactAddress} />
          </Field>
        </StaffFormSection>

        {values.staffCategory === "teaching" ? (
          <StaffFormSection description="Lightweight teaching metadata only. Class, subject, timetable, and workload assignments belong to later phases." title="Teaching Information">
            <StaffTextInput error={actionState.fieldErrors?.teacherCode} label="Teacher code" name="teacherCode" onChange={(value) => updateValue("teacherCode", value)} value={values.teacherCode} />
            <StaffTextInput error={actionState.fieldErrors?.subjectAreas} helperText="Comma-separated subject areas." label="Subject areas" name="subjectAreas" onChange={(value) => updateValue("subjectAreas", value)} value={values.subjectAreas} />
            <StaffTextInput error={actionState.fieldErrors?.academicDepartment} label="Academic department" name="academicDepartment" onChange={(value) => updateValue("academicDepartment", value)} value={values.academicDepartment} />
            <Field error={actionState.fieldErrors?.qualificationSummary} label="Qualification summary">
              <textarea className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" maxLength={500} name="qualificationSummary" onChange={(event) => updateValue("qualificationSummary", event.target.value)} value={values.qualificationSummary} />
            </Field>
            <Field error={actionState.fieldErrors?.experienceSummary} label="Experience summary">
              <textarea className="min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" maxLength={500} name="experienceSummary" onChange={(event) => updateValue("experienceSummary", event.target.value)} value={values.experienceSummary} />
            </Field>
          </StaffFormSection>
        ) : null}

        <StaffFormSection description="Link an existing user account ID only when one already exists. Account provisioning is intentionally outside Phase 2." title="Account Linkage">
          <StaffTextInput error={actionState.fieldErrors?.userId} helperText="Optional. Must not be linked to another staff member in the same tenant." label="User account ID" name="userId" onChange={(value) => updateValue("userId", value)} value={values.userId} />
          <StaffReadOnlyField label="Campus" value={context.campus} />
          <StaffReadOnlyField label="Academic year" value={context.academicYear} />
          <StaffReadOnlyField label="Master data phase" value="Contact, organization, and emergency data enabled" />
        </StaffFormSection>

        <div className="sticky bottom-0 z-10 -mx-3 border-t border-border bg-background/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:bg-surface sm:px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground-muted">
              {dirty ? "You have unsaved staff details." : mode === "create" ? "Complete the required fields to create staff." : "Update supported staff master data fields."}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={staff ? `/staff/${encodeURIComponent(staff.id)}` : "/staff"} onClick={confirmCancel}>
                Cancel
              </Link>
              <Button disabled={pending || departments.length === 0 || designations.length === 0} loading={pending} type="submit" variant="primary">
                {pending ? "Saving..." : mode === "create" ? "Create Staff" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {discardOpen ? (
        <DiscardChangesDialog
          onCancel={() => setDiscardOpen(false)}
          onConfirm={() => router.push(staff ? `/staff/${encodeURIComponent(staff.id)}` : "/staff")}
          title="Discard staff form?"
        />
      ) : null}
    </>
  );
}

function toInitialValues(departments: StaffDepartment[], designations: StaffDesignation[], staff?: StaffProfile): StaffFormValues {
  return {
    employeeNumber: staff?.employeeNumber ?? "",
    userId: staff?.userId ?? "",
    firstName: staff?.firstName ?? "",
    middleName: staff?.middleName ?? "",
    lastName: staff?.lastName ?? "",
    staffCategory: staff?.staffCategory ?? "teaching",
    employmentType: staff?.employmentType ?? "full_time",
    status: staff?.status ?? "active",
    joiningDate: staff?.joiningDate ?? "",
    confirmationDate: staff?.confirmationDate ?? "",
    exitDate: staff?.exitDate ?? "",
    exitReason: staff?.exitReason ?? "",
    departmentId: staff?.departmentId ?? departments[0]?.id ?? "",
    designationId: staff?.designationId ?? designations.find((designation) => designation.staffCategory === "teaching")?.id ?? designations[0]?.id ?? "",
    reportingManagerId: staff?.reportingManagerId ?? "",
    mobileNumber: staff?.contact?.mobileNumber ?? "",
    alternatePhone: staff?.contact?.alternatePhone ?? "",
    personalEmail: staff?.contact?.personalEmail ?? "",
    officialEmail: staff?.contact?.officialEmail ?? "",
    preferredContactMethod: staff?.contact?.preferredContactMethod ?? "mobile",
    currentAddressLine1: staff?.currentAddress?.addressLine1 ?? "",
    currentAddressLine2: staff?.currentAddress?.addressLine2 ?? "",
    currentCity: staff?.currentAddress?.city ?? "",
    currentDistrict: staff?.currentAddress?.district ?? "",
    currentState: staff?.currentAddress?.state ?? "Maharashtra",
    currentPinCode: staff?.currentAddress?.pinCode ?? "",
    currentCountry: staff?.currentAddress?.country ?? "India",
    permanentAddressSameAsCurrent: staff?.permanentAddressSameAsCurrent ?? true,
    permanentAddressLine1: staff?.permanentAddress?.addressLine1 ?? "",
    permanentAddressLine2: staff?.permanentAddress?.addressLine2 ?? "",
    permanentCity: staff?.permanentAddress?.city ?? "",
    permanentDistrict: staff?.permanentAddress?.district ?? "",
    permanentState: staff?.permanentAddress?.state ?? "Maharashtra",
    permanentPinCode: staff?.permanentAddress?.pinCode ?? "",
    permanentCountry: staff?.permanentAddress?.country ?? "India",
    emergencyContactName: staff?.emergencyContacts?.[0]?.name ?? "",
    emergencyContactRelationship: staff?.emergencyContacts?.[0]?.relationship ?? "relative",
    emergencyContactMobile: staff?.emergencyContacts?.[0]?.mobileNumber ?? "",
    emergencyContactAlternate: staff?.emergencyContacts?.[0]?.alternateNumber ?? "",
    emergencyContactEmail: staff?.emergencyContacts?.[0]?.email ?? "",
    emergencyContactAddress: staff?.emergencyContacts?.[0]?.address ?? "",
    teacherCode: staff?.teachingInfo?.teacherCode ?? "",
    subjectAreas: staff?.teachingInfo?.subjectAreas?.join(", ") ?? "",
    academicDepartment: staff?.teachingInfo?.academicDepartment ?? "",
    qualificationSummary: staff?.teachingInfo?.qualificationSummary ?? "",
    experienceSummary: staff?.teachingInfo?.experienceSummary ?? "",
  };
}
