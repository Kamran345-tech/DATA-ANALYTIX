import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Sliders, 
  Table2, 
  Download, 
  RotateCcw, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  CircleDot,
  Grid,
  Gauge,
  Compass,
  Layers,
  ArrowRight,
  Filter
} from 'lucide-react';
import { ColumnProfile, ForecastPoint } from '../../types';

// ============================================================================
// 1. CHRONOLOGICAL TIME SERIES LINE & AREA CHART
// ============================================================================
interface TimeSeriesProps {
  data: { period: string; value: number }[];
  metricName: string;
  forecastData?: ForecastPoint[];
  color?: string;
}

export const TimeSeriesAreaChart: React.FC<TimeSeriesProps> = ({
  data,
  metricName,
  forecastData,
  color = '#21F1A8'
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showSMA, setShowSMA] = useState(true);

  // Combine historical and forecast if available
  const { chartPoints, smaPoints, minVal, maxVal, forecastStartIdx } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartPoints: [], smaPoints: [], minVal: 0, maxVal: 1, forecastStartIdx: -1 };
    }

    const points: { period: string; value: number; isForecast?: boolean; lower?: number; upper?: number }[] = data.map(d => ({
      period: d.period,
      value: d.value,
      isForecast: false
    }));

    let fStart = -1;
    if (forecastData && forecastData.length > 0) {
      const futureOnly = forecastData.filter(f => f.forecast !== undefined);
      if (futureOnly.length > 0) {
        fStart = points.length - 1; // Connect to last actual
        futureOnly.forEach(f => {
          points.push({
            period: f.period,
            value: f.forecast!,
            isForecast: true,
            lower: f.confidenceLower,
            upper: f.confidenceUpper
          });
        });
      }
    }

    const allVals = points.map(p => p.value);
    points.forEach(p => {
      if (p.lower !== undefined) allVals.push(p.lower);
      if (p.upper !== undefined) allVals.push(p.upper);
    });

    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const padding = (max - min) * 0.1 || (max * 0.1) || 1;

    // Calculate 3-period Simple Moving Average (SMA)
    const sma: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < 2) {
        sma.push(null);
      } else {
        const avg = (data[i].value + data[i - 1].value + data[i - 2].value) / 3;
        sma.push(Math.round(avg * 100) / 100);
      }
    }

    return {
      chartPoints: points,
      smaPoints: sma,
      minVal: Math.max(0, min - padding),
      maxVal: max + padding,
      forecastStartIdx: fStart
    };
  }, [data, forecastData]);

  if (chartPoints.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-gray-500 bg-[#141414] rounded-xl border border-[#262626]">
        Insufficient time-series data points to render chronological trend curve.
      </div>
    );
  }

  // SVG coordinates calculation
  const width = 800;
  const height = 280;
  const paddingLeft = 60;
  const paddingRight = 40;
  const paddingTop = 25;
  const paddingBottom = 45;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const getX = (idx: number) => paddingLeft + (idx / (chartPoints.length - 1)) * innerWidth;
  const getY = (val: number) => paddingTop + innerHeight - ((val - minVal) / (maxVal - minVal || 1)) * innerHeight;

  // Build SVG path string for historical actuals
  const actualPointsCount = forecastStartIdx >= 0 ? forecastStartIdx + 1 : chartPoints.length;
  const actualCoords = chartPoints.slice(0, actualPointsCount).map((p, idx) => ({
    x: getX(idx),
    y: getY(p.value)
  }));

  const linePath = actualCoords.reduce((acc, curr, idx) => 
    idx === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`, ''
  );

  const areaPath = actualCoords.length > 0 
    ? `${linePath} L ${actualCoords[actualCoords.length - 1].x},${paddingTop + innerHeight} L ${actualCoords[0].x},${paddingTop + innerHeight} Z`
    : '';

  // Build Forecast dashed line
  let forecastPath = '';
  if (forecastStartIdx >= 0) {
    const fCoords = chartPoints.slice(forecastStartIdx).map((p, offset) => ({
      x: getX(forecastStartIdx + offset),
      y: getY(p.value)
    }));
    forecastPath = fCoords.reduce((acc, curr, idx) => 
      idx === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`, ''
    );
  }

  // Build SMA path
  const smaCoords: { x: number; y: number }[] = [];
  smaPoints.forEach((val, idx) => {
    if (val !== null) {
      smaCoords.push({ x: getX(idx), y: getY(val) });
    }
  });
  const smaPath = smaCoords.reduce((acc, curr, idx) => 
    idx === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`, ''
  );

  // Active hover point
  const activePt = hoverIndex !== null && chartPoints[hoverIndex] ? chartPoints[hoverIndex] : null;

  return (
    <div className="space-y-3">
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-gray-300 font-medium">
            <span className="w-3 h-1 rounded bg-[#21F1A8]"></span>
            {metricName} (Actual)
          </span>
          {smaCoords.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white">
              <input 
                type="checkbox" 
                checked={showSMA} 
                onChange={(e) => setShowSMA(e.target.checked)}
                className="rounded accent-[#21F1A8]"
              />
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-2.5 h-0.5 bg-amber-400"></span> 3-Period SMA
              </span>
            </label>
          )}
          {forecastStartIdx >= 0 && (
            <span className="flex items-center gap-1 text-cyan-400 text-[11px] font-mono">
              <span className="w-2.5 h-0.5 border-t border-dashed border-cyan-400"></span> Forecast Projection
            </span>
          )}
        </div>

        {activePt && (
          <div className="bg-[#141414] border border-[#21F1A8]/40 px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-2">
            <span className="text-gray-400">{activePt.period}:</span>
            <span className="text-[#21F1A8] font-bold">
              {activePt.value.toLocaleString()}
            </span>
            {activePt.isForecast && (
              <span className="text-cyan-400 text-[10px] uppercase font-bold">(Forecast)</span>
            )}
          </div>
        )}
      </div>

      {/* Responsive SVG Container */}
      <div className="relative w-full bg-[#141414] rounded-2xl border border-[#262626] p-2 overflow-hidden select-none">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-64 sm:h-72 overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#21F1A8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#21F1A8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d8f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00d8f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingTop + innerHeight * (1 - pct);
            const val = minVal + (maxVal - minVal) * pct;
            return (
              <g key={i}>
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={width - paddingRight} 
                  y2={y} 
                  stroke="#262626" 
                  strokeDasharray="3,3" 
                />
                <text 
                  x={paddingLeft - 8} 
                  y={y + 3.5} 
                  textAnchor="end" 
                  fill="#666" 
                  fontSize="10" 
                  fontFamily="monospace"
                >
                  {Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Historical line */}
          <path 
            d={linePath} 
            fill="none" 
            stroke="#21F1A8" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* SMA line */}
          {showSMA && smaPath && (
            <path 
              d={smaPath} 
              fill="none" 
              stroke="#fbbf24" 
              strokeWidth="1.75" 
              strokeDasharray="4,3" 
            />
          )}

          {/* Forecast line */}
          {forecastPath && (
            <path 
              d={forecastPath} 
              fill="none" 
              stroke="#00d8f6" 
              strokeWidth="2.5" 
              strokeDasharray="5,4" 
            />
          )}

          {/* X Axis labels & Data point dots */}
          {chartPoints.map((pt, idx) => {
            const x = getX(idx);
            const y = getY(pt.value);
            const isHovered = hoverIndex === idx;

            // Only show labels for every N points if many points exist
            const step = Math.ceil(chartPoints.length / 8);
            const showLabel = idx % step === 0 || idx === chartPoints.length - 1;

            return (
              <g key={idx}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line 
                    x1={x} 
                    y1={paddingTop} 
                    x2={x} 
                    y2={paddingTop + innerHeight} 
                    stroke="#21F1A8" 
                    strokeWidth="1" 
                    strokeDasharray="2,2" 
                  />
                )}

                {/* Point dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : pt.isForecast ? 3.5 : 4}
                  fill={pt.isForecast ? '#00d8f6' : '#141414'}
                  stroke={pt.isForecast ? '#00d8f6' : '#21F1A8'}
                  strokeWidth="2"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoverIndex(idx)}
                />

                {/* Invisible hover trigger area */}
                <rect 
                  x={x - (innerWidth / chartPoints.length) / 2}
                  y={paddingTop}
                  width={innerWidth / chartPoints.length}
                  height={innerHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(idx)}
                />

                {/* Label on X-axis */}
                {showLabel && (
                  <text
                    x={x}
                    y={paddingTop + innerHeight + 18}
                    textAnchor="middle"
                    fill="#777"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {pt.period}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// 2. PARETO (80/20 RULE) ANALYSIS CHART
// ============================================================================
interface ParetoProps {
  data: { category: string; value: number }[];
  metricName: string;
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string | null;
}

export const Pareto8020Chart: React.FC<ParetoProps> = ({
  data,
  metricName,
  onSelectCategory,
  selectedCategory
}) => {
  const { sortedData, total, vitalCount } = useMemo(() => {
    if (!data || data.length === 0) return { sortedData: [], total: 0, vitalCount: 0 };

    const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, 10);
    const sum = sorted.reduce((acc, curr) => acc + curr.value, 0);

    let runningSum = 0;
    let vCount = 0;
    const enriched = sorted.map((item, idx) => {
      runningSum += item.value;
      const cumPct = sum > 0 ? (runningSum / sum) * 100 : 0;
      if (cumPct <= 80 || (idx === 0 && cumPct > 80)) vCount++;
      return {
        ...item,
        cumulativePercent: Math.round(cumPct * 10) / 10
      };
    });

    return { sortedData: enriched, total: sum, vitalCount: vCount };
  }, [data]);

  if (sortedData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-gray-500 bg-[#141414] rounded-xl border border-[#262626]">
        No dimensional data available for Pareto (80/20) analysis.
      </div>
    );
  }

  const width = 800;
  const height = 280;
  const paddingLeft = 55;
  const paddingRight = 55;
  const paddingTop = 25;
  const paddingBottom = 60;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...sortedData.map(d => d.value), 1);
  const barWidth = Math.min(50, (innerWidth / sortedData.length) * 0.65);

  const getBarX = (idx: number) => paddingLeft + (idx + 0.5) * (innerWidth / sortedData.length) - barWidth / 2;
  const getLineX = (idx: number) => paddingLeft + (idx + 0.5) * (innerWidth / sortedData.length);
  const getY = (val: number) => paddingTop + innerHeight - (val / maxVal) * innerHeight;
  const getPctY = (pct: number) => paddingTop + innerHeight - (pct / 100) * innerHeight;

  // Cumulative line coordinates
  const cumCoords = sortedData.map((d, i) => ({
    x: getLineX(i),
    y: getPctY(d.cumulativePercent)
  }));

  const cumLinePath = cumCoords.reduce((acc, curr, idx) => 
    idx === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`, ''
  );

  return (
    <div className="space-y-3">
      {/* Header Insights */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-[#21F1A8]/15 text-[#21F1A8] font-bold text-[10px] font-mono">
            PARETO PRINCIPLE (80/20)
          </span>
          <span className="text-gray-300">
            Vital <strong className="text-white">{vitalCount}</strong> of {sortedData.length} items drive ~80% of {metricName}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#21F1A8]"></span> Item Value
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-amber-400"></span> Cumulative %
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 border-t border-dashed border-red-400"></span> 80% Cutoff
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full bg-[#141414] rounded-2xl border border-[#262626] p-2 overflow-hidden select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 sm:h-72 overflow-visible">
          {/* Horizontal 80% line */}
          <line
            x1={paddingLeft}
            y1={getPctY(80)}
            x2={width - paddingRight}
            y2={getPctY(80)}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
          <text
            x={width - paddingRight + 5}
            y={getPctY(80) + 3.5}
            fill="#ef4444"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            80%
          </text>

          {/* Left Y Axis grid & labels */}
          {[0, 0.5, 1].map((pct, i) => {
            const y = paddingTop + innerHeight * (1 - pct);
            const val = maxVal * pct;
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#222" />
                <text x={paddingLeft - 8} y={y + 3.5} textAnchor="end" fill="#666" fontSize="10" fontFamily="monospace">
                  {Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Right Y Axis labels for cumulative % */}
          {[0, 50, 100].map((pct, i) => {
            const y = getPctY(pct);
            return (
              <text key={i} x={width - paddingRight + 8} y={y + 3.5} fill="#888" fontSize="10" fontFamily="monospace">
                {pct}%
              </text>
            );
          })}

          {/* Bars */}
          {sortedData.map((d, idx) => {
            const x = getBarX(idx);
            const y = getY(d.value);
            const h = innerHeight - (y - paddingTop);
            const isSelected = selectedCategory === d.category;
            const isVital = d.cumulativePercent <= 80 || (idx === 0 && d.cumulativePercent > 80);

            return (
              <g key={idx} className="cursor-pointer group" onClick={() => onSelectCategory?.(d.category)}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(2, h)}
                  rx="4"
                  fill={isSelected ? '#00d8f6' : isVital ? '#21F1A8' : '#2a4439'}
                  className="transition-colors group-hover:fill-[#1cdb97]"
                />
                {/* Bar Value text */}
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="#bbb"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
                </text>

                {/* X Category Label */}
                <text
                  x={x + barWidth / 2}
                  y={paddingTop + innerHeight + 16}
                  textAnchor="end"
                  transform={`rotate(-35, ${x + barWidth / 2}, ${paddingTop + innerHeight + 16})`}
                  fill={isSelected ? '#21F1A8' : '#888'}
                  fontSize="10"
                  className="truncate max-w-[80px]"
                >
                  {d.category.length > 12 ? `${d.category.slice(0, 10)}...` : d.category}
                </text>
              </g>
            );
          })}

          {/* Cumulative Percentage Line */}
          <path d={cumLinePath} fill="none" stroke="#fbbf24" strokeWidth="2.25" strokeLinecap="round" />

          {/* Cumulative Points */}
          {cumCoords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill="#141414"
              stroke="#fbbf24"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// 3. SVG DONUT COMPOSITION CHART
// ============================================================================
interface DonutProps {
  data: { category: string; value: number; share: number }[];
  metricName: string;
  onSelectCategory?: (category: string) => void;
}

const PALETTE = ['#21F1A8', '#00d8f6', '#818cf8', '#f59e0b', '#ec4899', '#10b981', '#a855f7'];

export const DonutCompositionChart: React.FC<DonutProps> = ({
  data,
  metricName,
  onSelectCategory
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const topItems = useMemo(() => {
    return (data || []).slice(0, 6);
  }, [data]);

  const total = useMemo(() => {
    return topItems.reduce((acc, curr) => acc + curr.value, 0);
  }, [topItems]);

  if (topItems.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-gray-500 bg-[#141414] rounded-xl border border-[#262626]">
        No dimensional data to render composition donut.
      </div>
    );
  }

  // Calculate slice angles for SVG circles stroke-dasharray
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const slices = topItems.map((item, idx) => {
    const shareFraction = total > 0 ? item.value / total : 0;
    const strokeDash = `${shareFraction * circumference} ${circumference}`;
    const strokeOffset = -accumulatedAngle;
    accumulatedAngle += shareFraction * circumference;

    return {
      ...item,
      color: PALETTE[idx % PALETTE.length],
      strokeDash,
      strokeOffset
    };
  });

  const activeItem = hoverIdx !== null ? slices[hoverIdx] : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-[#141414] rounded-2xl border border-[#262626] p-4">
      {/* SVG Donut */}
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 180 180" className="w-44 h-44 transform -rotate-90">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="#222"
            strokeWidth="24"
          />
          {slices.map((s, i) => (
            <circle
              key={i}
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke={s.color}
              strokeWidth={hoverIdx === i ? 28 : 24}
              strokeDasharray={s.strokeDash}
              strokeDashoffset={s.strokeOffset}
              className="cursor-pointer transition-all duration-300"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => onSelectCategory?.(s.category)}
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
          {activeItem ? (
            <>
              <span className="text-[10px] text-gray-400 font-mono truncate max-w-[90px]">{activeItem.category}</span>
              <span className="text-base font-bold text-white font-mono">{activeItem.share}%</span>
              <span className="text-[9px] text-[#21F1A8] font-mono">{activeItem.value.toLocaleString()}</span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-gray-400 uppercase font-mono">Total</span>
              <span className="text-base font-extrabold text-white font-mono">{total.toLocaleString()}</span>
              <span className="text-[9px] text-gray-500 font-mono">{metricName}</span>
            </>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-1.5 text-xs">
        {slices.map((s, idx) => (
          <div 
            key={idx}
            onClick={() => onSelectCategory?.(s.category)}
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(null)}
            className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
              hoverIdx === idx ? 'bg-[#222]' : 'hover:bg-[#1a1a1a]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
              <span className="text-gray-300 truncate max-w-[110px]">{s.category}</span>
            </div>
            <div className="text-right font-mono shrink-0 pl-2">
              <span className="text-white font-semibold">{s.share}%</span>
              <span className="text-gray-500 text-[10px] block">{s.value.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 4. STATISTICAL BOXPLOT & OUTLIER INSPECTOR
// ============================================================================
interface StatsInspectorProps {
  rows: Record<string, any>[];
  columns: ColumnProfile[];
}

export const StatisticalBoxplotInspector: React.FC<StatsInspectorProps> = ({ rows, columns }) => {
  const numericCols = useMemo(() => {
    return columns.filter(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate);
  }, [columns]);

  const [selectedCol, setSelectedCol] = useState<string>(numericCols[0]?.name || '');

  const stats = useMemo(() => {
    if (!selectedCol || rows.length === 0) return null;
    const values = rows
      .map(r => Number(r[selectedCol]))
      .filter(v => typeof v === 'number' && !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return null;

    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    const min = values[0];
    const max = values[n - 1];

    const getPercentile = (p: number) => {
      const idx = (n - 1) * p;
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      const weight = idx - lower;
      return values[lower] * (1 - weight) + values[upper] * weight;
    };

    const q1 = getPercentile(0.25);
    const median = getPercentile(0.50);
    const q3 = getPercentile(0.75);
    const iqr = q3 - q1;

    // Fences
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    const outliers = values.filter(v => v < lowerFence || v > upperFence);

    // Variance & StdDev
    const variance = values.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / (n - 1 || 1);
    const stdDev = Math.sqrt(variance);

    // Skewness
    const m3 = values.reduce((acc, curr) => acc + Math.pow(curr - mean, 3), 0) / n;
    const skewness = stdDev !== 0 ? m3 / Math.pow(stdDev, 3) : 0;

    return {
      n,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      min,
      max,
      q1: Math.round(q1 * 100) / 100,
      q3: Math.round(q3 * 100) / 100,
      iqr: Math.round(iqr * 100) / 100,
      lowerFence: Math.round(lowerFence * 100) / 100,
      upperFence: Math.round(upperFence * 100) / 100,
      outlierCount: outliers.length,
      variance: Math.round(variance * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      skewness: Math.round(skewness * 100) / 100
    };
  }, [selectedCol, rows]);

  if (numericCols.length === 0 || !stats) {
    return <div className="p-4 text-xs text-gray-500">No numeric variables available for distribution audit.</div>;
  }

  // Visual Box Plot scaling
  const range = stats.max - stats.min || 1;
  const getPct = (val: number) => Math.max(0, Math.min(100, ((val - stats.min) / range) * 100));

  return (
    <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#21F1A8]" />
            STATISTICAL DISTRIBUTION & FIVE-NUMBER SUMMARY
          </h3>
          <p className="text-xs text-gray-400">Parametric and non-parametric data dispersion analytics.</p>
        </div>

        <select
          value={selectedCol}
          onChange={(e) => setSelectedCol(e.target.value)}
          className="bg-[#141414] text-xs text-[#21F1A8] font-mono px-3 py-1.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
        >
          {numericCols.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Visual Boxplot Horizontal representation */}
      <div className="space-y-2 bg-[#141414] p-4 rounded-xl border border-[#262626]">
        <div className="flex justify-between text-[11px] text-gray-400 font-mono">
          <span>Min: {stats.min.toLocaleString()}</span>
          <span>Median: {stats.median.toLocaleString()}</span>
          <span>Max: {stats.max.toLocaleString()}</span>
        </div>

        <div className="relative h-12 flex items-center">
          {/* Whiskers line (Min to Max) */}
          <div className="absolute w-full h-1 bg-[#282828] rounded"></div>

          {/* Interquartile Box (Q1 to Q3) */}
          <div 
            className="absolute h-8 bg-[#21F1A8]/20 border-2 border-[#21F1A8] rounded"
            style={{
              left: `${getPct(stats.q1)}%`,
              width: `${Math.max(2, getPct(stats.q3) - getPct(stats.q1))}%`
            }}
          ></div>

          {/* Median line */}
          <div 
            className="absolute h-10 w-1 bg-white shadow-md z-10"
            style={{ left: `${getPct(stats.median)}%` }}
            title={`Median: ${stats.median}`}
          ></div>

          {/* Outlier markers if any */}
          {stats.outlierCount > 0 && (
            <div 
              className="absolute w-2 h-2 rounded-full bg-red-400 animate-ping"
              style={{ left: `${getPct(stats.max)}%` }}
              title={`${stats.outlierCount} Outliers outside 1.5x IQR fence`}
            ></div>
          )}
        </div>

        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
          <span>Q1 (25%): {stats.q1.toLocaleString()}</span>
          <span>IQR: {stats.iqr.toLocaleString()}</span>
          <span>Q3 (75%): {stats.q3.toLocaleString()}</span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]">
          <span className="text-gray-500 text-[10px] block">Mean (Average)</span>
          <span className="text-white font-bold text-sm">{stats.mean.toLocaleString()}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]">
          <span className="text-gray-500 text-[10px] block">Std Deviation (σ)</span>
          <span className="text-[#21F1A8] font-bold text-sm">±{stats.stdDev.toLocaleString()}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]">
          <span className="text-gray-500 text-[10px] block">Skewness Index</span>
          <span className={`font-bold text-sm ${Math.abs(stats.skewness) > 1 ? 'text-amber-400' : 'text-white'}`}>
            {stats.skewness} ({stats.skewness > 0 ? 'Right Skew' : stats.skewness < 0 ? 'Left Skew' : 'Normal'})
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]">
          <span className="text-gray-500 text-[10px] block">Outlier Detection</span>
          <span className={`font-bold text-sm ${stats.outlierCount > 0 ? 'text-red-400' : 'text-[#21F1A8]'}`}>
            {stats.outlierCount} records ({((stats.outlierCount / stats.n) * 100).toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. WHAT-IF SCENARIO & SENSITIVITY SIMULATOR
// ============================================================================
interface WhatIfProps {
  baselineRevenue: number;
  baselineProfit: number;
  baselineVolume?: number;
}

export const WhatIfScenarioSimulator: React.FC<WhatIfProps> = ({
  baselineRevenue,
  baselineProfit,
  baselineVolume = 1000
}) => {
  const [priceShift, setPriceShift] = useState<number>(0); // %
  const [volumeShift, setVolumeShift] = useState<number>(0); // %
  const [costShift, setCostShift] = useState<number>(0); // %

  const baseCost = baselineRevenue - baselineProfit;

  // Real-time calculations
  const projectedRevenue = baselineRevenue * (1 + volumeShift / 100) * (1 + priceShift / 100);
  const projectedCost = baseCost * (1 + volumeShift / 100) * (1 + costShift / 100);
  const projectedProfit = projectedRevenue - projectedCost;

  const revDelta = projectedRevenue - baselineRevenue;
  const profitDelta = projectedProfit - baselineProfit;
  const revDeltaPct = baselineRevenue > 0 ? (revDelta / baselineRevenue) * 100 : 0;
  const profitDeltaPct = baselineProfit > 0 ? (profitDelta / Math.abs(baselineProfit)) * 100 : 0;

  const resetAll = () => {
    setPriceShift(0);
    setVolumeShift(0);
    setCostShift(0);
  };

  return (
    <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#21F1A8]" />
            WHAT-IF BUSINESS SCENARIO SIMULATOR
          </h3>
          <p className="text-xs text-gray-400">
            Model business levers (Pricing, Market Volume, COGS) to project financial outcome deltas in real-time.
          </p>
        </div>

        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#333] text-gray-300 text-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Levers
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-[#141414] p-4 rounded-xl border border-[#262626]">
        {/* Price Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-300 font-medium">Price Adjustment</span>
            <span className={`font-bold ${priceShift > 0 ? 'text-[#21F1A8]' : priceShift < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {priceShift > 0 ? '+' : ''}{priceShift}%
            </span>
          </div>
          <input 
            type="range" 
            min="-30" 
            max="30" 
            value={priceShift} 
            onChange={(e) => setPriceShift(Number(e.target.value))}
            className="w-full accent-[#21F1A8] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>-30%</span>
            <span>0%</span>
            <span>+30%</span>
          </div>
        </div>

        {/* Volume Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-300 font-medium">Demand / Volume Shift</span>
            <span className={`font-bold ${volumeShift > 0 ? 'text-[#21F1A8]' : volumeShift < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {volumeShift > 0 ? '+' : ''}{volumeShift}%
            </span>
          </div>
          <input 
            type="range" 
            min="-50" 
            max="50" 
            value={volumeShift} 
            onChange={(e) => setVolumeShift(Number(e.target.value))}
            className="w-full accent-[#21F1A8] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>-50%</span>
            <span>0%</span>
            <span>+50%</span>
          </div>
        </div>

        {/* COGS Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-300 font-medium">COGS / Unit Cost</span>
            <span className={`font-bold ${costShift > 0 ? 'text-red-400' : costShift < 0 ? 'text-[#21F1A8]' : 'text-gray-400'}`}>
              {costShift > 0 ? '+' : ''}{costShift}%
            </span>
          </div>
          <input 
            type="range" 
            min="-30" 
            max="30" 
            value={costShift} 
            onChange={(e) => setCostShift(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>-30%</span>
            <span>0%</span>
            <span>+30%</span>
          </div>
        </div>
      </div>

      {/* Projection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Revenue Projection */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-2">
          <span className="text-xs text-gray-400 font-mono">Projected Total Revenue</span>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl font-bold text-white font-mono">
              ${Math.round(projectedRevenue).toLocaleString()}
            </span>
            <span className={`text-xs font-mono font-bold flex items-center ${revDelta >= 0 ? 'text-[#21F1A8]' : 'text-red-400'}`}>
              {revDelta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {revDelta >= 0 ? '+' : ''}{Math.round(revDelta).toLocaleString()} ({revDeltaPct.toFixed(1)}%)
            </span>
          </div>
          <div className="text-[10px] text-gray-500">
            Baseline: ${Math.round(baselineRevenue).toLocaleString()}
          </div>
        </div>

        {/* Profit Projection */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-2">
          <span className="text-xs text-gray-400 font-mono">Projected Operating Margin / Profit</span>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl font-bold text-white font-mono">
              ${Math.round(projectedProfit).toLocaleString()}
            </span>
            <span className={`text-xs font-mono font-bold flex items-center ${profitDelta >= 0 ? 'text-[#21F1A8]' : 'text-red-400'}`}>
              {profitDelta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {profitDelta >= 0 ? '+' : ''}{Math.round(profitDelta).toLocaleString()} ({profitDeltaPct.toFixed(1)}%)
            </span>
          </div>
          <div className="text-[10px] text-gray-500">
            Baseline: ${Math.round(baselineProfit).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. MULTI-DIMENSIONAL PIVOT TABLE ANALYZER
// ============================================================================
interface PivotProps {
  rows: Record<string, any>[];
  columns: ColumnProfile[];
}

export const MultiDimensionalPivotTable: React.FC<PivotProps> = ({ rows, columns }) => {
  const stringCols = useMemo(() => columns.filter(c => c.dataType === 'string'), [columns]);
  const numCols = useMemo(() => columns.filter(c => c.dataType === 'number'), [columns]);

  const [rowDim, setRowDim] = useState<string>(stringCols[0]?.name || '');
  const [colDim, setColDim] = useState<string>(stringCols[1]?.name || stringCols[0]?.name || '');
  const [valMetric, setValMetric] = useState<string>(numCols[0]?.name || '');
  const [aggType, setAggType] = useState<'sum' | 'avg' | 'count'>('sum');

  // Compute 2D Cross-Tab matrix
  const { rowHeaders, colHeaders, matrix, rowTotals, colTotals, grandTotal } = useMemo(() => {
    if (!rowDim || !colDim || !valMetric || rows.length === 0) {
      return { rowHeaders: [], colHeaders: [], matrix: {}, rowTotals: {}, colTotals: {}, grandTotal: 0 };
    }

    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const cellMap: Record<string, Record<string, { sum: number; count: number }>> = {};

    rows.forEach(r => {
      const rKey = String(r[rowDim] || 'Unassigned');
      const cKey = String(r[colDim] || 'Unassigned');
      const val = Number(r[valMetric]) || 0;

      rowSet.add(rKey);
      colSet.add(cKey);

      if (!cellMap[rKey]) cellMap[rKey] = {};
      if (!cellMap[rKey][cKey]) cellMap[rKey][cKey] = { sum: 0, count: 0 };

      cellMap[rKey][cKey].sum += val;
      cellMap[rKey][cKey].count += 1;
    });

    const rHeaders = Array.from(rowSet).slice(0, 10);
    const cHeaders = Array.from(colSet).slice(0, 8);

    const m: Record<string, Record<string, number>> = {};
    const rTotals: Record<string, number> = {};
    const cTotals: Record<string, number> = {};
    let gTotal = 0;

    rHeaders.forEach(rh => {
      m[rh] = {};
      let rSum = 0;
      let rCount = 0;

      cHeaders.forEach(ch => {
        const cell = cellMap[rh]?.[ch];
        const computed = cell 
          ? (aggType === 'sum' ? cell.sum : aggType === 'avg' ? cell.sum / (cell.count || 1) : cell.count)
          : 0;

        m[rh][ch] = Math.round(computed * 100) / 100;
        rSum += cell?.sum || 0;
        rCount += cell?.count || 0;

        if (!cTotals[ch]) cTotals[ch] = 0;
        cTotals[ch] += computed;
      });

      rTotals[rh] = aggType === 'avg' ? Math.round((rSum / (rCount || 1)) * 100) / 100 : Math.round(rSum * 100) / 100;
      gTotal += rTotals[rh];
    });

    return {
      rowHeaders: rHeaders,
      colHeaders: cHeaders,
      matrix: m,
      rowTotals: rTotals,
      colTotals: cTotals,
      grandTotal: Math.round(gTotal * 100) / 100
    };
  }, [rowDim, colDim, valMetric, aggType, rows]);

  const maxCellValue = useMemo(() => {
    let max = 0;
    rowHeaders.forEach(rh => {
      colHeaders.forEach(ch => {
        const v = matrix[rh]?.[ch] || 0;
        if (v > max) max = v;
      });
    });
    return max || 1;
  }, [rowHeaders, colHeaders, matrix]);

  const exportPivotCSV = () => {
    const csvRows: string[] = [];
    csvRows.push([rowDim, ...colHeaders, 'Total'].join(','));
    rowHeaders.forEach(rh => {
      const line = [rh, ...colHeaders.map(ch => matrix[rh]?.[ch] || 0), rowTotals[rh] || 0];
      csvRows.push(line.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pivot_${rowDim}_by_${colDim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (stringCols.length === 0 || numCols.length === 0) {
    return <div className="p-4 text-xs text-gray-500">Need at least 1 string and 1 numeric column for Pivot analysis.</div>;
  }

  return (
    <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Table2 className="w-4 h-4 text-[#21F1A8]" />
            MULTI-DIMENSIONAL CROSS-TAB / PIVOT MATRIX
          </h3>
          <p className="text-xs text-gray-400">Slice and dice metrics across dual orthogonal categorical axes.</p>
        </div>

        <button
          onClick={exportPivotCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#333] text-gray-300 text-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#21F1A8]" /> Export Pivot CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#141414] p-3 rounded-xl border border-[#262626] text-xs">
        <div>
          <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">Row Dimension</label>
          <select 
            value={rowDim} 
            onChange={(e) => setRowDim(e.target.value)}
            className="w-full bg-[#1b1b1b] text-white p-2 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
          >
            {stringCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">Column Dimension</label>
          <select 
            value={colDim} 
            onChange={(e) => setColDim(e.target.value)}
            className="w-full bg-[#1b1b1b] text-white p-2 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
          >
            {stringCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">Metric Field</label>
          <select 
            value={valMetric} 
            onChange={(e) => setValMetric(e.target.value)}
            className="w-full bg-[#1b1b1b] text-white p-2 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
          >
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">Aggregation</label>
          <select 
            value={aggType} 
            onChange={(e) => setAggType(e.target.value as any)}
            className="w-full bg-[#1b1b1b] text-[#21F1A8] font-bold p-2 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
          >
            <option value="sum">SUM</option>
            <option value="avg">AVERAGE</option>
            <option value="count">COUNT</option>
          </select>
        </div>
      </div>

      {/* Cross-tab table with heat-map opacity */}
      <div className="overflow-x-auto rounded-xl border border-[#262626]">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-[#141414] text-gray-400 border-b border-[#282828] font-mono">
              <th className="p-3 font-semibold text-white">{rowDim} \ {colDim}</th>
              {colHeaders.map(ch => (
                <th key={ch} className="p-3 font-semibold text-right">{ch}</th>
              ))}
              <th className="p-3 font-semibold text-right text-[#21F1A8] bg-[#1a231f]">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#242424] font-mono">
            {rowHeaders.map(rh => (
              <tr key={rh} className="hover:bg-[#1a1a1a] transition-colors">
                <td className="p-3 font-medium text-gray-200 bg-[#161616] whitespace-nowrap">{rh}</td>
                {colHeaders.map(ch => {
                  const val = matrix[rh]?.[ch] || 0;
                  const intensity = Math.min(0.65, (val / maxCellValue) * 0.65);
                  return (
                    <td 
                      key={ch} 
                      className="p-3 text-right text-gray-200"
                      style={{
                        backgroundColor: val > 0 ? `rgba(33, 241, 168, ${intensity})` : undefined
                      }}
                    >
                      {val > 0 ? val.toLocaleString() : '-'}
                    </td>
                  );
                })}
                <td className="p-3 text-right font-bold text-white bg-[#161f1b]">
                  {(rowTotals[rh] || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#141414] text-gray-300 font-mono font-bold border-t border-[#333]">
              <td className="p-3 text-white uppercase">Col Summary</td>
              {colHeaders.map(ch => (
                <td key={ch} className="p-3 text-right text-[#21F1A8]">
                  {(colTotals[ch] || 0).toLocaleString()}
                </td>
              ))}
              <td className="p-3 text-right text-[#21F1A8] bg-[#1a231f] text-sm">
                {grandTotal.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// 7. MULTI-VARIABLE SCATTER PLOT & CORRELATION REGRESSION
// ============================================================================
export interface ScatterPointData {
  id: string;
  category: string;
  xVal: number;
  yVal: number;
  sizeVal?: number;
  rawRow: Record<string, any>;
}

export interface ScatterPlotProps {
  rows: Record<string, any>[];
  columns: ColumnProfile[];
  defaultXField?: string;
  defaultYField?: string;
  defaultCategoryField?: string;
  defaultSizeField?: string;
  onPointClick?: (point: ScatterPointData) => void;
  title?: string;
}

export const ScatterPlotChart: React.FC<ScatterPlotProps> = ({
  rows,
  columns,
  defaultXField,
  defaultYField,
  defaultCategoryField,
  defaultSizeField,
  onPointClick,
  title = 'SCATTER PLOT & CORRELATION REGRESSION'
}) => {
  const numericCols = useMemo(() => {
    return columns.filter(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id'));
  }, [columns]);

  const stringCols = useMemo(() => {
    return columns.filter(c => c.dataType === 'string' && !c.name.toLowerCase().includes('id'));
  }, [columns]);

  const [xField, setXField] = useState<string>(defaultXField || numericCols[0]?.name || '');
  const [yField, setYField] = useState<string>(defaultYField || numericCols[1]?.name || numericCols[0]?.name || '');
  const [catField, setCatField] = useState<string>(defaultCategoryField || stringCols[0]?.name || '');
  const [sizeField, setSizeField] = useState<string>(defaultSizeField || '');
  const [showRegression, setShowRegression] = useState(true);
  const [hoverPoint, setHoverPoint] = useState<ScatterPointData | null>(null);

  // Compute Scatter Data & Linear Regression
  const { points, xMin, xMax, yMin, yMax, correlation, slope, intercept, rSquared } = useMemo(() => {
    if (!xField || !yField || rows.length === 0) {
      return { points: [], xMin: 0, xMax: 1, yMin: 0, yMax: 1, correlation: 0, slope: 0, intercept: 0, rSquared: 0 };
    }

    const validPoints: ScatterPointData[] = [];
    rows.forEach((r, idx) => {
      const x = Number(r[xField]);
      const y = Number(r[yField]);
      const sz = sizeField ? Number(r[sizeField]) : undefined;
      const cat = catField ? String(r[catField] ?? `Record ${idx + 1}`) : `Record ${idx + 1}`;

      if (!isNaN(x) && !isNaN(y)) {
        validPoints.push({
          id: `pt-${idx}`,
          category: cat,
          xVal: x,
          yVal: y,
          sizeVal: !isNaN(sz!) ? sz : undefined,
          rawRow: r
        });
      }
    });

    if (validPoints.length < 2) {
      return { points: validPoints, xMin: 0, xMax: 1, yMin: 0, yMax: 1, correlation: 0, slope: 0, intercept: 0, rSquared: 0 };
    }

    const xVals = validPoints.map(p => p.xVal);
    const yVals = validPoints.map(p => p.yVal);

    const xMinRaw = Math.min(...xVals);
    const xMaxRaw = Math.max(...xVals);
    const yMinRaw = Math.min(...yVals);
    const yMaxRaw = Math.max(...yVals);

    const xPad = (xMaxRaw - xMinRaw) * 0.08 || 1;
    const yPad = (yMaxRaw - yMinRaw) * 0.08 || 1;

    const xMinVal = Math.max(0, xMinRaw - xPad);
    const xMaxVal = xMaxRaw + xPad;
    const yMinVal = Math.max(0, yMinRaw - yPad);
    const yMaxVal = yMaxRaw + yPad;

    // Linear Regression & Pearson Correlation
    const n = validPoints.length;
    const sumX = xVals.reduce((a, b) => a + b, 0);
    const sumY = yVals.reduce((a, b) => a + b, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = xVals[i] - meanX;
      const dy = yVals[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const r = (denomX > 0 && denomY > 0) ? numerator / Math.sqrt(denomX * denomY) : 0;
    const m = denomX > 0 ? numerator / denomX : 0;
    const b = meanY - m * meanX;

    return {
      points: validPoints,
      xMin: xMinVal,
      xMax: xMaxVal,
      yMin: yMinVal,
      yMax: yMaxVal,
      correlation: Math.round(r * 1000) / 1000,
      slope: m,
      intercept: b,
      rSquared: Math.round(r * r * 1000) / 1000
    };
  }, [rows, xField, yField, catField, sizeField]);

  const sizeMin = useMemo(() => {
    if (!sizeField) return 1;
    const vals = points.map(p => p.sizeVal || 0);
    return Math.min(...vals, 1);
  }, [points, sizeField]);

  const sizeMax = useMemo(() => {
    if (!sizeField) return 1;
    const vals = points.map(p => p.sizeVal || 0);
    return Math.max(...vals, 1);
  }, [points, sizeField]);

  if (numericCols.length < 2) {
    return (
      <div className="p-8 text-center text-xs text-gray-500 bg-[#1c1c1c] rounded-2xl border border-[#2d2d2d]">
        Scatter Plot requires at least 2 numerical dimensions in the schema to analyze correlation.
      </div>
    );
  }

  // Chart dimensions
  const width = 800;
  const height = 360;
  const paddingLeft = 65;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 55;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const getSvgX = (val: number) => paddingLeft + ((val - xMin) / (xMax - xMin || 1)) * innerWidth;
  const getSvgY = (val: number) => paddingTop + innerHeight - ((val - yMin) / (yMax - yMin || 1)) * innerHeight;

  // Trendline Coordinates
  const trendX1 = xMin;
  const trendY1 = slope * trendX1 + intercept;
  const trendX2 = xMax;
  const trendY2 = slope * trendX2 + intercept;

  const svgTrendX1 = getSvgX(trendX1);
  const svgTrendY1 = getSvgY(Math.max(yMin, Math.min(yMax, trendY1)));
  const svgTrendX2 = getSvgX(trendX2);
  const svgTrendY2 = getSvgY(Math.max(yMin, Math.min(yMax, trendY2)));

  const corrMagnitude = Math.abs(correlation);
  const corrText = corrMagnitude >= 0.7 
    ? (correlation > 0 ? 'Strong Positive Correlation' : 'Strong Negative Correlation')
    : corrMagnitude >= 0.4
    ? (correlation > 0 ? 'Moderate Positive' : 'Moderate Negative')
    : corrMagnitude >= 0.2
    ? 'Weak Relationship'
    : 'No Linear Correlation';

  const corrColor = corrMagnitude >= 0.7 
    ? '#21F1A8' 
    : corrMagnitude >= 0.4 
    ? '#00d8f6' 
    : corrMagnitude >= 0.2 
    ? '#f59e0b' 
    : '#888';

  const exportCSV = () => {
    const csvLines = [`Category,${xField},${yField}${sizeField ? `,${sizeField}` : ''}`];
    points.forEach(p => {
      csvLines.push(`"${p.category.replace(/"/g, '""')}",${p.xVal},${p.yVal}${sizeField ? `,${p.sizeVal || ''}` : ''}`);
    });
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Scatter_${xField}_vs_${yField}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-[#21F1A8]" />
            {title}
          </h3>
          <p className="text-xs text-gray-400">
            Bivariate statistical dispersion and linear ordinary least-squares regression trendline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Correlation Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2d2d2d] text-xs font-mono">
            <span className="text-gray-400">Pearson r:</span>
            <span className="font-bold" style={{ color: corrColor }}>
              {correlation > 0 ? `+${correlation}` : correlation}
            </span>
            <span className="text-[10px] text-gray-500 hidden sm:inline">({corrText})</span>
            <span className="text-[10px] text-gray-500 font-mono pl-1 border-l border-[#333]">R²: {rSquared}</span>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#333] text-gray-300 text-xs transition-colors"
            title="Export scatter dataset to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#21F1A8]" />
          </button>
        </div>
      </div>

      {/* Axis Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#141414] p-3 rounded-xl border border-[#262626] text-xs">
        <div>
          <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">X-Axis (Horizontal)</label>
          <select
            value={xField}
            onChange={(e) => setXField(e.target.value)}
            className="w-full bg-[#1b1b1b] text-[#21F1A8] font-mono p-2 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
          >
            {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">Y-Axis (Vertical)</label>
          <select
            value={yField}
            onChange={(e) => setYField(e.target.value)}
            className="w-full bg-[#1b1b1b] text-cyan-400 font-mono p-2 rounded-lg border border-[#333] focus:border-cyan-400 focus:outline-none"
          >
            {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">Label / Dimension</label>
          <select
            value={catField}
            onChange={(e) => setCatField(e.target.value)}
            className="w-full bg-[#1b1b1b] text-white p-2 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
          >
            <option value="">(Row Index)</option>
            {stringCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">Bubble Size (Optional)</label>
          <select
            value={sizeField}
            onChange={(e) => setSizeField(e.target.value)}
            className="w-full bg-[#1b1b1b] text-amber-400 font-mono p-2 rounded-lg border border-[#333] focus:border-amber-400 focus:outline-none"
          >
            <option value="">(Uniform Size)</option>
            {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* SVG Scatterplot Canvas */}
      <div className="relative w-full bg-[#141414] rounded-2xl border border-[#262626] p-2 overflow-hidden select-none">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-72 sm:h-80 overflow-visible"
          onMouseLeave={() => setHoverPoint(null)}
        >
          <defs>
            <linearGradient id="scatterGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#21F1A8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00d8f6" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Gridlines Horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingTop + innerHeight * (1 - pct);
            const val = yMin + (yMax - yMin) * pct;
            return (
              <g key={`y-grid-${i}`}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#222" strokeDasharray="3,3" />
                <text x={paddingLeft - 8} y={y + 3.5} textAnchor="end" fill="#666" fontSize="10" fontFamily="monospace">
                  {Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Gridlines Vertical */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const x = paddingLeft + innerWidth * pct;
            const val = xMin + (xMax - xMin) * pct;
            return (
              <g key={`x-grid-${i}`}>
                <line x1={x} y1={paddingTop} x2={x} y2={paddingTop + innerHeight} stroke="#222" strokeDasharray="3,3" />
                <text x={x} y={paddingTop + innerHeight + 18} textAnchor="middle" fill="#666" fontSize="10" fontFamily="monospace">
                  {Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* X and Y Axis Titles */}
          <text 
            x={paddingLeft + innerWidth / 2} 
            y={paddingTop + innerHeight + 38} 
            textAnchor="middle" 
            fill="#aaa" 
            fontSize="11" 
            fontFamily="monospace"
            fontWeight="bold"
          >
            {xField} →
          </text>

          <text 
            x={-(paddingTop + innerHeight / 2)} 
            y={18} 
            transform="rotate(-90)" 
            textAnchor="middle" 
            fill="#aaa" 
            fontSize="11" 
            fontFamily="monospace"
            fontWeight="bold"
          >
            ↑ {yField}
          </text>

          {/* Regression Line */}
          {showRegression && points.length >= 2 && (
            <line
              x1={svgTrendX1}
              y1={svgTrendY1}
              x2={svgTrendX2}
              y2={svgTrendY2}
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="5,4"
              className="opacity-80"
            />
          )}

          {/* Scatter Data Points */}
          {points.map((pt) => {
            const cx = getSvgX(pt.xVal);
            const cy = getSvgY(pt.yVal);
            let r = 5;
            if (sizeField && pt.sizeVal !== undefined) {
              const szNorm = (pt.sizeVal - sizeMin) / (sizeMax - sizeMin || 1);
              r = 4 + szNorm * 12;
            }

            const isHovered = hoverPoint?.id === pt.id;

            return (
              <g 
                key={pt.id} 
                className="cursor-pointer group"
                onClick={() => onPointClick?.(pt)}
                onMouseEnter={() => setHoverPoint(pt)}
              >
                {/* Crosshair guide on hover */}
                {isHovered && (
                  <>
                    <line x1={paddingLeft} y1={cy} x2={width - paddingRight} y2={cy} stroke="#21F1A8" strokeWidth="1" strokeDasharray="2,2" />
                    <line x1={cx} y1={paddingTop} x2={cx} y2={paddingTop + innerHeight} stroke="#21F1A8" strokeWidth="1" strokeDasharray="2,2" />
                  </>
                )}

                {/* Outer Glow Halo */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? r + 5 : r + 1}
                  fill={isHovered ? '#21F1A8' : 'transparent'}
                  opacity={isHovered ? 0.35 : 0}
                  className="transition-all"
                />

                {/* Main Scatter Bubble */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={isHovered ? '#21F1A8' : '#00d8f6'}
                  stroke={isHovered ? '#ffffff' : '#21F1A8'}
                  strokeWidth={isHovered ? 2 : 1.5}
                  className="transition-transform duration-200"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverPoint && (
          <div className="absolute top-4 right-4 bg-[#181818]/95 border border-[#21F1A8]/60 backdrop-blur-md rounded-xl p-3 text-xs font-mono space-y-1 shadow-2xl pointer-events-none max-w-xs animate-fadeIn">
            <div className="font-bold text-white border-b border-[#2d2d2d] pb-1 truncate">
              {hoverPoint.category}
            </div>
            <div className="flex justify-between gap-4 text-gray-400">
              <span>{xField}:</span>
              <span className="text-[#21F1A8] font-bold">{hoverPoint.xVal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 text-gray-400">
              <span>{yField}:</span>
              <span className="text-cyan-400 font-bold">{hoverPoint.yVal.toLocaleString()}</span>
            </div>
            {sizeField && hoverPoint.sizeVal !== undefined && (
              <div className="flex justify-between gap-4 text-gray-400">
                <span>{sizeField} (Size):</span>
                <span className="text-amber-400 font-bold">{hoverPoint.sizeVal.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-1 text-[10px] text-gray-500 italic">Click point to drill-through</div>
          </div>
        )}
      </div>

      {/* Regression & Trendline Controls */}
      <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 pt-1 border-t border-[#262626]">
        <label className="flex items-center gap-2 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showRegression}
            onChange={(e) => setShowRegression(e.target.checked)}
            className="rounded accent-[#21F1A8]"
          />
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-3 h-0.5 border-t border-dashed border-amber-400"></span>
            Linear Ordinary Least-Squares Fit: 
            <strong className="text-white">y = {slope >= 0 ? `${slope.toFixed(2)}x + ${intercept.toFixed(1)}` : `${slope.toFixed(2)}x - ${Math.abs(intercept).toFixed(1)}`}</strong>
          </span>
        </label>
        <span className="text-[11px] font-mono text-gray-500">
          Showing {points.length} observed coordinates
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// 8. 2D HEAT MAP MATRIX (CATEGORICAL DENSITY & PEARSON CORRELATION)
// ============================================================================
export interface HeatMapProps {
  rows: Record<string, any>[];
  columns: ColumnProfile[];
  defaultRowDim?: string;
  defaultColDim?: string;
  defaultMetric?: string;
  onCellClick?: (rowDim: string, rowVal: string, colDim: string, colVal: string, metricVal: number) => void;
  title?: string;
}

export const HeatMapChart: React.FC<HeatMapProps> = ({
  rows,
  columns,
  defaultRowDim,
  defaultColDim,
  defaultMetric,
  onCellClick,
  title = '2D MULTIVARIATE HEAT MAP DENSITY & CORRELATION'
}) => {
  const stringCols = useMemo(() => columns.filter(c => c.dataType === 'string'), [columns]);
  const numCols = useMemo(() => columns.filter(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate), [columns]);

  const [mode, setMode] = useState<'matrix' | 'correlation'>('matrix');
  const [rowDim, setRowDim] = useState<string>(defaultRowDim || stringCols[0]?.name || '');
  const [colDim, setColDim] = useState<string>(defaultColDim || stringCols[1]?.name || stringCols[0]?.name || '');
  const [metric, setMetric] = useState<string>(defaultMetric || numCols[0]?.name || '');
  const [agg, setAgg] = useState<'sum' | 'avg' | 'count'>('sum');
  const [hoverCell, setHoverCell] = useState<{ r: string; c: string; val: number; count: number } | null>(null);

  // 1. Categorical Density Matrix Computation
  const matrixData = useMemo(() => {
    if (mode !== 'matrix' || !rowDim || !colDim || rows.length === 0) {
      return { rowHeaders: [], colHeaders: [], grid: {}, minVal: 0, maxVal: 1, grandTotal: 0 };
    }

    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const cellMap: Record<string, Record<string, { sum: number; count: number }>> = {};

    rows.forEach(r => {
      const rKey = String(r[rowDim] ?? 'Unassigned');
      const cKey = String(r[colDim] ?? 'Unassigned');
      const val = Number(r[metric]) || 0;

      rowSet.add(rKey);
      colSet.add(cKey);

      if (!cellMap[rKey]) cellMap[rKey] = {};
      if (!cellMap[rKey][cKey]) cellMap[rKey][cKey] = { sum: 0, count: 0 };
      cellMap[rKey][cKey].sum += val;
      cellMap[rKey][cKey].count += 1;
    });

    const rHeaders = Array.from(rowSet).slice(0, 12);
    const cHeaders = Array.from(colSet).slice(0, 10);

    const g: Record<string, Record<string, { val: number; count: number }>> = {};
    let min = Infinity;
    let max = -Infinity;
    let total = 0;

    rHeaders.forEach(rh => {
      g[rh] = {};
      cHeaders.forEach(ch => {
        const cell = cellMap[rh]?.[ch];
        const computed = cell
          ? (agg === 'sum' ? cell.sum : agg === 'avg' ? cell.sum / (cell.count || 1) : cell.count)
          : 0;

        const val = Math.round(computed * 100) / 100;
        const count = cell?.count || 0;
        g[rh][ch] = { val, count };

        if (val > 0) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
        total += val;
      });
    });

    return {
      rowHeaders: rHeaders,
      colHeaders: cHeaders,
      grid: g,
      minVal: min === Infinity ? 0 : min,
      maxVal: max === -Infinity ? 1 : max,
      grandTotal: Math.round(total * 100) / 100
    };
  }, [mode, rowDim, colDim, metric, agg, rows]);

  // 2. Pairwise Correlation Matrix Computation (All Numeric Columns)
  const correlationData = useMemo(() => {
    if (mode !== 'correlation' || numCols.length < 2 || rows.length === 0) {
      return { variables: [], matrix: {} };
    }

    const vars = numCols.slice(0, 8).map(c => c.name);
    const m: Record<string, Record<string, number>> = {};

    vars.forEach(v1 => {
      m[v1] = {};
      vars.forEach(v2 => {
        if (v1 === v2) {
          m[v1][v2] = 1.0;
        } else {
          // Pearson Correlation
          const pairs = rows
            .map(r => ({ x: Number(r[v1]), y: Number(r[v2]) }))
            .filter(p => !isNaN(p.x) && !isNaN(p.y));

          if (pairs.length < 2) {
            m[v1][v2] = 0;
          } else {
            const n = pairs.length;
            const meanX = pairs.reduce((acc, p) => acc + p.x, 0) / n;
            const meanY = pairs.reduce((acc, p) => acc + p.y, 0) / n;

            let num = 0;
            let denX = 0;
            let denY = 0;

            pairs.forEach(p => {
              const dx = p.x - meanX;
              const dy = p.y - meanY;
              num += dx * dy;
              denX += dx * dx;
              denY += dy * dy;
            });

            const r = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
            m[v1][v2] = Math.round(r * 100) / 100;
          }
        }
      });
    });

    return { variables: vars, matrix: m };
  }, [mode, numCols, rows]);

  // Interpolate color for heat map cell
  const getCellColor = (val: number, min: number, max: number) => {
    if (val === 0 || min === max) return '#181818';
    const norm = Math.max(0, Math.min(1, (val - min) / (max - min || 1)));
    // Color scale: #14241d (low) -> #0f5132 -> #21F1A8 (peak)
    return `rgba(33, 241, 168, ${0.15 + norm * 0.8})`;
  };

  const getCorrColor = (r: number) => {
    if (r === 1) return 'rgba(33, 241, 168, 0.95)';
    if (r > 0) {
      return `rgba(33, 241, 168, ${0.15 + r * 0.75})`;
    }
    const abs = Math.abs(r);
    return `rgba(239, 68, 68, ${0.15 + abs * 0.75})`;
  };

  return (
    <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Grid className="w-4 h-4 text-[#21F1A8]" />
            {title}
          </h3>
          <p className="text-xs text-gray-400">
            {mode === 'matrix' 
              ? 'Multi-dimensional categorical co-occurrence heat intensity.' 
              : 'Pairwise Pearson correlation coefficients between all schema numerical metrics.'}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-xl border border-[#2d2d2d] text-xs">
          <button
            onClick={() => setMode('matrix')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'matrix' ? 'bg-[#21F1A8] text-black font-semibold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Dimensional Density Grid
          </button>
          <button
            onClick={() => setMode('correlation')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'correlation' ? 'bg-[#21F1A8] text-black font-semibold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Correlation Matrix
          </button>
        </div>
      </div>

      {/* Controls for Dimensional Matrix mode */}
      {mode === 'matrix' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#141414] p-3 rounded-xl border border-[#262626] text-xs">
          <div>
            <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">Row Dimension (Y)</label>
            <select
              value={rowDim}
              onChange={(e) => setRowDim(e.target.value)}
              className="w-full bg-[#1b1b1b] text-white p-2 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
            >
              {stringCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">Column Dimension (X)</label>
            <select
              value={colDim}
              onChange={(e) => setColDim(e.target.value)}
              className="w-full bg-[#1b1b1b] text-white p-2 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
            >
              {stringCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">Metric Field</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full bg-[#1b1b1b] text-[#21F1A8] font-mono p-2 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
            >
              {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-gray-400 block text-[10px] mb-1 uppercase font-mono">Aggregation</label>
            <select
              value={agg}
              onChange={(e) => setAgg(e.target.value as any)}
              className="w-full bg-[#1b1b1b] text-[#21F1A8] font-bold p-2 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
            >
              <option value="sum">SUM</option>
              <option value="avg">AVERAGE</option>
              <option value="count">RECORD COUNT</option>
            </select>
          </div>
        </div>
      )}

      {/* Heat Map Visualization Table */}
      {mode === 'matrix' ? (
        <div className="overflow-x-auto rounded-xl border border-[#262626]">
          <table className="w-full text-xs text-left border-collapse select-none">
            <thead>
              <tr className="bg-[#141414] text-gray-400 border-b border-[#282828] font-mono">
                <th className="p-3 font-semibold text-white sticky left-0 bg-[#141414] z-10">
                  {rowDim} \ {colDim}
                </th>
                {matrixData.colHeaders.map(ch => (
                  <th key={ch} className="p-3 font-semibold text-center truncate max-w-[120px]" title={ch}>
                    {ch}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222] font-mono">
              {matrixData.rowHeaders.map(rh => (
                <tr key={rh} className="hover:brightness-110 transition-all">
                  <td className="p-3 font-medium text-gray-200 bg-[#161616] sticky left-0 z-10 whitespace-nowrap border-r border-[#262626]">
                    {rh}
                  </td>
                  {matrixData.colHeaders.map(ch => {
                    const cell = matrixData.grid[rh]?.[ch] || { val: 0, count: 0 };
                    const cellBg = getCellColor(cell.val, matrixData.minVal, matrixData.maxVal);
                    const isHovered = hoverCell?.r === rh && hoverCell?.c === ch;

                    return (
                      <td
                        key={ch}
                        onClick={() => onCellClick?.(rowDim, rh, colDim, ch, cell.val)}
                        onMouseEnter={() => setHoverCell({ r: rh, c: ch, val: cell.val, count: cell.count })}
                        onMouseLeave={() => setHoverCell(null)}
                        className="p-3 text-center cursor-pointer transition-all border border-[#222]"
                        style={{
                          backgroundColor: cellBg,
                          outline: isHovered ? '2px solid #ffffff' : undefined,
                          color: cell.val > (matrixData.maxVal * 0.4) ? '#ffffff' : '#9ca3af'
                        }}
                        title={`Click to drilldown: ${rh} × ${ch} = ${cell.val.toLocaleString()} (${cell.count} records)`}
                      >
                        <span className="font-semibold text-[11px]">
                          {cell.val > 0 ? cell.val.toLocaleString() : '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Correlation Heat Map Matrix */
        <div className="overflow-x-auto rounded-xl border border-[#262626]">
          <table className="w-full text-xs text-left border-collapse select-none font-mono">
            <thead>
              <tr className="bg-[#141414] text-gray-400 border-b border-[#282828]">
                <th className="p-3 font-semibold text-white sticky left-0 bg-[#141414] z-10">Metric</th>
                {correlationData.variables.map(v => (
                  <th key={v} className="p-3 font-semibold text-center truncate max-w-[100px]" title={v}>
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {correlationData.variables.map(v1 => (
                <tr key={v1}>
                  <td className="p-3 font-semibold text-white bg-[#161616] sticky left-0 z-10 whitespace-nowrap border-r border-[#262626]">
                    {v1}
                  </td>
                  {correlationData.variables.map(v2 => {
                    const r = correlationData.matrix[v1]?.[v2] ?? 0;
                    const bg = getCorrColor(r);

                    return (
                      <td
                        key={v2}
                        className="p-3 text-center border border-[#222] font-bold text-white transition-transform hover:scale-105"
                        style={{ backgroundColor: bg }}
                        title={`${v1} vs ${v2}: Pearson r = ${r > 0 ? `+${r}` : r}`}
                      >
                        {r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Heat Scale Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-[#262626] font-mono">
        <div className="flex items-center gap-2 text-gray-400">
          <span>Heat Scale:</span>
          {mode === 'matrix' ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px]">Min ({matrixData.minVal})</span>
              <div className="w-24 h-3 rounded-full bg-gradient-to-r from-[#181818] via-[#0f5132] to-[#21F1A8] border border-[#333]"></div>
              <span className="text-[10px] text-[#21F1A8]">Max ({matrixData.maxVal.toLocaleString()})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-red-400">-1.0 (Inverse)</span>
              <div className="w-28 h-3 rounded-full bg-gradient-to-r from-red-500 via-[#181818] to-[#21F1A8] border border-[#333]"></div>
              <span className="text-[10px] text-[#21F1A8]">+1.0 (Positive)</span>
            </div>
          )}
        </div>

        <span className="text-[11px] text-gray-500">
          Click any cell to drill-through to matching granular records
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// 9. RADAR / SPIDER WEB MULTI-AXIS CHART
// ============================================================================
export interface RadarProps {
  data: { label: string; value: number; max?: number }[];
  metricName?: string;
  color?: string;
  onAxisClick?: (label: string) => void;
  title?: string;
}

export const RadarSpiderChart: React.FC<RadarProps> = ({
  data,
  metricName = 'Score',
  color = '#21F1A8',
  onAxisClick,
  title = 'RADAR / MULTI-DIMENSIONAL SPIDER FOOTPRINT'
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const cleanData = useMemo(() => {
    return (data || []).slice(0, 8);
  }, [data]);

  const maxVal = useMemo(() => {
    return Math.max(...cleanData.map(d => d.max || d.value), 1);
  }, [cleanData]);

  if (cleanData.length < 3) {
    return (
      <div className="p-8 text-center text-xs text-gray-500 bg-[#1c1c1c] rounded-2xl border border-[#2d2d2d]">
        Radar / Spider chart requires at least 3 dimensional metrics to plot multi-axial polygon.
      </div>
    );
  }

  const size = 320;
  const center = size / 2;
  const radius = center - 50;
  const numAxes = cleanData.length;
  const angleStep = (2 * Math.PI) / numAxes;

  // Compute vertices for regular polygon rings (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Value Polygon Coordinates
  const polygonCoords = cleanData.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (d.value / maxVal) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      label: d.label,
      value: d.value
    };
  });

  const polygonPath = polygonCoords.reduce((acc, curr, idx) => 
    idx === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`, ''
  ) + ' Z';

  return (
    <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#21F1A8]" />
            {title}
          </h3>
          <p className="text-xs text-gray-400">Radial balanced footprint across {numAxes} orthogonal categorical dimensions.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 bg-[#141414] rounded-xl p-4 border border-[#262626]">
        {/* SVG Spider Canvas */}
        <div className="relative">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-72 h-72 sm:w-80 sm:h-80 overflow-visible select-none">
            {/* Concentric rings */}
            {levels.map((lvl, lIdx) => {
              const ringPoints = cleanData.map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const r = lvl * radius;
                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
              }).join(' ');

              return (
                <polygon
                  key={lIdx}
                  points={ringPoints}
                  fill="none"
                  stroke="#282828"
                  strokeWidth="1"
                  strokeDasharray={lIdx === levels.length - 1 ? 'none' : '3,3'}
                />
              );
            })}

            {/* Radial Spokes */}
            {cleanData.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const x2 = center + radius * Math.cos(angle);
              const y2 = center + radius * Math.sin(angle);
              return <line key={i} x1={center} y1={center} x2={x2} y2={y2} stroke="#333" strokeWidth="1" />;
            })}

            {/* Value Area Polygon */}
            <path
              d={polygonPath}
              fill={color}
              fillOpacity="0.25"
              stroke={color}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Vertices & Axis Labels */}
            {polygonCoords.map((pt, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const labelRadius = radius + 22;
              const lx = center + labelRadius * Math.cos(angle);
              const ly = center + labelRadius * Math.sin(angle);
              const isHovered = hoverIdx === i;

              return (
                <g key={i} className="cursor-pointer" onClick={() => onAxisClick?.(pt.label)}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 4}
                    fill="#141414"
                    stroke={color}
                    strokeWidth={isHovered ? 3 : 2}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isHovered ? '#21F1A8' : '#888'}
                    fontSize="10"
                    fontFamily="monospace"
                    className="transition-colors hover:fill-white font-medium"
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                  >
                    {pt.label.length > 10 ? `${pt.label.slice(0, 8)}..` : pt.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend / Values List */}
        <div className="space-y-2 text-xs font-mono w-full sm:w-48">
          <div className="text-[11px] text-gray-400 uppercase border-b border-[#2d2d2d] pb-1 font-bold">
            Axes Summary
          </div>
          {cleanData.map((d, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className={`flex justify-between items-center p-1.5 rounded-lg cursor-pointer transition-colors ${
                hoverIdx === i ? 'bg-[#222]' : 'hover:bg-[#1a1a1a]'
              }`}
            >
              <span className="text-gray-300 truncate max-w-[110px]">{d.label}</span>
              <span className="text-[#21F1A8] font-bold">{d.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 10. STAGE-BY-STAGE FUNNEL CONVERSION CHART
// ============================================================================
export interface FunnelProps {
  stages: { stage: string; value: number; subtext?: string }[];
  metricName?: string;
  onStageClick?: (stage: string) => void;
  title?: string;
}

export const FunnelConversionChart: React.FC<FunnelProps> = ({
  stages,
  metricName = 'Volume',
  onStageClick,
  title = 'FUNNEL STAGE RETENTION & DROP-OFF FLOW'
}) => {
  const topVal = stages[0]?.value || 1;

  if (!stages || stages.length === 0) {
    return <div className="p-4 text-xs text-gray-500">No funnel stage pipeline data available.</div>;
  }

  const colors = ['#21F1A8', '#00d8f6', '#818cf8', '#f59e0b', '#ec4899', '#ef4444'];

  return (
    <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#21F1A8]" />
            {title}
          </h3>
          <p className="text-xs text-gray-400">Sequential stage drop-off and conversion efficiency flow.</p>
        </div>
      </div>

      <div className="space-y-3 bg-[#141414] p-4 rounded-xl border border-[#262626]">
        {stages.map((stg, idx) => {
          const widthPct = Math.max(15, Math.min(100, (stg.value / topVal) * 100));
          const prevVal = idx > 0 ? stages[idx - 1].value : stg.value;
          const dropOffPct = prevVal > 0 ? ((prevVal - stg.value) / prevVal) * 100 : 0;
          const overallRetention = topVal > 0 ? (stg.value / topVal) * 100 : 0;
          const stageColor = colors[idx % colors.length];

          return (
            <div
              key={idx}
              onClick={() => onStageClick?.(stg.stage)}
              className="space-y-1.5 cursor-pointer group"
              title={`Stage: ${stg.stage} - ${stg.value.toLocaleString()}`}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-200 font-semibold group-hover:text-[#21F1A8] transition-colors flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stageColor }}></span>
                  {idx + 1}. {stg.stage}
                </span>

                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">{stg.value.toLocaleString()}</span>
                  <span className="text-gray-400 text-[11px]">({overallRetention.toFixed(1)}% of Top)</span>
                  {idx > 0 && dropOffPct > 0 && (
                    <span className="text-red-400 text-[10px] bg-red-500/10 px-1.5 py-0.5 rounded">
                      ↓ -{dropOffPct.toFixed(1)}% drop
                    </span>
                  )}
                </div>
              </div>

              {/* Centered Funnel Bar */}
              <div className="flex justify-center w-full">
                <div 
                  className="h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold text-black transition-all duration-300 group-hover:brightness-125 shadow-md"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: stageColor
                  }}
                >
                  <span className="truncate px-2">{stg.value.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 11. WATERFALL FINANCIAL VARIANCE CHART
// ============================================================================
export interface WaterfallProps {
  steps: { label: string; value: number; isTotal?: boolean; description?: string }[];
  baseValue?: number;
  metricName?: string;
  title?: string;
  onStepClick?: (step: string) => void;
}

export const WaterfallChart: React.FC<WaterfallProps> = ({
  steps,
  baseValue = 0,
  metricName = 'Value',
  title = 'WATERFALL CUMULATIVE VARIANCE WALK',
  onStepClick
}) => {
  // Compute running balance
  const { enrichedSteps, maxRunning } = useMemo(() => {
    let running = baseValue;
    let max = Math.abs(baseValue);

    const enriched = steps.map((s, idx) => {
      const isStart = idx === 0 && !s.isTotal;
      const start = s.isTotal ? 0 : running;
      const change = s.value;
      const end = s.isTotal ? s.value : start + change;
      if (!s.isTotal) running = end;

      if (Math.abs(start) > max) max = Math.abs(start);
      if (Math.abs(end) > max) max = Math.abs(end);

      return {
        ...s,
        start,
        end,
        isPositive: change >= 0
      };
    });

    return { enrichedSteps: enriched, maxRunning: max || 1 };
  }, [steps, baseValue]);

  return (
    <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#21F1A8]" />
            {title}
          </h3>
          <p className="text-xs text-gray-400">Step-by-step sequential delta additions, deductions, and ending reconciliation balance.</p>
        </div>
      </div>

      <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] overflow-x-auto">
        <div className="flex items-end justify-between gap-2 min-w-[500px] h-56 pt-6 pb-8 border-b border-[#282828] relative">
          {enrichedSteps.map((step, idx) => {
            const h = Math.max(4, (Math.abs(step.value) / maxRunning) * 160);
            const bottomOffset = (Math.min(step.start, step.end) / maxRunning) * 160;
            const barColor = step.isTotal ? '#00d8f6' : step.isPositive ? '#21F1A8' : '#ef4444';

            return (
              <div 
                key={idx} 
                className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                onClick={() => onStepClick?.(step.label)}
              >
                {/* Floating Bar Container */}
                <div className="w-full max-w-[48px] relative h-full flex flex-col justify-end">
                  <div
                    className="w-full rounded transition-all duration-300 group-hover:brightness-125"
                    style={{
                      height: `${h}px`,
                      marginBottom: `${Math.max(0, bottomOffset)}px`,
                      backgroundColor: barColor
                    }}
                  />
                  {/* Delta text on top */}
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold whitespace-nowrap text-white">
                    {step.isTotal ? '' : step.isPositive ? '+' : ''}{step.value.toLocaleString()}
                  </span>
                </div>

                {/* Step Label */}
                <span className="text-[10px] text-gray-400 font-mono truncate max-w-[70px] mt-2 group-hover:text-white" title={step.label}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 12. GAUGE / SPEEDOMETER PERFORMANCE DIAL
// ============================================================================
export interface GaugeProps {
  value: number;
  target?: number;
  min?: number;
  max?: number;
  metricName: string;
  unit?: string;
  title?: string;
}

export const GaugeSpeedometerChart: React.FC<GaugeProps> = ({
  value,
  target,
  min = 0,
  max,
  metricName,
  unit = '',
  title = 'PERFORMANCE GAUGE & TARGET ATTAINMENT'
}) => {
  const maxScale = max || (target ? target * 1.3 : value * 1.5) || 100;
  const pct = Math.max(0, Math.min(100, ((value - min) / (maxScale - min || 1)) * 100));
  const attainment = target && target > 0 ? Math.round((value / target) * 100) : null;

  // Gauge needle rotation (-90 to +90 degrees)
  const rotation = -90 + (pct / 100) * 180;

  const statusColor = attainment 
    ? (attainment >= 100 ? '#21F1A8' : attainment >= 80 ? '#f59e0b' : '#ef4444')
    : '#21F1A8';

  return (
    <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#21F1A8]" />
            {title}
          </h3>
          <p className="text-xs text-gray-400">Real-time target pacing against defined threshold milestones.</p>
        </div>
        {attainment !== null && (
          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold" style={{ backgroundColor: `${statusColor}22`, color: statusColor }}>
            {attainment}% of Target
          </span>
        )}
      </div>

      <div className="flex flex-col items-center justify-center bg-[#141414] rounded-xl p-4 border border-[#262626] relative">
        <svg viewBox="0 0 240 130" className="w-60 h-32 overflow-visible select-none">
          <defs>
            <linearGradient id="gaugeArc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#21F1A8" />
              <stop offset="100%" stopColor="#00d8f6" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 30 115 A 90 90 0 0 1 210 115"
            fill="none"
            stroke="#262626"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Color Gradient Filled Arc */}
          <path
            d="M 30 115 A 90 90 0 0 1 210 115"
            fill="none"
            stroke="url(#gaugeArc)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset={283 - (pct / 100) * 283}
            className="transition-all duration-700 ease-out"
          />

          {/* Needle Center Pivot */}
          <circle cx="120" cy="115" r="7" fill="#ffffff" />

          {/* Needle Pointer */}
          <g transform={`rotate(${rotation}, 120, 115)`} className="transition-transform duration-700 ease-out">
            <line x1="120" y1="115" x2="120" y2="35" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <polygon points="116,45 124,45 120,30" fill="#ffffff" />
          </g>

          {/* Min & Max Labels */}
          <text x="30" y="130" fill="#777" fontSize="10" fontFamily="monospace" textAnchor="middle">
            {min.toLocaleString()}
          </text>
          <text x="210" y="130" fill="#777" fontSize="10" fontFamily="monospace" textAnchor="middle">
            {maxScale.toLocaleString()}
          </text>
        </svg>

        {/* Value Callout */}
        <div className="text-center mt-2">
          <div className="font-heading text-2xl font-extrabold text-white font-mono">
            {unit}{value.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 font-mono">
            {metricName} {target ? `(Target: ${unit}${target.toLocaleString()})` : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 13. PROPORTIONAL TREEMAP HIERARCHY CHART
// ============================================================================
export interface TreemapProps {
  items: { label: string; value: number; category?: string }[];
  metricName?: string;
  title?: string;
  onItemClick?: (label: string) => void;
}

export const TreemapChart: React.FC<TreemapProps> = ({
  items,
  metricName = 'Value',
  title = 'PROPORTIONAL TREEMAP HIERARCHY',
  onItemClick
}) => {
  const sorted = useMemo(() => {
    return [...(items || [])].sort((a, b) => b.value - a.value).slice(0, 8);
  }, [items]);

  const total = useMemo(() => sorted.reduce((acc, c) => acc + c.value, 0), [sorted]);

  const palette = ['#21F1A8', '#00d8f6', '#818cf8', '#f59e0b', '#ec4899', '#10b981', '#a855f7', '#64748b'];

  if (sorted.length === 0) {
    return <div className="p-4 text-xs text-gray-500">No data to render Treemap.</div>;
  }

  return (
    <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#21F1A8]" />
            {title}
          </h3>
          <p className="text-xs text-gray-400">Proportional hierarchical area tiles representing contribution weight.</p>
        </div>
        <span className="text-xs font-mono text-[#21F1A8] font-bold">Total: {total.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#141414] p-3 rounded-xl border border-[#262626]">
        {sorted.map((item, idx) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;
          const color = palette[idx % palette.length];
          const isLarge = idx === 0 || idx === 1;

          return (
            <div
              key={idx}
              onClick={() => onItemClick?.(item.label)}
              className={`p-3.5 rounded-xl border border-[#2d2d2d] cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${
                isLarge ? 'sm:col-span-2 sm:row-span-2 min-h-[120px]' : 'min-h-[85px]'
              }`}
              style={{ backgroundColor: `${color}18`, borderColor: `${color}44` }}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-bold text-white text-xs truncate" title={item.label}>
                  {item.label}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 font-bold" style={{ color }}>
                  {share.toFixed(1)}%
                </span>
              </div>

              <div>
                <div className="font-heading text-base sm:text-lg font-bold text-white font-mono">
                  {item.value.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">{metricName}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
