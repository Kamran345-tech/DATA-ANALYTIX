import { describe, it, expect } from 'vitest';
import {
  applyVisualCalculation,
  computeAnalyticsPaneStats,
  computeKeyInfluencers,
  generateSmartNarrative,
  recommendRightVisual,
  parsePowerBiThemeJson,
  exportPowerBiThemeJson,
} from '../src/engine/chartStudioEngine';
import {
  detectGeographicColumns,
  matchDatasetToGeoRegions,
  resolveGeoFeature,
} from '../src/components/charts/geo/geoMatcher';
import { parseRealNumber, parseAndNormalizeDates } from '../src/analytics/packs/helpers';
import { parseFile } from '../src/engine/dataParser';

describe('Chart Studio, Offline Geo Maps, Visual Calculations & Messy Parser Tests', () => {
  describe('Part A3: Messy Currency, Lakh/Crore, 3 Date Formats, Empty Rows & Duplicate Headers', () => {
    it('parses currency symbols ($, Rs., PKR, €, £), parenthetical negatives, and lakh/crore values accurately', () => {
      expect(parseRealNumber('$1,245,000.50')).toBeCloseTo(1245000.5, 2);
      expect(parseRealNumber('Rs. 450,000')).toBe(450000);
      expect(parseRealNumber('PKR 1,200,000')).toBe(1200000);
      expect(parseRealNumber('€89,500.25')).toBeCloseTo(89500.25, 2);
      expect(parseRealNumber('($12,400)')).toBe(-12400);
      expect(parseRealNumber('2.5 lakh')).toBe(250000);
      expect(parseRealNumber('1.4 crore')).toBe(14000000);
      expect(parseRealNumber('18.5%')).toBeCloseTo(18.5, 2);
    });

    it('normalizes 3 distinct date formats (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY)', () => {
      const iso = parseAndNormalizeDates(['2025-03-15']);
      const dmy = parseAndNormalizeDates(['15/03/2025']);
      const mdy = parseAndNormalizeDates(['03/15/2025']);
      expect(iso.normalizedValues[0]).toBe('2025-03-15');
      expect(dmy.normalizedValues[0]).toBe('2025-03-15');
      expect(mdy.normalizedValues[0]).toBe('2025-03-15');
    });

    it('handles empty rows and duplicate headers cleanly in CSV parsing', async () => {
      const messyCsv = [
        'Date,Revenue,Revenue,Region',
        '2025-01-01,"$120,000","$15,000",Karachi',
        ',,,',
        '15/02/2025,"2.5 lakh","$25,000",Lahore',
      ].join('\n');

      const file = new File([messyCsv], 'messy.csv', { type: 'text/csv' });
      const parsed = await parseFile(file);
      expect(parsed.rows.length).toBe(2);
      expect(parsed.columns).toContain('Revenue');
      expect(parsed.columns).toContain('Region');
      expect(parseRealNumber(parsed.rows[0].Revenue)).not.toBeNull();
      expect(parseRealNumber(parsed.rows[1].Revenue)).not.toBeNull();
    });
  });

  describe('Part C1 & C2: Offline Geographic Column Detection & Region/Alias Matching (World, US States, Pakistan)', () => {
    it('auto-detects geographic columns and recommends Pakistan scope when Pakistani cities/provinces appear', () => {
      const pkRows = [
        { tarikh: '2025-01-01', province: 'Sindh', gmv: 500000 },
        { tarikh: '2025-02-01', province: 'Punjab', gmv: 720000 },
        { tarikh: '2025-03-01', province: 'KPK', gmv: 310000 },
        { tarikh: '2025-04-01', province: 'Balochistan', gmv: 190000 },
      ];
      const detected = detectGeographicColumns(pkRows);
      expect(detected.hasGeo).toBe(true);
      expect(detected.stateProvinceCol).toBe('province');
      expect(detected.recommendedScope).toBe('pakistan');
    });

    it('matches common aliases across World ("USA", "U.S.", "UAE", "UK"), US States ("CA", "TX"), and Pakistan ("Sindh", "Punjab", "KPK", "Balochistan", "Karachi", "Lahore", "Islamabad")', () => {
      expect(resolveGeoFeature('USA', 'world').feature?.id).toBe('USA');
      expect(resolveGeoFeature('U.S.', 'world').feature?.id).toBe('USA');
      expect(resolveGeoFeature('UK', 'world').feature?.id).toBe('GBR');
      expect(resolveGeoFeature('UAE', 'world').feature?.id).toBe('ARE');

      expect(resolveGeoFeature('CA', 'us-states').feature?.id).toBe('US-CA');
      expect(resolveGeoFeature('Texas', 'us-states').feature?.id).toBe('US-TX');

      expect(resolveGeoFeature('Sindh', 'pakistan').feature?.id).toBe('PK-SD');
      expect(resolveGeoFeature('Punjab', 'pakistan').feature?.id).toBe('PK-PB');
      expect(resolveGeoFeature('KPK', 'pakistan').feature?.id).toBe('PK-KP');
      expect(resolveGeoFeature('Balochistan', 'pakistan').feature?.id).toBe('PK-BA');
      expect(resolveGeoFeature('Karachi', 'pakistan').feature?.id).toBe('PK-SD');
      expect(resolveGeoFeature('Lahore', 'pakistan').feature?.id).toBe('PK-PB');
      expect(resolveGeoFeature('Islamabad', 'pakistan').feature?.id).toBe('PK-IS');
    });

    it('reports unmatched values with suggested regions and resolves them via one-click custom mapping', () => {
      const rows = [
        { region: 'Karachi', sales: 400 },
        { region: 'Lahore', sales: 500 },
        { region: 'UnknownMarsBase', sales: 120 },
      ];
      const beforeFix = matchDatasetToGeoRegions(rows, 'region', 'sales', 'pakistan');
      expect(beforeFix.totalMatchedRows).toBe(2);
      expect(beforeFix.unmatchedValues.length).toBe(1);
      expect(beforeFix.unmatchedValues[0].rawValue).toBe('UnknownMarsBase');

      // Apply one-click mapping fix
      const afterFix = matchDatasetToGeoRegions(rows, 'region', 'sales', 'pakistan', {
        UnknownMarsBase: 'PK-IS',
      });
      expect(afterFix.totalMatchedRows).toBe(3);
      expect(afterFix.unmatchedValues.length).toBe(0);
    });
  });

  describe('Part D4: Visual Calculations (running_total, moving_average, percent_of_total, rank, diff_from_prev)', () => {
    const sample = [
      { month: 'Jan', rev: 100 },
      { month: 'Feb', rev: 200 },
      { month: 'Mar', rev: 300 },
      { month: 'Apr', rev: 400 },
    ];

    it('computes running_total and DAX-style formula text', () => {
      const res = applyVisualCalculation(sample, 'rev', 'running_total');
      expect(res.rows.map((r) => r.__calcValue)).toEqual([100, 300, 600, 1000]);
      expect(res.formulaText).toContain('RUNNINGSUM');
    });

    it('computes 3-period moving_average accurately', () => {
      const res = applyVisualCalculation(sample, 'rev', 'moving_average', 3);
      expect(res.rows[0].__calcValue).toBe(100);
      expect(res.rows[1].__calcValue).toBe(150);
      expect(res.rows[2].__calcValue).toBe(200);
      expect(res.rows[3].__calcValue).toBe(300);
    });

    it('computes percent_of_total summing to 100%', () => {
      const res = applyVisualCalculation(sample, 'rev', 'percent_of_total');
      expect(res.rows.map((r) => r.__calcValue)).toEqual([10, 20, 30, 40]);
    });

    it('computes dense rank (1 = highest) and diff_from_prev', () => {
      const ranked = applyVisualCalculation(sample, 'rev', 'rank');
      expect(ranked.rows.map((r) => r.__calcValue)).toEqual([4, 3, 2, 1]);

      const diffs = applyVisualCalculation(sample, 'rev', 'diff_from_prev');
      expect(diffs.rows.map((r) => r.__calcValue)).toEqual([0, 100, 100, 100]);
    });
  });

  describe('Part D1 & B9: Analytics Pane Forecast, Anomaly Detection, Key Influencers & Smart Narrative', () => {
    it('detects anomalies (Z-score spikes/dips) and generates 3-period OLS forecast with confidence bands', () => {
      const series = [
        { label: 'P1', value: 100 },
        { label: 'P2', value: 105 },
        { label: 'P3', value: 102 },
        { label: 'P4', value: 108 },
        { label: 'P5', value: 104 },
        { label: 'P6', value: 420 }, // Sharp spike
      ];
      const stats = computeAnalyticsPaneStats(series, 3, 1.5);
      expect(stats.anomalies.length).toBeGreaterThanOrEqual(1);
      expect(stats.anomalies[0].label).toBe('P6');
      expect(stats.anomalies[0].direction).toBe('spike');
      expect(stats.forecastPoints.length).toBe(3);
      expect(stats.forecastPoints[0].upperBound).toBeGreaterThan(stats.forecastPoints[0].lowerBound);
    });

    it('enforces minimum sample size (>=30 rows, >=3 groups of >=5 rows) and deduplicates identical lifts in Key Influencers', () => {
      // 1. Small sample (< 30 rows) must refuse to report unreliable drivers
      const tinyRows = [
        { tier: 'Enterprise', region: 'North', deal_size: 120000 },
        { tier: 'Enterprise', region: 'South', deal_size: 110000 },
        { tier: 'SMB', region: 'North', deal_size: 18000 },
        { tier: 'SMB', region: 'South', deal_size: 15000 },
        { tier: 'Mid-Market', region: 'West', deal_size: 48000 },
        { tier: 'Mid-Market', region: 'East', deal_size: 52000 },
      ];
      const tinyKi = computeKeyInfluencers(tinyRows, 'deal_size');
      expect(tinyKi.insufficientSample).toBe(true);
      expect(tinyKi.insufficientReason).toBe('Not enough data to find reliable drivers (6 rows)');
      expect(tinyKi.topIncreasers).toHaveLength(0);

      // 2. Adequate sample (>= 30 rows, >= 3 groups with >= 5 rows each) plus a duplicate/aliased column
      const validRows: Record<string, any>[] = [];
      for (let i = 0; i < 12; i++) {
        validRows.push({
          tier: 'Enterprise',
          tier_copy: 'Enterprise_Alias',
          region: 'North',
          deal_size: 120000 + i * 500,
        });
      }
      for (let i = 0; i < 10; i++) {
        validRows.push({
          tier: 'Mid-Market',
          tier_copy: 'Mid_Alias',
          region: 'West',
          deal_size: 50000 + i * 300,
        });
      }
      for (let i = 0; i < 10; i++) {
        validRows.push({
          tier: 'SMB',
          tier_copy: 'SMB_Alias',
          region: 'South',
          deal_size: 15000 + i * 200,
        });
      }

      const ki = computeKeyInfluencers(validRows, 'deal_size');
      expect(ki.insufficientSample).toBe(false);
      expect(ki.topIncreasers.length).toBeGreaterThan(0);
      expect(ki.topIncreasers[0].segmentValue).toBe('Enterprise');
      expect(ki.topIncreasers[0].plainLanguage).toContain('Enterprise');
      expect(ki.topDecreasers[0].segmentValue).toBe('SMB');

      // Verify identical lift from tier_copy was deduplicated
      const enterpriseDrivers = ki.topIncreasers.filter(
        (d) => d.impactScore === ki.topIncreasers[0].impactScore && d.sampleCount === 12
      );
      expect(enterpriseDrivers).toHaveLength(1);
    });

    it('generates a 5-line executive summary in Smart Narrative linked to real numbers', () => {
      const rows = [
        { category: 'Cloud', revenue: 400000 },
        { category: 'AI', revenue: 600000 },
      ];
      const narrative = generateSmartNarrative(rows, 'category', 'revenue', 'SaaS Pack');
      expect(narrative.fiveLineSummary.length).toBe(5);
      expect(narrative.headline).toContain('1.00M');
      expect(narrative.headline).toContain('AI');
    });
  });

  describe('Part B12: Choosing the Right Visual Helper & Anti-Pattern Warnings', () => {
    it('warns when a Pie/Donut chart has > 7 slices and recommends Treemap', () => {
      const res = recommendRightVisual({
        dataType: 'categorical',
        goal: 'composition',
        audience: 'executive',
        space: 'large',
        distinctCategories: 12,
        currentVisual: 'pie',
      });
      expect(res.recommendedVisual).toBe('treemap');
      expect(res.warnings.some((w) => w.includes('12 slices'))).toBe(true);
    });

    it('recommends Choropleth Map for geographic data in large space and Bar in small space', () => {
      const largeGeo = recommendRightVisual({
        dataType: 'geographic',
        goal: 'compare',
        audience: 'executive',
        space: 'large',
      });
      expect(largeGeo.recommendedVisual).toBe('map_choropleth');

      const smallGeo = recommendRightVisual({
        dataType: 'geographic',
        goal: 'compare',
        audience: 'executive',
        space: 'small',
      });
      expect(smallGeo.recommendedVisual).toBe('bar');
    });
  });

  describe('Part D6: Power BI Theme JSON Import & Export', () => {
    it('exports and re-imports Power BI Theme JSON cleanly', () => {
      const exported = exportPowerBiThemeJson({
        mode: 'dark',
        accentPreset: 'ocean',
        customAccentHex: '#0ea5e9',
        glassIntensity: 'medium',
        radius: 'rounded',
        density: 'comfortable',
        accessiblePalette: false,
      });
      expect(exported.name).toContain('OCEAN');
      expect(exported.dataColors.length).toBeGreaterThanOrEqual(6);

      const imported = parsePowerBiThemeJson(JSON.stringify(exported));
      expect(imported.valid).toBe(true);
      expect(imported.accentHex).toBe('#0ea5e9');
      expect(imported.mode).toBe('dark');
    });
  });
});
