import { tenantContext } from "@/lib/tenant-context";
import type { StaffEmploymentRecord } from "@/features/staff-employment/types/staff-employment";

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

export const mockStaffEmploymentRecords: StaffEmploymentRecord[] = [
  record("emp-rec-001-join", "staff-001", "joining", "2024-06-01", "Joined Saraswati Public School", "Mathematics", "Senior Teacher", "Full-time", "Pune Wakad Campus", "2024-11-30"),
  record("emp-rec-001-confirm", "staff-001", "confirmation", "2024-12-01", "Confirmed after probation", "Mathematics", "Senior Teacher", "Full-time", "Pune Wakad Campus"),
  record("emp-rec-001-promo", "staff-001", "promotion", "2026-04-01", "Promoted to Senior Teacher", "Mathematics", "Senior Teacher", "Full-time", "Pune Wakad Campus"),
  record("emp-rec-002-join", "staff-002", "joining", "2023-06-10", "Joined Accounts Department", "Accounts", "Accountant", "Full-time", "Pune Wakad Campus"),
  record("emp-rec-003-join", "staff-003", "joining", "2025-04-12", "Joined Administration", "Administration", "Coordinator", "Contract", "Pune Wakad Campus", "2025-10-12"),
  {
    ...record("emp-rec-west-001-join", "staff-west-001", "joining", "2025-06-01", "Other tenant joining", "Operations", "Teacher", "Full-time", "West Campus"),
    tenantId: "tenant-west",
    schoolId: "school-west",
    campusId: "campus-west",
    academicYearId: "ay-west-2026",
  },
];

function record(
  id: string,
  staffId: string,
  eventType: StaffEmploymentRecord["eventType"],
  effectiveDate: string,
  title: string,
  departmentName: string,
  designationName: string,
  employmentType: string,
  workLocation: string,
  probationEndDate?: string,
): StaffEmploymentRecord {
  const now = `${effectiveDate}T09:00:00+05:30`;
  return {
    ...scope,
    id,
    staffId,
    eventType,
    effectiveDate,
    title,
    departmentName,
    designationName,
    employmentType,
    workLocation,
    probationEndDate,
    status: "active",
    recordedBy: "hr-office",
    createdAt: now,
    updatedAt: now,
  };
}
