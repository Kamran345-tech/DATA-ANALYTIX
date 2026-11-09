import React, { useState } from 'react';
import { 
  Play, 
  UploadCloud, 
  TrendingUp, 
  Database, 
  ShieldCheck, 
  Network, 
  Sparkles, 
  Cpu, 
  CheckCircle2,
  Layers,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import { DEMO_DATASETS } from '../../data/demoDatasets';
import { Hero3DScene } from './Hero3DScene';

export const ModernWelcome: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { setCurrentTab, loadDemoDataset } = usePlatform();
  const { enterAsGuest } = useFirebaseAuth();

  const [activePersona, setActivePersona] = useState<'analyst' | 'engineer'>('analyst');

  const handleLaunchDemo = () => {
    enterAsGuest();
    loadDemoDataset(DEMO_DATASETS[0]?.id || 'sales_demo');
    setCurrentTab('executive_dashboard');
    if (onClose) onClose();
  };

  const handleUploadFile = () => {
    enterAsGuest();
    setCurrentTab('upload');
    if (onClose) onClose();
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-10 modern-fade-in">
      {/* 1. Hero Zone: Split with 3D Isometric Scene */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-4 text-left">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[var(--modern-primary)]">
            <span>DATA ANALYTICS</span>
            <span aria-hidden="true">·</span>
            <span>STAR SCHEMA</span>
            <span aria-hidden="true">·</span>
            <span>POWER BI</span>
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-[var(--modern-text)] leading-[1.08]">
            Raw data in. Clear decisions out.
          </h1>

          <p className="text-sm sm:text-base text-[var(--modern-text-muted)] leading-relaxed max-w-xl">
            Ingest messy spreadsheets, auto-generate normalized star schemas, and deliver board-level executive telemetry in seconds.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleLaunchDemo}
              className="btn-primary text-xs sm:text-sm shadow-md cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Try with sample data
            </button>

            <button
              onClick={handleUploadFile}
              className="btn-secondary text-xs sm:text-sm cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-[var(--modern-primary)]" />
              Upload Your File
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 flex items-center justify-center">
          <Hero3DScene />
        </div>
      </div>

      {/* 2. Interactive Mock Dashboard Preview */}
      <div className="modern-card p-5 sm:p-7 relative overflow-hidden border border-[var(--modern-border)]">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[var(--modern-border)]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-mono text-[var(--modern-text-muted)] ml-2">
              live-telemetry-preview.dash
            </span>
          </div>
          <span className="text-xs font-semibold text-[var(--modern-primary)] flex items-center gap-1 font-mono">
            Verified Audit Pipeline
          </span>
        </div>

        {/* Small animated telemetry preview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[var(--modern-bg-surface-2)] border border-[var(--modern-border)] space-y-1">
            <span className="text-[11px] font-medium text-[var(--modern-text-muted)]">Net Revenue</span>
            <div className="text-2xl font-extrabold font-mono text-[var(--modern-text)] tabular-nums">$4,566,200</div>
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold font-mono">
              <span>↑ +14.2%</span>
              <span className="text-[var(--modern-text-muted)] font-normal">vs target</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--modern-bg-surface-2)] border border-[var(--modern-border)] space-y-1">
            <span className="text-[11px] font-medium text-[var(--modern-text-muted)]">Gross Margin</span>
            <div className="text-2xl font-extrabold font-mono text-[var(--modern-text)] tabular-nums">51.4%</div>
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold font-mono">
              <span>↑ +3.8 pts</span>
              <span className="text-[var(--modern-text-muted)] font-normal">expansion</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--modern-bg-surface-2)] border border-[var(--modern-border)] space-y-1">
            <span className="text-[11px] font-medium text-[var(--modern-text-muted)]">Data Quality Score</span>
            <div className="text-2xl font-extrabold font-mono text-sky-400 tabular-nums">98 / 100</div>
            <div className="text-xs text-[var(--modern-text-muted)]">
              0 missing keys · 140 audited rows
            </div>
          </div>
        </div>
      </div>

      {/* 3. Analyst vs Data Engineer Persona Switcher */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--modern-border)] pb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActivePersona('analyst')}
              className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
                activePersona === 'analyst'
                  ? 'border-[var(--modern-primary)] text-[var(--modern-primary)]'
                  : 'border-transparent text-[var(--modern-text-muted)] hover:text-[var(--modern-text)]'
              }`}
            >
              Analyst Workbench
            </button>
            <button
              onClick={() => setActivePersona('engineer')}
              className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
                activePersona === 'engineer'
                  ? 'border-[var(--modern-primary)] text-[var(--modern-primary)]'
                  : 'border-transparent text-[var(--modern-text-muted)] hover:text-[var(--modern-text)]'
              }`}
            >
              Data Engineer Studio
            </button>
          </div>
          <span className="text-xs text-[var(--modern-text-muted)] hidden sm:inline">
            Tailored workflow capabilities
          </span>
        </div>

        {activePersona === 'analyst' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="modern-card p-5 space-y-2">
              <TrendingUp className="w-5 h-5 text-[var(--modern-primary)]" />
              <h4 className="text-sm font-bold text-[var(--modern-text)]">Statistical Breakdown</h4>
              <p className="text-xs text-[var(--modern-text-muted)] leading-relaxed">
                Interquartile ranges, variance decomposition, correlation heatmaps, and outlier isolation.
              </p>
            </div>
            <div className="modern-card p-5 space-y-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <h4 className="text-sm font-bold text-[var(--modern-text)]">DAX Measure Studio</h4>
              <p className="text-xs text-[var(--modern-text-muted)] leading-relaxed">
                20+ pre-calculated Time Intelligence, YoY Growth, and Cumulative Margin formulas ready to copy.
              </p>
            </div>
            <div className="modern-card p-5 space-y-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-[var(--modern-text)]">Executive Board Reports</h4>
              <p className="text-xs text-[var(--modern-text-muted)] leading-relaxed">
                Download publication-ready PDF decks and Power BI PBIP enterprise modeling packages.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="modern-card p-5 space-y-2">
              <Network className="w-5 h-5 text-[var(--modern-primary)]" />
              <h4 className="text-sm font-bold text-[var(--modern-text)]">Star Schema & ERD</h4>
              <p className="text-xs text-[var(--modern-text-muted)] leading-relaxed">
                Automatic flat-file decomposition into Fact tables and normalized Dimension tables.
              </p>
            </div>
            <div className="modern-card p-5 space-y-2">
              <Database className="w-5 h-5 text-sky-400" />
              <h4 className="text-sm font-bold text-[var(--modern-text)]">In-Browser AlaSQL Lab</h4>
              <p className="text-xs text-[var(--modern-text-muted)] leading-relaxed">
                Run complex multi-table SQL queries directly inside WebAssembly client memory.
              </p>
            </div>
            <div className="modern-card p-5 space-y-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <h4 className="text-sm font-bold text-[var(--modern-text)]">Visual Pipeline DAG</h4>
              <p className="text-xs text-[var(--modern-text-muted)] leading-relaxed">
                Track data transformations, cleansing lineage, and dependency hierarchies visually.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Trust Strip */}
      <div className="pt-4 border-t border-[var(--modern-border)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--modern-text-muted)]">
        <span className="font-semibold text-[var(--modern-text)]">Supported Engines:</span>
        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
          <span>CSV Delimited</span>
          <span aria-hidden="true">·</span>
          <span>Excel (.xlsx/.xls)</span>
          <span aria-hidden="true">·</span>
          <span>ANSI SQL</span>
          <span aria-hidden="true">·</span>
          <span>DAX Studio</span>
          <span aria-hidden="true">·</span>
          <span>Python (Pyodide)</span>
          <span aria-hidden="true">·</span>
          <span>Power BI (PBIP)</span>
        </div>
      </div>
    </div>
  );
};
