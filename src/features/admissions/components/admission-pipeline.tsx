import { EmptyState, Button, Card, SectionHeader } from "@/components/ui";
import { admissionPipeline } from "@/lib/mock-data";

export function AdmissionPipeline() {
  return (
    <Card id="admissions">
      <SectionHeader
        title="Admission Pipeline"
        eyebrow="2026-27 intake"
        action={<Button className="mobile-full-action" variant="secondary">Verify Documents</Button>}
      />
      <div className="space-y-4 p-4 sm:p-5">
        {admissionPipeline.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="text-slate-500">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-2 rounded-full bg-sky-700" style={{ width: `${Math.min(item.value, 140) / 1.4}%` }} />
            </div>
          </div>
        ))}
        <EmptyState title="No stalled applications" description="All submitted applications have an assigned owner or next review date." />
      </div>
    </Card>
  );
}
