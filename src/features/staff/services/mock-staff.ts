import { tenantContext } from "@/lib/tenant-context";
import type { Staff, StaffDepartment, StaffDesignation, StaffSummary } from "@/features/staff/types/staff";
import { isSameScope } from "@/features/staff/services/staff-rules";
import type { TenantScopedQuery } from "@/lib/api/client";

const activeScope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

const secondTenantScope = {
  tenantId: "tenant-demo-west",
  schoolId: "school-demo-west",
  campusId: "campus-demo-central",
  academicYearId: "ay-2026-27",
};

export const mockStaffDepartments: StaffDepartment[] = [
  department("dept-academics", "ACD", "Academics"),
  department("dept-administration", "ADM", "Administration"),
  department("dept-accounts", "ACC", "Accounts"),
  department("dept-hr", "HR", "Human Resources"),
  department("dept-transport", "TRN", "Transport"),
  department("dept-support", "SUP", "Support"),
  department("dept-other", "OTH", "Other Operations"),
  department("dept-academics-west", "ACD", "Academics", secondTenantScope),
];

export const mockStaffDesignations: StaffDesignation[] = [
  designation("des-principal", "PRN", "Principal", "administrative"),
  designation("des-vice-principal", "VPR", "Vice Principal", "administrative"),
  designation("des-senior-teacher", "STC", "Senior Teacher", "teaching"),
  designation("des-teacher", "TCH", "Teacher", "teaching"),
  designation("des-accountant", "ACC", "Accountant", "accounts_finance"),
  designation("des-hr-executive", "HRE", "HR Executive", "hr"),
  designation("des-clerk", "CLK", "Clerk", "administrative"),
  designation("des-librarian", "LIB", "Librarian", "non_teaching"),
  designation("des-driver", "DRV", "Driver", "transport"),
  designation("des-support-staff", "SUP", "Support Staff", "support"),
  designation("des-other-associate", "OTH", "Operations Associate", "other"),
  designation("des-teacher-west", "TCH", "Teacher", "teaching", secondTenantScope),
];

export const mockStaffRecords: Staff[] = [
  staff("staff-001", "EMP-001", "Anita", undefined, "Sharma", "teaching", "full_time", "active", "dept-academics", "des-senior-teacher", "2018-06-11", { userId: "user-anita-sharma", officialEmail: "anita.sharma@sps.example", managerId: "staff-004", teacherCode: "TCH-001", subjectAreas: ["Mathematics", "Science"] }),
  staff("staff-002", "EMP-002", "Rahul", undefined, "Patil", "teaching", "full_time", "active", "dept-academics", "des-teacher", "2020-07-01", { officialEmail: "rahul.patil@sps.example", managerId: "staff-001", teacherCode: "TCH-002", subjectAreas: ["English", "Social Studies"] }),
  staff("staff-003", "EMP-003", "Priya", undefined, "Kulkarni", "accounts_finance", "full_time", "active", "dept-accounts", "des-accountant", "2019-04-15", { userId: "user-priya-kulkarni", officialEmail: "priya.kulkarni@sps.example", managerId: "staff-004" }),
  staff("staff-004", "EMP-004", "Amit", undefined, "Deshmukh", "administrative", "full_time", "active", "dept-administration", "des-clerk", "2021-01-05"),
  staff("staff-005", "EMP-005", "Neha", undefined, "Joshi", "hr", "full_time", "on_leave", "dept-hr", "des-hr-executive", "2022-03-21", { userId: "user-neha-joshi" }),
  staff("staff-006", "EMP-006", "Suresh", undefined, "More", "transport", "contract", "active", "dept-transport", "des-driver", "2023-08-01"),
  staff("staff-007", "EMP-007", "Meera", undefined, "Nair", "non_teaching", "part_time", "active", "dept-academics", "des-librarian", "2021-09-12"),
  staff("staff-008", "EMP-008", "Vikram", undefined, "Kadam", "support", "temporary", "suspended", "dept-support", "des-support-staff", "2024-02-01"),
  staff("staff-009", "EMP-009", "Farah", undefined, "Shaikh", "teaching", "visiting", "active", "dept-academics", "des-teacher", "2025-06-17"),
  staff("staff-010", "EMP-010", "Omkar", undefined, "Gokhale", "administrative", "intern_trainee", "inactive", "dept-administration", "des-clerk", "2025-04-01", { exitDate: "2025-09-30", exitReason: "Internship completed." }),
  staff("staff-011", "EMP-011", "Kavita", undefined, "Bendre", "teaching", "full_time", "resigned", "dept-academics", "des-teacher", "2017-06-05", { exitDate: "2024-03-31", exitReason: "Resigned for relocation." }),
  staff("staff-012", "EMP-012", "Mahesh", undefined, "Pawar", "support", "full_time", "retired", "dept-support", "des-support-staff", "2009-05-14", { exitDate: "2026-03-31", exitReason: "Retired after service completion." }),
  ...largeStaffRoster(),
  staff("staff-west-001", "EMP-001", "Sameer", undefined, "Rao", "teaching", "full_time", "active", "dept-academics-west", "des-teacher-west", "2020-06-15", {}, secondTenantScope),
];

export function toStaffSummary(
  staffRecord: Staff,
  departments = mockStaffDepartments,
  designations = mockStaffDesignations,
): StaffSummary {
  const department = departments.find((item) => item.id === staffRecord.departmentId && isSameScope(item, staffRecord));
  const designation = designations.find((item) => item.id === staffRecord.designationId && isSameScope(item, staffRecord));

  return {
    id: staffRecord.id,
    tenantId: staffRecord.tenantId,
    schoolId: staffRecord.schoolId,
    campusId: staffRecord.campusId,
    academicYearId: staffRecord.academicYearId,
    employeeNumber: staffRecord.employeeNumber,
    displayName: staffRecord.displayName,
    staffCategory: staffRecord.staffCategory,
    employmentType: staffRecord.employmentType,
    status: staffRecord.status,
    joiningDate: staffRecord.joiningDate,
    userId: staffRecord.userId,
    contact: staffRecord.contact,
    reportingManagerId: staffRecord.reportingManagerId,
    departmentName: department?.name ?? "Unknown department",
    designationName: designation?.name ?? "Unknown designation",
  };
}

function department(
  id: string,
  code: string,
  name: string,
  scope: TenantScopedQuery = activeScope,
): StaffDepartment {
  return {
    ...scope,
    id,
    code,
    name,
    description: `${name} department`,
    status: "active",
    createdAt: "2026-04-01T09:00:00+05:30",
    updatedAt: "2026-04-01T09:00:00+05:30",
  };
}

function designation(
  id: string,
  code: string,
  name: string,
  staffCategory: StaffDesignation["staffCategory"],
  scope: TenantScopedQuery = activeScope,
): StaffDesignation {
  return {
    ...scope,
    id,
    code,
    name,
    description: `${name} designation`,
    staffCategory,
    status: "active",
    createdAt: "2026-04-01T09:00:00+05:30",
    updatedAt: "2026-04-01T09:00:00+05:30",
  };
}

function staff(
  id: string,
  employeeNumber: string,
  firstName: string,
  middleName: string | undefined,
  lastName: string,
  staffCategory: Staff["staffCategory"],
  employmentType: Staff["employmentType"],
  status: Staff["status"],
  departmentId: string,
  designationId: string,
  joiningDate: string,
  options: {
    userId?: string;
    exitDate?: string;
    exitReason?: string;
    officialEmail?: string;
    managerId?: string;
    teacherCode?: string;
    subjectAreas?: string[];
  } = {},
  scope: TenantScopedQuery = activeScope,
): Staff {
  const timestamp = `${joiningDate}T09:00:00+05:30`;

  return {
    ...scope,
    id,
    employeeNumber,
    userId: options.userId,
    firstName,
    middleName,
    lastName,
    displayName: [firstName, middleName, lastName].filter(Boolean).join(" "),
    staffCategory,
    employmentType,
    status,
    joiningDate,
    confirmationDate: status === "active" ? addYear(joiningDate) : undefined,
    exitDate: options.exitDate,
    exitReason: options.exitReason,
    departmentId,
    designationId,
    reportingManagerId: options.managerId,
    contact: {
      mobileNumber: `+9190000${employeeNumber.replace(/\D/g, "").padStart(5, "0").slice(-5)}`,
      alternatePhone: `020${employeeNumber.replace(/\D/g, "").padStart(7, "0").slice(-7)}`,
      personalEmail: `${firstName}.${lastName}`.toLowerCase() + "@example.com",
      officialEmail: options.officialEmail,
      preferredContactMethod: "mobile",
    },
    currentAddress: {
      addressLine1: "Staff Housing Block",
      addressLine2: "Near school campus",
      city: "Pune",
      district: "Pune",
      state: "Maharashtra",
      pinCode: "411057",
      country: "India",
    },
    permanentAddressSameAsCurrent: true,
    emergencyContacts: [
      {
        name: `${lastName} Family Contact`,
        relationship: "relative",
        mobileNumber: `+9198888${employeeNumber.replace(/\D/g, "").padStart(5, "0").slice(-5)}`,
        isPrimary: true,
      },
    ],
    teachingInfo: staffCategory === "teaching"
      ? {
          teacherCode: options.teacherCode,
          subjectAreas: options.subjectAreas ?? ["General Studies"],
          academicDepartment: "Academics",
          qualificationSummary: "Graduate with school teaching experience.",
          experienceSummary: "Experienced in classroom teaching and student mentoring.",
        }
      : undefined,
    createdAt: timestamp,
    updatedAt: options.exitDate ? `${options.exitDate}T17:00:00+05:30` : timestamp,
  };
}

function addYear(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${Number(year) + 1}-${month}-${day}` : undefined;
}

function largeStaffRoster() {
  const firstNames = [
    "Aarav",
    "Isha",
    "Rohan",
    "Sneha",
    "Nikhil",
    "Pooja",
    "Aditya",
    "Tanvi",
    "Kiran",
    "Swati",
    "Manoj",
    "Deepa",
    "Yash",
    "Rutuja",
    "Harish",
    "Namrata",
  ];
  const lastNames = [
    "Shinde",
    "Jadhav",
    "Mehta",
    "Sawant",
    "Rane",
    "Apte",
    "Chavan",
    "Saxena",
    "Naik",
    "Pillai",
    "Bhosale",
    "Tiwari",
  ];
  const assignments: Array<{
    category: Staff["staffCategory"];
    employment: Staff["employmentType"];
    status: Staff["status"];
    departmentId: string;
    designationId: string;
  }> = [
    { category: "teaching", employment: "full_time", status: "active", departmentId: "dept-academics", designationId: "des-teacher" },
    { category: "teaching", employment: "part_time", status: "active", departmentId: "dept-academics", designationId: "des-teacher" },
    { category: "teaching", employment: "visiting", status: "on_leave", departmentId: "dept-academics", designationId: "des-teacher" },
    { category: "administrative", employment: "full_time", status: "active", departmentId: "dept-administration", designationId: "des-clerk" },
    { category: "administrative", employment: "temporary", status: "inactive", departmentId: "dept-administration", designationId: "des-clerk" },
    { category: "accounts_finance", employment: "full_time", status: "active", departmentId: "dept-accounts", designationId: "des-accountant" },
    { category: "hr", employment: "full_time", status: "active", departmentId: "dept-hr", designationId: "des-hr-executive" },
    { category: "support", employment: "contract", status: "suspended", departmentId: "dept-support", designationId: "des-support-staff" },
    { category: "transport", employment: "contract", status: "active", departmentId: "dept-transport", designationId: "des-driver" },
    { category: "non_teaching", employment: "part_time", status: "active", departmentId: "dept-academics", designationId: "des-librarian" },
    { category: "other", employment: "temporary", status: "active", departmentId: "dept-other", designationId: "des-other-associate" },
    { category: "teaching", employment: "full_time", status: "resigned", departmentId: "dept-academics", designationId: "des-teacher" },
    { category: "support", employment: "full_time", status: "terminated", departmentId: "dept-support", designationId: "des-support-staff" },
  ];

  return Array.from({ length: 72 }, (_, index) => {
    const serial = index + 13;
    const assignment = assignments[index % assignments.length];
    const year = 2014 + (index % 12);
    const month = String((index % 9) + 1).padStart(2, "0");
    const day = String((index % 23) + 1).padStart(2, "0");
    const joiningDate = `${year}-${month}-${day}`;
    const terminal = assignment.status === "resigned" || assignment.status === "terminated" || assignment.status === "retired";
    const options = terminal
      ? { exitDate: "2026-03-31", exitReason: `${assignment.status.replace("_", " ")} lifecycle sample.` }
      : {};

    return staff(
      `staff-${String(serial).padStart(3, "0")}`,
      `EMP-${String(serial).padStart(3, "0")}`,
      firstNames[index % firstNames.length] ?? "Staff",
      undefined,
      lastNames[index % lastNames.length] ?? "Member",
      assignment.category,
      assignment.employment,
      assignment.status,
      assignment.departmentId,
      assignment.designationId,
      joiningDate,
      options,
    );
  });
}
