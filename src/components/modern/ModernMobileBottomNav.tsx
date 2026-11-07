import React, { useState } from 'react';
import { 
  UploadCloud, 
  TrendingUp, 
  LayoutDashboard, 
  FolderDown, 
  MoreHorizontal,
  X,
  Settings,
  ShieldAlert,
  Database,
  Cpu,
  SlidersHorizontal,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';

export const ModernMobileBottomNav: React.FC = () => {
  const { currentTab, setCurrentTab } = usePlatform();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const primaryTabs: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'upload', label: 'Data', icon: UploadCloud },
    { id: 'analysis', label: 'Analyze', icon: TrendingUp },
    { id: 'executive_dashboard', label: 'Build', icon: LayoutDashboard },
    { id: 'export_center', label: 'Export', icon: FolderDown },
  ];

  const drawerTabs: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'quality', label: 'Quality Auditor', icon: ShieldAlert },
    { id: 'modeling', label: 'Star Schema', icon: LayoutDashboard },
    { id: 'sql_lab', label: 'SQL Workbench', icon: Database },
    { id: 'dax_lab', label: 'DAX Studio', icon: Cpu },
    { id: 'dashboard_builder', label: 'Dashboard Builder', icon: SlidersHorizontal },
    { id: 'ai_insights', label: 'Ask Data AI', icon: Sparkles },
    { id: 'how_to_use', label: 'Documentation', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Sticky Bottom Bar (< 768px) */}
      <nav 
        role="navigation"
        aria-label="Mobile Navigation Bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--modern-bg-surface)] border-t border-[var(--modern-border)] px-2 py-1.5 flex items-center justify-around shadow-lg"
      >
        {primaryTabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] rounded-lg px-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-[var(--modern-primary)] font-bold'
                  : 'text-[var(--modern-text-muted)] hover:text-[var(--modern-text)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* More Drawer Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open More Modules Drawer"
          className={`flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] rounded-lg px-2 text-[10px] font-medium transition-colors ${
            isDrawerOpen
              ? 'text-[var(--modern-primary)] font-bold'
              : 'text-[var(--modern-text-muted)] hover:text-[var(--modern-text)]'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>

      {/* Slide-Up Drawer for Additional Views */}
      {isDrawerOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Additional Modules"
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div 
            className="bg-[var(--modern-bg-surface)] border-t border-[var(--modern-border)] rounded-t-2xl p-5 space-y-4 max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--modern-border)]">
              <span className="text-sm font-bold text-[var(--modern-text)]">All Analytical Modules</span>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-md text-[var(--modern-text-muted)] hover:text-[var(--modern-text)]"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {drawerTabs.map((item) => {
                const isActive = currentTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all min-h-[44px] ${
                      isActive
                        ? 'border-[var(--modern-primary)] bg-[var(--modern-primary-muted)] text-[var(--modern-primary)] font-bold'
                        : 'border-[var(--modern-border)] bg-[var(--modern-bg-surface-2)] text-[var(--modern-text)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-[var(--modern-primary)]" />
                    <span className="text-xs truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
