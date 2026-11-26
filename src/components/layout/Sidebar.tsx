import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Star,
  Clock,
  X,
  UploadCloud,
  ShieldCheck,
  DownloadCloud,
  Presentation,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';
import { Tooltip } from '../common/Tooltip';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import { loadFeatureFlags, FeatureFlags, getBrandText } from '../../config/features';
import {
  WORKFLOW_SIDEBAR_GROUPS,
  ALL_WORKFLOW_NAV_ITEMS,
  DEFAULT_PINNED_TABS,
  MAX_PINNED_TABS,
  useSidebarNavState,
} from '../../config/navigationConfig';
import { useToast } from '../../store/useToast';

export const Sidebar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    isSidebarOpen,
    setIsSidebarOpen,
    isPresentationMode,
    setIsPresentationMode,
    project,
    cleanRows,
    qualityReport,
  } = usePlatform();
  const { currentUser, isGuestMode, setIsAuthModalOpen } = useFirebaseAuth();
  const { addToast } = useToast();
  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesLimitNotice, setFavoritesLimitNotice] = useState(false);
  const asideRef = React.useRef<HTMLElement | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const {
    pinnedTabs,
    togglePinTab,
    clearFavorites,
    isTabPinned,
    recentTabs,
    collapsedGroups,
    toggleGroup,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
  } = useSidebarNavState(currentTab);

  React.useEffect(() => {
    const handleFlags = (e: any) => setFlags(e.detail || loadFeatureFlags());
    window.addEventListener('dataanalytix:features-updated', handleFlags);
    return () => {
      window.removeEventListener('dataanalytix:features-updated', handleFlags);
    };
  }, []);

  // Listen for stepper click to scroll/focus a workflow group in the sidebar
  React.useEffect(() => {
    const handleFocusGroup = (e: Event) => {
      const groupId = (e as CustomEvent)?.detail?.groupId;
      if (!groupId || !asideRef.current) return;
      requestAnimationFrame(() => {
        const el = asideRef.current?.querySelector<HTMLElement>(
          `[data-testid="sidebar-group-toggle-${groupId}"]`
        );
        if (el) {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      });
    };
    window.addEventListener('dataanalytix:focus-sidebar-group', handleFocusGroup);
    return () => {
      window.removeEventListener('dataanalytix:focus-sidebar-group', handleFocusGroup);
    };
  }, []);

  const restoreMobileMenuFocus = React.useCallback(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
    requestAnimationFrame(() => {
      const toggleBtn = document.querySelector<HTMLElement>(
        '[data-testid="mobile-menu-toggle"]'
      );
      if (toggleBtn) {
        toggleBtn.focus();
      } else if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    });
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
    if (!isSidebarOpen || isPresentationMode) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      if (!asideRef.current) return;
      const focusables = Array.from(
        asideRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        asideRef.current.focus();
      }
    };
    const rafId = requestAnimationFrame(focusFirst);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (window.innerWidth >= 1024) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsSidebarOpen(false);
        restoreMobileMenuFocus();
        return;
      }
      if (e.key === 'Tab' && asideRef.current) {
        const focusables = Array.from(
          asideRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !asideRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !asideRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen, isPresentationMode, setIsSidebarOpen, restoreMobileMenuFocus]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    return WORKFLOW_SIDEBAR_GROUPS.map((group) => {
      const items = group.items.filter((item) => {
        if (item.id === 'analytics_packs' && !flags.analyticsPacks) return false;
        if (!normalizedQuery) return true;
        return (
          item.label.toLowerCase().includes(normalizedQuery) ||
          item.purpose.toLowerCase().includes(normalizedQuery) ||
          item.keywords.some((k) => k.toLowerCase().includes(normalizedQuery))
        );
      });
      return { ...group, items };
    }).filter((g) => g.items.length > 0);
  }, [flags.analyticsPacks, normalizedQuery]);

  const firstSearchMatch = useMemo(() => {
    if (!normalizedQuery) return null;
    const allMatches = filteredGroups.flatMap((g) => g.items);
    return (
      allMatches.find((item) => item.label.toLowerCase().includes(normalizedQuery)) ||
      allMatches[0] ||
      null
    );
  }, [filteredGroups, normalizedQuery]);

  if (isPresentationMode || !isSidebarOpen) {
    return null;
  }

  const isGlassActive = Boolean(flags.unifiedTheme || flags.depthUI);
  const brandName = getBrandText('primary', flags);
  const datasetTitle = project.sourceFileName || project.name || 'Enterprise Dataset';
  const rowCount = cleanRows?.length || project?.rowCount || 0;
  const qualityScore = qualityReport?.overallScore ?? 100;
  const issueCount = qualityReport?.issues?.length ?? 0;

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

  const handleCloseDrawer = () => {
    setIsSidebarOpen(false);
    restoreMobileMenuFocus();
  };

  const handleSelectTab = (id: NavigationTab) => {
    setCurrentTab(id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
      restoreMobileMenuFocus();
    }
  };

  const handleToggleFavorite = (tabId: NavigationTab) => {
    const res = togglePinTab(tabId);
    if (res.limitReached) {
      setFavoritesLimitNotice(true);
      addToast({
        title: 'Favorites Limit Reached',
        message: 'Favorites are full. Remove one to add another.',
        type: 'warning',
      });
    } else {
      setFavoritesLimitNotice(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && firstSearchMatch) {
      e.preventDefault();
      handleSelectTab(firstSearchMatch.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchQuery('');
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  // Section 3.7: Arrow key navigation inside groups
  const handleGroupItemsKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const container = e.currentTarget;
    const items = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[data-testid^="sidebar-nav-item-"]')
    );
    if (items.length === 0) return;
    const currentIndex = items.findIndex((el) => el === document.activeElement);
    if (currentIndex === -1) return;
    e.preventDefault();
    const nextIndex =
      e.key === 'ArrowDown'
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  // SVG Ring calculation for Dataset Health Card
  const ringRadius = 15;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashoffset =
    ringCircumference - (Math.min(100, Math.max(0, qualityScore)) / 100) * ringCircumference;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        data-testid="sidebar-backdrop"
        onClick={handleCloseDrawer}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        aria-hidden="true"
      />

      <aside
        id="app-sidebar-drawer"
        ref={asideRef}
        tabIndex={-1}
        aria-label="Sidebar Navigation"
        data-collapsed={isSidebarCollapsed ? 'true' : 'false'}
        className={`fixed inset-y-0 lg:static top-0 lg:top-auto left-0 z-50 lg:z-30 flex flex-row select-none shrink-0 text-primary transition-all duration-200 ${
          isGlassActive
            ? 'lg:my-3 lg:ml-3 lg:rounded-[28px] bg-sidebar/95 backdrop-blur-xl border border-subtle shadow-2xl overflow-hidden lg:h-[calc(100%-24px)] h-full'
            : 'bg-sidebar border-r border-subtle shadow-lg h-full max-h-full overflow-hidden'
        } ${
          isSidebarCollapsed
            ? 'w-72 max-w-[85vw] lg:w-14'
            : 'w-72 max-w-[85vw] lg:w-[292px]'
        }`}
      >
        {/* =================================================================== */}
        {/* SECTION 3.5: SLIM ICON RAIL (Attached quick actions + collapsed UI) */}
        {/* =================================================================== */}
        <div
          data-testid="sidebar-slim-rail"
          className="hidden lg:flex flex-col items-center justify-between py-3 px-1 w-14 shrink-0 border-r border-subtle bg-elevated/60"
        >
          <div className="flex flex-col items-center gap-2">
            {/* Collapse / Expand Rail Button */}
            <button
              type="button"
              data-testid="sidebar-collapse-toggle"
              onClick={() => toggleSidebarCollapsed()}
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Slim Rail'}
              aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-expanded={!isSidebarCollapsed}
              className="w-11 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-secondary hover:text-primary hover:bg-card border border-transparent hover:border-subtle transition-colors cursor-pointer"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-accent" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
              <span className="text-[9px] font-medium leading-none">
                {isSidebarCollapsed ? 'Menu' : 'Hide'}
              </span>
            </button>

            <div className="w-6 h-px bg-subtle my-0.5" />

            {/* Quick Action 1: Upload */}
            <button
              type="button"
              data-testid="sidebar-rail-upload"
              onClick={() => handleSelectTab('upload')}
              title="Quick Action: Upload Data"
              aria-label="Upload Data"
              className={`w-11 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                currentTab === 'upload'
                  ? 'bg-accent text-on-accent font-bold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-card'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span className="text-[9px] font-medium leading-none">Upload</span>
            </button>

            {/* Quick Action 2: Re-run Quality */}
            <button
              type="button"
              data-testid="sidebar-rail-quality"
              onClick={() => handleSelectTab('quality')}
              title={`Quick Action: Re-run quality (${qualityScore}%)`}
              aria-label="Re-run quality"
              className={`w-11 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                currentTab === 'quality'
                  ? 'bg-accent text-on-accent font-bold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-card'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[9px] font-medium leading-none">Quality</span>
            </button>

            {/* Quick Action 3: Download */}
            <button
              type="button"
              data-testid="sidebar-rail-download"
              onClick={() => handleSelectTab('export_center')}
              title="Quick Action: Download & Export Center"
              aria-label="Download"
              className={`w-11 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                currentTab === 'export_center'
                  ? 'bg-accent text-on-accent font-bold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-card'
              }`}
            >
              <DownloadCloud className="w-4 h-4" />
              <span className="text-[9px] font-medium leading-none">Export</span>
            </button>

            {/* Quick Action 4: Present */}
            <button
              type="button"
              data-testid="sidebar-rail-present"
              onClick={() => setIsPresentationMode(true)}
              title="Quick Action: Present Fullscreen Deck"
              aria-label="Present"
              className="w-11 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-secondary hover:text-primary hover:bg-card transition-all cursor-pointer"
            >
              <Presentation className="w-4 h-4" />
              <span className="text-[9px] font-medium leading-none">Present</span>
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectTab('settings')}
              title="Settings & Theme Studio"
              aria-label="Settings"
              className={`w-11 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-accent text-on-accent font-bold'
                  : 'text-muted hover:text-primary hover:bg-card'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-[9px] font-medium leading-none">Theme</span>
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MAIN EXPANDED GLASS PANEL                                           */}
        {/* =================================================================== */}
        <div
          className={`flex-1 flex flex-col h-full max-h-full min-w-0 overflow-hidden ${
            isSidebarCollapsed ? 'flex lg:hidden' : 'flex'
          }`}
        >
          {/* Section 3.2: Sidebar Header (Logo, Dataset Name, Mobile Close) */}
          <div className="p-3 border-b border-subtle flex items-center justify-between gap-2 bg-elevated/40 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-accent flex items-center justify-center text-on-accent font-bold text-xs shadow-xs shrink-0">
                DA
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-primary tracking-tight leading-none truncate">
                  {brandName}
                </div>
                <div
                  data-testid="sidebar-dataset-name"
                  title={datasetTitle}
                  className="text-[11px] text-accent font-mono mt-0.5 truncate max-w-[160px]"
                >
                  {datasetTitle}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseDrawer}
              aria-label="Close Navigation Drawer"
              className="lg:hidden min-w-[44px] min-h-[44px] p-2 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-input"
            >
              ✕
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* 1. Sidebar Search Input (hidden under premiumUX so there is ONE global Ctrl+K search) */}
            {!flags.premiumUX && (
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-accent absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  data-testid="sidebar-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search pages"
                  aria-label="Search sidebar pages"
                  className="w-full min-h-[44px] lg:min-h-[36px] pl-8 pr-14 py-1.5 rounded-2xl bg-input border border-subtle text-xs text-primary placeholder:text-muted focus:outline-2 focus:outline-accent"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    data-testid="sidebar-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear sidebar search"
                    className="absolute right-2 p-1 rounded text-muted hover:text-primary cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('dataanalytix:open-command-palette'))
                    }
                    title="Open Quick Jump Command Palette (Ctrl+K)"
                    aria-label="Open Command Palette"
                    className="absolute right-1.5 px-1.5 py-0.5 rounded-lg bg-card border border-subtle font-mono text-[10px] text-muted hover:text-primary cursor-pointer"
                  >
                    Ctrl+K
                  </button>
                )}
              </div>
            )}

            {/* 2. Section 3.4: Favorites Section (under premiumUX shown only if user starred non-default pages so it never duplicates pages right below) */}
            {!normalizedQuery &&
              (!flags.premiumUX ||
                (pinnedTabs.length > 0 &&
                  (pinnedTabs.length !== DEFAULT_PINNED_TABS.length ||
                    pinnedTabs.some((t) => !DEFAULT_PINNED_TABS.includes(t))))) && (
                <div
                  data-testid="sidebar-pinned-section"
                  className="space-y-1.5 pb-2.5 border-b border-subtle"
                >
                  <div
                    data-testid="sidebar-favorites-section"
                    className="px-1.5 flex items-center justify-between text-[11px]"
                  >
                    <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                      <Star className="w-3.5 h-3.5 text-accent fill-current" />
                      <span>Favorites</span>
                    </span>
                    <div className="inline-flex items-center gap-1.5">
                      {pinnedTabs.length > 0 && (
                        <button
                          type="button"
                          data-testid="sidebar-favorites-clear-btn"
                          onClick={() => {
                            setFavoritesLimitNotice(false);
                            clearFavorites();
                          }}
                          title="Clear all Favorites"
                          className="text-[10px] text-muted hover:text-primary cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                      <span
                        data-testid="sidebar-favorites-count"
                        className="px-1.5 py-0.5 rounded-md bg-input border border-subtle font-mono text-[10px] text-secondary"
                      >
                        {pinnedTabs.length} of {MAX_PINNED_TABS}
                      </span>
                    </div>
                  </div>

                  <p className="px-1.5 text-[10px] text-muted leading-snug">
                    Tap the star on any page to keep it here.
                  </p>

                  {favoritesLimitNotice && (
                    <div
                      data-testid="sidebar-favorites-limit-toast"
                      role="status"
                      className="mx-1.5 px-2.5 py-1.5 rounded-xl bg-accent-soft border border-subtle text-[11px] font-medium text-primary"
                    >
                      Favorites are full. Remove one to add another.
                    </div>
                  )}

                  {pinnedTabs.length === 0 ? (
                    <div
                      data-testid="sidebar-favorites-empty"
                      className="p-2.5 rounded-2xl bg-input/70 border border-subtle space-y-2 text-xs"
                    >
                      <div className="flex items-center gap-2 text-secondary">
                        <Star className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="text-[11px] leading-snug">
                          No favorites yet. Quick-add a page below:
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          data-testid="favorite-suggest-executive_dashboard"
                          onClick={() => handleToggleFavorite('executive_dashboard')}
                          className="px-2 py-1 rounded-xl bg-card hover:bg-elevated border border-subtle text-[11px] font-semibold text-primary inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Star className="w-2.5 h-2.5 text-accent" />
                          <span>+ Executive Dashboard</span>
                        </button>
                        <button
                          type="button"
                          data-testid="favorite-suggest-analytics_packs"
                          onClick={() => handleToggleFavorite('analytics_packs')}
                          className="px-2 py-1 rounded-xl bg-card hover:bg-elevated border border-subtle text-[11px] font-semibold text-primary inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Star className="w-2.5 h-2.5 text-accent" />
                          <span>+ Analytics Packs</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-0.5">
                      {pinnedTabs.map((tabId) => {
                        const found = ALL_WORKFLOW_NAV_ITEMS.find((i) => i.id === tabId);
                        if (!found || (found.id === 'analytics_packs' && !flags.analyticsPacks)) {
                          return null;
                        }
                        const isActive = currentTab === tabId;
                        return (
                          <div
                            key={`pin-${tabId}`}
                            data-testid={`sidebar-pinned-item-${tabId}`}
                            className={`flex items-center justify-between gap-1 rounded-2xl px-2.5 py-1 text-xs transition-all ${
                              isActive
                                ? 'bg-accent text-on-accent font-bold shadow-xs'
                                : 'text-secondary hover:text-primary hover:bg-elevated'
                            }`}
                          >
                            <button
                              type="button"
                              role="link"
                              onClick={() => handleSelectTab(tabId)}
                              title={found.label}
                              aria-label={`Favorite: ${found.label}`}
                              className="min-h-[44px] lg:min-h-[30px] flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isActive ? 'bg-card' : 'bg-accent'
                                }`}
                              />
                              <span className="leading-tight truncate">{found.label}</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`sidebar-unpin-btn-${tabId}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(tabId);
                              }}
                              title="Remove from Favorites"
                              aria-label="Remove from Favorites"
                              className={`min-w-[44px] min-h-[44px] lg:min-w-[24px] lg:min-h-[24px] p-1 rounded flex items-center justify-center cursor-pointer ${
                                isActive
                                  ? 'text-on-accent hover:opacity-80'
                                  : 'text-accent hover:text-primary'
                              }`}
                            >
                              <Star className="w-3 h-3 fill-current" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            {/* 3. Recent Pages Row (last 3) */}
            {!normalizedQuery && recentTabs.length > 0 && (
              <div
                data-testid="sidebar-recent-items"
                className="space-y-1 pb-2 border-b border-subtle"
              >
                <div className="px-1.5 flex items-center gap-1 text-[11px] font-mono text-muted">
                  <Clock className="w-3 h-3 text-accent" />
                  <span>Recent</span>
                </div>
                <div className="flex flex-wrap gap-1 px-1">
                  {recentTabs.slice(0, 3).map((tabId) => {
                    const found = ALL_WORKFLOW_NAV_ITEMS.find((i) => i.id === tabId);
                    if (!found) return null;
                    const isActive = currentTab === tabId;
                    return (
                      <button
                        key={`rec-${tabId}`}
                        type="button"
                        role="link"
                        data-testid={`sidebar-recent-item-${tabId}`}
                        aria-label={`Recent: ${found.label}`}
                        onClick={() => handleSelectTab(tabId)}
                        className={`min-h-[44px] lg:min-h-[26px] px-2 py-1 rounded-xl text-[11px] font-medium border cursor-pointer ${
                          isActive
                            ? 'bg-accent text-on-accent border-subtle font-bold'
                            : 'bg-input hover:bg-elevated text-secondary border-subtle'
                        }`}
                      >
                        {found.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Section 3.3: Collapsible Workflow Groups matching the Top Stepper */}
            <div className="space-y-2" data-testid="sidebar-workflow-groups">
              {filteredGroups.map((group) => {
                const hasActiveItem = group.items.some((i) => i.id === currentTab);
                const isCollapsed = normalizedQuery
                  ? false
                  : Boolean(collapsedGroups[group.id]) && !hasActiveItem;

                const groupBadge =
                  group.id === 'clean'
                    ? issueCount > 0
                      ? `${issueCount} issues`
                      : `${qualityScore}%`
                    : group.id === 'analyze'
                    ? '14 packs'
                    : String(group.items.length);

                return (
                  <div
                    key={group.id}
                    data-testid={`sidebar-group-${group.id}`}
                    className="rounded-2xl border border-subtle bg-card/60 overflow-hidden"
                  >
                    <button
                      type="button"
                      data-testid={`sidebar-group-toggle-${group.id}`}
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={!isCollapsed}
                      className={`w-full min-h-[44px] lg:min-h-[36px] px-3 py-1.5 flex items-center justify-between text-left text-xs font-bold cursor-pointer transition-colors ${
                        hasActiveItem
                          ? 'bg-accent-soft text-accent'
                          : 'text-secondary hover:text-primary hover:bg-elevated'
                      }`}
                    >
                      <span className="tracking-tight">{group.title}</span>
                      <span className="inline-flex items-center gap-1.5 text-muted">
                        <span className="px-1.5 py-0.5 rounded-md bg-input border border-subtle text-[10px] font-mono text-secondary">
                          {groupBadge}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isCollapsed ? '-rotate-90' : 'rotate-0'
                          }`}
                        />
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div
                        onKeyDown={handleGroupItemsKeyDown}
                        className="p-1.5 space-y-1 border-t border-subtle"
                      >
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = currentTab === item.id;
                          const isPinned = isTabPinned(item.id);
                          const isFirstSearchHit =
                            Boolean(normalizedQuery) && firstSearchMatch?.id === item.id;
                          const dynamicItemBadge =
                            item.id === 'quality'
                              ? `${qualityScore}%`
                              : item.shortBadge;
                          const showInlineBadge =
                            Boolean(dynamicItemBadge) && item.label.length <= 20;

                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between gap-1 rounded-2xl pr-1 transition-all duration-150 ${
                                isActive
                                  ? 'bg-accent text-on-accent font-bold shadow-xs'
                                  : isFirstSearchHit
                                  ? 'bg-accent-soft text-primary ring-1 ring-accent'
                                  : 'bg-input/50 text-secondary hover:text-primary hover:bg-elevated hover:-translate-y-0.5'
                              }`}
                            >
                              <Tooltip
                                side="right"
                                title={item.label}
                                tag={dynamicItemBadge || group.title}
                                className="flex-1 min-w-0"
                                content={
                                  <div className="space-y-1.5">
                                    <p>{item.purpose}</p>
                                    {item.proTip && (
                                      <div className="pt-1.5 border-t border-subtle text-[10px] font-mono flex items-start gap-1 text-accent">
                                        <span className="shrink-0">Tip:</span>
                                        <span>{item.proTip}</span>
                                      </div>
                                    )}
                                  </div>
                                }
                              >
                                <button
                                  type="button"
                                  data-testid={`sidebar-nav-item-${item.id}`}
                                  onClick={() => handleSelectTab(item.id)}
                                  title={`${item.label}${
                                    dynamicItemBadge ? ` (${dynamicItemBadge})` : ''
                                  } — ${item.purpose}`}
                                  aria-label={item.label}
                                  aria-current={isActive ? 'page' : undefined}
                                  className="w-full min-h-[44px] lg:min-h-[38px] flex items-center justify-between gap-2 pl-2.5 pr-1 py-1.5 text-xs text-left cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-accent"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Icon
                                      className={`w-4 h-4 shrink-0 ${
                                        isActive ? 'text-on-accent' : 'text-accent'
                                      }`}
                                    />
                                    <span className="min-w-0 line-clamp-2 leading-tight break-words">
                                      {item.label}
                                    </span>
                                  </div>

                                  {showInlineBadge && (
                                    <span
                                      className={`shrink-0 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-md uppercase ${
                                        isActive
                                          ? 'bg-card/20 text-on-accent'
                                          : 'bg-card text-muted border border-subtle'
                                      }`}
                                    >
                                      {dynamicItemBadge}
                                    </span>
                                  )}
                                </button>
                              </Tooltip>

                              <button
                                type="button"
                                data-testid={`sidebar-pin-toggle-${item.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(item.id);
                                }}
                                aria-label={
                                  isPinned ? 'Remove from Favorites' : 'Add to Favorites'
                                }
                                aria-pressed={isPinned}
                                title={isPinned ? 'Remove from Favorites' : 'Add to Favorites'}
                                className={`min-w-[44px] min-h-[44px] lg:min-w-[28px] lg:min-h-[28px] p-1 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                                  isActive
                                    ? 'text-on-accent hover:opacity-80'
                                    : isPinned
                                    ? 'text-accent'
                                    : 'text-muted opacity-60 hover:opacity-100 hover:text-accent'
                                }`}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredGroups.length === 0 && (
                <div
                  data-testid="sidebar-search-empty"
                  className="p-4 text-center text-xs text-secondary rounded-2xl bg-input border border-subtle"
                >
                  No pages match &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* SECTION 3.6: FOOTER (Dataset Health Card + User Row)              */}
          {/* ================================================================= */}
          <div className="mt-auto p-3 border-t border-subtle bg-elevated/60 space-y-2.5 shrink-0">
            {/* Dataset Health Card (no truncation on "Dataset Health") */}
            <div
              data-testid="sidebar-dataset-health-card"
              className="p-2.5 rounded-2xl border border-subtle bg-card space-y-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                  <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r={ringRadius}
                      fill="none"
                      stroke="var(--border-subtle)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r={ringRadius}
                      fill="none"
                      stroke="var(--accent-primary)"
                      strokeWidth="3"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute text-[9px] font-mono font-bold text-primary">
                    {qualityScore}%
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    data-testid="sidebar-dataset-health-title"
                    className="text-xs font-bold text-primary whitespace-nowrap"
                  >
                    Dataset Health
                  </div>
                  <div className="text-[11px] font-mono text-secondary whitespace-nowrap">
                    {rowCount.toLocaleString()} rows · {issueCount} finding{issueCount === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-testid="sidebar-fix-issues-btn"
                onClick={() => handleSelectTab('quality')}
                className="w-full py-1.5 px-3 rounded-xl bg-accent text-on-accent text-xs font-bold cursor-pointer hover:opacity-95 text-center"
              >
                Fix issues
              </button>
            </div>

            {/* User Row */}
            <button
              type="button"
              data-testid="sidebar-user-row"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full p-2 rounded-2xl border border-subtle bg-card hover:bg-input flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-xl bg-accent-soft text-accent border border-subtle font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {userInitials}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-primary truncate">
                    {currentUser
                      ? currentUser.displayName || currentUser.email
                      : isGuestMode
                      ? 'Guest Demo'
                      : 'Sign In'}
                  </div>
                  <div className="text-[10px] font-mono text-muted truncate">
                    {currentUser ? 'Cloud Sync Active' : 'Local Browser Workspace'}
                  </div>
                </div>
              </div>
              <Settings className="w-3.5 h-3.5 text-muted shrink-0" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
