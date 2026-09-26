import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  HelpCircle, 
  Activity, 
  Maximize2, 
  ArrowRight, 
  BarChart2, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export const AnalysisView: React.FC = () => {
  const { analytics, columns } = usePlatform();

  const primaryForecastKey = Object.keys(analytics.forecasts)[0];
  const forecast = primaryForecastKey ? analytics.forecasts[primaryForecastKey] : null;

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <Activity className="w-4 h-4" /> Statistical Modeling & Anomaly Core
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            STATISTICAL ANALYSIS & FORECASTING
          </h1>
          <p className="text-xs text-gray-400">
            Rigorous mathematical discovery. Trends, IQR outlier anomalies, Pearson correlation matrix, and Holt-Winters projections.
          </p>
        </div>
      </div>

      {/* 1. Correlation Matrix Heatmap */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#21F1A8]" />
            PEARSON CORRELATION MATRIX
          </h2>
          <span className="text-xs text-gray-400 font-mono">r: [-1.00 to +1.00]</span>
        </div>

        {analytics.correlationMatrix.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 bg-[#141414] rounded-xl border border-[#262626]">
            Insufficient numeric fields (minimum 2 numeric columns required) to compute Pearson correlation coefficients.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {analytics.correlationMatrix.map((pair, idx) => {
              const r = pair.correlation;
              const isPositive = r > 0;
              const isStrong = Math.abs(r) >= 0.7;

              return (
                <div key={idx} className="p-4 rounded-xl bg-[#141414] border border-[#282828] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium truncate max-w-[180px]">{pair.x} vs {pair.y}</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                      isStrong 
                        ? (isPositive ? 'bg-[#21F1A8]/20 text-[#21F1A8]' : 'bg-red-500/20 text-red-400')
                        : 'bg-[#222] text-gray-300'
                    }`}>
                      r = {r.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {isStrong 
                      ? (isPositive ? 'Strong positive co-movement' : 'Strong inverse relationship')
                      : 'Moderate / weak linear alignment'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Statistical IQR Outliers & Anomalies */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            IQR ANOMALY & RISK DETECTION ({analytics.anomalies.length})
          </h2>
          <span className="text-xs text-gray-400 font-mono">Tukey 1.5x IQR Fence</span>
        </div>

        {analytics.anomalies.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 bg-[#141414] rounded-xl border border-[#262626] space-y-2">
            <CheckCircle2 className="w-7 h-7 text-[#21F1A8] mx-auto" />
            <div className="font-bold text-white">No Critical Statistical Outliers Detected</div>
            <p>Dataset values remain well within expected standard deviation and interquartile thresholds.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.anomalies.map(anom => (
              <div 
                key={anom.id}
                className="p-4 rounded-xl bg-[#141414] border border-[#282828] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{anom.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                    anom.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {anom.severity}
                  </span>
                </div>
                <p className="text-gray-300">{anom.reason}</p>
                <div className="p-2.5 rounded bg-[#1e2722] border border-[#21F1A8]/30 text-[#21F1A8]">
                  <strong>Action:</strong> {anom.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Statistical Forecasting (RULE 6, 8, 40) */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#21F1A8]" />
              STATISTICAL TIME-SERIES FORECAST
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Model: {forecast?.method || 'Exponential Smoothing'} • Horizon: {forecast?.horizon || 0} periods
            </p>
          </div>

          {forecast?.isAvailable ? (
            <span className="px-2.5 py-1 rounded-lg bg-[#21F1A8]/15 text-[#21F1A8] font-mono text-xs font-semibold border border-[#21F1A8]/30">
              Verified Forecast Available
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-mono text-xs font-semibold border border-amber-500/30">
              Condition Unmet
            </span>
          )}
        </div>

        {forecast && !forecast.isAvailable ? (
          /* RULE 6 & RULE 8 STRICT REQUIREMENT */
          <div className="p-8 text-center bg-[#141414] rounded-xl border border-amber-500/30 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
            <h4 className="font-bold text-white text-sm">Forecast Unavailable</h4>
            <p className="text-xs text-amber-300 max-w-md mx-auto">
              "{forecast.unavailabilityReason || 'Insufficient data to calculate this metric.'}"
            </p>
            <p className="text-[11px] text-gray-500">
              Rule 6 Mandate: NexusBI never invents or extrapolates synthetic forecasts without adequate chronological observations.
            </p>
          </div>
        ) : forecast && forecast.isAvailable ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#141414] border border-[#262626] space-y-2">
              <div className="text-xs font-medium text-gray-300">
                Holt-Winters Single/Double Exponential smoothing with 95% Confidence Bounds:
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#1a1a1a] text-gray-400 border-b border-[#333]">
                    <tr>
                      <th className="p-2.5">Period</th>
                      <th className="p-2.5">Historical Actual</th>
                      <th className="p-2.5">Projected Forecast</th>
                      <th className="p-2.5">95% Confidence Bounds [Lower - Upper]</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {forecast.data.map((pt, i) => (
                      <tr key={i} className={pt.forecast ? 'bg-[#21F1A8]/5 text-[#21F1A8]' : 'text-gray-300'}>
                        <td className="p-2.5 font-bold">{pt.period}</td>
                        <td className="p-2.5">{pt.actual !== undefined ? pt.actual.toLocaleString() : '—'}</td>
                        <td className="p-2.5 font-bold">{pt.forecast !== undefined ? pt.forecast.toLocaleString() : '—'}</td>
                        <td className="p-2.5 text-gray-400">
                          {pt.confidenceLower !== undefined 
                            ? `[${pt.confidenceLower.toLocaleString()} - ${pt.confidenceUpper?.toLocaleString()}]` 
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
