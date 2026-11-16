export interface WhatIfDriverInput {
  id: string;
  label: string;
  deltaPct: number; // e.g., +10 means +10% change in driver
  elasticity?: number; // default 1.0 (1% change in driver -> elasticity% change in KPI)
}

export interface WhatIfDriverImpact {
  id: string;
  label: string;
  deltaPct: number;
  elasticity: number;
  kpiEffectPct: number;
  kpiDeltaValue: number;
}

export interface WhatIfSimulationResult {
  baselineValue: number;
  projectedValue: number;
  netDeltaValue: number;
  netDeltaPct: number;
  driverImpacts: WhatIfDriverImpact[];
  summary: string;
}

/**
 * Evaluates a slider-driven What-If scenario on a baseline KPI given one or more drivers.
 */
export function simulateWhatIf(
  baselineValue: number,
  drivers: WhatIfDriverInput[]
): WhatIfSimulationResult {
  const base = Number.isFinite(baselineValue) ? baselineValue : 0;

  let totalPctShift = 0;
  const driverImpacts: WhatIfDriverImpact[] = (drivers || []).map((d) => {
    const elasticity = d.elasticity !== undefined ? d.elasticity : 1;
    const kpiEffectPct = (d.deltaPct || 0) * elasticity;
    totalPctShift += kpiEffectPct;
    const kpiDeltaValue = base * (kpiEffectPct / 100);

    return {
      id: d.id,
      label: d.label,
      deltaPct: Number((d.deltaPct || 0).toFixed(2)),
      elasticity: Number(elasticity.toFixed(2)),
      kpiEffectPct: Number(kpiEffectPct.toFixed(2)),
      kpiDeltaValue: Number(kpiDeltaValue.toFixed(2)),
    };
  });

  const projectedValue = base * (1 + totalPctShift / 100);
  const netDeltaValue = projectedValue - base;

  return {
    baselineValue: Number(base.toFixed(2)),
    projectedValue: Number(projectedValue.toFixed(2)),
    netDeltaValue: Number(netDeltaValue.toFixed(2)),
    netDeltaPct: Number(totalPctShift.toFixed(2)),
    driverImpacts,
    summary: `A ${totalPctShift >= 0 ? '+' : ''}${totalPctShift.toFixed(
      1
    )}% composite shift moves the target KPI from ${base.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })} to ${projectedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`,
  };
}
