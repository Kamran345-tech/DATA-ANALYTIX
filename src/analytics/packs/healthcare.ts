import { AnalyticsPackConfig } from './types';
import { sumRole, avgRole, safeDivVal, safePct, hasValidRoleNumber, avgPctRole } from './helpers';

export const healthcarePack: AnalyticsPackConfig = {
  id: 'healthcare',
  name: 'Healthcare & Clinical Ops',
  category: 'People & Sector',
  icon: 'HeartPulse',
  description: 'Patient admissions, average length of stay (ALOS), 30-day readmission rate, bed occupancy, ER wait time, and cost per encounter.',
  detect: {
    keywords: [
      'admissions', 'readmission', 'alos', 'length_of_stay', 'bed_occupancy', 'patient',
      'inpatient', 'outpatient', 'er_wait', 'clinical', 'discharge', 'drg',
      'mareez', 'aspatal', 'bistar_occupancy', 'dobara_dakhila', 'dakhila',
    ],
    requiredRoles: ['date', 'admissions'],
    optionalRoles: ['department', 'facility', 'payer', 'readmissions', 'alos_days', 'bed_occupancy_pct', 'er_wait_mins', 'treatment_cost', 'patient_satisfaction', 'total_beds', 'occupied_beds'],
    roleAliases: {
      date: ['date', 'admission_date', 'discharge_date', 'month', 'period', 'tareekh'],
      department: ['department', 'specialty', 'service_line', 'ward', 'unit', 'shoba', 'ward_name'],
      facility: ['facility', 'hospital', 'clinic', 'campus', 'medical_center', 'aspatal', 'shifakhana'],
      payer: ['payer', 'insurance_type', 'coverage', 'payor', 'bima_company'],
      admissions: ['admissions', 'encounters', 'patients', 'discharges', 'inpatients', 'dakhila', 'mareez_count'],
      readmissions: ['readmissions', 'readmission_30d', 'repeat_admissions', 'dobara_dakhila'],
      alos_days: ['alos_days', 'length_of_stay', 'alos', 'avg_stay_days', 'qiyam_din'],
      bed_occupancy_pct: ['bed_occupancy_pct', 'occupancy_rate', 'bed_utilization', 'bistar_occupancy'],
      er_wait_mins: ['er_wait_mins', 'wait_time_mins', 'door_to_doc_mins', 'triage_wait', 'intezar_mins'],
      treatment_cost: ['treatment_cost', 'clinical_cost', 'encounter_cost', 'total_charges', 'ilaaj_kharcha'],
      patient_satisfaction: ['patient_satisfaction', 'hcahps_score', 'patient_nps', 'mareez_itminan'],
      total_beds: ['total_beds', 'available_beds', 'licensed_beds', 'kul_bistar'],
      occupied_beds: ['occupied_beds', 'census_beds', 'filled_beds', 'bhare_bistar'],
    },
  },
  taxonomy: {
    dimensions: ['date', 'department', 'facility', 'payer'],
    measures: ['admissions', 'readmissions', 'alos_days', 'bed_occupancy_pct', 'er_wait_mins', 'treatment_cost', 'patient_satisfaction', 'total_beds', 'occupied_beds'],
  },
  kpis: [
    {
      id: 'total_admissions',
      title: 'Total Patient Admissions',
      unit: 'count',
      favorableDirection: 'up',
      requiredRoles: ['admissions'],
      formulaText: 'Total inpatient and clinical encounters admitted during the period.',
      source: 'Total Admissions = Σ(Patient Admissions / Encounters)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'admissions') ? sumRole(rows, r, 'admissions') : null),
    },
    {
      id: 'readmission_rate',
      title: '30-Day Readmission Rate',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['readmissions', 'admissions'],
      formulaText: 'Percentage of discharged patients readmitted within 30 days of initial discharge.',
      source: '30-Day Readmission Rate (%) = (30-Day Readmissions / Total Admissions) × 100',
      formula: (rows, r) => {
        const adm = sumRole(rows, r, 'admissions');
        const readm = sumRole(rows, r, 'readmissions');
        if (adm <= 0 || readm < 0) return null;
        return safePct(readm, adm, { min: 0, max: 100 });
      },
      target: 8.5,
    },
    {
      id: 'avg_alos',
      title: 'Avg Length of Stay (ALOS)',
      unit: 'days',
      favorableDirection: 'down',
      requiredRoles: ['alos_days'],
      formulaText: 'Average number of inpatient hospital days per patient admission.',
      source: 'ALOS (Days) = Average(Inpatient Days per Admission)',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'alos_days')) return null;
        const val = avgRole(rows, r, 'alos_days');
        return val !== null && val >= 0 ? val : null;
      },
      target: 4.2,
    },
    {
      id: 'bed_occupancy',
      title: 'Bed Occupancy Rate',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['bed_occupancy_pct'],
      formulaText: 'Percentage of licensed inpatient beds occupied by patients.',
      source: 'Bed Occupancy Rate (%) = (Occupied Inpatient Bed Days / Available Bed Days) × 100',
      assumption: 'Computes (Occupied Beds / Total Beds) × 100 when bed counts are mapped; otherwise averages reported `bed_occupancy_pct`.',
      formula: (rows, r) => {
        if (hasValidRoleNumber(rows, r, 'occupied_beds') && hasValidRoleNumber(rows, r, 'total_beds')) {
          return safePct(sumRole(rows, r, 'occupied_beds'), sumRole(rows, r, 'total_beds'), { min: 0, max: 100 });
        }
        return avgPctRole(rows, r, 'bed_occupancy_pct', { max: 100 });
      },
      target: 84,
    },
    {
      id: 'er_wait_time',
      title: 'Avg ER Wait Time (Mins)',
      unit: 'days',
      favorableDirection: 'down',
      requiredRoles: ['er_wait_mins'],
      formulaText: 'Average emergency department door-to-provider wait time in minutes.',
      source: 'Avg ER Wait Time (Mins) = Average(Provider Evaluation Time − Triage Arrival Time)',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'er_wait_mins')) return null;
        const val = avgRole(rows, r, 'er_wait_mins');
        return val !== null && val >= 0 ? val : null;
      },
      target: 28,
    },
    {
      id: 'cost_per_admission',
      title: 'Cost per Encounter',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['treatment_cost', 'admissions'],
      formulaText: 'Average direct and indirect clinical treatment cost per patient encounter.',
      source: 'Cost per Encounter = Total Clinical Treatment Cost / Total Admissions',
      formula: (rows, r) => safeDivVal(sumRole(rows, r, 'treatment_cost'), sumRole(rows, r, 'admissions')),
    },
    {
      id: 'total_clinical_cost',
      title: 'Total Clinical Cost',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['treatment_cost'],
      formulaText: 'Cumulative inpatient and outpatient care delivery cost.',
      source: 'Total Clinical Cost = Σ(Treatment & Care Delivery Costs)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'treatment_cost') ? sumRole(rows, r, 'treatment_cost') : null),
    },
    {
      id: 'patient_satisfaction_score',
      title: 'Patient Satisfaction (HCAHPS)',
      unit: 'score',
      favorableDirection: 'up',
      requiredRoles: ['patient_satisfaction'],
      formulaText: 'Average HCAHPS patient experience top-box score (0–100 scale).',
      source: 'Patient Satisfaction = Average(HCAHPS Top-Box Rating)',
      formula: (rows, r) => avgPctRole(rows, r, 'patient_satisfaction', { max: 100 }),
      target: 88,
    },
    {
      id: 'total_readmissions',
      title: '30-Day Readmissions',
      unit: 'count',
      favorableDirection: 'down',
      requiredRoles: ['readmissions'],
      formulaText: 'Total count of unplanned 30-day hospital readmissions.',
      source: '30-Day Readmissions = Σ(Unplanned 30-Day Readmissions)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'readmissions') ? sumRole(rows, r, 'readmissions') : null),
    },
  ],
  charts: [
    {
      id: 'hc_admissions_trend',
      title: 'Admissions & Readmissions Over Time',
      subtitle: 'Monthly patient volume and 30-day readmission trajectory',
      intent: 'trend',
      xRole: 'date',
      yRoles: ['admissions', 'readmissions'],
      aggregation: 'sum',
    },
    {
      id: 'hc_dept_ranking',
      title: 'Patient Volume & Cost by Specialty',
      subtitle: 'Clinical service lines ranked by admissions and care cost',
      intent: 'ranking',
      xRole: 'department',
      yRoles: ['admissions', 'treatment_cost'],
      aggregation: 'sum',
    },
    {
      id: 'hc_alos_occupancy',
      title: 'ALOS & Bed Occupancy by Facility',
      subtitle: 'Inpatient length of stay vs capacity utilization across hospitals',
      intent: 'comparison',
      xRole: 'facility',
      yRoles: ['bed_occupancy_pct', 'alos_days'],
      aggregation: 'avg',
    },
    {
      id: 'hc_payer_mix',
      title: 'Admissions Share by Payer Type',
      subtitle: 'Commercial, Medicare, Medicaid, and Self-Pay mix',
      intent: 'composition',
      xRole: 'payer',
      yRoles: ['admissions'],
      aggregation: 'sum',
    },
    {
      id: 'hc_wait_exceptions',
      title: 'ER Wait Time & Readmissions by Specialty',
      subtitle: 'Clinical bottlenecks and care quality exceptions',
      intent: 'Exception',
      xRole: 'department',
      yRoles: ['er_wait_mins', 'readmissions'],
      aggregation: 'avg',
    },
    {
      id: 'hc_satisfaction_dist',
      title: 'Patient Satisfaction (HCAHPS) by Facility',
      subtitle: 'Care experience ratings across campuses',
      intent: 'distribution',
      xRole: 'facility',
      yRoles: ['patient_satisfaction'],
      aggregation: 'avg',
    },
  ],
  lenses: [
    {
      id: 'exec',
      name: 'Executive',
      description: 'Patient volume, cost per encounter, HCAHPS satisfaction, and bed utilization',
      kpiIds: ['total_admissions', 'cost_per_admission', 'bed_occupancy', 'patient_satisfaction_score', 'readmission_rate'],
      chartIds: ['hc_admissions_trend', 'hc_dept_ranking', 'hc_payer_mix'],
    },
    {
      id: 'ops',
      name: 'Operations',
      description: 'ALOS, bed occupancy, ER triage wait times, and throughput',
      kpiIds: ['avg_alos', 'bed_occupancy', 'er_wait_time', 'total_admissions'],
      chartIds: ['hc_alos_occupancy', 'hc_wait_exceptions', 'hc_dept_ranking'],
    },
    {
      id: 'Perf',
      name: 'Performance',
      description: 'Care quality outcomes, HCAHPS scores, and cost efficiency',
      kpiIds: ['patient_satisfaction_score', 'readmission_rate', 'cost_per_admission', 'avg_alos'],
      chartIds: ['hc_satisfaction_dist', 'hc_alos_occupancy', 'hc_admissions_trend'],
    },
    {
      id: 'risk',
      name: 'Risk & Exceptions',
      description: '30-day readmission spikes and emergency department wait delays',
      kpiIds: ['readmission_rate', 'total_readmissions', 'er_wait_time'],
      chartIds: ['hc_wait_exceptions', 'hc_admissions_trend'],
    },
  ],
  reportSections: ['Executive Summary', 'KPI Scorecard', 'Clinical Throughput & Capacity Review', 'Quality Outcomes & Readmission Audit', 'Recommendations'],
  sampleDataset: {
    name: 'clinical_hospital_ops_2025.csv',
    rows: [
      { date: '2025-01-01', department: 'Cardiology', facility: 'Metro General', payer: 'Medicare', admissions: 620, readmissions: 58, alos_days: 4.8, bed_occupancy_pct: 88, er_wait_mins: 26, treatment_cost: 4960000, patient_satisfaction: 89 },
      { date: '2025-01-01', department: 'Orthopedics', facility: 'Westside Surgical', payer: 'Commercial', admissions: 480, readmissions: 24, alos_days: 3.4, bed_occupancy_pct: 82, er_wait_mins: 21, treatment_cost: 4320000, patient_satisfaction: 92 },
      { date: '2025-02-01', department: 'Internal Medicine', facility: 'Metro General', payer: 'Medicaid', admissions: 890, readmissions: 89, alos_days: 5.1, bed_occupancy_pct: 91, er_wait_mins: 38, treatment_cost: 5340000, patient_satisfaction: 84 },
      { date: '2025-02-01', department: 'Oncology', facility: 'University Medical', payer: 'Commercial', admissions: 410, readmissions: 31, alos_days: 5.6, bed_occupancy_pct: 85, er_wait_mins: 19, treatment_cost: 5740000, patient_satisfaction: 94 },
      { date: '2025-03-01', department: 'Cardiology', facility: 'University Medical', payer: 'Medicare', admissions: 670, readmissions: 52, alos_days: 4.5, bed_occupancy_pct: 87, er_wait_mins: 24, treatment_cost: 5226000, patient_satisfaction: 91 },
      { date: '2025-03-01', department: 'Emergency / Trauma', facility: 'Metro General', payer: 'Self-Pay', admissions: 1120, readmissions: 96, alos_days: 2.9, bed_occupancy_pct: 93, er_wait_mins: 42, treatment_cost: 4480000, patient_satisfaction: 81 },
    ],
  },
};
