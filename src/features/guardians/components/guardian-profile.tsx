import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import {
  formatGuardianRelationshipType,
  getGuardianInitials,
  getGuardianStatusLabel,
  getGuardianVerificationLabel,
} from "@/features/guardians/components/guardian-formatters";
import { GuardianLifecycleControls } from "@/features/guardians/components/guardian-lifecycle-controls";
import type { GuardianProfile as GuardianProfileModel } from "@/features/guardians/types/guardian";
import type { Role } from "@/types/erp";
import { hasPermission } from "@/components/shared/permission-gate";

export function GuardianProfile({ guardian, role }: { guardian: GuardianProfileModel; role: Role }) {
  const canArchive = hasPermission(role, "guardian.archive");

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Guardian / Parents", guardian.displayName]} />}
        description="Guardian 360 profile for contact, verification, linked students, and relationship communication foundations."
        eyebrow="Guardian 360"
        title={guardian.displayName}
        action={
          <div className="responsive-action-row">
            <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/guardians">Back to Guardians</Link>
            {canArchive ? <GuardianLifecycleControls guardianId={guardian.id} status={guardian.status} /> : null}
          </div>
        }
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg border border-border bg-surface text-sm font-semibold text-foreground">{getGuardianInitials(guardian.displayName)}</span>
            <div>
              <Badge tone={guardian.status === "active" ? "success" : "neutral"}>{getGuardianStatusLabel(guardian.status)}</Badge>
              <p className="mt-2 text-sm text-foreground-muted">{getGuardianVerificationLabel(guardian.verificationStatus)}</p>
            </div>
          </div>
        </Card>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-2">
        <InfoCard eyebrow="Identity" title="Contact Information">
          <InfoRow label="Primary Phone" value={guardian.primaryPhone} />
          <InfoRow label="Email" value={guardian.email} />
          <InfoRow label="Alternate Phone" value={guardian.alternatePhone} />
          <InfoRow label="Preferred Language" value={guardian.preferredLanguage} />
        </InfoCard>
        <InfoCard eyebrow="Address" title="Address">
          <InfoRow label="Address" value={guardian.address} />
          <InfoRow label="City" value={guardian.city} />
          <InfoRow label="State" value={guardian.state} />
          <InfoRow label="Country" value={guardian.country} />
          <InfoRow label="Postal Code" value={guardian.postalCode} />
        </InfoCard>
      </section>

      <Card>
        <SectionHeader eyebrow="Relationships" title="Linked Students" />
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
          {guardian.students.length === 0 ? (
            <EmptyState description="This guardian is not linked to any active student relationships in the current context." title="No linked students" />
          ) : guardian.students.map((relationship) => (
            <article className="rounded-lg border border-border bg-surface-muted p-4" key={relationship.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link className="font-semibold text-foreground hover:underline" href={`/students/${encodeURIComponent(relationship.student.id)}`}>{relationship.student.displayName}</Link>
                  <p className="mt-1 font-mono text-xs text-foreground-muted">{relationship.student.admissionNumber}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {relationship.isPrimary ? <Badge tone="info">Primary</Badge> : null}
                  {relationship.isEmergencyContact ? <Badge tone="warning">Emergency</Badge> : null}
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground-muted">{relationship.student.className} / Section {relationship.student.sectionName}</p>
              <p className="mt-1 text-sm text-foreground-muted">{formatGuardianRelationshipType(relationship.relationshipType)}</p>
              <CommunicationSummary relationship={relationship} />
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CommunicationSummary({ relationship }: { relationship: GuardianProfileModel["students"][number] }) {
  const enabled = [
    relationship.canReceiveAcademicCommunication ? "Academic" : null,
    relationship.canReceiveAttendanceCommunication ? "Attendance" : null,
    relationship.canReceiveFeeCommunication ? "Fees" : null,
    relationship.canReceiveGeneralCommunication ? "General" : null,
    relationship.canPickup ? "Pickup" : null,
  ].filter(Boolean);
  return <p className="mt-3 text-sm text-foreground-muted">{enabled.length ? enabled.join(" / ") : "No communication permissions enabled"}</p>;
}

function InfoCard({ children, eyebrow, title }: { children: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <Card>
      <SectionHeader eyebrow={eyebrow} title={title} />
      <div className="grid gap-3 p-4 sm:p-5">{children}</div>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text text-right font-medium text-foreground">{value || "Not provided"}</span>
    </div>
  );
}
