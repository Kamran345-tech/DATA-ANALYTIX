import React, { useState } from 'react';
import {
  UploadCloud,
  Wand2,
  Layers,
  LayoutDashboard,
  FileText,
  MoreHorizontal,
  X,
  Settings,
  ShieldAlert,
  Database,
  Cpu,
  SlidersHorizontal,
  Sparkles,
  BookOpen,
  FolderDown,
  TrendingUp,
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';
import { loadFeatureFlags } from '../../config/features';

/**
 * Compact Mobile Bottom Navigation Bar (< 1024px) for the most-used pages (Phase 3.7).
 * Height is capped at 56px (<7% of 812px viewport) with >=44px touch targets.
 */
export const ModernMobileBottomNav: React.FC = () => {
  const { currentTab, setCurrentTab } = usePlatform();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const flags = loadFeatureFlags();

  const primaryTabs: {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'upload', label: 'Upload', icon: UploadCloud },
    { id: 'cleaning', label: 'Clean', icon: Wand2 },
    {
      id: flags.analyticsPacks ? 'analytics_packs' : 'analysis',
      label: flags.analyticsPacks ? 'Packs' : 'Analyze',
      icon: flags.analyticsPacks ? Layers : TrendingUp,
    },
    { id: 'executive_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const drawerTabs: {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'ai_insights', label: 'Ask Your Data AI', icon: Sparkles },
    { id: 'export_center', label: 'Export Center', icon: FolderDown },
    { id: 'quality', label: 'Data Quality Auditor', icon: ShieldAlert },
    { id: 'dashboard_builder', label: 'Dashboard Builder', icon: SlidersHorizontal },
    { id: 'analysis', label: 'Statistical Analysis', icon: TrendingUp },
    { id: 'sql_lab', label: 'SQL Lab', icon: Database },
    { id: 'dax_lab', label: 'DAX Lab', icon: Cpu },
    { id: 'how_to_use', label: 'How to Use Platform', icon: BookOpen },
    { id: 'settings', label: 'Settings & Branding', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Sticky Bottom Bar (< 768px) */}
      <nav
        role="navigation"
        aria-label="Mobile Navigation Bar"
        data-testid="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-card/95 backdrop-blur-md border-t border-subtle px-1.5 flex items-center justify-around shadow-lg"
      >
        {primaryTabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`mobile-bottom-tab-${tab.id}`}
              onClick={() => setCurrentTab(tab.id)}
              aria-label={`Mobile nav: ${tab.label}`}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] rounded-xl px-1.5 text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'text-accent font-bold bg-accent-soft'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-[58px] leading-none">{tab.label}</span>
            </button>
          );
        })}

        {/* More Drawer Button */}
        <button
          type="button"
          data-testid="mobile-bottom-more-btn"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open More Modules Drawer"
          aria-expanded={isDrawerOpen}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] rounded-xl px-1.5 text-xs font-medium transition-colors cursor-pointer ${
            isDrawerOpen
              ? 'text-accent font-bold bg-accent-soft'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <MoreHorizontal className="w-4 h-4 shrink-0" />
          <span className="leading-none">More</span>
        </button>
      </nav>

      {/* Slide-Up Drawer for Additional Views */}
      {isDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Additional Modules"
          data-testid="mobile-bottom-more-drawer"
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="bg-card border-t border-subtle rounded-t-2xl p-5 space-y-4 max-h-[72vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-subtle">
              <span className="text-sm font-bold text-primary">All Analytical Modules</span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="min-w-[44px] min-h-[44px] p-2 rounded-lg text-secondary hover:text-primary flex items-center justify-center cursor-pointer"
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
                    type="button"
                    data-testid={`mobile-more-item-${item.id}`}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all min-h-[44px] cursor-pointer ${
                      isActive
                        ? 'border-subtle bg-accent text-on-accent font-bold'
                        : 'border-subtle bg-input text-primary hover:bg-elevated'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-on-accent' : 'text-accent'}`} />
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
