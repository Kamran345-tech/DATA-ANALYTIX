import { AnalyticsPackConfig } from './types';
import { sumRole, avgRole, safeDivVal, safePct, hasValidRoleNumber, avgPctRole } from './helpers';

export const manufacturingPack: AnalyticsPackConfig = {
  id: 'manufacturing',
  name: 'Manufacturing & Plant Quality',
  category: 'Operations & Supply',
  icon: 'Factory',
  description: 'OEE (Overall Equipment Effectiveness), First Pass Yield (FPY), scrap rate, unplanned downtime, cycle time, and unit production cost.',
  detect: {
    keywords: [
      'oee', 'first_pass_yield', 'fpy', 'scrap', 'downtime', 'production_units',
      'plant', 'assembly_line', 'defect_units', 'cycle_time', 'machine', 'shift',
      'karkhana', 'paidawar', 'kharab_maal', 'machine_band', 'availability_pct', 'performance_pct',
    ],
    requiredRoles: ['date', 'produced_units'],
    optionalRoles: ['plant', 'line', 'shift', 'good_units', 'scrap_units', 'oee_pct', 'downtime_hours', 'production_cost', 'cycle_time_sec', 'availability_pct', 'performance_pct', 'quality_pct'],
    roleAliases: {
      date: ['date', 'production_date', 'shift_date', 'month', 'period', 'tareekh'],
      plant: ['plant', 'factory', 'site', 'facility', 'manufacturing_plant', 'karkhana'],
      line: ['line', 'assembly_line', 'work_center', 'machine_id', 'cell', 'machine_line'],
      shift: ['shift', 'crew', 'shift_name', 'rotation', 'pali'],
      produced_units: ['produced_units', 'total_produced', 'output_units', 'manufactured_units', 'kul_paidawar'],
      good_units: ['good_units', 'conforming_units', 'fpy_units', 'passed_units', 'sahi_maal'],
      scrap_units: ['scrap_units', 'defects', 'rejected_units', 'rework_units', 'kharab_maal'],
      oee_pct: ['oee_pct', 'oee', 'equipment_effectiveness', 'machine_oee'],
      downtime_hours: ['downtime_hours', 'unplanned_downtime', 'stoppage_hours', 'breakdown_hrs', 'band_ghante'],
      production_cost: ['production_cost', 'manufacturing_cost', 'plant_cost', 'direct_cost', 'paidawar_laagat'],
      cycle_time_sec: ['cycle_time_sec', 'takt_time', 'unit_cycle_sec', 'fi_unit_sec'],
      availability_pct: ['availability_pct', 'availability', 'uptime_ratio', 'machine_availability'],
      performance_pct: ['performance_pct', 'performance_efficiency', 'speed_efficiency', 'performance_ratio'],
      quality_pct: ['quality_pct', 'quality_rate', 'yield_rate'],
    },
  },
  taxonomy: {
    dimensions: ['date', 'plant', 'line', 'shift'],
    measures: ['produced_units', 'good_units', 'scrap_units', 'oee_pct', 'downtime_hours', 'production_cost', 'cycle_time_sec', 'availability_pct', 'performance_pct', 'quality_pct'],
  },
  kpis: [
    {
      id: 'oee_score',
      title: 'Overall Equipment Effectiveness (OEE)',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['oee_pct'],
      formulaText: 'Composite manufacturing productivity metric multiplying machine Availability, Performance efficiency, and Quality yield.',
      source: 'OEE (%) = Availability (%) × Performance (%) × Quality (%)',
      assumption: 'Computes Availability × Performance × Quality when component ratios are mapped; otherwise averages reported `oee_pct`.',
      formula: (rows, r) => {
        if (hasValidRoleNumber(rows, r, 'availability_pct') && hasValidRoleNumber(rows, r, 'performance_pct')) {
          const avail = avgPctRole(rows, r, 'availability_pct', { max: 100 });
          const perf = avgPctRole(rows, r, 'performance_pct', { max: 100 });
          let qual: number | null = null;
          if (hasValidRoleNumber(rows, r, 'quality_pct')) {
            qual = avgPctRole(rows, r, 'quality_pct', { max: 100 });
          } else if (hasValidRoleNumber(rows, r, 'good_units') && hasValidRoleNumber(rows, r, 'produced_units')) {
            qual = safePct(sumRole(rows, r, 'good_units'), sumRole(rows, r, 'produced_units'), { min: 0, max: 100 });
          }
          if (avail !== null && perf !== null && qual !== null) {
            return (avail / 100) * (perf / 100) * (qual / 100) * 100;
          }
        }
        return avgPctRole(rows, r, 'oee_pct', { max: 100 });
      },
      target: 85,
    },
    {
      id: 'first_pass_yield',
      title: 'First Pass Yield (FPY %)',
      unit: 'percent',
      favorableDirection: 'up',
      requiredRoles: ['good_units', 'produced_units'],
      formulaText: 'Percentage of total manufactured units passing quality inspection on the first run without rework.',
      source: 'First Pass Yield (%) = (Good Conforming Units / Total Produced Units) × 100',
      formula: (rows, r) => {
        const prod = sumRole(rows, r, 'produced_units');
        const good = sumRole(rows, r, 'good_units');
        if (prod <= 0 || good < 0) return null;
        return safePct(good, prod, { min: 0, max: 100 });
      },
      target: 97.5,
    },
    {
      id: 'scrap_rate',
      title: 'Scrap & Defect Rate (%)',
      unit: 'percent',
      favorableDirection: 'down',
      requiredRoles: ['scrap_units', 'produced_units'],
      formulaText: 'Percentage of total produced units rejected as scrap or requiring rework.',
      source: 'Scrap Rate (%) = (Scrap & Defect Units / Total Produced Units) × 100',
      formula: (rows, r) => {
        const prod = sumRole(rows, r, 'produced_units');
        const scrap = sumRole(rows, r, 'scrap_units');
        if (prod <= 0 || scrap < 0) return null;
        return safePct(scrap, prod, { min: 0, max: 100 });
      },
      target: 2.0,
    },
    {
      id: 'total_produced',
      title: 'Total Output (Units)',
      unit: 'count',
      favorableDirection: 'up',
      requiredRoles: ['produced_units'],
      formulaText: 'Total physical units manufactured across all plants and assembly lines.',
      source: 'Total Output = Σ(Produced Units)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'produced_units') ? sumRole(rows, r, 'produced_units') : null),
    },
    {
      id: 'total_downtime',
      title: 'Unplanned Downtime (Hrs)',
      unit: 'count',
      favorableDirection: 'down',
      requiredRoles: ['downtime_hours'],
      formulaText: 'Total cumulative hours of unplanned equipment breakdown or line stoppage.',
      source: 'Unplanned Downtime (Hrs) = Σ(Equipment Breakdown Hours)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'downtime_hours') ? sumRole(rows, r, 'downtime_hours') : null),
    },
    {
      id: 'unit_production_cost',
      title: 'Cost per Good Unit',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['production_cost', 'good_units'],
      formulaText: 'Total direct manufacturing cost divided by conforming good units produced.',
      source: 'Cost per Good Unit = Total Manufacturing Cost / Good Conforming Units',
      formula: (rows, r) => safeDivVal(sumRole(rows, r, 'production_cost'), sumRole(rows, r, 'good_units')),
    },
    {
      id: 'avg_cycle_time',
      title: 'Avg Cycle Time (Sec)',
      unit: 'days',
      favorableDirection: 'down',
      requiredRoles: ['cycle_time_sec'],
      formulaText: 'Average processing time in seconds required to manufacture one unit.',
      source: 'Avg Cycle Time (Sec) = Average(Unit Processing Time in Seconds)',
      formula: (rows, r) => {
        if (!hasValidRoleNumber(rows, r, 'cycle_time_sec')) return null;
        const val = avgRole(rows, r, 'cycle_time_sec');
        return val !== null && val >= 0 ? val : null;
      },
    },
    {
      id: 'total_scrap_units',
      title: 'Scrap & Rejected Units',
      unit: 'count',
      favorableDirection: 'down',
      requiredRoles: ['scrap_units'],
      formulaText: 'Total count of defective units scrapped during production.',
      source: 'Scrap Units = Σ(Rejected & Defective Units)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'scrap_units') ? sumRole(rows, r, 'scrap_units') : null),
    },
    {
      id: 'total_plant_cost',
      title: 'Total Manufacturing Cost',
      unit: 'currency',
      favorableDirection: 'down',
      requiredRoles: ['production_cost'],
      formulaText: 'Cumulative direct labor, material, and overhead manufacturing spend.',
      source: 'Total Manufacturing Cost = Σ(Direct Plant Production Cost)',
      formula: (rows, r) => (hasValidRoleNumber(rows, r, 'production_cost') ? sumRole(rows, r, 'production_cost') : null),
    },
  ],
  charts: [
    {
      id: 'mfg_output_trend',
      title: 'Production Output & Good Units Over Time',
      subtitle: 'Monthly plant throughput and first-pass conforming volume',
      intent: 'trend',
      xRole: 'date',
      yRoles: ['produced_units', 'good_units'],
      aggregation: 'sum',
    },
    {
      id: 'mfg_plant_ranking',
      title: 'Throughput & Cost by Plant Facility',
      subtitle: 'Output volume and production spend across factories',
      intent: 'ranking',
      xRole: 'plant',
      yRoles: ['produced_units', 'production_cost'],
      aggregation: 'sum',
    },
    {
      id: 'mfg_line_oee',
      title: 'OEE & Cycle Time by Assembly Line',
      subtitle: 'Equipment effectiveness vs cycle speed across work centers',
      intent: 'comparison',
      xRole: 'line',
      yRoles: ['oee_pct', 'cycle_time_sec'],
      aggregation: 'avg',
    },
    {
      id: 'mfg_shift_share',
      title: 'Output Share by Shift Crew',
      subtitle: 'Production distribution across Day, Swing, and Night shifts',
      intent: 'composition',
      xRole: 'shift',
      yRoles: ['produced_units'],
      aggregation: 'sum',
    },
    {
      id: 'mfg_downtime_scrap',
      title: 'Unplanned Downtime & Scrap by Assembly Line',
      subtitle: 'Equipment reliability bottlenecks and defect hotspots',
      intent: 'Exception',
      xRole: 'line',
      yRoles: ['downtime_hours', 'scrap_units'],
      aggregation: 'sum',
    },
    {
      id: 'mfg_cost_distribution',
      title: 'Manufacturing Spend by Plant',
      subtitle: 'Direct production cost allocation across facilities',
      intent: 'distribution',
      xRole: 'plant',
      yRoles: ['production_cost'],
      aggregation: 'sum',
    },
  ],
  lenses: [
    {
      id: 'exec',
      name: 'Executive',
      description: 'OEE, First Pass Yield, total throughput, and unit manufacturing cost',
      kpiIds: ['oee_score', 'first_pass_yield', 'total_produced', 'unit_production_cost', 'total_plant_cost'],
      chartIds: ['mfg_output_trend', 'mfg_plant_ranking', 'mfg_shift_share'],
    },
    {
      id: 'ops',
      name: 'Operations',
      description: 'Assembly line OEE, cycle times, shift output, and downtime hours',
      kpiIds: ['oee_score', 'avg_cycle_time', 'total_downtime', 'total_produced'],
      chartIds: ['mfg_line_oee', 'mfg_downtime_scrap', 'mfg_shift_share'],
    },
    {
      id: 'Perf',
      name: 'Performance',
      description: 'First Pass Yield, cost per good unit, and plant efficiency',
      kpiIds: ['first_pass_yield', 'unit_production_cost', 'oee_score', 'scrap_rate'],
      chartIds: ['mfg_plant_ranking', 'mfg_line_oee', 'mfg_cost_distribution'],
    },
    {
      id: 'risk',
      name: 'Risk & Exceptions',
      description: 'Scrap rate spikes, line breakdowns, and quality deviations',
      kpiIds: ['scrap_rate', 'total_scrap_units', 'total_downtime'],
      chartIds: ['mfg_downtime_scrap', 'mfg_line_oee'],
    },
  ],
  reportSections: ['Executive Summary', 'KPI Scorecard', 'OEE & Line Productivity Analysis', 'First Pass Yield & Scrap Root-Cause Audit', 'Recommendations'],
  sampleDataset: {
    name: 'plant_manufacturing_oee_2025.csv',
    rows: [
      { date: '2025-01-01', plant: 'Detroit Stamping', line: 'Line A-1', shift: 'Day Shift', produced_units: 48000, good_units: 47040, scrap_units: 960, oee_pct: 86.5, downtime_hours: 14, production_cost: 576000, cycle_time_sec: 22, availability_pct: 92.0, performance_pct: 96.0, quality_pct: 98.0 },
      { date: '2025-01-01', plant: 'Guadalajara Assembly', line: 'Line B-2', shift: 'Swing Shift', produced_units: 42000, good_units: 40740, scrap_units: 1260, oee_pct: 81.2, downtime_hours: 24, production_cost: 462000, cycle_time_sec: 25, availability_pct: 88.0, performance_pct: 95.1, quality_pct: 97.0 },
      { date: '2025-02-01', plant: 'Detroit Stamping', line: 'Line A-2', shift: 'Night Shift', produced_units: 44500, good_units: 43388, scrap_units: 1112, oee_pct: 83.4, downtime_hours: 19, production_cost: 534000, cycle_time_sec: 23, availability_pct: 90.0, performance_pct: 95.0, quality_pct: 97.5 },
      { date: '2025-02-01', plant: 'Stuttgart Precision', line: 'Line C-1', shift: 'Day Shift', produced_units: 39000, good_units: 38415, scrap_units: 585, oee_pct: 89.8, downtime_hours: 9, production_cost: 546000, cycle_time_sec: 20, availability_pct: 94.0, performance_pct: 97.0, quality_pct: 98.5 },
      { date: '2025-03-01', plant: 'Guadalajara Assembly', line: 'Line B-1', shift: 'Day Shift', produced_units: 46000, good_units: 44988, scrap_units: 1012, oee_pct: 84.9, downtime_hours: 16, production_cost: 496800, cycle_time_sec: 23, availability_pct: 91.0, performance_pct: 95.4, quality_pct: 97.8 },
      { date: '2025-03-01', plant: 'Stuttgart Precision', line: 'Line C-2', shift: 'Swing Shift', produced_units: 41500, good_units: 40836, scrap_units: 664, oee_pct: 88.4, downtime_hours: 11, production_cost: 560250, cycle_time_sec: 21, availability_pct: 93.0, performance_pct: 96.6, quality_pct: 98.4 },
    ],
  },
};
