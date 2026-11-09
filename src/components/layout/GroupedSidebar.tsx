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
      { id: 'dashboard_builder', label: 'Custom Dashboard Builder', icon: SlidersHorizontal, description: 'Compose customized visual layouts' },
      { id: 'analysis', label: 'Deep Statistical Analysis', icon: TrendingUp, description: 'Correlations, anomalies, and distributions' },
      { id: 'ai_insights', label: 'Ask Data AI', icon: Sparkles, description: 'Natural language questions grounded in metrics' },
      { id: 'reports', label: 'Executive PDF Reports', icon: FileSpreadsheet, description: 'Print-ready board decks and summaries' },
    ]
  },
  {
    id: 'stage_5_export',
    title: '5. Export & Settings',
    stageNumber: '05',
    badge: 'Artifacts',
    items: [
      { id: 'export_center', label: 'Export Center (PBIP/Excel)', icon: FolderDown, description: 'Download production ZIP packages' },
      { id: 'how_to_use', label: 'Module Playbook & Guide', icon: BookOpen, description: 'Comprehensive architectural docs' },
      { id: 'settings', label: 'System Settings & Flags', icon: Settings, description: 'Theme, flags, experiments, and quotas' },
    ]
  }
];

export const GroupedSidebar: React.FC = () => {
  const { currentTab, setCurrentTab } = usePlatform();
  const flags = loadFeatureFlags();
  const brandName = getBrandText('primary', flags);

  // Keep track of which groups are expanded (default: group containing currentTab, or all open)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    // By default, expand all stages so navigation is effortless
    return {};
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <aside 
      aria-label="Workflow Navigation"
      className="w-64 shrink-0 bg-sidebar border-r border-subtle flex flex-col h-full text-secondary select-none overflow-hidden"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            DA
          </div>
          <div>
            <div className="font-bold text-sm text-primary tracking-tight leading-none">{brandName}</div>
            <div className="text-[10px] text-accent font-mono mt-0.5">Workflow Studio</div>
          </div>
        </div>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-accent-soft border border-subtle text-accent">
          5 STAGES
        </span>
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
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!isCollapsed}
                className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors ${
                  hasActiveChild ? 'bg-accent-soft text-accent' : 'hover:bg-card-hover text-muted hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-elevated text-muted">
                    {group.stageNumber}
                  </span>
                  <span className="text-xs font-bold tracking-tight text-primary">
                    {group.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {group.badge && (
                    <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-elevated text-muted">
                      {group.badge}
                    </span>
                  )}
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                  )}
                </div>
              </button>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="p-1 space-y-0.5 border-t border-subtle">
                  {group.items.map((item) => {
                    const isActive = currentTab === item.id;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentTab(item.id)}
                        title={item.description}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                          isActive
                            ? 'bg-accent text-on-accent font-semibold shadow-xs'
                            : 'text-muted hover:text-primary hover:bg-card-hover'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-on-accent' : 'text-muted'}`} />
                        <span className="truncate">{item.label}</span>
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
          onClick={() => setCurrentTab('settings')}
          className="hover:text-primary transition-colors"
          title="Open Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
