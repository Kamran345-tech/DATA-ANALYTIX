export interface FunnelStepInput {
  name: string;
  count: number;
}

export interface FunnelStepMetric {
  stepIndex: number;
  name: string;
  count: number;
  stepConversionPct: number;
  overallConversionPct: number;
  dropOffCount: number;
  dropOffPct: number;
}

export interface FunnelAnalysisResult {
  steps: FunnelStepMetric[];
  overallConversionPct: number;
  biggestDropOffStep: string | null;
  biggestDropOffPct: number;
  summary: string;
}

/**
 * Computes step-by-step conversion and drop-off metrics across a sequential funnel.
 */
export function computeFunnel(steps: FunnelStepInput[]): FunnelAnalysisResult {
  if (!steps || steps.length === 0) {
    return {
      steps: [],
      overallConversionPct: 0,
      biggestDropOffStep: null,
      biggestDropOffPct: 0,
      summary: 'No funnel stages provided.',
    };
  }

  const topCount = Math.max(0, steps[0].count || 0);
  let biggestDropOffStep: string | null = null;
  let biggestDropOffPct = -1;

  const computedSteps: FunnelStepMetric[] = steps.map((step, idx) => {
    const count = Math.max(0, step.count || 0);
    const prevCount = idx === 0 ? count : Math.max(0, steps[idx - 1].count || 0);

    const stepConversionPct =
      idx === 0
        ? 100
        : prevCount > 0
        ? Number(((count / prevCount) * 100).toFixed(2))
        : 0;
    const overallConversionPct =
      topCount > 0 ? Number(((count / topCount) * 100).toFixed(2)) : 0;
    const dropOffCount = idx === 0 ? 0 : Math.max(0, prevCount - count);
    const dropOffPct =
      idx === 0
        ? 0
        : prevCount > 0
        ? Number(((dropOffCount / prevCount) * 100).toFixed(2))
        : 0;

    if (idx > 0 && dropOffPct > biggestDropOffPct) {
      biggestDropOffPct = dropOffPct;
      biggestDropOffStep = `${steps[idx - 1].name} → ${step.name}`;
    }

    return {
      stepIndex: idx,
      name: step.name,
      count,
      stepConversionPct,
      overallConversionPct,
      dropOffCount,
      dropOffPct,
    };
  });

  const lastStep = computedSteps[computedSteps.length - 1];
  const overallConversionPct = lastStep ? lastStep.overallConversionPct : 0;

  return {
    steps: computedSteps,
    overallConversionPct,
    biggestDropOffStep,
    biggestDropOffPct: biggestDropOffPct < 0 ? 0 : biggestDropOffPct,
    summary: biggestDropOffStep
      ? `End-to-end conversion is ${overallConversionPct}%. Primary drop-off occurs at ${biggestDropOffStep} (-${biggestDropOffPct}%).`
      : `End-to-end conversion is ${overallConversionPct}%.`,
  };
}
