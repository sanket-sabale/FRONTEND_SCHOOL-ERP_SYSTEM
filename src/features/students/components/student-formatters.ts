import type { GuardianRelationshipType, StudentGender } from "@/features/students/types/student";

export function formatStudentDate(value?: string) {
  if (!value) return "Not provided";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatStudentGender(value: StudentGender) {
  const labels: Record<StudentGender, string> = {
    female: "Female",
    male: "Male",
    other: "Other",
    not_specified: "Not specified",
  };

  return labels[value];
}

export function formatGuardianRelationship(value: GuardianRelationshipType) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getStudentInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
