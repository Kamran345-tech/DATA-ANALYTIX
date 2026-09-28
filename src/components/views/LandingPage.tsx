import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Database, 
  Layers, 
  BarChart3, 
  ShieldCheck, 
  FileSpreadsheet, 
  Code2, 
  DownloadCloud, 
  Cpu, 
  AlertCircle,
  TrendingUp,
  FileCode,
  Terminal,
  Zap
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export const LandingPage: React.FC = () => {
  const { setCurrentTab, loadDemoDataset } = usePlatform();

  return (
    <div className="space-y-16 pb-20 animate-fadeIn">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-8 border-b border-[#262626] bg-gradient-to-b from-[#1b1b1b] to-[#171717]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-[#21F1A8]/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#21F1A8]/10 border border-[#21F1A8]/30 text-[#21F1A8] text-xs font-semibold uppercase tracking-wider font-mono">
            <Zap className="w-3.5 h-3.5" /> Autonomous BI & Data Engineering System
          </div>

          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-wide uppercase leading-tight">
            TURN YOUR DATA <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#21F1A8] via-[#52ffc3] to-[#00d8f6]">
              INTO INSIGHTS
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto font-sans leading-relaxed">
            Upload raw business data and let our engine automatically clean, profile, model, calculate verified KPIs, build interactive executive dashboards, and export editable Power BI & Excel packages.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setCurrentTab('upload')}
              className="px-8 py-3.5 rounded-xl bg-[#21F1A8] text-black font-heading text-xl font-bold tracking-wider uppercase hover:bg-[#1cdb97] hover:glow-neon-strong transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              <span>ANALYZE MY DATA</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                loadDemoDataset('global-retail-sales');
                setCurrentTab('executive_dashboard');
              }}
              className="px-6 py-3.5 rounded-xl bg-[#222] border border-[#333] hover:border-[#21F1A8]/50 text-white font-heading text-xl font-semibold tracking-wider uppercase hover:bg-[#282828] transition-all flex items-center gap-2"
            >
              <span>EXPLORE LIVE DASHBOARD</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#21F1A8]/20 text-[#21F1A8] font-mono font-semibold border border-[#21F1A8]/30">ACTIVE MODEL</span>
            </button>
          </div>

          {/* Value Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-medium">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#21F1A8]" /> 100% Real Calculations (Rule 1 & 7)</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#21F1A8]" /> Power BI PBIP Ready</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#21F1A8]" /> Multi-tab Excel Source Tables</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#21F1A8]" /> Zero Vendor Lock-in</span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Analytical Pipeline */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 mb-10">
          <h2 className="font-heading text-3xl sm:text-4xl text-white font-bold tracking-wide uppercase">
            THE AUTONOMOUS END-TO-END PIPELINE
          </h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            From raw, messy spreadsheets to verified tabular models, DAX measures, and boardroom-ready reporting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-3 relative group hover:border-[#21F1A8]/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center font-bold">1</div>
            <h3 className="font-heading text-lg font-bold text-white tracking-wide">INGESTION & AUDIT</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Auto-detects delimiter, field types, date frequencies, duplicate records, and computes a multi-point Data Quality Score.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-3 relative group hover:border-[#21F1A8]/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center font-bold">2</div>
            <h3 className="font-heading text-lg font-bold text-white tracking-wide">STAR SCHEMA MODELING</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Infers primary/foreign keys, candidate dimensions, and produces an interactive relational diagram with 1:N cardinality.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-3 relative group hover:border-[#21F1A8]/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center font-bold">3</div>
            <h3 className="font-heading text-lg font-bold text-white tracking-wide">DETERMINISTIC ANALYTICS</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              KPIs, period comparisons, IQR outlier anomalies, Pearson correlations, and statistical forecasts computed strictly from data.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-3 relative group hover:border-[#21F1A8]/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center font-bold">4</div>
            <h3 className="font-heading text-lg font-bold text-white tracking-wide">COMPLETE PROJECT ZIP</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              1-Click download of 14 organized folders: Excel source with tbl* tables, PBIP Model.bim, DAX, SQL, Python, and reports.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Deep Features Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#1c1c1c] border border-[#2e2e2e] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-bold text-white">LIVE SQL LAB IN-BROWSER</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Query your active dataset using full SQL syntax with instant millisecond execution time and table inspections.
            </p>
            <button 
              onClick={() => setCurrentTab('sql_lab')}
              className="text-xs text-[#21F1A8] hover:underline flex items-center gap-1 font-semibold"
            >
              Open SQL Lab <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#1c1c1c] border border-[#2e2e2e] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-bold text-white">PRODUCTION DAX LAB</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Automated generation of TOTALYTD, SAMEPERIODLASTYEAR, variance %, and financial margin measures mapped to your schema.
            </p>
            <button 
              onClick={() => setCurrentTab('dax_lab')}
              className="text-xs text-[#21F1A8] hover:underline flex items-center gap-1 font-semibold"
            >
              Explore DAX Lab <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#1c1c1c] border border-[#2e2e2e] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center">
              <Terminal className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-bold text-white">REPRODUCIBLE PYTHON</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Generates executable pandas, numpy, and matplotlib scripts. Run sandboxed statistical descriptions directly in the UI.
            </p>
            <button 
              onClick={() => setCurrentTab('python_lab')}
              className="text-xs text-[#21F1A8] hover:underline flex items-center gap-1 font-semibold"
            >
              Open Python Lab <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#1c1c1c] border border-[#2e2e2e] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-bold text-white">GROUNDED AI ANALYST</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Ask natural language business questions. The AI references exact calculation engine outputs with zero hallucination.
            </p>
            <button 
              onClick={() => setCurrentTab('ai_insights')}
              className="text-xs text-[#21F1A8] hover:underline flex items-center gap-1 font-semibold"
            >
              Ask Your Data <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#1c1c1c] border border-[#2e2e2e] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-bold text-white">POWER BI & EXCEL SOURCE</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Generates genuine multi-tab Excel workbooks with structured tbl* tables and editable Power BI PBIP tabular models.
            </p>
            <button 
              onClick={() => setCurrentTab('export_center')}
              className="text-xs text-[#21F1A8] hover:underline flex items-center gap-1 font-semibold"
            >
              View Export Center <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#1c1c1c] border border-[#2e2e2e] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-bold text-white">CLEANING AUDIT LOG</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Immutable separation between 01_Original_Data and 02_Cleaned_Data with full step-by-step undo, redo, and replay.
            </p>
            <button 
              onClick={() => setCurrentTab('cleaning')}
              className="text-xs text-[#21F1A8] hover:underline flex items-center gap-1 font-semibold"
            >
              Open Cleaning Lab <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Final CTA */}
      <section className="max-w-4xl mx-auto px-4 text-center p-10 rounded-3xl bg-gradient-to-r from-[#1b1b1b] via-[#202020] to-[#1b1b1b] border border-[#21F1A8]/30 space-y-6">
        <h2 className="font-heading text-4xl sm:text-5xl font-extrabold text-white tracking-wide uppercase">
          READY TO ANALYZE YOUR PROPRIETARY DATA?
        </h2>
        <p className="text-sm text-gray-300 max-w-xl mx-auto">
          Upload any CSV, XLSX, or JSON file. Receive your complete data model, interactive dashboard, DAX measures, and ZIP package in seconds.
        </p>
        <button
          onClick={() => setCurrentTab('upload')}
          className="px-8 py-3.5 rounded-xl bg-[#21F1A8] text-black font-heading text-xl font-bold tracking-wider uppercase hover:bg-[#1cdb97] hover:glow-neon transition-all"
        >
          ANALYZE MY DATA NOW
        </button>
      </section>
    </div>
  );
};
