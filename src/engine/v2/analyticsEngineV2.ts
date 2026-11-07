import { ColumnProfile, KPI, ForecastResult } from '../../types';
import { computeAnalytics as computeAnalyticsClassic, AnalyticsSummary } from '../analyticsEngine';

export interface KPIAuditTrace {
  rowsUsed: number;
  nullsSkipped: number;
  failedParses: number;
  formulaExpression: string;
  timestamp: string;
}

export interface KPIWithAuditTrace extends KPI {
  auditTrace?: KPIAuditTrace;
}

export interface AnalyticsSummaryV2 extends Omit<AnalyticsSummary, 'kpis'> {
  kpis: KPIWithAuditTrace[];
  isV2Engine: boolean;
  version: '2.0.0';
}

/**
 * Enhanced Analytics Engine (v2)
 * Adds per-KPI audit trace and future-dated forecast periods
 */
export function computeAnalyticsV2(
  columns: ColumnProfile[],
  rows: Record<string, any>[],
  tableName: string = 'FactTable'
): AnalyticsSummaryV2 {
  // Compute classic baseline
  const classic = computeAnalyticsClassic(columns, rows, tableName);

  const totalRows = rows.length;

  // Enrich each KPI with audit trace metadata
  const enrichedKpis: KPIWithAuditTrace[] = classic.kpis.map(kpi => {
    // Determine which column was used
    const matchedCol = columns.find(c => 
      c.name.toLowerCase() === kpi.name.toLowerCase() ||
      kpi.name.toLowerCase().includes(c.name.toLowerCase())
    );

    const nullCount = matchedCol ? matchedCol.nullCount : 0;
    const rowsUsed = Math.max(0, totalRows - nullCount);

    return {
      ...kpi,
      auditTrace: {
        rowsUsed,
        nullsSkipped: nullCount,
        failedParses: 0,
        formulaExpression: `SUM([${matchedCol?.name || kpi.name}]) / COUNTROWS()`,
        timestamp: new Date().toISOString()
      }
    };
  });

  // Future-date forecast period points
  const updatedForecasts: Record<string, ForecastResult> = {};
  for (const [key, forecast] of Object.entries(classic.forecasts || {})) {
    if (forecast && forecast.data && forecast.data.length > 0) {
      const dataPoints = [...forecast.data];
      const actualPoints = dataPoints.filter(p => p.actual !== undefined);
      const lastActual = actualPoints[actualPoints.length - 1];

      if (lastActual && lastActual.period) {
        const lastDate = new Date(lastActual.period);
        let futureMonth = 1;

        const updatedPoints = dataPoints.map(p => {
          if (p.actual === undefined && p.forecast !== undefined) {
            let nextPeriod = p.period;
            if (!isNaN(lastDate.getTime())) {
              const nd = new Date(lastDate);
              nd.setMonth(nd.getMonth() + futureMonth);
              nextPeriod = nd.toISOString().substring(0, 7);
              futureMonth++;
            }
            return { ...p, period: nextPeriod };
          }
          return p;
        });

        updatedForecasts[key] = {
          ...forecast,
          data: updatedPoints
        };
      } else {
        updatedForecasts[key] = forecast;
      }
    } else {
      updatedForecasts[key] = forecast;
    }
  }

  return {
    ...classic,
    kpis: enrichedKpis,
    forecasts: updatedForecasts,
    isV2Engine: true,
    version: '2.0.0'
  };
}
