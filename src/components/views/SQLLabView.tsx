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
  FileText,
  Wand2,
  CheckCircle2,
  Printer,
  X,
  ArrowRight,
  Filter,
  Layers,
  Table as TableIcon
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { executeSQLQuery, generateStarterSQLQueries, translateNaturalLanguageToSQL, SQLQueryResult } from '../../engine/sqlEngine';
import * as XLSX from 'xlsx';

export const SQLLabView: React.FC = () => {
  const { dataModel, columns, applyCleanedRows, setCurrentTab, project, brand } = usePlatform();
  const tableName = dataModel.tables[0]?.name || 'FactTable';

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SQLQueryResult | null>(null);
  const [nlInput, setNlInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const starters = React.useMemo(() => {
    return generateStarterSQLQueries(tableName, columns);
  }, [tableName, columns]);

  // SQL Data Cleaning query templates
  const cleaningPresets = React.useMemo(() => {
    const numCols = columns.filter(c => c.dataType === 'number');
    const catCols = columns.filter(c => c.dataType === 'string');
    const primaryNum = numCols[0]?.name || 'Amount';
    const primaryCat = catCols[0]?.name || 'Category';

    return [
      {
        name: '🧹 Filter Nulls & Invalids',
        sql: `SELECT * FROM [${tableName}]\nWHERE [${primaryNum}] IS NOT NULL AND [${primaryNum}] > 0\n  AND [${primaryCat}] IS NOT NULL;`,
        description: 'Excludes records containing missing or null values in primary fields.'
      },
      {
        name: '✂️ Deduplicate All Fields',
        sql: `SELECT DISTINCT * FROM [${tableName}];`,
        description: 'Eliminates duplicate observations and retains unique rows.'
      },
      {
        name: '🎯 Filter Top 20% Performers',
        sql: `SELECT * FROM [${tableName}]\nWHERE [${primaryNum}] >= (\n    SELECT AVG([${primaryNum}]) * 1.25 FROM [${tableName}]\n)\nORDER BY [${primaryNum}] DESC;`,
        description: 'Retains top-performing transactions exceeding 125% of baseline average.'
      },
      {
        name: '📊 Clean & Group By ' + primaryCat,
        sql: `SELECT \n    TRIM([${primaryCat}]) AS clean_${primaryCat.toLowerCase()},\n    COUNT(*) AS transaction_volume,\n    ROUND(SUM([${primaryNum}]), 2) AS total_${primaryNum.toLowerCase()},\n    ROUND(AVG([${primaryNum}]), 2) AS avg_${primaryNum.toLowerCase()}\nFROM [${tableName}]\nWHERE [${primaryCat}] IS NOT NULL\nGROUP BY [${primaryCat}]\nORDER BY total_${primaryNum.toLowerCase()} DESC;`,
        description: 'Cleans whitespace, groups categories, and aggregates totals and averages.'
      }
    ];
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
    setAppliedNotice(null);
  };

  const handleApplyCleanedToPlatform = () => {
    if (!result || result.rows.length === 0) return;
    applyCleanedRows(result.rows, 'SQL', `Cleaned via SQL query (${result.rows.length} rows, ${result.columns.length} columns)`);
    setAppliedNotice(`Cleaned SQL dataset applied! ${result.rows.length} validated rows are now active across the entire platform.`);
    setTimeout(() => setAppliedNotice(null), 5000);
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
    a.download = `sql_cleaned_results.csv`;
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

      {/* SQL Data Cleaning Presets & Starter Queries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cleaning Quick Operations */}
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#21F1A8]">
            <Wand2 className="w-4 h-4" />
            <span>SQL DATA CLEANING RECIPES</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {cleaningPresets.map((c, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(c.sql);
                  const res = executeSQLQuery(c.sql);
                  setResult(res);
                  setAppliedNotice(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#21F1A8]/30 hover:border-[#21F1A8] text-white text-xs transition-colors truncate max-w-xs"
                title={c.description}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Schema Exploration Queries */}
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>EXPLORATORY SCHEMA QUERIES</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {starters.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(s.sql);
                  const res = executeSQLQuery(s.sql);
                  setResult(res);
                  setAppliedNotice(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#2d2d2d] hover:border-cyan-400/50 text-gray-300 text-xs transition-colors truncate max-w-xs"
                title={s.description}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SQL Editor Area */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl overflow-hidden space-y-2 p-4">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="font-mono text-[11px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#21F1A8]" />
            SQL Query & Cleaning Studio ({tableName})
          </span>
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
          className="w-full bg-[#141414] text-xs text-[#21F1A8] font-mono p-3.5 rounded-xl border border-[#2a2a2a] focus:outline-none focus:border-[#21F1A8] leading-relaxed"
        />
      </div>

      {/* Applied Clean Data Notice */}
      {appliedNotice && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-[#21F1A8]/50 flex flex-wrap items-center justify-between gap-3 text-xs text-[#21F1A8] animate-fadeIn">
          <div className="flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-[#21F1A8]" />
            <span>{appliedNotice}</span>
          </div>
          <button
            onClick={() => setCurrentTab('executive_dashboard')}
            className="px-4 py-1.5 rounded-xl bg-[#21F1A8] text-black font-bold text-xs hover:bg-[#1cdb97] flex items-center gap-1"
          >
            View Executive Dashboard <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Query Results */}
      {result && (
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white uppercase font-mono">Query Execution Output</span>
              <span className="text-gray-400 font-mono">
                {result.rowCount} records returned in <span className="text-[#21F1A8]">{result.executionTimeMs}ms</span>
              </span>
            </div>

            {result.rows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleApplyCleanedToPlatform}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#21F1A8] text-black font-bold text-xs hover:bg-[#1cdb97] transition-all shadow-md shadow-[#21F1A8]/10"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Apply Cleaned Data to App</span>
                </button>

                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#242424] hover:bg-[#303030] text-white text-xs border border-[#3d3d3d] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#21F1A8]" />
                  <span>Generate SQL Report</span>
                </button>

                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#1e1e1e] hover:bg-[#282828] text-gray-300 text-xs border border-[#333] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
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

      {/* SQL Executive Report Modal */}
      {showReportModal && result && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#2d2d2d] flex items-center justify-between bg-[#141414]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#21F1A8]/10 text-[#21F1A8] border border-[#21F1A8]/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-white uppercase">
                    SQL ANALYSIS & DATA CLEANING EXECUTIVE REPORT
                  </h3>
                  <p className="text-xs text-gray-400">Formal verified audit generated from active AlaSQL query execution.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#242424] hover:bg-[#333] text-gray-200 text-xs border border-[#383838] flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-[#21F1A8]" />
                  <span>Print Report</span>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Report Document */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#161616] text-gray-200 print:bg-white print:text-black">
              {/* Report Header Metadata */}
              <div className="border-b border-[#2d2d2d] pb-5 space-y-2">
                <div className="text-[10px] font-mono text-[#21F1A8] uppercase tracking-wider font-bold">
                  {brand.companyName} • {brand.department}
                </div>
                <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
                  SQL QUERY AUDIT & DATA TRANSFORMATION SUMMARY
                </h1>
                <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-400 pt-1">
                  <span>Target Table: <b className="text-white">{tableName}</b></span>
                  <span>Execution Time: <b className="text-[#21F1A8]">{result.executionTimeMs}ms</b></span>
                  <span>Records Extracted: <b className="text-white">{result.rowCount.toLocaleString()} rows</b></span>
                  <span>Report Timestamp: <b>{new Date().toLocaleString()}</b></span>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="space-y-2">
                <h4 className="font-heading text-sm font-bold text-white uppercase text-[#21F1A8]">
                  1. Executive Brief & Transformation Mandate
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  This report documents the verification, cleaning, and aggregation operations performed via standard SQL execution against dataset <b>{tableName}</b>. Out of the baseline observations, <b>{result.rowCount}</b> validated rows satisfy the query predicates without synthetic distortion.
                </p>
              </div>

              {/* SQL Statement Executed */}
              <div className="space-y-2">
                <h4 className="font-heading text-sm font-bold text-white uppercase text-[#21F1A8]">
                  2. Executed SQL Statement
                </h4>
                <pre className="p-4 rounded-xl bg-[#0e0e0e] border border-[#2a2a2a] text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
                  {query}
                </pre>
              </div>

              {/* Results Data Sample */}
              <div className="space-y-2">
                <h4 className="font-heading text-sm font-bold text-white uppercase text-[#21F1A8]">
                  3. Cleaned Records Preview ({Math.min(result.rowCount, 10)} of {result.rowCount} Rows)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-[#2d2d2d]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#121212] text-gray-400 border-b border-[#2d2d2d]">
                      <tr>
                        {result.columns.map(c => (
                          <th key={c} className="p-2.5 whitespace-nowrap">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222]">
                      {result.rows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#1f1f1f]">
                          {result.columns.map(c => (
                            <td key={c} className="p-2 whitespace-nowrap text-gray-300">
                              {row[c] !== null && row[c] !== undefined ? String(row[c]) : 'null'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Certification Footer */}
              <div className="pt-4 border-t border-[#2d2d2d] flex items-center justify-between text-xs text-gray-500 font-mono">
                <span>Audited via NexusBI SQL Engine</span>
                <span className="text-[#21F1A8] font-bold">STATUS: BOARDROOM READY</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#2d2d2d] flex items-center justify-between bg-[#141414]">
              <button
                onClick={handleApplyCleanedToPlatform}
                className="px-4 py-2 rounded-xl bg-[#21F1A8] text-black font-bold text-xs hover:bg-[#1cdb97] flex items-center gap-1.5"
              >
                <Wand2 className="w-4 h-4" />
                <span>Apply as Active Platform Dataset</span>
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-xl bg-[#242424] hover:bg-[#303030] text-gray-300 text-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
