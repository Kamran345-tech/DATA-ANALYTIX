/**
 * CHART STUDIO ENGINE (Parts B, D1, D2, D4, D6, B9, B12)
 * Shared calculation & intelligence engine for Chart Studio and VIP Boardroom Dashboards:
 * - Visual Calculations (D4): running_total, moving_average, percent_of_total, rank, diff_from_prev
 * - Analytics Pane (D1): constant line, average, min, max, median, percentile, OLS forecast + confidence band, Z-score anomaly detection, error bars
 * - Key Influencers Engine (B9): ranks which columns/categories most influence a chosen numeric or yes/no target column
 * - Smart Narrative Generator (B9): auto-generates plain-language trends, takeaways, top/bottom, and anomaly callouts linked to real numbers
 * - "Choosing the right visual" Recommender (B12): recommends a visual from dataType, goal, audience, space with a 1-line reason and warns on bad choices
 * - Power BI Theme JSON Import & Export (D6): converts between Theme Studio tokens and Power BI Theme JSON
 */

import { ThemeStudioConfig } from '../utils/themeStudio';

export type ChartStudioVisualType =
  // B1 Compare
  | 'bar'
  | 'column'
  | 'clustered_bar'
  | 'stacked_bar'
  | 'combo'
  // B2 Trend
  | 'line'
  | 'area'
  | 'area_stacked'
  | 'area_100'
  | 'ribbon'
  | 'waterfall'
  // B3 Part-to-whole
  | 'pie'
  | 'donut'
  | 'treemap'
  | 'funnel'
  | 'sankey'
  // B4 Distribution & relationship
  | 'scatter'
  | 'bubble'
  | 'dot_plot'
  | 'box_plot'
  | 'histogram'
  | 'heatmap'
  // B5 Time plan
  | 'gantt'
  // B6 Tables
  | 'table_enhanced'
  | 'matrix'
  // B7 Cards & goals
  | 'card'
  | 'multi_card'
  | 'kpi_visual'
  | 'gauge'
  | 'bullet'
  | 'scorecard'
  // B8 Maps
  | 'map_choropleth'
  | 'map_bubble'
  | 'map_shape'
  // B9 AI visuals
  | 'decomposition_tree'
  | 'key_influencers'
  | 'smart_narrative'
  | 'qa_visual';

export type VisualCalculationType =
  | 'none'
  | 'running_total'
  | 'moving_average'
  | 'percent_of_total'
  | 'rank'
  | 'diff_from_prev';

export interface VisualCalculationResult<T = Record<string, any>> {
  rows: Array<T & { __calcValue: number; __calcFormatted: string; __rawValue: number }>;
  formulaText: string;
  label: string;
}

/**
 * D4: Visual Calculations (running total, moving average, percent of total, rank, difference from previous)
 */
export function applyVisualCalculation<T extends Record<string, any>>(
  rows: T[],
  valueKey: string,
  calcType: VisualCalculationType,
  windowSize = 3
): VisualCalculationResult<T> {
  const numericValues = rows.map((r) => {
    const v = Number(String(r[valueKey] ?? '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(v) ? v : 0;
  });

  const total = numericValues.reduce((acc, v) => acc + v, 0) || 1;

  // Pre-sort indices for rank
  const sortedIndices = numericValues
    .map((v, idx) => ({ v, idx }))
    .sort((a, b) => b.v - a.v);
  const rankMap = new Map<number, number>();
  sortedIndices.forEach((item, rankIdx) => {
    rankMap.set(item.idx, rankIdx + 1);
  });

  let running = 0;

  const outRows = rows.map((row, i) => {
    const raw = numericValues[i];
    let calc = raw;
    let formatted = raw.toLocaleString();

    if (calcType === 'running_total') {
      running += raw;
      calc = running;
      formatted = running.toLocaleString();
    } else if (calcType === 'moving_average') {
      const start = Math.max(0, i - windowSize + 1);
      const slice = numericValues.slice(start, i + 1);
      calc = slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
      formatted = calc.toFixed(2);
    } else if (calcType === 'percent_of_total') {
      calc = (raw / total) * 100;
      formatted = `${calc.toFixed(1)}%`;
    } else if (calcType === 'rank') {
      calc = rankMap.get(i) ?? i + 1;
      formatted = `#${calc}`;
    } else if (calcType === 'diff_from_prev') {
      const prev = i > 0 ? numericValues[i - 1] : raw;
      calc = raw - prev;
      formatted = `${calc >= 0 ? '+' : ''}${calc.toLocaleString()}`;
    }

    return {
      ...row,
      __rawValue: raw,
      __calcValue: Number(calc.toFixed(4)),
      __calcFormatted: formatted,
    };
  });

  const formulaMap: Record<VisualCalculationType, { label: string; formulaText: string }> = {
    none: {
      label: valueKey,
      formulaText: `SUM([${valueKey}])`,
    },
    running_total: {
      label: `Running Total of ${valueKey}`,
      formulaText: `RUNNINGSUM([${valueKey}], ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`,
    },
    moving_average: {
      label: `${windowSize}-Period Moving Avg of ${valueKey}`,
      formulaText: `MOVINGAVERAGE([${valueKey}], ${windowSize})`,
    },
    percent_of_total: {
      label: `% of Total ${valueKey}`,
      formulaText: `DIVIDE([${valueKey}], CALCULATE(SUM([${valueKey}]), ALLSELECTED())) * 100`,
    },
    rank: {
      label: `Rank of ${valueKey}`,
      formulaText: `RANKX(ALLSELECTED(), [${valueKey}], , DESC, Dense)`,
    },
    diff_from_prev: {
      label: `Δ vs Previous ${valueKey}`,
      formulaText: `[${valueKey}] - OFFSET(-1, [${valueKey}])`,
    },
  };

  return {
    rows: outRows,
    formulaText: formulaMap[calcType].formulaText,
    label: formulaMap[calcType].label,
  };
}

/**
 * D1: Analytics Pane Statistics, Forecast with Confidence Band, and Anomaly Detection
 */
export interface AnalyticsPaneSummary {
  mean: number;
  min: number;
  max: number;
  median: number;
  p25: number;
  p75: number;
  p90: number;
  stdDev: number;
  anomalies: Array<{
    index: number;
    label: string;
    value: number;
    zScore: number;
    direction: 'spike' | 'dip';
    reason: string;
  }>;
  forecastPoints: Array<{
    label: string;
    forecast: number;
    lowerBound: number;
    upperBound: number;
  }>;
}

export function computeAnalyticsPaneStats(
  points: Array<{ label: string; value: number }>,
  horizon = 3,
  anomalyZThreshold = 1.65
): AnalyticsPaneSummary {
  const vals = points.map((p) => (Number.isFinite(p.value) ? p.value : 0));
  const n = vals.length;
  if (n === 0) {
    return {
      mean: 0,
      min: 0,
      max: 0,
      median: 0,
      p25: 0,
      p75: 0,
      p90: 0,
      stdDev: 0,
      anomalies: [],
      forecastPoints: [],
    };
  }

  const sorted = [...vals].sort((a, b) => a - b);
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const min = sorted[0];
  const max = sorted[n - 1];

  const getPercentile = (p: number) => {
    const idx = Math.min(n - 1, Math.max(0, Math.floor(p * (n - 1))));
    return sorted[idx];
  };

  const median = getPercentile(0.5);
  const p25 = getPercentile(0.25);
  const p75 = getPercentile(0.75);
  const p90 = getPercentile(0.9);

  const variance = vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / Math.max(1, n - 1);
  const stdDev = Math.sqrt(variance);

  // Anomaly Detection (B9 & D1)
  const anomalies: AnalyticsPaneSummary['anomalies'] = [];
  if (stdDev > 0) {
    points.forEach((pt, idx) => {
      const z = (pt.value - mean) / stdDev;
      if (Math.abs(z) >= anomalyZThreshold) {
        const direction = z > 0 ? 'spike' : 'dip';
        const pctFromMean = mean !== 0 ? (((pt.value - mean) / Math.abs(mean)) * 100).toFixed(1) : '0.0';
        anomalies.push({
          index: idx,
          label: pt.label,
          value: pt.value,
          zScore: Number(z.toFixed(2)),
          direction,
          reason: `${direction === 'spike' ? 'Unusual spike' : 'Sharp dip'} at ${pt.label} (${pctFromMean}% vs period average, Z=${z.toFixed(2)}σ)`,
        });
      }
    });
  }

  // Linear Regression (OLS) Forecast with 95% confidence band
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += vals[i];
    sumXY += i * vals[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const forecastPoints: AnalyticsPaneSummary['forecastPoints'] = [];
  for (let h = 1; h <= horizon; h++) {
    const x = n - 1 + h;
    const pred = intercept + slope * x;
    const band = Math.max(Math.abs(pred) * 0.08, stdDev * 1.28 * Math.sqrt(h));
    forecastPoints.push({
      label: `Forecast +${h}`,
      forecast: Number(pred.toFixed(2)),
      lowerBound: Number((pred - band).toFixed(2)),
      upperBound: Number((pred + band).toFixed(2)),
    });
  }

  return {
    mean: Number(mean.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    median: Number(median.toFixed(2)),
    p25: Number(p25.toFixed(2)),
    p75: Number(p75.toFixed(2)),
    p90: Number(p90.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    anomalies,
    forecastPoints,
  };
}

/**
 * B9: KEY INFLUENCERS ENGINE
 * Determines which columns and category values most strongly influence a chosen numeric or binary/categorical target.
 */
export interface KeyInfluencerDriver {
  column: string;
  segmentValue: string;
  impactScore: number; // Lift ratio (e.g. 1.45x higher than baseline) or correlation R
  targetMeanInSegment: number;
  baselineMean: number;
  sampleCount: number;
  direction: 'increases' | 'decreases';
  plainLanguage: string;
}

export interface KeyInfluencersResult {
  targetColumn: string;
  baselineMean: number;
  topIncreasers: KeyInfluencerDriver[];
  topDecreasers: KeyInfluencerDriver[];
  allDrivers: KeyInfluencerDriver[];
  insufficientSample?: boolean;
  insufficientReason?: string;
}

export function computeKeyInfluencers(
  rows: Record<string, any>[],
  targetColumn: string,
  directionFilter: 'increases' | 'decreases' | 'all' = 'all'
): KeyInfluencersResult {
  if (!rows.length || !targetColumn) {
    return {
      targetColumn,
      baselineMean: 0,
      topIncreasers: [],
      topDecreasers: [],
      allDrivers: [],
      insufficientSample: true,
      insufficientReason: `Not enough data to find reliable drivers (${rows.length} rows)`,
    };
  }

  const parseTarget = (raw: unknown): number => {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
    const s = String(raw ?? '').trim().toLowerCase();
    if (['yes', 'true', 'won', 'closed-won', '1', 'active', 'retained', 'completed'].includes(s)) {
      return 1;
    }
    if (['no', 'false', 'lost', '0', 'churned', 'dropped'].includes(s)) {
      return 0;
    }
    const num = Number(s.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(num) ? num : 0;
  };

  const targetValues = rows.map((r) => parseTarget(r[targetColumn]));
  const baselineMean =
    targetValues.reduce((a, b) => a + b, 0) / Math.max(1, targetValues.length);

  if (rows.length < 30) {
    return {
      targetColumn,
      baselineMean: Number(baselineMean.toFixed(2)),
      topIncreasers: [],
      topDecreasers: [],
      allDrivers: [],
      insufficientSample: true,
      insufficientReason: `Not enough data to find reliable drivers (${rows.length} rows)`,
    };
  }

  const cols = Object.keys(rows[0]).filter(
    (c) => c !== targetColumn && !/^(id|uuid|row_id)$/i.test(c) && !/id$/i.test(c)
  );

  const drivers: KeyInfluencerDriver[] = [];
  const seenLiftSignatures = new Set<string>();
  let maxValidGroupsInAnyCol = 0;

  for (const col of cols) {
    // Check if column is categorical or numeric
    const rawVals = rows.map((r) => r[col]);
    const numericCount = rawVals.filter((v) => {
      const cleaned = String(v ?? '').replace(/[^0-9.-]/g, '');
      return cleaned.length > 0 && Number.isFinite(Number(cleaned));
    }).length;

    const isNumericCol = numericCount > rows.length * 0.75;

    if (isNumericCol) {
      // Bucket numeric explanatory column into 3 tertiles (Low, Mid, High)
      const numPairs = rows
        .map((r, idx) => ({
          x: Number(String(r[col] ?? '0').replace(/[^0-9.-]/g, '')),
          y: targetValues[idx],
        }))
        .filter((p) => Number.isFinite(p.x));

      if (numPairs.length >= 15) {
        const sortedX = [...numPairs].sort((a, b) => a.x - b.x);
        const cutoffLow = sortedX[Math.floor(sortedX.length * 0.33)].x;
        const cutoffHigh = sortedX[Math.floor(sortedX.length * 0.66)].x;
        const lowGroup = numPairs.filter((p) => p.x <= cutoffLow);
        const midGroup = numPairs.filter((p) => p.x > cutoffLow && p.x < cutoffHigh);
        const highGroup = numPairs.filter((p) => p.x >= cutoffHigh);
        const validBuckets = [lowGroup, midGroup, highGroup].filter((g) => g.length >= 5).length;
        maxValidGroupsInAnyCol = Math.max(maxValidGroupsInAnyCol, validBuckets);

        if (highGroup.length >= 5) {
          const segMean = highGroup.reduce((a, b) => a + b.y, 0) / highGroup.length;
          const lift = baselineMean !== 0 ? segMean / baselineMean : 1;
          const diffPct = baselineMean !== 0 ? ((segMean - baselineMean) / Math.abs(baselineMean)) * 100 : 0;
          const sig = `${Number(Math.abs(lift).toFixed(4))}:${Number(segMean.toFixed(2))}:${highGroup.length}`;
          if (Math.abs(diffPct) >= 3 && !seenLiftSignatures.has(sig)) {
            seenLiftSignatures.add(sig);
            const dir: 'increases' | 'decreases' = segMean >= baselineMean ? 'increases' : 'decreases';
            drivers.push({
              column: col,
              segmentValue: `>= ${cutoffHigh.toLocaleString()}`,
              impactScore: Number(Math.abs(lift).toFixed(2)),
              targetMeanInSegment: Number(segMean.toFixed(2)),
              baselineMean: Number(baselineMean.toFixed(2)),
              sampleCount: highGroup.length,
              direction: dir,
              plainLanguage: `When ${col} is ${cutoffHigh.toLocaleString()} or higher, average ${targetColumn} ${
                dir === 'increases' ? 'rises' : 'drops'
              } by ${Math.abs(diffPct).toFixed(1)}% (${lift.toFixed(2)}x vs baseline ${baselineMean.toFixed(1)}).`,
            });
          }
        }
      }
    } else {
      // Categorical column: evaluate each segment with >= 5 rows
      const groups = new Map<string, number[]>();
      rows.forEach((r, idx) => {
        const key = String(r[col] ?? '').trim();
        if (!key) return;
        const arr = groups.get(key) || [];
        arr.push(targetValues[idx]);
        groups.set(key, arr);
      });

      const validGroups = Array.from(groups.entries()).filter(([, arr]) => arr.length >= 5);
      maxValidGroupsInAnyCol = Math.max(maxValidGroupsInAnyCol, validGroups.length);

      if (validGroups.length < 3) continue;

      for (const [segVal, segTargets] of validGroups) {
        const segMean = segTargets.reduce((a, b) => a + b, 0) / segTargets.length;
        const lift = baselineMean !== 0 ? segMean / baselineMean : 1;
        const diffPct = baselineMean !== 0 ? ((segMean - baselineMean) / Math.abs(baselineMean)) * 100 : 0;
        const sig = `${Number(Math.abs(lift).toFixed(4))}:${Number(segMean.toFixed(2))}:${segTargets.length}`;
        if (Math.abs(diffPct) >= 2 && !seenLiftSignatures.has(sig)) {
          seenLiftSignatures.add(sig);
          const dir: 'increases' | 'decreases' = segMean >= baselineMean ? 'increases' : 'decreases';
          drivers.push({
            column: col,
            segmentValue: segVal,
            impactScore: Number(Math.abs(lift).toFixed(2)),
            targetMeanInSegment: Number(segMean.toFixed(2)),
            baselineMean: Number(baselineMean.toFixed(2)),
            sampleCount: segTargets.length,
            direction: dir,
            plainLanguage: `When ${col} is "${segVal}", ${targetColumn} averages ${segMean.toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })} (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}% vs overall average of ${baselineMean.toLocaleString(
              undefined,
              { maximumFractionDigits: 1 }
            )}).`,
          });
        }
      }
    }
  }

  if (maxValidGroupsInAnyCol < 3 || drivers.length === 0) {
    return {
      targetColumn,
      baselineMean: Number(baselineMean.toFixed(2)),
      topIncreasers: [],
      topDecreasers: [],
      allDrivers: [],
      insufficientSample: true,
      insufficientReason: `Not enough data to find reliable drivers (${rows.length} rows)`,
    };
  }

  const topIncreasers = drivers
    .filter((d) => d.direction === 'increases')
    .sort((a, b) => b.targetMeanInSegment - a.targetMeanInSegment)
    .slice(0, 6);

  const topDecreasers = drivers
    .filter((d) => d.direction === 'decreases')
    .sort((a, b) => a.targetMeanInSegment - b.targetMeanInSegment)
    .slice(0, 6);

  const allDrivers =
    directionFilter === 'increases'
      ? topIncreasers
      : directionFilter === 'decreases'
      ? topDecreasers
      : [...topIncreasers, ...topDecreasers].sort(
          (a, b) => Math.abs(b.targetMeanInSegment - b.baselineMean) - Math.abs(a.targetMeanInSegment - a.baselineMean)
        );

  return {
    targetColumn,
    baselineMean: Number(baselineMean.toFixed(2)),
    topIncreasers,
    topDecreasers,
    allDrivers,
    insufficientSample: false,
  };
}

/**
 * B9: SMART NARRATIVE GENERATOR
 * Auto-generates plain-language executive summary bullets with trends, top/bottom segments, and anomalies linked to chart numbers.
 */
export interface SmartNarrativeOutput {
  headline: string;
  bullets: string[];
  fiveLineSummary: string[];
  direction?: 'up' | 'down' | 'flat';
  trendDeltaPct?: number | null;
  statusLabel?: 'On track' | 'Watch' | 'Action needed' | null;
}

export function generateSmartNarrative(
  rows: Record<string, any>[],
  categoryCol: string,
  metricCol: string,
  packName = 'Executive',
  options?: {
    dateCol?: string;
    favorableDirection?: 'up' | 'down';
    targetValue?: number | null;
    attainmentPct?: number | null;
    statusLabel?: 'On track' | 'Watch' | 'Action needed' | null;
  }
): SmartNarrativeOutput {
  if (!rows.length || !metricCol) {
    return {
      headline: `${packName} dataset ready for analysis.`,
      bullets: ['Upload or map a metric column to generate automated narrative insights.'],
      fiveLineSummary: ['No rows available for narrative synthesis.'],
      direction: 'flat',
      trendDeltaPct: null,
      statusLabel: null,
    };
  }

  const points = rows.map((r, idx) => ({
    label: String(r[categoryCol] ?? `Row ${idx + 1}`),
    value: Number(String(r[metricCol] ?? '0').replace(/[^0-9.-]/g, '')) || 0,
  }));

  const total = points.reduce((acc, p) => acc + p.value, 0);
  const avg = total / points.length;

  // Detect or use provided dateCol so period-over-period change matches the KPI card's time series
  const resolvedDateCol =
    options?.dateCol ||
    (rows[0]
      ? Object.keys(rows[0]).find((c) => /date|month|period|quarter|year|week|day/i.test(c)) || ''
      : '');

  const byPeriod = new Map<string, number>();
  if (resolvedDateCol && rows[0] && resolvedDateCol in rows[0]) {
    for (const r of rows) {
      const pKey = String(r[resolvedDateCol] ?? '').trim();
      if (!pKey) continue;
      const v = Number(String(r[metricCol] ?? '0').replace(/[^0-9.-]/g, '')) || 0;
      byPeriod.set(pKey, (byPeriod.get(pKey) || 0) + v);
    }
  }

  const sortedPeriods = Array.from(byPeriod.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  let firstVal = points[0].value;
  let lastVal = points[points.length - 1].value;
  let prevVal = points.length >= 2 ? points[points.length - 2].value : firstVal;
  let firstLabel = points[0].label;
  let lastLabel = points[points.length - 1].label;
  let prevLabel = points.length >= 2 ? points[points.length - 2].label : firstLabel;
  let trendDeltaPct = 0;

  if (sortedPeriods.length >= 2) {
    firstLabel = sortedPeriods[0][0];
    firstVal = sortedPeriods[0][1];
    prevLabel = sortedPeriods[sortedPeriods.length - 2][0];
    prevVal = sortedPeriods[sortedPeriods.length - 2][1];
    lastLabel = sortedPeriods[sortedPeriods.length - 1][0];
    lastVal = sortedPeriods[sortedPeriods.length - 1][1];
    trendDeltaPct = prevVal !== 0 ? ((lastVal - prevVal) / Math.abs(prevVal)) * 100 : 0;
  } else {
    trendDeltaPct = firstVal !== 0 ? ((lastVal - firstVal) / Math.abs(firstVal)) * 100 : 0;
  }

  const absDelta = Math.abs(trendDeltaPct);
  const direction: 'up' | 'down' | 'flat' =
    absDelta < 0.5 ? 'flat' : trendDeltaPct > 0 ? 'up' : 'down';
  const goodDir = options?.favorableDirection || 'up';

  let resolvedStatus: 'On track' | 'Watch' | 'Action needed' | null =
    options?.statusLabel !== undefined ? options.statusLabel : null;

  if (resolvedStatus === null) {
    if (typeof options?.attainmentPct === 'number' && Number.isFinite(options.attainmentPct)) {
      resolvedStatus =
        options.attainmentPct >= 95
          ? 'On track'
          : options.attainmentPct >= 80
          ? 'Watch'
          : 'Action needed';
    } else if (absDelta >= 0.5) {
      const isFav = goodDir === 'up' ? trendDeltaPct >= 0.5 : trendDeltaPct <= -0.5;
      resolvedStatus = isFav ? 'On track' : 'Action needed';
    } else if (sortedPeriods.length >= 2 || points.length >= 2) {
      resolvedStatus = 'Watch';
    }
  }

  // Group by category for top/bottom contributor
  const byCategory = new Map<string, number>();
  for (const pt of points) {
    byCategory.set(pt.label, (byCategory.get(pt.label) || 0) + pt.value);
  }
  const sortedCats = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
  const topCat = sortedCats[0] || ['N/A', 0];
  const bottomCat = sortedCats[sortedCats.length - 1] || ['N/A', 0];
  const topSharePct = total !== 0 ? (topCat[1] / total) * 100 : 0;

  const stats = computeAnalyticsPaneStats(points);
  const topAnomaly = stats.anomalies[0];

  const fmt = (n: number) =>
    Math.abs(n) >= 1_000_000
      ? `${(n / 1_000_000).toFixed(2)}M`
      : Math.abs(n) >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : n.toFixed(1);

  const statusClause = resolvedStatus ? ` [${resolvedStatus}]` : '';
  const headline = `${packName}: ${metricCol} totaled ${fmt(total)} (${direction} ${absDelta.toFixed(
    1
  )}% vs prev period across ${points.length} records)${statusClause}, led by ${topCat[0]} (${topSharePct.toFixed(
    1
  )}% share).`;

  const fiveLineSummary = [
    `1. Headline Volume: Total ${metricCol} reached ${fmt(total)} with a record average of ${fmt(
      avg
    )} across ${points.length} observations${resolvedStatus ? ` (${resolvedStatus})` : ''}.`,
    `2. Trajectory: Period movement shifted ${direction} ${absDelta.toFixed(
      1
    )}% from ${fmt(prevVal)} (${prevLabel}) to ${fmt(lastVal)} (${lastLabel}).`,
    `3. Top Driver: ${topCat[0]} contributed ${fmt(topCat[1])} (${topSharePct.toFixed(
      1
    )}% of total ${metricCol}), outperforming the median (${fmt(stats.median)}).`,
    `4. Tail Exposure: ${bottomCat[0]} recorded the lowest contribution at ${fmt(
      bottomCat[1]
    )}, creating a ${fmt(topCat[1] - bottomCat[1])} spread below the leader.`,
    topAnomaly
      ? `5. Anomaly Alert & Forecast: ${topAnomaly.reason}; 3-period projection targets ${fmt(
          stats.forecastPoints[0]?.forecast ?? lastVal
        )}.`
      : `5. Stability & Forecast: Distribution remained within normal variance (σ=${fmt(
          stats.stdDev
        )}); next-period forecast projects ${fmt(stats.forecastPoints[0]?.forecast ?? lastVal)}.`,
  ];

  return {
    headline,
    bullets: fiveLineSummary,
    fiveLineSummary,
    direction,
    trendDeltaPct: Number(trendDeltaPct.toFixed(2)),
    statusLabel: resolvedStatus,
  };
}

/**
 * B12: "CHOOSING THE RIGHT VISUAL" HELPER
 * Recommends a chart from (dataType, goal, audience, space) with a 1-line reason
 * and warns about bad choices (e.g. pie with >= 8 slices, 3D charts, truncated bar axes).
 */
export interface VisualRecommendationInput {
  dataType: 'categorical' | 'numeric' | 'time' | 'geographic';
  goal: 'compare' | 'trend' | 'relationship' | 'progress' | 'composition';
  audience: 'executive' | 'analyst' | 'operations';
  space: 'small' | 'large';
  distinctCategories?: number;
  currentVisual?: ChartStudioVisualType;
  categoryLabelAvgLength?: number;
}

export interface VisualRecommendationOutput {
  recommendedVisual: ChartStudioVisualType;
  alternativeVisual: ChartStudioVisualType;
  oneLineReason: string;
  warnings: string[];
}

export function recommendRightVisual(
  input: VisualRecommendationInput
): VisualRecommendationOutput {
  const warnings: string[] = [];
  const distinct = input.distinctCategories ?? 6;
  const labelLen = input.categoryLabelAvgLength ?? 10;

  // Check for bad visual anti-patterns
  if (
    (input.currentVisual === 'pie' || input.currentVisual === 'donut') &&
    distinct > 7
  ) {
    warnings.push(
      `Pie/Donut chart with ${distinct} slices exceeds human angle perception (>7 slices). Use a Horizontal Bar or Treemap instead.`
    );
  }
  if (input.currentVisual === 'column' && labelLen > 14) {
    warnings.push(
      `Category labels average ${labelLen} characters and will tilt or truncate on a vertical Column chart. Use a Horizontal Bar chart.`
    );
  }
  if (
    input.dataType === 'time' &&
    (input.currentVisual === 'pie' || input.currentVisual === 'donut')
  ) {
    warnings.push(
      'Pie charts obscure chronological order for time-series data. Use a Line, Area, or Waterfall chart.'
    );
  }

  let recommendedVisual: ChartStudioVisualType = 'bar';
  let alternativeVisual: ChartStudioVisualType = 'column';
  let oneLineReason =
    'Horizontal bars keep long category labels readable and allow instant length comparison from a zero baseline.';

  if (input.dataType === 'geographic') {
    recommendedVisual = input.space === 'small' ? 'bar' : 'map_choropleth';
    alternativeVisual = 'map_bubble';
    oneLineReason =
      input.space === 'small'
        ? 'Compact space favors a ranked regional bar chart over a dense map canvas.'
        : 'Choropleth map reveals regional clustering and geographic disparities across territories.';
  } else if (input.goal === 'trend' || input.dataType === 'time') {
    if (input.audience === 'executive' && input.space === 'small') {
      recommendedVisual = 'line';
      alternativeVisual = 'kpi_visual';
      oneLineReason = 'Clean line trajectory with anomaly callouts shows momentum at a glance in tight spaces.';
    } else {
      recommendedVisual = 'line';
      alternativeVisual = 'waterfall';
      oneLineReason = 'Continuous line with forecast band best communicates velocity, seasonality, and inflection points.';
    }
  } else if (input.goal === 'progress') {
    recommendedVisual = input.space === 'small' ? 'bullet' : 'gauge';
    alternativeVisual = 'kpi_visual';
    oneLineReason =
      input.space === 'small'
        ? 'Bullet chart packs current value, target needle, and threshold bands into a compact horizontal strip.'
        : 'Radial gauge clearly frames attainment against board quota/SLA targets.';
  } else if (input.goal === 'composition') {
    if (distinct > 7) {
      recommendedVisual = 'treemap';
      alternativeVisual = 'bar';
      oneLineReason = `With ${distinct} categories, a Treemap or Ranked Bar avoids unreadable tiny pie wedges.`;
      if (!warnings.length) {
        warnings.push(
          `Avoid Pie charts for ${distinct} slices (>7 slices); Treemap preserves part-to-whole area accurately.`
        );
      }
    } else {
      recommendedVisual = 'donut';
      alternativeVisual = 'waterfall';
      oneLineReason = 'Donut chart displays part-to-whole share for <= 7 categories while showing the grand total in the center.';
    }
  } else if (input.goal === 'relationship') {
    recommendedVisual = input.audience === 'analyst' ? 'scatter' : 'key_influencers';
    alternativeVisual = 'heatmap';
    oneLineReason =
      input.audience === 'analyst'
        ? 'Scatter plot exposes correlation, clusters, and outliers between two continuous metrics.'
        : 'Key Influencers translates multi-variable drivers into ranked plain-language takeaways.';
  } else {
    // goal === 'compare'
    recommendedVisual = labelLen > 12 || distinct > 6 ? 'bar' : 'column';
    alternativeVisual = 'combo';
    oneLineReason =
      recommendedVisual === 'bar'
        ? 'Horizontal bars prevent label truncation and rank top-to-bottom contributors cleanly.'
        : 'Vertical columns compare discrete categories clearly from a strict zero axis.';
  }

  return {
    recommendedVisual,
    alternativeVisual,
    oneLineReason,
    warnings,
  };
}

/**
 * D6: POWER BI THEME JSON IMPORT & EXPORT
 * Supports standard Power BI theme schema: name, dataColors, background, foreground, tableAccent
 */
export interface PowerBiThemeJson {
  name: string;
  dataColors: string[];
  background: string;
  foreground: string;
  tableAccent: string;
  visualStyles?: Record<string, any>;
}

export function exportPowerBiThemeJson(
  theme: ThemeStudioConfig,
  computedTokens?: {
    chartColors: string[];
    background: string;
    foreground: string;
    accent: string;
  }
): PowerBiThemeJson {
  const defaultPalettes: Record<string, string[]> = {
    lime: ['#84cc16', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#3b82f6', '#f97316'],
    ocean: ['#0ea5e9', '#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#84cc16', '#a855f7', '#fb7185'],
    violet: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#84cc16', '#f43f5e'],
    sunset: ['#f97316', '#eab308', '#ec4899', '#06b6d4', '#8b5cf6', '#10b981', '#3b82f6', '#ef4444'],
    rose: ['#f43f5e', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#3b82f6', '#eab308', '#a855f7'],
    mono: ['#94a3b8', '#64748b', '#475569', '#cbd5e1', '#334155', '#1e293b', '#e2e8f0', '#0f172a'],
  };

  const colors =
    computedTokens?.chartColors && computedTokens.chartColors.length >= 6
      ? computedTokens.chartColors
      : defaultPalettes[theme.accentPreset] || defaultPalettes.lime;

  const isLight = theme.mode === 'light';

  return {
    name: `DATA-ANALYTIX ${theme.accentPreset.toUpperCase()} (${theme.mode})`,
    dataColors: colors,
    background: computedTokens?.background || (isLight ? '#f8fafc' : '#0b0f17'),
    foreground: computedTokens?.foreground || (isLight ? '#0f172a' : '#f8fafc'),
    tableAccent: computedTokens?.accent || colors[0],
  };
}

export function parsePowerBiThemeJson(jsonString: string): {
  valid: boolean;
  error?: string;
  name?: string;
  accentHex?: string;
  mode?: 'light' | 'dark';
  dataColors?: string[];
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Theme JSON must be a valid JSON object.' };
    }
    const dataColors = Array.isArray(parsed.dataColors)
      ? parsed.dataColors.filter((c: unknown) => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c))
      : [];

    const accentHex =
      (typeof parsed.tableAccent === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.tableAccent)
        ? parsed.tableAccent
        : dataColors[0]) || '#0ea5e9';

    let mode: 'light' | 'dark' | undefined;
    if (typeof parsed.background === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.background)) {
      const hex = parsed.background.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      mode = lum > 0.5 ? 'light' : 'dark';
    }

    return {
      valid: true,
      name: String(parsed.name || 'Imported Power BI Theme'),
      accentHex,
      mode,
      dataColors: dataColors.length > 0 ? dataColors : [accentHex],
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Invalid JSON syntax.',
    };
  }
}
