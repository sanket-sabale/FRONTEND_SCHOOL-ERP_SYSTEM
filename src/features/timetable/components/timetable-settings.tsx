"use client";

import { useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { formatPeriodType, formatTimetableDay } from "@/features/timetable/components/timetable-formatters";
import { validateSchedule } from "@/features/timetable/services/timetable-rules";
import { timetableDayOptions, timetablePeriodTypes, type TimetableDay, type TimetablePeriod, type TimetablePeriodType, type TimetableSchedule } from "@/features/timetable/types/timetable";

export function TimetableSettings({
  context,
  schedules,
}: {
  context: { school: string; campus: string; academicYear: string };
  schedules: TimetableSchedule[];
}) {
  const [selectedScheduleId, setSelectedScheduleId] = useState(schedules[0]?.id ?? "");
  const [draftSchedules, setDraftSchedules] = useState(schedules);
  const draft = draftSchedules.find((schedule) => schedule.id === selectedScheduleId) ?? draftSchedules[0];
  const [savedAt, setSavedAt] = useState(draft?.updatedAt);
  const validation = useMemo(() => draft ? validateSchedule(draft) : { valid: false as const, message: "No schedule selected." }, [draft]);

  function updateDraft(next: TimetableSchedule) {
    setDraftSchedules((current) => current.map((schedule) => schedule.id === next.id ? next : schedule));
  }

  function toggleDay(day: TimetableDay) {
    if (!draft) return;
    updateDraft({
      ...draft,
      workingDays: draft.workingDays.includes(day)
        ? draft.workingDays.filter((item) => item !== day)
        : [...draft.workingDays, day],
    });
  }

  function moveDay(day: TimetableDay, direction: -1 | 1) {
    if (!draft) return;
    const index = draft.workingDays.indexOf(day);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= draft.workingDays.length) return;
    const workingDays = [...draft.workingDays];
    const [removed] = workingDays.splice(index, 1);
    if (!removed) return;
    workingDays.splice(targetIndex, 0, removed);
    updateDraft({ ...draft, workingDays });
  }

  function updatePeriod(periodId: string, key: "name" | "startTime" | "endTime" | "type" | "isActive", value: string | boolean) {
    if (!draft) return;
    updateDraft({
      ...draft,
      periods: draft.periods.map((period) =>
        period.id === periodId
          ? { ...period, [key]: value, isTeaching: key === "type" ? value === "teaching" : period.isTeaching }
          : period,
      ),
    });
  }

  function movePeriod(periodId: string, direction: -1 | 1) {
    if (!draft) return;
    const periods = orderedPeriods(draft.periods);
    const index = periods.findIndex((period) => period.id === periodId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= periods.length) return;
    const [removed] = periods.splice(index, 1);
    if (!removed) return;
    periods.splice(targetIndex, 0, removed);
    updateDraft({ ...draft, periods: periods.map((period, nextIndex) => ({ ...period, order: nextIndex + 1 })) });
  }

  function addPeriod() {
    if (!draft) return;
    const periods = orderedPeriods(draft.periods);
    const lastPeriod = periods.at(-1);
    const startTime = lastPeriod?.endTime ?? "00:00";
    const endTime = addMinutes(startTime, 45);
    const order = periods.length + 1;
    updateDraft({
      ...draft,
      periods: [
        ...periods,
        {
          tenantId: draft.tenantId,
          schoolId: draft.schoolId,
          campusId: draft.campusId,
          academicYearId: draft.academicYearId,
          scheduleId: draft.id,
          id: `period-local-${Date.now()}`,
          name: `New Block ${order}`,
          startTime,
          endTime,
          type: "teaching",
          order,
          isTeaching: true,
          isActive: true,
        },
      ],
    });
  }

  function deletePeriod(periodId: string) {
    if (!draft) return;
    updateDraft({
      ...draft,
      periods: orderedPeriods(draft.periods)
        .filter((period) => period.id !== periodId)
        .map((period, index) => ({ ...period, order: index + 1 })),
    });
  }

  function saveSchedule() {
    if (!draft || !validation.valid) return;
    const now = new Date().toISOString();
    updateDraft({ ...draft, updatedAt: now });
    setSavedAt(now);
  }

  if (!draft) {
    return <div className="erp-container"><EmptyState title="No schedules found" description="Create a timetable schedule before configuring periods." /></div>;
  }

  const activePeriods = draft.periods.filter((period) => period.isActive);
  const teachingPeriods = activePeriods.filter((period) => period.isTeaching).length;

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Timetable Settings"]} />}
        description="Manage timetable schedules as working days plus ordered periods. Different schools can use different schedules without code changes."
        eyebrow="Timetable Management"
        title="Schedule Configuration"
        action={<Button disabled={!validation.valid} onClick={saveSchedule}>Save Schedule</Button>}
      />

      <Card>
        <SectionHeader eyebrow="Schedule" title="Selected Schedule" action={<Badge tone={validation.valid ? "success" : "danger"}>{validation.valid ? "Valid" : "Needs review"}</Badge>} />
        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(240px,360px)_1fr]">
          <Field label="Timetable Schedule">
            <Select value={draft.id} onChange={(event) => setSelectedScheduleId(event.target.value)}>
              {draftSchedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.name}</option>)}
            </Select>
          </Field>
          <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">
            <p className="font-medium text-foreground">{draft.description ?? "No description"}</p>
            <p className="mt-1">Saved {savedAt ? new Date(savedAt).toLocaleString("en-IN") : "not yet saved"}</p>
            {!validation.valid ? <p className="mt-2 font-medium text-danger">{validation.message}</p> : null}
          </div>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Working Days" value={draft.workingDays.length} />
        <Metric label="Active Periods" value={activePeriods.length} />
        <Metric label="Teaching Periods" value={teachingPeriods} />
      </section>

      <Card>
        <SectionHeader eyebrow="Calendar" title="Working Days & Order" />
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(260px,0.8fr)_1fr]">
          <div className="grid gap-2">
            {timetableDayOptions.map((day) => (
              <button
                aria-pressed={draft.workingDays.includes(day.id)}
                className={`rounded-lg border px-3 py-3 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${draft.workingDays.includes(day.id) ? "border-primary bg-blue-50 text-primary dark:bg-blue-950" : "border-border bg-surface text-foreground hover:bg-surface-muted"}`}
                key={day.id}
                onClick={() => toggleDay(day.id)}
                type="button"
              >
                {day.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            {draft.workingDays.map((day, index) => (
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-border bg-surface-muted p-3" key={day}>
                <p className="text-sm font-medium text-foreground">{index + 1}. {formatTimetableDay(day)}</p>
                <Button disabled={index === 0} onClick={() => moveDay(day, -1)} size="sm" variant="secondary">Up</Button>
                <Button disabled={index === draft.workingDays.length - 1} onClick={() => moveDay(day, 1)} size="sm" variant="secondary">Down</Button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Periods" title="Ordered Periods" action={<Button onClick={addPeriod} variant="secondary">Add Period</Button>} />
        <div className="responsive-table-wrap">
          <table className="responsive-table text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
              <tr>
                <th className="px-4 py-3 font-semibold sm:px-5">Order</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Name</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Start</th>
                <th className="px-4 py-3 font-semibold sm:px-5">End</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Type</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Active</th>
                <th className="px-4 py-3 text-right font-semibold sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orderedPeriods(draft.periods).map((period, index) => (
                <tr className={period.isActive ? "bg-surface" : "bg-surface-muted opacity-75"} key={period.id}>
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-foreground-muted">{period.order}</span>
                      <Button disabled={index === 0} onClick={() => movePeriod(period.id, -1)} size="sm" variant="secondary">Up</Button>
                      <Button disabled={index === draft.periods.length - 1} onClick={() => movePeriod(period.id, 1)} size="sm" variant="secondary">Down</Button>
                    </div>
                  </td>
                  <td className="px-4 py-3 sm:px-5"><input aria-label={`${period.name} name`} className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" value={period.name} onChange={(event) => updatePeriod(period.id, "name", event.target.value)} /></td>
                  <td className="px-4 py-3 sm:px-5"><input aria-label={`${period.name} start time`} className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" type="time" value={period.startTime} onChange={(event) => updatePeriod(period.id, "startTime", event.target.value)} /></td>
                  <td className="px-4 py-3 sm:px-5"><input aria-label={`${period.name} end time`} className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" type="time" value={period.endTime} onChange={(event) => updatePeriod(period.id, "endTime", event.target.value)} /></td>
                  <td className="px-4 py-3 sm:px-5">
                    <Select aria-label={`${period.name} type`} value={period.type} onChange={(event) => updatePeriod(period.id, "type", event.target.value as TimetablePeriodType)}>
                      {timetablePeriodTypes.map((type) => <option key={type} value={type}>{formatPeriodType(type)}</option>)}
                    </Select>
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <input aria-label={`${period.name} active`} checked={period.isActive} className="h-4 w-4 accent-sky-700" type="checkbox" onChange={(event) => updatePeriod(period.id, "isActive", event.target.checked)} />
                  </td>
                  <td className="px-4 py-3 text-right sm:px-5">
                    <Button disabled={draft.periods.length <= 1} onClick={() => deletePeriod(period.id)} size="sm" variant="destructive">Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function orderedPeriods(periods: TimetablePeriod[]) {
  return [...periods].sort((first, second) => first.order - second.order);
}

function addMinutes(time: string, minutes: number) {
  const [hours = "0", mins = "0"] = time.split(":");
  const date = new Date(2000, 0, 1, Number(hours), Number(mins));
  date.setMinutes(date.getMinutes() + minutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </Card>
  );
}
