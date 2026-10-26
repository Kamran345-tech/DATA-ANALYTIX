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
  Moon,
  HelpCircle
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { Tooltip } from '../common/Tooltip';
import { BrandLogo } from '../common/BrandLogo';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';

export const Navbar: React.FC = () => {
  const { 
    currentTab,
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

  const { currentUser, isGuestMode, setIsAuthModalOpen } = useFirebaseAuth();

  const isLight = themeMode === 'light';

  return (
    <header className={`sticky top-0 z-40 shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between transition-colors duration-200 ${
      isLight 
        ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs' 
        : 'bg-surface-card/95 backdrop-blur-md border-b border-border-subtle'
    }`}>
      {/* Left branding & drawer trigger */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-1.5 rounded-lg transition-colors ${
            isLight 
              ? 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100' 
              : 'text-gray-400 hover:text-emerald-400 hover:bg-surface-panel'
          }`}
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div 
          onClick={() => setCurrentTab('landing')}
          className="cursor-pointer group select-none flex items-center"
          title="Return to Home Overview"
        >
          <BrandLogo size="sm" showSubtitle={false} />
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

        {/* How to Use Platform Guide Button */}
        <Tooltip
          side="bottom"
          title="Platform Guide & Manual"
          tag="Documentation"
          className="w-auto"
          content="Open the complete module directory, end-to-end data lifecycle steps, and enterprise best practices."
        >
          <button
            onClick={() => setCurrentTab('how_to_use')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              currentTab === 'how_to_use'
                ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold shadow-xs' : 'bg-[#21F1A8]/20 text-[#21F1A8] border-[#21F1A8] font-bold'
                : isLight ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-emerald-700 shadow-2xs' : 'bg-[#1a1a1a] border-[#333] text-gray-300 hover:bg-[#222] hover:text-[#21F1A8]'
            }`}
          >
            <HelpCircle className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
            <span className="font-medium">How to Use</span>
          </button>
        </Tooltip>

        {/* Quality Score Indicator */}
        <div className="hidden sm:block">
          <Tooltip
            side="bottom"
            title="Data Quality Audit"
            tag="Governance"
            className="w-auto"
            content="Real-time data health score evaluating Completeness, Uniqueness, Validity, and Consistency across all active dataset rows."
          >
            <button
              onClick={() => setCurrentTab('quality')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors text-xs ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500'
                  : 'bg-[#1f1f1f] border-[#333] hover:border-[#21F1A8]/50'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
              <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Quality:</span>
              <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {qualityReport.overallScore}%
              </span>
            </button>
          </Tooltip>
        </div>

        {/* Presentation Mode Toggle */}
        <Tooltip
          side="bottom"
          title={isPresentationMode ? 'Exit Presentation View' : 'Full-Screen Presentation'}
          tag="C-Suite View"
          className="w-auto"
          content="Expands telemetry dashboards to full viewport, hiding sidebars and headers for clean executive board presentations."
        >
          <button
            onClick={() => setIsPresentationMode(!isPresentationMode)}
            className={`p-1.5 sm:p-2 rounded-lg border transition-colors ${
              isPresentationMode 
                ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-[#21F1A8]/20 text-[#21F1A8] border-[#21F1A8]' 
                : isLight ? 'text-slate-600 border-slate-300 hover:bg-slate-100' : 'text-gray-400 border-[#333] hover:bg-[#222]'
            }`}
            aria-label="Toggle Presentation Mode"
          >
            {isPresentationMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </Tooltip>

        {/* Quick Upload CTA */}
        <Tooltip
          side="bottom"
          title="Data Ingestion"
          tag="Intake"
          className="w-auto"
          content="Upload custom business CSV, Excel (XLSX), or JSON files or switch to enterprise demo datasets."
        >
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
        </Tooltip>

        {/* Export Center CTA */}
        <div className="hidden md:block">
          <Tooltip
            side="bottom"
            title="Production Export Center"
            tag="Handoff"
            className="w-auto"
            content="Download the complete 14-folder enterprise archive including native Power BI PBIP developer files, Excel models, and PDF executive reports."
          >
            <button
              onClick={() => setCurrentTab('export_center')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-300 hover:border-emerald-600 text-slate-700'
                  : 'bg-[#1f1f1f] border-[#333] hover:border-[#21F1A8] text-gray-200'
              }`}
            >
              <DownloadCloud className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
              <span>Export</span>
            </button>
          </Tooltip>
        </div>

        {/* Firebase Cloud Sync & Auth Button */}
        <Tooltip
          side="bottom"
          title={currentUser ? (currentUser.displayName || currentUser.email || 'Cloud Account') : isGuestMode ? 'Guest Demo Session' : 'Firebase Cloud Account'}
          tag={currentUser ? 'Connected' : isGuestMode ? 'Demo Mode' : 'Sign In'}
          className="w-auto"
          content={currentUser ? 'Manage cloud profile, view Firestore sync status, or sign out.' : isGuestMode ? 'You are currently in Guest Demo mode. Click to sign in or create an account to persist dashboards.' : 'Sign in with Google or Email to sync and persist your dashboards to Firebase Firestore.'}
        >
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              currentUser
                ? isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-[#13281e] border-[#21F1A8]/40 text-[#21F1A8] hover:bg-[#1a382a]'
                : isGuestMode
                  ? isLight
                    ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    : 'bg-[#222] border-[#383838] text-gray-300 hover:text-white hover:border-[#21F1A8]/40'
            }`}
          >
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt="Profile" 
                className="w-4 h-4 rounded-full border border-[#21F1A8]"
              />
            ) : (
              <span className={`w-2 h-2 rounded-full ${currentUser ? 'bg-[#21F1A8]' : isGuestMode ? 'bg-amber-400' : 'bg-[#21F1A8]'} shrink-0`} />
            )}
            <span className="max-w-[110px] truncate">
              {currentUser ? (currentUser.displayName?.split(' ')[0] || 'My Account') : isGuestMode ? 'Guest Demo' : 'Sign In'}
            </span>
          </button>
        </Tooltip>
      </div>
    </header>
  );
};
