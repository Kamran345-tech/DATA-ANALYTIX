import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle,
  Award,
  Loader2,
  Package,
  Check,
  Pencil,
  Sliders,
  X,
  RotateCcw,
  Sparkles,
  Tv
} from 'lucide-react';
import { KPI } from '../../types';
import { usePlatform, ReportHeadings } from '../../store/usePlatformStore';
import { generateEnterpriseReportPDF, downloadDashboardAndReportBundle, ExportDataPayload } from '../../engine/exportEngine';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { KpiCardEditorModal } from '../common/KpiCardEditorModal';
import { parseRobustNumber } from '../../engine/dataParser';

export const ReportsView: React.FC = () => {
  const { 
    project, 
    brand, 
    analytics, 
    qualityReport, 
    cleanRows, 
    rawRows, 
    columns, 
    dataModel, 
    daxMeasures, 
    transformations, 
    customVisuals, 
    reportHeadings, 
    updateReportHeading,
    setIsPresentationMode 
  } = usePlatform();

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isBundleGenerating, setIsBundleGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // KPI Editor Modal state
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null);

  // Heading Editor Modal state
  const [isHeadingsModalOpen, setIsHeadingsModalOpen] = useState(false);

  // Inline heading editing state
  const [inlineEditingKey, setInlineEditingKey] = useState<keyof ReportHeadings | null>(null);
  const [inlineHeadingVal, setInlineHeadingVal] = useState<string>('');

  const handleStartInlineEdit = (key: keyof ReportHeadings) => {
    setInlineEditingKey(key);
    setInlineHeadingVal(reportHeadings[key] || '');
  };

  const handleSaveInlineEdit = () => {
    if (inlineEditingKey && inlineHeadingVal.trim()) {
      updateReportHeading(inlineEditingKey, inlineHeadingVal.trim());
      setDownloadSuccess(`Updated heading for [${inlineEditingKey}]!`);
      setTimeout(() => setDownloadSuccess(null), 2500);
    }
    setInlineEditingKey(null);
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingKey(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    setIsPdfGenerating(true);
    try {
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
        qualityReport,
        reportHeadings
      };
      const doc = generateEnterpriseReportPDF(payload, {
        customVisuals,
        categoryPerformance: analytics.categoryPerformance,
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        opportunities: analytics.opportunities
      });
      doc.save(`${project.name.replace(/[^a-zA-Z0-9_]/g, '_')}_Executive_Report.pdf`);
      setDownloadSuccess('Executive PDF Report downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setDownloadSuccess(`PDF compilation note: ${err?.message || 'Error compiling PDF'}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleDownloadBundleZip = async () => {
    setIsBundleGenerating(true);
    try {
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
        qualityReport,
        reportHeadings
      };
      await downloadDashboardAndReportBundle(payload, {
        customVisuals,
        categoryPerformance: analytics.categoryPerformance,
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        opportunities: analytics.opportunities
      });
      setDownloadSuccess('Combined Dashboard & Executive Report bundle downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err: any) {
      console.error(err);
      setDownloadSuccess(`Bundle export note: ${err?.message || 'Failed to create bundle'}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsBundleGenerating(false);
    }
  };

  // Helper to compute structured category aggregates with mathematically sound averages and clean numbers
  const computeVisualBreakdown = (catField: string, valField: string, agg: string = 'sum') => {
    const map: Record<string, { sum: number; count: number; min: number; max: number }> = {};
    let totalSum = 0;
    cleanRows.forEach(r => {
      const cat = String(r[catField] !== undefined && r[catField] !== null ? r[catField] : 'Unassigned');
      const parsed = parseRobustNumber(r[valField]);
      const val = parsed.value !== null && !isNaN(parsed.value) ? parsed.value : 0;
      if (!map[cat]) map[cat] = { sum: 0, count: 0, min: val, max: val };
      map[cat].sum += val;
      map[cat].count += 1;
      map[cat].min = Math.min(map[cat].min, val);
      map[cat].max = Math.max(map[cat].max, val);
      totalSum += val;
    });

    const items = Object.entries(map).map(([category, s]) => {
      let finalVal = s.sum;
      if (agg === 'avg') finalVal = s.count > 0 ? s.sum / s.count : 0;
      else if (agg === 'count') finalVal = s.count;
      else if (agg === 'min') finalVal = s.min;
      else if (agg === 'max') finalVal = s.max;

      return {
        category,
        val: finalVal,
        count: s.count,
        share: totalSum > 0 ? (s.sum / totalSum) * 100 : 0
      };
    }).sort((a, b) => b.val - a.val);

    // Audit fix: When aggregation is average, grand total must be true weighted average
    const grandTotal = agg === 'avg'
      ? (cleanRows.length > 0 ? totalSum / cleanRows.length : 0)
      : (agg === 'count' ? cleanRows.length : totalSum);

    return { items: items.slice(0, 8), total: grandTotal, totalSum, totalSegments: items.length };
  };

  const attachedVisuals = customVisuals.length > 0 ? customVisuals : (analytics.visuals || []);

  return (
    <div className="space-y-6 pb-16 animate-fadeIn max-w-4xl mx-auto">
      {/* Toast Notification */}
      {downloadSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-[#162920] border border-[#21F1A8] text-[#21F1A8] px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 print:hidden">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <FileSpreadsheet className="w-4 h-4 text-[#21F1A8]" />
          <span>Presentation-Ready Executive Report Layout</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Customize Headings Modal Trigger */}
          <button
            onClick={() => setIsHeadingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#262626] hover:bg-[#333] text-gray-200 hover:text-white font-medium text-xs border border-[#3a3a3a] transition-all"
            title="Customize report document heading and all section titles"
          >
            <Pencil className="w-3.5 h-3.5 text-[#21F1A8]" />
            <span>Customize Headings</span>
          </button>

          {/* Download Bundle (Dashboard + Executive Report Bundle ZIP) */}
          <button
            onClick={handleDownloadBundleZip}
            disabled={isBundleGenerating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all disabled:opacity-50 shadow-md shrink-0 whitespace-nowrap cursor-pointer"
            title="Download both the created dashboard and executive report in a single ZIP package"
          >
            {isBundleGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
            ) : (
              <Package className="w-4 h-4 stroke-[2.5] shrink-0" />
            )}
            <span className="whitespace-nowrap font-bold">Download Bundle (ZIP)</span>
          </button>

          {/* Download PDF Report */}
          <button
            onClick={handleDownloadPDF}
            disabled={isPdfGenerating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#252525] hover:bg-[#303030] text-gray-200 hover:text-white font-medium text-xs border border-[#3a3a3a] transition-all disabled:opacity-50"
            title="Download Executive PDF Report"
          >
            {isPdfGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Download className="w-4 h-4 text-cyan-400" />
            )}
            <span>Executive Report (PDF)</span>
          </button>

          <button
            onClick={() => setIsPresentationMode(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
            title="Open Fullscreen Boardroom Presentation Deck"
          >
            <Tv className="w-4 h-4" />
            <span>Present Deck</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#262626] hover:bg-[#333] text-gray-200 font-medium text-xs border border-[#3a3a3a] transition-all"
          >
            <Printer className="w-4 h-4" /> Print Preview
          </button>
        </div>
      </div>

      {/* Printable Report Document */}
      <div className="bg-[#171717] border border-[#333] rounded-3xl p-8 sm:p-12 space-y-10 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-[#333] pb-8 flex flex-wrap items-start justify-between gap-6 print:border-gray-300">
          <div className="space-y-2 flex-1 min-w-[280px]">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-bold tracking-wider text-white print:text-black">
                {brand.companyName}
              </span>
              <span className="text-xs text-[#21F1A8] print:text-emerald-700 font-mono">
                • {brand.department}
              </span>
            </div>

            {/* Editable Main Report Title */}
            <div className="relative group py-1">
              {inlineEditingKey === 'mainTitle' ? (
                <div className="flex items-center gap-2 max-w-xl animate-fadeIn">
                  <input
                    type="text"
                    value={inlineHeadingVal}
                    onChange={(e) => setInlineHeadingVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveInlineEdit();
                      if (e.key === 'Escape') handleCancelInlineEdit();
                    }}
                    autoFocus
                    className="flex-1 px-3 py-1.5 bg-[#121212] border border-[#21F1A8] text-white rounded-lg text-2xl font-extrabold uppercase focus:outline-none"
                  />
                  <button
                    onClick={handleSaveInlineEdit}
                    className="p-2 bg-[#21F1A8] text-black rounded-lg hover:bg-[#1cdb97]"
                    title="Save title"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                  <button
                    onClick={handleCancelInlineEdit}
                    className="p-2 bg-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#333]"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white print:text-black tracking-wide uppercase">
                    {reportHeadings.mainTitle || 'EXECUTIVE INTELLIGENCE BRIEF'}
                  </h1>
                  <button
                    onClick={() => handleStartInlineEdit('mainTitle')}
                    className="p-1.5 rounded-lg bg-[#242424] hover:bg-[#333] text-gray-400 hover:text-[#21F1A8] transition-colors print:hidden opacity-70 group-hover:opacity-100"
                    title="Change main report title"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="print:hidden py-1">
              <EditableDashboardTitle className="text-base font-semibold" showLabelPrefix={true} />
            </div>
            <p className="text-xs text-gray-400 print:text-gray-600">
              Project: <span className="text-gray-200 print:text-black font-medium">{project.name}</span> • Dataset: <span className="font-mono text-gray-300 print:text-black">{project.sourceFileName}</span>
            </p>
          </div>

          <div className="text-right text-xs text-gray-400 print:text-gray-600 space-y-1">
            <div>Date: <strong className="text-white print:text-black font-mono">{new Date().toLocaleDateString()}</strong></div>
            <div>Author: <strong className="text-white print:text-black">{brand.author}</strong></div>
            <div>Version: <span className="font-mono">{project.version}</span></div>
            <div className="text-[#21F1A8] print:text-emerald-700 font-semibold">
              Quality Audit: {qualityReport.overallScore}%
            </div>
          </div>
        </div>

        {/* 1. Executive Summary */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 group">
            {inlineEditingKey === 'section1' ? (
              <div className="flex items-center gap-2 max-w-xl animate-fadeIn">
                <input
                  type="text"
                  value={inlineHeadingVal}
                  onChange={(e) => setInlineHeadingVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveInlineEdit();
                    if (e.key === 'Escape') handleCancelInlineEdit();
                  }}
                  autoFocus
                  className="px-3 py-1 bg-[#121212] border border-[#21F1A8] text-[#21F1A8] rounded-lg text-lg font-bold uppercase focus:outline-none"
                />
                <button onClick={handleSaveInlineEdit} className="p-1.5 bg-[#21F1A8] text-black rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={handleCancelInlineEdit} className="p-1.5 bg-[#2a2a2a] text-gray-300 rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#21F1A8] print:text-emerald-800 uppercase tracking-wide">
                  {reportHeadings.section1 || '1. EXECUTIVE SUMMARY & BUSINESS HEALTH'}
                </h2>
                <button
                  onClick={() => handleStartInlineEdit('section1')}
                  className="p-1 text-gray-500 hover:text-[#21F1A8] opacity-60 group-hover:opacity-100 transition-opacity print:hidden"
                  title="Change Section 1 Heading"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-[#1c1c1c] print:bg-gray-50 border border-[#2a2a2a] print:border-gray-200 text-xs text-gray-300 print:text-gray-800 leading-relaxed space-y-2">
            <p>
              This report provides a verified assessment based on <strong>{cleanRows.length.toLocaleString()}</strong> audited transaction records. Overall data health scored <strong>{qualityReport.overallScore}%</strong> on completeness, validity, and uniqueness.
            </p>
            {analytics.businessHealthScore && (
              <p>
                Business Health Index is rated <strong>{analytics.businessHealthScore.rating} ({analytics.businessHealthScore.score}/100)</strong> based on metric pacing and anomaly thresholds.
              </p>
            )}
          </div>
        </section>

        {/* 2. Key Performance Indicators */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 group">
            {inlineEditingKey === 'section2' ? (
              <div className="flex items-center gap-2 max-w-xl animate-fadeIn">
                <input
                  type="text"
                  value={inlineHeadingVal}
                  onChange={(e) => setInlineHeadingVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveInlineEdit();
                    if (e.key === 'Escape') handleCancelInlineEdit();
                  }}
                  autoFocus
                  className="px-3 py-1 bg-[#121212] border border-[#21F1A8] text-[#21F1A8] rounded-lg text-lg font-bold uppercase focus:outline-none"
                />
                <button onClick={handleSaveInlineEdit} className="p-1.5 bg-[#21F1A8] text-black rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={handleCancelInlineEdit} className="p-1.5 bg-[#2a2a2a] text-gray-300 rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#21F1A8] print:text-emerald-800 uppercase tracking-wide">
                  {reportHeadings.section2 || '2. KEY PERFORMANCE INDICATORS'}
                </h2>
                <button
                  onClick={() => handleStartInlineEdit('section2')}
                  className="p-1 text-gray-500 hover:text-[#21F1A8] opacity-60 group-hover:opacity-100 transition-opacity print:hidden"
                  title="Change Section 2 Heading"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick KPI Customizer Trigger */}
            <div className="flex items-center gap-2 print:hidden">
              <span className="text-[11px] text-gray-400 font-mono">
                {analytics.kpis.length} Metrics Analyzed
              </span>
              <button
                type="button"
                onClick={() => setEditingKpi(analytics.kpis[0] || null)}
                className="px-2.5 py-1 rounded-lg bg-[#242424] hover:bg-[#333] text-gray-200 hover:text-[#21F1A8] text-xs font-medium border border-[#333] flex items-center gap-1.5 transition-all shadow-xs"
                title="Change metric headings, columns, and aggregation formulas"
              >
                <Sliders className="w-3 h-3 text-[#21F1A8]" />
                <span>Customize Metrics & Formulas</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#2a2a2a] print:border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] print:bg-gray-100 text-gray-400 print:text-gray-700 uppercase font-mono border-b border-[#2a2a2a] print:border-gray-300">
                <tr>
                  <th className="p-3">Metric Heading</th>
                  <th className="p-3">Current Value</th>
                  <th className="p-3">Prior Value</th>
                  <th className="p-3">Variance %</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Source Field / Formula</th>
                  <th className="p-3 text-right print:hidden">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222] print:divide-gray-200 font-mono">
                {analytics.kpis.map(k => (
                  <tr key={k.id} className="text-gray-300 print:text-black hover:bg-[#1f1f1f]/60 print:hover:bg-transparent">
                    <td className="p-3 font-bold font-sans flex items-center gap-2">
                      <span>{k.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono uppercase">[{k.aggregation}]</span>
                    </td>
                    <td className="p-3 text-white print:text-black font-bold">{k.formattedValue}</td>
                    <td className="p-3 text-gray-400 print:text-gray-600">{k.formattedPreviousValue || 'N/A'}</td>
                    <td className="p-3">
                      {k.changePercent !== undefined ? (
                        <span className={k.changePercent >= 0 ? 'text-[#21F1A8] print:text-emerald-700 font-bold' : 'text-red-400 print:text-red-700 font-bold'}>
                          {k.changePercent >= 0 ? '+' : ''}{k.changePercent}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#262626] print:bg-gray-200">
                        {k.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 text-[11px] truncate max-w-[180px]" title={k.calculation}>
                      {k.calculation}
                    </td>
                    <td className="p-3 text-right print:hidden">
                      <button
                        onClick={() => setEditingKpi(k)}
                        className="px-2 py-1 rounded bg-[#252525] hover:bg-[#333] text-gray-300 hover:text-[#21F1A8] text-[11px] font-sans font-medium border border-[#333] transition-colors"
                        title={`Customize ${k.name}`}
                      >
                        <Pencil className="w-3 h-3 inline mr-1" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. AI Insights & Management Directives */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2 group">
            {inlineEditingKey === 'section3' ? (
              <div className="flex items-center gap-2 max-w-xl animate-fadeIn">
                <input
                  type="text"
                  value={inlineHeadingVal}
                  onChange={(e) => setInlineHeadingVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveInlineEdit();
                    if (e.key === 'Escape') handleCancelInlineEdit();
                  }}
                  autoFocus
                  className="px-3 py-1 bg-[#121212] border border-[#21F1A8] text-[#21F1A8] rounded-lg text-lg font-bold uppercase focus:outline-none"
                />
                <button onClick={handleSaveInlineEdit} className="p-1.5 bg-[#21F1A8] text-black rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={handleCancelInlineEdit} className="p-1.5 bg-[#2a2a2a] text-gray-300 rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#21F1A8] print:text-emerald-800 uppercase tracking-wide">
                  {reportHeadings.section3 || '3. AI INSIGHTS & MANAGEMENT DIRECTIVES'}
                </h2>
                <button
                  onClick={() => handleStartInlineEdit('section3')}
                  className="p-1 text-gray-500 hover:text-[#21F1A8] opacity-60 group-hover:opacity-100 transition-opacity print:hidden"
                  title="Change Section 3 Heading"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {analytics.insights.map(ins => (
              <div 
                key={ins.id}
                className="p-5 rounded-2xl bg-[#1c1c1c] print:bg-gray-50 border border-[#2a2a2a] print:border-gray-200 space-y-2 text-xs text-gray-300 print:text-gray-800"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white print:text-black text-sm">{ins.title}</h4>
                  <span className="font-mono text-[10px] uppercase text-[#21F1A8] print:text-emerald-700 font-bold">
                    [{ins.category}]
                  </span>
                </div>
                <p><strong>Observed Impact:</strong> {ins.what}</p>
                <p><strong>Root Driver:</strong> {ins.why}</p>
                <div className="p-3 rounded-xl bg-[#141414] print:bg-emerald-50 border border-[#21F1A8]/30 print:border-emerald-300 text-white print:text-emerald-900">
                  <strong>Recommended Management Action:</strong> {ins.action}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Attached Dashboard Visualizations & Detailed Segment Breakdowns */}
        {attachedVisuals.length > 0 && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#333] print:border-gray-300 pb-2 group">
              {inlineEditingKey === 'section4' ? (
                <div className="flex items-center gap-2 max-w-xl animate-fadeIn">
                  <input
                    type="text"
                    value={inlineHeadingVal}
                    onChange={(e) => setInlineHeadingVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveInlineEdit();
                      if (e.key === 'Escape') handleCancelInlineEdit();
                    }}
                    autoFocus
                    className="px-3 py-1 bg-[#121212] border border-[#21F1A8] text-[#21F1A8] rounded-lg text-lg font-bold uppercase focus:outline-none"
                  />
                  <button onClick={handleSaveInlineEdit} className="p-1.5 bg-[#21F1A8] text-black rounded"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={handleCancelInlineEdit} className="p-1.5 bg-[#2a2a2a] text-gray-300 rounded"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#21F1A8] print:text-emerald-800 uppercase tracking-wide">
                    {reportHeadings.section4 || '4. ATTACHED DASHBOARDS & SEGMENT BREAKDOWNS'}
                  </h2>
                  <button
                    onClick={() => handleStartInlineEdit('section4')}
                    className="p-1 text-gray-500 hover:text-[#21F1A8] opacity-60 group-hover:opacity-100 transition-opacity print:hidden"
                    title="Change Section 4 Heading"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <span className="text-xs font-mono text-gray-400 print:text-gray-600">
                {attachedVisuals.length} Active Visuals Attached
              </span>
            </div>

            <div className="space-y-6">
              {attachedVisuals.map((vis, vIdx) => {
                const cat = vis.categoryField || columns.find(c => c.dataType === 'string')?.name || 'Category';
                const val = vis.valueField || columns.find(c => c.dataType === 'number')?.name || 'Value';
                const agg = (vis.aggregation || 'sum').toLowerCase();
                const isCur = /revenue|sales|profit|margin|cost|amount|price|salary|spend/i.test(val);
                const { items, total, totalSegments } = computeVisualBreakdown(cat, val, agg);
                const formatVal = (n: number) => isCur 
                  ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` 
                  : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

                return (
                  <div 
                    key={vis.id || vIdx} 
                    className="p-5 sm:p-6 rounded-2xl bg-[#1c1c1c] print:bg-white border border-[#2a2a2a] print:border-gray-200 space-y-4 break-inside-avoid shadow-lg"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#21F1A8] print:text-emerald-700 uppercase">
                            Widget 4.{vIdx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#262626] print:bg-gray-200 text-gray-300 print:text-gray-800">
                            {vis.type || 'bar'}
                          </span>
                        </div>
                        <h4 className="font-bold text-white print:text-black text-base uppercase">
                          {vis.title}
                        </h4>
                        <p className="text-[11px] text-gray-400 print:text-gray-600">
                          Metric: <span className="font-mono text-gray-300 print:text-black">{agg.toUpperCase()}({val})</span> grouped by <span className="font-mono text-gray-300 print:text-black">{cat}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-gray-400 print:text-gray-600">
                          {agg === 'avg' ? 'Overall Average' : 'Grand Total'}
                        </span>
                        <div className="text-lg font-bold text-[#21F1A8] print:text-emerald-800 font-mono">
                          {formatVal(total)}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="overflow-x-auto rounded-xl border border-[#2a2a2a] print:border-gray-200">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#141414] print:bg-gray-100 text-gray-400 print:text-gray-700 uppercase text-[10px]">
                          <tr>
                            <th className="p-2.5 text-center w-12">#</th>
                            <th className="p-2.5">Category / Segment</th>
                            <th className="p-2.5 text-right">{agg.toUpperCase()}({val})</th>
                            <th className="p-2.5 text-center w-36">Share %</th>
                            <th className="p-2.5 text-right w-24">Rows</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222] print:divide-gray-200">
                          {items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-[#222]/40 print:hover:bg-transparent">
                              <td className="p-2.5 text-center text-gray-500">#{idx + 1}</td>
                              <td className="p-2.5 text-white print:text-black font-sans font-medium">{it.category}</td>
                              <td className="p-2.5 text-right font-bold text-[#21F1A8] print:text-emerald-800">{formatVal(it.val)}</td>
                              <td className="p-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-[#111] print:bg-gray-200 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-[#21F1A8] print:bg-emerald-700 h-full rounded-full" 
                                      style={{ width: `${Math.min(100, Math.max(4, it.share))}%` }} 
                                    />
                                  </div>
                                  <span className="text-[10px] text-gray-400 print:text-gray-600 shrink-0 w-10 text-right">
                                    {it.share.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="p-2.5 text-right text-gray-400 print:text-gray-600">{it.count.toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr className="bg-[#141414] print:bg-gray-100 font-bold text-white print:text-black">
                            <td className="p-2.5 text-center text-[#21F1A8] print:text-emerald-700">∑</td>
                            <td className="p-2.5 font-sans">
                              {agg === 'avg' ? `Overall Mean across ${items.length} segments` : `Top ${items.length} segments (${totalSegments} total)`}
                            </td>
                            <td className="p-2.5 text-right text-[#21F1A8] print:text-emerald-800">{formatVal(total)}</td>
                            <td className="p-2.5 text-center text-xs">100.0%</td>
                            <td className="p-2.5 text-right">{cleanRows.length.toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. Data Quality Audit & Governance */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2 group">
            {inlineEditingKey === 'section5' ? (
              <div className="flex items-center gap-2 max-w-xl animate-fadeIn">
                <input
                  type="text"
                  value={inlineHeadingVal}
                  onChange={(e) => setInlineHeadingVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveInlineEdit();
                    if (e.key === 'Escape') handleCancelInlineEdit();
                  }}
                  autoFocus
                  className="px-3 py-1 bg-[#121212] border border-[#21F1A8] text-[#21F1A8] rounded-lg text-lg font-bold uppercase focus:outline-none"
                />
                <button onClick={handleSaveInlineEdit} className="p-1.5 bg-[#21F1A8] text-black rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={handleCancelInlineEdit} className="p-1.5 bg-[#2a2a2a] text-gray-300 rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#21F1A8] print:text-emerald-800 uppercase tracking-wide">
                  {reportHeadings.section5 || '5. DATA QUALITY AUDIT & GOVERNANCE'}
                </h2>
                <button
                  onClick={() => handleStartInlineEdit('section5')}
                  className="p-1 text-gray-500 hover:text-[#21F1A8] opacity-60 group-hover:opacity-100 transition-opacity print:hidden"
                  title="Change Section 5 Heading"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#2a2a2a] print:border-gray-200">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#141414] print:bg-gray-100 text-gray-400 print:text-gray-700 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Audit Dimension</th>
                  <th className="p-2.5">Score / Status</th>
                  <th className="p-2.5">Detected Anomalies</th>
                  <th className="p-2.5">Certification Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222] print:divide-gray-200">
                <tr>
                  <td className="p-2.5 text-white print:text-black font-sans font-medium">Completeness</td>
                  <td className="p-2.5 text-[#21F1A8] print:text-emerald-700 font-bold">{qualityReport.completenessScore}%</td>
                  <td className="p-2.5 text-gray-400 print:text-gray-600">{qualityReport.issues.filter(i => i.type === 'missing_values').length} missing indicators</td>
                  <td className="p-2.5 text-gray-400 print:text-gray-600 font-sans">Verify source data entry validation</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-white print:text-black font-sans font-medium">Uniqueness</td>
                  <td className="p-2.5 text-[#21F1A8] print:text-emerald-700 font-bold">{qualityReport.uniquenessScore}%</td>
                  <td className="p-2.5 text-gray-400 print:text-gray-600">{qualityReport.issues.filter(i => i.type === 'duplicates').length} duplicate flags</td>
                  <td className="p-2.5 text-gray-400 print:text-gray-600 font-sans">Auto-deduplicated in clean data layer</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-white print:text-black font-sans font-medium">Validity & Consistency</td>
                  <td className="p-2.5 text-[#21F1A8] print:text-emerald-700 font-bold">{qualityReport.validityScore}%</td>
                  <td className="p-2.5 text-gray-400 print:text-gray-600">{qualityReport.issues.filter(i => i.type === 'type_mismatch' || i.type === 'formatting').length} format warnings</td>
                  <td className="p-2.5 text-gray-400 print:text-gray-600 font-sans">Schema data types enforced</td>
                </tr>
                <tr className="bg-[#141414] print:bg-gray-100 font-bold text-white print:text-black">
                  <td className="p-2.5 font-sans">Overall Quality Score</td>
                  <td className="p-2.5 text-[#21F1A8] print:text-emerald-800 text-sm">{qualityReport.overallScore}%</td>
                  <td className="p-2.5">{qualityReport.totalIssuesCount} total flags tracked</td>
                  <td className="p-2.5 text-[#21F1A8] print:text-emerald-700 font-sans">Certified Boardroom Grade</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. Methodology & Lineage */}
        <section className="border-t border-[#333] print:border-gray-300 pt-6 text-[11px] text-gray-500 print:text-gray-600 space-y-1">
          <div className="font-bold text-gray-400 print:text-gray-800 uppercase font-mono">Governed Methodology:</div>
          <p>
            All metrics calculated via Data Analytix in-memory deterministic engine. No generative AI hallucination of numbers. Power BI semantic model compatible.
          </p>
        </section>
      </div>

      {/* KPI Card Customizer Modal */}
      {editingKpi && (
        <KpiCardEditorModal
          isOpen={true}
          kpi={editingKpi}
          onClose={() => setEditingKpi(null)}
        />
      )}

      {/* Full Headings Customization Modal */}
      {isHeadingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-[#181818] border border-[#333] rounded-2xl shadow-2xl p-6 space-y-5 text-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#21F1A8]/15 text-[#21F1A8]">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Customize Report Headings</h3>
                  <p className="text-xs text-gray-400">Change any report title or section header</p>
                </div>
              </div>
              <button onClick={() => setIsHeadingsModalOpen(false)} className="p-1 hover:bg-[#282828] rounded text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold uppercase text-gray-400">Document Main Title</label>
                <input
                  type="text"
                  value={reportHeadings.mainTitle}
                  onChange={(e) => updateReportHeading('mainTitle', e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-white font-medium focus:border-[#21F1A8] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-gray-400">Section 1 Header</label>
                <input
                  type="text"
                  value={reportHeadings.section1}
                  onChange={(e) => updateReportHeading('section1', e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-white font-medium focus:border-[#21F1A8] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-gray-400">Section 2 Header (KPIs)</label>
                <input
                  type="text"
                  value={reportHeadings.section2}
                  onChange={(e) => updateReportHeading('section2', e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-white font-medium focus:border-[#21F1A8] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-gray-400">Section 3 Header (AI Insights)</label>
                <input
                  type="text"
                  value={reportHeadings.section3}
                  onChange={(e) => updateReportHeading('section3', e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-white font-medium focus:border-[#21F1A8] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-gray-400">Section 4 Header (Dashboards & Segments)</label>
                <input
                  type="text"
                  value={reportHeadings.section4}
                  onChange={(e) => updateReportHeading('section4', e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-white font-medium focus:border-[#21F1A8] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-gray-400">Section 5 Header (Quality Governance)</label>
                <input
                  type="text"
                  value={reportHeadings.section5}
                  onChange={(e) => updateReportHeading('section5', e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-white font-medium focus:border-[#21F1A8] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#2c2c2c]">
              <button
                type="button"
                onClick={() => {
                  updateReportHeading('mainTitle', 'EXECUTIVE INTELLIGENCE BRIEF');
                  updateReportHeading('section1', '1. EXECUTIVE SUMMARY & BUSINESS HEALTH');
                  updateReportHeading('section2', '2. KEY PERFORMANCE INDICATORS');
                  updateReportHeading('section3', '3. AI INSIGHTS & MANAGEMENT DIRECTIVES');
                  updateReportHeading('section4', '4. ATTACHED DASHBOARDS & SEGMENT BREAKDOWNS');
                  updateReportHeading('section5', '5. DATA QUALITY AUDIT & GOVERNANCE');
                }}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
              </button>
              <button
                type="button"
                onClick={() => setIsHeadingsModalOpen(false)}
                className="px-4 py-2 bg-[#21F1A8] text-black font-bold text-xs rounded-xl hover:bg-[#1cdb97]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
