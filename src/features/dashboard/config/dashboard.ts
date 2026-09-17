import type { DashboardQuickAction } from "@/features/dashboard/types/dashboard";

export const principalQuickActions: DashboardQuickAction[] = [
  {
    id: "mark-attendance",
    label: "Mark attendance",
    description: "Open the current attendance workspace.",
    href: "/attendance/mark?date=2026-08-12&classId=class-grade-8&sectionId=section-grade-8-a",
    permission: "attendance.mark",
  },
  {
    id: "add-student",
    label: "Admissions",
    description: "Open the admission foundation workspace.",
    href: "/admissions",
    permission: "admission.view",
  },
  {
    id: "create-notice",
    label: "Create notice",
    description: "Open communication to prepare notices and broadcasts.",
    href: "/communication?section=notice",
    permission: "communication.notice.create",
  },
  {
    id: "review-reports",
    label: "Review reports",
    description: "Open attendance analytics and export-ready reports.",
    href: "/attendance/reports",
    permission: "attendance.report",
  },
];

export const dashboardWidgetPermissions = {
  academics: "academic.view",
  admissions: "admission.view",
  attendance: "attendance.view",
  audit: "admin.manage",
  communication: "communication.view",
  finance: "fees.view",
  staff: "hr.view",
  students: "student.view",
} as const;
