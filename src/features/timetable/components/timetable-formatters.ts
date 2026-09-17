import type { TimetableDay, TimetablePeriodType } from "@/features/timetable/types/timetable";

export function formatTimetableDay(day: TimetableDay) {
  return day.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatPeriodType(type: TimetablePeriodType | string) {
  return type.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatDateTime(value?: string) {
  if (!value) return "Not updated";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatClassSection(className?: string, sectionName?: string) {
  return [className, sectionName ? `Section ${sectionName}` : undefined].filter(Boolean).join(" / ");
}
