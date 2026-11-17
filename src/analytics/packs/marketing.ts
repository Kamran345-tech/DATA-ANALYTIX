import { AnalyticsPackConfig } from './types';
import { sumRole, safeDivVal, safePct, hasValidRoleNumber } from './helpers';

export const marketingPack: AnalyticsPackConfig = {
  id: 'marketing',
  name: 'Marketing & Growth Attribution',
  category: 'Revenue & Growth',
  icon: 'Megaphone',
  description: 'ROAS, CAC, CPL, CTR, conversion rate, ad spend efficiency, MQL generation, and multi-touch revenue attribution.',
  theme: { hue: "magenta-orange", gradientFrom: "var(--pack-3)", gradientTo: "var(--pack-12)" },
  detect: {
    keywords: [
      'ad_spend', 'impressions', 'clicks', 'roas', 'cac', 'cpl', 'cpc', 'ctr',
      'campaign', 'mql', 'attributed_revenue', 'utm_source', 'conversions',
      'ishtihar_kharch', 'muhim_naam', 'naye_leads', 'muhim_amdani', 'dekhne_wale',
    ],
    requiredRoles: ['date', 'spend'],
    optionalRoles: ['channel', 'campaign', 'impressions', 'clicks', 'leads', 'conversions', 'attributed_revenue'],
    roleAliases: {
      date: ['date', 'campaign_date', 'day', 'week', 'month', 'tareekh', 'campaignDate'],
      channel: ['channel', 'utm_source', 'ad_channel', 'platform', 'network', 'zariya', 'utmSource'],
      campaign: ['campaign', 'campaign_name', 'utm_campaign', 'ad_group', 'muhim_naam', 'campaignName'],
      spend: ['spend', 'ad_spend', 'marketing_spend', 'cost', 'media_cost', 'ishtihar_kharch', 'adSpend'],
      impressions: ['impressions', 'views', 'reach', 'ad_impressions', 'dekhne_wale', 'impressionsCount'],
      clicks: ['clicks', 'ad_clicks', 'link_clicks', 'total_clicks', 'totalClicks'],
      leads: ['leads', 'mql', 'mql_leads', 'signups', 'inquiries', 'naye_leads', 'leadsGenerated'],
      conversions: ['conversions', 'customers_acquired', 'new_customers', 'purchases', 'gahaak_bane'],
      attributed_revenue: ['attributed_revenue', 'campaign_revenue', 'roas_revenue', 'attributed_rev', 'muhim_amdani', 'attributedRevenue'],
    },
  },
  taxonomy: {
    dimensions: ['date', 'channel', 'campaign'],
    measures: ['spend', 'impressions', 'clicks', 'leads', 'conversions', 'attributed_revenue'],
  },
  kpis: [
    {
      id: 'total_ad_spend',
      title: 'Total Ad Spend',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['spend'],
      formulaText: 'Total paid media and campaign expenditure across all marketing channels.',
      source: 'Total Ad Spend = Σ(Campaign Spend)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'spend') ? sumRole(rows, r, 'spend') : null),
    },
    {
      id: 'attributed_revenue',
      title: 'Attributed Revenue',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['attributed_revenue'],
      formulaText: 'Total pipeline or closed revenue attributed to marketing campaigns.',
      source: 'Attributed Revenue = Σ(Campaign Attributed Revenue)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'attributed_revenue') ? sumRole(rows, r, 'attributed_revenue') : null),
    },
    {
      id: 'roas',
      title: 'Return on Ad Spend (ROAS)',
      unit: 'ratio',
      favorableDirection: 'up',
      requiredRoles: ['attributed_revenue', 'spend'],
      formulaText: 'Revenue generated per dollar of paid advertising spend.',
      source: 'ROAS = Attributed Revenue / Total Ad Spend',
      formula: (rows, r) => {
        const spend = sumRole(rows, r, 'spend');
        const rev = sumRole(rows, r, 'attributed_revenue');
        if (spend <= 0 || rev < 0) return null;
        return safeDivVal(rev, spend);
      },
      target: 4.0,
    },
    {
      id: 'cac',
      title: 'Customer Acquisition Cost (CAC)',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['spend', 'conversions'],
      formulaText: 'Average marketing spend required to acquire one new paying customer.',
      source: 'CAC = Total Marketing Spend / New Customers Acquired (Conversions)',
      formula: (rows, r) => {
        const conv = sumRole(rows, r, 'conversions');
        const spend = sumRole(rows, r, 'spend');
        if (conv <= 0 || spend < 0) return null;
        return safeDivVal(spend, conv);
      },
      target: 220,
    },
    {
      id: 'cpl',
      title: 'Cost per Lead (CPL)',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['spend', 'leads'],
      formulaText: 'Average ad spend required to generate one Marketing Qualified Lead (MQL).',
      source: 'CPL = Total Ad Spend / Total Leads (MQLs)',
      formula: (rows, r) => {
        const leads = sumRole(rows, r, 'leads');
        const spend = sumRole(rows, r, 'spend');
        if (leads <= 0 || spend < 0) return null;
        return safeDivVal(spend, leads);
      },
      target: 45,
    },
    {
      id: 'cpc',
      title: 'Cost per Click (CPC)',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['spend', 'clicks'],
      formulaText: 'Average price paid for each click on digital advertising campaigns.',
      source: 'CPC = Total Ad Spend / Total Clicks',
      formula: (rows, r) => {
        const clicks = sumRole(rows, r, 'clicks');
        const spend = sumRole(rows, r, 'spend');
        if (clicks <= 0 || spend < 0) return null;
        return safeDivVal(spend, clicks);
      },
    },
    {
      id: 'ctr',
      title: 'Click-Through Rate (CTR %)',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['clicks', 'impressions'],
      formulaText: 'Percentage of ad impressions that resulted in a click.',
      source: 'CTR (%) = (Total Clicks / Total Impressions) × 100',
      formula: (rows, r) => {
        const imp = sumRole(rows, r, 'impressions');
        const clk = sumRole(rows, r, 'clicks');
        if (imp <= 0 || clk < 0 || clk > imp) return null;
        return safePct(clk, imp, { min: 0, max: 100 });
      },
      target: 2.8,
    },
    {
      id: 'lead_to_customer_rate',
      title: 'Lead-to-Customer CVR %',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['conversions', 'leads'],
      formulaText: 'Percentage of marketing leads (MQLs) that convert into paying customers.',
      source: 'Lead-to-Customer CVR (%) = (Conversions / Total Leads) × 100',
      formula: (rows, r) => {
        const leads = sumRole(rows, r, 'leads');
        const conv = sumRole(rows, r, 'conversions');
        if (leads <= 0 || conv < 0 || conv > leads) return null;
        return safePct(conv, leads, { min: 0, max: 100 });
      },
      target: 20,
    },
    {
      id: 'total_leads',
      title: 'Total MQL Leads',
      unit: 'count',
      favorableDirection: 'up',
      requiredRoles: ['leads'],
      formulaText: 'Total count of Marketing Qualified Leads captured across campaigns.',
      source: 'Total Leads = Σ(MQL Leads)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'leads') ? sumRole(rows, r, 'leads') : null),
    },
  ],
  charts: [
    {
      id: 'mkt_spend_rev_trend',
      title: 'Ad Spend vs Attributed Revenue Over Time',
      subtitle: 'Paid media investment and return trajectory across periods',
      intent: 'trend',
      xRole: 'date',
      yRoles: ['spend', 'attributed_revenue'],
      aggregation: 'sum',
    },
    {
      id: 'mkt_channel_ranking',
      title: 'Attributed Revenue & Spend by Channel',
      subtitle: 'Channel efficiency ranking across Paid Search, Social, and Organic',
      intent: 'ranking',
      xRole: 'channel',
      yRoles: ['attributed_revenue', 'spend'],
      aggregation: 'sum',
    },
    {
      id: 'mkt_spend_share',
      title: 'Budget Allocation Share by Channel',
      subtitle: 'Distribution of media spend across acquisition networks',
      intent: 'composition',
      xRole: 'channel',
      yRoles: ['spend'],
      aggregation: 'sum',
    },
    {
      id: 'mkt_campaign_funnel',
      title: 'Leads vs Conversions by Campaign',
      subtitle: 'Funnel conversion output across active campaigns',
      intent: 'comparison',
      xRole: 'campaign',
      yRoles: ['leads', 'conversions'],
      aggregation: 'sum',
    },
    {
      id: 'mkt_high_spend_exceptions',
      title: 'Campaign Spend vs Conversion Exceptions',
      subtitle: 'Identify high-spend campaigns with low customer conversion',
      intent: 'Exception',
      xRole: 'campaign',
      yRoles: ['spend', 'conversions'],
      aggregation: 'sum',
    },
    {
      id: 'mkt_clicks_distribution',
      title: 'Impressions & Clicks by Acquisition Channel',
      subtitle: 'Top-of-funnel reach and engagement distribution',
      intent: 'distribution',
      xRole: 'channel',
      yRoles: ['clicks'],
      aggregation: 'sum',
    },
  ],
  lenses: [
    {
      id: 'exec',
      name: 'Executive',
      description: 'ROAS, CAC, attributed revenue, and total paid media investment',
      kpiIds: ['attributed_revenue', 'roas', 'cac', 'total_ad_spend', 'total_leads'],
      chartIds: ['mkt_spend_rev_trend', 'mkt_channel_ranking', 'mkt_spend_share'],
    },
    {
      id: 'ops',
      name: 'Operations',
      description: 'Funnel mechanics: CPL, CPC, CTR %, and MQL volume',
      kpiIds: ['cpl', 'cpc', 'ctr', 'total_leads', 'lead_to_customer_rate'],
      chartIds: ['mkt_campaign_funnel', 'mkt_clicks_distribution'],
    },
    {
      id: 'Perf',
      name: 'Performance',
      description: 'Campaign conversion efficiency and return on ad spend',
      kpiIds: ['roas', 'lead_to_customer_rate', 'ctr', 'cac'],
      chartIds: ['mkt_channel_ranking', 'mkt_campaign_funnel', 'mkt_spend_rev_trend'],
    },
    {
      id: 'risk',
      name: 'Risk & Exceptions',
      description: 'Wasted ad spend, elevated CAC, and underperforming campaigns',
      kpiIds: ['cac', 'cpl', 'total_ad_spend'],
      chartIds: ['mkt_high_spend_exceptions', 'mkt_spend_share'],
    },
  ],
  reportSections: ['Executive Summary', 'KPI Scorecard', 'Channel ROAS & Attribution Review', 'Funnel Conversion & CAC Audit', 'Recommendations'],
  sampleDataset: {
    name: 'marketing_attribution_2025.csv',
    rows: [
      { date: '2025-01-01', channel: 'Paid Search', campaign: 'Brand_Search_NA', spend: 48000, impressions: 1250000, clicks: 38500, leads: 1420, conversions: 310, attributed_revenue: 215000 },
      { date: '2025-01-01', channel: 'Paid Social', campaign: 'LinkedIn_ABM_Exec', spend: 62000, impressions: 890000, clicks: 19400, leads: 860, conversions: 195, attributed_revenue: 278000 },
      { date: '2025-02-01', channel: 'Organic Search', campaign: 'SEO_Content_Hub', spend: 14000, impressions: 1680000, clicks: 64000, leads: 2150, conversions: 440, attributed_revenue: 312000 },
      { date: '2025-02-01', channel: 'Display / Retargeting', campaign: 'Q1_Cart_Recovery', spend: 29000, impressions: 2100000, clicks: 31500, leads: 680, conversions: 165, attributed_revenue: 118000 },
      { date: '2025-03-01', channel: 'Paid Search', campaign: 'Competitor_Conquest', spend: 54000, impressions: 1420000, clicks: 41200, leads: 1580, conversions: 345, attributed_revenue: 248000 },
      { date: '2025-03-01', channel: 'Partner / Events', campaign: 'Cloud_Summit_2025', spend: 45000, impressions: 420000, clicks: 14800, leads: 920, conversions: 230, attributed_revenue: 295000 },
    ],
  },
};
