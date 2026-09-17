import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { SidebarIcon } from "@/components/layout/sidebar-icons";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { currentSessionRole, getCurrentUser, getInitials } from "@/lib/current-user";
import { tenantContext } from "@/lib/mock-data";
import type { CurrentUser, NavigationIcon } from "@/types/erp";

export default function ProfilePage() {
  const user = getCurrentUser(currentSessionRole);
  const roleLabel = user.roles.join(" / ");

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <ProfilePageHeader />
        <ProfileIdentityCard roleLabel={roleLabel} user={user} />
        <section className="grid gap-4 lg:grid-cols-2">
          <ProfileInfoCard
            icon="users"
            rows={[
              { label: "Full Name", value: user.name },
              { label: "Email Address", value: user.email },
            ]}
            title="Personal Information"
          />
          <ProfileInfoCard
            icon="payroll"
            rows={[
              { label: "Employee ID", value: user.employeeId },
              { label: "Department", value: user.department },
              { label: "Designation", value: user.designation },
              { label: "Role", value: roleLabel },
            ]}
            title="Professional Information"
          />
        </section>
        <ProfileInfoCard
          icon="academics"
          rows={[
            { label: "Organization", value: tenantContext.group },
            { label: "School", value: tenantContext.school },
            { label: "Campus", value: tenantContext.campus },
            { label: "Academic Year", value: tenantContext.academicYear },
          ]}
          title="Organization"
        />
        <section className="grid gap-4 lg:grid-cols-2">
          <AccessCard roleLabel={roleLabel} />
          <AccountReadinessCard />
        </section>
      </div>
    </AppShell>
  );
}

function ProfilePageHeader() {
  return (
    <section className="responsive-panel border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
      <Breadcrumbs items={["Dashboard", "Profile"]} />
      <div className="mt-4">
        <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">Account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
          Profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          View your account identity, role, and current school context.
        </p>
      </div>
    </section>
  );
}

function ProfileIdentityCard({ roleLabel, user }: { roleLabel: string; user: CurrentUser }) {
  return (
    <Card className="responsive-card-padding">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar name={user.name} />
          <div className="min-w-0">
            <h2 className="responsive-text text-xl font-semibold text-slate-950 dark:text-slate-50">
              {user.name}
            </h2>
            <p className="responsive-text mt-1 text-sm text-slate-500">{roleLabel}</p>
            <p className="responsive-text mt-2 text-sm text-slate-600 dark:text-slate-300">
              {tenantContext.school} / {tenantContext.campus}
            </p>
            {user.email ? <p className="responsive-text mt-1 text-xs text-slate-500">{user.email}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">Current User</Badge>
          <Badge tone="neutral">{tenantContext.academicYear}</Badge>
        </div>
      </div>
    </Card>
  );
}

function ProfileInfoCard({
  icon,
  rows,
  title,
}: {
  icon: NavigationIcon;
  rows: Array<{ label: string; value?: string }>;
  title: string;
}) {
  return (
    <Card>
      <SectionHeader
        eyebrow="Profile"
        title={title}
      />
      <div className="grid gap-3 p-4 sm:p-5">
        {rows.map((row) => (
          <InfoRow icon={icon} key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </Card>
  );
}

function AccessCard({ roleLabel }: { roleLabel: string }) {
  return (
    <Card>
      <SectionHeader eyebrow="Authorization" title="Role & Access" />
      <div className="grid gap-3 p-4 sm:p-5">
        <InfoRow icon="settings" label="Primary Role" value={roleLabel} />
        <InfoRow icon="academics" label="Access Context" value="Current school workspace" />
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          This frontend only improves account visibility. Backend authorization remains authoritative.
        </p>
      </div>
    </Card>
  );
}

function AccountReadinessCard() {
  return (
    <Card>
      <SectionHeader eyebrow="Security" title="Account Readiness" />
      <div className="grid gap-3 p-4 sm:p-5">
        <InfoRow icon="audit" label="Security Management" value="Not connected yet" />
        <InfoRow icon="settings" label="Profile Editing" value="Not connected yet" />
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Editing, password changes, and session controls are intentionally not shown as active actions until backend support exists.
        </p>
      </div>
    </Card>
  );
}

function InfoRow({ icon, label, value }: { icon: NavigationIcon; label: string; value?: string }) {
  return (
    <div className="flex min-w-0 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <SidebarIcon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="responsive-text mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-label={name}
      className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-900 text-lg font-semibold text-white shadow-sm dark:bg-slate-100 dark:text-slate-950 sm:h-20 sm:w-20"
      role="img"
    >
      {getInitials(name)}
    </span>
  );
}
