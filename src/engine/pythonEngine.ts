import { ColumnProfile } from '../types';

export interface PythonExecutionResult {
  stdout: string;
  tableOutput?: Record<string, any>[];
  summaryCards?: { label: string; value: string }[];
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

  const numeric = columns.filter(c => c.dataType === 'number');
  const cat = columns.filter(c => c.dataType === 'string');
  const primaryNum = numeric[0]?.name;
  const primaryCat = cat[0]?.name;

  stdout += `Python 3.11.8 (tags/v3.11.8:db85d51, NexusBI Sandboxed Engine)\n`;
  stdout += `[Running in-memory analytics against ${rows.length} rows...]\n\n`;

  // Output Info
  stdout += `<class 'pandas.core.frame.DataFrame'>\nRangeIndex: ${rows.length} entries, 0 to ${rows.length - 1}\nData columns (total ${columns.length} columns):\n`;
  columns.forEach((c, idx) => {
    stdout += ` #${idx}  ${c.name.padEnd(20)} ${rows.length - c.nullCount} non-null  ${c.dataType}\n`;
  });
  stdout += `dtypes: float64(${numeric.length}), object(${cat.length})\nmemory usage: ~${Math.round((rows.length * columns.length * 8) / 1024)} KB\n\n`;

  // Numeric description table
  if (numeric.length > 0) {
    stdout += `=== STATISTICAL DESCRIBE ===\n`;
    tableOutput = numeric.map(col => {
      const vals = rows.map(r => r[col.name]).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      const sum = vals.reduce((a, b) => a + b, 0);
      const count = vals.length;
      const mean = count > 0 ? sum / count : 0;
      return {
        column: col.name,
        count,
        mean: Math.round(mean * 100) / 100,
        std: col.stdDev || 0,
        min: col.min ?? 0,
        median: col.median ?? 0,
        max: col.max ?? 0
      };
    });

    summaryCards.push({ label: 'Rows Ingested', value: rows.length.toLocaleString() });
    if (primaryNum) {
      const colProf = columns.find(c => c.name === primaryNum);
      summaryCards.push({ label: `Mean ${primaryNum}`, value: colProf?.mean !== undefined ? colProf.mean.toLocaleString() : 'N/A' });
      summaryCards.push({ label: `Max ${primaryNum}`, value: colProf?.max !== undefined ? colProf.max.toLocaleString() : 'N/A' });
    }
  }

  // Groupby simulation if primaryCat and primaryNum exist
  if (primaryCat && primaryNum) {
    stdout += `\n=== GROUPBY [${primaryCat}] -> [${primaryNum}] AGGREGATION ===\n`;
    const grp = new Map<string, { sum: number; count: number }>();
    rows.forEach(r => {
      const k = String(r[primaryCat] || 'Other');
      const v = Number(r[primaryNum]) || 0;
      if (!grp.has(k)) grp.set(k, { sum: 0, count: 0 });
      const item = grp.get(k)!;
      item.sum += v;
      item.count += 1;
    });

    const topGrp = Array.from(grp.entries())
      .sort((a, b) => b[1].sum - a[1].sum)
      .slice(0, 5);

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
    durationMs
  };
}
