import { AnalyticsPackConfig } from './types';
import { sumRole, avgRole, safeDivVal, safePct, hasValidRoleNumber, avgPctRole } from './helpers';

export const hrPack: AnalyticsPackConfig = {
  id: 'hr',
  name: 'HR & People Analytics',
  category: 'People & Sector',
  icon: 'UserCheck',
  description: 'Headcount, voluntary/involuntary attrition, time-to-hire, cost-per-hire, eNPS, diversity ratio, compensation, and training hours.',
  detect: {
    keywords: [
      'headcount', 'attrition', 'time_to_hire', 'enps', 'employees', 'turnover_rate',
      'hires', 'terminations', 'department', 'salary', 'payroll', 'training_hours',
      'mulazim', 'tankhwah', 'bharti', 'naukri_chorna', 'leavers', 'cost_per_hire',
    ],
    requiredRoles: ['date', 'headcount'],
    optionalRoles: ['department', 'location', 'level', 'hires', 'leavers', 'attrition_pct', 'time_to_hire_days', 'payroll_cost', 'enps', 'training_hours', 'female_pct'],
    roleAliases: {
      date: ['date', 'month', 'period', 'quarter', 'review_period', 'tareekh', 'mahina'],
      department: ['department', 'org_unit', 'function', 'business_unit', 'team', 'shoba', 'vibhag'],
      location: ['location', 'office', 'site', 'country', 'work_mode', 'daftar'],
      level: ['level', 'grade', 'band', 'seniority', 'role_level', 'ohda'],
      headcount: ['headcount', 'employees', 'active_employees', 'fte', 'staff_count', 'mulazim', 'kul_staff'],
      hires: ['hires', 'new_hires', 'onboarding', 'joiners', 'naye_bharti'],
      leavers: ['leavers', 'terminations', 'exits', 'resignations', 'attrition_count', 'chorne_wale'],
      attrition_pct: ['attrition_pct', 'turnover_rate', 'attrition_rate', 'chorne_ki_dar'],
      time_to_hire_days: ['time_to_hire_days', 'time_to_fill', 'hiring_days', 'bharti_waqt_din'],
      payroll_cost: ['payroll_cost', 'compensation', 'salary_cost', 'total_payroll', 'wages', 'tankhwah'],
      enps: ['enps', 'engagement_score', 'satisfaction_score', 'pulse_score', 'mulazim_khushi'],
      training_hours: ['training_hours', 'learning_hours', 'l_and_d_hours', 'tarbiyat_ghante'],
      female_pct: ['female_pct', 'diversity_pct', 'women_representation', 'khawateen_pct'],
    },
  },
  taxonomy: {
    dimensions: ['date', 'department', 'location', 'level'],
    measures: ['headcount', 'hires', 'leavers', 'attrition_pct', 'time_to_hire_days', 'payroll_cost', 'enps', 'training_hours', 'female_pct'],
  },
  kpis: [
    {
      id: 'total_headcount',
      title: 'Total Headcount (FTE)',
      unit: 'count',
      favorableDirection: 'up',
      requiredRoles: ['headcount'],
      formulaText: 'Total active full-time equivalent employees across all departments.',
      source: 'Total Headcount = Σ(Active Employees / FTE)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'headcount') ? sumRole(rows, r, 'headcount') : null),
    },
    {
      id: 'attrition_rate',
      title: 'Attrition Rate',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['attrition_pct'],
      formulaText: 'Percentage of workforce that exited during the period relative to average headcount.',
      source: 'Attrition Rate (%) = (Total Leavers / Average Headcount) × 100',
      assumption: 'Computes (Σ Leavers / Σ Headcount) × 100 when `leavers` and `headcount` are mapped; otherwise averages reported `attrition_pct`.',
      formula: (rows, r) => {
        if (hasValidRoleNumber(rows, r, 'attrition_pct')) {
          return avgPctRole(rows, r, 'attrition_pct', { max: 100 });
        }
        if (hasValidRoleNumber(rows, r, 'leavers') && hasValidRoleNumber(rows, r, 'headcount')) {
          return safePct(sumRole(rows, r, 'leavers'), sumRole(rows, r, 'headcount'), { min: 0, max: 100 });
        }
        return null;
      },
      target: 11.0,
    },
    {
      id: 'total_hires',
      title: 'New Hires',
      unit: 'count',
      favorableDirection: 'up',
      requiredRoles: ['hires'],
      formulaText: 'Total new employees onboarded during the reporting period.',
      source: 'New Hires = Σ(New Joiners)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'hires') ? sumRole(rows, r, 'hires') : null),
    },
    {
      id: 'total_leavers',
      title: 'Total Exits / Leavers',
      unit: 'count',
      favorableDirection: 'down',
      requiredRoles: ['leavers'],
      formulaText: 'Total voluntary and involuntary employee departures.',
      source: 'Total Exits = Σ(Voluntary + Involuntary Departures)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'leavers') ? sumRole(rows, r, 'leavers') : null),
    },
    {
      id: 'net_headcount_add',
      title: 'Net Workforce Growth',
      unit: 'count',
      favorableDirection: 'up',
      requiredRoles: ['hires', 'leavers'],
      formulaText: 'Net headcount change calculated as new hires minus employee exits.',
      source: 'Net Workforce Growth = Total Hires − Total Leavers',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'hires') || !hasValidRoleNumber(rows, r, 'leavers')) return null;
        return sumRole(rows, r, 'hires') - sumRole(rows, r, 'leavers');
      },
    },
    {
      id: 'time_to_hire',
      title: 'Avg Time to Hire (Days)',
      unit: 'days',
      favorableDirection: 'down',
      requiredRoles: ['time_to_hire_days'],
      formulaText: 'Average calendar days elapsed from job requisition opening to accepted offer.',
      source: 'Time to Hire (Days) = Average(Offer Accepted Date − Requisition Open Date)',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'time_to_hire_days')) return null;
        const val = avgRole(rows, r, 'time_to_hire_days');
        return val !== null && val >= 0 ? val : null;
      },
      target: 32,
    },
    {
      id: 'cost_per_employee',
      title: 'Avg Cost per Employee',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['payroll_cost', 'headcount'],
      formulaText: 'Average fully-loaded payroll compensation cost per active employee.',
      source: 'Avg Cost per Employee = Total Payroll Cost / Total Headcount',
      formula: (rows, r) => safeDivVal(sumRole(rows, r, 'payroll_cost'), sumRole(rows, r, 'headcount')),
    },
    {
      id: 'enps_score',
      title: 'Employee Engagement (eNPS)',
      unit: 'score',
      favorableDirection: 'up',
      requiredRoles: ['enps'],
      formulaText: 'Employee Net Promoter Score measuring workplace advocacy (-100 to +100).',
      source: 'eNPS = % Promoters − % Detractors',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'enps')) return null;
        const val = avgRole(rows, r, 'enps');
        return val !== null && val >= -100 && val <= 100 ? val : null;
      },
      target: 42,
    },
    {
      id: 'diversity_ratio',
      title: 'Gender Diversity (%)',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['female_pct'],
      formulaText: 'Percentage representation of women across the active workforce.',
      source: 'Gender Diversity (%) = (Female Headcount / Total Headcount) × 100',
      formula: (rows, r) => avgPctRole(rows, r, 'female_pct', { max: 100 }),
      target: 45,
    },
  ],
  charts: [
    {
      id: 'hr_headcount_trend',
      title: 'Headcount & Hiring Velocity Over Time',
      subtitle: 'Active FTE evolution alongside new hires and departures',
      intent: 'trend',
      xRole: 'date',
      yRoles: ['headcount', 'hires', 'leavers'],
      aggregation: 'sum',
    },
    {
      id: 'hr_dept_ranking',
      title: 'Headcount & Payroll by Department',
      subtitle: 'Workforce size and compensation allocation by org unit',
      intent: 'ranking',
      xRole: 'department',
      yRoles: ['headcount', 'payroll_cost'],
      aggregation: 'sum',
    },
    {
      id: 'hr_attrition_by_dept',
      title: 'Attrition Rate & eNPS by Department',
      subtitle: 'Retention health vs employee engagement across functions',
      intent: 'Exception',
      xRole: 'department',
      yRoles: ['attrition_pct', 'enps'],
      aggregation: 'avg',
    },
    {
      id: 'hr_location_share',
      title: 'Workforce Distribution by Location',
      subtitle: 'Employee footprint across global offices and remote hubs',
      intent: 'composition',
      xRole: 'location',
      yRoles: ['headcount'],
      aggregation: 'sum',
    },
    {
      id: 'hr_hiring_efficiency',
      title: 'Time to Hire by Seniority Level',
      subtitle: 'Recruiting cycle days across job bands',
      intent: 'comparison',
      xRole: 'level',
      yRoles: ['time_to_hire_days'],
      aggregation: 'avg',
    },
    {
      id: 'hr_training_distribution',
      title: 'L&D Training Hours by Department',
      subtitle: 'Upskilling investment across teams',
      intent: 'distribution',
      xRole: 'department',
      yRoles: ['training_hours'],
      aggregation: 'sum',
    },
  ],
  lenses: [
    {
      id: 'exec',
      name: 'Executive',
      description: 'Total headcount, attrition, payroll investment, and eNPS',
      kpiIds: ['total_headcount', 'attrition_rate', 'net_headcount_add', 'cost_per_employee', 'enps_score'],
      chartIds: ['hr_headcount_trend', 'hr_dept_ranking', 'hr_location_share'],
    },
    {
      id: 'ops',
      name: 'Operations',
      description: 'Recruiting velocity, time-to-hire, and L&D training delivery',
      kpiIds: ['total_hires', 'time_to_hire', 'diversity_ratio', 'total_leavers'],
      chartIds: ['hr_hiring_efficiency', 'hr_training_distribution', 'hr_location_share'],
    },
    {
      id: 'Perf',
      name: 'Performance',
      description: 'Engagement scores, diversity representation, and org scaling',
      kpiIds: ['enps_score', 'diversity_ratio', 'net_headcount_add', 'cost_per_employee'],
      chartIds: ['hr_dept_ranking', 'hr_attrition_by_dept', 'hr_headcount_trend'],
    },
    {
      id: 'risk',
      name: 'Risk & Exceptions',
      description: 'High-attrition departments, hiring bottlenecks, and engagement dips',
      kpiIds: ['attrition_rate', 'total_leavers', 'enps_score', 'time_to_hire'],
      chartIds: ['hr_attrition_by_dept', 'hr_hiring_efficiency'],
    },
  ],
  reportSections: ['Executive Summary', 'KPI Scorecard', 'Workforce & Talent Acquisition Review', 'Retention & Engagement Audit', 'Recommendations'],
  sampleDataset: {
    name: 'hr_people_workforce_2025.csv',
    rows: [
      { date: '2025-01-01', department: 'Engineering', location: 'Remote US', level: 'Senior (L5)', headcount: 340, hires: 24, leavers: 8, attrition_pct: 9.4, time_to_hire_days: 38, payroll_cost: 5440000, enps: 48, training_hours: 1360, female_pct: 36 },
      { date: '2025-01-01', department: 'Sales', location: 'New York', level: 'Mid (L4)', headcount: 210, hires: 19, leavers: 11, attrition_pct: 14.8, time_to_hire_days: 29, payroll_cost: 2730000, enps: 39, training_hours: 840, female_pct: 44 },
      { date: '2025-02-01', department: 'Product & Design', location: 'San Francisco', level: 'Senior (L5)', headcount: 95, hires: 7, leavers: 2, attrition_pct: 8.1, time_to_hire_days: 41, payroll_cost: 1567500, enps: 54, training_hours: 475, female_pct: 49 },
      { date: '2025-02-01', department: 'Customer Success', location: 'Austin', level: 'Associate (L3)', headcount: 160, hires: 15, leavers: 9, attrition_pct: 13.2, time_to_hire_days: 24, payroll_cost: 1440000, enps: 41, training_hours: 960, female_pct: 56 },
      { date: '2025-03-01', department: 'Engineering', location: 'London', level: 'Staff (L6)', headcount: 120, hires: 10, leavers: 3, attrition_pct: 8.8, time_to_hire_days: 44, payroll_cost: 2160000, enps: 51, training_hours: 600, female_pct: 38 },
      { date: '2025-03-01', department: 'G&A / Finance', location: 'New York', level: 'Mid (L4)', headcount: 75, hires: 4, leavers: 2, attrition_pct: 7.5, time_to_hire_days: 31, payroll_cost: 937500, enps: 46, training_hours: 300, female_pct: 52 },
    ],
  },
};
