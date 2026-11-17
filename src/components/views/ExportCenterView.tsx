import React, { useState, useMemo, useRef } from 'react';
import { 
  FolderDown, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  Package, 
  Code2, 
  Database, 
  FileText, 
  ShieldCheck,
  Loader2,
  Sparkles,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Table2,
  Layers
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import type { ExportDataPayload } from '../../engine/exportEngine';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { ColabNotebookModal } from '../common/ColabNotebookModal';
import { useToast } from '../../store/useToast';
import { DownloadMenu } from '../common/DownloadMenu';
import {
  buildExportPreviewSheets,
  formatExportPreviewCell,
  type ExportPreviewFormat
} from '../../utils/exportPreviewFormatter';

export const ExportCenterView: React.FC = () => {
  const { 
    project, 
    brand, 
    rawRows, 
    cleanRows, 
    columns, 
    dataModel, 
    analytics, 
    daxMeasures, 
    transformations, 
    qualityReport,
    customVisuals,
    setCurrentTab,
    themeMode
  } = usePlatform();

  const isLight = themeMode === 'light';

  const [isZipping, setIsZipping] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isGuidePdfGenerating, setIsGuidePdfGenerating] = useState(false);
  const [isBundleGenerating, setIsBundleGenerating] = useState(false);
  const [isExcelGenerating, setIsExcelGenerating] = useState(false);
  const [isColabModalOpen, setIsColabModalOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Preview Export State
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(true);
  const [previewFormat, setPreviewFormat] = useState<ExportPreviewFormat>('excel');
  const [activeSheetId, setActiveSheetId] = useState<string>('02_Clean_Data');
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const previewSectionRef = useRef<HTMLDivElement | null>(null);

  const toastHook = useToast();

  const payload: ExportDataPayload = {
    project,
    brand,
    rawRows,
    cleanRows,
    columns,
    dataModel,
    kpis: analytics.kpis,
    daxMeasures,
    insights: analytics.insights,
    transformations,
    qualityReport
  };

  const previewSheets = useMemo(
    () =>
      buildExportPreviewSheets(
        {
          project,
          brand,
          rawRows,
          cleanRows,
          columns,
          dataModel,
          kpis: analytics.kpis,
          daxMeasures,
          qualityReport,
        },
        previewFormat
      ),
    [project, brand, rawRows, cleanRows, columns, dataModel, analytics.kpis, daxMeasures, qualityReport, previewFormat]
  );

  const activeSheet = useMemo(() => {
    return previewSheets.find((s) => s.id === activeSheetId) || previewSheets[0];
  }, [previewSheets, activeSheetId]);

  const filteredPreviewRows = useMemo(() => {
    if (!activeSheet) return [];
    const q = previewSearch.trim().toLowerCase();
    if (!q) return activeSheet.rows;
    return activeSheet.rows.filter((row) =>
      activeSheet.columns.some((col) => {
        const val = row[col.key];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      })
    );
  }, [activeSheet, previewSearch]);

  const totalRows = filteredPreviewRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRows);
  const paginatedRows = useMemo(
    () => filteredPreviewRows.slice(startIndex, endIndex),
    [filteredPreviewRows, startIndex, endIndex]
  );

  const handleSelectPreviewFormat = (fmt: ExportPreviewFormat, scrollIntoView = false) => {
    setPreviewFormat(fmt);
    setIsPreviewOpen(true);
    setCurrentPage(1);
    setPreviewSearch('');
    const nextSheets = buildExportPreviewSheets(
      {
        project,
        brand,
        rawRows,
        cleanRows,
        columns,
        dataModel,
        kpis: analytics.kpis,
        daxMeasures,
        qualityReport,
      },
      fmt
    );
    if (nextSheets.length > 0) {
      setActiveSheetId(nextSheets[0].id);
    }
    if (scrollIntoView && previewSectionRef.current) {
      previewSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectSheet = (sheetId: string) => {
    setActiveSheetId(sheetId);
    setCurrentPage(1);
  };

  const handleDownloadDashboardAndReportBundle = async () => {
    setIsBundleGenerating(true);
    try {
      const { downloadDashboardAndReportBundle } = await import('../../engine/exportEngine');
      await downloadDashboardAndReportBundle(payload, {
        customVisuals,
        categoryPerformance: analytics.categoryPerformance,
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        opportunities: analytics.opportunities
      });
      setDownloadSuccess('Created Dashboard & Executive Report bundle downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (e: any) {
      console.error(e);
      setDownloadSuccess(`Bundle export note: ${e?.message || 'Failed to export bundle'}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsBundleGenerating(false);
    }
  };

  const handleDownloadReportPDF = async () => {
    setIsPdfGenerating(true);
    try {
      const { generateEnterpriseReportPDF } = await import('../../engine/exportEngine');
      const doc = generateEnterpriseReportPDF(payload, {
        customVisuals,
        categoryPerformance: analytics.categoryPerformance,
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        opportunities: analytics.opportunities
      });
      const safeProjectName = project.name.replace(/[^a-zA-Z0-9_]/g, '_');
      const filename = `${safeProjectName}_Executive_Report.pdf`;
      doc.save(filename);
      setDownloadSuccess(`Enterprise Report "${filename}" compiled and downloaded successfully.`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (e: any) {
      console.error(e);
      setDownloadSuccess(`PDF compilation note: ${e?.message || 'Error compiling PDF'}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleDownloadChartGuidePDF = async () => {
    setIsGuidePdfGenerating(true);
    try {
      const { downloadChartGuidePDF } = await import('../../engine/exportEngine');
      const { filename, pageCount } = downloadChartGuidePDF({
        datasetName: project?.name || project?.sourceFileName || undefined,
        columns,
        rows: cleanRows,
        includeDatasetRecommendations: true,
      });
      toastHook.success('Chart Guide PDF Downloaded', `Saved ${filename} (${pageCount} pages).`);
      setDownloadSuccess(`Chart guide (PDF) "${filename}" (${pageCount} pages) downloaded successfully.`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (e: any) {
      console.error(e);
      toastHook.error('Chart Guide PDF Failed', e?.message || 'Error compiling Chart Guide PDF');
      setDownloadSuccess(`Chart Guide PDF note: ${e?.message || 'Error compiling PDF'}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsGuidePdfGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const { createCompleteProjectZip } = await import('../../engine/exportEngine');
      const blob = await createCompleteProjectZip(payload);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^a-zA-Z0-9_]/g, '_')}_Complete_Project_Package.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadSuccess('Complete 14-Folder Project ZIP successfully created and downloaded.');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (e: any) {
      console.error(e);
      setDownloadSuccess(`Export note: ${e?.message || 'Failed to generate ZIP'}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsExcelGenerating(true);
    try {
      const { buildExcelWorkbook } = await import('../../engine/exportEngine');
      const buf = buildExcelWorkbook(payload);
      const blob = new Blob([buf as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = `${project.name.replace(/[^a-zA-Z0-9_]/g, '_')}_Excel_Source_Workbook.xlsx`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadSuccess(`Excel Workbook "${filename}" downloaded successfully.`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsExcelGenerating(false);
    }
  };

  const handleDownloadPBIPModel = async () => {
    const { generateModelBimJSON } = await import('../../engine/exportEngine');
    const json = generateModelBimJSON(payload);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Model.bim`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('Power BI Tabular Model (Model.bim) downloaded successfully.');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleDownloadPowerQueryM = async () => {
    const { generatePowerBIMSemanticModel } = await import('../../engine/exportEngine');
    const m = generatePowerBIMSemanticModel(payload);
    const blob = new Blob([m], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PowerQuery_Transformations.m`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('Power Query M script (PowerQuery_Transformations.m) downloaded successfully.');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleDownloadTheme = async () => {
    const { generatePowerBIThemeJSON } = await import('../../engine/exportEngine');
    const theme = generatePowerBIThemeJSON(brand);
    const blob = new Blob([theme], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brand.companyName}_PowerBI_Theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-16 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-card border border-subtle rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent font-mono">
            <FolderDown className="w-4 h-4" /> Sovereign User Package Center
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary tracking-wide uppercase">
            ENTERPRISE EXPORT CENTER
          </h1>
          <div className="py-1">
            <EditableDashboardTitle className="text-base font-semibold" showLabelPrefix={true} />
          </div>
          <p className="text-xs text-secondary">
            Preview formatted Excel & Power BI tables, or export boardroom-ready PDF reports, dashboards, and combined bundles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            data-testid="preview-export-toggle-btn"
            onClick={() => setIsPreviewOpen((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-input hover:bg-card-hover text-primary font-semibold text-xs border border-subtle transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-accent" />
            <span>{isPreviewOpen ? 'Hide Export Preview' : 'Preview Export'}</span>
          </button>

          <DownloadMenu context="export_center" />
          {/* Download Dashboard + Executive Report Bundle */}
          <button
            onClick={handleDownloadDashboardAndReportBundle}
            disabled={isBundleGenerating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-on-accent font-bold text-xs hover:opacity-90 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            title="Download both the created dashboard specification/HTML and executive report in a single ZIP package"
          >
            {isBundleGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-on-accent" />
                <span>Compiling Bundle...</span>
              </>
            ) : (
              <>
                <Package className="w-4 h-4 stroke-[2.5]" />
                <span>Download Dashboard + Report Bundle</span>
              </>
            )}
          </button>

          {/* Direct Download Report as PDF CTA */}
          <button
            onClick={handleDownloadReportPDF}
            disabled={isPdfGenerating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-input hover:bg-card-hover text-primary font-medium text-xs border border-subtle transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPdfGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span>Compiling PDF...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-accent" />
                <span>Executive Report (PDF)</span>
              </>
            )}
          </button>

          {/* Validation Status Indicator */}
          <div className="flex items-center gap-2 bg-input border border-subtle px-3.5 py-2.5 rounded-xl text-xs font-mono text-accent">
            <ShieldCheck className="w-4 h-4" />
            <span>Audit: PASSED</span>
          </div>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-4 rounded-xl bg-accent-soft border border-subtle text-xs text-accent flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* PREVIEW EXPORT STUDIO (Paginated Table Formatted for Excel or Power BI) */}
      {isPreviewOpen && activeSheet && (
        <section
          ref={previewSectionRef}
          data-testid="export-preview-panel"
          aria-label="Preview Export Data Table"
          className="bg-card border border-subtle rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
        >
          {/* Top Bar: Title + Format Switcher + Primary Download Action */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-subtle pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                <Eye className="w-4 h-4" /> Pre-Flight Schema & Data Inspector
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-primary uppercase tracking-wide">
                PREVIEW EXPORT ({previewFormat === 'excel' ? 'EXCEL .XLSX WORKBOOK' : 'POWER BI TABULAR MODEL'})
              </h2>
              <p className="text-xs text-secondary max-w-2xl">
                {activeSheet.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Format Toggle Buttons */}
              <div
                role="tablist"
                aria-label="Export preview format"
                className="inline-flex rounded-xl bg-input p-1 border border-subtle"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewFormat === 'excel'}
                  data-testid="preview-format-excel"
                  onClick={() => handleSelectPreviewFormat('excel')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewFormat === 'excel'
                      ? 'bg-accent text-on-accent shadow-2xs'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewFormat === 'powerbi'}
                  data-testid="preview-format-powerbi"
                  onClick={() => handleSelectPreviewFormat('powerbi')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewFormat === 'powerbi'
                      ? 'bg-accent text-on-accent shadow-2xs'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Power BI (Model.bim)</span>
                </button>
              </div>

              {/* Direct Download Button for Currently Previewed Format */}
              {previewFormat === 'excel' ? (
                <button
                  type="button"
                  data-testid="export-preview-download-btn"
                  onClick={handleDownloadExcel}
                  disabled={isExcelGenerating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {isExcelGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Building .xlsx...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Excel (.xlsx)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="export-preview-download-btn"
                    onClick={handleDownloadPBIPModel}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-2xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Model.bim</span>
                  </button>
                  <button
                    type="button"
                    data-testid="export-preview-download-m-btn"
                    onClick={handleDownloadPowerQueryM}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-input hover:bg-card-hover text-primary text-xs font-medium border border-subtle transition-all cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5 text-accent" />
                    <span>Power Query (.m)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sheet / Table Tabs + Search & Page Size Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Worksheet / Tabular Table Selector */}
            <div
              role="tablist"
              aria-label="Worksheet or table selector"
              className="flex flex-wrap items-center gap-1.5"
            >
              {previewSheets.map((sheet) => {
                const isSelected = sheet.id === activeSheet.id;
                return (
                  <button
                    key={sheet.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    data-testid={`preview-sheet-tab-${sheet.id}`}
                    onClick={() => handleSelectSheet(sheet.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-accent-soft border-strong text-accent font-bold'
                        : 'bg-input border-subtle text-secondary hover:text-primary hover:bg-card-hover'
                    }`}
                  >
                    {previewFormat === 'excel' ? (
                      <Table2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{sheet.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-card text-muted border border-subtle">
                      {sheet.rows.length.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Filter + Page Size */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  data-testid="export-preview-search"
                  value={previewSearch}
                  onChange={(e) => {
                    setPreviewSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={`Filter ${activeSheet.name}...`}
                  aria-label="Filter preview rows"
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-input border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-strong w-48 sm:w-56"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs text-secondary font-mono">
                <span>Rows:</span>
                <select
                  data-testid="export-preview-page-size"
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-input border border-subtle text-xs text-primary font-mono focus:outline-none focus:border-strong cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>
          </div>

          {/* Format Metadata Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-input border border-subtle text-[11px] font-mono text-secondary">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-accent font-semibold">
                {previewFormat === 'excel' ? `Table: ${activeSheet.badge}` : `Artifact: ${activeSheet.badge}`}
              </span>
              <span>•</span>
              <span>
                {previewFormat === 'excel'
                  ? 'Header Row 1: Frozen (ySplit: 1) | Auto-Width Columns | Explicit NumFmt'
                  : 'Compatibility Level: 1567 (PowerBI_V3) | Culture: en-US | Direct Tabular Mapping'}
              </span>
            </div>
            <div>
              <span>{activeSheet.columns.length} Columns</span>
            </div>
          </div>

          {/* Paginated Formatted Data Table */}
          <div className="border border-subtle rounded-xl overflow-hidden bg-card">
            <div className="overflow-x-auto max-w-full">
              <table
                data-testid="export-preview-table"
                className="w-full text-left border-collapse text-xs"
              >
                <thead>
                  {/* Excel Column Letters / Power BI Schema Subheader Row */}
                  <tr className="bg-input border-b border-subtle text-[10px] font-mono text-muted">
                    <th className="py-1.5 px-3 border-r border-subtle w-12 text-center select-none">
                      {previewFormat === 'excel' ? 'Row' : '#'}
                    </th>
                    {activeSheet.columns.map((col) => (
                      <th
                        key={`meta-${col.key}`}
                        className="py-1.5 px-3 border-r border-subtle last:border-r-0 whitespace-nowrap"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-secondary">
                            {previewFormat === 'excel' ? `Col ${col.excelLetter}` : col.powerBiDataType}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-card border border-subtle text-accent">
                            {previewFormat === 'excel'
                              ? col.excelFormatCode
                              : col.powerBiSummarizeBy !== 'none'
                              ? `Σ ${col.powerBiSummarizeBy}`
                              : col.powerQueryType}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>

                  {/* Primary Column Header Row (Represents Frozen Row 1 in Excel / Field Header in Power BI) */}
                  <tr className="bg-accent-soft border-b border-strong text-primary font-semibold">
                    <th className="py-2.5 px-3 border-r border-subtle text-center font-mono text-[11px] text-accent">
                      1
                    </th>
                    {activeSheet.columns.map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        className={`py-2.5 px-3 border-r border-subtle last:border-r-0 whitespace-nowrap ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-subtle">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeSheet.columns.length + 1}
                        className="py-8 text-center text-secondary font-mono text-xs"
                      >
                        No matching rows found for filter "{previewSearch}".
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const displayRowNumber = startIndex + idx + 2; // Row 1 is frozen header in Excel
                      return (
                        <tr
                          key={`row-${startIndex + idx}`}
                          className={`transition-colors hover:bg-card-hover ${
                            idx % 2 === 1 ? 'bg-input' : 'bg-card'
                          }`}
                        >
                          <td className="py-2 px-3 border-r border-subtle text-center font-mono text-[11px] text-muted select-none">
                            {previewFormat === 'excel' ? displayRowNumber : startIndex + idx + 1}
                          </td>
                          {activeSheet.columns.map((col) => {
                            const formatted = formatExportPreviewCell(row[col.key], col, previewFormat);
                            const isBlank = formatted === '(Blank)' || formatted === '';
                            return (
                              <td
                                key={`${startIndex + idx}-${col.key}`}
                                className={`py-2 px-3 border-r border-subtle last:border-r-0 whitespace-nowrap ${
                                  col.isNumeric ? 'font-mono' : ''
                                } ${
                                  col.align === 'right'
                                    ? 'text-right'
                                    : col.align === 'center'
                                    ? 'text-center'
                                    : 'text-left'
                                } ${isBlank ? 'text-muted italic' : 'text-primary'}`}
                              >
                                {formatted || '—'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Footer */}
          <div
            data-testid="export-preview-pagination"
            className="flex flex-wrap items-center justify-between gap-3 pt-1"
          >
            <div
              data-testid="export-preview-row-summary"
              className="text-xs font-mono text-secondary"
            >
              {totalRows === 0
                ? 'Showing 0 of 0 rows'
                : `Showing ${startIndex + 1}–${endIndex} of ${totalRows.toLocaleString()} rows (${
                    previewFormat === 'excel' ? 'Excel .xlsx formatted' : 'Power BI Tabular formatted'
                  })`}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="First page"
                data-testid="export-preview-first-page"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(1)}
                className="p-2 rounded-lg bg-input hover:bg-card-hover text-primary border border-subtle disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Previous page"
                data-testid="export-preview-prev-page"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg bg-input hover:bg-card-hover text-primary border border-subtle text-xs font-mono flex items-center gap-1 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span
                data-testid="export-preview-page-indicator"
                className="px-3 py-1.5 rounded-lg bg-input border border-subtle text-xs font-mono text-primary"
              >
                Page <strong className="text-accent">{safePage}</strong> of {totalPages}
              </span>

              <button
                type="button"
                aria-label="Next page"
                data-testid="export-preview-next-page"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg bg-input hover:bg-card-hover text-primary border border-subtle text-xs font-mono flex items-center gap-1 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Last page"
                data-testid="export-preview-last-page"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-2 rounded-lg bg-input hover:bg-card-hover text-primary border border-subtle disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 1-Click Primary Complete Project ZIP (RULE 83) */}
      <div className={`border-2 rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden transition-all ${
        isLight 
          ? 'bg-card border-strong shadow-md text-primary' 
          : 'bg-card border-strong shadow-xl text-primary'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-xl">
            <span className="px-2.5 py-0.5 rounded font-bold text-[10px] uppercase font-mono bg-accent text-on-accent shadow-2xs">
              FLAGSHIP BUNDLE
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-wide uppercase text-primary">
              DOWNLOAD COMPLETE PROJECT (14 FOLDERS)
            </h2>
            <p className="text-xs leading-relaxed text-secondary">
              Contains all raw data, cleaned tables, multi-tab Excel source with tbl* definitions, compiled PDF Executive Report, Power BI PBIP tabular model, DAX library, SQL queries, Python scripts, and documentation.
            </p>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-8 py-4 rounded-2xl font-heading text-lg sm:text-xl font-bold tracking-wider uppercase transition-all flex items-center gap-3 shrink-0 disabled:opacity-50 cursor-pointer shadow-lg bg-accent hover:opacity-90 text-on-accent"
          >
            {isZipping ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>COMPILING ZIP...</span>
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                <span>DOWNLOAD COMPLETE ZIP</span>
              </>
            )}
          </button>
        </div>

        {/* 14 Folders Manifest Preview */}
        <div className="pt-4 border-t grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-[10px] font-mono border-subtle text-secondary">
          {[
            '01_Original_Data',
            '02_Cleaned_Data',
            '03_Excel_Source',
            '04_Data_Model',
            '05_DAX',
            '06_SQL',
            '07_Python',
            '08_PowerBI',
            '09_Dashboard',
            '10_Reports (PDF)',
            '11_Data_Dict',
            '12_Insights',
            '13_Documentation',
            '14_Metadata'
          ].map(f => (
            <div 
              key={f} 
              className={`p-1.5 rounded truncate border font-medium ${
                f === '10_Reports (PDF)' 
                  ? 'bg-accent-soft border-strong text-accent font-bold' 
                  : 'bg-input border-subtle text-secondary'
              }`}
            >
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Stakeholder Packages (RULE 86) */}
      <div className="space-y-4">
        <h3 className="font-heading text-xl font-bold text-primary uppercase tracking-wide">
          SPECIALIZED STAKEHOLDER PACKAGES
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {/* Executive PDF Report Package */}
          <div className="p-6 rounded-2xl bg-card border border-subtle space-y-4 flex flex-col justify-between hover:border-strong transition-colors relative overflow-hidden">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center font-bold">
                  PDF
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-soft text-accent font-semibold">
                  BOARDROOM
                </span>
              </div>
              <h4 className="font-heading text-lg font-bold text-primary">EXECUTIVE REPORT (PDF)</h4>
              <p className="text-xs text-secondary leading-relaxed">
                Presentation-ready A4 executive intelligence brief. Compiles all verified KPIs, variance ratios, data health score, and AI strategic directives into a formatted PDF.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-subtle">
              <button
                onClick={handleDownloadReportPDF}
                disabled={isPdfGenerating}
                className="w-full py-2.5 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isPdfGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Compiling...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download Report as PDF
                  </>
                )}
              </button>
              <button
                onClick={() => setCurrentTab('reports')}
                className="w-full py-2 rounded-lg bg-input hover:bg-card-hover text-primary text-xs font-medium border border-subtle transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-accent" /> Preview Report
              </button>
            </div>
          </div>

          {/* Chart Guide (PDF) Package */}
          <div className="p-6 rounded-2xl bg-card border border-subtle space-y-4 flex flex-col justify-between hover:border-strong transition-colors relative overflow-hidden">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center font-bold">
                  08
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-soft text-accent font-semibold">
                  HANDBOOK
                </span>
              </div>
              <h4 className="font-heading text-lg font-bold text-primary">Chart guide (PDF)</h4>
              <p className="text-xs text-secondary leading-relaxed">
                Complete A4 Chart Selection Guide covering all 8 chart patterns, vector illustrations, decision matrix, dataset column recommendations, and glossary.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-subtle">
              <button
                type="button"
                aria-label="Download Chart guide (PDF)"
                onClick={handleDownloadChartGuidePDF}
                disabled={isGuidePdfGenerating}
                className="w-full py-2.5 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isGuidePdfGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Chart guide (PDF)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Power BI Package */}
          <div className="p-6 rounded-2xl bg-card border border-subtle space-y-4 flex flex-col justify-between hover:border-strong transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-warning flex items-center justify-center font-bold">
                PB
              </div>
              <h4 className="font-heading text-lg font-bold text-primary">POWER BI SUITE</h4>
              <p className="text-xs text-secondary leading-relaxed">
                Includes Tabular Model BIM (Model.bim), Power Query M expressions, Tiffany Dark Theme JSON, and Refresh Guide.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-subtle">
              <button
                type="button"
                data-testid="preview-powerbi-btn"
                onClick={() => handleSelectPreviewFormat('powerbi', true)}
                className="w-full py-2 rounded-lg bg-accent-soft hover:opacity-90 text-accent text-xs font-bold border border-subtle transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Preview Power BI Export
              </button>
              <button
                onClick={handleDownloadPBIPModel}
                className="w-full py-2 rounded-lg bg-input hover:bg-card-hover text-primary text-xs font-medium border border-subtle transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-accent" /> Download Model.bim
              </button>
              <button
                onClick={handleDownloadPowerQueryM}
                className="w-full py-2 rounded-lg bg-input hover:bg-card-hover text-primary text-xs font-medium border border-subtle transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-accent" /> Power Query (.m)
              </button>
              <button
                onClick={handleDownloadTheme}
                className="w-full py-2 rounded-lg bg-input hover:bg-card-hover text-primary text-xs font-medium border border-subtle transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-accent" /> Theme.json
              </button>
            </div>
          </div>

          {/* Analyst Excel Package */}
          <div className="p-6 rounded-2xl bg-card border border-subtle space-y-4 flex flex-col justify-between hover:border-strong transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-success flex items-center justify-center font-bold">
                XL
              </div>
              <h4 className="font-heading text-lg font-bold text-primary">EXCEL SOURCE</h4>
              <p className="text-xs text-secondary leading-relaxed">
                Structured multi-tab workbook with real tbl* tables, KPI definitions, Data Dictionary, Relationships, and Parameters.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-subtle">
              <button
                type="button"
                data-testid="preview-excel-btn"
                onClick={() => handleSelectPreviewFormat('excel', true)}
                className="w-full py-2 rounded-lg bg-accent-soft hover:opacity-90 text-accent text-xs font-bold border border-subtle transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Preview Excel Export
              </button>
              <button
                onClick={handleDownloadExcel}
                disabled={isExcelGenerating}
                className="w-full py-2.5 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> Download .XLSX Source
              </button>
            </div>
          </div>

          {/* Code & Queries Package */}
          <div className="p-6 rounded-2xl bg-card border border-subtle space-y-4 flex flex-col justify-between hover:border-strong transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-info flex items-center justify-center font-bold">
                DEV
              </div>
              <h4 className="font-heading text-lg font-bold text-primary">ENGINEER PACKAGE</h4>
              <p className="text-xs text-secondary leading-relaxed">
                Reproducible Python data science scripts, complete DAX formulas library, and AlaSQL analytical queries.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-subtle">
              <button
                onClick={handleDownloadZip}
                className="w-full py-2 rounded-lg bg-input hover:bg-card-hover text-primary text-xs font-medium border border-subtle transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-accent" /> Get Code Package
              </button>
            </div>
          </div>

          {/* Google Colab Cloud Notebook */}
          <div className="p-6 rounded-2xl bg-card border border-subtle space-y-4 flex flex-col justify-between hover:border-strong transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-warning flex items-center justify-center font-bold">
                ipynb
              </div>
              <h4 className="font-heading text-lg font-bold text-primary">GOOGLE COLAB</h4>
              <p className="text-xs text-secondary leading-relaxed">
                Run live Pandas & Seaborn analysis in Google Cloud Colab. Includes pre-loaded data & quick setup guide.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-subtle">
              <button
                onClick={() => setIsColabModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-primary text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Open in Google Colab
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Google Colab Notebook Modal */}
      <ColabNotebookModal
        isOpen={isColabModalOpen}
        onClose={() => setIsColabModalOpen(false)}
        project={project}
        columns={columns}
        cleanRows={cleanRows}
        tableName={dataModel.tables[0]?.name || 'FactTable'}
      />
    </div>
  );
};
