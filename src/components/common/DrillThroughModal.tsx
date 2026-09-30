import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ArrowLeft, 
  RotateCcw, 
  Download, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  Layers, 
  Eye, 
  Check, 
  Copy, 
  FileSpreadsheet, 
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { ColumnProfile } from '../../types';

export const DrillThroughModal: React.FC = () => {
  const { 
    drillThrough, 
    closeDrillThrough, 
    navigateBreadcrumb, 
    drillDeeper, 
    applyDrillThroughFilter,
    cleanRows, 
    columns 
  } = usePlatform();

  // Search, pagination & sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inspectedRow, setInspectedRow] = useState<Record<string, any> | null>(null);
  const [selectedSubDimension, setSelectedSubDimension] = useState<string>('');
  const [copiedJson, setCopiedJson] = useState(false);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectedRow) {
          setInspectedRow(null);
        } else if (drillThrough.isOpen) {
          closeDrillThrough();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drillThrough.isOpen, inspectedRow, closeDrillThrough]);

  // Compute active trail
  const activeTrail = useMemo(() => {
    return drillThrough.breadcrumbs.slice(0, drillThrough.activeBreadcrumbIndex + 1);
  }, [drillThrough.breadcrumbs, drillThrough.activeBreadcrumbIndex]);

  // Compute current filtered rows by compounding all breadcrumbs up to active index
  const sliceRows = useMemo(() => {
    let result = cleanRows;
    for (const crumb of activeTrail) {
      if (crumb.filterColumn && crumb.filterValue !== undefined) {
        result = result.filter(r => String(r[crumb.filterColumn!]) === String(crumb.filterValue));
      }
    }
    return result;
  }, [cleanRows, activeTrail]);

  // Categorical columns available for deeper drill-down (excluding those already in trail)
  const availableSubDimensions = useMemo(() => {
    const usedCols = new Set(activeTrail.map(c => c.filterColumn).filter(Boolean));
    return columns.filter(c => c.dataType === 'string' && !c.isPrimaryKeyCandidate && !usedCols.has(c.name));
  }, [columns, activeTrail]);

  // Automatically select a sub-dimension for deep exploration
  useEffect(() => {
    if (availableSubDimensions.length > 0 && (!selectedSubDimension || !availableSubDimensions.some(c => c.name === selectedSubDimension))) {
      setSelectedSubDimension(availableSubDimensions[0].name);
    }
  }, [availableSubDimensions, selectedSubDimension]);

  // Sub-dimension value distribution in this slice
  const subDimensionDistribution = useMemo(() => {
    if (!selectedSubDimension || sliceRows.length === 0) return [];
    const counts = new Map<string, number>();
    sliceRows.forEach(r => {
      const val = String(r[selectedSubDimension] || 'Unassigned');
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([val, count]) => ({
        value: val,
        count,
        share: Math.round((count / sliceRows.length) * 1000) / 10
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [selectedSubDimension, sliceRows]);

  // Primary numeric metric column
  const primaryMetricCol = useMemo(() => {
    return columns.find(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id'))?.name || '';
  }, [columns]);

  // Slice metrics summary
  const sliceMetrics = useMemo(() => {
    if (sliceRows.length === 0 || !primaryMetricCol) {
      return { sum: 0, avg: 0, min: 0, max: 0, count: sliceRows.length };
    }
    const vals = sliceRows.map(r => Number(r[primaryMetricCol])).filter(v => typeof v === 'number' && !isNaN(v));
    if (vals.length === 0) {
      return { sum: 0, avg: 0, min: 0, max: 0, count: sliceRows.length };
    }
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      count: sliceRows.length,
      sum: Math.round(sum * 100) / 100,
      avg: Math.round((sum / vals.length) * 100) / 100,
      min: Math.min(...vals),
      max: Math.max(...vals)
    };
  }, [sliceRows, primaryMetricCol]);

  // Search filtered rows
  const searchedRows = useMemo(() => {
    if (!searchTerm.trim()) return sliceRows;
    const q = searchTerm.toLowerCase();
    return sliceRows.filter(r => 
      Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );
  }, [sliceRows, searchTerm]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    if (!sortColumn) return searchedRows;
    return [...searchedRows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc' 
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [searchedRows, sortColumn, sortDirection]);

  // Paginated rows
  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  // Reset page when search or slice changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, drillThrough.activeBreadcrumbIndex, pageSize]);

  if (!drillThrough.isOpen) return null;

  const currentCrumb = drillThrough.breadcrumbs[drillThrough.activeBreadcrumbIndex] || drillThrough.breadcrumbs[0];
  const depthLevel = drillThrough.activeBreadcrumbIndex;

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    if (sliceRows.length === 0) return;
    const headers = Object.keys(sliceRows[0]);
    const csvContent = [
      headers.join(','),
      ...sliceRows.map(r => headers.map(h => {
        const val = r[h] !== undefined && r[h] !== null ? String(r[h]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drill_through_${drillThrough.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_depth_${depthLevel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (sliceRows.length === 0) return;
    const blob = new Blob([JSON.stringify(sliceRows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drill_through_${drillThrough.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_depth_${depthLevel}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = (row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`bg-[#141414] border border-[#2e2e2e] shadow-2xl rounded-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-full max-w-7xl max-h-[92vh] h-[92vh]'
        }`}
      >
        {/* ==================================================================== */}
        {/* 1. TOP HEADER & BREADCRUMBS BAR */}
        {/* ==================================================================== */}
        <div className="bg-[#1a1a1a] border-b border-[#282828] p-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#21F1A8]/15 border border-[#21F1A8]/40 flex items-center justify-center text-[#21F1A8] shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg sm:text-xl font-bold text-white uppercase tracking-wide truncate">
                    DRILL-THROUGH GRANULAR AUDIT
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#21F1A8]/15 text-[#21F1A8] border border-[#21F1A8]/30 font-mono text-[10px] font-bold shrink-0">
                    Depth L{depthLevel} ({activeTrail.length} Layers)
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  Granular row-level provenance and underlying transactional records.
                </p>
              </div>
            </div>

            {/* Window control buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#252525] border border-[#333] transition-colors"
                title={isFullscreen ? 'Restore Window' : 'Full Screen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={closeDrillThrough}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 border border-[#333] transition-colors"
                title="Close Drill-Through (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* BREADCRUMB NAVIGATION WITH DEPTH TRACKING */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#262626]">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
              <span className="text-[10px] text-gray-500 font-mono uppercase shrink-0 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-[#21F1A8]" /> Breadcrumb Trail:
              </span>

              {drillThrough.breadcrumbs.map((crumb, idx) => {
                const isActive = idx === drillThrough.activeBreadcrumbIndex;
                const isPast = idx < drillThrough.activeBreadcrumbIndex;

                return (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    )}

                    <button
                      onClick={() => navigateBreadcrumb(idx)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono transition-all shrink-0 ${
                        isActive
                          ? 'bg-[#21F1A8] text-black font-bold shadow-md shadow-[#21F1A8]/20'
                          : isPast
                          ? 'bg-[#222] text-gray-300 hover:bg-[#2d2d2d] hover:text-white border border-[#383838]'
                          : 'bg-[#181818] text-gray-500 hover:text-gray-400 border border-[#262626]'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-black text-[#21F1A8]' : 'bg-[#333] text-gray-300'
                      }`}>
                        L{crumb.depth}
                      </span>
                      <span className="truncate max-w-[150px]">{crumb.label}</span>
                      <span className={`text-[10px] px-1 rounded ${
                        isActive ? 'bg-black/20 text-black' : 'bg-[#141414] text-gray-400'
                      }`}>
                        {crumb.rowCount.toLocaleString()}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Quick depth actions */}
            <div className="flex items-center gap-1 shrink-0">
              {depthLevel > 0 && (
                <button
                  onClick={() => navigateBreadcrumb(depthLevel - 1)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#222] hover:bg-[#2b2b2b] text-gray-300 hover:text-white text-xs border border-[#333] transition-colors"
                  title="Go back one depth layer"
                >
                  <ArrowLeft className="w-3 h-3 text-[#21F1A8]" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}
              {depthLevel > 0 && (
                <button
                  onClick={() => navigateBreadcrumb(0)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#222] hover:bg-[#2b2b2b] text-gray-300 hover:text-white text-xs border border-[#333] transition-colors"
                  title="Reset to root level"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">Root</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. CONTEXT INFO, METRICS BAR & DRILL DEEPER PICKER */}
        {/* ==================================================================== */}
        <div className="p-4 space-y-4 overflow-y-auto shrink-0 bg-[#161616] border-b border-[#262626]">
          {/* KPI OR CHART SPECIFIC LINEAGE BANNER */}
          {drillThrough.kpi && (
            <div className="bg-[#1b2722] border border-[#21F1A8]/30 rounded-xl p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#21F1A8]/20 text-[#21F1A8] font-bold text-xs uppercase font-mono">
                    Audited KPI
                  </span>
                  <h4 className="text-white font-bold text-sm">{drillThrough.kpi.name}</h4>
                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                    drillThrough.kpi.status === 'Above Target' ? 'bg-[#21F1A8]/15 text-[#21F1A8]' :
                    drillThrough.kpi.status === 'At Risk' ? 'bg-red-500/15 text-red-400' :
                    'bg-amber-500/15 text-amber-400'
                  }`}>
                    {drillThrough.kpi.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-gray-400">Current Value: <strong className="text-white">{drillThrough.kpi.formattedValue}</strong></span>
                  <span className="text-gray-400">Traceable Column: <code className="text-[#21F1A8]">{drillThrough.kpi.traceableSource}</code></span>
                </div>
              </div>

              {drillThrough.kpi.formulaExpression && (
                <div className="text-xs text-gray-300 font-mono bg-[#141414] p-2 rounded-lg border border-[#282828] flex flex-wrap items-center justify-between gap-2">
                  <span><strong className="text-gray-400">Formula Rule:</strong> {drillThrough.kpi.formulaExpression}</span>
                  <span className="text-[11px] text-gray-500">DAX: {drillThrough.kpi.calculation}</span>
                </div>
              )}

              {drillThrough.kpi.businessImpact && (
                <p className="text-[11px] text-gray-400">
                  <strong className="text-gray-300">Strategic Impact:</strong> {drillThrough.kpi.businessImpact}
                </p>
              )}
            </div>
          )}

          {/* ACTIVE SLICE KEY METRICS TILES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-[#1b1b1b] border border-[#2d2d2d] rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase">Filtered Records</span>
              <div className="text-lg font-bold text-white flex items-baseline gap-1.5">
                {sliceRows.length.toLocaleString()}
                <span className="text-[10px] text-[#21F1A8]">
                  ({cleanRows.length > 0 ? Math.round((sliceRows.length / cleanRows.length) * 100) : 0}%)
                </span>
              </div>
              <span className="text-[10px] text-gray-500 block truncate">of {cleanRows.length.toLocaleString()} total rows</span>
            </div>

            <div className="bg-[#1b1b1b] border border-[#2d2d2d] rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase">Slice Metric Sum</span>
              <div className="text-lg font-bold text-[#21F1A8]">
                ${sliceMetrics.sum >= 1_000_000 
                  ? `${(sliceMetrics.sum / 1_000_000).toFixed(2)}M` 
                  : sliceMetrics.sum >= 1_000 
                  ? `${(sliceMetrics.sum / 1_000).toFixed(1)}K` 
                  : sliceMetrics.sum.toLocaleString()}
              </div>
              <span className="text-[10px] text-gray-500 block truncate">{primaryMetricCol || 'Primary Metric'}</span>
            </div>

            <div className="bg-[#1b1b1b] border border-[#2d2d2d] rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase">Average per Record</span>
              <div className="text-lg font-bold text-cyan-400">
                ${sliceMetrics.avg.toLocaleString()}
              </div>
              <span className="text-[10px] text-gray-500 block truncate">Normalized Unit Avg</span>
            </div>

            <div className="bg-[#1b1b1b] border border-[#2d2d2d] rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase">Record Spread (Min - Max)</span>
              <div className="text-sm font-bold text-amber-400 truncate">
                ${sliceMetrics.min.toLocaleString()} - ${sliceMetrics.max.toLocaleString()}
              </div>
              <span className="text-[10px] text-gray-500 block truncate">Range: ${(sliceMetrics.max - sliceMetrics.min).toLocaleString()}</span>
            </div>
          </div>

          {/* DRILL DEEPER SUB-DIMENSION EXPLORER */}
          {availableSubDimensions.length > 0 && (
            <div className="bg-[#141414] border border-[#282828] rounded-xl p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#21F1A8]" />
                    Drill Deeper Into This Slice By Dimension:
                  </span>
                  <select
                    value={selectedSubDimension}
                    onChange={(e) => setSelectedSubDimension(e.target.value)}
                    className="bg-[#202020] text-xs text-[#21F1A8] font-mono px-2.5 py-1 rounded-lg border border-[#383838] focus:border-[#21F1A8] focus:outline-none"
                  >
                    {availableSubDimensions.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  Click any segment bar below to drill into that sub-category
                </span>
              </div>

              {/* Sub-dimension breakdown bar chips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {subDimensionDistribution.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      drillDeeper({
                        label: `${selectedSubDimension}: "${item.value}"`,
                        filterColumn: selectedSubDimension,
                        filterValue: item.value,
                        subLabel: `${item.count} records (${item.share}%)`
                      });
                    }}
                    className="bg-[#1c1c1c] hover:bg-[#252525] border border-[#2f2f2f] hover:border-[#21F1A8]/60 rounded-lg p-2 text-left group transition-all"
                  >
                    <div className="text-[10px] text-gray-400 font-medium truncate group-hover:text-white">
                      {item.value}
                    </div>
                    <div className="flex items-baseline justify-between gap-1 pt-1 font-mono">
                      <span className="text-xs font-bold text-[#21F1A8]">{item.count} rows</span>
                      <span className="text-[9px] text-gray-500">{item.share}%</span>
                    </div>
                    {/* Small visual bar */}
                    <div className="w-full bg-[#2a2a2a] h-1 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className="bg-[#21F1A8] h-full rounded-full transition-all group-hover:bg-cyan-400"
                        style={{ width: `${Math.min(100, Math.max(8, item.share))}%` }}
                      ></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* 3. ROW-LEVEL DATA SOURCE TABLE */}
        {/* ==================================================================== */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#121212] overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-3 border-b border-[#242424] flex flex-wrap items-center justify-between gap-3 shrink-0 bg-[#171717]">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${sliceRows.length.toLocaleString()} rows in this slice...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#1e1e1e] text-xs text-white pl-8 pr-3 py-1.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                <span>Page size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-[#1e1e1e] text-xs text-white px-2 py-1 rounded border border-[#333] focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#222] hover:bg-[#2c2c2c] text-white text-xs font-medium border border-[#333] hover:border-[#21F1A8]/50 transition-colors"
                title="Download CSV of this exact slice"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#21F1A8]" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#222] hover:bg-[#2c2c2c] text-white text-xs font-medium border border-[#333] hover:border-cyan-400/50 transition-colors"
                title="Download JSON array"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">JSON</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto">
            {paginatedRows.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-2 text-gray-500 text-xs">
                <Search className="w-8 h-8 opacity-40" />
                <span>No records match the current filter or search criteria.</span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-[#21F1A8] hover:underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#191919] sticky top-0 z-10 border-b border-[#282828] text-gray-400 font-mono text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center text-gray-600">#</th>
                    {columns.map(col => {
                      const isSorted = sortColumn === col.name;
                      return (
                        <th
                          key={col.name}
                          onClick={() => handleSort(col.name)}
                          className="py-2.5 px-3 cursor-pointer hover:bg-[#222] hover:text-white transition-colors whitespace-nowrap select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col.name}</span>
                            <span className="text-gray-600">
                              {isSorted ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#21F1A8]" /> : <ArrowDown className="w-3 h-3 text-[#21F1A8]" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="py-2.5 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {paginatedRows.map((row, rIdx) => {
                    const absIndex = (currentPage - 1) * pageSize + rIdx + 1;
                    return (
                      <tr 
                        key={rIdx}
                        className="hover:bg-[#1c1c1c] transition-colors group cursor-pointer"
                        onClick={() => setInspectedRow(row)}
                      >
                        <td className="py-2.5 px-3 text-center text-gray-600 font-mono text-[10px]">
                          {absIndex}
                        </td>
                        {columns.map(col => {
                          const val = row[col.name];
                          const isNumeric = col.dataType === 'number';
                          const isCurrency = isNumeric && /revenue|sales|profit|cost|price|income|amount/i.test(col.name);

                          return (
                            <td 
                              key={col.name} 
                              className={`py-2.5 px-3 font-mono text-gray-300 whitespace-nowrap ${
                                isNumeric ? 'text-right' : ''
                              }`}
                            >
                              {val === null || val === undefined ? (
                                <span className="text-gray-600 italic">null</span>
                              ) : isCurrency ? (
                                <span className="text-white font-medium">
                                  ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : isNumeric ? (
                                <span className="text-gray-200">
                                  {Number(val).toLocaleString()}
                                </span>
                              ) : col.dataType === 'date' ? (
                                <span className="text-cyan-300">
                                  {String(val)}
                                </span>
                              ) : (
                                <span className="truncate max-w-[180px] inline-block">
                                  {String(val)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedRow(row);
                            }}
                            className="p-1 rounded text-gray-500 group-hover:text-[#21F1A8] hover:bg-[#252525] transition-colors"
                            title="Inspect full record details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="p-3 border-t border-[#242424] bg-[#171717] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 font-mono">
            <span className="text-gray-400">
              Showing <strong className="text-white">{sortedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
              <strong className="text-white">{Math.min(currentPage * pageSize, sortedRows.length)}</strong> of{' '}
              <strong className="text-white">{sortedRows.length.toLocaleString()}</strong> audited rows
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded bg-[#222] hover:bg-[#2c2c2c] disabled:opacity-40 disabled:hover:bg-[#222] text-white border border-[#333] transition-colors"
              >
                Previous
              </button>

              <span className="px-2 text-gray-400">
                Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded bg-[#222] hover:bg-[#2c2c2c] disabled:opacity-40 disabled:hover:bg-[#222] text-white border border-[#333] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 4. MODAL FOOTER ACTIONS */}
        {/* ==================================================================== */}
        <div className="bg-[#181818] border-t border-[#262626] p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Info className="w-3.5 h-3.5 text-[#21F1A8]" />
            <span>
              All row-level calculations reflect verified data warehouse records.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {depthLevel > 0 && (
              <button
                onClick={applyDrillThroughFilter}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#21F1A8]/15 hover:bg-[#21F1A8]/25 text-[#21F1A8] font-semibold text-xs border border-[#21F1A8]/40 transition-colors"
                title="Filter the entire Executive Dashboard to this exact slice"
              >
                <Filter className="w-3.5 h-3.5" />
                Apply as Global Dashboard Filter
              </button>
            )}

            <button
              onClick={closeDrillThrough}
              className="px-4 py-2 rounded-xl bg-[#252525] hover:bg-[#2f2f2f] text-white text-xs font-semibold border border-[#383838] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. SINGLE RECORD INSPECTOR DRAWER / MODAL */}
      {/* ==================================================================== */}
      {inspectedRow && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#181818] border border-[#333] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#1f1f1f]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#21F1A8]" />
                <h3 className="font-heading text-base font-bold text-white uppercase">
                  Transaction Record Provenance
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyJSON(inspectedRow)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#262626] text-gray-300 hover:text-white text-xs border border-[#383838]"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-[#21F1A8]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJson ? 'Copied' : 'Copy JSON'}
                </button>
                <button
                  onClick={() => setInspectedRow(null)}
                  className="p-1 rounded text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 font-mono text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(inspectedRow).map(([key, val]) => (
                  <div key={key} className="bg-[#131313] p-2.5 rounded-lg border border-[#262626] space-y-0.5">
                    <span className="text-[10px] text-gray-500 uppercase block truncate">{key}</span>
                    <span className="text-white font-medium block truncate">
                      {val !== null && val !== undefined ? String(val) : <em className="text-gray-600">null</em>}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <span className="text-[10px] text-gray-500 uppercase block mb-1">Raw JSON Payload</span>
                <pre className="bg-[#101010] p-3 rounded-lg border border-[#222] text-[11px] text-[#21F1A8] overflow-x-auto">
                  {JSON.stringify(inspectedRow, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-3 border-t border-[#262626] bg-[#1a1a1a] flex justify-end">
              <button
                onClick={() => setInspectedRow(null)}
                className="px-4 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-white text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
