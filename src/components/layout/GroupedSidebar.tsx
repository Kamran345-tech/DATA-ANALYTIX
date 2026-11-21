import React, { useState } from 'react';
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
  Cpu
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';
import { getBrandText, loadFeatureFlags } from '../../config/features';

interface WorkflowGroup {
  id: string;
  title: string;
  stageNumber: string;
  badge?: string;
  items: {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }[];
}

const WORKFLOW_GROUPS: WorkflowGroup[] = [
  {
    id: 'stage_1_data',
    title: '1. Ingest Data',
    stageNumber: '01',
    badge: 'Sources',
    items: [
      { id: 'upload', label: 'File Upload & Drag-Drop', icon: UploadCloud, description: 'Ingest local CSVs, Excel, or Delimited files' },
      { id: 'live_connector', label: 'Live Server Connector', icon: DbIcon, description: 'Live connection to SQL/REST telemetry' },
      { id: 'preview', label: 'Data Preview & Schema', icon: Table2, description: 'Inspect raw columns and types' },
      { id: 'data_dictionary', label: 'Data Governance Dictionary', icon: BookOpen, description: 'Column catalog and lineage' },
    ]
  },
  {
    id: 'stage_2_prepare',
    title: '2. Audit & Prepare',
    stageNumber: '02',
    badge: 'Hygiene',
    items: [
      { id: 'quality', label: 'Quality Auditor', icon: ShieldAlert, description: 'Completeness, validity & null audits' },
      { id: 'cleaning', label: 'Cleaning Lab', icon: Wand2, description: 'Deterministic 1-click clean recipes' },
      { id: 'excel_automation', label: 'Excel Studio Automation', icon: FileSpreadsheet, description: 'VBA-free formula transformations' },
    ]
  },
  {
    id: 'stage_3_model',
    title: '3. Model & Code',
    stageNumber: '03',
    badge: 'Engineering',
    items: [
      { id: 'modeling', label: 'Star Schema & ERD', icon: Network, description: 'Decompose flat tables into Fact & Dims' },
      { id: 'data_engineering', label: 'ETL Pipeline DAG', icon: Layers, description: 'Visual pipeline flow and dependencies' },
      { id: 'dax_lab', label: 'DAX Measure Studio', icon: Cpu, description: '20+ Time Intelligence DAX measures' },
      { id: 'sql_lab', label: 'SQL In-Browser Lab', icon: Database, description: 'Execute ANSI SQL queries with AlaSQL' },
      { id: 'python_lab', label: 'Python Sandbox', icon: Code2, description: 'Pyodide client-side data science' },
    ]
  },
  {
    id: 'stage_4_analyze',
    title: '4. Analyze & Build',
    stageNumber: '04',
    badge: 'Insights',
    items: [
      { id: 'executive_dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, description: 'Board-level KPI telemetry & slicers' },
      { id: 'analytics_packs', label: 'Analytics Packs', icon: Layers, description: '14 domain-specific dashboards, KPIs & reports' },
      { id: 'dashboard_builder', label: 'Custom Dashboard Builder', icon: SlidersHorizontal, description: 'Compose customized visual layouts' },
      { id: 'analysis', label: 'Deep Statistical Analysis', icon: TrendingUp, description: 'Correlations, anomalies, and distributions' },
      { id: 'ai_insights', label: 'Ask Data AI', icon: Sparkles, description: 'Natural language questions grounded in metrics' },
      { id: 'reports', label: 'Executive Reports', icon: FileSpreadsheet, description: 'Print-ready board decks and summaries' },
    ]
  },
  {
    id: 'stage_5_export',
    title: '5. Export & Settings',
    stageNumber: '05',
    badge: 'Artifacts',
    items: [
      { id: 'landing', label: 'Home / Overview', icon: LayoutDashboard, description: 'Command center and quick jump pathways' },
      { id: 'export_center', label: 'Export Center (PBIP/Excel)', icon: FolderDown, description: 'Download production ZIP packages' },
      { id: 'how_to_use', label: 'Module Playbook & Guide', icon: BookOpen, description: 'Comprehensive architectural docs' },
      { id: 'how_to_modify', label: 'How to Modify Project', icon: FileCode2, description: 'Technical extension & deployment guide' },
      { id: 'blog', label: 'Knowledge Base / Blog', icon: BookOpen, description: 'Technical whitepapers and articles' },
      { id: 'settings', label: 'System Settings & Flags', icon: Settings, description: 'Theme, flags, experiments, and quotas' },
    ]
  }
];

import { APP_VERSION_LABEL } from '../../config/appVersion';

export const GroupedSidebar: React.FC = () => {
  const { currentTab, setCurrentTab, isSidebarOpen, setIsSidebarOpen, isPresentationMode } = usePlatform();
  const [flags, setFlags] = useState(() => loadFeatureFlags());
  const brandName = getBrandText('primary', flags);
  const asideRef = React.useRef<HTMLElement | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const handleFlags = (e: any) => setFlags(e.detail || loadFeatureFlags());
    window.addEventListener('dataanalytix:features-updated', handleFlags);
    return () => window.removeEventListener('dataanalytix:features-updated', handleFlags);
  }, []);

  // Keep track of which groups are expanded (default: all open)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => ({}));

  const restoreMobileMenuFocus = React.useCallback(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
    requestAnimationFrame(() => {
      const toggleBtn = document.querySelector<HTMLElement>('[data-testid="mobile-menu-toggle"]');
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
        ).filter(el => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !asideRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !asideRef.current.contains(document.activeElement)) {
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

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <>
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
        aria-label="Workflow Navigation"
        className="fixed inset-y-0 lg:static top-0 lg:top-auto left-0 z-50 lg:z-30 w-72 max-w-[85vw] lg:w-64 shrink-0 bg-sidebar border-r border-subtle flex flex-col h-full max-h-full text-secondary select-none overflow-hidden shadow-lg"
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-subtle flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-on-accent font-bold text-sm shadow-md shrink-0">
              DA
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-primary tracking-tight leading-none truncate">{brandName}</div>
              <div className="text-[10px] text-accent font-mono mt-0.5">Workflow Studio</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-accent-soft border border-subtle text-accent">
              5 STAGES
            </span>
            <button
              type="button"
              onClick={handleCloseDrawer}
              aria-label="Close Navigation Drawer"
              className="lg:hidden min-w-[44px] min-h-[44px] p-2 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-input"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Workflow Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {WORKFLOW_GROUPS.map((group) => {
            const isCollapsed = collapsedGroups[group.id];
            const hasActiveChild = group.items.some(item => item.id === currentTab);

            return (
              <div key={group.id} className="rounded-xl border border-subtle bg-card overflow-hidden">
                {/* Group Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isCollapsed}
                  className={`w-full min-h-[44px] lg:min-h-0 px-3 py-2 flex items-center justify-between text-left transition-colors ${
                    hasActiveChild ? 'bg-accent-soft text-accent' : 'hover:bg-card-hover text-muted hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-elevated text-muted shrink-0">
                      {group.stageNumber}
                    </span>
                    <span className="text-xs font-bold tracking-tight text-primary min-w-0 truncate" title={group.title}>
                      {group.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {group.badge && (
                      <span className="shrink-0 ml-2 text-[9px] font-medium px-1.5 py-0.2 rounded bg-elevated text-muted">
                        {group.badge}
                      </span>
                    )}
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
                    )}
                  </div>
                </button>

                {/* Group Items */}
                {!isCollapsed && (
                  <div className="p-1 space-y-0.5 border-t border-subtle">
                    {group.items
                      .filter(item => item.id !== 'analytics_packs' || flags.analyticsPacks)
                      .map((item) => {
                      const isActive = currentTab === item.id;
                      const Icon = item.icon;

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          title={`${item.label} — ${item.description}`}
                          aria-label={item.label}
                          aria-current={isActive ? 'page' : undefined}
                          className={`w-full min-h-[44px] lg:min-h-0 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-left min-w-0 ${
                            isActive
                              ? 'bg-accent text-on-accent font-semibold shadow-xs'
                              : 'text-muted hover:text-primary hover:bg-card-hover'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-on-accent' : 'text-muted'}`} />
                          <span className="min-w-0 truncate" title={item.label}>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom User / Status Bar */}
        <div className="p-3 border-t border-subtle bg-sidebar text-[11px] text-muted flex items-center justify-between">
          <span>v2.4 Enterprise</span>
          <button
            type="button"
            onClick={() => handleSelectTab('settings')}
            className="min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 flex items-center justify-center hover:text-primary transition-colors"
            title="Open Settings"
            aria-label="Open Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
