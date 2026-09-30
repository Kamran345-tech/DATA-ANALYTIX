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
  Check
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { generateEnterpriseReportPDF, downloadDashboardAndReportBundle, ExportDataPayload } from '../../engine/exportEngine';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';

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
    customVisuals
  } = usePlatform();
  const [isPdfGenerating, setIsPdfGenerating] = React.useState(false);
  const [isBundleGenerating, setIsBundleGenerating] = React.useState(false);
  const [downloadSuccess, setDownloadSuccess] = React.useState<string | null>(null);

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
        qualityReport
      };
      const doc = generateEnterpriseReportPDF(payload, {
        customVisuals,
        categoryPerformance: analytics.categoryPerformance,
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        opportunities: analytics.opportunities
      });
      doc.save(`${project.name.replace(/[^a-zA-Z0-9_]/g, '_')}_Executive_Report.pdf`);
    } catch (err: any) {
      alert(`PDF compilation failed: ${err?.message}`);
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
        qualityReport
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
      alert(`Bundle export failed: ${err?.message}`);
    } finally {
      setIsBundleGenerating(false);
    }
  };

  // Helper to compute structured category aggregates for attached dashboard visuals
  const computeVisualBreakdown = (catField: string, valField: string, agg: string = 'sum') => {
    const map: Record<string, { sum: number; count: number }> = {};
    let total = 0;
    cleanRows.forEach(r => {
      const cat = String(r[catField] !== undefined && r[catField] !== null ? r[catField] : 'Unassigned');
      const val = Number(r[valField]) || 0;
      if (!map[cat]) map[cat] = { sum: 0, count: 0 };
      map[cat].sum += val;
      map[cat].count += 1;
      total += val;
    });

    const items = Object.entries(map).map(([category, s]) => {
      let finalVal = s.sum;
      if (agg === 'avg') finalVal = s.count > 0 ? s.sum / s.count : 0;
      else if (agg === 'count') finalVal = s.count;

      return {
        category,
        val: finalVal,
        count: s.count,
        share: total > 0 ? (s.sum / total) * 100 : 0
      };
    }).sort((a, b) => b.val - a.val);

    return { items: items.slice(0, 8), total, totalSegments: items.length };
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
          {/* Download Both (Dashboard + Executive Report Bundle ZIP) */}
          <button
            onClick={handleDownloadBundleZip}
            disabled={isBundleGenerating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-all disabled:opacity-50 shadow-md shadow-[#21F1A8]/20"
            title="Download both the created dashboard and executive report in a single ZIP package"
          >
            {isBundleGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Package className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>Download Both (Dashboard + Report)</span>
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
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-bold tracking-wider text-white print:text-black">
                {brand.companyName}
              </span>
              <span className="text-xs text-[#21F1A8] print:text-emerald-700 font-mono">
                • {brand.department}
              </span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white print:text-black tracking-wide uppercase">
              EXECUTIVE INTELLIGENCE BRIEF
            </h1>
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
          <h2 className="font-heading text-2xl font-bold text-[#21F1A8] print:text-emerald-800 uppercase tracking-wide">
            1. EXECUTIVE SUMMARY & BUSINESS HEALTH
          </h2>
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
          <h2 className="font-heading text-2xl font-bold text-[#21F1A8] print:text-emerald-800 uppercase tracking-wide">
            2. KEY PERFORMANCE INDICATORS
          </h2>

          <div className="overflow-x-auto rounded-xl border border-[#2a2a2a] print:border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] print:bg-gray-100 text-gray-400 print:text-gray-700 uppercase font-mono border-b border-[#2a2a2a] print:border-gray-300">
                <tr>
                  <th className="p-3">Metric Name</th>
                  <th className="p-3">Current Value</th>
                  <th className="p-3">Prior Value</th>
                  <th className="p-3">Variance %</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Source Field</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222] print:divide-gray-200 font-mono">
                {analytics.kpis.map(k => (
                  <tr key={k.id} className="text-gray-300 print:text-black">
                    <td className="p-3 font-bold">{k.name}</td>
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
                    <td className="p-3 text-gray-500 text-[10px]">{k.traceableSource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. AI Insights & Management Directives */}
        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-bold text-[#21F1A8] print:text-emerald-800 uppercase tracking-wide">
            3. AI INSIGHTS & MANAGEMENT DIRECTIVES
          </h2>

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
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#333] print:border-gray-300 pb-2">
              <h2 className="font-heading text-2xl font-bold text-[#21F1A8] print:text-emerald-800 uppercase tracking-wide">
                4. ATTACHED DASHBOARDS & SEGMENT BREAKDOWNS
              </h2>
              <span className="text-xs font-mono text-gray-400 print:text-gray-600">
                {attachedVisuals.length} Active Visuals Attached
              </span>
            </div>

            <div className="space-y-6">
              {attachedVisuals.map((vis, vIdx) => {
                const cat = vis.categoryField || columns.find(c => c.dataType === 'string')?.name || 'Category';
                const val = vis.valueField || columns.find(c => c.dataType === 'number')?.name || 'Value';
                const agg = (vis.aggregation || 'sum').toLowerCase();
                const isCur = /revenue|sales|profit|margin|cost|amount|price/i.test(val);
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
                        <span className="text-[10px] uppercase font-mono text-gray-400 print:text-gray-600">Grand Total</span>
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
                            <td className="p-2.5 font-sans">Top {items.length} segments ({totalSegments} total)</td>
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
          <h2 className="font-heading text-2xl font-bold text-[#21F1A8] print:text-emerald-800 uppercase tracking-wide">
            5. DATA QUALITY AUDIT & GOVERNANCE
          </h2>
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
            All metrics calculated via NexusBI in-memory deterministic engine. No generative AI hallucination of numbers. Power BI semantic model compatible.
          </p>
        </section>
      </div>
    </div>
  );
};
