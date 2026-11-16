import { DateNormalizationResult } from './types';

/**
 * Robustly parses real-world currency, percentage, thousand-separator, and accounting-negative strings
 * (e.g., "Rs 1,200", "PKR 45,000.50", "$1,250.00", "12.5%", "(300)", "($1,400.25)", "€ 2.500,50")
 * into a finite number, or null if null/empty/unparseable.
 */
export function parseRealNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || typeof raw === 'boolean') return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw !== 'string') return null;

  let s = raw.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'n/a' ||
    lower === 'na' ||
    lower === 'nan' ||
    lower === '-' ||
    lower === '—' ||
    lower === '--'
  ) {
    return null;
  }

  // Detect accounting negative in parentheses: "(300)", "($1,200.50)", "(Rs 500)"
  let isNegative = false;
  if (/^\(.*\)$/.test(s)) {
    isNegative = true;
    s = s.slice(1, -1).trim();
  }

  // Strip currency codes/symbols and units (Rs., Rs, PKR, INR, USD, EUR, GBP, AED, SAR, $, €, £, ¥, ₹, ₨, %)
  s = s
    .replace(/\b(rs\.?|pkr|inr|usd|eur|gbp|aed|sar|cad|aud)\b/gi, '')
    .replace(/[$€£¥₹₨%]/g, '')
    .trim();

  if (s.startsWith('-')) {
    isNegative = !isNegative;
    s = s.slice(1).trim();
  } else if (s.startsWith('+')) {
    s = s.slice(1).trim();
  }

  // Remove internal spaces
  s = s.replace(/\s+/g, '');
  if (!s) return null;

  // Handle European formatting like "2.500,50" vs US/South-Asian "1,200.50" or "1,23,456"
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot && /\.\d{3}/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastComma !== -1 && lastDot === -1 && /,\d{1,2}$/.test(s) && !/,\d{3}$/.test(s)) {
    s = s.replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }

  if (!s || !/^\d+(\.\d+)?(e[+-]?\d+)?$/i.test(s)) {
    return null;
  }

  const parsed = Number(s);
  if (!Number.isFinite(parsed)) return null;
  const signed = isNegative ? -parsed : parsed;
  return Object.is(signed, -0) ? 0 : signed;
}

export function numVal(raw: unknown): number {
  const parsed = parseRealNumber(raw);
  return parsed !== null ? parsed : 0;
}

/**
 * Returns true if at least one row has a valid non-null numeric value for the mapped role.
 */
export function hasValidRoleNumber(
  rows: Record<string, any>[],
  roleMap: Record<string, string>,
  role: string
): boolean {
  const col = roleMap[role];
  if (!col || !rows.length) return false;
  for (let i = 0; i < rows.length; i++) {
    if (parseRealNumber(rows[i]?.[col]) !== null) return true;
  }
  return false;
}

export function sumRole(
  rows: Record<string, any>[],
  roleMap: Record<string, string>,
  role: string
): number {
  const col = roleMap[role];
  if (!col || !rows.length) return 0;
  let total = 0;
  for (let i = 0; i < rows.length; i++) {
    const v = parseRealNumber(rows[i]?.[col]);
    if (v !== null) total += v;
  }
  return Number(total.toFixed(2));
}

export function sumRoleNonNegative(
  rows: Record<string, any>[],
  roleMap: Record<string, string>,
  role: string
): number | null {
  const col = roleMap[role];
  if (!col || !rows.length) return null;
  let total = 0;
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    const v = parseRealNumber(rows[i]?.[col]);
    if (v !== null && v >= 0) {
      total += v;
      count++;
    }
  }
  return count > 0 ? Number(total.toFixed(2)) : null;
}

export function avgRole(
  rows: Record<string, any>[],
  roleMap: Record<string, string>,
  role: string
): number {
  const col = roleMap[role];
  if (!col || !rows.length) return 0;
  let total = 0;
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    const v = parseRealNumber(rows[i]?.[col]);
    if (v !== null) {
      total += v;
      count++;
    }
  }
  return count > 0 ? Number((total / count).toFixed(2)) : 0;
}

export interface NumericBoundOptions {
  min?: number;
  max?: number;
  allowNegative?: boolean;
  maxPct?: number;
}

/**
 * Averages a percentage role while handling unit normalization:
 * - Ignores null/NaN cells
 * - Filters out negative values unless allowNegative or min < 0
 * - If values are provided as decimal ratios in (0, 1] (e.g. 0.85 instead of 85%),
 *   automatically scales to 0..100%.
 * - Returns null if no valid values exist.
 */
export function avgPctRole(
  rows: Record<string, any>[],
  roleMap: Record<string, string>,
  role: string,
  options?: NumericBoundOptions
): number | null {
  const col = roleMap[role];
  if (!col || !rows.length) return null;
  const minVal = options?.min !== undefined ? options.min : options?.allowNegative ? -Infinity : 0;
  const maxPct = options?.max ?? options?.maxPct ?? 100;

  const vals: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const rawStr = rows[i]?.[col];
    const v = parseRealNumber(rawStr);
    if (v === null) continue;
    if (v < minVal) continue;
    vals.push(v);
  }
  if (vals.length === 0) return null;

  const anyExplicitPct = rows.some(
    (r) => typeof r?.[col] === 'string' && String(r[col]).includes('%')
  );
  const maxAbs = Math.max(...vals.map((v) => Math.abs(v)));
  const scale = !anyExplicitPct && maxAbs > 0 && maxAbs <= 1.0 ? 100 : 1;

  const scaled = vals
    .map((v) => v * scale)
    .filter((v) => (maxPct !== undefined ? v <= maxPct * 1.5 : true));
  if (scaled.length === 0) return null;

  const avg = scaled.reduce((a, b) => a + b, 0) / scaled.length;
  return Number(avg.toFixed(2));
}

export function countDistinctRole(
  rows: Record<string, any>[],
  roleMap: Record<string, string>,
  role: string
): number {
  const col = roleMap[role];
  if (!col || !rows.length) return 0;
  const set = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const v = rows[i]?.[col];
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      set.add(String(v).trim());
    }
  }
  return set.size;
}

export function safePct(
  num: number | null,
  den: number | null,
  options?: NumericBoundOptions
): number | null {
  if (num === null || den === null || !Number.isFinite(num) || !Number.isFinite(den)) {
    return null;
  }
  if (Math.abs(den) < 1e-9) return null;
  if (options?.allowNegative === false && (num < 0 || den < 0)) return null;
  const pct = (num / den) * 100;
  const minVal = options?.min;
  const maxVal = options?.max ?? options?.maxPct;
  if (minVal !== undefined && pct < minVal) return null;
  if (maxVal !== undefined && pct > maxVal) return null;
  return Number(pct.toFixed(2));
}

export function safeDivVal(
  num: number | null,
  den: number | null,
  options?: NumericBoundOptions
): number | null {
  if (num === null || den === null || !Number.isFinite(num) || !Number.isFinite(den)) {
    return null;
  }
  if (Math.abs(den) < 1e-9) return null;
  if ((options?.allowNegative ?? false) === false && (num < 0 || den < 0)) return null;
  const val = num / den;
  if (options?.min !== undefined && val < options.min) return null;
  if (options?.max !== undefined && val > options.max) return null;
  return Number(val.toFixed(2));
}

/**
 * Detects and normalizes mixed date formats (ISO YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, and Excel serial dates)
 * into ISO YYYY-MM-DD strings, flagging ambiguous or mixed formats with a human-readable warning.
 */
export function parseAndNormalizeDates(rawValues: unknown[]): DateNormalizationResult {
  let hasIso = false;
  let hasExcelSerial = false;
  let hasDefiniteDMY = false; // first part > 12
  let hasDefiniteMDY = false; // second part > 12
  let hasSlashOrDashAmbiguous = false; // both parts <= 12 and part1 !== part2

  interface ParsedToken {
    kind: 'null' | 'iso' | 'excel' | 'slash' | 'unknown';
    iso?: string;
    p1?: number;
    p2?: number;
    year?: number;
  }

  const tokens: ParsedToken[] = rawValues.map((raw) => {
    if (raw === null || raw === undefined || raw === '') return { kind: 'null' };

    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 20000 && raw <= 65000) {
      hasExcelSerial = true;
      const utcMs = Math.round((raw - 25569) * 86400 * 1000);
      const iso = new Date(utcMs).toISOString().slice(0, 10);
      return { kind: 'excel', iso };
    }

    const str = String(raw).trim();
    if (!str) return { kind: 'null' };

    if (/^\d{5}(\.\d+)?$/.test(str)) {
      const serial = Number(str);
      if (serial >= 20000 && serial <= 65000) {
        hasExcelSerial = true;
        const utcMs = Math.round((serial - 25569) * 86400 * 1000);
        const iso = new Date(utcMs).toISOString().slice(0, 10);
        return { kind: 'excel', iso };
      }
    }

    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const y = Number(isoMatch[1]);
      const m = Number(isoMatch[2]);
      const d = Number(isoMatch[3]);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        hasIso = true;
        return {
          kind: 'iso',
          iso: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        };
      }
    }

    const slashMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (slashMatch) {
      const p1 = Number(slashMatch[1]);
      const p2 = Number(slashMatch[2]);
      let year = Number(slashMatch[3]);
      if (year < 100) year += year >= 70 ? 1900 : 2000;

      if (p1 > 12 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
        hasDefiniteDMY = true;
      } else if (p2 > 12 && p2 <= 31 && p1 >= 1 && p1 <= 12) {
        hasDefiniteMDY = true;
      } else if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 12 && p1 !== p2) {
        hasSlashOrDashAmbiguous = true;
      }
      return { kind: 'slash', p1, p2, year };
    }

    const parsedTs = Date.parse(str);
    if (!Number.isNaN(parsedTs)) {
      hasIso = true;
      return { kind: 'iso', iso: new Date(parsedTs).toISOString().slice(0, 10) };
    }

    return { kind: 'unknown' };
  });

  const detectedFormats: ('ISO' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'EXCEL_SERIAL' | 'OTHER')[] = [];
  if (hasIso) detectedFormats.push('ISO');
  if (hasDefiniteDMY) detectedFormats.push('DD/MM/YYYY');
  if (hasDefiniteMDY) detectedFormats.push('MM/DD/YYYY');
  if (hasExcelSerial) detectedFormats.push('EXCEL_SERIAL');

  const hasMixedFormats = (hasDefiniteDMY && hasDefiniteMDY) || detectedFormats.length > 1;
  const hasAmbiguousSlashDates = !hasDefiniteDMY && !hasDefiniteMDY && hasSlashOrDashAmbiguous;
  const preferDMY = hasDefiniteDMY && !hasDefiniteMDY;

  const normalizedValues = tokens.map((t) => {
    if (t.kind === 'null' || t.kind === 'unknown') return null;
    if (t.kind === 'iso' || t.kind === 'excel') return t.iso || null;
    const p1 = t.p1!;
    const p2 = t.p2!;
    const y = t.year!;
    let month: number;
    let day: number;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      month = p1;
      day = p2;
    } else if (preferDMY) {
      day = p1;
      month = p2;
    } else {
      month = p1;
      day = p2;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${String(y).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });

  let warning: string | null = null;
  if (hasDefiniteDMY && hasDefiniteMDY) {
    warning =
      'Mixed DD/MM/YYYY and MM/DD/YYYY date formats detected in the same column; dates were normalized to ISO YYYY-MM-DD.';
  } else if (hasMixedFormats) {
    warning =
      'Mixed date representations (ISO / slash / Excel serial) detected; dates were normalized to ISO YYYY-MM-DD.';
  } else if (hasAmbiguousSlashDates) {
    warning =
      'Ambiguous slash dates (DD/MM/YYYY vs MM/DD/YYYY with all day/month values <= 12); defaulted to MM/DD/YYYY.';
  }

  return {
    normalizedValues,
    normalizedDates: normalizedValues,
    detectedFormats,
    hasMixedFormats,
    hasAmbiguousSlashDates,
    isAmbiguous: hasMixedFormats || hasAmbiguousSlashDates,
    warning,
    warningMessage: warning || undefined,
  };
}
