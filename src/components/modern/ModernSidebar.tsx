import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
  Clock,
  Search,
  Star,
  X,
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';
import { loadFeatureFlags, FeatureFlags } from '../../config/features';
import {
  WORKFLOW_SIDEBAR_GROUPS,
  ALL_WORKFLOW_NAV_ITEMS,
  DEFAULT_PINNED_TABS,
  useSidebarNavState,
} from '../../config/navigationConfig';

export { WORKFLOW_SIDEBAR_GROUPS, ALL_WORKFLOW_NAV_ITEMS, DEFAULT_PINNED_TABS, useSidebarNavState };

export interface ModernSidebarProps {
  onOpenCommandPalette?: () => void;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ onOpenCommandPalette }) => {
  const { currentTab, setCurrentTab } = usePlatform();
  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());
  const [searchQuery, setSearchQuery] = useState('');

  const {
    pinnedTabs,
    togglePinTab,
    isTabPinned,
    recentTabs,
    collapsedGroups,
    toggleGroup,
  } = useSidebarNavState(currentTab);

  useEffect(() => {
    const handleFlags = (e: any) => setFlags(e.detail || loadFeatureFlags());
    window.addEventListener('dataanalytix:features-updated', handleFlags);
    return () => {
      window.removeEventListener('dataanalytix:features-updated', handleFlags);
    };
  }, []);

  const [isRailCollapsed, setIsRailCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dataanalytix_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleRail = () => {
    const next = !isRailCollapsed;
    setIsRailCollapsed(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dataanalytix_sidebar_collapsed', String(next));
    }
  };

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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && firstSearchMatch) {
      e.preventDefault();
      setCurrentTab(firstSearchMatch.id);
    }
  };

  return (
    <aside
      role="navigation"
      aria-label="Workflow Navigation Sidebar"
      className={`hidden md:flex shrink-0 h-full border-r border-subtle bg-sidebar text-primary flex-col select-none transition-all duration-200 z-20 ${
        isRailCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Rail Controls + Search Input */}
      <div className="p-3 border-b border-subtle space-y-2">
        <div className="flex items-center justify-between gap-2">
          {!isRailCollapsed && (
            <span className="text-xs font-semibold text-secondary pl-1">
              Workflow Menu
            </span>
          )}
          <button
            type="button"
            onClick={toggleRail}
            title={isRailCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icon Rail'}
            aria-label={isRailCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors mx-auto cursor-pointer"
          >
            {isRailCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-accent" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {!isRailCollapsed && !flags.premiumUX && (
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
              className="w-full min-h-[34px] pl-8 pr-14 py-1.5 rounded-xl bg-input border border-subtle text-xs text-primary placeholder:text-muted focus:outline-2 focus:outline-accent"
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
                onClick={onOpenCommandPalette}
                title="Open Quick Jump Command Palette (Ctrl+K)"
                aria-label="Open Command Palette"
                className="absolute right-1.5 px-1.5 py-0.5 rounded bg-card border border-subtle font-mono text-[10px] text-muted hover:text-primary cursor-pointer"
              >
                Ctrl+K
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav Items Container */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {/* Pinned Pages Section */}
        {!isRailCollapsed &&
          !normalizedQuery &&
          pinnedTabs.length > 0 &&
          (!flags.premiumUX ||
            pinnedTabs.length !== DEFAULT_PINNED_TABS.length ||
            pinnedTabs.some((t) => !DEFAULT_PINNED_TABS.includes(t))) && (
          <div
            data-testid="sidebar-pinned-section"
            className="space-y-1 pb-2 border-b border-subtle"
          >
            <div className="px-2 flex items-center justify-between text-[11px] font-mono text-muted">
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
                      onClick={() => setCurrentTab(tabId)}
                      aria-label={`Pinned: ${found.label}`}
                      className="min-h-[28px] flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
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
                      className={`p-1 rounded flex items-center justify-center cursor-pointer ${
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

        {/* Recent Pages Row (last 3) */}
        {!isRailCollapsed && !normalizedQuery && recentTabs.length > 0 && (
          <div
            data-testid="sidebar-recent-items"
            className="space-y-1 pb-2 border-b border-subtle"
          >
            <div className="px-2 flex items-center gap-1.5 text-[11px] font-mono text-muted">
              <Clock className="w-3 h-3 text-accent" />
              <span>Recent</span>
            </div>
            <div className="flex flex-wrap gap-1 px-1">
              {recentTabs.slice(0, 3).map((tabId) => {
                const found = ALL_WORKFLOW_NAV_ITEMS.find((i) => i.id === tabId);
                if (!found) return null;
                return (
                  <button
                    key={`rec-${tabId}`}
                    type="button"
                    role="link"
                    data-testid={`sidebar-recent-item-${tabId}`}
                    aria-label={`Recent: ${found.label}`}
                    onClick={() => setCurrentTab(tabId)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium border cursor-pointer ${
                      currentTab === tabId
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

        {/* Collapsible Workflow Groups */}
        <div className="space-y-2" data-testid="sidebar-workflow-groups">
          {filteredGroups.map((group) => {
            const hasActiveItem = group.items.some((item) => item.id === currentTab);
            const isGroupCollapsed = normalizedQuery
              ? false
              : Boolean(collapsedGroups[group.id]) && !hasActiveItem;

            return (
              <div
                key={group.id}
                data-testid={`sidebar-group-${group.id}`}
                className="space-y-1"
              >
                {!isRailCollapsed && (
                  <button
                    type="button"
                    data-testid={`sidebar-group-toggle-${group.id}`}
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!isGroupCollapsed}
                    className="w-full px-2 py-1 flex items-center justify-between text-left text-xs font-semibold text-muted hover:text-primary cursor-pointer"
                  >
                    <span className={hasActiveItem ? 'text-accent font-bold' : ''}>
                      {group.title}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[10px] font-mono">{group.items.length}</span>
                      {isGroupCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </button>
                )}

                {(!isGroupCollapsed || isRailCollapsed) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = currentTab === item.id;
                      const Icon = item.icon;
                      const isPinned = isTabPinned(item.id);
                      const isFirstSearchHit =
                        Boolean(normalizedQuery) && firstSearchMatch?.id === item.id;
                      const showInlineBadge =
                        !isRailCollapsed &&
                        Boolean(item.shortBadge) &&
                        item.label.length <= 16;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between gap-1 rounded-xl ${
                            isActive
                              ? 'bg-accent text-on-accent font-semibold shadow-2xs'
                              : isFirstSearchHit
                              ? 'bg-accent-soft text-primary ring-1 ring-accent'
                              : 'text-secondary hover:text-primary hover:bg-elevated'
                          }`}
                        >
                          <button
                            type="button"
                            data-testid={`sidebar-nav-item-${item.id}`}
                            onClick={() => setCurrentTab(item.id)}
                            title={`${item.label}${
                              item.shortBadge ? ` (${item.shortBadge})` : ''
                            } — ${item.purpose}`}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                            className={`w-full min-h-[36px] flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-medium text-left group cursor-pointer ${
                              isRailCollapsed ? 'justify-center px-0' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isActive
                                    ? 'text-on-accent'
                                    : 'text-accent group-hover:text-primary'
                                }`}
                              />
                              {!isRailCollapsed && (
                                <span className="min-w-0 line-clamp-2 leading-tight break-words">
                                  {item.label}
                                </span>
                              )}
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

                          {!isRailCollapsed && (
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
                              title={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
                              className={`p-1 mr-1 rounded flex items-center justify-center shrink-0 cursor-pointer ${
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer shortcut bar */}
      <div className="p-2.5 border-t border-subtle">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title="Search Views & Actions (Ctrl+K)"
          aria-label="Open Command Palette"
          className="w-full py-2 px-2.5 rounded-xl border border-subtle bg-input text-xs text-secondary hover:text-primary hover:border-strong transition-colors flex items-center justify-between gap-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Command className="w-3.5 h-3.5 text-accent" />
            {!isRailCollapsed && <span>Quick Jump</span>}
          </span>
          {!isRailCollapsed && (
            <kbd className="text-xs font-mono px-1.5 py-0.5 rounded bg-card border border-subtle text-muted">
              Ctrl+K
            </kbd>
          )}
        </button>
      </div>
    </aside>
  );
};
