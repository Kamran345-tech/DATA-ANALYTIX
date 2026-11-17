import { AnalyticsPackConfig } from './types';
import { sumRole, avgRole, safeDivVal, safePct, hasValidRoleNumber, avgPctRole } from './helpers';

export const salesPack: AnalyticsPackConfig = {
  id: 'sales',
  name: 'Sales & Pipeline CRM',
  category: 'Revenue & Growth',
  icon: 'Briefcase',
  description: 'Closed-won revenue, win rate, quota attainment, pipeline coverage, average deal size, sales cycle length, and discount rate.',
  theme: { hue: "blue", gradientFrom: "var(--pack-2)", gradientTo: "var(--pack-6)" },
  detect: {
    keywords: [
      'sales_rep', 'quota', 'pipeline_value', 'deals_won', 'win_rate', 'sales_cycle',
      'opportunity', 'closed_won', 'territory', 'acv', 'bookings', 'discount_pct',
      'bikri', 'faroosh', 'hadaf_quota', 'kamyab_deals', 'ilaqa', 'riayat_pct',
    ],
    requiredRoles: ['date', 'revenue'],
    optionalRoles: ['rep', 'region', 'stage', 'quota', 'deals_won', 'opportunities', 'pipeline_value', 'cycle_days', 'discount_pct'],
    roleAliases: {
      date: ['date', 'close_date', 'order_date', 'booking_date', 'month', 'quarter', 'tareekh', 'closeDate'],
      rep: ['rep', 'sales_rep', 'account_executive', 'ae', 'owner', 'seller', 'faroosh_rep', 'accountExecutive'],
      region: ['region', 'territory', 'market', 'geo', 'country', 'ilaqa'],
      stage: ['stage', 'deal_stage', 'funnel_stage', 'status', 'marhala'],
      revenue: ['revenue', 'closed_won', 'sales_revenue', 'bookings', 'acv', 'total_sales', 'total_sales_usd', 'bikri', 'closedWonRevenue'],
      quota: ['quota', 'target', 'sales_quota', 'quota_usd', 'hadaf_quota', 'quotaTarget'],
      deals_won: ['deals_won', 'won_count', 'closed_deals', 'orders', 'kamyab_deals', 'dealsWon'],
      opportunities: ['opportunities', 'total_opps', 'leads_qualified', 'deals_total', 'kul_opportunities', 'totalOpportunities'],
      pipeline_value: ['pipeline_value', 'open_pipeline', 'pipeline', 'weighted_pipeline', 'pipeline_usd', 'pipelineValue'],
      cycle_days: ['cycle_days', 'sales_cycle_days', 'days_to_close', 'sales_cycle', 'salesCycleDays'],
      discount_pct: ['discount_pct', 'discount_rate', 'discount', 'avg_discount', 'riayat_pct'],
    },
  },
  taxonomy: {
    dimensions: ['date', 'rep', 'region', 'stage'],
    measures: ['revenue', 'quota', 'deals_won', 'opportunities', 'pipeline_value', 'cycle_days', 'discount_pct'],
  },
  kpis: [
    {
      id: 'closed_won_revenue',
      title: 'Closed-Won Revenue',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['revenue'],
      formulaText: 'Total recognized bookings or closed-won sales revenue across the period.',
      source: 'Closed-Won Revenue = Σ(Closed-Won Bookings)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'revenue') ? sumRole(rows, r, 'revenue') : null),
    },
    {
      id: 'quota_attainment',
      title: 'Quota Attainment %',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['revenue', 'quota'],
      formulaText: 'Percentage of assigned sales quota achieved by closed-won revenue.',
      source: 'Quota Attainment (%) = (Closed-Won Revenue / Assigned Quota) × 100',
      formula: (rows, r) => {
        const q = sumRole(rows, r, 'quota');
        const rev = sumRole(rows, r, 'revenue');
        if (q <= 0 || rev < 0) return null;
        return safePct(rev, q, { min: 0, max: 500 });
      },
      target: 100,
    },
    {
      id: 'win_rate',
      title: 'Deal Win Rate %',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['deals_won', 'opportunities'],
      formulaText: 'Percentage of qualified sales opportunities that convert into closed-won deals.',
      source: 'Win Rate (%) = (Deals Won / Total Opportunities) × 100',
      formula: (rows, r) => {
        const opps = sumRole(rows, r, 'opportunities');
        const won = sumRole(rows, r, 'deals_won');
        if (opps <= 0 || won < 0 || won > opps) return null;
        return safePct(won, opps, { min: 0, max: 100 });
      },
      target: 28,
    },
    {
      id: 'avg_deal_size',
      title: 'Avg Deal Size (ACV)',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['revenue', 'deals_won'],
      formulaText: 'Average contract value per closed-won deal.',
      source: 'Avg Deal Size = Closed-Won Revenue / Deals Won',
      formula: (rows, r) => safeDivVal(sumRole(rows, r, 'revenue'), sumRole(rows, r, 'deals_won')),
    },
    {
      id: 'pipeline_coverage',
      title: 'Pipeline Coverage Ratio',
      unit: 'ratio',
      favorableDirection: 'up',
      requiredRoles: ['pipeline_value', 'quota'],
      formulaText: 'Ratio of open sales pipeline value to target quota.',
      source: 'Pipeline Coverage = Open Pipeline Value / Target Quota',
      formula: (rows, r) => {
        const q = sumRole(rows, r, 'quota');
        const pipe = sumRole(rows, r, 'pipeline_value');
        if (q <= 0 || pipe < 0) return null;
        return safeDivVal(pipe, q);
      },
      target: 3.0,
    },
    {
      id: 'open_pipeline_total',
      title: 'Total Open Pipeline',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['pipeline_value'],
      formulaText: 'Total dollar value of active opportunities currently in the sales funnel.',
      source: 'Total Open Pipeline = Σ(Open Pipeline Value)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'pipeline_value') ? sumRole(rows, r, 'pipeline_value') : null),
    },
    {
      id: 'total_deals_won',
      title: 'Deals Closed Won',
      unit: 'count',
      favorableDirection: 'up',
      requiredRoles: ['deals_won'],
      formulaText: 'Total count of customer contracts signed in the period.',
      source: 'Deals Closed Won = Σ(Deals Won)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'deals_won') ? sumRole(rows, r, 'deals_won') : null),
    },
    {
      id: 'avg_sales_cycle',
      title: 'Avg Sales Cycle (Days)',
      unit: 'days',
      favorableDirection: 'down',
      requiredRoles: ['cycle_days'],
      formulaText: 'Average calendar days elapsed from opportunity creation to closed-won signature.',
      source: 'Avg Sales Cycle = Average(Close Date − Created Date in Days)',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'cycle_days')) return null;
        const val = avgRole(rows, r, 'cycle_days');
        return val >= 0 ? val : null;
      },
      target: 35,
    },
    {
      id: 'avg_discount_rate',
      title: 'Avg Discount Rate %',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['discount_pct'],
      formulaText: 'Average percentage discount granted off list price on closed deals.',
      source: 'Avg Discount Rate (%) = Average((List Price − Net Price) / List Price × 100)',
      formula: (rows, r) => avgPctRole(rows, r, 'discount_pct', { max: 100 }),
      target: 8.0,
    },
  ],
  charts: [
    {
      id: 'sales_bookings_trend',
      title: 'Closed-Won Bookings vs Quota Over Time',
      subtitle: 'Monthly revenue attainment against target quota',
      intent: 'trend',
      xRole: 'date',
      yRoles: ['revenue', 'quota'],
      aggregation: 'sum',
    },
    {
      id: 'sales_rep_leaderboard',
      title: 'Account Executive Bookings Leaderboard',
      subtitle: 'Closed-won revenue and quota by sales representative',
      intent: 'ranking',
      xRole: 'rep',
      yRoles: ['revenue', 'quota'],
      aggregation: 'sum',
    },
    {
      id: 'sales_region_share',
      title: 'Bookings Share by Territory / Region',
      subtitle: 'Geographic distribution of closed-won sales',
      intent: 'composition',
      xRole: 'region',
      yRoles: ['revenue'],
      aggregation: 'sum',
    },
    {
      id: 'sales_pipeline_vs_won',
      title: 'Open Pipeline vs Closed-Won by Territory',
      subtitle: 'Pipeline coverage and conversion across markets',
      intent: 'comparison',
      xRole: 'region',
      yRoles: ['pipeline_value', 'revenue'],
      aggregation: 'sum',
    },
    {
      id: 'sales_cycle_discount',
      title: 'Sales Cycle Length & Discount Rate by Rep',
      subtitle: 'Deal velocity and pricing discipline exceptions',
      intent: 'Exception',
      xRole: 'rep',
      yRoles: ['cycle_days', 'discount_pct'],
      aggregation: 'avg',
    },
    {
      id: 'sales_deals_distribution',
      title: 'Deals Won vs Total Opportunities by Rep',
      subtitle: 'Opportunity conversion volume across the sales team',
      intent: 'distribution',
      xRole: 'rep',
      yRoles: ['opportunities', 'deals_won'],
      aggregation: 'sum',
    },
  ],
  lenses: [
    {
      id: 'exec',
      name: 'Executive',
      description: 'Top-line bookings, quota attainment, pipeline coverage, and win rate',
      kpiIds: ['closed_won_revenue', 'quota_attainment', 'pipeline_coverage', 'win_rate', 'avg_deal_size'],
      chartIds: ['sales_bookings_trend', 'sales_rep_leaderboard', 'sales_region_share'],
    },
    {
      id: 'ops',
      name: 'Operations',
      description: 'Pipeline generation, sales cycle velocity, and opportunity conversion',
      kpiIds: ['open_pipeline_total', 'avg_sales_cycle', 'total_deals_won', 'win_rate'],
      chartIds: ['sales_pipeline_vs_won', 'sales_deals_distribution', 'sales_cycle_discount'],
    },
    {
      id: 'Perf',
      name: 'Performance',
      description: 'Rep quota attainment, average deal size, and pricing discipline',
      kpiIds: ['quota_attainment', 'avg_deal_size', 'win_rate', 'avg_discount_rate'],
      chartIds: ['sales_rep_leaderboard', 'sales_bookings_trend'],
    },
    {
      id: 'risk',
      name: 'Risk & Exceptions',
      description: 'Pipeline coverage gaps, stalled sales cycles, and excessive discounting',
      kpiIds: ['pipeline_coverage', 'avg_sales_cycle', 'avg_discount_rate'],
      chartIds: ['sales_cycle_discount', 'sales_pipeline_vs_won'],
    },
  ],
  reportSections: ['Executive Summary', 'KPI Scorecard', 'Quota & Territory Performance', 'Pipeline Coverage & Deal Velocity Audit', 'Recommendations'],
  sampleDataset: {
    name: 'crm_sales_pipeline_2025.csv',
    rows: [
      { date: '2025-01-01', rep: 'Sarah Chen', region: 'NA West', stage: 'Closed Won', revenue: 420000, quota: 380000, deals_won: 14, opportunities: 44, pipeline_value: 1260000, cycle_days: 32, discount_pct: 6.5 },
      { date: '2025-01-01', rep: 'Marcus Vance', region: 'EMEA North', stage: 'Closed Won', revenue: 310000, quota: 320000, deals_won: 11, opportunities: 42, pipeline_value: 980000, cycle_days: 41, discount_pct: 8.8 },
      { date: '2025-02-01', rep: 'Elena Rostova', region: 'APAC', stage: 'Closed Won', revenue: 295000, quota: 280000, deals_won: 16, opportunities: 50, pipeline_value: 910000, cycle_days: 28, discount_pct: 5.4 },
      { date: '2025-02-01', rep: 'Devon Brooks', region: 'NA East', stage: 'Closed Won', revenue: 465000, quota: 400000, deals_won: 15, opportunities: 48, pipeline_value: 1420000, cycle_days: 35, discount_pct: 7.2 },
      { date: '2025-03-01', rep: 'Sarah Chen', region: 'NA West', stage: 'Closed Won', revenue: 490000, quota: 410000, deals_won: 17, opportunities: 52, pipeline_value: 1510000, cycle_days: 30, discount_pct: 6.0 },
      { date: '2025-03-01', rep: 'Liam O’Connor', region: 'EMEA South', stage: 'Closed Won', revenue: 355000, quota: 340000, deals_won: 13, opportunities: 45, pipeline_value: 1080000, cycle_days: 37, discount_pct: 7.9 },
    ],
  },
};
