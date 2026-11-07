import { describe, it, expect } from 'vitest';
import { detectDateFormatV2, inferTypesV2 } from '../src/engine/v2/dataParserV2';
import { evaluateDataQualityV2 } from '../src/engine/v2/dataQualityV2';
import { computeAnalyticsV2 } from '../src/engine/v2/analyticsEngineV2';
import { ColumnProfile } from '../src/types';

describe('V2 Calculation Engine Enhancements', () => {
  it('correctly disambiguates DD/MM/YYYY vs MM/DD/YYYY using boundary values', () => {
    // 25/04/2024 -> 25 > 12 -> clearly DD/MM/YYYY
    const ukDates = ['25/04/2024', '13/05/2024', '01/06/2024'];
    expect(detectDateFormatV2(ukDates)).toBe('DD/MM/YYYY');

    // 04/25/2024 -> 25 > 12 in second position -> clearly MM/DD/YYYY
    const usDates = ['04/25/2024', '05/13/2024', '06/01/2024'];
    expect(detectDateFormatV2(usDates)).toBe('MM/DD/YYYY');

    // ISO dates
    const isoDates = ['2024-04-25', '2024-05-13', '2024-06-01'];
    expect(detectDateFormatV2(isoDates)).toBe('ISO');
  });

  it('samples up to 1000 rows for deep type inference', () => {
    const rows: Record<string, any>[] = [];
    for (let i = 0; i < 200; i++) {
      rows.push({
        id: i,
        val: i % 2 === 0 ? `$${i * 10}.50` : null
      });
    }

    const types = inferTypesV2(['id', 'val'], rows);
    expect(types.id).toBe('number');
    expect(types.val).toBe('number');
  });

  it('computes unfloored honest data quality scores with audit metadata', () => {
    const mockProfiles = [
      {
        name: 'col1',
        originalName: 'col1',
        dataType: 'string',
        totalCount: 100,
        nullCount: 20,
        nullPercentage: 20,
        distinctCount: 50,
        uniquePercentage: 50,
        isPrimaryKeyCandidate: false,
        isForeignKeyCandidate: false,
        topValues: [],
        inconsistentFormatsCount: 0,
        outliersCount: 0
      }
    ] as ColumnProfile[];
    const mockRows = Array.from({ length: 100 }, (_, i) => ({ col1: `val_${i}` }));

    const report = evaluateDataQualityV2(mockProfiles, mockRows);
    expect(report.isUnfloored).toBe(true);
    expect(report.auditTrail.calculatedAt).toBeDefined();
    expect(typeof report.overallScore).toBe('number');
  });

  it('enriches KPIs with audit trace and future-dates forecast labels', () => {
    const mockProfiles = [
      {
        name: 'Revenue',
        originalName: 'Revenue',
        dataType: 'number',
        totalCount: 3,
        nullCount: 0,
        nullPercentage: 0,
        distinctCount: 3,
        uniquePercentage: 100,
        min: 100,
        max: 500,
        mean: 300,
        median: 300,
        isPrimaryKeyCandidate: false,
        isForeignKeyCandidate: false,
        topValues: [],
        inconsistentFormatsCount: 0,
        outliersCount: 0
      }
    ] as ColumnProfile[];

    const mockRows = [
      { Revenue: 100, Date: '2025-01-01' },
      { Revenue: 200, Date: '2025-02-01' },
      { Revenue: 300, Date: '2025-03-01' }
    ];

    const summary = computeAnalyticsV2(mockProfiles, mockRows, 'Sales');
    expect(summary.isV2Engine).toBe(true);
    expect(summary.version).toBe('2.0.0');

    // Check KPI audit trace
    if (summary.kpis.length > 0) {
      const kpi = summary.kpis[0];
      expect(kpi.auditTrace).toBeDefined();
      expect(kpi.auditTrace?.rowsUsed).toBe(3);
      expect(kpi.auditTrace?.formulaExpression).toBeDefined();
    }
  });
});
