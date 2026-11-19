import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  FileCode,
  Database,
  Archive,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Image as ImageIcon,
  Table as TableIcon,
  Lock,
  Presentation,
  Copy,
  Check,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useToast } from '../../store/useToast';
import { loadFeatureFlags } from '../../config/features';
import { buildSopFileName, buildSopMetadata, buildSopCodeHeaderComment } from '../../config/designTokens';
import type { ExportDataPayload } from '../../engine/exportEngine';

export type DownloadMenuContext =
  | 'executive_dashboard'
  | 'analytics_pack'
  | 'dashboard_builder'
  | 'chart'
  | 'preview'
  | 'quality'
  | 'cleaning'
  | 'modeling'
  | 'sql_lab'
  | 'dax_lab'
  | 'python_lab'
  | 'reports'
  | 'export_center';

export interface ChartDownloadPayload {
  chartId?: string;
  chartTitle?: string;
  chartType?: string;
  containerEl?: HTMLElement | null;
  containerSelector?: string;
  categoryField?: string;
  secondaryCategoryField?: string;
  valueField?: string;
  secondaryValueField?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
  fallbackItems?: { category: string; value: number; share: number }[];
  onExportPng?: () => Promise<void> | void;
  onExportCsv?: () => Promise<void> | void;
}

export interface DownloadMenuProps {
  context: DownloadMenuContext;
  label?: string;
  compact?: boolean;
  customSql?: string;
  customPython?: string;
  chartPayload?: ChartDownloadPayload;
  packId?: string;
  className?: string;
}

interface DownloadFormatItem {
  id: string;
  label: string;
  ext: string;
  description: string;
  sizeEstimate?: string;
  supportsReportConfig?: boolean;
  requiresData: boolean;
  icon: React.FC<{ className?: string }>;
}

const PACK_CHOICE_OPTIONS = [
  { id: 'financial', name: 'Financial & P&L Analytics' },
  { id: 'sales', name: 'Sales & Pipeline Performance' },
  { id: 'marketing', name: 'Marketing & Growth Attribution' },
  { id: 'customer', name: 'Customer Success & Retention' },
  { id: 'product', name: 'Product & Engagement Telemetry' },
  { id: 'web', name: 'Web & Digital Funnel Analytics' },
  { id: 'operations', name: 'Operations & Supply Chain' },
  { id: 'hr', name: 'HR & Workforce Intelligence' },
  { id: 'risk-fraud', name: 'Risk, Compliance & Fraud' },
  { id: 'healthcare', name: 'Healthcare & Clinical Outcomes' },
  { id: 'retail', name: 'Retail & Merchandising' },
  { id: 'manufacturing', name: 'Manufacturing & OEE Quality' },
  { id: 'banking-insurance', name: 'Banking & Insurance Portfolio' },
  { id: 'education', name: 'Education & Student Success' },
];

export type ReportSectionKey =
  | 'cover'
  | 'executive_summary'
  | 'kpis'
  | 'charts'
  | 'insights'
  | 'data_quality'
  | 'appendix';

const REPORT_SECTIONS_LIST: { id: ReportSectionKey; label: string }[] = [
  { id: 'cover', label: 'Cover' },
  { id: 'executive_summary', label: 'Executive Summary' },
  { id: 'kpis', label: 'KPIs' },
  { id: 'charts', label: 'Charts' },
  { id: 'insights', label: 'Insights' },
  { id: 'data_quality', label: 'Data Quality' },
  { id: 'appendix', label: 'Appendix' },
];

const CONTEXT_FORMATS: Record<DownloadMenuContext, DownloadFormatItem[]> = {
  executive_dashboard: [
    {
      id: 'executive_pdf',
      label: 'Executive Report (PDF)',
      ext: 'pdf',
      description: 'A4 boardroom intelligence report with KPIs & audit tables',
      sizeEstimate: '~380 KB',
      supportsReportConfig: true,
      requiresData: true,
      icon: FileText,
    },
    {
      id: 'presentation_pptx',
      label: 'Presentation (PPTX)',
      ext: 'pptx',
      description: '16:9 widescreen slide deck with cover, KPIs, charts & recommendations',
      sizeEstimate: '~460 KB',
      supportsReportConfig: true,
      requiresData: false,
      icon: Presentation,
    },
    {
      id: 'report_presentation_bundle_zip',
      label: 'Report + Presentation bundle (ZIP)',
      ext: 'zip',
      description: 'Combined ZIP archive containing Executive PDF, PPTX deck & audited CSV data',
      sizeEstimate: '~920 KB',
      supportsReportConfig: true,
      requiresData: false,
      icon: Archive,
    },
    {
      id: 'standalone_html',
      label: 'Offline Dashboard (HTML)',
      ext: 'html',
      description: 'Self-contained interactive HTML with prefers-color-scheme tokens',
      sizeEstimate: '~185 KB',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'dashboard_config_json',
      label: 'Dashboard config (JSON)',
      ext: 'json',
      description: 'Portable dashboard layout, KPI definitions & visual specifications',
      sizeEstimate: '~32 KB',
      requiresData: false,
      icon: FileCode,
    },
    {
      id: 'excel_workbook',
      label: 'Workbook (XLSX)',
      ext: 'xlsx',
      description: 'Multi-sheet Excel workbook with frozen headers & metadata',
      sizeEstimate: '~240 KB',
      requiresData: true,
      icon: FileSpreadsheet,
    },
    {
      id: 'clean_csv',
      label: 'Data (CSV)',
      ext: 'csv',
      description: 'Cleaned & filtered dataset rows in UTF-8 CSV format',
      sizeEstimate: '~95 KB',
      requiresData: true,
      icon: TableIcon,
    },
    {
      id: 'project_zip',
      label: 'Full project bundle (ZIP)',
      ext: 'zip',
      description: 'Full 14-folder sovereign analytics package with manifest & scripts',
      sizeEstimate: '~1.4 MB',
      supportsReportConfig: true,
      requiresData: true,
      icon: Archive,
    },
  ],
  analytics_pack: [
    {
      id: 'pack_report_pdf',
      label: 'Executive Report (PDF)',
      ext: 'pdf',
      description: 'Domain-specific A4 report with pack KPIs, lenses, and role templates',
      sizeEstimate: '~390 KB',
      supportsReportConfig: true,
      requiresData: false,
      icon: FileText,
    },
    {
      id: 'presentation_pptx',
      label: 'Presentation (PPTX)',
      ext: 'pptx',
      description: '16:9 domain slide deck with pack theme, KPIs, charts & 4-lens insights',
      sizeEstimate: '~480 KB',
      supportsReportConfig: true,
      requiresData: false,
      icon: Presentation,
    },
    {
      id: 'pack_bundle_zip',
      label: 'Report + Presentation bundle (ZIP)',
      ext: 'zip',
      description: 'Complete pack dashboard specification, PDF report, PPTX deck & data archive',
      sizeEstimate: '~960 KB',
      supportsReportConfig: true,
      requiresData: false,
      icon: Archive,
    },
    {
      id: 'standalone_html',
      label: 'Offline Dashboard (HTML)',
      ext: 'html',
      description: 'Self-contained interactive HTML dashboard with pack tokens',
      sizeEstimate: '~190 KB',
      requiresData: false,
      icon: FileCode,
    },
    {
      id: 'dashboard_config_json',
      label: 'Dashboard config (JSON)',
      ext: 'json',
      description: 'Pack dashboard configuration, role mappings & computed KPI telemetry',
      sizeEstimate: '~36 KB',
      requiresData: false,
      icon: FileCode,
    },
    {
      id: 'pack_excel',
      label: 'Workbook (XLSX)',
      ext: 'xlsx',
      description: 'Multi-sheet Excel workbook with pack KPIs, rows, or role template',
      sizeEstimate: '~250 KB',
      requiresData: false,
      icon: FileSpreadsheet,
    },
    {
      id: 'pack_csv',
      label: 'Data (CSV)',
      ext: 'csv',
      description: 'Active dataset rows or role-header template CSV if empty',
      sizeEstimate: '~85 KB',
      requiresData: false,
      icon: TableIcon,
    },
    {
      id: 'pack_template_csv',
      label: 'Pack Data Template (CSV)',
      ext: 'csv',
      description: 'Expected role headers + 3 sample rows for this analytics pack',
      sizeEstimate: '~12 KB',
      requiresData: false,
      icon: BookOpen,
    },
  ],
  dashboard_builder: [
    {
      id: 'executive_pdf',
      label: 'Executive Report (PDF)',
      ext: 'pdf',
      description: 'A4 visual breakdown report with 20mm margins',
      sizeEstimate: '~360 KB',
      supportsReportConfig: true,
      requiresData: true,
      icon: FileText,
    },
    {
      id: 'presentation_pptx',
      label: 'Presentation (PPTX)',
      ext: 'pptx',
      description: '16:9 presentation slides built from your custom Builder layout',
      sizeEstimate: '~450 KB',
      supportsReportConfig: true,
      requiresData: false,
      icon: Presentation,
    },
    {
      id: 'report_presentation_bundle_zip',
      label: 'Report + Presentation bundle (ZIP)',
      ext: 'zip',
      description: 'Combined ZIP with custom Builder PDF report, PPTX deck & CSV data',
      sizeEstimate: '~910 KB',
      supportsReportConfig: true,
      requiresData: false,
      icon: Archive,
    },
    {
      id: 'standalone_html',
      label: 'Offline Dashboard (HTML)',
      ext: 'html',
      description: '100% offline HTML dashboard with embedded semantic tokens',
      sizeEstimate: '~180 KB',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'dashboard_config_json',
      label: 'Dashboard config (JSON)',
      ext: 'json',
      description: 'Custom Builder visual canvas specification & data bindings',
      sizeEstimate: '~30 KB',
      requiresData: false,
      icon: FileCode,
    },
    {
      id: 'excel_workbook',
      label: 'Workbook (XLSX)',
      ext: 'xlsx',
      description: 'Formatted Excel workbook backing all canvas cards',
      sizeEstimate: '~230 KB',
      requiresData: true,
      icon: FileSpreadsheet,
    },
    {
      id: 'clean_csv',
      label: 'Data (CSV)',
      ext: 'csv',
      description: 'Cleaned & filtered dataset rows in UTF-8 CSV format',
      sizeEstimate: '~90 KB',
      requiresData: true,
      icon: TableIcon,
    },
    {
      id: 'project_zip',
      label: 'Full project bundle (ZIP)',
      ext: 'zip',
      description: 'Complete dashboard specification, HTML, PDF, and CSV bundle',
      sizeEstimate: '~1.3 MB',
      supportsReportConfig: true,
      requiresData: true,
      icon: Archive,
    },
  ],
  chart: [
    {
      id: 'chart_png',
      label: 'Chart Image (PNG)',
      ext: 'png',
      description: 'High-DPI chart graphic with brand header & provenance',
      requiresData: true,
      icon: ImageIcon,
    },
    {
      id: 'chart_csv',
      label: 'Plotted Series Data (CSV)',
      ext: 'csv',
      description: 'Exact aggregated values plotted in this visualization',
      requiresData: true,
      icon: TableIcon,
    },
  ],
  preview: [
    {
      id: 'clean_csv',
      label: 'Cleaned Data Grid (CSV)',
      ext: 'csv',
      description: 'Audited dataset rows in UTF-8 CSV format',
      requiresData: true,
      icon: TableIcon,
    },
    {
      id: 'excel_workbook',
      label: 'Formatted Excel Workbook (XLSX)',
      ext: 'xlsx',
      description: 'ExcelJS workbook with semantic teal header fill & frozen row 1',
      requiresData: true,
      icon: FileSpreadsheet,
    },
    {
      id: 'clean_json',
      label: 'Structured Records (JSON)',
      ext: 'json',
      description: 'Typed JSON array with SOP provenance envelope',
      requiresData: true,
      icon: FileCode,
    },
  ],
  quality: [
    {
      id: 'quality_json',
      label: '4D Quality Audit Report (JSON)',
      ext: 'json',
      description: 'Completeness, uniqueness, validity & anomaly telemetry',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'executive_pdf',
      label: 'Quality Governance Report (PDF)',
      ext: 'pdf',
      description: 'A4 data quality certification & executive summary PDF',
      requiresData: true,
      icon: FileText,
    },
    {
      id: 'dictionary_csv',
      label: 'Column Health Profile (CSV)',
      ext: 'csv',
      description: 'Column-by-column null rates, cardinality & min/max stats',
      requiresData: true,
      icon: TableIcon,
    },
  ],
  cleaning: [
    {
      id: 'clean_csv',
      label: 'Cleaned Dataset (CSV)',
      ext: 'csv',
      description: 'Post-transformation dataset ready for modeling',
      requiresData: true,
      icon: TableIcon,
    },
    {
      id: 'excel_workbook',
      label: 'Cleaned Workbook + Audit Log (XLSX)',
      ext: 'xlsx',
      description: 'Includes 02_Clean_Data, 01_Raw_Data, and Change_Log sheets',
      requiresData: true,
      icon: FileSpreadsheet,
    },
    {
      id: 'powerquery_m',
      label: 'Power Query Transformations (.m)',
      ext: 'm',
      description: 'Power BI M script reproducing cleaning steps',
      requiresData: true,
      icon: FileCode,
    },
  ],
  modeling: [
    {
      id: 'model_bim',
      label: 'Tabular Model Schema (.bim)',
      ext: 'bim',
      description: 'Power BI / Analysis Services Tabular Model JSON definition',
      requiresData: true,
      icon: Database,
    },
    {
      id: 'schema_json',
      label: 'Star Schema Relationships (JSON)',
      ext: 'json',
      description: 'Fact/dimension tables, keys, and 1:N cardinality definitions',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'dictionary_csv',
      label: 'Data Dictionary (CSV)',
      ext: 'csv',
      description: 'Full column lineage, roles, and statistical profiles',
      requiresData: true,
      icon: TableIcon,
    },
  ],
  sql_lab: [
    {
      id: 'sql_script',
      label: 'Analytical SQL Queries (.sql)',
      ext: 'sql',
      description: 'ANSI SQL script with SOP provenance header comment',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'clean_csv',
      label: 'Query Source Table (CSV)',
      ext: 'csv',
      description: 'Export active SQL table rows to CSV',
      requiresData: true,
      icon: TableIcon,
    },
    {
      id: 'excel_workbook',
      label: 'SQL Data Workbook (XLSX)',
      ext: 'xlsx',
      description: 'Formatted Excel workbook with frozen header row',
      requiresData: true,
      icon: FileSpreadsheet,
    },
  ],
  dax_lab: [
    {
      id: 'dax_script',
      label: 'Enterprise DAX Library (.dax)',
      ext: 'dax',
      description: 'DAX measures with SOP provenance header comment',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'model_bim',
      label: 'Power BI Model.bim (.bim)',
      ext: 'bim',
      description: 'Tabular model embedding all DAX measures',
      requiresData: true,
      icon: Database,
    },
  ],
  python_lab: [
    {
      id: 'python_script',
      label: 'Reproducible Pipeline (.py)',
      ext: 'py',
      description: 'Pandas/Seaborn script with SOP provenance header block',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'clean_csv',
      label: 'DataFrame Export (CSV)',
      ext: 'csv',
      description: 'Cleaned dataset backing the Python analysis',
      requiresData: true,
      icon: TableIcon,
    },
  ],
  reports: [
    {
      id: 'executive_pdf',
      label: 'Executive Report (PDF)',
      ext: 'pdf',
      description: 'A4 20mm-margin report with KPIs, insights & governance',
      sizeEstimate: '~380 KB',
      supportsReportConfig: true,
      requiresData: true,
      icon: FileText,
    },
    {
      id: 'presentation_pptx',
      label: 'Presentation (PPTX)',
      ext: 'pptx',
      description: '16:9 widescreen executive presentation slide deck',
      sizeEstimate: '~460 KB',
      supportsReportConfig: true,
      requiresData: false,
      icon: Presentation,
    },
    {
      id: 'report_presentation_bundle_zip',
      label: 'Report + Presentation bundle (ZIP)',
      ext: 'zip',
      description: 'Combined ZIP with Executive Report PDF, PPTX slides & CSV data',
      sizeEstimate: '~940 KB',
      supportsReportConfig: true,
      requiresData: false,
      icon: Archive,
    },
    {
      id: 'standalone_html',
      label: 'Offline Dashboard (HTML)',
      ext: 'html',
      description: 'Self-contained offline HTML report & dashboard',
      sizeEstimate: '~185 KB',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'dashboard_config_json',
      label: 'Dashboard config (JSON)',
      ext: 'json',
      description: 'Portable report & dashboard configuration specification',
      sizeEstimate: '~32 KB',
      requiresData: false,
      icon: FileCode,
    },
    {
      id: 'excel_workbook',
      label: 'Workbook (XLSX)',
      ext: 'xlsx',
      description: 'Multi-sheet Excel workbook with frozen headers',
      sizeEstimate: '~240 KB',
      requiresData: true,
      icon: FileSpreadsheet,
    },
    {
      id: 'clean_csv',
      label: 'Data (CSV)',
      ext: 'csv',
      description: 'Audited dataset rows backing the report',
      sizeEstimate: '~95 KB',
      requiresData: true,
      icon: TableIcon,
    },
    {
      id: 'project_zip',
      label: 'Full project bundle (ZIP)',
      ext: 'zip',
      description: '14-folder sovereign analytics archive',
      sizeEstimate: '~1.4 MB',
      supportsReportConfig: true,
      requiresData: true,
      icon: Archive,
    },
    {
      id: 'report_md',
      label: 'Executive Briefing (.md)',
      ext: 'md',
      description: 'Structured Markdown executive report with SOP metadata',
      sizeEstimate: '~18 KB',
      requiresData: true,
      icon: FileText,
    },
  ],
  export_center: [
    {
      id: 'project_zip',
      label: 'Complete 14-Folder Bundle (ZIP)',
      ext: 'zip',
      description: 'All data, Excel, PDF, HTML, SQL, DAX, Python & Power BI files',
      requiresData: true,
      icon: Archive,
    },
    {
      id: 'executive_pdf',
      label: 'Executive Intelligence Report (PDF)',
      ext: 'pdf',
      description: 'A4 boardroom PDF following DESIGN-SOP.md',
      requiresData: true,
      icon: FileText,
    },
    {
      id: 'excel_workbook',
      label: 'Enterprise Excel Workbook (XLSX)',
      ext: 'xlsx',
      description: 'ExcelJS workbook with frozen headers & 00_Metadata',
      requiresData: true,
      icon: FileSpreadsheet,
    },
    {
      id: 'standalone_html',
      label: 'Standalone Offline Dashboard (HTML)',
      ext: 'html',
      description: 'Zero-dependency HTML dashboard with prefers-color-scheme',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'sql_script',
      label: 'Analytical SQL Queries (.sql)',
      ext: 'sql',
      description: 'ANSI SQL script with SOP header comment',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'dax_script',
      label: 'DAX Measure Library (.dax)',
      ext: 'dax',
      description: 'Power BI DAX measures with SOP header comment',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'python_script',
      label: 'Python Analysis Script (.py)',
      ext: 'py',
      description: 'Reproducible Pandas pipeline with SOP header comment',
      requiresData: true,
      icon: FileCode,
    },
  ],
};

const NO_DATA_READY_FORMATS: DownloadFormatItem[] = [
  {
    id: 'chart_guide_pdf',
    label: 'Chart Selection Guide (PDF)',
    ext: 'pdf',
    description: 'Complete 8-chart visual decision handbook (works without data)',
    requiresData: false,
    icon: BookOpen,
  },
  {
    id: 'design_sop_md',
    label: 'Design & Export SOP Guide (.md)',
    ext: 'md',
    description: 'Official Data Analytix typography, token & layout standard',
    requiresData: false,
    icon: FileText,
  },
  {
    id: 'blank_csv_template',
    label: 'Blank Schema Template (CSV)',
    ext: 'csv',
    description: 'Expected column headers with 0 fake rows for clean upload',
    requiresData: false,
    icon: TableIcon,
  },
  {
    id: 'blank_excel_template',
    label: 'Blank Excel Template (XLSX)',
    ext: 'xlsx',
    description: 'Styled semantic teal header workbook with frozen row 1 (0 rows)',
    requiresData: false,
    icon: FileSpreadsheet,
  },
  {
    id: 'sample_dataset_csv',
    label: 'Sample Retail Dataset (CSV)',
    ext: 'csv',
    description: 'Deterministic enterprise sales CSV for immediate testing',
    requiresData: false,
    icon: Database,
  },
  {
    id: 'powerbi_theme_json',
    label: 'Power BI Unified Theme (.json)',
    ext: 'json',
    description: 'Official Data Analytix 8-series palette for Power BI Desktop',
    requiresData: false,
    icon: FileCode,
  },
];

function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

/**
 * Non-blocking chunked CSV builder for large datasets (10,000+ rows)
 */
async function buildChunkedCsvAsync(
  rows: Record<string, any>[],
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (val: any): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [headers.map(escapeCell).join(',')];
  const chunkSize = 2500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, rows.length);
    for (let j = i; j < end; j++) {
      const r = rows[j];
      lines.push(headers.map((h) => escapeCell(r[h])).join(','));
    }
    if (onProgress) {
      onProgress(Math.round((end / rows.length) * 100));
    }
    if (end < rows.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return lines.join('\n');
}

export const DownloadMenu: React.FC<DownloadMenuProps> = ({
  context,
  label = 'Download',
  compact = false,
  customSql,
  customPython,
  chartPayload,
  packId,
  className = '',
}) => {
  const {
    project,
    brand,
    rawRows,
    cleanRows,
    filteredRows,
    columns,
    dataModel,
    analytics,
    daxMeasures,
    transformations,
    qualityReport,
    customVisuals,
    themeMode,
    loadDemoDataset,
    activePackId,
  } = usePlatform();
  const kpis = analytics?.kpis || [];
  const insights = analytics?.insights || [];

  const { addToast } = useToast();
  const flags = loadFeatureFlags();
  const [isOpen, setIsOpen] = useState(false);
  const [activeExportId, setActiveExportId] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    if (context === 'analytics_pack') return 'pack_report_pdf';
    return 'executive_pdf';
  });
  const [reportScope, setReportScope] = useState<'current_dashboard' | 'pack' | 'custom_builder' | 'all'>(() => {
    if (context === 'analytics_pack') return 'pack';
    if (context === 'dashboard_builder') return 'custom_builder';
    return 'current_dashboard';
  });
  const [selectedPackScopeId, setSelectedPackScopeId] = useState<string>(() => packId || activePackId || 'financial');
  const [selectedSections, setSelectedSections] = useState<Record<ReportSectionKey, boolean>>({
    cover: true,
    executive_summary: true,
    kpis: true,
    charts: true,
    insights: true,
    data_quality: true,
    appendix: true,
  });
  const [audienceTemplate, setAudienceTemplate] = useState<'Board' | 'Manager' | 'Analyst'>('Board');
  const [copiedSummary, setCopiedSummary] = useState(false);

  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({
    top: 64,
    left: 16,
    width: 440,
  });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const activeRows = filteredRows && filteredRows.length > 0 ? filteredRows : cleanRows;
  const hasData = activeRows && activeRows.length > 0;
  const datasetSlug = project?.name || project?.sourceFileName || (hasData ? 'dataset' : 'reference');

  useEffect(() => {
    if (packId || activePackId) {
      setSelectedPackScopeId(packId || activePackId || 'financial');
    }
  }, [packId, activePackId]);

  const computeMenuPosition = () => {
    if (typeof window === 'undefined' || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(460, Math.max(300, window.innerWidth - 16));
    const rawLeft =
      rect.left + width <= window.innerWidth - 8
        ? rect.left
        : rect.right - width;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - width - 8));
    const maxTop = Math.max(8, window.innerHeight - 520);
    const top = Math.max(8, Math.min(rect.bottom + 6, maxTop));
    setMenuPos({ top, left, width });
  };

  useEffect(() => {
    if (!isOpen) return;
    computeMenuPosition();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        (!panelRef.current || !panelRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleReposition = () => computeMenuPosition();
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen]);

  const contextItems = CONTEXT_FORMATS[context] || CONTEXT_FORMATS.executive_dashboard;
  const selectedFormatItem =
    contextItems.find((it) => it.id === selectedItemId) ||
    NO_DATA_READY_FORMATS.find((it) => it.id === selectedItemId) ||
    contextItems[0];

  // Standardized Phase 3 filename: <dataset>_<pack>_<type>_<YYYY-MM-DD>.<ext>
  const buildStandardizedCenterFileName = (item: DownloadFormatItem): string => {
    const cleanSlug = (val: string) =>
      (val || 'dataset')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'dataset';
    const dSlug = cleanSlug(datasetSlug);
    const pSlug =
      reportScope === 'pack'
        ? cleanSlug(selectedPackScopeId)
        : reportScope === 'custom_builder'
        ? 'builder'
        : reportScope === 'all'
        ? 'all-packs'
        : cleanSlug(packId || activePackId || 'executive');
    const tSlug = cleanSlug(item.id.replace(/_/g, '-'));
    const dateStr = new Date().toISOString().slice(0, 10);
    return `${dSlug}_${pSlug}_${tSlug}_${dateStr}.${item.ext}`;
  };

  const handleCopySummary = async () => {
    const activeSectionLabels = REPORT_SECTIONS_LIST.filter((s) => selectedSections[s.id]).map((s) => s.label);
    const topKpiLines = kpis
      .slice(0, 4)
      .map((k) => `• ${k.name}: ${k.formattedValue} (${k.status})`)
      .join('\n');
    const summaryText = [
      `DATA-ANALYTIX EXPORT SUMMARY — ${project?.name || 'Dataset'}`,
      `Scope: ${
        reportScope === 'pack'
          ? `Analytics Pack (${selectedPackScopeId})`
          : reportScope === 'custom_builder'
          ? 'Custom Builder Layout'
          : reportScope === 'all'
          ? 'All Dashboards & Packs'
          : 'Current Dashboard'
      }`,
      `Audience Template: ${audienceTemplate}`,
      `Format: ${selectedFormatItem.label} (${buildStandardizedCenterFileName(selectedFormatItem)})`,
      `Sections: ${activeSectionLabels.join(', ')}`,
      `Audited Rows: ${activeRows.length.toLocaleString()} | Data Quality: ${qualityReport?.overallScore ?? 100}%`,
      topKpiLines ? `\nKey Metrics:\n${topKpiLines}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summaryText);
      }
      setCopiedSummary(true);
      addToast({
        type: 'success',
        title: 'Summary Copied',
        message: 'Copied executive report summary & KPI telemetry to clipboard.',
      });
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    }
  };

  const handleLoadSampleDataset = () => {
    loadDemoDataset('global-retail-sales');
    addToast({
      type: 'success',
      title: 'Sample Dataset Loaded',
      message: 'Loaded Global Enterprise Retail Sales. All view-specific exports are now unlocked.',
    });
  };

  const handleDownloadFormat = async (
    item: DownloadFormatItem,
    options?: { useStandardizedName?: boolean }
  ) => {
    if (item.requiresData && !hasData) {
      addToast({
        type: 'warning',
        title: 'Dataset Required',
        message: 'Load a dataset first or click "Use sample dataset" to enable data-backed exports.',
      });
      return;
    }

    setActiveExportId(item.id);
    setProgressPct(15);

    try {
      // Yield a frame so spinner renders smoothly
      await new Promise((r) => setTimeout(r, 10));

      const exportEngine = await import('../../engine/exportEngine');
      setProgressPct(45);
      const payload: ExportDataPayload = {
        project,
        brand,
        rawRows,
        cleanRows: activeRows,
        columns,
        dataModel,
        kpis,
        daxMeasures,
        insights,
        transformations,
        qualityReport,
      };

      let downloadedFilename = '';
      const targetPackId =
        reportScope === 'pack' ? selectedPackScopeId : packId || activePackId || 'financial';

      switch (item.id) {
        case 'chart_guide_pdf': {
          const res = exportEngine.downloadChartGuidePDF({
            datasetName: hasData ? project.name : undefined,
            columns: hasData ? columns : [],
            rows: hasData ? activeRows : [],
            includeDatasetRecommendations: hasData,
          });
          downloadedFilename = res.filename;
          break;
        }
        case 'design_sop_md': {
          const md = exportEngine.generateDesignSopMarkdown(
            datasetSlug,
            activeRows.length,
            columns.length
          );
          downloadedFilename = buildSopFileName('design-sop', datasetSlug, 'md');
          triggerBlobDownload(new Blob([md], { type: 'text/markdown;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'blank_csv_template': {
          const csv = exportEngine.generateBlankCsvTemplate(columns);
          downloadedFilename = buildSopFileName('blank-template', 'schema', 'csv');
          triggerBlobDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'blank_excel_template': {
          downloadedFilename = buildSopFileName('blank-template', 'schema', 'xlsx');
          const blob = await exportEngine.generateBlankExcelTemplateAsync(columns, false);
          triggerBlobDownload(blob, downloadedFilename);
          break;
        }
        case 'sample_dataset_csv': {
          const sample = exportEngine.generateSampleDatasetCsv('global-retail-sales');
          downloadedFilename = buildSopFileName('sample-dataset', sample.datasetName, 'csv');
          triggerBlobDownload(new Blob([sample.csv], { type: 'text/csv;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'powerbi_theme_json': {
          const json = exportEngine.generatePowerBIThemeJSON(brand, datasetSlug);
          downloadedFilename = buildSopFileName('powerbi-theme', datasetSlug, 'json');
          triggerBlobDownload(new Blob([json], { type: 'application/json;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'dashboard_config_json': {
          const configPayload = {
            dashboardTitle: project?.name || 'Dashboard Specification',
            exportedAt: new Date().toISOString(),
            scope: reportScope,
            packId: targetPackId,
            audienceTemplate,
            includedSections: REPORT_SECTIONS_LIST.filter((s) => selectedSections[s.id]).map((s) => s.id),
            rowCount: activeRows.length,
            columnCount: columns.length,
            kpis,
            customVisuals,
          };
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName('dashboard-config', datasetSlug, 'json');
          triggerBlobDownload(
            new Blob([JSON.stringify(configPayload, null, 2)], { type: 'application/json;charset=utf-8;' }),
            downloadedFilename
          );
          break;
        }
        case 'presentation_pptx': {
          const { generatePresentationPptxBlob } = await import('../../engine/pptxGenerator');
          const { blob } = await generatePresentationPptxBlob({
            datasetName: project?.name || 'Enterprise Dataset',
            companyName: brand.companyName,
            department: brand.department,
            author: brand.author,
            scope: reportScope,
            packId: targetPackId,
            audience: audienceTemplate,
            includedSections: REPORT_SECTIONS_LIST.filter((s) => selectedSections[s.id]).map(
              (s) => s.id
            ),
            rows: activeRows,
            columns,
            kpis,
            insights,
            qualityReport,
            customVisuals,
          });
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName('presentation-deck', datasetSlug, 'pptx');
          triggerBlobDownload(blob, downloadedFilename);
          break;
        }
        case 'report_presentation_bundle_zip': {
          const [{ generatePresentationPptxBlob }, JSZipMod] = await Promise.all([
            import('../../engine/pptxGenerator'),
            import('jszip'),
          ]);
          const JSZip = (JSZipMod as any).default || JSZipMod;
          const baseZipBlob = await exportEngine.createCompleteProjectZip(payload);
          const zip = await JSZip.loadAsync(baseZipBlob);
          const { blob: pptxBlob } = await generatePresentationPptxBlob({
            datasetName: project?.name || 'Enterprise Dataset',
            companyName: brand.companyName,
            department: brand.department,
            author: brand.author,
            scope: reportScope,
            packId: targetPackId,
            audience: audienceTemplate,
            includedSections: REPORT_SECTIONS_LIST.filter((s) => selectedSections[s.id]).map(
              (s) => s.id
            ),
            rows: activeRows,
            columns,
            kpis,
            insights,
            qualityReport,
            customVisuals,
          });
          const pptxName = buildSopFileName('presentation-deck', datasetSlug, 'pptx');
          zip.file(`01_Executive_Reports/${pptxName}`, pptxBlob);
          const finalZipBlob = await zip.generateAsync({ type: 'blob' });
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName('report-presentation-bundle', datasetSlug, 'zip');
          triggerBlobDownload(finalZipBlob, downloadedFilename);
          break;
        }
        case 'executive_pdf': {
          const doc = exportEngine.generateEnterpriseReportPDF(payload, { customVisuals });
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName('executive-report', datasetSlug, 'pdf');
          doc.save(downloadedFilename);
          break;
        }
        case 'excel_workbook': {
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName('workbook', datasetSlug, 'xlsx');
          const blob = await exportEngine.buildSopExcelWorkbookAsync(payload, false);
          triggerBlobDownload(blob, downloadedFilename);
          break;
        }
        case 'standalone_html': {
          const html = exportEngine.generateStandaloneDashboardHTML(payload, { customVisuals });
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName('dashboard', datasetSlug, 'html');
          triggerBlobDownload(new Blob([html], { type: 'text/html;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'clean_csv': {
          const csv = await buildChunkedCsvAsync(activeRows, setProgressPct);
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName('cleaned-data', datasetSlug, 'csv');
          triggerBlobDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'clean_json': {
          const meta = buildSopMetadata({
            datasetName: datasetSlug,
            rowCount: activeRows.length,
            columnCount: columns.length,
            source: project.sourceFileName || 'Data Analytix Sovereign Engine',
          });
          const json = JSON.stringify({ sopMetadata: meta, records: activeRows }, null, 2);
          downloadedFilename = buildSopFileName('records', datasetSlug, 'json');
          triggerBlobDownload(new Blob([json], { type: 'application/json;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'quality_json': {
          const meta = buildSopMetadata({
            datasetName: datasetSlug,
            rowCount: activeRows.length,
            columnCount: columns.length,
            source: project.sourceFileName || 'Data Analytix Quality Audit',
          });
          const json = JSON.stringify({ sopMetadata: meta, qualityReport, columnProfiles: columns }, null, 2);
          downloadedFilename = buildSopFileName('quality-audit', datasetSlug, 'json');
          triggerBlobDownload(new Blob([json], { type: 'application/json;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'dictionary_csv': {
          const dictRows = columns.map((c) => ({
            ColumnName: c.name,
            DataType: c.dataType,
            NullCount: c.nullCount,
            NullPercentage: c.nullPercentage,
            DistinctCount: c.distinctCount,
            Min: c.min ?? '',
            Max: c.max ?? '',
            Mean: c.mean ?? '',
            Role: c.isPrimaryKeyCandidate
              ? 'PrimaryKey'
              : c.isForeignKeyCandidate
              ? 'ForeignKey'
              : c.dataType === 'number'
              ? 'Measure'
              : 'Dimension',
          }));
          const csv = await buildChunkedCsvAsync(dictRows);
          downloadedFilename = buildSopFileName('data-dictionary', datasetSlug, 'csv');
          triggerBlobDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'powerquery_m': {
          const mCode = exportEngine.generatePowerBIMSemanticModel(payload);
          downloadedFilename = buildSopFileName('powerquery', datasetSlug, 'm');
          triggerBlobDownload(new Blob([mCode], { type: 'text/plain;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'model_bim': {
          const bim = exportEngine.generateModelBimJSON(payload);
          downloadedFilename = buildSopFileName('tabular-model', datasetSlug, 'bim');
          triggerBlobDownload(new Blob([bim], { type: 'application/json;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'schema_json': {
          const meta = buildSopMetadata({
            datasetName: datasetSlug,
            rowCount: activeRows.length,
            columnCount: columns.length,
            source: project.sourceFileName || 'Data Analytix Data Modeler',
          });
          const json = JSON.stringify({ sopMetadata: meta, dataModel }, null, 2);
          downloadedFilename = buildSopFileName('star-schema', datasetSlug, 'json');
          triggerBlobDownload(new Blob([json], { type: 'application/json;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'sql_script': {
          const sql = exportEngine.generateSopSqlScript(payload, customSql);
          downloadedFilename = buildSopFileName('queries', datasetSlug, 'sql');
          triggerBlobDownload(new Blob([sql], { type: 'application/sql;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'dax_script': {
          const dax = exportEngine.generateSopDaxScript(payload);
          downloadedFilename = buildSopFileName('measures', datasetSlug, 'dax');
          triggerBlobDownload(new Blob([dax], { type: 'text/plain;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'python_script': {
          const py = exportEngine.generateSopPythonScript(payload, customPython);
          downloadedFilename = buildSopFileName('pipeline', datasetSlug, 'py');
          triggerBlobDownload(new Blob([py], { type: 'text/x-python;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'report_md': {
          const meta = buildSopMetadata({
            datasetName: datasetSlug,
            rowCount: activeRows.length,
            columnCount: columns.length,
            source: project.sourceFileName || 'Data Analytix Reports Engine',
          });
          const md = `# Data Analytix Executive Intelligence Briefing: ${project.name}\n\n- **Brand**: ${meta.brand}\n- **Version**: ${meta.appVersion}\n- **Generated Date**: ${meta.generatedDate}\n- **Dataset Name**: ${meta.datasetName}\n- **Audited Rows**: ${meta.rowCount.toLocaleString()}\n- **Quality Score**: ${qualityReport.overallScore}%\n\n## Key Performance Indicators\n${kpis.map((k) => `- **${k.name}**: ${k.formattedValue} (${k.status} | Source: ${k.traceableSource})`).join('\n')}\n\n## Strategic Insights\n${insights.map((ins) => `### ${ins.title} [${ins.category}]\n- **Impact**: ${ins.what}\n- **Root Cause**: ${ins.why}\n- **Directive**: ${ins.action}\n`).join('\n')}\n`;
          downloadedFilename = buildSopFileName('executive-brief', datasetSlug, 'md');
          triggerBlobDownload(new Blob([md], { type: 'text/markdown;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'project_zip': {
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName('project-bundle', datasetSlug, 'zip');
          const zipBlob = await exportEngine.createCompleteProjectZip(payload);
          triggerBlobDownload(zipBlob, downloadedFilename);
          break;
        }
        case 'pack_template_csv': {
          const { getPackById, buildPackTemplateCsv } = await import('../../analytics');
          const resolvedPack = getPackById(targetPackId);
          const csv = buildPackTemplateCsv(resolvedPack);
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName(`${resolvedPack.id}-template`, resolvedPack.name, 'csv');
          triggerBlobDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'pack_csv': {
          const { getPackById, buildPackTemplateCsv } = await import('../../analytics');
          const resolvedPack = getPackById(targetPackId);
          const csv = hasData
            ? await buildChunkedCsvAsync(activeRows, setProgressPct)
            : buildPackTemplateCsv(resolvedPack);
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName(`${resolvedPack.id}-data`, datasetSlug, 'csv');
          triggerBlobDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'pack_report_pdf': {
          const { getPackById, mapRoles, getPersistedPackRoleMap, buildDashboard } = await import('../../analytics');
          const resolvedPack = getPackById(targetPackId);
          const persisted = getPersistedPackRoleMap(datasetSlug, resolvedPack.id);
          const roleMap = mapRoles({ columns, rows: activeRows, datasetId: datasetSlug }, resolvedPack, persisted);
          const builtDash = buildDashboard(resolvedPack, activeRows, roleMap);
          const packKpis = builtDash.computedKpis.map((k) => ({
            id: k.id,
            name: k.label,
            value: k.value ?? 0,
            formattedValue: k.status === 'available' ? k.formattedValue : `Unavailable (${k.hint || 'missing role'})`,
            change: k.changePercent ?? 0,
            changePercent: k.changePercent ?? 0,
            period: 'Pack Metric',
            status: k.status === 'available' ? ('On Track' as const) : ('At Risk' as const),
            sourceColumn: roleMap[k.needs[0]] || k.needs[0] || 'metric',
            calculation: k.description,
            definition: k.description,
            traceableSource: `${resolvedPack.name} [${k.id}]`,
            aggregation: 'sum' as const,
          }));
          const packPayload: ExportDataPayload = {
            ...payload,
            project: {
              ...project,
              name: hasData ? `${resolvedPack.name} — ${project.name}` : `${resolvedPack.name} (Schema Template)`,
            },
            kpis: packKpis.length > 0 ? packKpis : kpis,
          };
          const doc = exportEngine.generateEnterpriseReportPDF(packPayload, {
            customVisuals: builtDash.charts.length > 0 ? builtDash.charts : customVisuals,
          });
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName(`${resolvedPack.id}-report`, datasetSlug, 'pdf');
          doc.save(downloadedFilename);
          break;
        }
        case 'pack_excel': {
          const { getPackById, mapRoles, getPersistedPackRoleMap, buildDashboard } = await import('../../analytics');
          const resolvedPack = getPackById(targetPackId);
          const persisted = getPersistedPackRoleMap(datasetSlug, resolvedPack.id);
          const roleMap = mapRoles({ columns, rows: activeRows, datasetId: datasetSlug }, resolvedPack, persisted);
          const builtDash = buildDashboard(resolvedPack, activeRows, roleMap);
          const roleCols = Object.entries(resolvedPack.roles).map(([roleKey, roleDef]) => ({
            name: roleDef.aliases[0] || roleKey,
            originalName: roleDef.aliases[0] || roleKey,
            dataType: (roleDef.type === 'number' ? 'number' : roleDef.type === 'date' ? 'date' : 'string') as 'number' | 'date' | 'string',
            totalCount: 0,
            nullCount: 0,
            nullPercentage: 0,
            distinctCount: 0,
            uniquePercentage: 0,
            isPrimaryKeyCandidate: false,
            isForeignKeyCandidate: false,
            topValues: [],
            inconsistentFormatsCount: 0,
            outliersCount: 0,
          }));
          const packPayload: ExportDataPayload = {
            ...payload,
            columns: hasData ? columns : roleCols,
            kpis: builtDash.computedKpis.map((k) => ({
              id: k.id,
              name: k.label,
              value: k.value ?? 0,
              formattedValue: k.status === 'available' ? k.formattedValue : 'Unavailable',
              change: k.changePercent ?? 0,
              changePercent: k.changePercent ?? 0,
              period: 'Current Period',
              status: 'On Track' as const,
              sourceColumn: roleMap[k.needs[0]] || k.needs[0] || 'metric',
              calculation: k.description,
              definition: k.description,
              traceableSource: resolvedPack.name,
              aggregation: 'sum' as const,
            })),
          };
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName(`${resolvedPack.id}-workbook`, datasetSlug, 'xlsx');
          const blob = hasData
            ? await exportEngine.buildSopExcelWorkbookAsync(packPayload, false)
            : await exportEngine.generateBlankExcelTemplateAsync(roleCols, false);
          triggerBlobDownload(blob, downloadedFilename);
          break;
        }
        case 'pack_bundle_zip': {
          const { getPackById, mapRoles, getPersistedPackRoleMap, buildDashboard } = await import('../../analytics');
          const resolvedPack = getPackById(targetPackId);
          const persisted = getPersistedPackRoleMap(datasetSlug, resolvedPack.id);
          const roleMap = mapRoles({ columns, rows: activeRows, datasetId: datasetSlug }, resolvedPack, persisted);
          const builtDash = buildDashboard(resolvedPack, activeRows, roleMap);
          const packPayload: ExportDataPayload = {
            ...payload,
            project: {
              ...project,
              name: hasData ? `${resolvedPack.name} — ${project.name}` : `${resolvedPack.name} Template`,
            },
            kpis: builtDash.computedKpis.map((k) => ({
              id: k.id,
              name: k.label,
              value: k.value ?? 0,
              formattedValue: k.status === 'available' ? k.formattedValue : 'Unavailable',
              change: k.changePercent ?? 0,
              changePercent: k.changePercent ?? 0,
              period: 'Current Period',
              status: 'On Track' as const,
              sourceColumn: roleMap[k.needs[0]] || k.needs[0] || 'metric',
              calculation: k.description,
              definition: k.description,
              traceableSource: resolvedPack.name,
              aggregation: 'sum' as const,
            })),
          };
          downloadedFilename = options?.useStandardizedName
            ? buildStandardizedCenterFileName(item)
            : buildSopFileName(`${resolvedPack.id}-bundle`, datasetSlug, 'zip');
          const zipBlob = await exportEngine.createCompleteProjectZip(packPayload);
          triggerBlobDownload(zipBlob, downloadedFilename);
          break;
        }
        case 'chart_png': {
          if (chartPayload?.onExportPng) {
            await chartPayload.onExportPng();
            downloadedFilename = buildSopFileName(
              `chart-${chartPayload.chartId || 'visual'}`,
              datasetSlug,
              'png'
            );
          } else {
            const { exportChartContainerPNG, buildGuideChartPlottedCSV } = await import(
              '../../utils/chartExport'
            );
            const cat = chartPayload?.categoryField || columns.find((c) => c.dataType === 'string')?.name || 'Category';
            const val = chartPayload?.valueField || columns.find((c) => c.dataType === 'number')?.name || 'Value';
            const plotted = buildGuideChartPlottedCSV({
              chartType: chartPayload?.chartType || 'bar',
              rows: activeRows,
              categoryField: cat,
              secondaryCategoryField: chartPayload?.secondaryCategoryField,
              valueField: val,
              secondaryValueField: chartPayload?.secondaryValueField,
              aggregation: chartPayload?.aggregation || 'sum',
            });
            downloadedFilename = buildSopFileName(
              `chart-${chartPayload?.chartId || 'visual'}`,
              datasetSlug,
              'png'
            );
            const resolvedEl =
              chartPayload?.containerEl ||
              (chartPayload?.containerSelector && typeof document !== 'undefined'
                ? (document.querySelector(chartPayload.containerSelector) as HTMLElement | null)
                : null);
            await exportChartContainerPNG(
              resolvedEl,
              downloadedFilename,
              chartPayload?.chartTitle || 'Chart Visualization',
              themeMode === 'light',
              plotted
            );
          }
          break;
        }
        case 'chart_csv': {
          if (chartPayload?.onExportCsv) {
            await chartPayload.onExportCsv();
            downloadedFilename = buildSopFileName(
              `chart-${chartPayload.chartId || 'visual'}`,
              datasetSlug,
              'csv'
            );
          } else {
            const { exportChartPlottedDataCSV, buildGuideChartPlottedCSV } = await import(
              '../../utils/chartExport'
            );
            const cat = chartPayload?.categoryField || columns.find((c) => c.dataType === 'string')?.name || 'Category';
            const val = chartPayload?.valueField || columns.find((c) => c.dataType === 'number')?.name || 'Value';
            const plotted = buildGuideChartPlottedCSV({
              chartType: chartPayload?.chartType || 'bar',
              rows: activeRows,
              categoryField: cat,
              secondaryCategoryField: chartPayload?.secondaryCategoryField,
              valueField: val,
              secondaryValueField: chartPayload?.secondaryValueField,
              aggregation: chartPayload?.aggregation || 'sum',
            });
            downloadedFilename = buildSopFileName(
              `chart-${chartPayload?.chartId || 'visual'}`,
              datasetSlug,
              'csv'
            );
            exportChartPlottedDataCSV(downloadedFilename, plotted.headers, plotted.rows);
          }
          break;
        }
      }

      setProgressPct(100);
      addToast({
        type: 'success',
        title: 'Download Complete',
        message: `Generated SOP-verified file: ${downloadedFilename}`,
      });
      setIsOpen(false);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: err?.message || 'Unable to generate download file.',
      });
    } finally {
      setActiveExportId(null);
      setProgressPct(null);
    }
  };

  return (
    <div ref={menuRef} className={`relative inline-block text-left ${className}`} data-testid={`download-menu-${context}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            computeMenuPosition();
            setStep(1);
          }
          setIsOpen((prev) => !prev);
        }}
        disabled={activeExportId !== null}
        aria-label={`${label} (${context.replace(/_/g, ' ')})`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        data-testid={`download-menu-trigger-${context}`}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all cursor-pointer border border-subtle bg-elevated hover:bg-card-hover text-primary shadow-xs disabled:opacity-60 ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'
        }`}
      >
        {activeExportId ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent shrink-0" />
        ) : (
          <Download className="w-3.5 h-3.5 text-accent shrink-0" />
        )}
        <span>
          {activeExportId
            ? progressPct !== null
              ? `Exporting ${progressPct}%...`
              : 'Generating...'
            : label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={`${label} options`}
            data-testid={`download-menu-panel-${context}`}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              width: `${menuPos.width}px`,
              zIndex: 9999,
            }}
            className="rounded-2xl bg-card border border-strong shadow-2xl overflow-hidden animate-fadeIn text-left"
          >
            {/* Header Banner + 3-Step Stepper Navigation */}
            <div className="px-4 py-3 bg-elevated border-b border-subtle space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold font-heading text-primary flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-accent" />
                    <span>Unified Download Center</span>
                  </div>
                  <p className="text-[11px] text-secondary mt-0.5 font-mono truncate max-w-[270px]">
                    {hasData
                      ? `${project.name} (${activeRows.length.toLocaleString()} rows)`
                      : 'No dataset loaded — templates & guides active'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                      hasData
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {hasData ? 'DATA READY' : 'NO DATA'}
                  </span>
                  <button
                    type="button"
                    aria-label="Close Download Center"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg text-muted hover:text-primary hover:bg-card transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 3-Step Indicator Bar */}
              {(flags.unifiedTheme || flags.depthUI || flags.analyticsPacks) && context !== 'chart' && (
                <div
                  data-testid="download-center-stepper"
                  className="grid grid-cols-3 gap-1.5 pt-1"
                >
                  {[
                    { s: 1 as const, title: '1. What do you want?' },
                    { s: 2 as const, title: '2. Which report?' },
                    { s: 3 as const, title: '3. Download' },
                  ].map((st) => (
                    <button
                      key={st.s}
                      type="button"
                      data-testid={`download-center-step-tab-${st.s}`}
                      onClick={() => setStep(st.s)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold truncate transition-colors cursor-pointer border text-left ${
                        step === st.s
                          ? 'bg-accent text-on-accent border-transparent shadow-2xs'
                          : 'bg-card text-secondary hover:text-primary border-subtle'
                      }`}
                    >
                      {st.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* No-Data Banner with 1-Click "Use sample dataset" action */}
            {!hasData && (
              <div
                data-testid="download-menu-no-data-banner"
                className="px-4 py-3 bg-amber-500/10 border-b border-subtle flex items-center justify-between gap-3"
              >
                <div className="text-[11px] text-secondary leading-snug">
                  <span className="font-bold text-primary block">Load a dataset first</span>
                  <span>Data-backed exports require rows. Never invents fake data.</span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleDataset}
                  data-testid="download-menu-load-sample"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-accent text-on-accent hover:opacity-90 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Use sample dataset</span>
                </button>
              </div>
            )}

            {/* STEP 1: "What do you want?" */}
            {step === 1 && (
              <div data-testid="download-center-step-1" className="max-h-96 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                {/* Section 1: View-Specific Formats */}
                <div className="p-2.5">
                  <div className="px-2 py-1 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                    <span>What do you want? ({context.replace(/_/g, ' ')})</span>
                    {context !== 'chart' && (
                      <button
                        type="button"
                        data-testid="download-center-next-step-2"
                        onClick={() => setStep(2)}
                        className="text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Configure scope &amp; sections</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5 mt-1">
                    {contextItems.map((item) => {
                      const Icon = item.icon;
                      const isDisabled = item.requiresData && !hasData;
                      const isBusy = activeExportId === item.id;
                      const isSelected = selectedItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border transition-all ${
                            isSelected
                              ? 'border-accent/60 bg-elevated/70'
                              : 'border-subtle bg-card/50 hover:bg-elevated'
                          }`}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            disabled={isDisabled || activeExportId !== null}
                            aria-disabled={isDisabled}
                            data-testid={`download-item-${item.id}`}
                            onClick={() => {
                              setSelectedItemId(item.id);
                              handleDownloadFormat(item);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-3 ${
                              isDisabled
                                ? 'opacity-55 cursor-not-allowed bg-input/40'
                                : 'cursor-pointer'
                            }`}
                          >
                            <div className="p-2 rounded-xl bg-elevated border border-subtle text-accent shrink-0 mt-0.5">
                              {isBusy ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isDisabled ? (
                                <Lock className="w-4 h-4 text-muted" />
                              ) : (
                                <Icon className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-primary truncate">
                                  {item.label}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {item.sizeEstimate && (
                                    <span className="text-[10px] font-mono text-muted px-1.5 py-0.5 rounded bg-input border border-subtle">
                                      {item.sizeEstimate}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-elevated text-secondary border border-subtle">
                                    .{item.ext}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[11px] text-secondary leading-snug mt-0.5">
                                {isDisabled ? 'Disabled — Load a dataset first' : item.description}
                              </p>
                            </div>
                          </button>

                          {item.supportsReportConfig && !isDisabled && context !== 'chart' && (
                            <div className="px-3 pb-2 pt-0.5 flex items-center justify-end border-t border-subtle/50">
                              <button
                                type="button"
                                data-testid={`download-configure-${item.id}`}
                                onClick={() => {
                                  setSelectedItemId(item.id);
                                  setStep(2);
                                }}
                                className="text-[11px] font-mono font-semibold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <SlidersHorizontal className="w-3 h-3" />
                                <span>Choose scope, sections &amp; audience →</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Always-Available Guides, Templates & Themes (Works with No Data) */}
                <div className="p-2.5 bg-input/30">
                  <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-accent flex items-center justify-between">
                    <span>Templates, Guides &amp; Themes</span>
                    <span>Always Ready</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {NO_DATA_READY_FORMATS.map((item) => {
                      const Icon = item.icon;
                      const isBusy = activeExportId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="menuitem"
                          disabled={activeExportId !== null}
                          data-testid={`download-item-${item.id}`}
                          onClick={() => handleDownloadFormat(item)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-elevated transition-all flex items-start gap-3 cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-elevated border border-subtle text-accent shrink-0 mt-0.5">
                            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-primary truncate">
                                {item.label}
                              </span>
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-elevated text-secondary border border-subtle shrink-0">
                                .{item.ext}
                              </span>
                            </div>
                            <p className="text-[11px] text-secondary leading-snug mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: "Which report?" (Scope, Sections Checklist, Audience Template) */}
            {step === 2 && (
              <div data-testid="download-center-step-2" className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {/* Report Scope Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                    Report &amp; Presentation Scope
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'current_dashboard' as const, label: 'Current dashboard' },
                      { id: 'pack' as const, label: 'Analytics Pack (14)' },
                      { id: 'custom_builder' as const, label: 'Custom Builder layout' },
                      { id: 'all' as const, label: 'All (Full Suite)' },
                    ].map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        data-testid={`download-scope-${sc.id}`}
                        onClick={() => setReportScope(sc.id)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer ${
                          reportScope === sc.id
                            ? 'bg-accent text-on-accent border-transparent font-bold shadow-2xs'
                            : 'bg-elevated text-secondary hover:text-primary border-subtle'
                        }`}
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>

                  {reportScope === 'pack' && (
                    <div className="pt-1.5">
                      <label htmlFor="download-center-pack-select" className="sr-only">
                        Select Analytics Pack
                      </label>
                      <select
                        id="download-center-pack-select"
                        data-testid="download-center-pack-select"
                        value={selectedPackScopeId}
                        onChange={(e) => setSelectedPackScopeId(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-input border border-subtle text-xs font-semibold text-primary focus:outline-none"
                      >
                        {PACK_CHOICE_OPTIONS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Audience Template Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                    Audience Template
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Board', 'Manager', 'Analyst'] as const).map((aud) => (
                      <button
                        key={aud}
                        type="button"
                        data-testid={`download-audience-${aud.toLowerCase()}`}
                        onClick={() => setAudienceTemplate(aud)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          audienceTemplate === aud
                            ? 'bg-accent text-on-accent border-transparent font-bold'
                            : 'bg-elevated text-secondary hover:text-primary border-subtle'
                        }`}
                      >
                        {aud}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sections Checklist */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                      Included Sections
                    </label>
                    <span className="text-[10px] font-mono text-secondary">
                      {REPORT_SECTIONS_LIST.filter((s) => selectedSections[s.id]).length}/{REPORT_SECTIONS_LIST.length} active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {REPORT_SECTIONS_LIST.map((sec) => {
                      const checked = selectedSections[sec.id];
                      return (
                        <label
                          key={sec.id}
                          data-testid={`download-section-${sec.id}`}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-elevated border border-subtle text-xs text-primary cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedSections((prev) => ({
                                ...prev,
                                [sec.id]: !prev[sec.id],
                              }))
                            }
                            className="accent-[var(--accent)] rounded"
                          />
                          <span className="truncate">{sec.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2 Footer Navigation */}
                <div className="pt-2 border-t border-subtle flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-3 py-1.5 rounded-xl bg-elevated border border-subtle text-xs font-semibold text-secondary hover:text-primary inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    data-testid="download-center-next-step-3"
                    onClick={() => setStep(3)}
                    className="px-4 py-1.5 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Review &amp; Download</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Download + Progress + "Copy summary" */}
            {step === 3 && (
              <div data-testid="download-center-step-3" className="p-4 space-y-4">
                <div className="p-3.5 rounded-xl bg-elevated border border-subtle space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary">
                      {selectedFormatItem.label}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-card border border-subtle text-accent font-bold">
                      {selectedFormatItem.sizeEstimate || '~250 KB'}
                    </span>
                  </div>

                  <div className="text-[11px] text-secondary space-y-1 font-mono">
                    <div>
                      Scope:{' '}
                      <strong className="text-primary">
                        {reportScope === 'pack'
                          ? `Pack (${selectedPackScopeId})`
                          : reportScope === 'custom_builder'
                          ? 'Custom Builder'
                          : reportScope === 'all'
                          ? 'All Suites'
                          : 'Current Dashboard'}
                      </strong>{' '}
                      · Audience: <strong className="text-primary">{audienceTemplate}</strong>
                    </div>
                    <div className="truncate" title={buildStandardizedCenterFileName(selectedFormatItem)}>
                      File:{' '}
                      <span
                        data-testid="download-center-filename"
                        className="text-accent font-bold"
                      >
                        {buildStandardizedCenterFileName(selectedFormatItem)}
                      </span>
                    </div>
                  </div>
                </div>

                {progressPct !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-secondary">
                      <span>Compiling package...</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-input overflow-hidden border border-subtle">
                      <div
                        className="h-full bg-accent transition-all duration-200"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-3 py-2 rounded-xl bg-elevated border border-subtle text-xs font-semibold text-secondary hover:text-primary inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="download-center-copy-summary"
                      onClick={handleCopySummary}
                      className="px-3 py-2 rounded-xl bg-elevated hover:bg-card-hover border border-subtle text-xs font-semibold text-primary inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedSummary ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-accent" />
                          <span>Copy summary</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      data-testid="download-center-confirm-download"
                      disabled={(selectedFormatItem.requiresData && !hasData) || activeExportId !== null}
                      onClick={() =>
                        handleDownloadFormat(selectedFormatItem, { useStandardizedName: true })
                      }
                      className="px-4 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Now</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

