import type {
  GuardianStatus,
  GuardianStudentRelationshipType,
  GuardianVerificationStatus,
} from "@/features/guardians/types/guardian";

export function getGuardianInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GP";
}

export function formatGuardianRelationshipType(value: GuardianStudentRelationshipType) {
  const labels: Record<GuardianStudentRelationshipType, string> = {
    father: "Father",
    mother: "Mother",
    stepfather: "Stepfather",
    stepmother: "Stepmother",
    grandfather: "Grandfather",
    grandmother: "Grandmother",
    brother: "Brother",
    sister: "Sister",
    legalGuardian: "Legal Guardian",
    fosterGuardian: "Foster Guardian",
    relative: "Relative",
    emergencyContact: "Emergency Contact",
    other: "Other",
  };
  return labels[value];
}

export function getGuardianStatusLabel(status: GuardianStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getGuardianVerificationLabel(status: GuardianVerificationStatus) {
  const labels: Record<GuardianVerificationStatus, string> = {
    unverified: "Unverified",
    pending: "Pending Verification",
    verified: "Verified",
    rejected: "Rejected",
  };
  return labels[status];
}
