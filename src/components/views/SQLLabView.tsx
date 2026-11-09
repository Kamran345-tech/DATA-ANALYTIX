import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Play, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  AlertCircle,
  FileText,
  Wand2,
  CheckCircle2,
  Printer,
  X,
  ArrowRight,
  Layers,
  Table as TableIcon,
  Hash,
  Type,
  Calendar,
  Terminal
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { executeSQLQuery, generateStarterSQLQueries, translateNaturalLanguageToSQL, SQLQueryResult } from '../../engine/sqlEngine';
import * as XLSX from 'xlsx';

export const SQLLabView: React.FC = () => {
  const { dataModel, columns, applyCleanedRows, setCurrentTab, brand, themeMode } = usePlatform();
  const isLight = themeMode === 'light';
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
      const initialRes = executeSQLQuery(starters[0].sql);
      setResult(initialRes);
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

  const insertToken = (token: string) => {
    setQuery(prev => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}[${token}]`);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="depth-card rounded-[20px] p-6 border bg-card border-subtle shadow-[var(--shadow-card)] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent font-mono">
            <Database className="w-4 h-4" /> Real In-Browser AlaSQL Engine
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight uppercase text-primary">
            LIVE SQL WORKBENCH
          </h1>
          <p className="text-xs text-secondary">
            Execute standard ANSI SQL against your loaded data tables in memory with zero network latency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-on-accent font-bold text-xs transition-all cursor-pointer shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Run Query
          </button>
        </div>
      </div>

      {/* Workbench Split Grid: Left Tables & Schema Panel (4 cols) + Right Editor Chrome & Results (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Tables & Schema Explorer Panel */}
        <aside className="lg:col-span-4 depth-card rounded-[20px] border bg-card border-subtle shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-4 py-3 border-b bg-elevated border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-accent">
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tables &amp; Schema</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent-soft)] text-accent border border-subtle">
              {dataModel.tables.length || 1} tables
            </span>
          </div>

          <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto">
            {(dataModel.tables.length > 0 ? dataModel.tables : [{ name: tableName, type: 'Fact' as const, columns: columns.map(c => c.name), primaryKey: columns[0]?.name }]).map((tbl, tIdx) => (
              <div
                key={tbl.name + tIdx}
                className="rounded-xl border p-3 space-y-2 bg-elevated border-subtle"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => insertToken(tbl.name)}
                    className="font-mono text-xs font-bold flex items-center gap-1.5 text-primary hover:text-accent transition-colors cursor-pointer"
                    title="Click to insert table name into SQL editor"
                  >
                    <Database className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="truncate">{tbl.name}</span>
                  </button>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-elevated text-[var(--accent-2)] border border-subtle">
                    {tbl.type}
                  </span>
                </div>

                <div className="space-y-1 pt-1 border-t border-subtle">
                  {columns.map(col => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => insertToken(col.name)}
                      className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer hover:bg-card text-secondary hover:text-primary"
                      title={`Click to insert [${col.name}]`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        {col.dataType === 'number' ? (
                          <Hash className="w-3 h-3 text-accent shrink-0" />
                        ) : col.dataType === 'date' ? (
                          <Calendar className="w-3 h-3 text-[var(--accent-2)] shrink-0" />
                        ) : (
                          <Type className="w-3 h-3 text-[var(--info)] shrink-0" />
                        )}
                        <span className="truncate">{col.name}</span>
                      </span>
                      <span className="text-[10px] text-muted uppercase shrink-0 ml-2">{col.dataType}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Quick Presets inside sidebar */}
            <div className="pt-2 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-muted px-1 flex items-center gap-1.5">
                <Wand2 className="w-3 h-3 text-accent" /> Cleaning &amp; Starter Queries
              </div>
              <div className="space-y-1.5">
                {[...cleaningPresets, ...starters].slice(0, 6).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(preset.sql);
                      const res = executeSQLQuery(preset.sql);
                      setResult(res);
                      setAppliedNotice(null);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 bg-elevated hover:bg-card-hover border-subtle hover:border-strong text-secondary hover:text-primary"
                  >
                    <span className="truncate font-medium">{preset.name}</span>
                    <ArrowRight className="w-3 h-3 text-accent shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT: NL Translator + Editor Chrome + Monospace Results */}
        <div className="lg:col-span-8 space-y-5">
          {/* Natural Language to SQL Bar */}
          <div className="depth-card rounded-[20px] p-4 border bg-card border-subtle shadow-[var(--shadow-card)] space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>NATURAL LANGUAGE &rarr; SQL TRANSLATOR</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 'Show top 5 categories by total revenue'..."
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNLTranslate()}
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border bg-input text-primary border-subtle focus:border-accent focus:outline-none"
              />
              <button
                onClick={handleNLTranslate}
                className="px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer bg-elevated hover:bg-card-hover text-primary border-subtle"
              >
                Generate &amp; Run
              </button>
            </div>
          </div>

          {/* SQL Workbench Editor Chrome (No 3D transform on editor) */}
          <div className="editor-chrome no-depth-3d rounded-[20px] border bg-card border-subtle shadow-[var(--shadow-card)] overflow-hidden">
            {/* Top Editor Tab Chrome */}
            <div className="px-4 py-2.5 border-b bg-elevated border-subtle text-secondary flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <span className="font-mono text-[11px] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--accent-soft)] text-accent border border-subtle">
                  <Terminal className="w-3 h-3" />
                  query_workbench.sql ({tableName})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyQuery}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-card-hover text-secondary hover:text-primary transition-colors cursor-pointer font-mono text-[11px]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy SQL'}</span>
                </button>
                <button
                  onClick={handleRun}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-accent text-on-accent font-bold text-[11px] transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Execute</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-input border-t border-subtle">
              <textarea
                aria-label="SQL query editor"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={7}
                className="no-depth-3d w-full bg-transparent text-xs sm:text-sm text-accent font-mono p-2 focus:outline-none leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Applied Clean Data Notice */}
          {appliedNotice && (
            <div className="p-4 rounded-2xl bg-[var(--accent-soft)] border border-subtle flex flex-wrap items-center justify-between gap-3 text-xs text-accent animate-fadeIn">
              <div className="flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>{appliedNotice}</span>
              </div>
              <button
                onClick={() => setCurrentTab('executive_dashboard')}
                className="px-4 py-1.5 rounded-xl bg-accent text-on-accent font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                View Executive Dashboard <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Monospace Query Results Table (No 3D transform on table) */}
          {result && (
            <div className="no-depth-3d rounded-[20px] border p-5 space-y-4 bg-card border-subtle shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold uppercase font-mono text-primary">
                    Query Execution Output
                  </span>
                  <span className="text-muted font-mono tabular-nums">
                    {result.rowCount} rows in <span className="text-accent font-semibold">{result.executionTimeMs}ms</span>
                  </span>
                </div>

                {result.rows.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleApplyCleanedToPlatform}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-on-accent font-bold text-xs transition-all cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Apply Cleaned Data to App</span>
                    </button>

                    <button
                      onClick={() => setShowReportModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors cursor-pointer bg-elevated hover:bg-card-hover text-primary border-subtle"
                    >
                      <FileText className="w-3.5 h-3.5 text-accent" />
                      <span>SQL Report</span>
                    </button>

                    <button
                      onClick={exportCSV}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border transition-colors cursor-pointer bg-elevated hover:bg-card-hover text-secondary hover:text-primary border-subtle"
                    >
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                  </div>
                )}
              </div>

              {result.error ? (
                <div className="p-4 rounded-xl bg-elevated border border-subtle text-xs text-[var(--danger)] font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{result.error}</span>
                </div>
              ) : result.rows.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-muted rounded-xl border border-subtle">
                  Query executed successfully (0 rows returned).
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-subtle max-h-96 no-depth-3d">
                  <table className="w-full text-left text-xs font-mono tabular-nums no-depth-3d">
                    <thead className="border-b sticky top-0 bg-elevated text-secondary border-subtle">
                      <tr>
                        {result.columns.map(c => (
                          <th key={c} className="py-2.5 px-4 whitespace-nowrap font-bold">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {result.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-card-hover text-primary">
                          {result.columns.map(c => (
                            <td key={c} className="py-2 px-4 whitespace-nowrap font-mono">
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
      </div>

      {/* SQL Executive Report Modal */}
      {showReportModal && result && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-subtle rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-subtle flex items-center justify-between bg-elevated">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-accent border border-subtle">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-primary uppercase">
                    SQL ANALYSIS &amp; DATA CLEANING EXECUTIVE REPORT
                  </h3>
                  <p className="text-xs text-secondary">Formal verified audit generated from active AlaSQL query execution.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-card hover:bg-card-hover text-primary text-xs border border-subtle flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-accent" />
                  <span>Print Report</span>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 rounded-lg bg-card hover:bg-card-hover text-secondary hover:text-primary cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-card text-primary">
              <div className="border-b border-subtle pb-5 space-y-2">
                <div className="text-[10px] font-mono text-accent uppercase tracking-wider font-bold">
                  {brand.companyName} • {brand.department}
                </div>
                <h2 className="font-heading text-2xl font-bold text-primary uppercase tracking-wide">
                  SQL QUERY AUDIT &amp; DATA TRANSFORMATION SUMMARY
                </h2>
                <div className="flex flex-wrap gap-4 text-xs font-mono text-secondary pt-1">
                  <span>Target Table: <b className="text-primary">{tableName}</b></span>
                  <span>Execution Time: <b className="text-accent">{result.executionTimeMs}ms</b></span>
                  <span>Records Extracted: <b className="text-primary">{result.rowCount.toLocaleString()} rows</b></span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-heading text-sm font-bold text-[var(--info)] uppercase">
                  Executed SQL Statement
                </h4>
                <pre className="p-4 rounded-xl bg-input border border-subtle text-xs font-mono text-accent overflow-x-auto whitespace-pre leading-relaxed">
                  {query}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
