import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { staffService } from "@/lib/api/staff";
import {
  staffGoalSchema,
  staffHrNoteSchema,
  staffPerformanceFiltersSchema,
  staffPerformanceReviewSchema,
  staffStatusTransitionSchema,
  staffTrainingSchema,
} from "@/features/staff-performance/schemas/staff-performance.schema";
import {
  canTransitionGoalStatus,
  canTransitionReviewStatus,
  canTransitionTrainingStatus,
  getStatusTone,
} from "@/features/staff-performance/services/staff-performance-rules";
import {
  mockPerformanceReviews,
  mockStaffDisciplinaryRecords,
  mockStaffGoals,
  mockStaffHrNotes,
  mockStaffQualifications,
  mockStaffRecognition,
  mockStaffSkills,
  mockStaffTraining,
} from "@/features/staff-performance/services/mock-staff-performance";
import type {
  StaffGoal,
  StaffGoalInput,
  StaffHrNote,
  StaffHrNoteInput,
  StaffHrTimelineEvent,
  StaffPerformanceDashboard,
  StaffPerformanceFilters,
  StaffPerformanceReview,
  StaffPerformanceReviewInput,
  StaffPerformanceReviewListItem,
  StaffPerformanceSummary,
  StaffStatusTransitionInput,
  StaffTraining,
  StaffTrainingInput,
} from "@/features/staff-performance/types/staff-performance";

let performanceReviews = [...mockPerformanceReviews];
let staffGoals = [...mockStaffGoals];
let staffTraining = [...mockStaffTraining];
let staffHrNotes = [...mockStaffHrNotes];

export const staffPerformanceService = {
  async getDashboard(scope: TenantScopedQuery): Promise<StaffPerformanceDashboard> {
    const staff = await staffService.listStaff(scope, { page: 1, pageSize: 100 });
    const scopedReviews = performanceReviews.filter((review) => isSameScope(review, scope));
    const scopedGoals = staffGoals.filter((goal) => isSameScope(goal, scope));
    const scopedTraining = staffTraining.filter((training) => isSameScope(training, scope));
    const scopedDisciplinary = mockStaffDisciplinaryRecords.filter((record) => isSameScope(record, scope));

    return {
      totalStaff: staff.total,
      activeStaff: staff.items.filter((item) => item.status === "active").length,
      onLeave: staff.items.filter((item) => item.status === "on_leave").length,
      upcomingReviews: scopedReviews.filter((review) => review.status === "scheduled").length,
      reviewsPending: scopedReviews.filter((review) => ["draft", "scheduled", "in_progress", "submitted"].includes(review.status)).length,
      goalsInProgress: scopedGoals.filter((goal) => goal.status === "in_progress").length,
      trainingInProgress: scopedTraining.filter((training) => ["enrolled", "in_progress", "planned"].includes(training.status)).length,
      openHrActions: scopedDisciplinary.filter((record) => ["open", "under_review"].includes(record.status)).length,
    };
  },

  async listReviews(scope: TenantScopedQuery, filters: StaffPerformanceFilters = {}) {
    const parsed = staffPerformanceFiltersSchema.parse(filters);
    const staffList = await staffService.listStaff(scope, { page: 1, pageSize: 100 });
    const query = parsed.query?.toLowerCase();
    const enriched = performanceReviews
      .filter((review) => isSameScope(review, scope))
      .filter((review) => !parsed.staffId || review.staffId === parsed.staffId)
      .filter((review) => !parsed.status || review.status === parsed.status)
      .filter((review) => !parsed.reviewType || review.reviewType === parsed.reviewType)
      .map((review): StaffPerformanceReviewListItem | undefined => {
        const staff = staffList.items.find((item) => item.id === review.staffId);
        if (!staff) return undefined;
        return { ...review, staffName: staff.displayName, employeeNumber: staff.employeeNumber, departmentName: staff.departmentName, designationName: staff.designationName };
      })
      .filter((review): review is StaffPerformanceReviewListItem => Boolean(review))
      .filter((review) => !query || [review.staffName, review.employeeNumber, review.departmentName, review.designationName, review.reviewerName, review.status, review.reviewType].join(" ").toLowerCase().includes(query))
      .sort((first, second) => second.reviewPeriodEnd.localeCompare(first.reviewPeriodEnd));

    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize));
    const start = (parsed.page - 1) * parsed.pageSize;
    return { items: enriched.slice(start, start + parsed.pageSize), total, totalPages, page: parsed.page, pageSize: parsed.pageSize };
  },

  async getReviewById(scope: TenantScopedQuery, reviewId: string) {
    const review = performanceReviews.find((item) => item.id === reviewId && isSameScope(item, scope));
    if (!review) return null;
    const staff = await staffService.getStaffById(scope, review.staffId);
    if (!staff) return null;
    return { review: { ...review }, staff };
  },

  async getStaffPerformance(scope: TenantScopedQuery, staffId: string): Promise<StaffPerformanceSummary> {
    const staff = await ensureStaff(scope, staffId);
    const reviews = performanceReviews.filter((review) => review.staffId === staff.id && isSameScope(review, scope)).sort((first, second) => second.reviewPeriodEnd.localeCompare(first.reviewPeriodEnd));
    const goals = staffGoals.filter((goal) => goal.staffId === staff.id && isSameScope(goal, scope));
    const training = staffTraining.filter((item) => item.staffId === staff.id && isSameScope(item, scope));
    const notes = staffHrNotes.filter((note) => note.staffId === staff.id && isSameScope(note, scope));
    const disciplinary = mockStaffDisciplinaryRecords.filter((record) => record.staffId === staff.id && isSameScope(record, scope));

    return {
      staffId: staff.id,
      latestReview: reviews[0] ? { ...reviews[0] } : undefined,
      activeGoals: goals.filter((goal) => !["completed", "cancelled"].includes(goal.status)).map((goal) => ({ ...goal })),
      recentTraining: training.slice(0, 5).map((item) => ({ ...item })),
      qualifications: mockStaffQualifications.filter((item) => item.staffId === staff.id && isSameScope(item, scope)).map((item) => ({ ...item })),
      skills: mockStaffSkills.filter((item) => item.staffId === staff.id && isSameScope(item, scope)).map((item) => ({ ...item })),
      recognition: mockStaffRecognition.filter((item) => item.staffId === staff.id && isSameScope(item, scope)).map((item) => ({ ...item })),
      hrNotesCount: notes.length,
      openDisciplinaryCount: disciplinary.filter((record) => ["open", "under_review"].includes(record.status)).length,
      timeline: buildTimeline(staff.id, scope, reviews, goals, training),
    };
  },

  async getStaffHrOperations(scope: TenantScopedQuery, staffId: string) {
    await ensureStaff(scope, staffId);
    return {
      notes: staffHrNotes.filter((note) => note.staffId === staffId && isSameScope(note, scope)).map((note) => ({ ...note })),
      disciplinaryRecords: mockStaffDisciplinaryRecords.filter((record) => record.staffId === staffId && isSameScope(record, scope)).map((record) => ({ ...record })),
      timeline: buildTimeline(staffId, scope),
    };
  },

  async listGoals(scope: TenantScopedQuery, staffId: string) {
    await ensureStaff(scope, staffId);
    return staffGoals.filter((goal) => goal.staffId === staffId && isSameScope(goal, scope)).map((goal) => ({ ...goal }));
  },

  async listTraining(scope: TenantScopedQuery, staffId: string) {
    await ensureStaff(scope, staffId);
    return staffTraining.filter((training) => training.staffId === staffId && isSameScope(training, scope)).map((training) => ({ ...training }));
  },

  async createReview(input: StaffPerformanceReviewInput) {
    const parsed = staffPerformanceReviewSchema.parse(input);
    await ensureStaff(parsed, parsed.staffId);
    const now = new Date().toISOString();
    const review: StaffPerformanceReview = { ...parsed, id: createId("review", parsed.staffId), createdAt: now, updatedAt: now };
    performanceReviews = [review, ...performanceReviews];
    return { ...review };
  },

  async createGoal(input: StaffGoalInput) {
    const parsed = staffGoalSchema.parse(input);
    await ensureStaff(parsed, parsed.staffId);
    const now = new Date().toISOString();
    const goal: StaffGoal = { ...parsed, id: createId("goal", parsed.staffId), createdDate: now.slice(0, 10), completedDate: parsed.status === "completed" ? now.slice(0, 10) : undefined, createdAt: now, updatedAt: now };
    staffGoals = [goal, ...staffGoals];
    return { ...goal };
  },

  async createTraining(input: StaffTrainingInput) {
    const parsed = staffTrainingSchema.parse(input);
    await ensureStaff(parsed, parsed.staffId);
    const now = new Date().toISOString();
    const training: StaffTraining = { ...parsed, id: createId("training", parsed.staffId), createdAt: now, updatedAt: now };
    staffTraining = [training, ...staffTraining];
    return { ...training };
  },

  async createHrNote(input: StaffHrNoteInput) {
    const parsed = staffHrNoteSchema.parse(input);
    await ensureStaff(parsed, parsed.staffId);
    const now = new Date().toISOString();
    const note: StaffHrNote = { ...parsed, id: createId("note", parsed.staffId), createdDate: now.slice(0, 10), visibility: "hr_only", createdAt: now, updatedAt: now };
    staffHrNotes = [note, ...staffHrNotes];
    return { ...note };
  },

  async transitionReview(input: StaffStatusTransitionInput) {
    const parsed = staffStatusTransitionSchema.parse(input);
    await ensureStaff(parsed, parsed.staffId);
    const review = performanceReviews.find((item) => item.id === parsed.recordId && item.staffId === parsed.staffId && isSameScope(item, parsed));
    if (!review) throw new ApiError(404, "Performance review could not be found.");
    if (!canTransitionReviewStatus(review.status, parsed.status as StaffPerformanceReview["status"])) throw new ApiError(422, "This performance review status transition is not allowed.");
    const next = { ...review, status: parsed.status as StaffPerformanceReview["status"], updatedAt: new Date().toISOString() };
    performanceReviews = performanceReviews.map((item) => item.id === next.id ? next : item);
    return { ...next };
  },

  async transitionGoal(input: StaffStatusTransitionInput) {
    const parsed = staffStatusTransitionSchema.parse(input);
    await ensureStaff(parsed, parsed.staffId);
    const goal = staffGoals.find((item) => item.id === parsed.recordId && item.staffId === parsed.staffId && isSameScope(item, parsed));
    if (!goal) throw new ApiError(404, "Staff goal could not be found.");
    if (!canTransitionGoalStatus(goal.status, parsed.status as StaffGoal["status"])) throw new ApiError(422, "This goal status transition is not allowed.");
    const now = new Date().toISOString();
    const next = { ...goal, status: parsed.status as StaffGoal["status"], progress: parsed.status === "completed" ? 100 : goal.progress, completedDate: parsed.status === "completed" ? now.slice(0, 10) : goal.completedDate, updatedAt: now };
    staffGoals = staffGoals.map((item) => item.id === next.id ? next : item);
    return { ...next };
  },

  async transitionTraining(input: StaffStatusTransitionInput) {
    const parsed = staffStatusTransitionSchema.parse(input);
    await ensureStaff(parsed, parsed.staffId);
    const training = staffTraining.find((item) => item.id === parsed.recordId && item.staffId === parsed.staffId && isSameScope(item, parsed));
    if (!training) throw new ApiError(404, "Training record could not be found.");
    if (!canTransitionTrainingStatus(training.status, parsed.status as StaffTraining["status"])) throw new ApiError(422, "This training status transition is not allowed.");
    const next = { ...training, status: parsed.status as StaffTraining["status"], updatedAt: new Date().toISOString() };
    staffTraining = staffTraining.map((item) => item.id === next.id ? next : item);
    return { ...next };
  },
};

async function ensureStaff(scope: TenantScopedQuery, staffId: string) {
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) throw new ApiError(404, "Staff member not found.");
  return staff;
}

function buildTimeline(staffId: string, scope: TenantScopedQuery, reviews = performanceReviews, goals = staffGoals, training = staffTraining): StaffHrTimelineEvent[] {
  const items: StaffHrTimelineEvent[] = [];
  reviews.filter((item) => item.staffId === staffId && isSameScope(item, scope)).forEach((review) => items.push({ id: review.id, staffId, date: review.reviewDate ?? review.reviewPeriodEnd, type: "performance", title: `Performance review ${review.status.replaceAll("_", " ")}`, description: review.reviewerName, tone: getStatusTone(review.status) }));
  goals.filter((item) => item.staffId === staffId && isSameScope(item, scope)).forEach((goal) => items.push({ id: goal.id, staffId, date: goal.completedDate ?? goal.targetDate, type: "goal", title: goal.title, description: `${goal.progress}% complete`, tone: getStatusTone(goal.status) }));
  training.filter((item) => item.staffId === staffId && isSameScope(item, scope)).forEach((item) => items.push({ id: item.id, staffId, date: item.endDate ?? item.startDate, type: "training", title: item.title, description: item.provider, tone: getStatusTone(item.status) }));
  mockStaffRecognition.filter((item) => item.staffId === staffId && isSameScope(item, scope)).forEach((item) => items.push({ id: item.id, staffId, date: item.date, type: "recognition", title: item.title, description: item.awardedBy, tone: "success" }));
  mockStaffDisciplinaryRecords.filter((item) => item.staffId === staffId && isSameScope(item, scope)).forEach((item) => items.push({ id: item.id, staffId, date: item.resolvedDate ?? item.date, type: "disciplinary", title: item.recordType, description: item.status.replaceAll("_", " "), tone: getStatusTone(item.status) }));
  return items.sort((first, second) => second.date.localeCompare(first.date)).slice(0, 12);
}

function createId(prefix: string, staffId: string) {
  return `${prefix}-${staffId}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId;
}
