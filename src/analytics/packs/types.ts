import type { KPI, VisualConfig } from '../../types';

export type PackId =
  | 'financial'
  | 'sales'
  | 'marketing'
  | 'customer'
  | 'product'
  | 'web'
  | 'operations'
  | 'hr'
  | 'risk-fraud'
  | 'healthcare'
  | 'retail'
  | 'manufacturing'
  | 'banking-insurance'
  | 'education';

export type RoleDataType = 'number' | 'date' | 'category' | 'id';

export interface RoleDefinition {
  aliases: string[];
  type: RoleDataType;
  description?: string;
  sampleValues?: (string | number)[];
}

export type PackKpiFormat =
  | 'currency'
  | 'percent'
  | 'number'
  | 'ratio'
  | 'days'
  | 'compact';

export type PackKpiFormulaFn = (
  rows: Record<string, any>[],
  roleMap: Record<string, string>
) => number | null;

export interface PackKpiConfig {
  id: string;
  label: string;
  formula: string | PackKpiFormulaFn;
  sqlHint?: string;
  unit: string;
  format: PackKpiFormat;
  goodDirection: 'up' | 'down';
  needs: string[];
  description: string;
}

export type PackChartIntent =
  | 'trend'
  | 'compare'
  | 'composition'
  | 'distribution'
  | 'relationship'
  | 'ranking'
  | 'flow'
  | 'geo';

export interface PackChartConfig {
  id: string;
  title: string;
  intent: PackChartIntent;
  x: string;
  y: string;
  group?: string;
  needs: string[];
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
  description?: string;
}

export interface PackLensesConfig {
  descriptive: string[];
  diagnostic: string[];
  predictive: string[];
  prescriptive: string[];
}

export interface PackReportSectionConfig {
  title: string;
  kpis: string[];
  charts: string[];
  narrativeTemplate: string;
}

export interface AnalyticsPackConfig {
  id: PackId | string;
  name: string;
  icon: string;
  description: string;
  detect: {
    keywords: string[];
    requiredRoles: string[];
    optionalRoles: string[];
  };
  roles: Record<string, RoleDefinition>;
  kpis: PackKpiConfig[];
  charts: PackChartConfig[];
  lenses: PackLensesConfig;
  reportSections: PackReportSectionConfig[];
  sampleDataset: () => Record<string, any>[];
}

export interface PackDetectionMatch {
  packId: string;
  packName: string;
  confidence: number; // 0 to 100
  matchedRoles: string[];
  missingRoles: string[];
  roleMapping: Record<string, string>; // role -> dataset column
}

export interface ComputedPackKpi {
  id: string;
  label: string;
  status: 'available' | 'unavailable';
  value: number | null;
  formattedValue: string;
  unit: string;
  format: PackKpiFormat;
  goodDirection: 'up' | 'down';
  changePercent?: number;
  isFavorable?: boolean;
  reason?: string;
  hint?: string;
  description: string;
  needs: string[];
  sparkline?: number[];
}

export interface BuiltPackDashboard {
  packId: string;
  packName: string;
  roleMap: Record<string, string>;
  matchedRoles: string[];
  missingRoles: string[];
  computedKpis: ComputedPackKpi[];
  kpis: KPI[];
  charts: VisualConfig[];
}

export interface BuiltPackReportSection {
  title: string;
  kpiSummaries: {
    id: string;
    label: string;
    formattedValue: string;
    status: 'available' | 'unavailable';
    changePercent?: number;
    goodDirection: 'up' | 'down';
  }[];
  chartTitles: string[];
  narrative: string;
}

export interface BuiltPackReport {
  packId: string;
  packName: string;
  generatedAt: string;
  rowCount: number;
  sections: BuiltPackReportSection[];
  topPerformer?: { category: string; value: number; formattedValue: string };
  bottomPerformer?: { category: string; value: number; formattedValue: string };
  anomalyCount: number;
  overallTrendPct: number;
}
