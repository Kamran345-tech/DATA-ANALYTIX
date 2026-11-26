import { AnalyticsPackConfig, PackKpiConfig } from './packs/types';

export interface KpiDomainAssumptionEntry {
  assumption: string;
  reviewQuestion?: string;
}

/**
 * Explicit domain assumptions and domain-expert REVIEW questions per KPI ID across all 14 packs (Part A1).
 * Replaces generic placeholder notes with concrete definitions of numerator/denominator grain,
 * recognition rules (e.g. closed-won vs booked), retention cohort periods, and annualized conventions.
 */
export const KPI_DOMAIN_ASSUMPTIONS: Record<string, KpiDomainAssumptionEntry> = {
  // 1. Financial & FP&A
  fin_revenue: {
    assumption: 'Sums recognized net top-line revenue at period-department grain; excludes intercompany eliminations unless pre-netted in the source ledger.',
  },
  fin_gross_margin_pct: {
    assumption: 'Ratio of aggregate (Revenue − COGS) to aggregate Revenue across active period rows; assumes COGS includes direct material and fulfillment costs only.',
    reviewQuestion: 'REVIEW: Should depreciation of production assets be included in COGS or OPEX for Gross Margin %?',
  },
  fin_operating_margin_pct: {
    assumption: 'Computes (Σ Revenue − Σ COGS − Σ OPEX) / Σ Revenue; assumes R&D and SG&A are fully captured inside the mapped OPEX column.',
    reviewQuestion: 'REVIEW: Should one-time restructuring charges and stock-based compensation be excluded (Non-GAAP Operating Margin)?',
  },
  fin_net_margin_pct: {
    assumption: 'Aggregate Net Income divided by aggregate Revenue over the selected fiscal slice; assumes tax and interest provisions are already deducted in Net Income.',
  },
  fin_ebitda: {
    assumption: 'Sums reported EBITDA column at fiscal-period grain; does not re-add D&A unless included in the mapped EBITDA measure.',
    reviewQuestion: 'REVIEW: Does the finance team report Adjusted EBITDA (excluding FX and stock comp) or statutory GAAP EBITDA?',
  },
  fin_current_ratio: {
    assumption: 'Ratio of ending Current Assets to ending Current Liabilities across the reporting slice.',
    reviewQuestion: 'REVIEW: When multiple periods are selected, should Balance Sheet liquidity ratios use the latest period snapshot instead of period sums?',
  },
  fin_quick_ratio: {
    assumption: 'Subtracts ending Inventory from Current Assets before dividing by Current Liabilities; defaults Inventory to 0 if unmapped.',
    reviewQuestion: 'REVIEW: Should prepaid expenses also be excluded from Current Assets in the strict Acid-Test calculation?',
  },
  fin_debt_to_equity: {
    assumption: 'Divides Total Debt by Total Shareholders’ Equity; lower values indicate lower balance-sheet leverage.',
    reviewQuestion: 'REVIEW: Should operating lease liabilities (IFRS 16 / ASC 842) be included in Total Debt?',
  },
  fin_roe_pct: {
    assumption: 'Net Income divided by Total Shareholders’ Equity; returns Unavailable if Equity <= 0 to prevent false-positive ratios when both numerator and denominator are negative.',
    reviewQuestion: 'REVIEW: Should sub-annual periods (monthly/quarterly) be annualized (×12 or ×4) when computing ROE against ending equity?',
  },
  fin_roa_pct: {
    assumption: 'Net Income divided by Total Assets across the active slice; returns Unavailable when Total Assets <= 0.',
  },
  fin_dso_days: {
    assumption: 'Annualized 365-day convention: (Ending Accounts Receivable / Total Credit Revenue) × 365; lower DSO indicates faster cash collection.',
    reviewQuestion: 'REVIEW: Does the mapped Revenue column include cash sales that should be excluded from the credit-sales denominator, and should sub-year periods use actual period days (30/90) instead of 365?',
  },
  fin_dpo_days: {
    assumption: 'Annualized 365-day convention: (Ending Accounts Payable / Total COGS) × 365; higher DPO preserves short-term working capital.',
    reviewQuestion: 'REVIEW: Should period days (e.g. 90 days for a quarter) replace 365 when evaluating single-month or single-quarter ledgers?',
  },

  // 2. Sales & Pipeline CRM
  closed_won_revenue: {
    assumption: 'Sums revenue across rows representing signed, closed-won bookings; assumes open pipeline rows are either filtered out or carry 0 in the closed-won column.',
    reviewQuestion: 'REVIEW: Does Closed-Won Revenue represent First-Year ACV, Total Contract Value (TCV), or recognized GAAP revenue?',
  },
  quota_attainment: {
    assumption: 'Ratio of aggregate Closed-Won Revenue to aggregate Assigned Quota across the selected reps and periods.',
    reviewQuestion: 'REVIEW: Is quota additive across reps without double-counting manager overlay quotas?',
  },
  win_rate: {
    assumption: 'Divides Deals Won by Total Qualified Opportunities at rep-period grain; returns Unavailable if Deals Won > Opportunities.',
    reviewQuestion: 'REVIEW: Should Win Rate denominator be Total Closed Deals (Won + Lost) or Total Qualified Opportunities Entering Stage 2+?',
  },
  avg_deal_size: {
    assumption: 'Aggregate Closed-Won Revenue divided by aggregate Deals Won count (volume-weighted ACV, not unweighted average of rep averages).',
  },
  pipeline_coverage: {
    assumption: 'Open Pipeline Value divided by Target Quota for the active period; 3.0x coverage is used as the executive benchmark.',
    reviewQuestion: 'REVIEW: Should Open Pipeline Value be unweighted gross pipeline or stage-probability-weighted pipeline?',
  },
  open_pipeline_total: {
    assumption: 'Sums active, unclosed opportunity dollar values across mapped territories and stages.',
  },
  total_deals_won: {
    assumption: 'Sums count of executed customer contracts with stage = Closed Won during the period.',
  },
  avg_sales_cycle: {
    assumption: 'Arithmetic mean of elapsed calendar days from opportunity creation to signature; lower cycle length is favorable.',
    reviewQuestion: 'REVIEW: Should enterprise renewals and expansion upsells be segmented separately from net-new logo sales cycles?',
  },
  avg_discount_rate: {
    assumption: 'Mean percentage discount off list price across closed deals; lower discounting is favorable for margin protection.',
    reviewQuestion: 'REVIEW: Should Discount Rate % be revenue-weighted by deal size rather than an unweighted average across rows?',
  },

  // 3. Marketing & Growth Attribution
  total_ad_spend: {
    assumption: 'Sums total paid media expenditure across campaigns and channels; lower spend for equivalent return is favorable.',
  },
  attributed_revenue: {
    assumption: 'Sums pipeline or closed revenue credited to marketing campaigns under the dataset’s active attribution model.',
    reviewQuestion: 'REVIEW: Is Attributed Revenue based on First-Touch, Last-Touch, Linear, or W-Shaped multi-touch attribution?',
  },
  roas: {
    assumption: 'Aggregate Attributed Revenue divided by aggregate Total Ad Spend across selected channels.',
    reviewQuestion: 'REVIEW: What lookback attribution window (7-day, 28-day, or 90-day) applies to Attributed Revenue vs current-period Ad Spend?',
  },
  cac: {
    assumption: 'Total Marketing Spend divided by New Customers Acquired (Conversions); lower CAC is favorable.',
    reviewQuestion: 'REVIEW: Is this Paid-Media-Only CAC or Fully-Loaded Sales & Marketing CAC (including salaries, tools, and agency fees)?',
  },
  cpl: {
    assumption: 'Total Ad Spend divided by Total MQL Leads generated; lower CPL indicates higher top-of-funnel efficiency.',
  },
  cpc: {
    assumption: 'Total Ad Spend divided by Total Ad Clicks across paid digital networks; lower CPC is favorable.',
  },
  ctr: {
    assumption: 'Ratio of Total Clicks to Total Impressions × 100; returns Unavailable if Clicks > Impressions.',
  },
  lead_to_customer_rate: {
    assumption: 'Conversions (new paying customers) divided by Total MQL Leads × 100 over the active period.',
    reviewQuestion: 'REVIEW: Are conversions matched to the same lead cohort vintage, or compared as same-period conversions divided by same-period leads?',
  },
  total_leads: {
    assumption: 'Sums Marketing Qualified Leads (MQLs) meeting minimum lead-scoring threshold.',
  },

  // 4. Customer Success & Retention
  total_active_customers: {
    assumption: 'Sums active paying customer accounts across subscription tiers in the selected period.',
    reviewQuestion: 'REVIEW: When multiple months are selected, should Active Customers show ending period account count rather than summing across months?',
  },
  logo_churn_rate: {
    assumption: 'Churned Customers divided by Starting Active Customers × 100 over the reporting period; lower churn is favorable.',
    reviewQuestion: 'REVIEW: Is Logo Churn reported as a monthly rate or annualized rate, and are involuntary payment failures included?',
  },
  gross_retention_rate: {
    assumption: 'Complement of Logo Churn: [(Active Customers − Churned Customers) / Active Customers] × 100 over the selected cohort window.',
  },
  total_mrr: {
    assumption: 'Sums predictable Monthly Recurring Revenue excluding one-time professional services or setup fees.',
  },
  net_dollar_retention: {
    assumption: 'Computes [(Starting MRR + Expansion MRR − Contraction/Churned MRR) / Starting MRR] × 100 across existing customer cohorts.',
    reviewQuestion: 'REVIEW: Does Contraction MRR include both seat/tier downgrades AND full-account churn MRR?',
  },
  arpu: {
    assumption: 'Total Monthly Recurring Revenue divided by Total Active Customer Accounts.',
  },
  avg_clv: {
    assumption: 'Arithmetic mean of cohort Customer Lifetime Value (CLV) across active segments; ignores null or non-positive records.',
    reviewQuestion: 'REVIEW: Is CLV computed on gross revenue (ARPU / Churn) or gross-margin-adjusted contribution (ARPU × Gross Margin % / Churn)?',
  },
  avg_nps: {
    assumption: 'Mean Net Promoter Score (% Promoters [9–10] minus % Detractors [0–6]) bounded to [-100, +100].',
  },
  net_expansion_mrr: {
    assumption: 'Total Expansion MRR (upsells/cross-sells) minus Total Contraction MRR (downgrades/cancellations).',
  },

  // 5. Product & SaaS Usage
  avg_dau: {
    assumption: 'Aggregates unique daily active users engaging with at least one tracked product event.',
    reviewQuestion: 'REVIEW: Across multiple dates/modules, should DAU be averaged per day rather than summed to avoid double-counting multi-module users?',
  },
  avg_mau: {
    assumption: 'Aggregates unique monthly active users over a 30-day rolling window.',
    reviewQuestion: 'REVIEW: Are users active across multiple platforms (Web + iOS + Android) deduplicated in the MAU column before ingestion?',
  },
  stickiness_ratio: {
    assumption: 'Ratio of DAU to MAU × 100; returns Unavailable if DAU > MAU or MAU <= 0.',
  },
  activation_rate: {
    assumption: 'Activated Users completing the onboarding milestone divided by New Signups × 100.',
    reviewQuestion: 'REVIEW: What time window (e.g. Activated within 7 days of signup vs 30 days) defines a cohort’s Activation Rate %?',
  },
  events_per_dau: {
    assumption: 'Total tracked feature interaction events divided by Total DAU across active product modules.',
  },
  total_feature_events: {
    assumption: 'Cumulative count of instrumented client/server feature telemetry events.',
  },
  total_signups: {
    assumption: 'Total newly registered user accounts or self-serve workspace trials started in the period.',
  },
  avg_api_latency: {
    assumption: 'Mean application/API response time in milliseconds across sampled endpoints; lower latency is favorable.',
    reviewQuestion: 'REVIEW: Is the mapped latency column arithmetic mean latency or P95 tail latency?',
  },
  crash_rate: {
    assumption: 'Mean percentage of user sessions encountering an unhandled exception or crash; lower rate is favorable.',
  },

  // 6. Web & Traffic Analytics
  total_sessions: {
    assumption: 'Sums total web visits (30-minute inactivity timeout convention) across devices and channels.',
  },
  total_pageviews: {
    assumption: 'Cumulative count of HTML page loads and SPA route transitions.',
  },
  pages_per_session: {
    assumption: 'Total Pageviews divided by Total Sessions across active traffic sources.',
  },
  web_conversion_rate: {
    assumption: 'Total Goal Conversions divided by Total Sessions × 100.',
    reviewQuestion: 'REVIEW: Should Conversion Rate denominator be Total Sessions or Unique Visitors?',
  },
  bounce_rate: {
    assumption: 'Average percentage of single-page sessions with zero engagement events; lower bounce rate is favorable.',
    reviewQuestion: 'REVIEW: Is Bounce Rate unweighted across rows or session-volume-weighted across landing pages?',
  },
  avg_session_duration: {
    assumption: 'Mean visitor session duration in seconds excluding zero-second single-page bounces.',
  },
  avg_lcp_ms: {
    assumption: 'Mean Largest Contentful Paint (LCP) render time in milliseconds (Google Core Web Vitals threshold <= 2500ms); lower is favorable.',
    reviewQuestion: 'REVIEW: Should Core Web Vitals LCP be evaluated at the 75th percentile (CrUX standard) rather than arithmetic mean?',
  },
  total_conversions: {
    assumption: 'Sums completed primary conversion events (checkouts, demo requests, or signups).',
  },
  new_visitor_share: {
    assumption: 'First-time visitors (New Users) divided by Total Sessions × 100.',
  },

  // 7. Operations & Supply Chain
  otif_rate: {
    assumption: 'On-Time In-Full Shipments divided by Total Dispatched Shipments × 100.',
    reviewQuestion: 'REVIEW: What delivery tolerance window (e.g. ±1 calendar day and >=99% line-item quantity) defines an OTIF pass?',
  },
  avg_lead_time: {
    assumption: 'Mean calendar days from purchase order placement to physical warehouse receipt; lower lead time is favorable.',
  },
  fill_rate: {
    assumption: 'Mean percentage of customer order demand satisfied from primary stock on first shipment attempt.',
  },
  total_shipments: {
    assumption: 'Cumulative count of outbound shipment dispatches completed across distribution centers.',
  },
  inventory_turnover: {
    assumption: 'Computes Total COGS / Average Inventory when both roles are mapped; otherwise averages reported turnover ratio.',
    reviewQuestion: 'REVIEW: When COGS is in currency and Inventory is in physical units, is unit-cost valuation applied before computing turnover?',
  },
  backorder_rate: {
    assumption: 'Backordered Orders divided by Total Shipments × 100; lower backorder rate is favorable.',
  },
  cost_per_shipment: {
    assumption: 'Total Freight & Warehousing Logistics Cost divided by Total Shipments; lower unit fulfillment cost is favorable.',
  },
  total_inventory: {
    assumption: 'Sums physical stock-on-hand units across active warehouse facilities.',
  },
  total_logistics_cost: {
    assumption: 'Sums outbound freight, carrier surcharges, and fulfillment handling costs; lower spend for same volume is favorable.',
  },

  // 8. HR & People Analytics
  total_headcount: {
    assumption: 'Sums active Full-Time Equivalent (FTE) employees across departments.',
    reviewQuestion: 'REVIEW: When viewing multi-month HR data, should Headcount reflect ending period census rather than summing monthly snapshots?',
  },
  attrition_rate: {
    assumption: 'Computes (Σ Leavers / Σ Headcount) × 100 when counts are mapped, or averages `attrition_pct`; lower attrition is favorable.',
    reviewQuestion: 'REVIEW: Does Attrition Rate include both voluntary resignations and involuntary reductions-in-force (RIF), and is it annualized?',
  },
  total_hires: {
    assumption: 'Sums external new joiners onboarded with a start date inside the reporting period.',
  },
  total_leavers: {
    assumption: 'Sums voluntary and involuntary employee terminations during the period; lower exit count is favorable.',
  },
  net_headcount_add: {
    assumption: 'Total New Hires minus Total Exits/Leavers over the selected period.',
  },
  time_to_hire: {
    assumption: 'Mean calendar days elapsed from job requisition approval to candidate offer acceptance; lower is favorable.',
  },
  cost_per_employee: {
    assumption: 'Total Fully-Loaded Payroll Cost divided by Total Headcount; lower cost per FTE within budget band is marked down.',
    reviewQuestion: 'REVIEW: Does Payroll Cost include employer benefits, payroll taxes, and variable bonuses or base salary only?',
  },
  enps_score: {
    assumption: 'Mean Employee Net Promoter Score (% Promoters minus % Detractors) bounded between -100 and +100.',
  },
  diversity_ratio: {
    assumption: 'Mean percentage representation of women across active department headcount.',
  },

  // 9. Risk, Fraud & Compliance
  fraud_rate_pct: {
    assumption: 'Confirmed Fraud Transactions divided by Total Processed Transactions × 100; lower fraud rate is favorable.',
    reviewQuestion: 'REVIEW: Does Confirmed Fraud include post-settlement chargebacks (up to 120 days lag) as well as real-time blocked fraud?',
  },
  false_positive_rate: {
    assumption: 'Legitimate Transactions Declined (False Positives) divided by Total Flagged Alerts × 100; lower friction is favorable.',
  },
  gross_fraud_loss: {
    assumption: 'Sums gross dollar value of confirmed fraudulent transactions and chargebacks before recovery; lower loss is favorable.',
  },
  loss_to_volume_pct: {
    assumption: 'Gross Fraud Loss divided by Total Processed Payment Volume (TPV) × 100; lower loss ratio is favorable.',
  },
  recovery_rate: {
    assumption: 'Recovered Funds (via chargeback representment or wire recall) divided by Gross Fraud Loss × 100.',
  },
  alert_trigger_rate: {
    assumption: 'Flagged/Challenged Transactions divided by Total Transactions × 100; lower alert noise at constant recall is favorable.',
  },
  total_flagged_alerts: {
    assumption: 'Total count of risk rule and ML alerts routed to manual review or step-up authentication; lower queue load is favorable.',
  },
  precision_rate: {
    assumption: 'True Positive Confirmed Fraud divided by Total Flagged Alerts × 100; higher rule precision is favorable.',
  },
  avg_risk_score: {
    assumption: 'Mean ML transaction anomaly score on a 0–100 scale across monitored rails; lower average portfolio risk is favorable.',
  },

  // 10. Healthcare & Clinical Ops
  total_admissions: {
    assumption: 'Sums inpatient and clinical encounter admissions across hospital facilities and service lines.',
  },
  readmission_rate: {
    assumption: 'Unplanned 30-Day Readmissions divided by Total Index Admissions × 100; lower readmission rate is favorable.',
    reviewQuestion: 'REVIEW: Are planned staged procedures and obstetrics deliveries excluded from the CMS 30-day readmission denominator?',
  },
  avg_alos: {
    assumption: 'Mean inpatient length of stay in calendar days from admission to discharge; lower ALOS improves bed capacity.',
    reviewQuestion: 'REVIEW: Is ALOS case-mix-index (CMI) adjusted across acuity tiers?',
  },
  bed_occupancy: {
    assumption: 'Computes (Occupied Beds / Licensed Beds) × 100 when counts are mapped, or averages `bed_occupancy_pct` (target ~84%).',
  },
  er_wait_time: {
    assumption: 'Mean emergency room door-to-provider triage wait time in minutes; lower wait time is favorable.',
  },
  cost_per_admission: {
    assumption: 'Total Direct & Indirect Clinical Treatment Cost divided by Total Admissions; lower cost per encounter is favorable.',
  },
  total_clinical_cost: {
    assumption: 'Sums total inpatient and outpatient clinical care delivery costs; lower expenditure at constant quality is favorable.',
  },
  patient_satisfaction_score: {
    assumption: 'Mean HCAHPS patient experience top-box percentage score (0–100 scale).',
  },
  total_readmissions: {
    assumption: 'Total count of unplanned 30-day hospital readmissions; lower count is favorable.',
  },

  // 11. Retail & E-Commerce
  total_gmv: {
    assumption: 'Sums Gross Merchandise Value (price × quantity sold) prior to deducting returns or promotional discounts.',
  },
  net_retail_sales: {
    assumption: 'Gross Merchandise Value minus Customer Returns USD and Promotional Markdowns USD.',
  },
  avg_basket_value: {
    assumption: 'Total GMV divided by Total Checkout Orders/Receipts across stores and e-commerce.',
  },
  units_per_transaction: {
    assumption: 'Total Merchandise Units Sold divided by Total Orders (UPT basket attachment ratio).',
  },
  return_rate_pct: {
    assumption: 'Returned Merchandise Dollar Value divided by Total GMV × 100; lower return rate is favorable.',
    reviewQuestion: 'REVIEW: Are returns attributed to the original sale date or the return processing date?',
  },
  sell_through_rate: {
    assumption: 'Computes Units Sold / (Units Sold + Ending On-Hand Units) × 100 when inventory is mapped; otherwise averages `sell_through_pct`.',
  },
  store_conversion_rate: {
    assumption: 'Total Checkout Orders divided by Total Store/Site Footfall × 100.',
  },
  total_units_sold: {
    assumption: 'Cumulative physical SKU units sold across brick-and-mortar and digital channels.',
  },
  markdown_rate: {
    assumption: 'Total Clearance & Promotional Markdown Dollars divided by Total GMV × 100; lower markdown erosion is favorable.',
  },

  // 12. Manufacturing & Plant Quality
  oee_score: {
    assumption: 'Computes Availability % × Performance % × Quality % when component columns exist; otherwise averages reported `oee_pct`.',
    reviewQuestion: 'REVIEW: Does Availability % exclude planned preventive maintenance shifts from scheduled production time?',
  },
  first_pass_yield: {
    assumption: 'Good Conforming Units (passing inspection on first run without rework) divided by Total Produced Units × 100.',
  },
  scrap_rate: {
    assumption: 'Scrap & Defective Units divided by Total Produced Units × 100; lower scrap rate is favorable.',
  },
  total_produced: {
    assumption: 'Sums total physical units manufactured across all plants, lines, and shifts.',
  },
  total_downtime: {
    assumption: 'Sums cumulative hours of unplanned equipment breakdown or line stoppage; lower downtime is favorable.',
  },
  unit_production_cost: {
    assumption: 'Total Direct Manufacturing Cost divided by Good Conforming Units produced; lower cost per good unit is favorable.',
  },
  avg_cycle_time: {
    assumption: 'Mean unit processing takt/cycle time in seconds across assembly lines; lower cycle time is favorable.',
  },
  total_scrap_units: {
    assumption: 'Total count of rejected or scrapped non-conforming units; lower scrap count is favorable.',
  },
  total_plant_cost: {
    assumption: 'Sums direct labor, raw material, and factory overhead expenditure; lower cost for target output is favorable.',
  },

  // 13. Banking, Lending & Insurance
  total_loan_book: {
    assumption: 'Sums gross outstanding loan principal across commercial, mortgage, and consumer credit portfolios.',
    reviewQuestion: 'REVIEW: Across multiple reporting dates, should Gross Loan Portfolio use ending period balance instead of summing snapshots?',
  },
  total_deposits: {
    assumption: 'Sums total customer checking (CASA) and time deposit balances held on balance sheet.',
  },
  loan_to_deposit_ratio: {
    assumption: 'Gross Loan Portfolio divided by Total Customer Deposits × 100; lower LDR indicates stronger funding liquidity buffer.',
    reviewQuestion: 'REVIEW: What is the treasury committee’s target LDR band (e.g. 75%–85% optimal vs >90% liquidity strain)?',
  },
  npl_ratio: {
    assumption: 'Non-Performing Loan Balance (>= 90 days past due or in default) divided by Gross Loan Portfolio × 100; lower NPL % is favorable.',
  },
  net_interest_margin: {
    assumption: 'Mean Net Interest Margin % (Net Interest Income / Average Interest-Earning Assets × 100).',
    reviewQuestion: 'REVIEW: Should NIM % be weighted by each product line’s loan portfolio balance rather than unweighted average?',
  },
  net_interest_income: {
    assumption: 'Sums Net Interest Income (Interest Earned on Loans minus Interest Paid on Deposits).',
  },
  claims_loss_ratio: {
    assumption: 'Incurred Insurance Claims Paid divided by Gross Earned Premiums × 100; lower claims loss ratio is favorable.',
    reviewQuestion: 'REVIEW: Does Incurred Claims include IBNR (Incurred But Not Reported) actuarial reserves?',
  },
  gross_written_premium: {
    assumption: 'Sums earned underwriting premium revenue across policy lines.',
  },
  npl_exposure_usd: {
    assumption: 'Sums total dollar principal balance classified as non-performing or delinquent; lower exposure is favorable.',
  },

  // 14. Education & EdTech Analytics
  total_enrollment: {
    assumption: 'Sums active enrolled students across academic programs, campuses, and intake cohorts.',
  },
  completion_rate: {
    assumption: 'Completed/Graduated Students divided by Total Enrolled Students × 100 within the tracked cohort window.',
    reviewQuestion: 'REVIEW: Is Completion Rate evaluated at 100% normal program duration or 150% IPEDS graduation window?',
  },
  dropout_rate: {
    assumption: 'Withdrawn/Dropped Students divided by Total Enrolled Students × 100; lower dropout rate is favorable.',
  },
  student_retention_rate: {
    assumption: 'Term-over-term learner retention: [(Enrolled − Dropped) / Enrolled] × 100 across active cohorts.',
  },
  avg_attendance: {
    assumption: 'Mean percentage of scheduled instructional sessions attended by enrolled learners.',
  },
  avg_assessment_score: {
    assumption: 'Mean standardized course assessment or exam score on a 0–100 percentage scale.',
  },
  cost_per_student: {
    assumption: 'Total Instructional & Faculty Delivery Cost divided by Total Enrolled Students; lower cost per learner is favorable.',
  },
  tuition_per_student: {
    assumption: 'Total Net Tuition & Grant Revenue (after institutional aid) divided by Total Enrolled Students.',
  },
  total_graduates: {
    assumption: 'Sums learners who satisfied all degree or certificate completion requirements during the term.',
  },
};

export function getKpiAssumptionDetails(
  pack: AnalyticsPackConfig,
  kpi: PackKpiConfig
): { assumption: string; reviewQuestion?: string; fullNote: string } {
  const entry = KPI_DOMAIN_ASSUMPTIONS[kpi.id];
  const baseAssumption =
    entry?.assumption ||
    kpi.assumption ||
    `Aggregates ${kpi.requiredRoles.join(', ')} at ${pack.taxonomy.dimensions.join('/')} grain (${kpi.source}).`;
  const reviewQuestion = entry?.reviewQuestion;
  const fullNote = reviewQuestion
    ? `${baseAssumption} [${reviewQuestion}]`
    : baseAssumption;
  return {
    assumption: baseAssumption,
    reviewQuestion,
    fullNote,
  };
}
