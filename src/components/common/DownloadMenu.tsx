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
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useToast } from '../../store/useToast';
import { buildSopFileName, buildSopMetadata, buildSopCodeHeaderComment } from '../../config/designTokens';
import type { ExportDataPayload } from '../../engine/exportEngine';

export type DownloadMenuContext =
  | 'executive_dashboard'
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
  className?: string;
}

interface DownloadFormatItem {
  id: string;
  label: string;
  ext: string;
  description: string;
  requiresData: boolean;
  icon: React.FC<{ className?: string }>;
}

const CONTEXT_FORMATS: Record<DownloadMenuContext, DownloadFormatItem[]> = {
  executive_dashboard: [
    {
      id: 'executive_pdf',
      label: 'Executive Report (PDF)',
      ext: 'pdf',
      description: 'A4 boardroom intelligence report with KPIs & audit tables',
      requiresData: true,
      icon: FileText,
    },
    {
      id: 'excel_workbook',
      label: 'Enterprise Workbook (XLSX)',
      ext: 'xlsx',
      description: 'Multi-sheet Excel workbook with frozen headers & metadata',
      requiresData: true,
      icon: FileSpreadsheet,
    },
    {
      id: 'standalone_html',
      label: 'Offline Dashboard (HTML)',
      ext: 'html',
      description: 'Self-contained interactive HTML with prefers-color-scheme tokens',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'clean_csv',
      label: 'Audited Dataset (CSV)',
      ext: 'csv',
      description: 'Cleaned & filtered dataset rows in UTF-8 CSV format',
      requiresData: true,
      icon: TableIcon,
    },
    {
      id: 'project_zip',
      label: 'Complete 14-Folder Bundle (ZIP)',
      ext: 'zip',
      description: 'Full sovereign analytics package with manifest & scripts',
      requiresData: true,
      icon: Archive,
    },
  ],
  dashboard_builder: [
    {
      id: 'standalone_html',
      label: 'Standalone Dashboard (HTML)',
      ext: 'html',
      description: '100% offline HTML dashboard with embedded semantic tokens',
      requiresData: true,
      icon: FileCode,
    },
    {
      id: 'executive_pdf',
      label: 'Dashboard Report (PDF)',
      ext: 'pdf',
      description: 'A4 visual breakdown report with 20mm margins',
      requiresData: true,
      icon: FileText,
    },
    {
      id: 'excel_workbook',
      label: 'Dashboard Data Workbook (XLSX)',
      ext: 'xlsx',
      description: 'Formatted Excel workbook backing all canvas cards',
      requiresData: true,
      icon: FileSpreadsheet,
    },
    {
      id: 'project_zip',
      label: 'Dashboard & Report Bundle (ZIP)',
      ext: 'zip',
      description: 'Complete dashboard specification, HTML, PDF, and CSV bundle',
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
      label: 'Boardroom Executive Report (PDF)',
      ext: 'pdf',
      description: 'A4 20mm-margin report with KPIs, insights & governance',
      requiresData: true,
      icon: FileText,
    },
    {
      id: 'report_md',
      label: 'Executive Briefing (.md)',
      ext: 'md',
      description: 'Structured Markdown executive report with SOP metadata',
      requiresData: true,
      icon: FileText,
    },
    {
      id: 'excel_workbook',
      label: 'Audited Report Workbook (XLSX)',
      ext: 'xlsx',
      description: 'Multi-sheet Excel workbook with frozen headers',
      requiresData: true,
      icon: FileSpreadsheet,
    },
    {
      id: 'project_zip',
      label: 'Complete Report Package (ZIP)',
      ext: 'zip',
      description: '14-folder sovereign analytics archive',
      requiresData: true,
      icon: Archive,
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
  } = usePlatform();
  const kpis = analytics?.kpis || [];
  const insights = analytics?.insights || [];

  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeExportId, setActiveExportId] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({
    top: 64,
    left: 16,
    width: 352,
  });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const activeRows = filteredRows && filteredRows.length > 0 ? filteredRows : cleanRows;
  const hasData = activeRows && activeRows.length > 0;
  const datasetSlug = project?.name || project?.sourceFileName || (hasData ? 'dataset' : 'reference');

  const computeMenuPosition = () => {
    if (typeof window === 'undefined' || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(368, Math.max(280, window.innerWidth - 16));
    // Prefer aligning to trigger's left edge if near the left half of screen, else right edge
    const rawLeft =
      rect.left + width <= window.innerWidth - 8
        ? rect.left
        : rect.right - width;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - width - 8));
    const maxTop = Math.max(8, window.innerHeight - 460);
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

  const handleLoadSampleDataset = () => {
    loadDemoDataset('global-retail-sales');
    addToast({
      type: 'success',
      title: 'Sample Dataset Loaded',
      message: 'Loaded Global Enterprise Retail Sales. All view-specific exports are now unlocked.',
    });
  };

  const handleDownloadFormat = async (item: DownloadFormatItem) => {
    if (item.requiresData && !hasData) {
      addToast({
        type: 'warning',
        title: 'Dataset Required',
        message: 'Load a dataset first or click "Use sample dataset" to enable data-backed exports.',
      });
      return;
    }

    setActiveExportId(item.id);
    setProgressPct(null);

    try {
      // Yield a frame so spinner renders smoothly
      await new Promise((r) => setTimeout(r, 10));

      const exportEngine = await import('../../engine/exportEngine');
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
        case 'executive_pdf': {
          const doc = exportEngine.generateEnterpriseReportPDF(payload, { customVisuals });
          downloadedFilename = buildSopFileName('executive-report', datasetSlug, 'pdf');
          doc.save(downloadedFilename);
          break;
        }
        case 'excel_workbook': {
          downloadedFilename = buildSopFileName('workbook', datasetSlug, 'xlsx');
          const blob = await exportEngine.buildSopExcelWorkbookAsync(payload, false);
          triggerBlobDownload(blob, downloadedFilename);
          break;
        }
        case 'standalone_html': {
          const html = exportEngine.generateStandaloneDashboardHTML(payload, { customVisuals });
          downloadedFilename = buildSopFileName('dashboard', datasetSlug, 'html');
          triggerBlobDownload(new Blob([html], { type: 'text/html;charset=utf-8;' }), downloadedFilename);
          break;
        }
        case 'clean_csv': {
          const csv = await buildChunkedCsvAsync(activeRows, setProgressPct);
          downloadedFilename = buildSopFileName('cleaned-data', datasetSlug, 'csv');
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
          downloadedFilename = buildSopFileName('project-bundle', datasetSlug, 'zip');
          const zipBlob = await exportEngine.createCompleteProjectZip(payload);
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
          if (!isOpen) computeMenuPosition();
          setIsOpen((prev) => !prev);
        }}
        disabled={activeExportId !== null}
        aria-label={`${label} (${context.replace(/_/g, ' ')})`}
        aria-haspopup="menu"
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
            role="menu"
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
            {/* Header Banner */}
            <div className="px-4 py-3 bg-elevated border-b border-subtle flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold font-heading text-primary flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-accent" />
                <span>SOP-Governed Downloads</span>
              </div>
              <p className="text-[11px] text-secondary mt-0.5 font-mono truncate max-w-[230px]">
                {hasData
                  ? `${project.name} (${activeRows.length.toLocaleString()} rows)`
                  : 'No dataset loaded — templates & guides active'}
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                hasData
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {hasData ? 'DATA READY' : 'NO DATA'}
            </span>
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

          <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {/* Section 1: View-Specific Formats */}
            <div className="p-2">
              <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                View Exports ({context.replace(/_/g, ' ')})
              </div>
              <div className="space-y-1 mt-1">
                {contextItems.map((item) => {
                  const Icon = item.icon;
                  const isDisabled = item.requiresData && !hasData;
                  const isBusy = activeExportId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      disabled={isDisabled || activeExportId !== null}
                      aria-disabled={isDisabled}
                      data-testid={`download-item-${item.id}`}
                      onClick={() => handleDownloadFormat(item)}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-start gap-3 ${
                        isDisabled
                          ? 'opacity-55 cursor-not-allowed bg-input/40'
                          : 'hover:bg-elevated cursor-pointer'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-elevated border border-subtle text-accent shrink-0 mt-0.5">
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
                          <span className="text-xs font-semibold text-primary truncate">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-elevated text-secondary border border-subtle shrink-0">
                            .{item.ext}
                          </span>
                        </div>
                        <p className="text-[11px] text-secondary leading-snug mt-0.5">
                          {isDisabled ? 'Disabled — Load a dataset first' : item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Always-Available Guides, Templates & Themes (Works with No Data) */}
            <div className="p-2 bg-input/30">
              <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-accent flex items-center justify-between">
                <span>Templates, Guides & Themes</span>
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
        </div>,
        document.body
      )}
    </div>
  );
};
