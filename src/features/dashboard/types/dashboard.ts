import type { Permission } from "@/types/erp";
import type { TenantScopedQuery } from "@/lib/api/client";

export type DashboardTone = "success" | "warning" | "danger" | "info" | "neutral";
export type DashboardTrendDirection = "up" | "down" | "flat";
export type DashboardSeverity = "critical" | "high" | "medium" | "low";

export type DashboardScope = TenantScopedQuery & {
  educationGroupId: string;
};

export type DashboardContext = {
  group: string;
  school: string;
  campus: string;
  academicYear: string;
  currentDateLabel: string;
  dataFreshnessLabel: string;
  dataSourceLabel: string;
};

export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  secondaryMetric: string;
  comparison: string;
  trend: DashboardTrendDirection;
  target: string;
  status: string;
  tone: DashboardTone;
  description: string;
  href: string;
  permission: Permission;
};

export type DashboardChange = {
  id: string;
  label: string;
  current: string;
  previous: string;
  absoluteChange: string;
  percentChange?: string;
  direction: DashboardTrendDirection;
  status: string;
  tone: DashboardTone;
  href: string;
  permission: Permission;
};

export type DashboardActionItem = {
  id: string;
  category: string;
  severity: DashboardSeverity;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  dueAt: string;
  assignedTo: string;
  status: string;
  actionUrl: string;
  permission: Permission;
};

export type DashboardException = {
  id: string;
  severity: DashboardSeverity;
  count: number;
  title: string;
  reason: string;
  age: string;
  sourceModule: string;
  actionLabel: string;
  actionUrl: string;
  permission: Permission;
};

export type DashboardDimension = {
  id: string;
  label: string;
  value: string;
  target: string;
  status: string;
  tone: DashboardTone;
  change: string;
};

export type DashboardIntelligenceMetric = {
  label: string;
  value: string;
  helper: string;
  tone: DashboardTone;
  href?: string;
};

export type DashboardIntelligencePanel = {
  id: string;
  title: string;
  eyebrow: string;
  summary: string;
  metrics: DashboardIntelligenceMetric[];
  permission: Permission;
};

export type DashboardRiskSignal = {
  id: string;
  studentId: string;
  studentName: string;
  classSection: string;
  signals: string[];
  primaryRisk: DashboardSeverity;
  actionUrl: string;
};

export type DashboardOperationItem = {
  id: string;
  time: string;
  title: string;
  description: string;
  status: string;
  tone: DashboardTone;
  href: string;
  permission: Permission;
};

export type DashboardActivity = {
  id: string;
  occurredAtLabel: string;
  title: string;
  description: string;
  href: string;
  permission: Permission;
};

export type DashboardQuickAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  permission: Permission;
};

export type PrincipalDashboardSummary = {
  scope: DashboardScope;
  context: DashboardContext;
  kpis: DashboardKpi[];
  changes: DashboardChange[];
  performance: DashboardDimension[];
  actions: DashboardActionItem[];
  exceptions: DashboardException[];
  intelligence: DashboardIntelligencePanel[];
  studentRisks: DashboardRiskSignal[];
  operations: DashboardOperationItem[];
  activities: DashboardActivity[];
  quickActions: DashboardQuickAction[];
};
