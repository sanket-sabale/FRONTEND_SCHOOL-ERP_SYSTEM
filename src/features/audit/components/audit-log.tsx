import { Card, SectionHeader } from "@/components/ui";

const auditRows = [
  { action: "Updated fee discount", user: "Priya Menon", resource: "Invoice INV-2026-1178", ip: "103.21.88.14", reason: "Sibling scholarship correction" },
  { action: "Published notice", user: "Rakesh Sharma", resource: "Grade 10 Parents", ip: "103.21.88.28", reason: "Pre-board schedule announcement" },
  { action: "Changed attendance", user: "Neha Iyer", resource: "Grade 8 A", ip: "103.21.88.34", reason: "Late bus arrival updated" },
];

export function AuditLog() {
  return (
    <Card id="audit" className="responsive-card-padding">
      <SectionHeader title="Audit Log" eyebrow="Administration" />
      <div className="mt-4 space-y-3 text-sm">
        {auditRows.map((row) => (
          <details className="rounded-lg border border-slate-200 p-3 dark:border-slate-800" key={`${row.action}-${row.resource}`}>
            <summary className="responsive-text cursor-pointer font-medium">{row.action}</summary>
            <p className="responsive-text mt-1 text-xs text-slate-500">{row.user} / {row.resource} / 11 Aug 2026, 04:20 PM</p>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div className="min-w-0"><dt className="text-slate-500">IP address</dt><dd className="responsive-text">{row.ip}</dd></div>
              <div className="min-w-0"><dt className="text-slate-500">Reason</dt><dd className="responsive-text">{row.reason}</dd></div>
              <div className="min-w-0"><dt className="text-slate-500">Previous value</dt><dd className="responsive-text">Stored in audit event</dd></div>
              <div className="min-w-0"><dt className="text-slate-500">New value</dt><dd className="responsive-text">Available to authorized admins</dd></div>
            </dl>
          </details>
        ))}
      </div>
    </Card>
  );
}
