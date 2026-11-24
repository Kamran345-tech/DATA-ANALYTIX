import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ANALYTICS_PACKS,
  getPackById,
  detectPack,
  mapRoles,
  computeKpis,
  buildDashboard,
  buildReport,
  buildPackTemplateCsv,
  parseRealNumber,
  parseAndNormalizeDates,
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

function parseSimpleCsv(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const splitCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map(l => {
    const vals = splitCsvLine(l);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] ?? '';
    });
    return obj;
  });
  return { headers, rows };
}

describe('Analytics Packs Feature Flag & Registry', () => {
  it('defines analyticsPacks as true in DEFAULT_FEATURE_FLAGS and false in CLASSIC_FEATURE_FLAGS', () => {
    expect(DEFAULT_FEATURE_FLAGS.analyticsPacks).toBe(true);
    expect(CLASSIC_FEATURE_FLAGS.analyticsPacks).toBe(false);
    const loaded = loadFeatureFlags();
    expect(typeof loaded.analyticsPacks).toBe('boolean');
  });

  it('registers all 14 required analytics packs with complete config shapes, formulaText, and source', () => {
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
      expect(pack.category).toBeTruthy();
      expect(pack.description.length).toBeGreaterThan(10);
      expect(pack.detect.keywords.length).toBeGreaterThan(3);
      expect(pack.detect.requiredRoles.length).toBeGreaterThan(0);
      expect(pack.kpis.length).toBeGreaterThanOrEqual(8);
      expect(pack.kpis.length).toBeLessThanOrEqual(12);
      expect(pack.charts.length).toBeGreaterThanOrEqual(6);
      expect(pack.charts.length).toBeLessThanOrEqual(8);
      expect(pack.lenses.length).toBe(4);
      expect(pack.lenses.descriptive.length).toBeGreaterThan(0);
      expect(pack.lenses.diagnostic.length).toBeGreaterThan(0);
      expect(pack.lenses.predictive.length).toBeGreaterThan(0);
      expect(pack.lenses.prescriptive.length).toBeGreaterThan(0);
      expect(pack.reportSections.length).toBeGreaterThanOrEqual(4);
      const sampleRows = pack.sampleDataset();
      expect(sampleRows.length).toBeGreaterThanOrEqual(4);

      // Task 1: Every KPI in all 14 packs must define formulaText and source
      for (const kpi of pack.kpis) {
        expect(kpi.formulaText, `${pack.id}.${kpi.id} formulaText`).toBeTruthy();
        expect(kpi.formulaText.length).toBeGreaterThan(15);
        expect(kpi.source, `${pack.id}.${kpi.id} source`).toBeTruthy();
        expect(kpi.source).toContain('=');
      }
    }
  });
});

describe('TASK 1: KPI Formula Correctness & Edge-Case Rules across all 14 Packs', () => {
  for (const pack of ANALYTICS_PACKS) {
    it(`evaluates "${pack.id}" on Dataset A (with nulls & formatted strings) and Dataset B (with zeros / divide-by-zero)`, () => {
      const sampleRows = pack.sampleDataset();
      const roleMap = mapRoles(sampleRows, pack);

      // Dataset A: Sample rows + a row containing nulls across all columns (nulls must be ignored, not poison averages)
      const nullRow: Record<string, any> = {};
      for (const key of Object.keys(sampleRows[0])) {
        nullRow[key] = null;
      }
      const datasetWithNulls = [...sampleRows, nullRow];
      const computedBase = computeKpis(pack, sampleRows, roleMap);
      const computedWithNulls = computeKpis(pack, datasetWithNulls, roleMap);

      for (let i = 0; i < computedBase.length; i++) {
        const baseKpi = computedBase[i];
        const nullKpi = computedWithNulls[i];
        expect(baseKpi.status).toBe('available');
        expect(nullKpi.status).toBe('available');
        expect(baseKpi.formulaText.length).toBeGreaterThan(15);
        expect(baseKpi.source).toContain('=');
        // Adding an all-null row must not change sums or averages!
        expect(nullKpi.value).toBeCloseTo(baseKpi.value!, 4);
      }

      // Dataset B: All-zero numeric values (divide-by-zero must return status='unavailable' and value=null, never NaN/Infinity)
      const zeroRow: Record<string, any> = {};
      for (const key of Object.keys(sampleRows[0])) {
        zeroRow[key] = key.includes('date') ? '2025-01-01' : 0;
      }
      const computedZeros = computeKpis(pack, [zeroRow, zeroRow], roleMap);
      for (const kpi of computedZeros) {
        if (kpi.value !== null) {
          expect(Number.isFinite(kpi.value)).toBe(true);
        } else {
          expect(kpi.status).toBe('unavailable');
          expect(kpi.formattedValue).toBe('Unavailable');
        }
      }
    });

    it(`returns status="unavailable" with exact missing column hint when required roles are missing for "${pack.id}"`, () => {
      const emptyRoleMap: Record<string, string> = {};
      const computed = computeKpis(pack, [{ unrelated_col: 123 }], emptyRoleMap);

      expect(computed.length).toBe(pack.kpis.length);
      for (const kpi of computed) {
        expect(kpi.status).toBe('unavailable');
        expect(kpi.value).toBeNull();
        expect(kpi.formattedValue).toBe('Unavailable');
        expect(kpi.hint).toMatch(/^Add column:/i);
      }
    });

    it(`builds complete dashboard, report, and template CSV for "${pack.id}"`, () => {
      const sampleRows = pack.sampleDataset();
      const roleMap = mapRoles(sampleRows, pack);
      const dash = buildDashboard(pack, sampleRows, roleMap);

      expect(dash.packId).toBe(pack.id);
      expect(dash.missingRoles.length).toBe(0);
      expect(dash.charts.length).toBeGreaterThanOrEqual(6);
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

  it('re-verifies hand-calculated domain formulas: DSO, DPO, Current/Quick Ratio, ROE, ROA, CAC, CLV, Churn, Retention, NPL, Loss Ratio, Readmission, Bed Occupancy, Attrition, Time-to-Hire, Inventory Turnover, Sell-Through, OEE, and Stickiness', () => {
    // 1. Financial: DSO, DPO, Current Ratio, Quick Ratio, ROE, ROA
    const finPack = getPackById('financial');
    const finRows = [
      {
        date: '2025-01-01',
        revenue: 'Rs 1,500,000',
        cogs: 'Rs 600,000',
        opex: 300000,
        net_income: 200000,
        ebitda: 350000,
        current_assets: 600000,
        inventory: 150000,
        current_liabilities: 300000,
        total_assets: 2000000,
        total_debt: 500000,
        total_equity: 1000000,
        ar: 150000,
        ap: 60000,
      },
    ];
    const finMap = mapRoles(finRows, finPack);
    const finKpis = Object.fromEntries(computeKpis(finPack, finRows, finMap).map(k => [k.id, k]));

    expect(finKpis.fin_dso_days.value).toBeCloseTo((150000 / 1500000) * 365, 2); // 36.5 days
    expect(finKpis.fin_dpo_days.value).toBeCloseTo((60000 / 600000) * 365, 2); // 36.5 days
    expect(finKpis.fin_current_ratio.value).toBeCloseTo(600000 / 300000, 2); // 2.0x
    expect(finKpis.fin_quick_ratio.value).toBeCloseTo((600000 - 150000) / 300000, 2); // 1.5x
    expect(finKpis.fin_roe_pct.value).toBeCloseTo((200000 / 1000000) * 100, 2); // 20.0%
    expect(finKpis.fin_roa_pct.value).toBeCloseTo((200000 / 2000000) * 100, 2); // 10.0%

    // Edge case: Negative equity must return null/unavailable for ROE
    const negEqKpis = Object.fromEntries(
      computeKpis(finPack, [{ ...finRows[0], net_income: -100000, total_equity: -500000 }], finMap).map(k => [k.id, k])
    );
    expect(negEqKpis.fin_roe_pct.status).toBe('unavailable');

    // 2. Marketing: CAC
    const mktPack = getPackById('marketing');
    const mktRows = [{ date: '2025-01-01', spend: '$50,000', impressions: 100000, clicks: 5000, conversions: 250, attributed_revenue: '$200,000' }];
    const mktKpis = Object.fromEntries(computeKpis(mktPack, mktRows, mapRoles(mktRows, mktPack)).map(k => [k.id, k]));
    expect(mktKpis.cac.value).toBeCloseTo(200, 2); // 50,000 / 250 = $200

    // 3. Customer: CLV, Churn %, Retention %
    const custPack = getPackById('customer');
    const custRows = [{ date: '2025-01-01', active_customers: 300, churned_customers: 15, mrr: 60000, clv: 18500 }];
    const custKpis = Object.fromEntries(computeKpis(custPack, custRows, mapRoles(custRows, custPack)).map(k => [k.id, k]));
    expect(custKpis.logo_churn_rate.value).toBeCloseTo(5.0, 2); // 15 / 300 = 5%
    expect(custKpis.gross_retention_rate.value).toBeCloseTo(95.0, 2); // (300 - 15) / 300 = 95%
    expect(custKpis.avg_clv.value).toBeCloseTo(18500, 2);

    // 4. Product: Stickiness (DAU/MAU) + DAU > MAU guard
    const prodPack = getPackById('product');
    const prodRows = [{ date: '2025-01-01', dau: 15000, mau: 50000 }];
    const prodKpis = Object.fromEntries(computeKpis(prodPack, prodRows, mapRoles(prodRows, prodPack)).map(k => [k.id, k]));
    expect(prodKpis.stickiness_ratio.value).toBeCloseTo(30.0, 2); // 15,000 / 50,000 = 30%
    const invalidProdKpis = Object.fromEntries(
      computeKpis(prodPack, [{ date: '2025-01-01', dau: 60000, mau: 50000 }], mapRoles(prodRows, prodPack)).map(k => [k.id, k])
    );
    expect(invalidProdKpis.stickiness_ratio.status).toBe('unavailable');

    // 5. Operations: Inventory Turnover (COGS / Avg Inventory)
    const opsPack = getPackById('operations');
    const opsRows = [{ date: '2025-01-01', shipments: 1000, cogs: 900000, inventory_units: 100000, inventory_turnover: 9.0 }];
    const opsKpis = Object.fromEntries(computeKpis(opsPack, opsRows, mapRoles(opsRows, opsPack)).map(k => [k.id, k]));
    expect(opsKpis.inventory_turnover.value).toBeCloseTo(9.0, 2);

    // 6. HR: Attrition % (Leavers / Average Headcount) & Time-to-Hire
    const hrPack = getPackById('hr');
    const hrRows = [{ date: '2025-01-01', headcount: 200, leavers: 24, attrition_pct: null, time_to_hire_days: 35 }];
    const hrKpis = Object.fromEntries(computeKpis(hrPack, hrRows, mapRoles(hrRows, hrPack)).map(k => [k.id, k]));
    expect(hrKpis.attrition_rate.value).toBeCloseTo(12.0, 2); // 24 / 200 = 12%
    expect(hrKpis.time_to_hire.value).toBeCloseTo(35.0, 2);

    // 7. Healthcare: Readmission % & Bed Occupancy % (including decimal 0.84 -> 84.0% normalization)
    const hcPack = getPackById('healthcare');
    const hcRows = [{ date: '2025-01-01', admissions: 500, readmissions: 45, bed_occupancy_pct: 0.84 }];
    const hcKpis = Object.fromEntries(computeKpis(hcPack, hcRows, mapRoles(hcRows, hcPack)).map(k => [k.id, k]));
    expect(hcKpis.readmission_rate.value).toBeCloseTo(9.0, 2); // 45 / 500 = 9%
    expect(hcKpis.bed_occupancy.value).toBeCloseTo(84.0, 2); // 0.84 normalized to 84%

    // 8. Retail: Sell-Through % (Units Sold / (Units Sold + On-Hand))
    const retPack = getPackById('retail');
    const retRows = [{ date: '2025-01-01', gmv: 100000, units_sold: 750, on_hand_units: 250, sell_through_pct: 75 }];
    const retKpis = Object.fromEntries(computeKpis(retPack, retRows, mapRoles(retRows, retPack)).map(k => [k.id, k]));
    expect(retKpis.sell_through_rate.value).toBeCloseTo(75.0, 2); // 750 / (750 + 250) = 75%

    // 9. Manufacturing: OEE (Availability * Performance * Quality)
    const mfgPack = getPackById('manufacturing');
    const mfgRows = [
      {
        date: '2025-01-01',
        produced_units: 1000,
        good_units: 980,
        oee_pct: 83.79,
        availability_pct: 90,
        performance_pct: 95,
        quality_pct: 98,
      },
    ];
    const mfgKpis = Object.fromEntries(computeKpis(mfgPack, mfgRows, mapRoles(mfgRows, mfgPack)).map(k => [k.id, k]));
    expect(mfgKpis.oee_score.value).toBeCloseTo(0.9 * 0.95 * 0.98 * 100, 2); // 83.79%

    // 10. Banking & Insurance: NPL % & Claims Loss Ratio %
    const bankPack = getPackById('banking-insurance');
    const bankRows = [
      {
        date: '2025-01-01',
        loan_portfolio: 100000000,
        npl_balance: 2000000,
        premiums: 5000000,
        claims_paid: 3000000,
      },
    ];
    const bankKpis = Object.fromEntries(computeKpis(bankPack, bankRows, mapRoles(bankRows, bankPack)).map(k => [k.id, k]));
    expect(bankKpis.npl_ratio.value).toBeCloseTo(2.0, 2); // 2M / 100M = 2.0%
    expect(bankKpis.claims_loss_ratio.value).toBeCloseTo(60.0, 2); // 3M / 5M = 60.0%
  });
});

describe('TASK 2: Auto-Detect Accuracy across 42 Messy CSV Fixtures & Confusion Table', () => {
  it('ranks the correct pack #1 across 42 messy CSV fixtures (>= 90% top-1, >= 98% top-3) and reports confusion matrix', () => {
    const fixturesDir = path.resolve(__dirname, 'fixtures');
    const packIds = ANALYTICS_PACKS.map(p => p.id);
    const confusion: Record<string, Record<string, number>> = {};
    for (const actual of packIds) {
      confusion[actual] = {};
      for (const pred of packIds) confusion[actual][pred] = 0;
    }

    let total = 0;
    let top1Correct = 0;
    let top3Correct = 0;

    for (const pack of ANALYTICS_PACKS) {
      const packDir = path.join(fixturesDir, pack.id);
      const files = fs.readdirSync(packDir).filter(f => f.endsWith('.csv')).sort();
      expect(files.length).toBe(3);

      for (const file of files) {
        const rawCsv = fs.readFileSync(path.join(packDir, file), 'utf8');
        const { headers, rows } = parseSimpleCsv(rawCsv);
        const matches = detectPack(headers, rows);
        const top1 = matches[0].packId;
        const top3 = matches.slice(0, 3).map(m => m.packId);

        confusion[pack.id][top1] = (confusion[pack.id][top1] || 0) + 1;
        total += 1;
        if (top1 === pack.id) top1Correct += 1;
        if (top3.includes(pack.id)) top3Correct += 1;

        expect(top1, `Fixture ${pack.id}/${file} ranked ${top1} instead of ${pack.id}`).toBe(pack.id);
        expect(matches[0].confidence).toBeGreaterThanOrEqual(60);
        expect(matches[0].isUncertain).toBe(false);
      }
    }

    const top1Accuracy = (top1Correct / total) * 100;
    const top3Accuracy = (top3Correct / total) * 100;
    expect(top1Accuracy).toBeGreaterThanOrEqual(90);
    expect(top3Accuracy).toBeGreaterThanOrEqual(98);
  });

  it('flags confidence < 60 as isUncertain=true with "Not sure, please choose"', () => {
    const ambiguousCols = ['col_a', 'col_b', 'random_notes', 'misc_flag'];
    const matches = detectPack(ambiguousCols, [{ col_a: 'foo', col_b: 'bar' }]);
    expect(matches[0].confidence).toBeLessThan(60);
    expect(matches[0].isUncertain).toBe(true);
    expect(matches[0].recommendationMessage).toBe('Not sure, please choose');
  });
});

describe('TASK 3 & Phase 2.4: Real-Data Robustness (Currency/Lakh/Crore/Percent/Accounting Strings, 3 Date Formats, Empty Rows, Duplicate Headers, 100k Rows < 10s)', () => {
  it('parses currency, South Asian Lakh/Crore, percent, thousand-separator, and accounting-negative strings accurately', () => {
    expect(parseRealNumber('Rs 1,200')).toBe(1200);
    expect(parseRealNumber('PKR 45,000.50')).toBeCloseTo(45000.5, 2);
    expect(parseRealNumber('Rs 4.5 Lakh')).toBe(450000);
    expect(parseRealNumber('PKR 12.2 Lakhs')).toBe(1220000);
    expect(parseRealNumber('Rs 2.5 Crore')).toBe(25000000);
    expect(parseRealNumber('INR 1.75 Cr')).toBe(17500000);
    expect(parseRealNumber('₹ 1,25,000')).toBe(125000);
    expect(parseRealNumber('12.5%')).toBeCloseTo(12.5, 2);
    expect(parseRealNumber('(300)')).toBe(-300);
    expect(parseRealNumber('($1,450.25)')).toBeCloseTo(-1450.25, 2);
    expect(parseRealNumber('€ 2.500,50')).toBeCloseTo(2500.5, 2);
    expect(parseRealNumber('N/A')).toBeNull();
    expect(parseRealNumber('')).toBeNull();
  });

  it('normalizes ISO, DD/MM/YYYY, MM/DD/YYYY, and Excel serial dates and warns when ambiguous', () => {
    // 1. Ambiguous slash dates (all parts <= 12, e.g. 04/05/2025)
    const ambig = parseAndNormalizeDates(['04/05/2025', '06/07/2025']);
    expect(ambig.hasAmbiguousSlashDates).toBe(true);
    expect(ambig.warning).toContain('Ambiguous slash dates');

    // 2. Mixed DD/MM/YYYY and MM/DD/YYYY in the same column
    const mixed = parseAndNormalizeDates(['25/01/2025', '01/25/2025', '2025-03-01']);
    expect(mixed.hasMixedFormats).toBe(true);
    expect(mixed.warning).toContain('Mixed DD/MM/YYYY and MM/DD/YYYY');
    expect(mixed.normalizedValues[0]).toBe('2025-01-25');
    expect(mixed.normalizedValues[1]).toBe('2025-01-25');
    expect(mixed.normalizedValues[2]).toBe('2025-03-01');

    // 3. Excel serial date (45658 -> 2025-01-01)
    const excel = parseAndNormalizeDates([45658]);
    expect(excel.normalizedValues[0]).toBe('2025-01-01');
  });

  it('Phase 2.4: parses a messy CSV containing currency symbols, Lakh/Crore, 3 date formats (ISO, DD/MM/YYYY, MM/DD/YYYY), empty rows, and duplicate headers', async () => {
    const { parseMessyCsvText } = await import('../src/engine/dataParser');
    const messyCsv = [
      '\uFEFFDate,Region,Revenue,Quota,Margin_Pct,Revenue',
      '   ',
      ',,,,,',
      '2025-01-15,North America,"Rs 4.5 Lakh","Rs 4.0 Lakh",32.5%,"Rs 12,000"',
      '25/02/2025,EMEA,"PKR 1.2 Crore","PKR 1.0 Crore",28.0%,"($300)"',
      '03/18/2025,APAC,"$850,000","$800,000",35.2%,"€ 2.500,50"',
      '   ',
      '2025-04-10,LATAM,"₹ 15,00,000","₹ 12,00,000",30.1%,"Rs 2.5 Lakh"',
      '',
    ].join('\r\n');

    const parsed = parseMessyCsvText(messyCsv, 'messy_regional_sales.csv');

    // Duplicate "Revenue" header must be deduplicated as "Revenue" and "Revenue_2"
    expect(parsed.columns).toEqual([
      'Date',
      'Region',
      'Revenue',
      'Quota',
      'Margin_Pct',
      'Revenue_2',
    ]);
    // Empty and comma-only lines must be stripped, leaving exactly 4 valid data rows
    expect(parsed.rows.length).toBe(4);
    expect(parsed.detectedTypes.Revenue).toBe('number');
    expect(parsed.detectedTypes.Quota).toBe('number');
    expect(parsed.detectedTypes.Margin_Pct).toBe('number');
    expect(parsed.detectedTypes.Date).toBe('date');

    // Check Lakh/Crore & currency numeric values
    expect(parsed.rows[0].Revenue).toBe(450000);
    expect(parsed.rows[1].Revenue).toBe(12000000);
    expect(parsed.rows[2].Revenue).toBe(850000);
    expect(parsed.rows[3].Revenue).toBe(1500000);
    expect(parsed.rows[1].Revenue_2).toBe(-300);
    expect(parsed.rows[2].Revenue_2).toBeCloseTo(2500.5, 2);

    // Check 3 date formats normalized to ISO YYYY-MM-DD
    expect(parsed.rows[0].Date).toBe('2025-01-15');
    expect(parsed.rows[1].Date).toBe('2025-02-25');
    expect(parsed.rows[2].Date).toBe('2025-03-18');
    expect(parsed.rows[3].Date).toBe('2025-04-10');
  });

  it('Phase 2.4: completes full 100,000-row upload pipeline (type inference + dataset profiling + pack detection + dashboard KPI & chart computation) in < 3,000 ms (well under 10s limit)', async () => {
    const { inferTypes } = await import('../src/engine/dataParser');
    const { profileDataset } = await import('../src/engine/dataProfiler');
    const salesPack = getPackById('sales');
    const baseRows = salesPack.sampleDataset();
    const largeRows: Record<string, any>[] = new Array(100000);
    for (let i = 0; i < 100000; i++) {
      largeRows[i] = baseRows[i % baseRows.length];
    }
    const colNames = Object.keys(baseRows[0]);

    const t0 = performance.now();
    const detectedTypes = inferTypes(colNames, largeRows);
    const tInfer = performance.now();
    const columns = profileDataset(colNames, largeRows, detectedTypes);
    const tProfile = performance.now();
    const detectedPacks = detectPack({ columns, rows: largeRows });
    const tDetect = performance.now();
    const dash = buildDashboard(salesPack, largeRows);
    const tEnd = performance.now();

    const totalMs = Number((tEnd - t0).toFixed(1));
    const totalSec = Number((totalMs / 1000).toFixed(3));
    console.log(
      `[Phase 2.4 100k-Row Pipeline Timing] total=${totalMs}ms (${totalSec}s) | inferTypes=${(
        tInfer - t0
      ).toFixed(1)}ms | profileDataset=${(tProfile - tInfer).toFixed(1)}ms | detectPack=${(
        tDetect - tProfile
      ).toFixed(1)}ms | buildDashboard=${(tEnd - tDetect).toFixed(1)}ms`
    );

    expect(detectedPacks[0].packId).toBe('sales');
    expect(dash.computedKpis.length).toBe(salesPack.kpis.length);
    expect(dash.charts.length).toBe(salesPack.charts.length);
    expect(totalMs).toBeLessThan(3000);
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
    expect(res.vitalFewCount).toBe(2);
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

describe('Part A Bug #5: Every Pack Sample Dataset Computes 100% Active KPIs (activeKpis === totalKpis)', () => {
  for (const pack of ANALYTICS_PACKS) {
    it(`pack "${pack.id}" (${pack.name}) shows all KPIs active (${pack.kpis.length}/${pack.kpis.length}) on its own sampleDataset`, () => {
      const sampleRows = pack.sampleDataset();
      expect(sampleRows.length).toBeGreaterThanOrEqual(4);

      const roleMap = mapRoles(sampleRows, pack);
      const dashboard = buildDashboard(pack, sampleRows, roleMap);

      const totalKpis = dashboard.computedKpis.length;
      const activeKpis = dashboard.computedKpis.filter(k => k.status === 'available').length;

      expect(totalKpis).toBe(pack.kpis.length);
      expect(activeKpis).toBe(totalKpis);
      expect(dashboard.unmappedRequiredRoles).toEqual([]);
    });
  }
});

