import { Button, Card, Field, SectionHeader, Select } from "@/components/ui";

export function ReportFramework() {
  return (
    <Card id="reports" className="responsive-card-padding">
      <SectionHeader title="Report Framework" eyebrow="Async exports" />
      <div className="mt-4 grid gap-3">
        <Field label="Report type">
          <Select defaultValue="Attendance Reports">
            <option>Academic Reports</option>
            <option>Attendance Reports</option>
            <option>Financial Reports</option>
            <option>HR Reports</option>
            <option>Custom Reports</option>
          </Select>
        </Field>
        <Field label="Date range">
          <Select defaultValue="Current Month">
            <option>Current Month</option>
            <option>Current Term</option>
            <option>Academic Year</option>
          </Select>
        </Field>
        <Field label="Processing mode">
          <Select defaultValue="Async Export">
            <option>Preview</option>
            <option>Async Export</option>
          </Select>
        </Field>
        <Button className="mobile-full-action">Generate Report</Button>
      </div>
    </Card>
  );
}
