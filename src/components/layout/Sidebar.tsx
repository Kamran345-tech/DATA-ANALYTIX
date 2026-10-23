import React from 'react';
import { 
  Home, 
  LayoutDashboard, 
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
  Wrench, 
  Settings, 
  Newspaper,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';
import { Tooltip } from '../common/Tooltip';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description: string;
  proTip?: string;
  categoryTag?: string;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'CORE PLATFORM',
    items: [
      { 
        id: 'landing', 
        label: 'Home / Overview', 
        icon: Home,
        description: 'Command center with dataset health indicators, active table metrics, and quick jump pathways.',
        proTip: 'Click any metric card to jump directly to that module.',
        categoryTag: 'Launchpad'
      },
      { 
        id: 'executive_dashboard', 
        label: 'Executive Dashboard', 
        icon: LayoutDashboard, 
        badge: 'Auto',
        description: 'Real-time executive telemetry with Net Sales, Gross Margin, Unit Volumes, AI directives, and drill-through.',
        proTip: 'Click any KPI card to open raw transactional drill-through records.',
        categoryTag: 'Monitoring'
      },
      { 
        id: 'how_to_use', 
        label: 'How to Use Platform', 
        icon: HelpCircle, 
        badge: 'Guide',
        description: 'Comprehensive step-by-step interactive documentation and operational workflows for every module.',
        proTip: 'Follow the enterprise guides for rapid analyst onboarding.',
        categoryTag: 'Docs'
      },
      { 
        id: 'dashboard_builder', 
        label: 'Dashboard Builder', 
        icon: SlidersHorizontal,
        description: 'Interactive canvas to assemble customized C-suite views, chart widgets, and executive scorecards.',
        proTip: 'Rearrange cards and export clean presentations.',
        categoryTag: 'Customizer'
      }
    ]
  },
  {
    title: 'DATA INGESTION & PIPELINE',
    items: [
      { 
        id: 'upload', 
        label: 'Upload Data', 
        icon: UploadCloud,
        description: 'Drag & drop CSV, Excel (.xlsx), or JSON files with automated type parsing and enterprise demo datasets.',
        proTip: 'Switch between enterprise demo datasets to test various schemas.',
        categoryTag: 'Ingest'
      },
      { 
        id: 'live_connector', 
        label: 'Live Server & DB', 
        icon: Database, 
        badge: 'Live',
        description: 'Direct connection interface for REST APIs, Webhooks, PostgreSQL, MySQL, and cloud servers.',
        proTip: 'Simulates live polling and real-time event streaming.',
        categoryTag: 'Real-Time'
      },
      { 
        id: 'preview', 
        label: 'Data Preview & Profile', 
        icon: Table2,
        description: 'Tabular data inspector showing column types, null percentages, distinct cardinalities, and value distributions.',
        proTip: 'Use header filters to isolate specific record subsets.',
        categoryTag: 'Profiling'
      },
      { 
        id: 'quality', 
        label: 'Data Quality Auditor', 
        icon: ShieldAlert,
        description: 'Automated data hygiene engine that audits missing cells, duplicate rows, skewness, and data drift.',
        proTip: 'Aim for a quality score above 95% before building models.',
        categoryTag: 'Audit'
      },
      { 
        id: 'cleaning', 
        label: 'Data Cleaning Lab', 
        icon: Wand2,
        description: 'Interactive ETL workshop: fill nulls, trim whitespace, deduplicate rows, cap outliers, and cast data types.',
        proTip: 'All transformations are logged in an auditable pipeline with rollbacks.',
        categoryTag: 'ETL'
      },
      { 
        id: 'modeling', 
        label: 'Data Modeling (ERD)', 
        icon: Network, 
        badge: 'Star',
        description: 'Visual Star and Snowflake schema designer with automatic fact/dimension inference and relationship mapping.',
        proTip: 'Establishes primary/foreign keys for DAX tabular navigation.',
        categoryTag: 'Schema'
      }
    ]
  },
  {
    title: 'ANALYTICS & CODE LABS',
    items: [
      { 
        id: 'analysis', 
        label: 'Statistical Analysis', 
        icon: TrendingUp,
        description: 'Deep mathematical diagnostics: correlation heatmaps, bivariate regressions, and distribution curves.',
        proTip: 'Inspect p-values and regression coefficients to spot key drivers.',
        categoryTag: 'Statistics'
      },
      { 
        id: 'dax_lab', 
        label: 'DAX Lab', 
        icon: Code2,
        description: 'Power BI DAX calculation studio: write and test CALCULATE, FILTER, YTD, MoM, and custom measures live.',
        proTip: 'Copy tested DAX formulas straight into Power BI Desktop.',
        categoryTag: 'DAX'
      },
      { 
        id: 'sql_lab', 
        label: 'SQL Lab', 
        icon: Database, 
        badge: 'Live',
        description: 'In-browser ANSI SQL workbench to query your dataset using SELECT, GROUP BY, JOINs, and window functions.',
        proTip: 'Run instant aggregations without having to spin up a database server.',
        categoryTag: 'SQL'
      },
      { 
        id: 'python_lab', 
        label: 'Python Lab', 
        icon: FileCode2,
        description: 'In-browser Pandas execution playground for custom Python transformations and statistical summaries.',
        proTip: 'Export clean Python scripts to automate scheduled workflows.',
        categoryTag: 'Python'
      }
    ]
  },
  {
    title: 'DECISION & REPORTING',
    items: [
      { 
        id: 'ai_insights', 
        label: 'Ask Your Data AI', 
        icon: Sparkles, 
        badge: 'Grounded',
        description: 'Ask business questions in natural language and receive grounded insights citing specific dataset records.',
        proTip: 'Ask for causal drivers behind sales peaks or margin contractions.',
        categoryTag: 'AI Copilot'
      },
      { 
        id: 'reports', 
        label: 'Executive Reports', 
        icon: FileSpreadsheet,
        description: 'Automated executive deck generator: produce C-suite ready multi-page PDF documents in one click.',
        proTip: 'Includes executive summaries, KPI trends, and audit sign-offs.',
        categoryTag: 'PDF'
      },
      { 
        id: 'data_dictionary', 
        label: 'Data Dictionary & Lineage', 
        icon: BookOpen,
        description: 'Enterprise metadata catalog documenting every business term, column calculation, type, and source lineage.',
        proTip: 'Ensures common vocabulary across finance, ops, and analytics.',
        categoryTag: 'Governance'
      }
    ]
  },
  {
    title: 'PACKAGES & GOVERNANCE',
    items: [
      { 
        id: 'export_center', 
        label: 'Export Center (ZIP)', 
        icon: FolderDown, 
        badge: 'PBIP',
        description: 'Download full Power BI .PBIP project folders, cleaned CSV datasets, and DAX measure scripts.',
        proTip: 'Unzip and double-click the .pbip file to open directly in Power BI Desktop.',
        categoryTag: 'Export'
      },
      { 
        id: 'how_to_modify', 
        label: 'How to Modify Project', 
        icon: Wrench,
        description: 'Technical architecture guide showing how to extend schemas, customize charts, and deploy to production.',
        proTip: 'Learn the platform state model and modular component pattern.',
        categoryTag: 'Developer'
      },
      { 
        id: 'settings', 
        label: 'Settings & Branding', 
        icon: Settings,
        description: 'Platform configuration: toggle light/dark modes, organization branding, and telemetry preferences.',
        proTip: 'Customize your company name and currency symbols.',
        categoryTag: 'Config'
      },
      { 
        id: 'blog', 
        label: 'Knowledge Base / Blog', 
        icon: Newspaper,
        description: 'Technical whitepapers and articles on modern data modeling, DAX performance, and BI engineering.',
        proTip: 'Read best practices for optimizing large-scale enterprise models.',
        categoryTag: 'Articles'
      }
    ]
  }
];

export const Sidebar: React.FC = () => {
  const { currentTab, setCurrentTab, isSidebarOpen, setIsSidebarOpen, isPresentationMode, themeMode } = usePlatform();
  const isLight = themeMode === 'light';

  if (isPresentationMode || !isSidebarOpen) {
    return null;
  }

  const handleSelectTab = (id: NavigationTab) => {
    setCurrentTab(id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        onClick={() => setIsSidebarOpen(false)}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        aria-hidden="true"
      />

      <aside className={`fixed inset-y-0 lg:static top-0 lg:top-auto left-0 z-50 lg:z-30 w-72 lg:w-64 flex flex-col h-full max-h-full overflow-y-auto select-none shrink-0 shadow-2xl lg:shadow-none transition-all ${
        isLight
          ? 'bg-white border-r border-slate-200'
          : 'bg-[#141414] border-r border-[#262626]'
      }`}>
        {/* Mobile Header with Close button */}
        <div className={`flex lg:hidden items-center justify-between p-4 border-b ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-[#262626] bg-[#141414]'
        }`}>
          <span className={`font-heading text-lg font-bold tracking-wider ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            ACUITY<span className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>BI</span> NAVIGATION
          </span>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className={`p-1.5 rounded-lg ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-gray-400 hover:text-white hover:bg-[#222]'
            }`}
          >
            ✕
          </button>
        </div>

        <div className="p-3 space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h4 className={`px-3 text-[10px] font-bold tracking-wider uppercase font-mono ${
                isLight ? 'text-slate-400' : 'text-gray-400'
              }`}>
                {section.title}
              </h4>
              <div className="space-y-0.5 pt-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <Tooltip
                      key={item.id}
                      side="right"
                      title={item.label}
                      tag={item.badge || item.categoryTag}
                      content={
                        <div className="space-y-1.5">
                          <p>{item.description}</p>
                          {item.proTip && (
                            <div className={`pt-1.5 border-t text-[10px] font-mono flex items-start gap-1 ${
                              isLight ? 'border-slate-200 text-emerald-800' : 'border-gray-700/60 text-[#00F5A0]'
                            }`}>
                              <span className="shrink-0">💡</span>
                              <span>{item.proTip}</span>
                            </div>
                          )}
                        </div>
                      }
                    >
                      <button
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                          isActive 
                            ? isLight
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold shadow-2xs'
                              : 'bg-[#21F1A8]/10 text-[#21F1A8] border border-[#21F1A8]/30 font-semibold' 
                            : isLight
                              ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                              : 'text-gray-300 hover:text-white hover:bg-[#1f1f1f] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 transition-transform ${
                            isActive 
                              ? isLight ? 'text-emerald-700' : 'text-[#21F1A8]' 
                              : isLight ? 'text-slate-500 group-hover:text-slate-900' : 'text-gray-400 group-hover:text-gray-200'
                          }`} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                              isActive 
                                ? isLight
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-[#21F1A8] text-black' 
                                : isLight
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : 'bg-[#262626] text-gray-400 border border-[#333]'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                          {isActive && (
                            <ChevronRight className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
                          )}
                        </div>
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-auto p-3 border-t ${
          isLight
            ? 'border-slate-200 bg-slate-50/80 text-slate-600'
            : 'border-[#262626] bg-[#121212]/80 text-gray-400'
        }`}>
          <div className="flex items-center justify-between text-[11px]">
            <span>Engine Status</span>
            <span className={`flex items-center gap-1 font-mono font-medium ${
              isLight ? 'text-emerald-700' : 'text-[#21F1A8]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                isLight ? 'bg-emerald-600' : 'bg-[#21F1A8]'
              }`}></span>
              Deterministic Online
            </span>
          </div>

          {/* Subtle Developer & Company Signature */}
          <div className={`mt-2.5 pt-2 border-t flex flex-col gap-0.5 text-[10px] ${
            isLight ? 'border-slate-200/80' : 'border-[#262626]'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-mono ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Developed by:</span>
              <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>Kamran Badar</span>
            </div>
            <div className={`text-[9px] text-right truncate font-mono ${
              isLight ? 'text-slate-400' : 'text-gray-500'
            }`}>
              Badar Analytics Technologies
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
