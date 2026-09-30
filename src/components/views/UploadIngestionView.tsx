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
    setCurrentTab 
  } = usePlatform();

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
          <h1 className="font-heading text-4xl font-bold text-white tracking-wide uppercase">
            INGEST & ANALYZE BUSINESS DATA
          </h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            Upload your raw file or connect directly to any live database server. The engine validates structure, evaluates data quality, models star schemas, and compiles dashboards.
          </p>
        </div>

        {/* Ingestion Mode Switcher */}
        <div className="inline-flex p-1 rounded-2xl bg-[#141414] border border-[#2d2d2d] gap-1 shadow-md">
          <button
            type="button"
            className="px-5 py-2 rounded-xl text-xs font-bold transition-all bg-[#21F1A8] text-black shadow-md flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-black" />
            <span>Local Flat File Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('live_connector')}
            className="px-5 py-2 rounded-xl text-xs font-semibold transition-all text-gray-400 hover:text-white hover:bg-[#202020] flex items-center gap-2"
          >
            <Database className="w-4 h-4 text-[#21F1A8]" />
            <span>Live Server & Database Connector</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21F1A8]/10 text-[#21F1A8] border border-[#21F1A8]/30 animate-pulse">
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
        className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all bg-[#1c1c1c] ${
          dragActive 
            ? 'border-[#21F1A8] bg-[#21F1A8]/5 glow-neon' 
            : 'border-[#333] hover:border-[#21F1A8]/50'
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
          <div className="w-16 h-16 rounded-2xl bg-[#21F1A8]/10 text-[#21F1A8] border border-[#21F1A8]/30 flex items-center justify-center mx-auto shadow-lg">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="font-heading text-xl font-bold text-white">
              DRAG & DROP RAW SPREADSHEET OR FILE
            </h3>
            <p className="text-xs text-gray-400">
              Supports CSV, Microsoft Excel (.xlsx, .xls), JSON, and Delimited TXT
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 rounded-xl bg-[#282828] hover:bg-[#333] text-white text-xs font-semibold border border-[#444] transition-colors"
          >
            Browse Local Machine
          </button>
        </div>
      </div>

      {/* Selected File Stage & Analyze Action */}
      {selectedFile && (
        <div className="p-5 rounded-2xl bg-[#1f1f1f] border border-[#21F1A8]/40 space-y-4 glow-neon">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#21F1A8]/20 text-[#21F1A8] flex items-center justify-center font-bold">
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
              className="px-6 py-3 rounded-xl bg-[#21F1A8] text-black font-heading text-lg font-bold tracking-wide uppercase hover:bg-[#1cdb97] hover:glow-neon-strong transition-all flex items-center gap-2 disabled:opacity-50"
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
            <div className="pt-3 border-t border-[#333] text-xs font-mono text-[#21F1A8] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#21F1A8] animate-ping" />
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
      <div className="space-y-4 pt-4 border-t border-[#262626]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-xl font-bold text-white tracking-wide uppercase">
            CURATED INDUSTRY BENCHMARK DATASETS
          </h3>
          <span className="text-xs text-[#21F1A8] font-mono font-medium bg-[#21F1A8]/10 px-2.5 py-0.5 rounded-full border border-[#21F1A8]/30">
            Instant Analytical Templates
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_DATASETS.map(demo => (
            <div
              key={demo.id}
              className="p-5 rounded-2xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-3 hover:border-[#21F1A8]/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400">{demo.category}</span>
                <span className="text-[10px] font-semibold text-[#21F1A8] bg-[#21F1A8]/10 px-2 py-0.5 rounded border border-[#21F1A8]/20">
                  Ready to Analyze
                </span>
              </div>

              <h4 className="font-heading text-lg font-bold text-white">{demo.name}</h4>
              <p className="text-xs text-gray-400">{demo.description}</p>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-500">{demo.rowsCount} records</span>
                <button
                  onClick={() => {
                    loadDemoDataset(demo.id);
                    setCurrentTab('executive_dashboard');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-white text-xs font-medium border border-[#3d3d3d] hover:border-[#21F1A8] transition-colors flex items-center gap-1.5"
                >
                  Load & View Dashboard <ArrowRight className="w-3.5 h-3.5 text-[#21F1A8]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
