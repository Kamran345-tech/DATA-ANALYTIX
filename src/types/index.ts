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
    | 'calculated_column';
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
}

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
  type: 'line' | 'bar' | 'horizontal_bar' | 'stacked_bar' | 'donut' | 'scatter' | 'kpi_card' | 'table';
  categoryField: string;
  valueField: string;
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
