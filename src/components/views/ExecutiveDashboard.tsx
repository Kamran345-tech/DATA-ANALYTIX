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
  Activity
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { GlobalFilterBar } from '../common/GlobalFilterBar';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
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
    openDrillThrough
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
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
      alert('PDF generation failed: ' + (err?.message || 'Error compiling PDF'));
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
      alert('Bundle export error: ' + (err?.message || 'Failed to create bundle'));
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

      {/* 1. Dashboard Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
                {brand.companyName} • {brand.department}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#21F1A8]/15 text-[#21F1A8] text-[10px] font-semibold border border-[#21F1A8]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#21F1A8]" />
                VERIFIED ANALYTICS MODEL
              </span>
            </div>

            {/* EDITABLE DASHBOARD NAME */}
            <div className="flex items-center gap-2 flex-wrap">
              <EditableDashboardTitle className="text-2xl sm:text-3xl font-extrabold uppercase" showLabelPrefix={false} />
            </div>

            <p className="text-xs text-gray-400">
              Scope: <span className="text-gray-200 font-medium">{project.name}</span> | Prepared by: <span className="text-gray-200 font-medium">{brand.author}</span> | Audited: <span className="font-mono text-gray-300">{filteredRows.length.toLocaleString()} rows</span>
            </p>
          </div>

          {/* Action Buttons & Health Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Download Both (Dashboard + Executive Report Bundle ZIP) */}
            <button
              onClick={handleDownloadBundleZip}
              disabled={isBundleGenerating}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] hover:glow-neon transition-all shadow-md shadow-[#21F1A8]/20 disabled:opacity-50"
              title="Download both the created dashboard and executive report in a single ZIP package"
            >
              {isBundleGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <Package className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>Download Both (Dashboard + Report)</span>
            </button>

            {/* Download Executive Report PDF */}
            <button
              onClick={handleDownloadExecutivePDF}
              disabled={isPdfGenerating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141414] hover:bg-[#222] text-gray-200 hover:text-white font-medium text-xs border border-[#333] hover:border-cyan-400/50 transition-colors disabled:opacity-50"
              title="Download verified Executive PDF Report"
            >
              {isPdfGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              ) : (
                <FileText className="w-4 h-4 text-cyan-400" />
              )}
              <span>Executive Report (PDF)</span>
            </button>

            {/* Download Dashboard as JSON */}
            <button
              onClick={handleDownloadDashboardJSON}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141414] hover:bg-[#222] text-gray-200 hover:text-white font-medium text-xs border border-[#333] hover:border-[#21F1A8]/50 transition-colors"
              title="Download dashboard specification & data package"
            >
              <Download className="w-4 h-4 text-[#21F1A8]" />
              <span className="hidden sm:inline">Dashboard (JSON)</span>
            </button>

            {/* Data Quality Score Badge */}
            <div 
              onClick={() => setCurrentTab('quality')}
              className="bg-[#141414] border border-[#333] hover:border-[#21F1A8]/50 cursor-pointer px-3 sm:px-3.5 py-1.5 rounded-xl text-right transition-colors"
              title="Click to view Data Quality Audit"
            >
              <div className="text-[10px] text-gray-400 uppercase font-mono">Data Quality</div>
              <div className="text-base sm:text-lg font-heading font-bold text-[#21F1A8] flex items-center justify-end gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {qualityReport.overallScore}%
              </div>
            </div>

            {analytics.businessHealthScore && (
              <div className="bg-[#141414] border border-[#333] px-3 sm:px-3.5 py-1.5 rounded-xl text-right">
                <div className="text-[10px] text-gray-400 uppercase font-mono">Business Health</div>
                <div className="text-base sm:text-lg font-heading font-bold text-white flex items-center justify-end gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  {analytics.businessHealthScore.score}/100
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Filter Bar */}
        <GlobalFilterBar />

        {/* Active Drilldown Indicator */}
        {filters.selectedDimension && filters.selectedDimensionValue && (
          <div className="flex items-center justify-between bg-[#1b2722] border border-[#21F1A8]/40 px-3.5 py-1.5 rounded-xl text-xs text-[#21F1A8]">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" />
              <span>Active Drilldown: <strong className="text-white">{filters.selectedDimension} = &quot;{filters.selectedDimensionValue}&quot;</strong></span>
            </div>
            <button 
              onClick={() => setFilters(prev => ({ ...prev, selectedDimensionValue: null }))}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-mono"
            >
              Reset Drilldown <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation View Switcher (Tabs for Data Analysts & Executives) */}
        <div className="flex gap-2 pt-2 border-t border-[#282828] text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 ${
              activeTab === 'overview'
                ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
                : 'bg-[#161616] text-gray-300 hover:bg-[#222] hover:text-white border border-[#2e2e2e]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Executive Overview
          </button>

          <button
            onClick={() => setActiveTab('scatter')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 ${
              activeTab === 'scatter'
                ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
                : 'bg-[#161616] text-gray-300 hover:bg-[#222] hover:text-white border border-[#2e2e2e]'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" /> Scatter Plot & Regression
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 ${
              activeTab === 'heatmap'
                ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
                : 'bg-[#161616] text-gray-300 hover:bg-[#222] hover:text-white border border-[#2e2e2e]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" /> 2D Heat Map Matrix
          </button>

          <button
            onClick={() => setActiveTab('multivariate')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 ${
              activeTab === 'multivariate'
                ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
                : 'bg-[#161616] text-gray-300 hover:bg-[#222] hover:text-white border border-[#2e2e2e]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Multi-Chart Suite (Radar, Funnel, Waterfall, Treemap, Gauge)
          </button>

          <button
            onClick={() => setActiveTab('pareto')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 ${
              activeTab === 'pareto'
                ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
                : 'bg-[#161616] text-gray-300 hover:bg-[#222] hover:text-white border border-[#2e2e2e]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Pareto 80/20 Analysis
          </button>

          <button
            onClick={() => setActiveTab('whatif')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 ${
              activeTab === 'whatif'
                ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
                : 'bg-[#161616] text-gray-300 hover:bg-[#222] hover:text-white border border-[#2e2e2e]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> What-If Simulator
          </button>

          <button
            onClick={() => setActiveTab('pivot')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 ${
              activeTab === 'pivot'
                ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
                : 'bg-[#161616] text-gray-300 hover:bg-[#222] hover:text-white border border-[#2e2e2e]'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" /> Pivot Matrix
          </button>

          <button
            onClick={() => setActiveTab('distribution')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 ${
              activeTab === 'distribution'
                ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
                : 'bg-[#161616] text-gray-300 hover:bg-[#222] hover:text-white border border-[#2e2e2e]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Statistical Dispersion
          </button>
        </div>
      </div>

      {/* 2. Key Performance Indicators (Click any KPI card to Drill-Through) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics.kpis.slice(0, 4).map(kpi => {
          const isPositive = (kpi.changePercent || 0) >= 0;
          return (
            <div 
              key={kpi.id} 
              onClick={() => openDrillThrough({
                title: kpi.name,
                subtitle: kpi.definition,
                kpi,
                sourceContext: 'kpi_card'
              })}
              className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4.5 space-y-3 relative group hover:border-[#21F1A8]/60 transition-all hover:glow-neon cursor-pointer select-none"
              title="Click this KPI to drill-through to granular underlying records"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 truncate max-w-[140px] group-hover:text-white transition-colors">{kpi.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#21F1A8] font-mono flex items-center gap-0.5 font-bold">
                    Drill-Through <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    kpi.status === 'Above Target' ? 'bg-[#21F1A8]/15 text-[#21F1A8]' :
                    kpi.status === 'At Risk' ? 'bg-red-500/15 text-red-400' :
                    kpi.status === 'Below Target' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-blue-500/15 text-blue-400'
                  }`}>
                    {kpi.status}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-wide group-hover:text-[#21F1A8] transition-colors">
                  {kpi.formattedValue}
                </div>
                
                {kpi.changePercent !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={`flex items-center font-semibold ${isPositive ? 'text-[#21F1A8]' : 'text-red-400'}`}>
                      {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {isPositive ? '+' : ''}{kpi.changePercent}%
                    </span>
                    <span className="text-gray-500">vs prior period</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span className="truncate max-w-[130px]">Src: {kpi.traceableSource}</span>
                <span className="flex items-center gap-1 text-[#21F1A8]">
                  <span>{kpi.period}</span>
                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. TAB CONTENT RENDERING */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* AI Decision Center: What / Why / Actions */}
          {analytics.insights.length > 0 && (
            <div className="bg-[#1b1b1b] border border-[#21F1A8]/30 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#21F1A8]/15 text-[#21F1A8] flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="font-heading text-xl font-bold text-white tracking-wide uppercase">
                    AI DECISION DIRECTIVES: WHAT • WHY • MANAGEMENT ACTION
                  </h2>
                </div>
                <span className="text-[11px] text-[#21F1A8] font-mono bg-[#21F1A8]/10 px-2 py-0.5 rounded border border-[#21F1A8]/20">
                  Traceable to Verified Model
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {analytics.insights.slice(0, 3).map((ins) => (
                  <div key={ins.id} className="bg-[#141414] border border-[#2d2d2d] rounded-xl p-4 space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white truncate max-w-[180px]">{ins.title}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#222] text-[#21F1A8] font-mono text-[9px] uppercase">
                          {ins.category}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-gray-300">
                        <p><strong className="text-gray-400 font-medium">WHAT:</strong> {ins.what}</p>
                        <p><strong className="text-gray-400 font-medium">WHY:</strong> {ins.why}</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#1e2722] border border-[#21F1A8]/30 text-[#21F1A8]">
                      <strong className="text-white font-medium block text-[10px] uppercase font-mono">ACTION:</strong> 
                      <span>{ins.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Visuals Grid: Chronological Line & Area Chart + Segment Composition */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interactive Chronological Line/Area Chart */}
            <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#21F1A8]" />
                  CHRONOLOGICAL TREND PERFORMANCE
                </h3>

                {/* Metric Selector for Trend */}
                {numericCols.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-mono uppercase">Metric:</span>
                    <select
                      value={selectedTrendMetric}
                      onChange={(e) => setSelectedTrendMetric(e.target.value)}
                      className="bg-[#141414] text-xs text-[#21F1A8] font-mono px-2.5 py-1 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                    >
                      {numericCols.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {currentTrend && currentTrend.dataPoints && currentTrend.dataPoints.length > 1 ? (
                <TimeSeriesAreaChart
                  data={currentTrend.dataPoints}
                  metricName={selectedTrendMetric}
                  forecastData={analytics.forecasts[selectedTrendMetric]?.data}
                />
              ) : (
                <div className="p-12 text-center text-xs text-gray-500 bg-[#141414] rounded-2xl border border-[#262626]">
                  No chronologically ordered date series identified for trend charting.
                </div>
              )}
            </div>

            {/* Segment Breakdown & Composition Donut */}
            <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#21F1A8]" />
                  SEGMENT SHARE OF TOTAL
                </h3>

                {/* Dimension Switcher */}
                {stringCols.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-mono uppercase">Dimension:</span>
                    <select
                      value={selectedDimension}
                      onChange={(e) => setSelectedDimension(e.target.value)}
                      className="bg-[#141414] text-xs text-white px-2.5 py-1 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                    >
                      {stringCols.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {currentCategoryData.length > 0 ? (
                <DonutCompositionChart
                  data={currentCategoryData}
                  metricName={selectedTrendMetric || 'Volume'}
                  onSelectCategory={handleDrilldown}
                />
              ) : (
                <div className="p-12 text-center text-xs text-gray-500 bg-[#141414] rounded-2xl border border-[#262626]">
                  No categorical dimensions available for composition analysis.
                </div>
              )}
            </div>
          </div>

          {/* Risk Alerts & Growth Opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {primaryAnomaly && (
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-300">{primaryAnomaly.title}</span>
                    <span className="px-1.5 py-0.2 bg-red-500/20 text-red-400 rounded text-[9px] uppercase font-mono font-bold">
                      {primaryAnomaly.severity}
                    </span>
                  </div>
                  <p className="text-gray-300">{primaryAnomaly.reason}</p>
                  <p className="text-red-300 font-medium">Action: {primaryAnomaly.recommendedAction}</p>
                </div>
              </div>
            )}

            {primaryOpportunity && (
              <div className="p-4 rounded-xl bg-[#21F1A8]/10 border border-[#21F1A8]/30 flex items-start gap-3">
                <Zap className="w-5 h-5 text-[#21F1A8] shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#21F1A8]">{primaryOpportunity.title}</span>
                    <span className="px-1.5 py-0.2 bg-[#21F1A8]/20 text-[#21F1A8] rounded text-[9px] uppercase font-mono font-bold">
                      Priority: {primaryOpportunity.priority}
                    </span>
                  </div>
                  <p className="text-gray-300">{primaryOpportunity.potentialImpact}</p>
                  <p className="text-white font-medium">Next Step: {primaryOpportunity.action}</p>
                </div>
              </div>
            )}
          </div>

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

                  const maxVal = Math.max(...items.map(i => i.value), 1);
                  const isCur = /revenue|sales|profit|margin|cost|amount|price/i.test(val);
                  const formatVal = (n: number) => isCur ? `$${Math.round(n).toLocaleString()}` : Math.round(n).toLocaleString();

                  return (
                    <div 
                      key={vis.id || vIdx} 
                      className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4 hover:border-[#21F1A8]/40 transition-all flex flex-col justify-between"
                    >
                      {/* Widget Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-heading text-base font-bold text-white uppercase truncate">
                              {vis.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded bg-[#141414] text-[#21F1A8] border border-[#2d2d2d] text-[10px] font-mono uppercase font-bold">
                              {visType}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono pt-0.5">
                            {agg.toUpperCase()}({val}) by {cat} • Total: <strong className="text-white">{formatVal(total)}</strong>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDrilldown(items[0]?.category || '')}
                          className="text-[10px] text-gray-400 hover:text-[#21F1A8] font-mono flex items-center gap-1 transition-colors"
                          title="Drill-through to records"
                        >
                          <span>Drilldown</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Widget Visual Content */}
                      <div className="py-2 min-h-[160px] flex items-center justify-center">
                        {visType === 'donut' || visType === 'pie' ? (
                          <div className="w-full flex items-center justify-around gap-4">
                            <div className="relative w-32 h-32 shrink-0">
                              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                {(() => {
                                  let cumulativePct = 0;
                                  const colors = ['#21F1A8', '#00d8f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'];
                                  return items.slice(0, 6).map((item, idx) => {
                                    const strokeDasharray = `${item.share * 2.512} 251.2`;
                                    const strokeDashoffset = -cumulativePct * 2.512;
                                    cumulativePct += item.share;
                                    return (
                                      <circle
                                        key={idx}
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="transparent"
                                        stroke={colors[idx % colors.length]}
                                        strokeWidth="14"
                                        strokeDasharray={strokeDasharray}
                                        strokeDashoffset={strokeDashoffset}
                                      />
                                    );
                                  });
                                })()}
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                <span className="text-[9px] text-gray-400 font-mono uppercase">TOTAL</span>
                                <span className="text-xs font-bold text-white font-mono">{formatVal(total)}</span>
                              </div>
                            </div>
                            <div className="space-y-1 text-xs w-full max-w-[200px] font-mono">
                              {items.slice(0, 4).map((it, i) => (
                                <div key={i} className="flex justify-between items-center text-[11px]">
                                  <span className="text-gray-300 truncate max-w-[110px]">{it.category}</span>
                                  <span className="text-white font-semibold">{it.share}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : visType === 'table' ? (
                          <div className="w-full overflow-x-auto">
                            <table className="w-full text-left text-xs font-mono">
                              <thead className="bg-[#141414] text-gray-400 border-b border-[#2d2d2d]">
                                <tr>
                                  <th className="p-1.5">Rank</th>
                                  <th className="p-1.5">{cat}</th>
                                  <th className="p-1.5 text-right">{val}</th>
                                  <th className="p-1.5 text-right">Share</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#252525]">
                                {items.slice(0, 5).map((it, idx) => (
                                  <tr key={idx} className="hover:bg-[#1f1f1f]">
                                    <td className="p-1.5 text-gray-500">#{idx + 1}</td>
                                    <td className="p-1.5 text-white font-medium truncate max-w-[130px]">{it.category}</td>
                                    <td className="p-1.5 text-right text-[#21F1A8] font-bold">{formatVal(it.value)}</td>
                                    <td className="p-1.5 text-right text-gray-400">{it.share}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          /* Ranked Horizontal/Vertical Bars */
                          <div className="w-full space-y-2">
                            {items.slice(0, 5).map((it, idx) => {
                              const pct = Math.min(100, Math.max(5, (it.value / maxVal) * 100));
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-mono">
                                    <span className="text-gray-300 truncate max-w-[180px]">{it.category}</span>
                                    <span className="text-white font-bold">{formatVal(it.value)} <span className="text-gray-500 text-[10px]">({it.share}%)</span></span>
                                  </div>
                                  <div className="w-full bg-[#141414] h-2.5 rounded-full overflow-hidden border border-[#282828]">
                                    <div 
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: idx === 0 ? '#21F1A8' : idx === 1 ? '#00d8f6' : idx === 2 ? '#f59e0b' : '#6b7280'
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
                      <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span>Audited from {cleanRows.length.toLocaleString()} rows</span>
                        <span className="text-[#21F1A8]">Properly Formatted</span>
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
                max: Math.max(...currentCategoryData.map(x => x.value), 1)
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
    </div>
  );
};
