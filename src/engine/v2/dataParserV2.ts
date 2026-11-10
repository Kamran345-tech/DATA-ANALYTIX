import Papa from 'papaparse';
import { DataType } from '../../types';
import { parseRobustNumber } from '../dataParser';

export interface ParseResultV2 {
  fileName: string;
  tableName: string;
  columns: string[];
  rows: Record<string, any>[];
  detectedTypes: Record<string, DataType>;
  sheets?: string[];
  activeSheet?: string;
  delimiter?: string;
  parseDiagnostics: {
    totalRows: number;
    failedNumericCasts: number;
    dateFormatDetected?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'ISO' | 'other';
    sampledRowCount: number;
    engineVersion: 'v2';
  };
}

/**
 * Enhanced Date Format Detector
 * Disambiguates DD/MM/YYYY vs MM/DD/YYYY using values > 12
 */
export function detectDateFormatV2(values: any[]): 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'ISO' | 'other' {
  let hasFirstPartOver12 = false;
  let hasSecondPartOver12 = false;
  let isoCount = 0;

  for (const val of values) {
    if (!val) continue;
    const s = String(val).trim();

    // Check ISO: 2024-05-12 or 2024/05/12
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(s)) {
      isoCount++;
      continue;
    }

    // Delimited date: part1/part2/part3
    const match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (match) {
      const p1 = parseInt(match[1], 10);
      const p2 = parseInt(match[2], 10);

      if (p1 > 12) hasFirstPartOver12 = true;
      if (p2 > 12) hasSecondPartOver12 = true;
    }
  }

  if (isoCount > values.length * 0.5) return 'ISO';
  if (hasFirstPartOver12 && !hasSecondPartOver12) return 'DD/MM/YYYY';
  if (hasSecondPartOver12 && !hasFirstPartOver12) return 'MM/DD/YYYY';

  // Default to ISO or standard MM/DD/YYYY
  return 'ISO';
}

/**
 * Extended type inference sampling up to 1,000 rows
 */
export function inferTypesV2(columns: string[], rows: Record<string, any>[]): Record<string, DataType> {
  const types: Record<string, DataType> = {};
  const sampleLimit = Math.min(rows.length, 1000); // V2 samples up to 1,000 rows

  columns.forEach(col => {
    let numCount = 0;
    let dateCount = 0;
    let boolCount = 0;
    let nonNullCount = 0;

    for (let i = 0; i < sampleLimit; i++) {
      const val = rows[i]?.[col];
      if (val === null || val === undefined || val === '') continue;
      nonNullCount++;

      // Direct number check
      if (typeof val === 'number') {
        numCount++;
        continue;
      }

      // Boolean check
      if (typeof val === 'boolean' || String(val).toLowerCase() === 'true' || String(val).toLowerCase() === 'false') {
        boolCount++;
        continue;
      }

      // Number check via string parse
      const parsedNum = parseRobustNumber(val);
      if (parsedNum.isValidNumber && parsedNum.value !== null) {
        numCount++;
        continue;
      }

      // Date check
      const d = new Date(val);
      if (!isNaN(d.getTime()) && String(val).length >= 6 && /\d/.test(String(val))) {
        dateCount++;
      }
    }

    if (nonNullCount === 0) {
      types[col] = 'string';
    } else if (numCount / nonNullCount > 0.7) {
      types[col] = 'number';
    } else if (dateCount / nonNullCount > 0.7) {
      types[col] = 'date';
    } else if (boolCount / nonNullCount > 0.7) {
      types[col] = 'boolean';
    } else {
      types[col] = 'string';
    }
  });

  return types;
}

export async function parseFileV2(
  file: File,
  targetSheet?: string
): Promise<ParseResultV2> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv' || extension === 'txt') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rawRows = results.data as Record<string, any>[];
          if (!rawRows || rawRows.length === 0) {
            return reject(new Error('Parsed CSV contains no rows.'));
          }

          // Sample columns across up to 200 rows
          const colSet = new Set<string>();
          const scanRows = Math.min(rawRows.length, 200);
          for (let i = 0; i < scanRows; i++) {
            Object.keys(rawRows[i] || {}).forEach(k => {
              const trimmed = k.trim();
              if (trimmed) colSet.add(trimmed);
            });
          }

          const columns = Array.from(colSet);
          const sanitizedRows = rawRows.map(row => {
            const clean: Record<string, any> = {};
            columns.forEach(col => {
              clean[col] = row[col];
            });
            return clean;
          });

          const detectedTypes = inferTypesV2(columns, sanitizedRows);

          // Detect date format on date columns
          const dateCols = columns.filter(c => detectedTypes[c] === 'date');
          let detectedDateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'ISO' | 'other' = 'ISO';
          if (dateCols.length > 0) {
            const sampleVals = sanitizedRows.slice(0, 100).map(r => r[dateCols[0]]);
            detectedDateFormat = detectDateFormatV2(sampleVals);
          }

          let failedCasts = 0;
          const typedRows = sanitizedRows.map(row => {
            const tr: Record<string, any> = {};
            columns.forEach(col => {
              const val = row[col];
              if (detectedTypes[col] === 'number') {
                const n = parseRobustNumber(val);
                if (n.isValidNumber && n.value !== null) {
                  tr[col] = n.value;
                } else {
                  tr[col] = null;
                  if (val !== null && val !== undefined && val !== '') failedCasts++;
                }
              } else {
                tr[col] = val;
              }
            });
            return tr;
          });

          resolve({
            fileName: file.name,
            tableName: file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_'),
            columns,
            rows: typedRows,
            detectedTypes,
            delimiter: results.meta.delimiter || ',',
            parseDiagnostics: {
              totalRows: typedRows.length,
              failedNumericCasts: failedCasts,
              dateFormatDetected: detectedDateFormat,
              sampledRowCount: scanRows,
              engineVersion: 'v2'
            }
          });
        },
        error: (err) => reject(err)
      });
    });
  }

  // Excel support with selectable sheet
  if (extension === 'xlsx' || extension === 'xls') {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetNames = workbook.SheetNames;
    const selectedSheet = targetSheet && sheetNames.includes(targetSheet) ? targetSheet : sheetNames[0];

    if (!selectedSheet) {
      throw new Error('Workbook contains no worksheets.');
    }

    const worksheet = workbook.Sheets[selectedSheet];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: null });

    const colSet = new Set<string>();
    const scanLimit = Math.min(rawRows.length, 200);
    for (let i = 0; i < scanLimit; i++) {
      Object.keys(rawRows[i] || {}).forEach(k => {
        const trimmed = k.trim();
        if (trimmed) colSet.add(trimmed);
      });
    }

    const columns = Array.from(colSet);
    const detectedTypes = inferTypesV2(columns, rawRows);

    let failedCasts = 0;
    const typedRows = rawRows.map(row => {
      const tr: Record<string, any> = {};
      columns.forEach(col => {
        const val = row[col];
        if (detectedTypes[col] === 'number') {
          const n = parseRobustNumber(val);
          if (n.isValidNumber && n.value !== null) {
            tr[col] = n.value;
          } else {
            tr[col] = null;
            if (val !== null && val !== undefined && val !== '') failedCasts++;
          }
        } else {
          tr[col] = val;
        }
      });
      return tr;
    });

    return {
      fileName: file.name,
      tableName: selectedSheet.replace(/[^a-zA-Z0-9_]/g, '_') || 'DataTable',
      columns,
      rows: typedRows,
      detectedTypes,
      sheets: sheetNames,
      activeSheet: selectedSheet,
      parseDiagnostics: {
        totalRows: typedRows.length,
        failedNumericCasts: failedCasts,
        sampledRowCount: scanLimit,
        engineVersion: 'v2'
      }
    };
  }

  throw new Error(`Unsupported file extension: .${extension}`);
}
