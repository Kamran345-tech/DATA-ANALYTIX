import { AnalyticsPackConfig } from './types';
import { sumRole, avgRole, safeDivVal, safePct, hasValidRoleNumber } from './helpers';

export const customerPack: AnalyticsPackConfig = {
  id: 'customer',
  name: 'Customer Success & Retention',
  category: 'Revenue & Growth',
  icon: 'Users',
  description: 'Logo churn, Gross/Net Dollar Retention (GRR/NDR), Customer Lifetime Value (CLV), ARPU, NPS, expansion MRR, and support tickets.',
  theme: { hue: "violet", gradientFrom: "var(--pack-4)", gradientTo: "var(--pack-5)" },
  detect: {
    keywords: [
      'active_customers', 'churned_customers', 'mrr', 'arr', 'expansion_mrr', 'contraction_mrr',
      'clv', 'ltv', 'nps', 'csat', 'retention_rate', 'churn_rate', 'cohort',
      'faal_gahak', 'chorne_wale_gahak', 'mahana_amdani', 'izafi_mrr', 'shikayat_tickets',
    ],
    requiredRoles: ['date', 'active_customers'],
    optionalRoles: ['segment', 'cohort', 'churned_customers', 'mrr', 'expansion_mrr', 'contraction_mrr', 'nps', 'clv', 'support_tickets'],
    roleAliases: {
      date: ['date', 'cohort_date', 'month', 'period', 'tareekh', 'cohortMonth'],
      segment: ['segment', 'customer_tier', 'plan', 'account_tier', 'gahak_darja', 'customerSegment'],
      cohort: ['cohort', 'signup_cohort', 'vintage', 'join_quarter'],
      active_customers: ['active_customers', 'customers', 'total_accounts', 'subscribers', 'faal_gahak', 'activeCustomers'],
      churned_customers: ['churned_customers', 'lost_customers', 'cancellations', 'churn_count', 'chorne_wale_gahak', 'churnedCustomers'],
      mrr: ['mrr', 'monthly_recurring_revenue', 'recurring_revenue', 'arr', 'mahana_amdani', 'monthlyRecurringRevenue'],
      expansion_mrr: ['expansion_mrr', 'upsell_mrr', 'expansion_revenue', 'izafi_mrr', 'expansionMrr'],
      contraction_mrr: ['contraction_mrr', 'downgrade_mrr', 'churned_mrr', 'kami_mrr', 'contractionMrr'],
      nps: ['nps', 'nps_score', 'net_promoter_score', 'csat', 'npsScore'],
      clv: ['clv', 'ltv', 'customer_lifetime_value', 'lifetime_value', 'ltvEstimate'],
      support_tickets: ['support_tickets', 'tickets', 'cases', 'escalations', 'shikayat_tickets'],
    },
  },
  taxonomy: {
    dimensions: ['date', 'segment', 'cohort'],
    measures: ['active_customers', 'churned_customers', 'mrr', 'expansion_mrr', 'contraction_mrr', 'nps', 'clv', 'support_tickets'],
  },
  kpis: [
    {
      id: 'total_active_customers',
      title: 'Active Customers',
      unit: 'count',
      favorableDirection: 'up',
      requiredRoles: ['active_customers'],
      formulaText: 'Total active paying customer accounts across all subscription tiers.',
      source: 'Active Customers = Σ(Active Customer Accounts)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'active_customers') ? sumRole(rows, r, 'active_customers') : null),
    },
    {
      id: 'logo_churn_rate',
      title: 'Logo Churn Rate %',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['churned_customers', 'active_customers'],
      formulaText: 'Percentage of active customers who canceled their subscription during the period.',
      source: 'Logo Churn (%) = (Churned Customers / Starting Active Customers) × 100',
      formula: (rows, r) => {
        const act = sumRole(rows, r, 'active_customers');
        const ch = sumRole(rows, r, 'churned_customers');
        if (act <= 0 || ch < 0 || ch > act) return null;
        return safePct(ch, act, { min: 0, max: 100 });
      },
      target: 3.0,
    },
    {
      id: 'gross_retention_rate',
      title: 'Customer Retention Rate %',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['churned_customers', 'active_customers'],
      formulaText: 'Percentage of existing customer accounts retained over the period (100% − Logo Churn %).',
      source: 'Customer Retention (%) = [(Active Customers − Churned Customers) / Active Customers] × 100',
      formula: (rows, r) => {
        const act = sumRole(rows, r, 'active_customers');
        const ch = sumRole(rows, r, 'churned_customers');
        if (act <= 0 || ch < 0 || ch > act) return null;
        return Number((100 - (ch / act) * 100).toFixed(2));
      },
      target: 97.0,
    },
    {
      id: 'total_mrr',
      title: 'Monthly Recurring Revenue (MRR)',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['mrr'],
      formulaText: 'Total predictable monthly recurring subscription revenue.',
      source: 'MRR = Σ(Monthly Recurring Revenue)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'mrr') ? sumRole(rows, r, 'mrr') : null),
    },
    {
      id: 'net_dollar_retention',
      title: 'Net Dollar Retention (NDR %)',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['mrr', 'expansion_mrr', 'contraction_mrr'],
      formulaText: 'Recurring revenue retained from existing customers including upsells/expansions minus downgrades/churn.',
      source: 'NDR (%) = [(Starting MRR + Expansion MRR − Contraction MRR) / Starting MRR] × 100',
      formula: (rows, r) => {
        const mrr = sumRole(rows, r, 'mrr');
        if (mrr <= 0) return null;
        const exp = sumRole(rows, r, 'expansion_mrr');
        const con = sumRole(rows, r, 'contraction_mrr');
        if (exp < 0 || con < 0) return null;
        return safePct(mrr + exp - con, mrr, { min: 0, max: 300 });
      },
      target: 112,
    },
    {
      id: 'arpu',
      title: 'Avg Revenue per Account (ARPU)',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['mrr', 'active_customers'],
      formulaText: 'Average monthly recurring revenue generated per active customer account.',
      source: 'ARPU = Total MRR / Active Customers',
      formula: (rows, r) => safeDivVal(sumRole(rows, r, 'mrr'), sumRole(rows, r, 'active_customers')),
    },
    {
      id: 'avg_clv',
      title: 'Customer Lifetime Value (CLV)',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['clv'],
      formulaText: 'Expected total net revenue a customer account generates over its entire relationship.',
      source: 'CLV = Average(ARPU × Gross Margin / Churn Rate)',
      assumption: 'Averages reported cohort `clv` values when mapped; ignores negative or null records.',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'clv')) return null;
        const val = avgRole(rows, r, 'clv');
        return val > 0 ? val : null;
      },
    },
    {
      id: 'avg_nps',
      title: 'Net Promoter Score (NPS)',
      unit: 'score',
      favorableDirection: 'up',
      requiredRoles: ['nps'],
      formulaText: 'Customer loyalty score measuring likelihood to recommend (-100 to +100).',
      source: 'NPS = % Promoters (9–10) − % Detractors (0–6)',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'nps')) return null;
        const val = avgRole(rows, r, 'nps');
        return val >= -100 && val <= 100 ? val : null;
      },
      target: 55,
    },
    {
      id: 'net_expansion_mrr',
      title: 'Net Expansion MRR',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['expansion_mrr', 'contraction_mrr'],
      formulaText: 'Net recurring revenue added from existing accounts (Expansion MRR minus Contraction MRR).',
      source: 'Net Expansion MRR = Expansion MRR − Contraction MRR',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'expansion_mrr') || !hasValidRoleNumber(rows, r, 'contraction_mrr')) return null;
        return sumRole(rows, r, 'expansion_mrr') - sumRole(rows, r, 'contraction_mrr');
      },
    },
  ],
  charts: [
    {
      id: 'cust_mrr_trend',
      title: 'MRR & Expansion Revenue Over Time',
      subtitle: 'Recurring revenue growth and expansion momentum across periods',
      intent: 'trend',
      xRole: 'date',
      yRoles: ['mrr', 'expansion_mrr'],
      aggregation: 'sum',
    },
    {
      id: 'cust_segment_ranking',
      title: 'MRR & Active Accounts by Customer Tier',
      subtitle: 'Revenue concentration across Enterprise, Mid-Market, and SMB',
      intent: 'ranking',
      xRole: 'segment',
      yRoles: ['mrr', 'active_customers'],
      aggregation: 'sum',
    },
    {
      id: 'cust_tier_share',
      title: 'Recurring Revenue Share by Segment',
      subtitle: 'Proportion of MRR contributed by each customer tier',
      intent: 'composition',
      xRole: 'segment',
      yRoles: ['mrr'],
      aggregation: 'sum',
    },
    {
      id: 'cust_exp_vs_con',
      title: 'Expansion vs Contraction MRR by Segment',
      subtitle: 'Upsell velocity compared against downgrade and churn leakage',
      intent: 'comparison',
      xRole: 'segment',
      yRoles: ['expansion_mrr', 'contraction_mrr'],
      aggregation: 'sum',
    },
    {
      id: 'cust_churn_exceptions',
      title: 'Churned Customers & Support Escalations by Segment',
      subtitle: 'Identify high-friction cohorts with elevated account churn',
      intent: 'Exception',
      xRole: 'segment',
      yRoles: ['churned_customers', 'support_tickets'],
      aggregation: 'sum',
    },
    {
      id: 'cust_clv_distribution',
      title: 'Average CLV & NPS by Customer Segment',
      subtitle: 'Long-term account value and satisfaction across tiers',
      intent: 'distribution',
      xRole: 'segment',
      yRoles: ['clv', 'nps'],
      aggregation: 'avg',
    },
  ],
  lenses: [
    {
      id: 'exec',
      name: 'Executive',
      description: 'Total MRR, Net Dollar Retention (NDR %), CLV, and active customer base',
      kpiIds: ['total_mrr', 'net_dollar_retention', 'gross_retention_rate', 'avg_clv', 'total_active_customers'],
      chartIds: ['cust_mrr_trend', 'cust_segment_ranking', 'cust_tier_share'],
    },
    {
      id: 'ops',
      name: 'Operations',
      description: 'Account expansion vs contraction, support ticket load, and NPS',
      kpiIds: ['net_expansion_mrr', 'avg_nps', 'arpu', 'logo_churn_rate'],
      chartIds: ['cust_exp_vs_con', 'cust_churn_exceptions'],
    },
    {
      id: 'Perf',
      name: 'Performance',
      description: 'Cohort lifetime value, ARPU expansion, and net dollar retention',
      kpiIds: ['net_dollar_retention', 'arpu', 'avg_clv', 'avg_nps'],
      chartIds: ['cust_clv_distribution', 'cust_exp_vs_con', 'cust_mrr_trend'],
    },
    {
      id: 'risk',
      name: 'Risk & Exceptions',
      description: 'Logo churn spikes, contraction MRR leakage, and detractor segments',
      kpiIds: ['logo_churn_rate', 'gross_retention_rate', 'avg_nps'],
      chartIds: ['cust_churn_exceptions', 'cust_exp_vs_con'],
    },
  ],
  reportSections: ['Executive Summary', 'KPI Scorecard', 'Net Dollar Retention & Expansion Review', 'Cohort Churn & NPS Risk Audit', 'Recommendations'],
  sampleDataset: {
    name: 'customer_retention_cohorts_2025.csv',
    rows: [
      { date: '2025-01-01', segment: 'Enterprise', cohort: '2024-Q1', active_customers: 420, churned_customers: 6, mrr: 840000, expansion_mrr: 92000, contraction_mrr: 18000, nps: 64, clv: 48000, support_tickets: 85 },
      { date: '2025-01-01', segment: 'Mid-Market', cohort: '2024-Q2', active_customers: 1280, churned_customers: 38, mrr: 640000, expansion_mrr: 54000, contraction_mrr: 22000, nps: 51, clv: 19500, support_tickets: 310 },
      { date: '2025-02-01', segment: 'Enterprise', cohort: '2024-Q1', active_customers: 445, churned_customers: 5, mrr: 912000, expansion_mrr: 108000, contraction_mrr: 15000, nps: 67, clv: 51000, support_tickets: 78 },
      { date: '2025-02-01', segment: 'SMB', cohort: '2024-Q3', active_customers: 3400, churned_customers: 170, mrr: 510000, expansion_mrr: 31000, contraction_mrr: 29000, nps: 42, clv: 6800, support_tickets: 740 },
      { date: '2025-03-01', segment: 'Enterprise', cohort: '2024-Q2', active_customers: 470, churned_customers: 4, mrr: 985000, expansion_mrr: 124000, contraction_mrr: 14000, nps: 69, clv: 54000, support_tickets: 72 },
      { date: '2025-03-01', segment: 'Mid-Market', cohort: '2024-Q3', active_customers: 1350, churned_customers: 34, mrr: 702000, expansion_mrr: 64000, contraction_mrr: 19000, nps: 55, clv: 21200, support_tickets: 290 },
    ],
  },
};
