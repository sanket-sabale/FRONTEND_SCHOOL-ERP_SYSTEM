import type { DashboardMetric, Payment, Student } from "@/types/erp";
import { mockStudents, toStudentSummary } from "@/features/students/services/mock-students";
import { tenantContext } from "@/lib/tenant-context";

export { tenantContext };

export const principalMetrics: DashboardMetric[] = [
  { label: "Total Students", value: "2,846", delta: "+124 this year", tone: "info" },
  { label: "Attendance Today", value: "94.2%", delta: "Grade 9 needs review", tone: "warning" },
  { label: "Fee Collection", value: "₹42.8L", delta: "76% of monthly target", tone: "success" },
  { label: "Outstanding Fees", value: "₹18.4L", delta: "312 accounts", tone: "danger" },
  { label: "Staff Present", value: "138/146", delta: "5 leave requests", tone: "neutral" },
  { label: "Admissions", value: "428", delta: "63 under review", tone: "info" },
];

const dashboardStudentDetails: Record<string, Pick<Student, "attendance" | "city" | "feeStatus" | "phone">> = {
  "stu-001": { attendance: 96, city: "Pune", feeStatus: "Paid", phone: "+91 98220 44128" },
  "stu-002": { attendance: 89, city: "Pimpri-Chinchwad", feeStatus: "Partial", phone: "+91 98765 21044" },
  "stu-003": { attendance: 92, city: "Baner", feeStatus: "Overdue", phone: "+91 90110 56271" },
  "stu-004": { attendance: 98, city: "Hinjewadi", feeStatus: "Paid", phone: "+91 97644 82013" },
};

export const students: Student[] = mockStudents.slice(0, 4).map((student) => {
  const summary = toStudentSummary(student);
  const dashboardDetails = dashboardStudentDetails[student.id];

  return {
    id: summary.id,
    name: summary.displayName,
    admissionNo: summary.admissionNumber,
    className: summary.className,
    section: summary.sectionName,
    academicYear: tenantContext.academicYear,
    status: summary.status === "pending" ? "Pending Documents" : "Active",
    gender: summary.gender === "female" ? "Female" : "Male",
    city: dashboardDetails?.city ?? "Pune",
    parent: summary.primaryGuardian?.name ?? "Not linked",
    phone: dashboardDetails?.phone ?? "Not provided",
    attendance: dashboardDetails?.attendance ?? 0,
    feeStatus: dashboardDetails?.feeStatus ?? "Paid",
  };
});

export const payments: Payment[] = [
  {
    id: "TXN-UPI-82941",
    student: "Aarav Deshmukh",
    invoice: "INV-2026-1142",
    amount: 38500,
    method: "UPI",
    status: "Successful",
    date: "11 Aug 2026",
  },
  {
    id: "TXN-CARD-82917",
    student: "Ishita Nair",
    invoice: "INV-2026-1178",
    amount: 18400,
    method: "Card",
    status: "Pending",
    date: "10 Aug 2026",
  },
  {
    id: "TXN-NB-82898",
    student: "Kabir Patil",
    invoice: "INV-2026-1097",
    amount: 42200,
    method: "Net Banking",
    status: "Successful",
    date: "09 Aug 2026",
  },
];

export const admissionPipeline = [
  { label: "Draft", value: 48 },
  { label: "Submitted", value: 132 },
  { label: "Under Review", value: 63 },
  { label: "Shortlisted", value: 37 },
  { label: "Approved", value: 24 },
  { label: "Enrolled", value: 19 },
];

export const notices = [
  "Grade 10 pre-board schedule requires principal approval.",
  "Transport route update sent to Pune Wakad Campus parents.",
  "Three refunds above ₹25,000 are awaiting accountant confirmation.",
];
