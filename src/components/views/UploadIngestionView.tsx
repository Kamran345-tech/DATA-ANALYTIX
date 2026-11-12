import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ArrowRight,
  Database,
  Table2,
  Key,
  Calendar,
  Hash,
  Type
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { DEMO_DATASETS } from '../../data/demoDatasets';

export const UploadIngestionView: React.FC = () => {
  const { 
    ingestFile, 
    loadDemoDataset, 
    isProcessing, 
    pipelineStep, 
    error,
    project,
    columns,
    cleanRows,
    setCurrentTab,
    themeMode 
  } = usePlatform();

  const isLight = themeMode === 'light';

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
  };

  const executeAnalysis = () => {
    if (selectedFile) {
      ingestFile(selectedFile);
    }
  };

  const inferColumnRole = (col: typeof columns[0]): string => {
    if (roleOverrides[col.name]) return roleOverrides[col.name];
    if (col.isPrimaryKeyCandidate || /id$|_id|^id/i.test(col.name)) return 'Identifier / Key';
    if (col.dataType === 'date' || /date|time|month|year|period/i.test(col.name)) return 'Time Dimension';
    if (col.dataType === 'number') {
      if (/rev|sales|amount|price|profit|margin|cost|mrr|arr/i.test(col.name)) return 'Financial Metric';
      return 'Quantitative Measure';
    }
    return 'Categorical Dimension';
  };

  const activeStep = isProcessing ? 2 : columns.length > 0 ? 3 : 1;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* View Header */}
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h1 className={`font-heading text-3xl sm:text-4xl font-bold tracking-tight uppercase ${
            isLight ? 'text-primary' : 'text-primary'
          }`}>
            INGEST &amp; ANALYZE BUSINESS DATA
          </h1>
          <p className={`text-sm max-w-xl mx-auto ${
            isLight ? 'text-muted' : 'text-secondary'
          }`}>
            Upload your raw file or connect directly to any live database server. The engine validates structure, maps column roles, models star schemas, and compiles dashboards.
          </p>
        </div>

        {/* 3-Step Workflow Stepper */}
        <div className="max-w-2xl mx-auto pt-2">
          <ol className="grid grid-cols-3 gap-2 sm:gap-4 p-2.5 rounded-2xl border bg-card border-subtle shadow-xs">
            {[
              { step: 1, title: 'Select Source', sub: 'CSV, XLSX or Demo' },
              { step: 2, title: 'Map Column Roles', sub: 'Types & Grain' },
              { step: 3, title: 'Ready for BI', sub: `${cleanRows.length.toLocaleString()} rows active` }
            ].map((item) => {
              const isCompleted = activeStep > item.step;
              const isCurrent = activeStep === item.step;
              return (
                <li
                  key={item.step}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                    isCurrent
                      ? isLight
                        ? 'bg-teal-50 border border-teal-200 text-teal-900'
                        : 'bg-teal-500/10 border border-teal-500/30 text-teal-300'
                      : isCompleted
                      ? isLight
                        ? 'bg-elevated text-muted'
                        : 'bg-card text-secondary'
                      : isLight
                      ? 'text-secondary'
                      : 'text-muted'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-teal-500 text-primary'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                      : isLight
                      ? 'bg-input text-muted'
                      : 'bg-elevated text-secondary'
                  }`}>
                    {isCompleted ? '✓' : item.step}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{item.title}</div>
                    <div className="text-[10px] font-mono opacity-75 truncate hidden sm:block">{item.sub}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Ingestion Mode Switcher */}
        <div className="inline-flex p-1 rounded-2xl border gap-1 shadow-md bg-elevated border-subtle">
          <button
            type="button"
            className="px-5 py-2 rounded-xl text-xs font-bold transition-all bg-sky-600 text-primary shadow-md flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-primary" />
            <span>Local Flat File Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('live_connector')}
            className="px-5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer text-secondary hover:text-primary hover:bg-card"
          >
            <Database className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
            <span>Live Server &amp; Database Connector</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-cyan-400 border border-sky-500/30 animate-pulse">
              Live
            </span>
          </button>
        </div>
      </div>

      {/* Dashed Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`depth-card border-2 border-dashed rounded-[20px] p-8 sm:p-10 text-center transition-all ${
          dragActive
            ? 'border-accent bg-accent-soft shadow-lg'
            : 'bg-card border-strong hover:border-accent shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json,.txt"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto shadow-lg">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className={`font-heading text-xl font-bold ${
              isLight ? 'text-primary' : 'text-primary'
            }`}>
              DRAG &amp; DROP RAW SPREADSHEET OR FILE
            </h3>
            <p className={`text-xs ${isLight ? 'text-muted' : 'text-secondary'}`}>
              Supports CSV, Microsoft Excel (.xlsx, .xls), JSON, and Delimited TXT
            </p>
            <div className="flex items-center justify-center gap-2 pt-1 font-mono text-[10px]">
              {['.CSV', '.XLSX', '.XLS', '.JSON'].map(ext => (
                <span
                  key={ext}
                  className={`px-2 py-0.5 rounded border ${
                    isLight ? 'bg-elevated border-slate-200 text-muted' : 'bg-card border-slate-800 text-secondary'
                  }`}
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isLight 
                ? 'bg-elevated hover:bg-input text-primary border-slate-300' 
                : 'bg-elevated hover:bg-input text-primary border-slate-700'
            }`}
          >
            Browse Local Machine
          </button>
        </div>
      </div>

      {/* Selected File Stage & Analyze Action */}
      {selectedFile && (
        <div className="depth-card p-5 rounded-[20px] bg-card border border-accent/40 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary">{selectedFile.name}</h4>
                <p className="text-xs text-secondary font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Type: {selectedFile.type || 'Standard Flat File'}
                </p>
              </div>
            </div>

            <button
              onClick={executeAnalysis}
              disabled={isProcessing}
              className="px-6 py-3 rounded-xl bg-accent hover:opacity-95 text-on-accent font-heading text-sm font-bold tracking-wide uppercase transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>PROCESSING...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>ANALYZE MY DATA</span>
                </>
              )}
            </button>
          </div>

          {isProcessing && (
            <div className="pt-3 border-t border-slate-800 text-xs font-mono text-teal-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              {pipelineStep}
            </div>
          )}

          {error && (
            <div className="pt-3 border-t border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Column-Role Mapping & Schema Inspection Table */}
      {columns.length > 0 && (
        <div className="depth-card rounded-[20px] border bg-card border-subtle shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-subtle bg-elevated flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Table2 className="w-4 h-4 text-teal-500 dark:text-teal-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <h3
                  title={project.name}
                  aria-label={project.name}
                  className={`font-heading text-sm font-bold uppercase tracking-wide line-clamp-2 [overflow-wrap:anywhere] ${
                    isLight ? 'text-primary' : 'text-primary'
                  }`}
                >
                  COLUMN-ROLE SCHEMA TABLE ({project.name})
                </h3>
                <p className={`text-xs ${isLight ? 'text-muted' : 'text-secondary'}`}>
                  {columns.length} columns profiled across {cleanRows.length.toLocaleString()} clean records
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('executive_dashboard')}
              className="px-3.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-600 dark:text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Open Executive Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto no-depth-3d">
            <table className="w-full text-left border-collapse no-depth-3d">
              <thead>
                <tr className={`border-b font-mono text-[11px] uppercase tracking-wider ${
                  isLight ? 'bg-elevated text-muted border-slate-200' : 'bg-card text-secondary border-slate-800'
                }`}>
                  <th className="py-2.5 px-4">Column Name</th>
                  <th className="py-2.5 px-4">Detected Type</th>
                  <th className="py-2.5 px-4">Analytical Role</th>
                  <th className="py-2.5 px-4 text-right">Completeness</th>
                  <th className="py-2.5 px-4 text-right">Distinct</th>
                  <th className="py-2.5 px-4">Sample Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70 text-xs font-mono">
                {columns.map((col) => {
                  const role = inferColumnRole(col);
                  const completeness = Math.max(0, Math.min(100, Math.round(100 - (col.nullPercentage || 0))));
                  const sampleVal = cleanRows[0]?.[col.name];
                  return (
                    <tr
                      key={col.name}
                      className={isLight ? 'hover:bg-elevated' : 'hover:bg-card'}
                    >
                      <td className={`py-2.5 px-4 font-semibold flex items-center gap-2 ${
                        isLight ? 'text-primary' : 'text-primary'
                      }`}>
                        {col.dataType === 'number' ? (
                          <Hash className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        ) : col.dataType === 'date' ? (
                          <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        ) : col.isPrimaryKeyCandidate ? (
                          <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Type className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        )}
                        <span>{col.name}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          col.dataType === 'number'
                            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-300 border-teal-500/25'
                            : col.dataType === 'date'
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/25'
                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/25'
                        }`}>
                          {col.dataType}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        <select
                          aria-label={`Role for ${col.name}`}
                          value={role}
                          onChange={(e) => setRoleOverrides(prev => ({ ...prev, [col.name]: e.target.value }))}
                          className={`text-xs rounded-lg px-2 py-1 border focus:outline-none cursor-pointer ${
                            isLight
                              ? 'bg-elevated border-slate-200 text-primary'
                              : 'bg-card border-slate-700 text-primary'
                          }`}
                        >
                          <option value="Identifier / Key">Identifier / Key</option>
                          <option value="Time Dimension">Time Dimension</option>
                          <option value="Financial Metric">Financial Metric</option>
                          <option value="Quantitative Measure">Quantitative Measure</option>
                          <option value="Categorical Dimension">Categorical Dimension</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        <span className={completeness >= 98 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                          {completeness}%
                        </span>
                      </td>
                      <td className={`py-2.5 px-4 text-right tabular-nums ${isLight ? 'text-muted' : 'text-secondary'}`}>
                        {(col.distinctCount || 0).toLocaleString()}
                      </td>
                      <td className={`py-2.5 px-4 truncate max-w-[160px] ${isLight ? 'text-muted' : 'text-secondary'}`}>
                        {sampleVal !== undefined && sampleVal !== null ? String(sampleVal) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Curated Benchmark Templates */}
      <div className={`space-y-4 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={`font-heading text-xl font-bold tracking-wide uppercase ${
            isLight ? 'text-primary' : 'text-primary'
          }`}>
            CURATED INDUSTRY BENCHMARK DATASETS
          </h3>
          <span className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border ${
            isLight 
              ? 'text-sky-800 bg-sky-50 border-sky-300' 
              : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
          }`}>
            Instant Analytical Templates
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_DATASETS.map(demo => (
            <div
              key={demo.id}
              className="depth-card p-5 rounded-[20px] border bg-card border-subtle hover:border-accent/50 space-y-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono ${isLight ? 'text-muted' : 'text-secondary'}`}>{demo.category}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  isLight 
                    ? 'text-teal-800 bg-teal-50 border-teal-200' 
                    : 'text-teal-400 bg-teal-500/10 border-teal-500/20'
                }`}>
                  Ready to Analyze
                </span>
              </div>

              <h4 className={`font-heading text-lg font-bold ${isLight ? 'text-primary' : 'text-primary'}`}>{demo.name}</h4>
              <p className={`text-xs ${isLight ? 'text-muted' : 'text-secondary'}`}>{demo.description}</p>

              <div className="pt-2 flex items-center justify-between">
                <span className={`text-xs font-mono ${isLight ? 'text-muted' : 'text-muted'}`}>{demo.rowsCount} records</span>
                <button
                  onClick={() => {
                    loadDemoDataset(demo.id);
                    setCurrentTab('executive_dashboard');
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isLight 
                      ? 'bg-elevated hover:bg-teal-50 text-teal-800 border-slate-300 hover:border-teal-500' 
                      : 'bg-card hover:bg-elevated text-primary border-slate-700 hover:border-teal-400'
                  }`}
                >
                  <span>Load Benchmark</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
