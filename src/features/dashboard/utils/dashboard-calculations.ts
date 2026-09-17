import type { DashboardTone, DashboardTrendDirection } from "@/features/dashboard/types/dashboard";

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

export function formatSignedPercent(value: number | undefined) {
  if (value === undefined) return "Comparison unavailable";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(Math.abs(value) >= 10 ? 0 : 1)}%`;
}

export function formatSignedNumber(value: number, suffix = "") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("en-IN")}${suffix}`;
}

export function directionFromDelta(delta: number): DashboardTrendDirection {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

export function toneForVariance(value: number, target: number, reversed = false): DashboardTone {
  const passed = reversed ? value <= target : value >= target;
  if (passed) return "success";
  const gap = Math.abs(value - target);
  if (gap <= 2) return "warning";
  return "danger";
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}
