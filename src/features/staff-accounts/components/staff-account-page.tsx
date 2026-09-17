import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Card, PageHeader } from "@/components/ui";
import { StaffAccountPanel } from "@/features/staff-accounts/components/staff-account-panel";
import type { StaffAccountView } from "@/features/staff-accounts/types/staff-account";
import type { StaffProfile } from "@/features/staff/types/staff";

export function StaffAccountPage({ accountView, canManage, staff }: { accountView: StaffAccountView; canManage: boolean; staff: StaffProfile }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Staff", staff.displayName, "Account"]} />}
        description="Manage the relationship between this staff profile and its application login account."
        eyebrow="Account & Access"
        title="Account & Access"
        action={<Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}`}>Back to Profile</Link>}
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="grid gap-1 text-sm">
            <span className="font-semibold text-foreground">{staff.displayName}</span>
            <span className="font-mono text-xs text-foreground-muted">{staff.employeeNumber}</span>
            <span className="text-foreground-muted">{staff.departmentName} / {staff.designationName}</span>
          </div>
        </Card>
      </PageHeader>
      <StaffAccountPanel accountView={accountView} canManage={canManage} staff={staff} />
    </div>
  );
}

const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
