import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DataType } from '../types';

export interface ParseResult {
  fileName: string;
  tableName: string;
  columns: string[];
  rows: Record<string, any>[];
  detectedTypes: Record<string, DataType>;
  sheets?: string[];
  delimiter?: string;
  parseDiagnostics?: {
    totalRows: number;
    failedNumericCasts: number;
    dateFormatDetected?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'ISO' | 'other';
  };
}

export async function parseFile(file: File): Promise<ParseResult> {
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
            return reject(new Error('Parsed file contains no rows.'));
          }
          // Gather distinct columns across first 50 rows in case subsequent rows have additional keys
          const colSet = new Set<string>();
          for (let i = 0; i < Math.min(rawRows.length, 50); i++) {
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
          const detectedTypes = inferTypes(columns, sanitizedRows);
          const { typedRows, failedNumericCasts } = castRowsWithDiagnostics(sanitizedRows, detectedTypes);

          resolve({
            fileName: file.name,
            tableName: file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_'),
            columns,
            rows: typedRows,
            detectedTypes,
            delimiter: results.meta.delimiter || ',',
            parseDiagnostics: {
              totalRows: typedRows.length,
              failedNumericCasts
            }
          });
        },
        error: (err) => reject(err)
      });
    });
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Excel workbook contains no sheets.');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: null });
    if (!rawRows || rawRows.length === 0) {
      throw new Error('First worksheet contains no data rows.');
    }
    const colSet = new Set<string>();
    for (let i = 0; i < Math.min(rawRows.length, 50); i++) {
      Object.keys(rawRows[i] || {}).forEach(k => {
        const trimmed = k.trim();
        if (trimmed) colSet.add(trimmed);
      });
    }
    const columns = Array.from(colSet);
    const detectedTypes = inferTypes(columns, rawRows);
    const { typedRows, failedNumericCasts } = castRowsWithDiagnostics(rawRows, detectedTypes);

    return {
      fileName: file.name,
      tableName: firstSheetName.replace(/[^a-zA-Z0-9_]/g, '_') || 'DataTable',
      columns,
      rows: typedRows,
      detectedTypes,
      sheets: workbook.SheetNames,
      parseDiagnostics: {
        totalRows: typedRows.length,
        failedNumericCasts
      }
    };
  }

  if (extension === 'json') {
    const text = await file.text();
    let json = JSON.parse(text);
    if (!Array.isArray(json)) {
      if (typeof json === 'object' && json !== null) {
        // Find first array property
        const arrayProp = Object.values(json).find(v => Array.isArray(v));
        if (arrayProp) {
          json = arrayProp as any[];
        } else {
          json = [json];
        }
      }
    }
    if (!json.length) {
      throw new Error('JSON file contains no record array.');
    }
    const colSet = new Set<string>();
    for (let i = 0; i < Math.min(json.length, 50); i++) {
      Object.keys(json[i] || {}).forEach(k => {
        const trimmed = k.trim();
        if (trimmed) colSet.add(trimmed);
      });
    }
    const columns = Array.from(colSet);
    const detectedTypes = inferTypes(columns, json);
    const { typedRows, failedNumericCasts } = castRowsWithDiagnostics(json, detectedTypes);

    return {
      fileName: file.name,
      tableName: file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_'),
      columns,
      rows: typedRows,
      detectedTypes,
      parseDiagnostics: {
        totalRows: typedRows.length,
        failedNumericCasts
      }
    };
  }

  throw new Error(`Unsupported file extension: .${extension}. Supported: CSV, XLSX, XLS, JSON, TXT`);
}

/**
 * Robust number parsing supporting:
 * - Currency symbols ($, €, £, ¥) and ISO codes (PKR, USD, EUR, etc.)
 * - European comma decimals (1.234,56 or 1234,56)
 * - Standard comma thousands (1,234.56)
 * - Accounting negative parentheses ((500) -> -500)
 * - Percentages (12% -> 12 or 0.12 depending on context, parses to numeric 12)
 * - Retains leading zero strings (00123) as strings so codes/IDs are not corrupted
 */
export function parseRobustNumber(val: any): { value: number | null; isValidNumber: boolean; isLeadingZeroCode?: boolean } {
  if (val === null || val === undefined || val === '') {
    return { value: null, isValidNumber: false };
  }
  if (typeof val === 'number') {
    return { value: isNaN(val) ? null : val, isValidNumber: !isNaN(val) };
  }

  const str = String(val).trim();
  if (str === '') return { value: null, isValidNumber: false };

  // Check for leading zero identifiers like '00123' or '07801'
  if (/^0\d{2,}$/.test(str)) {
    return { value: null, isValidNumber: false, isLeadingZeroCode: true };
  }

  // Handle accounting parentheses: '(123.45)' -> '-123.45'
  let isNegative = false;
  let cleaned = str;
  if (/^\((.*)\)$/.test(cleaned)) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1).trim();
  } else if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1).trim();
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1).trim();
  }

  // Strip known currency symbols and 3-4 letter uppercase currency codes (e.g. PKR, USD, EUR, GBP, AUD, CAD)
  cleaned = cleaned.replace(/^([$\u20AC\u00A3\u00A5\u20B9\u20A8]|PKR|USD|EUR|GBP|AUD|CAD|INR|JPY|CNY)\s*/i, '');
  cleaned = cleaned.replace(/\s*([$\u20AC\u00A3\u00A5\u20B9\u20A8]|PKR|USD|EUR|GBP|AUD|CAD|INR|JPY|CNY)$/i, '');

  // Strip trailing percentage symbol
  const isPercent = cleaned.endsWith('%');
  if (isPercent) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  // Handle decimal vs thousand separators
  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');

  if (hasDot && hasComma) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastComma > lastDot) {
      // European format: 1.234,56 -> remove dots, replace comma with dot
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // US format: 1,234.56 -> remove commas
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Comma only: if exactly 1 comma with 1 or 2 digits at end, e.g. 12,5 or 12,50 -> decimal comma
    if (/,\d{1,2}$/.test(cleaned)) {
      cleaned = cleaned.replace(',', '.');
    } else {
      // Thousands separator: 1,000 -> 1000
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const num = Number(cleaned);
  if (isNaN(num)) {
    return { value: null, isValidNumber: false };
  }

  const finalVal = isNegative ? -num : num;
  return { value: finalVal, isValidNumber: true };
}

/**
 * Local date formatter to prevent the 1-day backward timezone shift of toISOString()
 */
export function formatLocalDateParts(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Resolves date strings safely respecting DD/MM vs MM/DD
 */
export function parseDateStringSafely(val: string, formatHint?: 'DD/MM' | 'MM/DD'): string {
  const str = val.trim();
  // Check for ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Check for separated date: token1 / token2 / token3
  const sepMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (sepMatch) {
    let t1 = parseInt(sepMatch[1], 10);
    let t2 = parseInt(sepMatch[2], 10);
    let y = sepMatch[3];
    if (y.length === 2) {
      y = parseInt(y, 10) > 40 ? `19${y}` : `20${y}`;
    }

    let day = t1;
    let month = t2;

    if (t1 > 12) {
      // Definitely DD/MM
      day = t1;
      month = t2;
    } else if (t2 > 12) {
      // Definitely MM/DD
      month = t1;
      day = t2;
    } else if (formatHint === 'DD/MM') {
      day = t1;
      month = t2;
    } else {
      // Standard US MM/DD default if ambiguous and no hint
      month = t1;
      day = t2;
    }

    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${y}-${mStr}-${dStr}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return formatLocalDateParts(parsed);
  }
  return str;
}

export function inferTypes(columns: string[], rows: Record<string, any>[]): Record<string, DataType> {
  const result: Record<string, DataType> = {};
  const sampleSize = Math.min(rows.length, 300);

  columns.forEach(col => {
    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;
    let validSampleCount = 0;
    let hasLeadingZeros = false;

    // Check for DD/MM indications in date candidates
    let dayOver12First = 0;

    for (let i = 0; i < sampleSize; i++) {
      const val = rows[i]?.[col];
      if (val === null || val === undefined || val === '') continue;

      validSampleCount++;
      const strVal = String(val).trim();

      // Check Boolean
      if (/^(true|false|yes|no)$/i.test(strVal) || typeof val === 'boolean') {
        booleanCount++;
        continue;
      }

      // Check Leading zero codes (like 00123) - keep as string!
      const parsedNum = parseRobustNumber(val);
      if (parsedNum.isLeadingZeroCode) {
        hasLeadingZeros = true;
      }

      // Check Number
      if (parsedNum.isValidNumber && !hasLeadingZeros) {
        numberCount++;
        continue;
      }

      // Check Date
      if (val instanceof Date || isValidDateString(strVal)) {
        dateCount++;
        const match = strVal.match(/^(\d{1,2})[-/.](\d{1,2})/);
        if (match && parseInt(match[1], 10) > 12) {
          dayOver12First++;
        }
        continue;
      }
    }

    if (validSampleCount === 0 || hasLeadingZeros) {
      result[col] = 'string';
    } else if (numberCount / validSampleCount > 0.70) {
      result[col] = 'number';
    } else if (dateCount / validSampleCount > 0.65) {
      result[col] = 'date';
    } else if (booleanCount / validSampleCount > 0.8) {
      result[col] = 'boolean';
    } else {
      result[col] = 'string';
    }
  });

  return result;
}

export function castRowsWithDiagnostics(
  rows: Record<string, any>[], 
  detectedTypes: Record<string, DataType>
): { typedRows: Record<string, any>[]; failedNumericCasts: number } {
  let failedNumericCasts = 0;

  // Pre-scan date columns for DD/MM hints
  const dateFormatHints: Record<string, 'DD/MM' | 'MM/DD'> = {};
  Object.keys(detectedTypes).forEach(col => {
    if (detectedTypes[col] === 'date') {
      let ddCount = 0;
      let mmCount = 0;
      for (let i = 0; i < Math.min(rows.length, 100); i++) {
        const val = String(rows[i]?.[col] || '').trim();
        const m = val.match(/^(\d{1,2})[-/.](\d{1,2})/);
        if (m) {
          const t1 = parseInt(m[1], 10);
          const t2 = parseInt(m[2], 10);
          if (t1 > 12) ddCount++;
          if (t2 > 12) mmCount++;
        }
      }
      if (ddCount > 0) dateFormatHints[col] = 'DD/MM';
      else if (mmCount > 0) dateFormatHints[col] = 'MM/DD';
    }
  });

  const typedRows = rows.map(row => {
    const casted: Record<string, any> = {};
    Object.keys(row).forEach(col => {
      const rawVal = row[col];
      const type = detectedTypes[col] || 'string';

      if (rawVal === null || rawVal === undefined || rawVal === '') {
        casted[col] = null;
        return;
      }

      if (type === 'number') {
        const parsed = parseRobustNumber(rawVal);
        if (parsed.isValidNumber && parsed.value !== null) {
          casted[col] = parsed.value;
        } else {
          failedNumericCasts++;
          casted[col] = null;
        }
      } else if (type === 'date') {
        if (rawVal instanceof Date) {
          casted[col] = formatLocalDateParts(rawVal);
        } else {
          casted[col] = parseDateStringSafely(String(rawVal), dateFormatHints[col]);
        }
      } else if (type === 'boolean') {
        casted[col] = /^(true|yes|1)$/i.test(String(rawVal).trim());
      } else {
        casted[col] = String(rawVal).trim();
      }
    });
    return casted;
  });

  return { typedRows, failedNumericCasts };
}

export function castRows(rows: Record<string, any>[], detectedTypes: Record<string, DataType>): Record<string, any>[] {
  return castRowsWithDiagnostics(rows, detectedTypes).typedRows;
}

function isValidDateString(val: string): boolean {
  if (val.length < 4 || val.length > 32) return false;
  const dateRegex = /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/;
  if (!dateRegex.test(val)) return false;
  const parsed = Date.parse(val);
  return !isNaN(parsed);
}
