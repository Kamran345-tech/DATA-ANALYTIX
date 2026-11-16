import { AnalyticsPackConfig } from './types';
import { sumRole, safeDivVal, safePct, hasValidRoleNumber } from './helpers';

export const financialPack: AnalyticsPackConfig = {
  id: 'financial',
  name: 'Financial & FP&A',
  category: 'Finance & Risk',
  icon: 'Landmark',
  description: 'P&L, balance sheet, liquidity, working capital (DSO/DPO), ROE/ROA, EBITDA, cash burn, and budget variance.',
  detect: {
    keywords: [
      'ebitda', 'cogs', 'opex', 'operating_expense', 'net_income', 'gross_profit',
      'current_assets', 'current_liabilities', 'accounts_receivable', 'accounts_payable',
      'cash_flow', 'capex', 'equity', 'debt', 'ledger', 'budget_revenue', 'dso', 'dpo',
      'amdani', 'kharcha', 'munafa', 'laagat', 'qarza', 'sarmaya', 'wusooli', 'adaigi',
    ],
    requiredRoles: ['date', 'revenue'],
    optionalRoles: [
      'cogs', 'opex', 'net_income', 'ebitda', 'current_assets', 'current_liabilities',
      'inventory', 'total_assets', 'total_debt', 'total_equity', 'ar', 'ap', 'cash', 'budget', 'department',
    ],
    roleAliases: {
      date: ['date', 'period', 'fiscal_date', 'month', 'quarter', 'posting_date', 'tareekh', 'mahina', 'salana_date'],
      department: ['department', 'cost_center', 'business_unit', 'subsidiary', 'entity', 'shoba', 'dept', 'vibhag'],
      revenue: ['revenue', 'gross_revenue', 'total_revenue', 'sales_revenue', 'turnover', 'top_line', 'rev', 'amdani', 'kul_amdani', 'total_rev'],
      cogs: ['cogs', 'cost_of_goods_sold', 'cost_of_sales', 'direct_cost', 'cost_of_revenue', 'laagat', 'maal_ki_laagat'],
      opex: ['opex', 'operating_expense', 'operating_expenses', 'sga', 'overhead', 'expenses', 'kharcha', 'chalan_kharcha'],
      net_income: ['net_income', 'net_profit', 'earnings', 'bottom_line', 'profit_after_tax', 'pat', 'munafa', 'khalis_munafa'],
      ebitda: ['ebitda', 'operating_income', 'ebit', 'operating_profit', 'oper_profit'],
      current_assets: ['current_assets', 'short_term_assets', 'liquid_assets', 'ca', 'jari_assets'],
      current_liabilities: ['current_liabilities', 'short_term_liabilities', 'payables_short', 'cl', 'jari_wajibaat'],
      inventory: ['inventory', 'stock_value', 'merchandise_inventory', 'ending_inventory', 'maal_godam'],
      total_assets: ['total_assets', 'assets', 'asset_base', 'kul_assets', 'asasa'],
      total_debt: ['total_debt', 'debt', 'long_term_debt', 'borrowings', 'liabilities', 'kul_qarza'],
      total_equity: ['total_equity', 'shareholder_equity', 'equity', 'net_worth', 'book_value', 'sarmaya', 'equity_sarmaya'],
      ar: ['accounts_receivable', 'ar', 'trade_receivables', 'receivables', 'debtors', 'wusooli', 'accts_rec'],
      ap: ['accounts_payable', 'ap', 'trade_payables', 'payables', 'creditors', 'adaigi', 'accts_pay'],
      cash: ['cash', 'cash_balance', 'cash_and_equivalents', 'treasury_cash', 'naqad', 'naqdi'],
      budget: ['budget', 'budget_revenue', 'plan_revenue', 'forecast_revenue', 'target_revenue', 'mizaniya'],
    },
  },
  taxonomy: {
    dimensions: ['date', 'department'],
    measures: [
      'revenue', 'cogs', 'opex', 'net_income', 'ebitda',
      'current_assets', 'current_liabilities', 'inventory', 'total_assets',
      'total_debt', 'total_equity', 'ar', 'ap', 'cash', 'budget',
    ],
  },
  kpis: [
    {
      id: 'fin_revenue',
      title: 'Total Revenue',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['revenue'],
      formulaText: 'Sum of recognized top-line revenue across the selected period.',
      source: 'Total Revenue = Σ(Revenue)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'revenue') ? sumRole(rows, r, 'revenue') : null),
    },
    {
      id: 'fin_gross_margin_pct',
      title: 'Gross Margin %',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['revenue', 'cogs'],
      formulaText: 'Percentage of revenue retained after subtracting direct Cost of Goods Sold (COGS).',
      source: 'Gross Margin % = ((Revenue − COGS) / Revenue) × 100',
      formula: (rows, r) => {
        const rev = sumRole(rows, r, 'revenue');
        const cogs = sumRole(rows, r, 'cogs');
        if (rev <= 0) return null;
        return safePct(rev - cogs, rev, { min: -500, max: 100 });
      },
      target: 60,
    },
    {
      id: 'fin_operating_margin_pct',
      title: 'Operating Margin %',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['revenue', 'cogs', 'opex'],
      formulaText: 'Operating income (Revenue minus COGS and OPEX) as a percentage of total revenue.',
      source: 'Operating Margin % = ((Revenue − COGS − OPEX) / Revenue) × 100',
      formula: (rows, r) => {
        const rev = sumRole(rows, r, 'revenue');
        if (rev <= 0) return null;
        const opInc = rev - sumRole(rows, r, 'cogs') - sumRole(rows, r, 'opex');
        return safePct(opInc, rev, { min: -500, max: 100 });
      },
      target: 22,
    },
    {
      id: 'fin_net_margin_pct',
      title: 'Net Profit Margin %',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['revenue', 'net_income'],
      formulaText: 'Bottom-line net profit after taxes and interest divided by total revenue.',
      source: 'Net Profit Margin % = (Net Income / Revenue) × 100',
      formula: (rows, r) => {
        const rev = sumRole(rows, r, 'revenue');
        if (rev <= 0) return null;
        return safePct(sumRole(rows, r, 'net_income'), rev, { min: -500, max: 100 });
      },
      target: 15,
    },
    {
      id: 'fin_ebitda',
      title: 'EBITDA',
      unit: 'currency',
      favorableDirection: 'up',
      requiredRoles: ['ebitda'],
      formulaText: 'Earnings before interest, taxes, depreciation, and amortization.',
      source: 'EBITDA = Operating Profit + Depreciation + Amortization',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'ebitda') ? sumRole(rows, r, 'ebitda') : null),
    },
    {
      id: 'fin_current_ratio',
      title: 'Current Ratio',
      unit: 'ratio',
      favorableDirection: 'up',
      requiredRoles: ['current_assets', 'current_liabilities'],
      formulaText: 'Short-term liquidity ratio measuring ability to pay obligations due within one year.',
      source: 'Current Ratio = Current Assets / Current Liabilities',
      formula: (rows, r) => {
        const ca = sumRole(rows, r, 'current_assets');
        const cl = sumRole(rows, r, 'current_liabilities');
        if (ca < 0 || cl <= 0) return null;
        return safeDivVal(ca, cl);
      },
      target: 1.8,
    },
    {
      id: 'fin_quick_ratio',
      title: 'Quick Ratio (Acid-Test)',
      unit: 'ratio',
      favorableDirection: 'up',
      requiredRoles: ['current_assets', 'current_liabilities'],
      formulaText: 'Strict liquidity test subtracting inventory from current assets before dividing by current liabilities.',
      source: 'Quick Ratio = (Current Assets − Inventory) / Current Liabilities',
      assumption: 'If `inventory` column is not mapped, Inventory is assumed to be 0 (Quick Ratio = Current Ratio).',
      formula: (rows, r) => {
        const ca = sumRole(rows, r, 'current_assets');
        const inv = r.inventory ? Math.max(0, sumRole(rows, r, 'inventory')) : 0;
        const cl = sumRole(rows, r, 'current_liabilities');
        if (ca < 0 || cl <= 0 || ca - inv < 0) return null;
        return safeDivVal(ca - inv, cl);
      },
      target: 1.3,
    },
    {
      id: 'fin_debt_to_equity',
      title: 'Debt-to-Equity',
      unit: 'ratio',
      favorableDirection: 'down',
      requiredRoles: ['total_debt', 'total_equity'],
      formulaText: 'Financial leverage ratio comparing total debt liabilities against shareholder equity.',
      source: 'Debt-to-Equity = Total Debt / Total Shareholders’ Equity',
      formula: (rows, r) => {
        const debt = sumRole(rows, r, 'total_debt');
        const eq = sumRole(rows, r, 'total_equity');
        if (debt < 0 || eq <= 0) return null;
        return safeDivVal(debt, eq);
      },
      target: 0.8,
    },
    {
      id: 'fin_roe_pct',
      title: 'Return on Equity (ROE)',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['net_income', 'total_equity'],
      formulaText: 'Profitability generated per dollar of shareholders’ equity.',
      source: 'ROE (%) = (Net Income / Average Shareholders’ Equity) × 100',
      assumption: 'Returns null when Shareholders’ Equity <= 0 to prevent false positive ROE when both Net Income and Equity are negative.',
      formula: (rows, r) => {
        const eq = sumRole(rows, r, 'total_equity');
        if (eq <= 0) return null;
        return safePct(sumRole(rows, r, 'net_income'), eq, { min: -500, max: 500 });
      },
      target: 18,
    },
    {
      id: 'fin_roa_pct',
      title: 'Return on Assets (ROA)',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['net_income', 'total_assets'],
      formulaText: 'Efficiency of total asset base in generating net profit.',
      source: 'ROA (%) = (Net Income / Total Assets) × 100',
      formula: (rows, r) => {
        const assets = sumRole(rows, r, 'total_assets');
        if (assets <= 0) return null;
        return safePct(sumRole(rows, r, 'net_income'), assets, { min: -500, max: 500 });
      },
      target: 9,
    },
    {
      id: 'fin_dso_days',
      title: 'Days Sales Outstanding (DSO)',
      unit: 'days',
      favorableDirection: 'down',
      requiredRoles: ['ar', 'revenue'],
      formulaText: 'Average number of days it takes to collect payment after a credit sale.',
      source: 'DSO = (Accounts Receivable / Total Credit Revenue) × 365 days',
      assumption: 'Uses a 365-day annualized convention across total period revenue and ending Accounts Receivable.',
      formula: (rows, r) => {
        const ar = sumRole(rows, r, 'ar');
        const rev = sumRole(rows, r, 'revenue');
        if (ar < 0 || rev <= 0) return null;
        return safeDivVal(ar * 365, rev, { min: 0, max: 3650 });
      },
      target: 38,
    },
    {
      id: 'fin_dpo_days',
      title: 'Days Payable Outstanding (DPO)',
      unit: 'days',
      favorableDirection: 'up',
      requiredRoles: ['ap', 'cogs'],
      formulaText: 'Average number of days the company takes to pay its trade suppliers.',
      source: 'DPO = (Accounts Payable / Cost of Goods Sold) × 365 days',
      assumption: 'Uses a 365-day annualized convention against total period COGS.',
      formula: (rows, r) => {
        const ap = sumRole(rows, r, 'ap');
        const cogs = sumRole(rows, r, 'cogs');
        if (ap < 0 || cogs <= 0) return null;
        return safeDivVal(ap * 365, cogs, { min: 0, max: 3650 });
      },
      target: 45,
    },
  ],
  charts: [
    {
      id: 'fin_rev_profit_trend',
      title: 'Revenue, EBITDA & Net Profit Trend',
      subtitle: 'Top-line vs bottom-line progression across reporting periods',
      intent: 'trend',
      xRole: 'date',
      yRoles: ['revenue', 'ebitda', 'net_income'],
      aggregation: 'sum',
    },
    {
      id: 'fin_dept_ranking',
      title: 'Revenue & Operating Expense by Business Unit',
      subtitle: 'Comparative P&L contribution by department',
      intent: 'ranking',
      xRole: 'department',
      yRoles: ['revenue', 'opex'],
      aggregation: 'sum',
    },
    {
      id: 'fin_budget_variance',
      title: 'Actual vs Budget Revenue',
      subtitle: 'Plan attainment across fiscal periods',
      intent: 'comparison',
      xRole: 'date',
      yRoles: ['revenue', 'budget'],
      aggregation: 'sum',
    },
    {
      id: 'fin_working_capital',
      title: 'Working Capital (AR vs AP vs Cash)',
      subtitle: 'Liquidity & short-term balance sheet composition',
      intent: 'composition',
      xRole: 'department',
      yRoles: ['cash', 'ar', 'ap'],
      aggregation: 'sum',
    },
    {
      id: 'fin_cost_structure',
      title: 'Cost Structure (COGS vs OPEX)',
      subtitle: 'Direct vs overhead cost trajectory',
      intent: 'distribution',
      xRole: 'date',
      yRoles: ['cogs', 'opex'],
      aggregation: 'sum',
    },
    {
      id: 'fin_leverage_exceptions',
      title: 'Debt vs Equity Exposure by Entity',
      subtitle: 'Balance sheet leverage and solvency breakdown',
      intent: 'Exception',
      xRole: 'department',
      yRoles: ['total_debt', 'total_equity'],
      aggregation: 'sum',
    },
  ],
  lenses: [
    {
      id: 'exec',
      name: 'Executive',
      description: 'Top-line P&L, EBITDA, Net Margin, and Return on Equity',
      kpiIds: ['fin_revenue', 'fin_ebitda', 'fin_net_margin_pct', 'fin_gross_margin_pct', 'fin_roe_pct', 'fin_roa_pct'],
      chartIds: ['fin_rev_profit_trend', 'fin_budget_variance', 'fin_dept_ranking'],
    },
    {
      id: 'ops',
      name: 'Operations',
      description: 'Working capital cycle (DSO, DPO) and departmental OPEX efficiency',
      kpiIds: ['fin_operating_margin_pct', 'fin_dso_days', 'fin_dpo_days', 'fin_current_ratio', 'fin_quick_ratio'],
      chartIds: ['fin_working_capital', 'fin_cost_structure', 'fin_dept_ranking'],
    },
    {
      id: 'Perf',
      name: 'Performance',
      description: 'Profitability ratios, budget attainment, and capital efficiency',
      kpiIds: ['fin_gross_margin_pct', 'fin_operating_margin_pct', 'fin_net_margin_pct', 'fin_roe_pct', 'fin_roa_pct'],
      chartIds: ['fin_budget_variance', 'fin_rev_profit_trend', 'fin_cost_structure'],
    },
    {
      id: 'risk',
      name: 'Risk & Exceptions',
      description: 'Liquidity coverage, leverage exposure, and receivables aging risk',
      kpiIds: ['fin_current_ratio', 'fin_quick_ratio', 'fin_debt_to_equity', 'fin_dso_days'],
      chartIds: ['fin_leverage_exceptions', 'fin_working_capital'],
    },
  ],
  reportSections: ['Executive Summary', 'KPI Scorecard', 'P&L & Margin Analysis', 'Liquidity & Balance Sheet Risk', 'Recommendations'],
  sampleDataset: {
    name: 'financial_fpa_ledger_2025.csv',
    rows: [
      { date: '2025-01-01', department: 'Cloud Platform', revenue: 1450000, budget: 1380000, cogs: 460000, opex: 390000, ebitda: 600000, net_income: 440000, current_assets: 2800000, inventory: 180000, current_liabilities: 1250000, total_assets: 5400000, total_debt: 1400000, total_equity: 2750000, ar: 155000, ap: 62000, cash: 1950000 },
      { date: '2025-01-01', department: 'Enterprise AI', revenue: 980000, budget: 920000, cogs: 310000, opex: 295000, ebitda: 375000, net_income: 270000, current_assets: 1950000, inventory: 95000, current_liabilities: 920000, total_assets: 3800000, total_debt: 950000, total_equity: 1930000, ar: 108000, ap: 44000, cash: 1320000 },
      { date: '2025-02-01', department: 'Cloud Platform', revenue: 1580000, budget: 1490000, cogs: 490000, opex: 405000, ebitda: 685000, net_income: 510000, current_assets: 3050000, inventory: 175000, current_liabilities: 1310000, total_assets: 5750000, total_debt: 1350000, total_equity: 3090000, ar: 162000, ap: 68000, cash: 2150000 },
      { date: '2025-02-01', department: 'Enterprise AI', revenue: 1120000, budget: 1050000, cogs: 340000, opex: 315000, ebitda: 465000, net_income: 345000, current_assets: 2200000, inventory: 90000, current_liabilities: 980000, total_assets: 4100000, total_debt: 910000, total_equity: 2210000, ar: 118000, ap: 49000, cash: 1510000 },
      { date: '2025-03-01', department: 'Cloud Platform', revenue: 1740000, budget: 1620000, cogs: 530000, opex: 425000, ebitda: 785000, net_income: 590000, current_assets: 3350000, inventory: 170000, current_liabilities: 1380000, total_assets: 6150000, total_debt: 1300000, total_equity: 3470000, ar: 170000, ap: 73000, cash: 2390000 },
      { date: '2025-03-01', department: 'Enterprise AI', revenue: 1290000, budget: 1180000, cogs: 385000, opex: 330000, ebitda: 575000, net_income: 430000, current_assets: 2480000, inventory: 85000, current_liabilities: 1040000, total_assets: 4450000, total_debt: 870000, total_equity: 2540000, ar: 128000, ap: 54000, cash: 1740000 },
    ],
  },
};
