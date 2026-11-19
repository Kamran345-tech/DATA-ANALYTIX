import React, { useId } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { loadFeatureFlags } from '../../config/features';

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
  // Pack visual identity props
  packColor?: string;
  packGradientTo?: string;
  isHero?: boolean;
  onMapColumn?: () => void;
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
  packColor,
  packGradientTo,
  isHero = false,
  onMapColumn,
  goodDirection,
  unavailable = false,
  unavailableReason,
  unavailableHint,
  sparklineData,
  kpi,
  onClick,
}) => {
  const reactId = useId().replace(/:/g, '');
  const flags = loadFeatureFlags();
  const useDepthVisuals = flags.depthUI;

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

  const activeAccent = packColor || 'var(--accent)';
  const activeGradientTo = packGradientTo || 'var(--accent-2)';

  const hasDelta = !unavailable && typeof resolvedDelta === 'number' && Number.isFinite(resolvedDelta);
  const isUp = hasDelta && resolvedDelta! > 0;
  const isDown = hasDelta && resolvedDelta! < 0;
  const isFavorable = hasDelta ? (resolvedPositiveFav ? resolvedDelta! >= 0 : resolvedDelta! <= 0) : true;

  // Build SVG path + area fill for mini sparkline (88x28)
  let sparkPath = '';
  let sparkAreaPath = '';
  let lastPoint: { x: number; y: number } | null = null;
  if (!unavailable && resolvedSparkline && resolvedSparkline.length >= 2) {
    const min = Math.min(...resolvedSparkline);
    const max = Math.max(...resolvedSparkline);
    const range = max - min || 1;
    const width = isHero ? 96 : 80;
    const height = isHero ? 30 : 24;
    const coords = resolvedSparkline.map((val, idx) => {
      const x = (idx / (resolvedSparkline.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return { x, y };
    });
    sparkPath = coords
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
      .join(' ');
    sparkAreaPath = `${sparkPath} L${width},${height} L0,${height} Z`;
    lastPoint = coords[coords.length - 1] || null;
  }

  const tooltipContent =
    resolvedFormulaText || resolvedSource
      ? `${resolvedFormulaText ? `${resolvedFormulaText}` : ''}${
          resolvedSource && resolvedSource !== resolvedFormulaText ? ` | Formula: ${resolvedSource}` : ''
        }${assumption ? ` | Assumption: ${assumption}` : ''}`
      : '';

  const strokeColor = isFavorable ? activeAccent : 'var(--danger)';

  return (
    <div
      data-testid={resolvedId ? `kpi-card-${resolvedId}` : 'modern-kpi-card'}
      data-hero-kpi={isHero ? 'true' : 'false'}
      onClick={onClick}
      role={onClick && !unavailable ? 'button' : undefined}
      tabIndex={onClick && !unavailable ? 0 : undefined}
      onKeyDown={e => {
        if (onClick && !unavailable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      style={
        useDepthVisuals
          ? ({
              '--pack-from': activeAccent,
              '--pack-to': activeGradientTo,
            } as React.CSSProperties)
          : undefined
      }
      className={`depth-card pack-kpi-card relative overflow-hidden rounded-2xl bg-card border flex flex-col justify-between transition-all min-w-0 ${
        isHero && useDepthVisuals ? 'p-5 sm:p-6 gap-3.5' : 'p-4 sm:p-5 gap-3'
      } ${
        onClick && !unavailable
          ? 'cursor-pointer border-subtle hover:border-strong'
          : 'border-subtle'
      } ${unavailable ? 'bg-elevated border-dashed' : ''}`}
    >
      {/* Subtle Gradient Top Accent Bar in Pack Hue */}
      {useDepthVisuals && !unavailable && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{
            backgroundImage: `linear-gradient(90deg, ${activeAccent} 0%, ${activeGradientTo} 100%)`,
            opacity: isHero ? 0.95 : 0.65,
          }}
        />
      )}

      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            title={resolvedLabel}
            className={`font-semibold uppercase tracking-[0.06em] truncate ${
              isHero && useDepthVisuals ? 'text-xs text-primary' : 'text-[11px] text-secondary'
            }`}
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
                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-lg text-muted hover:text-primary hover:bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition-colors cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}
        </div>

        {unavailable ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-card text-muted border border-subtle shrink-0">
            <AlertCircle className="w-3 h-3 text-warning" aria-hidden="true" />
            <span>UNAVAILABLE</span>
          </span>
        ) : (
          hasDelta && (
            <span
              data-testid={resolvedId ? `kpi-trend-${resolvedId}` : 'kpi-trend'}
              className={`inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-semibold px-2 py-0.5 rounded-lg shrink-0 border border-subtle bg-elevated ${
                isFavorable ? 'text-success' : 'text-danger'
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
              <span className="hidden 2xl:inline text-[9px] uppercase tracking-wider opacity-90">
                {isFavorable ? 'Favorable' : 'Unfavorable'}
              </span>
            </span>
          )
        )}
      </div>

      <div className="flex items-end justify-between gap-2 min-w-0">
        <div
          className={`font-bold font-mono tabular-nums leading-none tracking-[-0.03em] shrink-0 whitespace-nowrap ${
            useDepthVisuals ? 'animate-kpi-reveal' : ''
          } ${
            unavailable
              ? 'text-base sm:text-lg text-muted'
              : isHero && useDepthVisuals
              ? 'text-2xl sm:text-[28px] text-primary'
              : 'text-xl sm:text-[24px] text-primary'
          }`}
        >
          {resolvedValue}
        </div>
        {sparkPath && (
          <svg
            width={isHero ? 96 : 80}
            height={isHero ? 30 : 24}
            viewBox={`0 0 ${isHero ? 96 : 80} ${isHero ? 30 : 24}`}
            className="w-16 sm:w-20 h-6 shrink min-w-[48px] overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`spark-grad-${reactId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {sparkAreaPath && <path d={sparkAreaPath} fill={`url(#spark-grad-${reactId})`} />}
            <path
              d={sparkPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {lastPoint && (
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="2.5"
                fill={strokeColor}
              />
            )}
          </svg>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-subtle min-w-0">
        {unavailable ? (
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            <div
              data-testid={resolvedId ? `kpi-missing-col-${resolvedId}` : 'kpi-missing-col'}
              title={unavailableHint || unavailableReason || 'Missing required column'}
              className="text-[11px] font-mono text-secondary truncate"
            >
              {unavailableHint || unavailableReason || 'Add required column to compute'}
            </div>
            {onMapColumn && (
              <button
                type="button"
                data-testid={resolvedId ? `kpi-map-col-btn-${resolvedId}` : 'kpi-map-col-btn'}
                onClick={e => {
                  e.stopPropagation();
                  onMapColumn();
                }}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card hover:bg-card-hover text-primary border border-subtle text-[10px] font-semibold transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3 text-accent" />
                <span>Map column</span>
              </button>
            )}
          </div>
        ) : targetText ? (
          <div className="text-[11px] text-muted font-mono tabular-nums truncate">{targetText}</div>
        ) : (
          <div
            title={resolvedSource || resolvedFormulaText}
            className="text-[11px] text-muted font-mono truncate"
          >
            {resolvedSource || 'Verified Formula'}
          </div>
        )}

        {!unavailable && assumption && (
          <Tooltip content={`Assumption: ${assumption}`} side="bottom" className="!w-auto">
            <span
              onClick={e => e.stopPropagation()}
              data-testid={resolvedId ? `kpi-assumption-badge-${resolvedId}` : 'kpi-assumption-badge'}
              tabIndex={0}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-elevated text-secondary border border-subtle cursor-help shrink-0"
            >
              Assumption
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
};
