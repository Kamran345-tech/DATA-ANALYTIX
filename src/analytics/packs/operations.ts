import { AnalyticsPackConfig } from './types';
import { sumRole, avgRole, safeDivVal, safePct, hasValidRoleNumber, avgPctRole } from './helpers';

export const operationsPack: AnalyticsPackConfig = {
  id: 'operations',
  name: 'Operations & Supply Chain',
  category: 'Operations & Supply',
  icon: 'Truck',
  description: 'OTIF (On-Time In-Full), lead time, fill rate, inventory turnover, backorder rate, warehouse utilization, and logistics cost.',
  theme: { hue: "amber", gradientFrom: "var(--pack-7)", gradientTo: "var(--pack-12)" },
  detect: {
    keywords: [
      'otif', 'lead_time', 'fill_rate', 'inventory_turnover', 'backorder', 'warehouse',
      'supplier', 'shipment', 'freight_cost', 'cycle_time', 'stockout', 'supply_chain',
      'godown', 'maal_stock', 'shipments_count', 'on_time_delivery', 'bhejna_kharcha',
    ],
    requiredRoles: ['date', 'shipments'],
    optionalRoles: ['warehouse', 'supplier', 'route', 'on_time_shipments', 'lead_time_days', 'fill_rate_pct', 'inventory_units', 'backorders', 'logistics_cost', 'inventory_turnover', 'cogs'],
    roleAliases: {
      date: ['date', 'ship_date', 'dispatch_date', 'month', 'period', 'tareekh', 'rawangi_date'],
      warehouse: ['warehouse', 'facility', 'distribution_center', 'dc', 'hub', 'plant', 'godown', 'godaam'],
      supplier: ['supplier', 'vendor', 'carrier', '3pl', 'partner', 'tamaam_supplier'],
      route: ['route', 'lane', 'corridor', 'zone', 'region', 'raasta'],
      shipments: ['shipments', 'orders_shipped', 'total_shipments', 'deliveries', 'dispatches', 'kheep', 'shipmentsCount'],
      on_time_shipments: ['on_time_shipments', 'otif_orders', 'on_time_deliveries', 'waqt_par_delivery'],
      lead_time_days: ['lead_time_days', 'lead_time', 'transit_days', 'delivery_days', 'cycle_time_days', 'intezar_din'],
      fill_rate_pct: ['fill_rate_pct', 'fill_rate', 'order_fill_rate', 'in_full_pct', 'poori_supply_pct'],
      inventory_units: ['inventory_units', 'stock_on_hand', 'inventory_level', 'units_in_stock', 'maal_stock', 'avg_inventory'],
      backorders: ['backorders', 'backorder_units', 'stockouts', 'delayed_orders', 'ruke_orders'],
      logistics_cost: ['logistics_cost', 'freight_cost', 'shipping_cost', 'transport_cost', 'kiraya', 'bhejna_kharcha'],
      inventory_turnover: ['inventory_turnover', 'stock_turns', 'turnover_ratio', 'stock_gardish'],
      cogs: ['cogs', 'cost_of_goods_sold', 'annual_cogs', 'laagat'],
    },
  },
  taxonomy: {
    dimensions: ['date', 'warehouse', 'supplier', 'route'],
    measures: ['shipments', 'on_time_shipments', 'lead_time_days', 'fill_rate_pct', 'inventory_units', 'backorders', 'logistics_cost', 'inventory_turnover', 'cogs'],
  },
  kpis: [
    {
      id: 'otif_rate',
      title: 'OTIF (On-Time In-Full %)',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['on_time_shipments', 'shipments'],
      formulaText: 'Percentage of total shipments delivered both on schedule and with complete order quantities.',
      source: 'OTIF (%) = (On-Time In-Full Shipments / Total Shipments) × 100',
      formula: (rows, r) => {
        const total = sumRole(rows, r, 'shipments');
        const onTime = sumRole(rows, r, 'on_time_shipments');
        if (total <= 0 || onTime < 0) return null;
        return safePct(onTime, total, { min: 0, max: 100 });
      },
      target: 95,
    },
    {
      id: 'avg_lead_time',
      title: 'Avg Lead Time (Days)',
      unit: 'days',
      favorableDirection: 'down',
      requiredRoles: ['lead_time_days'],
      formulaText: 'Average calendar days elapsed from order placement to shipment delivery.',
      source: 'Avg Lead Time = Average(Order-to-Delivery Calendar Days)',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'lead_time_days')) return null;
        const val = avgRole(rows, r, 'lead_time_days');
        return val !== null && val >= 0 ? val : null;
      },
      target: 4.5,
    },
    {
      id: 'fill_rate',
      title: 'Order Fill Rate',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['fill_rate_pct'],
      formulaText: 'Percentage of customer demand satisfied immediately from available stock without backorders.',
      source: 'Fill Rate (%) = (Units Shipped on First Attempt / Total Units Ordered) × 100',
      formula: (rows, r) => avgPctRole(rows, r, 'fill_rate_pct', { max: 100 }),
      target: 97,
    },
    {
      id: 'total_shipments',
      title: 'Total Shipments',
      unit: 'count',
      favorableDirection: 'up',
      requiredRoles: ['shipments'],
      formulaText: 'Total outbound shipment dispatches completed across all distribution centers.',
      source: 'Total Shipments = Σ(Shipments Dispatched)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'shipments') ? sumRole(rows, r, 'shipments') : null),
    },
    {
      id: 'inventory_turnover',
      title: 'Inventory Turnover',
      unit: 'ratio',
      favorableDirection: 'up',
      requiredRoles: ['inventory_turnover'],
      formulaText: 'Number of times average inventory stock is sold or replaced over the period.',
      source: 'Inventory Turnover = Cost of Goods Sold (COGS) / Average Inventory',
      assumption: 'Uses COGS / Average Inventory when `cogs` and `inventory_units` are both mapped; otherwise averages reported `inventory_turnover`.',
      formula: (rows, r) => {
        if (hasValidRoleNumber(rows, r, 'cogs') && hasValidRoleNumber(rows, r, 'inventory_units')) {
          const cogs = sumRole(rows, r, 'cogs');
          const avgInv = avgRole(rows, r, 'inventory_units');
          if (avgInv !== null && avgInv > 0 && cogs >= 0) {
            return safeDivVal(cogs, avgInv);
          }
        }
        if (!hasValidRoleNumber(rows, r, 'inventory_turnover')) return null;
        const val = avgRole(rows, r, 'inventory_turnover');
        return val !== null && val >= 0 ? val : null;
      },
      target: 8.5,
    },
    {
      id: 'backorder_rate',
      title: 'Backorder Rate',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['backorders', 'shipments'],
      formulaText: 'Percentage of total shipment orders delayed due to out-of-stock items.',
      source: 'Backorder Rate (%) = (Backordered Orders / Total Shipments) × 100',
      formula: (rows, r) => {
        const ships = sumRole(rows, r, 'shipments');
        const back = sumRole(rows, r, 'backorders');
        if (ships <= 0 || back < 0) return null;
        return safePct(back, ships, { min: 0, max: 100 });
      },
      target: 2.0,
    },
    {
      id: 'cost_per_shipment',
      title: 'Cost per Shipment',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['logistics_cost', 'shipments'],
      formulaText: 'Average freight and fulfillment expenditure per outbound shipment.',
      source: 'Cost per Shipment = Total Logistics Cost / Total Shipments',
      formula: (rows, r) => safeDivVal(sumRole(rows, r, 'logistics_cost'), sumRole(rows, r, 'shipments')),
    },
    {
      id: 'total_inventory',
      title: 'Stock on Hand (Units)',
      unit: 'count',
      favorableDirection: 'up',
      requiredRoles: ['inventory_units'],
      formulaText: 'Total physical units currently available across all warehouses.',
      source: 'Stock on Hand = Σ(Available Inventory Units)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'inventory_units') ? sumRole(rows, r, 'inventory_units') : null),
    },
    {
      id: 'total_logistics_cost',
      title: 'Total Logistics Spend',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['logistics_cost'],
      formulaText: 'Cumulative freight, transportation, and warehousing costs.',
      source: 'Total Logistics Spend = Σ(Logistics & Freight Cost)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'logistics_cost') ? sumRole(rows, r, 'logistics_cost') : null),
    },
  ],
  charts: [
    {
      id: 'ops_shipment_trend',
      title: 'Shipments vs On-Time Deliveries Over Time',
      subtitle: 'Fulfillment throughput and OTIF reliability trajectory',
      intent: 'trend',
      xRole: 'date',
      yRoles: ['shipments', 'on_time_shipments'],
      aggregation: 'sum',
    },
    {
      id: 'ops_warehouse_ranking',
      title: 'Throughput by Warehouse / Hub',
      subtitle: 'Total shipments and backorders across distribution centers',
      intent: 'ranking',
      xRole: 'warehouse',
      yRoles: ['shipments', 'backorders'],
      aggregation: 'sum',
    },
    {
      id: 'ops_supplier_leadtime',
      title: 'Supplier Lead Time & Fill Rate Comparison',
      subtitle: 'Vendor delivery speed vs order completeness',
      intent: 'comparison',
      xRole: 'supplier',
      yRoles: ['lead_time_days', 'fill_rate_pct'],
      aggregation: 'avg',
    },
    {
      id: 'ops_cost_by_route',
      title: 'Logistics Spend Share by Route',
      subtitle: 'Freight cost allocation across shipping corridors',
      intent: 'composition',
      xRole: 'route',
      yRoles: ['logistics_cost'],
      aggregation: 'sum',
    },
    {
      id: 'ops_inventory_by_warehouse',
      title: 'Stock on Hand by Facility',
      subtitle: 'Inventory balance across warehouses',
      intent: 'distribution',
      xRole: 'warehouse',
      yRoles: ['inventory_units'],
      aggregation: 'sum',
    },
    {
      id: 'ops_backorder_exceptions',
      title: 'Backorder Hotspots by Supplier',
      subtitle: 'Supply chain bottlenecks causing order delays',
      intent: 'Exception',
      xRole: 'supplier',
      yRoles: ['backorders'],
      aggregation: 'sum',
    },
  ],
  lenses: [
    {
      id: 'exec',
      name: 'Executive',
      description: 'OTIF delivery reliability, logistics spend, and inventory turns',
      kpiIds: ['otif_rate', 'fill_rate', 'total_shipments', 'total_logistics_cost', 'inventory_turnover'],
      chartIds: ['ops_shipment_trend', 'ops_warehouse_ranking', 'ops_cost_by_route'],
    },
    {
      id: 'ops',
      name: 'Operations',
      description: 'Warehouse throughput, lead times, and stock balances',
      kpiIds: ['avg_lead_time', 'total_inventory', 'cost_per_shipment', 'backorder_rate'],
      chartIds: ['ops_warehouse_ranking', 'ops_inventory_by_warehouse', 'ops_supplier_leadtime'],
    },
    {
      id: 'Perf',
      name: 'Performance',
      description: 'Supplier SLA compliance, fill rates, and freight efficiency',
      kpiIds: ['otif_rate', 'fill_rate', 'inventory_turnover', 'cost_per_shipment'],
      chartIds: ['ops_supplier_leadtime', 'ops_shipment_trend', 'ops_cost_by_route'],
    },
    {
      id: 'risk',
      name: 'Risk & Exceptions',
      description: 'Backorder spikes, lead-time delays, and stockout exposure',
      kpiIds: ['backorder_rate', 'avg_lead_time', 'otif_rate'],
      chartIds: ['ops_backorder_exceptions', 'ops_supplier_leadtime'],
    },
  ],
  reportSections: ['Executive Summary', 'KPI Scorecard', 'OTIF & Fulfillment SLA Analysis', 'Warehouse & Inventory Optimization', 'Recommendations'],
  sampleDataset: {
    name: 'supply_chain_operations_2025.csv',
    rows: [
      { date: '2025-01-01', warehouse: 'Chicago DC', supplier: 'Apex Logistics', route: 'Midwest', shipments: 4200, on_time_shipments: 4032, lead_time_days: 3.8, fill_rate_pct: 97.4, inventory_units: 68000, backorders: 65, logistics_cost: 142800, inventory_turnover: 9.2, cogs: 625600 },
      { date: '2025-01-01', warehouse: 'Newark Hub', supplier: 'GlobalFreight', route: 'Northeast', shipments: 5100, on_time_shipments: 4845, lead_time_days: 4.2, fill_rate_pct: 96.1, inventory_units: 82000, backorders: 110, logistics_cost: 188700, inventory_turnover: 8.6, cogs: 705200 },
      { date: '2025-02-01', warehouse: 'Dallas Hub', supplier: 'PrimeCarrier', route: 'South', shipments: 3800, on_time_shipments: 3686, lead_time_days: 3.5, fill_rate_pct: 98.2, inventory_units: 54000, backorders: 42, logistics_cost: 121600, inventory_turnover: 9.8, cogs: 529200 },
      { date: '2025-02-01', warehouse: 'Reno DC', supplier: 'PacificHaul', route: 'West Coast', shipments: 4600, on_time_shipments: 4232, lead_time_days: 5.4, fill_rate_pct: 94.0, inventory_units: 75000, backorders: 165, logistics_cost: 179400, inventory_turnover: 7.9, cogs: 592500 },
      { date: '2025-03-01', warehouse: 'Chicago DC', supplier: 'Apex Logistics', route: 'Midwest', shipments: 4550, on_time_shipments: 4414, lead_time_days: 3.6, fill_rate_pct: 98.0, inventory_units: 71000, backorders: 50, logistics_cost: 150150, inventory_turnover: 9.5, cogs: 674500 },
      { date: '2025-03-01', warehouse: 'Atlanta DC', supplier: 'PrimeCarrier', route: 'Southeast', shipments: 3950, on_time_shipments: 3792, lead_time_days: 4.0, fill_rate_pct: 96.8, inventory_units: 61000, backorders: 78, logistics_cost: 134300, inventory_turnover: 8.9, cogs: 542900 },
    ],
  },
};
