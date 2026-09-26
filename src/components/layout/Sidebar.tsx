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
  ChevronRight
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'CORE PLATFORM',
    items: [
      { id: 'landing', label: 'Home / Overview', icon: Home },
      { id: 'executive_dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, badge: 'Auto' },
      { id: 'dashboard_builder', label: 'Dashboard Builder', icon: SlidersHorizontal }
    ]
  },
  {
    title: 'DATA INGESTION & PIPELINE',
    items: [
      { id: 'upload', label: 'Upload Data', icon: UploadCloud },
      { id: 'preview', label: 'Data Preview & Profile', icon: Table2 },
      { id: 'quality', label: 'Data Quality Auditor', icon: ShieldAlert },
      { id: 'cleaning', label: 'Data Cleaning Lab', icon: Wand2 },
      { id: 'modeling', label: 'Data Modeling (ERD)', icon: Network, badge: 'Star' }
    ]
  },
  {
    title: 'ANALYTICS & CODE LABS',
    items: [
      { id: 'analysis', label: 'Statistical Analysis', icon: TrendingUp },
      { id: 'dax_lab', label: 'DAX Lab', icon: Code2 },
      { id: 'sql_lab', label: 'SQL Lab', icon: Database, badge: 'Live' },
      { id: 'python_lab', label: 'Python Lab', icon: FileCode2 }
    ]
  },
  {
    title: 'DECISION & REPORTING',
    items: [
      { id: 'ai_insights', label: 'Ask Your Data AI', icon: Sparkles, badge: 'Grounded' },
      { id: 'reports', label: 'Executive Reports', icon: FileSpreadsheet },
      { id: 'data_dictionary', label: 'Data Dictionary & Lineage', icon: BookOpen }
    ]
  },
  {
    title: 'PACKAGES & GOVERNANCE',
    items: [
      { id: 'export_center', label: 'Export Center (ZIP)', icon: FolderDown, badge: 'PBIP' },
      { id: 'how_to_modify', label: 'How to Modify Project', icon: Wrench },
      { id: 'settings', label: 'Settings & Branding', icon: Settings },
      { id: 'blog', label: 'Knowledge Base / Blog', icon: Newspaper }
    ]
  }
];

export const Sidebar: React.FC = () => {
  const { currentTab, setCurrentTab, isSidebarOpen, isPresentationMode } = usePlatform();

  if (isPresentationMode || !isSidebarOpen) {
    return null;
  }

  return (
    <aside className="w-64 bg-[#141414] border-r border-[#262626] flex flex-col h-[calc(100vh-53px)] sticky top-[53px] overflow-y-auto select-none shrink-0 transition-all">
      <div className="p-3 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold tracking-wider text-gray-400 uppercase font-mono">
              {section.title}
            </h4>
            <div className="space-y-0.5 pt-1">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                      isActive 
                        ? 'bg-[#21F1A8]/10 text-[#21F1A8] border border-[#21F1A8]/30 font-semibold' 
                        : 'text-gray-300 hover:text-white hover:bg-[#1f1f1f] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-[#21F1A8]' : 'text-gray-400 group-hover:text-gray-200'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                          isActive 
                            ? 'bg-[#21F1A8] text-black' 
                            : 'bg-[#262626] text-gray-400 border border-[#333]'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3 h-3 text-[#21F1A8]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto p-3 border-t border-[#262626] bg-[#121212]/80">
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>Engine Status</span>
          <span className="flex items-center gap-1 text-[#21F1A8] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#21F1A8] animate-pulse"></span>
            Deterministic Online
          </span>
        </div>
      </div>
    </aside>
  );
};
