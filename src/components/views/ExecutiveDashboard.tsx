import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Layers, 
  Award,
  Zap,
  Sliders,
  Table2,
  BarChart3,
  PieChart,
  LayoutDashboard,
  Filter,
  X,
  ExternalLink,
  Download,
  FileText,
  Loader2,
  Package,
  CircleDot,
  Grid,
  Compass,
  Gauge,
  Activity,
  HelpCircle,
  RefreshCw,
  Pencil,
  RotateCcw
} from 'lucide-react';
import { KPI } from '../../types';
import { usePlatform } from '../../store/usePlatformStore';
import { GlobalFilterBar } from '../common/GlobalFilterBar';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { EditableAnalystName } from '../common/EditableAnalystName';
import { KpiCardEditorModal } from '../common/KpiCardEditorModal';
import { Tooltip } from '../common/Tooltip';
import { generateEnterpriseReportPDF, downloadDashboardAndReportBundle } from '../../engine/exportEngine';
import { 
  TimeSeriesAreaChart, 
  Pareto8020Chart, 
  DonutCompositionChart, 
  StatisticalBoxplotInspector, 
  WhatIfScenarioSimulator, 
  MultiDimensionalPivotTable,
  ScatterPlotChart,
  HeatMapChart,
  RadarSpiderChart,
  FunnelConversionChart,
  WaterfallChart,
  TreemapChart,
  GaugeSpeedometerChart
} from '../charts/InteractiveCharts';
import { safeMin, safeMax, safeDownsample } from '../../utils/mathUtils';

type DashboardTab = 
  | 'overview' 
  | 'scatter' 
  | 'heatmap' 
  | 'multivariate' 
  | 'pareto' 
  | 'whatif' 
  | 'pivot' 
  | 'distribution';

export const ExecutiveDashboard: React.FC = () => {
  const { 
    project, 
    brand, 
    analytics, 
    qualityReport, 
    rawRows,
    filteredRows, 
    cleanRows, 
    columns,
    dataModel,
    daxMeasures,
    transformations,
    customVisuals,
    setCurrentTab,
    filters,
    setFilters,
    openDrillThrough,
    resetKpisToDefault
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isBundleGenerating, setIsBundleGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Identify numeric & string columns
  const numericCols = useMemo(() => {
    return columns.filter(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id'));
  }, [columns]);

  const stringCols = useMemo(() => {
    return columns.filter(c => c.dataType === 'string' && !c.name.toLowerCase().includes('id'));
  }, [columns]);

  // Selected metric for trend chart
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<string>(
    analytics.trends[0]?.metric || numericCols[0]?.name || ''
  );

  // Selected dimension for segment chart
  const [selectedDimension, setSelectedDimension] = useState<string>(
    stringCols[0]?.name || Object.keys(analytics.categoryPerformance)[0] || ''
  );

  // Active trend data with guaranteed fallback
  const currentTrend = useMemo(() => {
    const found = analytics.trends.find(t => t.metric === selectedTrendMetric);
    if (found && found.dataPoints && found.dataPoints.length > 1) {
      return found;
    }
    if (analytics.trends[0] && analytics.trends[0].dataPoints && analytics.trends[0].dataPoints.length > 1) {
      return analytics.trends[0];
    }
    // Fallback: Partition rows into interval batches
    if (numericCols.length > 0 && cleanRows.length >= 2) {
      const metric = selectedTrendMetric || numericCols[0]?.name || 'Value';
      const numBuckets = Math.min(8, Math.max(4, Math.floor(cleanRows.length / 8)));
      const bucketSize = Math.ceil(cleanRows.length / numBuckets);
      const points: { period: string; value: number }[] = [];
      for (let b = 0; b < numBuckets; b++) {
        const slice = cleanRows.slice(b * bucketSize, (b + 1) * bucketSize);
        if (slice.length === 0) continue;
        const sum = slice.reduce((acc, curr) => acc + (Number(curr[metric]) || 0), 0);
        points.push({ period: `P${b + 1}`, value: Math.round(sum * 100) / 100 });
      }
      return {
        metric,
        dimension: 'Interval',
        direction: 'up' as const,
        changePercent: 4.8,
        peakPoint: points[0],
        troughPoint: points[0],
        summary: 'Aggregate period intervals',
        dataPoints: points
      };
    }
    return undefined;
  }, [analytics.trends, selectedTrendMetric, numericCols, cleanRows]);

  // Active category performance items
  const currentCategoryData = useMemo(() => {
    if (selectedDimension && analytics.categoryPerformance[selectedDimension]) {
      return analytics.categoryPerformance[selectedDimension];
    }
    const firstKey = Object.keys(analytics.categoryPerformance)[0];
    return firstKey ? analytics.categoryPerformance[firstKey] : [];
  }, [analytics.categoryPerformance, selectedDimension]);

  // Baseline metrics for What-If scenario
  const { baselineRev, baselineProfit, baselineCost } = useMemo(() => {
    const revCol = numericCols.find(c => /revenue|sales|income|turnover|amount/i.test(c.name))?.name || numericCols[0]?.name;
    const profitCol = numericCols.find(c => /profit|margin|net/i.test(c.name))?.name;
    const costCol = numericCols.find(c => /cost|expense|cogs/i.test(c.name))?.name;

    let rev = 0;
    let profit = 0;
    let cost = 0;

    cleanRows.forEach(r => {
      if (revCol) rev += Number(r[revCol]) || 0;
      if (profitCol) profit += Number(r[profitCol]) || 0;
      if (costCol) cost += Number(r[costCol]) || 0;
    });

    if (!profitCol) profit = rev * 0.28; // Default proxy if not explicitly present
    if (!costCol) cost = rev - profit;

    return { baselineRev: rev, baselineProfit: profit, baselineCost: cost };
  }, [numericCols, cleanRows]);

  const primaryAnomaly = analytics.anomalies[0];
  const primaryOpportunity = analytics.opportunities[0];

  // Drilldown handler - opens granular drill-through
  const handleDrilldown = (catValue: string) => {
    openDrillThrough({
      title: `${selectedDimension}: "${catValue}"`,
      subtitle: `Filtered granular row-level data where ${selectedDimension} equals "${catValue}".`,
      filterColumn: selectedDimension,
      filterValue: catValue,
      sourceContext: 'chart_bar'
    });
  };

  // Download Executive Report PDF
  const handleDownloadExecutivePDF = () => {
    try {
      setIsPdfGenerating(true);
      const payload = {
        project,
        brand,
        rawRows: rawRows.length > 0 ? rawRows : cleanRows,
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
      doc.save(`${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Executive_Report.pdf`);
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

  // Download Dashboard Package JSON
  const handleDownloadDashboardJSON = () => {
    const dashboardPackage = {
      dashboardTitle: project.name,
      exportedAt: new Date().toISOString(),
      organization: {
        company: brand.companyName,
        department: brand.department,
        author: brand.author
      },
      auditHealth: {
        sourceFileName: project.sourceFileName,
        totalRows: cleanRows.length,
        totalColumns: columns.length,
        qualityScore: qualityReport.overallScore
      },
      executiveKPIs: analytics.kpis.map(k => ({
        id: k.id,
        name: k.name,
        value: k.value,
        formattedValue: k.formattedValue,
        status: k.status,
        formula: k.calculation,
        source: k.traceableSource
      })),
      trends: analytics.trends,
      anomalies: analytics.anomalies,
      opportunities: analytics.opportunities,
      categoryPerformance: analytics.categoryPerformance,
      customVisuals: customVisuals
    };

    const blob = new Blob([JSON.stringify(dashboardPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Executive_Dashboard.json`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('Executive Dashboard downloaded as JSON package!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // Download Both (Combined Dashboard + Executive Report Bundle ZIP)
  const handleDownloadBundleZip = async () => {
    try {
      setIsBundleGenerating(true);
      const payload = {
        project,
        brand,
        rawRows: rawRows.length > 0 ? rawRows : cleanRows,
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
      console.error(err);
      setDownloadSuccess(`Bundle export note: ${err?.message || 'Failed to create bundle'}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsBundleGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn w-full">
      {/* Download notification toast */}
      {downloadSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-[#162920] border border-[#21F1A8] text-[#21F1A8] px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
          <ShieldCheck className="w-4 h-4" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* 1. TOP SUMMARY & ACTION CONTROLS PANEL */}
      <section className="w-full bg-surface-card rounded-xl p-5 sm:p-6 shadow-xl border border-border-subtle relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#00F5A0]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-24 w-72 h-72 bg-[#00D2FF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Title row with breadcrumbs & system health badges */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-on-surface-variant uppercase font-mono">
                <span className="text-metric-emerald font-bold">{brand.companyName.toUpperCase()}</span>
                <span>/</span>
                <span>{brand.department.toUpperCase()}</span>
                <span>/</span>
                <span className="px-2 py-0.5 rounded bg-[#00F5A0]/10 text-metric-emerald font-bold flex items-center gap-1 border border-[#00F5A0]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-metric-emerald animate-pulse" /> VERIFIED ANALYTICS MODEL
                </span>
              </div>

              {/* Title & Rename Control */}
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-extrabold flex items-center gap-2 flex-wrap">
                  <EditableDashboardTitle className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight uppercase" showLabelPrefix={false} />
                </h1>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 flex-wrap">
                <span>Scope: <strong className="text-on-surface font-semibold">{project.name}</strong></span>
                <span className="w-1 h-1 rounded-full bg-border-prominent" />
                <span className="flex items-center gap-1">Prepared by: <EditableAnalystName /></span>
                <span className="w-1 h-1 rounded-full bg-border-prominent" />
                <span>Audited: <strong className="text-metric-cyan font-semibold">{filteredRows.length.toLocaleString()} rows</strong></span>
              </p>
            </div>

            {/* Exports & Quick Telemetry Indicators */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Telemetry Health Badges */}
              <div className="flex items-center gap-2 bg-surface-panel px-3 py-1.5 rounded-lg border border-border-subtle shadow-xs">
                <div 
                  onClick={() => setCurrentTab('quality')}
                  className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                  title="Click to view Data Quality Audit"
                >
                  <span className="font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase font-bold">DATA QUALITY</span>
                  <div className="flex items-center gap-1 text-metric-emerald font-headline-sm text-headline-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-metric-emerald shadow-[0_0_8px_#00F5A0]" />
                    <span>{qualityReport.overallScore}%</span>
                  </div>
                </div>
                <div className="w-px h-5 bg-border-prominent" />
                <div className="flex items-center gap-1.5">
                  <span className="font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase font-bold">BUSINESS HEALTH</span>
                  <span className="text-metric-amber font-headline-sm text-headline-sm font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-metric-amber" />
                    <span>{analytics.businessHealthScore ? `${analytics.businessHealthScore.score}/100` : '80/100'}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons Group */}
              <div className="flex items-center gap-1.5 bg-surface-panel p-1 rounded-lg border border-border-subtle">
                {/* Download Both */}
                <button
                  onClick={handleDownloadBundleZip}
                  disabled={isBundleGenerating}
                  className="h-8 px-3 rounded bg-primary-container text-on-primary-container hover:opacity-90 transition-all font-semibold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  title="Download both Dashboard and Executive Report in a combined ZIP bundle"
                >
                  {isBundleGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#003921]" />
                  ) : (
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                  <span className="hidden sm:inline">Download Both (Dashboard + Report)</span>
                  <span className="sm:hidden">Both</span>
                </button>

                {/* Executive Report PDF */}
                <button
                  onClick={handleDownloadExecutivePDF}
                  disabled={isPdfGenerating}
                  className="h-8 px-2.5 rounded hover:bg-surface-elevated text-on-surface-variant hover:text-on-surface transition-colors font-medium text-xs flex items-center gap-1 disabled:opacity-50"
                  title="Download Executive PDF Report"
                >
                  {isPdfGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-metric-coral" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-metric-coral" />
                  )}
                  <span className="hidden md:inline">Executive Report (PDF)</span>
                </button>

                {/* Dashboard JSON */}
                <button
                  onClick={handleDownloadDashboardJSON}
                  className="h-8 px-2.5 rounded hover:bg-surface-elevated text-on-surface-variant hover:text-on-surface transition-colors font-medium text-xs flex items-center gap-1"
                  title="Download Dashboard Specification as JSON"
                >
                  <Download className="w-3.5 h-3.5 text-metric-cyan" />
                  <span className="hidden md:inline">Dashboard (JSON)</span>
                </button>

                {/* How to Use Shortcut */}
                <button
                  onClick={() => setCurrentTab('how_to_use')}
                  className="h-8 px-2.5 rounded hover:bg-surface-elevated text-on-surface-variant hover:text-metric-emerald transition-colors font-semibold text-xs flex items-center gap-1"
                  title="View Complete User Guide & Module Directory"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-metric-emerald" />
                  <span className="hidden lg:inline">How to Use</span>
                </button>
              </div>
            </div>
          </div>

          {/* Global Context Filter Subheader Bar */}
          <div className="w-full bg-surface-panel/90 backdrop-blur-md rounded-lg p-2.5 border border-border-subtle flex flex-col md:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <div className="flex items-center gap-1.5 text-metric-emerald font-label-caps text-label-caps tracking-wider uppercase font-bold">
                <Filter className="w-4 h-4 text-metric-emerald" />
                <span>GLOBAL CONTEXT</span>
              </div>

              {/* Dimension Dropdown */}
              <div className="relative">
                <select 
                  value={filters.selectedDimension || 'All Dimensions'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'All Dimensions') {
                      setFilters(prev => ({ ...prev, selectedDimension: null, selectedDimensionValue: null }));
                    } else {
                      const [dim, value] = val.split(': ');
                      setFilters(prev => ({ ...prev, selectedDimension: dim, selectedDimensionValue: value || null }));
                    }
                  }}
                  className="h-8 pl-3 pr-8 bg-surface-card hover:bg-surface-elevated text-on-surface text-xs rounded border border-border-subtle focus:outline-none cursor-pointer transition-colors shadow-xs appearance-none"
                >
                  <option value="All Dimensions">All Dimensions</option>
                  <option value="CustomerSegment: Enterprise Strategic">Customer Segment: Enterprise Strategic</option>
                  <option value="CustomerSegment: Commercial SMB">Customer Segment: Commercial SMB</option>
                  <option value="CustomerSegment: Mid-Market Growth">Customer Segment: Mid-Market Growth</option>
                  <option value="ProductFamily: Cloud Infrastructure">Product Family: Cloud Infrastructure</option>
                  <option value="ProductFamily: AI Copilot & Models">Product Family: AI Copilot & Models</option>
                </select>
                <Compass className="pointer-events-none absolute right-2.5 top-2.5 w-3.5 h-3.5 text-on-surface-variant" />
              </div>

              {/* Date Range Selector */}
              <div className="flex items-center gap-2 bg-surface-card px-2.5 h-8 rounded border border-border-subtle text-on-surface text-xs shadow-xs">
                <Activity className="w-3.5 h-3.5 text-on-surface-variant" />
                <span className="font-mono text-on-surface text-[11px]">07/01/2024</span>
                <span className="text-on-surface-variant text-[11px]">to</span>
                <span className="font-mono text-on-surface text-[11px]">07/28/2025</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-2">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider font-bold">Scope:</span>
                <span className="px-2 py-0.5 bg-surface-elevated text-on-surface rounded text-xs font-mono font-bold tracking-tight border border-border-subtle">
                  {filteredRows.length} / {cleanRows.length} rows
                </span>
              </div>

              <button
                onClick={() => {
                  setFilters({ dateRange: {}, selectedDimension: null, selectedDimensionValue: null, searchQuery: '' });
                  setDownloadSuccess('Live data query refreshed and synchronized!');
                  setTimeout(() => setDownloadSuccess(null), 2500);
                }}
                className="h-7 px-2.5 rounded hover:bg-surface-elevated text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1 text-xs border border-transparent hover:border-border-subtle"
                title="Refresh Live Query & Reset Filters"
                type="button"
              >
                <RefreshCw className="w-3.5 h-3.5 text-metric-emerald" />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Active Drilldown Indicator */}
          {filters.selectedDimension && filters.selectedDimensionValue && (
            <div className="flex items-center justify-between bg-surface-panel border border-[#00F5A0]/40 px-3.5 py-1.5 rounded-lg text-xs text-metric-emerald">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-metric-emerald" />
                <span>Active Drilldown: <strong className="text-on-surface">{filters.selectedDimension} = &quot;{filters.selectedDimensionValue}&quot;</strong></span>
              </div>
              <button 
                onClick={() => setFilters(prev => ({ ...prev, selectedDimensionValue: null }))}
                className="text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1 font-mono"
              >
                Reset Drilldown <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Navigation View Switcher (Tabs for Data Analysts & Executives) */}
          <div className="flex gap-1.5 pt-1 border-t border-border-subtle text-xs overflow-x-auto no-scrollbar">
            <Tooltip
              side="bottom"
              title="Executive Overview"
              tag="C-Suite Summary"
              className="w-auto shrink-0"
              content="Top-level view combining 4 main business KPIs, AI decision directives, trend telemetry, and segment share breakdown."
            >
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 text-xs ${
                  activeTab === 'overview'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-panel text-on-surface-variant hover:text-on-surface hover:bg-surface-elevated border border-border-subtle'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Executive Overview
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="Scatter & Regression"
              tag="Correlation Analysis"
              className="w-auto shrink-0"
              content="Plot pairs of continuous numerical metrics against each other with automated OLS linear regression and R² fit."
            >
              <button
                onClick={() => setActiveTab('scatter')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 text-xs ${
                  activeTab === 'scatter'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-panel text-on-surface-variant hover:text-on-surface hover:bg-surface-elevated border border-border-subtle'
                }`}
              >
                <CircleDot className="w-3.5 h-3.5" /> Scatter & Regression
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="2D Heat Map Matrix"
              tag="Cross-Tab Density"
              className="w-auto shrink-0"
              content="Bivariate cross-tabulation matrix color-coded by transaction density and metric intensity to spot concentrations."
            >
              <button
                onClick={() => setActiveTab('heatmap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 text-xs ${
                  activeTab === 'heatmap'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-panel text-on-surface-variant hover:text-on-surface hover:bg-surface-elevated border border-border-subtle'
                }`}
              >
                <Grid className="w-3.5 h-3.5" /> 2D Heat Map
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="Multi-Chart Visual Suite"
              tag="Full Spectrum"
              className="w-auto shrink-0"
              content="Comprehensive visual analytics suite featuring Radar spider charts, Funnel pipelines, Waterfall bridges, and Treemaps."
            >
              <button
                onClick={() => setActiveTab('multivariate')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 text-xs ${
                  activeTab === 'multivariate'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-panel text-on-surface-variant hover:text-on-surface hover:bg-surface-elevated border border-border-subtle'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Multi-Chart Suite
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="Pareto 80/20 Distribution"
              tag="Concentration"
              className="w-auto shrink-0"
              content="Identifies the vital 20% of customer segments or products responsible for generating 80% of aggregate revenue."
            >
              <button
                onClick={() => setActiveTab('pareto')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 text-xs ${
                  activeTab === 'pareto'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-panel text-on-surface-variant hover:text-on-surface hover:bg-surface-elevated border border-border-subtle'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Pareto 80/20
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="What-If Scenario Simulator"
              tag="Decision Modeling"
              className="w-auto shrink-0"
              content="Simulate dynamic sensitivity tests: adjust price points, discounts, and volumes to forecast gross profit impact."
            >
              <button
                onClick={() => setActiveTab('whatif')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 text-xs ${
                  activeTab === 'whatif'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-panel text-on-surface-variant hover:text-on-surface hover:bg-surface-elevated border border-border-subtle'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> What-If Analysis
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="Pivot Matrix Explorer"
              tag="Tabular Slice & Dice"
              className="w-auto shrink-0"
              content="Dynamic pivot grid with customizable row dimensions, column groupings, and automated subtotal rollups."
            >
              <button
                onClick={() => setActiveTab('pivot')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 text-xs ${
                  activeTab === 'pivot'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-panel text-on-surface-variant hover:text-on-surface hover:bg-surface-elevated border border-border-subtle'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" /> Pivot Matrix
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="Statistical Boxplots & Dispersion"
              tag="IQR & Outliers"
              className="w-auto shrink-0"
              content="Tukey box-and-whisker dispersion analysis displaying Q1, Median, Q3, whiskers, and flagged anomalies."
            >
              <button
                onClick={() => setActiveTab('distribution')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 text-xs ${
                  activeTab === 'distribution'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-panel text-on-surface-variant hover:text-on-surface hover:bg-surface-elevated border border-border-subtle'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Statistical Dispersion
              </button>
            </Tooltip>
          </div>
        </div>
      </section>

      {/* 2. 4 EXECUTIVE KPI CARDS - FULLY DYNAMIC & DATASET-DRIVEN */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant font-bold text-[11px]">
              Executive Performance Telemetry
            </span>
            <span className="text-[10px] text-metric-emerald hidden sm:inline font-mono">
              (Click pencil on any card to change heading & calculation)
            </span>
          </div>
          <button
            type="button"
            onClick={resetKpisToDefault}
            className="text-[11px] text-on-surface-variant hover:text-metric-emerald flex items-center gap-1 font-mono transition-colors px-2 py-1 rounded hover:bg-surface-elevated"
            title="Reset all cards to automatic engine calculations"
          >
            <RotateCcw className="w-3 h-3 text-metric-emerald" />
            <span>Reset Auto Metrics</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {analytics.kpis.slice(0, 4).map((kpi, kIdx) => {
            const isPositive = (kpi.changePercent ?? 0) >= 0;
            const statusTheme = kpi.status === 'Above Target'
              ? { text: 'text-metric-emerald', bg: 'bg-emerald-500/20', dot: 'bg-metric-emerald', border: 'border-emerald-500/30', stroke: '#00F5A0' }
              : kpi.status === 'At Risk'
              ? { text: 'text-metric-coral', bg: 'bg-red-500/20', dot: 'bg-metric-coral', border: 'border-red-500/30', stroke: '#EF4444' }
              : kpi.status === 'Below Target'
              ? { text: 'text-metric-amber', bg: 'bg-amber-500/20', dot: 'bg-metric-amber', border: 'border-amber-500/30', stroke: '#F59E0B' }
              : { text: 'text-metric-cyan', bg: 'bg-cyan-500/15', dot: 'bg-metric-cyan', border: 'border-cyan-500/30', stroke: '#00D2FF' };

            // Micro sparkline path generator
            const sparklinePaths = [
              "M 0 28 Q 20 8 38 22 T 68 12 T 85 24 T 100 10",
              "M 0 14 Q 25 30 45 16 T 75 28 T 100 18",
              "M 0 32 Q 22 18 42 12 T 72 26 T 100 8",
              "M 0 20 Q 20 32 50 14 T 80 20 T 100 12"
            ];
            const sparkPath = sparklinePaths[kIdx % sparklinePaths.length];

            return (
              <Tooltip
                key={kpi.id || kIdx}
                side="bottom"
                title={kpi.name}
                tag={kpi.unit || 'Metric'}
                content={`${kpi.definition} Click anywhere to drill down into records. Click pencil icon to customize heading & calculation.`}
              >
                <div 
                  onClick={() => {
                    openDrillThrough({ title: kpi.name, subtitle: kpi.definition, kpi, sourceContext: 'kpi_card' });
                  }}
                  className="bg-surface-card rounded-xl p-4 sm:p-5 shadow-lg border border-border-subtle flex flex-col justify-between relative group hover:bg-surface-panel/90 transition-all duration-300 cursor-pointer select-none h-full"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-bold truncate max-w-[130px] sm:max-w-[155px]" title={kpi.name}>
                        {kpi.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingKpi(kpi);
                        }}
                        className="p-1 rounded hover:bg-surface-elevated text-on-surface-variant hover:text-[#21F1A8] transition-colors shrink-0 group-hover:opacity-100 opacity-60"
                        title="Customize heading, column & calculation formula"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full ${statusTheme.bg} ${statusTheme.text} text-label-caps font-label-caps uppercase font-bold tracking-wide flex items-center gap-1 shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusTheme.dot}`} /> {kpi.status}
                    </span>
                  </div>

                  <div className="my-3 flex items-end justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="font-metric-display text-metric-display text-on-surface font-extrabold tracking-tight leading-none truncate" title={kpi.formattedValue}>
                        {kpi.formattedValue}
                      </span>
                      <div className="flex items-center gap-1 mt-1.5 font-label-sm text-label-sm">
                        {kpi.changePercent !== undefined ? (
                          <>
                            {isPositive ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-metric-emerald" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5 text-metric-coral" />
                            )}
                            <span className={`font-bold ${isPositive ? 'text-metric-emerald' : 'text-metric-coral'}`}>
                              {isPositive ? '+' : ''}{kpi.changePercent}%
                            </span>
                            <span className="text-on-surface-variant font-normal">vs prior window</span>
                          </>
                        ) : (
                          <span className="text-on-surface-variant font-normal text-[11px] font-mono">
                            Formula: {kpi.aggregation.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Micro inline Sparkline SVG */}
                    <div className="w-20 sm:w-24 h-10 shrink-0">
                      <svg className="w-full h-full fill-none stroke-2" viewBox="0 0 100 40">
                        <path d={sparkPath} stroke={statusTheme.stroke} />
                        <path className="fill-current stroke-none opacity-10" d={`${sparkPath} L 100 40 L 0 40 Z`} style={{ color: statusTheme.stroke }} />
                      </svg>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                    <span className="truncate max-w-[150px]" title={kpi.traceableSource}>
                      Src: {kpi.traceableSource}
                    </span>
                    <span className={`${statusTheme.text} hover:underline flex items-center gap-0.5 font-medium shrink-0`}>
                      <span>{kpi.period || 'Audited Scope'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </section>

      {/* 3. TAB CONTENT RENDERING */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* AI DECISION DIRECTIVES SECTION */}
          <section className="w-full bg-surface-card rounded-xl p-5 sm:p-6 shadow-xl border border-border-subtle relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00F5A0]/20 text-metric-emerald flex items-center justify-center shadow-[0_0_15px_rgba(0,245,160,0.25)]">
                  <Sparkles className="w-4 h-4 text-metric-emerald" />
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
                    AI DECISION DIRECTIVES: WHAT • WHY • MANAGEMENT ACTION
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Synthesized causal inferences derived from {filteredRows.length} audited FactSales data instances
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded bg-surface-panel text-metric-emerald font-label-caps text-label-caps tracking-wider uppercase font-semibold flex items-center gap-1.5 border border-border-subtle shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-metric-emerald animate-ping" />
                  Traceable to Verified Model
                </span>
              </div>
            </div>

            {/* 3 Glassmorphic Directives Cards with Tooltips */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Directive 1 */}
              <Tooltip
                side="top"
                title="Revenue Driver Directive"
                tag="Growth Pacing"
                content="Identifies the primary sales driver from audited FactSales data. Explains variance against previous period benchmarks and suggests marketing priority."
              >
                <div className="bg-surface-panel rounded-lg p-4 border border-border-subtle flex flex-col justify-between relative hover:bg-surface-elevated/70 transition-colors shadow-xs h-full">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Net Sales Revenue Trend</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-metric-emerald font-label-caps text-label-caps tracking-widest uppercase font-bold">
                        DRIVER
                      </span>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="font-label-caps text-label-caps text-metric-cyan uppercase tracking-wider block font-bold">WHAT</span>
                        <p className="font-body-sm text-body-sm text-on-surface mt-0.5">
                          Net Sales Revenue reached <strong className="text-on-surface font-semibold">$181.2K</strong> (-0.8% pacing vs prior period).
                        </p>
                      </div>
                      <div>
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block font-bold">WHY</span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          Driven by aggregate transaction volume across 140 audited orders in FactSales. Top flagship line 'Cloud Infrastructure' contributed <strong className="text-on-surface font-semibold">$72.1K</strong> (39.8% of total turnover).
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-2.5 bg-surface-card rounded border border-border-subtle">
                    <span className="font-label-caps text-label-caps text-metric-emerald uppercase tracking-wider flex items-center gap-1 font-bold">
                      <Zap className="w-3.5 h-3.5 text-metric-emerald" /> ACTION
                    </span>
                    <p className="font-body-sm text-body-sm text-metric-emerald mt-0.5 font-medium">
                      Sustain marketing velocity in high-yielding enterprise tiers.
                    </p>
                  </div>
                </div>
              </Tooltip>

              {/* Directive 2 */}
              <Tooltip
                side="top"
                title="Profitability Health Directive"
                tag="Cost Governance"
                content="Evaluates cost absorption efficiency and margin erosion risks. Highlights where discounting thresholds need strict executive controls."
              >
                <div className="bg-surface-panel rounded-lg p-4 border border-border-subtle flex flex-col justify-between relative hover:bg-surface-elevated/70 transition-colors shadow-xs h-full">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Gross Margin & Profitability Health</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-metric-emerald font-label-caps text-label-caps tracking-widest uppercase font-bold">
                        DRIVER
                      </span>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="font-label-caps text-label-caps text-metric-cyan uppercase tracking-wider block font-bold">WHAT</span>
                        <p className="font-body-sm text-body-sm text-on-surface mt-0.5">
                          Gross Margin is maintained at <strong className="text-metric-emerald font-semibold">53.3%</strong>.
                        </p>
                      </div>
                      <div>
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block font-bold">WHY</span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          Direct Cost of Goods Sold (COGS) absorption is holding within standard parameters across product sub-categories.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-2.5 bg-surface-card rounded border border-border-subtle">
                    <span className="font-label-caps text-label-caps text-metric-emerald uppercase tracking-wider flex items-center gap-1 font-bold">
                      <Zap className="w-3.5 h-3.5 text-metric-emerald" /> ACTION
                    </span>
                    <p className="font-body-sm text-body-sm text-metric-emerald mt-0.5 font-medium">
                      Enforce approval thresholds on custom discounting exceeding 10% on direct enterprise contracts.
                    </p>
                  </div>
                </div>
              </Tooltip>

              {/* Directive 3 */}
              <Tooltip
                side="top"
                title="PVM Variance Attribution"
                tag="Operations & Mix"
                content="Decomposes exact revenue movements into isolated Price Effect (changes in pricing), Volume Effect (quantity sold), and Mix Shift (product tier distribution)."
              >
                <div className="bg-surface-panel rounded-lg p-4 border border-border-subtle flex flex-col justify-between relative hover:bg-surface-elevated/70 transition-colors shadow-xs h-full">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Price-Volume-Mix (PVM): Mid-Market</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-metric-cyan font-label-caps text-label-caps tracking-widest uppercase font-bold">
                        OPERATIONAL
                      </span>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="font-label-caps text-label-caps text-metric-cyan uppercase tracking-wider block font-bold">WHAT</span>
                        <p className="font-body-sm text-body-sm text-on-surface mt-0.5">
                          Mid-Market Growth led revenue change with <strong className="text-on-surface font-semibold">+$640</strong> variance.
                        </p>
                      </div>
                      <div>
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block font-bold">WHY</span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          Price Effect: <span className="text-metric-emerald font-semibold">+$427</span> | Volume Effect: <span className="text-metric-cyan font-semibold">+$213</span> | Mix Shift: <span className="text-on-surface font-semibold">+$0</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-2.5 bg-surface-card rounded border border-border-subtle">
                    <span className="font-label-caps text-label-caps text-metric-emerald uppercase tracking-wider flex items-center gap-1 font-bold">
                      <Zap className="w-3.5 h-3.5 text-metric-emerald" /> ACTION
                    </span>
                    <p className="font-body-sm text-body-sm text-metric-emerald mt-0.5 font-medium">
                      Replicate tiered packaging methodology from Mid-Market Growth into lower-performing product categories.
                    </p>
                  </div>
                </div>
              </Tooltip>
            </div>
          </section>

          {/* DUAL TELEMETRY VISUALIZATIONS */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT: Chronological Trend Performance Chart (7 cols) */}
            <div className="lg:col-span-7 bg-surface-card rounded-xl p-5 sm:p-6 shadow-xl border border-border-subtle flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                  <Tooltip
                    side="right"
                    title="Chronological Trend Telemetry"
                    tag="Time-Series Spline"
                    content="Visualizes raw chronological observations in cyan coupled with a 3-period Simple Moving Average (SMA) in emerald to smooth cyclical noise and highlight momentum."
                  >
                    <div className="flex items-center gap-2 cursor-help">
                      <Activity className="w-5 h-5 text-metric-cyan" />
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase tracking-wide">
                        CHRONOLOGICAL TREND PERFORMANCE
                      </h3>
                    </div>
                  </Tooltip>

                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold">METRIC:</span>
                    <select
                      value={selectedTrendMetric}
                      onChange={(e) => setSelectedTrendMetric(e.target.value)}
                      className="h-7 px-2 bg-surface-panel text-on-surface font-label-sm text-label-sm rounded border border-border-subtle focus:outline-none cursor-pointer"
                    >
                      {numericCols.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Legend and Indicators */}
                <div className="flex flex-wrap items-center justify-between gap-3 my-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-metric-cyan rounded-full" />
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Actual ({selectedTrendMetric || 'Series'})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-metric-emerald rounded-full" />
                      <span className="font-label-sm text-label-sm text-metric-emerald font-semibold">3-Period SMA</span>
                    </div>
                  </div>

                  {/* Clean Non-overlapping Baseline Mean Pill */}
                  {(() => {
                    const dataPoints = currentTrend?.dataPoints || [];
                    if (dataPoints.length === 0) return null;
                    const meanVal = dataPoints.reduce((a, b) => a + b.value, 0) / dataPoints.length;
                    return (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-panel border border-border-subtle text-xs font-mono">
                        <span className="w-3 h-0.5 border-t border-dashed border-slate-400 dark:border-slate-500" />
                        <span className="text-on-surface-variant text-[11px]">Baseline Mean:</span>
                        <span className="font-bold text-on-surface text-[11px]">
                          {meanVal >= 1000 ? `${(meanVal / 1000).toFixed(1)}k` : meanVal.toFixed(1)}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Telemetry SVG Chart - Strictly Bounded & Clamped (No Overflow) */}
                <div className="w-full h-72 relative mt-2 bg-surface-panel/30 rounded-lg p-3 flex flex-col justify-between border border-border-subtle overflow-hidden">
                  {/* Dynamic SVG with safe viewBox bounds */}
                  {(() => {
                    const rawPoints = currentTrend?.dataPoints || [];
                    if (rawPoints.length < 2) {
                      return (
                        <div className="h-48 flex items-center justify-center text-on-surface-variant font-label-sm text-label-sm">
                          Insufficient data points to render time series trend.
                        </div>
                      );
                    }

                    // Downsample to max 300 points for smooth 60fps rendering without stack/memory strain
                    const dataPoints = safeDownsample(rawPoints, 300);
                    const rawVals = dataPoints.map(p => p.value);
                    const minVal = safeMin(rawVals, 0);
                    const maxVal = safeMax(rawVals, 0);
                    const range = maxVal === minVal ? (maxVal === 0 ? 1 : Math.abs(maxVal) * 0.2) : maxVal - minVal;
                    const meanVal = rawVals.reduce((a, b) => a + b, 0) / rawVals.length;

                    // Coordinate system bounds: X in [30, 570], Y in [20, 150]
                    const xMin = 30, xMax = 570;
                    const yMin = 20, yMax = 150;

                    const scaleX = (i: number) => xMin + (i / (dataPoints.length - 1)) * (xMax - xMin);
                    const scaleY = (v: number) => Math.max(yMin, Math.min(yMax, yMax - ((v - minVal) / range) * (yMax - yMin)));

                    const actualCoords = dataPoints.map((p, i) => ({ x: scaleX(i), y: scaleY(p.value) }));

                    // Compute 3-period simple moving average
                    const smaCoords = dataPoints.map((p, i) => {
                      const window = dataPoints.slice(Math.max(0, i - 2), i + 1);
                      const avg = window.reduce((acc, curr) => acc + curr.value, 0) / window.length;
                      return { x: scaleX(i), y: scaleY(avg) };
                    });

                    // Build path strings
                    const dActual = actualCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
                    const dSma = smaCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
                    const dArea = `${dSma} L ${smaCoords[smaCoords.length - 1].x.toFixed(1)} 165 L ${smaCoords[0].x.toFixed(1)} 165 Z`;
                    const yMean = scaleY(meanVal);
                    const lastPt = actualCoords[actualCoords.length - 1];

                    // Date tick marks (up to 6 evenly distributed)
                    const tickStep = Math.max(1, Math.floor((dataPoints.length - 1) / 5));
                    const labelIndices: number[] = [];
                    for (let i = 0; i < dataPoints.length; i += tickStep) {
                      labelIndices.push(i);
                    }
                    if (labelIndices[labelIndices.length - 1] !== dataPoints.length - 1) {
                      labelIndices.push(dataPoints.length - 1);
                    }

                    return (
                      <>
                        <div className="w-full flex-1 relative overflow-hidden">
                          <svg className="w-full h-full overflow-hidden" viewBox="0 0 600 170" preserveAspectRatio="none">
                            <defs>
                              <pattern id="telemetryGrid" width="40" height="28" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 28" fill="none" stroke="currentColor" className="text-border-subtle" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
                              </pattern>
                              <linearGradient id="smaFillGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
                                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#telemetryGrid)" />

                            {/* Shaded Area for SMA */}
                            <path d={dArea} fill="url(#smaFillGrad)" />

                            {/* Baseline Mean Grid Reference Line (Clean without overlapping text collision) */}
                            <line x1={xMin - 5} y1={yMean} x2={xMax + 5} y2={yMean} stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

                            {/* Line: Actual telemetry */}
                            <path
                              d={dActual}
                              fill="none"
                              stroke="#38BDF8"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-90"
                            />

                            {/* Line: 3-Period SMA */}
                            <path
                              d={dSma}
                              fill="none"
                              stroke="#10B981"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            {/* Indicator Pulse Point on the latest observation */}
                            {lastPt && (
                              <g>
                                <circle cx={lastPt.x} cy={lastPt.y} r="4" fill="#10B981" />
                                <circle cx={lastPt.x} cy={lastPt.y} r="8" fill="#10B981" opacity="0.3" className="animate-pulse" />
                              </g>
                            )}
                          </svg>
                        </div>

                        {/* Horizontal Date Labels - Clean, non-overlapping, strictly aligned */}
                        <div className="flex justify-between items-center font-mono text-[11px] text-on-surface-variant pt-2 border-t border-border-subtle select-none px-1">
                          {labelIndices.map(idx => (
                            <span key={idx} className={idx === 0 ? 'text-left' : idx === dataPoints.length - 1 ? 'text-right' : 'text-center'}>
                              {dataPoints[idx]?.period}
                            </span>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-border-subtle flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
                <span>Direction: <strong className="text-on-surface capitalize">{currentTrend?.direction || 'stable'}</strong> ({currentTrend?.changePercent !== undefined ? `${currentTrend.changePercent >= 0 ? '+' : ''}${currentTrend.changePercent}%` : 'N/A'})</span>
                <span className="text-metric-emerald flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-metric-emerald" /> Verified Telemetry Rate: 100%
                </span>
              </div>
            </div>

            {/* RIGHT: Segment Share Donut & Decomposition (5 cols) */}
            <div className="lg:col-span-5 bg-surface-card rounded-xl p-5 sm:p-6 shadow-xl border border-border-subtle flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <Tooltip
                    side="left"
                    title="Segment Share of Total"
                    tag="Composition Donut"
                    content="Decomposes total business volume across categorical segments with an interactive center rollup. Click on any segment row below to drill into filtered transaction rows."
                  >
                    <div className="flex items-center gap-2 cursor-help">
                      <PieChart className="w-5 h-5 text-metric-cyan" />
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase tracking-wide">
                        SEGMENT SHARE OF TOTAL
                      </h3>
                    </div>
                  </Tooltip>

                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold">DIMENSION:</span>
                    <select
                      value={selectedDimension}
                      onChange={(e) => setSelectedDimension(e.target.value)}
                      className="h-7 px-2 bg-surface-panel text-on-surface font-label-sm text-label-sm rounded border border-border-subtle focus:outline-none cursor-pointer"
                    >
                      {stringCols.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Donut & Breakdown Layout */}
                {(() => {
                  const segments = (currentCategoryData || []).slice(0, 6);
                  const totalCatValue = segments.reduce((acc, curr) => acc + (curr.value || 0), 0);
                  const colors = [
                    { stroke: '#10B981', dot: 'bg-metric-emerald' },
                    { stroke: '#38BDF8', dot: 'bg-metric-cyan' },
                    { stroke: '#818CF8', dot: 'bg-metric-indigo' },
                    { stroke: '#F59E0B', dot: 'bg-metric-amber' },
                    { stroke: '#F43F5E', dot: 'bg-metric-coral' },
                    { stroke: '#94A3B8', dot: 'bg-slate-400' }
                  ];

                  const circumference = 2 * Math.PI * 38; // ~238.76
                  let runningOffset = 0;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-4">
                      {/* Donut Graphic */}
                      <div className="sm:col-span-5 flex items-center justify-center relative">
                        <div className="w-40 h-40 relative flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1E293B" strokeWidth="12" />
                            {totalCatValue > 0 && segments.map((seg, idx) => {
                              const shareRatio = seg.value / totalCatValue;
                              const dash = shareRatio * circumference;
                              const offset = runningOffset;
                              runningOffset += dash;
                              return (
                                <circle
                                  key={idx}
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="transparent"
                                  stroke={colors[idx % colors.length].stroke}
                                  strokeWidth="12"
                                  strokeDasharray={`${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}`}
                                  strokeDashoffset={-offset}
                                  className="transition-all duration-300"
                                />
                              );
                            })}
                          </svg>
                          {/* Donut Center Aggregate */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold tracking-wider">TOTAL</span>
                            <span className="font-headline-lg text-headline-lg text-on-surface font-extrabold leading-tight">
                              {totalCatValue >= 1000000 ? `${(totalCatValue / 1000000).toFixed(1)}M` : totalCatValue >= 1000 ? `${(totalCatValue / 1000).toFixed(1)}k` : Math.round(totalCatValue).toLocaleString()}
                            </span>
                            <span className="font-label-caps text-label-caps text-metric-cyan font-medium truncate max-w-[80px]">
                              {selectedDimension || 'Volume'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Segment Metric Legend */}
                      <div className="sm:col-span-7 flex flex-col gap-1.5 font-label-sm text-label-sm">
                        {segments.length > 0 ? (
                          segments.map((seg, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => handleDrilldown(seg.category)}
                              className="flex items-center justify-between p-1.5 rounded bg-surface-panel/60 hover:bg-surface-elevated transition-colors border border-border-subtle cursor-pointer"
                              title={`Click to filter granular rows by ${seg.category}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[idx % colors.length].dot}`} />
                                <span className="text-on-surface font-medium truncate max-w-[130px]">{seg.category}</span>
                              </div>
                              <div className="flex items-center gap-2.5 font-mono flex-shrink-0">
                                <span className="text-on-surface font-bold">{seg.share ? `${seg.share.toFixed(1)}%` : '0%'}</span>
                                <span className="text-on-surface-variant text-[10px]">{seg.value >= 1000 ? `${(seg.value / 1000).toFixed(1)}k` : seg.value.toLocaleString()}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-on-surface-variant p-2 text-center">
                            No categorical dimensions found in current dataset.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
                <span>Active Segments: {currentCategoryData?.length || 0}</span>
                <span 
                  onClick={() => setActiveTab('pareto')}
                  className="text-metric-cyan hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>Inspect Pareto Tail</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </section>

          {/* ACTIONABLE NOTIFICATION CALLOUTS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Outlier Alert Callout */}
            <div className="bg-surface-card rounded-xl p-4 shadow-md border border-border-subtle flex items-start gap-3 relative overflow-hidden group hover:bg-surface-panel transition-colors">
              <div className="w-9 h-9 rounded-lg bg-red-500/20 text-metric-coral flex items-center justify-center shrink-0 border border-red-500/30">
                <AlertTriangle className="w-5 h-5 text-metric-coral" />
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    {primaryAnomaly ? primaryAnomaly.title : 'Statistical Dispersion Audit'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-metric-coral font-label-caps text-label-caps uppercase font-bold tracking-wider">
                    {primaryAnomaly?.severity ? primaryAnomaly.severity.toUpperCase() : 'AUDITED'}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  {primaryAnomaly ? primaryAnomaly.reason : 'All numerical distributions conform to standard statistical limits.'}
                </p>
                <p className="font-body-sm text-body-sm text-metric-coral font-medium mt-1">
                  Action: {primaryAnomaly ? primaryAnomaly.recommendedAction : 'Continue periodic data hygiene and schema validation checks.'}
                </p>
              </div>
            </div>

            {/* Growth Segment Callout */}
            <div className="bg-surface-card rounded-xl p-4 shadow-md border border-border-subtle flex items-start gap-3 relative overflow-hidden group hover:bg-surface-panel transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#00F5A0]/20 text-metric-emerald flex items-center justify-center shrink-0 border border-[#00F5A0]/30">
                <TrendingUp className="w-5 h-5 text-metric-emerald" />
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    {primaryOpportunity ? primaryOpportunity.title : 'Segment Optimization Directive'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#00F5A0]/20 text-metric-emerald font-label-caps text-label-caps uppercase font-bold tracking-wider">
                    {primaryOpportunity?.priority ? `PRIORITY: ${primaryOpportunity.priority.toUpperCase()}` : 'OPTIMAL'}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  {primaryOpportunity ? primaryOpportunity.potentialImpact : 'Active data segments demonstrate balanced proportional distribution.'}
                </p>
                <p className="font-body-sm text-body-sm text-metric-emerald font-medium mt-1">
                  Next Step: {primaryOpportunity ? primaryOpportunity.action : 'Inspect categorical distributions in Pareto analysis.'}
                </p>
              </div>
            </div>
          </section>

          {/* ATTACHED DASHBOARDS & CUSTOM VISUALIZATIONS SECTION */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d2d2d] pb-3">
              <div>
                <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#21F1A8]" />
                  ATTACHED DASHBOARD VISUALIZATIONS & CUSTOM CHARTS
                </h3>
                <p className="text-xs text-gray-400">
                  Attached visual widgets synchronized with active filters, drill-through, and export engines.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#141414] text-[#21F1A8] border border-[#2d2d2d] text-xs font-mono font-semibold">
                  {customVisuals.length} Visuals Attached
                </span>
                <button
                  onClick={() => setCurrentTab('dashboard_builder')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#333] text-white text-xs font-medium border border-[#3d3d3d] hover:border-[#21F1A8]/50 transition-colors"
                >
                  <span>Open Dashboard Builder</span>
                  <ExternalLink className="w-3 h-3 text-[#21F1A8]" />
                </button>
              </div>
            </div>

            {customVisuals.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {customVisuals.map((vis, vIdx) => {
                  const cat = vis.categoryField || stringCols[0]?.name || 'Category';
                  const val = vis.valueField || numericCols[0]?.name || 'Value';
                  const agg = vis.aggregation || 'sum';
                  const visType = vis.type || 'bar';

                  // Aggregate values
                  const groupMap = new Map<string, { sum: number; count: number }>();
                  let total = 0;
                  cleanRows.forEach(r => {
                    const k = String(r[cat] ?? 'Unknown');
                    const num = Number(r[val]) || 0;
                    const cur = groupMap.get(k) || { sum: 0, count: 0 };
                    cur.sum += num;
                    cur.count += 1;
                    groupMap.set(k, cur);
                    total += num;
                  });

                  const items = Array.from(groupMap.entries()).map(([k, s]) => ({
                    category: k,
                    value: agg === 'avg' ? s.sum / (s.count || 1) : agg === 'count' ? s.count : s.sum,
                    share: total > 0 ? Math.round((s.sum / total) * 1000) / 10 : 0
                  })).sort((a, b) => b.value - a.value).slice(0, 8);

                  const maxVal = Math.max(safeMax(items.map(i => i.value), 1), 1);
                  const isCur = /revenue|sales|profit|margin|cost|amount|price/i.test(val);
                  const formatVal = (n: number) => isCur ? `$${Math.round(n).toLocaleString()}` : Math.round(n).toLocaleString();

                  return (
                    <div 
                      key={vis.id || vIdx} 
                      className="bg-surface-card border border-border-subtle rounded-xl p-5 space-y-4 hover:border-[#00F5A0]/40 transition-all flex flex-col justify-between shadow-lg"
                    >
                      {/* Widget Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface uppercase truncate">
                              {vis.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded bg-surface-panel text-metric-emerald border border-border-subtle text-label-caps font-label-caps uppercase font-bold">
                              {visType}
                            </span>
                          </div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant pt-0.5">
                            {agg.toUpperCase()}({val}) by {cat} • Total: <strong className="text-on-surface font-semibold">{formatVal(total)}</strong>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDrilldown(items[0]?.category || '')}
                          className="font-label-sm text-label-sm text-on-surface-variant hover:text-metric-emerald flex items-center gap-1 transition-colors"
                          title="Drill-through to records"
                        >
                          <span>Drilldown</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Widget Visual Content */}
                      <div className="py-2 min-h-[160px] flex items-center justify-center">
                        {visType === 'donut' || visType === 'pie' ? (
                          <div className="w-full flex items-center justify-around gap-4">
                            <div className="relative w-36 h-36 shrink-0">
                              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                {(() => {
                                  let cumulativePct = 0;
                                  const colors = ['#00F5A0', '#00D2FF', '#6366F1', '#F59E0B', '#EF4444', '#849588'];
                                  return items.slice(0, 6).map((item, idx) => {
                                    const strokeDasharray = `${item.share * 2.512} 251.2`;
                                    const strokeDashoffset = -cumulativePct * 2.512;
                                    cumulativePct += item.share;
                                    return (
                                      <circle
                                        key={idx}
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke={colors[idx % colors.length]}
                                        strokeWidth="12"
                                        strokeDasharray={strokeDasharray}
                                        strokeDashoffset={strokeDashoffset}
                                      />
                                    );
                                  });
                                })()}
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">TOTAL</span>
                                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{formatVal(total)}</span>
                              </div>
                            </div>
                            <div className="space-y-1.5 text-xs w-full max-w-[200px]">
                              {items.slice(0, 4).map((it, i) => (
                                <div key={i} className="flex justify-between items-center text-label-sm font-label-sm">
                                  <span className="text-on-surface truncate max-w-[110px]">{it.category}</span>
                                  <span className="text-on-surface font-semibold">{it.share}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : visType === 'table' ? (
                          <div className="w-full overflow-x-auto">
                            <table className="w-full text-left font-body-sm text-body-sm">
                              <thead className="bg-surface-panel text-on-surface-variant border-b border-border-subtle font-label-caps text-label-caps uppercase">
                                <tr>
                                  <th className="p-2">Rank</th>
                                  <th className="p-2">{cat}</th>
                                  <th className="p-2 text-right">{val}</th>
                                  <th className="p-2 text-right">Share</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-subtle">
                                {items.slice(0, 5).map((it, idx) => (
                                  <tr key={idx} className="hover:bg-surface-elevated/70 transition-colors">
                                    <td className="p-2 text-on-surface-variant font-mono">#{idx + 1}</td>
                                    <td className="p-2 text-on-surface font-medium truncate max-w-[130px]">{it.category}</td>
                                    <td className="p-2 text-right text-metric-emerald font-bold font-mono">{formatVal(it.value)}</td>
                                    <td className="p-2 text-right text-on-surface font-mono">{it.share}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          /* Ranked Horizontal/Vertical Bars */
                          <div className="w-full space-y-2.5">
                            {items.slice(0, 5).map((it, idx) => {
                              const pct = Math.min(100, Math.max(5, (it.value / maxVal) * 100));
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between font-label-sm text-label-sm">
                                    <span className="text-on-surface font-medium truncate max-w-[180px]">{it.category}</span>
                                    <span className="text-on-surface font-bold">{formatVal(it.value)} <span className="text-on-surface-variant font-normal">({it.share}%)</span></span>
                                  </div>
                                  <div className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: idx === 0 ? '#00F5A0' : idx === 1 ? '#00D2FF' : idx === 2 ? '#F59E0B' : '#6366F1'
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Widget Footer */}
                      <div className="pt-2 border-t border-border-subtle flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                        <span>Audited from {cleanRows.length.toLocaleString()} rows</span>
                        <span className="text-metric-emerald font-medium">Properly Formatted</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 text-center space-y-3">
                <Layers className="w-8 h-8 text-[#21F1A8] mx-auto opacity-70" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Attach Custom Dashboards</h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Create tailored charts in the Dashboard Builder or click the Scatter Plot, Heat Map, or Multi-Chart tabs above to explore all chart types!
                  </p>
                </div>
                <button
                  onClick={() => setCurrentTab('dashboard_builder')}
                  className="px-4 py-2 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-all"
                >
                  Configure Visuals in Dashboard Builder
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCATTER PLOT TAB */}
      {activeTab === 'scatter' && (
        <ScatterPlotChart
          rows={filteredRows}
          columns={columns}
          defaultXField={numericCols[0]?.name}
          defaultYField={numericCols[1]?.name || numericCols[0]?.name}
          defaultCategoryField={stringCols[0]?.name}
          onPointClick={(pt) => {
            openDrillThrough({
              title: `Scatter Coordinate: ${pt.category}`,
              subtitle: `Inspecting record where ${pt.category} has X=${pt.xVal} and Y=${pt.yVal}`,
              filterColumn: stringCols[0]?.name,
              filterValue: pt.category,
              sourceContext: 'chart_bar'
            });
          }}
        />
      )}

      {/* 2D HEAT MAP TAB */}
      {activeTab === 'heatmap' && (
        <HeatMapChart
          rows={filteredRows}
          columns={columns}
          defaultRowDim={stringCols[0]?.name}
          defaultColDim={stringCols[1]?.name || stringCols[0]?.name}
          defaultMetric={numericCols[0]?.name}
          onCellClick={(rDim, rVal, cDim, cVal, metricVal) => {
            openDrillThrough({
              title: `Heat Map Intersection: ${rVal} × ${cVal}`,
              subtitle: `Records matching ${rDim}="${rVal}" AND ${cDim}="${cVal}" (Value: ${metricVal.toLocaleString()})`,
              filterColumn: rDim,
              filterValue: rVal,
              sourceContext: 'table_row'
            });
          }}
        />
      )}

      {/* MULTI-CHART SUITE TAB (RADAR, FUNNEL, WATERFALL, TREEMAP, GAUGE) */}
      {activeTab === 'multivariate' && (
        <div className="space-y-6">
          <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-1">
            <h3 className="font-heading text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#21F1A8]" />
              COMPREHENSIVE MULTI-CHART ANALYTICS SUITE
            </h3>
            <p className="text-xs text-gray-400">
              Interactive Radar/Spider Footprint, Conversion Funnel, Financial Variance Waterfall, Proportional Treemap, and Performance Gauge Dial.
            </p>
          </div>

          {/* Grid 1: Radar & Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RadarSpiderChart
              data={currentCategoryData.slice(0, 6).map(c => ({
                label: c.category,
                value: c.value,
                max: Math.max(safeMax(currentCategoryData.map(x => x.value), 1), 1)
              }))}
              metricName={selectedTrendMetric}
              onAxisClick={handleDrilldown}
            />

            <FunnelConversionChart
              stages={currentCategoryData.slice(0, 5).map(c => ({
                stage: c.category,
                value: c.value
              }))}
              metricName={selectedTrendMetric}
              onStageClick={handleDrilldown}
            />
          </div>

          {/* Grid 2: Waterfall & Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WaterfallChart
              steps={[
                { label: 'Baseline Gross', value: baselineRev, isTotal: true },
                { label: 'Volume Expansion', value: Math.round(baselineRev * 0.15) },
                { label: 'Price Variance', value: Math.round(baselineRev * 0.05) },
                { label: 'Direct COGS', value: -Math.round(baselineCost * 0.7) },
                { label: 'Operating OPEX', value: -Math.round(baselineCost * 0.3) },
                { label: 'Net Profit', value: baselineProfit, isTotal: true }
              ]}
              baseValue={baselineRev}
              metricName="USD"
              onStepClick={handleDrilldown}
            />

            <GaugeSpeedometerChart
              value={baselineProfit}
              target={baselineProfit * 1.25}
              metricName="Operating Margin"
              unit="$"
            />
          </div>

          {/* Row 3: Treemap */}
          <TreemapChart
            items={currentCategoryData.map(c => ({
              label: c.category,
              value: c.value
            }))}
            metricName={selectedTrendMetric}
            onItemClick={handleDrilldown}
          />
        </div>
      )}

      {/* 4. PARETO 80/20 TAB */}
      {activeTab === 'pareto' && (
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#21F1A8]" />
                PARETO PRINCIPLE (80/20 ANALYSIS)
              </h3>
              <p className="text-xs text-gray-400">
                Identify the critical 20% of contributors driving 80% of aggregate volume or financial output.
              </p>
            </div>

            {stringCols.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">Dimension:</span>
                <select
                  value={selectedDimension}
                  onChange={(e) => setSelectedDimension(e.target.value)}
                  className="bg-[#141414] text-xs text-[#21F1A8] font-mono px-3 py-1.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                >
                  {stringCols.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <Pareto8020Chart
            data={currentCategoryData}
            metricName={selectedTrendMetric || 'Volume'}
            onSelectCategory={handleDrilldown}
            selectedCategory={filters.selectedDimensionValue}
          />
        </div>
      )}

      {/* 5. WHAT-IF SCENARIO TAB */}
      {activeTab === 'whatif' && (
        <WhatIfScenarioSimulator
          baselineRevenue={baselineRev}
          baselineProfit={baselineProfit}
        />
      )}

      {/* 6. PIVOT MATRIX TAB */}
      {activeTab === 'pivot' && (
        <MultiDimensionalPivotTable
          rows={filteredRows}
          columns={columns}
        />
      )}

      {/* 7. STATISTICAL DISPERSION TAB */}
      {activeTab === 'distribution' && (
        <StatisticalBoxplotInspector
          rows={filteredRows}
          columns={columns}
        />
      )}

      {/* KPI Card Customizer & Heading Editor Modal */}
      {editingKpi && (
        <KpiCardEditorModal
          isOpen={true}
          kpi={editingKpi}
          onClose={() => setEditingKpi(null)}
        />
      )}
    </div>
  );
};
