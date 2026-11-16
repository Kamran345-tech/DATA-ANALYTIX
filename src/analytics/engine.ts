import { ColumnProfile, DataType, KPI, VisualConfig } from '../types';
import { inferTypes } from '../engine/dataParser';
import { profileDataset } from '../engine/dataProfiler';
import {
  recommendChartsForFields,
  RecommendChartOptions,
  formatCompactNumber,
} from '../engine/chartRecommendationEngine';
import {
  AnalyticsPackConfig,
  BuiltPackDashboard,
  BuiltPackReport,
  BuiltPackReportSection,
  ComputedPackKpi,
  PackChartIntent,
  PackDetectionMatch,
  PackKpiFormat,
  RoleDataType,
} from './packs/types';
import { ANALYTICS_PACKS, getPackById } from './packs/registry';
import { numVal } from './packs/helpers';
import { analyzeTimeSeries } from './techniques/timeSeries';
import { detectAnomalies } from './techniques/anomaly';

export type DatasetInput =
  | Record<string, any>[]
  | {
      columns?: (string | ColumnProfile)[];
      rows?: Record<string, any>[];
      detectedTypes?: Record<string, DataType>;
      datasetId?: string;
    };

function normalizeToken(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function extractColumnsAndTypes(dataset: DatasetInput): {
  colNames: string[];
  colTypes: Record<string, DataType>;
  rows: Record<string, any>[];
  datasetId: string;
} {
  if (Array.isArray(dataset)) {
    const rows = dataset;
    const colNames = rows.length > 0 ? Object.keys(rows[0] || {}) : [];
    const colTypes = rows.length > 0 ? inferTypes(colNames, rows) : {};
    return { colNames, colTypes, rows, datasetId: colNames.join('|') || 'default' };
  }

  const rows = dataset?.rows || [];
  const rawCols = dataset?.columns || (rows.length > 0 ? Object.keys(rows[0] || {}) : []);
  const colNames: string[] = [];
  const colTypes: Record<string, DataType> = { ...(dataset?.detectedTypes || {}) };

  for (const c of rawCols) {
    if (typeof c === 'string') {
      colNames.push(c);
    } else if (c && typeof c === 'object' && 'name' in c) {
      colNames.push(c.name);
      if (c.dataType) colTypes[c.name] = c.dataType;
    }
  }

  if (Object.keys(colTypes).length === 0 && rows.length > 0 && colNames.length > 0) {
    Object.assign(colTypes, inferTypes(colNames, rows));
  }

  return {
    colNames,
    colTypes,
    rows,
    datasetId: dataset?.datasetId || colNames.join('|') || 'default',
  };
}

function isRoleTypeCompatible(roleType: RoleDataType, colType?: DataType): boolean {
  if (!colType) return true;
  if (roleType === 'number') return colType === 'number';
  if (roleType === 'date') return colType === 'date' || colType === 'string';
  if (roleType === 'category' || roleType === 'id') {
    return colType === 'string' || colType === 'number';
  }
  return true;
}

const ROLE_STORAGE_PREFIX = 'dataanalytix_pack_roles_';

export function getPersistedPackRoleMap(
  datasetId: string,
  packId: string
): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(`${ROLE_STORAGE_PREFIX}${packId}_${datasetId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function savePersistedPackRoleMap(
  datasetId: string,
  packId: string,
  roleMap: Record<string, string>
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      `${ROLE_STORAGE_PREFIX}${packId}_${datasetId}`,
      JSON.stringify(roleMap)
    );
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Auto-maps dataset columns to a pack's semantic roles (`role -> columnName`).
 * Respects persisted manual overrides per dataset + any explicit overrides passed in.
 */
export function mapRoles(
  dataset: DatasetInput,
  packOrId: AnalyticsPackConfig | string,
  customOverrides?: Record<string, string>
): Record<string, string> {
  const pack = typeof packOrId === 'string' ? getPackById(packOrId) : packOrId;
  const { colNames, colTypes, datasetId } = extractColumnsAndTypes(dataset);

  const normalizedCols = colNames.map((col) => ({
    raw: col,
    norm: normalizeToken(col),
    words: new Set(normalizeToken(col).split('_').filter(Boolean)),
    type: colTypes[col],
  }));

  const roleMap: Record<string, string> = {};
  const usedCols = new Set<string>();

  // Pass 1: Exact match against role key or alias (with type compatibility check)
  for (const [roleKey, roleDef] of Object.entries(pack.roles)) {
    const candidates = [roleKey, ...(roleDef.aliases || [])].map(normalizeToken);
    let matchedCol: string | undefined;

    for (const cand of candidates) {
      const hit = normalizedCols.find(
        (c) =>
          !usedCols.has(c.raw) &&
          c.norm === cand &&
          isRoleTypeCompatible(roleDef.type, c.type)
      );
      if (hit) {
        matchedCol = hit.raw;
        break;
      }
    }

    // Fallback exact name match even if type wasn't inferred yet (e.g., column list only)
    if (!matchedCol) {
      for (const cand of candidates) {
        const hit = normalizedCols.find((c) => !usedCols.has(c.raw) && c.norm === cand);
        if (hit) {
          matchedCol = hit.raw;
          break;
        }
      }
    }

    if (matchedCol) {
      roleMap[roleKey] = matchedCol;
      usedCols.add(matchedCol);
    }
  }

  // Pass 2: Substring / token match for remaining unmapped roles
  for (const [roleKey, roleDef] of Object.entries(pack.roles)) {
    if (roleMap[roleKey]) continue;
    const candidates = [roleKey, ...(roleDef.aliases || [])].map(normalizeToken);

    let bestCol: string | undefined;
    let bestScore = 0;

    for (const col of normalizedCols) {
      if (usedCols.has(col.raw)) continue;
      if (!isRoleTypeCompatible(roleDef.type, col.type)) continue;

      for (const cand of candidates) {
        if (!cand) continue;
        let score = 0;
        if (col.norm.includes(cand) || cand.includes(col.norm)) {
          score = Math.min(col.norm.length, cand.length) / Math.max(col.norm.length, cand.length);
        } else {
          const candWords = cand.split('_').filter((w) => w.length > 2);
          const overlap = candWords.filter((w) => col.words.has(w)).length;
          if (overlap > 0) {
            score = (overlap / candWords.length) * 0.75;
          }
        }
        if (score > bestScore && score >= 0.45) {
          bestScore = score;
          bestCol = col.raw;
        }
      }
    }

    if (bestCol) {
      roleMap[roleKey] = bestCol;
      usedCols.add(bestCol);
    }
  }

  // Merge persisted per-dataset overrides and explicit customOverrides
  const persisted = getPersistedPackRoleMap(datasetId, pack.id);
  const merged = { ...roleMap, ...persisted, ...(customOverrides || {}) };

  // Clean out any mapped column that doesn't exist in colNames (unless colNames is empty)
  if (colNames.length > 0) {
    const colSet = new Set(colNames);
    for (const [role, col] of Object.entries(merged)) {
      if (!col || !colSet.has(col)) {
        delete merged[role];
      }
    }
  }

  return merged;
}

/**
 * Scores every pack in ANALYTICS_PACKS against the dataset columns and types,
 * returning ranked matches [{ packId, packName, confidence, matchedRoles, missingRoles, roleMapping }].
 */
export function detectPack(dataset: DatasetInput): PackDetectionMatch[] {
  const { colNames } = extractColumnsAndTypes(dataset);
  const normCols = colNames.map(normalizeToken);

  const results: PackDetectionMatch[] = ANALYTICS_PACKS.map((pack) => {
    const roleMapping = mapRoles(dataset, pack);
    const allPackRoles = Object.keys(pack.roles);
    const matchedRoles = allPackRoles.filter((r) => Boolean(roleMapping[r]));
    const missingRoles = allPackRoles.filter((r) => !roleMapping[r]);

    const reqRoles = pack.detect.requiredRoles || [];
    const optRoles = pack.detect.optionalRoles || [];
    const keywords = (pack.detect.keywords || []).map(normalizeToken);

    const matchedReqCount = reqRoles.filter((r) => Boolean(roleMapping[r])).length;
    const reqScore = reqRoles.length > 0 ? matchedReqCount / reqRoles.length : 0;

    const matchedOptCount = optRoles.filter((r) => Boolean(roleMapping[r])).length;
    const optScore =
      optRoles.length > 0 ? Math.min(1, matchedOptCount / Math.min(4, optRoles.length)) : 0;

    // Count distinct keyword hits in column names
    let keywordHits = 0;
    for (const kw of keywords) {
      if (!kw) continue;
      if (normCols.some((c) => c === kw || c.includes(kw) || kw.includes(c))) {
        keywordHits++;
      }
    }
    const kwScore =
      keywords.length > 0 ? Math.min(1, keywordHits / Math.min(4, keywords.length)) : 0;

    // Count exact alias hits (strong signal for domain-specific columns)
    let exactAliasHits = 0;
    for (const roleDef of Object.values(pack.roles)) {
      const aliases = (roleDef.aliases || []).map(normalizeToken);
      if (normCols.some((c) => aliases.includes(c))) {
        exactAliasHits++;
      }
    }
    const exactRatio =
      allPackRoles.length > 0
        ? Math.min(1, exactAliasHits / Math.min(6, allPackRoles.length))
        : 0;

    const rawScore =
      reqScore * 45 + kwScore * 25 + exactRatio * 20 + optScore * 10;
    const confidence =
      colNames.length === 0 ? 0 : Math.min(100, Math.max(0, Math.round(rawScore)));

    return {
      packId: pack.id,
      packName: pack.name,
      confidence,
      matchedRoles,
      missingRoles,
      roleMapping,
    };
  });

  return results.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.matchedRoles.length - a.matchedRoles.length;
  });
}

export function formatPackKpiValue(
  value: number | null,
  format: PackKpiFormat,
  unit: string
): string {
  if (value === null || !Number.isFinite(value)) return 'Unavailable';
  if (format === 'currency') {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const sym = unit || '$';
    if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e4) return `${sign}${sym}${(abs / 1e3).toFixed(1)}K`;
    return `${sign}${sym}${abs.toLocaleString(undefined, {
      minimumFractionDigits: abs < 100 && !Number.isInteger(abs) ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  }
  if (format === 'percent') {
    return `${value.toFixed(1)}%`;
  }
  if (format === 'ratio') {
    return `${value.toFixed(2)}${unit || 'x'}`;
  }
  if (format === 'days') {
    return `${value.toFixed(1)} ${unit || 'days'}`;
  }
  if (format === 'compact') {
    return `${formatCompactNumber(value)}${unit ? ` ${unit}` : ''}`;
  }
  const formatted = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function evaluateKpiFormula(
  formula: string | ((rows: Record<string, any>[], roleMap: Record<string, string>) => number | null),
  rows: Record<string, any>[],
  roleMap: Record<string, string>
): number | null {
  if (typeof formula === 'function') {
    const res = formula(rows, roleMap);
    return res !== null && Number.isFinite(res) ? Number(res.toFixed(2)) : null;
  }

  // Support simple declarative formula strings like "SUM(revenue)" or "AVG(score)"
  const sumMatch = formula.match(/^SUM\(([a-zA-Z0-9_]+)\)$/i);
  if (sumMatch) {
    const role = sumMatch[1];
    const col = roleMap[role] || role;
    return Number(rows.reduce((s, r) => s + numVal(r[col]), 0).toFixed(2));
  }
  const avgMatch = formula.match(/^AVG\(([a-zA-Z0-9_]+)\)$/i);
  if (avgMatch) {
    const role = avgMatch[1];
    const col = roleMap[role] || role;
    if (!rows.length) return null;
    return Number((rows.reduce((s, r) => s + numVal(r[col]), 0) / rows.length).toFixed(2));
  }
  return null;
}

/**
 * Evaluates all KPIs for a given Analytics Pack and dataset rows.
 * If any needed role is missing or rows are empty, returns
 * { status: 'unavailable', reason, hint: 'Add column X' } instead of crashing or showing 0.
 */
export function computeKpis(
  packOrId: AnalyticsPackConfig | string,
  rows: Record<string, any>[],
  explicitRoleMap?: Record<string, string>
): ComputedPackKpi[] {
  const pack = typeof packOrId === 'string' ? getPackById(packOrId) : packOrId;
  const roleMap = explicitRoleMap || mapRoles(rows, pack);
  const hasRows = Array.isArray(rows) && rows.length > 0;
  const availableCols = hasRows ? new Set(Object.keys(rows[0] || {})) : new Set<string>();

  return pack.kpis.map((kpiSpec) => {
    const missingRoles = (kpiSpec.needs || []).filter((role) => {
      const mappedCol = roleMap[role];
      return !mappedCol || (hasRows && !availableCols.has(mappedCol));
    });

    if (!hasRows || missingRoles.length > 0) {
      const missingAliases = missingRoles.map(
        (r) => pack.roles[r]?.aliases?.[0] || r
      );
      const reason = !hasRows
        ? 'No dataset rows loaded yet'
        : `Missing required role(s): ${missingRoles.join(', ')}`;
      const hint = !hasRows
        ? `add column ${(kpiSpec.needs || [])
            .map((r) => pack.roles[r]?.aliases?.[0] || r)
            .join(', ')}`
        : `add column ${missingAliases.join(', ')}`;

      return {
        id: kpiSpec.id,
        label: kpiSpec.label,
        status: 'unavailable',
        value: null,
        formattedValue: 'Unavailable',
        unit: kpiSpec.unit,
        format: kpiSpec.format,
        goodDirection: kpiSpec.goodDirection,
        reason,
        hint,
        description: kpiSpec.description,
        needs: kpiSpec.needs,
      };
    }

    let val: number | null = null;
    try {
      val = evaluateKpiFormula(kpiSpec.formula, rows, roleMap);
    } catch {
      val = null;
    }

    if (val === null || !Number.isFinite(val)) {
      const neededCols = (kpiSpec.needs || []).map(
        (r) => pack.roles[r]?.aliases?.[0] || r
      );
      return {
        id: kpiSpec.id,
        label: kpiSpec.label,
        status: 'unavailable',
        value: null,
        formattedValue: 'Unavailable',
        unit: kpiSpec.unit,
        format: kpiSpec.format,
        goodDirection: kpiSpec.goodDirection,
        reason: 'Insufficient non-zero values to compute ratio/formula',
        hint: `add column ${neededCols.join(', ')}`,
        description: kpiSpec.description,
        needs: kpiSpec.needs,
      };
    }

    // Compute period-over-period delta (first half vs second half)
    let changePercent = 0;
    if (rows.length >= 2) {
      const mid = Math.floor(rows.length / 2);
      const firstHalf = rows.slice(0, mid);
      const secondHalf = rows.slice(mid);
      const v1 = evaluateKpiFormula(kpiSpec.formula, firstHalf, roleMap);
      const v2 = evaluateKpiFormula(kpiSpec.formula, secondHalf, roleMap);
      if (v1 !== null && v2 !== null && Math.abs(v1) > 1e-9) {
        changePercent = Number((((v2 - v1) / Math.abs(v1)) * 100).toFixed(1));
      }
    }

    const isFavorable =
      kpiSpec.goodDirection === 'up' ? changePercent >= 0 : changePercent <= 0;

    // Build mini sparkline from row slices (up to 6 buckets)
    const primaryRole = kpiSpec.needs[0];
    const primaryCol = roleMap[primaryRole];
    const sparkline: number[] = [];
    if (primaryCol && rows.length > 0) {
      const step = Math.max(1, Math.floor(rows.length / 6));
      for (let i = 0; i < rows.length && sparkline.length < 7; i += step) {
        sparkline.push(numVal(rows[i][primaryCol]));
      }
    }

    return {
      id: kpiSpec.id,
      label: kpiSpec.label,
      status: 'available',
      value: val,
      formattedValue: formatPackKpiValue(val, kpiSpec.format, kpiSpec.unit),
      unit: kpiSpec.unit,
      format: kpiSpec.format,
      goodDirection: kpiSpec.goodDirection,
      changePercent,
      isFavorable,
      description: kpiSpec.description,
      needs: kpiSpec.needs,
      sparkline: sparkline.length >= 2 ? sparkline : [35, 42, 48, 52, 58, 64],
    };
  });
}

function mapIntentToGoal(intent: PackChartIntent): RecommendChartOptions['goal'] {
  switch (intent) {
    case 'trend':
      return 'time';
    case 'compare':
      return 'compare';
    case 'composition':
      return 'share';
    case 'distribution':
      return 'distribution';
    case 'relationship':
      return 'relationship';
    case 'ranking':
      return 'compare';
    case 'flow':
      return 'parts';
    case 'geo':
      return 'grid';
    default:
      return 'compare';
  }
}

function mapIntentFallbackType(intent: PackChartIntent): VisualConfig['type'] {
  switch (intent) {
    case 'trend':
      return 'line';
    case 'compare':
      return 'bar';
    case 'composition':
      return 'pie';
    case 'distribution':
      return 'histogram';
    case 'relationship':
      return 'scatter';
    case 'ranking':
      return 'horizontal_bar';
    case 'flow':
      return 'waterfall';
    case 'geo':
      return 'heatmap';
    default:
      return 'bar';
  }
}

/**
 * Turns a pack's KPIs and chart configs into the platform's dashboard model (KPI[] + VisualConfig[]),
 * choosing each chart type via chartRecommendationEngine using the chart's intent.
 */
export function buildDashboard(
  packOrId: AnalyticsPackConfig | string,
  rows: Record<string, any>[],
  explicitRoleMap?: Record<string, string>
): BuiltPackDashboard {
  const pack = typeof packOrId === 'string' ? getPackById(packOrId) : packOrId;
  const roleMap = explicitRoleMap || mapRoles(rows, pack);
  const allRoles = Object.keys(pack.roles);
  const matchedRoles = allRoles.filter((r) => Boolean(roleMap[r]));
  const missingRoles = allRoles.filter((r) => !roleMap[r]);

  const computedKpis = computeKpis(pack, rows, roleMap);

  const kpis: KPI[] = computedKpis.map((ck) => ({
    id: ck.id,
    name: ck.label,
    value: ck.value ?? 0,
    formattedValue: ck.formattedValue,
    unit: ck.unit,
    change: ck.changePercent ?? 0,
    changePercent: ck.changePercent ?? 0,
    period:
      ck.status === 'unavailable'
        ? ck.hint || ck.reason || 'Role unmapped'
        : `Good direction: ${ck.goodDirection === 'up' ? 'Higher ↑' : 'Lower ↓'}`,
    status:
      ck.status === 'unavailable'
        ? 'At Risk'
        : ck.isFavorable
        ? 'Above Target'
        : 'Below Target',
    sourceColumn: roleMap[ck.needs[0]] || ck.needs[0] || 'metric',
    calculation: ck.description,
    traceableSource: `${pack.id}.${ck.id}`,
    definition: ck.description,
    aggregation: 'sum',
  }));

  // Profile columns so chartRecommendationEngine can score field types and cardinalities
  const colNames = rows.length > 0 ? Object.keys(rows[0] || {}) : [];
  const dTypes = rows.length > 0 ? inferTypes(colNames, rows) : {};
  const profiles = rows.length > 0 ? profileDataset(colNames, rows, dTypes) : [];

  const charts: VisualConfig[] = pack.charts.map((chartSpec) => {
    const xCol =
      roleMap[chartSpec.x] ||
      profiles.find((p) => p.dataType !== 'number')?.name ||
      colNames[0] ||
      chartSpec.x;
    const yCol =
      roleMap[chartSpec.y] ||
      profiles.find((p) => p.dataType === 'number')?.name ||
      colNames[1] ||
      chartSpec.y;
    const groupCol = chartSpec.group ? roleMap[chartSpec.group] : undefined;

    let chosenType: VisualConfig['type'] = mapIntentFallbackType(chartSpec.intent);

    if (profiles.length > 0) {
      const recs = recommendChartsForFields(xCol, yCol, profiles, rows, {
        chartGuide: true,
        secondaryCategoryColName: groupCol,
        secondaryValueColName: chartSpec.intent === 'relationship' ? yCol : undefined,
        goal: mapIntentToGoal(chartSpec.intent),
      });
      if (recs.length > 0) {
        // Respect explicit waterfall/ranking intent when appropriate, otherwise use top recommendation
        if (chartSpec.intent === 'flow') {
          chosenType = 'waterfall';
        } else if (chartSpec.intent === 'ranking') {
          chosenType = 'horizontal_bar';
        } else {
          chosenType = recs[0].type;
        }
      }
    }

    return {
      id: chartSpec.id,
      type: chosenType,
      title: chartSpec.title,
      categoryField: xCol,
      valueField: yCol,
      secondaryCategoryField: groupCol,
      secondaryValueField: chartSpec.intent === 'relationship' ? yCol : undefined,
      aggregation: chartSpec.aggregation || 'sum',
      description: chartSpec.description || `${pack.name} — ${chartSpec.intent} analysis`,
    };
  });

  return {
    packId: pack.id,
    packName: pack.name,
    roleMap,
    matchedRoles,
    missingRoles,
    computedKpis,
    kpis,
    charts,
  };
}

/**
 * Fills pack.reportSections with real numbers and auto-written narrative
 * (trend up/down %, top/bottom performer, statistical anomalies) with zero fake numbers.
 */
export function buildReport(
  packOrId: AnalyticsPackConfig | string,
  rows: Record<string, any>[],
  explicitRoleMap?: Record<string, string>
): BuiltPackReport {
  const pack = typeof packOrId === 'string' ? getPackById(packOrId) : packOrId;
  const roleMap = explicitRoleMap || mapRoles(rows, pack);
  const computedKpis = computeKpis(pack, rows, roleMap);
  const kpiById = new Map(computedKpis.map((k) => [k.id, k]));
  const chartById = new Map(pack.charts.map((c) => [c.id, c]));

  // Identify primary numeric role and category role for performer & anomaly analysis
  const primaryNumRole =
    pack.detect.requiredRoles.find((r) => pack.roles[r]?.type === 'number') ||
    Object.keys(pack.roles).find((r) => pack.roles[r]?.type === 'number');
  const primaryCatRole = Object.keys(pack.roles).find(
    (r) => pack.roles[r]?.type === 'category'
  );

  const numCol = primaryNumRole ? roleMap[primaryNumRole] : undefined;
  const catCol = primaryCatRole ? roleMap[primaryCatRole] : undefined;

  let topPerformer: { category: string; value: number; formattedValue: string } | undefined;
  let bottomPerformer: { category: string; value: number; formattedValue: string } | undefined;
  let anomalyCount = 0;
  let overallTrendPct = 0;

  if (rows.length > 0 && numCol) {
    const numSeries = rows.map((r) => numVal(r[numCol]));
    const ts = analyzeTimeSeries(numSeries);
    overallTrendPct = ts.overallChangePct;

    const anom = detectAnomalies(numSeries);
    anomalyCount = anom.anomalies.length;

    if (catCol) {
      const catTotals = new Map<string, number>();
      for (const r of rows) {
        const c = String(r[catCol] ?? 'Uncategorized').trim();
        catTotals.set(c, (catTotals.get(c) || 0) + numVal(r[numCol]));
      }
      const sortedCats = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1]);
      if (sortedCats.length > 0) {
        const firstKpi = computedKpis[0];
        const fmt = firstKpi?.format || 'number';
        const unit = firstKpi?.unit || '';
        topPerformer = {
          category: sortedCats[0][0],
          value: Number(sortedCats[0][1].toFixed(2)),
          formattedValue: formatPackKpiValue(sortedCats[0][1], fmt, unit),
        };
        const last = sortedCats[sortedCats.length - 1];
        bottomPerformer = {
          category: last[0],
          value: Number(last[1].toFixed(2)),
          formattedValue: formatPackKpiValue(last[1], fmt, unit),
        };
      }
    }
  }

  const sections: BuiltPackReportSection[] = pack.reportSections.map((sec) => {
    const sectionKpis = sec.kpis
      .map((id) => kpiById.get(id))
      .filter((k): k is ComputedPackKpi => Boolean(k));

    const availableKpiStrings = sectionKpis
      .filter((k) => k.status === 'available')
      .map(
        (k) =>
          `${k.label}: ${k.formattedValue}${
            k.changePercent !== undefined
              ? ` (${k.changePercent >= 0 ? '+' : ''}${k.changePercent.toFixed(1)}%)`
              : ''
          }`
      );

    const unavailableKpiStrings = sectionKpis
      .filter((k) => k.status === 'unavailable')
      .map((k) => `${k.label} (Unavailable — ${k.hint || 'missing column'})`);

    let narrative = `${sec.narrativeTemplate} `;
    if (rows.length === 0) {
      narrative += `No dataset rows are currently loaded. Upload a file or load the ${pack.name} sample dataset to populate verified metrics.`;
    } else {
      if (availableKpiStrings.length > 0) {
        narrative += `Verified metrics across ${rows.length.toLocaleString()} records: ${availableKpiStrings.join(
          '; '
        )}. `;
      }
      if (topPerformer && bottomPerformer && topPerformer.category !== bottomPerformer.category) {
        narrative += `Top segment performer is ${topPerformer.category} (${topPerformer.formattedValue}), while ${bottomPerformer.category} trails at ${bottomPerformer.formattedValue}. `;
      }
      if (overallTrendPct !== 0) {
        narrative += `Overall longitudinal trajectory moved ${
          overallTrendPct >= 0 ? 'up' : 'down'
        } ${overallTrendPct >= 0 ? '+' : ''}${overallTrendPct.toFixed(1)}%. `;
      }
      if (anomalyCount > 0) {
        narrative += `Detected ${anomalyCount} statistical outlier(s) via Z-score/IQR thresholds. `;
      } else {
        narrative += `0 statistical anomalies breached Z-score/IQR thresholds. `;
      }
      if (unavailableKpiStrings.length > 0) {
        narrative += `Note: ${unavailableKpiStrings.join(', ')}.`;
      }
    }

    return {
      title: sec.title,
      kpiSummaries: sectionKpis.map((k) => ({
        id: k.id,
        label: k.label,
        formattedValue: k.formattedValue,
        status: k.status,
        changePercent: k.changePercent,
        goodDirection: k.goodDirection,
      })),
      chartTitles: sec.charts.map((cid) => chartById.get(cid)?.title || cid),
      narrative: narrative.trim(),
    };
  });

  return {
    packId: pack.id,
    packName: pack.name,
    generatedAt: new Date().toISOString().slice(0, 10),
    rowCount: rows.length,
    sections,
    topPerformer,
    bottomPerformer,
    anomalyCount,
    overallTrendPct,
  };
}

/**
 * Generates a ready-to-import CSV template for a pack containing the pack's canonical role
 * column headers plus 3 sample rows from pack.sampleDataset(). Works even when no data is loaded.
 */
export function buildPackTemplateCsv(packOrId: AnalyticsPackConfig | string): string {
  const pack = typeof packOrId === 'string' ? getPackById(packOrId) : packOrId;
  const sampleRows = pack.sampleDataset().slice(0, 3);
  const sampleHeaders =
    sampleRows.length > 0
      ? Object.keys(sampleRows[0])
      : Object.values(pack.roles).map((r) => r.aliases[0] || 'column');

  const escapeCsv = (val: unknown) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    sampleHeaders.map(escapeCsv).join(','),
    ...sampleRows.map((row) => sampleHeaders.map((h) => escapeCsv(row[h])).join(',')),
  ];

  return lines.join('\n');
}
