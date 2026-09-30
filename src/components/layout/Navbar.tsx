import React from 'react';
import { 
  BarChart3, 
  UploadCloud, 
  Search, 
  Maximize2, 
  Minimize2, 
  Menu, 
  ShieldCheck, 
  DownloadCloud, 
  Sun,
  Moon
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';

export const Navbar: React.FC = () => {
  const { 
    project, 
    qualityReport, 
    setCurrentTab, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    isPresentationMode, 
    setIsPresentationMode,
    themeMode,
    setThemeMode,
    filters,
    setFilters
  } = usePlatform();

  const isLight = themeMode === 'light';

  return (
    <header className={`sticky top-0 z-40 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between transition-colors duration-200 ${
      isLight 
        ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs' 
        : 'bg-[#171717]/95 backdrop-blur-md border-b border-[#2d2d2d]'
    }`}>
      {/* Left branding & drawer trigger */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-1.5 rounded-lg transition-colors ${
            isLight 
              ? 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100' 
              : 'text-gray-400 hover:text-[#21F1A8] hover:bg-[#222]'
          }`}
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div 
          onClick={() => setCurrentTab('executive_dashboard')}
          className="flex items-center gap-2 cursor-pointer group select-none"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
            isLight
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 group-hover:bg-emerald-100 shadow-xs'
              : 'bg-[#21F1A8]/10 border border-[#21F1A8]/40 text-[#21F1A8] group-hover:glow-neon'
          }`}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className={`font-heading text-lg font-bold tracking-wider flex items-center gap-1 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              NEXUS<span className={isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}>BI</span>
            </span>
          </div>
        </div>

        {/* Project Title & Active Badge */}
        <div className={`hidden md:flex items-center gap-2 pl-3 border-l ${
          isLight ? 'border-slate-200' : 'border-[#2e2e2e]'
        }`}>
          <EditableDashboardTitle className="text-xs max-w-[170px] lg:max-w-xs" iconSize="sm" />
          <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full flex items-center gap-1.5 shrink-0 ${
            isLight 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs' 
              : 'bg-[#21F1A8]/15 text-[#21F1A8] border border-[#21F1A8]/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-emerald-600' : 'bg-[#21F1A8]'}`} />
            Enterprise Model
          </span>
          <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
            {project.version}
          </span>
        </div>
      </div>

      {/* Center Search */}
      <div className="hidden lg:flex items-center relative w-64 xl:w-72">
        <Search className={`w-4 h-4 absolute left-3 pointer-events-none ${
          isLight ? 'text-slate-400' : 'text-gray-400'
        }`} />
        <input
          type="text"
          placeholder="Global filter or search data..."
          value={filters.searchQuery}
          onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
          className={`w-full text-xs pl-9 pr-7 py-1.5 rounded-lg border transition-colors focus:outline-none ${
            isLight
              ? 'bg-slate-50 text-slate-900 border-slate-300 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
              : 'bg-[#1f1f1f] text-gray-200 border-[#333] placeholder:text-gray-500 focus:border-[#21F1A8]'
          }`}
        />
        {filters.searchQuery && (
          <button 
            onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
            className={`absolute right-2 text-xs p-0.5 rounded transition-colors ${
              isLight ? 'text-slate-400 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            ×
          </button>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* ================================================================= */}
        {/* PROMINENT DARK & LIGHT MODE OPTION AT THE TOP                    */}
        {/* ================================================================= */}
        <div 
          className={`flex items-center p-1 rounded-xl transition-all shadow-xs ${
            isLight 
              ? 'bg-slate-100 border border-slate-300' 
              : 'bg-[#141414] border border-[#333]'
          }`}
          role="group"
          aria-label="Theme mode switcher"
        >
          {/* Light Mode Button */}
          <button
            type="button"
            onClick={() => setThemeMode('light')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              isLight
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#222]'
            }`}
            title="Switch to Light Mode"
            aria-pressed={isLight}
          >
            <Sun className={`w-3.5 h-3.5 ${isLight ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
            <span className="text-[11px] sm:text-xs">Light</span>
          </button>

          {/* Dark Mode Button */}
          <button
            type="button"
            onClick={() => setThemeMode('dark')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              !isLight
                ? 'bg-[#252525] text-[#21F1A8] shadow-sm border border-[#21F1A8]/40 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
            title="Switch to Dark Mode"
            aria-pressed={!isLight}
          >
            <Moon className={`w-3.5 h-3.5 ${!isLight ? 'text-[#21F1A8] fill-[#21F1A8]' : 'text-slate-600'}`} />
            <span className="text-[11px] sm:text-xs">Dark</span>
          </button>
        </div>

        {/* Quality Score Indicator */}
        <button
          onClick={() => setCurrentTab('quality')}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors text-xs ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500'
              : 'bg-[#1f1f1f] border-[#333] hover:border-[#21F1A8]/50'
          }`}
          title="Data Quality Audit"
        >
          <ShieldCheck className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
          <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Quality:</span>
          <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {qualityReport.overallScore}%
          </span>
        </button>

        {/* Presentation Mode Toggle */}
        <button
          onClick={() => setIsPresentationMode(!isPresentationMode)}
          className={`p-1.5 sm:p-2 rounded-lg border transition-colors ${
            isPresentationMode 
              ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-[#21F1A8]/20 text-[#21F1A8] border-[#21F1A8]' 
              : isLight ? 'text-slate-600 border-slate-300 hover:bg-slate-100' : 'text-gray-400 border-[#333] hover:bg-[#222]'
          }`}
          title={isPresentationMode ? 'Exit Presentation Mode' : 'Enter Presentation Mode'}
        >
          {isPresentationMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Quick Upload CTA */}
        <button
          onClick={() => setCurrentTab('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-xs ${
            isLight
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              : 'bg-[#21F1A8] hover:bg-[#1cdb97] text-black hover:glow-neon'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Data</span>
        </button>

        {/* Export Center CTA */}
        <button
          onClick={() => setCurrentTab('export_center')}
          className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
            isLight
              ? 'bg-slate-50 border-slate-300 hover:border-emerald-600 text-slate-700'
              : 'bg-[#1f1f1f] border-[#333] hover:border-[#21F1A8] text-gray-200'
          }`}
          title="Export Packages & Power BI ZIP"
        >
          <DownloadCloud className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
