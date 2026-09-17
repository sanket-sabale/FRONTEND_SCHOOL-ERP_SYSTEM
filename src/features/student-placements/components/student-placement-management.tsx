"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Select } from "@/components/ui";
import { transferStudentPlacementAction, type StudentPlacementActionState } from "@/features/student-placements/actions/student-placement-actions";
import {
  studentPlacementStatuses,
  type StudentAcademicPlacementReadModel,
  type StudentPlacementReason,
} from "@/features/student-placements/types/student-placement";
import type { AcademicClass, AcademicYear, Section } from "@/features/academic-structure/types/academic-structure";
import type { StudentProfile } from "@/features/students/types/student";

const initialState: StudentPlacementActionState = { status: "idle" };
const transferReasons: StudentPlacementReason[] = ["section_change", "class_change", "administrative_correction", "special_placement", "other"];

export function StudentPlacementDirectory({
  placements,
}: {
  placements: StudentAcademicPlacementReadModel[];
}) {
  if (placements.length === 0) {
    return <EmptyState description="No placement records match the current filters." title="No student placements found" />;
  }

  return (
    <div className="space-y-3">
      <div className="responsive-table-wrap hidden lg:block">
        <table className="responsive-table text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Academic Year</th>
              <th className="px-4 py-3 font-semibold">Class</th>
              <th className="px-4 py-3 font-semibold">Section</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Start</th>
              <th className="px-4 py-3 font-semibold">End</th>
              <th className="px-4 py-3 font-semibold">Reason</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {placements.map((placement) => (
              <tr className="align-top" key={placement.id}>
                <td className="px-4 py-4">
                  <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={`/students/${placement.studentId}`}>
                    {placement.studentName}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-foreground-muted">{placement.admissionNumber}</p>
                </td>
                <td className="px-4 py-4">{placement.academicYearName}</td>
                <td className="px-4 py-4">{placement.className}</td>
                <td className="px-4 py-4">{placement.sectionName}</td>
                <td className="px-4 py-4"><PlacementStatusBadge status={placement.status} /></td>
                <td className="px-4 py-4">{placement.startDate}</td>
                <td className="px-4 py-4">{placement.endDate ?? "Current"}</td>
                <td className="px-4 py-4">{placement.reason ? formatLabel(placement.reason) : "Not recorded"}</td>
                <td className="px-4 py-4">
                  <LinkButton href={`/students/${placement.studentId}/placement`}>Manage</LinkButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 lg:hidden">
        {placements.map((placement) => (
          <article className="rounded-lg border border-border bg-surface p-3" key={placement.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="responsive-text font-semibold text-primary underline-offset-4 hover:underline" href={`/students/${placement.studentId}`}>
                  {placement.studentName}
                </Link>
                <p className="mt-1 text-sm text-foreground-muted">{placement.academicYearName} / {placement.className} / Section {placement.sectionName}</p>
              </div>
              <PlacementStatusBadge status={placement.status} />
            </div>
            <p className="mt-2 text-sm text-foreground-muted">Started {placement.startDate}{placement.endDate ? ` / Ended ${placement.endDate}` : ""}</p>
            <p className="mt-1 text-sm text-foreground-muted">Reason: {placement.reason ? formatLabel(placement.reason) : "Not recorded"}</p>
            <div className="mt-3"><LinkButton href={`/students/${placement.studentId}/placement`}>Manage</LinkButton></div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function StudentPlacementWorkflow({
  academicClasses,
  academicYears,
  currentPlacement,
  placementHistory,
  sections,
  student,
}: {
  academicClasses: AcademicClass[];
  academicYears: AcademicYear[];
  currentPlacement?: StudentAcademicPlacementReadModel;
  placementHistory: StudentAcademicPlacementReadModel[];
  sections: Section[];
  student: StudentProfile;
}) {
  const [state, formAction, pending] = useActionState(transferStudentPlacementAction, initialState);
  const eligibleYears = academicYears.filter((year) => year.status !== "archived" && year.status !== "closed");
  const [academicYearId, setAcademicYearId] = useState(currentPlacement?.academicYearId ?? eligibleYears[0]?.id ?? "");
  const eligibleClasses = useMemo(
    () => academicClasses.filter((academicClass) => academicClass.academicYearId === academicYearId && academicClass.status === "active"),
    [academicClasses, academicYearId],
  );
  const [classId, setClassId] = useState(currentPlacement?.classId ?? eligibleClasses[0]?.id ?? "");
  const eligibleSections = useMemo(
    () => sections.filter((section) => section.academicYearId === academicYearId && section.classId === classId && section.status === "active"),
    [sections, academicYearId, classId],
  );
  const [sectionId, setSectionId] = useState(currentPlacement?.sectionId ?? eligibleSections[0]?.id ?? "");

  function changeYear(nextAcademicYearId: string) {
    setAcademicYearId(nextAcademicYearId);
    const nextClass = academicClasses.find((academicClass) => academicClass.academicYearId === nextAcademicYearId && academicClass.status === "active");
    setClassId(nextClass?.id ?? "");
    const nextSection = sections.find((section) => section.academicYearId === nextAcademicYearId && section.classId === nextClass?.id && section.status === "active");
    setSectionId(nextSection?.id ?? "");
  }

  function changeClass(nextClassId: string) {
    setClassId(nextClassId);
    const nextSection = sections.find((section) => section.academicYearId === academicYearId && section.classId === nextClassId && section.status === "active");
    setSectionId(nextSection?.id ?? "");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Current Placement</p>
          <h2 className="responsive-text text-lg font-semibold text-foreground">{student.displayName}</h2>
        </div>
        <div className="grid gap-3 p-4 text-sm sm:p-5">
          {currentPlacement ? (
            <>
              <InfoLine label="Academic Year" value={currentPlacement.academicYearName} />
              <InfoLine label="Class" value={currentPlacement.className} />
              <InfoLine label="Section" value={currentPlacement.sectionName} />
              <InfoLine label="Status" value={formatLabel(currentPlacement.status)} />
              <InfoLine label="Start Date" value={currentPlacement.startDate} />
            </>
          ) : (
            <EmptyState description="This student has no active placement in the current academic year." title="No active placement" />
          )}
        </div>
      </Card>

      <Card>
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Placement Change</p>
          <h2 className="responsive-text text-lg font-semibold text-foreground">Move Student</h2>
        </div>
        <form action={formAction} className="grid gap-3 p-4 sm:p-5 md:grid-cols-2">
          {state.status === "error" && state.message ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 md:col-span-2">{state.message}</div>
          ) : null}
          <input name="studentId" type="hidden" value={student.id} />
          <input name="fromPlacementId" type="hidden" value={currentPlacement?.id ?? ""} />
          <Field error={state.fieldErrors?.toAcademicYearId} label="Academic year" required>
            <Select disabled={pending || !currentPlacement} name="toAcademicYearId" onChange={(event) => changeYear(event.target.value)} required value={academicYearId}>
              {eligibleYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </Select>
          </Field>
          <Field error={state.fieldErrors?.toClassId} label="Class" required>
            <Select disabled={pending || !currentPlacement || eligibleClasses.length === 0} name="toClassId" onChange={(event) => changeClass(event.target.value)} required value={classId}>
              {eligibleClasses.map((academicClass) => <option key={academicClass.id} value={academicClass.id}>{academicClass.displayName}</option>)}
            </Select>
          </Field>
          <Field error={state.fieldErrors?.toSectionId} label="Section" required>
            <Select disabled={pending || !currentPlacement || eligibleSections.length === 0} name="toSectionId" onChange={(event) => setSectionId(event.target.value)} required value={sectionId}>
              {eligibleSections.map((section) => <option key={section.id} value={section.id}>Section {section.displayName}</option>)}
            </Select>
          </Field>
          <Field error={state.fieldErrors?.startDate} label="Effective date" required>
            <input className={inputClasses} disabled={pending || !currentPlacement} name="startDate" required type="date" />
          </Field>
          <Field error={state.fieldErrors?.reason} label="Reason" required>
            <Select disabled={pending || !currentPlacement} name="reason" required>
              {transferReasons.map((reason) => <option key={reason} value={reason}>{formatLabel(reason)}</option>)}
            </Select>
          </Field>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button disabled={pending || !currentPlacement || !sectionId} loading={pending} type="submit">Change Placement</Button>
            <LinkButton href={`/students/${student.id}`}>Cancel</LinkButton>
          </div>
        </form>
      </Card>
      <Card className="xl:col-span-2">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Placement History</p>
          <h2 className="responsive-text text-lg font-semibold text-foreground">{placementHistory.length.toLocaleString("en-IN")} placement record{placementHistory.length === 1 ? "" : "s"}</h2>
        </div>
        <div className="p-4 sm:p-5">
          <PlacementHistoryList placements={placementHistory} />
        </div>
      </Card>
    </div>
  );
}

function PlacementHistoryList({ placements }: { placements: StudentAcademicPlacementReadModel[] }) {
  if (placements.length === 0) {
    return <EmptyState description="No placement history has been recorded for this student." title="No placement history" />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {placements.map((placement) => (
        <article className="rounded-lg border border-border bg-surface-muted p-3" key={placement.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="responsive-text font-semibold text-foreground">{placement.academicYearName} / {placement.className} / Section {placement.sectionName}</p>
              <p className="mt-1 text-sm text-foreground-muted">Effective from {placement.startDate}{placement.endDate ? ` to ${placement.endDate}` : ""}</p>
              <p className="mt-1 text-sm text-foreground-muted">Reason: {placement.reason ? formatLabel(placement.reason) : "Not recorded"}</p>
            </div>
            <PlacementStatusBadge status={placement.status} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function PlacementStatusBadge({ status }: { status: (typeof studentPlacementStatuses)[number] }) {
  return <Badge tone={status === "active" ? "success" : "neutral"}>{formatLabel(status)}</Badge>;
}

function InfoLine({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text text-right font-medium text-foreground">{value ?? "Not provided"}</span>
    </div>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={href}>
      {children}
    </Link>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60";
