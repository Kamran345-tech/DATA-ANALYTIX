import { ColumnProfile, DataType } from '../types';
import { profileDataset } from '../engine/dataProfiler';
import { buildDataModel } from '../engine/dataModeler';
import {
  recommendChartsForFields,
  ChartRecommendation,
  sampleRowsForChart,
} from '../engine/chartRecommendationEngine';
import { ALL_ANALYTICS_PACKS, getPackById } from './packs/registry';
import { parseAndNormalizeDates, parseRealNumber } from './packs/helpers';
import {
  AnalyticsPackConfig,
  EnrichedAnalyticsPackConfig,
  PackId,
  PackDetectionMatch,
  ComputedPackKpi,
  ComputedPackChart,
  BuiltPackDashboard,
  BuiltPackReport,
  ColumnSchema,
  DatasetProfile,
  MeasureType,
} from './packs/types';
import {
  findLearnedRoleMappings,
  getPackLearningAdjustment,
  inferMeasureType,
  isChartHiddenByFeedback,
  recordLearnedColumnMapping,
} from './learning/adaptiveLearningEngine';

export interface KpiDeltaEvaluation {
  hasDelta: boolean;
  deltaPercent: number | null;
  state: 'favorable' | 'unfavorable' | 'neutral';
  isFavorable: boolean | null;
  isNeutral: boolean;
  direction: 'up' | 'down' | 'flat';
  arrow: '▲' | '▼' | '—';
  signedText: string;
  textLabel: string;
  colorToken: 'var(--success)' | 'var(--danger)' | 'var(--text-secondary)';
}

/**
 * Shared delta evaluation rule (Part A4) used identically by web KPI cards and PPTX slides:
 * - Neutral when |delta| < 0.5% (color = neutral secondary token, never green for -0.1%!).
 * - When |delta| >= 0.5%: favorable if sign matches goodDirection ('up' -> positive, 'down' -> negative).
 * - Arrow & text label ("up 0.1%", "down 0.1%", "flat 0.0%") always reflect actual direction.
 */
export function evaluateKpiDelta(
  deltaPercent: number | null | undefined,
  goodDirection: 'up' | 'down' = 'up'
): KpiDeltaEvaluation {
  if (typeof deltaPercent !== 'number' || !Number.isFinite(deltaPercent)) {
    return {
      hasDelta: false,
      deltaPercent: null,
      state: 'neutral',
      isFavorable: null,
      isNeutral: true,
      direction: 'flat',
      arrow: '—',
      signedText: '0.0%',
      textLabel: 'flat 0.0%',
      colorToken: 'var(--text-secondary)',
    };
  }

  const abs = Math.abs(deltaPercent);
  const direction: 'up' | 'down' | 'flat' =
    deltaPercent > 0 ? 'up' : deltaPercent < 0 ? 'down' : 'flat';
  const arrow: '▲' | '▼' | '—' =
    direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—';
  const signedText = `${deltaPercent > 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`;
  const textLabel =
    direction === 'flat'
      ? `flat ${abs.toFixed(1)}%`
      : `${direction} ${abs.toFixed(1)}%`;

  if (abs < 0.5) {
    return {
      hasDelta: true,
      deltaPercent,
      state: 'neutral',
      isFavorable: null,
      isNeutral: true,
      direction,
      arrow,
      signedText,
      textLabel,
      colorToken: 'var(--text-secondary)',
    };
  }

  const isFavorable =
    goodDirection === 'up' ? deltaPercent >= 0.5 : deltaPercent <= -0.5;

  return {
    hasDelta: true,
    deltaPercent,
    state: isFavorable ? 'favorable' : 'unfavorable',
    isFavorable,
    isNeutral: false,
    direction,
    arrow,
    signedText,
    textLabel,
    colorToken: isFavorable ? 'var(--success)' : 'var(--danger)',
  };
}

export interface KpiPeriodSeriesPoint {
  period: string;
  value: number;
}

export interface KpiPeriodSeriesResult {
  points: KpiPeriodSeriesPoint[];
  sparkline: number[];
  prevPeriodDeltaPct: number | null;
  priorYearDeltaPct: number | null;
  firstToLastDeltaPct: number | null;
  comparisonPeriodLabel: string | null;
}

/**
 * Computes a KPI's true time series by grouping rows by the mapped or detected date column per period
 * and evaluating `kpi.formula(periodRows, roleMapping)` for each distinct period.
 * - Never slices "first 6 rows of one column" or pads with invented fallback numbers.
 * - If fewer than 3 distinct periods exist, `sparkline` is `[]` (hidden).
 */
export function computeKpiPeriodSeries(
  kpi: {
    formula: (rows: Record<string, any>[], roleMap: Record<string, string>) => number | null;
  },
  rows: Record<string, any>[],
  roleMapping: Record<string, string>
): KpiPeriodSeriesResult {
  if (!rows || rows.length === 0) {
    return {
      points: [],
      sparkline: [],
      prevPeriodDeltaPct: null,
      priorYearDeltaPct: null,
      firstToLastDeltaPct: null,
      comparisonPeriodLabel: null,
    };
  }

  let dateCol = roleMapping.date;
  if (!dateCol && rows[0]) {
    dateCol =
      Object.keys(rows[0]).find((c) => /date|month|period|quarter|year|week|day/i.test(c)) || '';
  }

  const periodGroups = new Map<string, Record<string, any>[]>();
  if (dateCol && rows[0] && dateCol in rows[0]) {
    for (const r of rows) {
      const rawDate = r[dateCol];
      if (rawDate === null || rawDate === undefined || String(rawDate).trim() === '') continue;
      const key = String(rawDate).trim();
      const arr = periodGroups.get(key);
      if (arr) {
        arr.push(r);
      } else {
        periodGroups.set(key, [r]);
      }
    }
  }

  const sortedPeriods = Array.from(periodGroups.keys()).sort((a, b) => a.localeCompare(b));
  const points: KpiPeriodSeriesPoint[] = [];

  for (const periodKey of sortedPeriods) {
    const groupRows = periodGroups.get(periodKey) || [];
    if (groupRows.length === 0) continue;
    const rawVal = kpi.formula(groupRows, roleMapping);
    if (rawVal !== null && Number.isFinite(rawVal)) {
      points.push({
        period: periodKey,
        value: Number(rawVal.toFixed(4)),
      });
    }
  }

  // Only emit a sparkline when at least 3 distinct periods exist
  const sparkline = points.length >= 3 ? points.map((p) => Number(p.value.toFixed(2))) : [];

  let prevPeriodDeltaPct: number | null = null;
  let priorYearDeltaPct: number | null = null;
  let firstToLastDeltaPct: number | null = null;
  let comparisonPeriodLabel: string | null = null;

  if (points.length >= 2) {
    const lastPt = points[points.length - 1];
    const prevPt = points[points.length - 2];
    const firstPt = points[0];

    if (Math.abs(prevPt.value) > 1e-9) {
      prevPeriodDeltaPct = ((lastPt.value - prevPt.value) / Math.abs(prevPt.value)) * 100;
      comparisonPeriodLabel = `${prevPt.period} → ${lastPt.period}`;
    }
    if (Math.abs(firstPt.value) > 1e-9) {
      firstToLastDeltaPct = ((lastPt.value - firstPt.value) / Math.abs(firstPt.value)) * 100;
    }

    // Prior-year comparison only if >= 12 periods or explicit prior-year period exists
    const lastYearMatch = lastPt.period.match(/^(\d{4})-(.+)$/);
    if (lastYearMatch) {
      const priorYearKey = `${Number(lastYearMatch[1]) - 1}-${lastYearMatch[2]}`;
      const pyPt = points.find((p) => p.period === priorYearKey);
      if (pyPt && Math.abs(pyPt.value) > 1e-9) {
        priorYearDeltaPct = ((lastPt.value - pyPt.value) / Math.abs(pyPt.value)) * 100;
      }
    } else if (points.length >= 13) {
      const pyPt = points[points.length - 13];
      if (pyPt && Math.abs(pyPt.value) > 1e-9) {
        priorYearDeltaPct = ((lastPt.value - pyPt.value) / Math.abs(pyPt.value)) * 100;
      }
    }
  }

  return {
    points,
    sparkline,
    prevPeriodDeltaPct,
    priorYearDeltaPct,
    firstToLastDeltaPct,
    comparisonPeriodLabel,
  };
}

export interface RealKpiTargetResolution {
  targetValue: number | null;
  targetSource: 'user' | 'column' | 'pack' | null;
  attainmentPct: number | null;
  vsTargetDeltaPct: number | null;
}

/**
 * Resolves a KPI's real target value from:
 * 1. A user-set target stored in KPI target editor overrides (`userTargets[kpi.id]`), OR
 * 2. A mapped budget/target/plan/quota column when the KPI is an additive primary revenue/sales/output metric
 *    and the user explicitly requests column target or the KPI has no declared pack target, OR
 * 3. The pack's declared `kpi.target`.
 * Never invents a target (`actual * 1.12` or `92 + ...`). When no target exists, returns `targetValue: null` and `attainmentPct: null`.
 */
export function resolveRealKpiTarget(params: {
  kpiId: string;
  actualValue: number | null;
  favorableDirection?: 'up' | 'down';
  packTarget?: number | null;
  requiredRoles?: string[];
  measureType?: MeasureType;
  rows?: Record<string, any>[];
  roleMapping?: Record<string, string>;
  userTargets?: Record<string, number>;
  allowMappedBudgetColumn?: boolean;
}): RealKpiTargetResolution {
  const {
    kpiId,
    actualValue,
    favorableDirection = 'up',
    packTarget,
    requiredRoles = [],
    measureType = 'additive',
    rows = [],
    roleMapping = {},
    userTargets = {},
    allowMappedBudgetColumn = false,
  } = params;

  let targetValue: number | null = null;
  let targetSource: 'user' | 'column' | 'pack' | null = null;

  const userTarget = userTargets[kpiId];
  if (typeof userTarget === 'number' && Number.isFinite(userTarget) && userTarget > 0) {
    targetValue = userTarget;
    targetSource = 'user';
  } else if (typeof packTarget === 'number' && Number.isFinite(packTarget) && packTarget > 0) {
    targetValue = packTarget;
    targetSource = 'pack';
  } else if (
    allowMappedBudgetColumn &&
    measureType === 'additive' &&
    requiredRoles.length === 1 &&
    /^(revenue|sales|pipeline|bookings|arr|mrr|gmv|output|production)$/i.test(requiredRoles[0])
  ) {
    const targetCol =
      roleMapping.target || roleMapping.budget || roleMapping.quota || roleMapping.plan;
    if (targetCol && rows.length > 0 && rows[0] && targetCol in rows[0]) {
      let sum = 0;
      let count = 0;
      for (const r of rows) {
        const n = parseRealNumber(r[targetCol]);
        if (n !== null && Number.isFinite(n)) {
          sum += n;
          count++;
        }
      }
      if (count > 0 && sum > 0) {
        targetValue = sum;
        targetSource = 'column';
      }
    }
  }

  if (
    targetValue === null ||
    !Number.isFinite(targetValue) ||
    targetValue <= 0 ||
    actualValue === null ||
    !Number.isFinite(actualValue)
  ) {
    return {
      targetValue: targetValue && targetValue > 0 ? targetValue : null,
      targetSource: targetValue && targetValue > 0 ? targetSource : null,
      attainmentPct: null,
      vsTargetDeltaPct: null,
    };
  }

  // Real attainment: actual / target (for 'up'), or target / actual (for 'down' where lower actual is better)
  const rawAttainment =
    favorableDirection === 'up'
      ? (actualValue / targetValue) * 100
      : actualValue > 0
      ? (targetValue / actualValue) * 100
      : 100;

  const attainmentPct = Number(Math.max(0, rawAttainment).toFixed(1));
  const vsTargetDeltaPct = Number(
    (((actualValue - targetValue) / Math.abs(targetValue)) * 100).toFixed(1)
  );

  return {
    targetValue,
    targetSource,
    attainmentPct,
    vsTargetDeltaPct,
  };
}

export interface UnifiedKpiStatusEvaluation {
  hasStatus: boolean;
  statusLabel: 'On track' | 'Watch' | 'Action needed' | null;
  statusColorToken: 'var(--success)' | 'var(--warning)' | 'var(--danger)' | 'var(--text-secondary)';
  hasTarget: boolean;
  targetValue: number | null;
  targetSource: 'user' | 'column' | 'pack' | null;
  attainmentPct: number | null;
  activeDeltaPct: number | null;
  deltaEv: KpiDeltaEvaluation;
  comparisonSuffix: string;
}

/**
 * Single shared source of truth for KPI status (On track / Watch / Action needed) and change evaluation.
 * Used identically by VIP KPI cards, Target Radial Gauge, Boardroom Story Line, and PPTX/PDF exports.
 * - Derived ONLY from real attainment (when a real target exists) or from real delta against the chosen comparison.
 * - No target and no comparison delta -> `hasStatus: false, statusLabel: null` (shows no status badge).
 */
export function evaluateUnifiedKpiStatus(params: {
  kpiId: string;
  actualValue: number | null;
  favorableDirection?: 'up' | 'down';
  packTarget?: number | null;
  requiredRoles?: string[];
  measureType?: MeasureType;
  rows?: Record<string, any>[];
  roleMapping?: Record<string, string>;
  userTargets?: Record<string, number>;
  allowMappedBudgetColumn?: boolean;
  prevPeriodDeltaPct?: number | null;
  priorYearDeltaPct?: number | null;
  comparisonMode?: 'prev_period' | 'target' | 'last_year';
}): UnifiedKpiStatusEvaluation {
  const {
    kpiId,
    actualValue,
    favorableDirection = 'up',
    packTarget,
    requiredRoles,
    measureType,
    rows,
    roleMapping,
    userTargets,
    allowMappedBudgetColumn = false,
    prevPeriodDeltaPct = null,
    priorYearDeltaPct = null,
    comparisonMode = 'prev_period',
  } = params;

  const targetRes = resolveRealKpiTarget({
    kpiId,
    actualValue,
    favorableDirection,
    packTarget,
    requiredRoles,
    measureType,
    rows,
    roleMapping,
    userTargets,
    allowMappedBudgetColumn,
  });

  const activeDeltaPct =
    comparisonMode === 'target'
      ? targetRes.vsTargetDeltaPct
      : comparisonMode === 'last_year'
      ? priorYearDeltaPct
      : prevPeriodDeltaPct;

  const comparisonSuffix =
    comparisonMode === 'target'
      ? 'vs target'
      : comparisonMode === 'last_year'
      ? 'vs last year'
      : 'vs prev period';

  const deltaEv = evaluateKpiDelta(activeDeltaPct, favorableDirection);
  const hasTarget = targetRes.targetValue !== null && targetRes.attainmentPct !== null;

  let statusLabel: 'On track' | 'Watch' | 'Action needed' | null = null;
  let statusColorToken:
    | 'var(--success)'
    | 'var(--warning)'
    | 'var(--danger)'
    | 'var(--text-secondary)' = 'var(--text-secondary)';

  if (hasTarget && targetRes.attainmentPct !== null) {
    if (targetRes.attainmentPct >= 95) {
      statusLabel = 'On track';
      statusColorToken = 'var(--success)';
    } else if (targetRes.attainmentPct >= 80) {
      statusLabel = 'Watch';
      statusColorToken = 'var(--warning)';
    } else {
      statusLabel = 'Action needed';
      statusColorToken = 'var(--danger)';
    }
  } else if (deltaEv.hasDelta) {
    if (deltaEv.state === 'favorable') {
      statusLabel = 'On track';
      statusColorToken = 'var(--success)';
    } else if (deltaEv.state === 'neutral') {
      statusLabel = 'Watch';
      statusColorToken = 'var(--warning)';
    } else {
      statusLabel = 'Action needed';
      statusColorToken = 'var(--danger)';
    }
  }

  return {
    hasStatus: statusLabel !== null,
    statusLabel,
    statusColorToken,
    hasTarget,
    targetValue: targetRes.targetValue,
    targetSource: targetRes.targetSource,
    attainmentPct: targetRes.attainmentPct,
    activeDeltaPct,
    deltaEv,
    comparisonSuffix,
  };
}

/**
 * Validates and reconciles chart title against mapped series count (Part A5):
 * Any chart title with "vs" or "and" between metrics requires >= 2 plotted series,
 * or is honestly retitled to the single plotted series.
 */
export function validateChartTitleAndSeries(
  rawTitle: string,
  seriesNames: string[],
  categoryName?: string
): { title: string; hasComparisonKeyword: boolean; isValid: boolean } {
  const hasVs = /\s+vs\.?\s+/i.test(rawTitle);
  const hasAnd = /\s+(?:and|&)\s+/i.test(rawTitle);
  const hasComparisonKeyword = hasVs || hasAnd;

  if (!hasComparisonKeyword || seriesNames.length >= 2) {
    return {
      title: rawTitle,
      hasComparisonKeyword,
      isValid: true,
    };
  }

  const primarySeries = seriesNames[0] || 'Value';
  const cleanedTitle = categoryName
    ? `${primarySeries} by ${categoryName}`
    : `${primarySeries} Analysis`;

  return {
    title: cleanedTitle,
    hasComparisonKeyword: false,
    isValid: true,
  };
}

function normalizeHeader(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeHeaderWithUnits(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/\$/g, '_usd_')
    .replace(/%/g, '_pct_')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function inferDetectedTypes(colNames: string[], rows: Record<string, any>[]): Record<string, DataType> {
  const out: Record<string, DataType> = {};
  const sample = rows.slice(0, 50);
  for (const col of colNames) {
    if (/date|time|month|year|period|tareekh/i.test(col)) {
      out[col] = 'date';
      continue;
    }
    let numHits = 0;
    let nonEmpty = 0;
    for (const r of sample) {
      const v = r?.[col];
      if (v === null || v === undefined || v === '') continue;
      nonEmpty++;
      if (parseRealNumber(v) !== null) numHits++;
    }
    out[col] = nonEmpty > 0 && numHits / nonEmpty >= 0.6 ? 'number' : 'string';
  }
  return out;
}

function extractColumnNamesAndRows(
  input:
    | ColumnSchema[]
    | string[]
    | Record<string, any>[]
    | { columns?: (ColumnSchema | string)[]; rows?: Record<string, any>[]; datasetId?: string },
  explicitRows?: Record<string, any>[]
): { colNames: string[]; rows: Record<string, any>[] } {
  if (!input) return { colNames: [], rows: explicitRows || [] };

  if (Array.isArray(input)) {
    if (input.length === 0) return { colNames: [], rows: explicitRows || [] };
    const first = input[0];
    if (typeof first === 'string') {
      return { colNames: input as string[], rows: explicitRows || [] };
    }
    if (first && typeof first === 'object' && 'name' in first && 'dataType' in first) {
      return {
        colNames: (input as ColumnSchema[]).map(c => c.name),
        rows: explicitRows || [],
      };
    }
    const rowArr = input as Record<string, any>[];
    return {
      colNames: Object.keys(rowArr[0] || {}),
      rows: explicitRows || rowArr,
    };
  }

  if (typeof input === 'object') {
    const obj = input as { columns?: (ColumnSchema | string)[]; rows?: Record<string, any>[] };
    const rows = explicitRows || obj.rows || [];
    if (Array.isArray(obj.columns) && obj.columns.length > 0) {
      const colNames = obj.columns.map(c => (typeof c === 'string' ? c : c.name));
      return { colNames, rows };
    }
    if (rows.length > 0) {
      return { colNames: Object.keys(rows[0]), rows };
    }
  }

  return { colNames: [], rows: explicitRows || [] };
}

/**
 * Automatically maps dataset column names to a pack's role taxonomy.
 * Applies user overrides first, then learned alias rules from user corrections (Part B2),
 * then built-in exact and partial aliases.
 */
export function inferRoleMapping(
  pack: AnalyticsPackConfig,
  columnNames: string[],
  userOverrides?: Record<string, string>
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedCols = columnNames.map((raw) => ({
    raw,
    norm: normalizeHeader(raw),
    normUnits: normalizeHeaderWithUnits(raw),
  }));

  const usedRawCols = new Set<string>();
  const explicitlyUnmapped = new Set<string>();

  if (userOverrides) {
    for (const [role, col] of Object.entries(userOverrides)) {
      if (col === '') {
        explicitlyUnmapped.add(role);
      } else if (col && columnNames.includes(col)) {
        mapping[role] = col;
        usedRawCols.add(col);
      }
    }
  }

  const allRoles = [...pack.detect.requiredRoles, ...pack.detect.optionalRoles];

  // Step 1: Apply Learned Alias Dictionary BEFORE built-in aliases (Part B2)
  const { roleToColumn: learnedRoleMap } = findLearnedRoleMappings(pack.id, columnNames);
  for (const role of allRoles) {
    if (mapping[role] || explicitlyUnmapped.has(role)) continue;
    const learnedCol = learnedRoleMap[role];
    if (learnedCol && !usedRawCols.has(learnedCol)) {
      mapping[role] = learnedCol;
      usedRawCols.add(learnedCol);
    }
  }

  // Step 2: Built-in exact alias matches
  for (const role of allRoles) {
    if (mapping[role] || explicitlyUnmapped.has(role)) continue;
    const aliases = (pack.detect.roleAliases[role] || [role]).map(normalizeHeader);
    const exactHit = normalizedCols.find(
      (c) => !usedRawCols.has(c.raw) && (aliases.includes(c.norm) || aliases.includes(c.normUnits))
    );
    if (exactHit) {
      mapping[role] = exactHit.raw;
      usedRawCols.add(exactHit.raw);
    }
  }

  // Step 3: Built-in partial substring matches
  for (const role of allRoles) {
    if (mapping[role] || explicitlyUnmapped.has(role)) continue;
    const aliases = (pack.detect.roleAliases[role] || [role]).map(normalizeHeader);
    const partialHit = normalizedCols.find(
      (c) =>
        !usedRawCols.has(c.raw) &&
        aliases.some(
          (alias) =>
            alias.length >= 3 &&
            (c.norm.includes(alias) ||
              c.normUnits.includes(alias) ||
              (alias.includes(c.norm) && c.norm.length >= 4))
        )
    );
    if (partialHit) {
      mapping[role] = partialHit.raw;
      usedRawCols.add(partialHit.raw);
    }
  }

  return mapping;
}

export function mapRoles(
  input:
    | ColumnSchema[]
    | string[]
    | Record<string, any>[]
    | { columns?: (ColumnSchema | string)[]; rows?: Record<string, any>[]; datasetId?: string },
  pack: AnalyticsPackConfig,
  userOverrides?: Record<string, string>
): Record<string, string> {
  const { colNames } = extractColumnNamesAndRows(input);
  return inferRoleMapping(pack, colNames, userOverrides);
}

const ROLE_MAP_STORAGE_PREFIX = 'dataanalytix_pack_roles_';

export function getPersistedPackRoleMap(datasetId: string, packId: string): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(`${ROLE_MAP_STORAGE_PREFIX}${datasetId}_${packId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePersistedPackRoleMap(
  datasetId: string,
  packId: string,
  roleMap: Record<string, string>
): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        `${ROLE_MAP_STORAGE_PREFIX}${datasetId}_${packId}`,
        JSON.stringify(roleMap)
      );
    } catch {
      // ignore storage quota errors
    }
  }
  // Automatically feed user role corrections into the learned alias dictionary (Part B2)
  for (const [role, col] of Object.entries(roleMap)) {
    if (role && col && col.trim() !== '') {
      recordLearnedColumnMapping({
        rawColumnName: col,
        role,
        packId: packId as PackId,
      });
    }
  }
}

export function buildPackTemplateCsv(packOrId: AnalyticsPackConfig | PackId): string {
  const pack = typeof packOrId === 'string' ? getPackById(packOrId) : getPackById(packOrId.id);
  const rows: Record<string, any>[] = pack.sampleDataset();
  if (!rows || rows.length === 0) {
    const headers = [...pack.detect.requiredRoles, ...pack.detect.optionalRoles];
    return headers.join(',') + '\n';
  }
  const headers = Object.keys(rows[0]);
  const sampleSlice = rows.slice(0, 3);
  const lines = [
    headers.join(','),
    ...sampleSlice.map((row: Record<string, any>) =>
      headers
        .map(h => {
          const val = row[h] ?? '';
          const str = String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',')
    ),
  ];
  return lines.join('\n') + '\n';
}

/**
 * Ranks all 14 Analytics Packs against an uploaded dataset's schema & sample rows.
 * Combines learned alias rules, learned pack preferences, value-pattern checks, and column co-occurrence.
 * Returns top matches sorted by confidence (0..100) with explicit match reasons.
 */
export function detectPack(
  input:
    | ColumnSchema[]
    | string[]
    | Record<string, any>[]
    | { columns?: (ColumnSchema | string)[]; rows?: Record<string, any>[]; datasetId?: string },
  explicitRows: Record<string, any>[] = []
): PackDetectionMatch[] {
  const { colNames, rows } = extractColumnNamesAndRows(input, explicitRows);
  const normCols = colNames.map(normalizeHeader);
  const normUnitCols = colNames.map(normalizeHeaderWithUnits);

  const matches: PackDetectionMatch[] = ALL_ANALYTICS_PACKS.map((pack) => {
    const roleMapping = inferRoleMapping(pack, colNames);
    const { roleToColumn: learnedRoles } = findLearnedRoleMappings(pack.id, colNames);
    const learningAdj = getPackLearningAdjustment(pack.id, colNames);

    const reqTotal = Math.max(1, pack.detect.requiredRoles.length);
    const reqMatched = pack.detect.requiredRoles.filter((r) => Boolean(roleMapping[r]));
    const reqMissing = pack.detect.requiredRoles.filter((r) => !roleMapping[r]);

    const optTotal = Math.max(1, pack.detect.optionalRoles.length);
    const optMatched = pack.detect.optionalRoles.filter((r) => Boolean(roleMapping[r]));

    let exactDomainHits = 0;
    for (const role of [...reqMatched, ...optMatched]) {
      if (role === 'date') continue;
      const mappedCol = roleMapping[role];
      const normCol = normalizeHeader(mappedCol);
      const normUnitCol = normalizeHeaderWithUnits(mappedCol);
      const aliases = (pack.detect.roleAliases[role] || [role]).map(normalizeHeader);
      if (
        aliases.includes(normCol) ||
        aliases.includes(normUnitCol) ||
        Boolean(learnedRoles[role])
      ) {
        exactDomainHits += 1;
      }
    }

    let kwHits = 0;
    for (const kw of pack.detect.keywords) {
      const nkw = normalizeHeader(kw);
      if (
        nkw &&
        (normCols.some((nc) => nc === nkw || nc.includes(nkw)) ||
          normUnitCols.some((nc) => nc === nkw || nc.includes(nkw)))
      ) {
        kwHits += 1;
      }
    }

    const reqRatio = reqMatched.length / reqTotal;
    const optRatio = optMatched.length / optTotal;
    const kwRatio = Math.min(1, kwHits / Math.max(3, pack.detect.keywords.length * 0.35));

    const rawScore =
      reqRatio * 42 +
      optRatio * 30 +
      kwRatio * 18 +
      Math.min(18, exactDomainHits * 4.5) +
      (rows.length > 0 && reqMatched.length === reqTotal ? 6 : 0) +
      learningAdj.scoreDelta;

    const nonDateRolesMatched = [...reqMatched, ...optMatched].filter((r) => r !== 'date').length;
    const baseConfidence =
      nonDateRolesMatched === 0 && kwHits === 0 && !learningAdj.isChosenPack
        ? Math.min(25, Math.round(rawScore * 0.4))
        : nonDateRolesMatched === 1 && kwHits === 0 && !learningAdj.isChosenPack
        ? Math.min(52, Math.round(rawScore * 0.7))
        : Math.max(0, Math.min(100, Math.round(rawScore)));

    const confidence = learningAdj.isChosenPack
      ? Math.max(baseConfidence, 82)
      : Math.max(0, Math.min(100, baseConfidence));

    const matchedColsList = Object.values(roleMapping).slice(0, 5);
    const matchedReasons: string[] = [];
    if (matchedColsList.length > 0) {
      matchedReasons.push(`matched: ${matchedColsList.join(', ')}`);
    }
    if (learningAdj.reasons.length > 0) {
      matchedReasons.push(...learningAdj.reasons);
    }

    const isUncertain = confidence < 60;
    const recommendationMessage = isUncertain
      ? 'Not sure, please choose'
      : 'Recommended for your data';

    return {
      packId: pack.id,
      packName: pack.name,
      confidence,
      matchedRoles: roleMapping,
      missingRequiredRoles: reqMissing,
      matchedKeywords: kwHits,
      isUncertain,
      recommendationMessage,
      matchedReasons,
      learnedRuleCount: learningAdj.learnedRuleCount,
      learnedRoles,
    };
  });

  return matches.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const bRoles = Object.keys(b.matchedRoles).length;
    const aRoles = Object.keys(a.matchedRoles).length;
    if (bRoles !== aRoles) return bRoles - aRoles;
    return b.matchedKeywords - a.matchedKeywords;
  });
}

/**
 * Picks the best Analytics Pack for a loaded dataset by ranking candidate packs
 * by highest active-KPI count (and active-KPI ratio), breaking ties by detection confidence.
 */
export function pickBestPackForDataset(
  input:
    | ColumnSchema[]
    | string[]
    | Record<string, any>[]
    | { columns?: (ColumnSchema | string)[]; rows?: Record<string, any>[]; datasetId?: string },
  explicitRows: Record<string, any>[] = []
): PackId {
  const { colNames, rows } = extractColumnNamesAndRows(input, explicitRows);
  const matches = detectPack(colNames, rows);
  if (rows.length === 0 || colNames.length === 0) {
    return matches[0]?.packId || 'financial';
  }

  // If user explicitly chose/learned a pack for this schema, honor it first
  const topMatch = matches[0];
  if (topMatch && getPackLearningAdjustment(topMatch.packId, colNames).isChosenPack) {
    return topMatch.packId;
  }

  const sampleRows = rows.length > 500 ? rows.slice(0, 500) : rows;
  const candidates = matches.filter((m) => m.confidence >= 50).slice(0, 5);
  const pool = candidates.length > 0 ? candidates : matches.slice(0, 3);

  let bestPackId: PackId = pool[0]?.packId || 'financial';
  let bestActiveCount = -1;
  let bestActiveRatio = -1;
  let bestConfidence = -1;

  for (const m of pool) {
    const pack = getPackById(m.packId);
    const kpis = computeKpis(pack, sampleRows, m.matchedRoles);
    const activeCount = kpis.filter((k) => k.status === 'available').length;
    const activeRatio = pack.kpis.length > 0 ? activeCount / pack.kpis.length : 0;

    if (
      activeCount > bestActiveCount ||
      (activeCount === bestActiveCount && activeRatio > bestActiveRatio) ||
      (activeCount === bestActiveCount &&
        Math.abs(activeRatio - bestActiveRatio) < 1e-6 &&
        m.confidence > bestConfidence)
    ) {
      bestActiveCount = activeCount;
      bestActiveRatio = activeRatio;
      bestConfidence = m.confidence;
      bestPackId = m.packId;
    }
  }

  return bestPackId;
}

export function formatKpiMetric(value: number | null, unit: ComputedPackKpi['unit']): string {
  if (value === null || !Number.isFinite(value)) return 'Unavailable';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (unit === 'currency') {
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (unit === 'percent') {
    return `${value.toFixed(1)}%`;
  }
  if (unit === 'ratio') {
    return `${value.toFixed(2)}x`;
  }
  if (unit === 'days') {
    return `${value.toFixed(1)}d`;
  }
  if (unit === 'score') {
    return `${value.toFixed(1)}`;
  }
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${Math.round(abs).toLocaleString('en-US')}`;
}

export function computeKpis(
  packOrId: AnalyticsPackConfig | PackId,
  rows: Record<string, any>[],
  roleMapping: Record<string, string>
): ComputedPackKpi[] {
  const pack = typeof packOrId === 'string' ? getPackById(packOrId) : packOrId;
  const hasRows = rows.length > 0;
  const dateCol = roleMapping.date;
  const mid = Math.floor(rows.length / 2);
  const firstHalf = hasRows && dateCol && rows.length >= 2 ? rows.slice(0, mid) : null;
  const secondHalf = hasRows && dateCol && rows.length >= 2 ? rows.slice(mid) : null;

  return pack.kpis.map((kpi) => {
    const missingRoles = kpi.requiredRoles.filter((r) => !roleMapping[r]);
    const missingColAliases = (missingRoles.length > 0 ? missingRoles : kpi.requiredRoles).map(
      (r) => pack.detect.roleAliases[r]?.[0] || r
    );
    const description = `${kpi.formulaText} (${kpi.source})`;
    const measureType: MeasureType =
      kpi.measureType ||
      inferMeasureType({
        columnName: kpi.title,
        unit: kpi.unit,
      });

    if (!hasRows || missingRoles.length > 0) {
      const mRoles = missingRoles.length > 0 ? missingRoles : kpi.requiredRoles;
      return {
        id: kpi.id,
        title: kpi.title,
        label: kpi.title,
        unit: kpi.unit,
        measureType,
        favorableDirection: kpi.favorableDirection,
        goodDirection: kpi.favorableDirection,
        requiredRoles: kpi.requiredRoles,
        needs: kpi.requiredRoles,
        formulaText: kpi.formulaText,
        source: kpi.source,
        assumption: kpi.assumption,
        description,
        value: null,
        formattedValue: 'Unavailable',
        deltaPct: null,
        changePercent: null,
        isFavorableDelta: null,
        sparkline: [],
        status: 'unavailable',
        missingRoles: mRoles,
        reason: `Missing required role: ${mRoles.join(', ')}`,
        hint: `Add column: ${missingColAliases.join(', ')}`,
        target: kpi.target,
      };
    }

    const rawVal = kpi.formula(rows, roleMapping);
    const val = rawVal !== null && Number.isFinite(rawVal) ? rawVal : null;

    if (val === null) {
      return {
        id: kpi.id,
        title: kpi.title,
        label: kpi.title,
        unit: kpi.unit,
        measureType,
        favorableDirection: kpi.favorableDirection,
        goodDirection: kpi.favorableDirection,
        requiredRoles: kpi.requiredRoles,
        needs: kpi.requiredRoles,
        formulaText: kpi.formulaText,
        source: kpi.source,
        assumption: kpi.assumption,
        description,
        value: null,
        formattedValue: 'Unavailable',
        deltaPct: null,
        changePercent: null,
        isFavorableDelta: null,
        sparkline: [],
        status: 'unavailable',
        missingRoles: kpi.requiredRoles,
        reason: `Invalid or zero denominator for ${kpi.title}`,
        hint: `Add column: ${missingColAliases.join(', ')}`,
        target: kpi.target,
      };
    }

    const periodSeriesRes = computeKpiPeriodSeries(kpi, rows, roleMapping);
    let deltaPct: number | null = periodSeriesRes.prevPeriodDeltaPct;
    let isFavorableDelta: boolean | null = null;
    const sparkline: number[] = periodSeriesRes.sparkline;

    if (deltaPct !== null && Number.isFinite(deltaPct)) {
      const evalDelta = evaluateKpiDelta(deltaPct, kpi.favorableDirection);
      isFavorableDelta = evalDelta.isFavorable;
    } else if (firstHalf && secondHalf && periodSeriesRes.points.length < 2) {
      const firstVal = kpi.formula(firstHalf, roleMapping);
      const secondVal = kpi.formula(secondHalf, roleMapping);
      if (
        firstVal !== null &&
        secondVal !== null &&
        Number.isFinite(firstVal) &&
        Number.isFinite(secondVal) &&
        Math.abs(firstVal) > 1e-9
      ) {
        deltaPct = ((secondVal - firstVal) / Math.abs(firstVal)) * 100;
        const evalDelta = evaluateKpiDelta(deltaPct, kpi.favorableDirection);
        isFavorableDelta = evalDelta.isFavorable;
      }
    }

    return {
      id: kpi.id,
      title: kpi.title,
      label: kpi.title,
      unit: kpi.unit,
      measureType,
      favorableDirection: kpi.favorableDirection,
      goodDirection: kpi.favorableDirection,
      requiredRoles: kpi.requiredRoles,
      needs: kpi.requiredRoles,
      formulaText: kpi.formulaText,
      source: kpi.source,
      assumption: kpi.assumption,
      description,
      value: val,
      formattedValue: formatKpiMetric(val, kpi.unit),
      deltaPct,
      changePercent: deltaPct,
      priorYearDeltaPct: periodSeriesRes.priorYearDeltaPct,
      isFavorableDelta,
      sparkline,
      periodSeries: periodSeriesRes.points,
      status: 'available',
      missingRoles: [],
      target: kpi.target,
    };
  });
}

function aggregateChartRows(
  rows: Record<string, any>[],
  xCol: string,
  yCols: string[],
  agg: 'sum' | 'avg' | 'count'
): Record<string, any>[] {
  const groups = new Map<string, { count: number; sums: Record<string, number> }>();
  const sourceRows = rows.length > 10000 ? sampleRowsForChart(rows, 5000).rows : rows;

  for (const row of sourceRows) {
    const rawKey = row[xCol];
    const key = rawKey !== null && rawKey !== undefined && String(rawKey).trim() !== '' ? String(rawKey) : 'Other';
    let entry = groups.get(key);
    if (!entry) {
      const sums: Record<string, number> = {};
      for (const yc of yCols) sums[yc] = 0;
      entry = { count: 0, sums };
      groups.set(key, entry);
    }
    entry.count += 1;
    for (const yc of yCols) {
      const num = parseRealNumber(row[yc]);
      if (num !== null) entry.sums[yc] += num;
    }
  }

  const result: Record<string, any>[] = [];
  for (const [key, entry] of groups.entries()) {
    const out: Record<string, any> = { [xCol]: key };
    for (const yc of yCols) {
      if (agg === 'count') {
        out[yc] = entry.count;
      } else if (agg === 'avg') {
        out[yc] = entry.count > 0 ? Number((entry.sums[yc] / entry.count).toFixed(2)) : 0;
      } else {
        out[yc] = Number(entry.sums[yc].toFixed(2));
      }
    }
    result.push(out);
  }

  return result.slice(0, 24);
}

/**
 * Builds a complete, lens-ready pack dashboard reusing profileDataset,
 * buildDataModel, and chartRecommendationEngine.
 * Optimized to run in < 500ms even on 100,000+ rows.
 */
export function buildDashboard(
  packOrId: AnalyticsPackConfig | PackId,
  rows: Record<string, any>[],
  userRoleOverrides?: Record<string, string>
): BuiltPackDashboard {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const pack: EnrichedAnalyticsPackConfig =
    typeof packOrId === 'string' ? getPackById(packOrId) : getPackById(packOrId.id);
  const colNames = rows.length > 0 ? Object.keys(rows[0]) : [];
  const roleMapping = inferRoleMapping(pack, colNames, userRoleOverrides);

  // Sample rows for heavy schema/profiling/recommendation passes when rows > 5,000
  const profileRows = rows.length > 5000 ? sampleRowsForChart(rows, 2500).rows : rows;
  const detectedTypes = inferDetectedTypes(colNames, profileRows);
  const schema: ColumnProfile[] =
    profileRows.length > 0 ? profileDataset(colNames, profileRows, detectedTypes) : [];
  const profile: DatasetProfile | null =
    profileRows.length > 0 ? { rowCount: rows.length, columns: schema } : null;

  // Check date format ambiguity on the mapped date column (up to 1,000 sample values)
  let dateWarning: string | null = null;
  const mappedDateCol = roleMapping.date;
  if (mappedDateCol && rows.length > 0) {
    const sampleDateVals = rows.slice(0, 1000).map((r) => r[mappedDateCol]);
    const dateResult = parseAndNormalizeDates(sampleDateVals);
    dateWarning = dateResult.warning;
  }

  // Evaluate KPIs on full dataset
  const kpis = computeKpis(pack, rows, roleMapping);

  // Reuse chartRecommendationEngine to get statistical recommendations
  const firstCat = schema.find((c) => c.dataType !== 'number') || schema[0];
  const firstNum = schema.find((c) => c.dataType === 'number') || schema[1];
  const engineRecommendations: ChartRecommendation[] =
    schema.length > 0
      ? recommendChartsForFields(firstCat?.name || '', firstNum?.name || '', schema, profileRows)
      : [];

  // Evaluate Pack Charts (filtering out charts down-voted via feedback on this dataset)
  const charts: ComputedPackChart[] = pack.charts
    .filter((chartCfg) => !isChartHiddenByFeedback(chartCfg.id, colNames, pack.id))
    .map((chartCfg) => {
      const xCol = roleMapping[chartCfg.xRole] || null;
      const mappedYCols = chartCfg.yRoles.map((yr) => roleMapping[yr]).filter(Boolean);
      const missingRoles = [
        ...(xCol ? [] : [chartCfg.xRole]),
        ...chartCfg.yRoles.filter((yr) => !roleMapping[yr]),
      ];
      const agg = chartCfg.aggregation || 'sum';
      const measureType: MeasureType =
        chartCfg.measureType ||
        inferMeasureType({
          columnName: mappedYCols[0] || chartCfg.title,
          aggregation: agg,
        });

      const validatedTitle = validateChartTitleAndSeries(
        chartCfg.title,
        mappedYCols.length > 0 ? mappedYCols : chartCfg.yRoles,
        xCol || chartCfg.xRole
      ).title;

      let chartType: ComputedPackChart['chartType'] = 'bar';
      if (chartCfg.intent === 'trend') {
        chartType = mappedYCols.length > 1 ? 'area' : 'line';
      } else if (chartCfg.intent === 'composition') {
        chartType = 'donut';
      } else if (chartCfg.intent === 'comparison' || chartCfg.intent === 'Exception') {
        chartType = mappedYCols.length > 1 ? 'composed' : 'bar';
      } else {
        chartType = 'bar';
      }

      if (rows.length === 0 || !xCol || mappedYCols.length === 0) {
        return {
          id: chartCfg.id,
          title: validatedTitle,
          subtitle: chartCfg.subtitle,
          intent: chartCfg.intent,
          chartType,
          type: chartType,
          xColumn: xCol,
          categoryField: xCol || chartCfg.xRole,
          yColumns: mappedYCols,
          valueField: mappedYCols[0] || chartCfg.yRoles[0] || 'value',
          secondaryValueField: mappedYCols[1] || chartCfg.yRoles[1],
          aggregation: agg,
          measureType,
          data: [],
          status: 'unavailable',
          missingRoles,
        };
      }

      const aggregated = aggregateChartRows(rows, xCol, mappedYCols, agg);
      const sampled = sampleRowsForChart(aggregated).rows;

      return {
        id: chartCfg.id,
        title: validatedTitle,
        subtitle: chartCfg.subtitle,
        intent: chartCfg.intent,
        chartType,
        type: chartType,
        xColumn: xCol,
        categoryField: xCol,
        yColumns: mappedYCols,
        valueField: mappedYCols[0],
        secondaryValueField: mappedYCols[1],
        aggregation: agg,
        measureType,
        data: sampled,
        status: 'available',
        missingRoles: [],
      };
    });

  const readyKpis = kpis.filter((k) => k.status === 'available');
  const unmappedRequired = pack.detect.requiredRoles.filter((r) => !roleMapping[r]);
  const executiveNarrative: string[] = [];

  if (rows.length === 0) {
    executiveNarrative.push(
      `No dataset is currently loaded for ${pack.name}. Load the built-in ${pack.sampleDataset.name} sample or upload a CSV/XLSX file with columns matching: ${pack.detect.requiredRoles.join(', ')}.`
    );
  } else {
    const topSummaries = readyKpis.slice(0, 3).map((k) => `${k.title} at ${k.formattedValue}`);
    if (topSummaries.length > 0) {
      executiveNarrative.push(
        `${pack.name} audit across ${rows.length.toLocaleString()} records highlights ${topSummaries.join(', ')}.`
      );
    }

    const favorableMovers = readyKpis.filter((k) => k.deltaPct !== null && k.isFavorableDelta === true);
    const unfavorableMovers = readyKpis.filter((k) => k.deltaPct !== null && k.isFavorableDelta === false);

    if (favorableMovers.length > 0) {
      const best = favorableMovers[0];
      executiveNarrative.push(
        `Positive momentum observed in ${best.title} (${best.deltaPct! >= 0 ? '+' : ''}${best.deltaPct!.toFixed(1)}% period-over-period).`
      );
    }
    if (unfavorableMovers.length > 0) {
      const worst = unfavorableMovers[0];
      executiveNarrative.push(
        `Attention required on ${worst.title}, which shifted ${worst.deltaPct! >= 0 ? '+' : ''}${worst.deltaPct!.toFixed(1)}% against target direction.`
      );
    }
    if (dateWarning) {
      executiveNarrative.push(`Date format advisory: ${dateWarning}`);
    }
    if (unmappedRequired.length > 0) {
      executiveNarrative.push(
        `To unlock full ${pack.name} coverage, map or include columns for: ${unmappedRequired.join(', ')}.`
      );
    }
  }

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    pack,
    packId: pack.id,
    packName: pack.name,
    roleMapping,
    unmappedRequiredRoles: unmappedRequired,
    missingRoles: unmappedRequired,
    kpis,
    computedKpis: kpis,
    charts,
    recommendedCharts: engineRecommendations,
    profile,
    schema,
    executiveNarrative,
    dateWarning,
    computeDurationMs: Math.max(1, Math.round(endTime - startTime)),
  };
}

/**
 * Builds a structured multi-section report from a Pack Dashboard.
 */
export function buildReport(
  packOrId: AnalyticsPackConfig | PackId,
  rows: Record<string, any>[],
  datasetNameOrRoleMap?: string | Record<string, string>,
  userRoleOverrides?: Record<string, string>
): BuiltPackReport {
  const datasetName =
    typeof datasetNameOrRoleMap === 'string' ? datasetNameOrRoleMap : 'active_dataset.csv';
  const roleOverrides =
    typeof datasetNameOrRoleMap === 'object' && datasetNameOrRoleMap !== null
      ? datasetNameOrRoleMap
      : userRoleOverrides;

  const dashboard = buildDashboard(packOrId, rows, roleOverrides);
  const { pack, kpis, charts, schema, roleMapping } = dashboard;
  const modelRows = rows.length > 2000 ? sampleRowsForChart(rows, 1000).rows : rows;
  const model =
    modelRows.length > 0 && schema.length > 0
      ? buildDataModel(datasetName, schema, modelRows)
      : null;

  const readyKpis = kpis.filter((k) => k.status === 'available');
  const unavailableKpis = kpis.filter((k) => k.status === 'unavailable');

  const kpiSummaries = kpis.map((k) => ({
    id: k.id,
    label: k.title,
    formattedValue: k.formattedValue,
    formulaText: k.formulaText,
    source: k.source,
  }));

  const sections = pack.reportSections.map((heading, idx) => {
    if (idx === 0) {
      const body =
        dashboard.executiveNarrative.join(' ') ||
        `Executive briefing for ${pack.name} (${datasetName}).`;
      return {
        heading,
        title: heading,
        body,
        narrative: body,
        highlights: readyKpis.slice(0, 4).map((k) => `${k.title}: ${k.formattedValue} (${k.source})`),
        kpiSummaries: kpiSummaries.slice(0, 4),
      };
    }
    if (idx === 1) {
      const body = `${readyKpis.length} of ${kpis.length} domain KPIs computed from ${rows.length.toLocaleString()} records.`;
      return {
        heading,
        title: heading,
        body,
        narrative: body,
        highlights: kpis.map((k) =>
          k.status === 'available'
            ? `${k.title}: ${k.formattedValue}${k.deltaPct !== null ? ` (${k.deltaPct >= 0 ? '+' : ''}${k.deltaPct.toFixed(1)}%)` : ''} — ${k.source}`
            : `${k.title}: Unavailable (Requires role: ${k.missingRoles.join(', ')})`
        ),
        kpiSummaries,
      };
    }
    if (idx === 2) {
      const readyCharts = charts.filter((c) => c.status === 'available');
      const dimCount = model ? model.tables.filter((t) => t.type === 'dimension').length : 0;
      const body = `Visual analysis spans ${readyCharts.length} domain charts and ${
        dimCount > 0 ? `${dimCount} Kimball dimension tables` : 'mapped analytical dimensions'
      }.`;
      return {
        heading,
        title: heading,
        body,
        narrative: body,
        highlights: readyCharts.map(
          (c) => `${c.title} (${c.intent.toUpperCase()} — ${c.xColumn} vs ${c.yColumns.join(', ')})`
        ),
        kpiSummaries: kpiSummaries.slice(0, 4),
      };
    }
    if (idx === 3) {
      const exceptions = readyKpis.filter(
        (k) =>
          (k.target !== undefined &&
            ((k.favorableDirection === 'up' && (k.value ?? 0) < k.target) ||
              (k.favorableDirection === 'down' && (k.value ?? 0) > k.target))) ||
          k.isFavorableDelta === false
      );
      const body =
        exceptions.length > 0
          ? `${exceptions.length} metric(s) currently trail benchmark targets or show adverse period-over-period variance.`
          : `All active ${pack.name} metrics operate within expected governance thresholds.`;
      return {
        heading,
        title: heading,
        body,
        narrative: body,
        highlights:
          exceptions.length > 0
            ? exceptions.map(
                (e) =>
                  `${e.title}: Current ${e.formattedValue}${
                    e.target !== undefined ? ` vs Target ${formatKpiMetric(e.target, e.unit)}` : ''
                  }`
              )
            : ['Zero critical threshold breaches detected in current slice.'],
        kpiSummaries: kpiSummaries.slice(-4),
      };
    }
    const body = `Actionable governance and data engineering next steps for ${pack.name}.`;
    return {
      heading,
      title: heading,
      body,
      narrative: body,
      highlights: [
        ...(unavailableKpis.length > 0
          ? [
              `Enrich data pipeline with columns for [${Array.from(
                new Set(unavailableKpis.flatMap((u) => u.missingRoles))
              ).join(', ')}] to unlock ${unavailableKpis.length} additional KPIs.`,
            ]
          : ['All pack roles are mapped; schedule automated daily refresh and anomaly alerts.']),
        `Mapped ${Object.keys(roleMapping).length} semantic roles across ${schema.length} dataset columns.`,
      ],
      kpiSummaries: kpiSummaries.slice(0, 4),
    };
  });

  return {
    packId: pack.id,
    packName: pack.name,
    generatedAt: new Date().toISOString(),
    datasetName,
    rowCount: rows.length,
    sections,
    kpis,
  };
}
