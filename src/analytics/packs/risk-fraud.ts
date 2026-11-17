import { AnalyticsPackConfig } from './types';
import { sumRole, avgRole, safeDivVal, safePct, hasValidRoleNumber, avgPctRole } from './helpers';

export const riskFraudPack: AnalyticsPackConfig = {
  id: 'risk-fraud',
  name: 'Risk, Fraud & Compliance',
  category: 'Finance & Risk',
  icon: 'ShieldAlert',
  description: 'Fraud loss rate (bps), chargebacks, false positive rate, anomaly detection, AML alerts, blocked transactions, and recovery rate.',
  theme: { hue: "red-crimson", gradientFrom: "var(--pack-9)", gradientTo: "var(--pack-8)" },
  detect: {
    keywords: [
      'fraud', 'chargeback', 'risk_score', 'false_positive', 'aml', 'suspicious',
      'dispute', 'blocked_tx', 'anomaly_score', 'compliance', 'loss_amount', 'kyc',
      'dhoka', 'farzi_transaction', 'chargeback_loss', 'risk_alert', 'pakre_gaye',
    ],
    requiredRoles: ['date', 'transactions'],
    optionalRoles: ['channel', 'country', 'rule_type', 'flagged_tx', 'confirmed_fraud', 'false_positives', 'fraud_loss', 'tx_volume_usd', 'recovered_usd', 'avg_risk_score'],
    roleAliases: {
      date: ['date', 'tx_date', 'alert_date', 'month', 'period', 'tareekh'],
      channel: ['channel', 'payment_method', 'instrument', 'rail', 'card_present', 'zariya'],
      country: ['country', 'ip_country', 'billing_country', 'region', 'jurisdiction', 'mulk'],
      rule_type: ['rule_type', 'alert_category', 'vector', 'fraud_type', 'typology', 'qism'],
      transactions: ['transactions', 'total_tx', 'tx_count', 'payment_attempts', 'len_den', 'totalTransactions'],
      flagged_tx: ['flagged_tx', 'alerts', 'blocked_tx', 'challenged_tx', 'suspicious_tx', 'mashkook_tx'],
      confirmed_fraud: ['confirmed_fraud', 'fraud_count', 'chargebacks', 'disputes', 'tasdeeq_dhoka'],
      false_positives: ['false_positives', 'fp_count', 'legit_declined', 'ghalat_alert'],
      fraud_loss: ['fraud_loss', 'chargeback_usd', 'gross_fraud_loss', 'net_loss', 'dhoka_nuqsan'],
      tx_volume_usd: ['tx_volume_usd', 'gross_volume', 'tpv', 'processed_amount', 'kul_raqam'],
      recovered_usd: ['recovered_usd', 'prevented_loss', 'chargeback_won', 'recovery', 'wapas_raqam'],
      avg_risk_score: ['avg_risk_score', 'risk_score', 'anomaly_score', 'ml_score', 'khatra_score'],
    },
  },
  taxonomy: {
    dimensions: ['date', 'channel', 'country', 'rule_type'],
    measures: ['transactions', 'flagged_tx', 'confirmed_fraud', 'false_positives', 'fraud_loss', 'tx_volume_usd', 'recovered_usd', 'avg_risk_score'],
  },
  kpis: [
    {
      id: 'fraud_rate_pct',
      title: 'Confirmed Fraud Rate (%)',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['confirmed_fraud', 'transactions'],
      formulaText: 'Percentage of total processed transactions confirmed as fraudulent or chargebacks.',
      source: 'Confirmed Fraud Rate (%) = (Confirmed Fraud Transactions / Total Transactions) × 100',
      formula: (rows, r) => {
        const tx = sumRole(rows, r, 'transactions');
        const fraud = sumRole(rows, r, 'confirmed_fraud');
        if (tx <= 0 || fraud < 0) return null;
        return safePct(fraud, tx, { min: 0, max: 100 });
      },
      target: 0.15,
    },
    {
      id: 'false_positive_rate',
      title: 'False Positive Rate',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['false_positives', 'flagged_tx'],
      formulaText: 'Percentage of flagged or blocked alerts that turned out to be legitimate customer transactions.',
      source: 'False Positive Rate (%) = (False Positives / Total Flagged Alerts) × 100',
      formula: (rows, r) => {
        const flagged = sumRole(rows, r, 'flagged_tx');
        const fp = sumRole(rows, r, 'false_positives');
        if (flagged <= 0 || fp < 0) return null;
        return safePct(fp, flagged, { min: 0, max: 100 });
      },
      target: 18.0,
    },
    {
      id: 'gross_fraud_loss',
      title: 'Gross Fraud Loss',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['fraud_loss'],
      formulaText: 'Total monetary value lost to confirmed fraud events and chargebacks.',
      source: 'Gross Fraud Loss = Σ(Confirmed Fraud & Chargeback Loss)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'fraud_loss') ? sumRole(rows, r, 'fraud_loss') : null),
    },
    {
      id: 'loss_to_volume_pct',
      title: 'Fraud Loss / Volume (%)',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['fraud_loss', 'tx_volume_usd'],
      formulaText: 'Gross monetary fraud loss as a percentage of total payment volume (TPV).',
      source: 'Fraud Loss Rate (%) = (Gross Fraud Loss / Total Processed Volume) × 100',
      formula: (rows, r) => {
        const vol = sumRole(rows, r, 'tx_volume_usd');
        const loss = sumRole(rows, r, 'fraud_loss');
        if (vol <= 0 || loss < 0) return null;
        return safePct(loss, vol, { min: 0, max: 100 });
      },
      target: 0.08,
    },
    {
      id: 'recovery_rate',
      title: 'Loss Recovery Rate',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['recovered_usd', 'fraud_loss'],
      formulaText: 'Percentage of gross fraud loss recovered via dispute representment or interception.',
      source: 'Recovery Rate (%) = (Recovered Amount / Gross Fraud Loss) × 100',
      formula: (rows, r) => {
        const loss = sumRole(rows, r, 'fraud_loss');
        const rec = sumRole(rows, r, 'recovered_usd');
        if (loss <= 0 || rec < 0) return null;
        return safePct(rec, loss, { min: 0, max: 100 });
      },
      target: 45,
    },
    {
      id: 'alert_trigger_rate',
      title: 'Alert Trigger Rate',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['flagged_tx', 'transactions'],
      formulaText: 'Percentage of total incoming transactions flagged or challenged by risk rules.',
      source: 'Alert Trigger Rate (%) = (Flagged Transactions / Total Transactions) × 100',
      formula: (rows, r) => safePct(sumRole(rows, r, 'flagged_tx'), sumRole(rows, r, 'transactions'), { min: 0, max: 100 }),
    },
    {
      id: 'total_flagged_alerts',
      title: 'Total Risk Alerts',
      unit: 'count',
      favorableDirection: 'down',
      requiredRoles: ['flagged_tx'],
      formulaText: 'Total count of transactions flagged for manual review or automated challenge.',
      source: 'Total Risk Alerts = Σ(Flagged Transactions)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'flagged_tx') ? sumRole(rows, r, 'flagged_tx') : null),
    },
    {
      id: 'precision_rate',
      title: 'Detection Precision',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['confirmed_fraud', 'flagged_tx'],
      formulaText: 'Percentage of flagged alerts that are true positive fraud events.',
      source: 'Detection Precision (%) = (Confirmed Fraud / Total Flagged Alerts) × 100',
      formula: (rows, r) => safePct(sumRole(rows, r, 'confirmed_fraud'), sumRole(rows, r, 'flagged_tx'), { min: 0, max: 100 }),
    },
    {
      id: 'avg_risk_score',
      title: 'Avg ML Risk Score',
      unit: 'score',
      favorableDirection: 'down',
      requiredRoles: ['avg_risk_score'],
      formulaText: 'Average machine-learning anomaly risk score across monitored transactions (0–100 scale).',
      source: 'Avg ML Risk Score = Average(Transaction Risk Score)',
      formula: (rows, r) => avgPctRole(rows, r, 'avg_risk_score', { max: 100 }),
    },
  ],
  charts: [
    {
      id: 'risk_loss_trend',
      title: 'Fraud Loss vs Recovered Funds Over Time',
      subtitle: 'Monthly gross exposure and recovery trajectory',
      intent: 'trend',
      xRole: 'date',
      yRoles: ['fraud_loss', 'recovered_usd'],
      aggregation: 'sum',
    },
    {
      id: 'risk_by_vector',
      title: 'Confirmed Fraud by Attack Vector / Rule',
      subtitle: 'Top fraud typologies ranked by loss volume',
      intent: 'ranking',
      xRole: 'rule_type',
      yRoles: ['fraud_loss', 'confirmed_fraud'],
      aggregation: 'sum',
    },
    {
      id: 'risk_channel_share',
      title: 'Fraud Exposure by Payment Channel',
      subtitle: 'Share of fraud loss across Card, Wire, ACH, and Wallet',
      intent: 'composition',
      xRole: 'channel',
      yRoles: ['fraud_loss'],
      aggregation: 'sum',
    },
    {
      id: 'risk_fp_vs_fraud',
      title: 'Flagged Alerts vs False Positives by Channel',
      subtitle: 'Customer friction and rule tuning accuracy',
      intent: 'comparison',
      xRole: 'channel',
      yRoles: ['flagged_tx', 'false_positives', 'confirmed_fraud'],
      aggregation: 'sum',
    },
    {
      id: 'risk_geo_hotspots',
      title: 'High-Risk Jurisdictions by Anomaly Score',
      subtitle: 'Geographic distribution of elevated ML risk scores',
      intent: 'Exception',
      xRole: 'country',
      yRoles: ['avg_risk_score', 'fraud_loss'],
      aggregation: 'avg',
    },
    {
      id: 'risk_tx_distribution',
      title: 'Transaction Volume by Payment Rail',
      subtitle: 'Total payment volume monitored across channels',
      intent: 'distribution',
      xRole: 'channel',
      yRoles: ['tx_volume_usd'],
      aggregation: 'sum',
    },
  ],
  lenses: [
    {
      id: 'exec',
      name: 'Executive',
      description: 'Net fraud loss exposure, loss-to-volume bps, and recovery rate',
      kpiIds: ['gross_fraud_loss', 'loss_to_volume_pct', 'recovery_rate', 'fraud_rate_pct'],
      chartIds: ['risk_loss_trend', 'risk_by_vector', 'risk_channel_share'],
    },
    {
      id: 'ops',
      name: 'Operations',
      description: 'Alert queue volume, false positives, and analyst review load',
      kpiIds: ['total_flagged_alerts', 'false_positive_rate', 'alert_trigger_rate', 'precision_rate'],
      chartIds: ['risk_fp_vs_fraud', 'risk_by_vector', 'risk_tx_distribution'],
    },
    {
      id: 'Perf',
      name: 'Performance',
      description: 'Rule precision, ML score calibration, and dispute recovery',
      kpiIds: ['precision_rate', 'false_positive_rate', 'recovery_rate', 'avg_risk_score'],
      chartIds: ['risk_fp_vs_fraud', 'risk_loss_trend'],
    },
    {
      id: 'risk',
      name: 'Risk & Exceptions',
      description: 'Attack vector spikes and high-risk geographic corridors',
      kpiIds: ['gross_fraud_loss', 'fraud_rate_pct', 'avg_risk_score'],
      chartIds: ['risk_geo_hotspots', 'risk_by_vector'],
    },
  ],
  reportSections: ['Executive Summary', 'KPI Scorecard', 'Fraud Typology & Loss Analysis', 'Rule Precision & False Positive Audit', 'Recommendations'],
  sampleDataset: {
    name: 'risk_fraud_compliance_2025.csv',
    rows: [
      { date: '2025-01-01', channel: 'CNP Credit Card', country: 'US', rule_type: 'ATO / Credential Stuffing', transactions: 420000, flagged_tx: 3150, confirmed_fraud: 680, false_positives: 620, fraud_loss: 94000, tx_volume_usd: 84000000, recovered_usd: 41000, avg_risk_score: 28 },
      { date: '2025-01-01', channel: 'Instant Wire / RTP', country: 'UK', rule_type: 'Synthetic Identity', transactions: 85000, flagged_tx: 980, confirmed_fraud: 195, false_positives: 210, fraud_loss: 62000, tx_volume_usd: 51000000, recovered_usd: 29000, avg_risk_score: 34 },
      { date: '2025-02-01', channel: 'Digital Wallet', country: 'CA', rule_type: 'Velocity Spike', transactions: 310000, flagged_tx: 1860, confirmed_fraud: 410, false_positives: 340, fraud_loss: 48000, tx_volume_usd: 62000000, recovered_usd: 24500, avg_risk_score: 22 },
      { date: '2025-02-01', channel: 'ACH / Direct Debit', country: 'US', rule_type: 'AML Structuring', transactions: 145000, flagged_tx: 720, confirmed_fraud: 130, false_positives: 145, fraud_loss: 39000, tx_volume_usd: 72500000, recovered_usd: 21000, avg_risk_score: 19 },
      { date: '2025-03-01', channel: 'CNP Credit Card', country: 'BR', rule_type: 'BIN Attack / Carding', transactions: 190000, flagged_tx: 2450, confirmed_fraud: 590, false_positives: 490, fraud_loss: 81000, tx_volume_usd: 38000000, recovered_usd: 33000, avg_risk_score: 41 },
      { date: '2025-03-01', channel: 'Digital Wallet', country: 'DE', rule_type: 'ATO / Credential Stuffing', transactions: 265000, flagged_tx: 1420, confirmed_fraud: 310, false_positives: 240, fraud_loss: 36000, tx_volume_usd: 53000000, recovered_usd: 19500, avg_risk_score: 21 },
    ],
  },
};
