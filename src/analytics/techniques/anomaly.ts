export interface DetectedAnomalyPoint {
  index: number;
  label: string;
  value: number;
  zScore: number;
  isZScoreOutlier: boolean;
  isIqrOutlier: boolean;
  direction: 'high' | 'low';
  severity: 'critical' | 'warning';
}

export interface AnomalyDetectionResult {
  count: number;
  mean: number;
  stdDev: number;
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  anomalies: DetectedAnomalyPoint[];
  summary: string;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/**
 * Detects statistical anomalies using both Z-score (|z| >= zThreshold) and Tukey's 1.5x IQR fence.
 */
export function detectAnomalies(
  values: number[],
  labels?: string[],
  zThreshold = 2.2
): AnomalyDetectionResult {
  const validIndices: number[] = [];
  const clean: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] === 'number' && Number.isFinite(values[i])) {
      validIndices.push(i);
      clean.push(values[i]);
    }
  }

  const n = clean.length;
  if (n < 3) {
    return {
      count: n,
      mean: n > 0 ? clean[0] : 0,
      stdDev: 0,
      q1: 0,
      median: 0,
      q3: 0,
      iqr: 0,
      lowerFence: 0,
      upperFence: 0,
      anomalies: [],
      summary: 'Insufficient observations (< 3) to run statistical anomaly detection.',
    };
  }

  const mean = clean.reduce((sum, v) => sum + v, 0) / n;
  const variance = clean.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const sorted = [...clean].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const anomalies: DetectedAnomalyPoint[] = [];

  for (let idx = 0; idx < n; idx++) {
    const val = clean[idx];
    const origIdx = validIndices[idx];
    const zScore = stdDev > 1e-9 ? (val - mean) / stdDev : 0;
    const isZScoreOutlier = Math.abs(zScore) >= zThreshold;
    const isIqrOutlier = iqr > 1e-9 && (val < lowerFence || val > upperFence);

    if (isZScoreOutlier || isIqrOutlier) {
      anomalies.push({
        index: origIdx,
        label: labels?.[origIdx] || `Row ${origIdx + 1}`,
        value: Number(val.toFixed(2)),
        zScore: Number(zScore.toFixed(2)),
        isZScoreOutlier,
        isIqrOutlier,
        direction: val >= mean ? 'high' : 'low',
        severity: Math.abs(zScore) >= 3.0 ? 'critical' : 'warning',
      });
    }
  }

  return {
    count: n,
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    q1: Number(q1.toFixed(2)),
    median: Number(median.toFixed(2)),
    q3: Number(q3.toFixed(2)),
    iqr: Number(iqr.toFixed(2)),
    lowerFence: Number(lowerFence.toFixed(2)),
    upperFence: Number(upperFence.toFixed(2)),
    anomalies,
    summary:
      anomalies.length === 0
        ? `0 anomalies detected across ${n} records (IQR [${lowerFence.toFixed(
            1
          )}, ${upperFence.toFixed(1)}]).`
        : `${anomalies.length} statistical anomaly(s) detected across ${n} records.`,
  };
}
