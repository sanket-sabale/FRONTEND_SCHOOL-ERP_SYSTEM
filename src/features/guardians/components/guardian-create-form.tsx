"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { createGuardianAction, type GuardianActionState } from "@/features/guardians/actions/guardian-actions";
import { DiscardChangesDialog } from "@/features/students/components/discard-changes-dialog";
import { StudentFormSection, StudentTextInput } from "@/features/students/components/student-form-controls";

type GuardianCreateValues = {
  firstName: string;
  middleName: string;
  lastName: string;
  primaryPhone: string;
  alternatePhone: string;
  email: string;
  occupation: string;
  employer: string;
  preferredLanguage: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
};

const initialActionState: GuardianActionState = { status: "idle" };

export function GuardianCreateForm() {
  const router = useRouter();
  const initialValues = useMemo<GuardianCreateValues>(() => ({
    firstName: "",
    middleName: "",
    lastName: "",
    primaryPhone: "",
    alternatePhone: "",
    email: "",
    occupation: "",
    employer: "",
    preferredLanguage: "",
    address: "",
    city: "",
    state: "Maharashtra",
    country: "India",
    postalCode: "",
  }), []);
  const [values, setValues] = useState(initialValues);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [actionState, formAction, pending] = useActionState(createGuardianAction, initialActionState);
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  function updateValue<Key extends keyof GuardianCreateValues>(key: Key, value: GuardianCreateValues[Key]) {
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
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">{actionState.message}</div>
      ) : null}
      <StudentFormSection description="Create a first-class guardian record that can be linked to one or more students." eyebrow="Guardian / Parent" title="Identity">
        <StudentTextInput label="First name" name="firstName" onChange={(value) => updateValue("firstName", value)} required value={values.firstName} />
        <StudentTextInput label="Middle name" name="middleName" onChange={(value) => updateValue("middleName", value)} value={values.middleName} />
        <StudentTextInput label="Last name" name="lastName" onChange={(value) => updateValue("lastName", value)} required value={values.lastName} />
      </StudentFormSection>
      <StudentFormSection description="Contact details are used only through future permission-aware communication policies." eyebrow="Guardian / Parent" title="Contact">
        <StudentTextInput label="Primary phone" name="primaryPhone" onChange={(value) => updateValue("primaryPhone", value)} required value={values.primaryPhone} />
        <StudentTextInput label="Alternate phone" name="alternatePhone" onChange={(value) => updateValue("alternatePhone", value)} value={values.alternatePhone} />
        <StudentTextInput label="Email" name="email" onChange={(value) => updateValue("email", value)} value={values.email} />
      </StudentFormSection>
      <StudentFormSection description="Professional details are optional and can support future communication context." eyebrow="Guardian / Parent" title="Personal / Professional">
        <StudentTextInput label="Occupation" name="occupation" onChange={(value) => updateValue("occupation", value)} value={values.occupation} />
        <StudentTextInput label="Employer" name="employer" onChange={(value) => updateValue("employer", value)} value={values.employer} />
        <StudentTextInput label="Preferred language" name="preferredLanguage" onChange={(value) => updateValue("preferredLanguage", value)} value={values.preferredLanguage} />
      </StudentFormSection>
      <StudentFormSection description="Address fields remain optional and tenant-scoped." eyebrow="Guardian / Parent" title="Address">
        <StudentTextInput label="Address" name="address" onChange={(value) => updateValue("address", value)} value={values.address} />
        <StudentTextInput label="City" name="city" onChange={(value) => updateValue("city", value)} value={values.city} />
        <StudentTextInput label="State" name="state" onChange={(value) => updateValue("state", value)} value={values.state} />
        <StudentTextInput label="Country" name="country" onChange={(value) => updateValue("country", value)} value={values.country} />
        <StudentTextInput label="Postal code" name="postalCode" onChange={(value) => updateValue("postalCode", value)} value={values.postalCode} />
      </StudentFormSection>
      <div className="sticky bottom-0 z-10 -mx-3 border-t border-border bg-background/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:bg-surface sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground-muted">{dirty ? "You have unsaved guardian details." : "Complete required fields to create a guardian."}</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/guardians" onClick={confirmCancel}>Cancel</Link>
            <Button disabled={pending} loading={pending} type="submit" variant="primary">{pending ? "Creating..." : "Create Guardian"}</Button>
          </div>
        </div>
      </div>
    </form>
    {discardOpen ? (
      <DiscardChangesDialog
        description="You have unsaved guardian details. If you leave this page, those changes will be lost."
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => router.push("/guardians")}
        title="Discard guardian form?"
      />
    ) : null}
    </>
  );
}
