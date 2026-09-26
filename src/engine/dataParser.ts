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
          const columns = Object.keys(rawRows[0] || {}).map(c => c.trim()).filter(Boolean);
          const sanitizedRows = rawRows.map(row => {
            const clean: Record<string, any> = {};
            columns.forEach(col => {
              clean[col] = row[col];
            });
            return clean;
          });
          const detectedTypes = inferTypes(columns, sanitizedRows);
          const typedRows = castRows(sanitizedRows, detectedTypes);

          resolve({
            fileName: file.name,
            tableName: file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_'),
            columns,
            rows: typedRows,
            detectedTypes,
            delimiter: results.meta.delimiter || ','
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
    const columns = Object.keys(rawRows[0]).map(c => c.trim()).filter(Boolean);
    const detectedTypes = inferTypes(columns, rawRows);
    const typedRows = castRows(rawRows, detectedTypes);

    return {
      fileName: file.name,
      tableName: firstSheetName.replace(/[^a-zA-Z0-9_]/g, '_') || 'DataTable',
      columns,
      rows: typedRows,
      detectedTypes,
      sheets: workbook.SheetNames
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
    const columns = Object.keys(json[0] || {}).map(c => c.trim()).filter(Boolean);
    const detectedTypes = inferTypes(columns, json);
    const typedRows = castRows(json, detectedTypes);

    return {
      fileName: file.name,
      tableName: file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_'),
      columns,
      rows: typedRows,
      detectedTypes
    };
  }

  throw new Error(`Unsupported file extension: .${extension}. Supported: CSV, XLSX, XLS, JSON, TXT`);
}

export function inferTypes(columns: string[], rows: Record<string, any>[]): Record<string, DataType> {
  const result: Record<string, DataType> = {};
  const sampleSize = Math.min(rows.length, 100);

  columns.forEach(col => {
    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;
    let validSampleCount = 0;

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

      // Check Number (ignoring currency signs, commas)
      const cleanNumStr = strVal.replace(/^[$\u20AC\u00A3\u00A5]/, '').replace(/,/g, '').trim();
      if (!isNaN(Number(cleanNumStr)) && cleanNumStr !== '') {
        numberCount++;
        continue;
      }

      // Check Date
      if (isValidDateString(strVal) || val instanceof Date) {
        dateCount++;
        continue;
      }
    }

    if (validSampleCount === 0) {
      result[col] = 'string';
    } else if (numberCount / validSampleCount > 0.75) {
      result[col] = 'number';
    } else if (dateCount / validSampleCount > 0.7) {
      result[col] = 'date';
    } else if (booleanCount / validSampleCount > 0.8) {
      result[col] = 'boolean';
    } else {
      result[col] = 'string';
    }
  });

  return result;
}

export function castRows(rows: Record<string, any>[], detectedTypes: Record<string, DataType>): Record<string, any>[] {
  return rows.map(row => {
    const casted: Record<string, any> = {};
    Object.keys(row).forEach(col => {
      const rawVal = row[col];
      const type = detectedTypes[col] || 'string';

      if (rawVal === null || rawVal === undefined || rawVal === '') {
        casted[col] = null;
        return;
      }

      if (type === 'number') {
        const cleanNumStr = String(rawVal).replace(/^[$\u20AC\u00A3\u00A5]/, '').replace(/,/g, '').trim();
        const num = Number(cleanNumStr);
        casted[col] = isNaN(num) ? null : num;
      } else if (type === 'date') {
        if (rawVal instanceof Date) {
          casted[col] = rawVal.toISOString().split('T')[0];
        } else {
          const d = new Date(rawVal);
          casted[col] = isNaN(d.getTime()) ? String(rawVal) : d.toISOString().split('T')[0];
        }
      } else if (type === 'boolean') {
        casted[col] = /^(true|yes|1)$/i.test(String(rawVal).trim());
      } else {
        casted[col] = String(rawVal).trim();
      }
    });
    return casted;
  });
}

function isValidDateString(val: string): boolean {
  if (val.length < 4 || val.length > 30) return false;
  // Patterns like YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD
  const dateRegex = /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/;
  if (!dateRegex.test(val)) return false;
  const parsed = Date.parse(val);
  return !isNaN(parsed);
}
