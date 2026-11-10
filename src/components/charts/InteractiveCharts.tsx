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
import { ColumnProfile, ForecastPoint, VisualConfig } from '../../types';
import { safeMin, safeMax, safeExtremes, safeDownsample } from '../../utils/mathUtils';
import {
  computeHistogramBins,
  computeStackedBarData,
  computeBarChartData,
  computeLineSeriesData,
  computeScatterPlotData,
  computeDonutChartData,
  computeHeatmapMatrixData,
  computeBoxplotSummary,
  formatCompactNumber,
  truncateChartLabel
} from '../../engine/chartRecommendationEngine';
import { ChartGuideId } from '../../config/chartGuide';
import { ModernEmptyState } from '../modern/ModernEmptyState';
import { DownloadMenu } from '../common/DownloadMenu';

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
  color = 'var(--chart-3)'
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

    const min = safeMin(allVals, 0);
    const max = safeMax(allVals, 1);
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
      <div className="h-64 flex items-center justify-center text-xs text-muted bg-surface-panel/40 rounded-xl border border-border-subtle">
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
          <span className="flex items-center gap-1.5 text-primary dark:text-primary font-medium">
            <span className="w-3 h-1 rounded bg-cyan-400"></span>
            {metricName} (Actual)
          </span>
          {smaCoords.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer text-muted dark:text-secondary hover:text-cyan-400">
              <input 
                type="checkbox" 
                checked={showSMA} 
                onChange={(e) => setShowSMA(e.target.checked)}
                className="rounded accent-cyan-400"
              />
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-2.5 h-0.5 bg-indigo-400"></span> 3-Period SMA
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
          <div className="bg-card border border-cyan-400/40 px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-2">
            <span className="text-secondary">{activePt.period}:</span>
            <span className="text-cyan-400 font-bold">
              {activePt.value.toLocaleString()}
            </span>
            {activePt.isForecast && (
              <span className="text-cyan-400 text-[10px] uppercase font-bold">(Forecast)</span>
            )}
          </div>
        )}
      </div>

      {/* Responsive SVG Container */}
      <div className="relative w-full glass-card rounded-2xl border border-white/10 dark:border-white/10 p-2 overflow-hidden select-none">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-64 sm:h-72 overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-3)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--chart-3)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-3)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--chart-3)" stopOpacity="0.0" />
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
                  stroke="currentColor"
                  className="text-primary dark:text-primary" 
                  strokeDasharray="3,3" 
                />
                <text 
                  x={paddingLeft - 8} 
                  y={y + 3.5} 
                  textAnchor="end" 
                  className="fill-slate-500 dark:fill-slate-400 font-mono text-[10px]"
                >
                  {Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Historical line in Electric Cyan */}
          <path 
            d={linePath} 
            fill="none" 
            stroke="var(--chart-3)" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* SMA line in Indigo */}
          {showSMA && smaPath && (
            <path 
              d={smaPath} 
              fill="none" 
              stroke="var(--chart-2)" 
              strokeWidth="2" 
              strokeDasharray="4,3" 
            />
          )}

          {/* Forecast line */}
          {forecastPath && (
            <path 
              d={forecastPath} 
              fill="none" 
              stroke="var(--chart-3)" 
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
                    stroke="var(--chart-3)" 
                    strokeWidth="1" 
                    strokeDasharray="2,2" 
                  />
                )}

                {/* Point dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : pt.isForecast ? 3.5 : 4}
                  fill={pt.isForecast ? 'var(--chart-3)' : 'var(--bg-card)'}
                  stroke={pt.isForecast ? 'var(--chart-3)' : 'var(--chart-3)'}
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
                    fill="var(--text-muted)"
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
      <div className="h-64 flex items-center justify-center text-xs text-muted bg-card rounded-xl border border-subtle">
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

  const maxVal = Math.max(safeMax(sortedData.map(d => d.value), 1), 1);
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
          <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-bold text-[10px] font-mono">
            PARETO PRINCIPLE (80/20)
          </span>
          <span className="text-secondary">
            Vital <strong className="text-primary">{vitalCount}</strong> of {sortedData.length} items drive ~80% of {metricName}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-secondary">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></span> Item Value
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
      <div className="relative w-full bg-card rounded-2xl border border-subtle p-2 overflow-hidden select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 sm:h-72 overflow-visible">
          {/* Horizontal 80% line */}
          <line
            x1={paddingLeft}
            y1={getPctY(80)}
            x2={width - paddingRight}
            y2={getPctY(80)}
            stroke="var(--danger)"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
          <text
            x={width - paddingRight + 5}
            y={getPctY(80) + 3.5}
            fill="var(--danger)"
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
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border-subtle)" />
                <text x={paddingLeft - 8} y={y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="10" fontFamily="monospace">
                  {Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Right Y Axis labels for cumulative % */}
          {[0, 50, 100].map((pct, i) => {
            const y = getPctY(pct);
            return (
              <text key={i} x={width - paddingRight + 8} y={y + 3.5} fill="var(--text-muted)" fontSize="10" fontFamily="monospace">
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
                  fill={isSelected ? 'var(--chart-3)' : isVital ? 'var(--chart-3)' : 'var(--bg-card)'}
                  className="transition-colors group-hover:fill-sky-400"
                />
                {/* Bar Value text */}
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="var(--text-secondary)"
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
                  fill={isSelected ? 'var(--chart-3)' : 'var(--text-muted)'}
                  fontSize="10"
                  className="truncate max-w-[80px]"
                >
                  {d.category.length > 12 ? `${d.category.slice(0, 10)}...` : d.category}
                </text>
              </g>
            );
          })}

          {/* Cumulative Percentage Line */}
          <path d={cumLinePath} fill="none" stroke="var(--chart-4)" strokeWidth="2.25" strokeLinecap="round" />

          {/* Cumulative Points */}
          {cumCoords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill="var(--bg-card)"
              stroke="var(--chart-4)"
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

const PALETTE = ['var(--chart-3)', 'var(--chart-3)', 'var(--chart-3)', 'var(--chart-2)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-2)'];

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
      <div className="h-64 flex items-center justify-center text-xs text-muted bg-card rounded-xl border border-subtle">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-card rounded-2xl border border-subtle p-4">
      {/* SVG Donut */}
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 180 180" className="w-44 h-44 transform -rotate-90">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="var(--border-subtle)"
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
              <span className="text-[10px] text-secondary font-mono truncate max-w-[90px]">{activeItem.category}</span>
              <span className="text-base font-bold text-primary font-mono">{activeItem.share}%</span>
              <span className="text-[9px] text-accent font-mono">{activeItem.value.toLocaleString()}</span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-secondary uppercase font-mono">Total</span>
              <span className="text-base font-extrabold text-primary font-mono">{total.toLocaleString()}</span>
              <span className="text-[9px] text-muted font-mono">{metricName}</span>
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
              hoverIdx === idx ? 'bg-elevated' : 'hover:bg-card'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
              <span className="text-secondary truncate max-w-[110px]">{s.category}</span>
            </div>
            <div className="text-right font-mono shrink-0 pl-2">
              <span className="text-primary font-semibold">{s.share}%</span>
              <span className="text-muted text-[10px] block">{s.value.toLocaleString()}</span>
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
    return <div className="p-4 text-xs text-muted">No numeric variables available for distribution audit.</div>;
  }

  // Visual Box Plot scaling
  const range = stats.max - stats.min || 1;
  const getPct = (val: number) => Math.max(0, Math.min(100, ((val - stats.min) / range) * 100));

  return (
    <div className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            STATISTICAL DISTRIBUTION & FIVE-NUMBER SUMMARY
          </h3>
          <p className="text-xs text-secondary">Parametric and non-parametric data dispersion analytics.</p>
        </div>

        <select
          value={selectedCol}
          onChange={(e) => setSelectedCol(e.target.value)}
          className="bg-card text-xs text-accent font-mono px-3 py-1.5 rounded-lg border border-subtle focus:border-teal-500/40 focus:outline-none"
        >
          {numericCols.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Visual Boxplot Horizontal representation */}
      <div className="space-y-2 bg-card p-4 rounded-xl border border-subtle">
        <div className="flex justify-between text-[11px] text-secondary font-mono">
          <span>Min: {stats.min.toLocaleString()}</span>
          <span>Median: {stats.median.toLocaleString()}</span>
          <span>Max: {stats.max.toLocaleString()}</span>
        </div>

        <div className="relative h-12 flex items-center">
          {/* Whiskers line (Min to Max) */}
          <div className="absolute w-full h-1 bg-elevated rounded"></div>

          {/* Interquartile Box (Q1 to Q3) */}
          <div 
            className="absolute h-8 bg-accent border-2 border-teal-500/40 rounded"
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

        <div className="flex justify-between text-[10px] text-muted font-mono">
          <span>Q1 (25%): {stats.q1.toLocaleString()}</span>
          <span>IQR: {stats.iqr.toLocaleString()}</span>
          <span>Q3 (75%): {stats.q3.toLocaleString()}</span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-card border border-subtle">
          <span className="text-muted text-[10px] block">Mean (Average)</span>
          <span className="text-primary font-bold text-sm">{stats.mean.toLocaleString()}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-card border border-subtle">
          <span className="text-muted text-[10px] block">Std Deviation (σ)</span>
          <span className="text-accent font-bold text-sm">±{stats.stdDev.toLocaleString()}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-card border border-subtle">
          <span className="text-muted text-[10px] block">Skewness Index</span>
          <span className={`font-bold text-sm ${Math.abs(stats.skewness) > 1 ? 'text-amber-400' : 'text-primary'}`}>
            {stats.skewness} ({stats.skewness > 0 ? 'Right Skew' : stats.skewness < 0 ? 'Left Skew' : 'Normal'})
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-card border border-subtle">
          <span className="text-muted text-[10px] block">Outlier Detection</span>
          <span className={`font-bold text-sm ${stats.outlierCount > 0 ? 'text-red-400' : 'text-accent'}`}>
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
    <div className="bg-card border border-subtle rounded-2xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <Sliders className="w-4 h-4 text-accent" />
            WHAT-IF BUSINESS SCENARIO SIMULATOR
          </h3>
          <p className="text-xs text-secondary">
            Model business levers (Pricing, Market Volume, COGS) to project financial outcome deltas in real-time.
          </p>
        </div>

        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated hover:bg-elevated text-secondary text-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Levers
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-card p-4 rounded-xl border border-subtle">
        {/* Price Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-secondary font-medium">Price Adjustment</span>
            <span className={`font-bold ${priceShift > 0 ? 'text-accent' : priceShift < 0 ? 'text-red-400' : 'text-secondary'}`}>
              {priceShift > 0 ? '+' : ''}{priceShift}%
            </span>
          </div>
          <input 
            type="range" 
            min="-30" 
            max="30" 
            value={priceShift} 
            onChange={(e) => setPriceShift(Number(e.target.value))}
            className="w-full accent-[var(--chart-1)] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted font-mono">
            <span>-30%</span>
            <span>0%</span>
            <span>+30%</span>
          </div>
        </div>

        {/* Volume Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-secondary font-medium">Demand / Volume Shift</span>
            <span className={`font-bold ${volumeShift > 0 ? 'text-accent' : volumeShift < 0 ? 'text-red-400' : 'text-secondary'}`}>
              {volumeShift > 0 ? '+' : ''}{volumeShift}%
            </span>
          </div>
          <input 
            type="range" 
            min="-50" 
            max="50" 
            value={volumeShift} 
            onChange={(e) => setVolumeShift(Number(e.target.value))}
            className="w-full accent-[var(--chart-1)] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted font-mono">
            <span>-50%</span>
            <span>0%</span>
            <span>+50%</span>
          </div>
        </div>

        {/* COGS Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-secondary font-medium">COGS / Unit Cost</span>
            <span className={`font-bold ${costShift > 0 ? 'text-red-400' : costShift < 0 ? 'text-accent' : 'text-secondary'}`}>
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
          <div className="flex justify-between text-[10px] text-muted font-mono">
            <span>-30%</span>
            <span>0%</span>
            <span>+30%</span>
          </div>
        </div>
      </div>

      {/* Projection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Revenue Projection */}
        <div className="bg-card border border-subtle rounded-xl p-4 space-y-2">
          <span className="text-xs text-secondary font-mono">Projected Total Revenue</span>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl font-bold text-primary font-mono">
              ${Math.round(projectedRevenue).toLocaleString()}
            </span>
            <span className={`text-xs font-mono font-bold flex items-center ${revDelta >= 0 ? 'text-accent' : 'text-red-400'}`}>
              {revDelta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {revDelta >= 0 ? '+' : ''}{Math.round(revDelta).toLocaleString()} ({revDeltaPct.toFixed(1)}%)
            </span>
          </div>
          <div className="text-[10px] text-muted">
            Baseline: ${Math.round(baselineRevenue).toLocaleString()}
          </div>
        </div>

        {/* Profit Projection */}
        <div className="bg-card border border-subtle rounded-xl p-4 space-y-2">
          <span className="text-xs text-secondary font-mono">Projected Operating Margin / Profit</span>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl font-bold text-primary font-mono">
              ${Math.round(projectedProfit).toLocaleString()}
            </span>
            <span className={`text-xs font-mono font-bold flex items-center ${profitDelta >= 0 ? 'text-accent' : 'text-red-400'}`}>
              {profitDelta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {profitDelta >= 0 ? '+' : ''}{Math.round(profitDelta).toLocaleString()} ({profitDeltaPct.toFixed(1)}%)
            </span>
          </div>
          <div className="text-[10px] text-muted">
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
    return <div className="p-4 text-xs text-muted">Need at least 1 string and 1 numeric column for Pivot analysis.</div>;
  }

  return (
    <div className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <Table2 className="w-4 h-4 text-accent" />
            MULTI-DIMENSIONAL CROSS-TAB / PIVOT MATRIX
          </h3>
          <p className="text-xs text-secondary">Slice and dice metrics across dual orthogonal categorical axes.</p>
        </div>

        <button
          onClick={exportPivotCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated hover:bg-elevated text-secondary text-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-accent" /> Export Pivot CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card p-3 rounded-xl border border-subtle text-xs">
        <div>
          <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">Row Dimension</label>
          <select 
            value={rowDim} 
            onChange={(e) => setRowDim(e.target.value)}
            className="w-full bg-card text-primary p-2 rounded-lg border border-subtle focus:border-teal-500/40 focus:outline-none"
          >
            {stringCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">Column Dimension</label>
          <select 
            value={colDim} 
            onChange={(e) => setColDim(e.target.value)}
            className="w-full bg-card text-primary p-2 rounded-lg border border-subtle focus:border-teal-500/40 focus:outline-none"
          >
            {stringCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">Metric Field</label>
          <select 
            value={valMetric} 
            onChange={(e) => setValMetric(e.target.value)}
            className="w-full bg-card text-primary p-2 rounded-lg border border-subtle focus:border-teal-500/40 focus:outline-none"
          >
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">Aggregation</label>
          <select 
            value={aggType} 
            onChange={(e) => setAggType(e.target.value as any)}
            className="w-full bg-card text-accent font-bold p-2 rounded-lg border border-subtle focus:border-teal-500/40 focus:outline-none"
          >
            <option value="sum">SUM</option>
            <option value="avg">AVERAGE</option>
            <option value="count">COUNT</option>
          </select>
        </div>
      </div>

      {/* Cross-tab table with heat-map opacity */}
      <div className="overflow-x-auto rounded-xl border border-subtle">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-card text-secondary border-b border-subtle font-mono">
              <th className="p-3 font-semibold text-primary">{rowDim} \ {colDim}</th>
              {colHeaders.map(ch => (
                <th key={ch} className="p-3 font-semibold text-right">{ch}</th>
              ))}
              <th className="p-3 font-semibold text-right text-accent bg-accent">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
            {rowHeaders.map(rh => (
              <tr key={rh} className="hover:bg-card transition-colors">
                <td className="p-3 font-medium text-primary bg-card whitespace-nowrap">{rh}</td>
                {colHeaders.map(ch => {
                  const val = matrix[rh]?.[ch] || 0;
                  const intensity = Math.min(0.65, (val / maxCellValue) * 0.65);
                  return (
                    <td 
                      key={ch} 
                      className="p-3 text-right text-primary"
                      style={{
                        backgroundColor: val > 0 ? `color-mix(in srgb, var(--chart-1) 25%, transparent)` : undefined
                      }}
                    >
                      {val > 0 ? val.toLocaleString() : '-'}
                    </td>
                  );
                })}
                <td className="p-3 text-right font-bold text-primary bg-accent">
                  {(rowTotals[rh] || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-card text-secondary font-mono font-bold border-t border-subtle">
              <td className="p-3 text-primary uppercase">Col Summary</td>
              {colHeaders.map(ch => (
                <td key={ch} className="p-3 text-right text-accent">
                  {(colTotals[ch] || 0).toLocaleString()}
                </td>
              ))}
              <td className="p-3 text-right text-accent bg-accent text-sm">
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

    const xMinRaw = safeMin(xVals, 0);
    const xMaxRaw = safeMax(xVals, 1);
    const yMinRaw = safeMin(yVals, 0);
    const yMaxRaw = safeMax(yVals, 1);

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

    // Downsample visual SVG points to max 600 points for smooth interactivity
    const displayPoints = safeDownsample(validPoints, 600);

    return {
      points: displayPoints,
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
    return Math.min(safeMin(vals, 1), 1);
  }, [points, sizeField]);

  const sizeMax = useMemo(() => {
    if (!sizeField) return 1;
    const vals = points.map(p => p.sizeVal || 0);
    return Math.max(safeMax(vals, 1), 1);
  }, [points, sizeField]);

  if (numericCols.length < 2) {
    return (
      <div className="p-8 text-center text-xs text-muted bg-card rounded-2xl border border-subtle">
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
    ? 'var(--chart-1)' 
    : corrMagnitude >= 0.4 
    ? 'var(--chart-3)' 
    : corrMagnitude >= 0.2 
    ? 'var(--chart-4)' 
    : 'var(--text-muted)';

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
    <div className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-accent" />
            {title}
          </h3>
          <p className="text-xs text-secondary">
            Bivariate statistical dispersion and linear ordinary least-squares regression trendline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Correlation Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-subtle text-xs font-mono">
            <span className="text-secondary">Pearson r:</span>
            <span className="font-bold" style={{ color: corrColor }}>
              {correlation > 0 ? `+${correlation}` : correlation}
            </span>
            <span className="text-[10px] text-muted hidden sm:inline">({corrText})</span>
            <span className="text-[10px] text-muted font-mono pl-1 border-l border-subtle">R²: {rSquared}</span>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-elevated hover:bg-elevated text-secondary text-xs transition-colors"
            title="Export scatter dataset to CSV"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
          </button>
        </div>
      </div>

      {/* Axis Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card p-3 rounded-xl border border-subtle text-xs">
        <div>
          <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">X-Axis (Horizontal)</label>
          <select
            value={xField}
            onChange={(e) => setXField(e.target.value)}
            className="w-full bg-card text-accent font-mono p-2 rounded-lg border border-subtle focus:border-teal-500/40 focus:outline-none"
          >
            {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">Y-Axis (Vertical)</label>
          <select
            value={yField}
            onChange={(e) => setYField(e.target.value)}
            className="w-full bg-card text-cyan-400 font-mono p-2 rounded-lg border border-subtle focus:border-cyan-400 focus:outline-none"
          >
            {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">Label / Dimension</label>
          <select
            value={catField}
            onChange={(e) => setCatField(e.target.value)}
            className="w-full bg-card text-primary p-2 rounded-lg border border-subtle focus:border-teal-500/40 focus:outline-none"
          >
            <option value="">(Row Index)</option>
            {stringCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">Bubble Size (Optional)</label>
          <select
            value={sizeField}
            onChange={(e) => setSizeField(e.target.value)}
            className="w-full bg-card text-amber-400 font-mono p-2 rounded-lg border border-subtle focus:border-amber-400 focus:outline-none"
          >
            <option value="">(Uniform Size)</option>
            {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* SVG Scatterplot Canvas */}
      <div className="relative w-full bg-card rounded-2xl border border-subtle p-2 overflow-hidden select-none">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-72 sm:h-80 overflow-visible"
          onMouseLeave={() => setHoverPoint(null)}
        >
          <defs>
            <linearGradient id="scatterGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--chart-3)" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Gridlines Horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingTop + innerHeight * (1 - pct);
            const val = yMin + (yMax - yMin) * pct;
            return (
              <g key={`y-grid-${i}`}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border-subtle)" strokeDasharray="3,3" />
                <text x={paddingLeft - 8} y={y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="10" fontFamily="monospace">
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
                <line x1={x} y1={paddingTop} x2={x} y2={paddingTop + innerHeight} stroke="var(--border-subtle)" strokeDasharray="3,3" />
                <text x={x} y={paddingTop + innerHeight + 18} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="monospace">
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
            fill="var(--text-secondary)" 
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
            fill="var(--text-secondary)" 
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
              stroke="var(--chart-4)"
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
                    <line x1={paddingLeft} y1={cy} x2={width - paddingRight} y2={cy} stroke="var(--chart-1)" strokeWidth="1" strokeDasharray="2,2" />
                    <line x1={cx} y1={paddingTop} x2={cx} y2={paddingTop + innerHeight} stroke="var(--chart-1)" strokeWidth="1" strokeDasharray="2,2" />
                  </>
                )}

                {/* Outer Glow Halo */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? r + 5 : r + 1}
                  fill={isHovered ? 'var(--chart-1)' : 'transparent'}
                  opacity={isHovered ? 0.35 : 0}
                  className="transition-all"
                />

                {/* Main Scatter Bubble */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={isHovered ? 'var(--chart-1)' : 'var(--chart-3)'}
                  stroke={isHovered ? 'var(--text-primary)' : 'var(--chart-1)'}
                  strokeWidth={isHovered ? 2 : 1.5}
                  className="transition-transform duration-200"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverPoint && (
          <div className="absolute top-4 right-4 bg-card border border-teal-500/40 backdrop-blur-md rounded-xl p-3 text-xs font-mono space-y-1 shadow-2xl pointer-events-none max-w-xs animate-fadeIn">
            <div className="font-bold text-primary border-b border-subtle pb-1 truncate">
              {hoverPoint.category}
            </div>
            <div className="flex justify-between gap-4 text-secondary">
              <span>{xField}:</span>
              <span className="text-accent font-bold">{hoverPoint.xVal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 text-secondary">
              <span>{yField}:</span>
              <span className="text-cyan-400 font-bold">{hoverPoint.yVal.toLocaleString()}</span>
            </div>
            {sizeField && hoverPoint.sizeVal !== undefined && (
              <div className="flex justify-between gap-4 text-secondary">
                <span>{sizeField} (Size):</span>
                <span className="text-amber-400 font-bold">{hoverPoint.sizeVal.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-1 text-[10px] text-muted italic">Click point to drill-through</div>
          </div>
        )}
      </div>

      {/* Regression & Trendline Controls */}
      <div className="flex flex-wrap items-center justify-between text-xs text-secondary pt-1 border-t border-subtle">
        <label className="flex items-center gap-2 cursor-pointer hover:text-primary">
          <input
            type="checkbox"
            checked={showRegression}
            onChange={(e) => setShowRegression(e.target.checked)}
            className="rounded accent-[var(--chart-1)]"
          />
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-3 h-0.5 border-t border-dashed border-amber-400"></span>
            Linear Ordinary Least-Squares Fit: 
            <strong className="text-primary">y = {slope >= 0 ? `${slope.toFixed(2)}x + ${intercept.toFixed(1)}` : `${slope.toFixed(2)}x - ${Math.abs(intercept).toFixed(1)}`}</strong>
          </span>
        </label>
        <span className="text-[11px] font-mono text-muted">
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
    if (val === 0 || min === max) return 'var(--bg-card)';
    const norm = Math.max(0, Math.min(1, (val - min) / (max - min || 1)));
    // Color scale: var(--chart-1) (low) -> var(--chart-1) -> var(--chart-1) (peak)
    return `color-mix(in srgb, var(--chart-1) 25%, transparent)`;
  };

  const getCorrColor = (r: number) => {
    if (r === 1) return 'var(--chart-1)';
    if (r > 0) {
      return `color-mix(in srgb, var(--chart-1) 25%, transparent)`;
    }
    const abs = Math.abs(r);
    return `color-mix(in srgb, var(--danger) 25%, transparent)`;
  };

  return (
    <div className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <Grid className="w-4 h-4 text-accent" />
            {title}
          </h3>
          <p className="text-xs text-secondary">
            {mode === 'matrix' 
              ? 'Multi-dimensional categorical co-occurrence heat intensity.' 
              : 'Pairwise Pearson correlation coefficients between all schema numerical metrics.'}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-subtle text-xs">
          <button
            onClick={() => setMode('matrix')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'matrix' ? 'bg-accent text-black font-semibold' : 'text-secondary hover:text-primary'
            }`}
          >
            Dimensional Density Grid
          </button>
          <button
            onClick={() => setMode('correlation')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'correlation' ? 'bg-accent text-black font-semibold' : 'text-secondary hover:text-primary'
            }`}
          >
            Correlation Matrix
          </button>
        </div>
      </div>

      {/* Controls for Dimensional Matrix mode */}
      {mode === 'matrix' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card p-3 rounded-xl border border-subtle text-xs">
          <div>
            <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">Row Dimension (Y)</label>
            <select
              value={rowDim}
              onChange={(e) => setRowDim(e.target.value)}
              className="w-full bg-card text-primary p-2 rounded-lg border border-subtle focus:border-teal-500/40 focus:outline-none"
            >
              {stringCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">Column Dimension (X)</label>
            <select
              value={colDim}
              onChange={(e) => setColDim(e.target.value)}
              className="w-full bg-card text-primary p-2 rounded-lg border border-subtle focus:border-teal-500/40 focus:outline-none"
            >
              {stringCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">Metric Field</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full bg-card text-accent font-mono p-2 rounded-lg border border-subtle focus:border-teal-500/40 focus:outline-none"
            >
              {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-secondary block text-[10px] mb-1 uppercase font-mono">Aggregation</label>
            <select
              value={agg}
              onChange={(e) => setAgg(e.target.value as any)}
              className="w-full bg-card text-accent font-bold p-2 rounded-lg border border-subtle focus:border-teal-500/40 focus:outline-none"
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
        <div className="overflow-x-auto rounded-xl border border-subtle">
          <table className="w-full text-xs text-left border-collapse select-none">
            <thead>
              <tr className="bg-card text-secondary border-b border-subtle font-mono">
                <th className="p-3 font-semibold text-primary sticky left-0 bg-card z-10">
                  {rowDim} \ {colDim}
                </th>
                {matrixData.colHeaders.map(ch => (
                  <th key={ch} className="p-3 font-semibold text-center truncate max-w-[120px]" title={ch}>
                    {ch}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
              {matrixData.rowHeaders.map(rh => (
                <tr key={rh} className="hover:brightness-110 transition-all">
                  <td className="p-3 font-medium text-primary bg-card sticky left-0 z-10 whitespace-nowrap border-r border-subtle">
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
                        className="p-3 text-center cursor-pointer transition-all border border-subtle"
                        style={{
                          backgroundColor: cellBg,
                          outline: isHovered ? '2px solid var(--text-primary)' : undefined,
                          color: cell.val > (matrixData.maxVal * 0.4) ? 'var(--text-primary)' : 'var(--text-secondary)'
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
        <div className="overflow-x-auto rounded-xl border border-subtle">
          <table className="w-full text-xs text-left border-collapse select-none font-mono">
            <thead>
              <tr className="bg-card text-secondary border-b border-subtle">
                <th className="p-3 font-semibold text-primary sticky left-0 bg-card z-10">Metric</th>
                {correlationData.variables.map(v => (
                  <th key={v} className="p-3 font-semibold text-center truncate max-w-[100px]" title={v}>
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {correlationData.variables.map(v1 => (
                <tr key={v1}>
                  <td className="p-3 font-semibold text-primary bg-card sticky left-0 z-10 whitespace-nowrap border-r border-subtle">
                    {v1}
                  </td>
                  {correlationData.variables.map(v2 => {
                    const r = correlationData.matrix[v1]?.[v2] ?? 0;
                    const bg = getCorrColor(r);

                    return (
                      <td
                        key={v2}
                        className="p-3 text-center border border-subtle font-bold text-primary transition-transform hover:scale-105"
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
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-subtle font-mono">
        <div className="flex items-center gap-2 text-secondary">
          <span>Heat Scale:</span>
          {mode === 'matrix' ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px]">Min ({matrixData.minVal})</span>
              <div className="w-24 h-3 rounded-full bg-gradient-to-r from-teal-500/20 via-indigo-500/10 to-transparent border border-subtle"></div>
              <span className="text-[10px] text-accent">Max ({matrixData.maxVal.toLocaleString()})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-red-400">-1.0 (Inverse)</span>
              <div className="w-28 h-3 rounded-full bg-gradient-to-r from-red-500 via-indigo-500/10 to-transparent border border-subtle"></div>
              <span className="text-[10px] text-accent">+1.0 (Positive)</span>
            </div>
          )}
        </div>

        <span className="text-[11px] text-muted">
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
  color = 'var(--chart-1)',
  onAxisClick,
  title = 'RADAR / MULTI-DIMENSIONAL SPIDER FOOTPRINT'
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const cleanData = useMemo(() => {
    return (data || []).slice(0, 8);
  }, [data]);

  const maxVal = useMemo(() => {
    return Math.max(safeMax(cleanData.map(d => d.max || d.value), 1), 1);
  }, [cleanData]);

  if (cleanData.length < 3) {
    return (
      <div className="p-8 text-center text-xs text-muted bg-card rounded-2xl border border-subtle">
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
    <div className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <Compass className="w-4 h-4 text-accent" />
            {title}
          </h3>
          <p className="text-xs text-secondary">Radial balanced footprint across {numAxes} orthogonal categorical dimensions.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 bg-card rounded-xl p-4 border border-subtle">
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
                  stroke="var(--border-subtle)"
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
              return <line key={i} x1={center} y1={center} x2={x2} y2={y2} stroke="var(--border-subtle)" strokeWidth="1" />;
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
                    fill="var(--bg-card)"
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
                    fill={isHovered ? 'var(--chart-1)' : 'var(--text-muted)'}
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
          <div className="text-[11px] text-secondary uppercase border-b border-subtle pb-1 font-bold">
            Axes Summary
          </div>
          {cleanData.map((d, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className={`flex justify-between items-center p-1.5 rounded-lg cursor-pointer transition-colors ${
                hoverIdx === i ? 'bg-elevated' : 'hover:bg-card'
              }`}
            >
              <span className="text-secondary truncate max-w-[110px]">{d.label}</span>
              <span className="text-accent font-bold">{d.value.toLocaleString()}</span>
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
    return <div className="p-4 text-xs text-muted">No funnel stage pipeline data available.</div>;
  }

  const colors = ['var(--chart-3)', 'var(--chart-3)', 'var(--chart-2)', 'var(--chart-4)', 'var(--chart-5)', 'var(--danger)'];

  return (
    <div className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            {title}
          </h3>
          <p className="text-xs text-secondary">Sequential stage drop-off and conversion efficiency flow.</p>
        </div>
      </div>

      <div className="space-y-3 bg-card p-4 rounded-xl border border-subtle">
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
                <span className="text-primary font-semibold group-hover:text-accent transition-colors flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stageColor }}></span>
                  {idx + 1}. {stg.stage}
                </span>

                <div className="flex items-center gap-3">
                  <span className="text-primary font-bold">{stg.value.toLocaleString()}</span>
                  <span className="text-secondary text-[11px]">({overallRetention.toFixed(1)}% of Top)</span>
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
    <div className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            {title}
          </h3>
          <p className="text-xs text-secondary">Step-by-step sequential delta additions, deductions, and ending reconciliation balance.</p>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border border-subtle overflow-x-auto">
        <div className="flex items-end justify-between gap-2 min-w-[500px] h-56 pt-6 pb-8 border-b border-subtle relative">
          {enrichedSteps.map((step, idx) => {
            const h = Math.max(4, (Math.abs(step.value) / maxRunning) * 160);
            const bottomOffset = (Math.min(step.start, step.end) / maxRunning) * 160;
            const barColor = step.isTotal ? 'var(--chart-3)' : step.isPositive ? 'var(--chart-3)' : 'var(--danger)';

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
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold whitespace-nowrap text-primary">
                    {step.isTotal ? '' : step.isPositive ? '+' : ''}{step.value.toLocaleString()}
                  </span>
                </div>

                {/* Step Label */}
                <span className="text-[10px] text-secondary font-mono truncate max-w-[70px] mt-2 group-hover:text-primary" title={step.label}>
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
    ? (attainment >= 100 ? 'var(--chart-3)' : attainment >= 80 ? 'var(--chart-3)' : 'var(--danger)')
    : 'var(--chart-3)';

  return (
    <div className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            {title}
          </h3>
          <p className="text-xs text-secondary">Real-time target pacing against defined threshold milestones.</p>
        </div>
        {attainment !== null && (
          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold" style={{ backgroundColor: `${statusColor}22`, color: statusColor }}>
            {attainment}% of Target
          </span>
        )}
      </div>

      <div className="flex flex-col items-center justify-center bg-card rounded-xl p-4 border border-subtle relative">
        <svg viewBox="0 0 240 130" className="w-60 h-32 overflow-visible select-none">
          <defs>
            <linearGradient id="gaugeArc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--danger)" />
              <stop offset="50%" stopColor="var(--chart-4)" />
              <stop offset="85%" stopColor="var(--chart-3)" />
              <stop offset="100%" stopColor="var(--chart-3)" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 30 115 A 90 90 0 0 1 210 115"
            fill="none"
            stroke="var(--border-subtle)"
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
          <circle cx="120" cy="115" r="7" fill="var(--text-primary)" />

          {/* Needle Pointer */}
          <g transform={`rotate(${rotation}, 120, 115)`} className="transition-transform duration-700 ease-out">
            <line x1="120" y1="115" x2="120" y2="35" stroke="var(--text-primary)" strokeWidth="3" strokeLinecap="round" />
            <polygon points="116,45 124,45 120,30" fill="var(--text-primary)" />
          </g>

          {/* Min & Max Labels */}
          <text x="30" y="130" fill="var(--text-muted)" fontSize="10" fontFamily="monospace" textAnchor="middle">
            {min.toLocaleString()}
          </text>
          <text x="210" y="130" fill="var(--text-muted)" fontSize="10" fontFamily="monospace" textAnchor="middle">
            {maxScale.toLocaleString()}
          </text>
        </svg>

        {/* Value Callout */}
        <div className="text-center mt-2">
          <div className="font-heading text-2xl font-extrabold text-primary font-mono">
            {unit}{value.toLocaleString()}
          </div>
          <div className="text-xs text-secondary font-mono">
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

  const palette = ['var(--chart-3)', 'var(--chart-3)', 'var(--chart-2)', 'var(--chart-2)', 'var(--chart-7)', 'var(--chart-5)', 'var(--chart-4)', 'var(--text-muted)'];

  if (sorted.length === 0) {
    return <div className="p-4 text-xs text-muted">No data to render Treemap.</div>;
  }

  return (
    <div className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-heading text-lg font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            {title}
          </h3>
          <p className="text-xs text-secondary">Proportional hierarchical area tiles representing contribution weight.</p>
        </div>
        <span className="text-xs font-mono text-cyan-400 font-bold">Total: {total.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-card p-3 rounded-xl border border-subtle">
        {sorted.map((item, idx) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;
          const color = palette[idx % palette.length];
          const isLarge = idx === 0 || idx === 1;

          return (
            <div
              key={idx}
              onClick={() => onItemClick?.(item.label)}
              className={`p-3.5 rounded-xl border border-subtle cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${
                isLarge ? 'sm:col-span-2 sm:row-span-2 min-h-[120px]' : 'min-h-[85px]'
              }`}
              style={{ backgroundColor: `${color}18`, borderColor: `${color}44` }}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-bold text-primary text-xs truncate" title={item.label}>
                  {item.label}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 font-bold" style={{ color }}>
                  {share.toFixed(1)}%
                </span>
              </div>

              <div>
                <div className="font-heading text-base sm:text-lg font-bold text-primary font-mono">
                  {item.value.toLocaleString()}
                </div>
                <div className="text-[10px] text-secondary font-mono">{metricName}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 14. HISTOGRAM DISTRIBUTION CHART (AUTO BINNING: STURGES / FREEDMAN-DIACONIS)
// ============================================================================
export interface HistogramChartProps {
  rows: Record<string, any>[];
  valueField: string;
  color?: string;
  isLight?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onBinClick?: (binLabel: string, x0: number, x1: number) => void;
}

export const HistogramChart: React.FC<HistogramChartProps> = ({
  rows,
  valueField,
  color = 'var(--chart-1)',
  isLight = false,
  isLoading = false,
  error = null,
  onBinClick
}) => {
  const [binningMode, setBinningMode] = useState<'auto' | 'freedman-diaconis' | 'sturges'>('auto');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const summary = useMemo(
    () => computeHistogramBins(rows, valueField, binningMode),
    [rows, valueField, binningMode]
  );

  if (isLoading) {
    return (
      <div role="status" aria-label={`Loading histogram for ${valueField}`} className="w-full space-y-3 py-4 animate-pulse">
        <div className="h-4 w-48 rounded bg-input" />
        <div className="h-44 w-full rounded-xl bg-input" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" aria-label={`Histogram error: ${error}`} className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-300 font-mono">
        Unable to render histogram: {error}
      </div>
    );
  }

  if (summary.bins.length === 0) {
    return (
      <div role="region" aria-label={`Histogram of ${valueField}: no numeric values available`}>
        <ModernEmptyState
          title="No numeric distribution data"
          message={`Column "${valueField || 'selected'}" contains no valid numeric values to group into bins.`}
        />
      </div>
    );
  }

  const maxCount = Math.max(...summary.bins.map(b => b.count), 1);
  const topBin = [...summary.bins].sort((a, b) => b.count - a.count)[0];
  const width = 520;
  const height = 210;
  const padL = 44;
  const padR = 18;
  const padT = 20;
  const padB = 42;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const binSlotW = innerW / Math.max(1, summary.bins.length);
  const barW = Math.max(8, binSlotW - 4);

  const summaryText = `Histogram of ${valueField} across ${summary.binCount} bin${summary.binCount === 1 ? '' : 's'} (${summary.methodUsed} rule). Most common range: ${topBin.label} with ${topBin.count.toLocaleString()} records (${topBin.frequencyPct}%). Mean ${formatCompactNumber(summary.mean)}, median ${formatCompactNumber(summary.median)}.`;

  return (
    <div
      role="region"
      aria-label={`Histogram showing distribution of ${valueField}`}
      className="w-full space-y-2.5 no-depth-3d chart-viewport relative"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className={isLight ? 'text-muted' : 'text-secondary'}>
            Bins: <strong className={isLight ? 'text-primary' : 'text-primary'}>{summary.binCount}</strong> ({summary.methodUsed === 'freedman-diaconis' ? 'Freedman-Diaconis' : 'Sturges'})
          </span>
          <span aria-hidden="true" className="text-muted">·</span>
          <span className={isLight ? 'text-muted' : 'text-secondary'}>
            Median: <strong className="text-accent tabular-nums">{formatCompactNumber(summary.median)}</strong>
          </span>
          <span aria-hidden="true" className="text-muted">·</span>
          <span className={isLight ? 'text-muted' : 'text-secondary'}>
            Mean: <strong className="text-primary tabular-nums">{formatCompactNumber(summary.mean)}</strong>
          </span>
        </div>

        <div className="inline-flex items-center rounded-lg p-0.5 border bg-elevated border-subtle">
          {(['auto', 'freedman-diaconis', 'sturges'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setBinningMode(mode)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
                binningMode === mode
                  ? 'bg-accent-soft text-accent font-semibold'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {mode === 'auto' ? 'Auto' : mode === 'freedman-diaconis' ? 'F-D' : 'Sturges'}
            </button>
          ))}
        </div>
      </div>

      {summary.largeDataNotice && (
        <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 bg-accent-soft text-accent border border-subtle">
          <Info className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{summary.largeDataNotice}</span>
        </div>
      )}

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={summaryText}
          className="w-full h-48 overflow-visible select-none"
        >
          {[0, 0.5, 1].map((pct, i) => {
            const y = padT + innerH * (1 - pct);
            const countLabel = Math.round(maxCount * pct);
            return (
              <g key={i}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeDasharray="3,3"
                />
                <text
                  x={padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--chart-axis)"
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatCompactNumber(countLabel)}
                </text>
              </g>
            );
          })}

          {summary.bins.map((bin, idx) => {
            const x = padL + idx * binSlotW + (binSlotW - barW) / 2;
            const barH = Math.max(bin.count > 0 ? 4 : 0, (bin.count / maxCount) * innerH);
            const y = padT + innerH - barH;
            const isHovered = hoverIdx === idx;
            const isPeak = bin.binIndex === topBin.binIndex;

            return (
              <g
                key={bin.binIndex}
                tabIndex={0}
                role="button"
                aria-label={`Bin ${bin.label}: ${bin.count} records (${bin.frequencyPct}%)`}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
                onFocus={() => setHoverIdx(idx)}
                onBlur={() => setHoverIdx(null)}
                onClick={() => onBinClick?.(bin.label, bin.x0, bin.x1)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onBinClick?.(bin.label, bin.x0, bin.x1);
                  }
                }}
                className="cursor-pointer focus:outline-none"
              >
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx="3"
                  fill={isPeak ? 'var(--chart-1)' : idx % 2 === 0 ? 'var(--chart-1)' : 'var(--chart-2)'}
                  fillOpacity={isHovered ? 1 : isPeak ? 0.92 : 0.72}
                  stroke={isHovered ? 'var(--chart-4)' : isPeak ? 'var(--chart-1)' : 'none'}
                  strokeWidth={isHovered ? 2 : 1}
                />
                {(isHovered || isPeak) && bin.count > 0 && (
                  <text
                    x={x + barW / 2}
                    y={Math.max(11, y - 4)}
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    {formatCompactNumber(bin.count)}
                  </text>
                )}
                {(idx === 0 || idx === Math.floor(summary.bins.length / 2) || idx === summary.bins.length - 1) && (
                  <text
                    x={x + barW / 2}
                    y={padT + innerH + 16}
                    textAnchor="middle"
                    fill="var(--chart-axis)"
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {truncateChartLabel(bin.label, 14)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hoverIdx !== null && summary.bins[hoverIdx] && (
          <div
            role="tooltip"
            className="mt-1 px-3 py-1.5 rounded-lg border text-[11px] font-mono flex items-center justify-between bg-[var(--chart-tooltip-bg)] text-primary border-subtle shadow-card"
          >
            <span>Range: <strong className="text-accent">{summary.bins[hoverIdx].label}</strong></span>
            <span>Count: <strong>{summary.bins[hoverIdx].count.toLocaleString()}</strong> ({summary.bins[hoverIdx].frequencyPct}%)</span>
          </div>
        )}
      </div>

      <p className="text-[11px] font-mono leading-relaxed text-muted">
        {summaryText}
      </p>
    </div>
  );
};

// ============================================================================
// 15. STACKED BAR CHART (WITH 100% PROPORTIONAL TOGGLE & TOP 10 + OTHER CAP)
// ============================================================================
export interface StackedBarChartProps {
  rows: Record<string, any>[];
  primaryCategoryField: string;
  secondaryCategoryField: string;
  valueField: string;
  aggregation?: VisualConfig['aggregation'];
  isLight?: boolean;
  isLoading?: boolean;
  error?: string | null;
  defaultNormalized?: boolean;
  onCategoryClick?: (category: string) => void;
}

const STACK_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-4)',
  'var(--chart-3)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  rows,
  primaryCategoryField,
  secondaryCategoryField,
  valueField,
  aggregation = 'sum',
  isLoading = false,
  error = null,
  defaultNormalized = false,
  onCategoryClick
}) => {
  const [isNormalized, setIsNormalized] = useState(defaultNormalized);
  const [hoveredSegment, setHoveredSegment] = useState<{ cat: string; key: string; val: number; pct: number } | null>(null);

  const summary = useMemo(
    () =>
      computeStackedBarData(
        rows,
        primaryCategoryField,
        secondaryCategoryField,
        valueField,
        aggregation,
        10
      ),
    [rows, primaryCategoryField, secondaryCategoryField, valueField, aggregation]
  );

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading stacked bar chart" className="w-full space-y-2.5 py-4 animate-pulse">
        <div className="h-4 w-56 rounded bg-elevated" />
        <div className="h-6 w-full rounded bg-elevated" />
        <div className="h-6 w-5/6 rounded bg-elevated" />
        <div className="h-6 w-4/6 rounded bg-elevated" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" aria-label={`Stacked bar error: ${error}`} className="p-4 rounded-xl border border-subtle bg-elevated text-xs text-danger font-mono">
        Unable to render stacked bar chart: {error}
      </div>
    );
  }

  if (summary.categories.length === 0) {
    return (
      <div
        role="region"
        aria-label={`Stacked bar chart of ${valueField} by ${primaryCategoryField} and ${secondaryCategoryField}: no data`}
      >
        <ModernEmptyState
          title="No stacked bar segments available"
          message={`Select two categorical columns and one numeric measure with valid records.`}
        />
      </div>
    );
  }

  const maxTotal = Math.max(...summary.categories.map(c => Math.abs(c.total)), 1);
  const topCat = summary.categories[0];
  const summaryText = `Stacked bar chart of ${valueField} by ${primaryCategoryField} split by ${secondaryCategoryField} (${isNormalized ? '100% proportional share' : 'absolute totals'}). Leading category: ${topCat.category} (${formatCompactNumber(topCat.total)}).`;

  return (
    <div
      role="region"
      aria-label={summaryText}
      className="w-full space-y-3 no-depth-3d chart-viewport"
    >
      {/* Header controls: Legend + 100% Stacked Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          {summary.seriesKeys.map((seriesKey, sIdx) => (
            <span
              key={seriesKey}
              className="inline-flex items-center gap-1.5 text-secondary"
              title={seriesKey}
            >
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: STACK_PALETTE[sIdx % STACK_PALETTE.length] }}
              />
              <span className="truncate max-w-[110px]">{truncateChartLabel(seriesKey, 16)}</span>
            </span>
          ))}
        </div>

        <div
          role="group"
          aria-label="Stacked bar display mode"
          className="inline-flex items-center rounded-lg p-0.5 border bg-elevated border-subtle"
        >
          <button
            type="button"
            onClick={() => setIsNormalized(false)}
            aria-pressed={!isNormalized}
            className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
              !isNormalized
                ? 'bg-accent-soft text-accent font-semibold'
                : 'text-muted hover:text-primary'
            }`}
          >
            Totals
          </button>
          <button
            type="button"
            onClick={() => setIsNormalized(true)}
            aria-pressed={isNormalized}
            className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
              isNormalized
                ? 'bg-accent-soft text-accent-2 font-semibold'
                : 'text-muted hover:text-primary'
            }`}
          >
            100% Stacked
          </button>
        </div>
      </div>

      {summary.largeDataNotice && (
        <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 bg-accent-soft text-accent border border-subtle">
          <Info className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{summary.largeDataNotice}</span>
        </div>
      )}

      {/* Stacked Bars */}
      <div className="space-y-2">
        {summary.categories.map(catRow => {
          const absRowSum = catRow.segments.reduce((acc, s) => acc + Math.abs(s.value), 0) || 1;
          const barTotalWidthPct = isNormalized
            ? 100
            : Math.min(100, Math.max(8, (Math.abs(catRow.total) / maxTotal) * 100));

          return (
            <div
              key={catRow.category}
              tabIndex={0}
              role="button"
              aria-label={`${catRow.category}: total ${catRow.total.toLocaleString()}`}
              onClick={() => onCategoryClick?.(catRow.category)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCategoryClick?.(catRow.category);
                }
              }}
              className="space-y-1 p-1.5 -mx-1.5 rounded-lg cursor-pointer transition-colors hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            >
              <div className="flex items-center justify-between text-xs gap-2">
                <span
                  className="font-medium truncate max-w-[200px] text-primary"
                  title={catRow.category}
                >
                  {truncateChartLabel(catRow.category, 24)}
                </span>
                <span className="font-mono tabular-nums text-[11px] text-secondary">
                  {isNormalized ? '100%' : formatCompactNumber(catRow.total)}
                </span>
              </div>

              <div className="w-full h-3.5 rounded-md overflow-hidden flex bg-elevated border border-subtle">
                <div className="h-full flex transition-all duration-300" style={{ width: `${barTotalWidthPct}%` }}>
                  {catRow.segments.map((seg, sIdx) => {
                    if (Math.abs(seg.value) <= 0) return null;
                    const segWidthPct = (Math.abs(seg.value) / absRowSum) * 100;
                    return (
                      <div
                        key={seg.key}
                        onMouseEnter={() => setHoveredSegment({ cat: catRow.category, key: seg.key, val: seg.value, pct: seg.sharePct })}
                        onMouseLeave={() => setHoveredSegment(null)}
                        style={{
                          width: `${segWidthPct}%`,
                          backgroundColor: STACK_PALETTE[sIdx % STACK_PALETTE.length]
                        }}
                        className="h-full first:rounded-l-xs last:rounded-r-xs border-r border-black/20 last:border-r-0"
                        title={`${catRow.category} · ${seg.key}: ${seg.value.toLocaleString()} (${seg.sharePct}%)`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hoveredSegment && (
        <div
          role="tooltip"
          className="px-3 py-1.5 rounded-lg border text-[11px] font-mono flex items-center justify-between bg-[var(--chart-tooltip-bg)] text-primary border-subtle shadow-card"
        >
          <span>{truncateChartLabel(hoveredSegment.cat, 18)} · <strong className="text-accent">{truncateChartLabel(hoveredSegment.key, 18)}</strong></span>
          <span>{hoveredSegment.val.toLocaleString()} ({hoveredSegment.pct}%)</span>
        </div>
      )}

      <p className="text-[11px] font-mono leading-relaxed text-muted">
        {summaryText}
        {summary.cappedOtherCount > 0 ? ` (${summary.cappedOtherCount} smaller categories grouped into "Other".)` : ''}
      </p>
    </div>
  );
};

// ============================================================================
// 16. UNIFIED 8-CHART GUIDE RENDERER (BAR, LINE, SCATTER, HISTOGRAM,
//     STACKED BAR, DONUT, HEATMAP, BOXPLOT) WITH FULL EDGE-CASE HARDENING
// ============================================================================
export interface GuideChartRendererProps {
  chartType: ChartGuideId;
  rows: Record<string, any>[];
  categoryField: string;
  secondaryCategoryField?: string;
  valueField: string;
  secondaryValueField?: string;
  aggregation?: VisualConfig['aggregation'];
  isLight?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onDrillThrough?: (filterColumn: string, filterValue: string, label?: string) => void;
}

const GUIDE_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-4)',
  'var(--chart-3)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

export const GuideChartRenderer: React.FC<GuideChartRendererProps> = ({
  chartType,
  rows,
  categoryField,
  secondaryCategoryField,
  valueField,
  secondaryValueField,
  aggregation = 'sum',
  isLight = false,
  isLoading = false,
  error = null,
  onDrillThrough
}) => {
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const chartContainerId = `guide-chart-${chartType}-${categoryField}-${valueField}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  const chartTitle = `${chartType.toUpperCase()}: ${valueField} by ${categoryField}`;

  const barData = useMemo(
    () => (chartType === 'bar' ? computeBarChartData(rows, categoryField, valueField, aggregation, 10) : null),
    [chartType, rows, categoryField, valueField, aggregation]
  );

  const lineData = useMemo(
    () => (chartType === 'line' ? computeLineSeriesData(rows, categoryField, valueField, aggregation, 60) : null),
    [chartType, rows, categoryField, valueField, aggregation]
  );

  const scatterData = useMemo(
    () =>
      chartType === 'scatter'
        ? computeScatterPlotData(rows, valueField, secondaryValueField || valueField, categoryField, 450)
        : null,
    [chartType, rows, valueField, secondaryValueField, categoryField]
  );

  const donutData = useMemo(
    () => (chartType === 'donut' ? computeDonutChartData(rows, categoryField, valueField, aggregation, 5) : null),
    [chartType, rows, categoryField, valueField, aggregation]
  );

  const heatmapData = useMemo(
    () =>
      chartType === 'heatmap'
        ? computeHeatmapMatrixData(rows, categoryField, secondaryCategoryField || '', valueField, aggregation, 7, 7)
        : null,
    [chartType, rows, categoryField, secondaryCategoryField, valueField, aggregation]
  );

  const boxplotData = useMemo(
    () => (chartType === 'boxplot' ? computeBoxplotSummary(rows, categoryField, valueField, 10) : null),
    [chartType, rows, categoryField, valueField]
  );

  if (chartType === 'histogram') {
    return (
      <HistogramChart
        rows={rows}
        valueField={valueField}
        isLight={isLight}
        isLoading={isLoading}
        error={error}
        onBinClick={(label) => onDrillThrough?.(valueField, label, `Bin ${label}`)}
      />
    );
  }

  if (chartType === 'stacked_bar') {
    return (
      <StackedBarChart
        rows={rows}
        primaryCategoryField={categoryField}
        secondaryCategoryField={secondaryCategoryField || categoryField}
        valueField={valueField}
        aggregation={aggregation}
        isLight={isLight}
        isLoading={isLoading}
        error={error}
        onCategoryClick={(cat) => onDrillThrough?.(categoryField, cat, cat)}
      />
    );
  }

  if (isLoading) {
    return (
      <div role="status" aria-label={`Loading ${chartType} chart`} className="w-full space-y-3 py-4 animate-pulse">
        <div className="h-4 w-48 rounded bg-elevated" />
        <div className="h-44 w-full rounded-xl bg-elevated" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" aria-label={`${chartType} chart error: ${error}`} className="p-4 rounded-xl border border-subtle bg-elevated text-xs text-danger font-mono">
        Unable to render {chartType} chart: {error}
      </div>
    );
  }

  // 1. BAR CHART
  if (chartType === 'bar' && barData) {
    if (barData.items.length === 0) {
      return (
        <div role="region" aria-label={`Bar chart of ${valueField} by ${categoryField}: no data`}>
          <ModernEmptyState
            title="No category data to compare"
            message={`Select a category column and numeric measure with non-empty rows.`}
          />
        </div>
      );
    }

    const maxAbs = Math.max(...barData.items.map(i => Math.abs(i.value)), 1);
    const topItem = barData.items[0];
    const summaryText = `Bar chart comparing ${valueField} (${aggregation}) across ${barData.items.length} ${categoryField} categories (value axis starts at zero). Leading category: ${topItem.category} with ${formatCompactNumber(topItem.value)} (${topItem.share}%).`;

    return (
      <div id={chartContainerId} role="region" aria-label={summaryText} className="w-full space-y-2.5 no-depth-3d chart-viewport">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted">{chartTitle}</span>
          <DownloadMenu
            context="chart"
            compact
            chartPayload={{
              chartId: chartContainerId,
              chartTitle,
              containerSelector: `#${chartContainerId}`,
              chartType,
              categoryField,
              secondaryCategoryField,
              valueField,
              secondaryValueField,
              aggregation,
            }}
          />
        </div>
        {barData.largeDataNotice && (
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 bg-accent-soft text-accent border border-subtle">
            <Info className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>{barData.largeDataNotice}</span>
          </div>
        )}

        <div className="space-y-2">
          {barData.items.map((item, idx) => {
            const pct = Math.min(100, Math.max(4, (Math.abs(item.value) / maxAbs) * 100));
            const barColor =
              item.category === 'Other'
                ? 'var(--border-strong)'
                : item.value < 0
                ? 'var(--chart-4)'
                : idx === 0
                ? 'var(--chart-1)'
                : idx === 1
                ? 'var(--chart-2)'
                : GUIDE_PALETTE[idx % GUIDE_PALETTE.length];

            return (
              <div
                key={item.category}
                tabIndex={0}
                role="button"
                aria-label={`${item.category}: ${item.value.toLocaleString()} (${item.share}%)`}
                onMouseEnter={() => setHoverInfo(`${item.category}: ${item.value.toLocaleString()} (${item.share}% share, ${item.count} rows)`)}
                onMouseLeave={() => setHoverInfo(null)}
                onFocus={() => setHoverInfo(`${item.category}: ${item.value.toLocaleString()} (${item.share}% share, ${item.count} rows)`)}
                onBlur={() => setHoverInfo(null)}
                onClick={() => onDrillThrough?.(categoryField, item.category, item.category)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onDrillThrough?.(categoryField, item.category, item.category);
                  }
                }}
                className="space-y-1 p-1.5 -mx-1.5 rounded-lg cursor-pointer transition-colors hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <div className="flex justify-between items-center text-xs gap-2">
                  <span
                    className="font-medium truncate max-w-[210px] text-primary"
                    title={item.category}
                  >
                    {item.displayLabel}
                  </span>
                  <span className="font-mono tabular-nums text-[11px] flex items-center gap-1.5">
                    <strong className="text-primary">{formatCompactNumber(item.value)}</strong>
                    <span className="text-muted">({item.share}%)</span>
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden bg-elevated border border-subtle">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {hoverInfo && (
          <div role="tooltip" className="px-3 py-1.5 rounded-lg border text-[11px] font-mono bg-[var(--chart-tooltip-bg)] text-primary border-subtle shadow-card">
            {hoverInfo}
          </div>
        )}

        <p className="text-[11px] font-mono leading-relaxed text-muted">
          {summaryText}
          {barData.hasOther ? ` (${barData.otherCount} additional categories grouped into "Other".)` : ''}
        </p>
      </div>
    );
  }

  // 2. LINE CHART
  if (chartType === 'line' && lineData) {
    if (lineData.points.length === 0) {
      return (
        <div role="region" aria-label={`Line chart of ${valueField} over ${categoryField}: no data`}>
          <ModernEmptyState
            title="No time series data available"
            message={`Select a date/period column and numeric measure with valid observations.`}
          />
        </div>
      );
    }

    const pts = lineData.points;
    const width = 520;
    const height = 200;
    const padL = 48;
    const padR = 20;
    const padT = 18;
    const padB = 36;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const span = lineData.allEqual ? Math.max(1, Math.abs(lineData.maxVal) || 1) : lineData.maxVal - lineData.minVal;

    const coords = pts.map((pt, i) => {
      const x = pts.length === 1 ? padL + innerW / 2 : padL + (i / (pts.length - 1)) * innerW;
      const y = lineData.allEqual
        ? padT + innerH / 2
        : padT + innerH - ((pt.value - lineData.minVal) / span) * innerH;
      return { ...pt, x, y };
    });

    const pathD = coords.reduce((acc, c, i) => (i === 0 ? `M ${c.x},${c.y}` : `${acc} L ${c.x},${c.y}`), '');
    const areaD = coords.length >= 2
      ? `${pathD} L ${coords[coords.length - 1].x},${padT + innerH} L ${coords[0].x},${padT + innerH} Z`
      : '';

    const summaryText = `Line chart tracking ${valueField} across ${pts.length} intervals (${pts[0].label} to ${pts[pts.length - 1].label}). Range: ${formatCompactNumber(lineData.minVal)} to ${formatCompactNumber(lineData.maxVal)} (Mean: ${formatCompactNumber(lineData.meanVal)}).`;

    return (
      <div role="region" aria-label={summaryText} className="w-full space-y-2.5 no-depth-3d chart-viewport">
        {lineData.notice && (
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 bg-elevated text-warning border border-subtle">
            <Info className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>{lineData.notice}</span>
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summaryText} className="w-full h-48 overflow-visible select-none">
          <defs>
            <linearGradient id="guideLineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((pct, i) => {
            const y = padT + innerH * (1 - pct);
            const val = lineData.allEqual ? lineData.maxVal : lineData.minVal + span * pct;
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--chart-grid)" strokeDasharray="3,3" />
                <text x={padL - 6} y={y + 3} textAnchor="end" fill="var(--chart-axis)" fontSize="9" fontFamily="JetBrains Mono, monospace">
                  {formatCompactNumber(val)}
                </text>
              </g>
            );
          })}

          {areaD && <path d={areaD} fill="url(#guideLineFill)" />}
          {coords.length >= 2 && (
            <path d={pathD} fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {coords.map((c, idx) => (
            <g
              key={`${c.label}-${idx}`}
              tabIndex={0}
              role="button"
              aria-label={`${c.label}: ${c.value.toLocaleString()}`}
              onMouseEnter={() => setHoverInfo(`${c.label}: ${c.value.toLocaleString()} (${c.count} records)`)}
              onMouseLeave={() => setHoverInfo(null)}
              onFocus={() => setHoverInfo(`${c.label}: ${c.value.toLocaleString()} (${c.count} records)`)}
              onBlur={() => setHoverInfo(null)}
              onClick={() => onDrillThrough?.(categoryField, c.label, c.label)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDrillThrough?.(categoryField, c.label, c.label);
                }
              }}
              className="cursor-pointer focus:outline-none"
            >
              <circle cx={c.x} cy={c.y} r="4.5" fill="var(--bg-card)" stroke="var(--chart-1)" strokeWidth="2" />
            </g>
          ))}

          {/* X-axis labels */}
          {coords.length > 0 && (
            <>
              <text x={coords[0].x} y={padT + innerH + 18} textAnchor="start" fill="var(--chart-axis)" fontSize="9" fontFamily="JetBrains Mono, monospace">
                {coords[0].displayLabel}
              </text>
              {coords.length > 2 && (
                <text x={coords[Math.floor(coords.length / 2)].x} y={padT + innerH + 18} textAnchor="middle" fill="var(--chart-axis)" fontSize="9" fontFamily="JetBrains Mono, monospace">
                  {coords[Math.floor(coords.length / 2)].displayLabel}
                </text>
              )}
              {coords.length > 1 && (
                <text x={coords[coords.length - 1].x} y={padT + innerH + 18} textAnchor="end" fill="var(--chart-axis)" fontSize="9" fontFamily="JetBrains Mono, monospace">
                  {coords[coords.length - 1].displayLabel}
                </text>
              )}
            </>
          )}
        </svg>

        {hoverInfo && (
          <div role="tooltip" className="px-3 py-1.5 rounded-lg border text-[11px] font-mono bg-[var(--chart-tooltip-bg)] text-primary border-subtle shadow-card">
            {hoverInfo}
          </div>
        )}

        <p className="text-[11px] font-mono leading-relaxed text-muted">
          {summaryText}
        </p>
      </div>
    );
  }

  // 3. SCATTER PLOT
  if (chartType === 'scatter' && scatterData) {
    const yCol = secondaryValueField || valueField;
    if (scatterData.points.length === 0) {
      return (
        <div role="region" aria-label={`Scatter plot of ${valueField} vs ${yCol}: no data`}>
          <ModernEmptyState
            title="No paired numeric coordinates"
            message={`Select two numeric measures with valid paired numbers to plot relationships.`}
          />
        </div>
      );
    }

    const width = 520;
    const height = 200;
    const padL = 48;
    const padR = 20;
    const padT = 18;
    const padB = 36;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const xSpan = scatterData.xMax - scatterData.xMin || 1;
    const ySpan = scatterData.yMax - scatterData.yMin || 1;
    const scaleX = (v: number) => padL + ((v - scatterData.xMin) / xSpan) * innerW;
    const scaleY = (v: number) => padT + innerH - ((v - scatterData.yMin) / ySpan) * innerH;

    const ty1 = Math.max(scatterData.yMin, Math.min(scatterData.yMax, scatterData.slope * scatterData.xMin + scatterData.intercept));
    const ty2 = Math.max(scatterData.yMin, Math.min(scatterData.yMax, scatterData.slope * scatterData.xMax + scatterData.intercept));

    const summaryText = `Scatter plot of ${valueField} (X) vs ${yCol} (Y) across ${scatterData.totalValidCount.toLocaleString()} records (Pearson r = ${scatterData.correlation}). Note: correlation does not prove causation.`;

    return (
      <div role="region" aria-label={summaryText} className="w-full space-y-2.5 no-depth-3d chart-viewport">
        {scatterData.notice && (
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 bg-accent-soft text-accent border border-subtle">
            <Info className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>{scatterData.notice}</span>
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summaryText} className="w-full h-48 overflow-visible select-none">
          {[0, 0.5, 1].map((pct, i) => {
            const y = padT + innerH * (1 - pct);
            const val = scatterData.yMin + ySpan * pct;
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--chart-grid)" strokeDasharray="3,3" />
                <text x={padL - 6} y={y + 3} textAnchor="end" fill="var(--chart-axis)" fontSize="9" fontFamily="JetBrains Mono, monospace">
                  {formatCompactNumber(val)}
                </text>
              </g>
            );
          })}

          {scatterData.points.length >= 2 && (
            <line
              x1={scaleX(scatterData.xMin)}
              y1={scaleY(ty1)}
              x2={scaleX(scatterData.xMax)}
              y2={scaleY(ty2)}
              stroke="var(--chart-4)"
              strokeWidth="1.5"
              strokeDasharray="4,4"
            />
          )}

          {scatterData.points.map((pt, idx) => (
            <circle
              key={pt.id}
              cx={scaleX(pt.x)}
              cy={scaleY(pt.y)}
              r="4.5"
              tabIndex={idx < 25 ? 0 : -1}
              role="button"
              aria-label={`${pt.label}: ${valueField} ${pt.x}, ${yCol} ${pt.y}`}
              fill={idx % 2 === 0 ? 'var(--chart-1)' : 'var(--chart-2)'}
              fillOpacity="0.85"
              stroke="var(--bg-card)"
              strokeWidth="1.2"
              onMouseEnter={() => setHoverInfo(`${pt.label} — ${valueField}: ${formatCompactNumber(pt.x)}, ${yCol}: ${formatCompactNumber(pt.y)}`)}
              onMouseLeave={() => setHoverInfo(null)}
              onFocus={() => setHoverInfo(`${pt.label} — ${valueField}: ${formatCompactNumber(pt.x)}, ${yCol}: ${formatCompactNumber(pt.y)}`)}
              onBlur={() => setHoverInfo(null)}
              onClick={() => onDrillThrough?.(categoryField, pt.label, pt.label)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDrillThrough?.(categoryField, pt.label, pt.label);
                }
              }}
              className="cursor-pointer focus:outline-none"
            />
          ))}

          <text x={padL + innerW / 2} y={padT + innerH + 22} textAnchor="middle" fill="var(--chart-axis)" fontSize="9" fontFamily="JetBrains Mono, monospace">
            {truncateChartLabel(valueField, 22)} →
          </text>
        </svg>

        {hoverInfo && (
          <div role="tooltip" className="px-3 py-1.5 rounded-lg border text-[11px] font-mono bg-[var(--chart-tooltip-bg)] text-primary border-subtle shadow-card">
            {hoverInfo}
          </div>
        )}

        <p className="text-[11px] font-mono leading-relaxed text-muted">
          {summaryText}
        </p>
      </div>
    );
  }

  // 4. DONUT CHART
  if (chartType === 'donut' && donutData) {
    if (donutData.slices.length === 0 || donutData.absTotal === 0) {
      return (
        <div role="region" aria-label={`Donut chart of ${valueField} by ${categoryField}: no data`}>
          <ModernEmptyState
            title="No proportional share data"
            message={`Select a category column (up to 5 values) and a non-zero numeric measure.`}
          />
        </div>
      );
    }

    const topSlice = donutData.slices[0];
    const summaryText = `Donut chart showing share of ${valueField} across ${donutData.slices.length} ${categoryField} slices. Largest share: ${topSlice.category} (${topSlice.sharePct}%, ${formatCompactNumber(topSlice.value)}).`;

    let cumulativePct = 0;
    return (
      <div role="region" aria-label={summaryText} className="w-full space-y-2.5 no-depth-3d chart-viewport">
        {donutData.notice && (
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 bg-elevated text-warning border border-subtle">
            <Info className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>{donutData.notice}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-1">
          <div className="relative w-36 h-36 shrink-0">
            <svg viewBox="0 0 100 100" role="img" aria-label={summaryText} className="w-full h-full -rotate-90">
              {donutData.slices.map((s, idx) => {
                const dash = `${(s.sharePct / 100) * 251.2} 251.2`;
                const offset = -(cumulativePct / 100) * 251.2;
                cumulativePct += s.sharePct;
                const color = s.category === 'Other' ? 'var(--border-strong)' : GUIDE_PALETTE[idx % GUIDE_PALETTE.length];
                return (
                  <circle
                    key={s.category}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={color}
                    strokeWidth="14"
                    strokeDasharray={dash}
                    strokeDashoffset={offset}
                    onMouseEnter={() => setHoverInfo(`${s.category}: ${s.value.toLocaleString()} (${s.sharePct}%)`)}
                    onMouseLeave={() => setHoverInfo(null)}
                    onClick={() => onDrillThrough?.(categoryField, s.category, s.category)}
                    className="cursor-pointer transition-opacity hover:opacity-85"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-mono text-muted">Total</span>
              <span className="text-xs font-bold font-mono text-primary">
                {formatCompactNumber(donutData.grandTotal)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs w-full max-w-[230px] font-mono">
            {donutData.slices.map((s, idx) => {
              const color = s.category === 'Other' ? 'var(--border-strong)' : GUIDE_PALETTE[idx % GUIDE_PALETTE.length];
              return (
                <div
                  key={s.category}
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.category}: ${s.sharePct}% (${s.value.toLocaleString()})`}
                  onClick={() => onDrillThrough?.(categoryField, s.category, s.category)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onDrillThrough?.(categoryField, s.category, s.category);
                    }
                  }}
                  className="flex items-center justify-between p-1 -m-1 rounded cursor-pointer transition-colors hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                >
                  <span className="flex items-center gap-1.5 truncate" title={s.category}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-primary">{s.displayLabel}</span>
                  </span>
                  <span className="text-accent font-bold">{s.sharePct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {hoverInfo && (
          <div role="tooltip" className="px-3 py-1.5 rounded-lg border text-[11px] font-mono bg-[var(--chart-tooltip-bg)] text-primary border-subtle shadow-card">
            {hoverInfo}
          </div>
        )}

        <p className="text-[11px] font-mono leading-relaxed text-muted">
          {summaryText}
        </p>
      </div>
    );
  }

  // 5. HEATMAP
  if (chartType === 'heatmap' && heatmapData) {
    if (heatmapData.rowHeaders.length === 0 || heatmapData.colHeaders.length === 0) {
      return (
        <div role="region" aria-label={`Heatmap of ${valueField}: no data`}>
          <ModernEmptyState
            title="No grid pattern data"
            message={`Select two categorical/time dimensions and one numeric measure to build a heatmap.`}
          />
        </div>
      );
    }

    const summaryText = `Heatmap of ${valueField} (${aggregation}) across ${heatmapData.rowHeaders.length} ${categoryField} rows by ${heatmapData.colHeaders.length} ${secondaryCategoryField || 'columns'}. Scale: ${formatCompactNumber(heatmapData.minVal)} to ${formatCompactNumber(heatmapData.maxVal)}.`;

    return (
      <div role="region" aria-label={summaryText} className="w-full space-y-2.5 no-depth-3d chart-viewport">
        {heatmapData.notice && (
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 bg-accent-soft text-accent border border-subtle">
            <Info className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>{heatmapData.notice}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono border-collapse">
            <thead>
              <tr>
                <th className="p-1.5 text-left text-muted">
                  {truncateChartLabel(categoryField, 14)} \ {truncateChartLabel(secondaryCategoryField || valueField, 14)}
                </th>
                {heatmapData.colHeaders.map(col => (
                  <th key={col} className="p-1.5 text-center text-secondary" title={col}>
                    {truncateChartLabel(col, 10)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.rowHeaders.map(rKey => (
                <tr key={rKey}>
                  <td className="p-1.5 font-semibold whitespace-nowrap text-primary" title={rKey}>
                    {truncateChartLabel(rKey, 16)}
                  </td>
                  {heatmapData.colHeaders.map(cKey => {
                    const cell = heatmapData.cellMap[rKey]?.[cKey];
                    const val = cell?.value ?? 0;
                    const count = cell?.count ?? 0;
                    const alpha = cell?.intensity ?? 0;
                    return (
                      <td key={cKey} className="p-1">
                        <button
                          type="button"
                          onMouseEnter={() => setHoverInfo(`${rKey} × ${cKey}: ${val.toLocaleString()} (${count} rows)`)}
                          onMouseLeave={() => setHoverInfo(null)}
                          onFocus={() => setHoverInfo(`${rKey} × ${cKey}: ${val.toLocaleString()} (${count} rows)`)}
                          onBlur={() => setHoverInfo(null)}
                          onClick={() => onDrillThrough?.(categoryField, rKey, `${rKey} × ${cKey}`)}
                          style={{
                            backgroundColor: count > 0 ? `color-mix(in srgb, var(--chart-1) 25%, transparent)` : 'var(--bg-elevated)'
                          }}
                          className={`w-full py-1.5 px-2 rounded-md text-center font-mono text-[10px] font-bold transition-transform hover:scale-[1.03] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                            count > 0
                              ? alpha > 0.55
                                ? 'text-primary'
                                : 'text-primary'
                              : 'text-muted'
                          }`}
                          title={`${rKey} × ${cKey}: ${val.toLocaleString()}`}
                        >
                          {count > 0 ? formatCompactNumber(val) : '—'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Labeled Color Scale Legend */}
        <div className="flex items-center justify-between text-[10px] font-mono pt-1">
          <div className="flex items-center gap-2">
            <span className="text-muted">Color scale ({valueField}):</span>
            <span className="text-primary">{formatCompactNumber(heatmapData.minVal)}</span>
            <div className="w-24 h-2.5 rounded-full bg-gradient-to-r from-[var(--accent)]/20 via-[var(--accent)]/60 to-[var(--accent)]" />
            <span className="text-accent font-bold">{formatCompactNumber(heatmapData.maxVal)}</span>
          </div>
        </div>

        {hoverInfo && (
          <div role="tooltip" className="px-3 py-1.5 rounded-lg border text-[11px] font-mono bg-[var(--chart-tooltip-bg)] text-primary border-subtle shadow-card">
            {hoverInfo}
          </div>
        )}

        <p className="text-[11px] font-mono leading-relaxed text-muted">
          {summaryText}
        </p>
      </div>
    );
  }

  // 6. BOX PLOT
  if (chartType === 'boxplot' && boxplotData) {
    if (boxplotData.length === 0) {
      return (
        <div role="region" aria-label={`Box plot of ${valueField} by ${categoryField}: no data`}>
          <ModernEmptyState
            title="No spread data available"
            message={`Select a category column and numeric column with valid values to compare medians and quartiles.`}
          />
        </div>
      );
    }

    const allVals = boxplotData.flatMap(b => [b.min, b.max, ...b.outliers]);
    const globalMin = Math.min(...allVals);
    const globalMax = Math.max(...allVals);
    const allEqual = globalMax === globalMin;
    const span = allEqual ? Math.max(1, Math.abs(globalMax) || 1) : globalMax - globalMin;
    const width = 520;
    const height = 200;
    const padL = 48;
    const padR = 20;
    const padT = 18;
    const padB = 36;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const slotW = innerW / Math.max(1, boxplotData.length);
    const scaleY = (v: number) => (allEqual ? padT + innerH / 2 : padT + innerH - ((v - globalMin) / span) * innerH);

    const lead = boxplotData[0];
    const summaryText = `Box plot comparing ${valueField} spread and median across ${boxplotData.length} ${categoryField} groups. Highest median: ${lead.category} (Median ${formatCompactNumber(lead.median)}, Q1 ${formatCompactNumber(lead.q1)}, Q3 ${formatCompactNumber(lead.q3)}, IQR ${formatCompactNumber(lead.iqr)}).`;

    return (
      <div role="region" aria-label={summaryText} className="w-full space-y-2.5 no-depth-3d chart-viewport">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summaryText} className="w-full h-48 overflow-visible select-none">
          {[0, 0.5, 1].map((pct, i) => {
            const y = padT + innerH * (1 - pct);
            const val = allEqual ? globalMax : globalMin + span * pct;
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--chart-grid)" strokeDasharray="3,3" />
                <text x={padL - 6} y={y + 3} textAnchor="end" fill="var(--chart-axis)" fontSize="9" fontFamily="JetBrains Mono, monospace">
                  {formatCompactNumber(val)}
                </text>
              </g>
            );
          })}

          {boxplotData.map((stat, idx) => {
            const cx = padL + idx * slotW + slotW / 2;
            const boxW = Math.min(34, Math.max(14, slotW * 0.5));
            const yMin = scaleY(stat.min);
            const yQ1 = scaleY(stat.q1);
            const yMed = scaleY(stat.median);
            const yQ3 = scaleY(stat.q3);
            const yMax = scaleY(stat.max);
            const color = stat.category === 'Other' ? 'var(--border-strong)' : idx % 2 === 0 ? 'var(--chart-1)' : 'var(--chart-2)';

            return (
              <g
                key={stat.category}
                tabIndex={0}
                role="button"
                aria-label={`${stat.category}: median ${stat.median}, Q1 ${stat.q1}, Q3 ${stat.q3}, min ${stat.min}, max ${stat.max}`}
                onMouseEnter={() =>
                  setHoverInfo(
                    `${stat.category}: Median ${formatCompactNumber(stat.median)} · Q1 ${formatCompactNumber(stat.q1)} · Q3 ${formatCompactNumber(stat.q3)} · IQR ${formatCompactNumber(stat.iqr)} (${stat.count} rows)`
                  )
                }
                onMouseLeave={() => setHoverInfo(null)}
                onFocus={() =>
                  setHoverInfo(
                    `${stat.category}: Median ${formatCompactNumber(stat.median)} · Q1 ${formatCompactNumber(stat.q1)} · Q3 ${formatCompactNumber(stat.q3)} · IQR ${formatCompactNumber(stat.iqr)} (${stat.count} rows)`
                  )
                }
                onBlur={() => setHoverInfo(null)}
                onClick={() => onDrillThrough?.(categoryField, stat.category, stat.category)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onDrillThrough?.(categoryField, stat.category, stat.category);
                  }
                }}
                className="cursor-pointer focus:outline-none"
              >
                <line x1={cx} y1={yMin} x2={cx} y2={yMax} stroke={color} strokeWidth="1.5" strokeDasharray="2,2" />
                <line x1={cx - boxW * 0.35} y1={yMin} x2={cx + boxW * 0.35} y2={yMin} stroke={color} strokeWidth="2" />
                <line x1={cx - boxW * 0.35} y1={yMax} x2={cx + boxW * 0.35} y2={yMax} stroke={color} strokeWidth="2" />
                <rect
                  x={cx - boxW / 2}
                  y={Math.min(yQ1, yQ3)}
                  width={boxW}
                  height={Math.max(4, Math.abs(yQ3 - yQ1))}
                  rx="2.5"
                  fill={color}
                  fillOpacity="0.28"
                  stroke={color}
                  strokeWidth="1.8"
                />
                <line x1={cx - boxW / 2} y1={yMed} x2={cx + boxW / 2} y2={yMed} stroke="var(--chart-4)" strokeWidth="2.5" />
                <text x={cx} y={padT + innerH + 18} textAnchor="middle" fill="var(--chart-axis)" fontSize="9" fontFamily="JetBrains Mono, monospace">
                  {truncateChartLabel(stat.category, 9)}
                </text>
              </g>
            );
          })}
        </svg>

        {hoverInfo && (
          <div role="tooltip" className="px-3 py-1.5 rounded-lg border text-[11px] font-mono bg-[var(--chart-tooltip-bg)] text-primary border-subtle shadow-card">
            {hoverInfo}
          </div>
        )}

        <p className="text-[11px] font-mono leading-relaxed text-muted">
          {summaryText}
        </p>
      </div>
    );
  }

  return null;
};

