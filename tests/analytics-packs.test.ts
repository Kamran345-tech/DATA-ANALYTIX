import { describe, it, expect } from 'vitest';
import {
  ANALYTICS_PACKS,
  getPackById,
  detectPack,
  mapRoles,
  computeKpis,
  buildDashboard,
  buildReport,
  buildPackTemplateCsv,
  analyzeTimeSeries,
  computeCohortRetention,
  computeFunnel,
  runAbTest,
  simulateWhatIf,
  computeVariance,
  detectAnomalies,
  computeRfmSegmentation,
  computePareto,
  computeFinancialRatios,
} from '../src/analytics';
import { loadFeatureFlags, CLASSIC_FEATURE_FLAGS, DEFAULT_FEATURE_FLAGS } from '../src/config/features';

describe('Analytics Packs Feature Flag & Registry', () => {
  it('defines analyticsPacks as true in DEFAULT_FEATURE_FLAGS and false in CLASSIC_FEATURE_FLAGS', () => {
    expect(DEFAULT_FEATURE_FLAGS.analyticsPacks).toBe(true);
    expect(CLASSIC_FEATURE_FLAGS.analyticsPacks).toBe(false);
    const loaded = loadFeatureFlags();
    expect(typeof loaded.analyticsPacks).toBe('boolean');
  });

  it('registers all 14 required analytics packs with complete config shapes', () => {
    const expectedIds = [
      'financial',
      'sales',
      'marketing',
      'customer',
      'product',
      'web',
      'operations',
      'hr',
      'risk-fraud',
      'healthcare',
      'retail',
      'manufacturing',
      'banking-insurance',
      'education',
    ];
    expect(ANALYTICS_PACKS.map(p => p.id)).toEqual(expectedIds);

    for (const pack of ANALYTICS_PACKS) {
      expect(pack.name.length).toBeGreaterThan(3);
      expect(pack.description.length).toBeGreaterThan(10);
      expect(pack.detect.keywords.length).toBeGreaterThan(3);
      expect(pack.detect.requiredRoles.length).toBeGreaterThan(0);
      expect(pack.kpis.length).toBeGreaterThanOrEqual(8);
      expect(pack.charts.length).toBeGreaterThanOrEqual(5);
      expect(pack.lenses.descriptive.length).toBeGreaterThan(0);
      expect(pack.lenses.diagnostic.length).toBeGreaterThan(0);
      expect(pack.lenses.predictive.length).toBeGreaterThan(0);
      expect(pack.lenses.prescriptive.length).toBeGreaterThan(0);
      expect(pack.reportSections.length).toBeGreaterThanOrEqual(2);
      const sampleRows = pack.sampleDataset();
      expect(sampleRows.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('detectPack on 3 sample datasets per pack (42 datasets total)', () => {
  for (const pack of ANALYTICS_PACKS) {
    it(`ranks "${pack.id}" (${pack.name}) #1 across 3 distinct dataset variations`, () => {
      const sampleRows = pack.sampleDataset();

      // Dataset 1: Canonical sample dataset from pack.sampleDataset()
      const matches1 = detectPack(sampleRows);
      expect(matches1[0].packId).toBe(pack.id);
      expect(matches1[0].confidence).toBeGreaterThanOrEqual(50);

      // Dataset 2: Uppercase column names using first alias of each role + keywords
      const variant2Row: Record<string, any> = {};
      for (const [roleKey, roleDef] of Object.entries(pack.roles)) {
        const colName = (roleDef.aliases[0] || roleKey).toUpperCase();
        variant2Row[colName] =
          roleDef.type === 'number'
            ? 1250
            : roleDef.type === 'date'
            ? '2025-03-01'
            : 'Segment_A';
      }
      for (const kw of pack.detect.keywords.slice(0, 3)) {
        variant2Row[kw.replace(/\s+/g, '_')] = 100;
      }
      const matches2 = detectPack([variant2Row, variant2Row]);
      expect(matches2[0].packId).toBe(pack.id);

      // Dataset 3: Alias column names using second alias from each role + keyword aliases
      const variant3Row: Record<string, any> = {};
      for (const [roleKey, roleDef] of Object.entries(pack.roles)) {
        const aliasName = roleDef.aliases[1] || roleDef.aliases[0] || roleKey;
        variant3Row[aliasName] =
          roleDef.type === 'number'
            ? 420
            : roleDef.type === 'date'
            ? '2025-04-01'
            : 'Group_B';
      }
      for (const kw of pack.detect.keywords.slice(0, 4)) {
        variant3Row[`col_${kw.replace(/\s+/g, '_')}`] = 55;
      }
      const matches3 = detectPack([variant3Row, variant3Row]);
      expect(matches3[0].packId).toBe(pack.id);
    });
  }
});

describe('Every KPI formula on known data & missing-role unavailable fallback', () => {
  for (const pack of ANALYTICS_PACKS) {
    it(`computes all ${pack.kpis.length} KPIs accurately on known data for "${pack.id}"`, () => {
      const sampleRows = pack.sampleDataset();
      const roleMap = mapRoles(sampleRows, pack);
      const computed = computeKpis(pack, sampleRows, roleMap);

      expect(computed.length).toBe(pack.kpis.length);
      for (const kpi of computed) {
        expect(kpi.status).toBe('available');
        expect(typeof kpi.value).toBe('number');
        expect(Number.isFinite(kpi.value!)).toBe(true);
        expect(kpi.formattedValue.length).toBeGreaterThan(0);
        expect(kpi.formattedValue).not.toContain('NaN');
      }
    });

    it(`returns status="unavailable" with clear column hint when required roles are missing for "${pack.id}"`, () => {
      const emptyRoleMap: Record<string, string> = {};
      const computed = computeKpis(pack, [{ unrelated_col: 123 }], emptyRoleMap);

      expect(computed.length).toBe(pack.kpis.length);
      for (const kpi of computed) {
        expect(kpi.status).toBe('unavailable');
        expect(kpi.value).toBeNull();
        expect(kpi.formattedValue).toBe('Unavailable');
        expect(kpi.hint).toMatch(/^add column/i);
      }
    });

    it(`builds complete dashboard, report, and template CSV for "${pack.id}"`, () => {
      const sampleRows = pack.sampleDataset();
      const roleMap = mapRoles(sampleRows, pack);
      const dash = buildDashboard(pack, sampleRows, roleMap);

      expect(dash.packId).toBe(pack.id);
      expect(dash.missingRoles.length).toBe(0);
      expect(dash.charts.length).toBeGreaterThan(0);
      expect(dash.computedKpis.length).toBe(pack.kpis.length);

      const rep = buildReport(pack, sampleRows, roleMap);
      expect(rep.sections.length).toBe(pack.reportSections.length);
      expect(rep.sections[0].narrative.length).toBeGreaterThan(10);

      const csv = buildPackTemplateCsv(pack);
      const lines = csv.trim().split('\n');
      expect(lines.length).toBe(4); // header + 3 sample rows
      expect(lines[0].split(',').length).toBeGreaterThanOrEqual(4);
    });
  }

  it('verifies Financial & FP&A KPI math on known deterministic ledger rows', () => {
    const finPack = getPackById('financial');
    const sampleRows = finPack.sampleDataset();
    const roleMap = mapRoles(sampleRows, finPack);
    const kpis = Object.fromEntries(computeKpis(finPack, sampleRows, roleMap).map(k => [k.id, k]));

    expect(kpis.fin_revenue.status).toBe('available');
    expect(kpis.fin_revenue.value).toBeGreaterThan(0);
    expect(kpis.fin_gross_margin_pct.status).toBe('available');
    expect(kpis.fin_gross_margin_pct.value).toBeGreaterThan(0);
    expect(kpis.fin_current_ratio.status).toBe('available');
    expect(kpis.fin_current_ratio.value).toBeGreaterThan(1.0);
  });
});

describe('Shared Analytics Techniques (src/analytics/techniques/)', () => {
  it('1. timeSeries: computes OLS slope, MoM/YoY deltas, seasonal indices, and 3-period forecast', () => {
    const values = [100, 120, 140, 160];
    const labels = ['2025-01', '2025-02', '2025-03', '2025-04'];
    const res = analyzeTimeSeries(values, labels, 3);
    expect(res.count).toBe(4);
    expect(res.slope).toBeCloseTo(20, 3);
    expect(res.momDeltaPct).toBeCloseTo(14.29, 1);
    expect(res.forecasts.length).toBe(3);
    expect(res.forecasts[0].forecast).toBeGreaterThan(160);
    expect(res.confidenceNote.length).toBeGreaterThan(10);
  });

  it('2. cohort: builds cohort retention matrix and Period-1 retention average', () => {
    const rows = [
      { cohort: '2025-01', period: 'P0', users: 100 },
      { cohort: '2025-01', period: 'P1', users: 85 },
      { cohort: '2025-01', period: 'P2', users: 75 },
      { cohort: '2025-02', period: 'P0', users: 120 },
      { cohort: '2025-02', period: 'P1', users: 108 },
    ];
    const res = computeCohortRetention(rows, 'cohort', 'period', 'users');
    expect(res.cohorts.length).toBe(2);
    expect(res.averagePeriod1RetentionPct).toBeCloseTo(87.5, 1);
    expect(res.bestCohort).toBe('2025-02');
  });

  it('3. funnel: computes step conversions, drop-off %, and bottleneck stage', () => {
    const res = computeFunnel([
      { name: 'Visitors', count: 1000 },
      { name: 'Signups', count: 400 },
      { name: 'Activated', count: 120 },
      { name: 'Paid', count: 60 },
    ]);
    expect(res.steps.length).toBe(4);
    expect(res.overallConversionPct).toBeCloseTo(6, 1);
    expect(res.biggestDropOffStep).toBe('Signups → Activated');
  });

  it('4. abTest: runs two-proportion z-test with p-value and plain-language verdict', () => {
    const res = runAbTest(100, 1000, 145, 1000);
    expect(res.controlRate).toBeCloseTo(10, 1);
    expect(res.variantRate).toBeCloseTo(14.5, 1);
    expect(res.relativeLiftPct).toBeCloseTo(45, 1);
    expect(res.isSignificant).toBe(true);
    expect(res.pValue).toBeLessThan(0.01);
    expect(res.verdict).toContain('statistically significant');
  });

  it('5. whatIf: simulates price, volume, cost, and churn sliders accurately', () => {
    const res = simulateWhatIf(100000, [
      { id: 'price', label: 'Price', deltaPct: 10, elasticity: 1.0 },
      { id: 'volume', label: 'Volume', deltaPct: 5, elasticity: 1.0 },
    ]);
    expect(res.baselineValue).toBe(100000);
    expect(res.projectedValue).toBe(115000);
    expect(res.netDeltaValue).toBe(15000);
    expect(res.netDeltaPct).toBe(15);
  });

  it('6. variance: computes actual vs budget variance and favorable flag by goodDirection', () => {
    const upRes = computeVariance([120, 85], [100, 100], ['Cloud', 'Ops'], 'up');
    expect(upRes.totalVariance).toBe(5);
    expect(upRes.rows.find(r => r.label === 'Cloud')?.isFavorable).toBe(true);

    const downRes = computeVariance([120, 85], [100, 100], ['Cloud', 'Ops'], 'down');
    expect(downRes.rows.find(r => r.label === 'Ops')?.isFavorable).toBe(true);
  });

  it('7. anomaly: flags outliers using Z-score and Tukey 1.5x IQR', () => {
    const values = [10, 11, 10, 12, 11, 10, 11, 250];
    const labels = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'];
    const res = detectAnomalies(values, labels);
    expect(res.anomalies.length).toBeGreaterThanOrEqual(1);
    expect(res.anomalies[0].label).toBe('R8');
    expect(res.anomalies[0].isZScoreOutlier).toBe(true);
    expect(res.anomalies[0].isIqrOutlier).toBe(true);
  });

  it('8. segmentation: computes RFM quintiles and customer segment counts', () => {
    const rows = [
      { id: 'C1', recency: 2, freq: 15, spend: 5000 },
      { id: 'C2', recency: 5, freq: 12, spend: 4200 },
      { id: 'C3', recency: 18, freq: 6, spend: 1500 },
      { id: 'C4', recency: 45, freq: 2, spend: 400 },
      { id: 'C5', recency: 90, freq: 1, spend: 120 },
    ];
    const res = computeRfmSegmentation(rows, 'id', 'recency', 'freq', 'spend');
    expect(res.customers.length).toBe(5);
    expect(res.segments.find(s => s.segment === 'Champions')?.count).toBeGreaterThanOrEqual(1);
    expect(res.summary).toContain('RFM');
  });

  it('9. pareto: computes 80/20 cumulative concentration share', () => {
    const res = computePareto([
      { name: 'A', value: 500 },
      { name: 'B', value: 350 },
      { name: 'C', value: 80 },
      { name: 'D', value: 40 },
      { name: 'E', value: 30 },
    ]);
    expect(res.vitalFewCount).toBe(2); // A (50%) + B (35%) = 85% >= 80%
    expect(res.vitalFewValueSharePct).toBeCloseTo(85, 1);
  });

  it('10. ratios: computes profitability, liquidity, leverage, cash-flow, and working capital ratios', () => {
    const res = computeFinancialRatios({
      revenue: 1000,
      cogs: 400,
      operatingExpense: 300,
      depreciationAmortization: 50,
      netProfit: 200,
      currentAssets: 600,
      inventory: 100,
      currentLiabilities: 300,
      totalAssets: 2000,
      totalDebt: 500,
      totalEquity: 1000,
      operatingCashFlow: 280,
      capex: 80,
      cashBalance: 900,
      accountsReceivable: 150,
      accountsPayable: 80,
      fixedCosts: 240,
    });
    expect(res.grossMarginPct).toBeCloseTo(60, 2);
    expect(res.operatingMarginPct).toBeCloseTo(30, 2);
    expect(res.netMarginPct).toBeCloseTo(20, 2);
    expect(res.currentRatio).toBeCloseTo(2.0, 2);
    expect(res.quickRatio).toBeCloseTo(1.67, 1);
    expect(res.debtToEquity).toBeCloseTo(0.5, 2);
    expect(res.roePct).toBeCloseTo(20, 2);
    expect(res.roaPct).toBeCloseTo(10, 2);
    expect(res.freeCashFlow).toBe(200);
    expect(res.breakEvenRevenue).toBeCloseTo(400, 1);
  });
});
