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
    uiMode,
    setUiMode,
    filters,
    setFilters
  } = usePlatform();

  const { currentUser, isGuestMode, setIsAuthModalOpen } = useFirebaseAuth();

  const isLight = themeMode === 'light';

  return (
    <header className="sticky top-0 z-40 shrink-0 px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2 glass-nav transition-colors duration-200 max-w-full overflow-x-clip">
      {/* Left branding & drawer trigger */}
      <div className="flex items-center gap-2 min-w-0 shrink">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            isLight 
              ? 'text-muted hover:text-cyan-700 hover:bg-elevated' 
              : 'text-secondary hover:text-cyan-400 hover:bg-white/5'
          }`}
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div 
          onClick={() => setCurrentTab('landing')}
          className="cursor-pointer group select-none flex items-center shrink-0"
          title="Return to Home Overview"
        >
          <BrandLogo size="sm" showSubtitle={false} />
        </div>

        {/* Project Title & Status Indicator */}
        <div className={`hidden lg:flex items-center gap-1.5 pl-2.5 border-l min-w-0 shrink ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}>
          <EditableDashboardTitle
            className="text-xs max-w-[120px] xl:max-w-[160px] 2xl:max-w-[230px]"
            iconSize="sm"
            showEditButton={false}
            singleLine={true}
          />
          <span className="hidden 2xl:inline text-secondary font-mono text-xs shrink-0">/</span>
          <span className={`hidden 2xl:flex text-xs font-medium items-center gap-1.5 shrink-0 whitespace-nowrap ${
            isLight ? 'text-cyan-800' : 'text-primary'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Enterprise Model
          </span>
          <span className={`text-xs font-mono shrink-0 whitespace-nowrap ${isLight ? 'text-secondary' : 'text-muted'}`}>
            · {project.version}
          </span>
        </div>
      </div>

      {/* Center Search */}
      <div className="hidden lg:flex items-center relative w-36 xl:w-48 2xl:w-64 shrink-0">
        <Search className={`w-4 h-4 absolute left-3 pointer-events-none z-10 ${
          isLight ? 'text-secondary' : 'text-secondary'
        }`} />
        <input
          type="text"
          placeholder="Search data..."
          value={filters.searchQuery}
          onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
          className="glass-input w-full text-xs pl-9 pr-7 py-1.5 rounded-lg transition-colors focus:outline-none"
        />
        {filters.searchQuery && (
          <button 
            onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
            className={`absolute right-2 text-xs p-0.5 rounded transition-colors z-10 ${
              isLight ? 'text-secondary hover:text-muted' : 'text-muted hover:text-secondary'
            }`}
          >
            ×
          </button>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 xl:gap-1.5 shrink-0">
        {/* ================================================================= */}
        {/* PROMINENT DARK & LIGHT MODE OPTION AT THE TOP                    */}
        {/* ================================================================= */}
        <div 
          className="flex items-center p-1 rounded-xl glass-card shrink-0"
          role="group"
          aria-label="Theme mode switcher"
        >
          {/* Light Mode Button */}
          <button
            type="button"
            onClick={() => setThemeMode('light')}
            className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isLight
                ? 'glass-btn-primary shadow-xs font-bold text-on-accent'
                : 'text-secondary hover:text-primary hover:bg-white/5'
            }`}
            title="Switch to Light Mode"
            aria-label="Switch to Light Mode"
            aria-pressed={isLight}
          >
            <Sun className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-amber-300 fill-amber-300' : 'text-secondary'}`} />
            <span className="hidden 2xl:inline text-[11px] sm:text-xs">Light</span>
          </button>

          {/* Dark Mode Button */}
          <button
            type="button"
            onClick={() => setThemeMode('dark')}
            className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              !isLight
                ? 'glass-btn-primary shadow-xs font-bold text-on-accent'
                : 'text-muted hover:text-primary hover:bg-input'
            }`}
            title="Switch to Dark Mode"
            aria-label="Switch to Dark Mode"
            aria-pressed={!isLight}
          >
            <Moon className={`w-3.5 h-3.5 shrink-0 ${!isLight ? 'text-on-accent' : 'text-muted'}`} />
            <span className="hidden 2xl:inline text-[11px] sm:text-xs">Dark</span>
          </button>
        </div>

        {/* Small Classic / Modern Switcher Toggle */}
        <button
          type="button"
          onClick={() => setUiMode(uiMode === 'modern' ? 'modern' : 'modern')}
          onClickCapture={(e) => {
            e.stopPropagation();
            setUiMode(uiMode === 'modern' ? 'classic' : 'modern');
          }}
          className="hidden sm:flex glass-btn-secondary items-center gap-1.5 px-2 xl:px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          title={`Switch interface to ${uiMode === 'modern' ? 'Classic' : 'Modern'} mode`}
          aria-label="Toggle Classic or Modern interface mode"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${uiMode === 'modern' ? 'bg-sky-400' : 'bg-emerald-400'}`} />
          <span className="hidden xl:inline">{uiMode === 'modern' ? 'Modern' : 'Classic'}</span>
        </button>

        {/* How to Use Platform Guide Button */}
        <div className="hidden md:block shrink-0">
          <Tooltip
            side="bottom"
            title="Platform Guide & Manual"
            tag="Documentation"
            className="w-auto"
            content="Open the complete module directory, end-to-end data lifecycle steps, and enterprise best practices."
          >
            <button
              onClick={() => setCurrentTab('how_to_use')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'how_to_use'
                  ? 'glass-btn-primary text-on-accent'
                  : 'glass-btn-secondary'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="font-medium whitespace-nowrap">How to Use</span>
            </button>
          </Tooltip>
        </div>

        {/* Quality Score Indicator */}
        <div className="hidden lg:block shrink-0">
          <Tooltip
            side="bottom"
            title="Data Quality Audit"
            tag="Governance"
            className="w-auto"
            content="Real-time data health score evaluating Completeness, Uniqueness, Validity, and Consistency across all active dataset rows."
          >
            <button
              onClick={() => setCurrentTab('quality')}
              className="glass-card flex items-center gap-1.5 px-2 xl:px-2.5 py-1 rounded-lg text-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className={`hidden 2xl:inline ${isLight ? 'text-muted' : 'text-secondary'}`}>Quality:</span>
              <span className="font-semibold text-primary">
                {qualityReport.overallScore}%
              </span>
            </button>
          </Tooltip>
        </div>

        {/* Presentation Mode Toggle */}
        <div className="hidden sm:block shrink-0">
          <Tooltip
            side="bottom"
            title={isPresentationMode ? 'Exit Presentation View' : 'Full-Screen Presentation'}
            tag="C-Suite View"
            className="w-auto"
            content="Expands telemetry dashboards to full viewport, hiding sidebars and headers for clean executive board presentations."
          >
            <button
              onClick={() => setIsPresentationMode(!isPresentationMode)}
              className={`p-1.5 rounded-lg cursor-pointer shrink-0 ${
                isPresentationMode 
                  ? 'glass-btn-primary text-on-accent' 
                  : 'glass-btn-secondary'
              }`}
              aria-label="Toggle Presentation Mode"
            >
              {isPresentationMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </Tooltip>
        </div>

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
            className="glass-btn-primary flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg font-semibold text-xs cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            aria-label="Upload Data"
          >
            <UploadCloud className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline whitespace-nowrap">Upload Data</span>
          </button>
        </Tooltip>

        {/* Export Center CTA */}
        <div className="hidden md:block shrink-0">
          <Tooltip
            side="bottom"
            title="Production Export Center"
            tag="Handoff"
            className="w-auto"
            content="Download the complete 14-folder enterprise archive including native Power BI PBIP developer files, Excel models, and PDF executive reports."
          >
            <button
              onClick={() => setCurrentTab('export_center')}
              className="glass-btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer whitespace-nowrap shrink-0"
              aria-label="Export"
            >
              <DownloadCloud className="w-4 h-4 text-accent shrink-0" />
              <span className="hidden xl:inline whitespace-nowrap">Export</span>
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
            className="glass-btn-secondary flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            aria-label={currentUser ? (currentUser.displayName?.split(' ')[0] || 'My Account') : isGuestMode ? 'Guest Demo' : 'Sign In'}
          >
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt="Profile" 
                className="w-4 h-4 rounded-full border border-cyan-400 shrink-0"
              />
            ) : (
              <span className={`w-2 h-2 rounded-full ${currentUser ? 'bg-emerald-400' : isGuestMode ? 'bg-amber-400' : 'bg-cyan-400'} shrink-0`} />
            )}
            <span className="hidden sm:inline max-w-[96px] truncate whitespace-nowrap">
              {currentUser ? (currentUser.displayName?.split(' ')[0] || 'My Account') : isGuestMode ? 'Guest Demo' : 'Sign In'}
            </span>
          </button>
        </Tooltip>
      </div>
    </header>
  );
};
