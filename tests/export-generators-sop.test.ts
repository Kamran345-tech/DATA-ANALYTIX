import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  generateEnterpriseReportPDF,
  generateChartGuidePDF,
  getChartGuidePdfFilename,
  buildExcelWorkbook,
  buildSopExcelWorkbookAsync,
  generatePowerBIThemeJSON,
  generateStandaloneDashboardHTML,
  createCompleteProjectZip,
  generateSopDaxScript,
  generateSopSqlScript,
  generateSopPythonScript,
  generatePowerBIMSemanticModel,
  generateBlankCsvTemplate,
  generateBlankExcelTemplateAsync,
  generateSampleDatasetCsv,
  generateDesignSopMarkdown,
  ExportDataPayload,
} from '../src/engine/exportEngine';
import {
  buildSopFileName,
  buildSopMetadata,
  buildSopCodeHeaderComment,
  LIGHT_TOKENS,
  DARK_TOKENS,
} from '../src/config/designTokens';
import { buildGuideChartPlottedCSV } from '../src/utils/chartExport';
import { ColumnProfile } from '../src/types';

const sampleRows = [
  { Date: '2026-01-15', Region: 'North America', Category: 'Enterprise SaaS', Revenue: 125000, Profit: 42000, Units: 45 },
  { Date: '2026-02-15', Region: 'EMEA', Category: 'Cloud Infrastructure', Revenue: 98400, Profit: 31500, Units: 38 },
  { Date: '2026-03-15', Region: 'APAC', Category: 'AI Analytics', Revenue: 143200, Profit: 54000, Units: 62 },
  { Date: '2026-04-15', Region: 'North America', Category: 'AI Analytics', Revenue: 168900, Profit: 67200, Units: 74 },
  { Date: '2026-05-15', Region: 'LATAM', Category: 'Security Suite', Revenue: 64500, Profit: 19800, Units: 29 },
];

const sampleColumns: ColumnProfile[] = [
  { name: 'Date', originalName: 'Date', dataType: 'date', isPrimaryKeyCandidate: false, isForeignKeyCandidate: false, totalCount: 5, nullCount: 0, nullPercentage: 0, distinctCount: 5, uniquePercentage: 100, topValues: [{ value: '2026-01-15', count: 1, percentage: 20 }], inconsistentFormatsCount: 0, outliersCount: 0 },
  { name: 'Region', originalName: 'Region', dataType: 'string', isPrimaryKeyCandidate: false, isForeignKeyCandidate: false, totalCount: 5, nullCount: 0, nullPercentage: 0, distinctCount: 4, uniquePercentage: 80, topValues: [{ value: 'North America', count: 2, percentage: 40 }], inconsistentFormatsCount: 0, outliersCount: 0 },
  { name: 'Category', originalName: 'Category', dataType: 'string', isPrimaryKeyCandidate: false, isForeignKeyCandidate: false, totalCount: 5, nullCount: 0, nullPercentage: 0, distinctCount: 4, uniquePercentage: 80, topValues: [{ value: 'AI Analytics', count: 2, percentage: 40 }], inconsistentFormatsCount: 0, outliersCount: 0 },
  { name: 'Revenue', originalName: 'Revenue', dataType: 'number', isPrimaryKeyCandidate: false, isForeignKeyCandidate: false, totalCount: 5, nullCount: 0, nullPercentage: 0, distinctCount: 5, uniquePercentage: 100, min: 64500, max: 168900, mean: 120000, median: 125000, stdDev: 35000, topValues: [{ value: '125000', count: 1, percentage: 20 }], inconsistentFormatsCount: 0, outliersCount: 0 },
  { name: 'Profit', originalName: 'Profit', dataType: 'number', isPrimaryKeyCandidate: false, isForeignKeyCandidate: false, totalCount: 5, nullCount: 0, nullPercentage: 0, distinctCount: 5, uniquePercentage: 100, min: 19800, max: 67200, mean: 42900, median: 42000, stdDev: 16500, topValues: [{ value: '42000', count: 1, percentage: 20 }], inconsistentFormatsCount: 0, outliersCount: 0 },
  { name: 'Units', originalName: 'Units', dataType: 'number', isPrimaryKeyCandidate: false, isForeignKeyCandidate: false, totalCount: 5, nullCount: 0, nullPercentage: 0, distinctCount: 5, uniquePercentage: 100, min: 29, max: 74, mean: 49.6, median: 45, stdDev: 16.2, topValues: [{ value: '45', count: 1, percentage: 20 }], inconsistentFormatsCount: 0, outliersCount: 0 },
];

const samplePayload: ExportDataPayload = {
  project: {
    id: 'proj-sop-test',
    name: 'Global SaaS Revenue Q1',
    companyName: 'Data Analytix',
    department: 'Enterprise BI & Analytics',
    author: 'Data Analytix Engine',
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
    isDemo: false,
    version: 'v2.4.0',
    dataQualityScore: 98,
    sourceFileName: 'global_saas_q1.csv',
    rowCount: sampleRows.length,
    columnCount: sampleColumns.length,
  },
  brand: {
    companyName: 'Data Analytix',
    tagline: 'Enterprise BI & Analytics',
    department: 'Enterprise BI & Analytics',
    author: 'Data Analytix Engine',
    themeColor: LIGHT_TOKENS['--accent'],
    backgroundColor: LIGHT_TOKENS['--bg-app'],
    accentColor: LIGHT_TOKENS['--chart-4'],
  },
  rawRows: sampleRows,
  cleanRows: sampleRows,
  columns: sampleColumns,
  dataModel: {
    schemaType: 'star',
    tables: [
      {
        id: 'tbl-fact-sales',
        name: 'FactSales',
        type: 'fact',
        columns: sampleColumns,
        primaryKey: 'Date',
        foreignKeys: [],
        rowCount: sampleRows.length,
        data: sampleRows,
      },
    ],
    relationships: [],
    validationWarnings: [],
  },
  kpis: [
    {
      id: 'kpi-rev',
      name: 'Total Revenue',
      value: 600000,
      formattedValue: '$600.0K',
      previousValue: 520000,
      changePercent: 15.4,
      period: 'Q1 2026',
      status: 'On Track',
      calculation: 'SUM(Revenue)',
      sourceColumn: 'Revenue',
      aggregation: 'sum',
      traceableSource: 'FactSales.Revenue',
    },
  ],
  daxMeasures: [
    {
      id: 'dax-1',
      name: 'Total Revenue',
      table: 'FactSales',
      formula: 'Total Revenue = SUM(FactSales[Revenue])',
      category: 'Financial',
      description: 'Computes gross recognized SaaS revenue.',
      dependencies: [],
      sourceColumns: ['Revenue'],
    },
  ],
  insights: [
    {
      id: 'ins-1',
      title: 'North America Leads Revenue Share',
      category: 'Driver',
      what: 'North America accounts for $293.9K (49.0%) of total SaaS revenue.',
      why: 'Strong enterprise renewal velocity in Q1.',
      whoOrWhat: 'North America Enterprise Segment',
      significance: 'High (+15% projected ARR)',
      action: 'Expand enterprise field sales capacity in North America and APAC.',
      relatedMetric: 'Revenue',
      supportingData: '$293,900 across 2 enterprise orders',
      confidence: 96,
    },
  ],
  transformations: [
    {
      id: 'tr-1',
      timestamp: '2026-11-09T12:00:00.000Z',
      action: 'trim_whitespace',
      column: 'Region',
      parameters: {},
      description: 'Trimmed leading and trailing whitespace in Region',
    },
  ],
  qualityReport: {
    overallScore: 98,
    completenessScore: 100,
    uniquenessScore: 96,
    validityScore: 98,
    consistencyScore: 98,
    totalIssuesCount: 0,
    issues: [],
  },
};

describe('Design SOP Export Generators (docs/DESIGN-SOP.md)', () => {
  it('builds canonical SOP filenames with zero spaces and lowercase hyphens', () => {
    const fixedDate = new Date('2026-11-09T12:00:00.000Z');
    const filename = buildSopFileName('executive-report', 'Global SaaS Revenue Q1!', 'pdf', fixedDate);
    expect(filename).toBe('data-analytix-executive-report-global-saas-revenue-q1-2026-11-09.pdf');
    expect(filename).not.toContain(' ');

    const noDataFilename = buildSopFileName('blank-template', null, 'csv', fixedDate);
    expect(noDataFilename).toBe('data-analytix-blank-template-workspace-2026-11-09.csv');
  });

  it('generates SOP metadata and code comment headers with full provenance', () => {
    const meta = buildSopMetadata({
      datasetName: 'Global SaaS Revenue Q1',
      rowCount: 5,
      columnCount: 6,
      source: 'global_saas_q1.csv',
    });
    expect(meta.brand).toBe('Data Analytix');
    expect(meta.brandName).toBe('Data Analytix');
    expect(meta.appVersion).toBe('2.4.0');
    expect(meta.datasetName).toBe('Global SaaS Revenue Q1');
    expect(meta.rowCount).toBe(5);
    expect(meta.source).toBe('global_saas_q1.csv');

    const sqlHeader = buildSopCodeHeaderComment('sql', 'SQL Schema & Analytical Queries', meta);
    expect(sqlHeader).toContain('Data Analytix — SQL Schema & Analytical Queries');
    expect(sqlHeader).toContain('Dataset Name   : Global SaaS Revenue Q1');
    expect(sqlHeader).toContain('Row Count      : 5');
  });

  it('generates Executive Report PDF with %PDF- header, >= 1 page, brand title, dataset name, and page numbers', () => {
    const doc = generateEnterpriseReportPDF(samplePayload);
    const rawPdf = doc.output();
    expect(rawPdf.startsWith('%PDF-')).toBe(true);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(rawPdf).toContain('Data Analytix');
    expect(rawPdf).toContain('Global SaaS Revenue Q1');
    expect(rawPdf).toContain('Page 1 of');
  });

  it('generates Chart Selection Guide PDF with %PDF- header and expected page count', () => {
    const fixedDate = new Date('2026-11-09T12:00:00.000Z');
    const doc = generateChartGuidePDF({
      datasetName: 'Global SaaS Revenue Q1',
      columns: sampleColumns,
      rows: sampleRows,
      includeDatasetRecommendations: true,
      generatedDate: fixedDate,
    });
    const rawPdf = doc.output();
    expect(rawPdf.startsWith('%PDF-')).toBe(true);
    expect(doc.getNumberOfPages()).toBe(12);
    const filename = getChartGuidePdfFilename(fixedDate, 'Global SaaS Revenue Q1');
    expect(filename).toBe('data-analytix-chart-guide-global-saas-revenue-q1-2026-11-09.pdf');
    expect(rawPdf).toContain('Data Analytix: Chart Selection Guide');
  });

  it('builds synchronous and async SOP Excel workbooks with 00_Metadata, expected sheets, and frozen headers', async () => {
    const syncBuf = buildExcelWorkbook(samplePayload);
    const wbSync = XLSX.read(syncBuf, { type: 'buffer' });
    expect(wbSync.SheetNames).toContain('00_Metadata');
    expect(wbSync.SheetNames).toContain('02_Clean_Data');
    expect(wbSync.SheetNames).toContain('01_Raw_Data');
    expect(wbSync.SheetNames).toContain('KPI_Definitions');
    expect(wbSync.SheetNames).toContain('Data_Dictionary');

    const asyncBlob = await buildSopExcelWorkbookAsync(samplePayload, false);
    const asyncArrayBuffer = await asyncBlob.arrayBuffer();
    const excelWorkbook = new ExcelJS.Workbook();
    await excelWorkbook.xlsx.load(asyncArrayBuffer);
    const sheetNames = excelWorkbook.worksheets.map(ws => ws.name);
    expect(sheetNames).toContain('00_Metadata');
    expect(sheetNames).toContain('02_Clean_Data');

    const cleanSheet = excelWorkbook.getWorksheet('02_Clean_Data');
    expect(cleanSheet).toBeDefined();
    expect(cleanSheet!.views[0]?.state).toBe('frozen');
    expect((cleanSheet!.views[0] as any)?.ySplit).toBe(1);
    expect(cleanSheet!.getRow(1).getCell(1).fill).toMatchObject({
      type: 'pattern',
      fgColor: { argb: 'FF0F766E' },
    });
  });

  it('generates Power BI Theme JSON matching designTokens.ts LIGHT_TOKENS palette', () => {
    const rawJson = generatePowerBIThemeJSON(samplePayload.brand, samplePayload.project.name);
    const parsed = JSON.parse(rawJson);
    expect(parsed.dataColors).toContain(LIGHT_TOKENS['--chart-1']);
    expect(parsed.dataColors).toContain(LIGHT_TOKENS['--chart-2']);
    expect(parsed.sopMetadata.brand).toBe('Data Analytix');
    expect(parsed.sopMetadata.datasetName).toBe('Global SaaS Revenue Q1');
  });

  it('generates standalone offline HTML dashboard with prefers-color-scheme tokens and zero external requests', () => {
    const html = generateStandaloneDashboardHTML(samplePayload);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(':root');
    expect(html).toContain('@media (prefers-color-scheme: light)');
    expect(html).toContain(DARK_TOKENS['--bg-app']);
    expect(html).toContain(LIGHT_TOKENS['--bg-app']);
    expect(html).toContain('Global SaaS Revenue Q1');
    expect(html).not.toMatch(/https?:\/\//i);
  });

  it('creates 14-folder Complete Project ZIP with README.md and export_manifest.json', async () => {
    const blob = await createCompleteProjectZip(samplePayload);
    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const files = Object.keys(zip.files);

    expect(files).toContain('README.md');
    expect(files).toContain('export_manifest.json');
    expect(files.some(f => f.startsWith('01_Original_Data/'))).toBe(true);
    expect(files.some(f => f.startsWith('02_Cleaned_Data/'))).toBe(true);
    expect(files.some(f => f.startsWith('03_Excel_Source/'))).toBe(true);
    expect(files.some(f => f.startsWith('04_Data_Model/'))).toBe(true);
    expect(files.some(f => f.startsWith('05_DAX/'))).toBe(true);
    expect(files.some(f => f.startsWith('06_SQL/'))).toBe(true);
    expect(files.some(f => f.startsWith('07_Python/'))).toBe(true);
    expect(files.some(f => f.startsWith('08_PowerBI/'))).toBe(true);
    expect(files.some(f => f.startsWith('09_Dashboard/'))).toBe(true);
    expect(files.some(f => f.startsWith('10_Reports/'))).toBe(true);
    expect(files.some(f => f.startsWith('11_Data_Dictionary/'))).toBe(true);
    expect(files.some(f => f.startsWith('12_Insights/'))).toBe(true);
    expect(files.some(f => f.startsWith('13_Documentation/'))).toBe(true);
    expect(files.some(f => f.startsWith('14_Project_Metadata/'))).toBe(true);

    const manifestStr = await zip.file('export_manifest.json')!.async('string');
    const manifest = JSON.parse(manifestStr);
    expect(manifest.sopMetadata.brand).toBe('Data Analytix');
    expect(manifest.sopMetadata.datasetName).toBe('Global SaaS Revenue Q1');
  });

  it('prepends SOP provenance header comments to DAX, SQL, Python, and Power Query M scripts', () => {
    const dax = generateSopDaxScript(samplePayload);
    const sql = generateSopSqlScript(samplePayload);
    const py = generateSopPythonScript(samplePayload);
    const pq = generatePowerBIMSemanticModel(samplePayload);

    for (const script of [dax, sql, py, pq]) {
      expect(script).toContain('Data Analytix');
      expect(script).toContain('v2.4.0');
      expect(script).toContain('Global SaaS Revenue Q1');
      expect(script).toContain('Row Count      : 5');
    }
  });

  it('generates no-data blank templates (0 fake data rows), sample dataset CSV, and Design SOP markdown', async () => {
    const blankCsv = generateBlankCsvTemplate(sampleColumns);
    const csvLines = blankCsv.trim().split('\n');
    expect(csvLines.length).toBe(1); // Only header row, zero fake data rows
    expect(csvLines[0]).toContain('Date,Region,Category,Revenue,Profit,Units');

    const blankXlsxBlob = await generateBlankExcelTemplateAsync(sampleColumns, false);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blankXlsxBlob.arrayBuffer());
    expect(wb.getWorksheet('00_Metadata')).toBeDefined();
    const dataSheet = wb.getWorksheet('01_Data_Template');
    expect(dataSheet).toBeDefined();
    expect(dataSheet!.rowCount).toBe(1); // Only header row

    const sampleRes = generateSampleDatasetCsv();
    expect(sampleRes.csv.trim().split('\n').length).toBeGreaterThan(5);
    expect(sampleRes.rowCount).toBeGreaterThan(0);

    const sopMd = generateDesignSopMarkdown();
    expect(sopMd).toContain('# Data Analytix — Design & Export Standard Operating Procedure (SOP)');
    expect(sopMd).toContain('data-analytix-<type>-<dataset>-YYYY-MM-DD.<ext>');
  });

  it('builds plotted chart CSV data matching the rendered chart aggregation', () => {
    const plotted = buildGuideChartPlottedCSV({
      chartType: 'bar',
      rows: sampleRows,
      categoryField: 'Region',
      valueField: 'Revenue',
      aggregation: 'sum',
    });
    expect(plotted.headers).toEqual(['Region', 'SUM(Revenue)', 'Share (%)', 'Row Count']);
    expect(plotted.rows.length).toBe(4);
    expect(plotted.rows[0][0]).toBe('North America');
    expect(plotted.rows[0][1]).toBe(293900);
  });
});
