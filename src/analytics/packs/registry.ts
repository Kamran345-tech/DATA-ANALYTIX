import {
  AnalyticsPackConfig,
  EnrichedAnalyticsPackConfig,
  HybridPackLenses,
  HybridSampleDataset,
  PackId,
  PackLensConfig,
  PackRoleDefinition,
  PackThemeConfig,
} from './types';
import { financialPack } from './financial';
import { salesPack } from './sales';
import { marketingPack } from './marketing';
import { customerPack } from './customer';
import { productPack } from './product';
import { webPack } from './web';
import { operationsPack } from './operations';
import { hrPack } from './hr';
import { riskFraudPack } from './risk-fraud';
import { healthcarePack } from './healthcare';
import { retailPack } from './retail';
import { manufacturingPack } from './manufacturing';
import { bankingInsurancePack } from './banking-insurance';
import { educationPack } from './education';

export const DEFAULT_PACK_THEMES: Record<PackId, Required<PackThemeConfig>> = {
  financial: {
    hue: 'emerald-gold',
    token: '--pack-1',
    gradientFrom: 'var(--pack-1)',
    gradientTo: 'var(--pack-7)',
    chartPalette: ['var(--pack-1)', 'var(--pack-7)', 'var(--pack-10)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-6)'],
  },
  sales: {
    hue: 'blue',
    token: '--pack-2',
    gradientFrom: 'var(--pack-2)',
    gradientTo: 'var(--pack-6)',
    chartPalette: ['var(--pack-2)', 'var(--pack-6)', 'var(--pack-5)', 'var(--pack-1)', 'var(--chart-4)', 'var(--chart-6)'],
  },
  marketing: {
    hue: 'magenta-orange',
    token: '--pack-3',
    gradientFrom: 'var(--pack-3)',
    gradientTo: 'var(--pack-12)',
    chartPalette: ['var(--pack-3)', 'var(--pack-12)', 'var(--pack-7)', 'var(--pack-4)', 'var(--pack-2)', 'var(--pack-1)'],
  },
  customer: {
    hue: 'violet',
    token: '--pack-4',
    gradientFrom: 'var(--pack-4)',
    gradientTo: 'var(--pack-5)',
    chartPalette: ['var(--pack-4)', 'var(--pack-5)', 'var(--pack-3)', 'var(--pack-6)', 'var(--pack-1)', 'var(--pack-7)'],
  },
  product: {
    hue: 'indigo',
    token: '--pack-5',
    gradientFrom: 'var(--pack-5)',
    gradientTo: 'var(--pack-2)',
    chartPalette: ['var(--pack-5)', 'var(--pack-2)', 'var(--pack-6)', 'var(--pack-4)', 'var(--pack-10)', 'var(--pack-7)'],
  },
  web: {
    hue: 'cyan',
    token: '--pack-6',
    gradientFrom: 'var(--pack-6)',
    gradientTo: 'var(--pack-2)',
    chartPalette: ['var(--pack-6)', 'var(--pack-2)', 'var(--pack-10)', 'var(--pack-5)', 'var(--pack-1)', 'var(--pack-4)'],
  },
  operations: {
    hue: 'amber',
    token: '--pack-7',
    gradientFrom: 'var(--pack-7)',
    gradientTo: 'var(--pack-12)',
    chartPalette: ['var(--pack-7)', 'var(--pack-12)', 'var(--pack-1)', 'var(--pack-2)', 'var(--pack-6)', 'var(--pack-9)'],
  },
  hr: {
    hue: 'rose',
    token: '--pack-8',
    gradientFrom: 'var(--pack-8)',
    gradientTo: 'var(--pack-3)',
    chartPalette: ['var(--pack-8)', 'var(--pack-3)', 'var(--pack-4)', 'var(--pack-7)', 'var(--pack-2)', 'var(--pack-10)'],
  },
  'risk-fraud': {
    hue: 'red-crimson',
    token: '--pack-9',
    gradientFrom: 'var(--pack-9)',
    gradientTo: 'var(--pack-8)',
    chartPalette: ['var(--pack-9)', 'var(--pack-8)', 'var(--pack-7)', 'var(--pack-12)', 'var(--pack-5)', 'var(--pack-2)'],
  },
  healthcare: {
    hue: 'teal-mint',
    token: '--pack-10',
    gradientFrom: 'var(--pack-10)',
    gradientTo: 'var(--pack-1)',
    chartPalette: ['var(--pack-10)', 'var(--pack-1)', 'var(--pack-6)', 'var(--pack-2)', 'var(--pack-4)', 'var(--pack-7)'],
  },
  retail: {
    hue: 'pink',
    token: '--pack-11',
    gradientFrom: 'var(--pack-11)',
    gradientTo: 'var(--pack-3)',
    chartPalette: ['var(--pack-11)', 'var(--pack-3)', 'var(--pack-4)', 'var(--pack-7)', 'var(--pack-6)', 'var(--pack-1)'],
  },
  manufacturing: {
    hue: 'steel-orange',
    token: '--pack-12',
    gradientFrom: 'var(--pack-12)',
    gradientTo: 'var(--pack-13)',
    chartPalette: ['var(--pack-12)', 'var(--pack-13)', 'var(--pack-7)', 'var(--pack-6)', 'var(--pack-1)', 'var(--pack-5)'],
  },
  'banking-insurance': {
    hue: 'navy-gold',
    token: '--pack-13',
    gradientFrom: 'var(--pack-13)',
    gradientTo: 'var(--pack-7)',
    chartPalette: ['var(--pack-13)', 'var(--pack-7)', 'var(--pack-2)', 'var(--pack-1)', 'var(--pack-5)', 'var(--pack-9)'],
  },
  education: {
    hue: 'lime',
    token: '--pack-14',
    gradientFrom: 'var(--pack-14)',
    gradientTo: 'var(--pack-1)',
    chartPalette: ['var(--pack-14)', 'var(--pack-1)', 'var(--pack-10)', 'var(--pack-6)', 'var(--pack-2)', 'var(--pack-7)'],
  },
};

function enrichPackConfig(raw: AnalyticsPackConfig): EnrichedAnalyticsPackConfig {
  // 1. Build `roles` map from taxonomy + detect.roleAliases
  const roles: Record<string, PackRoleDefinition> = {};
  const dimSet = new Set(raw.taxonomy.dimensions);
  const measSet = new Set(raw.taxonomy.measures);
  const allRoles = Array.from(
    new Set([
      ...raw.detect.requiredRoles,
      ...raw.detect.optionalRoles,
      ...raw.taxonomy.dimensions,
      ...raw.taxonomy.measures,
    ])
  );

  for (const role of allRoles) {
    const aliases = raw.detect.roleAliases[role] || [role];
    const type: 'number' | 'date' | 'category' =
      role === 'date' || role.endsWith('_date')
        ? 'date'
        : measSet.has(role) || !dimSet.has(role)
        ? 'number'
        : 'category';
    const label = role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    roles[role] = {
      type,
      aliases,
      description: `${label} (${aliases.slice(0, 3).join(', ')})`,
    };
  }

  // 2. Build hybrid sampleDataset (callable `pack.sampleDataset()` AND `.name` / `.rows`)
  const rawSample = raw.sampleDataset as { name: string; rows: Record<string, any>[] };
  const rows = Array.isArray(rawSample?.rows)
    ? rawSample.rows
    : typeof raw.sampleDataset === 'function'
    ? raw.sampleDataset()
    : [];
  const sampleName = rawSample?.name || `${raw.id}_sample_2025.csv`;
  const sampleFn = (() => rows.map(r => ({ ...r }))) as HybridSampleDataset;
  sampleFn.rows = rows;
  Object.defineProperty(sampleFn, 'name', { value: sampleName, configurable: true });

  // 3. Build hybrid lenses (array of 4 PackLensConfig AND `.descriptive`, `.diagnostic`, `.predictive`, `.prescriptive`)
  const lensArray: PackLensConfig[] = Array.isArray(raw.lenses) ? [...raw.lenses] : [];
  const execLens = lensArray[0];
  const opsLens = lensArray[1];
  const perfLens = lensArray[2];
  const riskLens = lensArray[3];

  const kpiTitlesById = Object.fromEntries(raw.kpis.map(k => [k.id, `${k.title} (${k.source})`]));

  const descriptive = [
    execLens
      ? `${execLens.name} Focus: ${execLens.description}.`
      : `Tracks core ${raw.name} performance across ${raw.kpis.length} domain KPIs.`,
    `Primary scorecard metrics: ${(execLens?.kpiIds || raw.kpis.slice(0, 4).map(k => k.id))
      .map(id => kpiTitlesById[id] || id)
      .slice(0, 3)
      .join('; ')}.`,
    `Applies 80/20 Pareto concentration and period-over-period trend tracking across ${raw.taxonomy.dimensions.join(', ')}.`,
  ];

  const diagnostic = [
    opsLens
      ? `${opsLens.name} Drivers: ${opsLens.description}.`
      : `Decomposes root-cause variance across ${raw.taxonomy.dimensions.join(' and ')}.`,
    `Evaluates operational efficiency via ${(opsLens?.kpiIds || raw.kpis.slice(2, 6).map(k => k.id))
      .map(id => kpiTitlesById[id] || id)
      .slice(0, 3)
      .join('; ')}.`,
    `Flags statistical outliers using Z-score (> 2.5σ) and Tukey 1.5×IQR fences across segment slices.`,
  ];

  const predictive = [
    perfLens
      ? `${perfLens.name} Trajectory: ${perfLens.description}.`
      : `Projects 3-period forward trajectory using OLS linear trend + moving-average smoothing.`,
    `Monitors leading indicators: ${(perfLens?.kpiIds || raw.kpis.slice(0, 3).map(k => k.id))
      .map(id => kpiTitlesById[id] || id)
      .slice(0, 3)
      .join('; ')}.`,
    `Estimates momentum shifts and seasonal index multipliers across mapped time dimensions.`,
  ];

  const prescriptive = [
    riskLens
      ? `${riskLens.name} Governance: ${riskLens.description}.`
      : `Simulates price, volume, cost, and retention levers to optimize ${raw.name} outcomes.`,
    `Guardrail KPIs audited for threshold breaches: ${(riskLens?.kpiIds || raw.kpis.slice(-3).map(k => k.id))
      .map(id => kpiTitlesById[id] || id)
      .slice(0, 3)
      .join('; ')}.`,
    `Use the interactive What-If sliders to stress-test elasticity and quantify net dollar impact before execution.`,
  ];

  const hybridLenses = Object.assign(lensArray, {
    descriptive,
    diagnostic,
    predictive,
    prescriptive,
  }) as HybridPackLenses;

  const fallbackTheme = DEFAULT_PACK_THEMES[raw.id] || DEFAULT_PACK_THEMES.financial;
  const resolvedTheme: Required<PackThemeConfig> = {
    hue: raw.theme?.hue || fallbackTheme.hue,
    token: raw.theme?.token || fallbackTheme.token,
    gradientFrom: raw.theme?.gradientFrom || fallbackTheme.gradientFrom,
    gradientTo: raw.theme?.gradientTo || fallbackTheme.gradientTo,
    chartPalette: raw.theme?.chartPalette || fallbackTheme.chartPalette,
  };

  return {
    ...raw,
    category: raw.category || 'Finance & Risk',
    theme: resolvedTheme,
    roles,
    sampleDataset: sampleFn,
    lenses: hybridLenses,
  };
}

const RAW_PACKS: AnalyticsPackConfig[] = [
  financialPack,
  salesPack,
  marketingPack,
  customerPack,
  productPack,
  webPack,
  operationsPack,
  hrPack,
  riskFraudPack,
  healthcarePack,
  retailPack,
  manufacturingPack,
  bankingInsurancePack,
  educationPack,
];

/**
 * Single source-of-truth registry for all 14 Analytics Packs.
 * Adding a 15th pack requires only creating its config file and adding it to RAW_PACKS.
 */
export const ANALYTICS_PACKS: EnrichedAnalyticsPackConfig[] = RAW_PACKS.map(enrichPackConfig);

export const ALL_ANALYTICS_PACKS: EnrichedAnalyticsPackConfig[] = ANALYTICS_PACKS;

export const ANALYTICS_PACK_MAP: Record<string, EnrichedAnalyticsPackConfig> = Object.fromEntries(
  ANALYTICS_PACKS.map(p => [p.id, p])
);

export const PACKS_BY_ID: Record<PackId, EnrichedAnalyticsPackConfig> = ANALYTICS_PACK_MAP as Record<
  PackId,
  EnrichedAnalyticsPackConfig
>;

export function getPackById(packId?: string | PackId | null): EnrichedAnalyticsPackConfig {
  if (packId && ANALYTICS_PACK_MAP[packId]) {
    return ANALYTICS_PACK_MAP[packId];
  }
  return ANALYTICS_PACKS[0];
}
