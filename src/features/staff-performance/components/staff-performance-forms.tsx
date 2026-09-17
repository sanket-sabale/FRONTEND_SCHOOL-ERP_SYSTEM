"use client";

import { useActionState } from "react";
import { Button, Card, Field, Select, SectionHeader } from "@/components/ui";
import {
  createPerformanceReviewAction,
  createStaffGoalAction,
  createStaffHrNoteAction,
  createStaffTrainingAction,
  type StaffPerformanceActionState,
} from "@/features/staff-performance/actions/staff-performance-actions";
import { performanceReviewStatuses, performanceReviewTypes, staffGoalCategories, staffGoalPriorities, staffGoalStatuses, trainingStatuses, trainingTypes, hrNoteCategories } from "@/features/staff-performance/types/staff-performance";
import { goalCategoryLabels, goalPriorityLabels, goalStatusLabels, reviewStatusLabels, reviewTypeLabels, trainingStatusLabels, trainingTypeLabels } from "@/features/staff-performance/services/staff-performance-rules";

const initialState: StaffPerformanceActionState = { status: "idle" };
const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
const textAreaClasses = `${inputClasses} min-h-24 py-2`;

export function ReviewForm({ staffId }: { staffId: string }) {
  const [state, formAction, pending] = useActionState(createPerformanceReviewAction, initialState);
  return (
    <Card>
      <SectionHeader eyebrow="Performance" title="Create Review" />
      <form action={formAction} className="grid gap-4 p-4 sm:p-5">
        <input name="staffId" type="hidden" value={staffId} />
        <ActionMessage state={state} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Review type" required><Select name="reviewType">{performanceReviewTypes.map((type) => <option key={type} value={type}>{reviewTypeLabels[type]}</option>)}</Select></Field>
          <Field label="Status" required><Select name="status">{performanceReviewStatuses.map((status) => <option key={status} value={status}>{reviewStatusLabels[status]}</option>)}</Select></Field>
          <Field label="Period start" required><input className={inputClasses} name="reviewPeriodStart" type="date" /></Field>
          <Field label="Period end" required><input className={inputClasses} name="reviewPeriodEnd" type="date" /></Field>
          <Field label="Reviewer" required><input className={inputClasses} name="reviewerName" placeholder="Reviewer name" /></Field>
          <Field label="Rating"><Select name="overallRating"><option value="">Not rated</option><option value="1">1 - Needs Significant Improvement</option><option value="2">2 - Needs Improvement</option><option value="3">3 - Meets Expectations</option><option value="4">4 - Exceeds Expectations</option><option value="5">5 - Exceptional</option></Select></Field>
          <Field label="Review date"><input className={inputClasses} name="reviewDate" type="date" /></Field>
          <Field label="Next review date"><input className={inputClasses} name="nextReviewDate" type="date" /></Field>
        </div>
        <Field label="Strengths"><textarea className={textAreaClasses} name="strengths" /></Field>
        <Field label="Improvement areas"><textarea className={textAreaClasses} name="improvementAreas" /></Field>
        <Field label="Reviewer comments"><textarea className={textAreaClasses} name="reviewerComments" /></Field>
        <Button disabled={pending || state.status === "success"} loading={pending} type="submit">Create Review</Button>
      </form>
    </Card>
  );
}

export function GoalForm({ staffId }: { staffId: string }) {
  const [state, formAction, pending] = useActionState(createStaffGoalAction, initialState);
  return (
    <Card>
      <SectionHeader eyebrow="Goals" title="Add Goal" />
      <form action={formAction} className="grid gap-4 p-4 sm:p-5">
        <input name="staffId" type="hidden" value={staffId} />
        <ActionMessage state={state} />
        <Field label="Title" required><input className={inputClasses} name="title" /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Category" required><Select name="category">{staffGoalCategories.map((category) => <option key={category} value={category}>{goalCategoryLabels[category]}</option>)}</Select></Field>
          <Field label="Priority" required><Select name="priority">{staffGoalPriorities.map((priority) => <option key={priority} value={priority}>{goalPriorityLabels[priority]}</option>)}</Select></Field>
          <Field label="Status" required><Select name="status">{staffGoalStatuses.map((status) => <option key={status} value={status}>{goalStatusLabels[status]}</option>)}</Select></Field>
          <Field label="Progress"><input className={inputClasses} max="100" min="0" name="progress" type="number" /></Field>
          <Field label="Target date" required><input className={inputClasses} name="targetDate" type="date" /></Field>
        </div>
        <Field label="Description"><textarea className={textAreaClasses} name="description" /></Field>
        <Button disabled={pending || state.status === "success"} loading={pending} type="submit">Add Goal</Button>
      </form>
    </Card>
  );
}

export function TrainingForm({ staffId }: { staffId: string }) {
  const [state, formAction, pending] = useActionState(createStaffTrainingAction, initialState);
  return (
    <Card>
      <SectionHeader eyebrow="Training" title="Add Training" />
      <form action={formAction} className="grid gap-4 p-4 sm:p-5">
        <input name="staffId" type="hidden" value={staffId} />
        <ActionMessage state={state} />
        <Field label="Title" required><input className={inputClasses} name="title" /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Provider"><input className={inputClasses} name="provider" /></Field>
          <Field label="Training type" required><Select name="trainingType">{trainingTypes.map((type) => <option key={type} value={type}>{trainingTypeLabels[type]}</option>)}</Select></Field>
          <Field label="Status" required><Select name="status">{trainingStatuses.map((status) => <option key={status} value={status}>{trainingStatusLabels[status]}</option>)}</Select></Field>
          <Field label="Duration hours"><input className={inputClasses} min="0.5" name="durationHours" step="0.5" type="number" /></Field>
          <Field label="Start date" required><input className={inputClasses} name="startDate" type="date" /></Field>
          <Field label="End date"><input className={inputClasses} name="endDate" type="date" /></Field>
        </div>
        <Field label="Remarks"><textarea className={textAreaClasses} name="remarks" /></Field>
        <Button disabled={pending || state.status === "success"} loading={pending} type="submit">Add Training</Button>
      </form>
    </Card>
  );
}

export function HrNoteForm({ staffId }: { staffId: string }) {
  const [state, formAction, pending] = useActionState(createStaffHrNoteAction, initialState);
  return (
    <Card>
      <SectionHeader eyebrow="Private HR" title="Add HR Note" />
      <form action={formAction} className="grid gap-4 p-4 sm:p-5">
        <input name="staffId" type="hidden" value={staffId} />
        <ActionMessage state={state} />
        <Field label="Category" required><Select name="category">{hrNoteCategories.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}</Select></Field>
        <Field label="Title" required><input className={inputClasses} name="title" /></Field>
        <Field label="Note" required><textarea className={textAreaClasses} name="body" /></Field>
        <Button disabled={pending || state.status === "success"} loading={pending} type="submit">Add Private Note</Button>
      </form>
    </Card>
  );
}

function ActionMessage({ state }: { state: StaffPerformanceActionState }) {
  if (!state.message) return null;
  return <p className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"}>{state.message}</p>;
}
