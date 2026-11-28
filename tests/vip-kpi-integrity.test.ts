import { describe, it, expect } from 'vitest';
import {
  ANALYTICS_PACKS,
  computeKpis,
  evaluateUnifiedKpiStatus,
  resolveRealKpiTarget,
  mapRoles,
} from '../src/analytics';
import { generateSmartNarrative } from '../src/engine/chartStudioEngine';
import { buildPresentationSlides } from '../src/engine/pptxGenerator';

describe('VIP KPI Data Integrity & Cross-Component Consistency', () => {
  const finPack = ANALYTICS_PACKS.find((p) => p.id === 'financial')!;

  it('1. No target -> returns targetValue=null, attainmentPct=null (no fabricated progress bar) and shows no status badge when no target and no comparison exist', () => {
    const rows = finPack.sampleDataset();
    const roleMapping = mapRoles(rows, finPack);
    const revenueKpiDef = finPack.kpis.find((k) => k.id === 'fin_revenue')!;
    expect(revenueKpiDef.target).toBeUndefined();

    const computed = computeKpis(finPack, rows, roleMapping);
    const revKpi = computed.find((k) => k.id === 'fin_revenue')!;
    expect(revKpi).toBeDefined();

    // No user target, no pack target, no mapped target column -> must NOT invent a target
    const targetRes = resolveRealKpiTarget({
      kpiId: revKpi.id,
      actualValue: revKpi.value,
      favorableDirection: revKpi.goodDirection,
      packTarget: revenueKpiDef.target,
      userTargets: {},
      rows,
      roleMapping,
    });

    expect(targetRes.targetValue).toBeNull();
    expect(targetRes.attainmentPct).toBeNull();
    expect(targetRes.targetSource).toBeNull();

    // When no target AND no comparison delta exist, no status badge is shown
    const noTargetNoComparison = evaluateUnifiedKpiStatus({
      kpiId: revKpi.id,
      actualValue: revKpi.value,
      favorableDirection: revKpi.goodDirection,
      packTarget: undefined,
      comparisonMode: 'prev_period',
      prevPeriodDeltaPct: null,
      priorYearDeltaPct: null,
    });
    expect(noTargetNoComparison.hasTarget).toBe(false);
    expect(noTargetNoComparison.attainmentPct).toBeNull();
    expect(noTargetNoComparison.hasStatus).toBe(false);
    expect(noTargetNoComparison.statusLabel).toBeNull();
  });

  it('2. Target present -> computes exact attainment (actual / target for up, target / actual for down)', () => {
    // Pack target present (e.g., Gross Margin % has target = 60 in financialPack)
    const rows = finPack.sampleDataset();
    const roleMapping = mapRoles(rows, finPack);
    const gmDef = finPack.kpis.find((k) => k.id === 'fin_gross_margin_pct')!;
    expect(gmDef.target).toBe(60);

    const computed = computeKpis(finPack, rows, roleMapping);
    const gmKpi = computed.find((k) => k.id === 'fin_gross_margin_pct')!;
    expect(gmKpi.value).not.toBeNull();

    const evalPackTarget = evaluateUnifiedKpiStatus({
      kpiId: gmKpi.id,
      actualValue: gmKpi.value,
      favorableDirection: gmKpi.goodDirection,
      packTarget: gmDef.target,
      comparisonMode: 'target',
      prevPeriodDeltaPct: gmKpi.deltaPct,
      priorYearDeltaPct: gmKpi.priorYearDeltaPct,
    });

    const expectedAttainment = Number((((gmKpi.value as number) / 60) * 100).toFixed(1));
    expect(evalPackTarget.hasTarget).toBe(true);
    expect(evalPackTarget.targetValue).toBe(60);
    expect(evalPackTarget.attainmentPct).toBe(expectedAttainment);
    expect(evalPackTarget.statusLabel).toBe('On track');

    // User target set via KPI target editor
    const userTargetRes = resolveRealKpiTarget({
      kpiId: 'fin_revenue',
      actualValue: 8160000,
      favorableDirection: 'up',
      packTarget: undefined,
      userTargets: { fin_revenue: 10000000 },
    });
    expect(userTargetRes.targetValue).toBe(10000000);
    expect(userTargetRes.targetSource).toBe('user');
    expect(userTargetRes.attainmentPct).toBeCloseTo(81.6, 1);

    // Lower-is-better KPI (e.g. Churn or DSO): attainment = target / actual * 100
    const downTargetEval = evaluateUnifiedKpiStatus({
      kpiId: 'fin_dso',
      actualValue: 4.0,
      favorableDirection: 'down',
      packTarget: 3.0,
      comparisonMode: 'target',
    });
    expect(downTargetEval.hasTarget).toBe(true);
    expect(downTargetEval.attainmentPct).toBe(75.0);
    expect(downTargetEval.statusLabel).toBe('Action needed');
  });

  it('3. Fewer than 3 distinct time periods -> sparkline is empty (hidden)', () => {
    const allRows = finPack.sampleDataset();
    const roleMapping = mapRoles(allRows, finPack);
    const dateCol = roleMapping.date;
    const distinctPeriods = Array.from(new Set(allRows.map((r) => String(r[dateCol])))).sort();
    const twoPeriods = distinctPeriods.slice(0, 2);
    const twoPeriodRows = allRows.filter((r) => twoPeriods.includes(String(r[dateCol])));
    const computed = computeKpis(finPack, twoPeriodRows, roleMapping);

    const availableKpis = computed.filter((k) => k.status === 'available');
    expect(availableKpis.length).toBeGreaterThan(0);
    for (const kpi of availableKpis) {
      expect(kpi.sparkline).toEqual([]);
      expect(kpi.periodSeries?.length).toBe(2);
    }
  });

  it('4. 3+ distinct time periods -> sparkline values equal the exact per-period KPI formula values and distinct KPIs have distinct sparklines', () => {
    const rows = finPack.sampleDataset();
    const roleMapping = mapRoles(rows, finPack);
    const dateCol = roleMapping.date;
    const distinctPeriods = Array.from(new Set(rows.map((r) => String(r[dateCol])))).sort();
    expect(distinctPeriods.length).toBeGreaterThanOrEqual(3);

    const computed = computeKpis(finPack, rows, roleMapping);

    const revKpi = computed.find((k) => k.id === 'fin_revenue')!;
    const gmKpi = computed.find((k) => k.id === 'fin_gross_margin_pct')!;
    const revDef = finPack.kpis.find((k) => k.id === 'fin_revenue')!;
    const gmDef = finPack.kpis.find((k) => k.id === 'fin_gross_margin_pct')!;

    const expectedRevSeries = distinctPeriods.map((p) =>
      Number((revDef.formula(rows.filter((r) => String(r[dateCol]) === p), roleMapping) as number).toFixed(2))
    );
    const expectedGmSeries = distinctPeriods.map((p) =>
      Number((gmDef.formula(rows.filter((r) => String(r[dateCol]) === p), roleMapping) as number).toFixed(2))
    );

    expect(revKpi.sparkline).toEqual(expectedRevSeries);
    expect(gmKpi.sparkline).toEqual(expectedGmSeries);
    expect(revKpi.sparkline.length).toBe(distinctPeriods.length);
    expect(revKpi.sparkline).not.toEqual(gmKpi.sparkline);
  });

  it('5. Unified Page Consistency -> KPI card, Gauge, Story Line, and PPTX slide all report the exact same status and direction of change', () => {
    const rows = finPack.sampleDataset();
    const roleMapping = mapRoles(rows, finPack);
    const computed = computeKpis(finPack, rows, roleMapping);
    const primaryKpi = computed[0]; // Total Revenue (fin_revenue)
    const primaryDef = finPack.kpis.find((k) => k.id === primaryKpi.id)!;

    // 1. KPI Card evaluation
    const kpiCardEval = evaluateUnifiedKpiStatus({
      kpiId: primaryKpi.id,
      actualValue: primaryKpi.value,
      favorableDirection: primaryKpi.goodDirection,
      packTarget: primaryDef.target ?? null,
      comparisonMode: 'prev_period',
      prevPeriodDeltaPct: primaryKpi.deltaPct,
      priorYearDeltaPct: primaryKpi.priorYearDeltaPct,
    });

    // 2. Target Radial Gauge evaluation (uses evaluateUnifiedKpiStatus with the same parameters)
    const gaugeEval = evaluateUnifiedKpiStatus({
      kpiId: primaryKpi.id,
      actualValue: primaryKpi.value,
      favorableDirection: primaryKpi.goodDirection,
      packTarget: kpiCardEval.targetValue,
      comparisonMode: 'prev_period',
      prevPeriodDeltaPct: primaryKpi.deltaPct,
      priorYearDeltaPct: null,
    });

    // 3. Story Line narrative evaluation
    const storyLine = generateSmartNarrative(
      rows,
      roleMapping.region || 'Region',
      roleMapping.revenue || 'Revenue',
      finPack.name,
      {
        dateCol: roleMapping.date,
        favorableDirection: primaryKpi.goodDirection,
        targetValue: kpiCardEval.targetValue,
        attainmentPct: kpiCardEval.attainmentPct,
        statusLabel: kpiCardEval.statusLabel,
      }
    );

    // 4. PPTX Slide Deck evaluation
    const slides = buildPresentationSlides({
      datasetName: `${finPack.name} Board View`,
      scope: 'pack',
      packId: finPack.id,
      rows,
      columns: [],
      themeMode: 'dark',
    });
    const kpiSlide = slides.find((s) => s.kind === 'kpis')!;
    const pptxPrimaryMetric = kpiSlide.kpis?.[0];

    // Assert all 4 report the exact same status ('On track') and direction ('up', +12.2%)
    expect(kpiCardEval.statusLabel).toBe('On track');
    expect(kpiCardEval.deltaEv.direction).toBe('up');
    expect(kpiCardEval.activeDeltaPct).toBeCloseTo(12.2, 1);

    expect(gaugeEval.statusLabel).toBe(kpiCardEval.statusLabel);
    expect(gaugeEval.deltaEv.direction).toBe(kpiCardEval.deltaEv.direction);
    expect(gaugeEval.activeDeltaPct).toBe(kpiCardEval.activeDeltaPct);

    expect(storyLine.direction).toBe(kpiCardEval.deltaEv.direction);
    expect(storyLine.trendDeltaPct).toBeCloseTo(kpiCardEval.activeDeltaPct!, 1);
    expect(storyLine.headline).toContain(`[${kpiCardEval.statusLabel}]`);

    expect(pptxPrimaryMetric).toBeDefined();
    expect(pptxPrimaryMetric?.statusLabel).toBe(kpiCardEval.statusLabel);
    expect(pptxPrimaryMetric?.deltaDirection).toBe(kpiCardEval.deltaEv.direction);
    expect(pptxPrimaryMetric?.deltaPercent).toBeCloseTo(kpiCardEval.activeDeltaPct!, 1);
  });
});
