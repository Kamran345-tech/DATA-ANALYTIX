import React, { useState, useMemo } from 'react';
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
  Tv,
  Plus,
  RefreshCw,
  BarChart2,
  PieChart,
  LineChart,
  Table as TableIcon
} from 'lucide-react';
import { KPI, VisualConfig } from '../../types';
import { usePlatform, ReportHeadings } from '../../store/usePlatformStore';
import type { ExportDataPayload } from '../../engine/exportEngine';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { KpiCardEditorModal } from '../common/KpiCardEditorModal';
import { parseRobustNumber } from '../../engine/dataParser';
import { InteractiveSlicersBar } from '../common/InteractiveSlicersBar';
import { DownloadMenu } from '../common/DownloadMenu';

export const ReportsView: React.FC = () => {
  const { 
    project, 
    brand, 
    analytics, 
    qualityReport, 
    cleanRows, 
    rawRows, 
    filteredRows,
    columns, 
    dataModel, 
    daxMeasures, 
    transformations, 
    customVisuals, 
    updateCustomVisual,
    addCustomVisual,
    reportHeadings, 
    updateReportHeading,
    setIsPresentationMode,
    themeMode
  } = usePlatform();

  const isLight = themeMode === 'light';

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isBundleGenerating, setIsBundleGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // New Custom Chart Modal State (Add custom charts dynamically to report)
  const [isAddChartModalOpen, setIsAddChartModalOpen] = useState(false);
  const [newChartTitle, setNewChartTitle] = useState('');
  const [newChartType, setNewChartType] = useState<VisualConfig['type']>('bar');
  const [newChartCat, setNewChartCat] = useState('');
  const [newChartVal, setNewChartVal] = useState('');
  const [newChartAgg, setNewChartAgg] = useState<VisualConfig['aggregation']>('sum');

  // KPI Editor Modal state
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null);

  // Heading Editor Modal state
  const [isHeadingsModalOpen, setIsHeadingsModalOpen] = useState(false);

  // Inline heading editing state
  const [inlineEditingKey, setInlineEditingKey] = useState<keyof ReportHeadings | null>(null);
  const [inlineHeadingVal, setInlineHeadingVal] = useState<string>('');

  // Inline Visual Widget Title Editing state (for Section 4 charts)
  const [editingVisId, setEditingVisId] = useState<string | null>(null);
  const [editingVisTitle, setEditingVisTitle] = useState<string>('');

  const handleStartVisEdit = (id: string, currentTitle: string) => {
    setEditingVisId(id);
    setEditingVisTitle(currentTitle);
  };

  const handleSaveVisTitle = (id: string) => {
    if (editingVisTitle.trim()) {
      updateCustomVisual(id, { title: editingVisTitle.trim(), isCustomRenamed: true } as any);
      setDownloadSuccess(`Renamed visual to "${editingVisTitle.trim()}"`);
      setTimeout(() => setDownloadSuccess(null), 2500);
    }
    setEditingVisId(null);
  };

  const handleCancelVisEdit = () => {
    setEditingVisId(null);
  };

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

  // Dynamic filtered KPI values and filtered rows computation
  const isFiltered = filteredRows.length < cleanRows.length;
  const effectiveRows = filteredRows;

  const computeFilteredKpi = (kpi: KPI) => {
    if (!isFiltered) {
      return { formatted: kpi.formattedValue, raw: kpi.value, isFiltered: false };
    }
    const vals = effectiveRows
      .map(r => Number(r[kpi.sourceColumn]))
      .filter(v => typeof v === 'number' && !isNaN(v));

    if (vals.length === 0) {
      return { formatted: '0', raw: 0, isFiltered: true };
    }

    let computed = 0;
    if (kpi.aggregation === 'avg') {
      computed = vals.reduce((a, b) => a + b, 0) / vals.length;
    } else if (kpi.aggregation === 'count') {
      computed = effectiveRows.length;
    } else if (kpi.aggregation === 'distinct_count') {
      computed = new Set(effectiveRows.map(r => String(r[kpi.sourceColumn]))).size;
    } else if (kpi.aggregation === 'min') {
      computed = Math.min(...vals);
    } else if (kpi.aggregation === 'max') {
      computed = Math.max(...vals);
    } else {
      computed = vals.reduce((a, b) => a + b, 0);
    }

    const isCurrency = /revenue|sales|profit|margin|cost|price|income|amount/i.test(kpi.name) || kpi.formattedValue.startsWith('$');
    const isPercent = /margin|rate|percent|share|yield/i.test(kpi.name) || kpi.formattedValue.endsWith('%');

    let formatted = '';
    if (isCurrency) {
      if (Math.abs(computed) >= 1_000_000) formatted = `$${(computed / 1_000_000).toFixed(2)}M`;
      else if (Math.abs(computed) >= 1_000) formatted = `$${(computed / 1_000).toFixed(1)}K`;
      else formatted = `$${computed.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } else if (isPercent) {
      formatted = `${computed.toFixed(1)}%`;
    } else {
      formatted = computed >= 1000 ? Math.round(computed).toLocaleString() : computed.toFixed(1);
    }

    return { formatted, raw: computed, isFiltered: true };
  };

  const reportKpis = useMemo(() => {
    return analytics.kpis.map(k => {
      const f = computeFilteredKpi(k);
      return {
        ...k,
        formattedValue: f.formatted,
        value: f.raw,
        isFiltered: f.isFiltered
      };
    });
  }, [analytics.kpis, effectiveRows, isFiltered]);

  const handleDownloadPDF = async () => {
    setIsPdfGenerating(true);
    try {
      const { generateEnterpriseReportPDF } = await import('../../engine/exportEngine');
      const payload: ExportDataPayload = {
        project,
        brand,
        rawRows,
        cleanRows: effectiveRows,
        columns,
        dataModel,
        kpis: reportKpis,
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
      setDownloadSuccess(`Executive PDF Report (${effectiveRows.length.toLocaleString()} rows) downloaded!`);
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
        cleanRows: effectiveRows,
        columns,
        dataModel,
        kpis: reportKpis,
        daxMeasures,
        insights: analytics.insights,
        transformations,
        qualityReport,
        reportHeadings
      };
      const { downloadDashboardAndReportBundle } = await import('../../engine/exportEngine');
      await downloadDashboardAndReportBundle(payload, {
        customVisuals,
        categoryPerformance: analytics.categoryPerformance,
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        opportunities: analytics.opportunities
      });
      setDownloadSuccess(`Combined Dashboard & Report bundle (${effectiveRows.length.toLocaleString()} rows) downloaded!`);
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
    effectiveRows.forEach(r => {
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
      ? (effectiveRows.length > 0 ? totalSum / effectiveRows.length : 0)
      : (agg === 'count' ? effectiveRows.length : totalSum);

    return { items: items.slice(0, 8), total: grandTotal, totalSum, totalSegments: items.length };
  };

  const attachedVisuals = customVisuals.length > 0 ? customVisuals : (analytics.visuals || []);
  const numericCols = useMemo(() => columns.filter(c => c.dataType === 'number'), [columns]);
  const stringCols = useMemo(() => columns.filter(c => c.dataType === 'string' || c.dataType === 'date'), [columns]);

  const handleAddCustomChart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChartTitle.trim()) return;
    const cat = newChartCat || stringCols[0]?.name || 'Category';
    const val = newChartVal || numericCols[0]?.name || 'Value';
    const newVisual: VisualConfig = {
      id: `vis-custom-${Date.now()}`,
      title: newChartTitle.trim(),
      type: newChartType,
      categoryField: cat,
      valueField: val,
      aggregation: newChartAgg,
      color: 'var(--chart-3)',
      description: `${newChartAgg.toUpperCase()}(${val}) by ${cat}`,
      isCustomRenamed: true
    };
    addCustomVisual(newVisual);
    setIsAddChartModalOpen(false);
    setNewChartTitle('');
    setDownloadSuccess(`Added chart: "${newVisual.title}"`);
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const handleAutoSyncCharts = () => {
    const primaryVal = numericCols[0]?.name;
    const secondaryVal = numericCols[1]?.name || primaryVal;
    const primaryCat = stringCols.find(c => c.distinctCount > 1 && c.distinctCount < 50)?.name || stringCols[0]?.name;
    const secondaryCat = stringCols.find(c => c.name !== primaryCat && c.distinctCount > 1 && c.distinctCount < 50)?.name || stringCols[1]?.name || primaryCat;
    const dateCol = columns.find(c => c.dataType === 'date')?.name;

    if (!primaryVal || !primaryCat) {
      setDownloadSuccess('No valid columns found to auto-generate charts.');
      setTimeout(() => setDownloadSuccess(null), 2500);
      return;
    }

    const generated: VisualConfig[] = [];
    if (dateCol) {
      generated.push({
        id: `vis-sync-${Date.now()}-1`,
        title: `${primaryVal.toUpperCase()} TREND OVER TIME`,
        type: 'line',
        categoryField: dateCol,
        valueField: primaryVal,
        aggregation: 'sum',
        color: 'var(--chart-3)'
      });
    }
    generated.push({
      id: `vis-sync-${Date.now()}-2`,
      title: `${primaryVal.toUpperCase()} BY ${primaryCat.toUpperCase()}`,
      type: 'bar',
      categoryField: primaryCat,
      valueField: primaryVal,
      aggregation: 'sum',
      color: 'var(--chart-3)'
    });
    if (secondaryCat && secondaryCat !== primaryCat) {
      generated.push({
        id: `vis-sync-${Date.now()}-3`,
        title: `SHARE BY ${secondaryCat.toUpperCase()}`,
        type: 'donut',
        categoryField: secondaryCat,
        valueField: primaryVal,
        aggregation: 'sum',
        color: 'var(--chart-3)'
      });
    }
    if (secondaryVal) {
      generated.push({
        id: `vis-sync-${Date.now()}-4`,
        title: `PERFORMANCE MATRIX (${primaryCat.toUpperCase()})`,
        type: 'table',
        categoryField: primaryCat,
        valueField: secondaryVal,
        aggregation: 'sum',
        color: 'var(--chart-3)'
      });
    }

    generated.forEach(v => addCustomVisual(v));
    setDownloadSuccess(`Auto-generated ${generated.length} charts tailored to ${project.name}!`);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn max-w-4xl mx-auto">
      {/* Toast Notification */}
      {downloadSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-elevated border border-strong text-accent px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-accent" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-card border border-subtle rounded-2xl p-4 print:hidden">
        <div className="flex items-center gap-2 text-xs text-secondary">
          <FileSpreadsheet className="w-4 h-4 text-accent" />
          <span className="font-medium text-primary">Presentation-Ready Executive Report Layout</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Customize Headings Modal Trigger */}
          <button
            onClick={() => setIsHeadingsModalOpen(true)}
            className="glass-btn-secondary flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-xs transition-all cursor-pointer"
            title="Customize report document heading and all section titles"
          >
            <Pencil className="w-3.5 h-3.5 text-accent" />
            <span>Customize Headings</span>
          </button>

          {/* Download Bundle (Dashboard + Executive Report Bundle ZIP) */}
          <button
            onClick={handleDownloadBundleZip}
            disabled={isBundleGenerating}
            className="glass-btn-primary flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50 shadow-md shrink-0 whitespace-nowrap cursor-pointer"
            title="Download both the created dashboard and executive report in a single ZIP package"
          >
            {isBundleGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-on-accent shrink-0" />
            ) : (
              <Package className="w-4 h-4 stroke-[2.5] shrink-0" />
            )}
            <span className="whitespace-nowrap font-bold">Download Bundle (ZIP)</span>
          </button>

          {/* Download PDF Report */}
          <button
            onClick={handleDownloadPDF}
            disabled={isPdfGenerating}
            className="glass-btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium text-xs transition-all disabled:opacity-50 cursor-pointer"
            title="Download Executive PDF Report"
          >
            {isPdfGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-danger" />
            ) : (
              <Download className="w-4 h-4 text-accent" />
            )}
            <span>Executive Report (PDF)</span>
          </button>

          <button
            onClick={() => setIsPresentationMode(true)}
            className="glass-btn-primary flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            title="Open Fullscreen Boardroom Presentation Deck"
          >
            <Tv className="w-4 h-4" />
            <span>Present Deck</span>
          </button>

          <button
            onClick={handlePrint}
            className="glass-btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium text-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-muted" /> Print Preview
          </button>

          <DownloadMenu context="reports" />
        </div>
      </div>

      {/* Interactive Live Slicers Bar for Report View */}
      <div className="print:hidden">
        <InteractiveSlicersBar />
      </div>

      {/* Printable Report Document */}
      <div className="bg-card border border-subtle text-primary shadow-xl rounded-3xl p-8 sm:p-12 space-y-10 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-subtle pb-8 flex flex-wrap items-start justify-between gap-6 print:border-gray-300">
          <div className="space-y-2 flex-1 min-w-[280px]">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-bold tracking-wider text-primary print:text-black">
                {brand.companyName}
              </span>
              <span className="text-xs text-accent font-bold print:text-sky-700 font-mono">
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
                    className="flex-1 px-3 py-1.5 bg-input border border-strong text-primary rounded-lg text-2xl font-extrabold uppercase focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleSaveInlineEdit}
                    className="p-2 bg-accent hover:opacity-90 text-on-accent rounded-lg shadow-xs"
                    title="Save title"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                  <button
                    onClick={handleCancelInlineEdit}
                    className="p-2 bg-input text-secondary hover:bg-card-hover rounded-lg"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 flex-wrap min-w-0 max-w-full">
                  <h1
                    title={reportHeadings.mainTitle || 'EXECUTIVE INTELLIGENCE BRIEF'}
                    aria-label={reportHeadings.mainTitle || 'EXECUTIVE INTELLIGENCE BRIEF'}
                    className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary print:text-black tracking-wide uppercase line-clamp-2 [overflow-wrap:anywhere] min-w-0 max-w-full"
                  >
                    {reportHeadings.mainTitle || 'EXECUTIVE INTELLIGENCE BRIEF'}
                  </h1>
                  <button
                    onClick={() => handleStartInlineEdit('mainTitle')}
                    className="p-1.5 rounded-lg bg-input hover:bg-card-hover text-secondary hover:text-accent transition-colors print:hidden opacity-70 group-hover:opacity-100 shrink-0"
                    title="Change main report title"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="print:hidden py-1 min-w-0 max-w-full">
              <EditableDashboardTitle className="text-base font-semibold max-w-full" showLabelPrefix={true} />
            </div>
            <div className="text-xs text-secondary print:text-muted flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0 max-w-full">
              <span className="inline-flex items-baseline gap-1 min-w-0 max-w-full">
                <span className="shrink-0">Project:</span>
                <span
                  title={project.name}
                  aria-label={project.name}
                  className="text-primary print:text-black font-medium line-clamp-2 [overflow-wrap:anywhere] min-w-0 max-w-full"
                >
                  {project.name}
                </span>
              </span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-baseline gap-1 min-w-0 max-w-full">
                <span className="shrink-0">Dataset:</span>
                <span
                  title={project.sourceFileName}
                  aria-label={project.sourceFileName}
                  className="font-mono text-secondary print:text-black line-clamp-2 [overflow-wrap:anywhere] min-w-0 max-w-full"
                >
                  {project.sourceFileName}
                </span>
              </span>
            </div>
          </div>

          <div className="text-right text-xs text-secondary print:text-muted space-y-1">
            <div>Date: <strong className="text-primary print:text-black font-mono">{new Date().toLocaleDateString()}</strong></div>
            <div>Author: <strong className="text-primary print:text-black">{brand.author}</strong></div>
            <div>Version: <span className="font-mono">{project.version}</span></div>
            <div className="text-accent font-bold print:text-sky-700">
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
                  className="px-3 py-1 bg-input border border-strong text-primary rounded-lg text-lg font-bold uppercase focus:outline-none"
                />
                <button onClick={handleSaveInlineEdit} className="p-1.5 bg-accent text-on-accent rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={handleCancelInlineEdit} className="p-1.5 bg-input text-secondary rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-accent print:text-sky-800 uppercase tracking-wide">
                  {reportHeadings.section1 || '1. EXECUTIVE SUMMARY & BUSINESS HEALTH'}
                </h2>
                <button
                  onClick={() => handleStartInlineEdit('section1')}
                  className="p-1 text-muted hover:text-accent opacity-60 group-hover:opacity-100 transition-opacity print:hidden"
                  title="Change Section 1 Heading"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-input border border-subtle text-secondary print:bg-gray-50 print:border-gray-200 text-xs print:text-primary leading-relaxed space-y-2">
            <p>
              This report provides a verified assessment based on <strong className="text-primary">{effectiveRows.length.toLocaleString()}</strong>
              {isFiltered && ` (filtered from ${cleanRows.length.toLocaleString()} total)`} audited transaction records. Overall data health scored <strong className="text-primary">{qualityReport.overallScore}%</strong> on completeness, validity, and uniqueness.
            </p>
            {analytics.businessHealthScore && (
              <p>
                Business Health Index is rated <strong className="text-primary">{analytics.businessHealthScore.rating} ({analytics.businessHealthScore.score}/100)</strong> based on metric pacing and anomaly thresholds.
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
                  className="px-3 py-1 bg-input border border-strong text-primary rounded-lg text-lg font-bold uppercase focus:outline-none"
                />
                <button onClick={handleSaveInlineEdit} className="p-1.5 bg-accent text-on-accent rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={handleCancelInlineEdit} className="p-1.5 bg-input text-secondary rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-accent print:text-sky-800 uppercase tracking-wide">
                  {reportHeadings.section2 || '2. KEY PERFORMANCE INDICATORS'}
                </h2>
                <button
                  onClick={() => handleStartInlineEdit('section2')}
                  className="p-1 text-muted hover:text-accent opacity-60 group-hover:opacity-100 transition-opacity print:hidden"
                  title="Change Section 2 Heading"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick KPI Customizer Trigger */}
            <div className="flex items-center gap-2 print:hidden">
              <span className="text-[11px] text-secondary font-mono">
                {reportKpis.length} Metrics Analyzed
                {isFiltered && ` (${effectiveRows.length.toLocaleString()} rows)`}
              </span>
              <button
                type="button"
                onClick={() => setEditingKpi(analytics.kpis[0] || null)}
                className="px-2.5 py-1 rounded-lg bg-input hover:bg-card-hover text-primary hover:text-accent text-xs font-medium border border-subtle hover:border-strong flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Change metric headings, columns, and aggregation formulas"
              >
                <Sliders className="w-3 h-3 text-accent" />
                <span>Customize Metrics & Formulas</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-subtle bg-card print:border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-input text-secondary border-subtle uppercase font-mono border-b print:bg-gray-100 print:border-gray-300">
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
              <tbody className="divide-y divide-[var(--border-subtle)] print:divide-gray-200 font-mono">
                {reportKpis.map(k => (
                  <tr key={k.id} className="text-secondary hover:bg-card-hover print:text-black print:hover:bg-transparent">
                    <td className="p-3 font-bold font-sans flex items-center gap-2">
                      <span className="text-primary font-bold">{k.name}</span>
                      <span className="text-[10px] text-muted font-mono uppercase">[{k.aggregation}]</span>
                    </td>
                    <td className="p-3 text-primary font-extrabold print:text-black flex items-center gap-1.5">
                      <span>{k.formattedValue}</span>
                      {k.isFiltered && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-soft text-accent font-mono font-normal">
                          Filtered
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-secondary print:text-muted">{k.formattedPreviousValue || 'N/A'}</td>
                    <td className="p-3">
                      {k.changePercent !== undefined ? (
                        <span className={k.changePercent >= 0 ? 'text-accent font-bold' : 'text-danger font-bold'}>
                          {k.changePercent >= 0 ? '+' : ''}{k.changePercent}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-input text-primary border border-subtle print:bg-gray-200">
                        {k.status}
                      </span>
                    </td>
                    <td className="p-3 text-secondary text-[11px] truncate max-w-[180px]" title={k.calculation}>
                      {k.calculation}
                    </td>
                    <td className="p-3 text-right print:hidden">
                      <button
                        onClick={() => setEditingKpi(k)}
                        className="px-2 py-1 rounded bg-input hover:bg-card-hover text-primary hover:text-accent border-subtle text-[11px] font-sans font-medium border transition-colors cursor-pointer"
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
                  className="px-3 py-1 bg-input border border-strong text-primary rounded-lg text-lg font-bold uppercase focus:outline-none"
                />
                <button onClick={handleSaveInlineEdit} className="p-1.5 bg-accent text-on-accent rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={handleCancelInlineEdit} className="p-1.5 bg-input text-secondary rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-accent print:text-sky-800 uppercase tracking-wide">
                  {reportHeadings.section3 || '3. AI INSIGHTS & MANAGEMENT DIRECTIVES'}
                </h2>
                <button
                  onClick={() => handleStartInlineEdit('section3')}
                  className="p-1 text-muted hover:text-accent opacity-60 group-hover:opacity-100 transition-opacity print:hidden"
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
                className="p-5 rounded-2xl bg-input border border-subtle text-secondary print:bg-gray-50 print:border-gray-200 space-y-2 text-xs"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-primary print:text-black text-sm">{ins.title}</h4>
                  <span className="font-mono text-[10px] uppercase text-accent font-bold print:text-sky-700">
                    [{ins.category}]
                  </span>
                </div>
                <p><strong className="text-primary">Observed Impact:</strong> {ins.what}</p>
                <p><strong className="text-primary">Root Driver:</strong> {ins.why}</p>
                <div className="p-3 rounded-xl bg-accent-soft border border-subtle text-primary print:bg-sky-50 print:border-sky-300">
                  <strong>Recommended Management Action:</strong> {ins.action}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Attached Dashboard Visualizations & Detailed Segment Breakdowns */}
        {attachedVisuals.length > 0 && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle print:border-gray-300 pb-3 group">
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
                    className="px-3 py-1 bg-input border border-strong text-primary rounded-lg text-lg font-bold uppercase focus:outline-none"
                  />
                  <button onClick={handleSaveInlineEdit} className="p-1.5 bg-accent text-on-accent rounded"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={handleCancelInlineEdit} className="p-1.5 bg-input text-secondary rounded"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-accent print:text-sky-800 uppercase tracking-wide">
                    {reportHeadings.section4 || '4. ATTACHED DASHBOARDS & SEGMENT BREAKDOWNS'}
                  </h2>
                  <button
                    onClick={() => handleStartInlineEdit('section4')}
                    className="p-1 text-muted hover:text-accent opacity-60 group-hover:opacity-100 transition-opacity print:hidden"
                    title="Change Section 4 Heading"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setNewChartCat(stringCols[0]?.name || '');
                    setNewChartVal(numericCols[0]?.name || '');
                    setIsAddChartModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-accent hover:opacity-90 text-on-accent text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Add custom chart directly to this report"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Chart</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoSyncCharts}
                  className="px-2.5 py-1 rounded-lg bg-input hover:bg-card-hover text-primary border-subtle text-xs font-semibold flex items-center gap-1 border shadow-xs cursor-pointer"
                  title="Auto-adapt charts to match the current dataset schema"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-accent" />
                  <span>Auto-Adapt to Dataset</span>
                </button>

                <span className="text-xs font-mono text-secondary print:text-muted pl-1">
                  ({attachedVisuals.length} Visuals)
                </span>
              </div>
            </div>

            <div className="space-y-6">
              {attachedVisuals.map((vis, vIdx) => {
                const visKey = vis.id || `vis-${vIdx}`;
                // Dynamically resolve category and value columns to match the currently loaded dataset
                const hasCatCol = columns.some(c => c.name === vis.categoryField);
                const validCat = hasCatCol 
                  ? vis.categoryField 
                  : (columns.find(c => c.dataType === 'string' && c.distinctCount > 1 && c.distinctCount < 50)?.name
                     || columns.find(c => c.dataType === 'string')?.name 
                     || columns[0]?.name 
                     || 'Category');

                const hasValCol = columns.some(c => c.name === vis.valueField);
                const validVal = hasValCol 
                  ? vis.valueField 
                  : (columns.find(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate)?.name 
                     || columns.find(c => c.dataType === 'number')?.name 
                     || columns[1]?.name 
                     || 'Value');

                const agg = (vis.aggregation || 'sum').toLowerCase();
                const isCur = /revenue|sales|profit|margin|cost|amount|price|salary|spend/i.test(validVal);
                const { items, total, totalSegments } = computeVisualBreakdown(validCat, validVal, agg);
                const formatVal = (n: number) => isCur 
                  ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` 
                  : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

                const displayTitle = (!hasCatCol && !hasValCol && !(vis as any).isCustomRenamed)
                  ? `${validVal.replace(/([A-Z])/g, ' $1').trim().toUpperCase()} BY ${validCat.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}`
                  : vis.title;

                return (
                  <div 
                    key={visKey} 
                    className="p-5 sm:p-6 rounded-2xl bg-input border border-subtle text-primary shadow-sm print:bg-white print:border-gray-200 space-y-4 break-inside-avoid"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-accent print:text-sky-700 uppercase">
                            Widget 4.{vIdx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-card text-secondary border border-subtle print:bg-gray-200 print:text-primary">
                            {vis.type || 'bar'}
                          </span>
                        </div>

                        {/* Inline Chart Title Rename Support */}
                        {editingVisId === visKey ? (
                          <div className="flex items-center gap-1.5 my-1">
                            <input
                              type="text"
                              value={editingVisTitle}
                              onChange={(e) => setEditingVisTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveVisTitle(visKey);
                                if (e.key === 'Escape') handleCancelVisEdit();
                              }}
                              autoFocus
                              className="px-2.5 py-1 text-sm bg-card border border-strong text-primary rounded-lg font-bold uppercase focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveVisTitle(visKey)}
                              className="p-1.5 bg-accent hover:opacity-90 text-on-accent rounded-lg shadow-xs cursor-pointer"
                              title="Save chart title"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                            <button
                              onClick={handleCancelVisEdit}
                              className="p-1.5 bg-card text-secondary hover:bg-card-hover rounded-lg cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/visTitle">
                            <h4 className="font-bold text-primary print:text-black text-base uppercase">
                              {displayTitle}
                            </h4>
                            <button
                              onClick={() => handleStartVisEdit(visKey, displayTitle)}
                              className="p-1 text-muted hover:text-accent opacity-60 group-hover/visTitle:opacity-100 transition-opacity print:hidden cursor-pointer"
                              title="Rename chart title"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <p className="text-[11px] text-secondary print:text-muted">
                          Metric: <span className="font-mono text-primary font-bold print:text-black">{agg.toUpperCase()}({validVal})</span> grouped by <span className="font-mono text-primary font-bold print:text-black">{validCat}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-muted print:text-muted">
                          {agg === 'avg' ? 'Overall Average' : 'Grand Total'}
                        </span>
                        <div className="text-lg font-bold text-accent print:text-sky-800 font-mono">
                          {formatVal(total)}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="overflow-x-auto rounded-xl border border-subtle bg-card print:border-gray-200">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-input text-secondary border-subtle uppercase text-[10px] border-b print:bg-gray-100 print:border-gray-300">
                          <tr>
                            <th className="p-2.5 text-center w-12">#</th>
                            <th className="p-2.5">Category / Segment</th>
                            <th className="p-2.5 text-right">{agg.toUpperCase()}({validVal})</th>
                            <th className="p-2.5 text-center w-36">Share %</th>
                            <th className="p-2.5 text-right w-24">Rows</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)] print:divide-gray-200">
                          {items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-card-hover text-secondary print:hover:bg-transparent">
                              <td className="p-2.5 text-center text-muted">#{idx + 1}</td>
                              <td className="p-2.5 text-primary font-bold print:text-black font-sans">{it.category}</td>
                              <td className="p-2.5 text-right font-bold text-accent print:text-sky-800">{formatVal(it.val)}</td>
                              <td className="p-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-input print:bg-gray-200 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-accent print:bg-sky-700 h-full rounded-full" 
                                      style={{ width: `${Math.min(100, Math.max(4, it.share))}%` }} 
                                    />
                                  </div>
                                  <span className="text-[10px] text-secondary print:text-muted shrink-0 w-10 text-right">
                                    {it.share.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="p-2.5 text-right text-secondary print:text-muted">{it.count.toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr className="bg-input font-bold text-primary print:bg-gray-100 print:text-black">
                            <td className="p-2.5 text-center text-accent print:text-sky-700">∑</td>
                            <td className="p-2.5 font-sans">
                              {agg === 'avg' ? `Overall Mean across ${items.length} segments` : `Top ${items.length} segments (${totalSegments} total)`}
                            </td>
                            <td className="p-2.5 text-right text-accent print:text-sky-800">{formatVal(total)}</td>
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
                  className="px-3 py-1 bg-input border border-strong text-primary rounded-lg text-lg font-bold uppercase focus:outline-none"
                />
                <button onClick={handleSaveInlineEdit} className="p-1.5 bg-accent text-on-accent rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={handleCancelInlineEdit} className="p-1.5 bg-input text-secondary rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-accent print:text-sky-800 uppercase tracking-wide">
                  {reportHeadings.section5 || '5. DATA QUALITY AUDIT & GOVERNANCE'}
                </h2>
                <button
                  onClick={() => handleStartInlineEdit('section5')}
                  className="p-1 text-muted hover:text-accent opacity-60 group-hover:opacity-100 transition-opacity print:hidden"
                  title="Change Section 5 Heading"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-subtle bg-card print:border-gray-200">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-input text-secondary border-subtle uppercase text-[10px] border-b print:bg-gray-100 print:border-gray-300">
                <tr>
                  <th className="p-2.5">Audit Dimension</th>
                  <th className="p-2.5">Score / Status</th>
                  <th className="p-2.5">Detected Anomalies</th>
                  <th className="p-2.5">Certification Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] print:divide-gray-200">
                <tr>
                  <td className="p-2.5 text-primary font-bold print:text-black font-sans">Completeness</td>
                  <td className="p-2.5 text-accent print:text-sky-700 font-bold">{qualityReport.completenessScore}%</td>
                  <td className="p-2.5 text-secondary print:text-muted">{qualityReport.issues.filter(i => i.type === 'missing_values').length} missing indicators</td>
                  <td className="p-2.5 text-secondary print:text-muted font-sans">Verify source data entry validation</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-primary font-bold print:text-black font-sans">Uniqueness</td>
                  <td className="p-2.5 text-accent print:text-sky-700 font-bold">{qualityReport.uniquenessScore}%</td>
                  <td className="p-2.5 text-secondary print:text-muted">{qualityReport.issues.filter(i => i.type === 'duplicates').length} duplicate flags</td>
                  <td className="p-2.5 text-secondary print:text-muted font-sans">Auto-deduplicated in clean data layer</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-primary font-bold print:text-black font-sans">Validity & Consistency</td>
                  <td className="p-2.5 text-accent print:text-sky-700 font-bold">{qualityReport.validityScore}%</td>
                  <td className="p-2.5 text-secondary print:text-muted">{qualityReport.issues.filter(i => i.type === 'type_mismatch' || i.type === 'formatting').length} format warnings</td>
                  <td className="p-2.5 text-secondary print:text-muted font-sans">Schema data types enforced</td>
                </tr>
                <tr className="bg-input font-bold text-primary print:bg-gray-100 print:text-black">
                  <td className="p-2.5 font-sans">Overall Quality Score</td>
                  <td className="p-2.5 text-accent print:text-sky-800 text-sm">{qualityReport.overallScore}%</td>
                  <td className="p-2.5 text-secondary">{qualityReport.totalIssuesCount} total flags tracked</td>
                  <td className="p-2.5 text-accent print:text-sky-700 font-sans">Certified Boardroom Grade</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. Methodology & Lineage */}
        <section className="border-t border-subtle print:border-gray-300 pt-6 text-[11px] text-muted print:text-muted space-y-1">
          <div className="font-bold text-secondary print:text-primary uppercase font-mono">Governed Methodology:</div>
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
          <div className="w-full max-w-xl bg-elevated border border-subtle rounded-2xl shadow-2xl p-6 space-y-5 text-primary max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent-soft text-accent">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-primary">Customize Report Headings</h3>
                  <p className="text-xs text-secondary">Change any report title or section header</p>
                </div>
              </div>
              <button onClick={() => setIsHeadingsModalOpen(false)} className="p-1 hover:bg-input rounded text-secondary hover:text-primary cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold uppercase text-secondary">Document Main Title</label>
                <input
                  type="text"
                  value={reportHeadings.mainTitle}
                  onChange={(e) => updateReportHeading('mainTitle', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-subtle rounded-xl text-primary font-medium focus:border-strong focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-secondary">Section 1 Header</label>
                <input
                  type="text"
                  value={reportHeadings.section1}
                  onChange={(e) => updateReportHeading('section1', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-subtle rounded-xl text-primary font-medium focus:border-strong focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-secondary">Section 2 Header (KPIs)</label>
                <input
                  type="text"
                  value={reportHeadings.section2}
                  onChange={(e) => updateReportHeading('section2', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-subtle rounded-xl text-primary font-medium focus:border-strong focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-secondary">Section 3 Header (AI Insights)</label>
                <input
                  type="text"
                  value={reportHeadings.section3}
                  onChange={(e) => updateReportHeading('section3', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-subtle rounded-xl text-primary font-medium focus:border-strong focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-secondary">Section 4 Header (Dashboards & Segments)</label>
                <input
                  type="text"
                  value={reportHeadings.section4}
                  onChange={(e) => updateReportHeading('section4', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-subtle rounded-xl text-primary font-medium focus:border-strong focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-secondary">Section 5 Header (Key Performance Indicators)</label>
                <input
                  type="text"
                  value={reportHeadings.section5}
                  onChange={(e) => updateReportHeading('section5', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-subtle rounded-xl text-primary font-medium focus:border-strong focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-secondary">Section 6 Header (Analytical &amp; Statistical Findings)</label>
                <input
                  type="text"
                  value={reportHeadings.section6}
                  onChange={(e) => updateReportHeading('section6', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-subtle rounded-xl text-primary font-medium focus:border-strong focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-secondary">Section 7 Header (Visualizations &amp; Segment Breakdown)</label>
                <input
                  type="text"
                  value={reportHeadings.section7}
                  onChange={(e) => updateReportHeading('section7', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-subtle rounded-xl text-primary font-medium focus:border-strong focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-secondary">Section 8 Header (Strategic Business Recommendations)</label>
                <input
                  type="text"
                  value={reportHeadings.section8}
                  onChange={(e) => updateReportHeading('section8', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-subtle rounded-xl text-primary font-medium focus:border-strong focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase text-secondary">Section 9 Header (Limitations, Assumptions &amp; Risk Factors)</label>
                <input
                  type="text"
                  value={reportHeadings.section9}
                  onChange={(e) => updateReportHeading('section9', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-subtle rounded-xl text-primary font-medium focus:border-strong focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-subtle">
              <button
                type="button"
                onClick={() => {
                  updateReportHeading('mainTitle', 'EXECUTIVE INTELLIGENCE BRIEF');
                  updateReportHeading('section1', '1. EXECUTIVE SUMMARY & BUSINESS HEALTH');
                  updateReportHeading('section2', '2. DATASET OVERVIEW & DIMENSIONS');
                  updateReportHeading('section3', '3. METHODOLOGY & GOVERNANCE ARCHITECTURE');
                  updateReportHeading('section4', '4. DATA QUALITY AUDIT FINDINGS');
                  updateReportHeading('section5', '5. KEY PERFORMANCE INDICATORS');
                  updateReportHeading('section6', '6. ANALYTICAL & STATISTICAL FINDINGS');
                  updateReportHeading('section7', '7. VISUALIZATIONS & SEGMENT BREAKDOWN');
                  updateReportHeading('section8', '8. STRATEGIC BUSINESS RECOMMENDATIONS');
                  updateReportHeading('section9', '9. LIMITATIONS, ASSUMPTIONS & RISK FACTORS');
                }}
                className="text-xs text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
              </button>
              <button
                type="button"
                onClick={() => setIsHeadingsModalOpen(false)}
                className="px-4 py-2 bg-accent text-on-accent hover:opacity-90 font-bold text-xs rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Chart Modal */}
      {isAddChartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-elevated border border-subtle text-primary rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent-soft text-accent">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-primary">Add Custom Chart</h3>
                  <p className="text-xs text-secondary">Map fields from {project.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddChartModalOpen(false)} 
                className="p-1.5 rounded-lg hover:bg-input text-secondary hover:text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomChart} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold uppercase text-secondary">Chart Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Revenue by Region, MRR by Tier..."
                  value={newChartTitle}
                  onChange={(e) => setNewChartTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-subtle text-primary focus:border-strong rounded-xl font-medium focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold uppercase text-secondary">Chart Type</label>
                  <select
                    value={newChartType}
                    onChange={(e) => setNewChartType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-input border border-subtle text-primary rounded-xl font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line / Trend</option>
                    <option value="donut">Donut / Proportion</option>
                    <option value="table">Table Matrix</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase text-secondary">Aggregation</label>
                  <select
                    value={newChartAgg}
                    onChange={(e) => setNewChartAgg(e.target.value as any)}
                    className="w-full px-3 py-2 bg-input border border-subtle text-primary rounded-xl font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="sum">SUM</option>
                    <option value="avg">AVERAGE</option>
                    <option value="count">COUNT</option>
                    <option value="min">MIN</option>
                    <option value="max">MAX</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold uppercase text-secondary">Category / Dimension Axis</label>
                  <select
                    value={newChartCat || stringCols[0]?.name || ''}
                    onChange={(e) => setNewChartCat(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-subtle text-primary rounded-xl font-medium focus:outline-none cursor-pointer"
                  >
                    {stringCols.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase text-secondary">Metric / Value Column</label>
                  <select
                    value={newChartVal || numericCols[0]?.name || ''}
                    onChange={(e) => setNewChartVal(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-subtle text-primary rounded-xl font-medium focus:outline-none cursor-pointer"
                  >
                    {numericCols.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddChartModalOpen(false)}
                  className="px-4 py-2 bg-input text-secondary hover:bg-card-hover rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:opacity-90 text-on-accent font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Add Chart to Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
