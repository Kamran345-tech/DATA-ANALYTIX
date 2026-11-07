import React from 'react';
import { BRAND, getBrandText, loadFeatureFlags } from '../../config/features';

export interface PublicLandingViewProps {
  onExploreSample: () => void;
  onOpenLogin: () => void;
}

export const PublicLandingView: React.FC<PublicLandingViewProps> = ({
  onExploreSample,
  onOpenLogin
}) => {
  const flags = loadFeatureFlags();
  const brandName = getBrandText('primary', flags);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center font-bold text-white shadow-md">
            DA
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white">{brandName}</span>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30">
              Enterprise BI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onExploreSample}
            className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Sample Datasets
          </button>
          <button
            onClick={onOpenLogin}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            Sign In / Workspace
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-medium mx-auto mb-6">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          Next-Gen Autonomous Business Intelligence & Modeling
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Turn Raw Spreadsheets into <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Board-Ready Analytics</span>
        </h1>

        <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          From zero-code automated data hygiene, Star Schema modeling, live SQL/Python execution, to instant Power BI PBIP exports and grounded AI insights.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onExploreSample}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/40 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">play_circle</span>
            Launch Instant Demo Workspace
          </button>
          <button
            onClick={onOpenLogin}
            className="px-6 py-3 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-all"
          >
            Access Private Enterprise Tenant
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">auto_fix_high</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">Automated Data Hygiene</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects outliers, trailing whitespaces, currency formatting, and duplicate rows with 1-click deterministic correction.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">account_tree</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">Star Schema & DAX Studio</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decomposes flat tables into normalized Fact & Dimension tables with interactive ERDs and 20+ Time Intelligence DAX measures.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">verified</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">Grounded AI Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict numerical anti-hallucination guard rails verify that every AI citation cites audited telemetry metrics.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {brandName}. Engineered by {BRAND.author}. All rights reserved.</p>
      </footer>
    </div>
  );
};
