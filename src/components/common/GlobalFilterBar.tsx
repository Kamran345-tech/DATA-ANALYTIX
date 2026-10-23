import React from 'react';
import { Filter, Calendar, RotateCcw, Layers } from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export const GlobalFilterBar: React.FC = () => {
  const { 
    columns, 
    filters, 
    setFilters, 
    cleanRows, 
    filteredRows,
    themeMode 
  } = usePlatform();
  const isLight = themeMode === 'light';

  const categoricalCols = columns.filter(c => c.dataType === 'string' && !c.name.toLowerCase().includes('id'));
  const dateCol = columns.find(c => c.dataType === 'date')?.name;

  const activeDimValues = React.useMemo(() => {
    if (!filters.selectedDimension) return [];
    const set = new Set<string>();
    cleanRows.forEach(r => {
      const v = r[filters.selectedDimension!];
      if (v !== null && v !== undefined && v !== '') set.add(String(v));
    });
    return Array.from(set).sort();
  }, [cleanRows, filters.selectedDimension]);

  const hasActiveFilters = 
    Boolean(filters.selectedDimension && filters.selectedDimensionValue) || 
    Boolean(filters.dateRange.start || filters.dateRange.end) || 
    Boolean(filters.searchQuery);

  const resetFilters = () => {
    setFilters({
      dateRange: {},
      selectedDimension: null,
      selectedDimensionValue: null,
      searchQuery: ''
    });
  };

  return (
    <div className={`rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs border transition-colors ${
      isLight 
        ? 'bg-white border-slate-200 shadow-2xs' 
        : 'bg-[#1c1c1c] border-[#2d2d2d]'
    }`}>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className={`flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px] pr-2 border-r ${
          isLight 
            ? 'border-slate-200 text-slate-700' 
            : 'border-[#333] text-gray-400'
        }`}>
          <Filter className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-[#21F1A8]'}`} />
          <span>Global Context</span>
        </div>

        {/* Dimension selector */}
        {categoricalCols.length > 0 && (
          <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
            isLight 
              ? 'bg-slate-50 border-slate-200 text-slate-800' 
              : 'bg-[#171717] border-[#333] text-gray-200'
          }`}>
            <Layers className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`} />
            <select
              value={filters.selectedDimension || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                setFilters(prev => ({
                  ...prev,
                  selectedDimension: val,
                  selectedDimensionValue: null
                }));
              }}
              className={`bg-transparent focus:outline-none cursor-pointer ${
                isLight ? 'text-slate-800' : 'text-gray-200'
              }`}
            >
              <option value="" className={isLight ? 'bg-white text-slate-900' : 'bg-[#1a1a1a] text-white'}>All Dimensions</option>
              {categoricalCols.map(c => (
                <option key={c.name} value={c.name} className={isLight ? 'bg-white text-slate-900' : 'bg-[#1a1a1a] text-white'}>{c.name}</option>
              ))}
            </select>

            {filters.selectedDimension && (
              <select
                value={filters.selectedDimensionValue || ''}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    selectedDimensionValue: e.target.value || null
                  }));
                }}
                className={`bg-transparent font-medium border-l pl-2 ml-1 focus:outline-none cursor-pointer ${
                  isLight 
                    ? 'border-slate-300 text-emerald-700' 
                    : 'border-[#333] text-[#21F1A8]'
                }`}
              >
                <option value="" className={isLight ? 'bg-white text-slate-900' : 'bg-[#1a1a1a] text-white'}>Select Value...</option>
                {activeDimValues.map(v => (
                  <option key={v} value={v} className={isLight ? 'bg-white text-slate-900' : 'bg-[#1a1a1a] text-white'}>{v}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Date Filter if date field exists */}
        {dateCol && (
          <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
            isLight 
              ? 'bg-slate-50 border-slate-200 text-slate-800' 
              : 'bg-[#171717] border-[#333] text-gray-200'
          }`}>
            <Calendar className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`} />
            <input
              type="date"
              value={filters.dateRange.start || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, start: e.target.value } }))}
              className={`bg-transparent text-xs focus:outline-none cursor-pointer ${
                isLight ? 'text-slate-800' : 'text-gray-200'
              }`}
              title="Start Date"
            />
            <span className={isLight ? 'text-slate-400' : 'text-gray-500'}>to</span>
            <input
              type="date"
              value={filters.dateRange.end || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, end: e.target.value } }))}
              className={`bg-transparent text-xs focus:outline-none cursor-pointer ${
                isLight ? 'text-slate-800' : 'text-gray-200'
              }`}
              title="End Date"
            />
          </div>
        )}

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isLight
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Row count stats */}
      <div className={`flex items-center gap-2 font-mono text-[11px] ${
        isLight ? 'text-slate-500' : 'text-gray-400'
      }`}>
        <span>Scope:</span>
        <span className={`font-bold px-2 py-0.5 rounded border ${
          isLight
            ? 'text-slate-900 bg-slate-100 border-slate-300'
            : 'text-white bg-[#141414] border-[#333]'
        }`}>
          {filteredRows.length.toLocaleString()} / {cleanRows.length.toLocaleString()} rows
        </span>
        {filteredRows.length < cleanRows.length && (
          <span className={isLight ? 'text-emerald-700 font-bold' : 'text-[#21F1A8] font-bold'}>
            ({Math.round((filteredRows.length / (cleanRows.length || 1)) * 100)}%)
          </span>
        )}
      </div>
    </div>
  );
};
