import { ColumnProfile, VisualConfig } from '../types';

export interface ChartRecommendation {
  type: VisualConfig['type'];
  label: string;
  score: number; // 0 to 100
  badge: 'Best Fit' | 'Strong' | 'Alternative';
  isTopRecommendation: boolean;
  reason: string;
  dataSuitability: string;
  suggestedTitle: string;
  iconName: string;
}

export interface BoxplotGroupStat {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  iqr: number;
  outliers: number[];
  count: number;
}

/**
 * Computes Tukey 5-number summary (Min, Q1, Median, Q3, Max) and outliers for Boxplots
 */
export function computeBoxplotSummary(
  rows: Record<string, any>[],
  categoryField: string,
  valueField: string
): BoxplotGroupStat[] {
  if (!rows || rows.length === 0) return [];

  const groups = new Map<string, number[]>();

  rows.forEach(r => {
    const cat = String(r[categoryField] ?? 'Overall');
    const val = Number(r[valueField]);
    if (!isNaN(val) && val !== null && val !== undefined) {
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(val);
    }
  });

  const results: BoxplotGroupStat[] = [];

  groups.forEach((vals, category) => {
    if (vals.length === 0) return;
    vals.sort((a, b) => a - b);

    const count = vals.length;
    const sum = vals.reduce((acc, v) => acc + v, 0);
    const mean = sum / count;

    const getPercentile = (p: number): number => {
      if (count === 1) return vals[0];
      const index = (count - 1) * p;
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return vals[lower] * (1 - weight) + vals[upper] * weight;
    };

    const q1 = getPercentile(0.25);
    const median = getPercentile(0.5);
    const q3 = getPercentile(0.75);
    const iqr = Math.max(0.0001, q3 - q1);

    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    // Normal values inside fences
    const insideFenceVals = vals.filter(v => v >= lowerFence && v <= upperFence);
    const min = insideFenceVals.length > 0 ? insideFenceVals[0] : vals[0];
    const max = insideFenceVals.length > 0 ? insideFenceVals[insideFenceVals.length - 1] : vals[vals.length - 1];

    // Outliers outside fences
    const outliers = vals.filter(v => v < lowerFence || v > upperFence);

    results.push({
      category,
      min,
      q1,
      median,
      q3,
      max,
      mean,
      iqr,
      outliers,
      count
    });
  });

  // Sort groups by median descending and cap to top 8 for clean visual rendering
  return results.sort((a, b) => b.median - a.median).slice(0, 8);
}

/**
 * Analyzes selected column schema and recommends the optimal visualization types
 */
export function recommendChartsForFields(
  categoryColName: string,
  valueColName: string,
  columns: ColumnProfile[],
  rows: Record<string, any>[]
): ChartRecommendation[] {
  const catCol = columns.find(c => c.name === categoryColName) || {
    name: categoryColName,
    dataType: 'string' as const,
    distinctCount: 10,
    nullCount: 0,
    sampleValues: []
  };

  const valCol = columns.find(c => c.name === valueColName) || {
    name: valueColName,
    dataType: 'number' as const,
    distinctCount: 20,
    nullCount: 0,
    sampleValues: []
  };

  const isDate = catCol.dataType === 'date' || 
    /date|time|year|month|quarter|period|day|week|dt|timestamp/i.test(catCol.name);

  const isCatNumeric = catCol.dataType === 'number';
  const isValNumeric = valCol.dataType === 'number';
  const distinctCount = catCol.distinctCount || 10;

  // Inspect numerical dispersion in values
  let valVarianceScore = 0;
  if (rows && rows.length > 0 && isValNumeric) {
    const vals = rows.map(r => Number(r[valCol.name])).filter(v => !isNaN(v));
    if (vals.length > 2) {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      if (max - min > 0) {
        valVarianceScore = Math.min(100, Math.round(((max - min) / (Math.abs(min) + Math.abs(max) + 1)) * 100));
      }
    }
  }

  const recommendations: { type: VisualConfig['type']; label: string; score: number; reason: string; suitability: string; icon: string }[] = [];

  // =========================================================================
  // RULE 1: Time-Series / Chronological Data
  // =========================================================================
  if (isDate) {
    recommendations.push({
      type: 'heatmap',
      label: 'Temporal Heatmap Matrix',
      score: 96,
      reason: 'Time-series detected. Heatmaps illuminate temporal density, seasonal rhythm, and peak velocity across periods without line collision.',
      suitability: 'Optimal for chronological periods & multi-interval observation',
      icon: 'Calendar'
    });

    recommendations.push({
      type: 'area',
      label: 'Area Trend',
      score: 93,
      reason: 'Chronological progression with cumulative volume shading emphasizes momentum and baseline trajectory.',
      suitability: 'High visual impact for continuous revenue & metric trajectories',
      icon: 'TrendingUp'
    });

    recommendations.push({
      type: 'line',
      label: 'Line Chart',
      score: 90,
      reason: 'Standard continuous spline highlights directional inflection points and chronological rates of change.',
      suitability: 'Clean, classical time-series velocity tracking',
      icon: 'LineChart'
    });

    recommendations.push({
      type: 'bar',
      label: 'Bar Chart',
      score: 68,
      reason: 'Discrete period comparison. Effective when analyzing non-continuous cyclical reporting periods.',
      suitability: 'Bucket-by-bucket comparisons',
      icon: 'BarChart'
    });
  } 
  // =========================================================================
  // RULE 2: Distribution & Statistical Spread
  // =========================================================================
  else if (isValNumeric && valVarianceScore > 25 && distinctCount >= 3 && distinctCount <= 12) {
    recommendations.push({
      type: 'boxplot',
      label: 'Quartile Boxplot',
      score: 97,
      reason: 'Statistical distribution detected. Boxplots compute 5-number Tukey summaries (Min, Q1, Median, Q3, Max) and isolate statistical outliers.',
      suitability: 'Essential for variance evaluation, dispersion auditing & outlier discovery',
      icon: 'Box'
    });

    recommendations.push({
      type: 'heatmap',
      label: 'Density Heatmap',
      score: 91,
      reason: '2D matrix visually captures value concentration thresholds and highlights anomalous category cells.',
      suitability: 'Segment intensity discovery & risk heat mapping',
      icon: 'Grid'
    });

    recommendations.push({
      type: 'bar',
      label: 'Ranked Bar Chart',
      score: 84,
      reason: 'Aggregates summary totals to contrast categorical volume side by side.',
      suitability: 'Direct categorical comparisons',
      icon: 'BarChart'
    });

    recommendations.push({
      type: 'table',
      label: 'Data Matrix Table',
      score: 79,
      reason: 'Tabular drilldown displaying exact numbers, percentages, and ranked metrics.',
      suitability: 'Granular auditing and financial reconciliation',
      icon: 'Table'
    });
  }
  // =========================================================================
  // RULE 3: Low Cardinality Part-to-Whole Composition (2 to 6 Categories)
  // =========================================================================
  else if (!isDate && distinctCount >= 2 && distinctCount <= 6) {
    recommendations.push({
      type: 'donut',
      label: 'Donut Segment Chart',
      score: 95,
      reason: `Low cardinality (${distinctCount} categories) matches ideal donut composition without cognitive slice clutter.`,
      suitability: 'Perfect for segment share of total & proportional distribution',
      icon: 'PieChart'
    });

    recommendations.push({
      type: 'bar',
      label: 'Column Bar Chart',
      score: 88,
      reason: 'High precision comparative height benchmarks across distinct segments.',
      suitability: 'Clean absolute value comparisons',
      icon: 'BarChart'
    });

    recommendations.push({
      type: 'pie',
      label: 'Classical Pie',
      score: 85,
      reason: 'Traditional part-to-whole circular breakdown.',
      suitability: 'Proportional division across a whole',
      icon: 'PieChart'
    });

    recommendations.push({
      type: 'boxplot',
      label: 'Category Boxplot',
      score: 82,
      reason: 'Evaluates the spread and median benchmark within each of the core segments.',
      suitability: 'Segment variance and spread analysis',
      icon: 'Box'
    });
  }
  // =========================================================================
  // RULE 4: High Cardinality Dimensions (> 10 Categories)
  // =========================================================================
  else if (!isDate && distinctCount > 10) {
    recommendations.push({
      type: 'horizontal_bar',
      label: 'Horizontal Ranked Bar',
      score: 96,
      reason: `High cardinality (${distinctCount} entities). Horizontal layout prevents vertical label overlap and orders entities by ranking.`,
      suitability: 'Top-N leaderboards, accounts, products & regional listings',
      icon: 'AlignLeft'
    });

    recommendations.push({
      type: 'treemap',
      label: 'Hierarchical Treemap',
      score: 91,
      reason: 'Area-nested rectangles pack high-density categorical volume compactly.',
      suitability: 'Multi-category nested share exploration',
      icon: 'LayoutGrid'
    });

    recommendations.push({
      type: 'table',
      label: 'Granular Matrix Table',
      score: 89,
      reason: 'Sortable tabular view with full scannability and precise figures.',
      suitability: 'Detailed multi-row audit logs and customer records',
      icon: 'Table'
    });

    recommendations.push({
      type: 'heatmap',
      label: 'Intensity Heatmap Grid',
      score: 84,
      reason: 'Color gradient scales isolate dominant performers from long-tail entries.',
      suitability: 'Matrix density across multiple entities',
      icon: 'Grid'
    });
  }
  // =========================================================================
  // RULE 5: Multi-Metric Correlation (Two Numeric Columns)
  // =========================================================================
  else if (isCatNumeric && isValNumeric) {
    recommendations.push({
      type: 'scatter',
      label: 'Correlation Scatter Plot',
      score: 98,
      reason: 'Two continuous numerical metrics detected. Scatter plots uncover correlations, clustering, and regression outliers.',
      suitability: 'Bivariate correlation, elasticity & regression analysis',
      icon: 'ScatterPlot'
    });

    recommendations.push({
      type: 'heatmap',
      label: 'Bivariate Heatmap',
      score: 88,
      reason: '2D grid highlights coordinate density and joint frequency hotspots.',
      suitability: 'Cross-metric density discovery',
      icon: 'Grid'
    });

    recommendations.push({
      type: 'line',
      label: 'Trajectory Line',
      score: 80,
      reason: 'Plots ordered dual-metric progression across observation indices.',
      suitability: 'Parametric progression curves',
      icon: 'LineChart'
    });
  }
  // =========================================================================
  // DEFAULT / GENERAL CATEGORICAL
  // =========================================================================
  else {
    recommendations.push({
      type: 'bar',
      label: 'Standard Bar Chart',
      score: 90,
      reason: 'Versatile discrete comparative visual for contrasting metrics across categories.',
      suitability: 'Standard comparative categorical analysis',
      icon: 'BarChart'
    });

    recommendations.push({
      type: 'boxplot',
      label: 'Quartile Boxplot',
      score: 86,
      reason: 'Shows median, quartiles, and statistical distribution spread.',
      suitability: 'Dispersion and statistical distribution',
      icon: 'Box'
    });

    recommendations.push({
      type: 'heatmap',
      label: 'Density Heatmap',
      score: 84,
      reason: 'Visualizes concentration and intensity variations.',
      suitability: 'Cross-tabulation density',
      icon: 'Grid'
    });

    recommendations.push({
      type: 'table',
      label: 'Summary Table',
      score: 80,
      reason: 'Crisp tabular view of ranked figures.',
      suitability: 'Structured numbers with rank sorting',
      icon: 'Table'
    });
  }

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations.map((rec, index) => {
    let badge: 'Best Fit' | 'Strong' | 'Alternative' = 'Alternative';
    if (index === 0) badge = 'Best Fit';
    else if (index === 1 || index === 2) badge = 'Strong';

    const catNameClean = categoryColName.replace(/([A-Z])/g, ' $1').trim();
    const valNameClean = valueColName.replace(/([A-Z])/g, ' $1').trim();

    let suggestedTitle = `${valNameClean} by ${catNameClean}`;
    if (rec.type === 'heatmap' && isDate) {
      suggestedTitle = `${valNameClean} Chronological Heatmap Matrix`;
    } else if (rec.type === 'boxplot') {
      suggestedTitle = `${valNameClean} Quartile Distribution & Outliers (${catNameClean})`;
    } else if (rec.type === 'donut') {
      suggestedTitle = `${catNameClean} Share of ${valNameClean}`;
    } else if (rec.type === 'scatter') {
      suggestedTitle = `${catNameClean} vs ${valNameClean} Correlation Matrix`;
    } else if (rec.type === 'area' || rec.type === 'line') {
      suggestedTitle = `${valNameClean} Progression Over Time`;
    }

    return {
      type: rec.type,
      label: rec.label,
      score: rec.score,
      badge,
      isTopRecommendation: index === 0,
      reason: rec.reason,
      dataSuitability: rec.suitability,
      suggestedTitle,
      iconName: rec.icon
    };
  });
}

/**
 * Analyzes the entire dataset schema and automatically synthesizes a balanced,
 * intelligent dashboard suite with diverse, high-value visualizations
 */
export function recommendDatasetDashboard(
  columns: ColumnProfile[],
  rows: Record<string, any>[]
): VisualConfig[] {
  if (!columns || columns.length === 0) return [];

  const numericCols = columns.filter(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate);
  const stringCols = columns.filter(c => c.dataType === 'string' && !c.isPrimaryKeyCandidate);
  const dateCol = columns.find(c => c.dataType === 'date' || /date|time|year|month|period/i.test(c.name));

  const primaryVal = numericCols[0]?.name || 'Revenue';
  const secondaryVal = numericCols[1]?.name || primaryVal;

  const lowCardCat = stringCols.find(c => c.distinctCount >= 2 && c.distinctCount <= 6) || stringCols[0];
  const highCardCat = stringCols.find(c => c.distinctCount > 7 && c.name !== lowCardCat?.name) || stringCols[1] || lowCardCat;

  const suite: VisualConfig[] = [];

  // 1. Time-Series Visual: Heatmap Matrix for Time-Series (as specifically requested)
  if (dateCol) {
    suite.push({
      id: `vis-ai-heatmap-${Date.now()}-1`,
      title: `${primaryVal.toUpperCase()} CHRONOLOGICAL HEATMAP MATRIX`,
      type: 'heatmap',
      categoryField: dateCol.name,
      valueField: primaryVal,
      aggregation: 'sum',
      color: '#0284C7',
      description: 'Intelligent Recommendation: Heatmap provides multi-interval temporal density without line collisions.'
    });
  }

  // 2. Statistical Distribution: Boxplot for Quartiles & Outlier Isolation
  if (lowCardCat && primaryVal) {
    suite.push({
      id: `vis-ai-boxplot-${Date.now()}-2`,
      title: `${primaryVal.toUpperCase()} QUARTILE DISTRIBUTION & OUTLIERS (${lowCardCat.name})`,
      type: 'boxplot',
      categoryField: lowCardCat.name,
      valueField: primaryVal,
      aggregation: 'sum',
      color: '#0284C7',
      description: 'Intelligent Recommendation: Boxplot calculates 5-number Tukey distribution (Min, Q1, Median, Q3, Max) and identifies outlier transactions.'
    });
  }

  // 3. Proportional Composition: Donut for Low-Cardinality Segment Share
  if (lowCardCat && primaryVal) {
    suite.push({
      id: `vis-ai-donut-${Date.now()}-3`,
      title: `${lowCardCat.name.toUpperCase()} SHARE OF TOTAL ${primaryVal.toUpperCase()}`,
      type: 'donut',
      categoryField: lowCardCat.name,
      valueField: primaryVal,
      aggregation: 'sum',
      color: '#00d8f6',
      description: `Intelligent Recommendation: Donut is mathematically optimal for ${lowCardCat.distinctCount || 4} discrete segments.`
    });
  }

  // 4. Ranking & High-Cardinality: Horizontal Bar or Treemap
  if (highCardCat && primaryVal) {
    suite.push({
      id: `vis-ai-hbar-${Date.now()}-4`,
      title: `TOP PERFORMING ${highCardCat.name.toUpperCase()} RANKING`,
      type: 'horizontal_bar',
      categoryField: highCardCat.name,
      valueField: primaryVal,
      aggregation: 'sum',
      color: '#0284C7',
      description: `Intelligent Recommendation: Horizontal bars prevent label clipping across ${highCardCat.distinctCount || 10} entities.`
    });
  }

  // 5. Correlation & Multi-Metric: Scatter Plot
  if (numericCols.length >= 2 && highCardCat) {
    suite.push({
      id: `vis-ai-scatter-${Date.now()}-5`,
      title: `${primaryVal} VS ${secondaryVal} CORRELATION SCATTER`,
      type: 'scatter',
      categoryField: highCardCat.name,
      valueField: primaryVal,
      secondaryValueField: secondaryVal,
      aggregation: 'sum',
      color: '#6366f1',
      description: 'Intelligent Recommendation: Two numerical dimensions detected. Scatter discovers correlation clusters and regression variance.'
    });
  }

  return suite;
}
