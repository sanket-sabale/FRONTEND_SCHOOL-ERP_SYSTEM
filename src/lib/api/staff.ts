import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import {
  staffCreateSchema,
  staffDepartmentSchema,
  staffDesignationSchema,
  staffFiltersSchema,
  staffOrgEntityFiltersSchema,
  staffStatusChangeSchema,
  staffUpdateSchema,
} from "@/features/staff/schemas/staff.schema";
import {
  createStaffDisplayName,
  isSameScope,
  validateDepartmentReference,
  validateDesignationReference,
  validateConfirmationDate,
  validateStaffEmploymentDates,
  validateReportingManagerReference,
  validateStaffStatusTransition,
} from "@/features/staff/services/staff-rules";
import {
  mockStaffDepartments,
  mockStaffDesignations,
  mockStaffRecords,
  toStaffSummary,
} from "@/features/staff/services/mock-staff";
import type {
  Staff,
  StaffCreateInput,
  StaffDepartment,
  StaffDepartmentInput,
  StaffDepartmentSummary,
  StaffDesignation,
  StaffDesignationInput,
  StaffDesignationSummary,
  StaffFilters,
  StaffListResponse,
  StaffOrgEntityFilters,
  StaffProfile,
  StaffSortBy,
  StaffStatusChangeInput,
  StaffSummary,
  StaffUpdateInput,
} from "@/features/staff/types/staff";

type StaffRepository = {
  listStaff(scope: TenantScopedQuery, filters?: StaffFilters): Promise<StaffListResponse>;
  getStaffById(scope: TenantScopedQuery, staffId: string): Promise<StaffProfile | null>;
  getDepartments(scope: TenantScopedQuery, filters?: StaffOrgEntityFilters): Promise<StaffDepartmentSummary[]>;
  getDesignations(scope: TenantScopedQuery, filters?: StaffOrgEntityFilters): Promise<StaffDesignationSummary[]>;
  createDepartment(input: StaffDepartmentInput): Promise<StaffDepartment>;
  updateDepartment(input: StaffDepartmentInput & { id: string }): Promise<StaffDepartment>;
  deactivateDepartment(scope: TenantScopedQuery, departmentId: string): Promise<StaffDepartment>;
  createDesignation(input: StaffDesignationInput): Promise<StaffDesignation>;
  updateDesignation(input: StaffDesignationInput & { id: string }): Promise<StaffDesignation>;
  deactivateDesignation(scope: TenantScopedQuery, designationId: string): Promise<StaffDesignation>;
  createStaff(input: StaffCreateInput): Promise<Staff>;
  updateStaff(input: StaffUpdateInput): Promise<Staff>;
  changeStaffStatus(input: StaffStatusChangeInput): Promise<Staff>;
};

let staffRecords = [...mockStaffRecords];
let staffDepartments = [...mockStaffDepartments];
let staffDesignations = [...mockStaffDesignations];

const mockStaffRepository: StaffRepository = {
  async listStaff(scope, filters = {}) {
    const parsedFilters = staffFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    const page = parsedFilters.page;
    const pageSize = parsedFilters.pageSize;

    const filtered = staffRecords
      .filter((staff) => isSameScope(staff, scope))
      .map((staff) => ({
        ...toStaffSummary(staff, staffDepartments, staffDesignations),
        reportingManagerName: staff.reportingManagerId ? staffRecords.find((item) => item.id === staff.reportingManagerId && isSameScope(item, staff))?.displayName : undefined,
      }))
      .filter((staff) => {
        if (!query) return true;
        return [
          staff.displayName,
          staff.employeeNumber,
          staff.departmentName,
          staff.designationName,
          staff.reportingManagerName,
          staff.contact?.mobileNumber,
          staff.contact?.officialEmail,
          staff.contact?.personalEmail,
          staff.staffCategory,
          staff.employmentType,
          staff.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .filter((staff) => !parsedFilters.staffCategory || staff.staffCategory === parsedFilters.staffCategory)
      .filter((staff) => !parsedFilters.employmentType || staff.employmentType === parsedFilters.employmentType)
      .filter((staff) => !parsedFilters.status || staff.status === parsedFilters.status)
      .filter((staff) => !parsedFilters.departmentId || getStaffRecord(staff.id)?.departmentId === parsedFilters.departmentId)
      .filter((staff) => !parsedFilters.designationId || getStaffRecord(staff.id)?.designationId === parsedFilters.designationId)
      .filter((staff) => !parsedFilters.joiningDateFrom || staff.joiningDate >= parsedFilters.joiningDateFrom)
      .filter((staff) => !parsedFilters.joiningDateTo || staff.joiningDate <= parsedFilters.joiningDateTo)
      .filter((staff) => parsedFilters.userLinked === undefined || Boolean(staff.userId) === parsedFilters.userLinked)
      .sort((first, second) => compareStaff(first, second, parsedFilters.sortBy, parsedFilters.sortDirection));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  async getStaffById(scope, staffId) {
    const staff = staffRecords.find((record) => record.id === staffId && isSameScope(record, scope));
    return staff ? toStaffProfile(staff) : null;
  },

  async getDepartments(scope, filters = {}) {
    const parsed = staffOrgEntityFiltersSchema.parse(filters);
    const query = parsed.query?.toLowerCase();
    return staffDepartments
      .filter((department) => isSameScope(department, scope))
      .filter((department) => !parsed.status || department.status === parsed.status)
      .filter((department) => !query || [department.name, department.code, department.description].filter(Boolean).join(" ").toLowerCase().includes(query))
      .map((department) => ({
        ...department,
        staffCount: staffRecords.filter((staff) => isSameScope(staff, scope) && staff.departmentId === department.id).length,
      }))
      .sort((first, second) => first.name.localeCompare(second.name, "en-IN", { sensitivity: "base" }));
  },

  async getDesignations(scope, filters = {}) {
    const parsed = staffOrgEntityFiltersSchema.parse(filters);
    const query = parsed.query?.toLowerCase();
    return staffDesignations
      .filter((designation) => isSameScope(designation, scope))
      .filter((designation) => !parsed.status || designation.status === parsed.status)
      .filter((designation) => !query || [designation.name, designation.code, designation.description, designation.staffCategory].filter(Boolean).join(" ").toLowerCase().includes(query))
      .map((designation) => ({
        ...designation,
        staffCount: staffRecords.filter((staff) => isSameScope(staff, scope) && staff.designationId === designation.id).length,
      }))
      .sort((first, second) => first.name.localeCompare(second.name, "en-IN", { sensitivity: "base" }));
  },

  async createDepartment(input) {
    const parsed = staffDepartmentSchema.parse(input);
    ensureUniqueDepartment(parsed, parsed.name, parsed.code);
    const now = new Date().toISOString();
    const department: StaffDepartment = {
      ...scopeFromInput(parsed),
      id: createOrgId("dept", parsed.name),
      code: normalizeCode(parsed.code),
      name: parsed.name,
      description: parsed.description,
      status: parsed.status,
      createdAt: now,
      updatedAt: now,
    };
    staffDepartments = [department, ...staffDepartments];
    return { ...department };
  },

  async updateDepartment(input) {
    const parsed = staffDepartmentSchema.extend({ id: staffDepartmentSchema.shape.id.unwrap() }).parse(input);
    const index = staffDepartments.findIndex((department) => department.id === parsed.id && isSameScope(department, parsed));
    if (index === -1) throw new ApiError(404, "Department could not be found in the current staff scope.");
    ensureUniqueDepartment(parsed, parsed.name, parsed.code, parsed.id);
    const current = staffDepartments[index];
    if (!current) throw new ApiError(404, "Department could not be found in the current staff scope.");
    const next: StaffDepartment = {
      ...current,
      code: normalizeCode(parsed.code),
      name: parsed.name,
      description: parsed.description,
      status: parsed.status,
      updatedAt: new Date().toISOString(),
    };
    staffDepartments = staffDepartments.map((department) => department.id === next.id ? next : department);
    return { ...next };
  },

  async deactivateDepartment(scope, departmentId) {
    const department = staffDepartments.find((item) => item.id === departmentId && isSameScope(item, scope));
    if (!department) throw new ApiError(404, "Department could not be found in the current staff scope.");
    const next: StaffDepartment = { ...department, status: "inactive", updatedAt: new Date().toISOString() };
    staffDepartments = staffDepartments.map((item) => item.id === departmentId ? next : item);
    return { ...next };
  },

  async createDesignation(input) {
    const parsed = staffDesignationSchema.parse(input);
    ensureUniqueDesignation(parsed, parsed.name, parsed.code);
    const now = new Date().toISOString();
    const designation: StaffDesignation = {
      ...scopeFromInput(parsed),
      id: createOrgId("des", parsed.name),
      code: normalizeCode(parsed.code),
      name: parsed.name,
      description: parsed.description,
      staffCategory: parsed.staffCategory,
      status: parsed.status,
      createdAt: now,
      updatedAt: now,
    };
    staffDesignations = [designation, ...staffDesignations];
    return { ...designation };
  },

  async updateDesignation(input) {
    const parsed = staffDesignationSchema.extend({ id: staffDesignationSchema.shape.id.unwrap() }).parse(input);
    const index = staffDesignations.findIndex((designation) => designation.id === parsed.id && isSameScope(designation, parsed));
    if (index === -1) throw new ApiError(404, "Designation could not be found in the current staff scope.");
    ensureUniqueDesignation(parsed, parsed.name, parsed.code, parsed.id);
    const current = staffDesignations[index];
    if (!current) throw new ApiError(404, "Designation could not be found in the current staff scope.");
    const next: StaffDesignation = {
      ...current,
      code: normalizeCode(parsed.code),
      name: parsed.name,
      description: parsed.description,
      staffCategory: parsed.staffCategory,
      status: parsed.status,
      updatedAt: new Date().toISOString(),
    };
    staffDesignations = staffDesignations.map((designation) => designation.id === next.id ? next : designation);
    return { ...next };
  },

  async deactivateDesignation(scope, designationId) {
    const designation = staffDesignations.find((item) => item.id === designationId && isSameScope(item, scope));
    if (!designation) throw new ApiError(404, "Designation could not be found in the current staff scope.");
    const next: StaffDesignation = { ...designation, status: "inactive", updatedAt: new Date().toISOString() };
    staffDesignations = staffDesignations.map((item) => item.id === designationId ? next : item);
    return { ...next };
  },

  async createStaff(input) {
    const parsedInput = staffCreateSchema.parse(input);
    const scope = scopeFromInput(parsedInput);
    ensureUniqueEmployeeNumber(scope, parsedInput.employeeNumber);
    ensureValid(validateDepartmentReference(scope, parsedInput.departmentId, staffDepartments));
    ensureValid(validateDesignationReference(scope, parsedInput.designationId, staffDesignations));
    ensureValid(validateStaffEmploymentDates(parsedInput));
    ensureValid(validateConfirmationDate(parsedInput));
    ensureUniqueUserLink(scope, parsedInput.userId);
    ensureUniqueOfficialEmail(scope, parsedInput.contact?.officialEmail);

    const now = new Date().toISOString();
    const staffId = createStaffId(parsedInput.employeeNumber);
    ensureValid(validateReportingManagerReference(scope, staffId, parsedInput.reportingManagerId, staffRecords));
    const staff: Staff = {
      ...scope,
      id: staffId,
      employeeNumber: parsedInput.employeeNumber,
      userId: parsedInput.userId,
      firstName: parsedInput.firstName,
      middleName: parsedInput.middleName,
      lastName: parsedInput.lastName,
      displayName: createStaffDisplayName(parsedInput),
      staffCategory: parsedInput.staffCategory,
      employmentType: parsedInput.employmentType,
      status: parsedInput.status,
      joiningDate: parsedInput.joiningDate,
      confirmationDate: parsedInput.confirmationDate,
      exitDate: parsedInput.exitDate,
      exitReason: parsedInput.exitReason,
      departmentId: parsedInput.departmentId,
      designationId: parsedInput.designationId,
      reportingManagerId: parsedInput.reportingManagerId,
      contact: parsedInput.contact,
      currentAddress: parsedInput.currentAddress,
      permanentAddress: parsedInput.permanentAddressSameAsCurrent ? parsedInput.currentAddress : parsedInput.permanentAddress,
      permanentAddressSameAsCurrent: parsedInput.permanentAddressSameAsCurrent,
      emergencyContacts: parsedInput.emergencyContacts,
      teachingInfo: parsedInput.staffCategory === "teaching" ? parsedInput.teachingInfo : undefined,
      createdAt: now,
      updatedAt: now,
    };

    staffRecords = [staff, ...staffRecords];
    return { ...staff };
  },

  async updateStaff(input) {
    const parsedInput = staffUpdateSchema.parse(input);
    const index = staffRecords.findIndex(
      (staff) =>
        staff.id === parsedInput.id &&
        staff.tenantId === parsedInput.tenantId &&
        staff.schoolId === parsedInput.schoolId &&
        (!parsedInput.campusId || staff.campusId === parsedInput.campusId) &&
        (!parsedInput.academicYearId || staff.academicYearId === parsedInput.academicYearId),
    );
    if (index === -1) throw new ApiError(404, "Staff member could not be found in the current staff scope.");

    const current = staffRecords[index];
    if (!current) throw new ApiError(404, "Staff member could not be found in the current staff scope.");

    const nextScope = {
      tenantId: current.tenantId,
      schoolId: current.schoolId,
      campusId: parsedInput.campusId ?? current.campusId,
      academicYearId: parsedInput.academicYearId ?? current.academicYearId,
    };
    const nextStatus = parsedInput.status ?? current.status;
    if (parsedInput.employeeNumber && parsedInput.employeeNumber !== current.employeeNumber) {
      ensureUniqueEmployeeNumber(nextScope, parsedInput.employeeNumber, current.id);
    }
    if (parsedInput.departmentId) {
      ensureValid(validateDepartmentReference(nextScope, parsedInput.departmentId, staffDepartments));
    }
    if (parsedInput.designationId) {
      ensureValid(validateDesignationReference(nextScope, parsedInput.designationId, staffDesignations));
    }
    if (parsedInput.status) {
      ensureValid(validateStaffStatusTransition(current.status, parsedInput.status));
    }
    if (parsedInput.userId !== undefined) {
      ensureUniqueUserLink(nextScope, parsedInput.userId, current.id);
    }
    if (parsedInput.contact?.officialEmail !== current.contact?.officialEmail) {
      ensureUniqueOfficialEmail(nextScope, parsedInput.contact?.officialEmail, current.id);
    }
    if (parsedInput.reportingManagerId !== undefined) {
      ensureValid(validateReportingManagerReference(nextScope, current.id, parsedInput.reportingManagerId, staffRecords));
    }

    const next: Staff = {
      ...current,
      campusId: nextScope.campusId,
      academicYearId: nextScope.academicYearId,
      employeeNumber: parsedInput.employeeNumber ?? current.employeeNumber,
      userId: parsedInput.userId === undefined ? current.userId : parsedInput.userId,
      firstName: parsedInput.firstName ?? current.firstName,
      middleName: parsedInput.middleName ?? current.middleName,
      lastName: parsedInput.lastName ?? current.lastName,
      staffCategory: parsedInput.staffCategory ?? current.staffCategory,
      employmentType: parsedInput.employmentType ?? current.employmentType,
      status: nextStatus,
      joiningDate: parsedInput.joiningDate ?? current.joiningDate,
      confirmationDate: parsedInput.confirmationDate === undefined ? current.confirmationDate : parsedInput.confirmationDate,
      exitDate: parsedInput.exitDate ?? current.exitDate,
      exitReason: parsedInput.exitReason ?? current.exitReason,
      departmentId: parsedInput.departmentId ?? current.departmentId,
      designationId: parsedInput.designationId ?? current.designationId,
      reportingManagerId: parsedInput.reportingManagerId === undefined ? current.reportingManagerId : parsedInput.reportingManagerId,
      contact: parsedInput.contact === undefined ? current.contact : parsedInput.contact,
      currentAddress: parsedInput.currentAddress === undefined ? current.currentAddress : parsedInput.currentAddress,
      permanentAddress: parsedInput.permanentAddressSameAsCurrent
        ? parsedInput.currentAddress ?? current.currentAddress
        : parsedInput.permanentAddress === undefined
          ? current.permanentAddress
          : parsedInput.permanentAddress,
      permanentAddressSameAsCurrent: parsedInput.permanentAddressSameAsCurrent === undefined ? current.permanentAddressSameAsCurrent : parsedInput.permanentAddressSameAsCurrent,
      emergencyContacts: parsedInput.emergencyContacts === undefined ? current.emergencyContacts : parsedInput.emergencyContacts,
      teachingInfo: (parsedInput.staffCategory ?? current.staffCategory) === "teaching"
        ? parsedInput.teachingInfo === undefined ? current.teachingInfo : parsedInput.teachingInfo
        : undefined,
      updatedAt: new Date().toISOString(),
    };
    next.displayName = createStaffDisplayName(next);
    ensureValid(validateStaffEmploymentDates(next));
    ensureValid(validateConfirmationDate(next));

    staffRecords = staffRecords.map((staff) => staff.id === next.id ? next : staff);
    return { ...next };
  },

  async changeStaffStatus(input) {
    const parsedInput = staffStatusChangeSchema.parse(input);
    const current = staffRecords.find((staff) => staff.id === parsedInput.staffId && isSameScope(staff, parsedInput));
    if (!current) throw new ApiError(404, "Staff member could not be found in the current staff scope.");

    ensureValid(validateStaffStatusTransition(current.status, parsedInput.status));
    const next: Staff = {
      ...current,
      status: parsedInput.status,
      exitDate: parsedInput.exitDate,
      exitReason: parsedInput.exitReason,
      updatedAt: new Date().toISOString(),
    };
    ensureValid(validateStaffEmploymentDates(next));

    staffRecords = staffRecords.map((staff) => staff.id === next.id ? next : staff);
    return { ...next };
  },
};

export const staffService = {
  listStaff(scope: TenantScopedQuery, filters?: StaffFilters) {
    return mockStaffRepository.listStaff(scope, filters);
  },
  getStaffById(scope: TenantScopedQuery, staffId: string) {
    return mockStaffRepository.getStaffById(scope, staffId);
  },
  getDepartments(scope: TenantScopedQuery, filters?: StaffOrgEntityFilters) {
    return mockStaffRepository.getDepartments(scope, filters);
  },
  getDesignations(scope: TenantScopedQuery, filters?: StaffOrgEntityFilters) {
    return mockStaffRepository.getDesignations(scope, filters);
  },
  createDepartment(input: StaffDepartmentInput) {
    return mockStaffRepository.createDepartment(input);
  },
  updateDepartment(input: StaffDepartmentInput & { id: string }) {
    return mockStaffRepository.updateDepartment(input);
  },
  deactivateDepartment(scope: TenantScopedQuery, departmentId: string) {
    return mockStaffRepository.deactivateDepartment(scope, departmentId);
  },
  createDesignation(input: StaffDesignationInput) {
    return mockStaffRepository.createDesignation(input);
  },
  updateDesignation(input: StaffDesignationInput & { id: string }) {
    return mockStaffRepository.updateDesignation(input);
  },
  deactivateDesignation(scope: TenantScopedQuery, designationId: string) {
    return mockStaffRepository.deactivateDesignation(scope, designationId);
  },
  createStaff(input: StaffCreateInput) {
    return mockStaffRepository.createStaff(input);
  },
  updateStaff(input: StaffUpdateInput) {
    return mockStaffRepository.updateStaff(input);
  },
  changeStaffStatus(input: StaffStatusChangeInput) {
    return mockStaffRepository.changeStaffStatus(input);
  },
};

function toStaffProfile(staff: Staff): StaffProfile {
  const summary = toStaffSummary(staff, staffDepartments, staffDesignations);
  return {
    ...staff,
    departmentName: summary.departmentName,
    designationName: summary.designationName,
    reportingManagerName: staff.reportingManagerId ? staffRecords.find((item) => item.id === staff.reportingManagerId && isSameScope(item, staff))?.displayName : undefined,
  };
}

function scopeFromInput(input: TenantScopedQuery): TenantScopedQuery {
  return {
    tenantId: input.tenantId,
    schoolId: input.schoolId,
    campusId: input.campusId,
    academicYearId: input.academicYearId,
  };
}

function ensureUniqueEmployeeNumber(scope: TenantScopedQuery, employeeNumber: string, currentStaffId?: string) {
  const duplicate = staffRecords.find(
    (staff) =>
      staff.tenantId === scope.tenantId &&
      staff.employeeNumber.toLowerCase() === employeeNumber.toLowerCase() &&
      staff.id !== currentStaffId,
  );
  if (duplicate) throw new ApiError(409, "Employee number already exists for this tenant.");
}

function ensureUniqueUserLink(scope: TenantScopedQuery, userId?: string | null, currentStaffId?: string) {
  if (!userId) return;
  const duplicate = staffRecords.find(
    (staff) => staff.tenantId === scope.tenantId && staff.userId === userId && staff.id !== currentStaffId,
  );
  if (duplicate) throw new ApiError(409, "User account is already linked to another staff member in this tenant.");
}

function ensureUniqueOfficialEmail(scope: TenantScopedQuery, officialEmail?: string, currentStaffId?: string) {
  if (!officialEmail) return;
  const duplicate = staffRecords.find(
    (staff) =>
      staff.tenantId === scope.tenantId &&
      staff.contact?.officialEmail?.toLowerCase() === officialEmail.toLowerCase() &&
      staff.id !== currentStaffId,
  );
  if (duplicate) throw new ApiError(409, "Official email is already used by another staff member in this tenant.");
}

function ensureUniqueDepartment(scope: TenantScopedQuery, name: string, code: string, currentId?: string) {
  const duplicate = staffDepartments.find(
    (department) =>
      department.tenantId === scope.tenantId &&
      department.id !== currentId &&
      (department.name.toLowerCase() === name.toLowerCase() || department.code.toLowerCase() === code.toLowerCase()),
  );
  if (duplicate) throw new ApiError(409, "Department name or code already exists for this tenant.");
}

function ensureUniqueDesignation(scope: TenantScopedQuery, name: string, code: string, currentId?: string) {
  const duplicate = staffDesignations.find(
    (designation) =>
      designation.tenantId === scope.tenantId &&
      designation.id !== currentId &&
      (designation.name.toLowerCase() === name.toLowerCase() || designation.code.toLowerCase() === code.toLowerCase()),
  );
  if (duplicate) throw new ApiError(409, "Designation name or code already exists for this tenant.");
}

function ensureValid(result: { valid: true } | { valid: false; message: string }) {
  if (!result.valid) throw new ApiError(422, result.message);
}

function getStaffRecord(staffId: string) {
  return staffRecords.find((staff) => staff.id === staffId);
}

function compareStaff(
  first: StaffSummary,
  second: StaffSummary,
  sortBy: StaffSortBy,
  sortDirection: "asc" | "desc",
) {
  const result = String(first[sortBy] ?? "").localeCompare(String(second[sortBy] ?? ""), "en-IN", {
    numeric: true,
    sensitivity: "base",
  });
  return sortDirection === "asc" ? result : -result;
}

function createStaffId(employeeNumber: string) {
  return `staff-${employeeNumber}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createOrgId(prefix: string, name: string) {
  return `${prefix}-${name}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}
