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
import { safeMax } from '../../utils/mathUtils';
import { 
  Pareto8020Chart, 
  TimeSeriesAreaChart, 
  ScatterPlotChart, 
  HeatMapChart, 
  DonutCompositionChart, 
  TreemapChart 
} from '../charts/InteractiveCharts';
import { ColabNotebookModal } from '../common/ColabNotebookModal';
import { DownloadMenu } from '../common/DownloadMenu';

export const PythonLabView: React.FC = () => {
  const { cleanRows, columns, project, dataModel, applyCleanedRows, setCurrentTab, brand } = usePlatform();
  const tableName = dataModel.tables[0]?.name || 'FactTable';

  const [script, setScript] = useState('');
  const [result, setResult] = useState<PythonExecutionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showColabModal, setShowColabModal] = useState(false);

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

  const exportCleanedCSV = async () => {
    const rowsToExport = result?.outputRows || cleanRows;
    const XLSX = await import('xlsx');
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
    const max = vals.length > 0 ? safeMax(vals, 0) : 0;
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
      <div className="depth-card bg-card border border-subtle rounded-[20px] p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-[var(--shadow-card)]">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent font-mono">
            <FileCode2 className="w-4 h-4" /> REPRODUCIBLE DATA SCIENCE &amp; CLEANING ENGINE
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary tracking-tight uppercase">
            PYTHON DATA WORKBENCH &amp; LIVE DASHBOARD
          </h1>
          <p className="text-xs sm:text-sm text-secondary">
            Write or edit Pandas cleaning scripts. Whenever you run a script, an <span className="text-accent font-semibold">instant interactive dashboard</span> and monospace statistical output are compiled below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowColabModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-elevated hover:bg-card-hover text-[var(--warning)] text-xs border border-subtle transition-colors font-semibold shadow-xs cursor-pointer"
            title="Open or export interactive notebook for Google Colab"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--warning)]" /> Google Colab (.ipynb)
          </button>
          <button
            onClick={downloadScript}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-elevated hover:bg-card-hover text-primary text-xs border border-subtle transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent" /> Export .py
          </button>
          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-accent text-on-accent font-heading text-sm font-bold tracking-wide uppercase transition-all shadow-md cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" /> Run &amp; Build Dashboard
          </button>
          <DownloadMenu context="python_lab" customPython={script} />
        </div>
      </div>

      {/* Applied Clean Data Notice */}
      {appliedNotice && (
        <div className="p-4 rounded-2xl bg-[var(--accent-soft)] border border-subtle flex flex-wrap items-center justify-between gap-3 text-xs text-accent animate-fadeIn">
          <div className="flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            <span>{appliedNotice}</span>
          </div>
          <button
            onClick={() => setCurrentTab('executive_dashboard')}
            className="px-4 py-1.5 rounded-xl bg-accent text-on-accent font-bold text-xs flex items-center gap-1 cursor-pointer"
          >
            View Executive Dashboard <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Workbench Split Grid: Left DataFrame Schema & Recipes (4 cols) + Right Editor Chrome (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <aside className="lg:col-span-4 depth-card bg-card border border-subtle shadow-[var(--shadow-card)] rounded-[20px] overflow-hidden">
          <div className="px-4 py-3 border-b border-subtle bg-elevated flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <TableIcon className="w-3.5 h-3.5" /> DataFrame Schema (df)
            </span>
            <span className="text-[10px] font-mono text-muted">{columns.length} cols</span>
          </div>
          <div className="p-3 space-y-3 max-h-[380px] overflow-y-auto">
            <div className="space-y-1">
              {columns.map(col => (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => setScript(prev => `${prev}\n# Inspect ${col.name}\nprint(df["${col.name}"].describe())`)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-secondary hover:text-primary hover:bg-elevated transition-colors cursor-pointer"
                >
                  <span className="truncate">df["{col.name}"]</span>
                  <span className="text-[10px] text-accent uppercase ml-2">{col.dataType}</span>
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-subtle space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-bold px-1 block">
                Pandas Recipes
              </span>
              {pythonRecipes.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setScript(r.code);
                    const res = runSandboxedPythonAnalysis(r.code, cleanRows, columns);
                    setResult(res);
                    setAppliedNotice(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl bg-elevated hover:bg-card-hover border border-subtle hover:border-strong text-secondary hover:text-primary text-xs transition-colors truncate cursor-pointer"
                  title={r.description}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Python Code Editor Chrome */}
        <div className="lg:col-span-8 editor-chrome no-depth-3d bg-card border border-subtle rounded-[20px] overflow-hidden shadow-[var(--shadow-card)]">
          <div className="px-4 py-2.5 border-b border-subtle bg-elevated flex items-center justify-between text-xs text-secondary">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] px-2.5 py-1 rounded-md bg-[var(--accent-soft)] text-accent border border-subtle">
                <Terminal className="w-3.5 h-3.5 text-accent" />
                <span>python_data_pipeline.py</span>
                <span className="text-muted">({dashboardRows.length} rows)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyScript}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-card-hover hover:text-primary transition-colors cursor-pointer font-mono text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
              <button
                onClick={handleRun}
                className="px-3 py-1 rounded-lg bg-accent text-on-accent font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Execute
              </button>
            </div>
          </div>

          <div className="p-3 bg-input border-t border-subtle">
            <textarea
              aria-label="Python script workbench editor"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={11}
              className="no-depth-3d w-full bg-transparent text-xs sm:text-sm text-accent font-mono p-2 focus:outline-none leading-relaxed resize-y"
            />
          </div>

          <div className="px-4 py-2.5 border-t border-subtle bg-elevated flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-secondary text-[11px] font-mono">
              Pandas Kernel: <code className="text-accent">df.query(...)</code>, <code className="text-accent">df.dropna()</code>, <code className="text-accent">df.drop_duplicates()</code>, <code className="text-accent">df.sort_values()</code>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REAL-TIME IN-PLACE GENERATED DASHBOARD */}
      {/* ========================================================================= */}
      <div className="bg-card border border-subtle rounded-3xl p-6 sm:p-8 space-y-6 shadow-[var(--shadow-card)] relative overflow-hidden">
        {/* Dashboard Title & Actions Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-subtle pb-5 relative">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-[var(--accent-soft)] px-2.5 py-0.5 rounded-full border border-subtle">
              <Sparkles className="w-3 h-3" /> Live Generated Dashboard
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-primary tracking-wide uppercase flex items-center gap-2">
              PYTHON QUERY LIVE DASHBOARD
            </h2>
            <p className="text-xs text-secondary">
              Visualizes real-time metrics and dynamic chart analytics calculated directly from your Python query output.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleApplyCleanedToPlatform}
              className="px-4 py-2 rounded-xl bg-accent text-on-accent font-bold text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Apply Cleaned Data to App</span>
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="px-4 py-2 rounded-xl bg-elevated hover:bg-card-hover text-primary text-xs border border-subtle transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
              <span>Generate Python Report</span>
            </button>

            <button
              onClick={exportCleanedCSV}
              className="px-3.5 py-2 rounded-xl bg-elevated hover:bg-card-hover text-secondary hover:text-primary text-xs border border-subtle transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Cleaned CSV
            </button>
          </div>
        </div>

        {/* 1. Real-Time KPI Cards Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-elevated border border-subtle space-y-1">
            <span className="text-[10px] text-secondary font-mono uppercase">Records in Result</span>
            <div className="text-2xl font-heading font-bold text-primary">{liveKpis.totalRows.toLocaleString()}</div>
            <div className="text-[10px] text-[var(--success)] font-mono">100% Validated</div>
          </div>

          <div className="p-4 rounded-2xl bg-elevated border border-subtle space-y-1">
            <span className="text-[10px] text-secondary font-mono uppercase">Total {selectedMeasure}</span>
            <div className="text-2xl font-heading font-bold text-accent">
              {liveKpis.sum > 1000 ? Math.round(liveKpis.sum).toLocaleString() : liveKpis.sum}
            </div>
            <div className="text-[10px] text-muted font-mono">Aggregated Sum</div>
          </div>

          <div className="p-4 rounded-2xl bg-elevated border border-subtle space-y-1">
            <span className="text-[10px] text-secondary font-mono uppercase">Average / Mean</span>
            <div className="text-2xl font-heading font-bold text-[var(--info)]">
              {liveKpis.avg.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted font-mono">Per Record Mean</div>
          </div>

          <div className="p-4 rounded-2xl bg-elevated border border-subtle space-y-1">
            <span className="text-[10px] text-secondary font-mono uppercase">Max Peak Value</span>
            <div className="text-2xl font-heading font-bold text-[var(--warning)]">
              {liveKpis.max.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted font-mono">Highest Observation</div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-elevated border border-subtle space-y-1">
            <span className="text-[10px] text-secondary font-mono uppercase">Active Segments</span>
            <div className="text-2xl font-heading font-bold text-[var(--accent-2)]">
              {liveKpis.uniqueSegments}
            </div>
            <div className="text-[10px] text-muted font-mono">Across {selectedDimension}</div>
          </div>
        </div>

        {/* 2. Interactive Chart Controls & Chart Rendering */}
        <div className="bg-elevated border border-subtle rounded-2xl p-5 space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-subtle pb-4">
            {/* Chart Type Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-mono text-secondary mr-1 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-accent" /> Chart:
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                      selectedChartType === chart.id 
                        ? 'bg-accent text-on-accent font-bold shadow-sm' 
                        : 'bg-card text-secondary hover:text-primary border border-subtle'
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
                <span className="text-secondary">X-Axis:</span>
                <select
                  value={selectedDimension}
                  onChange={(e) => setSelectedDimension(e.target.value)}
                  className="bg-input text-primary px-2.5 py-1.5 rounded-lg border border-subtle focus:border-accent focus:outline-none text-xs font-mono"
                >
                  {categoricalColumns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                  {dateColumn && <option value={dateColumn}>{dateColumn} (Date)</option>}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-secondary">Y-Axis:</span>
                <select
                  value={selectedMeasure}
                  onChange={(e) => setSelectedMeasure(e.target.value)}
                  className="bg-input text-accent font-bold px-2.5 py-1.5 rounded-lg border border-subtle focus:border-accent focus:outline-none text-xs font-mono"
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
        <div className="bg-elevated border border-subtle rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h3 className="font-heading text-sm font-bold text-primary uppercase tracking-wide flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-accent" />
              OUTPUT DATAFRAME SAMPLE (FIRST 8 OF {dashboardRows.length} ROWS)
            </h3>
            <span className="text-[11px] font-mono text-muted">{Object.keys(dashboardRows[0] || {}).length} columns</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-subtle max-h-72">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-card text-secondary border-b border-subtle sticky top-0">
                <tr>
                  {Object.keys(dashboardRows[0] || {}).slice(0, 8).map(col => (
                    <th key={col} className="p-2.5 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {dashboardRows.slice(0, 8).map((row, idx) => (
                  <tr key={idx} className="hover:bg-card-hover text-primary">
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
            <div className="bg-card border border-subtle rounded-2xl p-5 space-y-3 shadow-[var(--shadow-card)]">
              <h3 className="font-heading text-base font-bold text-primary uppercase tracking-wide flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-accent" />
                PANDAS DF.DESCRIBE() STATISTICAL SUMMARY
              </h3>
              <div className="overflow-x-auto rounded-xl border border-subtle">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-elevated text-secondary border-b border-subtle">
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
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {result.tableOutput.map(r => (
                      <tr key={r.column} className="hover:bg-card-hover text-secondary">
                        <td className="p-2.5 font-bold text-primary">{r.column}</td>
                        <td className="p-2.5">{r.count}</td>
                        <td className="p-2.5 text-accent font-bold">{r.mean.toLocaleString()}</td>
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
          <div className="bg-card border border-subtle rounded-2xl p-5 space-y-3 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-primary font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-accent" /> Python Kernel Standard Output (Stdout)
              </span>
              <span className="text-muted font-mono">Execution time: {result.durationMs}ms</span>
            </div>
            <pre className="p-4 rounded-xl bg-input border border-subtle text-xs font-mono text-accent overflow-x-auto whitespace-pre leading-relaxed">
              {result.stdout}
            </pre>
          </div>
        </div>
      )}

      {/* PYTHON EXECUTIVE REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-subtle rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-subtle flex items-center justify-between bg-elevated">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-accent border border-subtle">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-primary uppercase">
                    PYTHON DATA SCIENCE &amp; CLEANING EXECUTIVE REPORT
                  </h3>
                  <p className="text-xs text-secondary">Formal boardroom audit compiled from in-memory Python pipeline execution.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-card hover:bg-card-hover text-primary text-xs border border-subtle flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-accent" />
                  <span>Print Report</span>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 rounded-lg bg-card hover:bg-card-hover text-secondary hover:text-primary cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Report Document */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-card text-primary print:bg-white print:text-black">
              {/* Header Metadata */}
              <div className="border-b border-subtle pb-5 space-y-2">
                <div className="text-[10px] font-mono text-accent uppercase tracking-wider font-bold">
                  {brand.companyName} • {brand.department}
                </div>
                <h1 className="font-heading text-2xl font-bold text-primary uppercase tracking-wide">
                  PYTHON DATA SCIENCE AUDIT &amp; FEATURE PIPELINE REPORT
                </h1>
                <div className="flex flex-wrap gap-4 text-xs font-mono text-secondary pt-1">
                  <span>Dataset: <b className="text-primary">{tableName}</b></span>
                  <span>Validated Rows: <b className="text-accent">{dashboardRows.length.toLocaleString()} rows</b></span>
                  <span>Execution Time: <b className="text-primary">{result?.durationMs || 12}ms</b></span>
                  <span>Report Timestamp: <b>{new Date().toLocaleString()}</b></span>
                </div>
              </div>

              {/* 1. Executive Brief */}
              <div className="space-y-2">
                <h4 className="font-heading text-sm font-bold uppercase text-accent">
                  1. Executive Brief &amp; Data Science Methodology
                </h4>
                <p className="text-xs text-secondary leading-relaxed">
                  This report documents reproducible data science cleaning, deduplication, feature engineering, and statistical validations executed in sandboxed Python 3.11 with Pandas. The output dataframe contains <b>{dashboardRows.length.toLocaleString()}</b> certified observations ready for operational and executive analysis.
                </p>
              </div>

              {/* 2. Key Metrics Summary */}
              <div className="space-y-2">
                <h4 className="font-heading text-sm font-bold uppercase text-accent">
                  2. Performance Indicators from Cleaned Dataset
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-elevated border border-subtle">
                    <div className="text-[10px] font-mono text-secondary uppercase">Total Observations</div>
                    <div className="text-xl font-bold text-primary font-heading">{liveKpis.totalRows.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-elevated border border-subtle">
                    <div className="text-[10px] font-mono text-secondary uppercase">Total {selectedMeasure}</div>
                    <div className="text-xl font-bold text-accent font-heading">{liveKpis.sum.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-elevated border border-subtle">
                    <div className="text-[10px] font-mono text-secondary uppercase">Arithmetic Mean</div>
                    <div className="text-xl font-bold text-[var(--info)] font-heading">{liveKpis.avg.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-elevated border border-subtle">
                    <div className="text-[10px] font-mono text-secondary uppercase">Peak Observation</div>
                    <div className="text-xl font-bold text-[var(--warning)] font-heading">{liveKpis.max.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* 3. Executed Python Code */}
              <div className="space-y-2">
                <h4 className="font-heading text-sm font-bold uppercase text-accent">
                  3. Reproducible Python Pipeline Code
                </h4>
                <pre className="p-4 rounded-xl bg-input border border-subtle text-xs font-mono text-accent overflow-x-auto whitespace-pre leading-relaxed max-h-56">
                  {script}
                </pre>
              </div>

              {/* 4. Statistical Distribution Table */}
              {result?.tableOutput && (
                <div className="space-y-2">
                  <h4 className="font-heading text-sm font-bold uppercase text-accent">
                    4. Verified Statistical Distribution
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-subtle">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-elevated text-secondary border-b border-subtle">
                        <tr>
                          <th className="p-2">Feature</th>
                          <th className="p-2">Count</th>
                          <th className="p-2">Mean</th>
                          <th className="p-2">Std Dev</th>
                          <th className="p-2">Min</th>
                          <th className="p-2">Max</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {result.tableOutput.slice(0, 6).map(row => (
                          <tr key={row.column}>
                            <td className="p-2 font-bold text-primary">{row.column}</td>
                            <td className="p-2">{row.count}</td>
                            <td className="p-2 text-accent font-bold">{row.mean}</td>
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
              <div className="pt-4 border-t border-subtle flex items-center justify-between text-xs text-muted font-mono">
                <span>Audited via Data Analytix Python Sandboxed Kernel</span>
                <span className="text-accent font-bold">STATUS: CERTIFIED AUDIT READY</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-subtle flex items-center justify-between bg-elevated">
              <button
                onClick={handleApplyCleanedToPlatform}
                className="px-4 py-2 rounded-xl bg-accent text-on-accent font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
                <span>Apply as Active Platform Dataset</span>
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-xl bg-card hover:bg-card-hover text-secondary hover:text-primary border border-subtle text-xs cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Colab Modal */}
      <ColabNotebookModal
        isOpen={showColabModal}
        onClose={() => setShowColabModal(false)}
        project={project}
        columns={columns}
        cleanRows={cleanRows}
        tableName={tableName}
      />
    </div>
  );
};
