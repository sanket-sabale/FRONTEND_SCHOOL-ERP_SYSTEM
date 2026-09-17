export type Role =
  | "principal"
  | "teacher"
  | "accountant"
  | "hr"
  | "system-admin";

export type Permission =
  | "dashboard.view"
  | "student.view"
  | "student.create"
  | "student.update"
  | "student.archive"
  | "student.manage"
  | "admission.view"
  | "admission.create"
  | "admission.edit"
  | "admission.submit"
  | "admission.review"
  | "admission.verify_documents"
  | "admission.schedule"
  | "admission.shortlist"
  | "admission.approve"
  | "admission.reject"
  | "admission.waitlist"
  | "admission.confirm"
  | "admission.enroll"
  | "admission.export"
  | "admission.manage_cycle"
  | "admission.manage_capacity"
  | "guardian.view"
  | "guardian.create"
  | "guardian.update"
  | "guardian.archive"
  | "guardian.link"
  | "guardian.manage"
  | "academic.view"
  | "academic.manage"
  | "timetable.view"
  | "timetable.create"
  | "timetable.update"
  | "timetable.configure"
  | "timetable.cell.configure"
  | "timetable.validate"
  | "timetable.publish"
  | "timetable.manage"
  | "attendance.view"
  | "attendance.mark"
  | "attendance.update"
  | "attendance.correct"
  | "attendance.history.view"
  | "attendance.manage"
  | "attendance.report"
  | "attendance.integrity.view"
  | "fees.view"
  | "finance.view"
  | "finance.record_payment"
  | "finance.verify_payment"
  | "finance.manage_refund"
  | "finance.view_reports"
  | "exam.publish"
  | "hr.view"
  | "hr.manage"
  | "admin.manage"
  | "communication.view"
  | "communication.send"
  | "communication.broadcast"
  | "communication.notice.create"
  | "communication.manage";

export type NavigationIcon =
  | "dashboard"
  | "students"
  | "parents"
  | "admissions"
  | "academics"
  | "attendance"
  | "timetable"
  | "homework"
  | "assessments"
  | "finance"
  | "payroll"
  | "communication"
  | "reports"
  | "settings"
  | "users"
  | "audit"
  | "help";

export type NavItem = {
  label: string;
  href: string;
  permission: Permission;
  icon?: NavigationIcon;
  badge?: string;
  activeMatch?: string[];
  children?: NavItem[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export type Student = {
  id: string;
  name: string;
  admissionNo: string;
  className: string;
  section: string;
  academicYear: string;
  status: "Active" | "Pending Documents" | "Transferred";
  gender: "Female" | "Male";
  city: string;
  parent: string;
  phone: string;
  attendance: number;
  feeStatus: "Paid" | "Partial" | "Overdue";
};

export type Payment = {
  id: string;
  student: string;
  invoice: string;
  amount: number;
  method: "UPI" | "Card" | "Net Banking" | "Cash";
  status: "Successful" | "Pending" | "Failed" | "Refunded";
  date: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  delta: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
};

export type CurrentUser = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  roles: string[];
  employeeId?: string;
  department?: string;
  designation?: string;
};
