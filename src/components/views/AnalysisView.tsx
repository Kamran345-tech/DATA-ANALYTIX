import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  BarChart2, 
  CheckCircle2,
  Table2,
  Sliders,
  Download,
  Search,
  ArrowUpDown,
  Compass,
  PieChart,
  HelpCircle,
  ScatterChart,
  Sigma
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

type AnalysisTab = 'eda' | 'correlation' | 'distribution' | 'outliers' | 'forecast';

export const AnalysisView: React.FC = () => {
  const { analytics, columns, cleanRows, openDrillThrough } = usePlatform();
  const [activeTab, setActiveTab] = useState<AnalysisTab>('eda');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected column for histogram/distribution
  const numericCols = useMemo(() => columns.filter(c => c.dataType === 'number'), [columns]);
  const [selectedHistCol, setSelectedHistCol] = useState<string>(numericCols[0]?.name || '');
  const [numBins, setNumBins] = useState<number>(10);

  // Selected columns for bivariate scatter inspection
  const [scatterColX, setScatterColX] = useState<string>(numericCols[0]?.name || '');
  const [scatterColY, setScatterColY] = useState<string>(numericCols[1]?.name || numericCols[0]?.name || '');

  const primaryForecastKey = Object.keys(analytics.forecasts)[0];
  const forecast = primaryForecastKey ? analytics.forecasts[primaryForecastKey] : null;

  // Filtered descriptive statistics
  const statsList = useMemo(() => {
    const list = analytics.descriptiveStats || [];
    if (!searchTerm) return list;
    return list.filter(s => s.column.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [analytics.descriptiveStats, searchTerm]);

  // Compute histogram bins for selectedHistCol
  const histData = useMemo(() => {
    if (!selectedHistCol || cleanRows.length === 0) return { bins: [], min: 0, max: 0, mean: 0, median: 0 };
    const values = cleanRows
      .map(r => Number(r[selectedHistCol]))
      .filter(v => typeof v === 'number' && !isNaN(v));

    if (values.length === 0) return { bins: [], min: 0, max: 0, mean: 0, median: 0 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const binSize = range / numBins;

    const bins = Array.from({ length: numBins }, (_, i) => {
      const lower = min + i * binSize;
      const upper = lower + binSize;
      return {
        binLabel: `${Math.round(lower * 10) / 10} - ${Math.round(upper * 10) / 10}`,
        lower,
        upper,
        count: 0
      };
    });

    values.forEach(v => {
      const idx = Math.min(numBins - 1, Math.floor((v - min) / binSize));
      if (bins[idx]) bins[idx].count++;
    });

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return { bins, min, max, mean, median, total: values.length };
  }, [cleanRows, selectedHistCol, numBins]);

  // Scatter plot points
  const scatterPoints = useMemo(() => {
    if (!scatterColX || !scatterColY) return [];
    return cleanRows.slice(0, 100).map(r => ({
      x: Number(r[scatterColX]) || 0,
      y: Number(r[scatterColY]) || 0
    }));
  }, [cleanRows, scatterColX, scatterColY]);

  // Export descriptive statistics to CSV
  const exportStatsCSV = () => {
    const headers = 'Column,Count,Mean,Median,StdDev,Variance,Min,Q1,Q3,Max,IQR,Skewness,Kurtosis,NullCount,NullPct';
    const rows = statsList.map(s => 
      `"${s.column}",${s.count},${s.mean},${s.median},${s.stdDev},${s.variance},${s.min},${s.q1},${s.q3},${s.max},${s.iqr},${s.skewness},${s.kurtosis},${s.nullCount},${s.nullPct}%`
    );
    const csv = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `descriptive_statistics_eda.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn w-full max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <Activity className="w-4 h-4" /> Data Analyst Statistical Workbench
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-wide uppercase">
            STATISTICAL ANALYSIS & EXPLORATORY DATA ANALYSIS (EDA)
          </h1>
          <p className="text-xs text-gray-400">
            Full-spectrum mathematical discovery. Parametric distributions, bivariate correlations, Tukey IQR anomalies, and time-series forecasting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportStatsCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1f1f1f] border border-[#333] hover:border-[#21F1A8] text-white text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#21F1A8]" />
            <span className="hidden sm:inline">Export EDA as CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Analyst Navigation Tabs (Responsive scrollable) */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
        <button
          onClick={() => setActiveTab('eda')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'eda'
              ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
              : 'bg-[#1c1c1c] text-gray-300 hover:bg-[#252525] hover:text-white border border-[#2e2e2e]'
          }`}
        >
          <Table2 className="w-3.5 h-3.5" /> Descriptive Statistics (EDA)
        </button>

        <button
          onClick={() => setActiveTab('correlation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'correlation'
              ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
              : 'bg-[#1c1c1c] text-gray-300 hover:bg-[#252525] hover:text-white border border-[#2e2e2e]'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> Correlation Heatmap & Scatter
        </button>

        <button
          onClick={() => setActiveTab('distribution')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'distribution'
              ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
              : 'bg-[#1c1c1c] text-gray-300 hover:bg-[#252525] hover:text-white border border-[#2e2e2e]'
          }`}
        >
          <Sigma className="w-3.5 h-3.5" /> Distribution & Histogram
        </button>

        <button
          onClick={() => setActiveTab('outliers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'outliers'
              ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
              : 'bg-[#1c1c1c] text-gray-300 hover:bg-[#252525] hover:text-white border border-[#2e2e2e]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Outlier & Risk Inspector ({analytics.anomalies.length})
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'forecast'
              ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
              : 'bg-[#1c1c1c] text-gray-300 hover:bg-[#252525] hover:text-white border border-[#2e2e2e]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Time Series Forecast
        </button>
      </div>

      {/* 3. TAB 1: DESCRIPTIVE STATISTICS (EDA) */}
      {activeTab === 'eda' && (
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-white uppercase flex items-center gap-2">
                <Table2 className="w-5 h-5 text-[#21F1A8]" />
                NUMERICAL ATTRIBUTES DESCRIPTIVE SUMMARY
              </h2>
              <p className="text-xs text-gray-400">
                Mathematical moments, quartiles (Q1, Median, Q3), dispersion (Std Dev, IQR), and distribution shape (Skewness, Kurtosis).
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search numeric columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#141414] text-xs text-white pl-8 pr-3 py-1.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#2d2d2d]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#141414] text-gray-400 border-b border-[#2d2d2d]">
                <tr>
                  <th className="p-3">Attribute</th>
                  <th className="p-3 text-right">Count</th>
                  <th className="p-3 text-right">Mean</th>
                  <th className="p-3 text-right">Median</th>
                  <th className="p-3 text-right">Std Dev</th>
                  <th className="p-3 text-right">Min</th>
                  <th className="p-3 text-right">Q1 (25%)</th>
                  <th className="p-3 text-right">Q3 (75%)</th>
                  <th className="p-3 text-right">Max</th>
                  <th className="p-3 text-right">IQR</th>
                  <th className="p-3 text-right">Skewness</th>
                  <th className="p-3 text-right">Missing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {statsList.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-6 text-center text-gray-500">
                      No numerical features found matching filter.
                    </td>
                  </tr>
                ) : (
                  statsList.map((stat, i) => (
                    <tr key={i} className="hover:bg-[#1f1f1f] transition-colors">
                      <td className="p-3 font-sans font-semibold text-white truncate max-w-[160px]">
                        {stat.column}
                      </td>
                      <td className="p-3 text-right text-gray-300">{stat.count.toLocaleString()}</td>
                      <td className="p-3 text-right text-[#21F1A8] font-bold">{stat.mean.toLocaleString()}</td>
                      <td className="p-3 text-right text-white">{stat.median.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-400">{stat.stdDev.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-400">{stat.min.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-400">{stat.q1.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-400">{stat.q3.toLocaleString()}</td>
                      <td className="p-3 text-right text-white font-semibold">{stat.max.toLocaleString()}</td>
                      <td className="p-3 text-right text-amber-400">{stat.iqr.toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          Math.abs(stat.skewness) < 0.5 ? 'bg-gray-800 text-gray-300' :
                          stat.skewness > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {stat.skewness.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={stat.nullCount > 0 ? 'text-amber-400' : 'text-gray-500'}>
                          {stat.nullCount} ({stat.nullPct}%)
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB 2: CORRELATION HEATMAP & BIVARIATE SCATTER */}
      {activeTab === 'correlation' && (
        <div className="space-y-6">
          <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg sm:text-xl font-bold text-white uppercase flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-[#21F1A8]" />
                  PEARSON CORRELATION MATRIX
                </h2>
                <p className="text-xs text-gray-400">
                  Measures linear correlation between numerical attributes ranging from -1.00 (inverse) to +1.00 (positive).
                </p>
              </div>
              <span className="text-xs text-gray-400 font-mono">r ∈ [-1.00, +1.00]</span>
            </div>

            {analytics.correlationMatrix.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 bg-[#141414] rounded-xl border border-[#262626]">
                Minimum 2 numerical columns required to calculate Pearson correlation coefficients.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analytics.correlationMatrix.map((pair, idx) => {
                  const r = pair.correlation;
                  const isPositive = r > 0;
                  const isStrong = Math.abs(r) >= 0.7;
                  const isModerate = Math.abs(r) >= 0.4 && Math.abs(r) < 0.7;

                  return (
                    <div key={idx} className="p-4 rounded-xl bg-[#141414] border border-[#282828] space-y-2.5 hover:border-[#21F1A8]/40 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white font-medium truncate max-w-[170px]">{pair.x} ↔ {pair.y}</span>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          isStrong
                            ? (isPositive ? 'bg-[#21F1A8]/20 text-[#21F1A8]' : 'bg-red-500/20 text-red-400')
                            : isModerate
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-[#222] text-gray-400'
                        }`}>
                          r = {r > 0 ? '+' : ''}{r.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 flex items-center justify-between">
                        <span>
                          {isStrong 
                            ? (isPositive ? 'Strong Positive Co-movement' : 'Strong Inverse Relationship')
                            : isModerate 
                            ? 'Moderate Linear Relationship' 
                            : 'Weak / Independence'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bivariate Scatter Inspector */}
          {numericCols.length >= 2 && (
            <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-heading text-lg font-bold text-white uppercase flex items-center gap-2">
                  <Compass className="w-5 h-5 text-cyan-400" />
                  BIVARIATE SCATTER PLOT EXPLORER
                </h3>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-mono">X-Axis:</span>
                    <select
                      value={scatterColX}
                      onChange={(e) => setScatterColX(e.target.value)}
                      className="bg-[#141414] text-[#21F1A8] px-2.5 py-1 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                    >
                      {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-mono">Y-Axis:</span>
                    <select
                      value={scatterColY}
                      onChange={(e) => setScatterColY(e.target.value)}
                      className="bg-[#141414] text-cyan-400 px-2.5 py-1 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                    >
                      {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Scatter Canvas */}
              <div className="p-4 bg-[#141414] rounded-xl border border-[#282828] relative">
                {(() => {
                  const minX = Math.min(...scatterPoints.map(p => p.x));
                  const maxX = Math.max(...scatterPoints.map(p => p.x)) || 1;
                  const minY = Math.min(...scatterPoints.map(p => p.y));
                  const maxY = Math.max(...scatterPoints.map(p => p.y)) || 1;

                  const getX = (v: number) => 50 + ((v - minX) / (maxX - minX || 1)) * 420;
                  const getY = (v: number) => 20 + 160 - ((v - minY) / (maxY - minY || 1)) * 160;

                  return (
                    <svg viewBox="0 0 500 220" className="w-full h-52 overflow-visible">
                      {/* Gridlines */}
                      <line x1="50" y1="180" x2="480" y2="180" stroke="#333" strokeWidth="1" />
                      <line x1="50" y1="20" x2="50" y2="180" stroke="#333" strokeWidth="1" />
                      
                      {/* Points */}
                      {scatterPoints.map((pt, i) => (
                        <circle
                          key={i}
                          cx={getX(pt.x)}
                          cy={getY(pt.y)}
                          r="4"
                          fill="#21F1A8"
                          opacity="0.75"
                          className="hover:scale-150 hover:opacity-100 transition-all cursor-pointer"
                        >
                          <title>{`${scatterColX}: ${pt.x}, ${scatterColY}: ${pt.y}`}</title>
                        </circle>
                      ))}

                      {/* Axis Labels */}
                      <text x="260" y="205" fill="#888" fontSize="10" textAnchor="middle" fontFamily="monospace">
                        {scatterColX}
                      </text>
                      <text x="20" y="100" fill="#888" fontSize="10" textAnchor="middle" fontFamily="monospace" transform="rotate(-90, 20, 100)">
                        {scatterColY}
                      </text>
                    </svg>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: DISTRIBUTION & HISTOGRAM */}
      {activeTab === 'distribution' && (
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-white uppercase flex items-center gap-2">
                <Sigma className="w-5 h-5 text-[#21F1A8]" />
                PARAMETRIC FREQUENCY HISTOGRAM
              </h2>
              <p className="text-xs text-gray-400">
                Visualize skewness, kurtosis, modal density, and central tendency across numeric variables.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-mono">Column:</span>
                <select
                  value={selectedHistCol}
                  onChange={(e) => setSelectedHistCol(e.target.value)}
                  className="bg-[#141414] text-[#21F1A8] font-mono px-3 py-1.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                >
                  {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-mono">Bins:</span>
                {[5, 10, 15, 20].map(b => (
                  <button
                    key={b}
                    onClick={() => setNumBins(b)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-colors ${
                      numBins === b ? 'bg-[#21F1A8] text-black font-bold' : 'bg-[#141414] text-gray-400 hover:text-white border border-[#333]'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Central Tendency Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-[#141414] rounded-xl border border-[#282828]">
              <span className="text-gray-500 font-mono">Sample Size</span>
              <div className="text-base font-bold text-white font-mono">{histData.total}</div>
            </div>
            <div className="p-3 bg-[#141414] rounded-xl border border-[#282828]">
              <span className="text-gray-500 font-mono">Mean (μ)</span>
              <div className="text-base font-bold text-[#21F1A8] font-mono">{Math.round(histData.mean * 100) / 100}</div>
            </div>
            <div className="p-3 bg-[#141414] rounded-xl border border-[#282828]">
              <span className="text-gray-500 font-mono">Median (M)</span>
              <div className="text-base font-bold text-cyan-400 font-mono">{Math.round(histData.median * 100) / 100}</div>
            </div>
            <div className="p-3 bg-[#141414] rounded-xl border border-[#282828]">
              <span className="text-gray-500 font-mono">Min / Max Range</span>
              <div className="text-base font-bold text-gray-200 font-mono">{Math.round(histData.min)} - {Math.round(histData.max)}</div>
            </div>
          </div>

          {/* SVG Histogram Rendering */}
          <div className="p-4 bg-[#141414] rounded-2xl border border-[#282828]">
            {(() => {
              const maxCount = Math.max(...histData.bins.map(b => b.count), 1);
              const barWidth = 440 / (histData.bins.length || 1);

              return (
                <svg viewBox="0 0 520 220" className="w-full h-56 overflow-visible">
                  {/* Grid */}
                  {[0, 0.5, 1].map((p, i) => (
                    <line key={i} x1="40" y1={20 + 150 * (1 - p)} x2="490" y2={20 + 150 * (1 - p)} stroke="#262626" strokeDasharray="3,3" />
                  ))}

                  {/* Histogram Bars */}
                  {histData.bins.map((bin, i) => {
                    const h = (bin.count / maxCount) * 150;
                    const x = 45 + i * barWidth;
                    const y = 170 - h;
                    return (
                      <g 
                        key={i} 
                        className="group cursor-pointer"
                        onClick={() => {
                          openDrillThrough({
                            title: `Histogram: ${selectedHistCol} [${bin.binLabel}]`,
                            subtitle: `${bin.count} records where ${selectedHistCol} is within interval ${bin.binLabel}`,
                            filterColumn: selectedHistCol,
                            sourceContext: 'chart_bar'
                          });
                        }}
                      >
                        <title>{`${bin.binLabel}: ${bin.count} records (Click to drill-through)`}</title>
                        <rect
                          x={x + 2}
                          y={y}
                          width={Math.max(4, barWidth - 4)}
                          height={Math.max(2, h)}
                          fill="#21F1A8"
                          rx="3"
                          className="transition-all group-hover:brightness-125"
                        />
                        <text
                          x={x + barWidth / 2}
                          y={Math.max(15, y - 5)}
                          fill="#fff"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                          opacity="0.8"
                        >
                          {bin.count > 0 ? bin.count : ''}
                        </text>
                      </g>
                    );
                  })}

                  <line x1="40" y1="170" x2="490" y2="170" stroke="#444" strokeWidth="1" />
                </svg>
              );
            })()}

            <div className="flex justify-between text-[10px] text-gray-500 font-mono pt-2">
              <span>Min: {histData.min.toLocaleString()}</span>
              <span>Distribution across {numBins} intervals</span>
              <span>Max: {histData.max.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 4: OUTLIER & RISK INSPECTOR */}
      {activeTab === 'outliers' && (
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-white uppercase flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                STATISTICAL ANOMALY & OUTLIER AUDIT ({analytics.anomalies.length})
              </h2>
              <p className="text-xs text-gray-400">
                Rigorous Tukey 1.5x Interquartile Range (IQR) fence inspection. Identifies extreme values and revenue concentration risks.
              </p>
            </div>
          </div>

          {analytics.anomalies.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-[#141414] rounded-xl border border-[#262626] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#21F1A8] mx-auto" />
              <div className="font-bold text-white text-sm">Clean Statistical Profile</div>
              <p>No critical anomalies exceeding 1.5x IQR were discovered in the analyzed rows.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.anomalies.map(anom => (
                <div 
                  key={anom.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#141414] border border-[#282828] space-y-3 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{anom.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                        anom.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {anom.severity}
                      </span>
                    </div>
                    <p className="text-gray-300">{anom.reason}</p>
                    <div className="text-[11px] text-gray-400 font-mono">
                      <span>Observed: </span>
                      <strong className="text-white">{anom.observedValue}</strong>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#1e2722] border border-[#21F1A8]/30 text-[#21F1A8]">
                    <strong className="text-white block text-[10px] uppercase font-mono">Action Recommendation:</strong>
                    <span>{anom.recommendedAction}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. TAB 5: TIME SERIES FORECAST */}
      {activeTab === 'forecast' && (
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="font-heading text-lg sm:text-xl font-bold text-white uppercase flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#21F1A8]" />
                HOLT-WINTERS EXPONENTIAL TIME-SERIES FORECAST
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Model: {forecast?.method || 'Exponential Smoothing'} • Horizon: {forecast?.horizon || 0} periods
              </p>
            </div>

            {forecast?.isAvailable && (
              <span className="px-2.5 py-1 rounded-lg bg-[#21F1A8]/15 text-[#21F1A8] font-mono text-xs font-semibold border border-[#21F1A8]/30">
                Verified Forecast Available
              </span>
            )}
          </div>

          {forecast && forecast.isAvailable ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-[#282828]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#141414] text-gray-400 border-b border-[#333]">
                    <tr>
                      <th className="p-3">Period</th>
                      <th className="p-3 text-right">Historical Actual</th>
                      <th className="p-3 text-right">Projected Forecast</th>
                      <th className="p-3 text-right">95% Confidence Interval [Lower - Upper]</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {forecast.data.map((pt, i) => (
                      <tr key={i} className={pt.forecast ? 'bg-[#21F1A8]/5 text-[#21F1A8]' : 'text-gray-300'}>
                        <td className="p-3 font-bold">{pt.period}</td>
                        <td className="p-3 text-right">{pt.actual !== undefined ? pt.actual.toLocaleString() : '—'}</td>
                        <td className="p-3 text-right font-bold text-[#21F1A8]">
                          {pt.forecast !== undefined ? pt.forecast.toLocaleString() : '—'}
                        </td>
                        <td className="p-3 text-right text-cyan-400">
                          {pt.confidenceLower !== undefined ? `[${pt.confidenceLower.toLocaleString()} - ${pt.confidenceUpper?.toLocaleString()}]` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#141414] rounded-xl border border-gray-700 space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <h4 className="font-bold text-white text-sm">Forecast Requires Additional Sequential Periods</h4>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Time-series forecasting models require minimum sequential chronological observations to project future bounds reliably.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
