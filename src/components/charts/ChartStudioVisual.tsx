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
    svgX?: number;
    svgY?: number;
  } | null>(null);

  const activeCalc = visualCalc !== 'none' ? visualCalc : localCalc;

  // Part E4: Compact calm empty state (< 200px) when a needed column is missing — never a huge empty box
  if (missingColumnMessage || !rows || rows.length === 0 || (!categoryCol && !metricCol)) {
    return (
      <div
        className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3.5 flex items-center justify-between gap-3 max-h-[160px]"
        data-testid="missing-column-unlock-card"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <HelpCircle className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <div className="min-w-0">
            <h4
              className="text-xs font-semibold text-[var(--text-primary)] truncate"
              title={
                missingColumnMessage ||
                `Add column "${metricCol || categoryCol || 'metric'}" to unlock this`
              }
            >
              {missingColumnMessage ||
                `Add column "${metricCol || categoryCol || 'metric'}" to unlock this`}
            </h4>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              Map or upload this column in the Data Dictionary to populate this visual.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
          Optional column
        </span>
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

  // B9: KEY INFLUENCERS VISUAL (Filled with Observed Segment Breakdown when sample < 30 so zero empty space)
  if (visualType === 'key_influencers') {
    const influencers = computeKeyInfluencers(rows, metricCol);
    const observedSegments = [...chartData]
      .sort((a, b) => b.displayValue - a.displayValue)
      .slice(0, 4);
    const maxSegVal = Math.max(...observedSegments.map((s) => s.displayValue), 1);

    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col justify-between gap-3 h-full"
        data-testid="visual-key-influencers"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <h3
                className="text-sm font-semibold text-[var(--text-primary)] truncate"
                title={title || `Key Influencers Driving ${metricCol}`}
              >
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

        {influencers.insufficientSample ? (
          <div className="flex flex-col justify-between gap-2.5 flex-1">
            <div
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 px-3 py-2 text-xs space-y-1"
              data-testid="key-influencers-insufficient"
            >
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
                <span>
                  {influencers.insufficientReason ||
                    `Not enough data to find reliable drivers (${rows.length} rows)`}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                Statistical lift requires ≥30 rows (3+ segments with ≥5 rows). Observed segment contribution below:
              </p>
            </div>

            {/* Observed Segment Contribution Breakdown so the card never leaves an empty box */}
            <div
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/35 p-3 space-y-2 flex-1 flex flex-col justify-between"
              data-testid="key-influencers-observed-breakdown"
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                <span>Observed {categoryCol} contribution</span>
                <span>Share of {metricCol}</span>
              </div>
              <div className="space-y-2">
                {observedSegments.map((seg, idx) => {
                  const sharePct = (seg.displayValue / totalSum) * 100;
                  const segMean = seg.displayValue / Math.max(1, seg.count);
                  const vsBaseRatio =
                    influencers.baselineMean > 0
                      ? segMean / influencers.baselineMean
                      : 1;
                  return (
                    <div key={seg.category} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-medium text-[var(--text-primary)] truncate"
                          title={`${seg.category} (${seg.count} rows)`}
                        >
                          {seg.category}{' '}
                          <span className="text-[11px] text-[var(--text-secondary)]">
                            ({seg.count}r)
                          </span>
                        </span>
                        <span className="font-mono text-[var(--text-primary)] shrink-0">
                          {fmtCompact(seg.displayValue)} ({sharePct.toFixed(1)}% ·{' '}
                          {vsBaseRatio.toFixed(2)}x avg)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(8, (seg.displayValue / maxSegVal) * 100))}%`,
                            background:
                              CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
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
                      <span
                        className="font-semibold text-[var(--text-primary)] break-words"
                        title={`${d.column} = ${d.segmentValue}`}
                      >
                        {d.column} = {d.segmentValue}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded font-mono font-semibold bg-[var(--bg-elevated)] text-[var(--success)] shrink-0"
                        title={`${d.impactScore.toFixed(2)}x lift (${d.sampleCount} rows)`}
                      >
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
                      <span
                        className="font-semibold text-[var(--text-primary)] break-words"
                        title={`${d.column} = ${d.segmentValue}`}
                      >
                        {d.column} = {d.segmentValue}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded font-mono font-semibold bg-[var(--bg-elevated)] text-[var(--danger)] shrink-0"
                        title={`${d.impactScore.toFixed(2)}x (${d.sampleCount} rows)`}
                      >
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
        )}
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

  // B2: WATERFALL CHART (with Bridge Summary Strip so zero orphan empty space)
  if (visualType === 'waterfall') {
    let running = 0;
    const steps = chartData.slice(0, 8).map((d, idx) => {
      const prev = idx > 0 ? chartData[idx - 1].displayValue : 0;
      const delta = idx === 0 ? d.displayValue : d.displayValue - prev;
      running += delta;
      return {
        label: d.category,
        rawVal: d.displayValue,
        count: d.count,
        delta,
        runningTotal: running,
        isPositive: delta >= 0,
      };
    });
    const maxAbs = Math.max(
      ...steps.map((s) => Math.max(Math.abs(s.runningTotal), Math.abs(s.delta))),
      1
    );
    const waterfallTitle = title || `Waterfall Bridge: ${metricCol} by ${categoryCol}`;
    const sortedByVal = [...chartData].sort((a, b) => b.displayValue - a.displayValue);
    const topDriver = sortedByVal[0];
    const bottomDriver = sortedByVal[sortedByVal.length - 1] || topDriver;
    const spreadVal = (topDriver?.displayValue || 0) - (bottomDriver?.displayValue || 0);

    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col justify-between gap-3 h-full"
        data-testid="visual-waterfall"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3
              className="text-sm font-semibold text-[var(--text-primary)]"
              title={waterfallTitle}
            >
              {waterfallTitle}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Sequential variance bridge across {steps.length} segments • Portfolio total{' '}
              <strong className="font-mono text-[var(--text-primary)]">{fmtCompact(totalSum)}</strong>
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            Terminal: {fmtCompact(running)}
          </span>
        </div>

        <div className="space-y-2 py-1">
          {steps.map((s, idx) => {
            const widthPct = Math.min(100, Math.max(8, (Math.abs(s.delta) / maxAbs) * 100));
            const sharePct = (s.rawVal / totalSum) * 100;
            return (
              <div
                key={s.label}
                onClick={() => onCategorySelect?.(s.label)}
                className="grid grid-cols-12 items-center gap-2 text-xs rounded-lg p-1.5 hover:bg-[var(--bg-elevated)]/50 cursor-pointer transition-colors"
              >
                <div className="col-span-4 min-w-0">
                  <div
                    className="truncate font-medium text-[var(--text-primary)]"
                    title={s.label}
                  >
                    {s.label}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    {s.count} records • {sharePct.toFixed(1)}% share
                  </div>
                </div>
                <div className="col-span-5 h-5 rounded-md bg-[var(--bg-elevated)] relative overflow-hidden flex items-center px-1.5">
                  <div
                    className="h-3.5 rounded-sm"
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
                    className="font-semibold"
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
          <div className="grid grid-cols-12 items-center gap-2 text-xs pt-2 border-t border-[var(--border-subtle)] font-semibold px-1.5">
            <div className="col-span-4 text-[var(--text-primary)]" title="Net Bridge Total">
              Net Bridge Total
            </div>
            <div className="col-span-5 h-5 rounded-md bg-[var(--bg-elevated)] overflow-hidden flex items-center px-1.5">
              <div
                className="h-3.5 rounded-sm bg-[var(--accent)]"
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

        {/* 4-Metric Bridge Summary Strip so card height is balanced and rich */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)]/70 text-xs"
          data-testid="waterfall-bridge-summary"
        >
          <div className="rounded-lg bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] p-2">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Leading Segment
            </div>
            <div
              className="font-semibold text-[var(--text-primary)] truncate mt-0.5"
              title={topDriver?.category || 'N/A'}
            >
              {topDriver?.category || 'N/A'}
            </div>
            <div className="font-mono text-[11px] text-[var(--accent)]">
              {fmtCompact(topDriver?.displayValue || 0)}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] p-2">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Trailing Segment
            </div>
            <div
              className="font-semibold text-[var(--text-primary)] truncate mt-0.5"
              title={bottomDriver?.category || 'N/A'}
            >
              {bottomDriver?.category || 'N/A'}
            </div>
            <div className="font-mono text-[11px] text-[var(--text-secondary)]">
              {fmtCompact(bottomDriver?.displayValue || 0)}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] p-2">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Segment Spread
            </div>
            <div className="font-mono font-semibold text-[var(--text-primary)] mt-0.5">
              {fmtCompact(spreadVal)}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">Max minus Min</div>
          </div>
          <div className="rounded-lg bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] p-2">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Segment Mean
            </div>
            <div className="font-mono font-semibold text-[var(--text-primary)] mt-0.5">
              {fmtCompact(analyticsStats.mean)}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">
              Across {chartData.length} groups
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
    const funnelTitle = title || `Stage Conversion Funnel: ${metricCol}`;

    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col justify-between gap-3 h-full"
        data-testid="visual-funnel"
      >
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]" title={funnelTitle}>
            {funnelTitle}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Stage-to-stage conversion rate and cumulative retention from top stage
          </p>
        </div>

        <div className="space-y-2 flex-1 flex flex-col justify-around">
          {stages.map((st, idx) => {
            const widthPct = Math.max(14, Math.min(100, (st.displayValue / topVal) * 100));
            const prevVal = idx > 0 ? stages[idx - 1].displayValue : st.displayValue;
            const stepConvPct = prevVal > 0 ? (st.displayValue / prevVal) * 100 : 100;
            return (
              <div key={st.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className="font-medium text-[var(--text-primary)] truncate"
                    title={`${idx + 1}. ${st.category}`}
                  >
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
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3 h-full"
        data-testid={`visual-${visualType}`}
      >
        <div>
          <h3
            className="text-sm font-semibold text-[var(--text-primary)]"
            title={
              title ||
              (visualType === 'sankey'
                ? `Sankey Flow: ${categoryCol} → ${groupCol || metricCol}`
                : `Treemap Composition: ${metricCol} by ${categoryCol}`)
            }
          >
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
                <div
                  className="text-xs font-bold text-[var(--bg-surface)] truncate"
                  title={item.category}
                >
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
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3 h-full"
        data-testid={`visual-${visualType}`}
      >
        <div>
          <h3
            className="text-sm font-semibold text-[var(--text-primary)]"
            title={title || `${visualType.replace('_', ' ').toUpperCase()}: ${metricCol} by ${categoryCol}`}
          >
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
                <div
                  className="col-span-4 truncate font-medium text-[var(--text-primary)]"
                  title={d.category}
                >
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
    const gaugeTitle = title || `${metricCol} Target Attainment`;

    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col justify-between gap-3 h-full"
        data-testid={`visual-${visualType}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <Target className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
            <h3
              className="text-sm font-semibold text-[var(--text-primary)] leading-snug break-words"
              title={gaugeTitle}
            >
              {gaugeTitle}
            </h3>
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bg-elevated)] shrink-0"
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
    const tableTitle =
      title ||
      (visualType === 'matrix'
        ? `Stepped Hierarchy Matrix: ${categoryCol}`
        : `Conditional Formatting Table: ${categoryCol}`);
    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3 h-full"
        data-testid={`visual-${visualType}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]" title={tableTitle}>
              {tableTitle}
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
                        <span className="truncate max-w-[180px]" title={d.category}>
                          {d.category}
                        </span>
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
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3 h-full"
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
  const svgH = 264;
  const padL = useHorizontalBar ? 140 : 54;
  const padR = 26;
  const padT = 26;
  const padB = 42;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const chartTitleText = title || `${calcResult.label} by ${categoryCol}`;

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatAxisLabel = (raw: string, maxChars = 24): string => {
    const trimmed = String(raw ?? '').trim();
    // Clean YYYY-MM-DD or YYYY-MM dates to concise "Jan '25" so they are never cut as "2025-01-0"
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
    if (isoMatch) {
      const yr = isoMatch[1].slice(2);
      const moIdx = Number(isoMatch[2]) - 1;
      const moName = MONTH_NAMES[moIdx] || isoMatch[2];
      return `${moName} '${yr}`;
    }
    if (trimmed.length <= maxChars) return trimmed;
    return `${trimmed.slice(0, maxChars - 1)}…`;
  };

  return (
    <div
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col justify-between gap-3 relative h-full"
      data-testid={`chart-studio-visual-${visualType}`}
    >
      {/* Header & Optional Visual Calc / Analytics Pane Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3
            className="text-sm font-semibold text-[var(--text-primary)] break-words"
            title={chartTitleText}
          >
            {chartTitleText}
          </h3>
          {subtitle ? (
            <p className="text-xs text-[var(--text-secondary)] break-words" title={subtitle}>
              {subtitle}
            </p>
          ) : activeCalc !== 'none' ? (
            <p
              className="text-[11px] font-mono text-[var(--accent)] break-words"
              data-testid="visual-calc-formula"
              title={`fx: ${calcResult.formulaText}`}
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
              aria-label="Show as calculation"
              data-testid="visual-calc-select"
              className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs"
            >
              <option value="none">Show as: Standard Value</option>
              <option value="running_total">Show as: Running Total</option>
              <option value="moving_average">Show as: 3-Period Moving Avg</option>
              <option value="percent_of_total">Show as: % of Total</option>
              <option value="rank">Show as: Dense Rank</option>
              <option value="diff_from_prev">Show as: Δ vs Previous</option>
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
            title={`Anomaly detected: ${analyticsStats.anomalies[0].reason}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
            <span
              className="text-[var(--text-primary)] truncate"
              title={`Anomaly detected: ${analyticsStats.anomalies[0].reason}`}
            >
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
            <span className="truncate" title={hoveredItem.category}>{hoveredItem.category}</span>
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
      <div className="w-full overflow-hidden flex-1" style={{ minHeight: `${height}px` }}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-full select-none"
          role="img"
          aria-label={chartTitleText}
        >
          {/* Soft Gradient Fill Definitions reading semantic chart tokens */}
          <defs>
            {CHART_TOKEN_PALETTE.map((token, idx) => (
              <linearGradient
                key={`grad-${idx}`}
                id={`chart-bar-grad-${idx}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={token} stopOpacity={0.95} />
                <stop offset="100%" stopColor={token} stopOpacity={0.62} />
              </linearGradient>
            ))}
            <linearGradient id="chart-area-soft-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.38} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.03} />
            </linearGradient>
          </defs>

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
                    >
                      <title>{`${pt.category}: ${fmtCompact(pt.displayValue)}`}</title>
                    </path>
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
                        svgX: cx,
                        svgY: cy,
                      })
                    }
                    onMouseLeave={() => setHoveredItem(null)}
                    className="cursor-pointer"
                  >
                    <title>{`${pt.category}: ${fmtCompact(pt.displayValue)}`}</title>
                  </circle>
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
                const barH = Math.max(10, rowH * 0.64);
                const barW = Math.max(
                  6,
                  Math.min(1, Math.max(0, pt.displayValue / maxPlottedVal)) * (plotW - 44)
                );
                const color = CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length];
                const isPeak = idx === 0 && plottedPoints.length > 1;
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
                    <title>{`${pt.category}: ${fmtCompact(pt.displayValue)}`}</title>
                    <text
                      x={padL - 8}
                      y={y + barH / 2 + 3.5}
                      textAnchor="end"
                      fill="var(--text-secondary)"
                      fontSize={10.5}
                    >
                      <title>{pt.category}</title>
                      {formatAxisLabel(pt.category, 22)}
                    </text>
                    <rect
                      x={padL}
                      y={y}
                      width={barW}
                      height={barH}
                      rx={5}
                      fill={`url(#chart-bar-grad-${idx % CHART_TOKEN_PALETTE.length})`}
                      opacity={
                        !selectedCategory || selectedCategory === pt.category ? 0.94 : 0.35
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
                      {isPeak ? ' ★ Peak' : ''}
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
                      opacity={0.75}
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

              {/* Hover Crosshair Guide Line */}
              {hoveredItem?.svgX !== undefined && (
                <line
                  x1={hoveredItem.svgX}
                  y1={padT}
                  x2={hoveredItem.svgX}
                  y2={padT + plotH}
                  stroke="var(--accent)"
                  strokeWidth={1.2}
                  strokeDasharray="3 3"
                  opacity={0.85}
                  data-testid="chart-hover-crosshair"
                />
              )}

              {/* Target / Average Reference Line (Always visible on primary trend/combo/column charts) */}
              {(localAnalytics.showAverage ||
                visualType === 'combo' ||
                visualType === 'line' ||
                visualType === 'area' ||
                visualType === 'column') && (
                <g data-testid="chart-reference-line">
                  {(() => {
                    const refVal = targetValue || analyticsStats.mean;
                    const avgY =
                      padT +
                      plotH -
                      Math.min(1, Math.max(0, refVal / maxPlottedVal)) *
                        plotH;
                    return (
                      <>
                        <line
                          x1={padL}
                          y1={avgY}
                          x2={padL + plotW}
                          y2={avgY}
                          stroke="var(--warning)"
                          strokeWidth={1.3}
                          strokeDasharray="4 4"
                          opacity={0.85}
                        />
                        <text
                          x={padL + plotW - 4}
                          y={Math.max(padT + 10, avgY - 4)}
                          textAnchor="end"
                          fill="var(--warning)"
                          fontSize={9.5}
                          fontWeight={600}
                        >
                          {targetValue ? 'Target' : 'Avg'}: {fmtCompact(refVal)}
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
                  const barW = Math.max(12, Math.min(58, colStep * 0.54));
                  const x = padL + idx * colStep + (colStep - barW) / 2;
                  const h1 =
                    Math.min(1, Math.max(0, pt.displayValue / maxPlottedVal)) * plotH;
                  const y1 = padT + plotH - h1;
                  const color = CHART_TOKEN_PALETTE[idx % CHART_TOKEN_PALETTE.length];
                  const fillGrad =
                    visualType === 'combo'
                      ? 'url(#chart-bar-grad-0)'
                      : `url(#chart-bar-grad-${idx % CHART_TOKEN_PALETTE.length})`;
                  return (
                    <g
                      key={pt.category}
                      onClick={() => onCategorySelect?.(pt.category)}
                      onMouseEnter={() =>
                        setHoveredItem({
                          category: pt.category,
                          primaryVal: pt.displayValue,
                          color,
                          svgX: x + barW / 2,
                          svgY: y1,
                        })
                      }
                      onMouseLeave={() => setHoveredItem(null)}
                      className="cursor-pointer"
                    >
                      <title>{`${pt.category}: ${fmtCompact(pt.displayValue)}`}</title>
                      <rect
                        x={x}
                        y={y1}
                        width={visualType === 'clustered_bar' ? barW / 2 - 1 : barW}
                        height={Math.max(3, h1)}
                        rx={5}
                        fill={fillGrad}
                        opacity={
                          !selectedCategory || selectedCategory === pt.category
                            ? 0.94
                            : 0.35
                        }
                      />
                      {/* Direct value label above bar */}
                      {plottedPoints.length <= 8 && visualType !== 'combo' && (
                        <text
                          x={x + barW / 2}
                          y={Math.max(padT + 10, y1 - 5)}
                          textAnchor="middle"
                          fill="var(--text-primary)"
                          fontSize={9.5}
                          fontWeight={600}
                        >
                          {fmtCompact(pt.displayValue)}
                        </text>
                      )}
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
                            3,
                            Math.min(1, Math.max(0, pt.secondaryValue / maxPlottedVal)) *
                              plotH
                          )}
                          rx={5}
                          fill="url(#chart-bar-grad-1)"
                        />
                      )}
                      <text
                        x={x + barW / 2}
                        y={padT + plotH + 16}
                        textAnchor="middle"
                        fill="var(--text-secondary)"
                        fontSize={10}
                      >
                        <title>{pt.category}</title>
                        {formatAxisLabel(
                          pt.category,
                          plottedPoints.length <= 6 ? 24 : plottedPoints.length <= 8 ? 16 : 12
                        )}
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
                        visualType === 'area_100' ||
                        visualType === 'line') && (
                        <path
                          d={areaPath}
                          fill="url(#chart-area-soft-grad)"
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
                            r={4.2}
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
                                svgX: c.x,
                                svgY: c.y,
                              })
                            }
                            onMouseLeave={() => setHoveredItem(null)}
                            className="cursor-pointer"
                          >
                            <title>{`${c.pt.category}: ${fmtCompact(c.val)}`}</title>
                          </circle>
                          {visualType !== 'combo' && (
                            <text
                              x={c.x}
                              y={padT + plotH + 16}
                              textAnchor="middle"
                              fill="var(--text-secondary)"
                              fontSize={10}
                            >
                              <title>{c.pt.category}</title>
                              {formatAxisLabel(
                                c.pt.category,
                                plottedPoints.length <= 6 ? 24 : plottedPoints.length <= 8 ? 16 : 12
                              )}
                            </text>
                          )}
                        </g>
                      ))}
                    </g>
                  );
                })()}

              {/* Direct Peak (Max) and Low (Min) Callout Annotations */}
              {plottedPoints.length >= 2 &&
                (() => {
                  const colStep = plotW / Math.max(1, plottedPoints.length);
                  let peakIdx = 0;
                  let lowIdx = 0;
                  for (let i = 1; i < plottedPoints.length; i++) {
                    if (plottedPoints[i].displayValue > plottedPoints[peakIdx].displayValue) {
                      peakIdx = i;
                    }
                    if (plottedPoints[i].displayValue < plottedPoints[lowIdx].displayValue) {
                      lowIdx = i;
                    }
                  }
                  const peakPt = plottedPoints[peakIdx];
                  const lowPt = plottedPoints[lowIdx];
                  const peakX = Math.min(
                    padL + plotW - 55,
                    Math.max(padL + 55, padL + peakIdx * colStep + colStep / 2)
                  );
                  const peakY = Math.max(
                    padT + 11,
                    padT +
                      plotH -
                      Math.min(1, Math.max(0, peakPt.displayValue / maxPlottedVal)) * plotH -
                      8
                  );
                  const lowX = Math.min(
                    padL + plotW - 55,
                    Math.max(padL + 55, padL + lowIdx * colStep + colStep / 2)
                  );
                  const lowY = Math.max(
                    padT + 22,
                    padT +
                      plotH -
                      Math.min(1, Math.max(0, lowPt.displayValue / maxPlottedVal)) * plotH -
                      8
                  );

                  return (
                    <g className="pointer-events-none">
                      <text
                        x={peakX}
                        y={peakY}
                        textAnchor="middle"
                        fill="var(--text-primary)"
                        stroke="var(--bg-card)"
                        strokeWidth={3}
                        paintOrder="stroke"
                        fontSize={9.5}
                        fontWeight={700}
                        data-testid="chart-peak-annotation"
                      >
                        {`Peak: ${formatAxisLabel(peakPt.category, 14)}, ${fmtCompact(
                          peakPt.displayValue
                        )}`}
                      </text>
                      {lowIdx !== peakIdx && (
                        <text
                          x={lowX}
                          y={Math.abs(lowX - peakX) < 85 && Math.abs(lowY - peakY) < 14 ? lowY + 14 : lowY}
                          textAnchor="middle"
                          fill="var(--text-secondary)"
                          stroke="var(--bg-card)"
                          strokeWidth={3}
                          paintOrder="stroke"
                          fontSize={9}
                          fontWeight={600}
                          data-testid="chart-low-annotation"
                        >
                          {`Low: ${formatAxisLabel(lowPt.category, 14)}, ${fmtCompact(
                            lowPt.displayValue
                          )}`}
                        </text>
                      )}
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
