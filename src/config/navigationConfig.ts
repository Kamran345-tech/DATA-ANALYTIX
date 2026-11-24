import React, { useState, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  Database,
  Table2,
  ShieldAlert,
  Wand2,
  BookOpen,
  Layers,
  TrendingUp,
  Code2,
  FileCode2,
  Cpu,
  Network,
  FileSpreadsheet,
  LayoutDashboard,
  SlidersHorizontal,
  Sparkles,
  FileText,
  FolderDown,
  HelpCircle,
  Newspaper,
  Settings,
  Home,
  Wrench,
} from 'lucide-react';
import type { NavigationTab } from '../store/usePlatformStore';

export type WorkflowGroupId = 'upload' | 'clean' | 'analyze' | 'present' | 'help_settings';

export interface WorkflowNavItem {
  id: NavigationTab;
  label: string;
  shortBadge?: string;
  icon: React.ComponentType<{ className?: string }>;
  purpose: string;
  proTip?: string;
  keywords: string[];
  groupId: WorkflowGroupId;
}

export interface WorkflowNavGroup {
  id: WorkflowGroupId;
  title: string;
  stepperLabel: string;
  stageNum: string;
  defaultTab: NavigationTab;
  items: WorkflowNavItem[];
}

export const DEFAULT_PINNED_TABS: readonly NavigationTab[] = [
  'upload',
  'analytics_packs',
  'executive_dashboard',
  'reports',
] as const;

export const MAX_PINNED_TABS = 6;

const LEGACY_NAV_MODE_KEY = 'dataanalytix_nav_mode';
const PINNED_TABS_KEY = 'dataanalytix_pinned_tabs';
const RECENT_TABS_KEY = 'dataanalytix_recent_tabs';
const ACCORDION_STATE_KEY = 'dataanalytix_sidebar_accordion_v1';

/**
 * Migration: deletes the obsolete `dataanalytix_nav_mode` key from localStorage.
 */
export function migrateLegacyNavMode(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (window.localStorage.getItem(LEGACY_NAV_MODE_KEY) !== null) {
        window.localStorage.removeItem(LEGACY_NAV_MODE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }
}

// Run migration immediately on module load
migrateLegacyNavMode();

/**
 * Canonical Workflow Groups matching the top GuidedWorkflowStepper:
 * 1 Upload, 2 Clean, 3 Analyze, 4 Present, Help & Settings.
 * Every platform page is organized here — nothing is hidden.
 */
export const WORKFLOW_SIDEBAR_GROUPS: readonly WorkflowNavGroup[] = [
  {
    id: 'upload',
    title: '1 Upload',
    stepperLabel: '1 Upload',
    stageNum: '1',
    defaultTab: 'upload',
    items: [
      {
        id: 'upload',
        label: 'Upload Data',
        icon: UploadCloud,
        purpose: 'Ingest CSV, Excel (.xlsx), or JSON files with automatic schema & pack detection.',
        proTip: 'Drop any file or try a 1-click enterprise sample dataset.',
        keywords: ['upload', 'ingest', 'csv', 'excel', 'xlsx', 'json', 'import', 'file'],
        groupId: 'upload',
      },
      {
        id: 'live_connector',
        label: 'Live Server & DB',
        shortBadge: 'LIVE',
        icon: Database,
        purpose: 'Connect REST APIs, PostgreSQL, MySQL, or live database telemetry streams.',
        proTip: 'Test read-only queries or stream live demo profiles.',
        keywords: ['live', 'server', 'db', 'database', 'postgres', 'mysql', 'api', 'stream'],
        groupId: 'upload',
      },
      {
        id: 'preview',
        label: 'Data Preview & Profile',
        icon: Table2,
        purpose: 'Inspect raw and cleaned rows, column data types, null ratios, and semantic roles.',
        proTip: 'Verify how the engine understood your columns and grain.',
        keywords: ['preview', 'profile', 'table', 'rows', 'columns', 'schema', 'inspect'],
        groupId: 'upload',
      },
    ],
  },
  {
    id: 'clean',
    title: '2 Clean',
    stepperLabel: '2 Clean',
    stageNum: '2',
    defaultTab: 'cleaning',
    items: [
      {
        id: 'quality',
        label: 'Data Quality Auditor',
        icon: ShieldAlert,
        purpose: 'Audit missing values, duplicate rows, outliers, and 4D data hygiene scores.',
        proTip: 'Click "Fix Now" on any finding to jump to the exact cleaning recipe.',
        keywords: ['quality', 'auditor', 'hygiene', 'nulls', 'duplicates', 'outliers', 'score'],
        groupId: 'clean',
      },
      {
        id: 'cleaning',
        label: 'Data Cleaning Lab',
        icon: Wand2,
        purpose: 'Apply 1-click deterministic cleaning recipes with live hygiene score delta.',
        proTip: 'All transformations are logged in an auditable pipeline with undo.',
        keywords: ['clean', 'cleaning', 'etl', 'transform', 'fix', 'deduplicate', 'trim'],
        groupId: 'clean',
      },
      {
        id: 'data_dictionary',
        label: 'Data Dictionary',
        icon: BookOpen,
        purpose: 'Enterprise metadata catalog documenting column definitions, types, and lineage.',
        proTip: 'Export the governance catalog to Markdown, CSV, or PDF.',
        keywords: ['dictionary', 'lineage', 'catalog', 'metadata', 'governance', 'glossary'],
        groupId: 'clean',
      },
    ],
  },
  {
    id: 'analyze',
    title: '3 Analyze',
    stepperLabel: '3 Analyze',
    stageNum: '3',
    defaultTab: 'analytics_packs',
    items: [
      {
        id: 'analytics_packs',
        label: 'Analytics Packs',
        shortBadge: '14 PACKS',
        icon: Layers,
        purpose: '14 domain-specific dashboards, KPIs, 4 analytical lenses, and 13-slide PPTX decks.',
        proTip: 'Open any pack with sample data or map your own dataset columns.',
        keywords: ['packs', 'domain', 'finance', 'sales', 'hr', 'retail', 'operations', 'kpis'],
        groupId: 'analyze',
      },
      {
        id: 'analysis',
        label: 'Statistical Analysis',
        icon: TrendingUp,
        purpose: 'Correlation matrices, regression, cohort retention, funnel, A/B tests, and Pareto.',
        proTip: 'Inspect p-values and regression fit to spot key business drivers.',
        keywords: ['statistical', 'analysis', 'correlation', 'regression', 'cohort', 'ab', 'pareto', 'rfm'],
        groupId: 'analyze',
      },
      {
        id: 'sql_lab',
        label: 'SQL Lab',
        shortBadge: 'LIVE',
        icon: Database,
        purpose: 'Execute ANSI SQL queries (SELECT, GROUP BY, JOIN, window functions) in-browser.',
        proTip: 'Run instant SQL aggregations without spinning up an external database.',
        keywords: ['sql', 'query', 'select', 'join', 'group by', 'workbench', 'alasql'],
        groupId: 'analyze',
      },
      {
        id: 'python_lab',
        label: 'Python Lab',
        icon: FileCode2,
        purpose: 'Run reproducible Python data science scripts and export Jupyter (.ipynb) notebooks.',
        proTip: 'Export clean Python scripts for scheduled analytics automation.',
        keywords: ['python', 'pandas', 'colab', 'jupyter', 'notebook', 'ipynb', 'script'],
        groupId: 'analyze',
      },
      {
        id: 'dax_lab',
        label: 'DAX Lab',
        icon: Cpu,
        purpose: 'Author and evaluate Power BI DAX measures including YTD, YoY, and variance.',
        proTip: 'Copy verified DAX measures straight into Power BI Desktop.',
        keywords: ['dax', 'power bi', 'measures', 'calculate', 'time intelligence', 'yoy'],
        groupId: 'analyze',
      },
      {
        id: 'modeling',
        label: 'Data Modeling (ERD)',
        icon: Network,
        purpose: 'Decompose flat tables into Star Schema Fact and Dimension tables with 1:N joins.',
        proTip: 'Establishes primary and foreign keys for Power BI PBIP export.',
        keywords: ['modeling', 'erd', 'star schema', 'fact', 'dimension', 'relationships'],
        groupId: 'analyze',
      },
      {
        id: 'data_engineering',
        label: 'ETL Pipeline',
        icon: Layers,
        purpose: 'Visual pipeline DAG lineage, dbt/Great Expectations quality tests, and SQL DDL.',
        proTip: 'Audit stage timings and export production dbt schema tests.',
        keywords: ['etl', 'pipeline', 'dag', 'data engineering', 'dbt', 'assertions', 'ddl'],
        groupId: 'analyze',
      },
      {
        id: 'excel_automation',
        label: 'Excel Automation',
        shortBadge: 'XLSX',
        icon: FileSpreadsheet,
        purpose: 'Generate dynamic Excel formulas (XLOOKUP, SUMIFS) and multi-tab .xlsx workbooks.',
        proTip: 'Download formatted Excel workbooks with live cell formulas.',
        keywords: ['excel', 'xlsx', 'spreadsheet', 'xlookup', 'formulas', 'workbook'],
        groupId: 'analyze',
      },
    ],
  },
  {
    id: 'present',
    title: '4 Present',
    stepperLabel: '4 Present',
    stageNum: '4',
    defaultTab: 'executive_dashboard',
    items: [
      {
        id: 'executive_dashboard',
        label: 'Executive Dashboard',
        shortBadge: 'AUTO',
        icon: LayoutDashboard,
        purpose: 'Board view of the active dataset with live KPIs, slicers, and row drill-through.',
        proTip: 'Click any KPI card to inspect its formula or drill into underlying rows.',
        keywords: ['executive', 'dashboard', 'kpi', 'telemetry', 'board', 'overview'],
        groupId: 'present',
      },
      {
        id: 'dashboard_builder',
        label: 'Dashboard Builder',
        icon: SlidersHorizontal,
        purpose: 'Compose custom chart widgets, use the 8-Chart Guide, and arrange bespoke layouts.',
        proTip: 'Use the Chart Guide to pick the right chart for your columns.',
        keywords: ['builder', 'custom', 'widgets', 'charts', 'canvas', 'compose'],
        groupId: 'present',
      },
      {
        id: 'ai_insights',
        label: 'Ask Data AI',
        icon: Sparkles,
        purpose: 'Ask business questions in natural language grounded strictly in dataset metrics.',
        proTip: 'Click any pack-aware prompt card for an instant verified analysis.',
        keywords: ['ask', 'ai', 'copilot', 'natural language', 'insights', 'questions'],
        groupId: 'present',
      },
      {
        id: 'reports',
        label: 'Executive Reports',
        icon: FileText,
        purpose: 'Generate C-suite multi-page PDF briefs, narrative summaries, and 13-slide PPTX decks.',
        proTip: 'Preview every slide or download an editable PowerPoint presentation.',
        keywords: ['reports', 'executive reports', 'pdf', 'pptx', 'slides', 'deck', 'brief'],
        groupId: 'present',
      },
      {
        id: 'export_center',
        label: 'Export Center',
        icon: FolderDown,
        purpose: 'Download complete Power BI (.pbip) projects, multi-sheet Excel, PDF, and ZIP bundles.',
        proTip: 'Unzip and open .pbip directly in Power BI Desktop.',
        keywords: ['export', 'download', 'zip', 'pbip', 'power bi', 'bundle', 'template'],
        groupId: 'present',
      },
    ],
  },
  {
    id: 'help_settings',
    title: 'Help & Settings',
    stepperLabel: 'Help & Settings',
    stageNum: '?',
    defaultTab: 'how_to_use',
    items: [
      {
        id: 'how_to_use',
        label: 'How to Use',
        icon: HelpCircle,
        purpose: 'Step-by-step interactive playbook, module directory, and replayable 3-step tour.',
        proTip: 'Replay the 3-step platform tour anytime from this page.',
        keywords: ['help', 'how to use', 'guide', 'manual', 'tour', 'onboarding', 'playbook'],
        groupId: 'help_settings',
      },
      {
        id: 'blog',
        label: 'Knowledge Base',
        icon: Newspaper,
        purpose: 'Technical playbooks on star-schema modeling, DAX performance, and release notes.',
        proTip: 'Read best practices for data hygiene and KPI storytelling.',
        keywords: ['knowledge base', 'blog', 'articles', 'whitepapers', 'changelog', 'docs'],
        groupId: 'help_settings',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        purpose: 'Configure light/dark theme, company branding, feature flags, and learned rules.',
        proTip: 'Inspect or reset your privacy-safe learned schema rules.',
        keywords: ['settings', 'branding', 'theme', 'dark', 'light', 'flags', 'preferences'],
        groupId: 'help_settings',
      },
      {
        id: 'landing',
        label: 'Home / Overview',
        icon: Home,
        purpose: 'Workspace command center with dataset health indicators and guided pathways.',
        proTip: 'Jump to any stage of the workflow from the command center.',
        keywords: ['home', 'overview', 'landing', 'launchpad', 'start'],
        groupId: 'help_settings',
      },
      {
        id: 'how_to_modify',
        label: 'How to Modify',
        icon: Wrench,
        purpose: 'Developer architecture guide for extending packs, tokens, and deployment.',
        proTip: 'Learn the modular component and pack registry architecture.',
        keywords: ['modify', 'developer', 'architecture', 'extend', 'code'],
        groupId: 'help_settings',
      },
    ],
  },
] as const;

export const ALL_WORKFLOW_NAV_ITEMS: readonly WorkflowNavItem[] = WORKFLOW_SIDEBAR_GROUPS.flatMap(
  (g) => g.items
);

export function findWorkflowGroupForTab(tabId: NavigationTab): WorkflowNavGroup {
  for (const group of WORKFLOW_SIDEBAR_GROUPS) {
    if (group.items.some((item) => item.id === tabId)) {
      return group;
    }
  }
  return WORKFLOW_SIDEBAR_GROUPS[3]; // default to 4 Present
}

function readStoredPinnedTabs(): NavigationTab[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [...DEFAULT_PINNED_TABS];
  }
  try {
    const raw = window.localStorage.getItem(PINNED_TABS_KEY);
    if (!raw) return [...DEFAULT_PINNED_TABS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_PINNED_TABS);
    }
  } catch {
    // ignore
  }
  return [...DEFAULT_PINNED_TABS];
}

function readStoredRecentTabs(): NavigationTab[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(RECENT_TABS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readStoredAccordionState(): Record<string, boolean> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(ACCORDION_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const SIDEBAR_COLLAPSED_KEY = 'dataanalytix_sidebar_collapsed_v1';

function readStoredSidebarCollapsed(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Shared Sidebar State Hook:
 * - Migrates & deletes legacy `dataanalytix_nav_mode`
 * - Manages Favorites / Pinned pages (star toggle, max 6, persisted in localStorage)
 * - Dispatches `dataanalytix:favorites-limit-reached` when user tries to add a 7th favorite
 * - Manages Recent pages (last 3, persisted in localStorage)
 * - Manages Collapsible Workflow Group accordion state (persisted in localStorage,
 *   with the group containing `currentTab` auto-expanded)
 * - Manages collapsed slim-rail state (`isSidebarCollapsed`)
 */
export function useSidebarNavState(currentTab?: NavigationTab) {
  useEffect(() => {
    migrateLegacyNavMode();
  }, []);

  const [pinnedTabs, setPinnedTabs] = useState<NavigationTab[]>(readStoredPinnedTabs);
  const [recentTabs, setRecentTabs] = useState<NavigationTab[]>(readStoredRecentTabs);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    readStoredAccordionState
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(
    readStoredSidebarCollapsed
  );

  // Sync across components via custom events
  useEffect(() => {
    const handleRecent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setRecentTabs(detail);
    };
    const handlePinned = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setPinnedTabs(detail);
    };
    const handleAccordion = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail === 'object') setCollapsedGroups(detail);
    };
    const handleCollapsed = (e: Event) => {
      const detail = Boolean((e as CustomEvent).detail);
      setIsSidebarCollapsed(detail);
    };
    const handleFocusGroup = (e: Event) => {
      const groupId = (e as CustomEvent)?.detail?.groupId as WorkflowGroupId | undefined;
      if (!groupId) return;
      const current = readStoredAccordionState();
      const next = { ...current, [groupId]: false };
      try {
        window.localStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      setCollapsedGroups(next);
    };

    window.addEventListener('dataanalytix:recent-tabs-updated', handleRecent);
    window.addEventListener('dataanalytix:pinned-tabs-updated', handlePinned);
    window.addEventListener('dataanalytix:accordion-updated', handleAccordion);
    window.addEventListener('dataanalytix:sidebar-collapsed-updated', handleCollapsed);
    window.addEventListener('dataanalytix:focus-sidebar-group', handleFocusGroup);
    return () => {
      window.removeEventListener('dataanalytix:recent-tabs-updated', handleRecent);
      window.removeEventListener('dataanalytix:pinned-tabs-updated', handlePinned);
      window.removeEventListener('dataanalytix:accordion-updated', handleAccordion);
      window.removeEventListener('dataanalytix:sidebar-collapsed-updated', handleCollapsed);
      window.removeEventListener('dataanalytix:focus-sidebar-group', handleFocusGroup);
    };
  }, []);

  // Auto-expand the group containing the active page whenever currentTab changes
  useEffect(() => {
    if (!currentTab) return;
    const activeGroup = findWorkflowGroupForTab(currentTab);
    if (activeGroup && collapsedGroups[activeGroup.id]) {
      const next = { ...collapsedGroups, [activeGroup.id]: false };
      try {
        window.localStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      setCollapsedGroups(next);
    }
  }, [currentTab, collapsedGroups]);

  const togglePinTab = useCallback((tabId: NavigationTab): { limitReached: boolean; pinned: boolean } => {
    const prev = readStoredPinnedTabs();
    const exists = prev.includes(tabId);
    if (!exists && prev.length >= MAX_PINNED_TABS) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dataanalytix:favorites-limit-reached', {
            detail: { tabId, max: MAX_PINNED_TABS },
          })
        );
      }
      return { limitReached: true, pinned: false };
    }
    const next: NavigationTab[] = exists
      ? prev.filter((id) => id !== tabId)
      : [...prev, tabId];

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(PINNED_TABS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
    setPinnedTabs(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dataanalytix:pinned-tabs-updated', { detail: next })
      );
    }
    return { limitReached: false, pinned: !exists };
  }, []);

  const clearFavorites = useCallback(() => {
    const next: NavigationTab[] = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(PINNED_TABS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
    setPinnedTabs(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dataanalytix:pinned-tabs-updated', { detail: next })
      );
    }
  }, []);

  const toggleSidebarCollapsed = useCallback((force?: boolean) => {
    const prev = readStoredSidebarCollapsed();
    const next = typeof force === 'boolean' ? force : !prev;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
    }
    setIsSidebarCollapsed(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dataanalytix:sidebar-collapsed-updated', { detail: next })
      );
    }
  }, []);

  const isTabPinned = useCallback(
    (tabId: NavigationTab) => pinnedTabs.includes(tabId),
    [pinnedTabs]
  );

  const toggleGroup = useCallback((groupId: string) => {
    const prev = readStoredAccordionState();
    const next = { ...prev, [groupId]: !prev[groupId] };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
    setCollapsedGroups(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dataanalytix:accordion-updated', { detail: next })
      );
    }
  }, []);

  const expandGroup = useCallback((groupId: string) => {
    const prev = readStoredAccordionState();
    if (!prev[groupId]) return;
    const next = { ...prev, [groupId]: false };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
    setCollapsedGroups(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dataanalytix:accordion-updated', { detail: next })
      );
    }
  }, []);

  return {
    pinnedTabs,
    togglePinTab,
    clearFavorites,
    isTabPinned,
    recentTabs,
    setRecentTabs,
    collapsedGroups,
    toggleGroup,
    expandGroup,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
  };
}

