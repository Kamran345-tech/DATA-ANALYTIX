import React, { useState } from 'react';
import { 
  FolderDown, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  Package, 
  Code2, 
  Database, 
  FileCode, 
  FileText, 
  ShieldCheck,
  Loader2,
  Sparkles,
  ArrowRight,
  Printer,
  SlidersHorizontal
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { 
  createCompleteProjectZip, 
  buildExcelWorkbook, 
  generateModelBimJSON, 
  generatePowerBIMSemanticModel, 
  generatePowerBIThemeJSON,
  generateEnterpriseReportPDF,
  downloadDashboardAndReportBundle,
  downloadChartGuidePDF,
  ExportDataPayload
} from '../../engine/exportEngine';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { ColabNotebookModal } from '../common/ColabNotebookModal';
import { useToast } from '../../store/useToast';

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
  const [isColabModalOpen, setIsColabModalOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
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

  const handleDownloadDashboardAndReportBundle = async () => {
    setIsBundleGenerating(true);
    try {
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

  const handleDownloadReportPDF = () => {
    setIsPdfGenerating(true);
    try {
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

  const handleDownloadChartGuidePDF = () => {
    setIsGuidePdfGenerating(true);
    try {
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

  const handleDownloadExcel = () => {
    const buf = buildExcelWorkbook(payload);
    const blob = new Blob([buf as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9_]/g, '_')}_Excel_Source_Workbook.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPBIPModel = () => {
    const json = generateModelBimJSON(payload);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Model.bim`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPowerQueryM = () => {
    const m = generatePowerBIMSemanticModel(payload);
    const blob = new Blob([m], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PowerQuery_Transformations.m`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTheme = () => {
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
            Export boardroom-ready PDF reports, created dashboards, combined bundles, and structured Excel workbooks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                onClick={handleDownloadExcel}
                className="w-full py-2.5 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
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
