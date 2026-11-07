import type { NavigationTab } from '../store/usePlatformStore';

export const TAB_TO_HASH_MAP: Record<NavigationTab, string> = {
  landing: 'welcome',
  executive_dashboard: 'dashboard',
  how_to_use: 'guide',
  upload: 'upload',
  live_connector: 'live-data',
  preview: 'data-preview',
  quality: 'quality-auditor',
  cleaning: 'cleaning-lab',
  modeling: 'data-modeling',
  data_engineering: 'pipeline-dag',
  excel_automation: 'excel-studio',
  analysis: 'deep-analysis',
  dax_lab: 'dax-studio',
  sql_lab: 'sql-workbench',
  python_lab: 'python-sandbox',
  dashboard_builder: 'dashboard-builder',
  ai_insights: 'ask-data-ai',
  reports: 'executive-reports',
  data_dictionary: 'governance',
  export_center: 'export-center',
  how_to_modify: 'architecture',
  settings: 'settings',
  blog: 'changelog',
  pricing: 'pricing',
  workspaces: 'workspaces'
};

export const HASH_TO_TAB_MAP: Record<string, NavigationTab> = Object.entries(TAB_TO_HASH_MAP).reduce(
  (acc, [tab, hash]) => {
    acc[hash] = tab as NavigationTab;
    return acc;
  },
  {} as Record<string, NavigationTab>
);

export function updateHashForTab(tab: NavigationTab): void {
  const hash = TAB_TO_HASH_MAP[tab] || 'dashboard';
  if (typeof window !== 'undefined' && window.location.hash !== `#/${hash}`) {
    window.location.hash = `#/${hash}`;
  }
}

export function getTabFromCurrentHash(fallback: NavigationTab = 'executive_dashboard'): NavigationTab {
  if (typeof window === 'undefined') return fallback;
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  return HASH_TO_TAB_MAP[hash] || fallback;
}
