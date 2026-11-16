export interface VarianceRow {
  label: string;
  actual: number;
  budget: number;
  variance: number;
  variancePct: number;
  isFavorable: boolean;
}

export interface VarianceAnalysisResult {
  totalActual: number;
  totalBudget: number;
  totalVariance: number;
  totalVariancePct: number;
  isFavorable: boolean;
  rows: VarianceRow[];
  largestPositiveDriver: VarianceRow | null;
  largestNegativeDriver: VarianceRow | null;
  summary: string;
}

/**
 * Computes Actual vs Budget (or Prior Period) variance analysis.
 */
export function computeVariance(
  actuals: number[],
  budgets: number[],
  labels?: string[],
  goodDirection: 'up' | 'down' = 'up'
): VarianceAnalysisResult {
  const n = Math.min(actuals.length, budgets.length);
  if (n === 0) {
    return {
      totalActual: 0,
      totalBudget: 0,
      totalVariance: 0,
      totalVariancePct: 0,
      isFavorable: true,
      rows: [],
      largestPositiveDriver: null,
      largestNegativeDriver: null,
      summary: 'No actual/budget pairs available for variance calculation.',
    };
  }

  let totalActual = 0;
  let totalBudget = 0;
  const rows: VarianceRow[] = [];

  for (let i = 0; i < n; i++) {
    const actual = Number.isFinite(actuals[i]) ? actuals[i] : 0;
    const budget = Number.isFinite(budgets[i]) ? budgets[i] : 0;
    const variance = actual - budget;
    const variancePct =
      Math.abs(budget) > 1e-9 ? (variance / Math.abs(budget)) * 100 : 0;
    const isFavorable =
      goodDirection === 'up' ? variance >= 0 : variance <= 0;

    totalActual += actual;
    totalBudget += budget;

    rows.push({
      label: labels?.[i] || `Item ${i + 1}`,
      actual: Number(actual.toFixed(2)),
      budget: Number(budget.toFixed(2)),
      variance: Number(variance.toFixed(2)),
      variancePct: Number(variancePct.toFixed(2)),
      isFavorable,
    });
  }

  const totalVariance = totalActual - totalBudget;
  const totalVariancePct =
    Math.abs(totalBudget) > 1e-9
      ? (totalVariance / Math.abs(totalBudget)) * 100
      : 0;
  const isFavorable =
    goodDirection === 'up' ? totalVariance >= 0 : totalVariance <= 0;

  const sortedByVar = [...rows].sort((a, b) => b.variance - a.variance);
  const largestPositiveDriver =
    sortedByVar.length > 0 && sortedByVar[0].variance > 0
      ? sortedByVar[0]
      : null;
  const largestNegativeDriver =
    sortedByVar.length > 0 && sortedByVar[sortedByVar.length - 1].variance < 0
      ? sortedByVar[sortedByVar.length - 1]
      : null;

  return {
    totalActual: Number(totalActual.toFixed(2)),
    totalBudget: Number(totalBudget.toFixed(2)),
    totalVariance: Number(totalVariance.toFixed(2)),
    totalVariancePct: Number(totalVariancePct.toFixed(2)),
    isFavorable,
    rows,
    largestPositiveDriver,
    largestNegativeDriver,
    summary: `Actual ${totalActual.toLocaleString()} vs Budget ${totalBudget.toLocaleString()} (${
      totalVariance >= 0 ? '+' : ''
    }${totalVariancePct.toFixed(1)}%, ${isFavorable ? 'Favorable' : 'Unfavorable'}).`,
  };
}
