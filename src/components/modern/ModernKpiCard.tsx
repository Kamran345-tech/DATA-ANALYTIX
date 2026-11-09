import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info, ChevronRight } from 'lucide-react';
import { KPI } from '../../types';

export interface ModernKpiCardProps {
  kpi?: KPI;
  isLoading?: boolean;
  onClick?: () => void;
  sparklineData?: number[];
  className?: string;
}

export const ModernKpiCard: React.FC<ModernKpiCardProps> = ({
  kpi,
  isLoading = false,
  onClick,
  sparklineData = [35, 42, 38, 55, 49, 62, 70],
  className = ''
}) => {
  if (isLoading || !kpi) {
    return (
      <div className={`modern-card p-5 space-y-3 animate-pulse ${className}`}>
        <div className="flex justify-between items-center">
          <div className="h-3.5 bg-[var(--modern-bg-surface-2)] rounded-md w-1/3" />
          <div className="h-4 bg-[var(--modern-bg-surface-2)] rounded-md w-12" />
        </div>
        <div className="h-8 bg-[var(--modern-bg-surface-2)] rounded-md w-2/3" />
        <div className="h-3 bg-[var(--modern-bg-surface-2)] rounded-md w-1/2" />
      </div>
    );
  }

  const isPositive = (kpi.changePercent ?? 0) >= 0;
  const isNeutral = kpi.changePercent === 0 || kpi.changePercent === undefined;

  // Simple clean SVG sparkline
  const minVal = Math.min(...sparklineData);
  const maxVal = Math.max(...sparklineData);
  const range = maxVal - minVal || 1;
  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * 80;
      const y = 24 - ((val - minVal) / range) * 20;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`${kpi.name}: ${kpi.formattedValue || kpi.value}`}
      className={`modern-card modern-card-lift p-5 flex flex-col justify-between group transition-all text-left ${className}`}
    >
      <div>
        {/* Header: Name and Status Delta Pill */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-[var(--modern-text-muted)] group-hover:text-[var(--modern-text)] transition-colors truncate">
            {kpi.name}
          </span>

          {/* Delta Pill: Color + Icon (never color alone) */}
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
              isNeutral
                ? 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                : isPositive
                ? 'bg-emerald-500/10 text-[var(--success)] border border-emerald-500/20'
                : 'bg-rose-500/10 text-[var(--danger)] border border-rose-500/20'
            }`}
          >
            {isNeutral ? (
              <Minus className="w-3 h-3" />
            ) : isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>
              {kpi.changePercent !== undefined
                ? `${isPositive ? '+' : ''}${kpi.changePercent.toFixed(1)}%`
                : kpi.status}
            </span>
          </div>
        </div>

        {/* Large Tabular Value */}
        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--modern-text)] tabular-nums tracking-tight my-1">
          {kpi.formattedValue || kpi.value.toLocaleString()}
        </div>

        {/* Period & Formula Subtitle */}
        <div className="text-[11px] text-[var(--modern-text-muted)] truncate flex items-center gap-1.5 mt-0.5">
          <span>{kpi.period || 'Current Period'}</span>
          {kpi.aggregation && (
            <>
              <span aria-hidden="true">·</span>
              <span className="uppercase text-[10px] font-mono">{kpi.aggregation}</span>
            </>
          )}
        </div>
      </div>

      {/* Footer: Sparkline & Click Hint */}
      <div className="mt-4 pt-3 border-t border-[var(--modern-border)] flex items-center justify-between gap-2">
        {/* Subtle SVG Sparkline */}
        <svg className="w-20 h-6 shrink-0 overflow-visible" aria-hidden="true">
          <polyline
            fill="none"
            stroke={isPositive ? 'var(--modern-success)' : 'var(--modern-primary)'}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>

        <span className="text-[10px] text-[var(--modern-text-muted)] group-hover:text-[var(--modern-primary)] transition-colors flex items-center gap-0.5 font-medium">
          Drill-down <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
