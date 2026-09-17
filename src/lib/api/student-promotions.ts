import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { academicStructureService } from "@/lib/api/academic-structure";
import { studentPlacementService } from "@/lib/api/student-placements";
import { mockStudents } from "@/features/students/services/mock-students";
import { mockStudentPromotions } from "@/features/student-promotions/services/mock-student-promotions";
import {
  studentPromotionApplySchema,
  studentPromotionCreateSchema,
  studentPromotionFiltersSchema,
  studentPromotionUpdateSchema,
  transitionReadinessQuerySchema,
} from "@/features/student-promotions/schemas/student-promotion.schema";
import {
  buildReadiness,
  isSameTenantSchoolCampus,
  proposeMatchingSection,
  proposeNextClass,
  validatePromotion,
} from "@/features/student-promotions/services/student-promotion-rules";
import type {
  StudentPromotion,
  StudentPromotionApplyInput,
  StudentPromotionCreateInput,
  StudentPromotionFilters,
  StudentPromotionListResponse,
  StudentPromotionReadModel,
  StudentPromotionUpdateInput,
  TransitionReadiness,
} from "@/features/student-promotions/types/student-promotion";
import type { StudentAcademicPlacementReadModel } from "@/features/student-placements/types/student-placement";

let promotionRecords = [...mockStudentPromotions];

export const studentPromotionService = {
  async getTransitionReadiness(scope: TenantScopedQuery, sourceAcademicYearId: string, targetAcademicYearId: string): Promise<TransitionReadiness> {
    const parsed = transitionReadinessQuerySchema.parse({ ...scope, sourceAcademicYearId, targetAcademicYearId });
    const sourceScope = { ...scope, academicYearId: parsed.sourceAcademicYearId };
    const targetScope = { ...scope, academicYearId: parsed.targetAcademicYearId };
    const [sourceYear, targetYear, sourcePlacements] = await Promise.all([
      academicStructureService.getAcademicYear(sourceScope, parsed.sourceAcademicYearId),
      academicStructureService.getAcademicYear(targetScope, parsed.targetAcademicYearId),
      studentPlacementService.getStudentsByPlacement(sourceScope, { status: "active", page: 1, pageSize: 100 }),
    ]);
    const promotions = promotionRecords.filter((promotion) => isSameTenantSchoolCampus(promotion, scope) && promotion.sourceAcademicYearId === parsed.sourceAcademicYearId && promotion.targetAcademicYearId === parsed.targetAcademicYearId);
    const summary = {
      students: sourcePlacements.total,
      eligible: promotions.filter((promotion) => promotion.status === "eligible").length,
      requiresReview: promotions.filter((promotion) => promotion.status === "requires_review").length,
      promoted: promotions.filter((promotion) => promotion.status === "promoted").length,
      retained: promotions.filter((promotion) => promotion.status === "retained").length,
      transferred: promotions.filter((promotion) => promotion.status === "transferred").length,
      withdrawn: promotions.filter((promotion) => promotion.status === "withdrawn").length,
    };
    return buildReadiness(parsed.sourceAcademicYearId, parsed.targetAcademicYearId, sourceYear ?? undefined, targetYear ?? undefined, summary);
  },

  async getPromotions(scope: TenantScopedQuery, filters: StudentPromotionFilters = {}): Promise<StudentPromotionListResponse> {
    const parsed = studentPromotionFiltersSchema.parse(filters);
    const sourceAcademicYearId = parsed.sourceAcademicYearId ?? scope.academicYearId;
    const targetAcademicYearId = parsed.targetAcademicYearId ?? "ay-2027-28";
    const readiness = await this.getTransitionReadiness(scope, sourceAcademicYearId, targetAcademicYearId);
    await ensureDefaultPromotions(scope, sourceAcademicYearId, targetAcademicYearId);
    const query = parsed.query?.toLowerCase().trim();
    const readModels = await Promise.all(
      promotionRecords
        .filter((promotion) => isSameTenantSchoolCampus(promotion, scope))
        .filter((promotion) => promotion.sourceAcademicYearId === sourceAcademicYearId)
        .filter((promotion) => promotion.targetAcademicYearId === targetAcademicYearId || promotion.status === "retained")
        .filter((promotion) => !parsed.status || promotion.status === parsed.status)
        .filter((promotion) => !parsed.classId || promotion.sourceClassId === parsed.classId || promotion.targetClassId === parsed.classId)
        .filter((promotion) => !parsed.sectionId || promotion.sourceSectionId === parsed.sectionId || promotion.targetSectionId === parsed.sectionId)
        .map((promotion) => toReadModel(scope, promotion)),
    );
    const filtered = readModels
      .filter((promotion): promotion is StudentPromotionReadModel => Boolean(promotion))
      .filter((promotion) => !query || [
        promotion.studentName,
        promotion.admissionNumber,
        promotion.sourceClassName,
        promotion.sourceSectionName,
        promotion.targetClassName,
        promotion.targetSectionName,
        promotion.status,
        promotion.reason,
      ].filter(Boolean).join(" ").toLowerCase().includes(query))
      .sort((first, second) => comparePromotions(first, second, parsed.sortBy, parsed.sortDirection));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize));
    const start = (parsed.page - 1) * parsed.pageSize;
    return {
      items: filtered.slice(start, start + parsed.pageSize),
      total,
      page: parsed.page,
      pageSize: parsed.pageSize,
      totalPages,
      readiness,
    };
  },

  async getPromotion(scope: TenantScopedQuery, promotionId: string): Promise<StudentPromotionReadModel | null> {
    if (!/^[a-z0-9_-]{3,160}$/i.test(promotionId)) return null;
    const promotion = promotionRecords.find((record) => record.id === promotionId && isSameTenantSchoolCampus(record, scope));
    return promotion ? toReadModel(scope, promotion) : null;
  },

  async createPromotion(input: StudentPromotionCreateInput): Promise<StudentPromotionReadModel> {
    const parsed = studentPromotionCreateSchema.parse(input);
    const existing = promotionRecords.find((promotion) =>
      promotion.studentId === parsed.studentId &&
      promotion.sourceAcademicYearId === parsed.sourceAcademicYearId &&
      promotion.targetAcademicYearId === parsed.targetAcademicYearId &&
      isSameTenantSchoolCampus(promotion, parsed)
    );
    if (existing) {
      const readExisting = await toReadModel(parsed, existing);
      if (!readExisting) throw new ApiError(422, "Existing promotion could not be read.");
      return readExisting;
    }
    const sourceScope = { ...parsed, academicYearId: parsed.sourceAcademicYearId };
    const sourcePlacement = await studentPlacementService.getActiveStudentPlacement(sourceScope, parsed.studentId, parsed.sourceAcademicYearId);
    if (!sourcePlacement) throw new ApiError(422, "Student does not have an active source-year placement.");
    const now = new Date().toISOString();
    const promotion: StudentPromotion = {
      tenantId: parsed.tenantId,
      schoolId: parsed.schoolId,
      campusId: parsed.campusId,
      academicYearId: parsed.sourceAcademicYearId,
      id: createPromotionId(parsed.studentId, parsed.sourceAcademicYearId, parsed.targetAcademicYearId),
      studentId: parsed.studentId,
      sourceAcademicYearId: parsed.sourceAcademicYearId,
      sourceClassId: sourcePlacement.classId,
      sourceSectionId: sourcePlacement.sectionId,
      sourcePlacementId: sourcePlacement.id,
      targetAcademicYearId: parsed.targetAcademicYearId,
      targetClassId: parsed.targetClassId,
      targetSectionId: parsed.targetSectionId,
      status: "pending",
      reason: parsed.reason,
      notes: parsed.notes,
      proposedAt: now,
      proposedBy: parsed.proposedBy,
      promotionSource: parsed.promotionSource ?? "individual",
      batchCorrelationId: parsed.batchCorrelationId,
      createdAt: now,
      updatedAt: now,
    };
    const validation = (await toReadModel(parsed, promotion))?.validation;
    if (!validation) throw new ApiError(422, "Promotion could not be validated.");
    promotion.status = validation.valid ? "eligible" : "requires_review";
    promotionRecords = [promotion, ...promotionRecords];
    const readModel = await toReadModel(parsed, promotion);
    if (!readModel) throw new ApiError(422, "Promotion could not be converted into a readable planning record.");
    return readModel;
  },

  async updatePromotion(input: StudentPromotionUpdateInput): Promise<StudentPromotionReadModel> {
    const parsed = studentPromotionUpdateSchema.parse(input);
    const current = getPromotionOrThrow(parsed, parsed.id);
    if (current.status === "promoted") throw new ApiError(422, "Promoted records cannot be structurally edited.");
    const next: StudentPromotion = {
      ...current,
      targetClassId: parsed.targetClassId ?? current.targetClassId,
      targetSectionId: parsed.targetSectionId ?? current.targetSectionId,
      reason: parsed.reason ?? current.reason,
      notes: parsed.notes ?? current.notes,
      reviewedBy: parsed.reviewedBy ?? current.reviewedBy,
      reviewedAt: parsed.reviewedBy ? new Date().toISOString() : current.reviewedAt,
      updatedAt: new Date().toISOString(),
    };
    const validation = (await toReadModel(parsed, next))?.validation;
    if (!validation) throw new ApiError(422, "Promotion could not be validated.");
    next.status = parsed.status ?? (validation.valid ? "eligible" : "requires_review");
    promotionRecords = promotionRecords.map((promotion) => promotion.id === next.id ? next : promotion);
    const readModel = await toReadModel(parsed, next);
    if (!readModel) throw new ApiError(422, "Promotion could not be updated.");
    return readModel;
  },

  async applyPromotion(input: StudentPromotionApplyInput): Promise<StudentPromotionReadModel> {
    const parsed = studentPromotionApplySchema.parse(input);
    const current = getPromotionOrThrow(parsed, parsed.id);
    if (current.status === "promoted") throw new ApiError(422, "Promotion has already been applied.");
    if (!["eligible", "pending"].includes(current.status)) throw new ApiError(422, "Only eligible promotion records can be applied.");
    const readModel = await toReadModel(parsed, current);
    if (!readModel) throw new ApiError(404, "Promotion could not be found in the current scope.");
    if (!readModel.validation.valid) {
      markRequiresReview(current, "Promotion became stale before apply.");
      throw new ApiError(422, "Promotion must be reviewed before it can be applied.");
    }
    if (!current.targetClassId || !current.targetSectionId) throw new ApiError(422, "Target class and section are required before applying promotion.");
    const sourceScope = { ...parsed, academicYearId: current.sourceAcademicYearId };
    const targetScope = { ...parsed, academicYearId: current.targetAcademicYearId };
    const activeSource = await studentPlacementService.getActiveStudentPlacement(sourceScope, current.studentId, current.sourceAcademicYearId);
    if (!activeSource || activeSource.id !== current.sourcePlacementId) {
      markRequiresReview(current, "Source placement changed after promotion planning.");
      throw new ApiError(409, "Source placement changed after planning. Review the promotion again.");
    }
    const existingTarget = await studentPlacementService.getActiveStudentPlacement(targetScope, current.studentId, current.targetAcademicYearId);
    if (existingTarget) {
      markRequiresReview(current, "Target-year placement already exists.");
      throw new ApiError(409, "Student already has an active target-year placement.");
    }

    await studentPlacementService.endStudentPlacement({
      ...sourceScope,
      id: current.sourcePlacementId,
      endDate: previousIsoDate(parsed.startDate),
      reason: current.reason === "student_transfer" ? "student_transfer" : "class_change",
    });
    await studentPlacementService.createStudentPlacement({
      ...targetScope,
      studentId: current.studentId,
      classId: current.targetClassId,
      sectionId: current.targetSectionId,
      status: "active",
      startDate: parsed.startDate,
      reason: "class_change",
      notes: parsed.notes || current.notes,
    });

    const next: StudentPromotion = {
      ...current,
      status: "promoted",
      appliedAt: new Date().toISOString(),
      appliedBy: parsed.appliedBy,
      updatedAt: new Date().toISOString(),
    };
    promotionRecords = promotionRecords.map((promotion) => promotion.id === next.id ? next : promotion);
    const applied = await toReadModel(parsed, next);
    if (!applied) throw new ApiError(422, "Promotion was applied but could not be read back.");
    return applied;
  },
};

async function ensureDefaultPromotions(scope: TenantScopedQuery, sourceAcademicYearId: string, targetAcademicYearId: string) {
  const sourceScope = { ...scope, academicYearId: sourceAcademicYearId };
  const sourcePlacements = await studentPlacementService.getStudentsByPlacement(sourceScope, { status: "active", page: 1, pageSize: 100 });
  const [targetClasses, targetSections] = await Promise.all([
    academicStructureService.getClasses({ ...scope, academicYearId: targetAcademicYearId }, { status: "active", sortBy: "sortOrder" }),
    academicStructureService.getSections({ ...scope, academicYearId: targetAcademicYearId }, { status: "active" }),
  ]);
  for (const placement of sourcePlacements.items) {
    if (promotionRecords.some((promotion) => promotion.studentId === placement.studentId && promotion.sourceAcademicYearId === sourceAcademicYearId)) continue;
    const targetClass = proposeNextClass({ id: placement.classId, code: placement.className, displayName: placement.className, sortOrder: 0, status: "active", createdAt: "", updatedAt: "", tenantId: scope.tenantId, schoolId: scope.schoolId, campusId: scope.campusId, academicYearId: sourceAcademicYearId }, targetClasses);
    const targetSection = targetClass ? proposeMatchingSection({ id: placement.sectionId, classId: placement.classId, name: placement.sectionName, displayName: placement.sectionName, status: "active", createdAt: "", updatedAt: "", tenantId: scope.tenantId, schoolId: scope.schoolId, campusId: scope.campusId, academicYearId: sourceAcademicYearId }, targetSections.filter((section) => section.classId === targetClass.id)) : undefined;
    const now = new Date().toISOString();
    const promotion: StudentPromotion = {
      tenantId: scope.tenantId,
      schoolId: scope.schoolId,
      campusId: scope.campusId,
      academicYearId: sourceAcademicYearId,
      id: createPromotionId(placement.studentId, sourceAcademicYearId, targetAcademicYearId),
      studentId: placement.studentId,
      sourceAcademicYearId,
      sourceClassId: placement.classId,
      sourceSectionId: placement.sectionId,
      sourcePlacementId: placement.id,
      targetAcademicYearId,
      targetClassId: targetClass?.id,
      targetSectionId: targetSection?.id,
      status: targetClass && targetSection ? "pending" : "requires_review",
      reason: targetClass && targetSection ? "annual_promotion" : "manual_review",
      notes: targetClass && targetSection ? "Auto-proposed for review." : "Target class or matching section could not be resolved.",
      proposedAt: now,
      proposedBy: "system-proposal",
      createdAt: now,
      updatedAt: now,
    };
    promotionRecords = [...promotionRecords, promotion];
  }
}

async function toReadModel(scope: TenantScopedQuery, promotion: StudentPromotion): Promise<StudentPromotionReadModel | null> {
  const sourceScope = { ...scope, academicYearId: promotion.sourceAcademicYearId };
  const targetScope = { ...scope, academicYearId: promotion.targetAcademicYearId };
  const [sourcePlacements, sourceYear, targetYear, sourceClass, sourceSection, targetClass, targetSection, existingTargetPlacement] = await Promise.all([
    studentPlacementService.getStudentsByPlacement(sourceScope, { studentId: promotion.studentId, allAcademicYears: true, page: 1, pageSize: 100 }),
    academicStructureService.getAcademicYear(sourceScope, promotion.sourceAcademicYearId),
    academicStructureService.getAcademicYear(targetScope, promotion.targetAcademicYearId),
    academicStructureService.getClass(sourceScope, promotion.sourceClassId),
    academicStructureService.getSection(sourceScope, promotion.sourceSectionId),
    promotion.targetClassId ? academicStructureService.getClass(targetScope, promotion.targetClassId) : Promise.resolve(null),
    promotion.targetSectionId ? academicStructureService.getSection(targetScope, promotion.targetSectionId) : Promise.resolve(null),
    studentPlacementService.getActiveStudentPlacement(targetScope, promotion.studentId, promotion.targetAcademicYearId),
  ]);
  const sourcePlacement = sourcePlacements.items.find((placement) => placement.id === promotion.sourcePlacementId) ?? sourcePlacements.items.find((placement) => placement.academicYearId === promotion.sourceAcademicYearId);
  const student = mockStudents.find((record) => record.id === promotion.studentId && isSameTenantSchoolCampus(record, scope));
  if (!sourcePlacement || !student || !sourceYear || !targetYear || !sourceClass || !sourceSection) return null;
  const targetRoster = promotion.targetSectionId ? await studentPlacementService.getSectionRoster(targetScope, promotion.targetSectionId).catch(() => undefined) : undefined;
  const validation = validatePromotion({
    placement: sourcePlacement,
    sourceClass,
    sourceSection,
    targetYear,
    targetClass: targetClass ?? undefined,
    targetSection: targetSection ?? undefined,
    targetRoster,
    existingTargetPlacement: existingTargetPlacement ? await placementToReadModel(targetScope, existingTargetPlacement.id, promotion.studentId) : undefined,
  });
  return {
    ...promotion,
    studentName: student.displayName,
    admissionNumber: student.admissionNumber,
    sourceAcademicYearName: sourceYear.name,
    sourceClassName: sourceClass.displayName,
    sourceSectionName: sourceSection.displayName,
    sourcePlacementStartDate: sourcePlacement.startDate,
    sourcePlacementEndDate: sourcePlacement.endDate,
    targetAcademicYearName: targetYear.name,
    targetClassName: targetClass?.displayName,
    targetSectionName: targetSection?.displayName,
    validation,
  };
}

async function placementToReadModel(scope: TenantScopedQuery, placementId: string, studentId: string): Promise<StudentAcademicPlacementReadModel | undefined> {
  const placements = await studentPlacementService.getStudentsByPlacement(scope, { studentId, allAcademicYears: true, page: 1, pageSize: 100 });
  return placements.items.find((placement) => placement.id === placementId);
}

function getPromotionOrThrow(scope: TenantScopedQuery, promotionId: string) {
  const promotion = promotionRecords.find((record) => record.id === promotionId && isSameTenantSchoolCampus(record, scope));
  if (!promotion) throw new ApiError(404, "Promotion record could not be found in the current scope.");
  return promotion;
}

function markRequiresReview(promotion: StudentPromotion, notes: string) {
  promotionRecords = promotionRecords.map((record) => record.id === promotion.id ? { ...record, status: "requires_review", notes, updatedAt: new Date().toISOString() } : record);
}

function comparePromotions(first: StudentPromotionReadModel, second: StudentPromotionReadModel, sortBy: NonNullable<StudentPromotionFilters["sortBy"]>, sortDirection: "asc" | "desc") {
  const firstValue = first[sortBy] ?? "";
  const secondValue = second[sortBy] ?? "";
  const result = String(firstValue).localeCompare(String(secondValue), "en-IN", { numeric: true, sensitivity: "base" });
  return sortDirection === "asc" ? result : -result;
}

function createPromotionId(studentId: string, sourceAcademicYearId: string, targetAcademicYearId: string) {
  return `promo-${studentId}-${sourceAcademicYearId}-${targetAcademicYearId}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function previousIsoDate(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}
