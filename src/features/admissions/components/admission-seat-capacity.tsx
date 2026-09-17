import { Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import {
  createAdmissionSeatCapacityAction,
  updateAdmissionSeatCapacityAction,
} from "@/features/admissions/actions/admission-actions";
import type {
  AdmissionCycle,
  AdmissionSeatAvailabilityResponse,
} from "@/features/admissions/types/admission";
import type { StudentAcademicPlacementOption } from "@/features/students/types/student";

type Props = {
  context: { school: string; campus: string; academicYear: string };
  cycles: AdmissionCycle[];
  data: AdmissionSeatAvailabilityResponse;
  placementOptions: StudentAcademicPlacementOption[];
};

export function AdmissionSeatCapacity({ context, cycles, data, placementOptions }: Props) {
  const classOptions = uniqueClassOptions(placementOptions);
  const defaultCycleId = cycles[0]?.id ?? "";

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Admissions", "Seats"]} />}
        description="Track admission capacity, reserved seats, approvals, waitlist demand, and availability by class or section."
        eyebrow="Admissions"
        title="Seat Capacity"
      />

      <Card>
        <SectionHeader eyebrow="Capacity" title="Create Seat Capacity" />
        <form action={createAdmissionSeatCapacityAction} className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_120px_auto]">
          <Field label="Cycle">
            <Select name="admissionCycleId" defaultValue={defaultCycleId}>
              {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}
            </Select>
          </Field>
          <Field label="Class">
            <Select name="classId" defaultValue={classOptions[0]?.classId ?? ""}>
              {classOptions.map((option) => <option key={option.classId} value={option.classId}>{option.className}</option>)}
            </Select>
          </Field>
          <Field label="Section">
            <Select name="sectionId" defaultValue="">
              <option value="">Class level</option>
              {placementOptions.map((option) => <option key={option.sectionId} value={option.sectionId}>{option.className} / {option.sectionName}</option>)}
            </Select>
          </Field>
          <Field label="Capacity">
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" min={0} name="capacity" type="number" defaultValue={30} />
          </Field>
          <Button className="self-end" type="submit" variant="primary">Create</Button>
        </form>
      </Card>

      <Card>
        <SectionHeader eyebrow="Seats" title={data.total === 0 ? "No seat capacity configured" : `${data.total} capacity rows`} />
        {data.items.length === 0 ? <div className="p-4 sm:p-5"><EmptyState title="No capacity found" description="Create capacity for an admission cycle before approving applications." /></div> : null}
        <div className="divide-y divide-border">
          {data.items.map((seat) => (
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px] sm:p-5" key={seat.id}>
              <div>
                <p className="font-semibold text-foreground">{seat.className ?? seat.classId}{seat.sectionName ? ` / ${seat.sectionName}` : ""}</p>
                <p className="mt-1 text-sm text-foreground-muted">Capacity {seat.capacity} / Available {seat.available} / Utilization {seat.utilizationPercentage}%</p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-5">
                  <Metric label="Pending" value={seat.pending} />
                  <Metric label="Reserved" value={seat.reserved} />
                  <Metric label="Approved" value={seat.approved} />
                  <Metric label="Waitlisted" value={seat.waitlisted} />
                  <Metric label="Enrolled" value={seat.enrolled} />
                </div>
              </div>
              <form action={updateAdmissionSeatCapacityAction} className="grid gap-2 content-start">
                <input name="seatId" type="hidden" value={seat.id} />
                <input name="admissionCycleId" type="hidden" value={seat.admissionCycleId} />
                <input name="classId" type="hidden" value={seat.classId} />
                <input name="sectionId" type="hidden" value={seat.sectionId ?? ""} />
                <Field label="Capacity">
                  <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" min={0} name="capacity" type="number" defaultValue={seat.capacity} />
                </Field>
                <Button type="submit" variant="secondary">Update Capacity</Button>
              </form>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border bg-surface-muted p-3"><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p><p className="mt-2 text-lg font-semibold text-foreground">{value}</p></div>;
}

function uniqueClassOptions(placementOptions: StudentAcademicPlacementOption[]) {
  const options = new Map<string, string>();
  placementOptions.forEach((placement) => options.set(placement.classId, placement.className));
  return Array.from(options.entries()).map(([classId, className]) => ({ classId, className }));
}
