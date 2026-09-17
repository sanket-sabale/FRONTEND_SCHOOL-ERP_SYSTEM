import { Badge, Card, SectionHeader } from "@/components/ui";

const modules = [
  {
    id: "timetable",
    title: "Timetable",
    eyebrow: "Academics",
    rows: ["Weekly grid: Mon-Sat", "Conflict flags: teacher and room", "Views: class, teacher, room"],
  },
  {
    id: "homework",
    title: "Homework",
    eyebrow: "Teacher workflow",
    rows: ["Due this week: 46", "Pending submissions: 318", "Attachments ready for signed uploads"],
  },
  {
    id: "payroll",
    title: "Payroll",
    eyebrow: "HR finance",
    rows: ["August payroll: draft", "Leave deductions: under review", "Payslip generation: async"],
  },
  {
    id: "communication",
    title: "Communication",
    eyebrow: "Notices",
    rows: ["Audience: school, campus, class, individual", "Channels: app, SMS, email", "Drafts: 7 scheduled: 3"],
  },
];

export function ModuleSummaries() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {modules.map((module) => (
        <Card className="responsive-card-padding" id={module.id} key={module.id}>
          <SectionHeader title={module.title} eyebrow={module.eyebrow} />
          <div className="mt-4 space-y-3">
            {module.rows.map((row) => (
              <div className="flex flex-col gap-2 text-sm min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between" key={row}>
                <span className="responsive-text text-slate-600 dark:text-slate-300">{row}</span>
                <Badge tone="neutral">Ready</Badge>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </section>
  );
}
