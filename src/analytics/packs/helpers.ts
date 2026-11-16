export function numVal(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const cleaned = raw.trim().replace(/[$,%\s,]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function sumRole(
  rows: Record<string, any>[],
  roleMap: Record<string, string>,
  role: string
): number {
  const col = roleMap[role];
  if (!col || !rows.length) return 0;
  let total = 0;
  for (const r of rows) {
    total += numVal(r[col]);
  }
  return Number(total.toFixed(2));
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
  for (const r of rows) {
    if (r[col] !== null && r[col] !== undefined && r[col] !== '') {
      total += numVal(r[col]);
      count++;
    }
  }
  return count > 0 ? Number((total / count).toFixed(2)) : 0;
}

export function countDistinctRole(
  rows: Record<string, any>[],
  roleMap: Record<string, string>,
  role: string
): number {
  const col = roleMap[role];
  if (!col || !rows.length) return rows.length;
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[col];
    if (v !== null && v !== undefined && v !== '') {
      set.add(String(v));
    }
  }
  return set.size;
}

export function safePct(num: number, den: number): number | null {
  if (!Number.isFinite(den) || Math.abs(den) < 1e-9) return null;
  return Number(((num / den) * 100).toFixed(2));
}

export function safeDivVal(num: number, den: number): number | null {
  if (!Number.isFinite(den) || Math.abs(den) < 1e-9) return null;
  return Number((num / den).toFixed(2));
}
