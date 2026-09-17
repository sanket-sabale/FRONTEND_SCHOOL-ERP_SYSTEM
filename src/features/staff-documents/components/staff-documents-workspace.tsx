import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Card, PageHeader } from "@/components/ui";
import { StaffDocumentsPanel } from "@/features/staff-documents/components/staff-documents-panel";
import type { StaffDocumentListResponse } from "@/features/staff-documents/types/staff-document";
import type { StaffProfile } from "@/features/staff/types/staff";

export function StaffDocumentsWorkspace({ canManageDocuments, context, documentsResponse, staff }: { canManageDocuments: boolean; context: { school: string; campus: string; academicYear: string }; documentsResponse: StaffDocumentListResponse; staff: StaffProfile }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Staff", staff.displayName, "Documents"]} />}
        description="Manage staff HR documents, verification status, expiry, and secure metadata."
        eyebrow="Staff Documents"
        title="Documents"
        action={<div className="responsive-action-row"><Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}`}>Back to Profile</Link>{canManageDocuments ? <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/documents/new`}>Add Document</Link> : null}</div>}
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="grid gap-1 text-sm">
            <span className="font-semibold text-foreground">{staff.displayName}</span>
            <span className="font-mono text-xs text-foreground-muted">{staff.employeeNumber}</span>
            <span className="text-foreground-muted">{context.school} / {context.campus} / {context.academicYear}</span>
          </div>
        </Card>
      </PageHeader>
      <StaffDocumentsPanel canManageDocuments={canManageDocuments} documentsResponse={documentsResponse} staff={staff} />
    </div>
  );
}

const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
