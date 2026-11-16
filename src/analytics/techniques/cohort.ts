export interface CohortRetentionRow {
  cohort: string;
  initialSize: number;
  retentionByPeriod: number[]; // percentages 0..100 for period 0, 1, 2...
  countsByPeriod: number[];
}

export interface CohortAnalysisResult {
  cohorts: CohortRetentionRow[];
  periods: number[];
  averagePeriod1RetentionPct: number;
  bestCohort: string | null;
  summary: string;
}

/**
 * Computes a cohort retention matrix from transactional or longitudinal records.
 * Supports either pre-aggregated rows (with cohort + periodIndex + activeCount/retentionPct)
 * or raw entity activity rows (with cohort + period + customerId).
 */
export function computeCohortRetention(
  rows: Record<string, any>[],
  cohortField: string,
  periodField: string,
  entityOrValueField?: string
): CohortAnalysisResult {
  if (!rows || rows.length === 0) {
    return {
      cohorts: [],
      periods: [],
      averagePeriod1RetentionPct: 0,
      bestCohort: null,
      summary: 'No cohort records available.',
    };
  }

  // Group by cohort -> period
  const cohortPeriodEntities = new Map<string, Map<string, Set<string>>>();
  const cohortPeriodSums = new Map<string, Map<string, number>>();
  const allPeriodsSet = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cohort = String(r[cohortField] ?? '').trim();
    const period = String(r[periodField] ?? '').trim();
    if (!cohort || !period) continue;

    allPeriodsSet.add(period);

    if (!cohortPeriodEntities.has(cohort)) {
      cohortPeriodEntities.set(cohort, new Map());
      cohortPeriodSums.set(cohort, new Map());
    }
    const pEntities = cohortPeriodEntities.get(cohort)!;
    const pSums = cohortPeriodSums.get(cohort)!;

    if (!pEntities.has(period)) {
      pEntities.set(period, new Set());
      pSums.set(period, 0);
    }

    const rawVal = entityOrValueField ? r[entityOrValueField] : i;
    const numVal = typeof rawVal === 'number' && Number.isFinite(rawVal) ? rawVal : null;
    if (numVal !== null) {
      pSums.set(period, (pSums.get(period) || 0) + numVal);
    }
    pEntities.get(period)!.add(String(rawVal ?? i));
  }

  const sortedCohorts = Array.from(cohortPeriodEntities.keys()).sort();
  const sortedPeriods = Array.from(allPeriodsSet).sort();

  const cohortRows: CohortRetentionRow[] = [];
  for (const cohort of sortedCohorts) {
    const pSums = cohortPeriodSums.get(cohort)!;
    const pEntities = cohortPeriodEntities.get(cohort)!;
    const activePeriods = sortedPeriods.filter(
      (p) => (pSums.get(p) || 0) > 0 || (pEntities.get(p)?.size || 0) > 0
    );
    if (activePeriods.length === 0) continue;

    const counts: number[] = activePeriods.map((p) => {
      const sum = pSums.get(p) || 0;
      return sum > 0 ? sum : pEntities.get(p)?.size || 0;
    });

    const initialSize = counts[0] || 1;
    const retentionByPeriod = counts.map((c) =>
      Number(Math.min(100, Math.max(0, (c / initialSize) * 100)).toFixed(1))
    );

    cohortRows.push({
      cohort,
      initialSize,
      retentionByPeriod,
      countsByPeriod: counts,
    });
  }

  const maxPeriodLen = cohortRows.reduce(
    (max, r) => Math.max(max, r.retentionByPeriod.length),
    0
  );
  const periods = Array.from({ length: maxPeriodLen }, (_, i) => i);

  const period1Values = cohortRows
    .filter((c) => c.retentionByPeriod.length > 1)
    .map((c) => c.retentionByPeriod[1]);

  const averagePeriod1RetentionPct =
    period1Values.length > 0
      ? Number(
          (
            period1Values.reduce((sum, v) => sum + v, 0) / period1Values.length
          ).toFixed(1)
        )
      : cohortRows.length > 0
      ? cohortRows[0].retentionByPeriod[0]
      : 0;

  let bestCohort: string | null = null;
  let bestScore = -1;
  for (const c of cohortRows) {
    const lastRet = c.retentionByPeriod[c.retentionByPeriod.length - 1] ?? 0;
    if (lastRet > bestScore) {
      bestScore = lastRet;
      bestCohort = c.cohort;
    }
  }

  return {
    cohorts: cohortRows,
    periods,
    averagePeriod1RetentionPct,
    bestCohort,
    summary: `Analyzed ${cohortRows.length} cohorts across ${periods.length} retention periods. Average Period-1 retention is ${averagePeriod1RetentionPct}%.`,
  };
}
