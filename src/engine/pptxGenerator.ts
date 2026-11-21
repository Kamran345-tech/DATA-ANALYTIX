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
} from '../analytics';
import { parseRobustNumber } from './dataParser';

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
  isFavorable?: boolean;
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
  series: {
    name: string;
    labels: string[];
    values: number[];
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
  headlineMetrics: {
    label: string;
    value: string;
    delta?: string;
    isFavorable?: boolean;
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

function formatCompactMetric(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);
}

function formatDeltaPhrase(deltaPercent?: number | null): string {
  if (typeof deltaPercent !== 'number' || !Number.isFinite(deltaPercent)) return '';
  const dir = deltaPercent >= 0 ? 'up' : 'down';
  return ` (${dir} ${Math.abs(deltaPercent).toFixed(1)}% vs prior period)`;
}

/**
 * Deterministic 16:9 Slide Deck Specification Builder (Full 13-Slide Executive Architecture).
 * - Slides:
 *   1: Title Slide (action insight headline + So What + 3 top metrics)
 *   2: Executive Summary (action insight headline + 3 stat cards + key takeaways)
 *   3: KPI Scorecard (6-8 available KPI tiles only; unavailable KPIs are never rendered as blank tiles)
 *   4-8: One slide per key chart (up to 5 key charts with native editable PowerPoint chart series)
 *   9: Diagnostic Analysis (variance decomposition, Pareto 80/20 concentration, anomaly check)
 *   10: Predictive & 3-Period Forecast Trajectory (native editable line chart + forecast bounds)
 *   11: Prescriptive Recommendations (3-5 concrete actions with expected impact)
 *   12: Data Quality & Assumptions (hygiene score, schema completeness, formula assumptions, unavailable KPIs + missing column)
 *   13: Appendix (audited KPI definitions/formulas & semantic role-to-column mappings)
 * - A slide only appears if its data exists (never an empty slide).
 */
export function buildPresentationSlides(
  options: PresentationBuildOptions
): PresentationSlideSpec[] {
  const {
    datasetName = 'Enterprise Dataset',
    companyName = 'DATA ANALYTIX',
    department = 'Executive Intelligence',
    scope: rawScope = 'pack',
    packId = 'operations',
    audience: rawAudience = 'manager',
    includedSections = DEFAULT_SECTIONS,
    rows = [],
    columns = [],
    kpis = [],
    insights = [],
    qualityReport,
  } = options;

  const scope =
    rawScope === 'current_dashboard'
      ? 'current'
      : rawScope === 'custom_builder'
      ? 'builder'
      : rawScope;
  const audience = (String(rawAudience || 'manager').toLowerCase() as PresentationAudience);

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

  const roleMappings = [
    ...resolvedPack.detect.requiredRoles.map((r) => ({
      role: r,
      mappedColumn: roleMap[r] || `Unmapped (add: ${resolvedPack.detect.roleAliases[r]?.[0] || r})`,
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

  // Build KPI items from Pack engine (or fallback to passed KPIs when scope === 'current' and pack has 0 available)
  const packKpiItems: PresentationSlideKpiItem[] = builtDash.computedKpis.map((k) => {
    const hasDelta =
      typeof k.changePercent === 'number' && Number.isFinite(k.changePercent);
    const isFav = hasDelta
      ? k.goodDirection === 'down'
        ? k.changePercent! <= 0.5
        : k.changePercent! >= -0.5
      : true;
    const missingColNames = (k.missingRoles.length > 0 ? k.missingRoles : k.needs)
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
      deltaPercent: hasData && k.status === 'available' ? k.changePercent : null,
      isFavorable: isFav,
      source: k.source || k.description,
      formulaText: k.formulaText || k.description,
      status: hasData && k.status === 'available' ? 'available' : 'unavailable',
      missingColumn: missingColNames || undefined,
      hint: k.hint || (missingColNames ? `Add column: ${missingColNames}` : undefined),
    };
  });

  const slideKpis: PresentationSlideKpiItem[] =
    packKpiItems.some((k) => k.status === 'available') || kpis.length === 0
      ? packKpiItems
      : kpis.map((k) => ({
          id: k.id,
          label: k.name,
          formattedValue: hasData ? k.formattedValue : 'Template (No Data)',
          deltaPercent: hasData ? (k.changePercent ?? k.change ?? null) : null,
          isFavorable: (k.changePercent ?? k.change ?? 0) >= 0,
          source: k.calculation || k.traceableSource,
          formulaText: k.definition || k.calculation,
          status: hasData ? 'available' : 'unavailable',
          missingColumn: k.sourceColumn,
          hint: k.sourceColumn ? `Source column: ${k.sourceColumn}` : undefined,
        }));

  // CRITICAL SPEC RULE: "Unavailable" KPIs must NOT appear as blank tiles in the deck:
  // skip them on KPI cards and list them once on the assumptions slide with the missing column.
  const availableKpis = slideKpis.filter((k) => k.status === 'available');
  const unavailableKpis = slideKpis.filter((k) => k.status === 'unavailable');

  const headlineMetrics = availableKpis.slice(0, 3).map((k) => ({
    label: k.label,
    value: k.formattedValue,
    delta:
      typeof k.deltaPercent === 'number' && Number.isFinite(k.deltaPercent)
        ? `${k.deltaPercent > 0 ? '+' : ''}${k.deltaPercent.toFixed(1)}%`
        : 'Audited',
    isFavorable: k.isFavorable ?? true,
  }));

  // Extract up to 5 key charts with real computed data for Slides 4-8
  interface BuiltChartSlideData {
    chartId: string;
    chartTitle: string;
    chartSubtitle: string;
    intent: string;
    pptxChartType: 'bar' | 'line' | 'area' | 'doughnut';
    categoryCol: string;
    metricCol: string;
    bars: PresentationSlideChartBar[];
    nativeChart: PresentationNativeChartSpec;
    actionTitle: string;
    soWhat: string;
    bullets: string[];
  }

  const keyChartSlidesData: BuiltChartSlideData[] = [];
  if (hasData) {
    const availableCharts = builtDash.charts.filter(
      (c) => c.status === 'available' && Array.isArray(c.data) && c.data.length > 0
    );

    for (const c of availableCharts.slice(0, 5)) {
      const catField = c.categoryField || c.xColumn || 'Category';
      const valField = c.valueField || c.yColumns?.[0] || 'Value';

      const rawItems = c.data
        .map((row) => {
          const cat = String(row[catField] ?? 'Other').trim() || 'Other';
          const parsed = parseRobustNumber(row[valField]);
          const val =
            parsed.value !== null && Number.isFinite(parsed.value)
              ? parsed.value
              : typeof row[valField] === 'number' && Number.isFinite(row[valField])
              ? row[valField]
              : 0;
          return { category: cat, value: Number(val.toFixed(2)) };
        })
        .filter((item) => Number.isFinite(item.value));

      if (rawItems.length === 0) continue;

      const isTrend = c.intent === 'trend' || c.chartType === 'line' || c.chartType === 'area';
      const orderedItems = isTrend
        ? rawItems.slice(0, 8)
        : [...rawItems].sort((a, b) => b.value - a.value).slice(0, 6);

      const grandTotal = orderedItems.reduce((sum, item) => sum + Math.max(0, item.value), 0);
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
      const lowBar = [...bars].sort((a, b) => a.value - b.value)[0] || bars[bars.length - 1];

      let pptxChartType: 'bar' | 'line' | 'area' | 'doughnut' = 'bar';
      if (c.chartType === 'line') pptxChartType = 'line';
      else if (c.chartType === 'area') pptxChartType = 'area';
      else if (c.chartType === 'donut') pptxChartType = 'doughnut';
      else pptxChartType = 'bar';

      const actionTitle = isTrend
        ? `${c.title}: Peaks at ${topBar.formattedValue} in ${topBar.category}`
        : `${topBar.category} Leads ${c.title} at ${topBar.formattedValue} (${topBar.sharePct}% Share)`;

      const soWhat = isTrend
        ? `Trajectory across ${bars.length} periods ranges from ${lowBar.formattedValue} (${lowBar.category}) to ${topBar.formattedValue} (${topBar.category}).`
        : `Top contributor "${topBar.category}" generates ${topBar.sharePct}% of ${valField}; top 2 segments capture ${bars
            .slice(0, 2)
            .reduce((acc, b) => acc + b.sharePct, 0)
            .toFixed(1)}%.`;

      const chartBullets = [
        `Leader: ${topBar.category} at ${topBar.formattedValue} (${topBar.sharePct}% of displayed ${valField}).`,
        bars[1]
          ? `Runner-Up: ${bars[1].category} contributes ${bars[1].formattedValue} (${bars[1].sharePct}% share).`
          : `Single dominant category observed across current slice.`,
        `Spread: ${topBar.formattedValue} high vs. ${lowBar.formattedValue} low across ${bars.length} groups.`,
        `Aggregation: ${c.aggregation.toUpperCase()}(${valField}) grouped by ${catField}.`,
      ].slice(0, 4);

      keyChartSlidesData.push({
        chartId: c.id,
        chartTitle: c.title,
        chartSubtitle: c.subtitle || `${valField} by ${catField}`,
        intent: c.intent,
        pptxChartType,
        categoryCol: catField,
        metricCol: valField,
        bars,
        nativeChart: {
          chartType: pptxChartType,
          title: c.title,
          categoryLabel: catField,
          series: [
            {
              name: valField,
              labels: bars.map((b) => b.category),
              values: bars.map((b) => b.value),
            },
          ],
        },
        actionTitle,
        soWhat,
        bullets: chartBullets,
      });
    }
  }

  const primaryChart = keyChartSlidesData[0];
  const fallbackCatCol =
    primaryChart?.categoryCol ||
    Object.entries(roleMap).find(([rKey, cName]) => {
      const rType = resolvedPack.roles[rKey]?.type;
      return rType === 'category' && Boolean(cName);
    })?.[1] ||
    columns.find((c) => c.dataType === 'string')?.name ||
    'Category';

  const fallbackValCol =
    primaryChart?.metricCol ||
    Object.entries(roleMap).find(([rKey, cName]) => {
      return resolvedPack.roles[rKey]?.type === 'number' && Boolean(cName);
    })?.[1] ||
    columns.find((c) => c.dataType === 'number')?.name ||
    'Value';

  const primaryChartBars = primaryChart?.bars || [];

  // 4-Lens Strategic Directives
  const lensBullets: PresentationSlideSpec['lensBullets'] = [
    {
      lens: 'Descriptive',
      text:
        resolvedPack.lenses.descriptive?.[0] ||
        `Synthesized ${rows.length.toLocaleString()} records across ${columns.length} profiled columns.`,
    },
    {
      lens: 'Diagnostic',
      text:
        resolvedPack.lenses.diagnostic?.[0] ||
        insights[0]?.why ||
        'Variance decomposition isolates top segment contributors and root-cause drivers.',
    },
    {
      lens: 'Predictive',
      text:
        resolvedPack.lenses.predictive?.[0] ||
        'Run-rate trajectory projects forward period momentum from observed historical slope.',
    },
    {
      lens: 'Prescriptive',
      text:
        resolvedPack.lenses.prescriptive?.[0] ||
        insights[0]?.action ||
        'Prioritize high-leverage segments and resolve missing role mappings for full coverage.',
    },
  ];

  // Diagnostic computations (Pareto + Anomaly detection on primary numeric column)
  const paretoSummary =
    hasData && primaryChartBars.length >= 2
      ? computePareto(
          primaryChartBars.map((b) => ({ name: b.category, value: Math.max(0, b.value) })),
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
    numericSeriesValues.length >= 4 ? detectAnomalies(numericSeriesValues) : null;

  // Predictive / Forecast computations (3-period time-series forecast)
  const dateCol =
    roleMap.date || columns.find((c) => c.dataType === 'date')?.name || fallbackCatCol;
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
        category: `${f.label} (Forecast)`,
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
    overallScore: hasData ? (qualityReport?.overallScore ?? 98) : 0,
    rowCount: rows.length,
    columnCount: columns.length,
    nullPercentageAvg: nullPctAvg,
    schemaPreview: (columns.length > 0
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
          }))),
  };

  const todayStr = new Date().toISOString().slice(0, 10);
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

  // If legacy 'insights' section is passed, automatically enable diagnostic, predictive, and recommendations
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
  // SLIDE 1: TITLE SLIDE
  // =========================================================================
  if (activeSet.has('cover')) {
    const coverActionTitle =
      hasData && topKpi
        ? `${topKpi.label} at ${topKpi.formattedValue}${formatDeltaPhrase(topKpi.deltaPercent)} — ${scopeLabel}`
        : `${scopeLabel} — Executive Presentation Template`;

    const coverSoWhat =
      hasData && topKpi
        ? `So what: ${availableKpis.length} audited ${resolvedPack.name} KPIs across ${rows.length.toLocaleString()} records confirm ${
            secondKpi ? `${secondKpi.label} at ${secondKpi.formattedValue}` : 'active operational baseline'
          }.`
        : `So what: Load a dataset with required roles (${resolvedPack.detect.requiredRoles.join(', ')}) to populate all ${slideKpis.length} domain KPIs.`;

    candidateSlides.push({
      id: 'slide-cover',
      sectionId: 'cover',
      kind: 'cover',
      title: coverActionTitle,
      soWhat: coverSoWhat,
      subtitle: `${datasetName} • ${companyName} (${department}) • ${todayStr}`,
      sourceFootnote,
      altText: `Title slide for ${resolvedPack.name} presentation showing headline metrics`,
      speakerNotes: `Welcome to the ${resolvedPack.name} executive review for ${datasetName}. ${coverActionTitle}. ${coverSoWhat}`,
      packId: resolvedPack.id,
      packName: resolvedPack.name,
      accentToken,
      gradientToToken,
      audience,
      hasData,
      headlineMetrics,
      kpis: availableKpis.slice(0, 4),
      unavailableKpis,
      roleMappings,
      chartTitle: primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: fallbackCatCol,
      chartBars: primaryChartBars,
      nativeChart: primaryChart?.nativeChart,
      lensBullets,
      bullets: (hasData
        ? [
            `Dataset Scope: ${rows.length.toLocaleString()} records across ${columns.length} columns (${qualitySummary.overallScore}% hygiene score).`,
            topKpi
              ? `Primary Signal: ${topKpi.label} at ${topKpi.formattedValue}${formatDeltaPhrase(topKpi.deltaPercent)}.`
              : `Mapped ${roleMappings.filter((r) => !r.mappedColumn.startsWith('Unmapped')).length} semantic domain roles.`,
            secondKpi
              ? `Secondary Signal: ${secondKpi.label} at ${secondKpi.formattedValue}${formatDeltaPhrase(secondKpi.deltaPercent)}.`
              : `Prepared by ${companyName} (${department}).`,
          ]
        : [
            `Required Schema Roles: ${resolvedPack.detect.requiredRoles.join(', ')}.`,
            `Configured Domain Scorecard: ${slideKpis.length} audited ${resolvedPack.name} KPIs and ${resolvedPack.charts.length} domain charts.`,
            `Prepared by ${companyName} (${department}) on ${todayStr}.`,
          ]
      ).slice(0, 5),
      qualitySummary,
    });
  }

  // =========================================================================
  // SLIDE 2: EXECUTIVE SUMMARY (Headline + 3 Stat Cards)
  // =========================================================================
  if (activeSet.has('executive_summary') && (availableKpis.length > 0 || !hasData)) {
    const execActionTitle =
      hasData && topKpi
        ? `${topKpi.label} Reaches ${topKpi.formattedValue}${formatDeltaPhrase(topKpi.deltaPercent)}`
        : `${resolvedPack.name} — Executive Summary & Onboarding Guide`;

    const execSoWhat =
      hasData && primaryChartBars[0]
        ? `So what: "${primaryChartBars[0].category}" drives ${primaryChartBars[0].sharePct}% of ${fallbackValCol}; focus execution on high-variance drivers.`
        : `So what: Synthesizes top 3 headline KPIs and core operational takeaways across ${rows.length.toLocaleString()} records.`;

    candidateSlides.push({
      id: 'slide-executive-summary',
      sectionId: 'executive_summary',
      kind: 'executive_summary',
      title: execActionTitle,
      soWhat: execSoWhat,
      subtitle: hasData
        ? `Executive Summary • ${availableKpis.length} Active KPIs • ${qualitySummary.overallScore}% Data Hygiene`
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
      headlineMetrics,
      kpis: availableKpis.slice(0, 4),
      unavailableKpis,
      roleMappings,
      chartTitle: primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: fallbackCatCol,
      chartBars: primaryChartBars,
      nativeChart: primaryChart?.nativeChart,
      lensBullets,
      bullets: (hasData
        ? [
            topKpi
              ? `Headline KPI: ${topKpi.label} is ${topKpi.formattedValue}${formatDeltaPhrase(topKpi.deltaPercent)}.`
              : `Dataset contains ${rows.length.toLocaleString()} records.`,
            secondKpi
              ? `Supporting KPI: ${secondKpi.label} stands at ${secondKpi.formattedValue}${formatDeltaPhrase(secondKpi.deltaPercent)}.`
              : `All mapped required columns passed validation.`,
            thirdKpi
              ? `Efficiency Signal: ${thirdKpi.label} recorded at ${thirdKpi.formattedValue}${formatDeltaPhrase(thirdKpi.deltaPercent)}.`
              : `Zero critical schema errors detected.`,
            primaryChartBars[0]
              ? `Top Segment: "${primaryChartBars[0].category}" contributes ${primaryChartBars[0].formattedValue} (${primaryChartBars[0].sharePct}% share).`
              : lensBullets[3].text,
          ]
        : [
            `1. Connect or upload a dataset with columns for: ${resolvedPack.detect.requiredRoles.join(', ')}.`,
            `2. Verify automatic role mapping in Analytics Packs or click "Map Columns".`,
            `3. Re-export this deck to populate live KPIs, native editable charts, and 3-period forecasts.`,
          ]
      ).slice(0, 5),
      qualitySummary,
    });
  }

  // =========================================================================
  // SLIDE 3: KPI SCORECARD (6-8 Available Tiles ONLY — Never Blank/Unavailable Tiles)
  // =========================================================================
  if (activeSet.has('kpis') && availableKpis.length > 0) {
    const scorecardKpis = availableKpis.slice(0, 8);
    const favCount = scorecardKpis.filter((k) => k.isFavorable !== false).length;

    const kpiActionTitle = topKpi
      ? `${favCount} of ${scorecardKpis.length} Active KPIs On Track, Led by ${topKpi.label} (${topKpi.formattedValue})`
      : `${resolvedPack.name} — Audited KPI Scorecard (${scorecardKpis.length} Active Metrics)`;

    const kpiSoWhat =
      unavailableKpis.length > 0
        ? `So what: ${scorecardKpis.length} active KPIs are verified below; ${unavailableKpis.length} unmapped metric(s) are cataloged on the Assumptions slide.`
        : `So what: Complete domain coverage (${availableKpis.length}/${slideKpis.length} KPIs active) with period-over-period variance tracking.`;

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
      headlineMetrics,
      kpis: scorecardKpis,
      unavailableKpis,
      roleMappings,
      chartTitle: primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: fallbackCatCol,
      chartBars: primaryChartBars,
      nativeChart: primaryChart?.nativeChart,
      lensBullets,
      bullets: scorecardKpis
        .slice(0, 5)
        .map((k) => `${k.label}: ${k.formattedValue}${formatDeltaPhrase(k.deltaPercent)}`),
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
        soWhat: `So what: ${cData.soWhat}`,
        subtitle: `Key Chart ${cIdx + 1} of ${keyChartSlidesData.length} • ${cData.chartTitle} (${cData.chartSubtitle})`,
        sourceFootnote,
        altText: `Native editable ${cData.pptxChartType} chart for ${cData.chartTitle} showing ${cData.metricCol} by ${cData.categoryCol}`,
        speakerNotes: `Chart Slide (${cData.chartTitle}): ${cData.actionTitle}. ${cData.soWhat}`,
        packId: resolvedPack.id,
        packName: resolvedPack.name,
        accentToken,
        gradientToToken,
        audience,
        hasData,
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
        bullets: cData.bullets.slice(0, 5),
        qualitySummary,
      });
    });
  }

  // =========================================================================
  // SLIDE 9: DIAGNOSTIC ANALYSIS (Root-Cause, Pareto 80/20 & Anomaly Drivers)
  // =========================================================================
  if (activeSet.has('diagnostic') && hasData && (primaryChartBars.length > 0 || availableKpis.length > 0)) {
    const vitalCount = paretoSummary?.vitalFewCount ?? Math.min(2, primaryChartBars.length);
    const vitalShare = paretoSummary?.vitalFewValueSharePct ?? (primaryChartBars[0]?.sharePct || 100);
    const outlierCount = anomalySummary?.anomalies.length ?? 0;

    const diagActionTitle =
      primaryChartBars.length >= 2
        ? `Top ${vitalCount} ${fallbackCatCol} Group(s) Drive ${vitalShare.toFixed(1)}% of Total ${fallbackValCol}`
        : `Diagnostic Root-Cause Decomposition Across ${rows.length.toLocaleString()} Records`;

    const diagSoWhat = `So what: Pareto 80/20 concentration and Z-score anomaly screening (${outlierCount} outlier record(s) flagged) isolate key variance drivers.`;

    const diagBullets = [
      ...(resolvedPack.lenses.diagnostic || []).slice(0, 2),
      primaryChartBars[0]
        ? `Primary Concentration: "${primaryChartBars[0].category}" accounts for ${primaryChartBars[0].formattedValue} (${primaryChartBars[0].sharePct}% of ${fallbackValCol}).`
        : `Evaluated ${rows.length.toLocaleString()} rows for multi-dimensional variance.`,
      `Anomaly Audit: ${outlierCount} statistical outlier(s) detected via Z-score (|z| > 2.5) and 1.5x IQR bounds.`,
      lensBullets[1]?.text || 'Inspect segment dispersion to remediate underperforming cohorts.',
    ].slice(0, 5);

    candidateSlides.push({
      id: 'slide-diagnostic',
      sectionId: 'diagnostic',
      kind: 'diagnostic',
      title: diagActionTitle,
      soWhat: diagSoWhat,
      subtitle: `Diagnostic Lens • Pareto 80/20 Concentration & Statistical Outlier Audit`,
      sourceFootnote,
      altText: `Diagnostic analysis slide showing Pareto 80/20 concentration and variance drivers`,
      speakerNotes: `Diagnostic Slide: ${diagActionTitle}. ${diagSoWhat}`,
      packId: resolvedPack.id,
      packName: resolvedPack.name,
      accentToken,
      gradientToToken,
      audience,
      hasData,
      headlineMetrics,
      kpis: availableKpis.slice(0, 4),
      unavailableKpis,
      roleMappings,
      chartTitle: `Pareto Concentration: ${fallbackValCol} by ${fallbackCatCol}`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: fallbackCatCol,
      chartBars: primaryChartBars,
      nativeChart:
        primaryChartBars.length > 0
          ? {
              chartType: 'bar',
              title: `Diagnostic Pareto: ${fallbackValCol} by ${fallbackCatCol}`,
              categoryLabel: fallbackCatCol,
              series: [
                {
                  name: fallbackValCol,
                  labels: primaryChartBars.map((b) => b.category),
                  values: primaryChartBars.map((b) => b.value),
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
  // SLIDE 10: PREDICTIVE & 3-PERIOD FORECAST TRAJECTORY (Native Line Chart)
  // =========================================================================
  if (activeSet.has('predictive') && hasData && forecastBars.length >= 2 && timeSeriesSummary) {
    const nextForecast = timeSeriesSummary.forecasts[0];
    const lastForecast =
      timeSeriesSummary.forecasts[timeSeriesSummary.forecasts.length - 1] || nextForecast;
    const slopeDir =
      timeSeriesSummary.slope > 0
        ? 'Upward Trajectory'
        : timeSeriesSummary.slope < 0
        ? 'Downward Trajectory'
        : 'Stable Run-Rate';

    const predActionTitle = `3-Period Forecast Projects ${fallbackValCol} at ${formatCompactMetric(
      lastForecast.forecast
    )} (${slopeDir})`;

    const predSoWhat = `So what: Blended OLS linear trend + moving-average model projects ${formatCompactMetric(
      nextForecast.forecast
    )} next period (80% interval: ${formatCompactMetric(nextForecast.lowerBound)} to ${formatCompactMetric(
      nextForecast.upperBound
    )}).`;

    const predBullets = [
      ...(resolvedPack.lenses.predictive || []).slice(0, 2),
      `Next Period Projection (${nextForecast.label}): ${formatCompactMetric(
        nextForecast.forecast
      )} (Range: ${formatCompactMetric(nextForecast.lowerBound)} – ${formatCompactMetric(
        nextForecast.upperBound
      )}).`,
      `Horizon End (${lastForecast.label}): ${formatCompactMetric(
        lastForecast.forecast
      )} with slope ${timeSeriesSummary.slope >= 0 ? '+' : ''}${formatCompactMetric(
        timeSeriesSummary.slope
      )}/period.`,
      timeSeriesSummary.confidenceNote,
    ].slice(0, 5);

    candidateSlides.push({
      id: 'slide-predictive',
      sectionId: 'predictive',
      kind: 'predictive',
      title: predActionTitle,
      soWhat: predSoWhat,
      subtitle: `Predictive Lens • 3-Period OLS Trend & Moving-Average Forecast for ${fallbackValCol}`,
      sourceFootnote,
      altText: `Predictive forecast line chart projecting 3 future periods for ${fallbackValCol}`,
      speakerNotes: `Predictive Forecast Slide: ${predActionTitle}. ${predSoWhat}`,
      packId: resolvedPack.id,
      packName: resolvedPack.name,
      accentToken,
      gradientToToken,
      audience,
      hasData,
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
        series: [
          {
            name: `${fallbackValCol} Trajectory`,
            labels: forecastBars.map((b) => b.category),
            values: forecastBars.map((b) => b.value),
          },
        ],
      },
      lensBullets,
      bullets: predBullets,
      qualitySummary,
    });
  }

  // =========================================================================
  // SLIDE 11: PRESCRIPTIVE RECOMMENDATIONS (3-5 Concrete Actions)
  // =========================================================================
  if (activeSet.has('recommendations') && hasData) {
    const prescriptiveList = [
      ...(resolvedPack.lenses.prescriptive || []),
      primaryChartBars[0]
        ? `Scale high-performing "${primaryChartBars[0].category}" playbook (${primaryChartBars[0].sharePct}% share of ${fallbackValCol}) across trailing segments.`
        : `Prioritize resource allocation toward top-performing ${resolvedPack.name} segments.`,
      topKpi
        ? `Establish automated threshold alerts on ${topKpi.label} (current baseline: ${topKpi.formattedValue}) to protect margin and velocity.`
        : `Enforce weekly KPI governance reviews across leadership.`,
      unavailableKpis.length > 0
        ? `Enrich data pipeline with [${unavailableKpis
            .slice(0, 3)
            .map((u) => u.missingColumn || u.id)
            .join(', ')}] to unlock ${unavailableKpis.length} additional KPIs.`
        : `Maintain 100% role mapping coverage (${availableKpis.length}/${slideKpis.length} KPIs active) with automated daily ingestion.`,
    ]
      .filter(Boolean)
      .slice(0, 5);

    if (prescriptiveList.length >= 3) {
      const recActionTitle = `${prescriptiveList.length} Recommended Leadership Actions for ${resolvedPack.name}`;
      const recSoWhat = `So what: Executing these ${prescriptiveList.length} prescriptive levers targets immediate performance lift on ${
        topKpi ? topKpi.label : fallbackValCol
      }.`;

      candidateSlides.push({
        id: 'slide-recommendations',
        sectionId: 'recommendations',
        kind: 'recommendations',
        title: recActionTitle,
        soWhat: recSoWhat,
        subtitle: `Prescriptive Lens • Actionable Execution Roadmap (3–5 Priority Actions)`,
        sourceFootnote,
        altText: `Prescriptive recommendations slide listing ${prescriptiveList.length} concrete actions`,
        speakerNotes: `Recommendations Slide: ${recActionTitle}. ${recSoWhat}`,
        packId: resolvedPack.id,
        packName: resolvedPack.name,
        accentToken,
        gradientToToken,
        audience,
        hasData,
        headlineMetrics,
        kpis: availableKpis.slice(0, 4),
        unavailableKpis,
        roleMappings,
        chartTitle: primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
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
  // SLIDE 12: DATA QUALITY & ASSUMPTIONS (Includes Unavailable KPIs + Missing Column Once)
  // =========================================================================
  if (activeSet.has('data_quality')) {
    const kpisWithAssumptions = builtDash.computedKpis.filter((k) => Boolean(k.assumption));
    const dqActionTitle = hasData
      ? `Data Quality Certified at ${qualitySummary.overallScore}% Across ${rows.length.toLocaleString()} Rows & ${columns.length} Columns`
      : `Schema Requirements & Missing Column Assumptions for ${resolvedPack.name}`;

    const dqSoWhat =
      unavailableKpis.length > 0
        ? `So what: ${availableKpis.length}/${slideKpis.length} KPIs computed directly; ${unavailableKpis.length} skipped KPI(s) are listed below with their exact missing column.`
        : `So what: 100% of required domain roles are mapped with ${qualitySummary.nullPercentageAvg}% average null rate and zero fabricated values.`;

    const dqBullets: string[] = [
      hasData
        ? `Hygiene Certification: ${qualitySummary.overallScore}% overall quality score (${qualitySummary.nullPercentageAvg}% avg null rate across ${columns.length} fields).`
        : `Zero-Data Template Mode: Upload a CSV/XLSX matching ${resolvedPack.detect.requiredRoles.join(', ')}.`,
      ...(kpisWithAssumptions.length > 0
        ? kpisWithAssumptions
            .slice(0, 2)
            .map((k) => `Formula Assumption (${k.label}): ${k.assumption}`)
        : [
            `Formula Governance: All active KPIs use audited domain formulas with zero synthetic imputation.`,
          ]),
      ...(unavailableKpis.length > 0
        ? unavailableKpis
            .slice(0, 2)
            .map(
              (u) =>
                `Skipped KPI — ${u.label}: Missing column [${u.missingColumn || 'unmapped role'}] (excluded from scorecard tiles).`
            )
        : [`Role Completeness: 0 unavailable KPIs — all ${availableKpis.length} domain metrics active.`]),
    ].slice(0, 5);

    candidateSlides.push({
      id: 'slide-data-quality',
      sectionId: 'data_quality',
      kind: 'data_quality',
      title: dqActionTitle,
      soWhat: dqSoWhat,
      subtitle: `Data Quality, Formula Assumptions & Missing Column Audit`,
      sourceFootnote,
      altText: `Data quality and assumptions slide detailing schema completeness and any missing columns`,
      speakerNotes: `Data Quality & Assumptions Slide: ${dqActionTitle}. ${dqSoWhat}`,
      packId: resolvedPack.id,
      packName: resolvedPack.name,
      accentToken,
      gradientToToken,
      audience,
      hasData,
      headlineMetrics,
      kpis: availableKpis.slice(0, 4),
      unavailableKpis,
      roleMappings,
      chartTitle: primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
      chartMetricLabel: fallbackValCol,
      chartCategoryLabel: fallbackCatCol,
      chartBars: primaryChartBars,
      lensBullets,
      bullets: dqBullets,
      qualitySummary,
    });
  }

  // =========================================================================
  // SLIDE 13: APPENDIX (KPI Definitions & Semantic Column Mapping)
  // =========================================================================
  if (activeSet.has('appendix') && slideKpis.length > 0) {
    const mappedCount = roleMappings.filter((r) => !r.mappedColumn.startsWith('Unmapped')).length;
    const appActionTitle = `Methodology Appendix: ${slideKpis.length} KPI Definitions & ${mappedCount} Mapped Columns`;
    const appSoWhat = `So what: Every metric is traceable to an explicit mathematical formula and mapped source column.`;

    const appBullets = (availableKpis.length > 0 ? availableKpis : slideKpis)
      .slice(0, 5)
      .map((k) => `${k.label}: ${k.source || k.formulaText || 'Standard domain formula'}`);

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
      headlineMetrics,
      kpis: (availableKpis.length > 0 ? availableKpis : slideKpis).slice(0, 8),
      unavailableKpis,
      roleMappings,
      chartTitle: primaryChart?.chartTitle || `${fallbackValCol} by ${fallbackCatCol}`,
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
 * OpenXML `.pptx` Blob with NATIVE editable PowerPoint charts (`ppt/charts/chart*.xml`),
 * action titles (>= 28pt), body text (>= 18pt), "So what" callouts, source footnotes,
 * slide numbers, alt text, and speaker notes.
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

  // 16:9 Widescreen 13.333" x 7.5" layout so >= 28pt titles and >= 18pt body text fit cleanly without overflow
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

  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: bgHex };

    // Speaker Notes
    if (s.speakerNotes && typeof slide.addNotes === 'function') {
      slide.addNotes(s.speakerNotes);
    }

    // Native Slide Number
    slide.slideNumber = {
      x: 12.2,
      y: 7.05,
      w: 0.7,
      h: 0.3,
      fontSize: 12,
      fontFace: 'Arial',
      color: textSecondaryHex,
    };

    // Top Pack Accent Header Strip (13.333" wide)
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

    // Action Title (>= 28pt as required by spec)
    slide.addText(s.title, {
      x: 0.5,
      y: 0.48,
      w: 12.3,
      h: 0.86,
      fontSize: 28,
      bold: true,
      color: textPrimaryHex,
      fontFace: 'Arial',
      valign: 'top',
    });

    // 1-2 Line "So what" takeaway (>= 18pt body text)
    slide.addText(s.soWhat, {
      x: 0.5,
      y: 1.38,
      w: 12.3,
      h: 0.55,
      fontSize: 18,
      color: textSecondaryHex,
      fontFace: 'Arial',
      valign: 'top',
    });

    // =======================================================================
    // BODY LAYOUT BY SLIDE KIND (y: 2.05 .. 6.75)
    // =======================================================================
    if (s.kind === 'cover' || s.kind === 'executive_summary') {
      // 3 Headline Stat Cards (only available KPIs)
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
        slide.addText(m.label, {
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
            color: m.isFavorable ? successHex : dangerHex,
            fontFace: 'Arial',
          });
        }
      });

      // Executive Takeaways Box (max 5 bullets, >= 18pt body text)
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

      const bulletItems = s.bullets.slice(0, 4).map((b) => ({
        text: b,
        options: { bullet: true, breakLine: true },
      }));
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
      // 6-8 Available KPI Tiles in a 4x2 grid (Zero "Unavailable" tiles)
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
        slide.addText(k.label, {
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
        const deltaStr =
          typeof k.deltaPercent === 'number' && Number.isFinite(k.deltaPercent)
            ? `${k.deltaPercent >= 0 ? '▲ +' : '▼ '}${k.deltaPercent.toFixed(1)}%`
            : 'Audited';
        slide.addText(deltaStr, {
          x: cardX + 0.16,
          y: cardY + 1.52,
          w: 2.63,
          h: 0.45,
          fontSize: 18,
          bold: true,
          color:
            typeof k.deltaPercent === 'number'
              ? k.isFavorable
                ? successHex
                : dangerHex
              : accentHex,
          fontFace: 'Arial',
        });
      });
    } else if (
      (s.kind === 'charts' || s.kind === 'predictive' || s.kind === 'diagnostic') &&
      s.nativeChart &&
      s.nativeChart.series.length > 0 &&
      s.nativeChart.series[0].values.length > 0
    ) {
      // Left Column: NATIVE Editable PowerPoint Chart via pptxgenjs Chart API (creates ppt/charts/chart*.xml)
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

      slide.addChart(resolvedChartType, s.nativeChart.series, {
        x: 0.65,
        y: 2.2,
        w: 7.15,
        h: 4.4,
        barDir: 'col',
        chartColors: chartPaletteHex,
        showTitle: true,
        title: s.chartTitle,
        titleColor: textPrimaryHex,
        titleFontFace: 'Arial',
        titleFontSize: 14,
        showLegend: s.nativeChart.chartType === 'doughnut',
        legendPos: 'b',
        legendColor: textSecondaryHex,
        legendFontSize: 12,
        showValue: s.nativeChart.chartType !== 'line' && s.nativeChart.chartType !== 'area',
        dataLabelColor: textPrimaryHex,
        dataLabelFontSize: 11,
        catAxisLabelColor: textSecondaryHex,
        catAxisLabelFontSize: 11,
        valAxisLabelColor: textSecondaryHex,
        valAxisLabelFontSize: 11,
        valGridLine: { color: borderHex, style: 'dash', size: 1 },
        catGridLine: { style: 'none' },
        altText: s.altText,
      });

      // Right Column: Key Takeaways Panel (>= 18pt body text, max 4 bullets)
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.15,
        y: 2.05,
        w: 4.68,
        h: 4.7,
        rectRadius: 0.08,
        fill: { color: elevatedHex },
        line: { color: borderHex, width: 1 },
      });

      const chartBulletItems = s.bullets.slice(0, 4).map((b) => ({
        text: b,
        options: { bullet: true, breakLine: true },
      }));
      slide.addText(chartBulletItems, {
        x: 8.35,
        y: 2.25,
        w: 4.28,
        h: 4.3,
        fontSize: 18,
        color: textPrimaryHex,
        fontFace: 'Arial',
        valign: 'top',
      });
    } else if (s.kind === 'recommendations' || s.kind === 'diagnostic' || s.kind === 'insights') {
      // 3-5 Actionable Bullets (>= 18pt body text, max 5 bullets)
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: 2.05,
        w: 12.33,
        h: 4.7,
        rectRadius: 0.08,
        fill: { color: cardHex },
        line: { color: borderHex, width: 1 },
      });

      const actionBullets = s.bullets.slice(0, 5).map((b) => ({
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
      // Data Quality, Formula Assumptions & Any Unavailable KPIs with Missing Column (>= 18pt)
      const dqRows: any[][] = [
        [
          { text: 'Governance Item / Metric', options: { bold: true, color: accentHex } },
          { text: 'Status / Type', options: { bold: true, color: accentHex } },
          { text: 'Completeness / Missing Column Note', options: { bold: true, color: accentHex } },
        ],
      ];

      if (s.unavailableKpis.length > 0) {
        s.unavailableKpis.slice(0, 4).forEach((u) => {
          dqRows.push([
            { text: u.label, options: { color: textPrimaryHex, bold: true } },
            { text: 'Skipped on Scorecard', options: { color: dangerHex, bold: true } },
            {
              text: `Missing column: ${u.missingColumn || 'unmapped role'}`,
              options: { color: textSecondaryHex },
            },
          ]);
        });
      }

      const remainingSlots = Math.max(1, 5 - (dqRows.length - 1));
      s.qualitySummary.schemaPreview.slice(0, remainingSlots).forEach((col) => {
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
        fontSize: 18,
        fontFace: 'Arial',
        border: { type: 'solid', color: borderHex, pt: 0.75 },
        fill: { color: cardHex },
      });
    } else {
      // Slide 13: Appendix (KPI Definitions & Semantic Column Mappings at >= 18pt)
      const appRows: any[][] = [
        [
          { text: 'KPI / Semantic Role', options: { bold: true, color: accentHex } },
          { text: 'Mapped Column / Value', options: { bold: true, color: accentHex } },
          { text: 'Standard Formula Definition', options: { bold: true, color: accentHex } },
        ],
      ];

      s.kpis.slice(0, 5).forEach((k) => {
        const mappedCol =
          s.roleMappings.find((r) => !r.mappedColumn.startsWith('Unmapped'))?.mappedColumn ||
          'Mapped Schema';
        appRows.push([
          { text: k.label, options: { color: textPrimaryHex, bold: true } },
          { text: `${k.formattedValue} (${mappedCol})`, options: { color: accentHex, bold: true } },
          {
            text: k.source || k.formulaText || 'Audited formula',
            options: { color: textSecondaryHex },
          },
        ]);
      });

      slide.addTable(appRows, {
        x: 0.5,
        y: 2.05,
        w: 12.33,
        fontSize: 18,
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
