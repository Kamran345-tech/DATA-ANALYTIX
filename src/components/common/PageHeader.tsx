import React, { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  ChevronDown,
  HelpCircle,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Home,
  LayoutDashboard,
  Layers,
  SlidersHorizontal,
  UploadCloud,
  Database,
  Table2,
  ShieldAlert,
  Wand2,
  Network,
  TrendingUp,
  Code2,
  FileCode2,
  FileSpreadsheet,
  FileText,
  BookOpen,
  FolderDown,
  Wrench,
  Settings,
  Newspaper,
  CreditCard,
  Users,
} from 'lucide-react';
import { NavigationTab, usePlatform } from '../../store/usePlatformStore';
import { loadFeatureFlags } from '../../config/features';

export interface PageActionItem {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  disabledReason?: string;
  testId?: string;
}

export interface PageHeaderCatalogEntry {
  id: NavigationTab;
  eyebrow: string;
  title: string;
  purpose: string;
  icon: React.ComponentType<{ className?: string }>;
  guideSteps: [string, string, string];
}

export const PAGE_HEADER_CATALOG: Record<NavigationTab, PageHeaderCatalogEntry> = {
  landing: {
    id: 'landing',
    eyebrow: 'Workspace Launchpad',
    title: 'Home Overview',
    purpose: 'Command center with dataset health indicators, active schema metrics, and guided workflows.',
    icon: Home,
    guideSteps: [
      'Review active dataset row count, column count, and data hygiene score.',
      'Follow the 4-stage workflow stepper from Upload to Clean, Analyze, and Present.',
      'Click any domain card or quick-launch action to open a specialized workspace.',
    ],
  },
  executive_dashboard: {
    id: 'executive_dashboard',
    eyebrow: 'Executive Monitoring',
    title: 'Executive Dashboard',
    purpose: 'Board view of the active dataset with live KPIs, period trends, interactive slicers, and drill-through.',
    icon: LayoutDashboard,
    guideSteps: [
      'Use the global filter bar and interactive slicers to focus on specific segments or dates.',
      'Click any KPI card to inspect its formula trace or open row-level drill-through.',
      'Export a board-ready PDF report or launch fullscreen presentation mode.',
    ],
  },
  analytics_packs: {
    id: 'analytics_packs',
    eyebrow: 'Domain Intelligence',
    title: 'Analytics Packs',
    purpose: '14 domain-specific dashboards, KPIs, 4 analytical lenses, and editable 13-slide PowerPoint decks.',
    icon: Layers,
    guideSteps: [
      'Pick the recommended pack for your data or explore any of the 14 domain packs with sample data.',
      'Switch between Descriptive, Diagnostic, Predictive, and Prescriptive lenses.',
      'Preview the 13-slide presentation deck or download an editable .pptx file.',
    ],
  },
  how_to_use: {
    id: 'how_to_use',
    eyebrow: 'Platform Documentation',
    title: 'How to Use Platform',
    purpose: 'Step-by-step interactive playbook covering data ingestion, cleaning, domain packs, and exports.',
    icon: HelpCircle,
    guideSteps: [
      'Browse the workflow guide by stage: Ingest, Clean, Analyze, and Present.',
      'Use the interactive checklists to verify every step of your analysis.',
      'Jump directly to any module from the guide cards.',
    ],
  },
  upload: {
    id: 'upload',
    eyebrow: 'Data Ingestion',
    title: 'Upload & Ingest Data',
    purpose: 'Upload CSV, Excel, or JSON files with automated type inference, schema understanding, and pack detection.',
    icon: UploadCloud,
    guideSteps: [
      'Drag and drop a CSV, XLSX, or JSON file, or choose a curated demo dataset.',
      'Review how the engine understood your columns, grain, and recommended Analytics Pack.',
      'Map column roles or jump straight into your domain dashboard.',
    ],
  },
  live_connector: {
    id: 'live_connector',
    eyebrow: 'Database & Stream Intake',
    title: 'Live Server & Database Connector',
    purpose: 'Connect to live REST APIs, PostgreSQL, or MySQL endpoints, or test with clearly labeled demo profiles.',
    icon: Database,
    guideSteps: [
      'Choose a live connection type (PostgreSQL, MySQL, REST API) or select a labeled Demo profile.',
      'Test connection latency and schema structure with read-only safety limits.',
      'Ingest live rows into the analytical engine or configure auto-refresh intervals.',
    ],
  },
  preview: {
    id: 'preview',
    eyebrow: 'Schema & Profiling',
    title: 'Data Preview & Profile',
    purpose: 'Inspect raw and cleaned rows, column data types, null distributions, and semantic column roles.',
    icon: Table2,
    guideSteps: [
      'Review the "How I understood your data" card to verify semantic roles, units, and measure types.',
      'Search and filter rows or inspect column cardinality and completeness.',
      'Download the cleaned CSV or open Column Mapping to refine role assignments.',
    ],
  },
  quality: {
    id: 'quality',
    eyebrow: 'Data Hygiene Audit',
    title: 'Data Quality Auditor',
    purpose: 'Audit missing values, duplicate rows, outliers, and format inconsistencies using the shared quality engine.',
    icon: ShieldAlert,
    guideSteps: [
      'Click "Why this score?" to inspect the exact weighted formula behind your hygiene grade.',
      'Review detected findings ranked by High, Medium, and Low severity.',
      'Click "Fix Now" to resolve an issue immediately or "Keep as is" to dismiss intentional patterns.',
    ],
  },
  cleaning: {
    id: 'cleaning',
    eyebrow: 'Deterministic ETL',
    title: 'Data Cleaning Lab',
    purpose: 'Apply 1-click deterministic cleaning recipes with live hygiene score delta and transformation audit logs.',
    icon: Wand2,
    guideSteps: [
      'Run Auto-Clean All or apply targeted fixes for nulls, duplicates, whitespace, and outliers.',
      'Watch the live quality score delta update immediately after each transformation.',
      'Undo steps at any time or export the cleaned CSV with the full transformation log.',
    ],
  },
  modeling: {
    id: 'modeling',
    eyebrow: 'Relational Architecture',
    title: 'Data Modeling & Star Schema',
    purpose: 'Decompose flat datasets into normalized Fact and Dimension tables with 1:N relationship lineage.',
    icon: Network,
    guideSteps: [
      'Inspect auto-detected Fact and Dimension tables in the interactive ERD canvas.',
      'Add or edit primary-to-foreign key relationships and cross-filter directions.',
      'Export the Star Schema model to Power BI (.pbip) or SQL DDL.',
    ],
  },
  data_engineering: {
    id: 'data_engineering',
    eyebrow: 'Pipeline Orchestration',
    title: 'Data Engineering & ETL Pipeline',
    purpose: 'Inspect executed pipeline DAG stages, run data quality tests, and export dbt models or SQL DDL.',
    icon: Layers,
    guideSteps: [
      'Inspect step-by-step pipeline timings and row counts from ingestion to Star Schema.',
      'Run data assertions (not_null, unique, accepted_values, range) against your active dataset.',
      'Export production dbt models, schema.yml tests, or Airflow orchestration scripts.',
    ],
  },
  excel_automation: {
    id: 'excel_automation',
    eyebrow: 'Spreadsheet Engineering',
    title: 'Excel Automation Studio',
    purpose: 'Generate dynamic Excel formulas (XLOOKUP, SUMIFS, INDEX/MATCH) and download multi-sheet .xlsx workbooks.',
    icon: FileSpreadsheet,
    guideSteps: [
      'Select a formula recipe or spreadsheet automation template grounded in your columns.',
      'Preview computed cell outputs and copy verified Excel formulas.',
      'Download the formatted multi-tab .xlsx workbook with live formulas.',
    ],
  },
  analysis: {
    id: 'analysis',
    eyebrow: 'Statistical & Diagnostic Tools',
    title: 'Statistical Analysis & Tools',
    purpose: 'Run correlation matrices, regression models, pareto 80/20, cohort retention, A/B tests, and anomaly detection.',
    icon: TrendingUp,
    guideSteps: [
      'Choose a statistical diagnostic or interactive analysis tool tab.',
      'Select measure and dimension columns (auto-suggested from your dataset).',
      'Review the statistical verdict and add key charts directly to your dashboard or deck.',
    ],
  },
  dax_lab: {
    id: 'dax_lab',
    eyebrow: 'Power BI Semantic Layer',
    title: 'DAX Measure Studio',
    purpose: 'Author, evaluate, and export Power BI DAX measures including Time Intelligence and variance calculations.',
    icon: Code2,
    guideSteps: [
      'Browse auto-generated DAX measures tailored to your fact and dimension columns.',
      'Test live measure evaluation against your active dataset.',
      'Export the .dax measure script or complete Power BI PBIP project.',
    ],
  },
  sql_lab: {
    id: 'sql_lab',
    eyebrow: 'In-Browser Query Engine',
    title: 'SQL Workbench',
    purpose: 'Execute ANSI SQL queries (SELECT, GROUP BY, JOIN, window functions) directly against your in-memory tables.',
    icon: Database,
    guideSteps: [
      'Pick a starter analytical SQL template or write a custom ANSI SQL query.',
      'Run the query in-browser and inspect the tabular result set.',
      'Apply query results as your active cleaned dataset or export to CSV/SQL.',
    ],
  },
  python_lab: {
    id: 'python_lab',
    eyebrow: 'Data Science Sandbox',
    title: 'Python & Colab Lab',
    purpose: 'Run reproducible Python/Pandas analytical scripts and export Jupyter (.ipynb) notebooks.',
    icon: FileCode2,
    guideSteps: [
      'Select a Python data science script for profiling, forecasting, or anomaly detection.',
      'Execute the script against your dataset and inspect computed outputs.',
      'Download the ready-to-run .py script or Google Colab .ipynb notebook.',
    ],
  },
  dashboard_builder: {
    id: 'dashboard_builder',
    eyebrow: 'Custom Visual Composition',
    title: 'Dashboard Builder',
    purpose: 'Build custom visual scorecards, use the 8-Chart Visual Guide, and arrange bespoke dashboard layouts.',
    icon: SlidersHorizontal,
    guideSteps: [
      'Use the "Which chart should I use?" guide to pick the ideal chart for your columns.',
      'Configure X-axis dimensions, Y-axis metrics, and aggregation methods.',
      'Add visuals to your canvas, reorder cards, and export the dashboard bundle.',
    ],
  },
  ai_insights: {
    id: 'ai_insights',
    eyebrow: 'Grounded Analytical Copilot',
    title: 'Ask Your Data AI',
    purpose: 'Ask natural-language business questions and receive answers strictly grounded in verified dataset metrics.',
    icon: Sparkles,
    guideSteps: [
      'Click any pack-aware example prompt card to run an instant grounded analysis.',
      'Ask custom questions about KPI drivers, anomalies, or SQL queries.',
      'Verify the cited source metrics badge on every response.',
    ],
  },
  reports: {
    id: 'reports',
    eyebrow: 'Board Briefs & Presentations',
    title: 'Executive Reports',
    purpose: 'Generate print-ready multi-page C-suite PDF briefs, narrative summaries, and presentation decks.',
    icon: FileText,
    guideSteps: [
      'Customize report section headings and executive narrative focus.',
      'Preview KPI scorecards, quality audit sign-off, and strategic recommendations.',
      'Download the A4 Executive PDF Report or launch the presentation deck.',
    ],
  },
  data_dictionary: {
    id: 'data_dictionary',
    eyebrow: 'Metadata & Lineage Catalog',
    title: 'Data Dictionary & Lineage',
    purpose: 'Enterprise catalog documenting every column definition, data type, semantic role, and transformation lineage.',
    icon: BookOpen,
    guideSteps: [
      'Search across all profiled columns, business definitions, and data types.',
      'Inspect completeness ratios, distinct counts, and sample values.',
      'Download the Data Dictionary as Markdown, CSV, or PDF for governance sign-off.',
    ],
  },
  export_center: {
    id: 'export_center',
    eyebrow: 'Production Handoff',
    title: 'Export Center',
    purpose: 'Download complete Power BI (.pbip) projects, multi-sheet Excel workbooks, executive PDFs, and 13-slide PPTX decks.',
    icon: FolderDown,
    guideSteps: [
      'Select individual deliverables (PDF, PPTX, XLSX, CSV, SQL, DAX) or the complete project ZIP.',
      'Even with no data loaded, download blank starter templates and the Design SOP.',
      'Open downloaded .pbip archives directly in Power BI Desktop.',
    ],
  },
  how_to_modify: {
    id: 'how_to_modify',
    eyebrow: 'Architecture & Extensibility',
    title: 'How to Modify Project',
    purpose: 'Developer guide for extending analytics packs, customizing semantic tokens, and deploying to production.',
    icon: Wrench,
    guideSteps: [
      'Review the modular directory architecture and semantic CSS token contract.',
      'Learn how to add new domain packs or KPI formulas in src/analytics/packs.',
      'Run the automated color, unit, and Playwright E2E test suites.',
    ],
  },
  settings: {
    id: 'settings',
    eyebrow: 'Governance & Preferences',
    title: 'Settings & Branding',
    purpose: 'Configure light/dark theme, organization branding, feature flags, and privacy-first learned schema rules.',
    icon: Settings,
    guideSteps: [
      'Switch between Light, Dark, and System themes or toggle Simple/Pro navigation.',
      'Customize organization name, lead analyst attribution, and accent colors.',
      'Inspect or reset your privacy-safe learned column mappings and pack preferences.',
    ],
  },
  blog: {
    id: 'blog',
    eyebrow: 'Engineering Playbooks',
    title: 'Knowledge Base & Changelog',
    purpose: 'Technical articles on star-schema modeling, DAX optimization, and platform release notes.',
    icon: Newspaper,
    guideSteps: [
      'Read best-practice guides on data hygiene, star schema design, and KPI storytelling.',
      'Filter articles by category or search for specific analytical topics.',
      'Apply recommended patterns directly in the Cleaning Lab or Modeling view.',
    ],
  },
  pricing: {
    id: 'pricing',
    eyebrow: 'Workspace Plans',
    title: 'Plans & Quotas',
    purpose: 'Compare workspace capabilities across Free, Pro Analyst, and Enterprise Governance tiers.',
    icon: CreditCard,
    guideSteps: [
      'Review row capacity, export formats, and team governance features by tier.',
      'All core in-browser analysis and downloads work immediately in your workspace.',
      'Upgrade or manage team workspace seats as your analytical needs scale.',
    ],
  },
  workspaces: {
    id: 'workspaces',
    eyebrow: 'Team Collaboration',
    title: 'Team Workspaces',
    purpose: 'Manage team workspaces, role-based access control (Owner, Editor, Viewer), and shared project snapshots.',
    icon: Users,
    guideSteps: [
      'Switch between personal and team analytical workspaces.',
      'Review member roles and governed audit trail events.',
      'Share read-only dashboard snapshots with stakeholders.',
    ],
  },
};

export interface PageHeaderProps {
  pageId: NavigationTab;
  eyebrow?: string;
  title?: React.ReactNode;
  purpose?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  primaryAction?: PageActionItem;
  secondaryActions?: PageActionItem[];
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Shared PageHeader & ActionBar (Phase 3.1, 3.2 & 5.2).
 * Enforces sentence-case display typography, 14px purpose line, primary action CTA,
 * secondary actions overflow menu, and contextual "?" in-app page guide modal.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  pageId,
  eyebrow,
  title,
  purpose,
  icon,
  badge,
  primaryAction,
  secondaryActions = [],
  rightSlot,
  children,
  className = '',
}) => {
  const { loadDemoDataset } = usePlatform();
  const flags = loadFeatureFlags();
  const catalog = PAGE_HEADER_CATALOG[pageId] || PAGE_HEADER_CATALOG.executive_dashboard;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isMenuOpen]);

  const IconComp = icon || catalog.icon;
  const resolvedEyebrow = eyebrow ?? catalog.eyebrow;
  const resolvedTitle = title ?? catalog.title;
  const resolvedPurpose = purpose ?? catalog.purpose;

  return (
    <header
      data-testid={`shared-page-header-${pageId}`}
      className={`depth-card rounded-[20px] border border-subtle bg-card p-5 sm:p-6 shadow-xs space-y-4 ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Eyebrow + Sentence-Case Display Title + 14px Purpose Line */}
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-accent">
            <IconComp className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold tracking-wide">{resolvedEyebrow}</span>
            {badge && (
              <>
                <span aria-hidden="true" className="text-muted">·</span>
                {badge}
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1
              data-testid={`page-header-title-${pageId}`}
              className="font-heading text-2xl sm:text-3xl font-bold text-primary tracking-tight leading-tight"
            >
              {resolvedTitle}
            </h1>

            {/* In-App "?" Contextual Page Guide Trigger (Phase 5.2 & Phase 3.2) */}
            {(flags.designSystemV3 || flags.productQuality) && (
              <button
                type="button"
                data-testid={`page-help-trigger-${pageId}`}
                onClick={() => setIsHelpOpen(prev => !prev)}
                aria-label={`Open quick guide for ${catalog.title}`}
                aria-expanded={isHelpOpen}
                title={`What is ${catalog.title} and how to use it`}
                className="min-w-[32px] min-h-[32px] px-2 py-1 rounded-lg bg-input hover:bg-elevated border border-subtle text-xs font-mono text-secondary hover:text-primary inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5 text-accent" />
                <span>Guide</span>
              </button>
            )}
          </div>

          <p
            data-testid={`page-header-purpose-${pageId}`}
            className="text-sm text-secondary leading-relaxed max-w-3xl font-sans"
          >
            {resolvedPurpose}
          </p>
        </div>

        {/* Right: Unified ActionBar (Primary Action + Secondary Overflow Menu + Right Slot) */}
        {(primaryAction || secondaryActions.length > 0 || rightSlot) && (
          <div
            data-testid={`page-action-bar-${pageId}`}
            className="flex flex-wrap items-center gap-2.5 shrink-0"
          >
            {rightSlot}

            {secondaryActions.length > 0 && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  data-testid={`page-secondary-actions-btn-${pageId}`}
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  aria-label="More page actions"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-input hover:bg-elevated border border-subtle text-xs font-semibold text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4 text-accent" />
                  <span>Actions</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted" />
                </button>

                {isMenuOpen && (
                  <div
                    role="menu"
                    data-testid={`page-secondary-actions-menu-${pageId}`}
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-subtle shadow-xl py-1.5 z-40 divide-y divide-[var(--border-subtle)]"
                  >
                    <div className="py-1">
                      {secondaryActions.map((act, idx) => {
                        const ActIcon = act.icon;
                        return (
                          <button
                            key={idx}
                            type="button"
                            role="menuitem"
                            data-testid={act.testId}
                            disabled={act.disabled}
                            title={act.disabled ? act.disabledReason : act.label}
                            onClick={() => {
                              if (act.disabled) return;
                              setIsMenuOpen(false);
                              act.onClick();
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-primary hover:bg-elevated disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            {ActIcon && <ActIcon className="w-3.5 h-3.5 text-accent shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <div className="truncate">{act.label}</div>
                              {act.disabled && act.disabledReason && (
                                <div className="text-xs text-muted truncate">{act.disabledReason}</div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {primaryAction && (() => {
              const PrimaryIcon = primaryAction.icon;
              return (
                <button
                  type="button"
                  data-testid={primaryAction.testId || `page-primary-action-${pageId}`}
                  disabled={primaryAction.disabled}
                  title={primaryAction.disabled ? primaryAction.disabledReason : primaryAction.label}
                  onClick={primaryAction.onClick}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-accent hover:opacity-95 text-on-accent text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-opacity disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {PrimaryIcon && <PrimaryIcon className="w-4 h-4 shrink-0" />}
                  <span>{primaryAction.label}</span>
                </button>
              );
            })()}
          </div>
        )}
      </div>

      {/* Contextual 3-Step In-App Help Panel when "?" Guide is clicked */}
      {isHelpOpen && (
        <div
          data-testid={`page-help-panel-${pageId}`}
          role="region"
          aria-label={`Quick guide for ${catalog.title}`}
          className="rounded-xl bg-input border border-subtle p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>How to use {catalog.title} (3-Step Quick Guide)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsHelpOpen(false)}
              aria-label="Close quick guide"
              className="p-1 rounded-lg text-muted hover:text-primary hover:bg-card transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-secondary">
            {catalog.guideSteps.map((stepText, idx) => (
              <li
                key={idx}
                className="p-3 rounded-lg bg-card border border-subtle flex items-start gap-2.5"
              >
                <span className="w-5 h-5 rounded-full bg-accent-soft text-accent font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{stepText}</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <span className="text-muted">
              Tip: Try these steps using the built-in enterprise sample dataset.
            </span>
            <button
              type="button"
              onClick={() => {
                loadDemoDataset('global-retail-sales');
                setIsHelpOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-elevated hover:bg-card-hover border border-subtle text-primary font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
              <span>Try with sample dataset</span>
              <ArrowRight className="w-3 h-3 text-muted" />
            </button>
          </div>
        </div>
      )}

      {children}
    </header>
  );
};
