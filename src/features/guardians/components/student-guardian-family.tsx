"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, SectionHeader, Select } from "@/components/ui";
import {
  endGuardianRelationshipAction,
  linkGuardianToStudentAction,
  updateGuardianRelationshipAction,
  type GuardianActionState,
} from "@/features/guardians/actions/guardian-actions";
import {
  formatGuardianRelationshipType,
  getGuardianVerificationLabel,
} from "@/features/guardians/components/guardian-formatters";
import {
  guardianRelationshipTypes,
  type GuardianSummary,
  type StudentGuardianRecord,
} from "@/features/guardians/types/guardian";

const initialActionState: GuardianActionState = { status: "idle" };

export function StudentGuardianFamily({
  availableGuardians,
  canManage,
  guardians,
  studentId,
}: {
  availableGuardians: GuardianSummary[];
  canManage: boolean;
  guardians: StudentGuardianRecord[];
  studentId: string;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [editing, setEditing] = useState<StudentGuardianRecord | null>(null);

  return (
    <>
      <Card id="guardians">
        <SectionHeader
          eyebrow="Family"
          title="Guardian & Family"
          action={canManage ? (
            <Button onClick={() => setLinkOpen(true)} variant="primary">Link Guardian</Button>
          ) : null}
        />
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
          {guardians.length === 0 ? (
            <EmptyState description="No guardians are linked to this student yet." title="No guardians linked" />
          ) : guardians.map((relationship) => (
            <article className="rounded-lg border border-border bg-surface-muted p-4" key={relationship.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link className="font-semibold text-foreground hover:underline" href={`/guardians/${encodeURIComponent(relationship.guardian.id)}`}>{relationship.guardian.displayName}</Link>
                  <p className="mt-1 text-sm text-foreground-muted">{formatGuardianRelationshipType(relationship.relationshipType)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {relationship.isPrimary ? <Badge tone="info">Primary</Badge> : null}
                  {relationship.isEmergencyContact ? <Badge tone="warning">Emergency</Badge> : null}
                  <Badge tone={relationship.guardian.verificationStatus === "verified" ? "success" : "neutral"}>{getGuardianVerificationLabel(relationship.guardian.verificationStatus)}</Badge>
                </div>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <Term label="Phone" value={relationship.guardian.primaryPhone} />
                <Term label="Email" value={relationship.guardian.email} />
                <Term label="Pickup" value={relationship.canPickup ? "Authorized" : "Not authorized"} />
                <Term label="Communication" value={communicationSummary(relationship)} />
              </dl>
              {canManage ? <Button className="mt-4" onClick={() => setEditing(relationship)} size="sm" variant="secondary">Edit Relationship</Button> : null}
            </article>
          ))}
        </div>
      </Card>
      {linkOpen ? <GuardianRelationshipDialog availableGuardians={availableGuardians} onClose={() => setLinkOpen(false)} studentId={studentId} /> : null}
      {editing ? <GuardianRelationshipDialog existing={editing} onClose={() => setEditing(null)} studentId={studentId} /> : null}
    </>
  );
}

function GuardianRelationshipDialog({
  availableGuardians = [],
  existing,
  onClose,
  studentId,
}: {
  availableGuardians?: GuardianSummary[];
  existing?: StudentGuardianRecord;
  onClose: () => void;
  studentId: string;
}) {
  const action = existing ? updateGuardianRelationshipAction : linkGuardianToStudentAction;
  const [actionState, formAction, pending] = useActionState(action, initialActionState);
  const guardians = useMemo(() => availableGuardians.filter((guardian) => guardian.status !== "archived"), [availableGuardians]);

  return (
    <div aria-modal="true" className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-slate-950/45 p-3" role="dialog">
      <form action={formAction} className="w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-2xl sm:p-5">
        <input name="studentId" type="hidden" value={studentId} />
        {existing ? <input name="relationshipId" type="hidden" value={existing.id} /> : null}
        <h2 className="text-lg font-semibold text-foreground">{existing ? "Edit Relationship" : "Link Existing Guardian"}</h2>
        <p className="mt-2 text-sm text-foreground-muted">Use an existing tenant-scoped guardian record. Create new guardians from the Guardian Directory when needed.</p>
        {actionState.message ? <p className={actionState.status === "error" ? "mt-3 text-sm text-danger" : "mt-3 text-sm text-emerald-700 dark:text-emerald-300"}>{actionState.message}</p> : null}
        <div className="mt-4 grid gap-4">
          {existing ? (
            <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground">{existing.guardian.displayName}</div>
          ) : (
            <Field label="Guardian" required>
              <Select name="guardianId" required>
                <option value="">Select guardian</option>
                {guardians.map((guardian) => <option key={guardian.id} value={guardian.id}>{guardian.displayName} / {guardian.primaryPhone}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Relationship" required>
            <Select name="relationshipType" required defaultValue={existing?.relationshipType ?? "mother"}>
              {guardianRelationshipTypes.map((type) => <option key={type} value={type}>{formatGuardianRelationshipType(type)}</option>)}
            </Select>
          </Field>
          <div className="grid gap-2 text-sm">
            <Checkbox defaultChecked={existing?.isPrimary} label="Primary guardian" name="isPrimary" />
            <Checkbox defaultChecked={existing?.isEmergencyContact} label="Emergency contact" name="isEmergencyContact" />
            <Checkbox defaultChecked={existing?.canPickup} label="Pickup authorized" name="canPickup" />
            <Checkbox defaultChecked={existing?.canReceiveAcademicCommunication ?? true} label="Academic communication" name="canReceiveAcademicCommunication" />
            <Checkbox defaultChecked={existing?.canReceiveAttendanceCommunication ?? true} label="Attendance communication" name="canReceiveAttendanceCommunication" />
            <Checkbox defaultChecked={existing?.canReceiveFeeCommunication ?? true} label="Fee communication" name="canReceiveFeeCommunication" />
            <Checkbox defaultChecked={existing?.canReceiveGeneralCommunication ?? true} label="General communication" name="canReceiveGeneralCommunication" />
          </div>
          <Field label="Notes">
            <textarea className="min-h-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" name="notes" defaultValue={existing?.notes ?? ""} />
          </Field>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          {existing ? <EndRelationshipButton /> : null}
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">{actionState.status === "success" ? "Close" : "Cancel"}</Button>
          <Button disabled={pending || actionState.status === "success"} loading={pending} type="submit" variant="primary">{pending ? "Saving..." : existing ? "Save Relationship" : "Link Guardian"}</Button>
        </div>
      </form>
    </div>
  );
}

function EndRelationshipButton() {
  const [actionState, formAction, pending] = useActionState(endGuardianRelationshipAction, initialActionState);
  return (
    <Button disabled={pending || actionState.status === "success"} formAction={formAction} loading={pending} type="submit" variant="ghost">
      {pending ? "Ending..." : "End Relationship"}
    </Button>
  );
}

function Checkbox({ defaultChecked, label, name }: { defaultChecked?: boolean; label: string; name: string }) {
  return (
    <label className="flex min-h-9 items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 text-foreground">
      <input className="h-4 w-4 rounded border-border text-primary focus:ring-primary" defaultChecked={defaultChecked} name={name} type="checkbox" />
      {label}
    </label>
  );
}

function Term({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className="responsive-text mt-1 text-foreground">{value || "Not provided"}</dd>
    </div>
  );
}

function communicationSummary(relationship: StudentGuardianRecord) {
  const items = [
    relationship.canReceiveAcademicCommunication ? "Academic" : null,
    relationship.canReceiveAttendanceCommunication ? "Attendance" : null,
    relationship.canReceiveFeeCommunication ? "Fees" : null,
    relationship.canReceiveGeneralCommunication ? "General" : null,
  ].filter(Boolean);
  return items.length ? items.join(" / ") : "No communication enabled";
}
