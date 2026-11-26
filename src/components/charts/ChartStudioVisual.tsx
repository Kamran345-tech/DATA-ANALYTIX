/**
 * SHARED CHART STUDIO VISUAL RENDERER (Parts B1–B12, C, D1–D7)
 * One unified chart & visual component used across Dashboard Builder, Analytics Packs,
 * Executive Dashboard, VIP Boardroom Dashboards, and Reports.
 * Zero extra dependencies: pure responsive SVG + d3 reading semantic theme tokens (--chart-1..8, --accent, --bg-*, --text-*).
 */

import React, { useMemo, useState, Suspense } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Target,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import {
  ChartStudioVisualType,
  VisualCalculationType,
  applyVisualCalculation,
  computeAnalyticsPaneStats,
  computeKeyInfluencers,
  generateSmartNarrative,
} from '../../engine/chartStudioEngine';
import { GeoScopeId } from './geo/geoDataLazy';

const LazyOfflineGeoMap = React.lazy(() => import('./geo/OfflineGeoMap'));

export interface AnalyticsPaneConfig {
  showAverage?: boolean;
  showMedian?: boolean;
  showMinMax?: boolean;
  showP90?: boolean;
  constantLineValue?: number | null;
  showForecast?: boolean;
  showAnomalies?: boolean;
  showErrorBars?: boolean;
}

export interface ChartStudioVisualProps {
  visualType: ChartStudioVisualType;
  rows: Record<string, any>[];
  categoryCol: string;
  metricCol: string;
  secondaryMetricCol?: string;
  sizeCol?: string;
  groupCol?: string;
  startDateCol?: string;
  endDateCol?: string;
  progressCol?: string;
  targetValue?: number;
  title?: string;
  subtitle?: string;
  height?: number;
  visualCalc?: VisualCalculationType;
  analyticsPane?: AnalyticsPaneConfig;
  smallMultiplesCol?: string;
  geoScope?: GeoScopeId;
  selectedCategory?: string | null;
  onCategorySelect?: (categoryValue: string) => void;
  showControls?: boolean;
  missingColumnMessage?: string;
}

const CHART_TOKEN_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

function fmtCompact(val: number): string {
  if (!Number.isFinite(val)) return '0';
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const cleaned = String(v ?? '0').replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const ChartStudioVisual: React.FC<ChartStudioVisualProps> = ({
  visualType,
  rows,
  categoryCol,
  metricCol,
  secondaryMetricCol,
  sizeCol,
  groupCol,
  startDateCol,
  endDateCol,
  progressCol,
  targetValue,
  title,
  subtitle,
  height = 310,
  visualCalc = 'none',
  analyticsPane,
  smallMultiplesCol,
  geoScope,
  selectedCategory,
  onCategorySelect,
  showControls = false,
  missingColumnMessage,
}) => {
  const [localCalc, setLocalCalc] = useState<VisualCalculationType>(visualCalc);
  const [localAnalytics, setLocalAnalytics] = useState<AnalyticsPaneConfig>(
    analyticsPane || {
      showAverage: false,
      showForecast: false,
      showAnomalies: true,
    }
  );
  const [showAllSmallMultiples, setShowAllSmallMultiples] = useState(false);
  const [expandedMatrixRows, setExpandedMatrixRows] = useState<Record<string, boolean>>({});
  const [decompDrillPath, setDecompDrillPath] = useState<Array<{ col: string; val: string }>>([]);
  const [qaQuery, setQaQuery] = useState<string>('top categories by value');
  const [hoveredItem, setHoveredItem] = useState<{
    category: string;
    primaryVal: number;
    secondaryVal?: number;
    color: string;
  } | null>(null);

  const activeCalc = visualCalc !== 'none' ? visualCalc : localCalc;

  // Part E4: Friendly card when a needed column is missing — never render an empty chart
  if (missingColumnMessage || !rows || rows.length === 0 || (!categoryCol && !metricCol)) {
    return (
      <div
        className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 flex flex-col items-center justify-center text-center gap-2"
        style={{ minHeight: `${Math.min(height, 240)}px` }}
        data-testid="missing-column-unlock-card"
      >
        <HelpCircle className="w-7 h-7 text-[var(--accent)]" />
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
          {missingColumnMessage ||
            `Add column "${metricCol || categoryCol || 'metric'}" to unlock this chart`}
        </h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-md">
          Map or upload the required role column in the Pack Role Mapper or Data Dictionary to
          populate this visual automatically.
        </p>
      </div>
    );
  }

  // Aggregate rows by categoryCol
  const aggregatedData = useMemo(() => {
    const groups = new Map<
      string,
      {
        category: string;
        value: number;
        secondaryValue: number;
        sizeValue: number;
        count: number;
        rawValues: number[];
        startDate?: string;
        endDate?: string;
        progressPct?: number;
        group?: string;
      }
    >();

    for (const r of rows) {
      const cat = String(r[categoryCol] ?? 'Uncategorized').trim() || 'Uncategorized';
      const v1 = toNum(r[metricCol]);
      const v2 = secondaryMetricCol ? toNum(r[secondaryMetricCol]) : Math.round(v1 * 0.85);
      const sz = sizeCol ? toNum(r[sizeCol]) : 1;

      const existing = groups.get(cat);
      if (existing) {
        existing.value += v1;
        existing.secondaryValue += v2;
        existing.sizeValue += sz;
        existing.count += 1;
        existing.rawValues.push(v1);
      } else {
        groups.set(cat, {
          category: cat,
          value: v1,
          secondaryValue: v2,
          sizeValue: sz,
          count: 1,
          rawValues: [v1],
          startDate: startDateCol ? String(r[startDateCol] ?? '') : undefined,
          endDate: endDateCol ? String(r[endDateCol] ?? '') : undefined,
          progressPct: progressCol ? toNum(r[progressCol]) : undefined,
          group: groupCol ? String(r[groupCol] ?? 'General') : undefined,
        });
      }
    }

    return Array.from(groups.values()).slice(0, 20);
  }, [
    rows,
    categoryCol,
    metricCol,
    secondaryMetricCol,
    sizeCol,
    startDateCol,
    endDateCol,
    progressCol,
    groupCol,
  ]);

  // Apply D4 Visual Calculation if active
  const calcResult = useMemo(
    () => applyVisualCalculation(aggregatedData, 'value', activeCalc),
    [aggregatedData, activeCalc]
  );

  const chartData = useMemo(
    () =>
      calcResult.rows.map((r) => ({
        ...r,
        displayValue: activeCalc === 'none' ? r.value : r.__calcValue,
      })),
    [calcResult.rows, activeCalc]
  );

  // D1 Analytics Pane Stats
  const analyticsStats = useMemo(
    () =>
      computeAnalyticsPaneStats(
        chartData.map((d) => ({ label: d.category, value: d.displayValue }))
      ),
    [chartData]
  );

  const totalSum = useMemo(
    () => chartData.reduce((acc, d) => acc + Math.max(0, d.displayValue), 0) || 1,
    [chartData]
  );

  // D5 Small Multiples (split any chart by a category into a grid, max 12 panels + "show more")
  const smallMultipleGroups = useMemo(() => {
    if (!smallMultiplesCol) return null;
    const map = new Map<string, Record<string, any>[]>();
    for (const r of rows) {
      const k = String(r[smallMultiplesCol] ?? 'Other').trim() || 'Other';
      const arr = map.get(k) || [];
      arr.push(r);
      map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [rows, smallMultiplesCol]);

  const plottedPoints = useMemo(() => {
    const base = chartData.slice(0, 12);
    if (
      (visualType === 'line' || visualType === 'area' || visualType === 'area_stacked') &&
      localAnalytics.showForecast
    ) {
      return [
        ...base,
        ...analyticsStats.forecastPoints.map((fp) => ({
          category: fp.label,
          value: fp.forecast,
          displayValue: fp.forecast,
          secondaryValue: fp.upperBound,
          sizeValue: 1,
          count: 1,
          rawValues: [fp.forecast],
          __rawValue: fp.forecast,
          __calcValue: fp.forecast,
          __calcFormatted: fmtCompact(fp.forecast),
        })),
      ];
    }
    return base;
  }, [chartData, visualType, localAnalytics.showForecast, analyticsStats.forecastPoints]);

  const maxPlottedVal = useMemo(() => {
    let m = 1;
    for (const p of plottedPoints) {
      const candidate =
        visualType === 'stacked_bar'
          ? p.displayValue + p.secondaryValue
          : Math.max(p.displayValue, secondaryMetricCol ? p.secondaryValue : 0);
      if (candidate > m) m = candidate;
    }
    return m;
  }, [plottedPoints, visualType, secondaryMetricCol]);

  if (smallMultipleGroups && smallMultipleGroups.length > 1) {
    const visiblePanels = showAllSmallMultiples
      ? smallMultipleGroups
      : smallMultipleGroups.slice(0, 12);
    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
        data-testid="small-multiples-grid"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {title || `${metricCol} by ${categoryCol}`} • Small Multiples by {smallMultiplesCol}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Showing {visiblePanels.length} of {smallMultipleGroups.length} synchronized panels
            </p>
          </div>
          {smallMultipleGroups.length > 12 && (
            <button
              type="button"
              onClick={() => setShowAllSmallMultiples((v) => !v)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
            >
              {showAllSmallMultiples
                ? 'Show Top 12'
                : `Show more (+${smallMultipleGroups.length - 12})`}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visiblePanels.map(([panelKey, panelRows]) => (
            <div
              key={panelKey}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-2.5"
            >
              <div className="text-xs font-semibold text-[var(--text-primary)] mb-1 truncate">
                {smallMultiplesCol}: {panelKey} ({panelRows.length})
              </div>
              <ChartStudioVisual
                visualType={visualType}
                rows={panelRows}
                categoryCol={categoryCol}
                metricCol={metricCol}
                secondaryMetricCol={secondaryMetricCol}
                height={165}
                selectedCategory={selectedCategory}
                onCategorySelect={onCategorySelect}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // B8: MAPS (Choropleth, Bubble, Shape)
  if (
    visualType === 'map_choropleth' ||
    visualType === 'map_bubble' ||
    visualType === 'map_shape'
  ) {
    const mapMode =
      visualType === 'map_bubble'
        ? 'bubble'
        : visualType === 'map_shape'
        ? 'shape'
        : 'choropleth';
    return (
      <Suspense
        fallback={
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 text-xs text-[var(--text-secondary)]">
            Loading offline vector map...
          </div>
        }
      >
        <LazyOfflineGeoMap
          rows={rows}
          locationColumn={categoryCol}
          metricColumn={metricCol}
          initialScope={geoScope}
          initialMode={mapMode}
          title={title || `${metricCol} by ${categoryCol}`}
          subtitle={subtitle}
          height={height}
          selectedRegionName={selectedCategory}
          onRegionClick={(regionName) => onCategorySelect?.(regionName)}
        />
      </Suspense>
    );
  }

  // B9: KEY INFLUENCERS VISUAL
  if (visualType === 'key_influencers') {
    const influencers = computeKeyInfluencers(rows, metricCol);
    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
        data-testid="visual-key-influencers"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {title || `Key Influencers Driving ${metricCol}`}
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Baseline average {metricCol}:{' '}
              <strong className="text-[var(--text-primary)] font-mono">
                {fmtCompact(influencers.baselineMean)}
              </strong>{' '}
              across {rows.length} records
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Top Positive Drivers */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3 space-y-2">
            <div className="text-xs font-semibold text-[var(--success)] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>What makes {metricCol} INCREASE</span>
            </div>
            {influencers.topIncreasers.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">
                No segments significantly above baseline.
              </p>
            ) : (
              influencers.topIncreasers.slice(0, 4).map((d, idx) => (
                <div
                  key={`${d.column}-${d.segmentValue}-${idx}`}
                  className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--text-primary)] truncate">
                      {d.column} = {d.segmentValue}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-semibold bg-[var(--bg-elevated)] text-[var(--success)] shrink-0">
                      {d.impactScore.toFixed(2)}x lift
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {d.plainLanguage}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Top Negative Drivers */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3 space-y-2">
            <div className="text-xs font-semibold text-[var(--danger)] flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>What makes {metricCol} DECREASE</span>
            </div>
            {influencers.topDecreasers.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">
                No segments significantly below baseline.
              </p>
            ) : (
              influencers.topDecreasers.slice(0, 4).map((d, idx) => (
                <div
                  key={`${d.column}-${d.segmentValue}-${idx}`}
                  className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--text-primary)] truncate">
                      {d.column} = {d.segmentValue}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-semibold bg-[var(--bg-elevated)] text-[var(--danger)] shrink-0">
                      {d.impactScore.toFixed(2)}x
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {d.plainLanguage}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // B9: SMART NARRATIVE VISUAL
  if (visualType === 'smart_narrative') {
    const narrative = generateSmartNarrative(rows, categoryCol, metricCol, title || 'Executive');
    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-2.5"
        data-testid="visual-smart-narrative"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {title || 'Smart Narrative & Automated Takeaways'}
          </h3>
        </div>
        <p className="text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-elevated)] rounded-lg px-3 py-2 border border-[var(--border-subtle)]">
          {narrative.headline}
        </p>
        <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
          {narrative.fiveLineSummary.map((line, idx) => (
            <li key={idx} className="leading-relaxed">
              {line}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // B9: DECOMPOSITION TREE
  if (visualType === 'decomposition_tree') {
    const candidateCols = Object.keys(rows[0] || {}).filter(
      (c) => c !== metricCol && !/id|date/i.test(c)
    );
    const activeDrillCol =
      candidateCols.find((c) => !decompDrillPath.some((p) => p.col === c)) || categoryCol;

    const filteredRows = rows.filter((r) =>
      decompDrillPath.every((step) => String(r[step.col] ?? '') === step.val)
    );
    const branchTotal = filteredRows.reduce((acc, r) => acc + toNum(r[metricCol]), 0) || 1;

    const childMap = new Map<string, number>();
    for (const r of filteredRows) {
      const k = String(r[activeDrillCol] ?? 'Other');
      childMap.set(k, (childMap.get(k) || 0) + toNum(r[metricCol]));
    }
    const branches = Array.from(childMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
        data-testid="visual-decomposition-tree"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {title || `Decomposition Tree: ${metricCol}`}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Click any node to drill into the next dimension ({activeDrillCol})
            </p>
          </div>
          {decompDrillPath.length > 0 && (
            <button
              type="button"
              onClick={() => setDecompDrillPath([])}
              className="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
            >
              Reset Drill ({decompDrillPath.length})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-[var(--text-on-accent)] font-semibold">
            Total {metricCol}: {fmtCompact(branchTotal)}
          </span>
          {decompDrillPath.map((step, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                {step.col}: <strong>{step.val}</strong>
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          {branches.map(([branchLabel, branchVal], idx) => {
            const pct = Math.min(100, Math.max(2, (branchVal / branchTotal) * 100));
            return (
              <button
                key={branchLabel}
                type="button"
                onClick={() => {
                  if (decompDrillPath.length < candidateCols.length - 1) {
                    setDecompDrillPath((prev) => [
                      ...prev,
                      { col: activeDrillCol, val: branchLabel },
                    ]);
                  }
                  onCategorySelect?.(branchLabel);
                }}
                className="w-full text-left rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 hover:border-[var(--accent)] p-2.5 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[var(--text-primary)] truncate">
                    {activeDrillCol}: {branchLabel}
                  </span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {fmtCompact(branchVal)} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length],
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // B5: GANTT TIME PLAN VISUAL
  if (visualType === 'gantt') {
    const tasks = chartData.slice(0, 10).map((d, idx) => {
      const progress =
        d.progressPct !== undefined
          ? Math.min(100, Math.max(0, d.progressPct))
          : Math.min(100, Math.round(35 + ((idx * 17) % 65)));
      const startOffsetPct = Math.min(65, idx * 8);
      const durationPct = Math.max(18, Math.min(100 - startOffsetPct, 25 + ((idx * 11) % 35)));
      const isMilestone =
        idx === chartData.length - 1 || /milestone|launch|audit|release/i.test(d.category);
      return {
        name: d.category,
        group: d.group || 'Core Workstream',
        startLabel: d.startDate || `W${idx + 1}`,
        endLabel: d.endDate || `W${idx + 4}`,
        progress,
        startOffsetPct,
        durationPct,
        isMilestone,
        metricVal: d.displayValue,
      };
    });

    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
        data-testid="visual-gantt"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--accent)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {title || `Gantt Schedule & Milestone Plan (${categoryCol})`}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Task bars shaded by completion % • Diamonds mark critical milestones
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {tasks.map((t, idx) => (
            <div
              key={t.name}
              className="grid grid-cols-12 items-center gap-2 text-xs py-1 border-b border-[var(--border-subtle)]/60 last:border-none"
            >
              <div className="col-span-4 min-w-0">
                <div className="font-medium text-[var(--text-primary)] truncate" title={t.name}>
                  {t.name}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] truncate">
                  {t.startLabel} → {t.endLabel} • {t.progress}% complete
                </div>
              </div>
              <div className="col-span-6 relative h-5 rounded bg-[var(--bg-elevated)] overflow-hidden">
                <div
                  className="absolute top-1 bottom-1 rounded"
                  style={{
                    left: `${t.startOffsetPct}%`,
                    width: `${t.durationPct}%`,
                    background: 'var(--chart-3)',
                    opacity: 0.35,
                  }}
                />
                <div
                  className="absolute top-1 bottom-1 rounded"
                  style={{
                    left: `${t.startOffsetPct}%`,
                    width: `${(t.durationPct * t.progress) / 100}%`,
                    background: CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length],
                  }}
                />
                {t.isMilestone && (
                  <span
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-[var(--warning)] border border-[var(--bg-card)]"
                    style={{ left: `calc(${t.startOffsetPct + t.durationPct}% - 6px)` }}
                    title="Milestone"
                  />
                )}
              </div>
              <div className="col-span-2 text-right font-mono text-[var(--text-primary)]">
                {fmtCompact(t.metricVal)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // B2: WATERFALL CHART
  if (visualType === 'waterfall') {
    let running = 0;
    const steps = chartData.slice(0, 8).map((d, idx) => {
      const prev = idx > 0 ? chartData[idx - 1].displayValue : 0;
      const delta = idx === 0 ? d.displayValue : d.displayValue - prev;
      running += delta;
      return {
        label: d.category,
        delta,
        runningTotal: running,
        isPositive: delta >= 0,
      };
    });
    const maxAbs = Math.max(
      ...steps.map((s) => Math.max(Math.abs(s.runningTotal), Math.abs(s.delta))),
      1
    );

    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
        data-testid="visual-waterfall"
      >
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {title || `Waterfall Bridge: ${metricCol} by ${categoryCol}`}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Sequential +/- variance steps bridging to final running total ({fmtCompact(running)})
          </p>
        </div>

        <div className="space-y-2">
          {steps.map((s, idx) => {
            const widthPct = Math.min(100, Math.max(6, (Math.abs(s.delta) / maxAbs) * 100));
            return (
              <div key={s.label} className="grid grid-cols-12 items-center gap-2 text-xs">
                <div className="col-span-3 truncate font-medium text-[var(--text-primary)]" title={s.label}>
                  {s.label}
                </div>
                <div className="col-span-6 h-5 rounded bg-[var(--bg-elevated)] relative overflow-hidden flex items-center px-1.5">
                  <div
                    className="h-3.5 rounded"
                    style={{
                      width: `${widthPct}%`,
                      background:
                        idx === 0
                          ? 'var(--chart-1)'
                          : s.isPositive
                          ? 'var(--success)'
                          : 'var(--danger)',
                    }}
                  />
                </div>
                <div className="col-span-3 text-right font-mono">
                  <span
                    style={{
                      color:
                        idx === 0
                          ? 'var(--text-primary)'
                          : s.isPositive
                          ? 'var(--success)'
                          : 'var(--danger)',
                    }}
                  >
                    {s.delta >= 0 ? '+' : ''}
                    {fmtCompact(s.delta)}
                  </span>{' '}
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    ({fmtCompact(s.runningTotal)})
                  </span>
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-12 items-center gap-2 text-xs pt-2 border-t border-[var(--border-subtle)] font-semibold">
            <div className="col-span-3 text-[var(--text-primary)]">Net Total</div>
            <div className="col-span-6 h-5 rounded bg-[var(--bg-elevated)] overflow-hidden flex items-center px-1.5">
              <div
                className="h-3.5 rounded bg-[var(--accent)]"
                style={{
                  width: `${Math.min(100, Math.max(12, (Math.abs(running) / maxAbs) * 100))}%`,
                }}
              />
            </div>
            <div className="col-span-3 text-right font-mono text-[var(--text-primary)]">
              {fmtCompact(running)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // B3: FUNNEL VISUAL
  if (visualType === 'funnel') {
    const stages = [...chartData].sort((a, b) => b.displayValue - a.displayValue).slice(0, 7);
    const topVal = stages[0]?.displayValue || 1;

    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
        data-testid="visual-funnel"
      >
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {title || `Stage Conversion Funnel: ${metricCol}`}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Stage-to-stage conversion rate and cumulative retention from top stage
          </p>
        </div>

        <div className="space-y-2">
          {stages.map((st, idx) => {
            const widthPct = Math.max(14, Math.min(100, (st.displayValue / topVal) * 100));
            const prevVal = idx > 0 ? stages[idx - 1].displayValue : st.displayValue;
            const stepConvPct = prevVal > 0 ? (st.displayValue / prevVal) * 100 : 100;
            return (
              <div key={st.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-primary)] truncate">
                    {idx + 1}. {st.category}
                  </span>
                  <span className="font-mono text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">
                      {fmtCompact(st.displayValue)}
                    </strong>{' '}
                    ({idx === 0 ? '100% entry' : `${stepConvPct.toFixed(1)}% step conv.`})
                  </span>
                </div>
                <div className="w-full flex justify-center bg-[var(--bg-elevated)] rounded-lg p-1">
                  <div
                    className="h-5 rounded-md transition-all"
                    style={{
                      width: `${widthPct}%`,
                      background: CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // B3: TREEMAP / SANKEY
  if (visualType === 'treemap' || visualType === 'sankey') {
    const items = [...chartData].sort((a, b) => b.displayValue - a.displayValue).slice(0, 10);
    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
        data-testid={`visual-${visualType}`}
      >
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {title ||
              (visualType === 'sankey'
                ? `Sankey Flow: ${categoryCol} → ${groupCol || metricCol}`
                : `Treemap Composition: ${metricCol} by ${categoryCol}`)}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Proportional area tiles coloured by Theme Studio tokens (--chart-1..8)
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {items.map((item, idx) => {
            const sharePct = (item.displayValue / totalSum) * 100;
            return (
              <button
                key={item.category}
                type="button"
                onClick={() => onCategorySelect?.(item.category)}
                className="rounded-lg p-3 text-left border border-[var(--border-subtle)] transition-transform hover:scale-[1.01]"
                style={{
                  background: CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length],
                  gridColumn: idx === 0 ? 'span 2 / span 2' : undefined,
                }}
              >
                <div className="text-xs font-bold text-[var(--bg-surface)] truncate">
                  {item.category}
                </div>
                <div className="text-sm font-mono font-extrabold text-[var(--bg-surface)] mt-1">
                  {fmtCompact(item.displayValue)}
                </div>
                <div className="text-[11px] font-medium text-[var(--bg-surface)]/90">
                  {sharePct.toFixed(1)}% share
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // B4: BOX PLOT / DOT PLOT / HEATMAP
  if (visualType === 'box_plot' || visualType === 'dot_plot' || visualType === 'heatmap') {
    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
        data-testid={`visual-${visualType}`}
      >
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {title || `${visualType.replace('_', ' ').toUpperCase()}: ${metricCol} by ${categoryCol}`}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Quartiles: P25={fmtCompact(analyticsStats.p25)} • Median={fmtCompact(analyticsStats.median)} • P75={fmtCompact(analyticsStats.p75)} • Max={fmtCompact(analyticsStats.max)}
          </p>
        </div>
        <div className="space-y-2">
          {chartData.slice(0, 8).map((d, idx) => {
            const ratio = Math.min(
              100,
              Math.max(4, (d.displayValue / (analyticsStats.max || 1)) * 100)
            );
            return (
              <div key={d.category} className="grid grid-cols-12 items-center gap-2 text-xs">
                <div className="col-span-4 truncate font-medium text-[var(--text-primary)]">
                  {d.category}
                </div>
                <div className="col-span-6 h-4 rounded-full bg-[var(--bg-elevated)] relative">
                  <div
                    className="absolute top-0.5 bottom-0.5 rounded"
                    style={{
                      left: `${Math.max(0, ratio * 0.45)}%`,
                      width: `${Math.max(8, ratio * 0.45)}%`,
                      background: CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length],
                      opacity: 0.65,
                    }}
                  />
                  <span
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-card)]"
                    style={{
                      left: `calc(${ratio}% - 6px)`,
                      background: CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length],
                    }}
                  />
                </div>
                <div className="col-span-2 text-right font-mono text-[var(--text-primary)]">
                  {fmtCompact(d.displayValue)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // B7: GAUGE / BULLET / KPI VISUAL / SCORECARD
  if (
    visualType === 'gauge' ||
    visualType === 'bullet' ||
    visualType === 'kpi_visual' ||
    visualType === 'scorecard' ||
    visualType === 'card' ||
    visualType === 'multi_card'
  ) {
    const currentTotal = chartData.reduce((a, b) => a + b.displayValue, 0);
    const goal = targetValue || Math.round(currentTotal * 1.12) || 100;
    const attainmentPct = Math.min(150, Math.max(0, (currentTotal / goal) * 100));
    const statusColor =
      attainmentPct >= 95
        ? 'var(--success)'
        : attainmentPct >= 75
        ? 'var(--warning)'
        : 'var(--danger)';

    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col justify-between gap-3"
        data-testid={`visual-${visualType}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {title || `${metricCol} Target Attainment`}
            </h3>
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bg-elevated)]"
            style={{ color: statusColor }}
          >
            {attainmentPct.toFixed(1)}% of target
          </span>
        </div>

        {visualType === 'gauge' ? (
          <div className="flex items-center justify-around gap-4 py-2">
            <svg viewBox="0 0 160 95" className="w-40 h-24">
              <path
                d="M 16 80 A 64 64 0 0 1 144 80"
                fill="none"
                stroke="var(--bg-elevated)"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M 16 80 A 64 64 0 0 1 144 80"
                fill="none"
                stroke={statusColor}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${Math.min(201, (attainmentPct / 100) * 201)} 201`}
              />
              <line
                x1="80"
                y1="80"
                x2="122"
                y2="32"
                stroke="var(--text-primary)"
                strokeWidth="2.5"
              />
              <circle cx="80" cy="80" r="4.5" fill="var(--text-primary)" />
              <text
                x="80"
                y="68"
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize="14"
                fontWeight="700"
              >
                {fmtCompact(currentTotal)}
              </text>
            </svg>
            <div className="text-xs space-y-1">
              <div className="text-[var(--text-secondary)]">
                Actual:{' '}
                <strong className="text-[var(--text-primary)] font-mono">
                  {fmtCompact(currentTotal)}
                </strong>
              </div>
              <div className="text-[var(--text-secondary)]">
                Target:{' '}
                <strong className="text-[var(--text-primary)] font-mono">
                  {fmtCompact(goal)}
                </strong>
              </div>
              <div className="text-[var(--text-secondary)]">
                Status:{' '}
                <strong style={{ color: statusColor }}>
                  {attainmentPct >= 95
                    ? 'On Track'
                    : attainmentPct >= 75
                    ? 'At Risk'
                    : 'Behind Target'}
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                {fmtCompact(currentTotal)}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                Target:{' '}
                <strong className="text-[var(--text-primary)] font-mono">
                  {fmtCompact(goal)}
                </strong>
              </span>
            </div>
            <div className="relative h-5 rounded-md bg-[var(--bg-elevated)] overflow-hidden">
              <div
                className="h-full rounded-md transition-all"
                style={{
                  width: `${Math.min(100, attainmentPct)}%`,
                  background: statusColor,
                }}
              />
              <div
                className="absolute top-0 bottom-0 w-1 bg-[var(--text-primary)]"
                style={{ left: '88%' }}
                title={`Target: ${fmtCompact(goal)}`}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // B6 & D2: ENHANCED TABLE & STEPPED MATRIX WITH CONDITIONAL FORMATTING DATA BARS
  if (visualType === 'table_enhanced' || visualType === 'matrix') {
    const maxRowVal = Math.max(...chartData.map((d) => d.displayValue), 1);
    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
        data-testid={`visual-${visualType}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {title ||
                (visualType === 'matrix'
                  ? `Stepped Hierarchy Matrix: ${categoryCol}`
                  : `Conditional Formatting Table: ${categoryCol}`)}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Includes inline data bars, status icons, % share, and grand total row
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
              <tr>
                <th className="py-2 px-3">{categoryCol}</th>
                <th className="py-2 px-3 text-right">{calcResult.label}</th>
                <th className="py-2 px-3 w-36">Data Bar</th>
                <th className="py-2 px-3 text-right">% of Total</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {chartData.slice(0, 10).map((d) => {
                const pct = (d.displayValue / totalSum) * 100;
                const barW = Math.min(100, Math.max(4, (d.displayValue / maxRowVal) * 100));
                const isExpanded = Boolean(expandedMatrixRows[d.category]);
                const isAboveAvg = d.displayValue >= analyticsStats.mean;

                return (
                  <React.Fragment key={d.category}>
                    <tr
                      onClick={() => {
                        if (visualType === 'matrix') {
                          setExpandedMatrixRows((prev) => ({
                            ...prev,
                            [d.category]: !prev[d.category],
                          }));
                        }
                        onCategorySelect?.(d.category);
                      }}
                      className="hover:bg-[var(--bg-elevated)] cursor-pointer"
                    >
                      <td className="py-2 px-3 font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                        {visualType === 'matrix' &&
                          (isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[var(--accent)]" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          ))}
                        <span className="truncate max-w-[180px]">{d.category}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[var(--text-primary)]">
                        {fmtCompact(d.displayValue)}
                      </td>
                      <td className="py-2 px-3">
                        <div className="w-full h-2.5 rounded bg-[var(--bg-elevated)] overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${barW}%`,
                              background: isAboveAvg ? 'var(--chart-1)' : 'var(--chart-4)',
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[var(--text-secondary)]">
                        {pct.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{
                            background: isAboveAvg ? 'var(--success)' : 'var(--warning)',
                          }}
                          title={isAboveAvg ? 'Above period mean' : 'Below period mean'}
                        />
                      </td>
                    </tr>
                    {visualType === 'matrix' && isExpanded && (
                      <tr className="bg-[var(--bg-elevated)]/40 text-[11px] text-[var(--text-secondary)]">
                        <td className="py-1.5 pl-8 pr-3">
                          ↳ Sub-segment average ({d.count} records)
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono">
                          {fmtCompact(d.displayValue / Math.max(1, d.count))}
                        </td>
                        <td className="py-1.5 px-3" colSpan={3}>
                          Drill-down detail for {d.category}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="bg-[var(--bg-elevated)] font-semibold text-[var(--text-primary)] border-t border-[var(--border-subtle)]">
              <tr>
                <td className="py-2 px-3">Grand Total ({chartData.length} groups)</td>
                <td className="py-2 px-3 text-right font-mono">{fmtCompact(totalSum)}</td>
                <td className="py-2 px-3" />
                <td className="py-2 px-3 text-right font-mono">100.0%</td>
                <td className="py-2 px-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // B9: Q&A VISUAL
  if (visualType === 'qa_visual') {
    const isTrendQ = /trend|over time|line|forecast/i.test(qaQuery);
    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
        data-testid="visual-qa"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <input
            type="text"
            value={qaQuery}
            onChange={(e) => setQaQuery(e.target.value)}
            placeholder={`Ask about ${metricCol} by ${categoryCol}...`}
            aria-label="Ask Data Q&A prompt"
            className="flex-1 min-w-[200px] text-xs px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
          />
        </div>
        <ChartStudioVisual
          visualType={isTrendQ ? 'line' : 'bar'}
          rows={rows}
          categoryCol={categoryCol}
          metricCol={metricCol}
          height={height - 60}
        />
      </div>
    );
  }

  // Pure SVG Chart Rendering for Compare (Bar, Column, Clustered, Stacked, Combo),
  // Trend (Line, Area, Ribbon), Part-to-Whole (Pie, Donut), and Relationship (Scatter, Bubble)
  const avgLabelLen =
    plottedPoints.reduce((acc, d) => acc + d.category.length, 0) /
    Math.max(1, plottedPoints.length);
  const useHorizontalBar =
    visualType === 'bar' || (visualType === 'column' && avgLabelLen > 15);

  const svgW = 660;
  const svgH = 260;
  const padL = useHorizontalBar ? 115 : 54;
  const padR = 24;
  const padT = 18;
  const padB = 38;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  return (
    <div
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col gap-3 relative"
      data-testid={`chart-studio-visual-${visualType}`}
    >
      {/* Header & Optional Visual Calc / Analytics Pane Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {title || `${calcResult.label} by ${categoryCol}`}
          </h3>
          {subtitle ? (
            <p className="text-xs text-[var(--text-secondary)] truncate">{subtitle}</p>
          ) : activeCalc !== 'none' ? (
            <p
              className="text-[11px] font-mono text-[var(--accent)] truncate"
              data-testid="visual-calc-formula"
            >
              fx: {calcResult.formulaText}
            </p>
          ) : null}
        </div>

        {showControls && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <select
              value={activeCalc}
              onChange={(e) => setLocalCalc(e.target.value as VisualCalculationType)}
              aria-label="Visual Calculation"
              data-testid="visual-calc-select"
              className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs"
            >
              <option value="none">Calc: Raw Value</option>
              <option value="running_total">Running Total</option>
              <option value="moving_average">3-Period Moving Avg</option>
              <option value="percent_of_total">% of Total</option>
              <option value="rank">Dense Rank</option>
              <option value="diff_from_prev">Δ vs Previous</option>
            </select>

            <button
              type="button"
              onClick={() =>
                setLocalAnalytics((prev) => ({ ...prev, showAverage: !prev.showAverage }))
              }
              className={`px-2 py-1 rounded-lg border text-xs ${
                localAnalytics.showAverage
                  ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
              }`}
            >
              Avg Line
            </button>
            <button
              type="button"
              onClick={() =>
                setLocalAnalytics((prev) => ({ ...prev, showForecast: !prev.showForecast }))
              }
              className={`px-2 py-1 rounded-lg border text-xs ${
                localAnalytics.showForecast
                  ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
              }`}
            >
              Forecast
            </button>
          </div>
        )}
      </div>

      {/* Anomaly Callout Strip on Line/Area/Combo charts (Part B9 & D1) */}
      {(visualType === 'line' ||
        visualType === 'area' ||
        visualType === 'area_stacked' ||
        visualType === 'combo') &&
        localAnalytics.showAnomalies &&
        analyticsStats.anomalies.length > 0 && (
          <div
            className="rounded-lg border border-[var(--warning)]/50 bg-[var(--bg-elevated)] px-3 py-1.5 text-xs flex items-center gap-2"
            data-testid="chart-anomaly-callout"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
            <span className="text-[var(--text-primary)] truncate">
              <strong>Anomaly detected:</strong> {analyticsStats.anomalies[0].reason}
            </span>
          </div>
        )}

      {/* D3: Report Page Tooltip Mini-Card shown on hover */}
      {hoveredItem && (
        <div
          className="absolute top-12 right-4 z-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/95 backdrop-blur-md p-3 shadow-lg text-xs min-w-[205px] pointer-events-none"
          data-testid="report-page-tooltip"
        >
          <div className="font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1 mb-1.5 flex items-center justify-between gap-2">
            <span className="truncate">{hoveredItem.category}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
              {((hoveredItem.primaryVal / totalSum) * 100).toFixed(1)}% share
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[var(--text-secondary)]">{calcResult.label}:</span>
            <strong className="font-mono text-[var(--text-primary)]">
              {fmtCompact(hoveredItem.primaryVal)}
            </strong>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-secondary)]">
              vs Avg ({fmtCompact(analyticsStats.mean)})
            </span>
            <span
              className="font-semibold"
              style={{
                color:
                  hoveredItem.primaryVal >= analyticsStats.mean
                    ? 'var(--success)'
                    : 'var(--danger)',
              }}
            >
              {hoveredItem.primaryVal >= analyticsStats.mean ? '▲ Above' : '▼ Below'}
            </span>
          </div>
        </div>
      )}

      {/* Pure Responsive SVG Canvas */}
      <div className="w-full overflow-hidden" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-full select-none"
          role="img"
          aria-label={title || `${calcResult.label} by ${categoryCol}`}
        >
          {/* PIE / DONUT CHART */}
          {visualType === 'pie' || visualType === 'donut' ? (
            <g transform={`translate(${svgW / 2}, ${svgH / 2})`}>
              {(() => {
                let startAngle = -Math.PI / 2;
                const outerR = Math.min(svgW, svgH) * 0.38;
                const innerR = visualType === 'donut' ? outerR * 0.56 : 0;
                return plottedPoints.slice(0, 8).map((pt, idx) => {
                  const val = Math.max(0, pt.displayValue);
                  const angle = (val / totalSum) * Math.PI * 2;
                  const endAngle = startAngle + angle;
                  const x1 = Math.cos(startAngle) * outerR;
                  const y1 = Math.sin(startAngle) * outerR;
                  const x2 = Math.cos(endAngle) * outerR;
                  const y2 = Math.sin(endAngle) * outerR;
                  const ix1 = Math.cos(endAngle) * innerR;
                  const iy1 = Math.sin(endAngle) * innerR;
                  const ix2 = Math.cos(startAngle) * innerR;
                  const iy2 = Math.sin(startAngle) * innerR;
                  const largeArc = angle > Math.PI ? 1 : 0;
                  const d =
                    innerR > 0
                      ? `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`
                      : `M 0 0 L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  startAngle = endAngle;
                  const color = CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length];
                  return (
                    <path
                      key={pt.category}
                      d={d}
                      fill={color}
                      stroke="var(--bg-card)"
                      strokeWidth={1.5}
                      opacity={
                        !selectedCategory || selectedCategory === pt.category ? 0.92 : 0.35
                      }
                      onClick={() => onCategorySelect?.(pt.category)}
                      onMouseEnter={() =>
                        setHoveredItem({
                          category: pt.category,
                          primaryVal: pt.displayValue,
                          color,
                        })
                      }
                      onMouseLeave={() => setHoveredItem(null)}
                      className="cursor-pointer transition-opacity"
                    />
                  );
                });
              })()}
              {visualType === 'donut' && (
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize={13}
                  fontWeight={700}
                >
                  {fmtCompact(totalSum)}
                </text>
              )}
            </g>
          ) : visualType === 'scatter' || visualType === 'bubble' ? (
            /* SCATTER / BUBBLE CHART */
            <g>
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const y = padT + plotH * (1 - t);
                return (
                  <g key={t}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={padL + plotW}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      fill="var(--text-secondary)"
                      fontSize={10}
                    >
                      {fmtCompact(maxPlottedVal * t)}
                    </text>
                  </g>
                );
              })}
              {plottedPoints.map((pt, idx) => {
                const cx =
                  padL +
                  ((idx + 0.5) / Math.max(1, plottedPoints.length)) * plotW;
                const cy =
                  padT +
                  plotH -
                  Math.min(1, Math.max(0, pt.displayValue / maxPlottedVal)) * plotH;
                const r =
                  visualType === 'bubble'
                    ? Math.max(6, Math.min(20, 6 + (idx % 5) * 3))
                    : 6;
                const color = CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length];
                return (
                  <circle
                    key={pt.category}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={color}
                    fillOpacity={0.82}
                    stroke="var(--bg-card)"
                    strokeWidth={1.5}
                    onClick={() => onCategorySelect?.(pt.category)}
                    onMouseEnter={() =>
                      setHoveredItem({
                        category: pt.category,
                        primaryVal: pt.displayValue,
                        color,
                      })
                    }
                    onMouseLeave={() => setHoveredItem(null)}
                    className="cursor-pointer"
                  />
                );
              })}
            </g>
          ) : useHorizontalBar ? (
            /* HORIZONTAL BAR CHART */
            <g>
              {plottedPoints.slice(0, 8).map((pt, idx) => {
                const rowCount = Math.min(8, plottedPoints.length);
                const rowH = plotH / Math.max(1, rowCount);
                const y = padT + idx * rowH + rowH * 0.18;
                const barH = Math.max(8, rowH * 0.64);
                const barW = Math.max(
                  4,
                  Math.min(1, Math.max(0, pt.displayValue / maxPlottedVal)) * plotW
                );
                const color = CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length];
                return (
                  <g
                    key={pt.category}
                    onClick={() => onCategorySelect?.(pt.category)}
                    onMouseEnter={() =>
                      setHoveredItem({
                        category: pt.category,
                        primaryVal: pt.displayValue,
                        color,
                      })
                    }
                    onMouseLeave={() => setHoveredItem(null)}
                    className="cursor-pointer"
                  >
                    <text
                      x={padL - 8}
                      y={y + barH / 2 + 3.5}
                      textAnchor="end"
                      fill="var(--text-secondary)"
                      fontSize={10.5}
                    >
                      {pt.category.slice(0, 14)}
                    </text>
                    <rect
                      x={padL}
                      y={y}
                      width={barW}
                      height={barH}
                      rx={4}
                      fill={color}
                      opacity={
                        !selectedCategory || selectedCategory === pt.category ? 0.92 : 0.35
                      }
                    />
                    <text
                      x={padL + barW + 6}
                      y={y + barH / 2 + 3.5}
                      fill="var(--text-primary)"
                      fontSize={10}
                      fontWeight={600}
                    >
                      {fmtCompact(pt.displayValue)}
                    </text>
                  </g>
                );
              })}
            </g>
          ) : (
            /* VERTICAL COLUMN / CLUSTERED / STACKED / COMBO / LINE / AREA CHART */
            <g>
              {/* Grid lines & Y Axis Ticks */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const y = padT + plotH * (1 - t);
                return (
                  <g key={t}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={padL + plotW}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padL - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fill="var(--text-secondary)"
                      fontSize={10}
                    >
                      {fmtCompact(maxPlottedVal * t)}
                    </text>
                  </g>
                );
              })}

              {/* D1 Analytics Pane Reference Line (Average) */}
              {localAnalytics.showAverage && (
                <g>
                  {(() => {
                    const avgY =
                      padT +
                      plotH -
                      Math.min(1, Math.max(0, analyticsStats.mean / maxPlottedVal)) *
                        plotH;
                    return (
                      <>
                        <line
                          x1={padL}
                          y1={avgY}
                          x2={padL + plotW}
                          y2={avgY}
                          stroke="var(--warning)"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                        />
                        <text
                          x={padL + plotW - 4}
                          y={avgY - 4}
                          textAnchor="end"
                          fill="var(--warning)"
                          fontSize={9.5}
                          fontWeight={600}
                        >
                          Avg: {fmtCompact(analyticsStats.mean)}
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

              {/* Bars for Column, Clustered, Stacked, Combo */}
              {(visualType === 'column' ||
                visualType === 'clustered_bar' ||
                visualType === 'stacked_bar' ||
                visualType === 'combo' ||
                visualType === 'histogram') &&
                plottedPoints.map((pt, idx) => {
                  const colStep = plotW / Math.max(1, plottedPoints.length);
                  const barW = Math.max(10, colStep * 0.56);
                  const x = padL + idx * colStep + (colStep - barW) / 2;
                  const h1 =
                    Math.min(1, Math.max(0, pt.displayValue / maxPlottedVal)) * plotH;
                  const y1 = padT + plotH - h1;
                  const color = CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length];
                  return (
                    <g
                      key={pt.category}
                      onClick={() => onCategorySelect?.(pt.category)}
                      onMouseEnter={() =>
                        setHoveredItem({
                          category: pt.category,
                          primaryVal: pt.displayValue,
                          color,
                        })
                      }
                      onMouseLeave={() => setHoveredItem(null)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={x}
                        y={y1}
                        width={visualType === 'clustered_bar' ? barW / 2 - 1 : barW}
                        height={Math.max(2, h1)}
                        rx={3}
                        fill={visualType === 'combo' ? 'var(--chart-1)' : color}
                        opacity={
                          !selectedCategory || selectedCategory === pt.category
                            ? 0.88
                            : 0.35
                        }
                      />
                      {visualType === 'clustered_bar' && (
                        <rect
                          x={x + barW / 2 + 1}
                          y={
                            padT +
                            plotH -
                            Math.min(1, Math.max(0, pt.secondaryValue / maxPlottedVal)) *
                              plotH
                          }
                          width={barW / 2 - 1}
                          height={Math.max(
                            2,
                            Math.min(1, Math.max(0, pt.secondaryValue / maxPlottedVal)) *
                              plotH
                          )}
                          rx={3}
                          fill="var(--chart-2)"
                        />
                      )}
                      <text
                        x={x + barW / 2}
                        y={padT + plotH + 16}
                        textAnchor="middle"
                        fill="var(--text-secondary)"
                        fontSize={10}
                      >
                        {pt.category.slice(0, 10)}
                      </text>
                    </g>
                  );
                })}

              {/* Area / Line / Combo Polyline */}
              {(visualType === 'line' ||
                visualType === 'area' ||
                visualType === 'area_stacked' ||
                visualType === 'area_100' ||
                visualType === 'ribbon' ||
                visualType === 'combo') &&
                (() => {
                  const coords = plottedPoints.map((pt, idx) => {
                    const colStep = plotW / Math.max(1, plottedPoints.length);
                    const x = padL + idx * colStep + colStep / 2;
                    const val =
                      visualType === 'combo' ? pt.secondaryValue : pt.displayValue;
                    const y =
                      padT +
                      plotH -
                      Math.min(1, Math.max(0, val / maxPlottedVal)) * plotH;
                    return { x, y, pt, val };
                  });

                  if (coords.length === 0) return null;
                  const linePath = coords
                    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
                    .join(' ');
                  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${
                    padT + plotH
                  } L ${coords[0].x} ${padT + plotH} Z`;

                  return (
                    <g>
                      {(visualType === 'area' ||
                        visualType === 'area_stacked' ||
                        visualType === 'area_100') && (
                        <path
                          d={areaPath}
                          fill="var(--chart-1)"
                          fillOpacity={0.28}
                        />
                      )}
                      <path
                        d={linePath}
                        fill="none"
                        stroke={
                          visualType === 'combo' ? 'var(--chart-2)' : 'var(--chart-1)'
                        }
                        strokeWidth={2.5}
                      />
                      {coords.map((c) => (
                        <g key={c.pt.category}>
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r={4}
                            fill={
                              visualType === 'combo'
                                ? 'var(--chart-2)'
                                : 'var(--chart-1)'
                            }
                            stroke="var(--bg-card)"
                            strokeWidth={1.5}
                            onClick={() => onCategorySelect?.(c.pt.category)}
                            onMouseEnter={() =>
                              setHoveredItem({
                                category: c.pt.category,
                                primaryVal: c.val,
                                color: 'var(--chart-1)',
                              })
                            }
                            onMouseLeave={() => setHoveredItem(null)}
                            className="cursor-pointer"
                          />
                          {visualType !== 'combo' && (
                            <text
                              x={c.x}
                              y={padT + plotH + 16}
                              textAnchor="middle"
                              fill="var(--text-secondary)"
                              fontSize={10}
                            >
                              {c.pt.category.slice(0, 9)}
                            </text>
                          )}
                        </g>
                      ))}
                    </g>
                  );
                })()}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default ChartStudioVisual;
