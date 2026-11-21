import { ColumnProfile } from '../../types';
import { MeasureType, PackId } from '../packs/types';
import { parseRealNumber } from '../packs/helpers';

export type SemanticColumnRole =
  | 'id'
  | 'date'
  | 'amount'
  | 'quantity'
  | 'rate'
  | 'category'
  | 'geo'
  | 'text';

export type DetectedUnitCurrency =
  | 'USD'
  | 'PKR/Rs'
  | 'EUR'
  | 'GBP'
  | '%'
  | 'days'
  | 'count'
  | 'score'
  | 'ratio'
  | 'none';

export type TimeGranularity =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'none';

export type FeedbackReasonChip =
  | 'wrong column'
  | 'wrong formula'
  | 'not useful'
  | 'confusing';

export interface ColumnUnderstandingItem {
  columnName: string;
  semanticRole: SemanticColumnRole;
  unit: DetectedUnitCurrency;
  measureType: MeasureType;
  mappedPackRole?: string;
  isLearnedOverride?: boolean;
  nullPct: number;
  distinctCount: number;
}

export interface DatasetUnderstandingProfile {
  datasetFingerprint: string;
  datasetName: string;
  rowCount: number;
  columnCount: number;
  grain: string;
  timeGranularity: TimeGranularity;
  dateColumn: string | null;
  primaryKeyColumns: string[];
  hierarchies: string[];
  columns: ColumnUnderstandingItem[];
  qualityNotes: string[];
}

export interface LearnedAliasRule {
  id: string;
  columnPattern: string; // normalized header name (never a cell value)
  rawColumnName: string; // header name only
  role: string;
  packId: PackId | '*';
  measureType?: MeasureType;
  semanticRole?: SemanticColumnRole;
  count: number;
  lastUsedAt: string;
}

export interface LearnedPackPreference {
  schemaFingerprint: string;
  columnHeaders: string[]; // header names only
  chosenPackId: PackId;
  rejectedPackIds: PackId[];
  count: number;
  lastUsedAt: string;
}

export interface FeedbackEntry {
  id: string;
  targetType: 'pack' | 'insight' | 'chart' | 'slide';
  targetId: string;
  datasetFingerprint: string;
  packId?: string;
  sentiment: 'up' | 'down';
  reason?: FeedbackReasonChip;
  timestamp: string;
}

export interface DatasetColumnOverride {
  semanticRole?: SemanticColumnRole;
  measureType?: MeasureType;
  unit?: DetectedUnitCurrency;
}

export interface AdaptiveLearningStoreState {
  version: 1;
  learningEnabled: boolean;
  aliasRules: LearnedAliasRule[];
  packPreferences: LearnedPackPreference[];
  feedbackEntries: FeedbackEntry[];
  datasetGrainOverrides: Record<string, string>;
  datasetColumnOverrides: Record<string, Record<string, DatasetColumnOverride>>;
  customKpiTitles: Record<string, string>;
}

const LEARNING_STORAGE_KEY = 'dataanalytix_adaptive_learning_v1';

// In-memory fallback so Node/Vitest environments without window.localStorage work seamlessly
let memoryStore: AdaptiveLearningStoreState = createDefaultStore();

function createDefaultStore(): AdaptiveLearningStoreState {
  return {
    version: 1,
    learningEnabled: true,
    aliasRules: [],
    packPreferences: [],
    feedbackEntries: [],
    datasetGrainOverrides: {},
    datasetColumnOverrides: {},
    customKpiTitles: {},
  };
}

export function normalizeHeaderPattern(str: string): string {
  return String(str || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function computeSchemaFingerprint(columnNames: string[]): string {
  const sorted = [...columnNames]
    .map((c) => normalizeHeaderPattern(c))
    .filter(Boolean)
    .sort();
  return sorted.join('|') || 'empty_schema';
}

export function loadLearningStore(): AdaptiveLearningStoreState {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(LEARNING_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryStore = {
          ...createDefaultStore(),
          ...parsed,
        };
        return memoryStore;
      }
    } catch {
      // fallback to memoryStore
    }
  }
  return memoryStore;
}

export function saveLearningStore(state: AdaptiveLearningStoreState): void {
  memoryStore = state;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('dataanalytix:learning-updated'));
    } catch {
      // ignore storage quota errors
    }
  }
}

export function resetAllLearning(): void {
  const fresh = createDefaultStore();
  memoryStore = fresh;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(LEARNING_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('dataanalytix:learning-updated'));
    } catch {
      // ignore
    }
  }
}

export function setLearningEnabled(enabled: boolean): void {
  const store = loadLearningStore();
  saveLearningStore({
    ...store,
    learningEnabled: enabled,
  });
}

/**
 * Records a user's column-to-role mapping correction so future datasets with the same or similar
 * column name map automatically before built-in aliases.
 * PRIVACY: Only stores column header name, semantic role, packId, and timestamp — never row values.
 */
export function recordLearnedColumnMapping(params: {
  rawColumnName: string;
  role: string;
  packId: PackId | '*';
  measureType?: MeasureType;
  semanticRole?: SemanticColumnRole;
}): LearnedAliasRule | null {
  const store = loadLearningStore();
  if (!store.learningEnabled) return null;

  const pattern = normalizeHeaderPattern(params.rawColumnName);
  if (!pattern || !params.role) return null;

  const now = new Date().toISOString();
  const existingIdx = store.aliasRules.findIndex(
    (r) =>
      r.columnPattern === pattern &&
      (r.packId === params.packId || params.packId === '*')
  );

  const updatedRules = [...store.aliasRules];
  let savedRule: LearnedAliasRule;

  if (existingIdx >= 0) {
    const existing = updatedRules[existingIdx];
    savedRule = {
      ...existing,
      rawColumnName: params.rawColumnName,
      role: params.role,
      packId: params.packId,
      measureType: params.measureType ?? existing.measureType,
      semanticRole: params.semanticRole ?? existing.semanticRole,
      count: existing.count + 1,
      lastUsedAt: now,
    };
    updatedRules[existingIdx] = savedRule;
  } else {
    savedRule = {
      id: `rule-${pattern}-${params.packId}-${Date.now()}`,
      columnPattern: pattern,
      rawColumnName: params.rawColumnName,
      role: params.role,
      packId: params.packId,
      measureType: params.measureType,
      semanticRole: params.semanticRole,
      count: 1,
      lastUsedAt: now,
    };
    updatedRules.unshift(savedRule);
  }

  saveLearningStore({
    ...store,
    aliasRules: updatedRules,
  });

  return savedRule;
}

/**
 * Records a user's pack selection or correction for a given dataset schema fingerprint.
 */
export function recordLearnedPackChoice(
  columnNames: string[],
  chosenPackId: PackId,
  rejectedPackId?: PackId
): void {
  const store = loadLearningStore();
  if (!store.learningEnabled || columnNames.length === 0) return;

  const fp = computeSchemaFingerprint(columnNames);
  const now = new Date().toISOString();
  const existingIdx = store.packPreferences.findIndex(
    (p) => p.schemaFingerprint === fp
  );

  const updatedPrefs = [...store.packPreferences];
  if (existingIdx >= 0) {
    const prev = updatedPrefs[existingIdx];
    const rejected = new Set<PackId>(prev.rejectedPackIds || []);
    if (rejectedPackId && rejectedPackId !== chosenPackId) {
      rejected.add(rejectedPackId);
    }
    rejected.delete(chosenPackId);
    updatedPrefs[existingIdx] = {
      ...prev,
      chosenPackId,
      rejectedPackIds: Array.from(rejected),
      count: prev.count + 1,
      lastUsedAt: now,
    };
  } else {
    updatedPrefs.unshift({
      schemaFingerprint: fp,
      columnHeaders: columnNames.slice(0, 40),
      chosenPackId,
      rejectedPackIds:
        rejectedPackId && rejectedPackId !== chosenPackId ? [rejectedPackId] : [],
      count: 1,
      lastUsedAt: now,
    });
  }

  saveLearningStore({
    ...store,
    packPreferences: updatedPrefs,
  });
}

export function deleteLearnedRule(ruleId: string): void {
  const store = loadLearningStore();
  saveLearningStore({
    ...store,
    aliasRules: store.aliasRules.filter((r) => r.id !== ruleId),
  });
}

export function updateLearnedRule(
  ruleId: string,
  updates: Partial<Pick<LearnedAliasRule, 'role' | 'packId' | 'measureType'>>
): void {
  const store = loadLearningStore();
  saveLearningStore({
    ...store,
    aliasRules: store.aliasRules.map((r) =>
      r.id === ruleId ? { ...r, ...updates, lastUsedAt: new Date().toISOString() } : r
    ),
  });
}

/**
 * Finds learned role mappings for a pack and column list BEFORE built-in aliases run.
 */
export function findLearnedRoleMappings(
  packId: PackId,
  columnNames: string[]
): {
  roleToColumn: Record<string, string>;
  learnedColumns: Record<string, LearnedAliasRule>;
} {
  const store = loadLearningStore();
  const roleToColumn: Record<string, string> = {};
  const learnedColumns: Record<string, LearnedAliasRule> = {};

  if (!store.learningEnabled || store.aliasRules.length === 0) {
    return { roleToColumn, learnedColumns };
  }

  // Prioritize pack-specific rules first, then wildcard rules, sorted by count desc
  const applicableRules = store.aliasRules
    .filter((r) => r.packId === packId || r.packId === '*')
    .sort((a, b) => {
      if (a.packId === packId && b.packId !== packId) return -1;
      if (b.packId === packId && a.packId !== packId) return 1;
      return b.count - a.count;
    });

  const usedCols = new Set<string>();
  for (const col of columnNames) {
    const norm = normalizeHeaderPattern(col);
    const matchedRule = applicableRules.find(
      (r) =>
        r.columnPattern === norm ||
        (r.columnPattern.length >= 4 && norm.includes(r.columnPattern))
    );
    if (matchedRule && !roleToColumn[matchedRule.role] && !usedCols.has(col)) {
      roleToColumn[matchedRule.role] = col;
      learnedColumns[matchedRule.role] = matchedRule;
      usedCols.add(col);
    }
  }

  return { roleToColumn, learnedColumns };
}

/**
 * Records thumbs up/down feedback with optional reason chip.
 */
export function recordUserFeedback(params: {
  targetType: 'pack' | 'insight' | 'chart' | 'slide';
  targetId: string;
  columnNames: string[];
  packId?: PackId;
  sentiment: 'up' | 'down';
  reason?: FeedbackReasonChip;
}): FeedbackEntry {
  const store = loadLearningStore();
  const fp = computeSchemaFingerprint(params.columnNames);
  const entry: FeedbackEntry = {
    id: `fb-${params.targetType}-${params.targetId}-${Date.now()}`,
    targetType: params.targetType,
    targetId: params.targetId,
    datasetFingerprint: fp,
    packId: params.packId,
    sentiment: params.sentiment,
    reason: params.reason,
    timestamp: new Date().toISOString(),
  };

  const filtered = store.feedbackEntries.filter(
    (e) =>
      !(
        e.targetType === params.targetType &&
        e.targetId === params.targetId &&
        e.datasetFingerprint === fp &&
        e.packId === params.packId
      )
  );

  // If user down-voted a pack, also record it in packPreferences
  const updatedPrefs = [...store.packPreferences];
  if (params.targetType === 'pack' && params.packId) {
    const idx = updatedPrefs.findIndex((p) => p.schemaFingerprint === fp);
    if (params.sentiment === 'down') {
      if (idx >= 0) {
        const rej = new Set<PackId>(updatedPrefs[idx].rejectedPackIds || []);
        rej.add(params.packId);
        updatedPrefs[idx] = {
          ...updatedPrefs[idx],
          rejectedPackIds: Array.from(rej),
          lastUsedAt: entry.timestamp,
        };
      } else {
        updatedPrefs.unshift({
          schemaFingerprint: fp,
          columnHeaders: params.columnNames.slice(0, 40),
          chosenPackId: 'financial',
          rejectedPackIds: [params.packId],
          count: 1,
          lastUsedAt: entry.timestamp,
        });
      }
    } else if (params.sentiment === 'up') {
      if (idx >= 0) {
        updatedPrefs[idx] = {
          ...updatedPrefs[idx],
          chosenPackId: params.packId,
          rejectedPackIds: (updatedPrefs[idx].rejectedPackIds || []).filter(
            (id) => id !== params.packId
          ),
          count: updatedPrefs[idx].count + 1,
          lastUsedAt: entry.timestamp,
        };
      } else {
        updatedPrefs.unshift({
          schemaFingerprint: fp,
          columnHeaders: params.columnNames.slice(0, 40),
          chosenPackId: params.packId,
          rejectedPackIds: [],
          count: 1,
          lastUsedAt: entry.timestamp,
        });
      }
    }
  }

  saveLearningStore({
    ...store,
    packPreferences: updatedPrefs,
    feedbackEntries: [entry, ...filtered].slice(0, 250),
  });

  return entry;
}

export function getFeedbackForTarget(
  targetType: 'pack' | 'insight' | 'chart' | 'slide',
  targetId: string,
  columnNames: string[],
  packId?: string
): FeedbackEntry | null {
  const store = loadLearningStore();
  const fp = computeSchemaFingerprint(columnNames);
  return (
    store.feedbackEntries.find(
      (e) =>
        e.targetType === targetType &&
        e.targetId === targetId &&
        e.datasetFingerprint === fp &&
        (!packId || e.packId === packId)
    ) || null
  );
}

export function isChartHiddenByFeedback(
  chartId: string,
  columnNames: string[],
  packId?: string
): boolean {
  const fb = getFeedbackForTarget('chart', chartId, columnNames, packId);
  return fb?.sentiment === 'down';
}

/**
 * Computes confidence adjustment for `detectPack` based on learned pack choices,
 * thumbs up/down feedback, and learned alias matches on this schema fingerprint.
 */
export function getPackLearningAdjustment(
  packId: PackId,
  columnNames: string[]
): {
  scoreDelta: number;
  learnedRuleCount: number;
  isChosenPack: boolean;
  isRejectedPack: boolean;
  reasons: string[];
} {
  const store = loadLearningStore();
  if (!store.learningEnabled || columnNames.length === 0) {
    return {
      scoreDelta: 0,
      learnedRuleCount: 0,
      isChosenPack: false,
      isRejectedPack: false,
      reasons: [],
    };
  }

  const fp = computeSchemaFingerprint(columnNames);
  const reasons: string[] = [];
  let scoreDelta = 0;

  // 1. Exact or high-overlap schema fingerprint preference
  const exactPref = store.packPreferences.find((p) => p.schemaFingerprint === fp);
  let isChosenPack = false;
  let isRejectedPack = false;

  if (exactPref) {
    if (exactPref.rejectedPackIds?.includes(packId)) {
      scoreDelta -= 35;
      isRejectedPack = true;
      reasons.push('down-weighted from earlier feedback');
    } else if (exactPref.chosenPackId === packId) {
      scoreDelta += 32;
      isChosenPack = true;
      reasons.push('preferred pack from earlier selection');
    }
  } else {
    // Check partial Jaccard header overlap (>= 60%) with learned pack preferences
    const normSet = new Set(columnNames.map(normalizeHeaderPattern));
    for (const pref of store.packPreferences) {
      const prefNorms = pref.columnHeaders.map(normalizeHeaderPattern);
      const overlap = prefNorms.filter((h) => normSet.has(h)).length;
      const union = new Set([...normSet, ...prefNorms]).size || 1;
      if (overlap / union >= 0.6) {
        if (pref.rejectedPackIds?.includes(packId)) {
          scoreDelta -= 20;
          isRejectedPack = true;
        } else if (pref.chosenPackId === packId) {
          scoreDelta += 22;
          isChosenPack = true;
          reasons.push('matched learned schema pattern');
        }
        break;
      }
    }
  }

  // 2. Count learned column alias rules matching this pack
  const { learnedColumns } = findLearnedRoleMappings(packId, columnNames);
  const learnedRuleCount = Object.keys(learnedColumns).length;
  if (learnedRuleCount > 0) {
    scoreDelta += Math.min(28, learnedRuleCount * 9);
    const cols = Object.values(learnedColumns).map((r) => r.rawColumnName);
    reasons.push(`learned mapping: ${cols.join(', ')}`);
  }

  return {
    scoreDelta,
    learnedRuleCount,
    isChosenPack,
    isRejectedPack,
    reasons,
  };
}

/**
 * Infers the measureType ('additive' | 'average' | 'ratio') of a column or KPI
 * so charts and insights never say "% Share" for averages, days, scores, or ratios.
 */
export function inferMeasureType(params: {
  columnName?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  unit?: string;
}): MeasureType {
  const colNorm = normalizeHeaderPattern(params.columnName || '');
  const unit = (params.unit || '').toLowerCase();

  if (
    unit === 'percent' ||
    unit === '%' ||
    unit === 'ratio' ||
    /(?:^|_)(?:pct|percent|rate|ratio|margin|yield|conversion|churn|retention|roas|roi|utilization|ctr|uptime|sla)(?:_|$)/i.test(
      colNorm
    )
  ) {
    return 'ratio';
  }

  if (
    params.aggregation === 'avg' ||
    unit === 'days' ||
    unit === 'score' ||
    /(?:^|_)(?:days|cycle|lead_time|tat|mttr|mtbf|age|tenure|score|nps|csat|rating|satisfaction|temperature|latency|duration|avg|average|mean|price|unit_cost|salary|wage|cpa|cpc|cac|arpu|aov)(?:_|$)/i.test(
      colNorm
    )
  ) {
    return 'average';
  }

  return 'additive';
}

/**
 * Builds the comprehensive Dataset Understanding Profile (Part B1)
 * including semantic roles, units/currency, time granularity, grain, hierarchies, and measure types.
 */
export function buildDatasetUnderstandingProfile(params: {
  datasetName: string;
  rows: Record<string, any>[];
  columns?: ColumnProfile[];
  roleMapping?: Record<string, string>;
}): DatasetUnderstandingProfile {
  const { datasetName, rows, columns = [], roleMapping = {} } = params;
  const colNames =
    columns.length > 0
      ? columns.map((c) => c.name)
      : rows.length > 0
      ? Object.keys(rows[0])
      : [];

  const fp = computeSchemaFingerprint(colNames);
  const store = loadLearningStore();
  const colOverrides = store.datasetColumnOverrides[fp] || {};
  const reverseRoleMap: Record<string, string> = {};
  for (const [role, col] of Object.entries(roleMapping)) {
    if (col) reverseRoleMap[col] = role;
  }

  const sampleRows = rows.slice(0, 60);
  const items: ColumnUnderstandingItem[] = colNames.map((colName) => {
    const prof = columns.find((c) => c.name === colName);
    const norm = normalizeHeaderPattern(colName);
    const override = colOverrides[colName];

    // Check sample values for currency/percent/date patterns
    let hasDollar = false;
    let hasPkr = false;
    let hasEur = false;
    let hasPercent = false;
    let numericHits = 0;
    let dateHits = 0;
    let nonEmpty = 0;

    for (const r of sampleRows) {
      const v = r?.[colName];
      if (v === null || v === undefined || v === '') continue;
      nonEmpty++;
      const str = String(v).trim();
      if (/\$|usd/i.test(str)) hasDollar = true;
      if (/pkr|rs\.?\s*\d/i.test(str)) hasPkr = true;
      if (/€|eur/i.test(str)) hasEur = true;
      if (/%/.test(str)) hasPercent = true;
      if (parseRealNumber(v) !== null) numericHits++;
      if (
        /^\d{4}-\d{2}(-\d{2})?/.test(str) ||
        /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)
      ) {
        dateHits++;
      }
    }

    const isNumeric =
      prof?.dataType === 'number' || (nonEmpty > 0 && numericHits / nonEmpty >= 0.65);
    const isDate =
      prof?.dataType === 'date' ||
      /date|time|month|year|period|tareekh|quarter|week/i.test(norm) ||
      (nonEmpty > 0 && dateHits / nonEmpty >= 0.65);

    let semanticRole: SemanticColumnRole = 'category';
    if (isDate) {
      semanticRole = 'date';
    } else if (
      prof?.isPrimaryKeyCandidate ||
      /(^|_)(id|uuid|code|key|sku|ticket|order_no|emp_id|patient_id|student_id)($|_)/i.test(norm)
    ) {
      semanticRole = 'id';
    } else if (
      /(region|country|city|state|territory|location|warehouse|site|store|zone|mulk|shahar)/i.test(
        norm
      )
    ) {
      semanticRole = 'geo';
    } else if (isNumeric) {
      if (
        hasPercent ||
        /(?:^|_)(?:pct|percent|rate|ratio|margin|discount|yield|churn|conversion|roas|roi|sla|score|nps|csat|ctr)(?:_|$)/i.test(
          norm
        )
      ) {
        semanticRole = 'rate';
      } else if (
        /(?:^|_)(?:qty|quantity|count|units|volume|headcount|visits|clicks|impressions|sessions|deals|opportunities|leads|accounts|orders|tickets|patients|students|hours|days|taadad)(?:_|$)/i.test(
          norm
        )
      ) {
        semanticRole = 'quantity';
      } else {
        semanticRole = 'amount';
      }
    } else if ((prof?.distinctCount || 0) > Math.max(30, rows.length * 0.7)) {
      semanticRole = 'text';
    } else {
      semanticRole = 'category';
    }

    let unit: DetectedUnitCurrency = 'none';
    if (hasPkr || /(pkr|rupee|rs\b)/i.test(norm)) unit = 'PKR/Rs';
    else if (hasEur || /\beur\b/i.test(norm)) unit = 'EUR';
    else if (
      isNumeric &&
      (hasDollar ||
        semanticRole === 'amount' ||
        /(usd|revenue|sales|cost|cogs|opex|expense|profit|budget|spend|price|arr|mrr|pipeline|quota|salary|payroll|amdani|kharcha|qeemat)/i.test(
          norm
        ))
    ) {
      unit = 'USD';
    } else if (hasPercent || semanticRole === 'rate') {
      unit = '%';
    } else if (isNumeric && /(?:^|_)(?:days|cycle|lead_time|tat|tenure|age)(?:_|$)/i.test(norm)) {
      unit = 'days';
    } else if (isNumeric && /(?:^|_)(?:score|nps|csat|rating)(?:_|$)/i.test(norm)) {
      unit = 'score';
    } else if (semanticRole === 'quantity') {
      unit = 'count';
    }

    const measureType: MeasureType =
      override?.measureType ||
      inferMeasureType({
        columnName: colName,
        unit:
          unit === '%'
            ? 'percent'
            : unit === 'days'
            ? 'days'
            : unit === 'score'
            ? 'score'
            : 'currency',
      });

    return {
      columnName: colName,
      semanticRole: override?.semanticRole || semanticRole,
      unit: override?.unit || unit,
      measureType,
      mappedPackRole: reverseRoleMap[colName],
      isLearnedOverride: Boolean(override),
      nullPct: Number((prof?.nullPercentage || 0).toFixed(1)),
      distinctCount: prof?.distinctCount || 0,
    };
  });

  // Detect time granularity from date column
  const dateCol = items.find((i) => i.semanticRole === 'date')?.columnName || null;
  let timeGranularity: TimeGranularity = 'none';
  if (dateCol && rows.length >= 2) {
    const parsedDates = rows
      .slice(0, 30)
      .map((r) => Date.parse(String(r[dateCol] ?? '')))
      .filter((d) => !isNaN(d))
      .sort((a, b) => a - b);
    if (parsedDates.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < parsedDates.length; i++) {
        const diffDays = (parsedDates[i] - parsedDates[i - 1]) / (1000 * 60 * 60 * 24);
        if (diffDays > 0) diffs.push(diffDays);
      }
      const medianDays = diffs.length > 0 ? diffs[Math.floor(diffs.length / 2)] : 30;
      if (medianDays <= 2) timeGranularity = 'daily';
      else if (medianDays <= 10) timeGranularity = 'weekly';
      else if (medianDays <= 45) timeGranularity = 'monthly';
      else if (medianDays <= 120) timeGranularity = 'quarterly';
      else timeGranularity = 'yearly';
    } else {
      timeGranularity = 'monthly';
    }
  }

  // Detect grain ("One row = one <entity/event>")
  const pkCols = items
    .filter((i) => i.semanticRole === 'id')
    .map((i) => i.columnName);
  const catCols = items
    .filter((i) => i.semanticRole === 'category' || i.semanticRole === 'geo')
    .map((i) => i.columnName);

  let defaultGrain = `One row = one ${datasetName} record`;
  if (pkCols.length > 0 && dateCol) {
    defaultGrain = `One row = one ${pkCols[0]} transaction on ${dateCol} (${timeGranularity})`;
  } else if (dateCol && catCols.length > 0) {
    defaultGrain = `One row = one ${catCols[0]} summary per ${timeGranularity} period (${dateCol})`;
  } else if (pkCols.length > 0) {
    defaultGrain = `One row = one ${pkCols[0]} entity record`;
  }

  const grain = store.datasetGrainOverrides[fp] || defaultGrain;

  // Detect hierarchies (e.g. Region > Country, Category > Subcategory, Department > Role)
  const hierarchies: string[] = [];
  const geoItems = items.filter((i) => i.semanticRole === 'geo');
  if (geoItems.length >= 2) {
    const sortedGeo = [...geoItems].sort((a, b) => a.distinctCount - b.distinctCount);
    hierarchies.push(`${sortedGeo[0].columnName} > ${sortedGeo[1].columnName}`);
  }
  const catItems = items.filter((i) => i.semanticRole === 'category');
  if (catItems.length >= 2) {
    const sortedCat = [...catItems].sort((a, b) => a.distinctCount - b.distinctCount);
    if (
      sortedCat[0].distinctCount > 0 &&
      sortedCat[1].distinctCount > sortedCat[0].distinctCount
    ) {
      hierarchies.push(`${sortedCat[0].columnName} > ${sortedCat[1].columnName}`);
    }
  }

  const qualityNotes: string[] = [];
  const nullCols = items.filter((i) => i.nullPct > 0);
  if (nullCols.length > 0) {
    qualityNotes.push(
      `${nullCols.length} column(s) contain missing values (${nullCols
        .map((c) => `${c.columnName}: ${c.nullPct}%`)
        .join(', ')})`
    );
  } else {
    qualityNotes.push('100% non-null completeness across profiled fields');
  }

  return {
    datasetFingerprint: fp,
    datasetName,
    rowCount: rows.length,
    columnCount: colNames.length,
    grain,
    timeGranularity,
    dateColumn: dateCol,
    primaryKeyColumns: pkCols,
    hierarchies,
    columns: items,
    qualityNotes,
  };
}

export function saveDatasetColumnOverride(
  columnNames: string[],
  targetColumn: string,
  override: DatasetColumnOverride,
  packId: PackId | '*' = '*'
): void {
  const store = loadLearningStore();
  const fp = computeSchemaFingerprint(columnNames);
  const existingForDataset = store.datasetColumnOverrides[fp] || {};
  const mergedOverride: DatasetColumnOverride = {
    ...(existingForDataset[targetColumn] || {}),
    ...override,
  };

  saveLearningStore({
    ...store,
    datasetColumnOverrides: {
      ...store.datasetColumnOverrides,
      [fp]: {
        ...existingForDataset,
        [targetColumn]: mergedOverride,
      },
    },
  });

  if (override.semanticRole || override.measureType) {
    recordLearnedColumnMapping({
      rawColumnName: targetColumn,
      role: override.semanticRole || 'metric',
      packId,
      measureType: override.measureType,
      semanticRole: override.semanticRole,
    });
  }
}

export function saveDatasetGrainOverride(
  columnNames: string[],
  newGrain: string
): void {
  const store = loadLearningStore();
  const fp = computeSchemaFingerprint(columnNames);
  saveLearningStore({
    ...store,
    datasetGrainOverrides: {
      ...store.datasetGrainOverrides,
      [fp]: newGrain,
    },
  });
}

/**
 * Exports learned rules as a privacy-safe JSON string containing zero row cell values.
 */
export function exportLearningJson(): string {
  const store = loadLearningStore();
  return JSON.stringify(
    {
      version: store.version,
      exportedAt: new Date().toISOString(),
      privacyGuarantee: 'Contains schema column patterns and role preferences only. Zero row cell values.',
      aliasRules: store.aliasRules,
      packPreferences: store.packPreferences,
      feedbackEntries: store.feedbackEntries,
    },
    null,
    2
  );
}

/**
 * Verifies that zero cell values from `rows` (that aren't also column header names or standard enum tokens)
 * appear anywhere in the serialized learning store (Part B4 & B6 privacy invariant).
 */
export function verifyZeroRowValuesInLearningStore(
  rows: Record<string, any>[],
  columnNames: string[]
): { passed: boolean; leakedValues: string[] } {
  const serialized = exportLearningJson().toLowerCase();
  const headerTokens = new Set(
    columnNames.flatMap((c) => [
      c.toLowerCase(),
      normalizeHeaderPattern(c).toLowerCase(),
    ])
  );
  const safeReserved = new Set([
    'id',
    'date',
    'amount',
    'quantity',
    'rate',
    'category',
    'geo',
    'text',
    'up',
    'down',
    'sum',
    'avg',
    'count',
    'ratio',
    'additive',
    'average',
    'financial',
    'sales',
    'marketing',
    'operations',
    'hr',
    'ecommerce',
    'saas',
    'healthcare',
    'education',
    'manufacturing',
    'banking',
    'social',
    'support',
    'energy',
  ]);

  const leakedValues: string[] = [];
  for (const row of rows.slice(0, 50)) {
    for (const val of Object.values(row)) {
      if (val === null || val === undefined) continue;
      const str = String(val).trim().toLowerCase();
      // Check non-trivial cell values (length >= 6, not a header token or reserved word)
      if (
        str.length >= 6 &&
        !headerTokens.has(str) &&
        !safeReserved.has(str) &&
        !/^\d{1,4}$/.test(str)
      ) {
        if (serialized.includes(`"${str}"`)) {
          leakedValues.push(str);
        }
      }
    }
  }

  return {
    passed: leakedValues.length === 0,
    leakedValues,
  };
}
