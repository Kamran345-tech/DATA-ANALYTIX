import {
  AnalyticsPackConfig,
  EnrichedAnalyticsPackConfig,
  HybridPackLenses,
  HybridSampleDataset,
  PackId,
  PackLensConfig,
  PackRoleDefinition,
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

  return {
    ...raw,
    category: raw.category || 'Finance & Risk',
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
