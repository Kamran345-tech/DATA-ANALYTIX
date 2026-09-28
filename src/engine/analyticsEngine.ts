import { ColumnProfile, KPI, Anomaly, Opportunity, Trend, ForecastResult, AIInsight, VisualConfig } from '../types';

export interface DetailedStat {
  column: string;
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  min: number;
  q1: number;
  q3: number;
  max: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  nullCount: number;
  nullPct: number;
}

export interface AnalyticsSummary {
  kpis: KPI[];
  trends: Trend[];
  anomalies: Anomaly[];
  opportunities: Opportunity[];
  forecasts: Record<string, ForecastResult>;
  insights: AIInsight[];
  visuals: VisualConfig[];
  correlationMatrix: { x: string; y: string; correlation: number }[];
  categoryPerformance: Record<string, { category: string; value: number; share: number }[]>;
  businessHealthScore?: { score: number; rating: string; methodology: string };
  descriptiveStats?: DetailedStat[];
}

export function computeAnalytics(
  columns: ColumnProfile[],
  rows: Record<string, any>[],
  tableName: string = 'FactTable'
): AnalyticsSummary {
  if (!rows || rows.length === 0 || !columns || columns.length === 0) {
    return {
      kpis: [],
      trends: [],
      anomalies: [],
      opportunities: [],
      forecasts: {},
      insights: [],
      visuals: [],
      correlationMatrix: [],
      categoryPerformance: {},
      descriptiveStats: []
    };
  }

  const numericCols = columns.filter(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id') && !c.name.toLowerCase().includes('zip'));
  const dateCols = columns.filter(c => c.dataType === 'date');
  const stringCols = columns.filter(c => c.dataType === 'string' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id'));

  // Detect primary date column or fallback to string column with date/time semantics
  let primaryDateCol = dateCols[0]?.name;
  if (!primaryDateCol) {
    const candidate = columns.find(c => /date|time|year|month|quarter|period|day|week|dt|timestamp/i.test(c.name));
    if (candidate) {
      primaryDateCol = candidate.name;
    }
  }

  // 1. KPI Calculation
  const kpis: KPI[] = [];

  // Identify key business metrics
  const targetCol = numericCols.find(c => /target|budget|quota/i.test(c.name))?.name;

  numericCols.slice(0, 6).forEach((col, idx) => {
    const validValues = rows.map(r => r[col.name]).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
    if (validValues.length === 0) return;

    const sumVal = validValues.reduce((a, b) => a + b, 0);
    const avgVal = sumVal / validValues.length;

    // Is it a rate/percentage or total amount?
    const isRateOrAverage = /margin|rate|percentage|pct|ratio|score|avg/i.test(col.name) || (col.mean !== undefined && col.mean <= 1 && (col.max as number) <= 1);
    const mainVal = isRateOrAverage ? avgVal : sumVal;

    let prevVal: number | undefined;
    let change: number | undefined;
    let changePct: number | undefined;

    // If date exists, split dataset into two equal chronologically ordered halves
    if (primaryDateCol && rows.length >= 4) {
      const sortedRows = [...rows].sort((a, b) => String(a[primaryDateCol]).localeCompare(String(b[primaryDateCol])));
      const half = Math.floor(sortedRows.length / 2);
      const priorRows = sortedRows.slice(0, half);
      const currentRows = sortedRows.slice(half);

      const curNums = currentRows.map(r => r[col.name]).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      const priNums = priorRows.map(r => r[col.name]).filter(v => typeof v === 'number' && !isNaN(v)) as number[];

      if (curNums.length > 0 && priNums.length > 0) {
        const curCalc = isRateOrAverage ? (curNums.reduce((a, b) => a + b, 0) / curNums.length) : curNums.reduce((a, b) => a + b, 0);
        const priCalc = isRateOrAverage ? (priNums.reduce((a, b) => a + b, 0) / priNums.length) : priNums.reduce((a, b) => a + b, 0);

        prevVal = priCalc;
        change = curCalc - priCalc;
        changePct = priCalc !== 0 ? (change / Math.abs(priCalc)) * 100 : undefined;
      }
    }

    // Determine status
    let status: KPI['status'] = 'On Track';
    if (changePct !== undefined) {
      if (changePct >= 5) status = 'Above Target';
      else if (changePct < -5) status = 'At Risk';
      else if (changePct < 0) status = 'Below Target';
    }

    const formattedVal = formatMetricValue(mainVal, col.name, isRateOrAverage);
    const formattedPrev = prevVal !== undefined ? formatMetricValue(prevVal, col.name, isRateOrAverage) : undefined;

    kpis.push({
      id: `kpi-${col.name}`,
      name: formatColumnTitle(col.name),
      value: Math.round(mainVal * 100) / 100,
      formattedValue: formattedVal,
      previousValue: prevVal !== undefined ? Math.round(prevVal * 100) / 100 : undefined,
      formattedPreviousValue: formattedPrev,
      change: change !== undefined ? Math.round(change * 100) / 100 : undefined,
      changePercent: changePct !== undefined ? Math.round(changePct * 10) / 10 : undefined,
      target: targetCol ? Number(rows[0]?.[targetCol]) || undefined : undefined,
      status,
      period: primaryDateCol ? 'Latest Period vs Prior' : 'Full Dataset Summary',
      sourceColumn: col.name,
      aggregation: isRateOrAverage ? 'avg' : 'sum',
      calculation: isRateOrAverage ? `AVERAGE('${tableName}'[${col.name}])` : `SUM('${tableName}'[${col.name}])`,
      traceableSource: `${tableName}.${col.name}`
    });
  });

  // Always compute a count of records KPI
  kpis.unshift({
    id: 'kpi-total-records',
    name: 'Total Volume',
    value: rows.length,
    formattedValue: rows.length.toLocaleString(),
    status: 'On Track',
    period: 'All Records',
    sourceColumn: '*',
    aggregation: 'count',
    calculation: `COUNTROWS('${tableName}')`,
    traceableSource: `${tableName}.*`
  });

  // 2. Category Performance
  const categoryPerformance: Record<string, { category: string; value: number; share: number }[]> = {};
  const primaryMetric = numericCols[0]?.name;

  if (primaryMetric && stringCols.length > 0) {
    stringCols.slice(0, 6).forEach(sc => {
      const aggMap = new Map<string, number>();
      let totalSum = 0;
      rows.forEach(r => {
        const cat = String(r[sc.name] || 'Unassigned');
        const val = Number(r[primaryMetric]) || 0;
        aggMap.set(cat, (aggMap.get(cat) || 0) + val);
        totalSum += val;
      });

      const sorted = Array.from(aggMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([cat, val]) => ({
          category: cat,
          value: Math.round(val * 100) / 100,
          share: totalSum > 0 ? Math.round((val / totalSum) * 1000) / 10 : 0
        }));

      categoryPerformance[sc.name] = sorted;
    });
  }

  // 3. Trends Detection across top numeric metrics
  const trends: Trend[] = [];
  if (primaryDateCol && numericCols.length > 0) {
    numericCols.slice(0, 4).forEach(numCol => {
      const metricName = numCol.name;
      const dateAggMap = new Map<string, number>();
      rows.forEach(r => {
        const d = String(r[primaryDateCol]);
        const v = Number(r[metricName]) || 0;
        dateAggMap.set(d, (dateAggMap.get(d) || 0) + v);
      });

      const sortedPeriods = Array.from(dateAggMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      if (sortedPeriods.length >= 2) {
        const firstVal = sortedPeriods[0][1];
        const lastVal = sortedPeriods[sortedPeriods.length - 1][1];
        const diffPct = firstVal !== 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;

        let peak = sortedPeriods[0];
        let trough = sortedPeriods[0];
        sortedPeriods.forEach(p => {
          if (p[1] > peak[1]) peak = p;
          if (p[1] < trough[1]) trough = p;
        });

        const direction: Trend['direction'] = diffPct > 5 ? 'up' : diffPct < -5 ? 'down' : 'flat';

        trends.push({
          metric: metricName,
          dimension: primaryDateCol,
          direction,
          changePercent: Math.round(diffPct * 10) / 10,
          peakPoint: { period: peak[0], value: peak[1] },
          troughPoint: { period: trough[0], value: trough[1] },
          summary: `${formatColumnTitle(metricName)} showed ${direction === 'up' ? 'an upward growth trajectory of +' : direction === 'down' ? 'a contraction of ' : 'stable performance within '}${diffPct.toFixed(1)}% across ${sortedPeriods.length} time intervals, reaching peak value (${peak[1].toLocaleString()}) on ${peak[0]}.`,
          dataPoints: sortedPeriods.map(p => ({ period: p[0], value: Math.round(p[1] * 100) / 100 }))
        });
      }
    });
  }

  // Fallback: If no explicit date column or fewer than 2 periods, partition records into chronological batch intervals
  if (trends.length === 0 && numericCols.length > 0 && rows.length >= 4) {
    numericCols.slice(0, 3).forEach(numCol => {
      const metricName = numCol.name;
      const numBuckets = Math.min(8, Math.max(4, Math.floor(rows.length / 8)));
      const bucketSize = Math.ceil(rows.length / numBuckets);
      const points: { period: string; value: number }[] = [];

      for (let b = 0; b < numBuckets; b++) {
        const slice = rows.slice(b * bucketSize, (b + 1) * bucketSize);
        if (slice.length === 0) continue;
        const sum = slice.reduce((acc, curr) => acc + (Number(curr[metricName]) || 0), 0);
        points.push({
          period: `Interval P${b + 1}`,
          value: Math.round(sum * 100) / 100
        });
      }

      if (points.length >= 2) {
        const firstVal = points[0].value;
        const lastVal = points[points.length - 1].value;
        const diffPct = firstVal !== 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
        trends.push({
          metric: metricName,
          dimension: 'Sequential Interval',
          direction: diffPct > 5 ? 'up' : diffPct < -5 ? 'down' : 'flat',
          changePercent: Math.round(diffPct * 10) / 10,
          peakPoint: points.reduce((prev, cur) => cur.value > prev.value ? cur : prev, points[0]),
          troughPoint: points.reduce((prev, cur) => cur.value < prev.value ? cur : prev, points[0]),
          summary: `${formatColumnTitle(metricName)} progression across ${points.length} sequential intervals (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%).`,
          dataPoints: points
        });
      }
    });
  }

  // 4. Anomaly / Outlier Detection (IQR on numeric metrics)
  const anomalies: Anomaly[] = [];
  numericCols.forEach(col => {
    if (col.outliersCount > 0) {
      anomalies.push({
        id: `anom-${col.name}`,
        title: `Outlier Magnitude in ${formatColumnTitle(col.name)}`,
        metric: col.name,
        observedValue: col.max !== undefined ? col.max : 'N/A',
        expectedValue: col.mean !== undefined ? `Mean ~${col.mean}` : undefined,
        severity: col.outliersCount > rows.length * 0.05 ? 'critical' : 'medium',
        reason: `Detected ${col.outliersCount} statistical outliers exceeding 1.5x Interquartile Range (IQR).`,
        recommendedAction: `Inspect individual transaction records or apply Winsorization/clipping at upper percentile.`
      });
    }
  });

  // Check for underperforming segments if category performance exists
  if (primaryMetric && stringCols[0] && categoryPerformance[stringCols[0].name]) {
    const perfList = categoryPerformance[stringCols[0].name];
    if (perfList.length > 2) {
      const bottom = perfList[perfList.length - 1];
      const top = perfList[0];
      if (top.value > bottom.value * 4) {
        anomalies.push({
          id: `concentration-${stringCols[0].name}`,
          title: `Revenue Concentration Risk (${stringCols[0].name})`,
          metric: primaryMetric,
          dimension: stringCols[0].name,
          dimensionValue: top.category,
          observedValue: `${top.share}% share`,
          severity: top.share > 50 ? 'critical' : 'medium',
          reason: `Top segment "${top.category}" accounts for ${top.share}% of total ${formatColumnTitle(primaryMetric)}, while "${bottom.category}" represents only ${bottom.share}%.`,
          recommendedAction: `Diversify market exposure to mitigate revenue dependency on "${top.category}".`
        });
      }
    }
  }

  // 5. Opportunities Detection
  const opportunities: Opportunity[] = [];
  if (primaryMetric && stringCols[0] && categoryPerformance[stringCols[0].name]) {
    const perfList = categoryPerformance[stringCols[0].name];
    if (perfList.length > 1) {
      const top = perfList[0];
      opportunities.push({
        id: `opp-top-${top.category}`,
        title: `Scale High-Yield Segment: ${top.category}`,
        metric: primaryMetric,
        potentialImpact: `Captures ${top.share}% of total volume; 10% expansion yields +${Math.round(top.value * 0.1).toLocaleString()} incremental output`,
        supportingData: `Generated ${top.value.toLocaleString()} across active records`,
        action: `Double down on operational and marketing investment for ${top.category}.`,
        priority: 'High'
      });
    }
  }

  // 6. Forecasting (RULE 6, RULE 40)
  const forecasts: Record<string, ForecastResult> = {};
  if (primaryMetric) {
    if (!primaryDateCol) {
      forecasts[primaryMetric] = {
        isAvailable: false,
        metric: primaryMetric,
        method: 'None',
        horizon: 0,
        data: [],
        unavailabilityReason: 'Forecast unavailable because the dataset does not contain a validated date field.'
      };
    } else {
      const dateAgg = new Map<string, number>();
      rows.forEach(r => {
        const d = String(r[primaryDateCol]);
        const v = Number(r[primaryMetric]) || 0;
        dateAgg.set(d, (dateAgg.get(d) || 0) + v);
      });
      const sortedPoints = Array.from(dateAgg.entries()).sort((a, b) => a[0].localeCompare(b[0]));

      if (sortedPoints.length < 6) {
        forecasts[primaryMetric] = {
          isAvailable: false,
          metric: primaryMetric,
          method: 'Exponential Smoothing',
          horizon: 0,
          data: [],
          unavailabilityReason: `Forecast unavailable because the dataset does not contain sufficient historical data (${sortedPoints.length} time points found; minimum 6 required for statistical reliability).`
        };
      } else {
        // Run Single Exponential Smoothing with Holt trend
        const alpha = 0.35;
        const beta = 0.15;
        let level = sortedPoints[0][1];
        let trendVal = sortedPoints[1][1] - sortedPoints[0][1];

        const historyPoints: ForecastResult['data'] = [];
        for (let i = 0; i < sortedPoints.length; i++) {
          const val = sortedPoints[i][1];
          const prevLevel = level;
          level = alpha * val + (1 - alpha) * (level + trendVal);
          trendVal = beta * (level - prevLevel) + (1 - beta) * trendVal;
          historyPoints.push({
            period: sortedPoints[i][0],
            actual: Math.round(val * 100) / 100
          });
        }

        // Standard error estimation
        const residuals = sortedPoints.map((p, i) => Math.abs(p[1] - (historyPoints[i].actual || 0)));
        const stdError = residuals.reduce((a, b) => a + b, 0) / (residuals.length || 1);

        // Project 3 future points
        const horizon = 3;
        for (let h = 1; h <= horizon; h++) {
          const projected = Math.max(0, level + h * trendVal);
          const margin = 1.96 * stdError * Math.sqrt(h);
          historyPoints.push({
            period: `Projection +${h}`,
            forecast: Math.round(projected * 100) / 100,
            confidenceLower: Math.max(0, Math.round((projected - margin) * 100) / 100),
            confidenceUpper: Math.round((projected + margin) * 100) / 100
          });
        }

        forecasts[primaryMetric] = {
          isAvailable: true,
          metric: primaryMetric,
          method: 'Holt-Winters Exponential Smoothing',
          horizon: 3,
          data: historyPoints
        };
      }
    }
  }

  // 7. Grounded AI Insights
  const insights: AIInsight[] = [];
  if (kpis.length > 1) {
    const topKpi = kpis.find(k => k.id !== 'kpi-total-records') || kpis[0];
    insights.push({
      id: 'ins-primary-kpi',
      category: 'Driver',
      title: `${topKpi.name} Performance Trajectory`,
      what: `${topKpi.name} stands at ${topKpi.formattedValue}${topKpi.changePercent !== undefined ? ` (${topKpi.changePercent >= 0 ? '+' : ''}${topKpi.changePercent}% vs prior period)` : ''}.`,
      why: `Driven by aggregate transaction volume across ${rows.length.toLocaleString()} processed rows in ${tableName}.`,
      whoOrWhat: `Primary underlying measure: ${topKpi.traceableSource}`,
      significance: `Core financial / operational KPI status is evaluated as "${topKpi.status}".`,
      action: topKpi.status === 'At Risk' ? 'Investigate cost and revenue drivers immediately.' : 'Maintain current operational pacing.',
      relatedMetric: topKpi.name,
      supportingData: `Current: ${topKpi.formattedValue}, Prior: ${topKpi.formattedPreviousValue || 'N/A'}, Change: ${topKpi.changePercent || 0}%`,
      confidence: 0.98
    });
  }

  if (anomalies.length > 0) {
    const a = anomalies[0];
    insights.push({
      id: 'ins-risk',
      category: 'Risk',
      title: a.title,
      what: `Identified risk condition: ${a.observedValue}`,
      why: a.reason,
      whoOrWhat: `Impacted field: ${a.metric}${a.dimension ? ` (${a.dimension})` : ''}`,
      significance: `Severity rated as ${a.severity.toUpperCase()}. May distort overall reporting if unmonitored.`,
      action: a.recommendedAction,
      relatedMetric: a.metric,
      supportingData: `${a.reason}`,
      confidence: 0.94
    });
  }

  // 8. Recommended Visuals
  const visuals: VisualConfig[] = [];
  if (primaryDateCol && primaryMetric) {
    visuals.push({
      id: 'vis-trend',
      title: `${formatColumnTitle(primaryMetric)} Trend Over Time`,
      type: 'line',
      categoryField: primaryDateCol,
      valueField: primaryMetric,
      aggregation: 'sum',
      color: '#21F1A8',
      description: 'Historical progression across chronological periods.'
    });
  }

  if (stringCols.length > 0 && primaryMetric) {
    visuals.push({
      id: 'vis-bar-cat',
      title: `${formatColumnTitle(primaryMetric)} by ${formatColumnTitle(stringCols[0].name)}`,
      type: 'bar',
      categoryField: stringCols[0].name,
      valueField: primaryMetric,
      aggregation: 'sum',
      color: '#21F1A8',
      sortBy: 'value_desc',
      topN: 8,
      description: `Comparative breakdown ranking ${stringCols[0].name} segments.`
    });

    if (stringCols.length > 1) {
      visuals.push({
        id: 'vis-donut-sub',
        title: `Distribution by ${formatColumnTitle(stringCols[1].name)}`,
        type: 'donut',
        categoryField: stringCols[1].name,
        valueField: primaryMetric,
        aggregation: 'sum',
        color: '#00d8f6',
        topN: 5,
        description: 'Share of total across secondary categorical dimension.'
      });
    }

    visuals.push({
      id: 'vis-table-summary',
      title: `${formatColumnTitle(stringCols[0].name)} Matrix Overview`,
      type: 'table',
      categoryField: stringCols[0].name,
      valueField: primaryMetric,
      aggregation: 'sum',
      color: '#f59e0b',
      description: 'Granular summary metrics across operational dimensions.'
    });
  }

  // Correlation Matrix for numeric pairs
  const correlationMatrix: { x: string; y: string; correlation: number }[] = [];
  if (numericCols.length >= 2) {
    for (let i = 0; i < Math.min(numericCols.length, 4); i++) {
      for (let j = i + 1; j < Math.min(numericCols.length, 4); j++) {
        const colA = numericCols[i].name;
        const colB = numericCols[j].name;
        const corr = calculatePearsonCorrelation(rows, colA, colB);
        if (corr !== null) {
          correlationMatrix.push({
            x: formatColumnTitle(colA),
            y: formatColumnTitle(colB),
            correlation: Math.round(corr * 100) / 100
          });
        }
      }
    }
  }

  // Comprehensive Descriptive Statistics (EDA)
  const descriptiveStats: DetailedStat[] = [];
  numericCols.forEach(col => {
    const vals = rows
      .map(r => r[col.name])
      .filter(v => typeof v === 'number' && !isNaN(v)) as number[];
    
    if (vals.length === 0) return;
    const sorted = [...vals].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    
    // Variance & StdDev
    const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
    const stdDev = Math.sqrt(variance);
    
    // Percentiles
    const q1 = sorted[Math.floor(n * 0.25)] ?? sorted[0];
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const q3 = sorted[Math.floor(n * 0.75)] ?? sorted[n - 1];
    const min = sorted[0];
    const max = sorted[n - 1];
    const iqr = q3 - q1;
    
    // Skewness & Kurtosis
    let m3 = 0;
    let m4 = 0;
    sorted.forEach(v => {
      const z = stdDev > 0 ? (v - mean) / stdDev : 0;
      m3 += Math.pow(z, 3);
      m4 += Math.pow(z, 4);
    });
    const skewness = stdDev > 0 ? (m3 / n) : 0;
    const kurtosis = stdDev > 0 ? (m4 / n) - 3 : 0;
    
    descriptiveStats.push({
      column: col.name,
      count: n,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      min: Math.round(min * 100) / 100,
      q1: Math.round(q1 * 100) / 100,
      q3: Math.round(q3 * 100) / 100,
      max: Math.round(max * 100) / 100,
      iqr: Math.round(iqr * 100) / 100,
      skewness: Math.round(skewness * 100) / 100,
      kurtosis: Math.round(kurtosis * 100) / 100,
      nullCount: col.nullCount,
      nullPct: col.nullPercentage
    });
  });

  // Business Health Score
  let healthScore = 85;
  if (anomalies.some(a => a.severity === 'critical')) healthScore -= 15;
  if (kpis.some(k => k.status === 'At Risk')) healthScore -= 10;
  if (kpis.some(k => k.status === 'Above Target')) healthScore += 5;
  healthScore = Math.max(40, Math.min(98, healthScore));

  const rating = healthScore >= 85 ? 'Strong' : healthScore >= 70 ? 'Moderate' : 'Caution Required';

  return {
    kpis,
    trends,
    anomalies,
    opportunities,
    forecasts,
    insights,
    visuals,
    correlationMatrix,
    categoryPerformance,
    businessHealthScore: {
      score: healthScore,
      rating,
      methodology: `Evaluated across ${kpis.length} core metrics, anomaly severity, and target status variance.`
    },
    descriptiveStats
  };
}

function calculatePearsonCorrelation(rows: Record<string, any>[], colA: string, colB: string): number | null {
  const pairs = rows
    .map(r => [r[colA], r[colB]])
    .filter(([a, b]) => typeof a === 'number' && !isNaN(a) && typeof b === 'number' && !isNaN(b)) as [number, number][];

  if (pairs.length < 3) return null;

  const n = pairs.length;
  let sumA = 0, sumB = 0, sumAA = 0, sumBB = 0, sumAB = 0;

  for (const [a, b] of pairs) {
    sumA += a;
    sumB += b;
    sumAA += a * a;
    sumBB += b * b;
    sumAB += a * b;
  }

  const numerator = n * sumAB - sumA * sumB;
  const denominator = Math.sqrt((n * sumAA - sumA * sumA) * (n * sumBB - sumB * sumB));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

function formatColumnTitle(col: string): string {
  return col
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, str => str.toUpperCase());
}

function formatMetricValue(val: number, name: string, isRate: boolean): string {
  if (isRate) {
    return `${(val > 1 ? val : val * 100).toFixed(1)}%`;
  }
  const isCurrency = /revenue|sales|profit|cost|price|income|amount|expense|mrr|arr/i.test(name);
  if (isCurrency) {
    if (Math.abs(val) >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(val) >= 1_000) {
      return `$${(val / 1_000).toFixed(1)}K`;
    }
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (Math.abs(val) >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `${(val / 1_000).toFixed(1)}K`;
  }
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
