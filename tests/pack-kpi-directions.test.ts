import { describe, it, expect } from 'vitest';
import {
  ANALYTICS_PACKS,
  evaluateKpiDelta,
  getKpiAssumptionDetails,
  PackId,
} from '../src/analytics';
import { buildPresentationSlides } from '../src/engine/pptxGenerator';

const EXPECTED_DOWN_KPIS_BY_PACK: Record<PackId, string[]> = {
  financial: ['fin_debt_to_equity', 'fin_dso_days'],
  sales: ['avg_sales_cycle', 'avg_discount_rate'],
  marketing: ['total_ad_spend', 'cac', 'cpl', 'cpc'],
  customer: ['logo_churn_rate'],
  product: ['avg_api_latency', 'crash_rate'],
  web: ['bounce_rate', 'avg_lcp_ms'],
  operations: ['avg_lead_time', 'backorder_rate', 'cost_per_shipment', 'total_logistics_cost'],
  hr: ['attrition_rate', 'total_leavers', 'time_to_hire', 'cost_per_employee'],
  'risk-fraud': [
    'fraud_rate_pct',
    'false_positive_rate',
    'gross_fraud_loss',
    'loss_to_volume_pct',
    'alert_trigger_rate',
    'total_flagged_alerts',
    'avg_risk_score',
  ],
  healthcare: [
    'readmission_rate',
    'avg_alos',
    'er_wait_time',
    'cost_per_admission',
    'total_clinical_cost',
    'total_readmissions',
  ],
  retail: ['return_rate_pct', 'markdown_rate'],
  manufacturing: [
    'scrap_rate',
    'total_downtime',
    'unit_production_cost',
    'avg_cycle_time',
    'total_scrap_units',
    'total_plant_cost',
  ],
  'banking-insurance': ['loan_to_deposit_ratio', 'npl_ratio', 'claims_loss_ratio', 'npl_exposure_usd'],
  education: ['dropout_rate', 'cost_per_student'],
};

describe('Part A1 & A4: Per-Pack KPI Favorable Direction, Domain Assumptions & Slide 11 Non-Truncated Recommendations', () => {
  for (const pack of ANALYTICS_PACKS) {
    it(`[Pack: ${pack.id}] configures real titles, 'down' favorableDirection on lower-is-better KPIs, real assumptions, and non-truncated Slide 11 actions`, () => {
      const expectedDown = EXPECTED_DOWN_KPIS_BY_PACK[pack.id] || [];
      expect(expectedDown.length).toBeGreaterThan(0);

      for (const kpi of pack.kpis) {
        expect(kpi.title).toBeTruthy();
        expect(kpi.title).not.toBe('undefined');
        expect(['up', 'down']).toContain(kpi.favorableDirection);

        if (expectedDown.includes(kpi.id)) {
          expect(kpi.favorableDirection).toBe('down');
          // Verify negative delta is favorable (green) when favorableDirection is 'down'
          const deltaEval = evaluateKpiDelta(-4.2, kpi.favorableDirection);
          expect(deltaEval.isFavorable).toBe(true);
          expect(deltaEval.colorToken).toBe('var(--success)');
        } else {
          expect(kpi.favorableDirection).toBe('up');
          const deltaEval = evaluateKpiDelta(4.2, kpi.favorableDirection);
          expect(deltaEval.isFavorable).toBe(true);
          expect(deltaEval.colorToken).toBe('var(--success)');
        }

        const details = getKpiAssumptionDetails(pack, kpi);
        expect(details.assumption.length).toBeGreaterThan(25);
        expect(details.assumption).not.toContain('Direct column aggregation');
        expect(kpi.assumption).toBeTruthy();
      }

      // Verify at least one ambiguous KPI per pack is marked REVIEW with a domain-expert question
      const reviewCount = pack.kpis.filter((k) => Boolean(getKpiAssumptionDetails(pack, k).reviewQuestion)).length;
      expect(reviewCount).toBeGreaterThan(0);

      // Part A4: Verify Slide 11 ("5 Recommended Leadership Actions") never ends bullets with "..." or "…"
      const rows = pack.sampleDataset();
      const slides = buildPresentationSlides({
        datasetName: pack.name,
        scope: 'pack',
        packId: pack.id,
        rows,
        columns: [],
      });
      const recSlide = slides.find((s) => s.kind === 'recommendations');
      expect(recSlide).toBeDefined();
      for (const bullet of recSlide!.bullets) {
        expect(bullet.endsWith('...')).toBe(false);
        expect(bullet.endsWith('…')).toBe(false);
        expect(bullet).toContain('Owner:');
        expect(bullet).toContain('Impact:');
      }
    });
  }
});
