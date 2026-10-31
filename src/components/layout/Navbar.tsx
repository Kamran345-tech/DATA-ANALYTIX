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
    <header className="sticky top-0 z-40 shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between glass-nav transition-colors duration-200">
      {/* Left branding & drawer trigger */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLight 
              ? 'text-slate-600 hover:text-cyan-700 hover:bg-slate-100' 
              : 'text-gray-400 hover:text-cyan-400 hover:bg-white/5'
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

        {/* Project Title & Status Indicator */}
        <div className={`hidden md:flex items-center gap-2 pl-3 border-l ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}>
          <EditableDashboardTitle className="text-xs max-w-[170px] lg:max-w-xs" iconSize="sm" />
          <span className="text-slate-400 font-mono text-xs">/</span>
          <span className={`text-xs font-medium flex items-center gap-1.5 shrink-0 ${
            isLight ? 'text-cyan-800' : 'text-[#22D3EE]'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Enterprise Model
          </span>
          <span className={`text-xs font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            · {project.version}
          </span>
        </div>
      </div>

      {/* Center Search */}
      <div className="hidden lg:flex items-center relative w-64 xl:w-72">
        <Search className={`w-4 h-4 absolute left-3 pointer-events-none z-10 ${
          isLight ? 'text-slate-400' : 'text-gray-400'
        }`} />
        <input
          type="text"
          placeholder="Global filter or search data..."
          value={filters.searchQuery}
          onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
          className="glass-input w-full text-xs pl-9 pr-7 py-1.5 rounded-lg transition-colors focus:outline-none"
        />
        {filters.searchQuery && (
          <button 
            onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
            className={`absolute right-2 text-xs p-0.5 rounded transition-colors z-10 ${
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
          className="flex items-center p-1 rounded-xl glass-card"
          role="group"
          aria-label="Theme mode switcher"
        >
          {/* Light Mode Button */}
          <button
            type="button"
            onClick={() => setThemeMode('light')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isLight
                ? 'glass-btn-primary shadow-xs font-bold text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
            title="Switch to Light Mode"
            aria-pressed={isLight}
          >
            <Sun className={`w-3.5 h-3.5 ${isLight ? 'text-amber-300 fill-amber-300' : 'text-gray-400'}`} />
            <span className="text-[11px] sm:text-xs">Light</span>
          </button>

          {/* Dark Mode Button */}
          <button
            type="button"
            onClick={() => setThemeMode('dark')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              !isLight
                ? 'glass-btn-primary shadow-xs font-bold text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
            title="Switch to Dark Mode"
            aria-pressed={!isLight}
          >
            <Moon className={`w-3.5 h-3.5 ${!isLight ? 'text-cyan-300 fill-cyan-300' : 'text-slate-600'}`} />
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
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'how_to_use'
                ? 'glass-btn-primary'
                : 'glass-btn-secondary'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
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
              className="glass-card flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
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
            className={`p-1.5 sm:p-2 rounded-lg cursor-pointer ${
              isPresentationMode 
                ? 'glass-btn-primary' 
                : 'glass-btn-secondary'
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
            className="glass-btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs cursor-pointer shadow-md"
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
              className="glass-btn-secondary flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer"
            >
              <DownloadCloud className="w-4 h-4 text-cyan-400" />
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
            className="glass-btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          >
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt="Profile" 
                className="w-4 h-4 rounded-full border border-cyan-400"
              />
            ) : (
              <span className={`w-2 h-2 rounded-full ${currentUser ? 'bg-emerald-400' : isGuestMode ? 'bg-amber-400' : 'bg-cyan-400'} shrink-0`} />
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
