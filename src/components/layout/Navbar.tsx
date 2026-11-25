import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Search,
  Maximize2,
  Minimize2,
  Menu,
  ShieldCheck,
  DownloadCloud,
  Sun,
  Moon,
  HelpCircle,
  Palette,
  Bell,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { Tooltip } from '../common/Tooltip';
import { BrandLogo } from '../common/BrandLogo';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import {
  FeatureFlags,
  loadFeatureFlags,
  resetFeatureFlags,
  enableDefaultFeatureFlags,
} from '../../config/features';
import { ThemeStudioPanel } from '../common/ThemeStudioPanel';

const TOPBAR_PILL_TABS: Array<{ id: NavigationTab; testId: string; label: string }> = [
  { id: 'executive_dashboard', testId: 'topbar-tab-overview', label: 'Overview' },
  { id: 'quality', testId: 'topbar-tab-quality', label: 'Quality' },
  { id: 'analytics_packs', testId: 'topbar-tab-packs', label: 'Packs' },
  { id: 'reports', testId: 'topbar-tab-reports', label: 'Reports' },
  { id: 'dashboard_builder', testId: 'topbar-tab-builder', label: 'Builder' },
];

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
    setFilters,
  } = usePlatform();

  const { currentUser, isGuestMode, setIsAuthModalOpen } = useFirebaseAuth();
  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());
  const [isThemeStudioOpen, setIsThemeStudioOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncFlags = (e: any) => setFlags(e?.detail || loadFeatureFlags());
    window.addEventListener('dataanalytix:features-updated', syncFlags);
    return () => window.removeEventListener('dataanalytix:features-updated', syncFlags);
  }, []);

  useEffect(() => {
    if (!isThemeStudioOpen && !isNotificationsOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isThemeStudioOpen && themeMenuRef.current && !themeMenuRef.current.contains(target)) {
        setIsThemeStudioOpen(false);
      }
      if (isNotificationsOpen && notifMenuRef.current && !notifMenuRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsThemeStudioOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isThemeStudioOpen, isNotificationsOpen]);

  const isLight = themeMode === 'light';
  const isNewLookActive =
    uiMode === 'modern' ||
    flags.depthUI ||
    flags.heroScene3D ||
    flags.chartGuide ||
    flags.unifiedTheme;

  const handleToggleClassicModern = () => {
    if (isNewLookActive) {
      const classic = resetFeatureFlags();
      setFlags(classic);
      setUiMode('classic');
    } else {
      const modernDefaults = enableDefaultFeatureFlags();
      setFlags(modernDefaults);
    }
  };

  const issueCount = qualityReport.issues?.length || 0;
  const userInitials = currentUser?.displayName
    ? currentUser.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : currentUser?.email
    ? currentUser.email.slice(0, 2).toUpperCase()
    : 'GD';

  return (
    <header className="sticky top-0 z-40 shrink-0 px-1.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1 sm:gap-2 glass-nav transition-colors duration-200 max-w-full overflow-x-clip">
      {/* Left branding & drawer trigger — shrink-0 so the 5 pill tabs always keep their own dedicated space */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          data-testid="mobile-menu-toggle"
          aria-expanded={isSidebarOpen}
          aria-controls="app-sidebar-drawer"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 p-1.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 text-secondary hover:text-accent hover:bg-elevated"
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('landing')}
          className="cursor-pointer group select-none flex items-center shrink-0 min-h-[44px] lg:min-h-0 px-0.5 rounded-lg"
          title="Return to Home Overview"
          aria-label="Return to Home Overview"
        >
          <BrandLogo size="sm" showSubtitle={false} />
        </button>

        {/* App Version Indicator (2xl+ only so pill tabs have dedicated room at 1280px and 1440px) */}
        <div className="hidden 2xl:flex items-center gap-1.5 pl-2 border-l border-subtle shrink-0">
          <span
            data-testid="navbar-app-version"
            className="text-xs font-mono shrink-0 whitespace-nowrap text-muted"
          >
            {project.version}
          </span>
        </div>

        {/* Section 2.1 & Item 3: Horizontal Pill-Tab Navigation with dedicated non-shrinking space */}
        {isNewLookActive && (
          <nav
            data-testid="topbar-pill-nav"
            aria-label="Main view navigation"
            className="hidden lg:flex items-center gap-1 p-1 rounded-2xl bg-input/90 border border-subtle ml-1 shrink-0"
          >
            {TOPBAR_PILL_TABS.map((tab) => {
              if (tab.id === 'analytics_packs' && !flags.analyticsPacks) return null;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={tab.testId}
                  onClick={() => setCurrentTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-2.5 xl:px-3 py-1 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-accent text-on-accent font-bold shadow-xs'
                      : 'text-secondary hover:text-primary hover:bg-elevated font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Center Search: collapses to an icon button below 1400px, full input at >= 1400px */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          data-testid="navbar-search-icon-btn"
          onClick={() =>
            window.dispatchEvent(new CustomEvent('dataanalytix:open-command-palette'))
          }
          title="Search pages & data (Ctrl+K)"
          aria-label="Search pages and data"
          className="hidden md:inline-flex min-[1400px]:hidden items-center justify-center p-2 rounded-xl glass-btn-secondary cursor-pointer shrink-0"
        >
          <Search className="w-4 h-4 text-secondary" />
        </button>

        <div
          data-testid="navbar-search-box"
          className="hidden min-[1400px]:flex items-center relative w-44 2xl:w-52 shrink-0"
        >
          <Search className="w-3.5 h-3.5 absolute left-2.5 pointer-events-none z-10 text-secondary" />
          <input
            type="text"
            placeholder="Search..."
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            className="glass-input w-full text-xs pl-7 pr-11 py-1.5 rounded-xl transition-colors focus:outline-none"
          />
          {filters.searchQuery ? (
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
              className="absolute right-2 text-xs p-0.5 rounded transition-colors z-10 text-muted hover:text-primary"
              aria-label="Clear search"
            >
              ×
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('dataanalytix:open-command-palette'))
              }
              title="Open Command Palette (Ctrl+K)"
              aria-label="Open Command Palette"
              className="absolute right-1.5 px-1.5 py-0.5 rounded bg-card border border-subtle font-mono text-[10px] text-muted hover:text-primary cursor-pointer"
            >
              Ctrl+K
            </button>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-0.5 sm:gap-1 xl:gap-1.5 shrink-0">
        {/* Mobile single-button theme switcher (<640px) with >=44px touch target */}
        <button
          type="button"
          onClick={() => setThemeMode(isLight ? 'dark' : 'light')}
          className="sm:hidden min-w-[44px] min-h-[44px] p-2 rounded-lg glass-btn-secondary flex items-center justify-center cursor-pointer shrink-0"
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {isLight ? (
            <Moon className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <Sun className="w-4 h-4 text-accent shrink-0" />
          )}
        </button>

        {/* Desktop/Tablet Light & Dark Mode segmented switcher (>=640px) */}
        <div
          className="hidden sm:flex items-center p-1 rounded-xl glass-card shrink-0"
          role="group"
          aria-label="Theme mode switcher"
        >
          <button
            type="button"
            onClick={() => setThemeMode('light')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isLight
                ? 'glass-btn-primary shadow-xs font-bold text-on-accent'
                : 'text-secondary hover:text-primary hover:bg-elevated'
            }`}
            title="Switch to Light Mode"
            aria-label="Switch to Light Mode"
            aria-pressed={isLight}
          >
            <Sun className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden 2xl:inline text-[11px] sm:text-xs">Light</span>
          </button>

          <button
            type="button"
            onClick={() => setThemeMode('dark')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              !isLight
                ? 'glass-btn-primary shadow-xs font-bold text-on-accent'
                : 'text-muted hover:text-primary hover:bg-input'
            }`}
            title="Switch to Dark Mode"
            aria-label="Switch to Dark Mode"
            aria-pressed={!isLight}
          >
            <Moon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden 2xl:inline text-[11px] sm:text-xs">Dark</span>
          </button>
        </div>

        {/* Section 1.1: Theme Studio Palette Button & Popover */}
        {flags.unifiedTheme && (
          <div className="relative shrink-0" ref={themeMenuRef}>
            <button
              type="button"
              data-testid="navbar-theme-studio-btn"
              onClick={() => {
                setIsThemeStudioOpen((prev) => !prev);
                setIsNotificationsOpen(false);
              }}
              aria-expanded={isThemeStudioOpen}
              aria-label="Open Theme Studio"
              title="Theme Studio — Customize accent, glass, radius & density"
              className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                isThemeStudioOpen
                  ? 'bg-accent text-on-accent font-bold'
                  : 'glass-btn-secondary'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-current shrink-0" />
              <span className="hidden 2xl:inline">Theme</span>
            </button>

            {isThemeStudioOpen && (
              <div
                data-testid="navbar-theme-studio-popover"
                className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-full sm:mt-2 w-[calc(100vw-1rem)] max-w-[440px] sm:w-[440px] z-50 shadow-2xl rounded-2xl"
              >
                <ThemeStudioPanel
                  compact
                  onClose={() => setIsThemeStudioOpen(false)}
                />
              </div>
            )}
          </div>
        )}

        {/* Section 2.1: Notifications Button & Popover */}
        {isNewLookActive && (
          <div className="relative hidden sm:block shrink-0" ref={notifMenuRef}>
            <button
              type="button"
              data-testid="navbar-notifications-btn"
              onClick={() => {
                setIsNotificationsOpen((prev) => !prev);
                setIsThemeStudioOpen(false);
              }}
              aria-expanded={isNotificationsOpen}
              aria-label="Notifications and Dataset Alerts"
              title="Dataset notifications & quality alerts"
              className="relative p-1.5 rounded-xl glass-btn-secondary cursor-pointer"
            >
              <Bell className="w-4 h-4 text-primary" />
              {issueCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-accent absolute top-1 right-1" />
              )}
            </button>

            {isNotificationsOpen && (
              <div
                data-testid="navbar-notifications-popover"
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-elevated border border-strong shadow-2xl p-3.5 z-50 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Workspace Alerts</span>
                  <span className="text-[11px] font-mono text-accent">
                    Quality {qualityReport.overallScore}%
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      setCurrentTab('quality');
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-card hover:bg-input border border-subtle flex items-start gap-2 cursor-pointer"
                  >
                    {issueCount > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold text-primary">
                        {issueCount > 0
                          ? `${issueCount} data quality finding${issueCount === 1 ? '' : 's'} detected`
                          : 'Dataset passed all quality checks'}
                      </div>
                      <div className="text-[11px] text-secondary">
                        Click to inspect in Data Quality Auditor
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Switch to Classic / Modern Toggle */}
        <button
          type="button"
          data-testid="navbar-switch-classic"
          onClick={handleToggleClassicModern}
          className="hidden sm:flex glass-btn-secondary items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          title={
            isNewLookActive
              ? 'Switch to Classic interface and persist in localStorage'
              : 'Switch to Modern default interface'
          }
          aria-label={isNewLookActive ? 'Switch to Classic' : 'Switch to Modern'}
        >
          <span className="w-2 h-2 rounded-full shrink-0 bg-accent" />
          <span className="hidden 2xl:inline">
            {isNewLookActive ? 'Switch to Classic' : 'Switch to Modern'}
          </span>
          <span className="2xl:hidden">{isNewLookActive ? 'Classic' : 'Modern'}</span>
        </button>

        {/* How to Use Platform Guide Button */}
        <div className="hidden md:block shrink-0">
          <Tooltip
            side="bottom"
            title="Platform Guide & Manual"
            tag="Documentation"
            className="w-auto"
            content="Open the complete module directory, downloadable PDF/PPTX guide, and lifecycle steps."
          >
            <button
              type="button"
              onClick={() => setCurrentTab('how_to_use')}
              aria-label="How to Use"
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'how_to_use'
                  ? 'glass-btn-primary text-on-accent'
                  : 'glass-btn-secondary'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="hidden 2xl:inline font-medium whitespace-nowrap">How to Use</span>
            </button>
          </Tooltip>
        </div>

        {/* Quality Score Indicator (2xl+ since sidebar & alerts badge show health score) */}
        <div className="hidden 2xl:block shrink-0">
          <Tooltip
            side="bottom"
            title="Data Quality Audit"
            tag="Governance"
            className="w-auto"
            content="Real-time data health score evaluating Completeness, Uniqueness, Validity, and Consistency across all active dataset rows."
          >
            <button
              type="button"
              onClick={() => setCurrentTab('quality')}
              className="glass-card flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="font-semibold text-primary">{qualityReport.overallScore}%</span>
            </button>
          </Tooltip>
        </div>

        {/* Presentation Mode Toggle (2xl+ since Dashboard has primary Present button) */}
        <div className="hidden 2xl:block shrink-0">
          <Tooltip
            side="bottom"
            title={isPresentationMode ? 'Exit Presentation View' : 'Full-Screen Presentation'}
            tag="C-Suite View"
            className="w-auto"
            content="Expands telemetry dashboards to full viewport, hiding sidebars and headers for clean executive board presentations."
          >
            <button
              type="button"
              onClick={() => setIsPresentationMode(!isPresentationMode)}
              className={`p-1.5 rounded-lg cursor-pointer shrink-0 ${
                isPresentationMode ? 'glass-btn-primary text-on-accent' : 'glass-btn-secondary'
              }`}
              aria-label="Toggle Presentation Mode"
            >
              {isPresentationMode ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
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
            type="button"
            onClick={() => setCurrentTab('upload')}
            className="glass-btn-primary min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg font-semibold text-xs cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            aria-label="Upload Data"
          >
            <UploadCloud className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline whitespace-nowrap">Upload Data</span>
          </button>
        </Tooltip>

        {/* Export Center CTA */}
        <div className="hidden 2xl:block shrink-0">
          <Tooltip
            side="bottom"
            title="Production Export Center"
            tag="Handoff"
            className="w-auto"
            content="Download the complete 14-folder enterprise archive including native Power BI PBIP developer files, Excel models, and PDF executive reports."
          >
            <button
              type="button"
              onClick={() => setCurrentTab('export_center')}
              className="glass-btn-secondary flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer whitespace-nowrap shrink-0"
              aria-label="Export"
            >
              <DownloadCloud className="w-4 h-4 text-accent shrink-0" />
              <span className="hidden 2xl:inline whitespace-nowrap">Export</span>
            </button>
          </Tooltip>
        </div>

        {/* Firebase Cloud Sync & User Avatar Button */}
        <Tooltip
          side="bottom"
          title={
            currentUser
              ? currentUser.displayName || currentUser.email || 'Cloud Account'
              : isGuestMode
              ? 'Guest Demo Session'
              : 'Firebase Cloud Account'
          }
          tag={currentUser ? 'Connected' : isGuestMode ? 'Demo Mode' : 'Sign In'}
          className="w-auto"
          content={
            currentUser
              ? 'Manage cloud profile, view Firestore sync status, or sign out.'
              : isGuestMode
              ? 'You are currently in Guest Demo mode. Click to sign in or create an account to persist dashboards.'
              : 'Sign in with Google or Email to sync and persist your dashboards to Firebase Firestore.'
          }
        >
          <button
            type="button"
            data-testid="navbar-user-avatar-btn"
            onClick={() => setIsAuthModalOpen(true)}
            className="glass-btn-secondary min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center gap-1.5 px-2 py-1 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            aria-label={
              currentUser
                ? currentUser.displayName?.split(' ')[0] || 'My Account'
                : isGuestMode
                ? 'Guest Demo'
                : 'Sign In'
            }
          >
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Profile"
                className="w-5 h-5 rounded-full border border-subtle shrink-0"
              />
            ) : (
              <span className="w-5 h-5 rounded-full bg-accent text-on-accent text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                {userInitials}
              </span>
            )}
            <span className="hidden xl:inline max-w-[76px] truncate whitespace-nowrap">
              {currentUser
                ? currentUser.displayName?.split(' ')[0] || 'My Account'
                : isGuestMode
                ? 'Guest Demo'
                : 'Sign In'}
            </span>
          </button>
        </Tooltip>
      </div>
    </header>
  );
};
