import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileCode, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ArrowRight,
  Database,
  Layers
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
    setCurrentTab,
    themeMode 
  } = usePlatform();

  const isLight = themeMode === 'light';

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* View Header */}
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h1 className={`font-heading text-4xl font-bold tracking-wide uppercase ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            INGEST & ANALYZE BUSINESS DATA
          </h1>
          <p className={`text-sm max-w-xl mx-auto ${
            isLight ? 'text-slate-600' : 'text-gray-400'
          }`}>
            Upload your raw file or connect directly to any live database server. The engine validates structure, evaluates data quality, models star schemas, and compiles dashboards.
          </p>
        </div>

        {/* Ingestion Mode Switcher */}
        <div className={`inline-flex p-1 rounded-2xl border gap-1 shadow-md ${
          isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#141414] border-[#2d2d2d]'
        }`}>
          <button
            type="button"
            className="px-5 py-2 rounded-xl text-xs font-bold transition-all bg-sky-600 text-white shadow-md flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-white" />
            <span>Local Flat File Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('live_connector')}
            className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-white' : 'text-gray-400 hover:text-white hover:bg-[#202020]'
            }`}
          >
            <Database className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
            <span>Live Server & Database Connector</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-cyan-400 border border-sky-500/30 animate-pulse">
              Live
            </span>
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all ${
          isLight
            ? (dragActive ? 'border-sky-500 bg-sky-50/60 shadow-lg' : 'bg-white border-slate-300 hover:border-sky-400 shadow-sm')
            : (dragActive ? 'border-cyan-400 bg-cyan-500/5 glow-neon' : 'bg-[#1c1c1c] border-[#333] hover:border-cyan-400/50')
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
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-cyan-400 border border-sky-500/30 flex items-center justify-center mx-auto shadow-lg">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className={`font-heading text-xl font-bold ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              DRAG & DROP RAW SPREADSHEET OR FILE
            </h3>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
              Supports CSV, Microsoft Excel (.xlsx, .xls), JSON, and Delimited TXT
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                : 'bg-[#282828] hover:bg-[#333] text-white border-[#444]'
            }`}
          >
            Browse Local Machine
          </button>
        </div>
      </div>

      {/* Selected File Stage & Analyze Action */}
      {selectedFile && (
        <div className="p-5 rounded-2xl bg-[#1f1f1f] border border-cyan-400/40 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{selectedFile.name}</h4>
                <p className="text-xs text-gray-400 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Type: {selectedFile.type || 'Standard Flat File'}
                </p>
              </div>
            </div>

            <button
              onClick={executeAnalysis}
              disabled={isProcessing}
              className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-heading text-lg font-bold tracking-wide uppercase transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-sky-600/30"
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

          {/* Processing status feedback */}
          {isProcessing && (
            <div className="pt-3 border-t border-[#333] text-xs font-mono text-cyan-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              {pipelineStep}
            </div>
          )}

          {error && (
            <div className="pt-3 border-t border-red-500/30 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Curated Benchmark Templates */}
      <div className={`space-y-4 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-[#262626]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={`font-heading text-xl font-bold tracking-wide uppercase ${
            isLight ? 'text-slate-900' : 'text-white'
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
              className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                isLight 
                  ? 'bg-white border-slate-200 hover:border-sky-500 hover:shadow-md' 
                  : 'bg-[#1c1c1c] border-[#2d2d2d] hover:border-cyan-400/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{demo.category}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  isLight 
                    ? 'text-sky-800 bg-sky-50 border-sky-200' 
                    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                }`}>
                  Ready to Analyze
                </span>
              </div>

              <h4 className={`font-heading text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{demo.name}</h4>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>{demo.description}</p>

              <div className="pt-2 flex items-center justify-between">
                <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{demo.rowsCount} records</span>
                <button
                  onClick={() => {
                    loadDemoDataset(demo.id);
                    setCurrentTab('executive_dashboard');
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isLight 
                      ? 'bg-slate-50 hover:bg-sky-50 text-sky-800 border-slate-300 hover:border-sky-500' 
                      : 'bg-[#262626] hover:bg-[#333] text-white border-[#3d3d3d] hover:border-cyan-400'
                  }`}
                >
                  Load & View Dashboard <ArrowRight className={`w-3.5 h-3.5 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
