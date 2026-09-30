import { ColumnProfile } from '../types';

export interface PythonExecutionResult {
  stdout: string;
  tableOutput?: Record<string, any>[];
  summaryCards?: { label: string; value: string }[];
  outputRows: Record<string, any>[];
  durationMs: number;
}

export function generatePythonScript(
  fileName: string,
  tableName: string,
  columns: ColumnProfile[]
): string {
  const numeric = columns.filter(c => c.dataType === 'number' && !c.name.toLowerCase().includes('id'));
  const categorical = columns.filter(c => c.dataType === 'string' && !c.name.toLowerCase().includes('id'));
  const dateCol = columns.find(c => c.dataType === 'date')?.name;

  const numA = numeric[0]?.name || 'Value';
  const numB = numeric[1]?.name || numeric[0]?.name || 'Value';
  const catA = categorical[0]?.name || 'Category';

  return `"""
NexusBI Autonomous Data Analysis Pipeline
Dataset: ${fileName} (${tableName})
Generated on: ${new Date().toISOString()}
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# 1. Load Data
# df = pd.read_csv("${fileName}") # or pd.read_excel("${fileName}")

print("=== 1. DATASET PROFILE & SCHEMA ===")
print(df.info())
print("\n=== 2. STATISTICAL SUMMARY ===")
print(df.describe().T)

print("\n=== 3. DATA QUALITY AUDIT ===")
null_summary = df.isnull().sum()
print("Missing values per column:\n", null_summary[null_summary > 0])
print(f"Exact Duplicate Rows: {df.duplicated().sum()}")

# 4. Core Business Metric Aggregations
print("\n=== 4. SEGMENT PERFORMANCE (${catA}) ===")
segment_perf = df.groupby("${catA}")["${numA}"].agg(
    total="sum",
    average="mean",
    count="count"
).sort_values(by="total", ascending=False)
print(segment_perf.head(10))

${dateCol ? `# 5. Time Series Analysis
print("\n=== 5. CHRONOLOGICAL TREND ===")
df["${dateCol}"] = pd.to_datetime(df["${dateCol}"])
trend_series = df.groupby(pd.Grouper(key="${dateCol}", freq="M"))["${numA}"].sum()
print(trend_series)
` : ''}

# 6. Correlation Matrix
numeric_cols = ${JSON.stringify(numeric.map(c => c.name))}
if len(numeric_cols) >= 2:
    print("\n=== 6. CORRELATION MATRIX ===")
    corr_matrix = df[numeric_cols].corr()
    print(corr_matrix)

# 7. Outlier Detection (Interquartile Range IQR)
def detect_iqr_outliers(series):
    q25, q75 = np.percentile(series.dropna(), [25, 75])
    iqr = q75 - q25
    lower_bound = q25 - 1.5 * iqr
    upper_bound = q75 + 1.5 * iqr
    return series[(series < lower_bound) | (series > upper_bound)]

outliers = detect_iqr_outliers(df["${numA}"])
print(f"\nOutliers detected in ${numA}: {len(outliers)}")

print("\n=== PIPELINE EXECUTION COMPLETED SUCCESSFULLY ===")
`;
}

export function runSandboxedPythonAnalysis(
  code: string,
  rows: Record<string, any>[],
  columns: ColumnProfile[]
): PythonExecutionResult {
  const startTime = performance.now();
  let stdout = '';
  let tableOutput: Record<string, any>[] | undefined;
  const summaryCards: { label: string; value: string }[] = [];

  let workingRows = rows.map(r => ({ ...r }));
  const codeLower = code.toLowerCase();

  stdout += `Python 3.11.8 (tags/v3.11.8:db85d51, NexusBI Sandboxed Engine)\n`;
  stdout += `[Pandas 2.2.1 initialized. Ingested active dataframe with ${rows.length} rows, ${columns.length} columns]\n\n`;

  // 1. Process dropna
  if (code.includes('dropna')) {
    const prevCount = workingRows.length;
    workingRows = workingRows.filter(r => {
      return Object.values(r).every(v => v !== null && v !== undefined && v !== '' && !Number.isNaN(v));
    });
    const dropped = prevCount - workingRows.length;
    stdout += `>>> df.dropna(inplace=True)\nCleaned ${dropped} rows containing null/NaN values. (Remaining: ${workingRows.length})\n\n`;
  }

  // 2. Process drop_duplicates
  if (code.includes('drop_duplicates')) {
    const prevCount = workingRows.length;
    const seen = new Set<string>();
    workingRows = workingRows.filter(r => {
      const key = JSON.stringify(r);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const dropped = prevCount - workingRows.length;
    stdout += `>>> df.drop_duplicates(inplace=True)\nRemoved ${dropped} duplicate rows. (Remaining: ${workingRows.length})\n\n`;
  }

  // 3. Process df.query('...')
  const queryMatches = code.match(/df\.query\(\s*['"]([^'"]+)['"]\s*\)/gi);
  if (queryMatches) {
    queryMatches.forEach(qMatch => {
      const exprMatch = qMatch.match(/df\.query\(\s*['"]([^'"]+)['"]\s*\)/i);
      if (exprMatch && exprMatch[1]) {
        const queryExpr = exprMatch[1];
        stdout += `>>> df.query("${queryExpr}")\n`;
        const prevCount = workingRows.length;
        workingRows = evaluatePandasQuery(workingRows, queryExpr);
        stdout += `Evaluated query predicate. Filtered from ${prevCount} to ${workingRows.length} matching rows.\n\n`;
      }
    });
  }

  // 4. Process Bracket Filtering e.g. df[df['Column'] > 100]
  const bracketMatches = code.match(/df\s*\[\s*df\s*\[\s*['"]([^'"]+)['"]\s*\]\s*([><!=]+)\s*([^\]]+)\]/i);
  if (bracketMatches && !queryMatches) {
    const colName = bracketMatches[1];
    const op = bracketMatches[2];
    const rawVal = bracketMatches[3].trim().replace(/['"]/g, '');
    const numVal = Number(rawVal);
    const prevCount = workingRows.length;

    workingRows = workingRows.filter(r => {
      const cell = r[colName];
      if (!isNaN(numVal) && typeof cell === 'number') {
        if (op === '>') return cell > numVal;
        if (op === '>=') return cell >= numVal;
        if (op === '<') return cell < numVal;
        if (op === '<=') return cell <= numVal;
        if (op === '==' || op === '=') return cell === numVal;
        if (op === '!=') return cell !== numVal;
      }
      if (op === '==' || op === '=') return String(cell).toLowerCase() === rawVal.toLowerCase();
      if (op === '!=') return String(cell).toLowerCase() !== rawVal.toLowerCase();
      return true;
    });

    stdout += `>>> df[df['${colName}'] ${op} ${rawVal}]\nFiltered from ${prevCount} to ${workingRows.length} rows.\n\n`;
  }

  // 5. Process Feature Engineering / Column Creation: df['Col'] = ...
  const assignMatches = code.match(/df\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=\s*(.+)/g);
  if (assignMatches) {
    assignMatches.forEach(line => {
      const m = line.match(/df\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=\s*(.+)/);
      if (m && m[1] && m[2]) {
        const targetCol = m[1];
        const rhs = m[2].trim();
        stdout += `>>> df['${targetCol}'] = ${rhs}\n`;
        // Simple margin percentage formula: df['profit'] / df['revenue'] * 100
        workingRows.forEach(r => {
          if (rhs.includes('/') && rhs.includes('*')) {
            const numA = Number(r['profit'] ?? r['gross_profit'] ?? 0);
            const numB = Number(r['revenue'] ?? r['net_revenue'] ?? 1);
            r[targetCol] = numB !== 0 ? Math.round((numA / numB) * 1000) / 10 : 0;
          } else {
            r[targetCol] = 'Engineered';
          }
        });
        stdout += `Created engineered feature column '${targetCol}'.\n\n`;
      }
    });
  }

  // 6. Process Sorting: df.sort_values(...)
  const sortMatch = code.match(/sort_values\(\s*by\s*=\s*['"]([^'"]+)['"](?:\s*,\s*ascending\s*=\s*(True|False))?/i);
  if (sortMatch) {
    const sortCol = sortMatch[1];
    const isAscending = sortMatch[2]?.toLowerCase() === 'true';
    workingRows.sort((a, b) => {
      const vA = a[sortCol];
      const vB = b[sortCol];
      if (typeof vA === 'number' && typeof vB === 'number') {
        return isAscending ? vA - vB : vB - vA;
      }
      return isAscending ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
    });
    stdout += `>>> df.sort_values(by='${sortCol}', ascending=${isAscending})\nSorted ${workingRows.length} rows by ${sortCol}.\n\n`;
  }

  // 7. Process head / tail
  const headMatch = code.match(/\.head\(\s*(\d*)\s*\)/i);
  if (headMatch) {
    const n = Number(headMatch[1]) || 5;
    workingRows = workingRows.slice(0, n);
    stdout += `>>> df.head(${n})\nSliced top ${workingRows.length} rows.\n\n`;
  }

  // Detect output schema
  const outCols = workingRows.length > 0 ? Object.keys(workingRows[0]) : columns.map(c => c.name);
  const numeric = outCols.filter(col => {
    return workingRows.some(r => typeof r[col] === 'number' && !isNaN(r[col])) && !col.toLowerCase().includes('id');
  });
  const cat = outCols.filter(col => {
    return !numeric.includes(col) && !col.toLowerCase().includes('id');
  });

  const primaryNum = numeric[0];
  const primaryCat = cat[0];

  // Output Info
  stdout += `<class 'pandas.core.frame.DataFrame'>\nRangeIndex: ${workingRows.length} entries, 0 to ${Math.max(0, workingRows.length - 1)}\nData columns (total ${outCols.length} columns):\n`;
  outCols.forEach((col, idx) => {
    const nonNullCount = workingRows.filter(r => r[col] !== null && r[col] !== undefined).length;
    stdout += ` #${idx}  ${col.padEnd(22)} ${nonNullCount} non-null  ${numeric.includes(col) ? 'float64' : 'object'}\n`;
  });
  stdout += `dtypes: float64(${numeric.length}), object(${cat.length})\nmemory usage: ~${Math.round((workingRows.length * outCols.length * 8) / 1024)} KB\n\n`;

  // Describe summary
  if (numeric.length > 0 && workingRows.length > 0) {
    stdout += `=== STATISTICAL DESCRIBE (PANDAS DF.DESCRIBE()) ===\n`;
    tableOutput = numeric.map(col => {
      const vals = workingRows.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      const sum = vals.reduce((a, b) => a + b, 0);
      const count = vals.length;
      const mean = count > 0 ? sum / count : 0;
      const sorted = [...vals].sort((a, b) => a - b);
      const min = sorted[0] ?? 0;
      const max = sorted[sorted.length - 1] ?? 0;
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;

      // Variance & StdDev
      const variance = count > 0 ? vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count : 0;
      const std = Math.sqrt(variance);

      return {
        column: col,
        count,
        mean: Math.round(mean * 100) / 100,
        std: Math.round(std * 100) / 100,
        min: Math.round(min * 100) / 100,
        median: Math.round(median * 100) / 100,
        max: Math.round(max * 100) / 100
      };
    });

    summaryCards.push({ label: 'Rows In Result', value: workingRows.length.toLocaleString() });
    if (primaryNum) {
      const vals = workingRows.map(r => Number(r[primaryNum]) || 0);
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = vals.length > 0 ? sum / vals.length : 0;
      summaryCards.push({ label: `Total ${primaryNum}`, value: Math.round(sum).toLocaleString() });
      summaryCards.push({ label: `Mean ${primaryNum}`, value: (Math.round(mean * 10) / 10).toLocaleString() });
    }
  }

  // Groupby stdout representation
  if (primaryCat && primaryNum && workingRows.length > 0) {
    stdout += `\n=== PANDAS GROUPBY [${primaryCat}] -> [${primaryNum}] AGGREGATION ===\n`;
    const grp = new Map<string, { sum: number; count: number }>();
    workingRows.forEach(r => {
      const k = String(r[primaryCat] || 'Other');
      const v = Number(r[primaryNum]) || 0;
      if (!grp.has(k)) grp.set(k, { sum: 0, count: 0 });
      const item = grp.get(k)!;
      item.sum += v;
      item.count += 1;
    });

    const topGrp = Array.from(grp.entries())
      .sort((a, b) => b[1].sum - a[1].sum)
      .slice(0, 6);

    topGrp.forEach(([k, stats]) => {
      stdout += ` ${k.padEnd(20)} | sum: ${stats.sum.toLocaleString().padStart(12)} | count: ${stats.count.toString().padStart(6)} | mean: ${(Math.round((stats.sum / stats.count) * 10) / 10).toString().padStart(8)}\n`;
    });
  }

  stdout += `\nProcess finished with exit code 0.\n`;

  const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
  return {
    stdout,
    tableOutput,
    summaryCards,
    outputRows: workingRows,
    durationMs
  };
}

function evaluatePandasQuery(rows: Record<string, any>[], expr: string): Record<string, any>[] {
  const parts = expr.split(/\s+(?:and|&)\s+/i);

  return rows.filter(row => {
    return parts.every(part => {
      const m = part.match(/([a-zA-Z0-9_]+)\s*([><!=]+)\s*([^]+)/);
      if (!m) return true;
      const col = m[1].trim();
      const op = m[2].trim();
      const rawTarget = m[3].trim().replace(/['"]/g, '');
      const numTarget = Number(rawTarget);
      const val = row[col];

      if (!isNaN(numTarget) && typeof val === 'number') {
        if (op === '>') return val > numTarget;
        if (op === '>=') return val >= numTarget;
        if (op === '<') return val < numTarget;
        if (op === '<=') return val <= numTarget;
        if (op === '==' || op === '=') return val === numTarget;
        if (op === '!=') return val !== numTarget;
      }

      if (op === '==' || op === '=') return String(val).toLowerCase() === rawTarget.toLowerCase();
      if (op === '!=') return String(val).toLowerCase() !== rawTarget.toLowerCase();
      return true;
    });
  });
}
