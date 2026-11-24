import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Cloud,
  Search,
  Star,
  Clock,
  X,
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';
import { Tooltip } from '../common/Tooltip';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import { loadFeatureFlags, FeatureFlags } from '../../config/features';
import {
  WORKFLOW_SIDEBAR_GROUPS,
  ALL_WORKFLOW_NAV_ITEMS,
  useSidebarNavState,
} from '../../config/navigationConfig';

export const Sidebar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    isSidebarOpen,
    setIsSidebarOpen,
    isPresentationMode,
    themeMode,
  } = usePlatform();
  const { currentUser, isGuestMode, setIsAuthModalOpen } = useFirebaseAuth();
  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());
  const [searchQuery, setSearchQuery] = useState('');
  const isLight = themeMode === 'light';
  const asideRef = React.useRef<HTMLElement | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const {
    pinnedTabs,
    togglePinTab,
    isTabPinned,
    recentTabs,
    collapsedGroups,
    toggleGroup,
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
      const focusables = asideRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && firstSearchMatch) {
      e.preventDefault();
      handleSelectTab(firstSearchMatch.id);
    }
  };

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
        className="fixed inset-y-0 lg:static top-0 lg:top-auto left-0 z-50 lg:z-30 w-72 max-w-[85vw] lg:w-64 flex flex-col h-full max-h-full overflow-y-auto select-none shrink-0 bg-sidebar border-r border-subtle text-primary shadow-lg"
      >
        {/* Mobile Header with Close button */}
        <div className="flex lg:hidden items-center justify-between p-4 border-b border-subtle bg-elevated">
          <span className="font-heading text-lg font-bold tracking-wider text-primary">
            DATA<span className="text-accent">ANALYTIX</span>
          </span>
          <button
            type="button"
            onClick={handleCloseDrawer}
            aria-label="Close Navigation Drawer"
            className="min-w-[44px] min-h-[44px] p-2 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-input"
          >
            ✕
          </button>
        </div>

        <div className="p-3 space-y-3">
          {/* 1. Sidebar Search Input (filters by page name & purpose; Enter opens first match) */}
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
              className="w-full min-h-[44px] lg:min-h-[34px] pl-8 pr-14 py-1.5 rounded-xl bg-input border border-subtle text-xs text-primary placeholder:text-muted focus:outline-2 focus:outline-accent"
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
                className="absolute right-1.5 px-1.5 py-0.5 rounded bg-card border border-subtle font-mono text-[10px] text-muted hover:text-primary cursor-pointer"
              >
                Ctrl+K
              </button>
            )}
          </div>

          {/* 2. Pinned Pages Section (max 6, user can pin/unpin any page with a star) */}
          {!normalizedQuery && pinnedTabs.length > 0 && (
            <div
              data-testid="sidebar-pinned-section"
              className="space-y-1.5 pb-2 border-b border-subtle"
            >
              <div className="px-1.5 flex items-center justify-between text-[11px] font-mono text-muted">
                <span className="inline-flex items-center gap-1 font-semibold text-secondary">
                  <Star className="w-3 h-3 text-accent fill-current" />
                  <span>Pinned</span>
                </span>
                <span>{pinnedTabs.length}/6</span>
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                {pinnedTabs.map((tabId) => {
                  const found = ALL_WORKFLOW_NAV_ITEMS.find((i) => i.id === tabId);
                  if (!found || (found.id === 'analytics_packs' && !flags.analyticsPacks)) {
                    return null;
                  }
                  const Icon = found.icon;
                  const isActive = currentTab === tabId;
                  return (
                    <div
                      key={`pin-${tabId}`}
                      data-testid={`sidebar-pinned-item-${tabId}`}
                      className={`flex items-center justify-between gap-1 rounded-xl px-2 py-1 text-xs ${
                        isActive
                          ? 'bg-accent text-on-accent font-bold'
                          : 'text-secondary hover:text-primary hover:bg-elevated'
                      }`}
                    >
                      <button
                        type="button"
                        role="link"
                        onClick={() => handleSelectTab(tabId)}
                        aria-label={`Pinned: ${found.label}`}
                        className="min-h-[44px] lg:min-h-[28px] flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-on-accent' : 'text-accent'
                          }`}
                        />
                        <span className="leading-tight line-clamp-1">{found.label}</span>
                      </button>
                      <button
                        type="button"
                        data-testid={`sidebar-unpin-btn-${tabId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinTab(tabId);
                        }}
                        title={`Unpin ${found.label}`}
                        aria-label="Unpin page from sidebar"
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
                      className={`min-h-[44px] lg:min-h-[26px] px-2 py-1 rounded-lg text-[11px] font-medium border cursor-pointer ${
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

          {/* 4. Collapsible Workflow Groups matching the Top Stepper */}
          <div className="space-y-2" data-testid="sidebar-workflow-groups">
            {filteredGroups.map((group) => {
              const hasActiveItem = group.items.some((i) => i.id === currentTab);
              const isCollapsed = normalizedQuery
                ? false
                : Boolean(collapsedGroups[group.id]) && !hasActiveItem;

              return (
                <div
                  key={group.id}
                  data-testid={`sidebar-group-${group.id}`}
                  className="rounded-xl border border-subtle bg-card/60 overflow-hidden"
                >
                  <button
                    type="button"
                    data-testid={`sidebar-group-toggle-${group.id}`}
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!isCollapsed}
                    className={`w-full min-h-[44px] lg:min-h-[34px] px-2.5 py-1.5 flex items-center justify-between text-left text-xs font-bold cursor-pointer ${
                      hasActiveItem
                        ? 'bg-accent-soft text-accent'
                        : 'text-secondary hover:text-primary hover:bg-elevated'
                    }`}
                  >
                    <span className="tracking-tight">{group.title}</span>
                    <span className="inline-flex items-center gap-1 text-muted">
                      <span className="text-[10px] font-mono">{group.items.length}</span>
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="p-1 space-y-0.5 border-t border-subtle">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;
                        const isPinned = isTabPinned(item.id);
                        const isFirstSearchHit =
                          Boolean(normalizedQuery) && firstSearchMatch?.id === item.id;
                        const showInlineBadge =
                          Boolean(item.shortBadge) && item.label.length <= 16;

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between gap-1 rounded-xl pr-1 ${
                              isActive
                                ? 'bg-accent text-on-accent font-bold shadow-xs'
                                : isFirstSearchHit
                                ? 'bg-accent-soft text-primary ring-1 ring-accent'
                                : 'text-secondary hover:text-primary hover:bg-elevated'
                            }`}
                          >
                            <Tooltip
                              side="right"
                              title={item.label}
                              tag={item.shortBadge || group.title}
                              className="flex-1 min-w-0"
                              content={
                                <div className="space-y-1.5">
                                  <p>{item.purpose}</p>
                                  {item.proTip && (
                                    <div className="pt-1.5 border-t border-subtle text-[10px] font-mono flex items-start gap-1 text-accent">
                                      <span className="shrink-0">💡</span>
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
                                  item.shortBadge ? ` (${item.shortBadge})` : ''
                                } — ${item.purpose}`}
                                aria-label={item.label}
                                aria-current={isActive ? 'page' : undefined}
                                className="w-full min-h-[44px] lg:min-h-[34px] flex items-center justify-between gap-2 pl-2.5 pr-1 py-1.5 text-xs text-left cursor-pointer"
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
                                    className={`shrink-0 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded uppercase ${
                                      isActive
                                        ? 'bg-card/20 text-on-accent'
                                        : 'bg-input text-muted border border-subtle'
                                    }`}
                                  >
                                    {item.shortBadge}
                                  </span>
                                )}
                              </button>
                            </Tooltip>

                            <button
                              type="button"
                              data-testid={`sidebar-pin-toggle-${item.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinTab(item.id);
                              }}
                              aria-label={
                                isPinned ? 'Unpin page from sidebar' : 'Pin page to sidebar'
                              }
                              aria-pressed={isPinned}
                              title={
                                isPinned
                                  ? `Unpin ${item.label}`
                                  : `Pin ${item.label} to top of sidebar`
                              }
                              className={`min-w-[44px] min-h-[44px] lg:min-w-[26px] lg:min-h-[26px] p-1 rounded-lg flex items-center justify-center shrink-0 cursor-pointer ${
                                isActive
                                  ? 'text-on-accent hover:opacity-80'
                                  : isPinned
                                  ? 'text-accent'
                                  : 'text-muted opacity-60 hover:opacity-100 hover:text-accent'
                              }`}
                            >
                              <Star
                                className={`w-3 h-3 ${isPinned ? 'fill-current' : ''}`}
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
                className="p-4 text-center text-xs text-secondary rounded-xl bg-input border border-subtle"
              >
                No pages match &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Footer Cloud & Attribution */}
        <div
          className={`mt-auto p-3 border-t space-y-2 ${
            isLight
              ? 'border-subtle bg-elevated text-muted'
              : 'border-subtle bg-app text-secondary'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full text-left p-2 rounded-xl border border-subtle bg-card hover:bg-elevated transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-primary">
                  Firebase Cloud
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-input text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                {currentUser ? 'Active' : 'Connected'}
              </span>
            </div>
            <p className="text-[10px] leading-tight truncate text-secondary">
              {currentUser
                ? `User: ${currentUser.displayName || currentUser.email}`
                : isGuestMode
                ? 'Guest Demo Session · Sign In'
                : 'Firestore & Auth live · Sign In'}
            </p>
          </button>

          <div className="pt-1.5 border-t border-subtle flex items-center justify-between text-[10px]">
            <span className="font-mono text-secondary">Kamran Badar</span>
            <span className="font-mono text-muted">Analytics Technologies</span>
          </div>
        </div>
      </aside>
    </>
  );
};
