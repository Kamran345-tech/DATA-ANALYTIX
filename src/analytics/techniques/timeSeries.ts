export interface TimeSeriesForecastPoint {
  index: number;
  label: string;
  forecast: number;
  lowerBound: number;
  upperBound: number;
}

export interface TimeSeriesAnalysis {
  count: number;
  slope: number;
  intercept: number;
  trendDirection: 'up' | 'down' | 'flat';
  overallChangePct: number;
  momDeltaPct: number;
  yoyDeltaPct: number | null;
  seasonalIndices: number[];
  forecasts: TimeSeriesForecastPoint[];
  confidenceNote: string;
}

/**
 * Analyzes a numeric time series for linear trend, MoM/YoY percentage change,
 * seasonal indices, and generates a simple forecast blending linear regression
 * with a 3-period moving average.
 */
export function analyzeTimeSeries(
  values: number[],
  labels?: string[],
  horizon = 3
): TimeSeriesAnalysis {
  const clean = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  const n = clean.length;

  if (n === 0) {
    return {
      count: 0,
      slope: 0,
      intercept: 0,
      trendDirection: 'flat',
      overallChangePct: 0,
      momDeltaPct: 0,
      yoyDeltaPct: null,
      seasonalIndices: [],
      forecasts: [],
      confidenceNote: 'Insufficient time-series points to generate a forecast.',
    };
  }

  if (n === 1) {
    const v = clean[0];
    return {
      count: 1,
      slope: 0,
      intercept: v,
      trendDirection: 'flat',
      overallChangePct: 0,
      momDeltaPct: 0,
      yoyDeltaPct: null,
      seasonalIndices: [1],
      forecasts: Array.from({ length: horizon }, (_, i) => ({
        index: 1 + i,
        label: `T+${i + 1}`,
        forecast: Number(v.toFixed(2)),
        lowerBound: Number((v * 0.9).toFixed(2)),
        upperBound: Number((v * 1.1).toFixed(2)),
      })),
      confidenceNote: 'Single observation available; flat baseline extrapolation with ±10% band.',
    };
  }

  // Ordinary least squares linear regression y = intercept + slope * x
  const meanX = (n - 1) / 2;
  const meanY = clean.reduce((sum, v) => sum + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    num += dx * (clean[i] - meanY);
    den += dx * dx;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  const first = clean[0];
  const last = clean[n - 1];
  const prev = clean[n - 2];

  const overallChangePct =
    Math.abs(first) > 1e-9 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const momDeltaPct =
    Math.abs(prev) > 1e-9 ? ((last - prev) / Math.abs(prev)) * 100 : 0;
  const yoyDeltaPct =
    n >= 13 && Math.abs(clean[n - 13]) > 1e-9
      ? ((last - clean[n - 13]) / Math.abs(clean[n - 13])) * 100
      : null;

  const trendDirection: 'up' | 'down' | 'flat' =
    Math.abs(slope) < Math.abs(meanY) * 0.005
      ? 'flat'
      : slope > 0
      ? 'up'
      : 'down';

  // Residual standard error for confidence band
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    sse += Math.pow(clean[i] - pred, 2);
  }
  const rmse = Math.sqrt(sse / Math.max(1, n - 2));

  // Moving average (window = min(3, n))
  const windowSize = Math.min(3, n);
  const recentWindow = clean.slice(n - windowSize);
  const movingAvg =
    recentWindow.reduce((sum, v) => sum + v, 0) / recentWindow.length;

  // Seasonal indices relative to overall mean
  const seasonalIndices = clean.map((v) =>
    Math.abs(meanY) > 1e-9 ? Number((v / meanY).toFixed(3)) : 1
  );

  const forecasts: TimeSeriesForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const x = n - 1 + h;
    const linearPred = intercept + slope * x;
    const maPred = movingAvg + slope * h;
    const blended = 0.65 * linearPred + 0.35 * maPred;
    const margin = Math.max(rmse * 1.28 * Math.sqrt(h), Math.abs(blended) * 0.05);
    const baseLabel = labels && labels.length === n ? `${labels[n - 1]} +${h}` : `T+${h}`;
    forecasts.push({
      index: x,
      label: baseLabel,
      forecast: Number(blended.toFixed(2)),
      lowerBound: Number((blended - margin).toFixed(2)),
      upperBound: Number((blended + margin).toFixed(2)),
    });
  }

  const confidenceNote =
    n >= 12
      ? `High sample stability (${n} periods). Blended OLS linear trend + ${windowSize}-period moving average (±80% prediction interval).`
      : `Moderate sample (${n} periods). Blended OLS linear trend + ${windowSize}-period moving average; collect 12+ periods for seasonal calibration.`;

  return {
    count: n,
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(4)),
    trendDirection,
    overallChangePct: Number(overallChangePct.toFixed(2)),
    momDeltaPct: Number(momDeltaPct.toFixed(2)),
    yoyDeltaPct: yoyDeltaPct !== null ? Number(yoyDeltaPct.toFixed(2)) : null,
    seasonalIndices,
    forecasts,
    confidenceNote,
  };
}
