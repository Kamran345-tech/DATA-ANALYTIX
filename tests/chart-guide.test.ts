import { describe, it, expect } from 'vitest';
import {
  CHART_GUIDE_RULES,
  CHART_GUIDE_MAP,
  formatChartGuideReason
} from '../src/config/chartGuide';
import {
  recommendChartsForFields,
  evaluateChartRuleFit,
  capCategoriesWithOther,
  computeHistogramBins,
  computeStackedBarData
} from '../src/engine/chartRecommendationEngine';
import { ColumnProfile } from '../src/types';

function makeCol(
  name: string,
  dataType: ColumnProfile['dataType'],
  distinctCount = 5
): ColumnProfile {
  return {
    name,
    originalName: name,
    dataType,
    totalCount: 100,
    nullCount: 0,
    nullPercentage: 0,
    distinctCount,
    uniquePercentage: distinctCount,
    isPrimaryKeyCandidate: false,
    isForeignKeyCandidate: false,
    topValues: [],
    inconsistentFormatsCount: 0,
    outliersCount: 0
  };
}

describe('8-Chart Rule Table & Recommendation Engine (chartGuide)', () => {
  const dateCol = makeCol('OrderDate', 'date', 24);
  const lowCatCol = makeCol('SalesChannel', 'string', 4);
  const highCatCol = makeCol('ProductSubcategory', 'string', 14);
  const secondCatCol = makeCol('Region', 'string', 4);
  const numCol1 = makeCol('NetRevenue', 'number', 80);
  const numCol2 = makeCol('GrossProfit', 'number', 75);
  const allColumns = [dateCol, lowCatCol, highCatCol, secondCatCol, numCol1, numCol2];

  const sampleRows = Array.from({ length: 40 }, (_, i) => ({
    OrderDate: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
    SalesChannel: ['Online', 'Retail', 'Partner', 'Direct'][i % 4],
    ProductSubcategory: `Product_${(i % 14) + 1}`,
    Region: ['North', 'South', 'East', 'West'][i % 4],
    NetRevenue: 100 + i * 25 + (i % 5) * 10,
    GrossProfit: 30 + i * 8
  }));

  it('exports all 8 rules from src/config/chartGuide.ts with required fields', () => {
    expect(CHART_GUIDE_RULES.length).toBe(8);
    expect(CHART_GUIDE_RULES.map(r => r.id)).toEqual([
      'bar',
      'line',
      'scatter',
      'histogram',
      'stacked_bar',
      'donut',
      'heatmap',
      'boxplot'
    ]);
    for (const rule of CHART_GUIDE_RULES) {
      expect(rule.name.length).toBeGreaterThan(0);
      expect(rule.purpose.length).toBeGreaterThan(0);
      expect(rule.question.endsWith('?')).toBe(true);
      expect(rule.tip.length).toBeGreaterThan(0);
      expect(rule.fits.length).toBeGreaterThan(0);
    }
  });

  // 1. Bar chart rule: 1 category + 1 measure
  describe('Rule 1: Bar chart', () => {
    it('PASSES for 1 category + 1 numeric measure and recommends bar first when > 5 categories', () => {
      const fit = evaluateChartRuleFit('bar', {
        categoryCol: highCatCol,
        valueCol: numCol1,
        columns: allColumns,
        rows: sampleRows
      });
      expect(fit.fits).toBe(true);

      const recs = recommendChartsForFields('ProductSubcategory', 'NetRevenue', allColumns, sampleRows, {
        chartGuide: true
      });
      expect(recs[0].type).toBe('bar');
      expect(recs[0].reason).toBe(formatChartGuideReason(CHART_GUIDE_MAP.bar));
      expect(recs.some(r => r.type === 'donut')).toBe(false);
      expect(recs.some(r => r.type === 'pie')).toBe(false);
    });

    it('REJECTS when category is a date or measure is non-numeric', () => {
      const fitDate = evaluateChartRuleFit('bar', {
        categoryCol: dateCol,
        valueCol: numCol1,
        columns: allColumns
      });
      expect(fitDate.fits).toBe(false);

      const fitNoMeasure = evaluateChartRuleFit('bar', {
        categoryCol: lowCatCol,
        valueCol: secondCatCol,
        columns: allColumns
      });
      expect(fitNoMeasure.fits).toBe(false);
    });
  });

  // 2. Line chart rule: date + measure
  describe('Rule 2: Line chart', () => {
    it('PASSES for date + 1 numeric measure', () => {
      const fit = evaluateChartRuleFit('line', {
        categoryCol: dateCol,
        valueCol: numCol1,
        columns: allColumns,
        rows: sampleRows
      });
      expect(fit.fits).toBe(true);

      const recs = recommendChartsForFields('OrderDate', 'NetRevenue', allColumns, sampleRows, {
        chartGuide: true
      });
      expect(recs[0].type).toBe('line');
      expect(recs[0].reason).toBe(formatChartGuideReason(CHART_GUIDE_MAP.line));
    });

    it('REJECTS when there is no date column', () => {
      const fit = evaluateChartRuleFit('line', {
        categoryCol: lowCatCol,
        valueCol: numCol1,
        columns: allColumns
      });
      expect(fit.fits).toBe(false);

      const recs = recommendChartsForFields('SalesChannel', 'NetRevenue', allColumns, sampleRows, {
        chartGuide: true
      });
      expect(recs.some(r => r.type === 'line')).toBe(false);
    });
  });

  // 3. Scatter plot rule: 2 numeric measures
  describe('Rule 3: Scatter plot', () => {
    it('PASSES when 2 numeric measures are provided', () => {
      const fit = evaluateChartRuleFit('scatter', {
        categoryCol: numCol1,
        valueCol: numCol2,
        columns: allColumns,
        rows: sampleRows
      });
      expect(fit.fits).toBe(true);

      const recs = recommendChartsForFields('NetRevenue', 'GrossProfit', allColumns, sampleRows, {
        chartGuide: true
      });
      expect(recs[0].type).toBe('scatter');
      expect(recs[0].reason).toBe(formatChartGuideReason(CHART_GUIDE_MAP.scatter));
    });

    it('REJECTS when fewer than 2 numeric columns are selected or available', () => {
      const singleNumSchema = [lowCatCol, numCol1];
      const fit = evaluateChartRuleFit('scatter', {
        categoryCol: lowCatCol,
        valueCol: numCol1,
        columns: singleNumSchema
      });
      expect(fit.fits).toBe(false);

      const recs = recommendChartsForFields('SalesChannel', 'NetRevenue', singleNumSchema, sampleRows, {
        chartGuide: true
      });
      expect(recs.some(r => r.type === 'scatter')).toBe(false);
    });
  });

  // 4. Histogram rule: 1 numeric column
  describe('Rule 4: Histogram', () => {
    it('PASSES for 1 numeric column and computes auto bins via Sturges or Freedman-Diaconis', () => {
      const fit = evaluateChartRuleFit('histogram', {
        valueCol: numCol1,
        columns: allColumns,
        rows: sampleRows
      });
      expect(fit.fits).toBe(true);

      const recs = recommendChartsForFields('', 'NetRevenue', allColumns, sampleRows, {
        chartGuide: true
      });
      expect(recs[0].type).toBe('histogram');
      expect(recs[0].reason).toBe(formatChartGuideReason(CHART_GUIDE_MAP.histogram));

      const histFD = computeHistogramBins(sampleRows, 'NetRevenue', 'freedman-diaconis');
      expect(histFD.bins.length).toBeGreaterThanOrEqual(5);
      expect(histFD.totalCount).toBe(sampleRows.length);

      const histSturges = computeHistogramBins(sampleRows, 'NetRevenue', 'sturges');
      expect(histSturges.methodUsed).toBe('sturges');
      expect(histSturges.bins.reduce((s, b) => s + b.count, 0)).toBe(sampleRows.length);
    });

    it('REJECTS when column is not numeric or when a categorical dimension is splitting it', () => {
      const fitNonNumeric = evaluateChartRuleFit('histogram', {
        valueCol: lowCatCol,
        columns: allColumns
      });
      expect(fitNonNumeric.fits).toBe(false);

      const fitWithCategory = evaluateChartRuleFit('histogram', {
        categoryCol: lowCatCol,
        valueCol: numCol1,
        columns: allColumns
      });
      expect(fitWithCategory.fits).toBe(false);
    });
  });

  // 5. Stacked bar rule: 2 categories + 1 measure
  describe('Rule 5: Stacked bar', () => {
    it('PASSES for 2 categories + 1 numeric measure', () => {
      const fit = evaluateChartRuleFit('stacked_bar', {
        categoryCol: secondCatCol,
        secondaryCategoryCol: lowCatCol,
        valueCol: numCol1,
        columns: allColumns,
        rows: sampleRows
      });
      expect(fit.fits).toBe(true);

      const recs = recommendChartsForFields('Region', 'NetRevenue', allColumns, sampleRows, {
        chartGuide: true,
        secondaryCategoryColName: 'SalesChannel'
      });
      expect(recs[0].type).toBe('stacked_bar');
      expect(recs[0].reason).toBe(formatChartGuideReason(CHART_GUIDE_MAP.stacked_bar));
    });

    it('REJECTS when only 1 category is provided', () => {
      const fit = evaluateChartRuleFit('stacked_bar', {
        categoryCol: secondCatCol,
        valueCol: numCol1,
        columns: allColumns
      });
      expect(fit.fits).toBe(false);

      const recs = recommendChartsForFields('Region', 'NetRevenue', allColumns, sampleRows, {
        chartGuide: true
      });
      expect(recs.some(r => r.type === 'stacked_bar')).toBe(false);
    });
  });

  // 6. Donut chart rule: 1 category (<= 5 values) + 1 measure
  describe('Rule 6: Donut chart', () => {
    it('PASSES and is preferred when 1 category has <= 5 values + 1 measure (and never recommends pie)', () => {
      const fit = evaluateChartRuleFit('donut', {
        categoryCol: lowCatCol,
        valueCol: numCol1,
        columns: allColumns,
        rows: sampleRows
      });
      expect(fit.fits).toBe(true);

      const recs = recommendChartsForFields('SalesChannel', 'NetRevenue', allColumns, sampleRows, {
        chartGuide: true
      });
      expect(recs[0].type).toBe('donut');
      expect(recs[0].reason).toBe(formatChartGuideReason(CHART_GUIDE_MAP.donut));
      expect(recs.some(r => r.type === 'pie')).toBe(false);
    });

    it('REJECTS when category has > 5 values and recommends bar instead', () => {
      const fit = evaluateChartRuleFit('donut', {
        categoryCol: highCatCol,
        valueCol: numCol1,
        columns: allColumns,
        rows: sampleRows
      });
      expect(fit.fits).toBe(false);

      const recs = recommendChartsForFields('ProductSubcategory', 'NetRevenue', allColumns, sampleRows, {
        chartGuide: true
      });
      expect(recs.some(r => r.type === 'donut')).toBe(false);
      expect(recs[0].type).toBe('bar');
    });
  });

  // 7. Heatmap rule: 2 categories/time buckets + 1 measure
  describe('Rule 7: Heatmap', () => {
    it('PASSES for 2 categories or time buckets + 1 measure', () => {
      const fit = evaluateChartRuleFit('heatmap', {
        categoryCol: dateCol,
        secondaryCategoryCol: secondCatCol,
        valueCol: numCol1,
        columns: allColumns,
        rows: sampleRows
      });
      expect(fit.fits).toBe(true);

      const recs = recommendChartsForFields('OrderDate', 'NetRevenue', allColumns, sampleRows, {
        chartGuide: true,
        secondaryCategoryColName: 'Region'
      });
      expect(recs[0].type).toBe('heatmap');
      expect(recs[0].reason).toBe(formatChartGuideReason(CHART_GUIDE_MAP.heatmap));
    });

    it('REJECTS when only 1 category is selected without a second category or time bucket', () => {
      const fit = evaluateChartRuleFit('heatmap', {
        categoryCol: lowCatCol,
        valueCol: numCol1,
        columns: allColumns
      });
      expect(fit.fits).toBe(false);
    });
  });

  // 8. Box plot rule: 1 category + 1 numeric
  describe('Rule 8: Box plot', () => {
    it('PASSES for 1 category + 1 numeric column', () => {
      const fit = evaluateChartRuleFit('boxplot', {
        categoryCol: secondCatCol,
        valueCol: numCol1,
        columns: allColumns,
        rows: sampleRows
      });
      expect(fit.fits).toBe(true);

      const recs = recommendChartsForFields('Region', 'NetRevenue', allColumns, sampleRows, {
        chartGuide: true,
        goal: 'spread'
      });
      expect(recs[0].type).toBe('boxplot');
      expect(recs[0].reason).toBe(formatChartGuideReason(CHART_GUIDE_MAP.boxplot));
    });

    it('REJECTS when there is no category column (e.g. date + numeric or single numeric)', () => {
      const fitDate = evaluateChartRuleFit('boxplot', {
        categoryCol: dateCol,
        valueCol: numCol1,
        columns: allColumns
      });
      expect(fitDate.fits).toBe(false);

      const fitSingleNum = evaluateChartRuleFit('boxplot', {
        valueCol: numCol1,
        columns: allColumns
      });
      expect(fitSingleNum.fits).toBe(false);
    });
  });

  describe('Category Capping (Top 10 + Other)', () => {
    it('caps bar categories to top 10 + Other when > 10 categories exist', () => {
      const manyItems = Array.from({ length: 14 }, (_, i) => ({
        category: `Cat_${i + 1}`,
        value: (14 - i) * 10,
        count: 2,
        share: 5
      }));

      const capped = capCategoriesWithOther(manyItems, 10);
      expect(capped.hasOther).toBe(true);
      expect(capped.otherCount).toBe(4);
      expect(capped.items.length).toBe(11);
      expect(capped.items[10].category).toBe('Other');
      expect(capped.items[10].value).toBe(40 + 30 + 20 + 10);
    });

    it('caps stacked bar primary categories to top 10 + Other', () => {
      const stacked = computeStackedBarData(
        sampleRows,
        'ProductSubcategory',
        'Region',
        'NetRevenue',
        'sum',
        10
      );
      expect(stacked.categories.length).toBe(11);
      expect(stacked.categories[10].category).toBe('Other');
      expect(stacked.cappedOtherCount).toBe(4);
    });
  });
});
