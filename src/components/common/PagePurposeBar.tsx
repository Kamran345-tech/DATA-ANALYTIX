import React from 'react';
import { usePlatform } from '../../store/usePlatformStore';
import { loadFeatureFlags } from '../../config/features';
import { LayoutDashboard, Layers, Grid, FileText, ArrowRight, Info } from 'lucide-react';

export type PurposePageId =
  | 'executive_dashboard'
  | 'analytics_packs'
  | 'dashboard_builder'
  | 'reports';

interface PagePurposeInfo {
  id: PurposePageId;
  title: string;
  purpose: string;
  navTarget: PurposePageId;
  icon: React.ComponentType<{ className?: string }>;
}

export const PAGE_PURPOSE_MAP: Record<PurposePageId, PagePurposeInfo> = {
  executive_dashboard: {
    id: 'executive_dashboard',
    title: 'Executive Dashboard',
    purpose: 'Board view of the CURRENT dataset (auto-built, read-only).',
    navTarget: 'executive_dashboard',
    icon: LayoutDashboard,
  },
  analytics_packs: {
    id: 'analytics_packs',
    title: 'Analytics Packs',
    purpose: 'Domain dashboards, KPIs, and reports (Finance, HR, Supply Chain, and 11 more).',
    navTarget: 'analytics_packs',
    icon: Layers,
  },
  dashboard_builder: {
    id: 'dashboard_builder',
    title: 'Dashboard Builder',
    purpose: 'Custom composition workspace (add, resize, and remove visuals).',
    navTarget: 'dashboard_builder',
    icon: Grid,
  },
  reports: {
    id: 'reports',
    title: 'Executive Reports',
    purpose: 'Report and presentation center (board decks, PDF briefs, and narratives).',
    navTarget: 'reports',
    icon: FileText,
  },
};

interface PagePurposeBarProps {
  page: PurposePageId;
}

export const PagePurposeBar: React.FC<PagePurposeBarProps> = ({ page }) => {
  const { setCurrentTab } = usePlatform();
  const flags = loadFeatureFlags();

  if (!flags.unifiedTheme && !flags.depthUI && !flags.analyticsPacks) {
    return null;
  }

  const current = PAGE_PURPOSE_MAP[page];
  const relatedPages = (Object.values(PAGE_PURPOSE_MAP) as PagePurposeInfo[]).filter(
    (item) => item.id !== page && (item.id !== 'analytics_packs' || flags.analyticsPacks)
  );

  return (
    <div
      data-testid={`page-purpose-bar-${page}`}
      aria-label={`Page purpose: ${current.title}`}
      className="mb-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/90 px-3.5 py-2.5 shadow-xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2"
    >
      <div className="flex items-start sm:items-center gap-2 min-w-0">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[10px] font-mono uppercase tracking-wider text-accent shrink-0">
          <Info className="w-3 h-3" />
          What this page is for
        </span>
        <p
          data-testid="page-purpose-subtitle"
          className="text-xs sm:text-sm font-sans text-primary font-medium leading-snug"
        >
          {current.purpose}
        </p>
      </div>

      <div
        data-testid="page-purpose-related"
        className="flex items-center flex-wrap gap-1.5 text-[11px] shrink-0"
      >
        <span className="text-muted font-mono uppercase tracking-wider text-[10px] mr-0.5">
          Related:
        </span>
        {relatedPages.map((rel) => {
          const Icon = rel.icon;
          return (
            <button
              key={rel.id}
              type="button"
              data-testid={`purpose-related-link-${rel.id}`}
              onClick={() => setCurrentTab(rel.navTarget)}
              title={rel.purpose}
              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:border-accent/40 text-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5 text-[11px] font-medium cursor-pointer"
            >
              <Icon className="w-3 h-3 text-accent shrink-0" />
              <span>{rel.title}</span>
              <ArrowRight className="w-2.5 h-2.5 text-muted" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
