export interface AbTestResult {
  controlRate: number;
  variantRate: number;
  absoluteLiftPct: number;
  relativeLiftPct: number;
  zScore: number;
  pValue: number;
  isSignificant: boolean;
  confidenceLevelPct: number;
  verdict: string;
}

/**
 * Standard normal cumulative distribution function approximation (Abramowitz & Stegun).
 */
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

/**
 * Two-proportion z-test with two-tailed p-value and plain-language verdict.
 */
export function runAbTest(
  controlConversions: number,
  controlTotal: number,
  variantConversions: number,
  variantTotal: number,
  alpha = 0.05
): AbTestResult {
  if (controlTotal <= 0 || variantTotal <= 0) {
    return {
      controlRate: 0,
      variantRate: 0,
      absoluteLiftPct: 0,
      relativeLiftPct: 0,
      zScore: 0,
      pValue: 1,
      isSignificant: false,
      confidenceLevelPct: 0,
      verdict: 'Insufficient sample size in control or variant group.',
    };
  }

  const p1 = Math.min(1, Math.max(0, controlConversions / controlTotal));
  const p2 = Math.min(1, Math.max(0, variantConversions / variantTotal));
  const pooled =
    (controlConversions + variantConversions) / (controlTotal + variantTotal);
  const se = Math.sqrt(
    pooled * (1 - pooled) * (1 / controlTotal + 1 / variantTotal)
  );

  const zScore = se > 1e-12 ? (p2 - p1) / se : 0;
  const pValue = Math.min(1, Math.max(0, 2 * (1 - normalCdf(Math.abs(zScore)))));
  const isSignificant = pValue < alpha;

  const absoluteLiftPct = (p2 - p1) * 100;
  const relativeLiftPct = p1 > 1e-9 ? ((p2 - p1) / p1) * 100 : 0;
  const confidenceLevelPct = Number(((1 - pValue) * 100).toFixed(2));

  let verdict: string;
  if (!isSignificant) {
    verdict = `No statistically significant difference detected (p = ${pValue.toFixed(
      4
    )} >= ${alpha}). Observed relative change of ${relativeLiftPct.toFixed(
      1
    )}% may be due to random variance.`;
  } else if (p2 > p1) {
    verdict = `Variant wins with statistically significant positive lift of +${relativeLiftPct.toFixed(
      1
    )}% (p = ${pValue.toFixed(4)}, ${confidenceLevelPct}% confidence).`;
  } else {
    verdict = `Variant underperforms control by ${relativeLiftPct.toFixed(
      1
    )}% with statistical significance (p = ${pValue.toFixed(4)}). Retain control.`;
  }

  return {
    controlRate: Number((p1 * 100).toFixed(2)),
    variantRate: Number((p2 * 100).toFixed(2)),
    absoluteLiftPct: Number(absoluteLiftPct.toFixed(2)),
    relativeLiftPct: Number(relativeLiftPct.toFixed(2)),
    zScore: Number(zScore.toFixed(4)),
    pValue: Number(pValue.toFixed(4)),
    isSignificant,
    confidenceLevelPct,
    verdict,
  };
}
