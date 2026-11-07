import React, { useState, useMemo } from 'react';
import { 
  Table2, 
  Search, 
  Key, 
  Hash, 
  Calendar, 
  Type, 
  BarChart2, 
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
  Filter,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Check,
  Layers,
  Database
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

type Density = 'compact' | 'comfortable' | 'spacious';
type SortDirection = 'asc' | 'desc';
type ColumnTypeFilter = 'all' | 'number' | 'date' | 'string';

interface SortConfig {
  column: string;
  direction: SortDirection;
}

export const DataPreviewView: React.FC = () => {
  const { cleanRows, columns, project, themeMode } = usePlatform();
  const isLight = themeMode === 'light';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'grid' | 'profile'>('grid');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState<string>('all');
  const [columnTypeFilter, setColumnTypeFilter] = useState<ColumnTypeFilter>('all');

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Row density
  const [density, setDensity] = useState<Density>('comfortable');

  // Active / filtered columns to display in grid
  const visibleColumns = useMemo(() => {
    if (columnTypeFilter === 'all') return columns;
    return columns.filter(col => col.dataType === columnTypeFilter);
  }, [columns, columnTypeFilter]);

  // Handle Sort Toggle
  const handleSort = (columnName: string) => {
    setSortConfig(current => {
      if (!current || current.column !== columnName) {
        return { column: columnName, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { column: columnName, direction: 'desc' };
      }
      return null; // Reset sort
    });
    setPage(0);
  };

  // Filtered & Sorted dataset
  const filteredAndSortedRows = useMemo(() => {
    let result = [...cleanRows];

    // 1. Text Search across columns
    if (search.trim()) {
      const q = search.toLowerCase();
      if (searchColumn === 'all') {
        result = result.filter(r => 
          Object.values(r).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q))
        );
      } else {
        result = result.filter(r => {
          const val = r[searchColumn];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        });
      }
    }

    // 2. Sorting with natural number & chronological date comparator
    if (sortConfig) {
      const colMeta = columns.find(c => c.name === sortConfig.column);
      const isNum = colMeta?.dataType === 'number';
      const isDate = colMeta?.dataType === 'date';

      result.sort((rowA, rowB) => {
        const valA = rowA[sortConfig.column];
        const valB = rowB[sortConfig.column];

        // Nulls, undefined, and empty strings always sink to the bottom
        const isEmptyA = valA === null || valA === undefined || valA === '';
        const isEmptyB = valB === null || valB === undefined || valB === '';
        if (isEmptyA && isEmptyB) return 0;
        if (isEmptyA) return 1;
        if (isEmptyB) return -1;

        if (isNum) {
          const numA = typeof valA === 'number' ? valA : parseFloat(String(valA).replace(/[^0-9.-]+/g, ''));
          const numB = typeof valB === 'number' ? valB : parseFloat(String(valB).replace(/[^0-9.-]+/g, ''));
          const cleanA = isNaN(numA) ? 0 : numA;
          const cleanB = isNaN(numB) ? 0 : numB;
          return sortConfig.direction === 'asc' ? cleanA - cleanB : cleanB - cleanA;
        }

        if (isDate) {
          const dateA = Date.parse(String(valA));
          const dateB = Date.parse(String(valB));
          if (!isNaN(dateA) && !isNaN(dateB)) {
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
          }
        }

        // Natural string sorting (case-insensitive, alphanumeric)
        const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? comp : -comp;
      });
    }

    return result;
  }, [cleanRows, search, searchColumn, sortConfig, columns]);

  // Pagination math
  const totalRecords = filteredAndSortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedRows = filteredAndSortedRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const startRow = totalRecords === 0 ? 0 : currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalRecords);

  // Density classes map
  const densityStyles = {
    compact: {
      cell: 'py-1.5 px-3 text-[11px]',
      header: 'py-2 px-3 text-[11px]',
      index: 'py-1.5 px-2.5 text-[10px]'
    },
    comfortable: {
      cell: 'py-2.5 px-4 text-xs',
      header: 'py-3 px-4 text-xs',
      index: 'py-2.5 px-3 text-xs'
    },
    spacious: {
      cell: 'py-3.5 px-5 text-sm',
      header: 'py-3.5 px-5 text-xs',
      index: 'py-3.5 px-4 text-sm'
    }
  };

  // CSV Export for filtered & sorted rows
  const exportFilteredCSV = () => {
    if (filteredAndSortedRows.length === 0) return;
    const exportCols = visibleColumns.length > 0 ? visibleColumns : columns;
    const headerRow = exportCols.map(c => `"${c.name.replace(/"/g, '""')}"`).join(',');
    const rowsCSV = filteredAndSortedRows.map(row => 
      exportCols.map(c => {
        const val = row[c.name];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csvContent = [headerRow, ...rowsCSV].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'dataset'}_preview_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Smart pagination pages generator
  const getPaginationPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (currentPage > 2) pages.push('ellipsis-start');
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push('ellipsis-end');
      pages.push(totalPages - 1);
    }
    return pages;
  };

  // Helper to render Column Type Icon
  const renderTypeIcon = (type: string, isPk?: boolean) => {
    if (isPk) return <Key className="w-3 h-3 text-amber-400 shrink-0" />;
    switch (type) {
      case 'number':
        return <Hash className="w-3 h-3 text-sky-400 shrink-0" />;
      case 'date':
        return <Calendar className="w-3 h-3 text-purple-400 shrink-0" />;
      default:
        return <Type className="w-3 h-3 text-emerald-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* 1. Header Card: glass-panel & card-3d */}
      <div className={`glass-panel card-3d rounded-2xl p-5 sm:p-6 border relative overflow-hidden ${
        isLight ? 'border-slate-200/90 shadow-sm' : 'border-white/10 shadow-xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_16px_rgba(34,211,238,0.25)] shrink-0">
                <Table2 className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
              </div>
              <div>
                <h1 className={`font-heading text-2xl sm:text-3xl font-extrabold tracking-tight uppercase flex items-center gap-2.5 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  DATA PROFILING & PREVIEW
                </h1>
                <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{cleanRows.length.toLocaleString()}</strong> verified rows • <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{columns.length}</strong> audited columns • Ingested from <span className={`font-semibold underline decoration-cyan-500/40 ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>{project.sourceFileName || 'Dataset Source'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* View Switcher Tabs */}
          <div className={`flex items-center p-1 rounded-xl border text-xs font-medium self-start lg:self-auto ${
            isLight ? 'bg-slate-100 border-slate-200 shadow-inner' : 'bg-surface-panel border-border-subtle'
          }`}>
            <button
              type="button"
              onClick={() => setActiveTab('grid')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'grid'
                  ? isLight
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                    : 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/40'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Data Records Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? isLight
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                    : 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/40'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Column Profiles ({columns.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      {activeTab === 'grid' ? (
        /* ================= HIGH-PERFORMANCE DATA GRID ================= */
        <div className="space-y-4">
          {/* Toolbar Card: Filters, Density, Page Size, Export */}
          <div className={`glass-panel card-3d rounded-2xl p-4 border space-y-3 ${
            isLight ? 'border-slate-200/90 shadow-sm' : 'border-white/10 shadow-lg'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Left: Search Bar & Column Target */}
              <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className={`w-4 h-4 absolute left-3 top-2.5 pointer-events-none ${
                    isLight ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                  <input
                    type="text"
                    placeholder={searchColumn === 'all' ? "Search across all records & columns..." : `Search in ${searchColumn}...`}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    className={`w-full text-xs pl-9 pr-8 py-2 rounded-xl border focus:outline-none transition-all ${
                      isLight 
                        ? 'bg-white text-slate-900 border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 shadow-xs' 
                        : 'bg-surface-panel/90 text-white border-border-subtle focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                    }`}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setPage(0); }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Column Target Select */}
                <select
                  value={searchColumn}
                  onChange={(e) => { setSearchColumn(e.target.value); setPage(0); }}
                  className={`text-xs font-mono px-3 py-2 rounded-xl border focus:outline-none cursor-pointer ${
                    isLight 
                      ? 'bg-white text-slate-800 border-slate-300 shadow-xs' 
                      : 'bg-surface-panel text-slate-200 border-border-subtle'
                  }`}
                  title="Search Target Column"
                >
                  <option value="all">All Columns ({columns.length})</option>
                  {columns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>

                {/* Column Type Filter */}
                <div className={`hidden sm:flex items-center p-0.5 rounded-xl border text-xs ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-surface-panel border-border-subtle'
                }`}>
                  {(['all', 'number', 'date', 'string'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setColumnTypeFilter(type)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all capitalize cursor-pointer ${
                        columnTypeFilter === type
                          ? isLight ? 'bg-white text-sky-700 shadow-xs font-bold' : 'bg-cyan-500/20 text-cyan-300 font-bold'
                          : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type === 'number' ? '# Numbers' : type === 'date' ? 'Dates' : 'Strings'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Density, Page Size & CSV Export */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Density Switcher */}
                <div className={`flex items-center p-0.5 rounded-xl border text-xs ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-surface-panel border-border-subtle'
                }`} title="Row display density">
                  {(['compact', 'comfortable', 'spacious'] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDensity(d)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                        density === d
                          ? isLight ? 'bg-white text-sky-700 shadow-xs font-bold' : 'bg-cyan-500/20 text-cyan-300 font-bold'
                          : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                {/* Page Size Select */}
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                  className={`text-xs font-mono px-2.5 py-1.5 rounded-xl border focus:outline-none cursor-pointer ${
                    isLight 
                      ? 'bg-white text-slate-800 border-slate-300 shadow-xs' 
                      : 'bg-surface-panel text-slate-200 border-border-subtle'
                  }`}
                  title="Rows per page"
                >
                  <option value={15}>15 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                  <option value={250}>250 rows</option>
                </select>

                {/* Export Filtered CSV */}
                <button
                  type="button"
                  onClick={exportFilteredCSV}
                  disabled={filteredAndSortedRows.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isLight
                      ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 shadow-cyan-500/10'
                  }`}
                  title="Export filtered records as CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>
            </div>

            {/* Active Sort / Filter Chips Bar */}
            <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-[11px] font-mono ${
              isLight ? 'border-slate-200/80 text-slate-600' : 'border-white/5 text-slate-400'
            }`}>
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  Showing <strong className={isLight ? 'text-slate-900' : 'text-slate-100'}>{startRow} - {endRow}</strong> of <strong className={isLight ? 'text-slate-900' : 'text-slate-100'}>{totalRecords.toLocaleString()}</strong> rows
                  {search && ` (filtered from ${cleanRows.length.toLocaleString()})`}
                </span>

                {sortConfig && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono text-[10px] ${
                    isLight 
                      ? 'bg-sky-50 text-sky-800 border-sky-200' 
                      : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  }`}>
                    <span>Sort: <strong>{sortConfig.column}</strong> ({sortConfig.direction.toUpperCase()})</span>
                    <button
                      type="button"
                      onClick={() => setSortConfig(null)}
                      className="hover:opacity-75 cursor-pointer ml-1"
                      title="Clear sort"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {columnTypeFilter !== 'all' && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono text-[10px] ${
                    isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-surface-elevated text-slate-300 border-border-subtle'
                  }`}>
                    <span>Type: {columnTypeFilter}</span>
                    <button
                      type="button"
                      onClick={() => setColumnTypeFilter('all')}
                      className="hover:opacity-75 cursor-pointer ml-1"
                      title="Reset type filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden md:inline">Click any column header to sort • Click again to reverse</span>
                <span className={`px-2 py-0.5 rounded border text-[10px] ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-surface-panel text-slate-300 border-border-subtle'
                }`}>
                  {visibleColumns.length} of {columns.length} columns visible
                </span>
              </div>
            </div>
          </div>

          {/* Data Grid Table Card: glass-panel, card-3d & Zebra-striping */}
          <div className={`glass-panel card-3d rounded-2xl border overflow-hidden shadow-2xl ${
            isLight ? 'border-slate-200/90 bg-white/95' : 'border-white/10'
          }`}>
            <div className="overflow-x-auto max-h-[680px] custom-scrollbar">
              <table className="w-full text-left border-collapse">
                {/* Sticky Header with Sort Indicators */}
                <thead className={`sticky top-0 z-20 backdrop-blur-xl border-b select-none ${
                  isLight 
                    ? 'bg-slate-100/95 border-slate-200 text-slate-700 shadow-xs' 
                    : 'bg-[#0F172A]/95 border-white/10 text-slate-300 shadow-md'
                }`}>
                  <tr>
                    {/* Row Index Column */}
                    <th className={`w-12 text-center font-mono font-bold tracking-wider uppercase border-r ${
                      isLight ? 'border-slate-200/80 text-slate-500' : 'border-white/5 text-slate-500'
                    } ${densityStyles[density].header}`}>
                      #
                    </th>

                    {/* Column Headers */}
                    {visibleColumns.map((col) => {
                      const isSorted = sortConfig?.column === col.name;
                      const sortDir = isSorted ? sortConfig.direction : null;

                      return (
                        <th
                          key={col.name}
                          onClick={() => handleSort(col.name)}
                          className={`font-mono uppercase font-bold tracking-wider cursor-pointer transition-all border-r last:border-r-0 group ${
                            densityStyles[density].header
                          } ${
                            isLight ? 'border-slate-200/80' : 'border-white/5'
                          } ${
                            isSorted
                              ? isLight 
                                ? 'bg-sky-100/90 text-sky-900 border-b-2 border-b-sky-600' 
                                : 'bg-cyan-500/15 text-cyan-300 border-b-2 border-b-cyan-400'
                              : isLight ? 'hover:bg-slate-200/70 hover:text-slate-900' : 'hover:bg-surface-elevated/80 hover:text-white'
                          }`}
                          title={`Click to sort by ${col.name} (${col.dataType})`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {renderTypeIcon(col.dataType, col.isPrimaryKeyCandidate)}
                              <span className="truncate max-w-[170px]" title={col.name}>
                                {col.name}
                              </span>
                            </div>

                            {/* Sort Arrow Indicator */}
                            <div className="shrink-0 flex items-center">
                              {isSorted ? (
                                sortDir === 'asc' ? (
                                  <ArrowUp className={`w-3.5 h-3.5 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
                                ) : (
                                  <ArrowDown className={`w-3.5 h-3.5 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
                                )
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </div>

                          {/* Sub-header mini stats: Null percentage & Distinct count */}
                          <div className={`flex items-center justify-between gap-1 mt-1 text-[9px] font-mono normal-case tracking-normal ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            <span className="truncate">{col.distinctCount} uniq</span>
                            {col.nullCount > 0 ? (
                              <span className={isLight ? 'text-amber-700 font-semibold' : 'text-amber-400 font-semibold'}>
                                {col.nullPercentage}% null
                              </span>
                            ) : (
                              <span className="opacity-50">100% full</span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* Zebra-Striped Table Body */}
                <tbody className={`divide-y ${isLight ? 'divide-slate-200/70' : 'divide-white/5'}`}>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500 font-mono text-xs">
                          <Table2 className="w-8 h-8 opacity-40 text-slate-400" />
                          <span>No matching data records found.</span>
                          {search && (
                            <button
                              type="button"
                              onClick={() => setSearch('')}
                              className={`mt-2 px-3 py-1 rounded-lg text-xs font-semibold ${
                                isLight ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              }`}
                            >
                              Clear Search Query
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, rowIdx) => {
                      const absoluteIndex = currentPage * pageSize + rowIdx + 1;
                      // Zebra alternating rows
                      const isEven = rowIdx % 2 === 0;

                      return (
                        <tr
                          key={rowIdx}
                          className={`transition-colors font-mono group ${
                            isLight
                              ? isEven ? 'bg-slate-50/75' : 'bg-white'
                              : isEven ? 'bg-white/[0.025]' : 'bg-transparent'
                          } ${
                            isLight
                              ? 'hover:bg-sky-50/90 text-slate-800'
                              : 'hover:bg-cyan-500/10 text-slate-200'
                          }`}
                        >
                          {/* Row Number Column */}
                          <td className={`w-12 text-center font-bold tracking-tight border-r ${
                            isLight ? 'border-slate-200/80 text-slate-500 bg-slate-100/50' : 'border-white/5 text-slate-500 bg-black/10'
                          } ${densityStyles[density].index}`}>
                            {absoluteIndex}
                          </td>

                          {/* Data Cells */}
                          {visibleColumns.map((col) => {
                            const val = row[col.name];
                            const isNull = val === null || val === undefined || val === '';
                            const isNum = col.dataType === 'number';
                            const isBool = typeof val === 'boolean';

                            return (
                              <td
                                key={col.name}
                                className={`whitespace-nowrap border-r last:border-r-0 truncate max-w-xs transition-colors ${
                                  densityStyles[density].cell
                                } ${
                                  isLight ? 'border-slate-200/60' : 'border-white/5'
                                } ${
                                  isNum ? 'text-right tabular-nums' : 'text-left'
                                }`}
                              >
                                {isNull ? (
                                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono italic ${
                                    isLight ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-white/5 text-slate-500 border border-white/5'
                                  }`}>
                                    null
                                  </span>
                                ) : isBool ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    val
                                      ? isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                                      : isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-500/20 text-rose-300'
                                  }`}>
                                    {val ? 'TRUE' : 'FALSE'}
                                  </span>
                                ) : (
                                  <span
                                    title={String(val)}
                                    className={`${
                                      isNum 
                                        ? isLight ? 'text-slate-900 font-semibold' : 'text-cyan-200/90 font-medium' 
                                        : isLight ? 'text-slate-800' : 'text-slate-200'
                                    }`}
                                  >
                                    {String(val)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer: glass-panel bottom bar */}
            <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs ${
              isLight ? 'bg-slate-50/90 border-slate-200 text-slate-700' : 'bg-[#0B1120]/90 border-white/10 text-slate-300'
            }`}>
              <div className="flex items-center gap-2">
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                  Page <strong className={isLight ? 'text-slate-900' : 'text-white'}>{currentPage + 1}</strong> of <strong className={isLight ? 'text-slate-900' : 'text-white'}>{totalPages}</strong>
                </span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                  {totalRecords.toLocaleString()} total rows
                </span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-1.5">
                {/* First Page */}
                <button
                  type="button"
                  onClick={() => setPage(0)}
                  disabled={currentPage === 0}
                  className={`p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                      : 'bg-surface-panel hover:bg-surface-elevated text-slate-300 border-border-subtle'
                  }`}
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className={`p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                      : 'bg-surface-panel hover:bg-surface-elevated text-slate-300 border-border-subtle'
                  }`}
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Numbered Page Buttons */}
                <div className="hidden sm:flex items-center gap-1">
                  {getPaginationPages().map((item, idx) => {
                    if (typeof item === 'string') {
                      return (
                        <span key={`ell-${idx}`} className="px-2 text-slate-500 select-none">
                          •••
                        </span>
                      );
                    }
                    const isCurrent = item === currentPage;
                    return (
                      <button
                        key={`p-${item}`}
                        type="button"
                        onClick={() => setPage(item)}
                        className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                          isCurrent
                            ? isLight
                              ? 'bg-sky-600 text-white shadow-xs border border-sky-600'
                              : 'bg-cyan-500/25 text-cyan-300 shadow-xs border border-cyan-400/50'
                            : isLight
                              ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-surface-panel hover:bg-surface-elevated text-slate-300 border border-border-subtle'
                        }`}
                      >
                        {item + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className={`p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                      : 'bg-surface-panel hover:bg-surface-elevated text-slate-300 border-border-subtle'
                  }`}
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={currentPage >= totalPages - 1}
                  className={`p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                      : 'bg-surface-panel hover:bg-surface-elevated text-slate-300 border-border-subtle'
                  }`}
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= STATISTICAL PROFILES GRID ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {columns.map(col => {
            const isNum = col.dataType === 'number';
            const isDate = col.dataType === 'date';

            return (
              <div 
                key={col.name}
                className={`glass-panel card-3d rounded-2xl p-5 space-y-4 border transition-all ${
                  isLight 
                    ? 'border-slate-200/90 shadow-sm hover:border-sky-500/50' 
                    : 'border-white/10 shadow-lg hover:border-cyan-400/40'
                }`}
              >
                {/* Column Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-400">
                        {renderTypeIcon(col.dataType, col.isPrimaryKeyCandidate)}
                      </div>
                      <h3 className={`font-bold text-base truncate ${isLight ? 'text-slate-900' : 'text-white'}`} title={col.name}>
                        {col.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                        isNum ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' :
                        isDate ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {col.dataType}
                      </span>
                      {col.isPrimaryKeyCandidate && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px] font-mono flex items-center gap-1 border border-amber-500/30">
                          <Key className="w-2.5 h-2.5" /> Primary Key Candidate
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={`text-xs font-mono px-2 py-1 rounded-lg border ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-surface-panel border-border-subtle text-slate-400'
                  }`}>
                    {col.distinctCount.toLocaleString()} distinct
                  </span>
                </div>

                {/* Metrics Matrix */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-surface-panel/80 border-white/5'
                  }`}>
                    <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Null Rate:</span>
                    <span className={col.nullPercentage > 0 ? (isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold') : (isLight ? 'text-slate-800' : 'text-slate-300')}>
                      {col.nullPercentage}% ({col.nullCount.toLocaleString()})
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-surface-panel/80 border-white/5'
                  }`}>
                    <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Cardinality:</span>
                    <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{col.uniquePercentage}%</span>
                  </div>

                  {isNum && (
                    <>
                      <div className={`p-2.5 rounded-xl border ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-surface-panel/80 border-white/5'
                      }`}>
                        <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Mean / Median:</span>
                        <span className={isLight ? 'text-sky-700 font-bold' : 'text-cyan-300 font-semibold'}>{col.mean ?? 'N/A'} / {col.median ?? 'N/A'}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-surface-panel/80 border-white/5'
                      }`}>
                        <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Min - Max:</span>
                        <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{col.min} - {col.max}</span>
                      </div>
                    </>
                  )}

                  {isDate && (
                    <div className={`col-span-2 p-2.5 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-surface-panel/80 border-white/5'
                    }`}>
                      <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Date Span:</span>
                      <span className={isLight ? 'text-purple-700 font-semibold' : 'text-purple-300 font-semibold'}>{col.min} → {col.max}</span>
                    </div>
                  )}
                </div>

                {/* Top values distribution */}
                {col.topValues.length > 0 && (
                  <div className={`space-y-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                    <div className={`text-[10px] uppercase font-mono tracking-wider font-semibold ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      Top Frequent Values
                    </div>
                    <div className="space-y-1.5">
                      {col.topValues.slice(0, 3).map((v, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className={`truncate max-w-[190px] font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            {String(v.value)}
                          </span>
                          <span className={`font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            {v.percentage.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
