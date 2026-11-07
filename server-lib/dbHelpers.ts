/**
 * Database schema and simulation helpers for live-data endpoints.
 * Shared across server.ts and Vercel serverless functions.
 */

export function getSuggestedTablesForDb(serverType: string = 'postgres', database: string = ''): string[] {
  switch (serverType.toLowerCase()) {
    case 'postgres':
    case 'postgresql':
      return ['orders', 'order_items', 'customers', 'product_catalog', 'inventory_snapshots', 'daily_revenue_facts'];
    case 'mysql':
    case 'aurora':
      return ['subscriptions', 'invoices', 'users', 'payment_attempts', 'mrr_movements', 'churn_events'];
    case 'mssql':
    case 'sqlserver':
      return ['FactSalesQuota', 'DimAccount', 'DimGeography', 'DimProductSubcategory', 'FactInternetSales'];
    case 'mongodb':
      return ['telemetry_pings', 'device_metrics', 'fleet_routes', 'sensor_alerts', 'battery_status'];
    case 'snowflake':
      return ['CAMPAIGN_ATTRIBUTION_FACTS', 'WEB_TRAFFIC_SESSIONS', 'CONVERSIONS', 'AD_SPEND_DIM', 'CUSTOMER_LTV'];
    case 'oracle':
      return ['GL_LEDGER_ENTRIES', 'AP_INVOICES_ALL', 'AR_RECEIVABLES_DAILY', 'HR_EMPLOYEE_HEADCOUNT'];
    default:
      return ['live_transactions', 'customers', 'metrics_log', 'analytics_events'];
  }
}

export function generateLiveDatabaseStream(
  serverType: string,
  tableName: string,
  query?: string,
  limit: number = 100
): Record<string, any>[] {
  const count = Math.min(Math.max(limit, 10), 500);
  const rows: Record<string, any>[] = [];
  const now = Date.now();

  const regions = ['North America', 'EMEA', 'Asia Pacific', 'Latin America'];
  const categories = ['Enterprise Software', 'Hardware Appliances', 'Cloud Compute', 'Cybersecurity', 'Professional Services'];
  const channels = ['Direct Enterprise', 'Channel Reseller', 'Self-Serve Inbound', 'Partner Marketplace'];
  const statuses = ['Completed', 'Completed', 'Completed', 'Processing', 'Flagged for Review'];
  const paymentMethods = ['Corporate Wire', 'ACH Direct', 'Credit Card', 'Purchase Order 30-Net'];

  for (let i = 1; i <= count; i++) {
    const ageSeconds = (count - i) * (Math.floor(Math.random() * 45) + 15);
    const eventTime = new Date(now - ageSeconds * 1000).toISOString();
    const dateFormatted = eventTime.split('T')[0];

    const category = categories[Math.floor(Math.random() * categories.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    const units = Math.floor(Math.random() * 25) + 1;
    const basePrice = Math.floor(Math.random() * 450) + 120;
    const revenue = Math.round(units * basePrice * (1 + (Math.random() * 0.2 - 0.1)) * 100) / 100;
    const discount = Math.random() > 0.6 ? Math.round(revenue * (Math.random() * 0.15) * 100) / 100 : 0;
    const netRevenue = Math.round((revenue - discount) * 100) / 100;
    const marginRate = 0.42 + (Math.random() * 0.35);
    const grossProfit = Math.round(netRevenue * marginRate * 100) / 100;
    const marginPercent = Math.round((grossProfit / netRevenue) * 1000) / 10;

    const row: Record<string, any> = {
      transaction_id: `TXN-${100000 + i}`,
      timestamp: eventTime,
      date: dateFormatted,
      server_node: `${serverType}-demo-0${(i % 3) + 1}`,
      region,
      category,
      sales_channel: channel,
      units_sold: units,
      gross_revenue: revenue,
      discount_amount: discount,
      net_revenue: netRevenue,
      gross_profit: grossProfit,
      margin_percent: marginPercent,
      payment_method: paymentMethod,
      order_status: status,
      customer_tier: i % 4 === 0 ? 'Enterprise VIP' : i % 2 === 0 ? 'Mid-Market' : 'Growth Tier'
    };

    rows.push(row);
  }

  return rows;
}
