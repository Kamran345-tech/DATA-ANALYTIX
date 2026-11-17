import { describe, it, expect } from 'vitest';
import {
  getExcelColumnLetter,
  inferPreviewColumnMeta,
  formatExportPreviewCell,
  buildExportPreviewSheets,
} from '../src/utils/exportPreviewFormatter';

describe('Export Preview Formatter (Excel & Power BI)', () => {
  it('computes Excel column letters accurately for single and multi-letter columns', () => {
    expect(getExcelColumnLetter(0)).toBe('A');
    expect(getExcelColumnLetter(25)).toBe('Z');
    expect(getExcelColumnLetter(26)).toBe('AA');
    expect(getExcelColumnLetter(27)).toBe('AB');
  });

  it('infers Excel format codes and Power BI data types accurately', () => {
    const sampleRows = [
      { Order_ID: 'ORD-1', Revenue: 1250.5, Profit_Margin: 0.185, Units: 20, Order_Date: '2025-03-10' },
    ];

    const revMeta = inferPreviewColumnMeta('Revenue', 1, undefined, sampleRows);
    expect(revMeta.excelLetter).toBe('B');
    expect(revMeta.excelFormatCode).toBe('$#,##0.00');
    expect(revMeta.powerBiDataType).toBe('double');
    expect(revMeta.powerBiSummarizeBy).toBe('sum');

    const marginMeta = inferPreviewColumnMeta('Profit_Margin', 2, undefined, sampleRows);
    expect(marginMeta.excelFormatCode).toBe('0.0%');
    expect(marginMeta.powerBiDataType).toBe('double');

    const unitsMeta = inferPreviewColumnMeta('Units', 3, undefined, sampleRows);
    expect(unitsMeta.excelFormatCode).toBe('#,##0');
    expect(unitsMeta.powerBiDataType).toBe('int64');

    const dateMeta = inferPreviewColumnMeta('Order_Date', 4, undefined, sampleRows);
    expect(dateMeta.excelFormatCode).toBe('yyyy-mm-dd');
    expect(dateMeta.powerBiDataType).toBe('dateTime');
    expect(dateMeta.powerQueryType).toBe('type date');
  });

  it('formats cells differently for Excel vs Power BI (including accounting negatives and blanks)', () => {
    const sampleRows = [{ Revenue: -450.25, Profit_Margin: 0.125 }];
    const revMeta = inferPreviewColumnMeta('Revenue', 0, undefined, sampleRows);
    const marginMeta = inferPreviewColumnMeta('Profit_Margin', 1, undefined, sampleRows);

    expect(formatExportPreviewCell(-450.25, revMeta, 'excel')).toBe('($450.25)');
    expect(formatExportPreviewCell(-450.25, revMeta, 'powerbi')).toBe('-$450.25');
    expect(formatExportPreviewCell(null, revMeta, 'excel')).toBe('');
    expect(formatExportPreviewCell(null, revMeta, 'powerbi')).toBe('(Blank)');
    expect(formatExportPreviewCell(0.125, marginMeta, 'excel')).toBe('12.5%');
  });

  it('builds structured sheets for both Excel and Power BI preview modes', () => {
    const mockInput: any = {
      project: { name: 'Sales Analytics', sourceFileName: 'sales.csv' },
      brand: { companyName: 'Data Analytix', department: 'BI' },
      rawRows: [{ Order_ID: '101', Revenue: 500, Margin_Rate: 0.2 }],
      cleanRows: [{ Order_ID: '101', Revenue: 500, Margin_Rate: 0.2 }],
      columns: [
        { name: 'Order_ID', dataType: 'string', totalCount: 1, nullCount: 0, nullPercentage: 0, distinctCount: 1 },
        { name: 'Revenue', dataType: 'number', totalCount: 1, nullCount: 0, nullPercentage: 0, distinctCount: 1, min: 500, max: 500, mean: 500 },
        { name: 'Margin_Rate', dataType: 'number', totalCount: 1, nullCount: 0, nullPercentage: 0, distinctCount: 1, min: 0.2, max: 0.2, mean: 0.2 },
      ],
      dataModel: {
        schemaType: 'star',
        tables: [
          {
            name: 'FactSales',
            type: 'fact',
            rowCount: 1,
            columns: [
              { name: 'Order_ID', dataType: 'string' },
              { name: 'Revenue', dataType: 'number' },
              { name: 'Margin_Rate', dataType: 'number' },
            ],
          },
        ],
        relationships: [],
      },
      kpis: [
        {
          id: 'kpi-rev',
          name: 'Total Revenue',
          formattedValue: '$500.00',
          status: 'On Track',
          calculation: 'SUM(Revenue)',
          traceableSource: 'Revenue',
        },
      ],
      daxMeasures: [
        {
          name: 'Total Revenue',
          table: 'FactSales',
          category: 'Financial',
          formula: 'Total Revenue = SUM(FactSales[Revenue])',
          description: 'Sum of revenue',
        },
      ],
      qualityReport: { overallScore: 98 },
    };

    const excelSheets = buildExportPreviewSheets(mockInput, 'excel');
    expect(excelSheets.map((s) => s.id)).toEqual([
      '02_Clean_Data',
      'KPI_Definitions',
      'Data_Dictionary',
      '01_Raw_Data',
      '00_Metadata',
    ]);
    expect(excelSheets[0].rows.length).toBe(1);

    const pbiSheets = buildExportPreviewSheets(mockInput, 'powerbi');
    expect(pbiSheets.map((s) => s.id)).toEqual([
      'pbi_FactSales',
      'pbi_DAX_Measures',
      'pbi_Relationships',
    ]);
    expect(pbiSheets[0].rows.length).toBe(1);
  });
});
