import React, { useState } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export const DataPreviewView: React.FC = () => {
  const { cleanRows, columns, project } = usePlatform();
  const [activeTab, setActiveTab] = useState<'profile' | 'grid'>('profile');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');

  const filteredData = React.useMemo(() => {
    if (!search.trim()) return cleanRows;
    const q = search.toLowerCase();
    return cleanRows.filter(r => 
      Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );
  }, [cleanRows, search]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const pagedRows = filteredData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
            <Table2 className="w-7 h-7 text-[#21F1A8]" />
            DATA PROFILING & PREVIEW
          </h1>
          <p className="text-xs text-gray-400">
            {cleanRows.length.toLocaleString()} records across {columns.length} columns • Ingested from <span className="font-mono text-gray-200">{project.sourceFileName}</span>
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-xl border border-[#333]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'profile' ? 'bg-[#21F1A8] text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Column Statistical Profiles
          </button>
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'grid' ? 'bg-[#21F1A8] text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Data Records Table
          </button>
        </div>
      </div>

      {/* Profile Cards Grid */}
      {activeTab === 'profile' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {columns.map(col => {
            const isNum = col.dataType === 'number';
            const isDate = col.dataType === 'date';

            return (
              <div 
                key={col.name}
                className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4 hover:border-[#21F1A8]/40 transition-colors"
              >
                {/* Column Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-white text-base truncate" title={col.name}>
                      {col.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                        isNum ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
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

                  <span className="text-xs text-gray-500 font-mono">
                    {col.distinctCount} distinct
                  </span>
                </div>

                {/* Metrics Matrix */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-[#141414] border border-[#262626]">
                    <span className="text-gray-500 text-[10px] block">Null Rate:</span>
                    <span className={col.nullPercentage > 0 ? 'text-amber-400 font-semibold' : 'text-gray-300'}>
                      {col.nullPercentage}% ({col.nullCount})
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#141414] border border-[#262626]">
                    <span className="text-gray-500 text-[10px] block">Cardinality:</span>
                    <span className="text-gray-300 font-semibold">{col.uniquePercentage}%</span>
                  </div>

                  {isNum && (
                    <>
                      <div className="p-2 rounded-lg bg-[#141414] border border-[#262626]">
                        <span className="text-gray-500 text-[10px] block">Mean / Median:</span>
                        <span className="text-[#21F1A8]">{col.mean ?? 'N/A'} / {col.median ?? 'N/A'}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#141414] border border-[#262626]">
                        <span className="text-gray-500 text-[10px] block">Min - Max:</span>
                        <span className="text-white">{col.min} - {col.max}</span>
                      </div>
                    </>
                  )}

                  {isDate && (
                    <div className="col-span-2 p-2 rounded-lg bg-[#141414] border border-[#262626]">
                      <span className="text-gray-500 text-[10px] block">Span:</span>
                      <span className="text-purple-300">{col.min} → {col.max}</span>
                    </div>
                  )}
                </div>

                {/* Top values distribution */}
                {col.topValues.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#262626]">
                    <div className="text-[10px] text-gray-400 uppercase font-mono">Top Frequent Values</div>
                    <div className="space-y-1">
                      {col.topValues.slice(0, 3).map((v, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-300 truncate max-w-[180px]">{String(v.value)}</span>
                          <span className="text-gray-500 font-mono">{v.percentage.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Data Records Table */
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl overflow-hidden space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search raw records..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full bg-[#141414] text-xs text-white pl-9 pr-3 py-2 rounded-lg border border-[#333] focus:outline-none focus:border-[#21F1A8]"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
              <span>Showing {pagedRows.length} of {filteredData.length} entries</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#141414] text-gray-400 uppercase font-mono text-[10px] border-b border-[#2a2a2a]">
                <tr>
                  <th className="py-3 px-4">#</th>
                  {columns.map(c => (
                    <th key={c.name} className="py-3 px-4 whitespace-nowrap">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242424]">
                {pagedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#222] transition-colors font-mono">
                    <td className="py-2.5 px-4 text-gray-500">{page * pageSize + idx + 1}</td>
                    {columns.map(c => (
                      <td key={c.name} className="py-2.5 px-4 whitespace-nowrap truncate max-w-xs">
                        {row[c.name] === null || row[c.name] === undefined ? (
                          <span className="text-gray-600 italic">null</span>
                        ) : (
                          String(row[c.name])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500 font-mono">Page {page + 1} of {Math.max(1, totalPages)}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg bg-[#222] border border-[#333] text-gray-300 text-xs disabled:opacity-30 hover:bg-[#282828]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg bg-[#222] border border-[#333] text-gray-300 text-xs disabled:opacity-30 hover:bg-[#282828]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
