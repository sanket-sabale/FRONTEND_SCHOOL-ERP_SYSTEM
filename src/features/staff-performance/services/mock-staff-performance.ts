import { tenantContext } from "@/lib/tenant-context";
import type {
  StaffDisciplinaryRecord,
  StaffGoal,
  StaffHrNote,
  StaffPerformanceReview,
  StaffQualification,
  StaffRecognition,
  StaffSkill,
  StaffTraining,
} from "@/features/staff-performance/types/staff-performance";
import type { TenantScopedQuery } from "@/lib/api/client";

const activeScope: TenantScopedQuery = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

const secondTenantScope: TenantScopedQuery = {
  tenantId: "tenant-demo-west",
  schoolId: "school-demo-west",
  campusId: "campus-demo-central",
  academicYearId: "ay-2026-27",
};

export const mockPerformanceReviews: StaffPerformanceReview[] = [
  review("review-001", "staff-001", "annual", "completed", "2025-04-01", "2026-03-31", "Amit Deshmukh", 4, "Strong classroom outcomes and mentoring.", "Formalize math enrichment documentation.", "2026-04-10", "2027-04-10"),
  review("review-002", "staff-002", "mid_year", "in_progress", "2026-04-01", "2026-09-30", "Anita Sharma", 3, "Good lesson preparation.", "Needs more timely assessment feedback.", "2026-08-20"),
  review("review-003", "staff-003", "annual", "scheduled", "2026-04-01", "2027-03-31", "Amit Deshmukh"),
  review("review-004", "staff-005", "probation", "submitted", "2026-04-01", "2026-07-31", "Amit Deshmukh", 3, "Reliable HR operations support.", "Improve documentation turnaround.", "2026-08-05"),
  review("review-005", "staff-008", "performance_improvement", "scheduled", "2026-08-01", "2026-10-31", "Neha Joshi"),
  review("review-west-001", "staff-west-001", "annual", "completed", "2025-04-01", "2026-03-31", "West Principal", 4, "Tenant isolation sample.", undefined, "2026-04-08", undefined, secondTenantScope),
];

export const mockStaffGoals: StaffGoal[] = [
  goal("goal-001", "staff-001", "Improve Grade 8 mathematics enrichment outcomes", "academic", "2026-11-30", "in_progress", 65, "high"),
  goal("goal-002", "staff-001", "Mentor two new teaching staff members", "professional_development", "2027-02-28", "not_started", 10, "medium"),
  goal("goal-003", "staff-002", "Publish monthly assessment feedback within five working days", "teaching", "2026-12-15", "in_progress", 45, "high"),
  goal("goal-004", "staff-003", "Reduce fee reconciliation exceptions", "operational", "2026-10-31", "completed", 100, "medium", "2026-08-01"),
  goal("goal-005", "staff-005", "Update HR onboarding checklist", "administration", "2026-09-30", "deferred", 30, "medium"),
];

export const mockStaffSkills: StaffSkill[] = [
  skill("skill-001", "staff-001", "Mathematics", "teaching", "expert", 12, "verified"),
  skill("skill-002", "staff-001", "Classroom Management", "teaching", "advanced", 10, "verified"),
  skill("skill-003", "staff-002", "English", "teaching", "advanced", 6, "verified"),
  skill("skill-004", "staff-003", "Accounting", "administrative", "advanced", 8, "verified"),
  skill("skill-005", "staff-005", "HR Documentation", "administrative", "intermediate", 3, "unverified"),
  skill("skill-006", "staff-006", "Student Transport Safety", "operations", "advanced", 5, "verified"),
];

export const mockStaffQualifications: StaffQualification[] = [
  qualification("qualification-001", "staff-001", "B.Ed", "Mathematics", "Savitribai Phule Pune University", 2014, "First Class", "verified", "doc-001"),
  qualification("qualification-002", "staff-001", "M.Sc", "Mathematics", "University of Mumbai", 2012, "Distinction", "verified"),
  qualification("qualification-003", "staff-002", "B.A.", "English", "Fergusson College", 2016, "First Class", "verified"),
  qualification("qualification-004", "staff-003", "M.Com", "Accounts", "Pune University", 2015, "First Class", "verified"),
  qualification("qualification-005", "staff-005", "MBA", "Human Resources", "Symbiosis", 2020, "A Grade", "unverified"),
];

export const mockStaffTraining: StaffTraining[] = [
  training("training-001", "staff-001", "NEP Classroom Practice Workshop", "Saraswati Public School", "workshop", "2026-07-05", "2026-07-06", 12, "completed", "Completed with peer demo lesson."),
  training("training-002", "staff-002", "Assessment Design for Middle School", "Academic Council", "professional_development", "2026-09-12", undefined, 6, "enrolled"),
  training("training-003", "staff-003", "Fee Compliance Refresher", "Finance Office", "compliance", "2026-08-01", "2026-08-01", 4, "completed"),
  training("training-004", "staff-005", "HR Records Privacy", "VidyaSetu HR", "internal", "2026-08-28", undefined, 3, "planned"),
  training("training-005", "staff-006", "School Transport Safety", "RTO Training Partner", "external", "2026-06-10", "2026-06-10", 5, "completed"),
];

export const mockStaffHrNotes: StaffHrNote[] = [
  note("note-001", "staff-001", "performance", "Mentoring contribution", "Supported new Mathematics teacher with weekly planning reviews.", "Neha Joshi"),
  note("note-002", "staff-002", "development", "Assessment feedback coaching", "Discussed monthly feedback process and agreed on a tracking checklist.", "Anita Sharma"),
  note("note-003", "staff-008", "conduct", "Access review required", "Suspension case requires HR manager review before any account activation.", "Neha Joshi"),
];

export const mockStaffRecognition: StaffRecognition[] = [
  recognition("recognition-001", "staff-001", "Outstanding Teaching", "outstanding_teaching", "2026-01-26", "Recognized for Grade 10 mathematics board preparation.", "Principal"),
  recognition("recognition-002", "staff-003", "Administrative Excellence", "administrative_excellence", "2026-03-15", "Improved fee reconciliation process.", "Principal"),
  recognition("recognition-003", "staff-006", "Best Attendance", "best_attendance", "2026-04-30", "Consistent transport duty attendance.", "Transport Coordinator"),
];

export const mockStaffDisciplinaryRecords: StaffDisciplinaryRecord[] = [
  disciplinary("disciplinary-001", "staff-008", "Conduct review", "2026-08-01", "medium", "Incident under HR review.", "under_review", "Temporary duty restriction."),
  disciplinary("disciplinary-002", "staff-011", "Exit compliance", "2024-03-25", "low", "Exit handover delay recorded.", "closed", "Handover completed.", "2024-03-31"),
];

function review(id: string, staffId: string, reviewType: StaffPerformanceReview["reviewType"], status: StaffPerformanceReview["status"], start: string, end: string, reviewerName: string, rating?: StaffPerformanceReview["overallRating"], strengths?: string, improvementAreas?: string, reviewDate?: string, nextReviewDate?: string, scope = activeScope): StaffPerformanceReview {
  return { ...scope, id, staffId, reviewType, status, reviewPeriodStart: start, reviewPeriodEnd: end, reviewerName, overallRating: rating, strengths, improvementAreas, reviewerComments: strengths, reviewDate, nextReviewDate, createdAt: `${start}T09:00:00+05:30`, updatedAt: `${reviewDate ?? start}T10:00:00+05:30` };
}

function goal(id: string, staffId: string, title: string, category: StaffGoal["category"], targetDate: string, status: StaffGoal["status"], progress: number, priority: StaffGoal["priority"], completedDate?: string): StaffGoal {
  return { ...activeScope, id, staffId, title, category, targetDate, status, progress, priority, completedDate, createdDate: "2026-04-01", createdAt: "2026-04-01T09:00:00+05:30", updatedAt: "2026-08-01T09:00:00+05:30" };
}

function skill(id: string, staffId: string, name: string, category: StaffSkill["category"], proficiency: StaffSkill["proficiency"], yearsOfExperience: number, verificationStatus: StaffSkill["verificationStatus"]): StaffSkill {
  return { ...activeScope, id, staffId, name, category, proficiency, yearsOfExperience, verificationStatus, createdAt: "2026-04-01T09:00:00+05:30", updatedAt: "2026-04-01T09:00:00+05:30" };
}

function qualification(id: string, staffId: string, qualificationValue: string, specialization: string, institution: string, completionYear: number, gradeOrPercentage: string, verificationStatus: StaffQualification["verificationStatus"], documentId?: string): StaffQualification {
  return { ...activeScope, id, staffId, qualification: qualificationValue, specialization, institution, completionYear, gradeOrPercentage, verificationStatus, documentId, createdAt: "2026-04-01T09:00:00+05:30", updatedAt: "2026-04-01T09:00:00+05:30" };
}

function training(id: string, staffId: string, title: string, provider: string, trainingType: StaffTraining["trainingType"], startDate: string, endDate: string | undefined, durationHours: number, status: StaffTraining["status"], remarks?: string): StaffTraining {
  return { ...activeScope, id, staffId, title, provider, trainingType, startDate, endDate, durationHours, status, remarks, createdAt: `${startDate}T09:00:00+05:30`, updatedAt: `${endDate ?? startDate}T09:00:00+05:30` };
}

function note(id: string, staffId: string, category: StaffHrNote["category"], title: string, body: string, createdBy: string): StaffHrNote {
  return { ...activeScope, id, staffId, category, title, body, createdBy, createdDate: "2026-08-01", visibility: "hr_only", createdAt: "2026-08-01T09:00:00+05:30", updatedAt: "2026-08-01T09:00:00+05:30" };
}

function recognition(id: string, staffId: string, title: string, category: StaffRecognition["category"], date: string, description: string, awardedBy: string): StaffRecognition {
  return { ...activeScope, id, staffId, title, category, date, description, awardedBy, createdAt: `${date}T09:00:00+05:30`, updatedAt: `${date}T09:00:00+05:30` };
}

function disciplinary(id: string, staffId: string, recordType: string, date: string, severity: StaffDisciplinaryRecord["severity"], description: string, status: StaffDisciplinaryRecord["status"], actionTaken?: string, resolution?: string, resolvedDate?: string): StaffDisciplinaryRecord {
  return { ...activeScope, id, staffId, recordType, date, severity, description, actionTaken, status, resolution, resolvedDate, createdAt: `${date}T09:00:00+05:30`, updatedAt: `${resolvedDate ?? date}T09:00:00+05:30` };
}
