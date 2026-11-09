import React from 'react';
import { BRAND, getBrandText, loadFeatureFlags } from '../../config/features';
import { Hero3DScene } from '../modern/Hero3DScene';

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
      <header className="border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full gap-8">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-sm">
            DA
          </div>
          <span className="font-heading font-bold text-lg tracking-tight text-white whitespace-nowrap">{brandName}</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button onClick={onExploreSample} className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer">
            Sample Datasets
          </button>
          <button onClick={onExploreSample} className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer">
            SQL &amp; Python Labs
          </button>
          <button onClick={onExploreSample} className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer">
            Power BI Export
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenLogin}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold tracking-wider">
              <span>AUTONOMOUS BI</span>
              <span aria-hidden="true">·</span>
              <span>STAR SCHEMA</span>
              <span aria-hidden="true">·</span>
              <span>PBIP NATIVE</span>
            </div>

            <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.08]">
              Raw data in. Clear decisions out.
            </h1>

            <p className="text-base md:text-lg text-slate-300 max-w-xl leading-relaxed">
              From automated data hygiene and Star Schema modeling to live in-browser SQL, Python execution, and native Power BI PBIP exports.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onExploreSample}
                className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
              >
                Try with sample data
              </button>
              <button
                onClick={onOpenLogin}
                className="px-6 py-3 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-all cursor-pointer"
              >
                Sign in to Workspace
              </button>
            </div>
          </div>

          {/* Right Pure-CSS 3D Isometric Hero Scene */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <Hero3DScene />
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="depth-card p-6 rounded-[20px] bg-slate-900/60 border border-[rgba(148,163,184,0.18)]">
            <h3 className="font-heading text-base font-bold text-white mb-2">01. Automated Data Hygiene</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects outliers, trailing whitespaces, currency formatting, and duplicate rows with 1-click deterministic correction.
            </p>
          </div>

          <div className="depth-card p-6 rounded-[20px] bg-slate-900/60 border border-[rgba(148,163,184,0.18)]">
            <h3 className="font-heading text-base font-bold text-white mb-2">02. Star Schema &amp; DAX Studio</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decomposes flat tables into normalized Fact &amp; Dimension tables with interactive ERDs and 20+ Time Intelligence DAX measures.
            </p>
          </div>

          <div className="depth-card p-6 rounded-[20px] bg-slate-900/60 border border-[rgba(148,163,184,0.18)]">
            <h3 className="font-heading text-base font-bold text-white mb-2">03. Grounded AI Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict numerical anti-hallucination guard rails verify that every AI citation references audited telemetry metrics.
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
