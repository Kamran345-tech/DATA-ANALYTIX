import { describe, it, expect } from 'vitest';
import { parseRobustNumber, castRows } from '../src/engine/dataParser';
import { profileDataset } from '../src/engine/dataProfiler';
import { evaluateDataQuality } from '../src/engine/dataQuality';
import { computeAnalytics } from '../src/engine/analyticsEngine';
import { DEMO_DATASETS } from '../src/data/demoDatasets';

describe('Classic Engine Regression Suite', () => {
  const sampleSales = DEMO_DATASETS[0].generateData();
  const sampleColumns = Object.keys(sampleSales[0]);
  const sampleTypes = {
    OrderID: 'string',
    OrderDate: 'date',
    Region: 'string',
    Country: 'string',
    CustomerSegment: 'string',
    SalesChannel: 'string',
    CustomerName: 'string',
    Cohort: 'string',
    ProductCategory: 'string',
    ProductSubcategory: 'string',
    ProductName: 'string',
    UnitsSold: 'number',
    UnitPrice: 'number',
    GrossRevenue: 'number',
    DiscountAmount: 'number',
    NetRevenue: 'number',
    COGS: 'number',
    GrossProfit: 'number',
    MarginPercent: 'number'
  } as const;

  it('preserves classic parseRobustNumber parsing rules', () => {
    expect(parseRobustNumber('$1,234.56')).toEqual({ value: 1234.56, isValidNumber: true });
    expect(parseRobustNumber('(500.00)')).toEqual({ value: -500, isValidNumber: true });
    expect(parseRobustNumber('PKR 15,000')).toEqual({ value: 15000, isValidNumber: true });
    expect(parseRobustNumber('12.5%')).toEqual({ value: 12.5, isValidNumber: true });
    expect(parseRobustNumber('00123')).toEqual({ value: null, isValidNumber: false, isLeadingZeroCode: true });
    expect(parseRobustNumber(null)).toEqual({ value: null, isValidNumber: false });
    expect(parseRobustNumber('')).toEqual({ value: null, isValidNumber: false });
  });

  it('preserves classic profileDataset metrics on deterministic sales dataset', () => {
    const typedRows = castRows(sampleSales, sampleTypes as any);
    const profiles = profileDataset(sampleColumns, typedRows, sampleTypes as any);

    expect(profiles.length).toBe(sampleColumns.length);
    const revProfile = profiles.find(p => p.name === 'NetRevenue');
    expect(revProfile).toBeDefined();
    expect(revProfile?.dataType).toBe('number');
    expect(revProfile?.nullCount).toBe(0);
    expect(revProfile?.distinctCount).toBeGreaterThan(10);
    expect(typeof revProfile?.mean).toBe('number');
    expect(typeof revProfile?.min).toBe('number');
    expect(typeof revProfile?.max).toBe('number');
  });

  it('preserves classic evaluateDataQuality scores on clean sample data', () => {
    const typedRows = castRows(sampleSales, sampleTypes as any);
    const profiles = profileDataset(sampleColumns, typedRows, sampleTypes as any);
    const quality = evaluateDataQuality(profiles, typedRows);

    expect(quality.overallScore).toBeGreaterThanOrEqual(80);
    expect(quality.completenessScore).toBe(100);
    expect(quality.uniquenessScore).toBe(100);
    expect(Array.isArray(quality.issues)).toBe(true);
  });

  it('preserves classic computeAnalytics KPIs and structure', () => {
    const typedRows = castRows(sampleSales, sampleTypes as any);
    const profiles = profileDataset(sampleColumns, typedRows, sampleTypes as any);
    const analytics = computeAnalytics(profiles, typedRows, 'enterprise_sales');

    expect(analytics.kpis.length).toBeGreaterThan(0);
    expect(analytics.trends.length).toBeGreaterThan(0);
    expect(analytics.visuals.length).toBeGreaterThan(0);
    expect(analytics.opportunities.length).toBeGreaterThan(0);

    // Verify key fields on KPIs
    const firstKpi = analytics.kpis[0];
    expect(firstKpi.name).toBeDefined();
    expect(firstKpi.formattedValue).toBeDefined();
    expect(firstKpi.status).toBeDefined();
    expect(firstKpi.calculation).toBeDefined();

    // Verify forecasts
    const forecastKeys = Object.keys(analytics.forecasts);
    expect(forecastKeys.length).toBeGreaterThan(0);
    const firstForecast = analytics.forecasts[forecastKeys[0]];
    expect(firstForecast.isAvailable).toBe(true);
    expect(firstForecast.horizon).toBe(3);
  });
});
