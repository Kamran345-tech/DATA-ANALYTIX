import { AnalyticsPackConfig, PackId } from './types';
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

/**
 * Single source-of-truth registry for all Analytics Packs.
 * Adding a 15th pack requires only creating its config file and adding it to ANALYTICS_PACKS.
 */
export const ANALYTICS_PACKS: AnalyticsPackConfig[] = [
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

export const ANALYTICS_PACK_MAP: Record<string, AnalyticsPackConfig> = Object.fromEntries(
  ANALYTICS_PACKS.map((p) => [p.id, p])
);

export function getPackById(packId?: string | PackId | null): AnalyticsPackConfig {
  if (packId && ANALYTICS_PACK_MAP[packId]) {
    return ANALYTICS_PACK_MAP[packId];
  }
  return financialPack;
}
