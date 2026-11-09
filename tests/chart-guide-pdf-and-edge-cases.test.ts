import { describe, it, expect } from 'vitest';
import {
  parseNumericValue,
  formatCompactNumber,
  truncateChartLabel,
  sampleRowsForChart,
  computeBarChartData,
  computeLineSeriesData,
  computeScatterPlotData,
  computeHistogramBins,
  computeStackedBarData,
  computeDonutChartData,
  computeHeatmapMatrixData,
  computeBoxplotSummary,
  recommendChartsForFields,
} from '../src/engine/chartRecommendationEngine';
import {
  generateChartGuidePDF,
  getChartGuidePdfFilename,
} from '../src/engine/exportEngine';
import {
  buildGuideChartPlottedCSV,
  formatCSVContent,
} from '../src/utils/chartExport';
import { CHART_GUIDE_RULES } from '../src/config/chartGuide';
import { DEMO_DATASETS } from '../src/data/demoDatasets';
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
    outliersCount: 0,
  };
}

describe('Part A — All 8 Guide Charts Edge Cases & Demo Datasets', () => {
  it('parseNumericValue ignores null, undefined, empty string, booleans, and NaN without coercing to 0', () => {
    expect(parseNumericValue(null)).toBeNull();
    expect(parseNumericValue(undefined)).toBeNull();
    expect(parseNumericValue('')).toBeNull();
    expect(parseNumericValue('   ')).toBeNull();
    expect(parseNumericValue(false)).toBeNull();
    expect(parseNumericValue(true)).toBeNull();
    expect(parseNumericValue(NaN)).toBeNull();
    expect(parseNumericValue(Infinity)).toBeNull();
    expect(parseNumericValue(0)).toBe(0);
    expect(parseNumericValue(-42.5)).toBe(-42.5);
    expect(parseNumericValue('$1,250.75')).toBe(1250.75);
  });

  it('handles empty data ([]) across all 8 chart builders without throwing', () => {
    expect(computeBarChartData([], 'Cat', 'Val').items).toEqual([]);
    expect(computeLineSeriesData([], 'Date', 'Val').points).toEqual([]);
    expect(computeScatterPlotData([], 'X', 'Y').points).toEqual([]);
    expect(computeHistogramBins([], 'Val').bins).toEqual([]);
    expect(computeStackedBarData([], 'Cat1', 'Cat2', 'Val').categories).toEqual([]);
    expect(computeDonutChartData([], 'Cat', 'Val').slices).toEqual([]);
    expect(computeHeatmapMatrixData([], 'Row', 'Col', 'Val').cells).toEqual([]);
    expect(computeBoxplotSummary([], 'Cat', 'Val')).toEqual([]);
  });

  it('handles 1 row across all 8 chart builders without NaN or division by zero', () => {
    const oneRow = [{ Cat: 'Alpha', SubCat: 'Tier1', Date: '2025-01-15', X: 120, Y: 45 }];

    const bar = computeBarChartData(oneRow, 'Cat', 'X');
    expect(bar.items.length).toBe(1);
    expect(bar.items[0].value).toBe(120);

    const line = computeLineSeriesData(oneRow, 'Date', 'X');
    expect(line.points.length).toBe(1);
    expect(line.points[0].value).toBe(120);

    const scatter = computeScatterPlotData(oneRow, 'X', 'Y', 'Cat');
    expect(scatter.points.length).toBe(1);
    expect(Number.isFinite(scatter.correlation)).toBe(true);

    const hist = computeHistogramBins(oneRow, 'X');
    expect(hist.bins.length).toBe(1);
    expect(hist.bins[0].count).toBe(1);

    const stacked = computeStackedBarData(oneRow, 'Cat', 'SubCat', 'X');
    expect(stacked.categories.length).toBe(1);
    expect(stacked.categories[0].total).toBe(120);

    const donut = computeDonutChartData(oneRow, 'Cat', 'X');
    expect(donut.slices.length).toBe(1);
    expect(donut.slices[0].sharePct).toBe(100);

    const heatmap = computeHeatmapMatrixData(oneRow, 'Cat', 'SubCat', 'X');
    expect(heatmap.cells.length).toBe(1);
    expect(Number.isFinite(heatmap.cells[0].intensity)).toBe(true);

    const box = computeBoxplotSummary(oneRow, 'Cat', 'X');
    expect(box.length).toBe(1);
    expect(box[0].median).toBe(120);
    expect(box[0].iqr).toBe(0);
  });

  it('handles nulls, all-equal values, negative numbers, and very large numbers', () => {
    const edgeRows = [
      { Cat: 'A', Sub: 'S1', Date: '2025-01-01', Val: null, Val2: null },
      { Cat: 'A', Sub: 'S1', Date: '2025-01-02', Val: undefined, Val2: '' },
      { Cat: 'A', Sub: 'S1', Date: '2025-01-03', Val: 500, Val2: -250 },
      { Cat: 'B', Sub: 'S2', Date: '2025-01-04', Val: 500, Val2: -250 },
      { Cat: 'C', Sub: 'S1', Date: '2025-01-05', Val: 500, Val2: 1.5e9 },
    ];

    // All-equal values on Val (500, 500, 500) with nulls ignored
    const histEqual = computeHistogramBins(edgeRows, 'Val');
    expect(histEqual.totalCount).toBe(3);
    expect(histEqual.nullCount).toBe(2);
    expect(histEqual.allEqual).toBe(true);
    expect(histEqual.bins.length).toBe(1);
    expect(histEqual.bins[0].count).toBe(3);

    // Negative & huge numbers on Val2
    const barNeg = computeBarChartData(edgeRows, 'Cat', 'Val2');
    expect(barNeg.hasNegativeValues).toBe(true);
    expect(barNeg.items.some(i => i.value < 0)).toBe(true);

    const donutNeg = computeDonutChartData(edgeRows, 'Cat', 'Val2');
    expect(donutNeg.hasNegativeValues).toBe(true);
    expect(donutNeg.notice).toContain('Negative values');

    expect(formatCompactNumber(1.5e9)).toBe('1.50B');
    expect(formatCompactNumber(-45000)).toBe('-45.0K');
  });

  it('handles 50+ categories by capping to top 10 + Other, and truncates long labels', () => {
    const sixtyCatRows = Array.from({ length: 60 }, (_, idx) => ({
      Category: `Very_Long_Category_Label_Identifier_Number_${String(idx + 1).padStart(2, '0')}_With_Extra_Segment_Text`,
      SubCategory: `Sub_${(idx % 8) + 1}`,
      Revenue: (60 - idx) * 100,
    }));

    const bar = computeBarChartData(sixtyCatRows, 'Category', 'Revenue', 'sum', 10);
    expect(bar.items.length).toBe(11);
    expect(bar.items[10].category).toBe('Other');
    expect(bar.hasOther).toBe(true);
    expect(bar.otherCount).toBe(50);
    expect(bar.items[0].displayLabel.length).toBeLessThanOrEqual(22);

    const stacked = computeStackedBarData(sixtyCatRows, 'Category', 'SubCategory', 'Revenue', 'sum', 10);
    expect(stacked.categories.length).toBe(11);
    expect(stacked.categories[10].category).toBe('Other');
    expect(stacked.cappedOtherCount).toBe(50);
    expect(stacked.seriesKeys.includes('Other')).toBe(true);

    expect(truncateChartLabel('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 12)).toBe('ABCDEFGHIJK…');
  });

  it('filters invalid dates in Line Chart and reports notice without crashing', () => {
    const dateRows = [
      { OrderDate: '2025-03-01', Sales: 300 },
      { OrderDate: '2025-01-01', Sales: 100 },
      { OrderDate: 'invalid-date-string', Sales: 999 },
      { OrderDate: '2025-02-01', Sales: 200 },
    ];

    const line = computeLineSeriesData(dateRows, 'OrderDate', 'Sales', 'sum');
    expect(line.usedChronologicalSort).toBe(true);
    expect(line.invalidDateCount).toBe(1);
    expect(line.points.map(p => p.label)).toEqual(['2025-01-01', '2025-02-01', '2025-03-01']);
    expect(line.notice).toContain('Skipped 1 row with invalid dates');
  });

  it('samples/bins 10,000+ rows deterministically without blocking and surfaces an on-screen notice', () => {
    const largeRows = Array.from({ length: 12000 }, (_, i) => ({
      Region: `Region_${(i % 6) + 1}`,
      Channel: `Channel_${(i % 3) + 1}`,
      OrderValue: (i % 500) * 1.5 + 10,
      Profit: (i % 200) * 0.8 - 20,
    }));

    const sampleInfo = sampleRowsForChart(largeRows);
    expect(sampleInfo.sampled).toBe(true);
    expect(sampleInfo.sampledCount).toBe(5000);
    expect(sampleInfo.notice).toContain('12,000');

    const hist = computeHistogramBins(largeRows, 'OrderValue');
    expect(hist.originalRowCount).toBe(12000);
    expect(hist.largeDataNotice).toContain('12,000');

    const scatter = computeScatterPlotData(largeRows, 'OrderValue', 'Profit', 'Region');
    expect(scatter.originalRowCount).toBe(12000);
    expect(scatter.points.length).toBeLessThanOrEqual(500);
    expect(scatter.notice).toContain('12,000');
  });

  it('renders valid data structures across all demo datasets in src/data/demoDatasets.ts', () => {
    expect(DEMO_DATASETS.length).toBeGreaterThanOrEqual(4);
    for (const demo of DEMO_DATASETS) {
      const demoRows = demo.generateData();
      expect(demoRows.length).toBeGreaterThan(0);
      const sampleRow = demoRows[0];
      const keys = Object.keys(sampleRow);
      const numKeys = keys.filter(k => typeof sampleRow[k] === 'number');
      const strKeys = keys.filter(k => typeof sampleRow[k] === 'string');

      const catKey = strKeys[0] || keys[0];
      const secCatKey = strKeys[1] || catKey;
      const valKey = numKeys[0] || keys[0];
      const secValKey = numKeys[1] || valKey;

      expect(computeBarChartData(demoRows, catKey, valKey).items.length).toBeGreaterThan(0);
      expect(computeLineSeriesData(demoRows, catKey, valKey).points.length).toBeGreaterThan(0);
      expect(computeScatterPlotData(demoRows, valKey, secValKey, catKey).points.length).toBeGreaterThan(0);
      expect(computeHistogramBins(demoRows, valKey).bins.length).toBeGreaterThan(0);
      expect(computeStackedBarData(demoRows, catKey, secCatKey, valKey).categories.length).toBeGreaterThan(0);
      expect(computeDonutChartData(demoRows, catKey, valKey).slices.length).toBeGreaterThan(0);
      expect(computeHeatmapMatrixData(demoRows, catKey, secCatKey, valKey).cells.length).toBeGreaterThan(0);
      expect(computeBoxplotSummary(demoRows, catKey, valKey).length).toBeGreaterThan(0);
    }
  });

  it('builds plotted CSV data for all 8 guide chart types', () => {
    const rows = DEMO_DATASETS[0].generateData();
    const sampleRow = rows[0];
    const keys = Object.keys(sampleRow);
    const numKeys = keys.filter(k => typeof sampleRow[k] === 'number');
    const strKeys = keys.filter(k => typeof sampleRow[k] === 'string');

    for (const rule of CHART_GUIDE_RULES) {
      const csvData = buildGuideChartPlottedCSV({
        chartType: rule.id,
        rows,
        categoryField: strKeys[0] || keys[0],
        secondaryCategoryField: strKeys[1] || strKeys[0] || keys[0],
        valueField: numKeys[0] || keys[0],
        secondaryValueField: numKeys[1] || numKeys[0] || keys[0],
        aggregation: 'sum',
      });
      expect(csvData.headers.length).toBeGreaterThan(0);
      expect(csvData.rows.length).toBeGreaterThan(0);
      const formatted = formatCSVContent(csvData.headers, csvData.rows);
      expect(formatted.split('\n').length).toBe(csvData.rows.length + 1);
    }
  });
});

describe('Part B — Complete Chart Selection Guide PDF Builder', () => {
  const columns: ColumnProfile[] = [
    makeCol('OrderDate', 'date', 24),
    makeCol('SalesChannel', 'string', 4),
    makeCol('ProductCategory', 'string', 12),
    makeCol('NetRevenue', 'number', 90),
    makeCol('ProfitMargin', 'number', 80),
  ];

  const rows = Array.from({ length: 30 }, (_, i) => ({
    OrderDate: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`,
    SalesChannel: ['Online', 'Retail', 'Partner', 'Direct'][i % 4],
    ProductCategory: `Category_${(i % 12) + 1}`,
    NetRevenue: 1000 + i * 150,
    ProfitMargin: 15 + (i % 10) * 2.5,
  }));

  it('formats the PDF filename as data-analytix-chart-guide-YYYY-MM-DD.pdf', () => {
    const fixedDate = new Date('2026-11-09T12:00:00Z');
    expect(getChartGuidePdfFilename(fixedDate)).toBe('data-analytix-chart-guide-2026-11-09.pdf');
  });

  it('generates a complete A4 PDF with cover, 3 steps, 8 chart pages, decision table, dataset recommendations, and glossary', () => {
    const docWithRecs = generateChartGuidePDF({
      datasetName: 'Global Retail Telemetry',
      columns,
      rows,
      includeDatasetRecommendations: true,
      generatedDate: new Date('2026-11-09T12:00:00Z'),
    });

    const pageCountWithRecs = (docWithRecs.internal as any).getNumberOfPages();
    // 1 cover/3-steps + 8 chart pages + 1 decision table + 1 recommended for your data + 1 glossary = 12 pages
    expect(pageCountWithRecs).toBeGreaterThanOrEqual(12);

    const rawPdf = docWithRecs.output();
    expect(rawPdf.startsWith('%PDF-')).toBe(true);
    expect(rawPdf).toContain('Data Analytix: Chart Selection Guide');
    expect(rawPdf).toContain('How to Choose the Right Chart in 3 Steps');
    expect(rawPdf).toContain('Quick Decision Table');
    expect(rawPdf).toContain('Recommended for your data');
    expect(rawPdf).toContain('Global Retail Telemetry');
    expect(rawPdf).toContain('Glossary of Analytical & Charting Terms');

    // Verify all 8 chart names appear in the PDF
    for (const rule of CHART_GUIDE_RULES) {
      expect(rawPdf).toContain(rule.name);
    }

    // Verify glossary terms appear
    for (const term of ['Measure', 'Dimension', 'Bin', 'Quartile', 'Median', 'Outlier', 'Correlation', 'Causation']) {
      expect(rawPdf).toContain(term);
    }
  });

  it('allows excluding the "Recommended for your data" page when toggled off', () => {
    const docWithoutRecs = generateChartGuidePDF({
      datasetName: 'Global Retail Telemetry',
      columns,
      rows,
      includeDatasetRecommendations: false,
      generatedDate: new Date('2026-11-09T12:00:00Z'),
    });

    const pageCountWithoutRecs = (docWithoutRecs.internal as any).getNumberOfPages();
    expect(pageCountWithoutRecs).toBe(11);
    const rawPdf = docWithoutRecs.output();
    expect(rawPdf.startsWith('%PDF-')).toBe(true);
    expect(rawPdf).not.toContain('Recommended for your data');
  });
});
