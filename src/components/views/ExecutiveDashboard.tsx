import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Calendar, 
  Building2, 
  Zap, 
  Layers, 
  Award,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { GlobalFilterBar } from '../common/GlobalFilterBar';

export const ExecutiveDashboard: React.FC = () => {
  const { 
    project, 
    brand, 
    analytics, 
    qualityReport, 
    filteredRows, 
    cleanRows, 
    setCurrentTab,
    filters,
    setFilters
  } = usePlatform();

  const primaryTrend = analytics.trends[0];
  const primaryAnomaly = analytics.anomalies[0];
  const primaryOpportunity = analytics.opportunities[0];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* 1. Dashboard Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
                {brand.companyName} • {brand.department}
              </span>
              {project.isDemo && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                  DEMO DATA ACTIVE
                </span>
              )}
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
              EXECUTIVE DECISION & PERFORMANCE DASHBOARD
            </h1>
            <p className="text-xs text-gray-400">
              Reporting Scope: <span className="text-gray-200 font-medium">{project.name}</span> | Prepared by: <span className="text-gray-200 font-medium">{brand.author}</span> | Generated: <span className="font-mono text-gray-300">{new Date(project.updatedAt).toLocaleDateString()}</span>
            </p>
          </div>

          {/* Data Trust & Health Indicators */}
          <div className="flex items-center gap-3">
            <div className="bg-[#141414] border border-[#333] px-3.5 py-2 rounded-xl text-right">
              <div className="text-[10px] text-gray-400 uppercase font-mono">Data Quality</div>
              <div className="text-xl font-heading font-bold text-[#21F1A8] flex items-center justify-end gap-1">
                <ShieldCheck className="w-4 h-4" />
                {qualityReport.overallScore}%
              </div>
            </div>

            {analytics.businessHealthScore && (
              <div className="bg-[#141414] border border-[#333] px-3.5 py-2 rounded-xl text-right">
                <div className="text-[10px] text-gray-400 uppercase font-mono">Business Health</div>
                <div className="text-xl font-heading font-bold text-white flex items-center justify-end gap-1">
                  <Award className="w-4 h-4 text-amber-400" />
                  {analytics.businessHealthScore.score}/100
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Cross Filter Bar */}
        <GlobalFilterBar />
      </div>

      {/* 2. KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics.kpis.slice(0, 4).map(kpi => {
          const isPositive = (kpi.changePercent || 0) >= 0;
          return (
            <div 
              key={kpi.id} 
              className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4.5 space-y-3 relative group hover:border-[#21F1A8]/50 transition-all hover:glow-neon"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 truncate">{kpi.name}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                  kpi.status === 'Above Target' ? 'bg-[#21F1A8]/15 text-[#21F1A8]' :
                  kpi.status === 'At Risk' ? 'bg-red-500/15 text-red-400' :
                  kpi.status === 'Below Target' ? 'bg-amber-500/15 text-amber-400' :
                  'bg-blue-500/15 text-blue-400'
                }`}>
                  {kpi.status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="font-heading text-3xl font-extrabold text-white tracking-wide">
                  {kpi.formattedValue}
                </div>
                
                {kpi.changePercent !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={`flex items-center font-semibold ${isPositive ? 'text-[#21F1A8]' : 'text-red-400'}`}>
                      {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {isPositive ? '+' : ''}{kpi.changePercent}%
                    </span>
                    <span className="text-gray-500">vs prior period</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span className="truncate">Src: {kpi.traceableSource}</span>
                <span>{kpi.period}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. AI Decision Center: What / Why / What Should Management Do */}
      {analytics.insights.length > 0 && (
        <div className="bg-[#1b1b1b] border border-[#21F1A8]/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#21F1A8]/15 text-[#21F1A8] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="font-heading text-xl font-bold text-white tracking-wide uppercase">
                AI DECISION CENTER: WHAT / WHY / ACTIONS
              </h2>
            </div>
            <span className="text-[11px] text-[#21F1A8] font-mono bg-[#21F1A8]/10 px-2 py-0.5 rounded border border-[#21F1A8]/20">
              Grounded in Verified Model Calculations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {analytics.insights.slice(0, 3).map((ins, i) => (
              <div key={ins.id} className="bg-[#141414] border border-[#2d2d2d] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white truncate">{ins.title}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#222] text-[#21F1A8] font-mono text-[9px] uppercase">
                    {ins.category}
                  </span>
                </div>

                <div className="space-y-1.5 text-gray-300">
                  <p><strong className="text-gray-400 font-medium">WHAT:</strong> {ins.what}</p>
                  <p><strong className="text-gray-400 font-medium">WHY:</strong> {ins.why}</p>
                  <div className="p-2 rounded bg-[#1e2722] border border-[#21F1A8]/30 text-[#21F1A8]">
                    <strong className="text-white font-medium">ACTION:</strong> {ins.action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Visuals & Analytical Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Visualizer */}
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#21F1A8]" />
              CHRONOLOGICAL TREND PERFORMANCE
            </h3>
            {primaryTrend && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${primaryTrend.direction === 'up' ? 'text-[#21F1A8] bg-[#21F1A8]/10' : 'text-red-400 bg-red-500/10'}`}>
                {primaryTrend.direction.toUpperCase()} ({primaryTrend.changePercent > 0 ? '+' : ''}{primaryTrend.changePercent}%)
              </span>
            )}
          </div>

          {primaryTrend ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#141414] border border-[#262626] space-y-2">
                <p className="text-xs text-gray-300 leading-relaxed">{primaryTrend.summary}</p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                  <div className="p-2 rounded bg-[#1b1b1b] border border-[#333]">
                    <span className="text-gray-500 block text-[10px]">Peak Interval:</span>
                    <span className="text-white font-semibold">{primaryTrend.peakPoint.period}</span>
                    <span className="text-[#21F1A8] block font-bold">{primaryTrend.peakPoint.value.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded bg-[#1b1b1b] border border-[#333]">
                    <span className="text-gray-500 block text-[10px]">Lowest Interval:</span>
                    <span className="text-white font-semibold">{primaryTrend.troughPoint.period}</span>
                    <span className="text-amber-400 block font-bold">{primaryTrend.troughPoint.value.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-gray-500">
              No chronologically ordered date dimension detected for trend generation.
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#21F1A8]" />
              TOP SEGMENT DISTRIBUTION
            </h3>
            <span className="text-xs text-gray-400">Share of Total</span>
          </div>

          {Object.keys(analytics.categoryPerformance).length > 0 ? (
            <div className="space-y-3">
              {analytics.categoryPerformance[Object.keys(analytics.categoryPerformance)[0]].slice(0, 5).map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-300">{item.category}</span>
                    <span className="text-white font-mono">{item.value.toLocaleString()} ({item.share}%)</span>
                  </div>
                  <div className="w-full bg-[#141414] h-2.5 rounded-full overflow-hidden border border-[#282828]">
                    <div 
                      className="bg-gradient-to-r from-[#21F1A8] to-[#00d8f6] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(5, item.share))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-gray-500">
              No categorical dimension identified for segment distribution.
            </div>
          )}
        </div>
      </div>

      {/* 5. Risk & Opportunities Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {primaryAnomaly && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-red-300">{primaryAnomaly.title}</span>
                <span className="px-1.5 py-0.2 bg-red-500/20 text-red-400 rounded text-[9px] uppercase font-mono font-bold">
                  {primaryAnomaly.severity}
                </span>
              </div>
              <p className="text-gray-300">{primaryAnomaly.reason}</p>
              <p className="text-red-300 font-medium">Action: {primaryAnomaly.recommendedAction}</p>
            </div>
          </div>
        )}

        {primaryOpportunity && (
          <div className="p-4 rounded-xl bg-[#21F1A8]/10 border border-[#21F1A8]/30 flex items-start gap-3">
            <Zap className="w-5 h-5 text-[#21F1A8] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#21F1A8]">{primaryOpportunity.title}</span>
                <span className="px-1.5 py-0.2 bg-[#21F1A8]/20 text-[#21F1A8] rounded text-[9px] uppercase font-mono font-bold">
                  Priority: {primaryOpportunity.priority}
                </span>
              </div>
              <p className="text-gray-300">{primaryOpportunity.potentialImpact}</p>
              <p className="text-white font-medium">Next Step: {primaryOpportunity.action}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
