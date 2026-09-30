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
    name: 'Global Enterprise Technology Sales & Margin Telemetry',
    description: 'Audited enterprise B2B sales dataset spanning North America, EMEA, APAC, and LATAM with Net Revenue, COGS, Gross Profit, Margin %, Discounting, Channel, and Cohorts.',
    category: 'Enterprise Sales & P&L',
    rowsCount: 140,
    fileName: 'enterprise_sales_margin_telemetry.csv',
    generateData: () => {
      const regions = ['North America', 'EMEA', 'APAC', 'LATAM'];
      const countriesByRegion: Record<string, string[]> = {
        'North America': ['United States', 'Canada'],
        'EMEA': ['Germany', 'United Kingdom', 'France', 'Netherlands'],
        'APAC': ['Japan', 'Singapore', 'Australia'],
        'LATAM': ['Brazil', 'Mexico']
      };
      const segments = ['Enterprise Strategic', 'Mid-Market Growth', 'Commercial SMB', 'Public Sector'];
      const channels = ['Direct Enterprise', 'Channel Partner', 'Cloud Marketplace'];
      
      const productCatalog = [
        { cat: 'Cloud Infrastructure', sub: 'Compute Clusters', name: 'Nexus Cloud Dedicated Cluster', basePrice: 4200, costRate: 0.52 },
        { cat: 'Cloud Infrastructure', sub: 'Storage Fabric', name: 'Aurora High-Throughput NVMe', basePrice: 1850, costRate: 0.48 },
        { cat: 'AI Copilot & Models', sub: 'Autonomous Agents', name: 'NexusBI Cognitive Agent Suite', basePrice: 3600, costRate: 0.35 },
        { cat: 'AI Copilot & Models', sub: 'Inference Gateway', name: 'Apex Multi-Model Routing Gateway', basePrice: 2400, costRate: 0.40 },
        { cat: 'Cybersecurity Suite', sub: 'Zero-Trust Network', name: 'ShieldGuard Zero-Trust Mesh', basePrice: 2900, costRate: 0.38 },
        { cat: 'Cybersecurity Suite', sub: 'Threat Intelligence', name: 'Sentinel Threat Radar Pro', basePrice: 1500, costRate: 0.42 },
        { cat: 'Data Engineering', sub: 'Warehouse Engine', name: 'Lakehouse Streaming Engine', basePrice: 3100, costRate: 0.46 },
        { cat: 'Advisory & Support', sub: 'Implementation', name: 'Enterprise Deployment Advisory', basePrice: 5000, costRate: 0.62 }
      ];

      const clientNames = [
        'Acro Corp', 'BioHealth Systems', 'Vertex Logistics', 'Pioneer Financial',
        'Omni Retail Group', 'Apex Energy', 'Terra Media Global', 'Starlight Telecom',
        'Quantum Capital', 'Horizon Aerospace', 'Zenith Health', 'Krypton Labs'
      ];

      const cohorts = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1'];

      const rows: Record<string, any>[] = [];
      const startDate = new Date(2024, 6, 1); // July 1, 2024

      for (let i = 1; i <= 140; i++) {
        // Increment date across 14 months to cover trends
        const orderDate = new Date(startDate.getTime() + (i * 2.8 * 24 * 60 * 60 * 1000));
        const dateStr = orderDate.toISOString().split('T')[0];

        const region = regions[i % regions.length];
        const countryList = countriesByRegion[region];
        const country = countryList[i % countryList.length];

        const segment = segments[(i * 3) % segments.length];
        const channel = channels[(i * 2) % channels.length];
        const client = clientNames[(i * 7) % clientNames.length];
        const cohort = cohorts[(i * 2) % cohorts.length];

        const prod = productCatalog[i % productCatalog.length];
        const units = Math.max(1, 2 + ((i * 11) % 18));
        const unitPrice = prod.basePrice + ((i % 5) * 80);
        const grossRev = units * unitPrice;

        // Discount logic (0% to 15%)
        const discountRate = (i % 6 === 0) ? 0.12 : (i % 4 === 0) ? 0.08 : (i % 5 === 0) ? 0.04 : 0.0;
        const discountAmount = Math.round(grossRev * discountRate);
        const netRevenue = grossRev - discountAmount;

        const cogs = Math.round(netRevenue * (prod.costRate + ((i % 7) * 0.015 - 0.03)));
        const grossProfit = netRevenue - cogs;
        const marginPct = Math.round((grossProfit / (netRevenue || 1)) * 1000) / 10;
        const quotaTarget = Math.round(netRevenue * (0.94 + ((i % 5) * 0.03)));

        rows.push({
          OrderId: `ORD-2025-${(10000 + i).toString()}`,
          OrderDate: dateStr,
          CustomerName: client,
          CustomerSegment: segment,
          Region: region,
          Country: country,
          SalesChannel: channel,
          ProductCategory: prod.cat,
          ProductSubcategory: prod.sub,
          ProductName: prod.name,
          UnitsSold: units,
          UnitPrice: unitPrice,
          GrossRevenue: grossRev,
          DiscountAmount: discountAmount,
          NetRevenue: netRevenue,
          CostOfGoodsSold: cogs,
          GrossProfit: grossProfit,
          GrossMarginPct: marginPct,
          SalesQuotaTarget: quotaTarget,
          CustomerCohort: cohort
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
  },
  {
    id: 'messy-crm-raw',
    name: 'Raw Messy Business Transactions (Dirty Data Benchmark)',
    description: 'Realistic unstructured business data featuring untrimmed whitespace, mixed casing (USA vs usa), dirty currency strings ($1,250.00), nulls, duplicate rows, and statistical outliers.',
    category: 'Dirty Data Lab',
    rowsCount: 80,
    fileName: 'raw_messy_transactions_uncleaned.csv',
    generateData: () => {
      const dirtyRegions = ['  North America  ', 'north america', 'North America', 'EMEA ', ' APAC', 'apac', 'LATAM'];
      const dirtySegments = ['Enterprise', 'enterprise', 'ENTERPRISE', ' Consumer ', 'consumer', 'Mid-Market'];
      const dirtyCurrencies = ['$1,250.00', '$3,400.50', '$890.00', '2100', '$5,600.00', '$ - ', '$14,200.00'];
      const categories = ['Hardware', 'Cloud Licenses', 'Consulting', 'Support Contracts'];

      const rows: Record<string, any>[] = [];
      for (let i = 1; i <= 76; i++) {
        const region = dirtyRegions[i % dirtyRegions.length];
        const segment = dirtySegments[i % dirtySegments.length];
        const category = categories[i % categories.length];
        const rawRev = dirtyCurrencies[i % dirtyCurrencies.length];
        const units = (i % 7 === 0) ? null : 5 + (i * 3) % 40; // Some null units
        const cost = (i % 10 === 0) ? null : 200 + (i * 25) % 1800; // Some null costs

        rows.push({
          TransactionId: `TX-${2025000 + i}`,
          Region: region,
          CustomerSegment: segment,
          Category: category,
          GrossRevenue: rawRev,
          Units: units,
          EstimatedCost: cost,
          RecordStatus: 'ACTIVE' // Zero-variance constant column
        });
      }

      // Add 4 duplicate rows to test deduplication
      rows.push({ ...rows[2] });
      rows.push({ ...rows[2] });
      rows.push({ ...rows[8] });
      rows.push({ ...rows[8] });

      return rows;
    }
  }
];
