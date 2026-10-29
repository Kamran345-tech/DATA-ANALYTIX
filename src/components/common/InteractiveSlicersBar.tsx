import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  RotateCcw, 
  Layers, 
  Calendar, 
  SlidersHorizontal, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Check, 
  Sliders,
  Sparkles,
  BarChart2,
  CalendarRange
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { safeMin, safeMax } from '../../utils/mathUtils';

interface SlicerMeta {
  columnName: string;
  valuesWithCounts: { value: string; count: number }[];
  totalDistinct: number;
}

export const InteractiveSlicersBar: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const { 
    columns, 
    cleanRows, 
    filteredRows, 
    filters, 
    setFilters, 
    toggleSlicerItem, 
    clearSlicer, 
    clearAllSlicers,
    setMetricRangeFilter,
    clearMetricRangeFilter,
    setDatePresetFilter,
    themeMode 
  } = usePlatform();

  const isLight = themeMode === 'light';
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeSearchCol, setActiveSearchCol] = useState<string | null>(null);
  const [slicerSearchTerms, setSlicerSearchTerms] = useState<Record<string, string>>({});

  // 1. Extract suitable categorical columns for Slicers (distinct 2..60)
  const slicerColumns: SlicerMeta[] = useMemo(() => {
    const candidates = columns.filter(c => 
      c.dataType === 'string' && 
      !c.isPrimaryKeyCandidate && 
      !c.name.toLowerCase().endsWith('id') &&
      c.distinctCount >= 2 &&
      c.distinctCount <= 60
    );

    // Limit to top 6 most informative slicers
    const selected = candidates.slice(0, 6);

    return selected.map(col => {
      const counts: Record<string, number> = {};
      cleanRows.forEach(r => {
        const v = String(r[col.name] ?? '').trim();
        if (v) counts[v] = (counts[v] || 0) + 1;
      });

      const sortedValues = Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);

      return {
        columnName: col.name,
        valuesWithCounts: sortedValues,
        totalDistinct: sortedValues.length
      };
    });
  }, [columns, cleanRows]);

  // 2. Identify primary date column
  const dateCol = useMemo(() => {
    return columns.find(c => c.dataType === 'date')?.name;
  }, [columns]);

  // 3. Identify primary numeric column for range slicing
  const primaryMetricCol = useMemo(() => {
    const num = columns.find(c => 
      c.dataType === 'number' && 
      !c.isPrimaryKeyCandidate && 
      !c.name.toLowerCase().includes('id') &&
      /revenue|sales|profit|amount|margin|price|cost|spend|volume|qty/i.test(c.name)
    ) || columns.find(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id'));
    return num?.name;
  }, [columns]);

  // Calculate numeric min/max bounds for primary metric
  const metricBounds = useMemo(() => {
    if (!primaryMetricCol) return null;
    const vals = cleanRows.map(r => Number(r[primaryMetricCol])).filter(n => !isNaN(n));
    if (vals.length === 0) return null;
    const min = Math.floor(safeMin(vals));
    const max = Math.ceil(safeMax(vals));
    return { min, max };
  }, [primaryMetricCol, cleanRows]);

  // 4. Active filter calculations
  const activeSlicerCount = useMemo(() => {
    let count = 0;
    if (filters.slicers) {
      Object.values(filters.slicers).forEach(arr => {
        if (arr.length > 0) count += arr.length;
      });
    }
    if (filters.selectedDimension && filters.selectedDimensionValue) count += 1;
    if (filters.metricRange) count += 1;
    if (filters.dateRange.start || filters.dateRange.end || (filters.datePreset && filters.datePreset !== 'all')) count += 1;
    if (filters.searchQuery) count += 1;
    return count;
  }, [filters]);

  const hasActiveFilters = activeSlicerCount > 0;
  const isFiltered = filteredRows.length < cleanRows.length;

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      isLight 
        ? 'bg-white border-slate-200/90 shadow-xs' 
        : 'bg-[#151921] border-[#222938] shadow-lg'
    } ${className}`}>
      
      {/* =================================================================== */}
      {/* SLICER HEADER RIBBON                                                */}
      {/* =================================================================== */}
      <div className={`px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b ${
        isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#11141c] border-[#222938]'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg flex items-center justify-center ${
            isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-[#21F1A8]/15 text-[#21F1A8]'
          }`}>
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Interactive Slicers & Cross-Filters
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                activeSlicerCount > 0
                  ? isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-[#21F1A8]/20 text-[#21F1A8] border border-[#21F1A8]/40'
                  : isLight ? 'bg-slate-200 text-slate-700' : 'bg-[#222938] text-gray-400'
              }`}>
                {activeSlicerCount} Active
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              Multi-select categorical dimensions, date windows, and numeric thresholds to filter all telemetry in real-time.
            </p>
          </div>
        </div>

        {/* Controls: Record counter, Reset, Collapse */}
        <div className="flex items-center gap-2">
          {/* Row filter stats badge */}
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            isFiltered
              ? isLight ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold' : 'bg-[#21F1A8]/15 text-[#21F1A8] border-[#21F1A8]/30 font-bold'
              : isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-[#1a202c] text-gray-400 border-[#2d3748]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isFiltered ? (isLight ? 'bg-emerald-600 animate-pulse' : 'bg-[#21F1A8] animate-pulse') : (isLight ? 'bg-slate-400' : 'bg-gray-500')}`} />
            <span>
              {filteredRows.length.toLocaleString()} / {cleanRows.length.toLocaleString()} rows
              {isFiltered && ` (${Math.round((filteredRows.length / (cleanRows.length || 1)) * 100)}%)`}
            </span>
          </div>

          {/* Reset All Slicers */}
          {hasActiveFilters && (
            <button
              onClick={clearAllSlicers}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isLight 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-2xs' 
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
              }`}
              title="Clear all active slicers and restore complete dataset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Slicers</span>
            </button>
          )}

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-xl border transition-colors ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100' 
                : 'bg-[#1b2230] border-[#2d3748] text-gray-300 hover:bg-[#252f44]'
            }`}
            title={isExpanded ? 'Collapse Slicers Panel' : 'Expand Slicers Panel'}
            aria-label="Toggle Slicers Panel"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SLICERS BODY                                                        */}
      {/* =================================================================== */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          
          {/* Quick Preset Date & Numeric Slicers Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Relative Date Slicer Pills */}
            {dateCol && (
              <div className={`flex flex-wrap items-center gap-1.5 p-1 rounded-xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#11141c] border-[#222938]'
              }`}>
                <div className={`flex items-center gap-1 px-2 text-[11px] font-semibold uppercase ${
                  isLight ? 'text-slate-600' : 'text-gray-400'
                }`}>
                  <Calendar className="w-3 h-3" />
                  <span>Timeline</span>
                </div>

                {(['all', '30d', '90d', 'ytd'] as const).map(preset => {
                  const isActive = (filters.datePreset === preset) || (!filters.datePreset && preset === 'all' && !filters.dateRange.start);
                  const labels = { all: 'All Time', '30d': 'Last 30D', '90d': 'Last 90D', ytd: 'YTD' };
                  return (
                    <button
                      key={preset}
                      onClick={() => setDatePresetFilter(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? isLight 
                            ? 'bg-emerald-600 text-white font-bold shadow-2xs' 
                            : 'bg-[#21F1A8] text-slate-950 font-bold shadow-xs'
                          : isLight 
                            ? 'text-slate-700 hover:bg-white' 
                            : 'text-gray-300 hover:bg-[#1a202c]'
                      }`}
                    >
                      {labels[preset]}
                    </button>
                  );
                })}

                {/* Custom Date Pickers */}
                <div className="flex items-center gap-1 pl-1 border-l border-slate-300/50">
                  <input
                    type="date"
                    value={filters.dateRange.start || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      datePreset: 'custom',
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                    className={`text-[11px] px-1.5 py-1 rounded border bg-transparent focus:outline-none ${
                      isLight ? 'border-slate-300 text-slate-800' : 'border-[#333] text-gray-200'
                    }`}
                    title="Start Date"
                  />
                  <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>to</span>
                  <input
                    type="date"
                    value={filters.dateRange.end || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      datePreset: 'custom',
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                    className={`text-[11px] px-1.5 py-1 rounded border bg-transparent focus:outline-none ${
                      isLight ? 'border-slate-300 text-slate-800' : 'border-[#333] text-gray-200'
                    }`}
                    title="End Date"
                  />
                </div>
              </div>
            )}

            {/* Primary Numeric Measure Slicer */}
            {primaryMetricCol && metricBounds && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#11141c] border-[#222938] text-gray-300'
              }`}>
                <div className="flex items-center gap-1 font-semibold uppercase text-[11px]">
                  <BarChart2 className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
                  <span>{primaryMetricCol}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder={`Min (${metricBounds.min.toLocaleString()})`}
                    value={filters.metricRange?.column === primaryMetricCol ? filters.metricRange.min : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? metricBounds.min : Number(e.target.value);
                      const currentMax = filters.metricRange?.max ?? metricBounds.max;
                      setMetricRangeFilter(primaryMetricCol, val, currentMax);
                    }}
                    className={`w-20 px-2 py-0.5 text-xs rounded border bg-transparent focus:outline-none font-mono ${
                      isLight ? 'border-slate-300 text-slate-900 bg-white' : 'border-[#333] text-white bg-[#1a202c]'
                    }`}
                  />
                  <span className={isLight ? 'text-slate-400' : 'text-gray-500'}>–</span>
                  <input
                    type="number"
                    placeholder={`Max (${metricBounds.max.toLocaleString()})`}
                    value={filters.metricRange?.column === primaryMetricCol ? filters.metricRange.max : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? metricBounds.max : Number(e.target.value);
                      const currentMin = filters.metricRange?.min ?? metricBounds.min;
                      setMetricRangeFilter(primaryMetricCol, currentMin, val);
                    }}
                    className={`w-20 px-2 py-0.5 text-xs rounded border bg-transparent focus:outline-none font-mono ${
                      isLight ? 'border-slate-300 text-slate-900 bg-white' : 'border-[#333] text-white bg-[#1a202c]'
                    }`}
                  />
                  {filters.metricRange && (
                    <button
                      onClick={clearMetricRangeFilter}
                      className="p-0.5 hover:text-rose-500 transition-colors"
                      title="Clear numeric threshold"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Slicer Cards Grid for Categorical Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {slicerColumns.map(slicer => {
              const activeValues = filters.slicers?.[slicer.columnName] || [];
              const searchTerm = slicerSearchTerms[slicer.columnName]?.toLowerCase() || '';
              const filteredValues = searchTerm
                ? slicer.valuesWithCounts.filter(v => v.value.toLowerCase().includes(searchTerm))
                : slicer.valuesWithCounts;

              const isAllSelected = activeValues.length === 0;

              return (
                <div 
                  key={slicer.columnName}
                  className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
                    activeValues.length > 0
                      ? isLight 
                        ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300/40' 
                        : 'bg-[#18212f] border-[#21F1A8]/40 ring-1 ring-[#21F1A8]/20'
                      : isLight 
                        ? 'bg-slate-50/50 border-slate-200' 
                        : 'bg-[#11141c] border-[#222938]'
                  }`}
                >
                  {/* Slicer Card Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-inherit">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-xs font-bold truncate ${
                        isLight ? 'text-slate-800' : 'text-gray-100'
                      }`}>
                        {slicer.columnName}
                      </span>
                      {activeValues.length > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isLight ? 'bg-emerald-200 text-emerald-900' : 'bg-[#21F1A8] text-slate-950'
                        }`}>
                          {activeValues.length}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Search in Slicer Toggle */}
                      {slicer.totalDistinct > 4 && (
                        <button
                          onClick={() => setActiveSearchCol(activeSearchCol === slicer.columnName ? null : slicer.columnName)}
                          className={`p-1 rounded transition-colors ${
                            activeSearchCol === slicer.columnName
                              ? isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-[#21F1A8]/20 text-[#21F1A8]'
                              : isLight ? 'text-slate-400 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300'
                          }`}
                          title="Search within slicer options"
                        >
                          <Search className="w-3 h-3" />
                        </button>
                      )}

                      {/* Clear Slicer Button */}
                      {activeValues.length > 0 && (
                        <button
                          onClick={() => clearSlicer(slicer.columnName)}
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                            isLight ? 'text-rose-600 hover:bg-rose-50' : 'text-rose-400 hover:bg-rose-500/10'
                          }`}
                          title="Clear this slicer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Slicer Search Input */}
                  {activeSearchCol === slicer.columnName && (
                    <div className="mb-2">
                      <input
                        type="text"
                        placeholder={`Filter ${slicer.columnName}...`}
                        value={slicerSearchTerms[slicer.columnName] || ''}
                        onChange={(e) => setSlicerSearchTerms(prev => ({ ...prev, [slicer.columnName]: e.target.value }))}
                        className={`w-full text-xs px-2 py-1 rounded-lg border focus:outline-none ${
                          isLight 
                            ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' 
                            : 'bg-[#161c28] border-[#333] text-white placeholder:text-gray-500'
                        }`}
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Slicer Items: Multi-Select Pills */}
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {/* "All" Option */}
                    <button
                      onClick={() => clearSlicer(slicer.columnName)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        isAllSelected
                          ? isLight 
                            ? 'bg-slate-800 text-white font-semibold shadow-2xs' 
                            : 'bg-white text-slate-950 font-bold shadow-xs'
                          : isLight 
                            ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100' 
                            : 'bg-[#171d29] text-gray-400 border border-[#2b3547] hover:bg-[#202838]'
                      }`}
                    >
                      <span>(All)</span>
                      <span className="text-[10px] opacity-75 font-mono">({slicer.totalDistinct})</span>
                    </button>

                    {/* Individual Value Pills */}
                    {filteredValues.slice(0, 15).map(({ value, count }) => {
                      const isSelected = activeValues.includes(value);
                      return (
                        <button
                          key={value}
                          onClick={() => toggleSlicerItem(slicer.columnName, value)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? isLight 
                                ? 'bg-emerald-600 text-white font-bold shadow-xs ring-1 ring-emerald-600' 
                                : 'bg-[#21F1A8] text-slate-950 font-bold shadow-xs ring-1 ring-[#21F1A8]'
                              : isLight 
                                ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300' 
                                : 'bg-[#171d29] text-gray-300 border border-[#2b3547] hover:bg-[#202838] hover:border-gray-500'
                          }`}
                          title={`${value} (${count.toLocaleString()} occurrences)`}
                        >
                          <span className="truncate max-w-[120px]">{value}</span>
                          <span className={`text-[10px] font-mono ${isSelected ? (isLight ? 'text-emerald-100' : 'text-slate-800 font-bold') : (isLight ? 'text-slate-400' : 'text-gray-500')}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {filteredValues.length > 15 && (
                    <div className={`mt-1 text-[10px] font-mono text-right ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                      +{filteredValues.length - 15} more values...
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Slicers Chip Summary Bar */}
          {hasActiveFilters && (
            <div className={`pt-2 flex flex-wrap items-center gap-2 border-t ${
              isLight ? 'border-slate-200 text-slate-700' : 'border-[#222938] text-gray-300'
            }`}>
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3 h-3 text-emerald-500" />
                Active Slicers:
              </span>

              {/* Categorical slicer chips */}
              {filters.slicers && Object.entries(filters.slicers).map(([col, vals]) => {
                if (vals.length === 0) return null;
                return (
                  <div 
                    key={col}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border font-medium ${
                      isLight 
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                        : 'bg-[#21F1A8]/15 text-[#21F1A8] border-[#21F1A8]/30'
                    }`}
                  >
                    <span className="font-bold">{col}:</span>
                    <span>{vals.join(', ')}</span>
                    <button
                      onClick={() => clearSlicer(col)}
                      className="ml-1 hover:text-rose-500 transition-colors"
                      title={`Remove filter on ${col}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {/* Date preset chip */}
              {filters.datePreset && filters.datePreset !== 'all' && (
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border font-medium ${
                  isLight ? 'bg-cyan-50 text-cyan-900 border-cyan-300' : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                }`}>
                  <CalendarRange className="w-3 h-3" />
                  <span>Date: {filters.datePreset.toUpperCase()} ({filters.dateRange.start} to {filters.dateRange.end})</span>
                  <button onClick={() => setDatePresetFilter('all')} className="ml-1 hover:text-rose-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Metric range chip */}
              {filters.metricRange && (
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border font-medium ${
                  isLight ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  <BarChart2 className="w-3 h-3" />
                  <span>{filters.metricRange.column}: {filters.metricRange.min.toLocaleString()} – {filters.metricRange.max.toLocaleString()}</span>
                  <button onClick={clearMetricRangeFilter} className="ml-1 hover:text-rose-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
