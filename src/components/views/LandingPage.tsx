import React from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Database, 
  Layers, 
  BarChart3, 
  ShieldCheck, 
  FileSpreadsheet, 
  Code2, 
  Terminal, 
  Zap, 
  HelpCircle,
  Sparkles,
  FileCode,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { Tooltip } from '../common/Tooltip';
import { BrandLogo } from '../common/BrandLogo';

export const LandingPage: React.FC = () => {
  const { setCurrentTab, loadDemoDataset, themeMode } = usePlatform();
  const isLight = themeMode === 'light';

  return (
    <div className="space-y-16 pb-20 animate-fadeIn max-w-7xl mx-auto">
      {/* 1. Hero Section - Maximum Contrast & Visual Elegance */}
      <section className={`relative overflow-hidden pt-12 pb-16 px-4 sm:px-8 rounded-3xl border transition-colors duration-200 ${
        isLight 
          ? 'bg-gradient-to-b from-slate-50 via-white to-slate-100/60 border-slate-200 shadow-sm' 
          : 'bg-gradient-to-b from-[#111827] via-[#0B0F17] to-[#0B0F17] border-border-subtle shadow-2xl'
      }`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-72 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          {/* Logo & Category Kicker */}
          <div className="flex flex-col items-center gap-3">
            <BrandLogo size="lg" showSubtitle={false} className="justify-center" />
            <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider font-mono border ${
              isLight 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              AUTONOMOUS BI & DATA ENGINEERING PLATFORM
            </div>
          </div>

          {/* Main Hero Headline with 100% Guaranteed Contrast */}
          <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight uppercase leading-[1.08] select-none">
            <span className={isLight ? 'text-slate-900' : 'text-white'}>
              TURN YOUR DATA
            </span>
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500 bg-clip-text text-transparent ml-2 sm:ml-0">
              INTO INSIGHTS
            </span>
          </h1>

          {/* Subtitle with High Readability */}
          <p className={`text-base sm:text-lg max-w-2xl mx-auto font-sans leading-relaxed ${
            isLight ? 'text-slate-600' : 'text-slate-300'
          }`}>
            Upload raw business data and let our engine automatically clean, profile, construct star-schema models, calculate verified enterprise KPIs, and export complete Power BI PBIP & Excel source workbooks.
          </p>

          {/* Action Button Island */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setCurrentTab('upload')}
              className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading text-lg font-bold tracking-wider uppercase transition-all flex items-center gap-2.5 shadow-lg shadow-emerald-600/30 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>ANALYZE MY DATA</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                loadDemoDataset('global-retail-sales');
                setCurrentTab('executive_dashboard');
              }}
              className={`px-7 py-3.5 rounded-xl font-heading text-lg font-bold tracking-wider uppercase transition-all flex items-center gap-2.5 border shadow-sm cursor-pointer ${
                isLight
                  ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                  : 'bg-surface-elevated hover:bg-surface-panel text-white border-border-prominent'
              }`}
            >
              <span>EXPLORE LIVE DASHBOARD</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-semibold border border-emerald-500/30">
                ACTIVE MODEL
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('how_to_use')}
              className={`px-6 py-3.5 rounded-xl font-heading text-lg font-semibold tracking-wider uppercase transition-all flex items-center gap-2 border shadow-xs cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                  : 'bg-surface-panel hover:bg-surface-elevated text-slate-200 border-border-subtle'
              }`}
            >
              <HelpCircle className="w-5 h-5 text-emerald-500" />
              <span>HOW TO USE GUIDE</span>
            </button>
          </div>

          {/* Clean Unboxed Value Proof Strip */}
          <div className={`pt-8 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-medium border-t ${
            isLight ? 'border-slate-200 text-slate-600' : 'border-border-subtle text-slate-300'
          }`}>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              100% Real Deterministic Calculations
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Power BI PBIP Native
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Multi-tab Tabular Architecture
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Zero Cloud Lock-in
            </span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Analytical Pipeline */}
      <section className="px-2 sm:px-4">
        <div className="text-center space-y-2 mb-10">
          <h2 className={`font-heading text-3xl sm:text-4xl font-bold tracking-wide uppercase ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            THE AUTONOMOUS END-TO-END PIPELINE
          </h2>
          <p className={`text-sm max-w-xl mx-auto ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>
            From raw, unstructured spreadsheets to audited data models, DAX measures, and boardroom-ready reporting.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              num: '01',
              title: 'INGESTION & AUDIT',
              desc: 'Auto-detects delimiters, formats dates locally, profiles nulls, and calculates a 4-dimensional Data Quality Score without artificial floors.'
            },
            {
              num: '02',
              title: 'STAR SCHEMA MODELING',
              desc: 'Infers foreign keys and dimensions with strict 1:N cardinality, generating interactive entity-relationship diagrams and Model.bim schemas.'
            },
            {
              num: '03',
              title: 'DETERMINISTIC ANALYTICS',
              desc: 'Computes Net Revenue, Gross Operating Profit, Margin %, PVM realizations, IQR anomalies, and Holt Linear trend projections.'
            },
            {
              num: '04',
              title: 'COMPLETE PROJECT ZIP',
              desc: 'Instant export of 14 production folders: multi-tab Excel workbooks, Fabric PBIP projects, DAX measures, SQL queries, and Python notebooks.'
            }
          ].map((step, idx) => (
            <div 
              key={idx}
              className={`p-6 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 ${
                isLight 
                  ? 'bg-white border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md' 
                  : 'bg-surface-card border-border-subtle hover:border-emerald-500/50 hover:bg-surface-panel'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  STEP {step.num}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 opacity-60 group-hover:opacity-100" />
              </div>
              <h3 className={`font-heading text-lg font-bold tracking-wide mb-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {step.title}
              </h3>
              <p className={`text-xs leading-relaxed ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Deep Features Grid */}
      <section className="px-2 sm:px-4">
        <div className="text-center space-y-2 mb-10">
          <h2 className={`font-heading text-3xl sm:text-4xl font-bold tracking-wide uppercase ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            PRODUCTION DATA LABS & WORKSPACES
          </h2>
          <p className={`text-sm max-w-xl mx-auto ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>
            Every developer and BI tool you need, fully mounted and responsive directly in your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: SQL Lab */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-xs hover:border-emerald-500' : 'bg-surface-card border-border-subtle hover:border-emerald-500/50'
          }`}>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <h3 className={`font-heading text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                LIVE SQL LAB IN-BROWSER
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Execute ANSI SQL with SELECT, GROUP BY, subqueries, and window functions directly over your active dataset in milliseconds.
              </p>
            </div>
            <button 
              onClick={() => setCurrentTab('sql_lab')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 font-bold pt-4 cursor-pointer"
            >
              <span>Open SQL Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: DAX Lab */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-xs hover:border-emerald-500' : 'bg-surface-card border-border-subtle hover:border-emerald-500/50'
          }`}>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className={`font-heading text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                PRODUCTION DAX LAB
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Automated generation of TOTALYTD, SAMEPERIODLASTYEAR, variance %, and financial margin measures mapped to your schema.
              </p>
            </div>
            <button 
              onClick={() => setCurrentTab('dax_lab')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 font-bold pt-4 cursor-pointer"
            >
              <span>Explore DAX Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Python Lab */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-xs hover:border-emerald-500' : 'bg-surface-card border-border-subtle hover:border-emerald-500/50'
          }`}>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className={`font-heading text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                REPRODUCIBLE PYTHON
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Generates executable pandas, numpy, and matplotlib scripts. Run sandboxed statistical descriptions directly in the workspace.
              </p>
            </div>
            <button 
              onClick={() => setCurrentTab('python_lab')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 font-bold pt-4 cursor-pointer"
            >
              <span>Open Python Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: AI Analyst */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-xs hover:border-emerald-500' : 'bg-surface-card border-border-subtle hover:border-emerald-500/50'
          }`}>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className={`font-heading text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                GROUNDED AI ANALYST
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Ask natural language business questions. Responses strictly cite verified metrics with deterministic fallbacks when offline.
              </p>
            </div>
            <button 
              onClick={() => setCurrentTab('ai_insights')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 font-bold pt-4 cursor-pointer"
            >
              <span>Ask Your Data</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 5: Power BI & Excel Export */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-xs hover:border-emerald-500' : 'bg-surface-card border-border-subtle hover:border-emerald-500/50'
          }`}>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className={`font-heading text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                POWER BI & EXCEL ARCHITECTURE
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Generates authentic multi-tab Excel workbooks with structured tbl* tables and editable Power BI PBIP tabular projects.
              </p>
            </div>
            <button 
              onClick={() => setCurrentTab('export_center')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 font-bold pt-4 cursor-pointer"
            >
              <span>View Export Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 6: Cleaning Audit Log */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-xs hover:border-emerald-500' : 'bg-surface-card border-border-subtle hover:border-emerald-500/50'
          }`}>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className={`font-heading text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                CLEANING AUDIT LOG
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Strict separation between raw ingested records and clean datasets with step-by-step audit lineage, undo, and replay.
              </p>
            </div>
            <button 
              onClick={() => setCurrentTab('cleaning')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 font-bold pt-4 cursor-pointer"
            >
              <span>Open Cleaning Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Final High-Contrast CTA Banner */}
      <section className={`p-8 sm:p-12 rounded-3xl border text-center space-y-6 transition-colors ${
        isLight
          ? 'bg-gradient-to-r from-emerald-50 via-slate-50 to-teal-50 border-emerald-200 shadow-sm'
          : 'bg-gradient-to-r from-[#111827] via-surface-card to-[#111827] border-emerald-500/30 shadow-xl'
      }`}>
        <h2 className={`font-heading text-3xl sm:text-5xl font-extrabold tracking-tight uppercase ${
          isLight ? 'text-slate-900' : 'text-white'
        }`}>
          READY TO AUDIT YOUR PROPRIETARY DATA?
        </h2>
        <p className={`text-sm sm:text-base max-w-xl mx-auto leading-relaxed ${
          isLight ? 'text-slate-600' : 'text-slate-300'
        }`}>
          Upload your CSV, XLSX, or JSON file. Receive verified calculations, interactive dashboards, DAX measures, and downloadable packages in seconds.
        </p>
        <div className="pt-2">
          <button
            onClick={() => setCurrentTab('upload')}
            className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading text-lg font-bold tracking-wider uppercase shadow-lg shadow-emerald-600/30 transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            ANALYZE MY DATA NOW
          </button>
        </div>
      </section>

      {/* Subtle Platform Attribution Footer */}
      <footer className={`pt-6 pb-2 text-center border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors ${
        isLight ? 'border-slate-200 text-slate-500' : 'border-border-subtle text-gray-400'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>AcuityBI</span>
          <span>•</span>
          <span>Autonomous AI Data Intelligence & Analytics Platform</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span>Developed by <strong className={`font-semibold ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`}>Kamran Badar</strong></span>
          <span className={isLight ? 'text-slate-300' : 'text-gray-600'}>|</span>
          <span className={isLight ? 'text-slate-600' : 'text-gray-300'}>Badar Analytics Technologies</span>
        </div>
      </footer>
    </div>
  );
};
