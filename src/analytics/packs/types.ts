import { ColumnProfile } from '../../types';
import { ChartRecommendation } from '../../engine/chartRecommendationEngine';

export type ColumnSchema = ColumnProfile;
export interface DatasetProfile {
  rowCount: number;
  columns: ColumnProfile[];
}

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

export type PackCategory =
  | 'Finance & Risk'
  | 'Revenue & Growth'
  | 'Product & Web'
  | 'Operations & Supply'
  | 'People & Sector';

export type Role = string;

export type KpiUnit = 'currency' | 'percent' | 'ratio' | 'count' | 'days' | 'score';

export type FavorableDirection = 'up' | 'down';

export type ChartIntent =
  | 'trend'
  | 'comparison'
  | 'composition'
  | 'distribution'
  | 'ranking'
  | 'Exception';

export type LensId = 'exec' | 'ops' | 'Perf' | 'risk';

export interface PackRoleDefinition {
  type: 'number' | 'date' | 'category';
  aliases: string[];
  description?: string;
}

export interface PackLensesConfig {
  descriptive: string[];
  diagnostic: string[];
  predictive: string[];
  prescriptive: string[];
}

export type HybridPackLenses = PackLensConfig[] & PackLensesConfig;

export type HybridSampleDataset = (() => Record<string, any>[]) & {
  name: string;
  rows: Record<string, any>[];
};

export interface PackKpiConfig {
  id: string;
  title: string;
  unit: KpiUnit;
  favorableDirection: FavorableDirection;
  requiredRoles: Role[];
  /** Plain-English definition shown in the KPI "i" tooltip */
  formulaText: string;
  /** Standard mathematical formula / source definition (e.g., "DSO = (Accounts Receivable / Total Credit Revenue) × 365") */
  source: string;
  /** Optional explicit assumption note surfaced in the UI when a formula uses a standard assumption */
  assumption?: string;
  formula: (rows: Record<string, any>[], roleMap: Record<Role, string>) => number | null;
  target?: number;
}

export interface PackChartConfig {
  id: string;
  title: string;
  subtitle: string;
  intent: ChartIntent;
  xRole: Role;
  yRoles: Role[];
  aggregation?: 'sum' | 'avg' | 'count';
}

export interface PackLensConfig {
  id: LensId;
  name: string;
  description: string;
  kpiIds: string[];
  chartIds: string[];
}

export interface AnalyticsPackConfig {
  id: PackId;
  name: string;
  category?: PackCategory;
  icon: string;
  description: string;
  detect: {
    keywords: string[];
    requiredRoles: Role[];
    optionalRoles: Role[];
    roleAliases: Record<Role, string[]>;
  };
  taxonomy: {
    dimensions: Role[];
    measures: Role[];
  };
  kpis: PackKpiConfig[];
  charts: PackChartConfig[];
  lenses: PackLensConfig[] | HybridPackLenses;
  reportSections: string[];
  sampleDataset:
    | {
        name: string;
        rows: Record<string, any>[];
      }
    | HybridSampleDataset;
  roles?: Record<Role, PackRoleDefinition>;
}

export interface EnrichedAnalyticsPackConfig extends Omit<AnalyticsPackConfig, 'lenses' | 'sampleDataset' | 'roles'> {
  category: PackCategory;
  lenses: HybridPackLenses;
  sampleDataset: HybridSampleDataset;
  roles: Record<Role, PackRoleDefinition>;
}

export interface PackDetectionMatch {
  packId: PackId;
  packName: string;
  confidence: number; // 0..100
  matchedRoles: Record<Role, string>;
  missingRequiredRoles: Role[];
  matchedKeywords: number;
  /** True when confidence < 60, prompting UI to show "Not sure, please choose" */
  isUncertain: boolean;
  /** Recommendation banner text ("Recommended for your data" or "Not sure, please choose") */
  recommendationMessage: string;
}

export interface ComputedPackKpi {
  id: string;
  title: string;
  label: string;
  unit: KpiUnit;
  favorableDirection: FavorableDirection;
  goodDirection: FavorableDirection;
  requiredRoles: Role[];
  needs: Role[];
  formulaText: string;
  source: string;
  assumption?: string;
  description: string;
  value: number | null;
  formattedValue: string;
  deltaPct: number | null;
  changePercent: number | null;
  isFavorableDelta: boolean | null;
  sparkline: number[];
  status: 'available' | 'unavailable' | 'ready';
  missingRoles: Role[];
  reason?: string;
  hint?: string;
  target?: number;
}

export interface ComputedPackChart {
  id: string;
  title: string;
  subtitle: string;
  intent: ChartIntent;
  chartType: 'line' | 'bar' | 'area' | 'donut' | 'scatter' | 'composed';
  type: 'line' | 'bar' | 'area' | 'donut' | 'scatter' | 'composed';
  xColumn: string | null;
  categoryField: string;
  yColumns: string[];
  valueField: string;
  secondaryCategoryField?: string;
  secondaryValueField?: string;
  aggregation: 'sum' | 'avg' | 'count';
  data: Record<string, any>[];
  status: 'available' | 'unavailable' | 'ready';
  missingRoles: Role[];
}

export interface DateNormalizationResult {
  normalizedValues: (string | null)[];
  normalizedDates: (string | null)[];
  detectedFormats: ('ISO' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'EXCEL_SERIAL' | 'OTHER')[];
  hasMixedFormats: boolean;
  hasAmbiguousSlashDates: boolean;
  isAmbiguous: boolean;
  warning: string | null;
  warningMessage?: string;
}

export interface BuiltPackDashboard {
  pack: EnrichedAnalyticsPackConfig;
  packId: PackId;
  packName: string;
  roleMapping: Record<Role, string>;
  unmappedRequiredRoles: Role[];
  missingRoles: Role[];
  kpis: ComputedPackKpi[];
  computedKpis: ComputedPackKpi[];
  charts: ComputedPackChart[];
  recommendedCharts: ChartRecommendation[];
  profile: DatasetProfile | null;
  schema: ColumnSchema[];
  executiveNarrative: string[];
  dateWarning?: string | null;
  computeDurationMs?: number;
}

export interface BuiltPackReportSection {
  heading: string;
  title: string;
  body: string;
  narrative: string;
  highlights: string[];
  kpiSummaries: {
    id: string;
    label: string;
    formattedValue: string;
    formulaText: string;
    source: string;
  }[];
}

export interface BuiltPackReport {
  packId: PackId;
  packName: string;
  generatedAt: string;
  datasetName: string;
  rowCount: number;
  sections: BuiltPackReportSection[];
  kpis: ComputedPackKpi[];
}
