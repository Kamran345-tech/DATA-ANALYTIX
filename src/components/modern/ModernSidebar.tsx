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
  FileCode2, 
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
  FileText
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';

interface NavGroup {
  id: string;
  name: string;
  items: {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }[];
}

const MODERN_NAV_GROUPS: NavGroup[] = [
  {
    id: 'group_data',
    name: 'Data',
    items: [
      { id: 'upload', label: 'Upload Data', icon: UploadCloud, description: 'Ingest CSV, Excel, or Delimited files' },
      { id: 'live_connector', label: 'Live Connector', icon: DbIcon, description: 'Connect REST APIs or live telemetry streams' },
      { id: 'preview', label: 'Data Preview', icon: Table2, description: 'Inspect schema, columns, and raw rows' },
    ]
  },
  {
    id: 'group_prepare',
    name: 'Prepare',
    items: [
      { id: 'quality', label: 'Quality Auditor', icon: ShieldAlert, description: 'Audit nulls, outliers, and data health' },
      { id: 'cleaning', label: 'Cleaning Lab', icon: Wand2, description: '1-click deterministic cleaning recipes' },
      { id: 'modeling', label: 'Star Schema & ERD', icon: Network, description: 'Decompose flat tables into Fact & Dimensions' },
      { id: 'data_engineering', label: 'Pipeline DAG', icon: Layers, description: 'Visual pipeline flow and dependency graphs' },
      { id: 'excel_automation', label: 'Excel Studio', icon: FileSpreadsheet, description: 'Formula automation and data formatting' },
    ]
  },
  {
    id: 'group_analyze',
    name: 'Analyze',
    items: [
      { id: 'analysis', label: 'Statistical Analysis', icon: TrendingUp, description: 'Correlations, anomalies, and distributions' },
      { id: 'sql_lab', label: 'SQL Workbench', icon: Database, description: 'Execute ANSI SQL queries in-browser' },
      { id: 'dax_lab', label: 'DAX Studio', icon: Cpu, description: '20+ Time Intelligence business measures' },
      { id: 'python_lab', label: 'Python Sandbox', icon: Code2, description: 'Client-side Pyodide data science analysis' },
      { id: 'ai_insights', label: 'Ask Data AI', icon: Sparkles, description: 'Natural language analysis grounded in metrics' },
    ]
  },
  {
    id: 'group_build',
    name: 'Build',
    items: [
      { id: 'executive_dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, description: 'Board-ready KPI telemetry and visual filters' },
      { id: 'dashboard_builder', label: 'Dashboard Builder', icon: SlidersHorizontal, description: 'Compose and customize analytical widgets' },
      { id: 'reports', label: 'Executive Reports', icon: FileText, description: 'Print-ready decks and PDF exports' },
    ]
  },
  {
    id: 'group_export',
    name: 'Export & Learn',
    items: [
      { id: 'export_center', label: 'Export Center', icon: FolderDown, description: 'Download Power BI PBIP and multi-tab Excel' },
      { id: 'data_dictionary', label: 'Data Governance', icon: BookOpen, description: 'Data dictionary, lineage, and catalog' },
      { id: 'how_to_use', label: 'Documentation', icon: BookOpen, description: 'Complete platform guide and playbook' },
      { id: 'blog', label: 'Changelog', icon: FileText, description: 'Product updates and architecture history' },
      { id: 'settings', label: 'Settings', icon: Settings, description: 'Appearance, branding, and feature flags' },
    ]
  }
];

export interface ModernSidebarProps {
  onOpenCommandPalette?: () => void;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ onOpenCommandPalette }) => {
  const { currentTab, setCurrentTab } = usePlatform();

  // Collapsed rail state persisted in localStorage
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
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <aside
      role="navigation"
      aria-label="Workflow Navigation Sidebar"
      className={`hidden md:flex shrink-0 h-full border-r border-[var(--modern-border)] bg-[var(--modern-bg-surface)] text-[var(--modern-text)] flex-col select-none transition-all duration-200 z-20 ${
        isRailCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Rail Controls */}
      <div className="p-3 border-b border-[var(--modern-border)] flex items-center justify-between gap-2">
        {!isRailCollapsed && (
          <span className="text-[11px] font-semibold text-[var(--modern-text-muted)] uppercase tracking-wider pl-1">
            Navigation
          </span>
        )}
        <button
          onClick={toggleRail}
          title={isRailCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icon Rail'}
          aria-label={isRailCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1.5 rounded-lg text-[var(--modern-text-muted)] hover:text-[var(--modern-text)] hover:bg-[var(--modern-bg-surface-2)] transition-colors mx-auto"
        >
          {isRailCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-[var(--modern-primary)]" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav Groups Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {MODERN_NAV_GROUPS.map((group) => {
          const isGroupCollapsed = !!collapsedGroups[group.id];
          const hasActiveItem = group.items.some(item => item.id === currentTab);

          return (
            <div key={group.id} className="space-y-1">
              {/* Group Section Header (Expanded mode only) */}
              {!isRailCollapsed && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isGroupCollapsed}
                  className="w-full px-2 py-1 flex items-center justify-between text-left text-[11px] font-bold uppercase tracking-wider text-[var(--modern-text-muted)] hover:text-[var(--modern-text)] transition-colors"
                >
                  <span className={hasActiveItem ? 'text-[var(--modern-primary)]' : ''}>
                    {group.name}
                  </span>
                  {isGroupCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {/* Group Items */}
              {(!isGroupCollapsed || isRailCollapsed) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = currentTab === item.id;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentTab(item.id)}
                        title={`${item.label} — ${item.description}`}
                        aria-label={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left group relative ${
                          isActive
                            ? 'bg-[var(--modern-primary-muted)] text-[var(--modern-primary)] font-semibold border border-[var(--modern-primary)]/20'
                            : 'text-[var(--modern-text-muted)] hover:text-[var(--modern-text)] hover:bg-[var(--modern-bg-surface-2)]'
                        } ${isRailCollapsed ? 'justify-center px-0' : ''}`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--modern-primary)]' : 'group-hover:text-[var(--modern-text)]'}`} />
                        
                        {!isRailCollapsed && (
                          <span className="min-w-0 truncate" title={item.label}>{item.label}</span>
                        )}

                        {/* Active Indicator bar */}
                        {isActive && !isRailCollapsed && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--modern-primary)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer shortcut bar */}
      <div className="p-2 border-t border-[var(--modern-border)]">
        <button
          onClick={onOpenCommandPalette}
          title="Search Views (Ctrl+K)"
          aria-label="Open Command Palette"
          className="w-full py-2 px-2.5 rounded-lg border border-[var(--modern-border)] bg-[var(--modern-bg-surface-2)] text-[11px] text-[var(--modern-text-muted)] hover:border-[var(--modern-primary)] transition-colors flex items-center justify-between gap-1"
        >
          <span className="flex items-center gap-1.5">
            <Command className="w-3.5 h-3.5 text-[var(--modern-primary)]" />
            {!isRailCollapsed && <span>Search Views</span>}
          </span>
          {!isRailCollapsed && (
            <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--modern-border)]">
              ⌘K
            </kbd>
          )}
        </button>
      </div>
    </aside>
  );
};
