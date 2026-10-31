import React, { useState } from 'react';
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
  Cpu,
  GitBranch,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Table,
  Check,
  RefreshCw,
  FolderDown,
  MonitorPlay,
  Share2
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { BrandLogo } from '../common/BrandLogo';
import { DEMO_DATASETS } from '../../data/demoDatasets';

export const LandingPage: React.FC = () => {
  const { setCurrentTab, loadDemoDataset, themeMode, project } = usePlatform();
  const isLight = themeMode === 'light';
  const [activePipelineStage, setActivePipelineStage] = useState<number>(0);

  const pipelineStages = [
    {
      step: '01',
      title: 'Raw Ingestion',
      subtitle: 'Multi-Source Parsing',
      tab: 'upload' as const,
      desc: 'Auto-detects delimiters, ISO-8601 timestamps, currency symbols, and schema signatures across CSV, Excel, and JSON.',
      metric: '0ms network hop',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      step: '02',
      title: 'Quality & Hygiene',
      subtitle: 'Deterministic Auditing',
      tab: 'quality' as const,
      desc: 'Computes a 4D Data Quality Score, isolates nulls, flags statistical outliers via IQR, and deduplicates identical records.',
      metric: '99.4% audit accuracy',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      step: '03',
      title: 'Star Schema Modeling',
      subtitle: 'Automated Kimball ERD',
      tab: 'modeling' as const,
      desc: 'Separates numeric facts from dimensional entities, establishes 1:N cardinality, and generates Model.bim metadata.',
      metric: 'Strict 1:N constraints',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      step: '04',
      title: 'DAX & Analytics',
      subtitle: 'Financial & Time Intelligence',
      tab: 'dax_lab' as const,
      desc: 'Computes Net Revenue, Gross Margin %, PVM realizations, TOTALYTD, and SAMEPERIODLASTYEAR measures deterministically.',
      metric: '100% verified math',
      color: 'from-purple-500 to-emerald-500'
    },
    {
      step: '05',
      title: 'Boardroom & PBIP',
      subtitle: 'Interactive Delivery',
      tab: 'executive_dashboard' as const,
      desc: 'Interactive dashboards with dynamic slicers, full-screen boardroom presentation mode, and 14-folder project zip exports.',
      metric: 'Power BI native',
      color: 'from-emerald-500 to-cyan-500'
    }
  ];

  return (
    <div className="space-y-16 pb-20 animate-fadeIn max-w-7xl mx-auto font-sans">
      {/* 1. Hero Section - Data Analytix Master Design */}
      <section className={`relative overflow-hidden pt-12 pb-16 px-4 sm:px-10 rounded-3xl transition-colors duration-200 ${
        isLight 
          ? 'glass-panel shadow-lg' 
          : 'glass-panel-luminous shadow-2xl'
      }`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-80 bg-cyan-500/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute top-1/4 right-10 w-96 h-96 bg-indigo-500/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-4 left-10 w-72 h-72 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          {/* Logo & Category Kicker */}
          <div className="flex flex-col items-center gap-3">
            <BrandLogo size="lg" showSubtitle={false} className="justify-center" />
            
            {/* Zero-Pill Typographic Kicker */}
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider font-mono">
              <span className={isLight ? 'text-cyan-700 font-bold' : 'text-cyan-400 font-bold'}>DATA ANALYTICS</span>
              <span className="text-slate-400">·</span>
              <span className={isLight ? 'text-indigo-700 font-bold' : 'text-indigo-400 font-bold'}>DATA ENGINEERING</span>
              <span className="text-slate-400">·</span>
              <span className={isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold'}>BUSINESS INTELLIGENCE</span>
            </div>
          </div>

          {/* Main Hero Headline */}
          <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight uppercase leading-[1.08] select-none">
            <span className={isLight ? 'text-slate-900' : 'text-[#F8FAFC]'}>
              ENGINEERING DATA.
            </span>
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent ml-2 sm:ml-0">
              UNLOCKING INSIGHTS.
            </span>
          </h1>

          {/* Subtitle with High Readability */}
          <p className={`text-base sm:text-lg max-w-2xl mx-auto font-sans leading-relaxed ${
            isLight ? 'text-slate-600' : 'text-slate-300'
          }`}>
            Transform raw data into reliable pipelines, interactive dashboards, and actionable business intelligence with practical data analytics and engineering solutions.
          </p>

          {/* Action Button Island */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={() => setCurrentTab('upload')}
              className="glass-btn-primary px-8 py-3.5 rounded-xl font-heading text-base font-bold tracking-wide uppercase flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>ANALYZE MY DATA</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                loadDemoDataset('global-retail-sales');
                setCurrentTab('executive_dashboard');
              }}
              className="glass-btn-secondary px-7 py-3.5 rounded-xl font-heading text-base font-bold tracking-wide uppercase flex items-center gap-2.5 cursor-pointer"
            >
              <span>EXPLORE LIVE DASHBOARD</span>
              <span className={`text-[11px] font-mono tracking-wider font-semibold ${
                isLight ? 'text-cyan-700' : 'text-cyan-400'
              }`}>
                · ACTIVE
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('data_engineering')}
              className="glass-btn-secondary px-6 py-3.5 rounded-xl font-heading text-base font-semibold tracking-wide uppercase flex items-center gap-2 cursor-pointer"
            >
              <GitBranch className="w-4 h-4 text-indigo-400" />
              <span>DATA ENGINEERING DAG</span>
            </button>

            <button
              onClick={() => setCurrentTab('how_to_use')}
              className="glass-btn-secondary px-5 py-3.5 rounded-xl font-heading text-base font-semibold tracking-wide uppercase flex items-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>GUIDE</span>
            </button>
          </div>

          {/* Clean Unboxed Value Proof Strip (Zero-Pill Discipline) */}
          <div className={`pt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm font-medium border-t ${
            isLight ? 'border-slate-200 text-slate-600' : 'border-[#273449] text-[#A8B3C7]'
          }`}>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              100% Deterministic Math
            </span>
            <span className="text-slate-400">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              Star Schema Modeling
            </span>
            <span className="text-slate-400">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              Power BI PBIP Native
            </span>
            <span className="text-slate-400">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              In-Browser SQL & Python
            </span>
            <span className="text-slate-400">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              Zero Cloud Lock-In
            </span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Data Engineering Pipeline DAG Visualization */}
      <section className="px-2 sm:px-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider mb-1 text-cyan-400">
              <GitBranch className="w-4 h-4 text-cyan-400" />
              <span>ARCHITECTURE & DATA LINEAGE</span>
            </div>
            <h2 className={`font-heading text-2xl sm:text-3xl font-bold tracking-tight uppercase ${
              isLight ? 'text-slate-900' : 'text-[#F8FAFC]'
            }`}>
              THE END-TO-END DATA ENGINE
            </h2>
            <p className={`text-xs sm:text-sm max-w-xl ${isLight ? 'text-slate-600' : 'text-[#A8B3C7]'}`}>
              Click any stage in the pipeline DAG to inspect data transformations or jump directly to the live workspace.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('data_engineering')}
            className={`self-start md:self-auto px-4 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                : 'bg-[#172338] hover:bg-[#1E2D4A] text-cyan-300 border-[#273449]'
            }`}
          >
            <span>LAUNCH FULL DAG WORKBENCH</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* DAG Stages Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {pipelineStages.map((stage, idx) => {
            const isSelected = activePipelineStage === idx;
            return (
              <div
                key={idx}
                onClick={() => {
                  setActivePipelineStage(idx);
                  setCurrentTab(stage.tab);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative group ${
                  isSelected 
                    ? isLight 
                      ? 'bg-white border-cyan-500 shadow-md ring-2 ring-cyan-500/20' 
                      : 'bg-[#172338] border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : isLight 
                      ? 'bg-white border-slate-200 hover:border-slate-300' 
                      : 'bg-[#121C2F] border-[#273449] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    STAGE {stage.step}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {stage.metric}
                  </span>
                </div>
                <h3 className={`font-heading text-sm font-bold tracking-tight mb-1 ${
                  isLight ? 'text-slate-900' : 'text-[#F8FAFC]'
                }`}>
                  {stage.title}
                </h3>
                <p className={`text-[11px] leading-relaxed line-clamp-3 mb-3 ${
                  isLight ? 'text-slate-600' : 'text-[#A8B3C7]'
                }`}>
                  {stage.desc}
                </p>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-500 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Stage</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Core Disciplines: Data Analytics vs Data Engineering */}
      <section className="px-2 sm:px-4 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className={`font-heading text-3xl sm:text-4xl font-extrabold tracking-tight uppercase ${
            isLight ? 'text-slate-900' : 'text-[#F8FAFC]'
          }`}>
            COMPLETE DATA ROLE COVERAGE
          </h2>
          <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-600' : 'text-[#A8B3C7]'}`}>
            Built to professional standards for Senior Data Analysts, Analytics Engineers, and C-Suite decision makers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1: Data Analytics & Business Intelligence */}
          <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 transition-all ${
            isLight 
              ? 'bg-white border-slate-200 shadow-sm' 
              : 'bg-[#172338] border-[#273449]'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
                  DISCIPLINE 01
                </span>
                <h3 className={`font-heading text-xl font-bold ${isLight ? 'text-slate-900' : 'text-[#F8FAFC]'}`}>
                  Data Analytics & Business Intelligence
                </h3>
              </div>
            </div>

            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-[#A8B3C7]'}`}>
              Deliver boardroom-ready clarity with automated KPI calculations, interactive slicers, statistical driver discovery, and certified Power BI templates.
            </p>

            <div className="space-y-3 pt-2">
              {[
                { title: 'Deterministic KPI Engine', desc: 'Net Revenue, Gross Margin %, PVM realizations, and Holt Linear trend forecasting without hallucinations.' },
                { title: 'Interactive Multi-Select Slicers', desc: 'Power BI-style segment, region, category, and date range filters with synchronized cross-chart filtering.' },
                { title: 'Boardroom Presentation Deck', desc: 'Fullscreen C-Suite slideshow mode with executive summaries, visual telemetry, and kiosk auto-play.' },
                { title: 'Certified DAX Measure Studio', desc: 'Pre-calculated formulas for TOTALYTD, SAMEPERIODLASTYEAR, margin variance, and moving averages.' }
              ].map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-[#F8FAFC]'}`}>{feat.title}</div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-[#A8B3C7]'}`}>{feat.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setCurrentTab('executive_dashboard')}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Executive Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentTab('dax_lab')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-[#121C2F] hover:bg-[#1E2D4A] text-slate-200 border-[#273449]'
                }`}
              >
                <span>DAX Studio</span>
              </button>
            </div>
          </div>

          {/* Pillar 2: Data Engineering & Pipeline Architecture */}
          <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 transition-all ${
            isLight 
              ? 'bg-white border-slate-200 shadow-sm' 
              : 'bg-[#172338] border-[#273449]'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-400 uppercase">
                  DISCIPLINE 02
                </span>
                <h3 className={`font-heading text-xl font-bold ${isLight ? 'text-slate-900' : 'text-[#F8FAFC]'}`}>
                  Data Engineering & Architecture
                </h3>
              </div>
            </div>

            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-[#A8B3C7]'}`}>
              Construct durable analytics foundations with automated dimensional modeling, strict 1:N cardinality, data quality assertions, and live SQL/Python sandboxes.
            </p>

            <div className="space-y-3 pt-2">
              {[
                { title: 'Automated Star & Snowflake Modeling', desc: 'Separates facts from dimensions, infers foreign keys, and builds verified entity relationships.' },
                { title: 'Data Quality & Hygiene Auditor', desc: 'Profiles nulls, duplicate rows, data drift, and provides 1-click deterministic cleaning pipelines.' },
                { title: 'In-Browser ANSI SQL Workbench', desc: 'Execute real SQL queries with GROUP BY, JOINs, subqueries, and window functions directly on in-memory tables.' },
                { title: 'Reproducible Python & Pandas Sandbox', desc: 'Generates executable pandas, numpy, and matplotlib scripts with live in-browser execution.' }
              ].map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-[#F8FAFC]'}`}>{feat.title}</div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-[#A8B3C7]'}`}>{feat.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setCurrentTab('data_engineering')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Pipeline DAG & Tests</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentTab('sql_lab')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-[#121C2F] hover:bg-[#1E2D4A] text-slate-200 border-[#273449]'
                }`}
              >
                <span>SQL Workbench</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Real Enterprise Project Datasets Showcase */}
      <section className="px-2 sm:px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider mb-1 text-emerald-400">
              <Table className="w-4 h-4 text-emerald-400" />
              <span>TESTED ENTERPRISE SCHEMAS</span>
            </div>
            <h2 className={`font-heading text-2xl sm:text-3xl font-bold tracking-tight uppercase ${
              isLight ? 'text-slate-900' : 'text-[#F8FAFC]'
            }`}>
              REAL-WORLD PROJECT BENCHMARKS
            </h2>
            <p className={`text-xs sm:text-sm max-w-xl ${isLight ? 'text-slate-600' : 'text-[#A8B3C7]'}`}>
              Instantly load pre-built domain datasets to test data profiling, star schemas, DAX measures, and dashboards.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('upload')}
            className={`self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                : 'bg-[#172338] hover:bg-[#1E2D4A] text-emerald-300 border-[#273449]'
            }`}
          >
            <span>UPLOAD CUSTOM FILE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEMO_DATASETS.map((ds) => {
            const isActive = project.sourceFileName === ds.fileName;
            return (
              <div
                key={ds.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                  isActive
                    ? isLight
                      ? 'bg-cyan-50/50 border-cyan-500 shadow-sm ring-1 ring-cyan-500/30'
                      : 'bg-[#172338] border-cyan-400 shadow-md shadow-cyan-500/10'
                    : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      : 'bg-[#121C2F] border-[#273449] hover:border-slate-600'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-cyan-400 font-bold">{ds.category}</span>
                    <span className="text-slate-400">{ds.rowsCount} Rows</span>
                  </div>
                  <h3 className={`font-heading text-sm font-bold leading-snug ${isLight ? 'text-slate-900' : 'text-[#F8FAFC]'}`}>
                    {ds.name}
                  </h3>
                  <p className={`text-[11px] leading-relaxed line-clamp-3 ${isLight ? 'text-slate-600' : 'text-[#A8B3C7]'}`}>
                    {ds.description}
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-[#273449]/30 mt-4">
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[110px]">
                    {ds.fileName}
                  </span>
                  <button
                    onClick={() => {
                      loadDemoDataset(ds.id);
                      setCurrentTab('executive_dashboard');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : isLight
                          ? 'bg-slate-900 hover:bg-slate-800 text-white'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    }`}
                  >
                    <span>{isActive ? 'Active' : 'Load Dataset'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Production Exports & Power BI Architecture */}
      <section className={`p-8 sm:p-10 rounded-3xl border transition-colors ${
        isLight 
          ? 'bg-gradient-to-r from-cyan-50/50 via-white to-indigo-50/50 border-slate-200' 
          : 'bg-gradient-to-r from-[#172338] via-[#121C2F] to-[#172338] border-[#273449]'
      }`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              <FolderDown className="w-4 h-4 text-cyan-400" />
              <span>ENTERPRISE DELIVERABLES</span>
            </div>
            <h2 className={`font-heading text-2xl sm:text-4xl font-extrabold uppercase tracking-tight ${
              isLight ? 'text-slate-900' : 'text-[#F8FAFC]'
            }`}>
              COMPLETE PROJECT ZIP (14 FOLDERS)
            </h2>
            <p className={`text-xs sm:text-sm leading-relaxed max-w-2xl ${
              isLight ? 'text-slate-600' : 'text-[#A8B3C7]'
            }`}>
              Generate ready-to-run enterprise deliverables: structured multi-tab Excel workbooks, Microsoft Fabric & Power BI PBIP tabular projects, validated DAX libraries, production SQL queries, and Python data science notebooks.
            </p>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-mono text-slate-400 pt-2">
              <span>· 01_Original_Data</span>
              <span>· 02_Cleaned_Data</span>
              <span>· 03_Excel_Source</span>
              <span>· 04_Data_Model</span>
              <span>· 05_DAX</span>
              <span>· 06_SQL</span>
              <span>· 07_Python</span>
              <span>· 08_PowerBI_PBIP</span>
              <span>· 09_Dashboard</span>
              <span>· 10_Executive_Deck</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 justify-center">
            <button
              onClick={() => setCurrentTab('export_center')}
              className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-base tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <FolderDown className="w-5 h-5" />
              <span>DOWNLOAD PROJECT ZIP</span>
            </button>
            <button
              onClick={() => setCurrentTab('reports')}
              className={`w-full py-3 rounded-xl font-heading font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                isLight ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300' : 'bg-[#0B1120] hover:bg-[#121C2F] text-slate-200 border-[#273449]'
              }`}
            >
              <MonitorPlay className="w-4 h-4 text-cyan-400" />
              <span>BOARDROOM PRESENTATION</span>
            </button>
          </div>
        </div>
      </section>

      {/* 6. Technical Stack & Industry Standards */}
      <section className="px-2 sm:px-4 text-center space-y-4">
        <div className="text-xs font-mono uppercase tracking-widest text-slate-400">
          POWERED BY INDUSTRY-STANDARD ANALYTICS TECHNOLOGIES
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm font-mono font-medium text-slate-400">
          <span className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors">
            <Database className="w-4 h-4 text-cyan-400" />
            ANSI SQL & PostgreSQL
          </span>
          <span className="text-slate-600">/</span>
          <span className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors">
            <Terminal className="w-4 h-4 text-indigo-400" />
            Python & Pandas
          </span>
          <span className="text-slate-600">/</span>
          <span className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Power BI PBIP & DAX
          </span>
          <span className="text-slate-600">/</span>
          <span className="flex items-center gap-1.5 hover:text-purple-400 transition-colors">
            <Layers className="w-4 h-4 text-purple-400" />
            Kimball Star Schema
          </span>
          <span className="text-slate-600">/</span>
          <span className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            Excel tbl* Tables
          </span>
        </div>
      </section>

      {/* 7. Platform Attribution & SEO Footer */}
      <footer className={`pt-10 pb-6 border-t space-y-8 transition-colors ${
        isLight ? 'border-slate-200 text-slate-600' : 'border-[#273449] text-[#A8B3C7]'
      }`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
          <div>
            <div className={`font-heading font-bold text-sm mb-3 ${isLight ? 'text-slate-900' : 'text-[#F8FAFC]'}`}>
              Data Analytics
            </div>
            <ul className="space-y-2">
              <li><button onClick={() => setCurrentTab('upload')} className="hover:text-cyan-400 transition-colors cursor-pointer">Data Upload</button></li>
              <li><button onClick={() => setCurrentTab('preview')} className="hover:text-cyan-400 transition-colors cursor-pointer">Preview & Profile</button></li>
              <li><button onClick={() => setCurrentTab('analysis')} className="hover:text-cyan-400 transition-colors cursor-pointer">Statistical Diagnostics</button></li>
              <li><button onClick={() => setCurrentTab('executive_dashboard')} className="hover:text-cyan-400 transition-colors cursor-pointer">Executive Dashboard</button></li>
            </ul>
          </div>
          <div>
            <div className={`font-heading font-bold text-sm mb-3 ${isLight ? 'text-slate-900' : 'text-[#F8FAFC]'}`}>
              Data Engineering
            </div>
            <ul className="space-y-2">
              <li><button onClick={() => setCurrentTab('data_engineering')} className="hover:text-cyan-400 transition-colors cursor-pointer">Pipeline DAG Lineage</button></li>
              <li><button onClick={() => setCurrentTab('cleaning')} className="hover:text-cyan-400 transition-colors cursor-pointer">ETL & Data Cleaning</button></li>
              <li><button onClick={() => setCurrentTab('quality')} className="hover:text-cyan-400 transition-colors cursor-pointer">Quality Score Auditor</button></li>
              <li><button onClick={() => setCurrentTab('modeling')} className="hover:text-cyan-400 transition-colors cursor-pointer">Star Schema Model (ERD)</button></li>
            </ul>
          </div>
          <div>
            <div className={`font-heading font-bold text-sm mb-3 ${isLight ? 'text-slate-900' : 'text-[#F8FAFC]'}`}>
              Developer Labs
            </div>
            <ul className="space-y-2">
              <li><button onClick={() => setCurrentTab('sql_lab')} className="hover:text-cyan-400 transition-colors cursor-pointer">In-Browser SQL Workbench</button></li>
              <li><button onClick={() => setCurrentTab('python_lab')} className="hover:text-cyan-400 transition-colors cursor-pointer">Python Data Sandbox</button></li>
              <li><button onClick={() => setCurrentTab('dax_lab')} className="hover:text-cyan-400 transition-colors cursor-pointer">Power BI DAX Studio</button></li>
              <li><button onClick={() => setCurrentTab('export_center')} className="hover:text-cyan-400 transition-colors cursor-pointer">14-Folder ZIP Export</button></li>
            </ul>
          </div>
          <div>
            <div className={`font-heading font-bold text-sm mb-3 ${isLight ? 'text-slate-900' : 'text-[#F8FAFC]'}`}>
              Platform & Governance
            </div>
            <ul className="space-y-2">
              <li><button onClick={() => setCurrentTab('how_to_use')} className="hover:text-cyan-400 transition-colors cursor-pointer">How to Use Guide</button></li>
              <li><button onClick={() => setCurrentTab('reports')} className="hover:text-cyan-400 transition-colors cursor-pointer">Boardroom Deck</button></li>
              <li><button onClick={() => setCurrentTab('data_dictionary')} className="hover:text-cyan-400 transition-colors cursor-pointer">Data Dictionary & Lineage</button></li>
              <li><button onClick={() => setCurrentTab('settings')} className="hover:text-cyan-400 transition-colors cursor-pointer">Workspace Settings</button></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#273449]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-[#F8FAFC]'}`}>Data Analytix</span>
            <span>·</span>
            <span>Enterprise Data Analytics & Data Engineering Platform</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span>Engineering Architecture by <strong className="text-cyan-400 font-semibold">Kamran Badar</strong></span>
            <span className="text-slate-500">|</span>
            <a 
              href="https://data-analytix-flax.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>data-analytix-flax.vercel.app</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
