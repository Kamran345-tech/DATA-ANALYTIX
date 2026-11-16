import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info, AlertCircle } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';

export interface ModernKpiCardProps {
  kpiId?: string;
  label?: string;
  value?: string;
  deltaPercent?: number | null;
  isPositiveFavorable?: boolean;
  sparkline?: number[];
  targetText?: string;
  formulaText?: string;
  source?: string;
  assumption?: string;
  // Extended compatibility props used by AnalyticsPacksView
  goodDirection?: 'up' | 'down';
  unavailable?: boolean;
  unavailableReason?: string;
  unavailableHint?: string;
  sparklineData?: number[];
  kpi?: {
    id: string;
    name: string;
    value: number;
    formattedValue: string;
    change?: number;
    changePercent?: number | null;
    period?: string;
    status?: string;
    sourceColumn?: string;
    calculation?: string;
    aggregation?: string;
    definition?: string;
    traceableSource?: string;
  };
  onClick?: () => void;
}

export const ModernKpiCard: React.FC<ModernKpiCardProps> = ({
  kpiId,
  label,
  value,
  deltaPercent,
  isPositiveFavorable,
  sparkline,
  targetText,
  formulaText,
  source,
  assumption,
  goodDirection,
  unavailable = false,
  unavailableReason,
  unavailableHint,
  sparklineData,
  kpi,
  onClick,
}) => {
  const resolvedId = kpiId || kpi?.id || '';
  const resolvedLabel = label || kpi?.name || 'Metric';
  const resolvedValue = unavailable ? 'Unavailable' : value || kpi?.formattedValue || '0';
  const resolvedDelta =
    deltaPercent !== undefined ? deltaPercent : kpi?.changePercent !== undefined ? kpi.changePercent : null;
  const resolvedPositiveFav =
    isPositiveFavorable !== undefined
      ? isPositiveFavorable
      : goodDirection
      ? goodDirection === 'up'
      : true;
  const resolvedSparkline = sparkline || sparklineData || [];
  const resolvedFormulaText = formulaText || kpi?.definition || kpi?.calculation || '';
  const resolvedSource = source || kpi?.calculation || '';

  const hasDelta = !unavailable && typeof resolvedDelta === 'number' && Number.isFinite(resolvedDelta);
  const isUp = hasDelta && resolvedDelta! > 0;
  const isDown = hasDelta && resolvedDelta! < 0;
  const isFavorable = hasDelta ? (resolvedPositiveFav ? resolvedDelta! >= 0 : resolvedDelta! <= 0) : true;

  // Build SVG path for mini sparkline (76x24)
  let sparkPath = '';
  if (!unavailable && resolvedSparkline && resolvedSparkline.length >= 2) {
    const min = Math.min(...resolvedSparkline);
    const max = Math.max(...resolvedSparkline);
    const range = max - min || 1;
    const width = 76;
    const height = 24;
    sparkPath = resolvedSparkline
      .map((val, idx) => {
        const x = (idx / (resolvedSparkline.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  const tooltipContent =
    resolvedFormulaText || resolvedSource
      ? `${resolvedFormulaText ? `${resolvedFormulaText}` : ''}${
          resolvedSource && resolvedSource !== resolvedFormulaText ? ` | Formula: ${resolvedSource}` : ''
        }${assumption ? ` | Assumption: ${assumption}` : ''}`
      : '';

  return (
    <div
      data-testid={resolvedId ? `kpi-card-${resolvedId}` : 'modern-kpi-card'}
      onClick={onClick}
      role={onClick && !unavailable ? 'button' : undefined}
      tabIndex={onClick && !unavailable ? 0 : undefined}
      onKeyDown={e => {
        if (onClick && !unavailable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`depth-card rounded-xl p-5 bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between gap-3 transition-all min-w-0 ${
        onClick && !unavailable ? 'cursor-pointer hover:border-[var(--accent)]' : ''
      } ${unavailable ? 'opacity-85 border-dashed' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            title={resolvedLabel}
            className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-secondary)] truncate"
          >
            {resolvedLabel}
          </span>
          {tooltipContent && (
            <Tooltip content={tooltipContent} side="top" className="!w-auto">
              <button
                type="button"
                onClick={e => e.stopPropagation()}
                data-testid={resolvedId ? `kpi-formula-tooltip-${resolvedId}` : 'kpi-formula-tooltip'}
                aria-label={`Formula for ${resolvedLabel}: ${tooltipContent}`}
                className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}
        </div>

        {unavailable ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] shrink-0">
            <AlertCircle className="w-3 h-3 text-[var(--warning)]" aria-hidden="true" />
            <span>UNAVAILABLE</span>
          </span>
        ) : (
          hasDelta && (
            <span
              data-testid={resolvedId ? `kpi-trend-${resolvedId}` : 'kpi-trend'}
              className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                isFavorable
                  ? 'text-[var(--success)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]'
                  : 'text-[var(--danger)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]'
              }`}
              title={`${resolvedDelta! > 0 ? '+' : ''}${resolvedDelta!.toFixed(1)}% (${
                isFavorable ? 'Favorable' : 'Unfavorable'
              })`}
            >
              {isUp ? (
                <TrendingUp className="w-3 h-3" aria-hidden="true" />
              ) : isDown ? (
                <TrendingDown className="w-3 h-3" aria-hidden="true" />
              ) : (
                <Minus className="w-3 h-3" aria-hidden="true" />
              )}
              <span>
                {resolvedDelta! > 0 ? '+' : ''}
                {resolvedDelta!.toFixed(1)}%
              </span>
              <span className="text-[9px] uppercase tracking-wider opacity-90">
                {isFavorable ? 'Favorable' : 'Unfavorable'}
              </span>
            </span>
          )
        )}
      </div>

      <div className="flex items-end justify-between gap-3 min-w-0">
        <div
          className={`font-bold font-mono leading-none tracking-[-0.03em] truncate ${
            unavailable
              ? 'text-lg sm:text-xl text-[var(--text-muted)]'
              : 'text-[26px] sm:text-[30px] text-[var(--text-primary)]'
          }`}
        >
          {resolvedValue}
        </div>
        {sparkPath && (
          <svg
            width="76"
            height="24"
            viewBox="0 0 76 24"
            className="shrink-0 overflow-visible"
            aria-hidden="true"
          >
            <path
              d={sparkPath}
              fill="none"
              stroke={isFavorable ? 'var(--accent)' : 'var(--danger)'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)] min-w-0">
        {unavailable ? (
          <div
            data-testid={resolvedId ? `kpi-missing-col-${resolvedId}` : 'kpi-missing-col'}
            title={unavailableHint || unavailableReason || 'Missing required column'}
            className="text-[11px] font-mono text-[var(--text-secondary)] truncate"
          >
            {unavailableHint || unavailableReason || 'Add required column to compute'}
          </div>
        ) : targetText ? (
          <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">{targetText}</div>
        ) : (
          <div
            title={resolvedSource || resolvedFormulaText}
            className="text-[11px] text-[var(--text-muted)] font-mono truncate"
          >
            {resolvedSource || 'Verified Formula'}
          </div>
        )}

        {assumption && (
          <Tooltip content={`Assumption: ${assumption}`} side="bottom" className="!w-auto">
            <span
              onClick={e => e.stopPropagation()}
              data-testid={resolvedId ? `kpi-assumption-badge-${resolvedId}` : 'kpi-assumption-badge'}
              tabIndex={0}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] cursor-help shrink-0"
            >
              Assumption
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
};
