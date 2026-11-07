import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export const ModernFilterBar: React.FC = () => {
  const { filters, clearAllSlicers, clearMetricRangeFilter, setDatePresetFilter, isPresentationMode } = usePlatform();

  // If in presentation mode or printing, keep minimal
  if (isPresentationMode) return null;

  const slicers = filters.slicers || {};
  const hasActiveSlicers = Object.keys(slicers).length > 0;
  const hasRangeFilter = filters.metricRange !== null && filters.metricRange !== undefined;
  const hasDateFilter = filters.datePreset !== 'all' && filters.datePreset !== undefined;
  const hasAnyFilter = hasActiveSlicers || hasRangeFilter || hasDateFilter;

  if (!hasAnyFilter) return null;

  return (
    <div className="sticky top-0 z-20 py-2.5 px-4 mb-5 rounded-xl border border-[var(--modern-border)] bg-[var(--modern-bg-surface)]/95 backdrop-blur-md shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs modern-fade-in print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-[var(--modern-text-muted)] font-semibold font-mono">
          <Filter className="w-3.5 h-3.5 text-[var(--modern-primary)]" />
          <span>ACTIVE FILTERS:</span>
        </div>

        {/* Category Slicers */}
        {Object.entries(slicers).map(([col, values]) => {
          if (!values || values.length === 0) return null;
          return (
            <span
              key={col}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--modern-bg-surface-2)] border border-[var(--modern-border)] text-[var(--modern-text)]"
            >
              <span className="text-[var(--modern-text-muted)]">{col}:</span>
              <span className="font-semibold text-[var(--modern-primary)]">{values.join(', ')}</span>
            </span>
          );
        })}

        {/* Metric Range Filter */}
        {filters.metricRange && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--modern-bg-surface-2)] border border-[var(--modern-border)] text-[var(--modern-text)]">
            <span className="text-[var(--modern-text-muted)]">{filters.metricRange.column}:</span>
            <span className="font-mono font-semibold text-[var(--modern-primary)] tabular-nums">
              {filters.metricRange.min.toLocaleString()} – {filters.metricRange.max.toLocaleString()}
            </span>
          </span>
        )}

        {/* Date Preset Filter */}
        {hasDateFilter && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--modern-bg-surface-2)] border border-[var(--modern-border)] text-[var(--modern-text)]">
            <span className="text-[var(--modern-text-muted)]">Timeframe:</span>
            <span className="font-semibold uppercase text-xs text-[var(--modern-primary)]">{filters.datePreset}</span>
          </span>
        )}
      </div>

      <button
        onClick={() => {
          clearAllSlicers();
          clearMetricRangeFilter();
          setDatePresetFilter('all');
        }}
        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--modern-danger)] hover:bg-[var(--modern-danger-muted)] transition-colors flex items-center gap-1.5 ml-auto"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Clear All Filters</span>
      </button>
    </div>
  );
};
