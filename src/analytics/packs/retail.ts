import { AnalyticsPackConfig } from './types';
import { sumRole, avgRole, safeDivVal, safePct, hasValidRoleNumber, avgPctRole } from './helpers';

export const retailPack: AnalyticsPackConfig = {
  id: 'retail',
  name: 'Retail & E-Commerce',
  category: 'Revenue & Growth',
  icon: 'ShoppingBag',
  description: 'GMV, basket size, sell-through rate, return rate, store footfall, conversion, markdowns, and inventory turns.',
  theme: { hue: "pink", gradientFrom: "var(--pack-11)", gradientTo: "var(--pack-3)" },
  detect: {
    keywords: [
      'gmv', 'basket_size', 'sell_through', 'return_rate', 'footfall', 'store',
      'sku', 'merchandise', 'markdown', 'cart_abandonment', 'pos_sales', 'units_sold',
      'dukaan', 'bikri_maal', 'wapsi_rate', 'tokri_size', 'dukaan_footfall',
    ],
    requiredRoles: ['date', 'gmv'],
    optionalRoles: ['store', 'category', 'channel', 'orders', 'units_sold', 'returns_usd', 'footfall', 'sell_through_pct', 'markdown_usd', 'on_hand_units'],
    roleAliases: {
      date: ['date', 'sale_date', 'pos_date', 'week', 'month', 'tareekh'],
      store: ['store', 'store_name', 'location', 'branch', 'outlet', 'dukaan', 'store_id'],
      category: ['category', 'department', 'merchandise_category', 'product_line', 'sku_group', 'maal_qism'],
      channel: ['channel', 'fulfillment_channel', 'in_store_online', 'omni_channel', 'zariya'],
      gmv: ['gmv', 'gross_merchandise_value', 'retail_sales', 'pos_sales', 'gross_sales', 'kul_bikri_gmv'],
      orders: ['orders', 'transactions', 'receipts', 'baskets', 'checkouts', 'parchi_count'],
      units_sold: ['units_sold', 'qty_sold', 'items_sold', 'volume_units', 'bika_maal'],
      returns_usd: ['returns_usd', 'refunds', 'returned_value', 'returns', 'wapsi_raqam'],
      footfall: ['footfall', 'store_traffic', 'visitors', 'shoppers', 'gahak_aamad'],
      sell_through_pct: ['sell_through_pct', 'sell_through', 'str_pct', 'bikri_sharah'],
      markdown_usd: ['markdown_usd', 'promo_discount', 'clearance_markdown', 'riayat_raqam'],
      on_hand_units: ['on_hand_units', 'ending_inventory_units', 'stock_units', 'baqi_stock'],
    },
  },
  taxonomy: {
    dimensions: ['date', 'store', 'category', 'channel'],
    measures: ['gmv', 'orders', 'units_sold', 'returns_usd', 'footfall', 'sell_through_pct', 'markdown_usd', 'on_hand_units'],
  },
  kpis: [
    {
      id: 'total_gmv',
      title: 'Gross Merchandise Value (GMV)',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['gmv'],
      formulaText: 'Total gross dollar value of merchandise sold across retail stores and e-commerce.',
      source: 'GMV = Σ(Gross Merchandise Sales Value)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'gmv') ? sumRole(rows, r, 'gmv') : null),
    },
    {
      id: 'net_retail_sales',
      title: 'Net Merchandise Sales',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['gmv', 'returns_usd'],
      formulaText: 'Gross merchandise value minus customer returns and promotional markdowns.',
      source: 'Net Sales = GMV − Returns − Markdowns',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'gmv') || !hasValidRoleNumber(rows, r, 'returns_usd')) return null;
        return sumRole(rows, r, 'gmv') - sumRole(rows, r, 'returns_usd') - sumRole(rows, r, 'markdown_usd');
      },
    },
    {
      id: 'avg_basket_value',
      title: 'Avg Basket Value (AOV)',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['gmv', 'orders'],
      formulaText: 'Average checkout receipt value per customer basket transaction.',
      source: 'Avg Basket Value = Total GMV / Total Orders',
      formula: (rows, r) => safeDivVal(sumRole(rows, r, 'gmv'), sumRole(rows, r, 'orders')),
    },
    {
      id: 'units_per_transaction',
      title: 'Units per Basket (UPT)',
      unit: 'ratio',
      favorableDirection: 'up',
      requiredRoles: ['units_sold', 'orders'],
      formulaText: 'Average number of physical SKU items purchased per checkout basket.',
      source: 'UPT = Total Units Sold / Total Orders',
      formula: (rows, r) => safeDivVal(sumRole(rows, r, 'units_sold'), sumRole(rows, r, 'orders')),
      target: 2.8,
    },
    {
      id: 'return_rate_pct',
      title: 'Return Rate (%)',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['returns_usd', 'gmv'],
      formulaText: 'Percentage of gross merchandise value returned or refunded by shoppers.',
      source: 'Return Rate (%) = (Returned Value / Total GMV) × 100',
      formula: (rows, r) => {
        const gmv = sumRole(rows, r, 'gmv');
        const ret = sumRole(rows, r, 'returns_usd');
        if (gmv <= 0 || ret < 0) return null;
        return safePct(ret, gmv, { min: 0, max: 100 });
      },
      target: 7.5,
    },
    {
      id: 'sell_through_rate',
      title: 'Sell-Through Rate (%)',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['sell_through_pct'],
      formulaText: 'Percentage of received inventory units sold to customers during the period.',
      source: 'Sell-Through Rate (%) = [Units Sold / (Units Sold + On-Hand Ending Inventory)] × 100',
      assumption: 'Computes Units Sold / (Units Sold + On-Hand Units) × 100 when `on_hand_units` is mapped; otherwise averages reported `sell_through_pct`.',
      formula: (rows, r) => {
        if (hasValidRoleNumber(rows, r, 'units_sold') && hasValidRoleNumber(rows, r, 'on_hand_units')) {
          const sold = sumRole(rows, r, 'units_sold');
          const onHand = sumRole(rows, r, 'on_hand_units');
          if (sold >= 0 && onHand >= 0 && sold + onHand > 0) {
            return safePct(sold, sold + onHand, { min: 0, max: 100 });
          }
        }
        return avgPctRole(rows, r, 'sell_through_pct', { max: 100 });
      },
      target: 72,
    },
    {
      id: 'store_conversion_rate',
      title: 'Shopper Conversion Rate',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['orders', 'footfall'],
      formulaText: 'Percentage of store or site visitors who complete a checkout purchase.',
      source: 'Shopper Conversion (%) = (Total Orders / Total Footfall) × 100',
      formula: (rows, r) => {
        const foot = sumRole(rows, r, 'footfall');
        const ord = sumRole(rows, r, 'orders');
        if (foot <= 0 || ord < 0) return null;
        return safePct(ord, foot, { min: 0, max: 100 });
      },
      target: 24,
    },
    {
      id: 'total_units_sold',
      title: 'Total Units Sold',
      unit: 'count',
      favorableDirection: 'up',
      requiredRoles: ['units_sold'],
      formulaText: 'Total count of merchandise units sold across all stores and channels.',
      source: 'Total Units Sold = Σ(Units Sold)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'units_sold') ? sumRole(rows, r, 'units_sold') : null),
    },
    {
      id: 'markdown_rate',
      title: 'Markdown Rate (%)',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['markdown_usd', 'gmv'],
      formulaText: 'Promotional and clearance price reductions as a percentage of GMV.',
      source: 'Markdown Rate (%) = (Total Markdowns / Total GMV) × 100',
      formula: (rows, r) => safePct(sumRole(rows, r, 'markdown_usd'), sumRole(rows, r, 'gmv'), { min: 0, max: 100 }),
      target: 6.0,
    },
  ],
  charts: [
    {
      id: 'ret_gmv_trend',
      title: 'GMV & Returns Over Time',
      subtitle: 'Gross merchandise revenue vs refund volume across periods',
      intent: 'trend',
      xRole: 'date',
      yRoles: ['gmv', 'returns_usd'],
      aggregation: 'sum',
    },
    {
      id: 'ret_store_ranking',
      title: 'GMV & Orders by Store / Outlet',
      subtitle: 'Top performing retail locations ranked by sales volume',
      intent: 'ranking',
      xRole: 'store',
      yRoles: ['gmv', 'orders'],
      aggregation: 'sum',
    },
    {
      id: 'ret_category_share',
      title: 'Sales Mix by Merchandise Category',
      subtitle: 'GMV contribution across product lines',
      intent: 'composition',
      xRole: 'category',
      yRoles: ['gmv'],
      aggregation: 'sum',
    },
    {
      id: 'ret_sellthrough_vs_return',
      title: 'Sell-Through Rate vs Returns by Category',
      subtitle: 'Inventory velocity compared against product return friction',
      intent: 'comparison',
      xRole: 'category',
      yRoles: ['sell_through_pct'],
      aggregation: 'avg',
    },
    {
      id: 'ret_channel_distribution',
      title: 'Omnichannel Footfall & Orders',
      subtitle: 'Traffic and transactions across In-Store, Web, and Mobile App',
      intent: 'distribution',
      xRole: 'channel',
      yRoles: ['footfall', 'orders'],
      aggregation: 'sum',
    },
    {
      id: 'ret_markdown_exceptions',
      title: 'High Return & Markdown Hotspots by Category',
      subtitle: 'Merchandise categories eroding net retail margin',
      intent: 'Exception',
      xRole: 'category',
      yRoles: ['returns_usd', 'markdown_usd'],
      aggregation: 'sum',
    },
  ],
  lenses: [
    {
      id: 'exec',
      name: 'Executive',
      description: 'GMV, net sales, average basket value, and omnichannel mix',
      kpiIds: ['total_gmv', 'net_retail_sales', 'avg_basket_value', 'sell_through_rate', 'return_rate_pct'],
      chartIds: ['ret_gmv_trend', 'ret_store_ranking', 'ret_category_share'],
    },
    {
      id: 'ops',
      name: 'Operations',
      description: 'Store footfall, conversion rate, units per basket, and sell-through',
      kpiIds: ['store_conversion_rate', 'units_per_transaction', 'total_units_sold', 'sell_through_rate'],
      chartIds: ['ret_channel_distribution', 'ret_store_ranking', 'ret_sellthrough_vs_return'],
    },
    {
      id: 'Perf',
      name: 'Performance',
      description: 'Merchandise category velocity, basket expansion, and margin protection',
      kpiIds: ['avg_basket_value', 'units_per_transaction', 'sell_through_rate', 'markdown_rate'],
      chartIds: ['ret_category_share', 'ret_sellthrough_vs_return', 'ret_gmv_trend'],
    },
    {
      id: 'risk',
      name: 'Risk & Exceptions',
      description: 'Excessive product returns, heavy markdowns, and slow-moving stock',
      kpiIds: ['return_rate_pct', 'markdown_rate', 'sell_through_rate'],
      chartIds: ['ret_markdown_exceptions', 'ret_gmv_trend'],
    },
  ],
  reportSections: ['Executive Summary', 'KPI Scorecard', 'Omnichannel & Store Performance', 'Merchandising & Return Rate Audit', 'Recommendations'],
  sampleDataset: {
    name: 'retail_omnichannel_2025.csv',
    rows: [
      { date: '2025-01-01', store: 'NYC Flagship', category: 'Apparel', channel: 'In-Store', gmv: 640000, orders: 4800, units_sold: 14400, returns_usd: 51200, footfall: 18500, sell_through_pct: 74, markdown_usd: 38400 },
      { date: '2025-01-01', store: 'E-Commerce US', category: 'Footwear', channel: 'Web & App', gmv: 890000, orders: 6900, units_sold: 17250, returns_usd: 89000, footfall: 42000, sell_through_pct: 78, markdown_usd: 44500 },
      { date: '2025-02-01', store: 'LA Beverly', category: 'Accessories', channel: 'In-Store', gmv: 470000, orders: 3600, units_sold: 10800, returns_usd: 28200, footfall: 14200, sell_through_pct: 69, markdown_usd: 23500 },
      { date: '2025-02-01', store: 'Chicago Mich Ave', category: 'Outerwear', channel: 'In-Store', gmv: 520000, orders: 3400, units_sold: 8840, returns_usd: 41600, footfall: 13800, sell_through_pct: 71, markdown_usd: 36400 },
      { date: '2025-03-01', store: 'E-Commerce EU', category: 'Apparel', channel: 'Web & App', gmv: 760000, orders: 5800, units_sold: 16240, returns_usd: 68400, footfall: 36500, sell_through_pct: 76, markdown_usd: 45600 },
      { date: '2025-03-01', store: 'NYC Flagship', category: 'Footwear', channel: 'BOPIS / Curbside', gmv: 410000, orders: 2950, units_sold: 8260, returns_usd: 24600, footfall: 9800, sell_through_pct: 81, markdown_usd: 18450 },
    ],
  },
};
