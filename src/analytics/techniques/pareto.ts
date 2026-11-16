export interface ParetoItemInput {
  name: string;
  value: number;
}

export interface ParetoRankedItem {
  rank: number;
  name: string;
  value: number;
  sharePct: number;
  cumulativeValue: number;
  cumulativeSharePct: number;
  isVitalFew: boolean; // true if part of the group driving the first ~80% of value
}

export interface ParetoAnalysisResult {
  totalValue: number;
  items: ParetoRankedItem[];
  vitalFewCount: number;
  vitalFewItemRatioPct: number;
  vitalFewValueSharePct: number;
  summary: string;
}

/**
 * Performs 80/20 Pareto concentration analysis across categories.
 */
export function computePareto(
  items: ParetoItemInput[],
  thresholdPct = 80
): ParetoAnalysisResult {
  const valid = (items || [])
    .filter((it) => typeof it.value === 'number' && Number.isFinite(it.value) && it.value > 0)
    .sort((a, b) => b.value - a.value);

  if (valid.length === 0) {
    return {
      totalValue: 0,
      items: [],
      vitalFewCount: 0,
      vitalFewItemRatioPct: 0,
      vitalFewValueSharePct: 0,
      summary: 'No positive category values available for Pareto 80/20 analysis.',
    };
  }

  const totalValue = valid.reduce((sum, it) => sum + it.value, 0);
  let cumVal = 0;
  let vitalFewCount = 0;
  let vitalFewValue = 0;
  let crossedThreshold = false;

  const ranked: ParetoRankedItem[] = valid.map((it, idx) => {
    const sharePct = (it.value / totalValue) * 100;
    cumVal += it.value;
    const cumulativeSharePct = (cumVal / totalValue) * 100;

    // Include items up to and including the first item that crosses the 80% threshold
    const isVitalFew = !crossedThreshold;
    if (isVitalFew) {
      vitalFewCount++;
      vitalFewValue += it.value;
    }
    if (cumulativeSharePct >= thresholdPct) {
      crossedThreshold = true;
    }

    return {
      rank: idx + 1,
      name: it.name,
      value: Number(it.value.toFixed(2)),
      sharePct: Number(sharePct.toFixed(2)),
      cumulativeValue: Number(cumVal.toFixed(2)),
      cumulativeSharePct: Number(cumulativeSharePct.toFixed(2)),
      isVitalFew,
    };
  });

  const vitalFewItemRatioPct = Number(
    ((vitalFewCount / ranked.length) * 100).toFixed(1)
  );
  const vitalFewValueSharePct = Number(
    ((vitalFewValue / totalValue) * 100).toFixed(1)
  );

  return {
    totalValue: Number(totalValue.toFixed(2)),
    items: ranked,
    vitalFewCount,
    vitalFewItemRatioPct,
    vitalFewValueSharePct,
    summary: `Top ${vitalFewCount} of ${ranked.length} categories (${vitalFewItemRatioPct}%) account for ${vitalFewValueSharePct}% of total volume.`,
  };
}
