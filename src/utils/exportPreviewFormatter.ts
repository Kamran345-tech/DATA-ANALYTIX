import { ColumnProfile, DataModel, DAXMeasure, KPI, BrandConfig, ProjectMetadata, DataQualityReport } from '../types';
import { parseRobustNumber } from '../engine/dataParser';

export type ExportPreviewFormat = 'excel' | 'powerbi';

export interface ExportPreviewColumnMeta {
  key: string;
  label: string;
  excelLetter: string;
  excelFormatCode: string;
  powerBiDataType: 'double' | 'int64' | 'dateTime' | 'string' | 'boolean';
  powerBiSummarizeBy: 'sum' | 'count' | 'none';
  powerQueryType: 'type number' | 'type date' | 'type text';
  align: 'left' | 'right' | 'center';
  isCurrency: boolean;
  isPercent: boolean;
  isNumeric: boolean;
  isDate: boolean;
}

export interface ExportPreviewSheet {
  id: string;
  name: string;
  badge: string;
  description: string;
  columns: ExportPreviewColumnMeta[];
  rows: Record<string, any>[];
}

export function getExcelColumnLetter(colIndex: number): string {
  let index = colIndex;
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

function toFiniteNumber(raw: any): number {
  if (typeof raw === 'number') return raw;
  const parsed = parseRobustNumber(raw);
  return parsed.isValidNumber && parsed.value !== null ? parsed.value : Number.NaN;
}

export function inferPreviewColumnMeta(
  key: string,
  colIndex: number,
  profile?: ColumnProfile,
  sampleRows: Record<string, any>[] = []
): ExportPreviewColumnMeta {
  const isPercent = /percent|margin|rate|share|ratio|score|roi|roa|roe|churn|retention|occupancy|yield|discount|variance %|null %|%/i.test(key);
  const isCurrency =
    !isPercent &&
    /revenue|sales|profit|cost|amount|price|budget|spend|salary|arr|mrr|cac|clv|ltv|balance|payment|fee|tax|income|expense/i.test(key);

  let dataType = profile?.dataType;
  if (!dataType && sampleRows.length > 0) {
    const firstNonNull = sampleRows.find((r) => r[key] !== null && r[key] !== undefined && r[key] !== '')?.[key];
    if (typeof firstNonNull === 'number') {
      dataType = 'number';
    } else if (typeof firstNonNull === 'string') {
      const parsed = toFiniteNumber(firstNonNull);
      if (!Number.isNaN(parsed) && (isCurrency || isPercent || /^-?\d+(\.\d+)?$/.test(firstNonNull.trim()))) {
        dataType = 'number';
      } else if (/^\d{4}-\d{2}-\d{2}/.test(firstNonNull.trim())) {
        dataType = 'date';
      } else {
        dataType = 'string';
      }
    }
  }

  const isNumeric = dataType === 'number' || isCurrency || isPercent;
  const isDate = dataType === 'date' || /date|time|month|year|period|timestamp|created_at/i.test(key);

  let hasDecimals = false;
  if (isNumeric && sampleRows.length > 0) {
    for (let i = 0; i < Math.min(sampleRows.length, 40); i++) {
      const num = toFiniteNumber(sampleRows[i]?.[key]);
      if (!Number.isNaN(num) && Math.abs(num % 1) > 0.0001) {
        hasDecimals = true;
        break;
      }
    }
  }

  const excelFormatCode = isPercent
    ? '0.0%'
    : isCurrency
    ? '$#,##0.00'
    : isNumeric
    ? hasDecimals
      ? '#,##0.00'
      : '#,##0'
    : isDate
    ? 'yyyy-mm-dd'
    : '@';

  const powerBiDataType: ExportPreviewColumnMeta['powerBiDataType'] = isNumeric
    ? hasDecimals || isCurrency || isPercent
      ? 'double'
      : 'int64'
    : isDate
    ? 'dateTime'
    : 'string';

  const isKeyOrId = /(^id$|_id$|id$|^key$|code|zip|phone|year)/i.test(key) && !isCurrency && !isPercent;
  const powerBiSummarizeBy: ExportPreviewColumnMeta['powerBiSummarizeBy'] =
    isNumeric && !isKeyOrId ? 'sum' : isKeyOrId ? 'count' : 'none';

  const powerQueryType: ExportPreviewColumnMeta['powerQueryType'] = isNumeric
    ? 'type number'
    : isDate
    ? 'type date'
    : 'type text';

  return {
    key,
    label: key,
    excelLetter: getExcelColumnLetter(colIndex),
    excelFormatCode,
    powerBiDataType,
    powerBiSummarizeBy,
    powerQueryType,
    align: isNumeric ? 'right' : isDate ? 'center' : 'left',
    isCurrency,
    isPercent,
    isNumeric,
    isDate,
  };
}

export function formatExportPreviewCell(
  value: any,
  colMeta: ExportPreviewColumnMeta,
  format: ExportPreviewFormat
): string {
  if (value === null || value === undefined || value === '') {
    return format === 'powerbi' ? '(Blank)' : '';
  }

  if (typeof value === 'string' && (value.startsWith('$') || value.endsWith('%') || value === 'N/A')) {
    return value;
  }

  if (colMeta.isNumeric) {
    const num = toFiniteNumber(value);
    if (!Number.isNaN(num)) {
      if (colMeta.isPercent) {
        const pctVal = Math.abs(num) <= 1 && Math.abs(num) > 0 ? num * 100 : num;
        return `${pctVal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
      }

      if (colMeta.isCurrency) {
        if (format === 'excel') {
          return num < 0
            ? `($${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
            : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return num.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }

      const isFloat = colMeta.excelFormatCode === '#,##0.00' || colMeta.powerBiDataType === 'double';
      return num.toLocaleString('en-US', {
        minimumFractionDigits: isFloat ? 2 : 0,
        maximumFractionDigits: isFloat ? 2 : 0,
      });
    }
  }

  if (colMeta.isDate) {
    const str = String(value).trim();
    const d = new Date(str);
    if (!Number.isNaN(d.getTime()) && str.length >= 6) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return format === 'excel' ? `${yyyy}-${mm}-${dd}` : `${mm}/${dd}/${yyyy} 12:00:00 AM`;
    }
  }

  return String(value);
}

export interface BuildPreviewSheetsInput {
  project: ProjectMetadata;
  brand: BrandConfig;
  rawRows: Record<string, any>[];
  cleanRows: Record<string, any>[];
  columns: ColumnProfile[];
  dataModel: DataModel;
  kpis: KPI[];
  daxMeasures: DAXMeasure[];
  qualityReport: DataQualityReport;
}

export function buildExportPreviewSheets(
  input: BuildPreviewSheetsInput,
  format: ExportPreviewFormat
): ExportPreviewSheet[] {
  const { project, brand, rawRows, cleanRows, columns, dataModel, kpis, daxMeasures, qualityReport } = input;
  const colProfileMap = new Map<string, ColumnProfile>(columns.map((c) => [c.name, c]));

  const fallbackRows: Record<string, any>[] =
    cleanRows.length > 0
      ? cleanRows
      : [
          {
            Order_ID: 'ORD-1001',
            Transaction_Date: '2025-01-15',
            Region: 'North America',
            Segment: 'Enterprise',
            Revenue: 14500.5,
            Profit_Margin: 0.245,
            Units_Sold: 42,
          },
        ];

  const cleanKeys =
    columns.length > 0
      ? columns.map((c) => c.name)
      : Object.keys(fallbackRows[0] || {});

  if (format === 'excel') {
    const cleanCols = cleanKeys.map((k, idx) =>
      inferPreviewColumnMeta(k, idx, colProfileMap.get(k), fallbackRows)
    );

    const rawSourceRows = rawRows.length > 0 ? rawRows : fallbackRows;
    const rawKeys = Object.keys(rawSourceRows[0] || {});
    const rawCols = rawKeys.map((k, idx) =>
      inferPreviewColumnMeta(k, idx, colProfileMap.get(k), rawSourceRows)
    );

    const kpiRows =
      kpis.length > 0
        ? kpis.map((k) => ({
            'KPI Name': k.name,
            'Current Value': k.formattedValue,
            'Previous Value': k.formattedPreviousValue || 'N/A',
            'Variance %': k.changePercent !== undefined ? `${k.changePercent}%` : 'N/A',
            Status: k.status,
            'Calculation Formula': k.calculation,
            'Source Field': k.traceableSource,
          }))
        : [
            {
              'KPI Name': 'Total Revenue',
              'Current Value': '$14,500.50',
              'Previous Value': '$12,800.00',
              'Variance %': '13.3%',
              Status: 'On Track',
              'Calculation Formula': 'SUM(Revenue)',
              'Source Field': 'Revenue',
            },
          ];
    const kpiKeys = Object.keys(kpiRows[0]);
    const kpiCols = kpiKeys.map((k, idx) => inferPreviewColumnMeta(k, idx, undefined, kpiRows));

    const dictRows =
      columns.length > 0
        ? columns.map((c) => ({
            'Column Name': c.name,
            'Data Type': c.dataType,
            'Total Count': c.totalCount,
            'Null Count': c.nullCount,
            'Null %': `${c.nullPercentage}%`,
            'Distinct Count': c.distinctCount,
            Min: c.min !== undefined ? c.min : 'N/A',
            Max: c.max !== undefined ? c.max : 'N/A',
            Mean: c.mean !== undefined ? c.mean : 'N/A',
            Role: c.isPrimaryKeyCandidate
              ? 'Primary Key Candidate'
              : c.isForeignKeyCandidate
              ? 'Foreign Key Candidate'
              : c.dataType === 'number'
              ? 'Measure'
              : 'Dimension',
          }))
        : cleanCols.map((c) => ({
            'Column Name': c.key,
            'Data Type': c.isNumeric ? 'number' : c.isDate ? 'date' : 'string',
            'Total Count': fallbackRows.length,
            'Null Count': 0,
            'Null %': '0%',
            'Distinct Count': fallbackRows.length,
            Min: 'N/A',
            Max: 'N/A',
            Mean: 'N/A',
            Role: c.isNumeric ? 'Measure' : 'Dimension',
          }));
    const dictKeys = Object.keys(dictRows[0]);
    const dictCols = dictKeys.map((k, idx) => inferPreviewColumnMeta(k, idx, undefined, dictRows));

    const metaRows = [
      { Property: 'Brand', Value: brand.companyName || 'Data Analytix' },
      { Property: 'Dataset Name', Value: project.name || project.sourceFileName || 'Enterprise Dataset' },
      { Property: 'Department', Value: brand.department || 'Enterprise Analytics' },
      { Property: 'Audited Row Count', Value: cleanRows.length },
      { Property: 'Column Count', Value: columns.length || cleanKeys.length },
      { Property: 'Data Quality Score', Value: `${qualityReport?.overallScore ?? 100}%` },
      { Property: 'Workbook Format', Value: 'OpenXML .xlsx (Frozen Header Row 1, Auto-Width, SOP Print #0F766E)' },
    ];
    const metaCols = Object.keys(metaRows[0]).map((k, idx) =>
      inferPreviewColumnMeta(k, idx, undefined, metaRows)
    );

    return [
      {
        id: '02_Clean_Data',
        name: '02_Clean_Data',
        badge: 'tblCleanData',
        description: 'Primary analytical worksheet with frozen row 1, auto-fitted column widths, and Excel number format codes ($#,##0.00, 0.0%, #,##0).',
        columns: cleanCols,
        rows: fallbackRows,
      },
      {
        id: 'KPI_Definitions',
        name: 'KPI_Definitions',
        badge: 'tblKPIs',
        description: 'Verified executive KPI definitions, variance benchmarks, calculation formulas, and traceable source fields.',
        columns: kpiCols,
        rows: kpiRows,
      },
      {
        id: 'Data_Dictionary',
        name: 'Data_Dictionary',
        badge: 'tblDictionary',
        description: 'Column-level schema profiling, null ratios, statistical bounds, and dimensional vs measure role classifications.',
        columns: dictCols,
        rows: dictRows,
      },
      {
        id: '01_Raw_Data',
        name: '01_Raw_Data',
        badge: 'tblRawData',
        description: 'Immutable backup sheet of the original ingested dataset prior to cleaning transformations.',
        columns: rawCols,
        rows: rawSourceRows,
      },
      {
        id: '00_Metadata',
        name: '00_Metadata',
        badge: 'SOP Provenance',
        description: 'Workbook provenance metadata, audit timestamp, quality score, and governance lineage.',
        columns: metaCols,
        rows: metaRows,
      },
    ];
  }

  // Power BI Format Preview Sheets
  const sheets: ExportPreviewSheet[] = [];

  if (dataModel?.tables && dataModel.tables.length > 0) {
    for (const table of dataModel.tables) {
      const tableCols = (table.columns && table.columns.length > 0 ? table.columns.map((c) => c.name) : cleanKeys).map(
        (colName, idx) => inferPreviewColumnMeta(colName, idx, colProfileMap.get(colName), fallbackRows)
      );
      const tableRows = fallbackRows.map((row) => {
        const projected: Record<string, any> = {};
        for (const col of tableCols) {
          projected[col.key] = row[col.key];
        }
        return projected;
      });
      sheets.push({
        id: `pbi_${table.name}`,
        name: table.name,
        badge: table.type === 'fact' ? 'Fact Table' : 'Dimension',
        description: `Power BI Tabular ${table.type.toUpperCase()} table (${tableCols.length} typed columns, default summarization & Power Query M schema binding).`,
        columns: tableCols,
        rows: tableRows,
      });
    }
  } else {
    const factCols = cleanKeys.map((k, idx) =>
      inferPreviewColumnMeta(k, idx, colProfileMap.get(k), fallbackRows)
    );
    sheets.push({
      id: 'pbi_FactData',
      name: 'FactData',
      badge: 'Fact Table',
      description: 'Power BI Tabular FactData model table with explicit Power Query M column type transformations.',
      columns: factCols,
      rows: fallbackRows,
    });
  }

  // DAX Measures Preview Table
  const daxRows =
    daxMeasures.length > 0
      ? daxMeasures.map((m) => ({
          'Measure Name': m.name,
          'Host Table': m.table || dataModel?.tables[0]?.name || 'FactData',
          Category: m.category,
          'DAX Expression': m.formula,
          Description: m.description,
        }))
      : [
          {
            'Measure Name': 'Total Value',
            'Host Table': 'FactData',
            Category: 'Base Totals',
            'DAX Expression': 'Total Value = SUM(FactData[Revenue])',
            Description: 'Primary aggregated measure exported to Model.bim.',
          },
        ];
  const daxCols = Object.keys(daxRows[0]).map((k, idx) =>
    inferPreviewColumnMeta(k, idx, undefined, daxRows)
  );
  sheets.push({
    id: 'pbi_DAX_Measures',
    name: 'DAX_Measures',
    badge: 'Model.bim',
    description: 'Compiled DAX measures injected into the Power BI Tabular Model (Model.bim) and PBIP semantic package.',
    columns: daxCols,
    rows: daxRows,
  });

  // Relationships Preview Table
  const relRows =
    dataModel?.relationships && dataModel.relationships.length > 0
      ? dataModel.relationships.map((r) => ({
          'From Table (Many)': `${r.sourceTable}[${r.sourceColumn}]`,
          'To Table (One)': `${r.targetTable}[${r.targetColumn}]`,
          Cardinality: r.cardinality,
          'Cross Filter Behavior': r.crossFilterDirection === 'both' ? 'bothDirections' : 'oneDirection',
          Status: r.isValid ? 'Active' : 'Needs Review',
        }))
      : [
          {
            'From Table (Many)': `${dataModel?.tables[0]?.name || 'FactData'}[PrimaryKey]`,
            'To Table (One)': 'Single Flat Fact Table',
            Cardinality: '1:1',
            'Cross Filter Behavior': 'oneDirection',
            Status: 'Active',
          },
        ];
  const relCols = Object.keys(relRows[0]).map((k, idx) =>
    inferPreviewColumnMeta(k, idx, undefined, relRows)
  );
  sheets.push({
    id: 'pbi_Relationships',
    name: 'Relationships',
    badge: 'Star Schema',
    description: 'Tabular relationship definitions linking Fact and Dimension tables in Model.bim.',
    columns: relCols,
    rows: relRows,
  });

  return sheets;
}
