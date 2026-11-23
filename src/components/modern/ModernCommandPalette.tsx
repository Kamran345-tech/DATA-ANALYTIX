import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  UploadCloud,
  ShieldAlert,
  Wand2,
  Network,
  TrendingUp,
  Database,
  Cpu,
  Code2,
  SlidersHorizontal,
  Sparkles,
  FileSpreadsheet,
  FolderDown,
  Settings,
  X,
  FileText,
  Home,
  Layers,
  HelpCircle,
  Table2,
  FileCode2,
  BookOpen,
  Wrench,
  Newspaper,
  CreditCard,
  Users,
  Sun,
  Clock,
  Zap,
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';
import { PAGE_HEADER_CATALOG } from '../common/PageHeader';

interface CommandEntry {
  id: string;
  title: string;
  subtitle: string;
  category: 'Recent' | 'Pages' | 'Actions';
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  onExecute: () => void;
}

export interface ModernCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_PAGE_ITEMS: {
  id: NavigationTab;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}[] = [
  { id: 'landing', title: 'Home / Overview', category: 'Launchpad', icon: Home, keywords: ['home', 'overview', 'start', 'welcome'] },
  { id: 'upload', title: 'Upload Data', category: 'Ingest', icon: UploadCloud, keywords: ['import', 'csv', 'excel', 'xlsx', 'json', 'file', 'upload'] },
  { id: 'live_connector', title: 'Live Server & Database Connector', category: 'Ingest', icon: Database, keywords: ['postgres', 'mysql', 'api', 'webhook', 'live', 'database'] },
  { id: 'preview', title: 'Data Preview & Profile', category: 'Ingest', icon: Table2, keywords: ['table', 'rows', 'columns', 'schema', 'profile', 'understood'] },
  { id: 'quality', title: 'Data Quality Auditor', category: 'Prepare', icon: ShieldAlert, keywords: ['hygiene', 'health', 'nulls', 'duplicates', 'issues', 'score'] },
  { id: 'cleaning', title: 'Data Cleaning Lab', category: 'Prepare', icon: Wand2, keywords: ['clean', 'outliers', 'whitespace', 'transform', 'etl', 'fix'] },
  { id: 'modeling', title: 'Data Modeling (ERD)', category: 'Prepare', icon: Network, keywords: ['schema', 'star', 'fact', 'dimensions', 'erd', 'relationships'] },
  { id: 'data_engineering', title: 'Data Engineering (DAG)', category: 'Prepare', icon: Layers, keywords: ['pipeline', 'dag', 'dbt', 'tests', 'ddl', 'lineage'] },
  { id: 'excel_automation', title: 'Excel Automation (XLSX)', category: 'Analyze', icon: FileSpreadsheet, keywords: ['xlookup', 'formulas', 'workbook', 'spreadsheet', 'xlsx'] },
  { id: 'analytics_packs', title: 'Analytics Packs (14 Domains)', category: 'Analyze', icon: Layers, keywords: ['packs', 'financial', 'sales', 'marketing', 'hr', 'retail', 'domain', 'pptx'] },
  { id: 'analysis', title: 'Statistical Analysis & Tools', category: 'Analyze', icon: TrendingUp, keywords: ['correlation', 'regression', 'cohort', 'funnel', 'ab test', 'pareto', 'rfm', 'anomaly'] },
  { id: 'sql_lab', title: 'SQL Workbench', category: 'Analyze', icon: Database, keywords: ['query', 'select', 'join', 'alasql', 'sql'] },
  { id: 'dax_lab', title: 'DAX Measure Studio', category: 'Analyze', icon: Cpu, keywords: ['powerbi', 'measures', 'dax', 'yoy', 'calculate'] },
  { id: 'python_lab', title: 'Python & Colab Lab', category: 'Analyze', icon: FileCode2, keywords: ['pandas', 'numpy', 'python', 'notebook', 'ipynb'] },
  { id: 'ai_insights', title: 'Ask Your Data AI', category: 'Decision', icon: Sparkles, keywords: ['chat', 'questions', 'copilot', 'ai', 'insights'] },
  { id: 'executive_dashboard', title: 'Executive Dashboard', category: 'Build', icon: LayoutDashboard, keywords: ['kpi', 'revenue', 'overview', 'metrics', 'board'] },
  { id: 'dashboard_builder', title: 'Dashboard Builder', category: 'Build', icon: SlidersHorizontal, keywords: ['widgets', 'charts', 'customize', 'chart guide'] },
  { id: 'reports', title: 'Executive Reports', category: 'Present', icon: FileText, keywords: ['pdf', 'deck', 'presentation', 'report', 'brief'] },
  { id: 'export_center', title: 'Export Center (ZIP)', category: 'Export', icon: FolderDown, keywords: ['pbip', 'power bi', 'download', 'archive', 'zip', 'pptx'] },
  { id: 'data_dictionary', title: 'Data Dictionary & Lineage', category: 'Governance', icon: BookOpen, keywords: ['catalog', 'metadata', 'glossary', 'lineage'] },
  { id: 'how_to_use', title: 'How to Use Platform', category: 'Docs', icon: HelpCircle, keywords: ['guide', 'manual', 'help', 'documentation'] },
  { id: 'how_to_modify', title: 'How to Modify Project', category: 'Docs', icon: Wrench, keywords: ['developer', 'architecture', 'extend', 'code'] },
  { id: 'blog', title: 'Knowledge Base / Blog', category: 'Docs', icon: Newspaper, keywords: ['articles', 'changelog', 'whitepapers'] },
  { id: 'pricing', title: 'Plans & Quotas', category: 'Admin', icon: CreditCard, keywords: ['pricing', 'plan', 'pro', 'enterprise'] },
  { id: 'workspaces', title: 'Team Workspaces', category: 'Admin', icon: Users, keywords: ['team', 'roles', 'rbac', 'collaboration'] },
  { id: 'settings', title: 'Settings & Branding', category: 'Admin', icon: Settings, keywords: ['theme', 'branding', 'flags', 'mode', 'learning', 'reset'] },
];

export const ModernCommandPalette: React.FC<ModernCommandPaletteProps> = ({ isOpen, onClose }) => {
  const {
    setCurrentTab,
    toggleThemeMode,
    themeMode,
    loadDemoDataset,
    addTransformation,
    setIsPresentationMode,
  } = usePlatform();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentTabs, setRecentTabs] = useState<NavigationTab[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('dataanalytix_recent_tabs');
        if (raw) {
          setRecentTabs(JSON.parse(raw));
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  const entries: CommandEntry[] = React.useMemo(() => {
    const pageEntries: CommandEntry[] = ALL_PAGE_ITEMS.map((item) => {
      const cat = PAGE_HEADER_CATALOG[item.id];
      return {
        id: `page-${item.id}`,
        title: item.title,
        subtitle: cat?.purpose || `${item.category} module`,
        category: 'Pages',
        icon: item.icon,
        keywords: item.keywords,
        onExecute: () => {
          setCurrentTab(item.id);
          onClose();
        },
      };
    });

    const actionEntries: CommandEntry[] = [
      {
        id: 'act-sample-data',
        title: 'Action: Load Enterprise Sample Dataset',
        subtitle: 'Loads the 120-row Global Enterprise Sales & Margin dataset',
        category: 'Actions',
        icon: Zap,
        keywords: ['sample', 'demo', 'load', 'dataset', 'seed'],
        onExecute: () => {
          loadDemoDataset('global-retail-sales');
          onClose();
        },
      },
      {
        id: 'act-toggle-theme',
        title: `Action: Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Theme`,
        subtitle: 'Toggle WCAG AA semantic Light / Dark appearance',
        category: 'Actions',
        icon: Sun,
        keywords: ['theme', 'dark', 'light', 'color', 'appearance'],
        onExecute: () => {
          toggleThemeMode();
          onClose();
        },
      },
      {
        id: 'act-auto-clean',
        title: 'Action: Run Auto-Clean All Pipeline',
        subtitle: 'Deduplicate rows, trim whitespace, and normalize numbers',
        category: 'Actions',
        icon: Wand2,
        keywords: ['clean', 'auto', 'fix', 'hygiene'],
        onExecute: () => {
          addTransformation({
            action: 'auto_clean_all',
            parameters: {},
            description: 'Command Palette: Executed Auto-Clean All deterministic recipe.',
          });
          setCurrentTab('cleaning');
          onClose();
        },
      },
      {
        id: 'act-replay-tour',
        title: 'Action: Replay 3-Step Platform Coach Tour',
        subtitle: 'Launch the guided 3-step tour covering Sidebar Groups, Ctrl+K Search, and Downloads',
        category: 'Actions',
        icon: HelpCircle,
        keywords: ['tour', 'onboarding', 'guide', 'help', 'coach', 'walkthrough'],
        onExecute: () => {
          window.dispatchEvent(new CustomEvent('dataanalytix:start-coach-tour'));
          onClose();
        },
      },
      {
        id: 'act-presentation',
        title: 'Action: Launch Fullscreen Boardroom Presentation',
        subtitle: 'Open fullscreen executive slide presentation mode',
        category: 'Actions',
        icon: FileText,
        keywords: ['present', 'fullscreen', 'slides', 'deck', 'boardroom'],
        onExecute: () => {
          setIsPresentationMode(true);
          onClose();
        },
      },
    ];

    if (!query.trim()) {
      const recentEntries: CommandEntry[] = recentTabs
        .slice(0, 4)
        .map((tabId) => {
          const found = ALL_PAGE_ITEMS.find((p) => p.id === tabId);
          if (!found) return null;
          return {
            id: `recent-${tabId}`,
            title: `${found.title}`,
            subtitle: 'Recently visited page',
            category: 'Recent' as const,
            icon: Clock,
            keywords: found.keywords,
            onExecute: () => {
              setCurrentTab(tabId);
              onClose();
            },
          };
        })
        .filter(Boolean) as CommandEntry[];

      return [...recentEntries, ...actionEntries, ...pageEntries];
    }

    const q = query.toLowerCase();
    return [...actionEntries, ...pageEntries].filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
    );
  }, [query, recentTabs, themeMode, setCurrentTab, onClose, loadDemoDataset, toggleThemeMode, addTransformation, setIsPresentationMode]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (entries.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + entries.length) % (entries.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = entries[selectedIndex];
        if (selected) {
          selected.onExecute();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, entries, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      data-testid="command-palette-dialog"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card border border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[78vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-subtle gap-3 bg-input">
          <Search className="w-4 h-4 text-accent shrink-0" />
          <input
            ref={inputRef}
            type="text"
            data-testid="command-palette-input"
            placeholder="Search all 26 pages & actions (e.g. Upload, Clean, Packs, SQL, Theme, Sample)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            aria-label="Search modules and commands"
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-muted hover:text-primary cursor-pointer"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div
          data-testid="command-palette-results"
          className="flex-1 overflow-y-auto p-2 divide-y divide-[var(--border-subtle)]"
        >
          {entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-secondary">
              No page or action matching &ldquo;<span className="text-primary font-semibold">{query}</span>&rdquo;
            </div>
          ) : (
            entries.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`command-palette-item-${item.id}`}
                  onClick={item.onExecute}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-accent-soft text-accent font-semibold'
                      : 'text-primary hover:bg-elevated'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-accent text-on-accent' : 'bg-input text-accent border border-subtle'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-primary truncate">
                          {item.title}
                        </span>
                        <span className="text-xs font-mono text-muted shrink-0">
                          · {item.category}
                        </span>
                      </div>
                      <div className="text-xs text-secondary truncate font-normal">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <kbd className="hidden sm:inline-block text-xs font-mono px-2 py-0.5 rounded bg-input border border-subtle text-muted shrink-0 ml-2">
                    Enter ↵
                  </kbd>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-input border-t border-subtle text-xs text-secondary flex items-center justify-between">
          <div className="flex items-center gap-3 font-mono">
            <span>↑↓ Navigate</span>
            <span>↵ Execute</span>
            <span>Esc Close</span>
          </div>
          <span className="font-mono">{entries.length} pages &amp; actions</span>
        </div>
      </div>
    </div>
  );
};
