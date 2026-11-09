import { ColumnProfile, VisualConfig } from '../types';
import { loadFeatureFlags } from '../config/features';
import {
  CHART_GUIDE_MAP,
  CHART_GUIDE_RULES,
  ChartGuideId,
  ChartGuideRule,
  formatChartGuideReason,
  getChartGuideRule
} from '../config/chartGuide';

export interface ChartRecommendation {
  type: VisualConfig['type'];
  label: string;
  score: number; // 0 to 100
  badge: 'Best Fit' | 'Strong' | 'Alternative';
  isTopRecommendation: boolean;
  reason: string;
  dataSuitability: string;
  suggestedTitle: string;
  iconName: string;
}

export interface RecommendChartOptions {
  chartGuide?: boolean;
  secondaryCategoryColName?: string;
  secondaryValueColName?: string;
  goal?: 'compare' | 'time' | 'relationship' | 'distribution' | 'parts' | 'share' | 'grid' | 'spread';
}

export interface HistogramBin {
  binIndex: number;
  x0: number;
  x1: number;
  label: string;
  count: number;
  frequencyPct: number;
}

export interface HistogramSummary {
  bins: HistogramBin[];
  binCount: number;
  methodUsed: 'sturges' | 'freedman-diaconis';
  min: number;
  max: number;
  mean: number;
  median: number;
  totalCount: number;
  originalRowCount?: number;
  nullCount?: number;
  allEqual?: boolean;
  largeDataNotice?: string;
}

export interface StackedBarSegment {
  key: string;
  value: number;
  sharePct: number;
}

export interface StackedBarCategoryRow {
  category: string;
  total: number;
  segments: StackedBarSegment[];
}

export interface StackedBarSummary {
  categories: StackedBarCategoryRow[];
  seriesKeys: string[];
  grandTotal: number;
  cappedOtherCount: number;
  sampled?: boolean;
  originalRowCount?: number;
  sampledRowCount?: number;
  largeDataNotice?: string;
  hasNegativeValues?: boolean;
}

export const MAX_INTERACTIVE_ROWS = 5000;

/**
 * Safely parses a cell value into a finite number, returning null for null, undefined,
 * empty strings, booleans, NaN, or Infinity.
 */
export function parseNumericValue(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') {
    return null;
  }
  if (typeof raw === 'number') {
    return !isNaN(raw) && isFinite(raw) ? raw : null;
  }
  if (typeof raw === 'string') {
    const cleaned = raw.trim().replace(/[$,%\s]/g, '');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return !isNaN(parsed) && isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Formats numbers compactly (e.g., 1.2K, 3.4M, 2.1B, -450) without crashing on NaN/Infinity/huge values.
 */
export function formatCompactNumber(val: unknown): string {
  const num = typeof val === 'number' ? val : parseNumericValue(val);
  if (num === null || isNaN(num) || !isFinite(num)) return '0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e4) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  if (abs >= 1e3) return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(abs < 1 && abs > 0 ? 3 : 2).replace(/\.?0+$/, '');
}

/**
 * Truncates long category labels cleanly with an ellipsis so chart axes never overflow.
 */
export function truncateChartLabel(label: unknown, maxLen = 20): string {
  const str = String(label ?? 'Unassigned').trim() || 'Unassigned';
  if (str.length <= maxLen) return str;
  return `${str.slice(0, Math.max(1, maxLen - 1))}…`;
}

/**
 * Deterministically samples large datasets so interactive charts never block the main thread.
 */
export function sampleRowsForChart<T = Record<string, any>>(
  rows: T[],
  maxRows = MAX_INTERACTIVE_ROWS
): {
  rows: T[];
  sampled: boolean;
  originalCount: number;
  sampledCount: number;
  notice?: string;
} {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return { rows: [], sampled: false, originalCount: 0, sampledCount: 0 };
  }
  const originalCount = rows.length;
  if (originalCount <= maxRows) {
    return { rows, sampled: false, originalCount, sampledCount: originalCount };
  }
  const sampledRows: T[] = [];
  const step = originalCount / maxRows;
  for (let i = 0; i < maxRows; i++) {
    const idx = Math.min(originalCount - 1, Math.floor(i * step));
    sampledRows.push(rows[idx]);
  }
  return {
    rows: sampledRows,
    sampled: true,
    originalCount,
    sampledCount: sampledRows.length,
    notice: `Sampled ${sampledRows.length.toLocaleString()} of ${originalCount.toLocaleString()} rows to keep rendering responsive.`
  };
}

/**
 * Caps a sorted or unsorted list of category items to the top `maxCategories` (default 10)
 * and rolls up any remaining categories into an "Other" bucket.
 */
export function capCategoriesWithOther<T extends { category: string; value: number; count?: number; share?: number }>(
  items: T[],
  maxCategories = 10
): { items: T[]; hasOther: boolean; otherCount: number } {
  if (!items || items.length === 0) {
    return { items: [], hasOther: false, otherCount: 0 };
  }
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= maxCategories) {
    return { items: sorted, hasOther: false, otherCount: 0 };
  }

  const topItems = sorted.slice(0, maxCategories);
  const tailItems = sorted.slice(maxCategories);
  const otherValue = Math.round(tailItems.reduce((acc, it) => acc + (Number(it.value) || 0), 0) * 100) / 100;
  const otherRowCount = tailItems.reduce((acc, it) => acc + (Number(it.count) || 1), 0);
  const totalAbsValue = sorted.reduce((acc, it) => acc + Math.abs(Number(it.value) || 0), 0);
  const otherShare = totalAbsValue > 0 ? Math.round((Math.abs(otherValue) / totalAbsValue) * 1000) / 10 : 0;

  const otherEntry = {
    ...tailItems[0],
    category: 'Other',
    value: otherValue,
    count: otherRowCount,
    share: otherShare
  } as T;

  return {
    items: [...topItems, otherEntry],
    hasOther: true,
    otherCount: tailItems.length
  };
}

/**
 * Computes histogram bins using Sturges' rule or the Freedman-Diaconis rule.
 * Handles empty data, single row, nulls, all-equal values, negative values, huge numbers, and 10,000+ rows.
 */
export function computeHistogramBins(
  rows: Record<string, any>[],
  valueField: string,
  method: 'auto' | 'sturges' | 'freedman-diaconis' = 'auto'
): HistogramSummary {
  const originalRowCount = Array.isArray(rows) ? rows.length : 0;
  const sampleInfo = sampleRowsForChart(rows || [], MAX_INTERACTIVE_ROWS * 2);
  let nullCount = 0;
  const vals: number[] = [];

  sampleInfo.rows.forEach(r => {
    if (!r || typeof r !== 'object') {
      nullCount++;
      return;
    }
    const parsed = parseNumericValue(r[valueField]);
    if (parsed === null) {
      nullCount++;
    } else {
      vals.push(parsed);
    }
  });

  vals.sort((a, b) => a - b);

  if (vals.length === 0) {
    return {
      bins: [],
      binCount: 0,
      methodUsed: 'sturges',
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      totalCount: 0,
      originalRowCount,
      nullCount,
      allEqual: false
    };
  }

  const n = vals.length;
  const min = vals[0];
  const max = vals[n - 1];
  const allEqual = max === min;
  const sum = vals.reduce((a, b) => a + b, 0);
  const mean = Math.round((sum / n) * 100) / 100;

  const getPercentile = (p: number): number => {
    if (n === 1) return vals[0];
    const idx = (n - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const w = idx - lo;
    return vals[lo] * (1 - w) + vals[hi] * w;
  };

  const q1 = getPercentile(0.25);
  const median = Math.round(getPercentile(0.5) * 100) / 100;
  const q3 = getPercentile(0.75);
  const iqr = Math.max(0, q3 - q1);

  const sturgesCount = Math.max(1, Math.ceil(Math.log2(n) + 1));
  let fdCount = sturgesCount;
  let methodUsed: 'sturges' | 'freedman-diaconis' = 'sturges';

  if (method === 'freedman-diaconis' || (method === 'auto' && iqr > 0 && max > min && n >= 4)) {
    const binWidthFD = 2 * (iqr / Math.cbrt(n));
    if (binWidthFD > 0 && isFinite(binWidthFD)) {
      fdCount = Math.ceil((max - min) / binWidthFD);
      methodUsed = 'freedman-diaconis';
    }
  }

  const rawBinCount = method === 'sturges' ? sturgesCount : methodUsed === 'freedman-diaconis' ? fdCount : sturgesCount;
  const binCount = allEqual ? 1 : Math.min(20, Math.max(Math.min(5, n), rawBinCount));
  const span = allEqual ? 1 : max - min;
  const step = span / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, idx) => {
    const x0 = allEqual ? min : min + idx * step;
    const x1 = allEqual ? max : idx === binCount - 1 ? max : min + (idx + 1) * step;
    return {
      binIndex: idx,
      x0: Math.round(x0 * 100) / 100,
      x1: Math.round(x1 * 100) / 100,
      label: allEqual ? `${formatCompactNumber(min)}` : `${formatCompactNumber(x0)}–${formatCompactNumber(x1)}`,
      count: 0,
      frequencyPct: 0
    };
  });

  vals.forEach(v => {
    if (allEqual) {
      bins[0].count += 1;
      return;
    }
    const rawIdx = Math.floor(((v - min) / span) * binCount);
    const idx = Math.min(binCount - 1, Math.max(0, rawIdx));
    bins[idx].count += 1;
  });

  bins.forEach(b => {
    b.frequencyPct = Math.round((b.count / n) * 1000) / 10;
  });

  const largeDataNotice =
    originalRowCount > MAX_INTERACTIVE_ROWS
      ? sampleInfo.sampled
        ? `Binned ${n.toLocaleString()} sampled values from ${originalRowCount.toLocaleString()} total rows into ${binCount} intervals.`
        : `Binned ${n.toLocaleString()} values from ${originalRowCount.toLocaleString()} rows into ${binCount} intervals.`
      : undefined;

  return {
    bins,
    binCount,
    methodUsed,
    min,
    max,
    mean,
    median,
    totalCount: n,
    originalRowCount,
    nullCount,
    allEqual,
    largeDataNotice
  };
}

/**
 * Computes 2-category + 1-measure stacked bar data, capping primary categories to top 10 + "Other".
 */
export function computeStackedBarData(
  rows: Record<string, any>[],
  primaryCategoryField: string,
  secondaryCategoryField: string,
  valueField: string,
  aggregation: VisualConfig['aggregation'] = 'sum',
  maxCategories = 10
): StackedBarSummary {
  if (!rows || rows.length === 0 || !primaryCategoryField || !valueField) {
    return { categories: [], seriesKeys: [], grandTotal: 0, cappedOtherCount: 0 };
  }

  const sampleInfo = sampleRowsForChart(rows, MAX_INTERACTIVE_ROWS);
  const effectiveSecField = secondaryCategoryField || primaryCategoryField;
  const primaryMap = new Map<string, Map<string, { sum: number; count: number; min: number; max: number }>>();
  const seriesTotals = new Map<string, number>();
  let hasNegativeValues = false;

  sampleInfo.rows.forEach(r => {
    if (!r || typeof r !== 'object') return;
    const rawPrimary = r[primaryCategoryField];
    const pCat = rawPrimary === null || rawPrimary === undefined || String(rawPrimary).trim() === '' ? 'Unassigned' : String(rawPrimary).trim();
    const rawSec = r[effectiveSecField];
    const sCat = rawSec === null || rawSec === undefined || String(rawSec).trim() === '' ? 'Default' : String(rawSec).trim();
    const parsedVal = parseNumericValue(r[valueField]);
    if (parsedVal === null && aggregation !== 'count') return;
    const numericVal = parsedVal ?? 0;
    if (numericVal < 0) hasNegativeValues = true;

    if (!primaryMap.has(pCat)) primaryMap.set(pCat, new Map());
    const secMap = primaryMap.get(pCat)!;
    const cur = secMap.get(sCat) || { sum: 0, count: 0, min: numericVal, max: numericVal };
    cur.sum += numericVal;
    cur.count += 1;
    cur.min = Math.min(cur.min, numericVal);
    cur.max = Math.max(cur.max, numericVal);
    secMap.set(sCat, cur);

    seriesTotals.set(sCat, (seriesTotals.get(sCat) || 0) + Math.abs(numericVal));
  });

  if (primaryMap.size === 0) {
    return { categories: [], seriesKeys: [], grandTotal: 0, cappedOtherCount: 0 };
  }

  const sortedSeries = Array.from(seriesTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  const seriesKeys = sortedSeries.length > 6 ? [...sortedSeries.slice(0, 5), 'Other'] : sortedSeries;

  const computeCellVal = (stats?: { sum: number; count: number; min: number; max: number }) => {
    if (!stats || stats.count === 0) return 0;
    if (aggregation === 'avg') return stats.sum / stats.count;
    if (aggregation === 'count') return stats.count;
    if (aggregation === 'min') return stats.min;
    if (aggregation === 'max') return stats.max;
    return stats.sum;
  };

  const rawRowsBuilt: { category: string; total: number; absTotal: number; segMap: Map<string, number> }[] = [];
  primaryMap.forEach((secMap, pCat) => {
    const segMap = new Map<string, number>();
    seriesKeys.forEach(k => segMap.set(k, 0));

    secMap.forEach((stats, sCat) => {
      const v = computeCellVal(stats);
      const targetKey = seriesKeys.includes(sCat) ? sCat : 'Other';
      segMap.set(targetKey, (segMap.get(targetKey) || 0) + v);
    });

    let total = 0;
    let absTotal = 0;
    segMap.forEach(v => {
      total += v;
      absTotal += Math.abs(v);
    });

    rawRowsBuilt.push({ category: pCat, total, absTotal, segMap });
  });

  rawRowsBuilt.sort((a, b) => b.total - a.total);

  let cappedOtherCount = 0;
  let finalRowsBuilt = rawRowsBuilt;
  if (rawRowsBuilt.length > maxCategories) {
    const top = rawRowsBuilt.slice(0, maxCategories);
    const tail = rawRowsBuilt.slice(maxCategories);
    cappedOtherCount = tail.length;
    const otherSegMap = new Map<string, number>();
    seriesKeys.forEach(k => otherSegMap.set(k, 0));
    let otherTotal = 0;
    let otherAbsTotal = 0;
    tail.forEach(t => {
      otherTotal += t.total;
      otherAbsTotal += t.absTotal;
      t.segMap.forEach((v, k) => {
        otherSegMap.set(k, (otherSegMap.get(k) || 0) + v);
      });
    });
    finalRowsBuilt = [...top, { category: 'Other', total: otherTotal, absTotal: otherAbsTotal, segMap: otherSegMap }];
  }

  let grandTotal = 0;
  const categories: StackedBarCategoryRow[] = finalRowsBuilt.map(row => {
    const roundedTotal = Math.round(row.total * 100) / 100;
    grandTotal += roundedTotal;
    const denom = row.absTotal > 0 ? row.absTotal : Math.abs(row.total);
    const segments: StackedBarSegment[] = seriesKeys.map(k => {
      const rawVal = row.segMap.get(k) || 0;
      const val = Math.round(rawVal * 100) / 100;
      const sharePct = denom > 0 ? Math.round((Math.abs(rawVal) / denom) * 1000) / 10 : 0;
      return { key: k, value: val, sharePct };
    });
    return {
      category: row.category,
      total: roundedTotal,
      segments
    };
  });

  return {
    categories,
    seriesKeys,
    grandTotal: Math.round(grandTotal * 100) / 100,
    cappedOtherCount,
    sampled: sampleInfo.sampled,
    originalRowCount: sampleInfo.originalCount,
    sampledRowCount: sampleInfo.sampledCount,
    largeDataNotice: sampleInfo.notice,
    hasNegativeValues
  };
}

export interface BarChartItem {
  category: string;
  displayLabel: string;
  value: number;
  count: number;
  share: number;
}

export interface BarChartSummary {
  items: BarChartItem[];
  grandTotal: number;
  minVal: number;
  maxVal: number;
  hasNegativeValues: boolean;
  allEqual: boolean;
  hasOther: boolean;
  otherCount: number;
  totalCategories: number;
  sampled: boolean;
  originalRowCount: number;
  largeDataNotice?: string;
}

/**
 * Computes aggregated Bar Chart items with top-10 + "Other" capping, negative baseline support,
 * null filtering, and large-dataset sampling.
 */
export function computeBarChartData(
  rows: Record<string, any>[],
  categoryField: string,
  valueField: string,
  aggregation: VisualConfig['aggregation'] = 'sum',
  maxCategories = 10
): BarChartSummary {
  if (!rows || rows.length === 0 || !categoryField || !valueField) {
    return {
      items: [],
      grandTotal: 0,
      minVal: 0,
      maxVal: 0,
      hasNegativeValues: false,
      allEqual: false,
      hasOther: false,
      otherCount: 0,
      totalCategories: 0,
      sampled: false,
      originalRowCount: 0
    };
  }

  const sampleInfo = sampleRowsForChart(rows, MAX_INTERACTIVE_ROWS);
  const groupMap = new Map<string, { sum: number; count: number; min: number; max: number }>();

  sampleInfo.rows.forEach(r => {
    if (!r || typeof r !== 'object') return;
    const rawCat = r[categoryField];
    const cat = rawCat === null || rawCat === undefined || String(rawCat).trim() === '' ? 'Unassigned' : String(rawCat).trim();
    const parsedVal = parseNumericValue(r[valueField]);
    if (parsedVal === null && aggregation !== 'count') return;
    const val = parsedVal ?? 0;

    const cur = groupMap.get(cat) || { sum: 0, count: 0, min: val, max: val };
    cur.sum += val;
    cur.count += 1;
    cur.min = Math.min(cur.min, val);
    cur.max = Math.max(cur.max, val);
    groupMap.set(cat, cur);
  });

  if (groupMap.size === 0) {
    return {
      items: [],
      grandTotal: 0,
      minVal: 0,
      maxVal: 0,
      hasNegativeValues: false,
      allEqual: false,
      hasOther: false,
      otherCount: 0,
      totalCategories: 0,
      sampled: sampleInfo.sampled,
      originalRowCount: sampleInfo.originalCount,
      largeDataNotice: sampleInfo.notice
    };
  }

  let totalAbs = 0;
  let grandTotal = 0;
  const rawEntries: BarChartItem[] = Array.from(groupMap.entries()).map(([cat, stats]) => {
    let finalVal = stats.sum;
    if (aggregation === 'avg') finalVal = stats.count > 0 ? stats.sum / stats.count : 0;
    else if (aggregation === 'count') finalVal = stats.count;
    else if (aggregation === 'min') finalVal = stats.min;
    else if (aggregation === 'max') finalVal = stats.max;

    const rounded = Math.round(finalVal * 100) / 100;
    totalAbs += Math.abs(rounded);
    grandTotal += rounded;
    return {
      category: cat,
      displayLabel: truncateChartLabel(cat, 22),
      value: rounded,
      count: stats.count,
      share: 0
    };
  });

  rawEntries.forEach(e => {
    e.share = totalAbs > 0 ? Math.round((Math.abs(e.value) / totalAbs) * 1000) / 10 : 0;
  });

  const capped = capCategoriesWithOther(rawEntries, maxCategories);
  const items = capped.items.map(it => ({
    ...it,
    displayLabel: truncateChartLabel(it.category, 22)
  }));
  const vals = items.map(i => i.value);
  const minVal = vals.length > 0 ? Math.min(0, ...vals) : 0;
  const maxVal = vals.length > 0 ? Math.max(0, ...vals) : 0;
  const hasNegativeValues = vals.some(v => v < 0);
  const allEqual = vals.length > 1 && new Set(vals).size === 1;

  return {
    items,
    grandTotal: Math.round(grandTotal * 100) / 100,
    minVal,
    maxVal,
    hasNegativeValues,
    allEqual,
    hasOther: capped.hasOther,
    otherCount: capped.otherCount,
    totalCategories: rawEntries.length,
    sampled: sampleInfo.sampled,
    originalRowCount: sampleInfo.originalCount,
    largeDataNotice: sampleInfo.notice
  };
}

export interface LineSeriesPoint {
  label: string;
  displayLabel: string;
  timestamp: number | null;
  value: number;
  count: number;
}

export interface LineSeriesSummary {
  points: LineSeriesPoint[];
  minVal: number;
  maxVal: number;
  meanVal: number;
  allEqual: boolean;
  hasNegativeValues: boolean;
  invalidDateCount: number;
  usedChronologicalSort: boolean;
  sampled: boolean;
  originalRowCount: number;
  notice?: string;
}

/**
 * Computes ordered Line Chart points. Parses dates safely, filters out invalid dates when a date
 * column is used, handles 1 point or all-equal values without NaN coordinates, and samples large data.
 */
export function computeLineSeriesData(
  rows: Record<string, any>[],
  dateOrCatField: string,
  valueField: string,
  aggregation: VisualConfig['aggregation'] = 'sum',
  maxPoints = 60
): LineSeriesSummary {
  if (!rows || rows.length === 0 || !dateOrCatField || !valueField) {
    return {
      points: [],
      minVal: 0,
      maxVal: 0,
      meanVal: 0,
      allEqual: false,
      hasNegativeValues: false,
      invalidDateCount: 0,
      usedChronologicalSort: false,
      sampled: false,
      originalRowCount: 0
    };
  }

  const sampleInfo = sampleRowsForChart(rows, MAX_INTERACTIVE_ROWS);
  const parseTimestamp = (raw: unknown): number | null => {
    if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') return null;
    if (raw instanceof Date) {
      const t = raw.getTime();
      return !isNaN(t) ? t : null;
    }
    const str = String(raw).trim();
    if (!str) return null;
    // Quarter format e.g. 2024-Q1 or Q1 2024
    const qMatch = str.match(/^(\d{4})[-/\s]?Q([1-4])$/i) || str.match(/^Q([1-4])[-/\s]?(\d{4})$/i);
    if (qMatch) {
      const yr = Number(qMatch[1].length === 4 ? qMatch[1] : qMatch[2]);
      const q = Number(qMatch[1].length === 1 ? qMatch[1] : qMatch[2]);
      return Date.UTC(yr, (q - 1) * 3, 1);
    }
    // Pure 4-digit year
    if (/^\d{4}$/.test(str)) {
      const yr = Number(str);
      if (yr >= 1900 && yr <= 2100) return Date.UTC(yr, 0, 1);
    }
    // Reject plain numbers that aren't dates
    if (/^-?\d+(\.\d+)?$/.test(str)) return null;
    const parsed = Date.parse(str);
    return !isNaN(parsed) ? parsed : null;
  };

  const bucketMap = new Map<string, { sum: number; count: number; min: number; max: number; timestamp: number | null }>();
  let validDateRows = 0;
  let nonEmptyCatRows = 0;

  sampleInfo.rows.forEach(r => {
    if (!r || typeof r !== 'object') return;
    const rawCat = r[dateOrCatField];
    if (rawCat === null || rawCat === undefined || String(rawCat).trim() === '') return;
    const parsedVal = parseNumericValue(r[valueField]);
    if (parsedVal === null && aggregation !== 'count') return;
    const val = parsedVal ?? 0;

    nonEmptyCatRows++;
    const label = String(rawCat).trim();
    const ts = parseTimestamp(rawCat);
    if (ts !== null) validDateRows++;

    const cur = bucketMap.get(label) || { sum: 0, count: 0, min: val, max: val, timestamp: ts };
    cur.sum += val;
    cur.count += 1;
    cur.min = Math.min(cur.min, val);
    cur.max = Math.max(cur.max, val);
    if (cur.timestamp === null && ts !== null) cur.timestamp = ts;
    bucketMap.set(label, cur);
  });

  // If the majority of rows have valid dates, treat as date series and drop invalid date buckets
  const isMajorityDate = validDateRows > 0 && validDateRows >= nonEmptyCatRows * 0.5;
  let invalidDateCount = 0;

  let entries: LineSeriesPoint[] = [];
  bucketMap.forEach((stats, label) => {
    if (isMajorityDate && stats.timestamp === null) {
      invalidDateCount += stats.count;
      return;
    }
    let v = stats.sum;
    if (aggregation === 'avg') v = stats.count > 0 ? stats.sum / stats.count : 0;
    else if (aggregation === 'count') v = stats.count;
    else if (aggregation === 'min') v = stats.min;
    else if (aggregation === 'max') v = stats.max;

    entries.push({
      label,
      displayLabel: truncateChartLabel(label, 16),
      timestamp: stats.timestamp,
      value: Math.round(v * 100) / 100,
      count: stats.count
    });
  });

  if (isMajorityDate) {
    entries.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }

  let sampledPoints = entries;
  if (entries.length > maxPoints) {
    const step = entries.length / maxPoints;
    sampledPoints = Array.from({ length: maxPoints }, (_, i) => entries[Math.min(entries.length - 1, Math.floor(i * step))]);
  }

  if (sampledPoints.length === 0) {
    return {
      points: [],
      minVal: 0,
      maxVal: 0,
      meanVal: 0,
      allEqual: false,
      hasNegativeValues: false,
      invalidDateCount,
      usedChronologicalSort: isMajorityDate,
      sampled: sampleInfo.sampled,
      originalRowCount: sampleInfo.originalCount
    };
  }

  const vals = sampledPoints.map(p => p.value);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const meanVal = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  const allEqual = maxVal === minVal;
  const hasNegativeValues = vals.some(v => v < 0);

  const notices: string[] = [];
  if (invalidDateCount > 0) {
    notices.push(`Skipped ${invalidDateCount} row${invalidDateCount === 1 ? '' : 's'} with invalid dates.`);
  }
  if (sampleInfo.notice) {
    notices.push(sampleInfo.notice);
  }

  return {
    points: sampledPoints,
    minVal,
    maxVal,
    meanVal,
    allEqual,
    hasNegativeValues,
    invalidDateCount,
    usedChronologicalSort: isMajorityDate,
    sampled: sampleInfo.sampled || entries.length > maxPoints,
    originalRowCount: sampleInfo.originalCount,
    notice: notices.length > 0 ? notices.join(' ') : undefined
  };
}

export interface ScatterPlotPoint {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface ScatterPlotSummary {
  points: ScatterPlotPoint[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  correlation: number;
  slope: number;
  intercept: number;
  totalValidCount: number;
  sampled: boolean;
  originalRowCount: number;
  notice?: string;
}

/**
 * Computes 2-measure Scatter Plot coordinates, linear trendline, and Pearson correlation r.
 * Safely handles all-equal X or Y values, negative numbers, huge numbers, and 10,000+ rows.
 */
export function computeScatterPlotData(
  rows: Record<string, any>[],
  xField: string,
  yField: string,
  labelField?: string,
  maxPoints = 500
): ScatterPlotSummary {
  if (!rows || rows.length === 0 || !xField || !yField) {
    return {
      points: [],
      xMin: 0,
      xMax: 1,
      yMin: 0,
      yMax: 1,
      correlation: 0,
      slope: 0,
      intercept: 0,
      totalValidCount: 0,
      sampled: false,
      originalRowCount: 0
    };
  }

  const originalRowCount = rows.length;
  const valid: ScatterPlotPoint[] = [];
  rows.forEach((r, idx) => {
    if (!r || typeof r !== 'object') return;
    const x = parseNumericValue(r[xField]);
    const y = parseNumericValue(r[yField]);
    if (x === null || y === null) return;
    const rawLbl = labelField ? r[labelField] : undefined;
    const label = rawLbl !== null && rawLbl !== undefined && String(rawLbl).trim() !== ''
      ? String(rawLbl).trim()
      : `Row ${idx + 1}`;
    valid.push({ id: `pt-${idx}`, label, x, y });
  });

  if (valid.length === 0) {
    return {
      points: [],
      xMin: 0,
      xMax: 1,
      yMin: 0,
      yMax: 1,
      correlation: 0,
      slope: 0,
      intercept: 0,
      totalValidCount: 0,
      sampled: false,
      originalRowCount
    };
  }

  const n = valid.length;
  let sumX = 0;
  let sumY = 0;
  let xMinRaw = valid[0].x;
  let xMaxRaw = valid[0].x;
  let yMinRaw = valid[0].y;
  let yMaxRaw = valid[0].y;

  for (let i = 0; i < n; i++) {
    const { x, y } = valid[i];
    sumX += x;
    sumY += y;
    if (x < xMinRaw) xMinRaw = x;
    if (x > xMaxRaw) xMaxRaw = x;
    if (y < yMinRaw) yMinRaw = y;
    if (y > yMaxRaw) yMaxRaw = y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = valid[i].x - meanX;
    const dy = valid[i].y - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const r = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
  const slope = denX > 0 ? num / denX : 0;
  const intercept = meanY - slope * meanX;

  const xSpan = xMaxRaw - xMinRaw;
  const ySpan = yMaxRaw - yMinRaw;
  const xPad = xSpan === 0 ? Math.max(1, Math.abs(xMinRaw) * 0.1) : xSpan * 0.06;
  const yPad = ySpan === 0 ? Math.max(1, Math.abs(yMinRaw) * 0.1) : ySpan * 0.06;

  const sampleResult = sampleRowsForChart(valid, maxPoints);

  return {
    points: sampleResult.rows,
    xMin: xMinRaw - xPad,
    xMax: xMaxRaw + xPad,
    yMin: yMinRaw - yPad,
    yMax: yMaxRaw + yPad,
    correlation: Math.round(r * 1000) / 1000,
    slope,
    intercept,
    totalValidCount: n,
    sampled: sampleResult.sampled,
    originalRowCount,
    notice: sampleResult.sampled
      ? `Sampled ${sampleResult.sampledCount.toLocaleString()} of ${n.toLocaleString()} points (Pearson r computed on full ${n.toLocaleString()} records).`
      : undefined
  };
}

export interface DonutSliceItem {
  category: string;
  displayLabel: string;
  value: number;
  absValue: number;
  sharePct: number;
  count: number;
}

export interface DonutChartSummary {
  slices: DonutSliceItem[];
  grandTotal: number;
  absTotal: number;
  hasNegativeValues: boolean;
  cappedOtherCount: number;
  sampled: boolean;
  originalRowCount: number;
  notice?: string;
}

/**
 * Computes Donut Chart slices (max 5 slices + "Other" if > 5), handling negative values and all-zero gracefully.
 */
export function computeDonutChartData(
  rows: Record<string, any>[],
  categoryField: string,
  valueField: string,
  aggregation: VisualConfig['aggregation'] = 'sum',
  maxSlices = 5
): DonutChartSummary {
  const barSummary = computeBarChartData(rows, categoryField, valueField, aggregation, maxSlices);
  if (barSummary.items.length === 0) {
    return {
      slices: [],
      grandTotal: 0,
      absTotal: 0,
      hasNegativeValues: false,
      cappedOtherCount: 0,
      sampled: barSummary.sampled,
      originalRowCount: barSummary.originalRowCount
    };
  }

  const absTotal = barSummary.items.reduce((acc, it) => acc + Math.abs(it.value), 0);
  const slices: DonutSliceItem[] = barSummary.items.map(it => ({
    category: it.category,
    displayLabel: truncateChartLabel(it.category, 18),
    value: it.value,
    absValue: Math.abs(it.value),
    sharePct: absTotal > 0 ? Math.round((Math.abs(it.value) / absTotal) * 1000) / 10 : 0,
    count: it.count
  }));

  const notices: string[] = [];
  if (barSummary.hasNegativeValues) {
    notices.push('Negative values detected; slice proportions reflect absolute magnitude.');
  }
  if (barSummary.largeDataNotice) {
    notices.push(barSummary.largeDataNotice);
  }

  return {
    slices,
    grandTotal: barSummary.grandTotal,
    absTotal: Math.round(absTotal * 100) / 100,
    hasNegativeValues: barSummary.hasNegativeValues,
    cappedOtherCount: barSummary.otherCount,
    sampled: barSummary.sampled,
    originalRowCount: barSummary.originalRowCount,
    notice: notices.length > 0 ? notices.join(' ') : undefined
  };
}

export interface HeatmapMatrixCell {
  rowKey: string;
  colKey: string;
  value: number;
  count: number;
  intensity: number; // 0 to 1
}

export interface HeatmapMatrixSummary {
  rowHeaders: string[];
  colHeaders: string[];
  cells: HeatmapMatrixCell[];
  cellMap: Record<string, Record<string, HeatmapMatrixCell>>;
  minVal: number;
  maxVal: number;
  allEqual: boolean;
  sampled: boolean;
  originalRowCount: number;
  notice?: string;
}

/**
 * Computes 2D Heatmap grid (rowField x colField -> aggregated valueField), with intensity 0..1.
 */
export function computeHeatmapMatrixData(
  rows: Record<string, any>[],
  rowField: string,
  colField: string,
  valueField: string,
  aggregation: VisualConfig['aggregation'] = 'sum',
  maxRowHeaders = 8,
  maxColHeaders = 8
): HeatmapMatrixSummary {
  if (!rows || rows.length === 0 || !rowField || !valueField) {
    return {
      rowHeaders: [],
      colHeaders: [],
      cells: [],
      cellMap: {},
      minVal: 0,
      maxVal: 0,
      allEqual: false,
      sampled: false,
      originalRowCount: 0
    };
  }

  const sampleInfo = sampleRowsForChart(rows, MAX_INTERACTIVE_ROWS);
  const effectiveColField = colField && colField !== rowField ? colField : '';
  const rowTotals = new Map<string, number>();
  const colTotals = new Map<string, number>();
  const rawGrid = new Map<string, Map<string, { sum: number; count: number; min: number; max: number }>>();

  sampleInfo.rows.forEach(r => {
    if (!r || typeof r !== 'object') return;
    const rawR = r[rowField];
    const rKey = rawR === null || rawR === undefined || String(rawR).trim() === '' ? 'Unassigned' : String(rawR).trim();
    const rawC = effectiveColField ? r[effectiveColField] : valueField;
    const cKey = rawC === null || rawC === undefined || String(rawC).trim() === '' ? 'All' : String(rawC).trim();
    const parsedVal = parseNumericValue(r[valueField]);
    if (parsedVal === null && aggregation !== 'count') return;
    const val = parsedVal ?? 0;

    rowTotals.set(rKey, (rowTotals.get(rKey) || 0) + Math.abs(val));
    colTotals.set(cKey, (colTotals.get(cKey) || 0) + Math.abs(val));

    if (!rawGrid.has(rKey)) rawGrid.set(rKey, new Map());
    const colMap = rawGrid.get(rKey)!;
    const cur = colMap.get(cKey) || { sum: 0, count: 0, min: val, max: val };
    cur.sum += val;
    cur.count += 1;
    cur.min = Math.min(cur.min, val);
    cur.max = Math.max(cur.max, val);
    colMap.set(cKey, cur);
  });

  if (rawGrid.size === 0) {
    return {
      rowHeaders: [],
      colHeaders: [],
      cells: [],
      cellMap: {},
      minVal: 0,
      maxVal: 0,
      allEqual: false,
      sampled: sampleInfo.sampled,
      originalRowCount: sampleInfo.originalCount,
      notice: sampleInfo.notice
    };
  }

  const rowHeaders = Array.from(rowTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxRowHeaders)
    .map(([k]) => k);
  const colHeaders = Array.from(colTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColHeaders)
    .map(([k]) => k);

  const cells: HeatmapMatrixCell[] = [];
  const cellMap: Record<string, Record<string, HeatmapMatrixCell>> = {};
  let minVal = Infinity;
  let maxVal = -Infinity;

  rowHeaders.forEach(rKey => {
    cellMap[rKey] = {};
    colHeaders.forEach(cKey => {
      const stats = rawGrid.get(rKey)?.get(cKey);
      let v = 0;
      const count = stats?.count || 0;
      if (stats && count > 0) {
        if (aggregation === 'avg') v = stats.sum / count;
        else if (aggregation === 'count') v = count;
        else if (aggregation === 'min') v = stats.min;
        else if (aggregation === 'max') v = stats.max;
        else v = stats.sum;
      }
      const rounded = Math.round(v * 100) / 100;
      if (count > 0) {
        if (rounded < minVal) minVal = rounded;
        if (rounded > maxVal) maxVal = rounded;
      }
      const cell: HeatmapMatrixCell = {
        rowKey: rKey,
        colKey: cKey,
        value: rounded,
        count,
        intensity: 0
      };
      cells.push(cell);
      cellMap[rKey][cKey] = cell;
    });
  });

  if (!isFinite(minVal)) minVal = 0;
  if (!isFinite(maxVal)) maxVal = 0;
  const allEqual = maxVal === minVal;
  const span = allEqual ? 1 : maxVal - minVal;

  cells.forEach(cell => {
    if (cell.count === 0) {
      cell.intensity = 0;
    } else if (allEqual) {
      cell.intensity = 0.7;
    } else {
      cell.intensity = Math.min(1, Math.max(0.18, (cell.value - minVal) / span));
    }
  });

  return {
    rowHeaders,
    colHeaders,
    cells,
    cellMap,
    minVal,
    maxVal,
    allEqual,
    sampled: sampleInfo.sampled,
    originalRowCount: sampleInfo.originalCount,
    notice: sampleInfo.notice
  };
}


function isDateColumnProfile(col?: ColumnProfile): boolean {
  if (!col || !col.name) return false;
  return (
    col.dataType === 'date' ||
    /date|time|year|month|quarter|period|day|week|dt|timestamp/i.test(col.name)
  );
}

function isCategoricalColumnProfile(col?: ColumnProfile): boolean {
  if (!col || !col.name) return false;
  if (isDateColumnProfile(col)) return false;
  return col.dataType === 'string' || col.dataType === 'boolean';
}

function isNumericColumnProfile(col?: ColumnProfile): boolean {
  if (!col || !col.name) return false;
  return col.dataType === 'number';
}

/**
 * Evaluates whether a specific chart from the 8-chart rule table fits the given field selection.
 * Used by both the recommendation engine and unit tests / UI mismatch warnings.
 */
export function evaluateChartRuleFit(
  chartId: ChartGuideId,
  params: {
    categoryCol?: ColumnProfile;
    secondaryCategoryCol?: ColumnProfile;
    valueCol?: ColumnProfile;
    secondaryValueCol?: ColumnProfile;
    columns?: ColumnProfile[];
    rows?: Record<string, any>[];
  }
): { fits: boolean; reason: string; mismatchWarning?: string; rule: ChartGuideRule } {
  const rule = CHART_GUIDE_MAP[chartId];
  const reason = formatChartGuideReason(rule);
  const { categoryCol, secondaryCategoryCol, valueCol, secondaryValueCol, columns = [], rows = [] } = params;

  const hasCat = Boolean(categoryCol && categoryCol.name);
  const isDate = isDateColumnProfile(categoryCol);
  const isCat = isCategoricalColumnProfile(categoryCol);
  const isCatNum = isNumericColumnProfile(categoryCol);
  const isValNum = isNumericColumnProfile(valueCol);
  const isSecValNum = isNumericColumnProfile(secondaryValueCol);
  const hasSecCat =
    Boolean(secondaryCategoryCol && secondaryCategoryCol.name) &&
    secondaryCategoryCol?.name !== categoryCol?.name &&
    (isCategoricalColumnProfile(secondaryCategoryCol) || isDateColumnProfile(secondaryCategoryCol));

  let distinctCount = categoryCol?.distinctCount || 0;
  if (!distinctCount && hasCat && rows.length > 0 && categoryCol) {
    distinctCount = new Set(rows.map(r => r[categoryCol.name]).filter(v => v !== null && v !== undefined)).size;
  }

  const numericColCount = columns.filter(c => c.dataType === 'number').length;

  switch (chartId) {
    case 'bar': {
      if (!isValNum) {
        return { fits: false, reason, mismatchWarning: 'Bar chart requires 1 numeric measure.', rule };
      }
      if (!hasCat || !isCat) {
        return { fits: false, reason, mismatchWarning: 'Bar chart fits 1 category + 1 measure.', rule };
      }
      return { fits: true, reason, rule };
    }

    case 'line': {
      if (!isValNum) {
        return { fits: false, reason, mismatchWarning: 'Line chart requires a numeric measure.', rule };
      }
      if (!hasCat || !isDate) {
        return { fits: false, reason, mismatchWarning: 'Line chart requires a date column + 1 measure.', rule };
      }
      return { fits: true, reason, rule };
    }

    case 'scatter': {
      const twoMeasuresSelected =
        (isValNum && isSecValNum && valueCol?.name !== secondaryValueCol?.name) ||
        (isCatNum && isValNum && categoryCol?.name !== valueCol?.name);
      const enoughNumericCols = numericColCount === 0 ? twoMeasuresSelected : numericColCount >= 2;
      if (!twoMeasuresSelected || !enoughNumericCols) {
        return {
          fits: false,
          reason,
          mismatchWarning: 'Scatter plot requires 2 numeric measures.',
          rule
        };
      }
      return { fits: true, reason, rule };
    }

    case 'histogram': {
      if (!isValNum) {
        return { fits: false, reason, mismatchWarning: 'Histogram requires 1 numeric column.', rule };
      }
      const isSingleNumeric =
        !hasCat || categoryCol?.name === valueCol?.name || (isCatNum && !secondaryValueCol);
      if (!isSingleNumeric) {
        return {
          fits: false,
          reason,
          mismatchWarning: 'Histogram fits 1 numeric column (without a separate category split).',
          rule
        };
      }
      return { fits: true, reason, rule };
    }

    case 'stacked_bar': {
      if (!isValNum) {
        return { fits: false, reason, mismatchWarning: 'Stacked bar requires 1 numeric measure.', rule };
      }
      if (!isCat || !hasSecCat || isDateColumnProfile(secondaryCategoryCol)) {
        return {
          fits: false,
          reason,
          mismatchWarning: 'Stacked bar requires 2 categories + 1 measure.',
          rule
        };
      }
      return { fits: true, reason, rule };
    }

    case 'donut': {
      if (!isValNum) {
        return { fits: false, reason, mismatchWarning: 'Donut chart requires 1 numeric measure.', rule };
      }
      if (!hasCat || !isCat || hasSecCat) {
        return { fits: false, reason, mismatchWarning: 'Donut chart fits 1 category (<= 5 values) + 1 measure.', rule };
      }
      if (distinctCount < 1 || distinctCount > 5) {
        return {
          fits: false,
          reason,
          mismatchWarning: `Donut chart works best with at most 5 slices (${distinctCount} found); use a Bar chart instead.`,
          rule
        };
      }
      return { fits: true, reason, rule };
    }

    case 'heatmap': {
      if (!isValNum) {
        return { fits: false, reason, mismatchWarning: 'Heatmap requires 1 numeric measure.', rule };
      }
      const firstIsGridDim = isCat || isDate;
      if (!firstIsGridDim || !hasSecCat) {
        return {
          fits: false,
          reason,
          mismatchWarning: 'Heatmap requires 2 categories/time buckets + 1 measure.',
          rule
        };
      }
      return { fits: true, reason, rule };
    }

    case 'boxplot': {
      if (!isValNum) {
        return { fits: false, reason, mismatchWarning: 'Box plot requires 1 numeric column.', rule };
      }
      if (!hasCat || !isCat || distinctCount < 2) {
        return {
          fits: false,
          reason,
          mismatchWarning: 'Box plot requires 1 category (at least 2 groups) + 1 numeric column.',
          rule
        };
      }
      return { fits: true, reason, rule };
    }
  }
}

export interface BoxplotGroupStat {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  iqr: number;
  outliers: number[];
  count: number;
}

/**
 * Computes Tukey 5-number summary (Min, Q1, Median, Q3, Max) and outliers for Boxplots.
 * Handles empty data, 1 row, nulls, all-equal values, negative values, huge numbers, and 10,000+ rows.
 */
export function computeBoxplotSummary(
  rows: Record<string, any>[],
  categoryField: string,
  valueField: string,
  maxGroups = 10
): BoxplotGroupStat[] {
  if (!rows || rows.length === 0) return [];

  const sampleInfo = sampleRowsForChart(rows, MAX_INTERACTIVE_ROWS);
  const groups = new Map<string, number[]>();

  sampleInfo.rows.forEach(r => {
    if (!r || typeof r !== 'object') return;
    const rawCat = r[categoryField];
    const cat = rawCat === null || rawCat === undefined || String(rawCat).trim() === '' ? 'Overall' : String(rawCat).trim();
    const val = parseNumericValue(r[valueField]);
    if (val !== null) {
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(val);
    }
  });

  if (groups.size === 0) return [];

  // If > maxGroups categories exist, keep top maxGroups by count and roll remaining into "Other"
  let finalGroups = groups;
  if (groups.size > maxGroups) {
    const sortedBySize = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
    finalGroups = new Map<string, number[]>();
    sortedBySize.slice(0, maxGroups).forEach(([k, v]) => finalGroups.set(k, v));
    const otherVals: number[] = [];
    sortedBySize.slice(maxGroups).forEach(([, v]) => otherVals.push(...v));
    if (otherVals.length > 0) {
      finalGroups.set('Other', otherVals);
    }
  }

  const results: BoxplotGroupStat[] = [];

  finalGroups.forEach((vals, category) => {
    if (vals.length === 0) return;
    vals.sort((a, b) => a - b);

    const count = vals.length;
    const sum = vals.reduce((acc, v) => acc + v, 0);
    const mean = Math.round((sum / count) * 100) / 100;

    const getPercentile = (p: number): number => {
      if (count === 1) return vals[0];
      const index = (count - 1) * p;
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return vals[lower] * (1 - weight) + vals[upper] * weight;
    };

    const q1 = Math.round(getPercentile(0.25) * 100) / 100;
    const median = Math.round(getPercentile(0.5) * 100) / 100;
    const q3 = Math.round(getPercentile(0.75) * 100) / 100;
    const rawIqr = Math.max(0, q3 - q1);
    const iqr = Math.round(rawIqr * 100) / 100;

    const lowerFence = q1 - 1.5 * rawIqr;
    const upperFence = q3 + 1.5 * rawIqr;

    // Normal values inside fences
    const insideFenceVals = rawIqr === 0 ? vals : vals.filter(v => v >= lowerFence && v <= upperFence);
    const min = insideFenceVals.length > 0 ? insideFenceVals[0] : vals[0];
    const max = insideFenceVals.length > 0 ? insideFenceVals[insideFenceVals.length - 1] : vals[vals.length - 1];

    // Outliers outside fences (cap rendered outliers at 25 per group for SVG performance)
    const outliers = rawIqr === 0 ? [] : vals.filter(v => v < lowerFence || v > upperFence).slice(0, 25);

    results.push({
      category,
      min,
      q1,
      median,
      q3,
      max,
      mean,
      iqr,
      outliers,
      count
    });
  });

  return results.sort((a, b) => {
    if (a.category === 'Other') return 1;
    if (b.category === 'Other') return -1;
    return b.median - a.median;
  });
}

/**
 * 8-Chart Rule Engine implementation (used when `chartGuide` feature flag is enabled)
 */
function recommendChartsWithGuideRules(
  categoryColName: string,
  valueColName: string,
  columns: ColumnProfile[],
  rows: Record<string, any>[],
  options?: RecommendChartOptions
): ChartRecommendation[] {
  const catCol = categoryColName
    ? columns.find(c => c.name === categoryColName)
    : undefined;
  const valCol = valueColName
    ? columns.find(c => c.name === valueColName)
    : undefined;
  const secCatCol = options?.secondaryCategoryColName
    ? columns.find(c => c.name === options.secondaryCategoryColName)
    : undefined;
  const secValCol = options?.secondaryValueColName
    ? columns.find(c => c.name === options.secondaryValueColName)
    : undefined;

  const evalParams = {
    categoryCol: catCol,
    secondaryCategoryCol: secCatCol,
    valueCol: valCol,
    secondaryValueCol: secValCol,
    columns,
    rows
  };

  // Guard rail: if the primary measure does not exist or is not numeric, return no charts
  if (!valCol || valCol.dataType !== 'number') {
    return [];
  }

  const candidates: {
    id: ChartGuideId;
    type: VisualConfig['type'];
    label: string;
    score: number;
    reason: string;
    suitability: string;
    icon: string;
  }[] = [];

  const distinctCount =
    catCol?.distinctCount ||
    (catCol && rows.length > 0
      ? new Set(rows.map(r => r[catCol.name]).filter(v => v !== null && v !== undefined)).size
      : 0);

  // Check each of the 8 rules in CHART_GUIDE_RULES
  for (const rule of CHART_GUIDE_RULES) {
    const fitResult = evaluateChartRuleFit(rule.id, evalParams);
    if (!fitResult.fits) continue;

    let score = 85;
    let icon = 'BarChart';

    switch (rule.id) {
      case 'histogram':
        score = !catCol || catCol.name === valCol.name ? 98 : 84;
        icon = 'BarChart';
        break;
      case 'scatter':
        score = 98;
        icon = 'ScatterPlot';
        break;
      case 'line':
        score = secCatCol ? 91 : 97;
        icon = 'LineChart';
        break;
      case 'stacked_bar':
        score = options?.goal === 'grid' ? 91 : 96;
        icon = 'BarChart';
        break;
      case 'heatmap':
        score = isDateColumnProfile(catCol) || isDateColumnProfile(secCatCol) || options?.goal === 'grid' ? 97 : 92;
        icon = 'Grid';
        break;
      case 'donut':
        // Prefer donut only when <= 5 categories
        score = distinctCount <= 5 ? 96 : 0;
        icon = 'PieChart';
        break;
      case 'bar':
        // When <= 5 categories, donut is 96 and bar is 91; when > 5 categories, bar is 96
        score = secCatCol ? 84 : distinctCount <= 5 ? 91 : 96;
        icon = 'BarChart';
        break;
      case 'boxplot':
        score = options?.goal === 'spread' ? 98 : distinctCount <= 5 ? 86 : 89;
        icon = 'Box';
        break;
    }

    if (score > 0) {
      candidates.push({
        id: rule.id,
        type: rule.visualType,
        label: rule.name,
        score,
        reason: fitResult.reason,
        suitability: `Fits: ${rule.fits}`,
        icon
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const catNameClean = (categoryColName || valueColName).replace(/([A-Z])/g, ' $1').trim();
  const valNameClean = valueColName.replace(/([A-Z])/g, ' $1').trim();

  return candidates.map((rec, index) => {
    let badge: 'Best Fit' | 'Strong' | 'Alternative' = 'Alternative';
    if (index === 0) badge = 'Best Fit';
    else if (index === 1 || index === 2) badge = 'Strong';

    let suggestedTitle = `${valNameClean} by ${catNameClean}`;
    if (rec.type === 'histogram') {
      suggestedTitle = `${valNameClean} Distribution Histogram`;
    } else if (rec.type === 'stacked_bar' && secCatCol) {
      const secClean = secCatCol.name.replace(/([A-Z])/g, ' $1').trim();
      suggestedTitle = `${valNameClean} by ${catNameClean} & ${secClean}`;
    } else if (rec.type === 'heatmap') {
      suggestedTitle = secCatCol
        ? `${valNameClean} Heatmap (${catNameClean} × ${secCatCol.name})`
        : `${valNameClean} Heatmap Matrix`;
    } else if (rec.type === 'boxplot') {
      suggestedTitle = `${valNameClean} Spread & Median by ${catNameClean}`;
    } else if (rec.type === 'donut') {
      suggestedTitle = `${catNameClean} Share of ${valNameClean}`;
    } else if (rec.type === 'scatter') {
      const otherMeasure = secValCol?.name || categoryColName;
      suggestedTitle = `${otherMeasure} vs ${valNameClean}`;
    } else if (rec.type === 'line') {
      suggestedTitle = `${valNameClean} Over Time`;
    }

    return {
      type: rec.type,
      label: rec.label,
      score: rec.score,
      badge,
      isTopRecommendation: index === 0,
      reason: rec.reason,
      dataSuitability: rec.suitability,
      suggestedTitle,
      iconName: rec.icon
    };
  });
}

/**
 * Analyzes selected column schema and recommends the optimal visualization types
 */
export function recommendChartsForFields(
  categoryColName: string,
  valueColName: string,
  columns: ColumnProfile[],
  rows: Record<string, any>[],
  options?: RecommendChartOptions
): ChartRecommendation[] {
  const useChartGuide =
    options?.chartGuide !== undefined ? options.chartGuide : loadFeatureFlags().chartGuide;

  if (useChartGuide) {
    return recommendChartsWithGuideRules(categoryColName, valueColName, columns, rows, options);
  }

  const catCol = columns.find(c => c.name === categoryColName) || {
    name: categoryColName,
    dataType: 'string' as const,
    distinctCount: 10,
    nullCount: 0,
    sampleValues: []
  };

  const valCol = columns.find(c => c.name === valueColName) || {
    name: valueColName,
    dataType: 'number' as const,
    distinctCount: 20,
    nullCount: 0,
    sampleValues: []
  };

  const isDate = catCol.dataType === 'date' || 
    /date|time|year|month|quarter|period|day|week|dt|timestamp/i.test(catCol.name);

  const isCatNumeric = catCol.dataType === 'number';
  const isValNumeric = valCol.dataType === 'number';
  const distinctCount = catCol.distinctCount || 10;

  // Inspect numerical dispersion in values
  let valVarianceScore = 0;
  if (rows && rows.length > 0 && isValNumeric) {
    const vals = rows.map(r => Number(r[valCol.name])).filter(v => !isNaN(v));
    if (vals.length > 2) {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      if (max - min > 0) {
        valVarianceScore = Math.min(100, Math.round(((max - min) / (Math.abs(min) + Math.abs(max) + 1)) * 100));
      }
    }
  }

  const recommendations: { type: VisualConfig['type']; label: string; score: number; reason: string; suitability: string; icon: string }[] = [];

  // =========================================================================
  // RULE 1: Time-Series / Chronological Data
  // =========================================================================
  if (isDate) {
    recommendations.push({
      type: 'heatmap',
      label: 'Temporal Heatmap Matrix',
      score: 96,
      reason: 'Time-series detected. Heatmaps illuminate temporal density, seasonal rhythm, and peak velocity across periods without line collision.',
      suitability: 'Optimal for chronological periods & multi-interval observation',
      icon: 'Calendar'
    });

    recommendations.push({
      type: 'area',
      label: 'Area Trend',
      score: 93,
      reason: 'Chronological progression with cumulative volume shading emphasizes momentum and baseline trajectory.',
      suitability: 'High visual impact for continuous revenue & metric trajectories',
      icon: 'TrendingUp'
    });

    recommendations.push({
      type: 'line',
      label: 'Line Chart',
      score: 90,
      reason: 'Standard continuous spline highlights directional inflection points and chronological rates of change.',
      suitability: 'Clean, classical time-series velocity tracking',
      icon: 'LineChart'
    });

    recommendations.push({
      type: 'bar',
      label: 'Bar Chart',
      score: 68,
      reason: 'Discrete period comparison. Effective when analyzing non-continuous cyclical reporting periods.',
      suitability: 'Bucket-by-bucket comparisons',
      icon: 'BarChart'
    });
  } 
  // =========================================================================
  // RULE 2: Distribution & Statistical Spread
  // =========================================================================
  else if (isValNumeric && valVarianceScore > 25 && distinctCount >= 3 && distinctCount <= 12) {
    recommendations.push({
      type: 'boxplot',
      label: 'Quartile Boxplot',
      score: 97,
      reason: 'Statistical distribution detected. Boxplots compute 5-number Tukey summaries (Min, Q1, Median, Q3, Max) and isolate statistical outliers.',
      suitability: 'Essential for variance evaluation, dispersion auditing & outlier discovery',
      icon: 'Box'
    });

    recommendations.push({
      type: 'heatmap',
      label: 'Density Heatmap',
      score: 91,
      reason: '2D matrix visually captures value concentration thresholds and highlights anomalous category cells.',
      suitability: 'Segment intensity discovery & risk heat mapping',
      icon: 'Grid'
    });

    recommendations.push({
      type: 'bar',
      label: 'Ranked Bar Chart',
      score: 84,
      reason: 'Aggregates summary totals to contrast categorical volume side by side.',
      suitability: 'Direct categorical comparisons',
      icon: 'BarChart'
    });

    recommendations.push({
      type: 'table',
      label: 'Data Matrix Table',
      score: 79,
      reason: 'Tabular drilldown displaying exact numbers, percentages, and ranked metrics.',
      suitability: 'Granular auditing and financial reconciliation',
      icon: 'Table'
    });
  }
  // =========================================================================
  // RULE 3: Low Cardinality Part-to-Whole Composition (2 to 6 Categories)
  // =========================================================================
  else if (!isDate && distinctCount >= 2 && distinctCount <= 6) {
    recommendations.push({
      type: 'donut',
      label: 'Donut Segment Chart',
      score: 95,
      reason: `Low cardinality (${distinctCount} categories) matches ideal donut composition without cognitive slice clutter.`,
      suitability: 'Perfect for segment share of total & proportional distribution',
      icon: 'PieChart'
    });

    recommendations.push({
      type: 'bar',
      label: 'Column Bar Chart',
      score: 88,
      reason: 'High precision comparative height benchmarks across distinct segments.',
      suitability: 'Clean absolute value comparisons',
      icon: 'BarChart'
    });

    recommendations.push({
      type: 'pie',
      label: 'Classical Pie',
      score: 85,
      reason: 'Traditional part-to-whole circular breakdown.',
      suitability: 'Proportional division across a whole',
      icon: 'PieChart'
    });

    recommendations.push({
      type: 'boxplot',
      label: 'Category Boxplot',
      score: 82,
      reason: 'Evaluates the spread and median benchmark within each of the core segments.',
      suitability: 'Segment variance and spread analysis',
      icon: 'Box'
    });
  }
  // =========================================================================
  // RULE 4: High Cardinality Dimensions (> 10 Categories)
  // =========================================================================
  else if (!isDate && distinctCount > 10) {
    recommendations.push({
      type: 'horizontal_bar',
      label: 'Horizontal Ranked Bar',
      score: 96,
      reason: `High cardinality (${distinctCount} entities). Horizontal layout prevents vertical label overlap and orders entities by ranking.`,
      suitability: 'Top-N leaderboards, accounts, products & regional listings',
      icon: 'AlignLeft'
    });

    recommendations.push({
      type: 'treemap',
      label: 'Hierarchical Treemap',
      score: 91,
      reason: 'Area-nested rectangles pack high-density categorical volume compactly.',
      suitability: 'Multi-category nested share exploration',
      icon: 'LayoutGrid'
    });

    recommendations.push({
      type: 'table',
      label: 'Granular Matrix Table',
      score: 89,
      reason: 'Sortable tabular view with full scannability and precise figures.',
      suitability: 'Detailed multi-row audit logs and customer records',
      icon: 'Table'
    });

    recommendations.push({
      type: 'heatmap',
      label: 'Intensity Heatmap Grid',
      score: 84,
      reason: 'Color gradient scales isolate dominant performers from long-tail entries.',
      suitability: 'Matrix density across multiple entities',
      icon: 'Grid'
    });
  }
  // =========================================================================
  // RULE 5: Multi-Metric Correlation (Two Numeric Columns)
  // =========================================================================
  else if (isCatNumeric && isValNumeric) {
    recommendations.push({
      type: 'scatter',
      label: 'Correlation Scatter Plot',
      score: 98,
      reason: 'Two continuous numerical metrics detected. Scatter plots uncover correlations, clustering, and regression outliers.',
      suitability: 'Bivariate correlation, elasticity & regression analysis',
      icon: 'ScatterPlot'
    });

    recommendations.push({
      type: 'heatmap',
      label: 'Bivariate Heatmap',
      score: 88,
      reason: '2D grid highlights coordinate density and joint frequency hotspots.',
      suitability: 'Cross-metric density discovery',
      icon: 'Grid'
    });

    recommendations.push({
      type: 'line',
      label: 'Trajectory Line',
      score: 80,
      reason: 'Plots ordered dual-metric progression across observation indices.',
      suitability: 'Parametric progression curves',
      icon: 'LineChart'
    });
  }
  // =========================================================================
  // DEFAULT / GENERAL CATEGORICAL
  // =========================================================================
  else {
    recommendations.push({
      type: 'bar',
      label: 'Standard Bar Chart',
      score: 90,
      reason: 'Versatile discrete comparative visual for contrasting metrics across categories.',
      suitability: 'Standard comparative categorical analysis',
      icon: 'BarChart'
    });

    recommendations.push({
      type: 'boxplot',
      label: 'Quartile Boxplot',
      score: 86,
      reason: 'Shows median, quartiles, and statistical distribution spread.',
      suitability: 'Dispersion and statistical distribution',
      icon: 'Box'
    });

    recommendations.push({
      type: 'heatmap',
      label: 'Density Heatmap',
      score: 84,
      reason: 'Visualizes concentration and intensity variations.',
      suitability: 'Cross-tabulation density',
      icon: 'Grid'
    });

    recommendations.push({
      type: 'table',
      label: 'Summary Table',
      score: 80,
      reason: 'Crisp tabular view of ranked figures.',
      suitability: 'Structured numbers with rank sorting',
      icon: 'Table'
    });
  }

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations.map((rec, index) => {
    let badge: 'Best Fit' | 'Strong' | 'Alternative' = 'Alternative';
    if (index === 0) badge = 'Best Fit';
    else if (index === 1 || index === 2) badge = 'Strong';

    const catNameClean = categoryColName.replace(/([A-Z])/g, ' $1').trim();
    const valNameClean = valueColName.replace(/([A-Z])/g, ' $1').trim();

    let suggestedTitle = `${valNameClean} by ${catNameClean}`;
    if (rec.type === 'heatmap' && isDate) {
      suggestedTitle = `${valNameClean} Chronological Heatmap Matrix`;
    } else if (rec.type === 'boxplot') {
      suggestedTitle = `${valNameClean} Quartile Distribution & Outliers (${catNameClean})`;
    } else if (rec.type === 'donut') {
      suggestedTitle = `${catNameClean} Share of ${valNameClean}`;
    } else if (rec.type === 'scatter') {
      suggestedTitle = `${catNameClean} vs ${valNameClean} Correlation Matrix`;
    } else if (rec.type === 'area' || rec.type === 'line') {
      suggestedTitle = `${valNameClean} Progression Over Time`;
    }

    return {
      type: rec.type,
      label: rec.label,
      score: rec.score,
      badge,
      isTopRecommendation: index === 0,
      reason: rec.reason,
      dataSuitability: rec.suitability,
      suggestedTitle,
      iconName: rec.icon
    };
  });
}

/**
 * Analyzes the entire dataset schema and automatically synthesizes a balanced,
 * intelligent dashboard suite with diverse, high-value visualizations
 */
export function recommendDatasetDashboard(
  columns: ColumnProfile[],
  rows: Record<string, any>[]
): VisualConfig[] {
  if (!columns || columns.length === 0) return [];

  const numericCols = columns.filter(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate);
  const stringCols = columns.filter(c => c.dataType === 'string' && !c.isPrimaryKeyCandidate);
  const dateCol = columns.find(c => c.dataType === 'date' || /date|time|year|month|period/i.test(c.name));

  const primaryVal = numericCols[0]?.name || 'Revenue';
  const secondaryVal = numericCols[1]?.name || primaryVal;

  const lowCardCat = stringCols.find(c => c.distinctCount >= 2 && c.distinctCount <= 6) || stringCols[0];
  const highCardCat = stringCols.find(c => c.distinctCount > 7 && c.name !== lowCardCat?.name) || stringCols[1] || lowCardCat;

  const suite: VisualConfig[] = [];

  // 1. Time-Series Visual: Heatmap Matrix for Time-Series (as specifically requested)
  if (dateCol) {
    suite.push({
      id: `vis-ai-heatmap-${Date.now()}-1`,
      title: `${primaryVal.toUpperCase()} CHRONOLOGICAL HEATMAP MATRIX`,
      type: 'heatmap',
      categoryField: dateCol.name,
      valueField: primaryVal,
      aggregation: 'sum',
      color: '#0284C7',
      description: 'Intelligent Recommendation: Heatmap provides multi-interval temporal density without line collisions.'
    });
  }

  // 2. Statistical Distribution: Boxplot for Quartiles & Outlier Isolation
  if (lowCardCat && primaryVal) {
    suite.push({
      id: `vis-ai-boxplot-${Date.now()}-2`,
      title: `${primaryVal.toUpperCase()} QUARTILE DISTRIBUTION & OUTLIERS (${lowCardCat.name})`,
      type: 'boxplot',
      categoryField: lowCardCat.name,
      valueField: primaryVal,
      aggregation: 'sum',
      color: '#0284C7',
      description: 'Intelligent Recommendation: Boxplot calculates 5-number Tukey distribution (Min, Q1, Median, Q3, Max) and identifies outlier transactions.'
    });
  }

  // 3. Proportional Composition: Donut for Low-Cardinality Segment Share
  if (lowCardCat && primaryVal) {
    suite.push({
      id: `vis-ai-donut-${Date.now()}-3`,
      title: `${lowCardCat.name.toUpperCase()} SHARE OF TOTAL ${primaryVal.toUpperCase()}`,
      type: 'donut',
      categoryField: lowCardCat.name,
      valueField: primaryVal,
      aggregation: 'sum',
      color: '#00d8f6',
      description: `Intelligent Recommendation: Donut is mathematically optimal for ${lowCardCat.distinctCount || 4} discrete segments.`
    });
  }

  // 4. Ranking & High-Cardinality: Horizontal Bar or Treemap
  if (highCardCat && primaryVal) {
    suite.push({
      id: `vis-ai-hbar-${Date.now()}-4`,
      title: `TOP PERFORMING ${highCardCat.name.toUpperCase()} RANKING`,
      type: 'horizontal_bar',
      categoryField: highCardCat.name,
      valueField: primaryVal,
      aggregation: 'sum',
      color: '#0284C7',
      description: `Intelligent Recommendation: Horizontal bars prevent label clipping across ${highCardCat.distinctCount || 10} entities.`
    });
  }

  // 5. Correlation & Multi-Metric: Scatter Plot
  if (numericCols.length >= 2 && highCardCat) {
    suite.push({
      id: `vis-ai-scatter-${Date.now()}-5`,
      title: `${primaryVal} VS ${secondaryVal} CORRELATION SCATTER`,
      type: 'scatter',
      categoryField: highCardCat.name,
      valueField: primaryVal,
      secondaryValueField: secondaryVal,
      aggregation: 'sum',
      color: '#6366f1',
      description: 'Intelligent Recommendation: Two numerical dimensions detected. Scatter discovers correlation clusters and regression variance.'
    });
  }

  return suite;
}
