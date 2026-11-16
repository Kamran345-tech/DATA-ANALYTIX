export interface FinancialRatiosInput {
  revenue?: number;
  cogs?: number;
  operatingExpense?: number;
  depreciationAmortization?: number;
  interestTax?: number;
  netProfit?: number;
  currentAssets?: number;
  inventory?: number;
  currentLiabilities?: number;
  totalDebt?: number;
  totalEquity?: number;
  totalAssets?: number;
  cashBalance?: number;
  operatingCashFlow?: number;
  capex?: number;
  accountsReceivable?: number;
  accountsPayable?: number;
  fixedCosts?: number;
  periodDays?: number;
}

export interface FinancialRatiosResult {
  grossProfit: number;
  grossMarginPct: number | null;
  operatingIncome: number;
  operatingMarginPct: number | null;
  ebitda: number;
  ebitdaMarginPct: number | null;
  netProfit: number;
  netMarginPct: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  debtToEquity: number | null;
  roePct: number | null;
  roaPct: number | null;
  freeCashFlow: number;
  monthlyBurnRate: number;
  runwayMonths: number | null;
  dsoDays: number | null;
  dpoDays: number | null;
  breakEvenRevenue: number | null;
}

function safeDiv(num: number, den: number | undefined): number | null {
  if (den === undefined || !Number.isFinite(den) || Math.abs(den) < 1e-9) {
    return null;
  }
  return Number((num / den).toFixed(2));
}

/**
 * Computes deterministic corporate financial, liquidity, leverage, and efficiency ratios.
 */
export function computeFinancialRatios(
  input: FinancialRatiosInput
): FinancialRatiosResult {
  const rev = input.revenue ?? 0;
  const cogs = input.cogs ?? 0;
  const opex = input.operatingExpense ?? 0;
  const da = input.depreciationAmortization ?? 0;
  const taxInt = input.interestTax ?? 0;

  const grossProfit = rev - cogs;
  const operatingIncome = grossProfit - opex;
  const ebitda = operatingIncome + da;
  const netProfit =
    input.netProfit !== undefined ? input.netProfit : operatingIncome - taxInt;

  const grossMarginPct = safeDiv(grossProfit * 100, rev);
  const operatingMarginPct = safeDiv(operatingIncome * 100, rev);
  const ebitdaMarginPct = safeDiv(ebitda * 100, rev);
  const netMarginPct = safeDiv(netProfit * 100, rev);

  const currentAssets = input.currentAssets;
  const inventory = input.inventory ?? 0;
  const currentLiabilities = input.currentLiabilities;

  const currentRatio =
    currentAssets !== undefined
      ? safeDiv(currentAssets, currentLiabilities)
      : null;
  const quickRatio =
    currentAssets !== undefined
      ? safeDiv(currentAssets - inventory, currentLiabilities)
      : null;

  const debtToEquity =
    input.totalDebt !== undefined
      ? safeDiv(input.totalDebt, input.totalEquity)
      : null;

  const roePct = safeDiv(netProfit * 100, input.totalEquity);
  const roaPct = safeDiv(netProfit * 100, input.totalAssets);

  const ocf = input.operatingCashFlow ?? ebitda * 0.85;
  const capex = input.capex ?? 0;
  const freeCashFlow = Number((ocf - capex).toFixed(2));

  const monthlyBurnRate =
    netProfit < 0
      ? Number(Math.abs(netProfit).toFixed(2))
      : Number((opex / 12).toFixed(2));
  const runwayMonths =
    input.cashBalance !== undefined && monthlyBurnRate > 1e-9
      ? Number((input.cashBalance / monthlyBurnRate).toFixed(1))
      : null;

  const days = input.periodDays ?? 365;
  const dsoDays =
    input.accountsReceivable !== undefined
      ? safeDiv(input.accountsReceivable * days, rev)
      : null;
  const dpoDays =
    input.accountsPayable !== undefined
      ? safeDiv(input.accountsPayable * days, cogs)
      : null;

  const fixedCosts = input.fixedCosts ?? opex;
  const contributionMarginRatio =
    rev > 1e-9 ? (rev - cogs) / rev : 0;
  const breakEvenRevenue =
    contributionMarginRatio > 1e-9
      ? Number((fixedCosts / contributionMarginRatio).toFixed(2))
      : null;

  return {
    grossProfit: Number(grossProfit.toFixed(2)),
    grossMarginPct,
    operatingIncome: Number(operatingIncome.toFixed(2)),
    operatingMarginPct,
    ebitda: Number(ebitda.toFixed(2)),
    ebitdaMarginPct,
    netProfit: Number(netProfit.toFixed(2)),
    netMarginPct,
    currentRatio,
    quickRatio,
    debtToEquity,
    roePct,
    roaPct,
    freeCashFlow,
    monthlyBurnRate,
    runwayMonths,
    dsoDays,
    dpoDays,
    breakEvenRevenue,
  };
}
