"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/components/shared/permission-gate";
import {
  academicClassCreateSchema,
  academicClassUpdateSchema,
  academicYearCreateSchema,
  academicYearUpdateSchema,
  sectionCreateSchema,
  sectionUpdateSchema,
} from "@/features/academic-structure/schemas/academic-structure.schema";
import type { AcademicStructureStatus, AcademicYearStatus } from "@/features/academic-structure/types/academic-structure";
import { ApiError } from "@/lib/api/client";
import { academicStructureService } from "@/lib/api/academic-structure";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export type AcademicActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

const idleState: AcademicActionState = { status: "idle" };

export async function createAcademicYearAction(_state: AcademicActionState = idleState, formData: FormData): Promise<AcademicActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to create academic years." };
  }

  const yearId = createAcademicYearId(getString(formData, "name"));
  const parsed = academicYearCreateSchema.safeParse({
    ...scope(yearId),
    id: yearId,
    name: getString(formData, "name"),
    startDate: getString(formData, "startDate"),
    endDate: getString(formData, "endDate"),
    status: getString(formData, "status") as AcademicYearStatus,
    isCurrent: formData.get("isCurrent") === "on",
  });

  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);

  try {
    await academicStructureService.createAcademicYear(parsed.data);
  } catch (error) {
    return toActionError(error, "Academic year could not be created.");
  }

  revalidateAcademicRoutes();
  redirect("/academics/academic-years?created=1");
}

export async function updateAcademicYearAction(_state: AcademicActionState = idleState, formData: FormData): Promise<AcademicActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to update academic years." };
  }

  const academicYearId = getString(formData, "id");
  const parsed = academicYearUpdateSchema.safeParse({
    ...scope(academicYearId),
    id: academicYearId,
    name: getString(formData, "name"),
    startDate: getString(formData, "startDate"),
    endDate: getString(formData, "endDate"),
    status: getString(formData, "status") as AcademicYearStatus,
    isCurrent: formData.get("isCurrent") === "on",
  });

  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);

  try {
    await academicStructureService.updateAcademicYear(parsed.data);
  } catch (error) {
    return toActionError(error, "Academic year could not be updated.");
  }

  revalidateAcademicRoutes();
  redirect("/academics/academic-years?updated=1");
}

export async function archiveAcademicYearAction(_state: AcademicActionState = idleState, formData: FormData): Promise<AcademicActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to archive academic years." };
  }

  const academicYearId = getString(formData, "id");
  try {
    await academicStructureService.archiveAcademicYear(scope(academicYearId), academicYearId);
  } catch (error) {
    return toActionError(error, "Academic year could not be archived.");
  }

  revalidateAcademicRoutes();
  redirect("/academics/academic-years?archived=1");
}

export async function createAcademicClassAction(_state: AcademicActionState = idleState, formData: FormData): Promise<AcademicActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to create classes." };
  }

  const academicYearId = getString(formData, "academicYearId");
  const parsed = academicClassCreateSchema.safeParse({
    ...scope(academicYearId),
    code: getString(formData, "code"),
    displayName: getString(formData, "displayName"),
    sortOrder: getNumber(formData, "sortOrder"),
    status: getString(formData, "status") as AcademicStructureStatus,
  });

  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);

  try {
    await academicStructureService.createClass(parsed.data);
  } catch (error) {
    return toActionError(error, "Class could not be created.");
  }

  revalidateAcademicRoutes();
  redirect(`/academics/classes?academicYearId=${encodeURIComponent(academicYearId)}&created=1`);
}

export async function updateAcademicClassAction(_state: AcademicActionState = idleState, formData: FormData): Promise<AcademicActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to update classes." };
  }

  const academicYearId = getString(formData, "academicYearId");
  const parsed = academicClassUpdateSchema.safeParse({
    ...scope(academicYearId),
    id: getString(formData, "id"),
    code: getString(formData, "code"),
    displayName: getString(formData, "displayName"),
    sortOrder: getNumber(formData, "sortOrder"),
    status: getString(formData, "status") as AcademicStructureStatus,
  });

  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);

  try {
    await academicStructureService.updateClass(parsed.data);
  } catch (error) {
    return toActionError(error, "Class could not be updated.");
  }

  revalidateAcademicRoutes();
  redirect(`/academics/classes?academicYearId=${encodeURIComponent(academicYearId)}&updated=1`);
}

export async function archiveAcademicClassAction(_state: AcademicActionState = idleState, formData: FormData): Promise<AcademicActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to archive classes." };
  }

  const academicYearId = getString(formData, "academicYearId");
  try {
    await academicStructureService.archiveClass(scope(academicYearId), getString(formData, "id"));
  } catch (error) {
    return toActionError(error, "Class could not be archived.");
  }

  revalidateAcademicRoutes();
  redirect(`/academics/classes?academicYearId=${encodeURIComponent(academicYearId)}&archived=1`);
}

export async function createSectionAction(_state: AcademicActionState = idleState, formData: FormData): Promise<AcademicActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to create sections." };
  }

  const academicYearId = getString(formData, "academicYearId");
  const parsed = sectionCreateSchema.safeParse({
    ...scope(academicYearId),
    classId: getString(formData, "classId"),
    name: getString(formData, "name"),
    displayName: getString(formData, "displayName"),
    capacity: getOptionalNumber(formData, "capacity"),
    roomId: getOptionalString(formData, "roomId"),
    classTeacherId: getOptionalString(formData, "classTeacherId"),
    status: getString(formData, "status") as AcademicStructureStatus,
  });

  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);

  try {
    await academicStructureService.createSection(parsed.data);
  } catch (error) {
    return toActionError(error, "Section could not be created.");
  }

  revalidateAcademicRoutes();
  redirect(`/academics/sections?academicYearId=${encodeURIComponent(academicYearId)}&classId=${encodeURIComponent(parsed.data.classId)}&created=1`);
}

export async function updateSectionAction(_state: AcademicActionState = idleState, formData: FormData): Promise<AcademicActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to update sections." };
  }

  const academicYearId = getString(formData, "academicYearId");
  const sectionId = getString(formData, "id");
  const parsed = sectionUpdateSchema.safeParse({
    ...scope(academicYearId),
    id: sectionId,
    name: getString(formData, "name"),
    displayName: getString(formData, "displayName"),
    capacity: getOptionalNumber(formData, "capacity"),
    roomId: getOptionalString(formData, "roomId"),
    classTeacherId: getOptionalString(formData, "classTeacherId"),
    status: getString(formData, "status") as AcademicStructureStatus,
  });

  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);

  try {
    await academicStructureService.updateSection(parsed.data);
  } catch (error) {
    return toActionError(error, "Section could not be updated.");
  }

  revalidateAcademicRoutes();
  redirect(`/academics/sections/${encodeURIComponent(sectionId)}?updated=1`);
}

export async function archiveSectionAction(_state: AcademicActionState = idleState, formData: FormData): Promise<AcademicActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to archive sections." };
  }

  const academicYearId = getString(formData, "academicYearId");
  const sectionId = getString(formData, "id");
  try {
    await academicStructureService.archiveSection(scope(academicYearId), sectionId);
  } catch (error) {
    return toActionError(error, "Section could not be archived.");
  }

  revalidateAcademicRoutes();
  redirect(`/academics/sections/${encodeURIComponent(sectionId)}?archived=1`);
}

export async function restoreSectionAction(_state: AcademicActionState = idleState, formData: FormData): Promise<AcademicActionState> {
  void _state;
  if (!hasPermission(currentSessionRole, "academic.manage")) {
    return { status: "error", message: "You do not have permission to restore sections." };
  }

  const academicYearId = getString(formData, "academicYearId");
  const sectionId = getString(formData, "id");
  try {
    await academicStructureService.restoreSection(scope(academicYearId), sectionId);
  } catch (error) {
    return toActionError(error, "Section could not be restored.");
  }

  revalidateAcademicRoutes();
  redirect(`/academics/sections/${encodeURIComponent(sectionId)}?restored=1`);
}

function scope(academicYearId = tenantContext.academicYearId) {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId,
  };
}

function revalidateAcademicRoutes() {
  revalidatePath("/academics/academic-years");
  revalidatePath("/academics/classes");
  revalidatePath("/academics/sections");
  revalidatePath("/students/new");
  revalidatePath("/attendance");
}

function validationError(errors: Record<string, string[] | undefined>): AcademicActionState {
  return {
    status: "error",
    message: "Please review the highlighted fields.",
    fieldErrors: Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, value?.[0]])),
  };
}

function toActionError(error: unknown, fallback: string): AcademicActionState {
  if (error instanceof ApiError) return { status: "error", message: error.message };
  return { status: "error", message: fallback };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || undefined;
}

function getNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : undefined;
}

function getOptionalNumber(formData: FormData, key: string) {
  const rawValue = getString(formData, key);
  if (!rawValue) return undefined;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : undefined;
}

function createAcademicYearId(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized ? `ay-${normalized}` : "";
}
