export interface DemoDatasetInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  rowsCount: number;
  fileName: string;
  generateData: () => Record<string, any>[];
}

export const DEMO_DATASETS: DemoDatasetInfo[] = [
  {
    id: 'global-retail-sales',
    name: 'Global Enterprise Omnichannel Sales [DEMO DATA]',
    description: 'Realistic multinational B2B/B2C retail dataset covering OrderDate, Region, Segment, Product, Revenue, Cost, Profit, Units, and Target.',
    category: 'Sales & Retail',
    rowsCount: 120,
    fileName: 'global_retail_sales_demo.csv',
    generateData: () => {
      const regions = ['North America', 'EMEA', 'APAC', 'LATAM'];
      const segments = ['Enterprise', 'Mid-Market', 'Consumer', 'Government'];
      const categories = ['Cloud Infrastructure', 'AI Copilot Seats', 'Data Warehousing', 'Security Suite', 'Consulting & Implementation'];
      const countries = ['United States', 'Germany', 'Japan', 'United Kingdom', 'Singapore', 'Canada', 'Australia', 'Brazil'];

      const rows: Record<string, any>[] = [];
      const baseDate = new Date(2025, 0, 15);

      for (let i = 1; i <= 120; i++) {
        const dateObj = new Date(baseDate.getTime() + (i * 2.5 * 24 * 60 * 60 * 1000));
        const dateStr = dateObj.toISOString().split('T')[0];
        const region = regions[i % regions.length];
        const segment = segments[(i * 3) % segments.length];
        const category = categories[(i * 2) % categories.length];
        const country = countries[(i * 5) % countries.length];

        const units = Math.floor(10 + ((i * 17) % 85));
        const unitPrice = 120 + ((i * 37) % 450);
        const revenue = Math.round(units * unitPrice);
        const costMultiplier = 0.52 + ((i % 10) * 0.02);
        const cost = Math.round(revenue * costMultiplier);
        const profit = revenue - cost;
        const target = Math.round(revenue * (0.92 + ((i % 7) * 0.03)));

        rows.push({
          OrderId: `ORD-2025-${(1000 + i).toString()}`,
          OrderDate: dateStr,
          Region: region,
          Country: country,
          CustomerSegment: segment,
          ProductCategory: category,
          UnitsSold: units,
          UnitPrice: unitPrice,
          Revenue: revenue,
          Cost: cost,
          Profit: profit,
          Target: target
        });
      }
      return rows;
    }
  },
  {
    id: 'saas-churn-mrr',
    name: 'B2B SaaS Growth, MRR & Churn [DEMO DATA]',
    description: 'Subscription metrics tracking CustomerId, Plan, MRR, ChurnStatus, CAC, NPS Score, and SupportTickets.',
    category: 'SaaS & Subscriptions',
    rowsCount: 100,
    fileName: 'b2b_saas_metrics_demo.csv',
    generateData: () => {
      const plans = ['Starter', 'Professional', 'Enterprise', 'Scale'];
      const statuses = ['Active', 'Active', 'Active', 'Active', 'Churned'];
      const rows: Record<string, any>[] = [];
      const baseDate = new Date(2025, 1, 1);

      for (let i = 1; i <= 100; i++) {
        const dateObj = new Date(baseDate.getTime() + (i * 3 * 24 * 60 * 60 * 1000));
        const plan = plans[i % plans.length];
        const mrr = plan === 'Enterprise' ? 2400 + (i % 6) * 350 : plan === 'Scale' ? 1200 + (i % 5) * 150 : plan === 'Professional' ? 490 : 190;
        const status = statuses[i % statuses.length];
        const cac = Math.round(mrr * 1.8);
        const nps = 6 + (i % 5);
        const tickets = (i % 6);

        rows.push({
          CustomerId: `CUST-S-${(5000 + i).toString()}`,
          SignupDate: dateObj.toISOString().split('T')[0],
          PlanTier: plan,
          MonthlyRecurringRevenue: mrr,
          CustomerAcquisitionCost: cac,
          NPSScore: nps,
          SupportTickets: tickets,
          AccountStatus: status
        });
      }
      return rows;
    }
  }
];
