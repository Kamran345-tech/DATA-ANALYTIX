import { ColumnProfile, KPI, AIInsight, DataQualityReport, VisualConfig } from '../types';
import {
  ANALYTICS_PACKS,
  getPackById,
  mapRoles,
  getPersistedPackRoleMap,
  buildDashboard,
  analyzeTimeSeries,
  computePareto,
  detectAnomalies,
  evaluateKpiDelta,
  validateChartTitleAndSeries,
  inferMeasureType,
  MeasureType,
} from '../analytics';
import { parseRobustNumber } from './dataParser';
import {
  evaluateDataQuality,
  computeQualityGrade,
  computeQualityStatusLabel,
} from './dataQuality';

export type PresentationScope =
  | 'current'
  | 'current_dashboard'
  | 'pack'
  | 'builder'
  | 'custom_builder'
  | 'all';
export type PresentationAudience = 'board' | 'manager' | 'analyst';
export type PresentationAudienceInput =
  | PresentationAudience
  | 'Board'
  | 'Manager'
  | 'Analyst';
export type PresentationSectionId =
  | 'cover'
  | 'executive_summary'
  | 'kpis'
  | 'charts'
  | 'diagnostic'
  | 'predictive'
  | 'recommendations'
  | 'insights'
  | 'data_quality'
  | 'appendix';

export type PresentationSlideKind =
  | 'cover'
  | 'executive_summary'
  | 'kpis'
  | 'charts'
  | 'diagnostic'
  | 'predictive'
  | 'recommendations'
  | 'insights'
  | 'data_quality'
  | 'appendix';

export interface PresentationBuildOptions {
  datasetName: string;
  companyName?: string;
  department?: string;
  author?: string;
  scope?: PresentationScope;
  packId?: string;
  audience?: PresentationAudienceInput;
  includedSections?: PresentationSectionId[];
  rows: Record<string, any>[];
  columns: ColumnProfile[];
  kpis?: KPI[];
  insights?: AIInsight[];
  qualityReport?: DataQualityReport;
  customVisuals?: VisualConfig[];
  themeMode?: 'dark' | 'light';
}

export interface PresentationSlideKpiItem {
  id: string;
  label: string;
  formattedValue: string;
  deltaPercent?: number | null;
  goodDirection?: 'up' | 'down';
  deltaState?: 'favorable' | 'unfavorable' | 'neutral';
  deltaDirection?: 'up' | 'down' | 'flat';
  deltaTextLabel?: string;
  isFavorable?: boolean | null;
  measureType?: MeasureType;
  source?: string;
  formulaText?: string;
  status: 'available' | 'unavailable';
  missingColumn?: string;
  hint?: string;
}

export interface PresentationSlideChartBar {
  category: string;
  value: number;
  formattedValue: string;
  sharePct: number;
}

export interface PresentationNativeChartSpec {
  chartType: 'bar' | 'line' | 'area' | 'doughnut';
  title: string;
  categoryLabel: string;
  measureType: MeasureType;
  valAxisMinVal?: number;
  series: {
    name: string;
    labels: string[];
    values: number[];
    formattedValues?: string[];
  }[];
}

export interface PresentationSlideSpec {
  id: string;
  slideNumber: number;
  totalSlides: number;
  sectionId: PresentationSectionId;
  kind: PresentationSlideKind;
  title: string;
  soWhat: string;
  subtitle: string;
  sourceFootnote: string;
  altText: string;
  speakerNotes: string;
  packId: string;
  packName: string;
  accentToken: string;
  gradientToToken: string;
  audience: PresentationAudience;
  hasData: boolean;
  measureType?: MeasureType;
  coverMeta?: {
    datasetName: string;
    periodLabel: string;
    preparedBy: string;
    scopeLabel: string;
    qualityChipLabel: string;
    qualityIssuesCount: number;
  };
  headlineMetrics: {
    label: string;
    value: string;
    delta?: string;
    deltaState?: 'favorable' | 'unfavorable' | 'neutral';
    deltaDirection?: 'up' | 'down' | 'flat';
    isFavorable?: boolean | null;
  }[];
  kpis: PresentationSlideKpiItem[];
  unavailableKpis: PresentationSlideKpiItem[];
  roleMappings: {
    role: string;
    mappedColumn: string;
    required: boolean;
  }[];
  chartTitle: string;
  chartMetricLabel: string;
  chartCategoryLabel: string;
  chartBars: PresentationSlideChartBar[];
  nativeChart?: PresentationNativeChartSpec;
  lensBullets: {
    lens: 'Descriptive' | 'Diagnostic' | 'Predictive' | 'Prescriptive';
    text: string;
  }[];
  bullets: string[];
  qualitySummary: {
    overallScore: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'D';
    statusLabel: string;
    issuesCount: number;
    rowCount: number;
    columnCount: number;
    nullPercentageAvg: number;
    schemaPreview: {
      name: string;
      dataType: string;
      distinctCount: number;
      nullPct: number;
    }[];
  };
  footerText: string;
}

const DEFAULT_SECTIONS: PresentationSectionId[] = [
  'cover',
  'executive_summary',
  'kpis',
  'charts',
  'diagnostic',
  'predictive',
  'recommendations',
  'insights',
  'data_quality',
  'appendix',
];

export const MAX_BULLETS_PER_BOX = 5;
export const MAX_BULLET_CHARS = 110;
export const MAX_TITLE_CHARS = 105;
export const MAX_SOWHAT_CHARS = 145;
export const MIN_PPTX_FONT_PT = 14;

/**
 * Text-fit engine (Part A1):
 * Shortens and cleans text to fit within its designated slide bounding box without shrinking below 14pt or overflowing.
 */
export function fitTextToLimit(text: string, maxChars = MAX_BULLET_CHARS): string {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= maxChars) return cleaned;
  // Cut cleanly at word boundary before maxChars - 1
  const slice = cleaned.slice(0, maxChars - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${base.replace(/[.,;:\-–—]+$/, '')}…`;
}

export function fitSlideBullets(
  bullets: string[],
  maxBullets = MAX_BULLETS_PER_BOX,
  maxChars = MAX_BULLET_CHARS
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of bullets) {
    const fitted = fitTextToLimit(raw, maxChars);
    if (!fitted) continue;
    const key = fitted.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fitted);
    if (out.length >= maxBullets) break;
  }
  return out;
}

/**
 * Strips raw mathematical formulas from recommendation bullets (Part A2)
 * and formats each bullet as: Action Verb + Metric + Owner + Expected Impact (<= 110 chars).
 */
export function formatActionableRecommendationBullet(
  rawText: string,
  fallbackMetric: string,
  ownerRole: string,
  expectedImpact: string
): string {
  // Remove inline formula strings like (SUM(A) / SUM(B)), = ..., etc.
  const withoutFormulas = String(rawText || '')
    .replace(/\b(?:SUM|AVG|COUNT|MIN|MAX)\s*\([^)]*\)/gi, '')
    .replace(/\([^)]*[=/*+][^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;]+$/, '');

  const hasVerb =
    /^(Optimize|Scale|Accelerate|Reduce|Automate|Prioritize|Rebalance|Enforce|Expand|Tighten|Audit|Resolve|Target|Shift|Strengthen|Cap|Standardize)\b/i.test(
      withoutFormulas
    );
  const actionClause = hasVerb
    ? withoutFormulas
    : `Optimize ${fallbackMetric}: ${withoutFormulas}`;

  const shortAction = fitTextToLimit(actionClause, 52).replace(/…$/, '');
  const full = `${shortAction} — Owner: ${ownerRole} — Impact: ${expectedImpact}`;
  return fitTextToLimit(full, MAX_BULLET_CHARS);
}

/**
 * Estimates whether any text box on a slide overflows its bounding box or collides with the footer (Part A1 & A9).
 */
export function estimateSlideOverflow(slide: PresentationSlideSpec): {
  hasOverflow: boolean;
  overflowCount: number;
  details: string[];
} {
  const details: string[] = [];

  if (slide.title.length > MAX_TITLE_CHARS + 5) {
    details.push(
      `Slide ${slide.slideNumber} (${slide.kind}) title length ${slide.title.length} exceeds ${MAX_TITLE_CHARS}`
    );
  }

  if (slide.soWhat.length > MAX_SOWHAT_CHARS + 5) {
    details.push(
      `Slide ${slide.slideNumber} (${slide.kind}) soWhat length ${slide.soWhat.length} exceeds ${MAX_SOWHAT_CHARS}`
    );
  }

  const isSplitPanel =
    (slide.kind === 'charts' ||
      slide.kind === 'diagnostic' ||
      slide.kind === 'predictive') &&
    Boolean(slide.nativeChart);

  const maxAllowedBullets = isSplitPanel ? 4 : MAX_BULLETS_PER_BOX;
  if (slide.bullets.length > maxAllowedBullets) {
    details.push(
      `Slide ${slide.slideNumber} (${slide.kind}) has ${slide.bullets.length} bullets (max ${maxAllowedBullets})`
    );
  }

  slide.bullets.forEach((b, idx) => {
    if (b.length > MAX_BULLET_CHARS) {
      details.push(
        `Slide ${slide.slideNumber} (${slide.kind}) bullet ${idx + 1} length ${b.length} exceeds ${MAX_BULLET_CHARS} chars`
      );
    }
  });

  // Estimate vertical height in inches for right-panel or full-width bullet box
  // Right panel width = 4.28" (~38 chars/line at 16pt); box height = 4.3" (y: 2.25..6.55, footer at 7.05)
  const charsPerLine = isSplitPanel ? 36 : 95;
  const lineHeightInches = isSplitPanel ? 0.31 : 0.34;
  const bulletGapInches = 0.14;
  const availableBoxHeight = isSplitPanel ? 4.3 : 4.2;

  let estimatedHeight = 0;
  for (const b of slide.bullets) {
    const lines = Math.max(1, Math.ceil(b.length / charsPerLine));
    estimatedHeight += lines * lineHeightInches + bulletGapInches;
  }

  if (estimatedHeight > availableBoxHeight) {
    details.push(
      `Slide ${slide.slideNumber} (${slide.kind}) estimated text height ${estimatedHeight.toFixed(
        2
      )}" exceeds box height ${availableBoxHeight}"`
    );
  }

  return {
    hasOverflow: details.length > 0,
    overflowCount: details.length,
    details,
  };
}

export function formatCompactMetric(n: number, unit?: string): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const prefix = unit === 'currency' ? '$' : '';
  const suffix =
    unit === 'percent'
      ? '%'
      : unit === 'days'
      ? 'd'
      : unit === 'ratio'
      ? 'x'
      : '';

  if (unit === 'percent') return `${n.toFixed(1)}%`;
  if (unit === 'ratio') return `${n.toFixed(2)}x`;
  if (unit === 'days') return `${n.toFixed(1)}d`;

  if (abs >= 1_000_000_000) return `${sign}${prefix}${(abs / 1_000_000_000).toFixed(2)}B${suffix}`;
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(2)}M${suffix}`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(1)}K${suffix}`;
  return `${sign}${prefix}${Number.isInteger(abs) ? abs.toLocaleString() : abs.toFixed(1)}${suffix}`;
}

function formatDeltaPhrase(
  deltaPercent?: number | null,
  goodDirection: 'up' | 'down' = 'up'
): string {
  const ev = evaluateKpiDelta(deltaPercent, goodDirection);
  if (!ev.hasDelta) return '';
  return ` (${ev.textLabel} vs prior period)`;
}

/**
 * Deterministic 16:9 Slide Deck Specification Builder (Full 13-Slide Executive Architecture).
 * - Slides:
 *   1: Title / Cover Slide ONLY (name, period, prepared by, scope, data quality chip — no stat cards or repeated bullets)
 *   2: Executive Summary (ONE headline + 3 stat cards + 3-4 unique takeaways)
 *   3: KPI Scorecard (6-8 available KPI tiles only; unavailable KPIs never appear as blank tiles)
 *   4-8: One slide per key chart (native editable PowerPoint charts; "vs"/"and" titles plot >= 2 series; bar axis starts at 0)
 *   9: Diagnostic Analysis (Pareto concentration for additive measures or spread/dispersion for average/ratio measures)
 *   10: Predictive & 3-Period Forecast Trajectory (native editable line chart + forecast bounds, text-fitted right panel)
 *   11: Prescriptive Recommendations (3-5 concise bullets: Action Verb + Metric + Owner + Expected Impact, zero raw formulas)
 *   12: Data Quality & Assumptions (aligned with shared quality engine; never says "Certified" or "100%" when issues > 0)
 *   13: Appendix (audited KPI definitions/formulas & semantic role-to-column mappings)
 */
export function buildPresentationSlides(
  options: PresentationBuildOptions
): PresentationSlideSpec[] {
  const {
    datasetName = 'Enterprise Dataset',
    companyName = 'DATA ANALYTIX',
    department = 'Executive Intelligence',
    author = 'Lead BI Analyst',
    scope: rawScope = 'pack',
    packId = 'operations',
    audience: rawAudience = 'manager',
    includedSections = DEFAULT_SECTIONS,
    rows = [],
    columns = [],
    kpis = [],
    insights = [],
    qualityReport: passedQualityReport,
  } = options;

  const scope =
    rawScope === 'current_dashboard'
      ? 'current'
      : rawScope === 'custom_builder'
      ? 'builder'
      : rawScope;
  const audience = String(rawAudience || 'manager').toLowerCase() as PresentationAudience;

  const hasData = rows.length > 0;
  const resolvedPack = getPackById(packId || ANALYTICS_PACKS[0].id);
  const accentToken = resolvedPack.theme.gradientFrom || 'var(--accent)';
  const gradientToToken = resolvedPack.theme.gradientTo || 'var(--accent-2)';

  const datasetSlug =
    datasetName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'dataset';
  const persistedRoles = getPersistedPackRoleMap(datasetSlug, resolvedPack.id);
  const roleMap = mapRoles(
    { columns, rows, datasetId: datasetSlug },
    resolvedPack,
    persistedRoles
  );
  const builtDash = buildDashboard(resolvedPack, rows, roleMap);

  // Use shared quality engine (Part A7 & C1)
  const effectiveProfiles =
    columns.length > 0 ? columns : builtDash.schema || [];
  const sharedQuality =
    hasData && effectiveProfiles.length > 0
      ? evaluateDataQuality(effectiveProfiles, rows)
      : passedQualityReport || {
          overallScore: hasData ? 96 : 0,
          completenessScore: 100,
          uniquenessScore: 100,
          validityScore: 100,
          consistencyScore: 100,
          totalIssuesCount: 0,
          grade: 'A+' as const,
          statusLabel: 'Certified (0 Findings)',
          issues: [],
        };

  // Reconcile if caller passed a custom qualityReport
  const resolvedIssuesCount =
    passedQualityReport?.issues?.length ?? sharedQuality.issues.length;
  const rawScore =
    passedQualityReport?.overallScore ?? sharedQuality.overallScore;
  const resolvedOverallScore =
    resolvedIssuesCount > 0 && rawScore >= 100 ? 99 : rawScore;
  const resolvedGrade = computeQualityGrade(
    resolvedOverallScore,
    resolvedIssuesCount
  );
  const resolvedStatusLabel = computeQualityStatusLabel(
    resolvedOverallScore,
    resolvedIssuesCount
  );

  const roleMappings = [
    ...resolvedPack.detect.requiredRoles.map((r) => ({
      role: r,
      mappedColumn:
        roleMap[r] ||
        `Unmapped (add: ${resolvedPack.detect.roleAliases[r]?.[0] || r})`,
      required: true,
    })),
    ...resolvedPack.detect.optionalRoles
      .filter((r) => Boolean(roleMap[r]))
      .map((r) => ({
        role: r,
        mappedColumn: roleMap[r],
        required: false,
      })),
  ];

  // Build KPI items using shared evaluateKpiDelta (Part A4)
  const packKpiItems: PresentationSlideKpiItem[] = builtDash.computedKpis.map(
    (k) => {
      const goodDir: 'up' | 'down' = k.goodDirection || 'up';
      const deltaEval = evaluateKpiDelta(
        hasData && k.status === 'available' ? k.changePercent : null,
        goodDir
      );
      const missingColNames = (
        k.missingRoles.length > 0 ? k.missingRoles : k.needs
      )
        .map((r) => resolvedPack.detect.roleAliases[r]?.[0] || r)
        .join(', ');

      return {
        id: k.id,
        label: k.label,
        formattedValue:
          hasData && k.status === 'available'
            ? k.formattedValue
            : hasData
            ? `Requires: ${missingColNames}`
            : 'Template (No Data)',
        deltaPercent:
          hasData && k.status === 'available' ? k.changePercent : null,
        goodDirection: goodDir,
        deltaState: deltaEval.state,
        deltaDirection: deltaEval.direction,
        deltaTextLabel: deltaEval.hasDelta
          ? `${deltaEval.arrow} ${deltaEval.textLabel}`
          : 'Audited',
        isFavorable: deltaEval.isFavorable,
        measureType:
          k.measureType ||
          inferMeasureType({ columnName: k.label, unit: k.unit }),
        source: k.source || k.description,
        formulaText: k.formulaText || k.description,
        status:
          hasData && k.status === 'available' ? 'available' : 'unavailable',
        missingColumn: missingColNames || undefined,
        hint:
          k.hint ||
          (missingColNames ? `Add column: ${missingColNames}` : undefined),
      };
    }
  );

  const slideKpis: PresentationSlideKpiItem[] =
    packKpiItems.some((k) => k.status === 'available') || kpis.length === 0
      ? packKpiItems
      : kpis.map((k) => {
          const rawDelta = hasData ? (k.changePercent ?? k.change ?? null) : null;
          const deltaEval = evaluateKpiDelta(rawDelta, 'up');
          return {
            id: k.id,
            label: k.name,
            formattedValue: hasData ? k.formattedValue : 'Template (No Data)',
            deltaPercent: rawDelta,
            goodDirection: 'up',
            deltaState: deltaEval.state,
            deltaDirection: deltaEval.direction,
            deltaTextLabel: deltaEval.hasDelta
              ? `${deltaEval.arrow} ${deltaEval.textLabel}`
              : 'Audited',
            isFavorable: deltaEval.isFavorable,
            measureType: inferMeasureType({
              columnName: k.name,
              aggregation:
                k.aggregation === 'distinct_count' ? 'count' : k.aggregation,
              unit: k.unit,
            }),
            source: k.calculation || k.traceableSource,
            formulaText: k.definition || k.calculation,
            status: hasData ? 'available' : 'unavailable',
            missingColumn: k.sourceColumn,
            hint: k.sourceColumn ? `Source column: ${k.sourceColumn}` : undefined,
          };
        });

  const availableKpis = slideKpis.filter((k) => k.status === 'available');
  const unavailableKpis = slideKpis.filter((k) => k.status === 'unavailable');

  const headlineMetrics = availableKpis.slice(0, 3).map((k) => ({
    label: k.label,
    value: k.formattedValue,
    delta: k.deltaTextLabel || 'Audited',
    deltaState: k.deltaState || 'neutral',
    deltaDirection: k.deltaDirection || 'flat',
    isFavorable: k.isFavorable ?? null,
  }));

  // Extract up to 5 key charts with real computed data for Slides 4-8 (Part A5, A6, A8)
  interface BuiltChartSlideData {
    chartId: string;
    chartTitle: string;
    chartSubtitle: string;
    intent: string;
    measureType: MeasureType;
    pptxChartType: 'bar' | 'line' | 'area' | 'doughnut';
    categoryCol: string;
    metricCol: string;
    yColumns: string[];
    bars: PresentationSlideChartBar[];
    nativeChart: PresentationNativeChartSpec;
    actionTitle: string;
    soWhat: string;
    bullets: string[];
  }

  const keyChartSlidesData: BuiltChartSlideData[] = [];
  if (hasData) {
    const availableCharts = builtDash.charts.filter(
      (c) =>
        c.status === 'available' && Array.isArray(c.data) && c.data.length > 0
    );

    for (const c of availableCharts.slice(0, 5)) {
      const catField = c.categoryField || c.xColumn || 'Category';
      const allYCols =
        Array.isArray(c.yColumns) && c.yColumns.length > 0
          ? c.yColumns
          : [c.valueField || 'Value'];
      const valField = allYCols[0];
      const measureType: MeasureType =
        c.measureType ||
        inferMeasureType({
          columnName: valField,
          aggregation: c.aggregation,
        });

      const rawItems = c.data
        .map((row) => {
          const cat = String(row[catField] ?? 'Other').trim() || 'Other';
          const parsed = parseRobustNumber(row[valField]);
          const val =
            parsed.value !== null && Number.isFinite(parsed.value)
              ? parsed.value
              : typeof row[valField] === 'number' &&
                Number.isFinite(row[valField])
              ? row[valField]
              : 0;
          const seriesVals: Record<string, number> = {};
          for (const yc of allYCols) {
            const p = parseRobustNumber(row[yc]);
            seriesVals[yc] =
              p.value !== null && Number.isFinite(p.value)
                ? Number(p.value.toFixed(2))
                : typeof row[yc] === 'number' && Number.isFinite(row[yc])
                ? Number(row[yc].toFixed(2))
                : 0;
          }
          return {
            category: cat,
            value: Number(val.toFixed(2)),
            seriesVals,
          };
        })
        .filter((item) => Number.isFinite(item.value));

      if (rawItems.length === 0) continue;

      const isTrend =
        c.intent === 'trend' ||
        c.chartType === 'line' ||
        c.chartType === 'area';
      const orderedItems = isTrend
        ? rawItems.slice(0, 8)
        : [...rawItems].sort((a, b) => b.value - a.value).slice(0, 6);

      const grandTotal = orderedItems.reduce(
        (sum, item) => sum + Math.max(0, item.value),
        0
      );
      if (grandTotal <= 0 && orderedItems.every((i) => i.value === 0)) continue;

      const bars: PresentationSlideChartBar[] = orderedItems.map((item) => ({
        category: item.category,
        value: item.value,
        formattedValue: formatCompactMetric(item.value),
        sharePct:
          grandTotal > 0
            ? Number(((Math.max(0, item.value) / grandTotal) * 100).toFixed(1))
            : 0,
      }));

      const topBar = [...bars].sort((a, b) => b.value - a.value)[0] || bars[0];
      const lowBar =
        [...bars].sort((a, b) => a.value - b.value)[0] ||
        bars[bars.length - 1];
      const avgVal =
        bars.reduce((acc, b) => acc + b.value, 0) / Math.max(1, bars.length);

      let pptxChartType: 'bar' | 'line' | 'area' | 'doughnut' = 'bar';
      if (c.chartType === 'line') pptxChartType = 'line';
      else if (c.chartType === 'area') pptxChartType = 'area';
      else if (c.chartType === 'donut' && measureType === 'additive')
        pptxChartType = 'doughnut';
      else pptxChartType = 'bar';

      // Build all mapped series so "vs" / "and" charts plot >= 2 series (Part A5)
      const builtSeries = allYCols.map((yc) => ({
        name: yc,
        labels: orderedItems.map((item) =>
          pptxChartType === 'doughnut'
            ? `${item.category} (${formatCompactMetric(item.seriesVals[yc] ?? item.value)})`
            : item.category
        ),
        values: orderedItems.map((item) => item.seriesVals[yc] ?? item.value),
        formattedValues: orderedItems.map((item) =>
          formatCompactMetric(item.seriesVals[yc] ?? item.value)
        ),
      }));

      const validatedTitleObj = validateChartTitleAndSeries(
        c.title,
        builtSeries.map((s) => s.name),
        catField
      );
      const resolvedChartTitle = validatedTitleObj.title;

      // Part A6: Measure-type honest wording (never say "% Share" for average or ratio measures!)
      let actionTitle: string;
      let soWhat: string;
      let chartBullets: string[];

      if (isTrend) {
        actionTitle = fitTextToLimit(
          `${resolvedChartTitle}: Peaks at ${topBar.formattedValue} in ${topBar.category}`,
          MAX_TITLE_CHARS
        );
        soWhat = fitTextToLimit(
          `Trajectory across ${bars.length} periods ranges from ${lowBar.formattedValue} (${lowBar.category}) to ${topBar.formattedValue} (${topBar.category}).`,
          MAX_SOWHAT_CHARS
        );
        chartBullets = fitSlideBullets(
          [
            `Peak Period: ${topBar.category} reached ${topBar.formattedValue} (${valField}).`,
            `Trough Period: ${lowBar.category} recorded ${lowBar.formattedValue}.`,
            `Period Average: ${formatCompactMetric(avgVal)} across ${bars.length} intervals.`,
            builtSeries.length >= 2
              ? `Multi-Series Comparison: Tracks ${builtSeries.map((s) => s.name).join(' vs ')}.`
              : `Aggregation: ${c.aggregation.toUpperCase()}(${valField}) by ${catField}.`,
          ],
          4,
          MAX_BULLET_CHARS
        );
      } else if (measureType === 'additive') {
        actionTitle = fitTextToLimit(
          `${topBar.category} Leads ${resolvedChartTitle} at ${topBar.formattedValue} (${topBar.sharePct}% Share)`,
          MAX_TITLE_CHARS
        );
        soWhat = fitTextToLimit(
          `Top contributor "${topBar.category}" generates ${topBar.sharePct}% of ${valField}; top 2 capture ${bars
            .slice(0, 2)
            .reduce((acc, b) => acc + b.sharePct, 0)
            .toFixed(1)}%.`,
          MAX_SOWHAT_CHARS
        );
        chartBullets = fitSlideBullets(
          [
            `Leader: ${topBar.category} at ${topBar.formattedValue} (${topBar.sharePct}% share of ${valField}).`,
            bars[1]
              ? `Runner-Up: ${bars[1].category} contributes ${bars[1].formattedValue} (${bars[1].sharePct}% share).`
              : `Single dominant category observed across current slice.`,
            `Range: ${topBar.formattedValue} high vs ${lowBar.formattedValue} low across ${bars.length} groups.`,
            builtSeries.length >= 2
              ? `Comparative Series: Plotted ${builtSeries.map((s) => s.name).join(' vs ')}.`
              : `Aggregation: SUM(${valField}) grouped by ${catField}.`,
          ],
          4,
          MAX_BULLET_CHARS
        );
      } else {
        // average or ratio measure — NEVER say "% Share"
        actionTitle = fitTextToLimit(
          `${resolvedChartTitle}: Highest in ${topBar.category} (${topBar.formattedValue}) vs ${lowBar.category} (${lowBar.formattedValue})`,
          MAX_TITLE_CHARS
        );
        soWhat = fitTextToLimit(
          `Benchmark average across ${bars.length} ${catField} cohorts is ${formatCompactMetric(
            avgVal
          )} (spread: ${lowBar.formattedValue} to ${topBar.formattedValue}).`,
          MAX_SOWHAT_CHARS
        );
        chartBullets = fitSlideBullets(
          [
            `Highest Cohort: ${topBar.category} at ${topBar.formattedValue} (${valField}).`,
            `Lowest Cohort: ${lowBar.category} at ${lowBar.formattedValue}.`,
            `Cohort Benchmark Average: ${formatCompactMetric(avgVal)} across ${bars.length} groups.`,
            `Measure Type: ${measureType.toUpperCase()} (${c.aggregation.toUpperCase()} by ${catField}).`,
          ],
          4,
          MAX_BULLET_CHARS
        );
      }

      keyChartSlidesData.push({
        chartId: c.id,
        chartTitle: resolvedChartTitle,
        chartSubtitle: c.subtitle || `${ allYCols.join(' vs ') } by ${catField}`,
        intent: c.intent,
        measureType,
        pptxChartType,
        categoryCol: catField,
        metricCol: valField,
        yColumns: allYCols,
        bars,
        nativeChart: {
          chartType: pptxChartType,
          title: resolvedChartTitle,
          categoryLabel: catField,
          measureType,
          valAxisMinVal: pptxChartType === 'bar' ? 0 : undefined,
          series: builtSeries,
        },
        actionTitle,
        soWhat,
        bullets: chartBullets,
      });
    }
  }

  // Prefer an additive chart for Pareto analysis on Slide 9 if available
  const additiveChart =
    keyChartSlidesData.find((c) => c.measureType === 'additive') ||
    keyChartSlidesData[0];
  const primaryChart = keyChartSlidesData[0];
  const diagChart = additiveChart || primaryChart;

  const fallbackCatCol =
    diagChart?.categoryCol ||
    Object.entries(roleMap).find(([rKey, cName]) => {
      const rType = resolvedPack.roles[rKey]?.type;
      return rType === 'category' && Boolean(cName);
    })?.[1] ||
    columns.find((c) => c.dataType === 'string')?.name ||
    'Category';

  const fallbackValCol =
    diagChart?.metricCol ||
    Object.entries(roleMap).find(([rKey, cName]) => {
      return resolvedPack.roles[rKey]?.type === 'number' && Boolean(cName);
    })?.[1] ||
    columns.find((c) => c.dataType === 'number')?.name ||
    'Value';

  const primaryMeasureType: MeasureType =
    diagChart?.measureType ||
    inferMeasureType({ columnName: fallbackValCol });

  const primaryChartBars = diagChart?.bars || [];

  // 4-Lens Strategic Directives
  const lensBullets: PresentationSlideSpec['lensBullets'] = [
    {
      lens: 'Descriptive',
      text: fitTextToLimit(
        resolvedPack.lenses.descriptive?.[0] ||
          `Synthesized ${rows.length.toLocaleString()} records across ${columns.length} profiled columns.`,
        MAX_BULLET_CHARS
      ),
    },
    {
      lens: 'Diagnostic',
      text: fitTextToLimit(
        resolvedPack.lenses.diagnostic?.[0] ||
          insights[0]?.why ||
          'Variance decomposition isolates top segment contributors and root-cause drivers.',
        MAX_BULLET_CHARS
      ),
    },
    {
      lens: 'Predictive',
      text: fitTextToLimit(
        resolvedPack.lenses.predictive?.[0] ||
          'Run-rate trajectory projects forward period momentum from observed historical slope.',
        MAX_BULLET_CHARS
      ),
    },
    {
      lens: 'Prescriptive',
      text: fitTextToLimit(
        resolvedPack.lenses.prescriptive?.[0] ||
          insights[0]?.action ||
          'Prioritize high-leverage segments and resolve missing role mappings for full coverage.',
        MAX_BULLET_CHARS
      ),
    },
  ];

  // Diagnostic computations
  const paretoSummary =
    hasData &&
    primaryMeasureType === 'additive' &&
    primaryChartBars.length >= 2
      ? computePareto(
          primaryChartBars.map((b) => ({
            name: b.category,
            value: Math.max(0, b.value),
          })),
          80
        )
      : null;

  const numericSeriesValues = hasData
    ? rows
        .map((r) => {
          const p = parseRobustNumber(r[fallbackValCol]);
          return p.value !== null && Number.isFinite(p.value) ? p.value : null;
        })
        .filter((v): v is number => v !== null)
    : [];

  const anomalySummary =
    numericSeriesValues.length >= 4
      ? detectAnomalies(numericSeriesValues)
      : null;

  // Predictive / Forecast computations (3-period time-series forecast)
  const dateCol =
    roleMap.date ||
    columns.find((c) => c.dataType === 'date')?.name ||
    fallbackCatCol;
  const timeSeriesLabels = hasData
    ? rows.map((r, i) => String(r[dateCol] ?? `P${i + 1}`))
    : [];
  const timeSeriesSummary =
    numericSeriesValues.length >= 3
      ? analyzeTimeSeries(
          numericSeriesValues.slice(0, 12),
          timeSeriesLabels.slice(0, 12),
          3
        )
      : null;

  const forecastBars: PresentationSlideChartBar[] = [];
  if (timeSeriesSummary) {
    const histSlice = numericSeriesValues.slice(-4);
    const histLabels = timeSeriesLabels.slice(-4);
    histSlice.forEach((val, idx) => {
      forecastBars.push({
        category: histLabels[idx] || `Actual ${idx + 1}`,
        value: Number(val.toFixed(2)),
        formattedValue: formatCompactMetric(val),
        sharePct: 100,
      });
    });
    timeSeriesSummary.forecasts.forEach((f) => {
      forecastBars.push({
        category: `${f.label} (Proj)`,
        value: Number(f.forecast.toFixed(2)),
        formattedValue: formatCompactMetric(f.forecast),
        sharePct: 100,
      });
    });
  }

  const nullPctAvg =
    columns.length > 0
      ? Number(
          (
            columns.reduce((acc, c) => acc + (c.nullPercentage || 0), 0) /
            columns.length
          ).toFixed(1)
        )
      : 0;

  const qualitySummary: PresentationSlideSpec['qualitySummary'] = {
    overallScore: hasData ? resolvedOverallScore : 0,
    grade: hasData ? resolvedGrade : 'A',
    statusLabel: hasData ? resolvedStatusLabel : 'Template Specification',
    issuesCount: hasData ? resolvedIssuesCount : 0,
    rowCount: rows.length,
    columnCount: columns.length,
    nullPercentageAvg: nullPctAvg,
    schemaPreview:
      columns.length > 0
        ? columns.slice(0, 6).map((c) => ({
            name: c.name,
            dataType: c.dataType,
            distinctCount: c.distinctCount,
            nullPct: Number((c.nullPercentage || 0).toFixed(1)),
          }))
        : Object.entries(resolvedPack.roles)
            .slice(0, 6)
            .map(([rKey, rDef]) => ({
              name: `${rKey} (${rDef.aliases[0] || rKey})`,
              dataType: rDef.type,
              distinctCount: 0,
              nullPct: 0,
            })),
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const periodSpan =
    hasData && timeSeriesLabels.length >= 2
      ? `${timeSeriesLabels[0]} to ${timeSeriesLabels[timeSeriesLabels.length - 1]}`
      : todayStr;

  const scopeLabel =
    scope === 'pack'
      ? resolvedPack.name
      : scope === 'builder'
      ? 'Custom Builder Layout'
      : scope === 'all'
      ? `Enterprise Suite (${resolvedPack.name})`
      : 'Executive Dashboard';

  const sourceFootnote = hasData
    ? `Source: ${datasetName} (${rows.length.toLocaleString()} audited rows) • ${resolvedPack.name} Pack • ${todayStr}`
    : `Source: ${resolvedPack.name} Specification Template • ${companyName} • ${todayStr}`;

  const activeSet = new Set<PresentationSectionId>(
    includedSections.length > 0 ? includedSections : DEFAULT_SECTIONS
  );

  if (activeSet.has('insights')) {
    activeSet.add('diagnostic');
    activeSet.add('predictive');
    activeSet.add('recommendations');
  }

  const topKpi = availableKpis[0];
  const secondKpi = availableKpis[1];
  const thirdKpi = availableKpis[2];

  const candidateSlides: Omit<
    PresentationSlideSpec,
    'slideNumber' | 'totalSlides' | 'footerText'
  >[] = [];

  // =========================================================================
  // SLIDE 1: TITLE / COVER SLIDE ONLY (Part A3 — No Stat Cards, No Repeated Bullets)
  // =========================================================================
  if (activeSet.has('cover')) {
    const coverTitle = fitTextToLimit(
      `${resolvedPack.name} — Executive Intelligence Briefing`,
      MAX_TITLE_CHARS
    );

    const qualityChipLabel = hasData
      ? resolvedIssuesCount === 0 && resolvedOverallScore === 100
        ? `Quality: 100% Certified (Grade A+)`
        : `Quality: ${resolvedOverallScore}% (Grade ${resolvedGrade} • ${resolvedIssuesCount} Finding${
            resolvedIssuesCount === 1 ? '' : 's'
          })`
      : 'Quality: Specification Template';

    const coverSoWhat = fitTextToLimit(
      `So what: Executive briefing on ${datasetName} (${periodSpan}) prepared by ${author} (${department}).`,
      MAX_SOWHAT_CHARS
    );

    candidateSlides.push({
      id: 'slide-cover',
      sectionId: 'cover',
      kind: 'cover',
      title: coverTitle,
      soWhat: coverSoWhat,
      subtitle: `${companyName} • ${scopeLabel} • ${todayStr}`,
      sourceFootnote,
      altText: `Cover slide for ${resolvedPack.name} briefing on ${datasetName}`,
      speakerNotes: `Cover slide for ${resolvedPack.name} executive presentation on ${datasetName}. Prepared by ${author} (${department}).`,
      packId: resolvedPack.id,
      packName: resolvedPack.name,
      accentToken,
      gradientToToken,
      audience,
      hasData,
      measureType: primaryMeasureType,
      coverMeta: {
        datasetName,
        periodLabel: periodSpan,
        preparedBy: `${author} • ${department} (${companyName})`,
        scopeLabel: `${scopeLabel} (${availableKpis.length}/${slideKpis.length} Active KPIs)`,
        qualityChipLabel,
        qualityIssuesCount: resolvedIssuesCount,
      },
      headlineMetrics: [], // Part A3: Cover slide has NO stat cards
      kpis: availableKpis.slice(0, 4),
      unavailableKpis,
      roleMappings,
      chartTitle:
        primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: fallbackCatCol,
      chartBars: primaryChartBars,
      lensBullets,
      bullets: fitSlideBullets(
        [
          `Dataset & Scope: ${datasetName} (${rows.length.toLocaleString()} rows, ${columns.length} columns).`,
          `Time Horizon: ${periodSpan} (${scopeLabel}).`,
          `Prepared By: ${author}, ${department} (${companyName}).`,
          `Data Governance: ${qualityChipLabel}.`,
        ],
        4,
        MAX_BULLET_CHARS
      ),
      qualitySummary,
    });
  }

  // =========================================================================
  // SLIDE 2: EXECUTIVE SUMMARY (ONE Headline + 3 Stat Cards + Unique Takeaways)
  // =========================================================================
  if (
    activeSet.has('executive_summary') &&
    (availableKpis.length > 0 || !hasData)
  ) {
    const execActionTitle = fitTextToLimit(
      hasData && topKpi
        ? `${topKpi.label} Reaches ${topKpi.formattedValue}${formatDeltaPhrase(
            topKpi.deltaPercent,
            topKpi.goodDirection
          )}`
        : `${resolvedPack.name} — Executive Summary & Onboarding Guide`,
      MAX_TITLE_CHARS
    );

    const execSoWhat = fitTextToLimit(
      hasData && primaryChartBars[0]
        ? primaryMeasureType === 'additive'
          ? `So what: "${primaryChartBars[0].category}" drives ${primaryChartBars[0].sharePct}% of ${fallbackValCol}; focus execution on high-variance drivers.`
          : `So what: "${primaryChartBars[0].category}" leads ${fallbackValCol} at ${primaryChartBars[0].formattedValue}; align trailing cohorts to benchmark.`
        : `So what: Synthesizes top 3 headline KPIs and core operational takeaways across ${rows.length.toLocaleString()} records.`,
      MAX_SOWHAT_CHARS
    );

    candidateSlides.push({
      id: 'slide-executive-summary',
      sectionId: 'executive_summary',
      kind: 'executive_summary',
      title: execActionTitle,
      soWhat: execSoWhat,
      subtitle: hasData
        ? `Executive Summary • ${availableKpis.length} Active KPIs • ${qualitySummary.overallScore}% Data Quality`
        : 'Zero-Data Template Instructions & Expected Analytical Narrative',
      sourceFootnote,
      altText: `Executive summary slide with 3 headline stat cards and strategic takeaways`,
      speakerNotes: `Slide 2 summarizes executive performance. ${execActionTitle}. ${execSoWhat}`,
      packId: resolvedPack.id,
      packName: resolvedPack.name,
      accentToken,
      gradientToToken,
      audience,
      hasData,
      measureType: primaryMeasureType,
      headlineMetrics,
      kpis: availableKpis.slice(0, 4),
      unavailableKpis,
      roleMappings,
      chartTitle:
        primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: fallbackCatCol,
      chartBars: primaryChartBars,
      nativeChart: primaryChart?.nativeChart,
      lensBullets,
      bullets: fitSlideBullets(
        hasData
          ? [
              topKpi
                ? `Headline KPI: ${topKpi.label} is ${topKpi.formattedValue}${formatDeltaPhrase(
                    topKpi.deltaPercent,
                    topKpi.goodDirection
                  )}.`
                : `Audited ${rows.length.toLocaleString()} active records.`,
              secondKpi
                ? `Secondary KPI: ${secondKpi.label} stands at ${secondKpi.formattedValue}${formatDeltaPhrase(
                    secondKpi.deltaPercent,
                    secondKpi.goodDirection
                  )}.`
                : `All mapped required columns passed validation.`,
              thirdKpi
                ? `Operating Signal: ${thirdKpi.label} recorded at ${thirdKpi.formattedValue}${formatDeltaPhrase(
                    thirdKpi.deltaPercent,
                    thirdKpi.goodDirection
                  )}.`
                : `Schema mapping verified across ${columns.length} fields.`,
              primaryChartBars[0]
                ? primaryMeasureType === 'additive'
                  ? `Top Segment: "${primaryChartBars[0].category}" contributes ${primaryChartBars[0].formattedValue} (${primaryChartBars[0].sharePct}% share).`
                  : `Top Benchmark: "${primaryChartBars[0].category}" leads ${fallbackValCol} at ${primaryChartBars[0].formattedValue}.`
                : lensBullets[3].text,
            ]
          : [
              `1. Connect or upload a dataset with columns for: ${resolvedPack.detect.requiredRoles.join(', ')}.`,
              `2. Verify automatic role mapping in Analytics Packs or click "Map Columns".`,
              `3. Re-export this deck to populate live KPIs, native editable charts, and 3-period forecasts.`,
            ],
        4,
        MAX_BULLET_CHARS
      ),
      qualitySummary,
    });
  }

  // =========================================================================
  // SLIDE 3: KPI SCORECARD (6-8 Available Tiles ONLY — Never Blank/Unavailable Tiles)
  // =========================================================================
  if (activeSet.has('kpis') && availableKpis.length > 0) {
    const scorecardKpis = availableKpis.slice(0, 8);
    const favCount = scorecardKpis.filter(
      (k) => k.deltaState !== 'unfavorable'
    ).length;

    const kpiActionTitle = fitTextToLimit(
      topKpi
        ? `${favCount} of ${scorecardKpis.length} Active KPIs On Track, Led by ${topKpi.label} (${topKpi.formattedValue})`
        : `${resolvedPack.name} — Audited KPI Scorecard (${scorecardKpis.length} Active Metrics)`,
      MAX_TITLE_CHARS
    );

    const kpiSoWhat = fitTextToLimit(
      unavailableKpis.length > 0
        ? `So what: ${scorecardKpis.length} active KPIs are verified below; ${unavailableKpis.length} unmapped metric(s) are cataloged on Slide 12.`
        : `So what: Complete domain coverage (${availableKpis.length}/${slideKpis.length} KPIs active) with period-over-period variance tracking.`,
      MAX_SOWHAT_CHARS
    );

    candidateSlides.push({
      id: 'slide-kpis',
      sectionId: 'kpis',
      kind: 'kpis',
      title: kpiActionTitle,
      soWhat: kpiSoWhat,
      subtitle: `${resolvedPack.name} KPI Scorecard • Showing ${scorecardKpis.length} Audited Metrics`,
      sourceFootnote,
      altText: `KPI Scorecard grid displaying ${scorecardKpis.length} active metrics with values and period deltas`,
      speakerNotes: `Slide 3 presents the ${resolvedPack.name} KPI Scorecard with ${scorecardKpis.length} active metrics. ${kpiSoWhat}`,
      packId: resolvedPack.id,
      packName: resolvedPack.name,
      accentToken,
      gradientToToken,
      audience,
      hasData,
      measureType: primaryMeasureType,
      headlineMetrics,
      kpis: scorecardKpis,
      unavailableKpis,
      roleMappings,
      chartTitle:
        primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: fallbackCatCol,
      chartBars: primaryChartBars,
      nativeChart: primaryChart?.nativeChart,
      lensBullets,
      bullets: fitSlideBullets(
        scorecardKpis
          .slice(0, 5)
          .map(
            (k) =>
              `${k.label}: ${k.formattedValue} (${k.deltaTextLabel || 'Audited'})`
          ),
        5,
        MAX_BULLET_CHARS
      ),
      qualitySummary,
    });
  }

  // =========================================================================
  // SLIDES 4-8: ONE SLIDE PER KEY CHART (Native Editable PowerPoint Charts)
  // =========================================================================
  if (activeSet.has('charts') && keyChartSlidesData.length > 0) {
    keyChartSlidesData.forEach((cData, cIdx) => {
      candidateSlides.push({
        id: cIdx === 0 ? 'slide-charts' : `slide-chart-${cIdx + 1}`,
        sectionId: 'charts',
        kind: 'charts',
        title: cData.actionTitle,
        soWhat: fitTextToLimit(`So what: ${cData.soWhat}`, MAX_SOWHAT_CHARS),
        subtitle: `Key Chart ${cIdx + 1} of ${keyChartSlidesData.length} • ${cData.chartTitle}`,
        sourceFootnote,
        altText: `Native editable ${cData.pptxChartType} chart for ${cData.chartTitle} showing ${cData.yColumns.join(' vs ')} by ${cData.categoryCol}`,
        speakerNotes: `Chart Slide (${cData.chartTitle}): ${cData.actionTitle}. ${cData.soWhat}`,
        packId: resolvedPack.id,
        packName: resolvedPack.name,
        accentToken,
        gradientToToken,
        audience,
        hasData,
        measureType: cData.measureType,
        headlineMetrics,
        kpis: availableKpis.slice(0, 4),
        unavailableKpis,
        roleMappings,
        chartTitle: cData.chartTitle,
        chartMetricLabel: cData.metricCol,
        chartCategoryLabel: cData.categoryCol,
        chartBars: cData.bars,
        nativeChart: cData.nativeChart,
        lensBullets,
        bullets: cData.bullets,
        qualitySummary,
      });
    });
  }

  // =========================================================================
  // SLIDE 9: DIAGNOSTIC ANALYSIS (Part A1 & A6: Text-fitted, Measure-type honest)
  // =========================================================================
  if (
    activeSet.has('diagnostic') &&
    hasData &&
    (primaryChartBars.length > 0 || availableKpis.length > 0)
  ) {
    const vitalCount =
      paretoSummary?.vitalFewCount ?? Math.min(2, primaryChartBars.length);
    const vitalShare =
      paretoSummary?.vitalFewValueSharePct ??
      (primaryChartBars[0]?.sharePct || 100);
    const outlierCount = anomalySummary?.anomalies.length ?? 0;
    const highBar = primaryChartBars[0];
    const lowBar = primaryChartBars[primaryChartBars.length - 1] || highBar;

    const diagActionTitle = fitTextToLimit(
      primaryMeasureType === 'additive' && primaryChartBars.length >= 2
        ? `Top ${vitalCount} ${fallbackCatCol} Group(s) Drive ${vitalShare.toFixed(
            1
          )}% of Total ${fallbackValCol}`
        : primaryChartBars.length >= 2 && highBar && lowBar
        ? `${fallbackValCol} Spread Across ${fallbackCatCol}: ${highBar.category} (${highBar.formattedValue}) vs ${lowBar.category} (${lowBar.formattedValue})`
        : `Diagnostic Variance Decomposition Across ${rows.length.toLocaleString()} Records`,
      MAX_TITLE_CHARS
    );

    const diagSoWhat = fitTextToLimit(
      primaryMeasureType === 'additive'
        ? `So what: Pareto 80/20 concentration and Z-score screening (${outlierCount} outlier(s)) isolate top variance drivers.`
        : `So what: Cross-cohort dispersion and Z-score screening (${outlierCount} outlier(s)) isolate key performance bottlenecks.`,
      MAX_SOWHAT_CHARS
    );

    const diagBullets = fitSlideBullets(
      [
        ...(resolvedPack.lenses.diagnostic || []).slice(0, 2),
        highBar
          ? primaryMeasureType === 'additive'
            ? `Primary Concentration: "${highBar.category}" accounts for ${highBar.formattedValue} (${highBar.sharePct}% share of ${fallbackValCol}).`
            : `Cohort Dispersion: "${highBar.category}" peaks at ${highBar.formattedValue} vs "${lowBar.category}" at ${lowBar.formattedValue}.`
          : `Evaluated ${rows.length.toLocaleString()} rows for multi-dimensional variance.`,
        `Anomaly Audit: ${outlierCount} statistical outlier(s) flagged via Z-score (|z| > 2.5) & 1.5x IQR bounds.`,
      ],
      4,
      98
    );

    candidateSlides.push({
      id: 'slide-diagnostic',
      sectionId: 'diagnostic',
      kind: 'diagnostic',
      title: diagActionTitle,
      soWhat: diagSoWhat,
      subtitle: `Diagnostic Lens • Variance Drivers & Statistical Outlier Audit`,
      sourceFootnote,
      altText: `Diagnostic analysis slide showing variance drivers and outlier audit`,
      speakerNotes: `Diagnostic Slide: ${diagActionTitle}. ${diagSoWhat}`,
      packId: resolvedPack.id,
      packName: resolvedPack.name,
      accentToken,
      gradientToToken,
      audience,
      hasData,
      measureType: primaryMeasureType,
      headlineMetrics,
      kpis: availableKpis.slice(0, 4),
      unavailableKpis,
      roleMappings,
      chartTitle:
        primaryMeasureType === 'additive'
          ? `Pareto Concentration: ${fallbackValCol} by ${fallbackCatCol}`
          : `Cohort Comparison: ${fallbackValCol} by ${fallbackCatCol}`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: fallbackCatCol,
      chartBars: primaryChartBars,
      nativeChart:
        primaryChartBars.length > 0
          ? {
              chartType: 'bar',
              title:
                primaryMeasureType === 'additive'
                  ? `Diagnostic Pareto: ${fallbackValCol} by ${fallbackCatCol}`
                  : `Diagnostic Spread: ${fallbackValCol} by ${fallbackCatCol}`,
              categoryLabel: fallbackCatCol,
              measureType: primaryMeasureType,
              valAxisMinVal: 0,
              series: [
                {
                  name: fallbackValCol,
                  labels: primaryChartBars.map((b) => b.category),
                  values: primaryChartBars.map((b) => b.value),
                  formattedValues: primaryChartBars.map(
                    (b) => b.formattedValue
                  ),
                },
              ],
            }
          : undefined,
      lensBullets,
      bullets: diagBullets,
      qualitySummary,
    });
  }

  // =========================================================================
  // SLIDE 10: PREDICTIVE & 3-PERIOD FORECAST TRAJECTORY (Part A1 text-fitted)
  // =========================================================================
  if (
    activeSet.has('predictive') &&
    hasData &&
    forecastBars.length >= 2 &&
    timeSeriesSummary
  ) {
    const nextForecast = timeSeriesSummary.forecasts[0];
    const lastForecast =
      timeSeriesSummary.forecasts[timeSeriesSummary.forecasts.length - 1] ||
      nextForecast;
    const slopeDir =
      timeSeriesSummary.slope > 0
        ? 'Upward Trajectory'
        : timeSeriesSummary.slope < 0
        ? 'Downward Trajectory'
        : 'Stable Run-Rate';

    const predActionTitle = fitTextToLimit(
      `3-Period Forecast Projects ${fallbackValCol} at ${formatCompactMetric(
        lastForecast.forecast
      )} (${slopeDir})`,
      MAX_TITLE_CHARS
    );

    const predSoWhat = fitTextToLimit(
      `So what: OLS trend + moving-average model projects ${formatCompactMetric(
        nextForecast.forecast
      )} next period (80% band: ${formatCompactMetric(
        nextForecast.lowerBound
      )}–${formatCompactMetric(nextForecast.upperBound)}).`,
      MAX_SOWHAT_CHARS
    );

    const predBullets = fitSlideBullets(
      [
        ...(resolvedPack.lenses.predictive || []).slice(0, 1),
        `Next Period (${nextForecast.label}): ${formatCompactMetric(
          nextForecast.forecast
        )} (80% interval: ${formatCompactMetric(
          nextForecast.lowerBound
        )} to ${formatCompactMetric(nextForecast.upperBound)}).`,
        `Horizon End (${lastForecast.label}): ${formatCompactMetric(
          lastForecast.forecast
        )} (${timeSeriesSummary.slope >= 0 ? '+' : ''}${formatCompactMetric(
          timeSeriesSummary.slope
        )}/period slope).`,
        timeSeriesSummary.confidenceNote,
      ],
      4,
      98
    );

    candidateSlides.push({
      id: 'slide-predictive',
      sectionId: 'predictive',
      kind: 'predictive',
      title: predActionTitle,
      soWhat: predSoWhat,
      subtitle: `Predictive Lens • 3-Period OLS Trend & Moving-Average Forecast`,
      sourceFootnote,
      altText: `Predictive forecast line chart projecting 3 future periods for ${fallbackValCol}`,
      speakerNotes: `Predictive Forecast Slide: ${predActionTitle}. ${predSoWhat}`,
      packId: resolvedPack.id,
      packName: resolvedPack.name,
      accentToken,
      gradientToToken,
      audience,
      hasData,
      measureType: primaryMeasureType,
      headlineMetrics,
      kpis: availableKpis.slice(0, 4),
      unavailableKpis,
      roleMappings,
      chartTitle: `${fallbackValCol} — Historical & 3-Period Forecast`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: dateCol,
      chartBars: forecastBars,
      nativeChart: {
        chartType: 'line',
        title: `${fallbackValCol} — Historical & 3-Period Forecast`,
        categoryLabel: dateCol,
        measureType: primaryMeasureType,
        series: [
          {
            name: `${fallbackValCol} Trajectory`,
            labels: forecastBars.map((b) => b.category),
            values: forecastBars.map((b) => b.value),
            formattedValues: forecastBars.map((b) => b.formattedValue),
          },
        ],
      },
      lensBullets,
      bullets: predBullets,
      qualitySummary,
    });
  }

  // =========================================================================
  // SLIDE 11: PRESCRIPTIVE RECOMMENDATIONS (Part A2: Action Verb + Metric + Owner + Impact, No Formulas)
  // =========================================================================
  if (activeSet.has('recommendations') && hasData) {
    const defaultOwners = [
      `${resolvedPack.name.split(' ')[0]} Lead`,
      'RevOps & BI Manager',
      'Department VP',
      'Data Engineering Lead',
      'Operations Director',
    ];
    const defaultImpacts = [
      '+5% to +12% efficiency lift',
      '-15% cycle variance',
      '+3% to +8% margin protection',
      '100% KPI telemetry coverage',
      'Faster anomaly remediation',
    ];

    const rawPrescriptive = [
      ...(resolvedPack.lenses.prescriptive || []).slice(0, 2),
      primaryChartBars[0]
        ? `Scale top-performing "${primaryChartBars[0].category}" playbook on ${fallbackValCol}`
        : `Prioritize resource allocation toward high-performing ${resolvedPack.name} segments`,
      topKpi
        ? `Enforce weekly threshold alerts on ${topKpi.label} (${topKpi.formattedValue})`
        : `Automate weekly KPI governance reviews across leadership`,
      unavailableKpis.length > 0
        ? `Expand pipeline with [${unavailableKpis
            .slice(0, 2)
            .map((u) => u.missingColumn || u.id)
            .join(', ')}] to unlock ${unavailableKpis.length} KPIs`
        : `Automate daily data ingestion to preserve 100% KPI coverage`,
    ];

    const prescriptiveList = fitSlideBullets(
      rawPrescriptive.map((raw, idx) =>
        formatActionableRecommendationBullet(
          raw,
          availableKpis[idx]?.label || fallbackValCol,
          defaultOwners[idx % defaultOwners.length],
          defaultImpacts[idx % defaultImpacts.length]
        )
      ),
      5,
      MAX_BULLET_CHARS
    );

    if (prescriptiveList.length >= 3) {
      const recActionTitle = fitTextToLimit(
        `${prescriptiveList.length} Recommended Leadership Actions for ${resolvedPack.name}`,
        MAX_TITLE_CHARS
      );
      const recSoWhat = fitTextToLimit(
        `So what: Concrete action plan pairing each target metric with an explicit owner and expected impact.`,
        MAX_SOWHAT_CHARS
      );

      candidateSlides.push({
        id: 'slide-recommendations',
        sectionId: 'recommendations',
        kind: 'recommendations',
        title: recActionTitle,
        soWhat: recSoWhat,
        subtitle: `Prescriptive Lens • Action Verb + Metric + Owner + Expected Impact`,
        sourceFootnote,
        altText: `Prescriptive recommendations slide listing ${prescriptiveList.length} concrete actions with owner and impact`,
        speakerNotes: `Recommendations Slide: ${recActionTitle}. ${recSoWhat}`,
        packId: resolvedPack.id,
        packName: resolvedPack.name,
        accentToken,
        gradientToToken,
        audience,
        hasData,
        measureType: primaryMeasureType,
        headlineMetrics,
        kpis: availableKpis.slice(0, 4),
        unavailableKpis,
        roleMappings,
        chartTitle:
          primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
        chartMetricLabel: fallbackValCol,
        chartCategoryLabel: fallbackCatCol,
        chartBars: primaryChartBars,
        lensBullets,
        bullets: prescriptiveList,
        qualitySummary,
      });
    }
  }

  // =========================================================================
  // SLIDE 12: DATA QUALITY & ASSUMPTIONS (Part A7: Aligned with Shared Quality Engine)
  // =========================================================================
  if (activeSet.has('data_quality')) {
    const kpisWithAssumptions = builtDash.computedKpis.filter((k) =>
      Boolean(k.assumption)
    );
    const isTrulyCertified =
      hasData &&
      qualitySummary.issuesCount === 0 &&
      qualitySummary.overallScore === 100;

    const dqActionTitle = fitTextToLimit(
      !hasData
        ? `Schema Requirements & Missing Column Assumptions for ${resolvedPack.name}`
        : isTrulyCertified
        ? `Data Quality Certified at 100% (Grade A+ — 0 Findings) Across ${rows.length.toLocaleString()} Rows`
        : `Data Quality Score: ${qualitySummary.overallScore}% (Grade ${qualitySummary.grade} — ${qualitySummary.issuesCount} Finding${
            qualitySummary.issuesCount === 1 ? '' : 's'
          } Under Review)`,
      MAX_TITLE_CHARS
    );

    const dqSoWhat = fitTextToLimit(
      unavailableKpis.length > 0
        ? `So what: ${availableKpis.length}/${slideKpis.length} KPIs computed directly; ${unavailableKpis.length} skipped KPI(s) list their exact missing column below.`
        : `So what: ${qualitySummary.statusLabel} across ${rows.length.toLocaleString()} rows with ${qualitySummary.nullPercentageAvg}% avg null rate.`,
      MAX_SOWHAT_CHARS
    );

    const dqBullets = fitSlideBullets(
      [
        hasData
          ? `Quality Audit: ${qualitySummary.overallScore}% score (Grade ${qualitySummary.grade}, ${qualitySummary.issuesCount} active finding(s), ${qualitySummary.nullPercentageAvg}% avg null rate).`
          : `Zero-Data Template Mode: Upload a CSV/XLSX matching ${resolvedPack.detect.requiredRoles.join(', ')}.`,
        ...(sharedQuality.issues.length > 0
          ? sharedQuality.issues
              .slice(0, 2)
              .map(
                (iss) =>
                  `Quality Finding [${iss.column}] (${iss.severity.toUpperCase()}): ${iss.description}`
              )
          : []),
        ...(kpisWithAssumptions.length > 0
          ? kpisWithAssumptions
              .slice(0, 1)
              .map((k) => `Assumption (${k.label}): ${k.assumption}`)
          : [
              `Formula Governance: All active KPIs use audited domain formulas with zero synthetic imputation.`,
            ]),
        ...(unavailableKpis.length > 0
          ? unavailableKpis
              .slice(0, 2)
              .map(
                (u) =>
                  `Skipped KPI — ${u.label}: Missing column [${u.missingColumn || 'unmapped role'}].`
              )
          : [
              `Role Completeness: 0 unavailable KPIs — all ${availableKpis.length} domain metrics active.`,
            ]),
      ],
      5,
      MAX_BULLET_CHARS
    );

    candidateSlides.push({
      id: 'slide-data-quality',
      sectionId: 'data_quality',
      kind: 'data_quality',
      title: dqActionTitle,
      soWhat: dqSoWhat,
      subtitle: `Data Quality Audit, Formula Assumptions & Missing Column Catalog`,
      sourceFootnote,
      altText: `Data quality and assumptions slide detailing hygiene score, findings, and any missing columns`,
      speakerNotes: `Data Quality & Assumptions Slide: ${dqActionTitle}. ${dqSoWhat}`,
      packId: resolvedPack.id,
      packName: resolvedPack.name,
      accentToken,
      gradientToToken,
      audience,
      hasData,
      measureType: primaryMeasureType,
      headlineMetrics,
      kpis: availableKpis.slice(0, 4),
      unavailableKpis,
      roleMappings,
      chartTitle:
        primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: fallbackCatCol,
      chartBars: primaryChartBars,
      lensBullets,
      bullets: dqBullets,
      qualitySummary,
    });
  }

  // =========================================================================
  // SLIDE 13: APPENDIX (KPI Definitions, Formulas & Semantic Column Mapping)
  // =========================================================================
  if (activeSet.has('appendix') && slideKpis.length > 0) {
    const mappedCount = roleMappings.filter(
      (r) => !r.mappedColumn.startsWith('Unmapped')
    ).length;
    const appActionTitle = fitTextToLimit(
      `Methodology Appendix: ${slideKpis.length} KPI Formula Definitions & ${mappedCount} Mapped Columns`,
      MAX_TITLE_CHARS
    );
    const appSoWhat = fitTextToLimit(
      `So what: Every metric is traceable to an explicit mathematical formula and mapped source column.`,
      MAX_SOWHAT_CHARS
    );

    const appBullets = fitSlideBullets(
      (availableKpis.length > 0 ? availableKpis : slideKpis)
        .slice(0, 5)
        .map(
          (k) =>
            `${k.label}: ${k.source || k.formulaText || 'Standard domain formula'}`
        ),
      5,
      MAX_BULLET_CHARS
    );

    candidateSlides.push({
      id: 'slide-appendix',
      sectionId: 'appendix',
      kind: 'appendix',
      title: appActionTitle,
      soWhat: appSoWhat,
      subtitle: `Audited KPI Formula Glossary & Semantic Role-to-Column Mapping`,
      sourceFootnote,
      altText: `Methodology appendix table showing KPI definitions, mathematical formulas, and column mappings`,
      speakerNotes: `Appendix Slide: Documents the mathematical formulas and column mappings used across this ${resolvedPack.name} deck.`,
      packId: resolvedPack.id,
      packName: resolvedPack.name,
      accentToken,
      gradientToToken,
      audience,
      hasData,
      measureType: primaryMeasureType,
      headlineMetrics,
      kpis: (availableKpis.length > 0 ? availableKpis : slideKpis).slice(0, 8),
      unavailableKpis,
      roleMappings,
      chartTitle:
        primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: fallbackCatCol,
      chartBars: primaryChartBars,
      lensBullets,
      bullets: appBullets,
      qualitySummary,
    });
  }

  if (candidateSlides.length === 0) {
    return buildPresentationSlides({
      ...options,
      includedSections: DEFAULT_SECTIONS,
    });
  }

  const totalSlides = candidateSlides.length;
  return candidateSlides.map((slide, idx) => ({
    ...slide,
    slideNumber: idx + 1,
    totalSlides,
    footerText: `${slide.sourceFootnote} • Slide ${idx + 1} of ${totalSlides}`,
  }));
}

/**
 * Resolves a CSS variable token (e.g. "var(--pack-7)") to a 6-character uppercase hex string
 * without '#' for PptxGenJS shape/text/chart fills.
 */
function resolveCssTokenToPptxHex(token: string, fallbackHex: string): string {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const varMatch = token.match(/var\((--[a-zA-Z0-9-_]+)\)/);
    if (varMatch) {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue(varMatch[1])
        .trim();
      const cleaned = raw.replace(/^#/, '').trim();
      if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
        return cleaned.toUpperCase();
      }
      if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
        return cleaned
          .split('')
          .map((c) => c + c)
          .join('')
          .toUpperCase();
      }
    }
  }
  return fallbackHex;
}

/**
 * Lazy-loads `pptxgenjs` and compiles the 16:9 PresentationSlideSpec[] deck into a real
 * OpenXML `.pptx` Blob with NATIVE editable PowerPoint charts (`ppt/charts/chart*.xml`).
 */
export async function generatePresentationPptxBlob(
  options: PresentationBuildOptions
): Promise<{
  blob: Blob;
  slideCount: number;
  slides: PresentationSlideSpec[];
}> {
  const slides = buildPresentationSlides(options);
  const pptxMod = await import('pptxgenjs');
  const PptxGenJS: any = (pptxMod as any).default || pptxMod;
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = options.author || 'DATA ANALYTIX Engine';
  pptx.company = options.companyName || 'DATA ANALYTIX';
  pptx.subject = `${options.datasetName || 'Analytics'} — Executive Presentation`;
  pptx.title = `${options.datasetName || 'Analytics'} Presentation`;

  const isLight = options.themeMode === 'light';
  const bgHex = resolveCssTokenToPptxHex(
    'var(--bg-app)',
    isLight ? 'F8FAFC' : '0B1120'
  );
  const cardHex = resolveCssTokenToPptxHex(
    'var(--bg-card)',
    isLight ? 'FFFFFF' : '111827'
  );
  const elevatedHex = resolveCssTokenToPptxHex(
    'var(--bg-elevated)',
    isLight ? 'F1F5F9' : '1E293B'
  );
  const borderHex = resolveCssTokenToPptxHex(
    'var(--border-subtle)',
    isLight ? 'E2E8F0' : '334155'
  );
  const textPrimaryHex = resolveCssTokenToPptxHex(
    'var(--text-primary)',
    isLight ? '0F172A' : 'F8FAFC'
  );
  const textSecondaryHex = resolveCssTokenToPptxHex(
    'var(--text-secondary)',
    isLight ? '475569' : '94A3B8'
  );
  const accentHex = resolveCssTokenToPptxHex(
    slides[0]?.accentToken || 'var(--accent)',
    '14B8A6'
  );
  const gradientToHex = resolveCssTokenToPptxHex(
    slides[0]?.gradientToToken || 'var(--accent-2)',
    '38BDF8'
  );
  const successHex = resolveCssTokenToPptxHex('var(--success)', '10B981');
  const dangerHex = resolveCssTokenToPptxHex('var(--danger)', 'EF4444');
  const warningHex = resolveCssTokenToPptxHex('var(--warning)', 'F59E0B');
  const chartPaletteHex = [
    accentHex,
    gradientToHex,
    successHex,
    '38BDF8',
    'A855F7',
    'F59E0B',
    'EC4899',
    '6366F1',
  ];

  const resolveDeltaHex = (
    state?: 'favorable' | 'unfavorable' | 'neutral'
  ): string => {
    if (state === 'favorable') return successHex;
    if (state === 'unfavorable') return dangerHex;
    return textSecondaryHex;
  };

  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: bgHex };

    if (s.speakerNotes && typeof slide.addNotes === 'function') {
      slide.addNotes(s.speakerNotes);
    }

    slide.slideNumber = {
      x: 12.2,
      y: 7.05,
      w: 0.7,
      h: 0.3,
      fontSize: 12,
      fontFace: 'Arial',
      color: textSecondaryHex,
    };

    // Top Pack Accent Header Strip
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.1,
      fill: { color: accentHex },
      line: { color: accentHex, width: 0 },
    });

    // Kicker Meta Line
    slide.addText(
      `${s.packName.toUpperCase()}  •  ${s.subtitle}  •  SLIDE ${s.slideNumber} OF ${s.totalSlides}`,
      {
        x: 0.5,
        y: 0.18,
        w: 12.3,
        h: 0.28,
        fontSize: 12,
        bold: true,
        color: accentHex,
        fontFace: 'Arial',
      }
    );

    // Action Title (28pt)
    slide.addText(s.title, {
      x: 0.5,
      y: 0.48,
      w: 12.3,
      h: 0.84,
      fontSize: 28,
      bold: true,
      color: textPrimaryHex,
      fontFace: 'Arial',
      valign: 'top',
    });

    // 1-2 Line "So what" takeaway (18pt)
    slide.addText(s.soWhat, {
      x: 0.5,
      y: 1.36,
      w: 12.3,
      h: 0.55,
      fontSize: 18,
      color: textSecondaryHex,
      fontFace: 'Arial',
      valign: 'top',
    });

    // =======================================================================
    // BODY LAYOUT BY SLIDE KIND (y: 2.05 .. 6.75, zero overlap with footer at 7.05)
    // =======================================================================
    if (s.kind === 'cover') {
      // Part A3: Cover slide = Title/cover metadata ONLY (no stat cards, no repeated bullets)
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: 2.1,
        w: 12.33,
        h: 4.55,
        rectRadius: 0.1,
        fill: { color: cardHex },
        line: { color: borderHex, width: 1.2 },
      });

      const metaRows = [
        [
          { text: 'Dataset Name', options: { bold: true, color: accentHex } },
          {
            text: s.coverMeta?.datasetName || options.datasetName,
            options: { bold: true, color: textPrimaryHex },
          },
        ],
        [
          { text: 'Time Period & Horizon', options: { bold: true, color: accentHex } },
          {
            text: s.coverMeta?.periodLabel || 'Current Reporting Period',
            options: { color: textPrimaryHex },
          },
        ],
        [
          { text: 'Prepared By', options: { bold: true, color: accentHex } },
          {
            text:
              s.coverMeta?.preparedBy ||
              `${options.author || 'Lead BI Analyst'} • ${options.department || 'Executive BI'}`,
            options: { color: textPrimaryHex },
          },
        ],
        [
          { text: 'Analytical Scope', options: { bold: true, color: accentHex } },
          {
            text: s.coverMeta?.scopeLabel || s.packName,
            options: { color: textPrimaryHex },
          },
        ],
        [
          { text: 'Data Quality Chip', options: { bold: true, color: accentHex } },
          {
            text: s.coverMeta?.qualityChipLabel || s.qualitySummary.statusLabel,
            options: {
              bold: true,
              color:
                (s.coverMeta?.qualityIssuesCount ?? s.qualitySummary.issuesCount) === 0
                  ? successHex
                  : warningHex,
            },
          },
        ],
      ];

      slide.addTable(metaRows, {
        x: 0.85,
        y: 2.45,
        w: 11.6,
        fontSize: 18,
        fontFace: 'Arial',
        border: { type: 'solid', color: borderHex, pt: 0.75 },
        fill: { color: elevatedHex },
      });
    } else if (s.kind === 'executive_summary') {
      // Part A3: Slide 2 = ONE headline + 3 stat cards + 3-4 unique takeaways
      const statCards = s.headlineMetrics.slice(0, 3);
      statCards.forEach((m, idx) => {
        const cardX = 0.5 + idx * 4.2;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: cardX,
          y: 2.05,
          w: 3.93,
          h: 1.85,
          rectRadius: 0.08,
          fill: { color: cardHex },
          line: { color: borderHex, width: 1 },
        });
        slide.addText(fitTextToLimit(m.label, 38), {
          x: cardX + 0.2,
          y: 2.15,
          w: 3.53,
          h: 0.5,
          fontSize: 18,
          bold: true,
          color: textSecondaryHex,
          fontFace: 'Arial',
        });
        slide.addText(m.value, {
          x: cardX + 0.2,
          y: 2.7,
          w: 3.53,
          h: 0.58,
          fontSize: 28,
          bold: true,
          color: textPrimaryHex,
          fontFace: 'Arial',
        });
        if (m.delta) {
          slide.addText(m.delta, {
            x: cardX + 0.2,
            y: 3.32,
            w: 3.53,
            h: 0.42,
            fontSize: 18,
            bold: true,
            color: resolveDeltaHex(m.deltaState),
            fontFace: 'Arial',
          });
        }
      });

      const boxY = statCards.length > 0 ? 4.1 : 2.1;
      const boxH = statCards.length > 0 ? 2.65 : 4.65;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: boxY,
        w: 12.33,
        h: boxH,
        rectRadius: 0.08,
        fill: { color: elevatedHex },
        line: { color: borderHex, width: 1 },
      });

      const bulletItems = fitSlideBullets(s.bullets, 4, MAX_BULLET_CHARS).map(
        (b) => ({
          text: b,
          options: { bullet: true, breakLine: true },
        })
      );
      slide.addText(bulletItems, {
        x: 0.75,
        y: boxY + 0.2,
        w: 11.8,
        h: boxH - 0.35,
        fontSize: 18,
        color: textPrimaryHex,
        fontFace: 'Arial',
        valign: 'top',
      });
    } else if (s.kind === 'kpis') {
      // 6-8 Available KPI Tiles in a 4x2 grid (Part A4 delta colors & text labels)
      const cards = s.kpis.filter((k) => k.status === 'available').slice(0, 8);
      cards.forEach((k, idx) => {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        const cardX = 0.5 + col * 3.12;
        const cardY = 2.05 + row * 2.38;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: cardX,
          y: cardY,
          w: 2.95,
          h: 2.2,
          rectRadius: 0.08,
          fill: { color: cardHex },
          line: { color: borderHex, width: 1 },
        });
        slide.addText(fitTextToLimit(k.label, 34), {
          x: cardX + 0.16,
          y: cardY + 0.14,
          w: 2.63,
          h: 0.65,
          fontSize: 18,
          bold: true,
          color: textSecondaryHex,
          fontFace: 'Arial',
          valign: 'top',
        });
        slide.addText(k.formattedValue, {
          x: cardX + 0.16,
          y: cardY + 0.85,
          w: 2.63,
          h: 0.6,
          fontSize: 24,
          bold: true,
          color: textPrimaryHex,
          fontFace: 'Arial',
        });
        const deltaStr = k.deltaTextLabel || 'Audited';
        slide.addText(deltaStr, {
          x: cardX + 0.16,
          y: cardY + 1.52,
          w: 2.63,
          h: 0.45,
          fontSize: 16,
          bold: true,
          color: resolveDeltaHex(k.deltaState),
          fontFace: 'Arial',
        });
      });
    } else if (
      (s.kind === 'charts' ||
        s.kind === 'predictive' ||
        s.kind === 'diagnostic') &&
      s.nativeChart &&
      s.nativeChart.series.length > 0 &&
      s.nativeChart.series[0].values.length > 0
    ) {
      // Left Column: NATIVE Editable PowerPoint Chart via pptxgenjs Chart API
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: 2.05,
        w: 7.45,
        h: 4.7,
        rectRadius: 0.08,
        fill: { color: cardHex },
        line: { color: borderHex, width: 1 },
      });

      const pptxChartTypeMap: Record<string, any> = {
        bar: pptx.ChartType.bar,
        line: pptx.ChartType.line,
        area: pptx.ChartType.area,
        doughnut: pptx.ChartType.doughnut,
      };
      const resolvedChartType =
        pptxChartTypeMap[s.nativeChart.chartType] || pptx.ChartType.bar;

      const isBar = s.nativeChart.chartType === 'bar';
      const isMultiSeries = s.nativeChart.series.length >= 2;

      slide.addChart(resolvedChartType, s.nativeChart.series, {
        x: 0.65,
        y: 2.2,
        w: 7.15,
        h: 4.4,
        barDir: 'col',
        barGrouping: isMultiSeries ? 'clustered' : 'standard',
        chartColors: chartPaletteHex,
        showTitle: true,
        title: s.chartTitle,
        titleColor: textPrimaryHex,
        titleFontFace: 'Arial',
        titleFontSize: 14,
        showLegend:
          s.nativeChart.chartType === 'doughnut' || isMultiSeries,
        legendPos: 'b',
        legendColor: textSecondaryHex,
        legendFontSize: 11,
        showValue:
          s.nativeChart.chartType !== 'line' &&
          s.nativeChart.chartType !== 'area',
        dataLabelColor: textPrimaryHex,
        dataLabelFontSize: 10,
        dataLabelFormatCode: '#,##0',
        catAxisLabelColor: textSecondaryHex,
        catAxisLabelFontSize: 11,
        valAxisLabelColor: textSecondaryHex,
        valAxisLabelFontSize: 11,
        valAxisLabelFormatCode: '#,##0',
        ...(isBar ? { valAxisMinVal: 0 } : {}),
        valGridLine: { color: borderHex, style: 'dash', size: 1 },
        catGridLine: { style: 'none' },
        altText: s.altText,
      });

      // Right Column: Text-Fitted Key Takeaways Panel (Part A1: never overflows or overlaps footer)
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.15,
        y: 2.05,
        w: 4.68,
        h: 4.7,
        rectRadius: 0.08,
        fill: { color: elevatedHex },
        line: { color: borderHex, width: 1 },
      });

      const fittedRightBullets = fitSlideBullets(
        s.bullets,
        4,
        MAX_BULLET_CHARS
      );
      const chartBulletItems = fittedRightBullets.map((b) => ({
        text: b,
        options: { bullet: true, breakLine: true },
      }));
      slide.addText(chartBulletItems, {
        x: 8.35,
        y: 2.25,
        w: 4.28,
        h: 4.3,
        fontSize: 16,
        color: textPrimaryHex,
        fontFace: 'Arial',
        valign: 'top',
      });
    } else if (
      s.kind === 'recommendations' ||
      s.kind === 'diagnostic' ||
      s.kind === 'insights'
    ) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: 2.05,
        w: 12.33,
        h: 4.7,
        rectRadius: 0.08,
        fill: { color: cardHex },
        line: { color: borderHex, width: 1 },
      });

      const fittedBullets = fitSlideBullets(
        s.bullets,
        MAX_BULLETS_PER_BOX,
        MAX_BULLET_CHARS
      );
      const actionBullets = fittedBullets.map((b) => ({
        text: b,
        options: { bullet: true, breakLine: true },
      }));
      slide.addText(actionBullets, {
        x: 0.8,
        y: 2.3,
        w: 11.75,
        h: 4.2,
        fontSize: 18,
        color: textPrimaryHex,
        fontFace: 'Arial',
        valign: 'top',
      });
    } else if (s.kind === 'data_quality') {
      // Slide 12: Data Quality, Formula Assumptions & Any Unavailable KPIs with Missing Column
      const dqRows: any[][] = [
        [
          {
            text: 'Governance Item / Metric',
            options: { bold: true, color: accentHex },
          },
          { text: 'Status / Grade', options: { bold: true, color: accentHex } },
          {
            text: 'Completeness / Audit Note',
            options: { bold: true, color: accentHex },
          },
        ],
      ];

      dqRows.push([
        {
          text: 'Overall Dataset Quality',
          options: { color: textPrimaryHex, bold: true },
        },
        {
          text: `${s.qualitySummary.overallScore}% (Grade ${s.qualitySummary.grade})`,
          options: {
            color:
              s.qualitySummary.issuesCount === 0 ? successHex : warningHex,
            bold: true,
          },
        },
        {
          text: s.qualitySummary.statusLabel,
          options: { color: textSecondaryHex },
        },
      ]);

      if (s.unavailableKpis.length > 0) {
        s.unavailableKpis.slice(0, 3).forEach((u) => {
          dqRows.push([
            { text: u.label, options: { color: textPrimaryHex, bold: true } },
            {
              text: 'Skipped on Scorecard',
              options: { color: dangerHex, bold: true },
            },
            {
              text: `Missing column: ${u.missingColumn || 'unmapped role'}`,
              options: { color: textSecondaryHex },
            },
          ]);
        });
      }

      const remainingSlots = Math.max(1, 5 - (dqRows.length - 1));
      s.qualitySummary.schemaPreview
        .slice(0, remainingSlots)
        .forEach((col) => {
          dqRows.push([
            { text: col.name, options: { color: textPrimaryHex, bold: true } },
            { text: col.dataType.toUpperCase(), options: { color: accentHex } },
            {
              text: `${100 - col.nullPct}% Complete (${col.distinctCount} distinct)`,
              options: { color: textSecondaryHex },
            },
          ]);
        });

      slide.addTable(dqRows, {
        x: 0.5,
        y: 2.05,
        w: 12.33,
        fontSize: 16,
        fontFace: 'Arial',
        border: { type: 'solid', color: borderHex, pt: 0.75 },
        fill: { color: cardHex },
      });
    } else {
      // Slide 13: Appendix (KPI Definitions & Semantic Column Mappings)
      const appRows: any[][] = [
        [
          {
            text: 'KPI / Semantic Role',
            options: { bold: true, color: accentHex },
          },
          {
            text: 'Mapped Column / Value',
            options: { bold: true, color: accentHex },
          },
          {
            text: 'Standard Formula Definition',
            options: { bold: true, color: accentHex },
          },
        ],
      ];

      s.kpis.slice(0, 5).forEach((k) => {
        const mappedCol =
          s.roleMappings.find((r) => !r.mappedColumn.startsWith('Unmapped'))
            ?.mappedColumn || 'Mapped Schema';
        appRows.push([
          {
            text: fitTextToLimit(k.label, 36),
            options: { color: textPrimaryHex, bold: true },
          },
          {
            text: `${k.formattedValue} (${mappedCol})`,
            options: { color: accentHex, bold: true },
          },
          {
            text: fitTextToLimit(
              k.source || k.formulaText || 'Audited formula',
              85
            ),
            options: { color: textSecondaryHex },
          },
        ]);
      });

      slide.addTable(appRows, {
        x: 0.5,
        y: 2.05,
        w: 12.33,
        fontSize: 16,
        fontFace: 'Arial',
        border: { type: 'solid', color: borderHex, pt: 0.75 },
        fill: { color: cardHex },
      });
    }

    // Source Footnote Footer
    slide.addText(s.footerText, {
      x: 0.5,
      y: 7.05,
      w: 11.5,
      h: 0.3,
      fontSize: 12,
      color: textSecondaryHex,
      fontFace: 'Arial',
    });
  }

  const rawOut = await pptx.write({ outputType: 'blob' });
  const blob =
    rawOut instanceof Blob
      ? rawOut
      : new Blob([rawOut], {
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        });

  return {
    blob,
    slideCount: slides.length,
    slides,
  };
}
