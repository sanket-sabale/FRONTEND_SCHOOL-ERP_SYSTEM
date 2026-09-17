import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { Badge, Button, Card, Field, SectionHeader, Select } from "@/components/ui";
import { StudentStatusBadge } from "@/features/students/components/student-status-badge";
import { studentService } from "@/lib/api/students";
import { tenantContext } from "@/lib/tenant-context";
import type { StudentSummary } from "@/features/students/types/student";

const columns: DataTableColumn<StudentSummary>[] = [
  {
    key: "student",
    header: "Student",
    cell: (student) => (
      <div>
        <p className="font-medium text-slate-950 dark:text-slate-50">{student.displayName}</p>
        <p className="text-xs text-slate-500">{student.studentCode ?? student.id}</p>
      </div>
    ),
  },
  { key: "admission", header: "Admission", cell: (student) => <span className="font-mono text-xs">{student.admissionNumber}</span> },
  { key: "class", header: "Class", cell: (student) => `${student.className} ${student.sectionName}` },
  {
    key: "guardian",
    header: "Guardian",
    cell: (student) => (
      <div>
        <p>{student.primaryGuardian?.name ?? "Not linked"}</p>
        <p className="text-xs text-slate-500">{student.primaryGuardian?.relationship ?? "Guardian"}</p>
      </div>
    ),
  },
  {
    key: "academic-year",
    header: "Academic Year",
    cell: () => <Badge tone="neutral">{tenantContext.academicYear}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    cell: (student) => <StudentStatusBadge status={student.status} />,
  },
];

export async function StudentManagement() {
  const response = await studentService.getStudents(
    {
      tenantId: tenantContext.tenantId,
      schoolId: tenantContext.schoolId,
      campusId: tenantContext.campusId,
      academicYearId: tenantContext.academicYearId,
    },
    { page: 1, pageSize: 4 },
  );

  return (
    <Card id="students">
      <SectionHeader
        eyebrow="People"
        title="Student Management"
        action={
          <div className="responsive-action-row">
            <Button aria-disabled="true" disabled variant="secondary">Export</Button>
            <Button aria-disabled="true" disabled>New Student</Button>
          </div>
        }
      />
      <FilterBar>
        <Field label="Search">
          <input className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 dark:border-slate-800 dark:bg-slate-950 dark:focus:ring-sky-950" placeholder="Name, admission no, parent" />
        </Field>
        <Field label="Class">
          <Select defaultValue="Grade 8">
            <option>All Classes</option>
            <option>Grade 8</option>
            <option>Grade 10</option>
          </Select>
        </Field>
        <Field label="Section">
          <Select defaultValue="All">
            <option>All</option>
            <option>A</option>
            <option>B</option>
            <option>C</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select defaultValue="Active">
            <option>All Statuses</option>
            <option>Active</option>
            <option>Pending Documents</option>
          </Select>
        </Field>
      </FilterBar>
      <DataTable
        columns={columns}
        data={response.items}
        emptyDescription="Try clearing filters or add the first student for this tenant context."
        emptyTitle="No students found"
        getRowId={(student) => student.id}
        totalLabel={`Showing ${response.items.length} of ${response.total.toLocaleString("en-IN")} students`}
      />
    </Card>
  );
}
