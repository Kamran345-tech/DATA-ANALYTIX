import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Table2,
  ShieldAlert,
  Wand2,
  Network,
  TrendingUp,
  Code2,
  Database,
  SlidersHorizontal,
  Sparkles,
  FileSpreadsheet,
  BookOpen,
  FolderDown,
  Settings,
  ChevronDown,
  ChevronRight,
  Database as DbIcon,
  Layers,
  LayoutDashboard,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
  FileText,
  Clock,
  Home,
  Wrench,
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';
import { loadFeatureFlags, FeatureFlags } from '../../config/features';

interface NavItemDef {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface NavGroup {
  id: string;
  name: string;
  items: NavItemDef[];
}

/**
 * 8 Core Items for Simple Navigation Mode (Phase 3.3):
 * Upload, Clean, Analyze (packs), Dashboard, Report/Present, Ask AI, Export, Settings.
 */
export const SIMPLE_NAV_ITEMS: NavItemDef[] = [
  { id: 'upload', label: 'Upload Data', icon: UploadCloud, description: 'Ingest CSV, Excel, or JSON files' },
  { id: 'cleaning', label: 'Data Cleaning Lab', icon: Wand2, description: '1-click deterministic cleaning recipes' },
  { id: 'analytics_packs', label: 'Analytics Packs', icon: Layers, description: '14 domain dashboards, KPIs & PPTX decks' },
  { id: 'executive_dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, description: 'Board-ready KPI telemetry & filters' },
  { id: 'reports', label: 'Executive Reports', icon: FileText, description: 'Print-ready decks and PDF briefs' },
  { id: 'ai_insights', label: 'Ask Your Data AI', icon: Sparkles, description: 'Natural language analysis grounded in metrics' },
  { id: 'export_center', label: 'Export Center', icon: FolderDown, description: 'Download Power BI PBIP, Excel, PDF & PPTX' },
  { id: 'settings', label: 'Settings & Branding', icon: Settings, description: 'Appearance, branding, flags & learned rules' },
];

const MODERN_NAV_GROUPS: NavGroup[] = [
  {
    id: 'group_data',
    name: 'Data',
    items: [
      { id: 'landing', label: 'Home / Overview', icon: Home, description: 'Command center and guided launchpad' },
      { id: 'upload', label: 'Upload Data', icon: UploadCloud, description: 'Ingest CSV, Excel, or Delimited files' },
      { id: 'live_connector', label: 'Live Server & DB', icon: DbIcon, description: 'Connect REST APIs or live database streams' },
      { id: 'preview', label: 'Data Preview & Profile', icon: Table2, description: 'Inspect schema, columns, and raw rows' },
    ],
  },
  {
    id: 'group_prepare',
    name: 'Prepare',
    items: [
      { id: 'quality', label: 'Data Quality Auditor', icon: ShieldAlert, description: 'Audit nulls, outliers, and data health' },
      { id: 'cleaning', label: 'Data Cleaning Lab', icon: Wand2, description: '1-click deterministic cleaning recipes' },
      { id: 'modeling', label: 'Data Modeling (ERD)', icon: Network, description: 'Decompose flat tables into Fact & Dimensions' },
      { id: 'data_engineering', label: 'Data Engineering (DAG)', icon: Layers, description: 'Visual pipeline flow and data quality tests' },
      { id: 'excel_automation', label: 'Excel Automation (XLSX)', icon: FileSpreadsheet, description: 'Formula automation and data formatting' },
    ],
  },
  {
    id: 'group_analyze',
    name: 'Analyze',
    items: [
      { id: 'analytics_packs', label: 'Analytics Packs', icon: Layers, description: '14 domain-specific dashboards, KPIs and reports' },
      { id: 'analysis', label: 'Statistical Analysis', icon: TrendingUp, description: 'Correlations, Cohort, Funnel, A/B, Pareto & RFM' },
      { id: 'sql_lab', label: 'SQL Lab', icon: Database, description: 'Execute ANSI SQL queries in-browser' },
      { id: 'dax_lab', label: 'DAX Lab', icon: Cpu, description: '20+ Time Intelligence business measures' },
      { id: 'python_lab', label: 'Python Lab', icon: Code2, description: 'Client-side Python data science analysis' },
      { id: 'ai_insights', label: 'Ask Your Data AI', icon: Sparkles, description: 'Natural language analysis grounded in metrics' },
    ],
  },
  {
    id: 'group_build',
    name: 'Build & Present',
    items: [
      { id: 'executive_dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, description: 'Board-ready KPI telemetry and visual filters' },
      { id: 'dashboard_builder', label: 'Dashboard Builder', icon: SlidersHorizontal, description: 'Compose and customize analytical widgets' },
      { id: 'reports', label: 'Executive Reports', icon: FileText, description: 'Print-ready decks and PDF exports' },
    ],
  },
  {
    id: 'group_export',
    name: 'Export & Govern',
    items: [
      { id: 'export_center', label: 'Export Center (ZIP)', icon: FolderDown, description: 'Download Power BI PBIP and multi-tab Excel' },
      { id: 'data_dictionary', label: 'Data Dictionary & Lineage', icon: BookOpen, description: 'Data dictionary, lineage, and catalog' },
      { id: 'how_to_use', label: 'How to Use Platform', icon: BookOpen, description: 'Complete platform guide and playbook' },
      { id: 'how_to_modify', label: 'How to Modify Project', icon: Wrench, description: 'Architecture and developer extension guide' },
      { id: 'blog', label: 'Knowledge Base / Blog', icon: FileText, description: 'Product updates and architecture history' },
      { id: 'settings', label: 'Settings & Branding', icon: Settings, description: 'Appearance, branding, and feature flags' },
    ],
  },
];

export interface ModernSidebarProps {
  onOpenCommandPalette?: () => void;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ onOpenCommandPalette }) => {
  const { currentTab, setCurrentTab } = usePlatform();
  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());

  const [navMode, setNavMode] = useState<'simple' | 'pro'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dataanalytix_nav_mode');
      if (stored === 'simple' || stored === 'pro') return stored;
    }
    return 'simple';
  });

  const [recentTabs, setRecentTabs] = useState<NavigationTab[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('dataanalytix_recent_tabs');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    const handleFlags = (e: any) => setFlags(e.detail || loadFeatureFlags());
    const handleNavMode = (e: any) => {
      if (e.detail === 'simple' || e.detail === 'pro') setNavMode(e.detail);
    };
    const handleRecent = (e: any) => {
      if (Array.isArray(e.detail)) setRecentTabs(e.detail);
    };
    window.addEventListener('dataanalytix:features-updated', handleFlags);
    window.addEventListener('dataanalytix:nav-mode-updated', handleNavMode);
    window.addEventListener('dataanalytix:recent-tabs-updated', handleRecent);
    return () => {
      window.removeEventListener('dataanalytix:features-updated', handleFlags);
      window.removeEventListener('dataanalytix:nav-mode-updated', handleNavMode);
      window.removeEventListener('dataanalytix:recent-tabs-updated', handleRecent);
    };
  }, []);

  const updateNavMode = (mode: 'simple' | 'pro') => {
    setNavMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dataanalytix_nav_mode', mode);
      window.dispatchEvent(new CustomEvent('dataanalytix:nav-mode-updated', { detail: mode }));
    }
  };

  const [isRailCollapsed, setIsRailCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dataanalytix_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleRail = () => {
    const next = !isRailCollapsed;
    setIsRailCollapsed(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dataanalytix_sidebar_collapsed', String(next));
    }
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const allItemsFlat = React.useMemo(
    () => MODERN_NAV_GROUPS.flatMap((g) => g.items),
    []
  );

  return (
    <aside
      role="navigation"
      aria-label="Workflow Navigation Sidebar"
      className={`hidden md:flex shrink-0 h-full border-r border-subtle bg-sidebar text-primary flex-col select-none transition-all duration-200 z-20 ${
        isRailCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Rail Controls + Simple / Pro Switcher */}
      <div className="p-3 border-b border-subtle space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {!isRailCollapsed && (
            <span className="text-xs font-semibold text-secondary pl-1">
              Workspace Menu
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

        {/* Simple / Pro Mode Segmented Control (Phase 3.3) */}
        {!isRailCollapsed && flags.designSystemV3 && (
          <div
            data-testid="nav-mode-toggle"
            role="group"
            aria-label="Navigation complexity mode"
            className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-input border border-subtle"
          >
            <button
              type="button"
              data-testid="nav-mode-simple"
              onClick={() => updateNavMode('simple')}
              aria-pressed={navMode === 'simple'}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                navMode === 'simple'
                  ? 'bg-accent text-on-accent font-bold shadow-2xs'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Simple (8)
            </button>
            <button
              type="button"
              data-testid="nav-mode-pro"
              onClick={() => updateNavMode('pro')}
              aria-pressed={navMode === 'pro'}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                navMode === 'pro'
                  ? 'bg-accent text-on-accent font-bold shadow-2xs'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Pro (All)
            </button>
          </div>
        )}
      </div>

      {/* Nav Items Container */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
        {/* Recently Used Quick List (Phase 3.3) */}
        {!isRailCollapsed && flags.designSystemV3 && recentTabs.length > 1 && (
          <div data-testid="sidebar-recent-items" className="space-y-1 pb-2 border-b border-subtle">
            <div className="px-2 flex items-center gap-1.5 text-xs font-mono text-muted">
              <Clock className="w-3 h-3 text-accent" />
              <span>Recently Used</span>
            </div>
            <div className="flex flex-wrap gap-1 px-1">
              {recentTabs.slice(0, 3).map((tabId) => {
                const found = allItemsFlat.find((i) => i.id === tabId);
                if (!found) return null;
                return (
                  <button
                    key={`rec-${tabId}`}
                    type="button"
                    onClick={() => setCurrentTab(tabId)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium truncate max-w-[115px] border transition-colors cursor-pointer ${
                      currentTab === tabId
                        ? 'bg-accent-soft text-accent border-subtle font-semibold'
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

        {navMode === 'simple' && flags.designSystemV3 ? (
          <div data-testid="sidebar-simple-list" className="space-y-1">
            {!isRailCollapsed && (
              <div className="px-2 py-1 text-xs font-mono text-muted">
                Core Workflow (8 Tools)
              </div>
            )}
            {SIMPLE_NAV_ITEMS.filter(
              (item) => item.id !== 'analytics_packs' || flags.analyticsPacks
            ).map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentTab(item.id)}
                  title={`${item.label} — ${item.description}`}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left group cursor-pointer ${
                    isActive
                      ? 'bg-accent text-on-accent font-semibold shadow-2xs'
                      : 'text-secondary hover:text-primary hover:bg-elevated'
                  } ${isRailCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-on-accent' : 'text-accent group-hover:text-primary'
                    }`}
                  />
                  {!isRailCollapsed && (
                    <span className="min-w-0 truncate" title={item.label}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}

            {!isRailCollapsed && (
              <button
                type="button"
                onClick={() => updateNavMode('pro')}
                className="w-full mt-2 py-2 px-3 rounded-xl border border-subtle bg-input hover:bg-elevated text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer text-center"
              >
                Show all 24 Pro modules →
              </button>
            )}
          </div>
        ) : (
          MODERN_NAV_GROUPS.map((group) => {
            const isGroupCollapsed = !!collapsedGroups[group.id];
            const hasActiveItem = group.items.some((item) => item.id === currentTab);

            return (
              <div key={group.id} className="space-y-1">
                {!isRailCollapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!isGroupCollapsed}
                    className="w-full px-2 py-1 flex items-center justify-between text-left text-xs font-semibold text-muted hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className={hasActiveItem ? 'text-accent font-bold' : ''}>
                      {group.name}
                    </span>
                    {isGroupCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {(!isGroupCollapsed || isRailCollapsed) && (
                  <div className="space-y-0.5">
                    {group.items
                      .filter((item) => item.id !== 'analytics_packs' || flags.analyticsPacks)
                      .map((item) => {
                        const isActive = currentTab === item.id;
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setCurrentTab(item.id)}
                            title={`${item.label} — ${item.description}`}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                            className={`w-full min-h-[38px] flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left group relative cursor-pointer ${
                              isActive
                                ? 'bg-accent text-on-accent font-semibold shadow-2xs'
                                : 'text-secondary hover:text-primary hover:bg-elevated'
                            } ${isRailCollapsed ? 'justify-center px-0' : ''}`}
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-on-accent' : 'text-accent group-hover:text-primary'
                              }`}
                            />

                            {!isRailCollapsed && (
                              <span className="min-w-0 truncate" title={item.label}>
                                {item.label}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })
        )}
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
            {!isRailCollapsed && <span>Search Pages</span>}
          </span>
          {!isRailCollapsed && (
            <kbd className="text-xs font-mono px-1.5 py-0.5 rounded bg-card border border-subtle text-muted">
              ⌘K
            </kbd>
          )}
        </button>
      </div>
    </aside>
  );
};
