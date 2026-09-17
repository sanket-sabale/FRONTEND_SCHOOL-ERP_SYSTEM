import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { formatClassSection, formatDateTime, formatTimetableDay } from "@/features/timetable/components/timetable-formatters";
import { TimetableStatusBadge } from "@/features/timetable/components/timetable-status-badge";
import type { TimetableWorkspaceData } from "@/lib/api/timetable";
import type { Timetable, TimetableDay, TimetableEntry } from "@/features/timetable/types/timetable";

type ViewMode = "classes" | "teachers" | "rooms";

export function TimetableResourceView({ context, data, mode }: { context: { school: string; campus: string; academicYear: string }; data: TimetableWorkspaceData; mode: ViewMode }) {
  const timetable = data.timetables.find((item) => item.status === "published") ?? data.timetables.find((item) => item.status === "draft");
  const title = mode === "classes" ? "Class Timetables" : mode === "teachers" ? "Teacher Timetables" : "Room Timetables";
  const description = mode === "classes" ? "Review section schedules derived from the shared timetable entries." : mode === "teachers" ? "Review teacher load and period allocations from the master timetable." : "Review room occupancy without creating a separate room schedule.";

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, title]} />} description={description} eyebrow="Timetable Management" title={title} action={timetable ? <TimetableStatusBadge status={timetable.status} /> : null} />
      {!timetable ? <EmptyState title="No timetable available" description="Create or publish a timetable to populate this view." /> : <ResourceList data={data} mode={mode} timetable={timetable} />}
    </div>
  );
}

export function TimetableTemplatesView({ context, data }: { context: { school: string; campus: string; academicYear: string }; data: TimetableWorkspaceData }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Templates"]} />} description="Reusable starting points for future timetable creation." eyebrow="Timetable Management" title="Timetable Templates" />
      <div className="grid gap-3 md:grid-cols-3">
        {data.templates.map((template) => (
          <Card className="p-4" key={template.id}>
            <div className="flex items-start justify-between gap-3"><h2 className="responsive-text font-semibold text-foreground">{template.name}</h2><Badge tone="success">Active</Badge></div>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">{template.description}</p>
            <p className="mt-4 text-xs font-medium text-foreground-muted">Updated {formatDateTime(template.updatedAt)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TimetableVersionsView({ context, data }: { context: { school: string; campus: string; academicYear: string }; data: TimetableWorkspaceData }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={[context.school, context.campus, context.academicYear, "Versions"]} />} description="Lightweight timetable version history ready for backend-backed publishing audits." eyebrow="Timetable Management" title="Timetable Versions" />
      <Card>
        <SectionHeader eyebrow="History" title="Published and Draft Versions" />
        <div className="divide-y divide-border">
          {data.versions.map((version) => (
            <article className="grid gap-3 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center sm:p-5" key={version.id}>
              <p className="font-semibold text-foreground">v{version.versionNumber}</p>
              <div><p className="text-sm text-foreground">{version.summary}</p><p className="mt-1 text-xs text-foreground-muted">{formatDateTime(version.publishedAt ?? version.createdAt)}</p></div>
              <TimetableStatusBadge status={version.status} />
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ResourceList({ data, mode, timetable }: { data: TimetableWorkspaceData; mode: ViewMode; timetable: Timetable }) {
  const resources = mode === "classes"
    ? data.sections.map((section) => {
        const academicClass = data.classes.find((item) => item.id === section.classId);
        return { id: section.id, label: formatClassSection(academicClass?.displayName, section.displayName), entries: timetable.entries.filter((entry) => entry.sectionId === section.id) };
      })
    : mode === "teachers"
      ? data.teachers.map((teacher) => ({ id: teacher.id, label: teacher.displayName, entries: timetable.entries.filter((entry) => entry.teacherId === teacher.id) }))
      : data.rooms.map((room) => ({ id: room.id, label: room.name, entries: timetable.entries.filter((entry) => entry.roomId === room.id) }));

  return (
    <div className="grid gap-4">
      {resources.map((resource) => (
        <Card key={resource.id}>
          <SectionHeader eyebrow={mode === "classes" ? "Class View" : mode === "teachers" ? "Teacher View" : "Room View"} title={resource.label} action={<Badge tone="info">{resource.entries.length} periods</Badge>} />
          <ScheduleEntries data={data} entries={resource.entries} mode={mode} />
        </Card>
      ))}
    </div>
  );
}

function ScheduleEntries({ data, entries, mode }: { data: TimetableWorkspaceData; entries: TimetableEntry[]; mode: ViewMode }) {
  if (entries.length === 0) {
    return <div className="p-4 sm:p-5"><EmptyState title="No assignments" description="Assignments will appear here once the timetable includes this resource." /></div>;
  }

  const activeTimetable = data.timetables.find((item) => item.status === "published") ?? data.timetables.find((item) => item.status === "draft");
  const schedule = data.schedules.find((item) => item.id === activeTimetable?.scheduleId) ?? data.schedule;
  const grouped = schedule.workingDays.map((day) => ({ day, entries: entries.filter((entry) => entry.dayOfWeek === day) }));
  return (
    <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
      {grouped.map((group) => (
        <article className="rounded-lg border border-border bg-surface-muted p-3" key={group.day}>
          <h3 className="font-semibold text-foreground">{formatTimetableDay(group.day as TimetableDay)}</h3>
          <div className="mt-3 grid gap-2">
            {group.entries.length === 0 ? <p className="text-sm text-foreground-muted">No scheduled periods.</p> : group.entries.map((entry) => <EntryLine data={data} entry={entry} key={entry.id} mode={mode} />)}
          </div>
        </article>
      ))}
    </div>
  );
}

function EntryLine({ data, entry, mode }: { data: TimetableWorkspaceData; entry: TimetableEntry; mode: ViewMode }) {
  const timetable = data.timetables.find((item) => item.id === entry.timetableId);
  const schedule = data.schedules.find((item) => item.id === timetable?.scheduleId) ?? data.schedule;
  const period = schedule.periods.find((item) => item.id === entry.periodId);
  const subject = data.subjects.find((item) => item.id === entry.subjectId);
  const teacher = data.teachers.find((item) => item.id === entry.teacherId);
  const room = data.rooms.find((item) => item.id === entry.roomId);
  const section = data.sections.find((item) => item.id === entry.sectionId);
  const academicClass = data.classes.find((item) => item.id === entry.classId);
  const detail = mode === "classes" ? `${teacher?.displayName ?? "No teacher"} / ${room?.name ?? "No room"}` : `${formatClassSection(academicClass?.displayName, section?.displayName)} / ${subject?.name ?? "No subject"}`;

  return (
    <Link className="rounded-lg border border-border bg-surface p-3 text-sm transition hover:bg-surface-muted" href={`/timetable/maker?classId=${entry.classId}&sectionId=${entry.sectionId}`}>
      <span className="block font-medium text-foreground">{period?.name ?? "Period"} / {subject?.name ?? "Missing subject"}</span>
      <span className="mt-1 block text-xs text-foreground-muted">{detail}</span>
    </Link>
  );
}
