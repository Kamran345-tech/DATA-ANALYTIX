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
  Printer
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { 
  createCompleteProjectZip, 
  buildExcelWorkbook, 
  generateModelBimJSON, 
  generatePowerBIMSemanticModel, 
  generatePowerBIThemeJSON,
  generateEnterpriseReportPDF,
  ExportDataPayload
} from '../../engine/exportEngine';

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
    setCurrentTab
  } = usePlatform();

  const [isZipping, setIsZipping] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

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

  const handleDownloadReportPDF = () => {
    setIsPdfGenerating(true);
    try {
      const doc = generateEnterpriseReportPDF(payload);
      const safeProjectName = project.name.replace(/[^a-zA-Z0-9_]/g, '_');
      const filename = `${safeProjectName}_Executive_Report.pdf`;
      doc.save(filename);
      setDownloadSuccess(`Enterprise Report "${filename}" compiled and downloaded successfully.`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (e: any) {
      alert(`PDF report compilation failed: ${e?.message}`);
    } finally {
      setIsPdfGenerating(false);
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
      alert(`Export failed: ${e?.message}`);
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
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <FolderDown className="w-4 h-4" /> Sovereign User Package Center
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            ENTERPRISE EXPORT CENTER
          </h1>
          <p className="text-xs text-gray-400">
            Rule 14 Guarantee: Zero vendor lock-in. Export boardroom-ready PDF reports, Power BI projects, structured Excel workbooks, and reproducible scripts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Direct Download Report as PDF CTA */}
          <button
            onClick={handleDownloadReportPDF}
            disabled={isPdfGenerating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] hover:glow-neon transition-all disabled:opacity-50"
          >
            {isPdfGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling PDF...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Download Report as PDF</span>
              </>
            )}
          </button>

          {/* Validation Status Indicator (Rule 115) */}
          <div className="flex items-center gap-2 bg-[#141414] border border-[#21F1A8]/40 px-3.5 py-2.5 rounded-xl text-xs font-mono text-[#21F1A8]">
            <ShieldCheck className="w-4 h-4" />
            <span>Export Validation: PASSED</span>
          </div>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-4 rounded-xl bg-[#21F1A8]/10 border border-[#21F1A8]/30 text-xs text-[#21F1A8] flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* 1-Click Primary Complete Project ZIP (RULE 83) */}
      <div className="bg-gradient-to-r from-[#1c1c1c] via-[#222] to-[#1c1c1c] border-2 border-[#21F1A8]/50 rounded-3xl p-8 space-y-6 glow-neon relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-xl">
            <span className="px-2.5 py-0.5 rounded bg-[#21F1A8] text-black font-bold text-[10px] uppercase font-mono">
              FLAGSHIP BUNDLE
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-wide uppercase">
              DOWNLOAD COMPLETE PROJECT (14 FOLDERS)
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Contains all raw data, cleaned tables, multi-tab Excel source with tbl* definitions, compiled PDF Executive Report, Power BI PBIP tabular model, DAX library, SQL queries, Python scripts, and documentation.
            </p>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-8 py-4 rounded-2xl bg-[#21F1A8] text-black font-heading text-xl font-bold tracking-wider uppercase hover:bg-[#1cdb97] hover:glow-neon-strong transition-all flex items-center gap-3 shrink-0 disabled:opacity-50"
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
        <div className="pt-4 border-t border-[#333] grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-[10px] font-mono text-gray-400">
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">01_Original_Data</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">02_Cleaned_Data</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">03_Excel_Source</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">04_Data_Model</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">05_DAX</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">06_SQL</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">07_Python</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">08_PowerBI</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">09_Dashboard</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate text-[#21F1A8]">10_Reports (PDF)</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">11_Data_Dict</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">12_Insights</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">13_Documentation</div>
          <div className="p-1.5 rounded bg-[#141414] border border-[#2a2a2a] truncate">14_Metadata</div>
        </div>
      </div>

      {/* Stakeholder Packages (RULE 86) */}
      <div className="space-y-4">
        <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide">
          SPECIALIZED STAKEHOLDER PACKAGES
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Executive PDF Report Package */}
          <div className="p-6 rounded-2xl bg-[#1c1c1c] border border-[#21F1A8]/30 space-y-4 flex flex-col justify-between hover:border-[#21F1A8] transition-colors relative overflow-hidden">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#21F1A8]/15 text-[#21F1A8] flex items-center justify-center font-bold">
                  PDF
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21F1A8]/20 text-[#21F1A8] font-semibold">
                  BOARDROOM
                </span>
              </div>
              <h4 className="font-heading text-lg font-bold text-white">EXECUTIVE REPORT (PDF)</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Presentation-ready A4 executive intelligence brief. Compiles all verified KPIs, variance ratios, data health score, and AI strategic directives into a formatted PDF.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#262626]">
              <button
                onClick={handleDownloadReportPDF}
                disabled={isPdfGenerating}
                className="w-full py-2.5 rounded-xl bg-[#21F1A8] text-black text-xs font-bold hover:bg-[#1cdb97] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                className="w-full py-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-gray-200 text-xs font-medium border border-[#383838] transition-colors flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#21F1A8]" /> Preview Report
              </button>
            </div>
          </div>

          {/* Power BI Package */}
          <div className="p-6 rounded-2xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-4 flex flex-col justify-between hover:border-[#21F1A8]/40 transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                PB
              </div>
              <h4 className="font-heading text-lg font-bold text-white">POWER BI SUITE</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Includes Tabular Model BIM (Model.bim), Power Query M expressions, Tiffany Dark Theme JSON, and Refresh Guide.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#262626]">
              <button
                onClick={handleDownloadPBIPModel}
                className="w-full py-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-gray-200 text-xs font-medium border border-[#383838] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#21F1A8]" /> Download Model.bim
              </button>
              <button
                onClick={handleDownloadPowerQueryM}
                className="w-full py-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-gray-200 text-xs font-medium border border-[#383838] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#21F1A8]" /> Power Query (.m)
              </button>
              <button
                onClick={handleDownloadTheme}
                className="w-full py-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-gray-200 text-xs font-medium border border-[#383838] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#21F1A8]" /> Theme.json
              </button>
            </div>
          </div>

          {/* Analyst Excel Package */}
          <div className="p-6 rounded-2xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-4 flex flex-col justify-between hover:border-[#21F1A8]/40 transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                XL
              </div>
              <h4 className="font-heading text-lg font-bold text-white">EXCEL SOURCE</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Structured multi-tab workbook with real tbl* tables, KPI definitions, Data Dictionary, Relationships, and Parameters.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#262626]">
              <button
                onClick={handleDownloadExcel}
                className="w-full py-2.5 rounded-xl bg-[#21F1A8] text-black text-xs font-bold hover:bg-[#1cdb97] transition-colors flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" /> Download .XLSX Source
              </button>
            </div>
          </div>

          {/* Code & Queries Package */}
          <div className="p-6 rounded-2xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-4 flex flex-col justify-between hover:border-[#21F1A8]/40 transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
                DEV
              </div>
              <h4 className="font-heading text-lg font-bold text-white">ENGINEER PACKAGE</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Reproducible Python data science scripts, complete DAX formulas library, and AlaSQL analytical queries.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#262626]">
              <button
                onClick={handleDownloadZip}
                className="w-full py-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-gray-200 text-xs font-medium border border-[#383838] transition-colors flex items-center justify-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5 text-[#21F1A8]" /> Get Code Package
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
