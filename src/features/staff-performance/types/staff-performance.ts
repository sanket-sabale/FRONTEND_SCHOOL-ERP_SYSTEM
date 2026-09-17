import type { TenantScopedQuery } from "@/lib/api/client";

export const performanceReviewStatuses = ["draft", "scheduled", "in_progress", "submitted", "acknowledged", "completed", "cancelled"] as const;
export type PerformanceReviewStatus = (typeof performanceReviewStatuses)[number];

export const performanceReviewTypes = ["probation", "annual", "mid_year", "promotion_review", "performance_improvement", "ad_hoc"] as const;
export type PerformanceReviewType = (typeof performanceReviewTypes)[number];

export const performanceRatings = [1, 2, 3, 4, 5] as const;
export type PerformanceRating = (typeof performanceRatings)[number];

export const staffGoalStatuses = ["not_started", "in_progress", "completed", "deferred", "cancelled"] as const;
export type StaffGoalStatus = (typeof staffGoalStatuses)[number];

export const staffGoalCategories = ["teaching", "academic", "administration", "student_support", "professional_development", "operational", "other"] as const;
export type StaffGoalCategory = (typeof staffGoalCategories)[number];

export const staffGoalPriorities = ["low", "medium", "high"] as const;
export type StaffGoalPriority = (typeof staffGoalPriorities)[number];

export const staffSkillCategories = ["teaching", "technology", "administrative", "communication", "operations", "student_support", "other"] as const;
export type StaffSkillCategory = (typeof staffSkillCategories)[number];

export const staffSkillProficiencies = ["beginner", "intermediate", "advanced", "expert"] as const;
export type StaffSkillProficiency = (typeof staffSkillProficiencies)[number];

export const verificationStatuses = ["unverified", "verified", "rejected"] as const;
export type StaffVerificationStatus = (typeof verificationStatuses)[number];

export const trainingStatuses = ["planned", "enrolled", "in_progress", "completed", "cancelled"] as const;
export type StaffTrainingStatus = (typeof trainingStatuses)[number];

export const trainingTypes = ["internal", "external", "workshop", "certification", "compliance", "professional_development"] as const;
export type StaffTrainingType = (typeof trainingTypes)[number];

export const hrNoteCategories = ["general", "performance", "attendance", "leave", "conduct", "development", "administrative"] as const;
export type HrNoteCategory = (typeof hrNoteCategories)[number];

export const recognitionCategories = ["employee_of_month", "outstanding_teaching", "best_attendance", "student_support", "administrative_excellence", "service_award"] as const;
export type StaffRecognitionCategory = (typeof recognitionCategories)[number];

export const disciplinarySeverities = ["low", "medium", "high", "critical"] as const;
export type DisciplinarySeverity = (typeof disciplinarySeverities)[number];

export const disciplinaryStatuses = ["open", "under_review", "resolved", "closed"] as const;
export type DisciplinaryStatus = (typeof disciplinaryStatuses)[number];

export type StaffPerformanceReview = TenantScopedQuery & {
  id: string;
  staffId: string;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  reviewType: PerformanceReviewType;
  reviewerStaffId?: string;
  reviewerName: string;
  status: PerformanceReviewStatus;
  overallRating?: PerformanceRating;
  strengths?: string;
  improvementAreas?: string;
  reviewerComments?: string;
  staffComments?: string;
  reviewDate?: string;
  nextReviewDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffGoal = TenantScopedQuery & {
  id: string;
  staffId: string;
  title: string;
  description?: string;
  category: StaffGoalCategory;
  targetDate: string;
  status: StaffGoalStatus;
  progress: number;
  priority: StaffGoalPriority;
  createdDate: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffSkill = TenantScopedQuery & {
  id: string;
  staffId: string;
  name: string;
  category: StaffSkillCategory;
  proficiency: StaffSkillProficiency;
  yearsOfExperience?: number;
  verificationStatus: StaffVerificationStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffQualification = TenantScopedQuery & {
  id: string;
  staffId: string;
  qualification: string;
  specialization?: string;
  institution?: string;
  completionYear?: number;
  gradeOrPercentage?: string;
  verificationStatus: StaffVerificationStatus;
  documentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffTraining = TenantScopedQuery & {
  id: string;
  staffId: string;
  title: string;
  provider?: string;
  trainingType: StaffTrainingType;
  startDate: string;
  endDate?: string;
  durationHours?: number;
  status: StaffTrainingStatus;
  certificateDocumentId?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffHrNote = TenantScopedQuery & {
  id: string;
  staffId: string;
  category: HrNoteCategory;
  title: string;
  body: string;
  createdBy: string;
  createdDate: string;
  visibility: "hr_only";
  relatedEventId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffRecognition = TenantScopedQuery & {
  id: string;
  staffId: string;
  title: string;
  category: StaffRecognitionCategory;
  date: string;
  description?: string;
  awardedBy: string;
  documentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffDisciplinaryRecord = TenantScopedQuery & {
  id: string;
  staffId: string;
  recordType: string;
  date: string;
  severity: DisciplinarySeverity;
  description: string;
  actionTaken?: string;
  status: DisciplinaryStatus;
  resolution?: string;
  resolvedDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffHrTimelineEvent = {
  id: string;
  staffId: string;
  date: string;
  type: "employment" | "document" | "performance" | "goal" | "training" | "recognition" | "disciplinary" | "account";
  title: string;
  description?: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
};

export type StaffPerformanceFilters = Partial<TenantScopedQuery> & {
  query?: string;
  status?: PerformanceReviewStatus;
  reviewType?: PerformanceReviewType;
  staffId?: string;
  page?: number;
  pageSize?: number;
};

export type StaffPerformanceDashboard = {
  totalStaff: number;
  activeStaff: number;
  onLeave: number;
  upcomingReviews: number;
  reviewsPending: number;
  goalsInProgress: number;
  trainingInProgress: number;
  openHrActions: number;
};

export type StaffPerformanceSummary = {
  staffId: string;
  latestReview?: StaffPerformanceReview;
  activeGoals: StaffGoal[];
  recentTraining: StaffTraining[];
  qualifications: StaffQualification[];
  skills: StaffSkill[];
  recognition: StaffRecognition[];
  hrNotesCount: number;
  openDisciplinaryCount: number;
  timeline: StaffHrTimelineEvent[];
};

export type StaffPerformanceReviewListItem = StaffPerformanceReview & {
  staffName: string;
  employeeNumber: string;
  departmentName: string;
  designationName: string;
};

export type StaffPerformanceReviewListResponse = {
  items: StaffPerformanceReviewListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type StaffPerformanceReviewInput = TenantScopedQuery & {
  staffId: string;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  reviewType: PerformanceReviewType;
  reviewerName: string;
  status?: PerformanceReviewStatus;
  overallRating?: PerformanceRating;
  strengths?: string;
  improvementAreas?: string;
  reviewerComments?: string;
  staffComments?: string;
  reviewDate?: string;
  nextReviewDate?: string;
};

export type StaffGoalInput = TenantScopedQuery & {
  staffId: string;
  title: string;
  description?: string;
  category: StaffGoalCategory;
  targetDate: string;
  status?: StaffGoalStatus;
  progress?: number;
  priority?: StaffGoalPriority;
};

export type StaffTrainingInput = TenantScopedQuery & {
  staffId: string;
  title: string;
  provider?: string;
  trainingType: StaffTrainingType;
  startDate: string;
  endDate?: string;
  durationHours?: number;
  status?: StaffTrainingStatus;
  remarks?: string;
};

export type StaffHrNoteInput = TenantScopedQuery & {
  staffId: string;
  category: HrNoteCategory;
  title: string;
  body: string;
  createdBy: string;
};

export type StaffStatusTransitionInput = TenantScopedQuery & {
  staffId: string;
  recordId: string;
  status: PerformanceReviewStatus | StaffGoalStatus | StaffTrainingStatus | DisciplinaryStatus;
};
