import { VisualConfig } from '../types';

export type ChartGuideId =
  | 'bar'
  | 'line'
  | 'scatter'
  | 'histogram'
  | 'stacked_bar'
  | 'donut'
  | 'heatmap'
  | 'boxplot';

export interface ChartGuideRule {
  id: ChartGuideId;
  number: string;
  name: string;
  purpose: string;
  question: string;
  tip: string;
  fits: string;
  visualType: VisualConfig['type'];
  requiresDate?: boolean;
  requiresSecondCategory?: boolean;
  requiresSecondMeasure?: boolean;
  singleNumericOnly?: boolean;
  maxCategories?: number;
}

/**
 * Single source of truth for the "Which chart should I use?" 8-chart guide
 * and recommendation engine rules.
 */
export const CHART_GUIDE_RULES: readonly ChartGuideRule[] = [
  {
    id: 'bar',
    number: '01',
    name: 'Bar chart',
    purpose: 'Compare categories.',
    question: 'Which product sold the most?',
    tip: 'start the value axis at zero.',
    fits: '1 category + 1 measure',
    visualType: 'bar'
  },
  {
    id: 'line',
    number: '02',
    name: 'Line chart',
    purpose: 'Track change over time.',
    question: 'How did revenue change each month?',
    tip: 'keep time intervals consistent.',
    fits: 'date + measure',
    visualType: 'line',
    requiresDate: true
  },
  {
    id: 'scatter',
    number: '03',
    name: 'Scatter plot',
    purpose: 'Explore relationships.',
    question: 'Do larger orders earn more profit?',
    tip: 'a relationship does not prove causation.',
    fits: '2 numeric measures',
    visualType: 'scatter',
    requiresSecondMeasure: true
  },
  {
    id: 'histogram',
    number: '04',
    name: 'Histogram',
    purpose: 'Show a distribution.',
    question: 'What order values are most common?',
    tip: 'group numeric values into bins.',
    fits: '1 numeric column',
    visualType: 'histogram',
    singleNumericOnly: true
  },
  {
    id: 'stacked_bar',
    number: '05',
    name: 'Stacked bar',
    purpose: 'Compare totals and parts.',
    question: "How does each region's sales mix differ?",
    tip: 'use 100% stacked bars for proportions.',
    fits: '2 categories + 1 measure',
    visualType: 'stacked_bar',
    requiresSecondCategory: true
  },
  {
    id: 'donut',
    number: '06',
    name: 'Donut chart',
    purpose: 'Show a simple share.',
    question: 'What share of sales is online?',
    tip: 'use for categories that form a whole, max about 5 slices.',
    fits: '1 category (<= 5 values) + 1 measure',
    visualType: 'donut',
    maxCategories: 5
  },
  {
    id: 'heatmap',
    number: '07',
    name: 'Heatmap',
    purpose: 'Find patterns in a grid.',
    question: 'When is customer demand highest?',
    tip: 'label the color scale clearly.',
    fits: '2 categories/time buckets + 1 measure',
    visualType: 'heatmap',
    requiresSecondCategory: true
  },
  {
    id: 'boxplot',
    number: '08',
    name: 'Box plot',
    purpose: 'Compare spread and median.',
    question: 'How do delivery times vary by region?',
    tip: 'show the median, quartiles and spread.',
    fits: '1 category + 1 numeric',
    visualType: 'boxplot'
  }
] as const;

export const CHART_GUIDE_MAP: Record<ChartGuideId, ChartGuideRule> = CHART_GUIDE_RULES.reduce(
  (acc, rule) => {
    acc[rule.id] = rule;
    return acc;
  },
  {} as Record<ChartGuideId, ChartGuideRule>
);

export function getChartGuideRule(typeOrId: string): ChartGuideRule | undefined {
  if (typeOrId === 'area') return CHART_GUIDE_MAP.line;
  if (typeOrId === 'horizontal_bar') return CHART_GUIDE_MAP.bar;
  if (typeOrId === 'pie') return CHART_GUIDE_MAP.donut;
  return CHART_GUIDE_MAP[typeOrId as ChartGuideId];
}

export function formatChartGuideReason(ruleOrId: ChartGuideRule | ChartGuideId | string): string {
  const rule = typeof ruleOrId === 'string' ? getChartGuideRule(ruleOrId) : ruleOrId;
  if (!rule) return '';
  const tipCapitalized = rule.tip.charAt(0).toUpperCase() + rule.tip.slice(1);
  return `${rule.purpose} Tip: ${tipCapitalized}`;
}

