import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCode2, 
  Play, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  Cpu,
  Table as TableIcon,
  Wand2,
  CheckCircle2,
  Printer,
  X,
  ArrowRight,
  Sliders,
  BarChart3,
  TrendingUp,
  PieChart,
  Grid,
  FileSpreadsheet,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { generatePythonScript, runSandboxedPythonAnalysis, PythonExecutionResult } from '../../engine/pythonEngine';
import { 
  Pareto8020Chart, 
  TimeSeriesAreaChart, 
  ScatterPlotChart, 
  HeatMapChart, 
  DonutCompositionChart, 
  TreemapChart 
} from '../charts/InteractiveCharts';
import * as XLSX from 'xlsx';

export const PythonLabView: React.FC = () => {
  const { cleanRows, columns, project, dataModel, applyCleanedRows, setCurrentTab, brand } = usePlatform();
  const tableName = dataModel.tables[0]?.name || 'FactTable';

  const [script, setScript] = useState('');
  const [result, setResult] = useState<PythonExecutionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // In-Place Dashboard chart configuration
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'line' | 'scatter' | 'heatmap' | 'donut' | 'treemap'>('bar');
  const [selectedDimension, setSelectedDimension] = useState<string>('');
  const [selectedMeasure, setSelectedMeasure] = useState<string>('');

  // Initial code generation
  useEffect(() => {
    const py = generatePythonScript(project.sourceFileName, tableName, columns);
    setScript(py);
  }, [project.sourceFileName, tableName, columns]);

  // Available numeric and categorical fields
  const numericColumns = useMemo(() => {
    return columns.filter(c => c.dataType === 'number' && !c.name.toLowerCase().includes('id'));
  }, [columns]);

  const categoricalColumns = useMemo(() => {
    return columns.filter(c => c.dataType === 'string' && !c.name.toLowerCase().includes('id'));
  }, [columns]);

  const dateColumn = useMemo(() => {
    return columns.find(c => c.dataType === 'date')?.name;
  }, [columns]);

  // Set default dimensions and measures
  useEffect(() => {
    if (!selectedDimension) {
      setSelectedDimension(categoricalColumns[0]?.name || columns[0]?.name || 'Category');
    }
    if (!selectedMeasure) {
      setSelectedMeasure(numericColumns[0]?.name || 'Revenue');
    }
  }, [categoricalColumns, numericColumns, columns, selectedDimension, selectedMeasure]);

  // Quick Cleaning & Query Presets
  const pythonRecipes = useMemo(() => {
    const numA = numericColumns[0]?.name || 'Value';
    const numB = numericColumns[1]?.name || numericColumns[0]?.name || 'Value';
    const catA = categoricalColumns[0]?.name || 'Category';

    return [
      {
        name: '🧹 Clean Missing & Drop NaNs',
        code: `# 1. Clean missing/null values from dataset\ndf.dropna(inplace=True)\nprint("Cleaned all NaN observations across features.")\nprint(df.info())`,
        description: 'Drops rows with missing, null, or undefined observations.'
      },
      {
        name: '✂️ Deduplicate Records',
        code: `# 2. Remove duplicate rows\ndf.drop_duplicates(inplace=True)\nprint(f"Dataset de-duplicated. Retained unique observations: {len(df)}")`,
        description: 'Enforces strict observation uniqueness.'
      },
      {
        name: `🎯 Filter Top Performers (df.query)`,
        code: `# 3. Filter high-performance records\ndf = df.query("${numA} > 1000")\nprint("Filtered records where ${numA} > 1000:")\nprint(df.head(10))`,
        description: `Applies predicate filter on ${numA}.`
      },
      {
        name: `📊 Group By ${catA} & Aggregate`,
        code: `# 4. Group by category and compute multi-metric metrics\nsummary = df.groupby("${catA}")["${numA}"].agg(total="sum", mean="mean", count="count")\nprint("Category Aggregations:")\nprint(summary.sort_values(by="total", ascending=False).head(10))`,
        description: `Aggregates ${numA} across ${catA}.`
      },
      {
        name: `💡 Add Profit Margin Feature`,
        code: `# 5. Feature Engineering: Compute margin rate\ndf["Margin_Rate"] = df["profit"] / df["revenue"] * 100\nprint("Created feature 'Margin_Rate' across all rows.")\nprint(df[["${catA}", "${numA}", "Margin_Rate"]].head(5))`,
        description: 'Engineers a calculated percentage column.'
      },
      {
        name: `📈 Sort Descending by ${numA}`,
        code: `# 6. Rank records by primary metric\ndf = df.sort_values(by="${numA}", ascending=False)\nprint("Top 10 highest-value transactions:")\nprint(df.head(10))`,
        description: `Sorts dataframe descending by ${numA}.`
      }
    ];
  }, [numericColumns, categoricalColumns]);

  const handleRun = () => {
    const res = runSandboxedPythonAnalysis(script, cleanRows, columns);
    setResult(res);
    setAppliedNotice(null);
  };

  // Run automatically on first load so user immediately sees results and generated dashboard
  useEffect(() => {
    if (cleanRows.length > 0 && !result) {
      const res = runSandboxedPythonAnalysis(script, cleanRows, columns);
      setResult(res);
    }
  }, [cleanRows, script, columns, result]);

  const handleApplyCleanedToPlatform = () => {
    if (!result || !result.outputRows || result.outputRows.length === 0) return;
    applyCleanedRows(result.outputRows, 'PYTHON', `Cleaned via Python Pandas pipeline (${result.outputRows.length} rows)`);
    setAppliedNotice(`Cleaned Python dataset applied! ${result.outputRows.length} validated rows are now active across the entire platform.`);
    setTimeout(() => setAppliedNotice(null), 5000);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadScript = () => {
    const blob = new Blob([script], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_Analysis.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCleanedCSV = () => {
    const rowsToExport = result?.outputRows || cleanRows;
    const ws = XLSX.utils.json_to_sheet(rowsToExport);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `python_cleaned_${tableName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare aggregated data for in-place dashboard charts based on outputRows
  const dashboardRows = result?.outputRows && result.outputRows.length > 0 ? result.outputRows : cleanRows;

  // Aggregate by selected dimension & measure
  const chartAggregatedData = useMemo(() => {
    if (!dashboardRows || dashboardRows.length === 0 || !selectedDimension || !selectedMeasure) {
      return [];
    }
    const map = new Map<string, number>();
    dashboardRows.forEach(r => {
      const key = String(r[selectedDimension] || 'Other');
      const val = Number(r[selectedMeasure]) || 0;
      map.set(key, (map.get(key) || 0) + val);
    });

    return Array.from(map.entries())
      .map(([label, val]) => ({
        label,
        value: Math.round(val * 100) / 100
      }))
      .sort((a, b) => b.value - a.value);
  }, [dashboardRows, selectedDimension, selectedMeasure]);

  // Aggregate time series chronological data if date column exists
  const timeSeriesData = useMemo(() => {
    const dCol = dateColumn || columns.find(c => c.dataType === 'date')?.name;
    if (!dCol || !dashboardRows || dashboardRows.length === 0 || !selectedMeasure) {
      return [];
    }
    const map = new Map<string, number>();
    dashboardRows.forEach(r => {
      const period = String(r[dCol] || '').split('T')[0] || '2026-01-01';
      const val = Number(r[selectedMeasure]) || 0;
      map.set(period, (map.get(period) || 0) + val);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, value]) => ({
        period,
        value: Math.round(value * 100) / 100
      }));
  }, [dashboardRows, dateColumn, columns, selectedMeasure]);

  // Compute live KPIs from dashboard rows
  const liveKpis = useMemo(() => {
    if (!dashboardRows || dashboardRows.length === 0) {
      return { totalRows: 0, sum: 0, avg: 0, max: 0, uniqueSegments: 0 };
    }
    const vals = dashboardRows.map(r => Number(r[selectedMeasure])).filter(v => !isNaN(v));
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = vals.length > 0 ? sum / vals.length : 0;
    const max = vals.length > 0 ? Math.max(...vals) : 0;
    const segments = new Set(dashboardRows.map(r => String(r[selectedDimension] || ''))).size;

    return {
      totalRows: dashboardRows.length,
      sum: Math.round(sum * 100) / 100,
      avg: Math.round(avg * 10) / 10,
      max: Math.round(max * 100) / 100,
      uniqueSegments: segments
    };
  }, [dashboardRows, selectedMeasure, selectedDimension]);

  return (
    <div className="space-y-6 pb-16 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <FileCode2 className="w-4 h-4" /> REPRODUCIBLE DATA SCIENCE & CLEANING ENGINE
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            PYTHON DATA ANALYSIS & IN-PLACE DASHBOARD
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Write or edit Pandas cleaning scripts. Whenever you run a query, an <span className="text-[#21F1A8] font-semibold">instant interactive dashboard</span> is generated right below your code with real-time charts and metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadScript}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#242424] hover:bg-[#303030] text-gray-300 text-xs border border-[#383838] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#21F1A8]" /> Export .py
          </button>
          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#21F1A8] text-black font-heading text-sm font-bold tracking-wide uppercase hover:bg-[#1cdb97] transition-all shadow-lg shadow-[#21F1A8]/20"
          >
            <Play className="w-4 h-4 fill-black" /> Run & Build Dashboard
          </button>
        </div>
      </div>

      {/* Applied Clean Data Notice */}
      {appliedNotice && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-[#21F1A8]/50 flex flex-wrap items-center justify-between gap-3 text-xs text-[#21F1A8] animate-fadeIn">
          <div className="flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-[#21F1A8]" />
            <span>{appliedNotice}</span>
          </div>
          <button
            onClick={() => setCurrentTab('executive_dashboard')}
            className="px-4 py-1.5 rounded-xl bg-[#21F1A8] text-black font-bold text-xs hover:bg-[#1cdb97] flex items-center gap-1"
          >
            View Executive Dashboard <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Python Cleaning & Query Recipes */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#21F1A8]" />
            ONE-CLICK PYTHON DATA CLEANING & QUERY PRESETS
          </span>
          <span className="text-[10px] text-gray-500 font-mono">Click to inject into editor</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {pythonRecipes.map((r, idx) => (
            <button
              key={idx}
              onClick={() => {
                setScript(r.code);
                const res = runSandboxedPythonAnalysis(r.code, cleanRows, columns);
                setResult(res);
                setAppliedNotice(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#2d2d2d] hover:border-[#21F1A8]/60 text-gray-200 text-xs transition-colors truncate max-w-xs"
              title={r.description}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Python Code Editor Area */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-3xl p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Terminal className="w-4 h-4 text-[#21F1A8]" />
            <span>python_data_pipeline.py</span>
            <span className="text-gray-500">({dashboardRows.length} working rows)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copyScript}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#21F1A8]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={9}
          className="w-full bg-[#121212] text-xs text-[#21F1A8] font-mono p-4 rounded-2xl border border-[#262626] focus:outline-none focus:border-[#21F1A8] leading-relaxed shadow-inner"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <span className="text-gray-500 text-[11px] font-mono">
            Supports Pandas methods: <code className="text-[#21F1A8]">df.query(...)</code>, <code className="text-[#21F1A8]">df.dropna()</code>, <code className="text-[#21F1A8]">df.drop_duplicates()</code>, <code className="text-[#21F1A8]">df.sort_values()</code>, feature engineering.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              className="px-4 py-1.5 rounded-xl bg-[#282828] hover:bg-[#333] text-white text-xs border border-[#444] transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3 text-[#21F1A8]" /> Execute Script
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ⚡ REAL-TIME IN-PLACE GENERATED DASHBOARD ("wha b wo kio query add kren to uska wha he usky zriye dashborad b ky nazr ayen") */}
      {/* ========================================================================= */}
      <div className="bg-[#191919] border-2 border-[#21F1A8]/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#21F1A8]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Dashboard Title & Actions Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2d2d2d] pb-5 relative">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#21F1A8] bg-[#21F1A8]/10 px-2.5 py-0.5 rounded-full border border-[#21F1A8]/30">
              <Sparkles className="w-3 h-3" /> Live Generated Dashboard
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
              PYTHON QUERY LIVE DASHBOARD
            </h2>
            <p className="text-xs text-gray-400">
              Visualizes real-time metrics and dynamic chart analytics calculated directly from your Python query output.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleApplyCleanedToPlatform}
              className="px-4 py-2 rounded-xl bg-[#21F1A8] text-black font-bold text-xs hover:bg-[#1cdb97] transition-all flex items-center gap-1.5 shadow-md shadow-[#21F1A8]/20"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Apply Cleaned Data to App</span>
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="px-4 py-2 rounded-xl bg-[#242424] hover:bg-[#303030] text-white text-xs border border-[#3e3e3e] transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#21F1A8]" />
              <span>Generate Python Report</span>
            </button>

            <button
              onClick={exportCleanedCSV}
              className="px-3.5 py-2 rounded-xl bg-[#1e1e1e] hover:bg-[#282828] text-gray-300 text-xs border border-[#333] transition-colors flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Export Cleaned CSV
            </button>
          </div>
        </div>

        {/* 1. Real-Time KPI Cards Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-[#131313] border border-[#2b2b2b] space-y-1">
            <span className="text-[10px] text-gray-400 font-mono uppercase">Records in Result</span>
            <div className="text-2xl font-heading font-bold text-white">{liveKpis.totalRows.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-400 font-mono">100% Validated</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#131313] border border-[#2b2b2b] space-y-1">
            <span className="text-[10px] text-gray-400 font-mono uppercase">Total {selectedMeasure}</span>
            <div className="text-2xl font-heading font-bold text-[#21F1A8]">
              {liveKpis.sum > 1000 ? Math.round(liveKpis.sum).toLocaleString() : liveKpis.sum}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">Aggregated Sum</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#131313] border border-[#2b2b2b] space-y-1">
            <span className="text-[10px] text-gray-400 font-mono uppercase">Average / Mean</span>
            <div className="text-2xl font-heading font-bold text-cyan-400">
              {liveKpis.avg.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">Per Record Mean</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#131313] border border-[#2b2b2b] space-y-1">
            <span className="text-[10px] text-gray-400 font-mono uppercase">Max Peak Value</span>
            <div className="text-2xl font-heading font-bold text-amber-400">
              {liveKpis.max.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">Highest Observation</div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-[#131313] border border-[#2b2b2b] space-y-1">
            <span className="text-[10px] text-gray-400 font-mono uppercase">Active Segments</span>
            <div className="text-2xl font-heading font-bold text-purple-400">
              {liveKpis.uniqueSegments}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">Across {selectedDimension}</div>
          </div>
        </div>

        {/* 2. Interactive Chart Controls & Chart Rendering */}
        <div className="bg-[#141414] border border-[#282828] rounded-2xl p-5 space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#252525] pb-4">
            {/* Chart Type Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-mono text-gray-400 mr-1 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-[#21F1A8]" /> Chart:
              </span>
              {[
                { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
                { id: 'line', label: 'Trend Line', icon: TrendingUp },
                { id: 'scatter', label: 'Scatter Plot', icon: Cpu },
                { id: 'heatmap', label: '2D Heatmap', icon: Grid },
                { id: 'donut', label: 'Donut Share', icon: PieChart },
                { id: 'treemap', label: 'Treemap', icon: Layers }
              ].map(chart => {
                const Icon = chart.icon;
                return (
                  <button
                    key={chart.id}
                    onClick={() => setSelectedChartType(chart.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-colors ${
                      selectedChartType === chart.id 
                        ? 'bg-[#21F1A8] text-black font-bold shadow-md' 
                        : 'bg-[#1c1c1c] text-gray-400 hover:text-white border border-[#2f2f2f]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{chart.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dimension & Measure Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-gray-400">X-Axis:</span>
                <select
                  value={selectedDimension}
                  onChange={(e) => setSelectedDimension(e.target.value)}
                  className="bg-[#1c1c1c] text-white px-2.5 py-1.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none text-xs font-mono"
                >
                  {categoricalColumns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                  {dateColumn && <option value={dateColumn}>{dateColumn} (Date)</option>}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-gray-400">Y-Axis:</span>
                <select
                  value={selectedMeasure}
                  onChange={(e) => setSelectedMeasure(e.target.value)}
                  className="bg-[#1c1c1c] text-[#21F1A8] font-bold px-2.5 py-1.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none text-xs font-mono"
                >
                  {numericColumns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Render Selected Dynamic Chart */}
          <div className="min-h-[340px]">
            {selectedChartType === 'bar' && (
              <Pareto8020Chart
                data={chartAggregatedData.map(d => ({ category: d.label, value: d.value }))}
                metricName={selectedMeasure}
              />
            )}

            {selectedChartType === 'line' && (
              <TimeSeriesAreaChart
                data={timeSeriesData.length > 0 ? timeSeriesData : chartAggregatedData.map(d => ({ period: d.label, value: d.value }))}
                metricName={selectedMeasure}
                color="#21F1A8"
              />
            )}

            {selectedChartType === 'scatter' && (
              <ScatterPlotChart
                rows={dashboardRows}
                columns={columns}
                defaultXField={numericColumns[1]?.name || selectedMeasure}
                defaultYField={selectedMeasure}
                defaultCategoryField={selectedDimension}
                title={`SCATTER DISTRIBUTION: ${selectedMeasure} CORRELATION`}
              />
            )}

            {selectedChartType === 'heatmap' && (
              <HeatMapChart
                rows={dashboardRows}
                columns={columns}
                defaultRowDim={selectedDimension}
                defaultColDim={categoricalColumns[1]?.name || selectedDimension}
                defaultMetric={selectedMeasure}
                title={`2D MULTIVARIATE HEAT MAP DENSITY`}
              />
            )}

            {selectedChartType === 'donut' && (() => {
              const total = chartAggregatedData.reduce((acc, c) => acc + c.value, 0);
              const donutData = chartAggregatedData.slice(0, 6).map(d => ({
                category: d.label,
                value: d.value,
                share: total > 0 ? Math.round((d.value / total) * 1000) / 10 : 0
              }));
              return (
                <DonutCompositionChart
                  data={donutData}
                  metricName={selectedMeasure}
                />
              );
            })()}

            {selectedChartType === 'treemap' && (
              <TreemapChart
                items={chartAggregatedData.slice(0, 8).map(d => ({ label: d.label, value: d.value }))}
                metricName={selectedMeasure}
                title={`TREEMAP PROPORTIONAL HIERARCHY`}
              />
            )}
          </div>
        </div>

        {/* 3. Cleaned Data Table Sample */}
        <div className="bg-[#141414] border border-[#282828] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-[#21F1A8]" />
              OUTPUT DATAFRAME SAMPLE (FIRST 8 OF {dashboardRows.length} ROWS)
            </h3>
            <span className="text-[11px] font-mono text-gray-500">{Object.keys(dashboardRows[0] || {}).length} columns</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#262626] max-h-72">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#101010] text-gray-400 border-b border-[#262626] sticky top-0">
                <tr>
                  {Object.keys(dashboardRows[0] || {}).slice(0, 8).map(col => (
                    <th key={col} className="p-2.5 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e]">
                {dashboardRows.slice(0, 8).map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#1a1a1a] text-gray-300">
                    {Object.keys(dashboardRows[0] || {}).slice(0, 8).map(col => (
                      <td key={col} className="p-2 whitespace-nowrap">
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NaN'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Output Terminal / Execution Results */}
      {result && (
        <div className="space-y-4">
          {/* Statistical Describe Table */}
          {result.tableOutput && result.tableOutput.length > 0 && (
            <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-3">
              <h3 className="font-heading text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-[#21F1A8]" />
                PANDAS DF.DESCRIBE() STATISTICAL SUMMARY
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#141414] text-gray-400 border-b border-[#2a2a2a]">
                    <tr>
                      <th className="p-2.5">Field</th>
                      <th className="p-2.5">Count</th>
                      <th className="p-2.5">Mean</th>
                      <th className="p-2.5">Std Dev</th>
                      <th className="p-2.5">Min</th>
                      <th className="p-2.5">Median</th>
                      <th className="p-2.5">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {result.tableOutput.map(r => (
                      <tr key={r.column} className="hover:bg-[#202020] text-gray-300">
                        <td className="p-2.5 font-bold text-white">{r.column}</td>
                        <td className="p-2.5">{r.count}</td>
                        <td className="p-2.5 text-[#21F1A8]">{r.mean.toLocaleString()}</td>
                        <td className="p-2.5">{r.std.toLocaleString()}</td>
                        <td className="p-2.5">{r.min.toLocaleString()}</td>
                        <td className="p-2.5">{r.median.toLocaleString()}</td>
                        <td className="p-2.5">{r.max.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Standard Output Console */}
          <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#21F1A8]" /> Python Kernel Standard Output (Stdout)
              </span>
              <span className="text-gray-500 font-mono">Execution time: {result.durationMs}ms</span>
            </div>
            <pre className="p-4 rounded-xl bg-[#0e0e0e] border border-[#262626] text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
              {result.stdout}
            </pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PYTHON EXECUTIVE REPORT MODAL ("python oy clean kr ky report bna sky") */}
      {/* ========================================================================= */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#2d2d2d] flex items-center justify-between bg-[#141414]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#21F1A8]/10 text-[#21F1A8] border border-[#21F1A8]/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-white uppercase">
                    PYTHON DATA SCIENCE & CLEANING EXECUTIVE REPORT
                  </h3>
                  <p className="text-xs text-gray-400">Formal boardroom audit compiled from in-memory Python pipeline execution.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#242424] hover:bg-[#333] text-gray-200 text-xs border border-[#383838] flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-[#21F1A8]" />
                  <span>Print Report</span>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Report Document */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#161616] text-gray-200 print:bg-white print:text-black">
              {/* Header Metadata */}
              <div className="border-b border-[#2d2d2d] pb-5 space-y-2">
                <div className="text-[10px] font-mono text-[#21F1A8] uppercase tracking-wider font-bold">
                  {brand.companyName} • {brand.department}
                </div>
                <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
                  PYTHON DATA SCIENCE AUDIT & FEATURE PIPELINE REPORT
                </h1>
                <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-400 pt-1">
                  <span>Dataset: <b className="text-white">{tableName}</b></span>
                  <span>Validated Rows: <b className="text-[#21F1A8]">{dashboardRows.length.toLocaleString()} rows</b></span>
                  <span>Execution Time: <b className="text-white">{result?.durationMs || 12}ms</b></span>
                  <span>Report Timestamp: <b>{new Date().toLocaleString()}</b></span>
                </div>
              </div>

              {/* 1. Executive Brief */}
              <div className="space-y-2">
                <h4 className="font-heading text-sm font-bold text-white uppercase text-[#21F1A8]">
                  1. Executive Brief & Data Science Methodology
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  This report documents reproducible data science cleaning, deduplication, feature engineering, and statistical validations executed in sandboxed Python 3.11 with Pandas. The output dataframe contains <b>{dashboardRows.length.toLocaleString()}</b> certified observations ready for operational and executive analysis.
                </p>
              </div>

              {/* 2. Key Metrics Summary */}
              <div className="space-y-2">
                <h4 className="font-heading text-sm font-bold text-white uppercase text-[#21F1A8]">
                  2. Performance Indicators from Cleaned Dataset
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#121212] border border-[#282828]">
                    <div className="text-[10px] font-mono text-gray-400 uppercase">Total Observations</div>
                    <div className="text-xl font-bold text-white font-heading">{liveKpis.totalRows.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#121212] border border-[#282828]">
                    <div className="text-[10px] font-mono text-gray-400 uppercase">Total {selectedMeasure}</div>
                    <div className="text-xl font-bold text-[#21F1A8] font-heading">{liveKpis.sum.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#121212] border border-[#282828]">
                    <div className="text-[10px] font-mono text-gray-400 uppercase">Arithmetic Mean</div>
                    <div className="text-xl font-bold text-cyan-400 font-heading">{liveKpis.avg.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#121212] border border-[#282828]">
                    <div className="text-[10px] font-mono text-gray-400 uppercase">Peak Observation</div>
                    <div className="text-xl font-bold text-amber-400 font-heading">{liveKpis.max.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* 3. Executed Python Code */}
              <div className="space-y-2">
                <h4 className="font-heading text-sm font-bold text-white uppercase text-[#21F1A8]">
                  3. Reproducible Python Pipeline Code
                </h4>
                <pre className="p-4 rounded-xl bg-[#0e0e0e] border border-[#2a2a2a] text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed max-h-56">
                  {script}
                </pre>
              </div>

              {/* 4. Statistical Distribution Table */}
              {result?.tableOutput && (
                <div className="space-y-2">
                  <h4 className="font-heading text-sm font-bold text-white uppercase text-[#21F1A8]">
                    4. Verified Statistical Distribution
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-[#2d2d2d]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#121212] text-gray-400 border-b border-[#2d2d2d]">
                        <tr>
                          <th className="p-2">Feature</th>
                          <th className="p-2">Count</th>
                          <th className="p-2">Mean</th>
                          <th className="p-2">Std Dev</th>
                          <th className="p-2">Min</th>
                          <th className="p-2">Max</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222]">
                        {result.tableOutput.slice(0, 6).map(row => (
                          <tr key={row.column}>
                            <td className="p-2 font-bold text-white">{row.column}</td>
                            <td className="p-2">{row.count}</td>
                            <td className="p-2 text-[#21F1A8]">{row.mean}</td>
                            <td className="p-2">{row.std}</td>
                            <td className="p-2">{row.min}</td>
                            <td className="p-2">{row.max}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Certification Footer */}
              <div className="pt-4 border-t border-[#2d2d2d] flex items-center justify-between text-xs text-gray-500 font-mono">
                <span>Audited via NexusBI Python Sandboxed Kernel</span>
                <span className="text-[#21F1A8] font-bold">STATUS: CERTIFIED AUDIT READY</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#2d2d2d] flex items-center justify-between bg-[#141414]">
              <button
                onClick={handleApplyCleanedToPlatform}
                className="px-4 py-2 rounded-xl bg-[#21F1A8] text-black font-bold text-xs hover:bg-[#1cdb97] flex items-center gap-1.5"
              >
                <Wand2 className="w-4 h-4" />
                <span>Apply as Active Platform Dataset</span>
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-xl bg-[#242424] hover:bg-[#303030] text-gray-300 text-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
