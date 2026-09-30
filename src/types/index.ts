export type DataType = 'string' | 'number' | 'date' | 'boolean';

export interface ColumnProfile {
  name: string;
  originalName: string;
  dataType: DataType;
  totalCount: number;
  nullCount: number;
  nullPercentage: number;
  distinctCount: number;
  uniquePercentage: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
  stdDev?: number;
  mode?: string | number;
  isPrimaryKeyCandidate: boolean;
  isForeignKeyCandidate: boolean;
  foreignKeyTarget?: string;
  topValues: { value: string | number; count: number; percentage: number }[];
  distribution?: { range: string; count: number }[];
  inconsistentFormatsCount: number;
  outliersCount: number;
}

export interface DataQualityReport {
  overallScore: number; // 0 - 100
  completenessScore: number;
  uniquenessScore: number;
  validityScore: number;
  consistencyScore: number;
  totalIssuesCount: number;
  issues: {
    id: string;
    column: string;
    type: 'missing_values' | 'duplicates' | 'outliers' | 'type_mismatch' | 'formatting';
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedRows: number;
    recommendedAction: string;
  }[];
}

export interface MessyDataIssue {
  id: string;
  category: 'whitespace' | 'duplicates' | 'missing' | 'casing' | 'dirty_numbers' | 'outliers' | 'constant_column';
  column: string;
  title: string;
  description: string;
  affectedCount: number;
  severity: 'high' | 'medium' | 'low';
  recommendedAction: string;
  suggestedActionType: TransformationStep['action'];
  actionParameters: Record<string, any>;
}

export interface TransformationStep {
  id: string;
  timestamp: string;
  action: 
    | 'rename_column'
    | 'delete_column'
    | 'change_type'
    | 'fill_missing'
    | 'remove_duplicates'
    | 'trim_whitespace'
    | 'standardize_text'
    | 'filter_rows'
    | 'replace_value'
    | 'calculated_column'
    | 'clean_dirty_numbers'
    | 'cap_outliers'
    | 'drop_null_rows'
    | 'auto_clean_all';
  column?: string;
  parameters: Record<string, any>;
  description: string;
}

export interface TableSchema {
  id: string;
  name: string;
  type: 'fact' | 'dimension';
  columns: ColumnProfile[];
  primaryKey?: string;
  foreignKeys: { column: string; targetTable: string; targetColumn: string }[];
  rowCount: number;
  data: Record<string, any>[];
}

export interface Relationship {
  id: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
  crossFilterDirection: 'single' | 'both';
  isValid: boolean;
  warning?: string;
}

export interface DataModel {
  tables: TableSchema[];
  relationships: Relationship[];
  schemaType: 'star' | 'snowflake' | 'flat';
  validationWarnings: string[];
}

export type KPIStatus = 'On Track' | 'Above Target' | 'Below Target' | 'At Risk';

export interface KPI {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  previousValue?: number;
  formattedPreviousValue?: string;
  change?: number;
  changePercent?: number;
  target?: number;
  status: KPIStatus;
  period: string;
  sourceColumn: string;
  aggregation: 'sum' | 'avg' | 'count' | 'distinct_count' | 'min' | 'max';
  calculation: string;
  traceableSource: string;
  definition?: string;
  formulaExpression?: string;
  businessImpact?: string;
  unit?: string;
}

export interface PriceVolumeMixAnalysis {
  category: string;
  priorRevenue: number;
  currentRevenue: number;
  revenueVariance: number;
  priceVariance: number;
  volumeVariance: number;
  mixVariance: number;
  driverSummary: string;
}

export interface CohortMatrixRow {
  cohort: string;
  customers: number;
  month0: number;
  month1: number;
  month2: number;
  month3: number;
  month4: number;
}

export interface PerformerItem {
  name: string;
  category: string;
  metricValue: number;
  formattedValue: string;
  marginPct?: number;
  sharePct: number;
  status: 'top' | 'bottom';
  recommendation: string;
}

export interface DashboardVersion {
  id: string;
  version: string;
  timestamp: string;
  author: string;
  changeNote: string;
  visualsCount: number;
}

export interface ChartAnnotation {
  id: string;
  chartId: string;
  author: string;
  timestamp: string;
  text: string;
  pointPeriod?: string;
}

export type UserRole = 'admin' | 'analyst' | 'viewer';
export type ThemeMode = 'dark' | 'light';
export type ColorBlindMode = 'default' | 'deuteranopia' | 'high_contrast';

export interface Anomaly {
  id: string;
  title: string;
  metric: string;
  dimension?: string;
  dimensionValue?: string;
  observedValue: number | string;
  expectedValue?: number | string;
  severity: 'low' | 'medium' | 'critical';
  reason: string;
  recommendedAction: string;
  period?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  metric: string;
  potentialImpact: string;
  supportingData: string;
  action: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface Trend {
  metric: string;
  dimension: string;
  direction: 'up' | 'down' | 'flat' | 'volatile';
  changePercent: number;
  peakPoint: { period: string; value: number };
  troughPoint: { period: string; value: number };
  summary: string;
  dataPoints?: { period: string; value: number }[];
}

export interface ForecastPoint {
  period: string;
  actual?: number;
  forecast?: number;
  confidenceLower?: number;
  confidenceUpper?: number;
}

export interface ForecastResult {
  isAvailable: boolean;
  metric: string;
  method: string;
  horizon: number;
  data: ForecastPoint[];
  unavailabilityReason?: string;
}

export interface DAXMeasure {
  id: string;
  name: string;
  formula: string;
  table: string;
  category: 'Time Intelligence' | 'KPI' | 'Financial' | 'Aggregation' | 'Ranking';
  description: string;
  dependencies: string[];
  sourceColumns: string[];
}

export interface VisualConfig {
  id: string;
  title: string;
  type: 
    | 'line' 
    | 'area'
    | 'bar' 
    | 'horizontal_bar' 
    | 'stacked_bar' 
    | 'donut' 
    | 'pie'
    | 'scatter' 
    | 'heatmap' 
    | 'radar' 
    | 'funnel' 
    | 'waterfall' 
    | 'treemap' 
    | 'gauge' 
    | 'kpi_card' 
    | 'table';
  categoryField: string;
  valueField: string;
  secondaryValueField?: string;
  secondaryCategoryField?: string;
  targetValue?: number;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  color?: string;
  sortBy?: 'value_desc' | 'value_asc' | 'category_asc' | 'category_desc';
  topN?: number;
  description?: string;
}

export interface DashboardPage {
  id: string;
  name: string;
  rolePerspective: 'Executive' | 'Finance' | 'Sales' | 'Operations' | 'Analyst';
  visuals: VisualConfig[];
}

export interface AIInsight {
  id: string;
  category: 'Driver' | 'Risk' | 'Opportunity' | 'Operational';
  title: string;
  what: string;
  why: string;
  whoOrWhat: string;
  significance: string;
  action: string;
  relatedMetric: string;
  supportingData: string;
  confidence: number;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  companyName: string;
  department: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
  version: string;
  dataQualityScore: number;
  rowCount: number;
  columnCount: number;
  sourceFileName: string;
}

export interface BrandConfig {
  companyName: string;
  logoUrl?: string;
  tagline: string;
  department: string;
  author: string;
  themeColor: string;
  backgroundColor: string;
  accentColor: string;
}

export interface DrillThroughBreadcrumb {
  id: string;
  depth: number;
  label: string;
  subLabel?: string;
  filterColumn?: string;
  filterValue?: any;
  kpiId?: string;
  kpiName?: string;
  rowCount: number;
  metricSummary?: {
    name: string;
    sum: number;
    avg: number;
    min: number;
    max: number;
  };
}

export interface DrillThroughState {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  kpi?: KPI;
  breadcrumbs: DrillThroughBreadcrumb[];
  activeBreadcrumbIndex: number;
  sourceContext?: 'kpi_card' | 'chart_bar' | 'donut_slice' | 'pareto_bar' | 'table_row' | 'general';
}

