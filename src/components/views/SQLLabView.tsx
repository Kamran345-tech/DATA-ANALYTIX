import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Play, 
  Sparkles, 
  Copy, 
  Check, 
  Clock, 
  Download, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { executeSQLQuery, generateStarterSQLQueries, translateNaturalLanguageToSQL, SQLQueryResult } from '../../engine/sqlEngine';
import * as XLSX from 'xlsx';

export const SQLLabView: React.FC = () => {
  const { dataModel, columns } = usePlatform();
  const tableName = dataModel.tables[0]?.name || 'FactTable';

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SQLQueryResult | null>(null);
  const [nlInput, setNlInput] = useState('');
  const [copied, setCopied] = useState(false);

  const starters = React.useMemo(() => {
    return generateStarterSQLQueries(tableName, columns);
  }, [tableName, columns]);

  useEffect(() => {
    if (starters.length > 0 && !query) {
      setQuery(starters[0].sql);
    }
  }, [starters]);

  const handleRun = () => {
    if (!query.trim()) return;
    const res = executeSQLQuery(query);
    setResult(res);
  };

  const handleNLTranslate = () => {
    if (!nlInput.trim()) return;
    const translated = translateNaturalLanguageToSQL(nlInput, tableName, columns);
    setQuery(translated);
    const res = executeSQLQuery(translated);
    setResult(res);
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCSV = () => {
    if (!result || result.rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(result.rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <Database className="w-4 h-4" /> Real In-Browser AlaSQL Engine
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            LIVE SQL LAB
          </h1>
          <p className="text-xs text-gray-400">
            Execute standard SQL against your loaded data tables in memory with zero network latency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-black" /> Run Query
          </button>
        </div>
      </div>

      {/* Natural Language to SQL */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4.5 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Sparkles className="w-4 h-4 text-[#21F1A8]" />
          <span>NATURAL LANGUAGE → SQL TRANSLATOR</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. 'Show top 5 categories by total revenue'..."
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNLTranslate()}
            className="flex-1 bg-[#141414] text-xs text-white px-3.5 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
          />
          <button
            onClick={handleNLTranslate}
            className="px-4 py-2 rounded-xl bg-[#282828] hover:bg-[#333] text-white text-xs border border-[#444] transition-colors"
          >
            Generate & Run
          </button>
        </div>
      </div>

      {/* Starter Template Queries */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase text-gray-400">Pre-computed Schema Queries:</span>
        <div className="flex flex-wrap gap-2">
          {starters.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(s.sql);
                const res = executeSQLQuery(s.sql);
                setResult(res);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#1c1c1c] border border-[#2d2d2d] hover:border-[#21F1A8]/50 text-gray-300 text-xs transition-colors truncate max-w-xs"
              title={s.description}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* SQL Editor Area */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl overflow-hidden space-y-2 p-4">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="font-mono text-[11px]">SQL Editor ({tableName})</span>
          <button
            onClick={copyQuery}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#21F1A8]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={6}
          className="w-full bg-[#141414] text-xs text-[#21F1A8] font-mono p-3.5 rounded-xl border border-[#2a2a2a] focus:outline-none focus:border-[#21F1A8]"
        />
      </div>

      {/* Query Results */}
      {result && (
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white uppercase font-mono">Results</span>
              <span className="text-gray-400 font-mono">
                {result.rowCount} rows returned in <span className="text-[#21F1A8]">{result.executionTimeMs}ms</span>
              </span>
            </div>

            {result.rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-gray-200 border border-[#383838] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#21F1A8]" /> Export CSV
              </button>
            )}
          </div>

          {result.error ? (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{result.error}</span>
            </div>
          ) : result.rows.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500 bg-[#141414] rounded-xl border border-[#282828]">
              Query executed successfully but returned 0 rows.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#2a2a2a] max-h-96">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#141414] text-gray-400 border-b border-[#2a2a2a] sticky top-0">
                  <tr>
                    {result.columns.map(c => (
                      <th key={c} className="py-2.5 px-4 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {result.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#202020] transition-colors text-gray-300">
                      {result.columns.map(c => (
                        <td key={c} className="py-2 px-4 whitespace-nowrap">
                          {row[c] !== null && row[c] !== undefined ? String(row[c]) : 'null'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
