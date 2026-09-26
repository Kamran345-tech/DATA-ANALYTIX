import React from 'react';
import { Filter, Calendar, RotateCcw, Layers } from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export const GlobalFilterBar: React.FC = () => {
  const { 
    columns, 
    filters, 
    setFilters, 
    cleanRows, 
    filteredRows 
  } = usePlatform();

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
    <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-gray-400 font-semibold uppercase tracking-wider text-[11px] pr-2 border-r border-[#333]">
          <Filter className="w-3.5 h-3.5 text-[#21F1A8]" />
          <span>Global Context</span>
        </div>

        {/* Dimension selector */}
        {categoricalCols.length > 0 && (
          <div className="flex items-center gap-1 bg-[#171717] px-2.5 py-1.5 rounded-lg border border-[#333]">
            <Layers className="w-3.5 h-3.5 text-gray-400" />
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
              className="bg-transparent text-gray-200 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-[#1a1a1a]">All Dimensions</option>
              {categoricalCols.map(c => (
                <option key={c.name} value={c.name} className="bg-[#1a1a1a]">{c.name}</option>
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
                className="bg-transparent text-[#21F1A8] font-medium border-l border-[#333] pl-2 ml-1 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#1a1a1a]">Select Value...</option>
                {activeDimValues.map(v => (
                  <option key={v} value={v} className="bg-[#1a1a1a]">{v}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Date Filter if date field exists */}
        {dateCol && (
          <div className="flex items-center gap-1 bg-[#171717] px-2.5 py-1.5 rounded-lg border border-[#333]">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="date"
              value={filters.dateRange.start || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, start: e.target.value } }))}
              className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer"
              title="Start Date"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={filters.dateRange.end || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, end: e.target.value } }))}
              className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer"
              title="End Date"
            />
          </div>
        )}

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Row count stats */}
      <div className="flex items-center gap-2 text-gray-400 font-mono text-[11px]">
        <span>Scope:</span>
        <span className="font-bold text-white bg-[#141414] px-2 py-0.5 rounded border border-[#333]">
          {filteredRows.length.toLocaleString()} / {cleanRows.length.toLocaleString()} rows
        </span>
        {filteredRows.length < cleanRows.length && (
          <span className="text-[#21F1A8]">
            ({Math.round((filteredRows.length / (cleanRows.length || 1)) * 100)}%)
          </span>
        )}
      </div>
    </div>
  );
};
