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
  Loader2
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { generateEnterpriseReportPDF, ExportDataPayload } from '../../engine/exportEngine';

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
    transformations 
  } = usePlatform();
  const [isPdfGenerating, setIsPdfGenerating] = React.useState(false);

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
      const doc = generateEnterpriseReportPDF(payload);
      doc.save(`${project.name.replace(/[^a-zA-Z0-9_]/g, '_')}_Executive_Report.pdf`);
    } catch (err: any) {
      alert(`PDF compilation failed: ${err?.message}`);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn max-w-4xl mx-auto">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 print:hidden">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <FileSpreadsheet className="w-4 h-4 text-[#21F1A8]" />
          <span>Presentation-Ready Executive Report Layout</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isPdfGenerating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-all disabled:opacity-50"
          >
            {isPdfGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Download Report as PDF</span>
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

        {/* 4. Methodology & Lineage */}
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
