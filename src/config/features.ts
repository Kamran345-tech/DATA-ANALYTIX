/**
 * Data Analytix - Feature Flag Management System
 * Core Principle: ADDITIVE ONLY, CLASSIC STAYS
 *
 * Every flag defaults to FALSE (Classic behavior).
 * Flags can be overridden by environment variables (VITE_FEATURE_<FLAG_NAME>=true)
 * and are persisted in localStorage under key "dataanalytix_features".
 */

export interface FeatureFlagMeta {
  key: keyof FeatureFlags;
  label: string;
  category: 'core' | 'engine' | 'ui' | 'security' | 'saas';
  description: string;
  classicBehavior: string;
  newBehavior: string;
}

export interface FeatureFlags {
  unifiedBranding: boolean;
  modernTheme: boolean;
  groupedSidebar: boolean;
  enhancedEngine: boolean;
  columnMapping: boolean;
  demoBadges: boolean;
  verifiedAI: boolean;
  publicLanding: boolean;
  hashRouting: boolean;
  pricing: boolean;
  workspaces: boolean;
  workerParsing: boolean;
  xlsxSafe: boolean;
  showAllErrors: boolean;
  selfHostedFonts: boolean;
  depthUI: boolean;
  heroScene3D: boolean;
  chartGuide: boolean;
  unifiedTheme: boolean;
  analyticsPacks: boolean;
  designSystemV3: boolean;
  analystFeatures: boolean;
  dataEngineerFeatures: boolean;
  southAsiaLocale: boolean;
  productQuality: boolean;
  chartStudio: boolean;
  premiumUX: boolean;
}

export const CLASSIC_FEATURE_FLAGS: FeatureFlags = {
  unifiedBranding: false,
  modernTheme: false,
  groupedSidebar: false,
  enhancedEngine: false,
  columnMapping: false,
  demoBadges: false,
  verifiedAI: false,
  publicLanding: false,
  hashRouting: false,
  pricing: false,
  workspaces: false,
  workerParsing: false,
  xlsxSafe: false,
  showAllErrors: false,
  selfHostedFonts: false,
  depthUI: false,
  heroScene3D: false,
  chartGuide: false,
  unifiedTheme: false,
  analyticsPacks: false,
  designSystemV3: false,
  analystFeatures: false,
  dataEngineerFeatures: false,
  southAsiaLocale: false,
  productQuality: false,
  chartStudio: false,
  premiumUX: false,
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  unifiedBranding: false,
  modernTheme: false,
  groupedSidebar: false,
  enhancedEngine: false,
  columnMapping: false,
  demoBadges: false,
  verifiedAI: false,
  publicLanding: false,
  hashRouting: false,
  pricing: false,
  workspaces: false,
  workerParsing: false,
  xlsxSafe: false,
  showAllErrors: false,
  selfHostedFonts: false,
  depthUI: true,
  heroScene3D: true,
  chartGuide: true,
  unifiedTheme: true,
  analyticsPacks: true,
  designSystemV3: true,
  analystFeatures: true,
  dataEngineerFeatures: true,
  southAsiaLocale: true,
  productQuality: true,
  chartStudio: true,
  premiumUX: true,
};

export const FEATURE_METADATA: FeatureFlagMeta[] = [
  {
    key: 'unifiedBranding',
    label: 'Unified Branding',
    category: 'core',
    description: 'Switches all visible brand references (NexusBI, AcuityBI) uniformly to "Data Analytix".',
    classicBehavior: 'Preserves historical brand identifiers (NexusBI / AcuityBI).',
    newBehavior: 'Displays "Data Analytix" consistently across all views and navigation.'
  },
  {
    key: 'modernTheme',
    label: 'Modern Deep Slate Theme',
    category: 'ui',
    description: 'Activates modern enterprise theme (#0B1120 / #111A2E) with 8px rhythm and 4.5:1 WCAG contrast.',
    classicBehavior: 'Standard Light / Dark visual theme palette.',
    newBehavior: 'Deep slate modern theme with vibrant accents and refined typographic hierarchy.'
  },
  {
    key: 'groupedSidebar',
    label: 'Grouped Workflow Sidebar',
    category: 'ui',
    description: 'Collapsible 5-stage sidebar: Data -> Prepare -> Analyze -> Build -> Export.',
    classicBehavior: 'Flat alphabetical / operational sidebar layout.',
    newBehavior: 'Structured workflow groupings with section badges and collapse memory.'
  },
  {
    key: 'enhancedEngine',
    label: 'Enhanced Calculation Engine (v2)',
    category: 'engine',
    description: 'V2 engine with DD/MM detection, unfloored quality score, and per-KPI calculation trace.',
    classicBehavior: 'Standard v1 heuristic calculation and profiling engine.',
    newBehavior: 'Audit-traceable KPIs, wider type sampling, and precision date inference.'
  },
  {
    key: 'columnMapping',
    label: 'Interactive Column Mapping',
    category: 'engine',
    description: 'Post-upload review screen to confirm Revenue, Cost, Profit, Date, and Units column roles.',
    classicBehavior: 'Immediate automatic column role guessing.',
    newBehavior: 'Pre-flight mapping dialog with confirmation and currency format override.'
  },
  {
    key: 'demoBadges',
    label: 'Demo Data Honesty Badges',
    category: 'core',
    description: 'Displays prominent "DEMO DATA" badge on simulated streams with import confirmation.',
    classicBehavior: 'Silent simulated database streaming with small text disclaimer.',
    newBehavior: 'Explicit yellow badges on charts and exports whenever simulation is active.'
  },
  {
    key: 'verifiedAI',
    label: 'Verified AI Citations',
    category: 'engine',
    description: 'Checks that every numerical claim in AI summaries matches verified analytical context.',
    classicBehavior: 'Standard "Anti-Hallucination Active" badge.',
    newBehavior: 'Strict "Verified" vs "Unverified AI response" badge with cited figures.'
  },
  {
    key: 'publicLanding',
    label: 'Public Welcome Page',
    category: 'ui',
    description: 'Exposes unauthenticated /welcome showcase with "Try with sample data" and product tour.',
    classicBehavior: 'Direct login gate and single-page exploration.',
    newBehavior: 'SEO-ready pre-login landing experience with interactive sample launcher.'
  },
  {
    key: 'hashRouting',
    label: 'Hash URL Routing',
    category: 'ui',
    description: 'Maps each module to URL hash (#/dashboard, #/data-modeling) enabling browser Back/Forward.',
    classicBehavior: 'State-based memory navigation without URL updates.',
    newBehavior: 'Deep-linkable hash URLs with history synchronization.'
  },
  {
    key: 'pricing',
    label: 'SaaS Pricing & Plan Quotas',
    category: 'saas',
    description: 'Enables Free, Pro, and Enterprise subscription tier selection and checkout modal.',
    classicBehavior: 'Unrestricted open workspace access.',
    newBehavior: 'Tiered plan comparison with feature limits and Stripe simulation.'
  },
  {
    key: 'workspaces',
    label: 'Workspaces & Team Collaboration',
    category: 'saas',
    description: 'Multi-workspace switching with Role-Based Access Control (Owner, Editor, Viewer).',
    classicBehavior: 'Single local / Firebase user scope.',
    newBehavior: 'Workspace switcher with role badges, invite links, and audit logs.'
  },
  {
    key: 'workerParsing',
    label: 'Web Worker File Parsing',
    category: 'engine',
    description: 'Parses large CSVs and spreadsheets in a Web Worker to prevent main-thread freezing.',
    classicBehavior: 'Synchronous main-thread file parsing.',
    newBehavior: 'Non-blocking worker execution with live progress bar.'
  },
  {
    key: 'xlsxSafe',
    label: 'Hardened ExcelJS Adapter',
    category: 'security',
    description: 'Routes Excel workbook parsing and generation through audited ExcelJS adapter.',
    classicBehavior: 'Standard SheetJS (xlsx) workbook operations.',
    newBehavior: 'Isolated ExcelJS pipeline with cell sanitization.'
  },
  {
    key: 'showAllErrors',
    label: 'Strict Error Routing Mode',
    category: 'security',
    description: 'Bypasses error suppression to route all runtime and network anomalies to ErrorBoundary.',
    classicBehavior: 'Suppresses benign HMR/sandbox noise.',
    newBehavior: 'Captures and surfaces full call stacks in ErrorBoundary diagnostics.'
  },
  {
    key: 'selfHostedFonts',
    label: 'Self-Hosted Font Stack',
    category: 'ui',
    description: 'Uses self-hosted WOFF2 fonts (Space Grotesk, Inter, JetBrains Mono) with zero external CDN requests.',
    classicBehavior: 'Standard font stack.',
    newBehavior: 'Self-hosted Space Grotesk for titles/KPIs, Inter for UI, and JetBrains Mono for tables/code.'
  },
  {
    key: 'depthUI',
    label: 'Depth UI Surface System',
    category: 'ui',
    description: 'Applies 20px card radius, rgba(148,163,184,.18) borders, inset top highlight, soft shadow, and 4px hover lift with teal border (never on charts, tables, or editors).',
    classicBehavior: 'Standard flat/glass card elevation.',
    newBehavior: 'Tactile 20px depth cards with top specular highlight and 4px hover lift.'
  },
  {
    key: 'heroScene3D',
    label: '3D Isometric Hero Scene',
    category: 'ui',
    description: 'Renders pure-CSS 3D isometric 5-pillar data platform with billboard tags (SQL / Python / Power BI) and "Raw data in. Clear decisions out." headline.',
    classicBehavior: 'Standard centered hero banner.',
    newBehavior: 'Pure-CSS 1400px perspective 380x380 isometric platform with 5 shaded data pillars.'
  },
  {
    key: 'chartGuide',
    label: '8-Chart Visual Guide & Rule Engine',
    category: 'engine',
    description: 'Enables the interactive "Which chart should I use?" 8-chart guide, Histogram & Stacked Bar renderers, strict data-fit guard rails, and "Why this chart" tooltips.',
    classicBehavior: 'Standard heuristic chart suggestions.',
    newBehavior: '8-chart rule engine with field compatibility filtering, Histogram/Stacked Bar support, and contextual rationale tooltips.'
  },
  {
    key: 'unifiedTheme',
    label: 'Unified Semantic Theme System',
    category: 'ui',
    description: 'Activates the WCAG AA unified semantic token palette (--bg-app, --bg-card, --text-primary, --chart-1..8) across Dark, Light, and System modes.',
    classicBehavior: 'Classic per-view theme classes and override rules.',
    newBehavior: 'Single semantic token set with verified >= 4.5:1 text contrast across all views in Dark and Light modes.'
  },
  {
    key: 'analyticsPacks',
    label: 'Domain Analytics Packs (14 Packs)',
    category: 'engine',
    description: 'Enables data-driven domain analytics packs (Financial, Sales, Marketing, Customer, Product, Web, Operations, HR, Risk/Fraud, Healthcare, Retail, Manufacturing, Banking/Insurance, Education) with auto-detection, role mapping, 8–16 KPIs, 6–8 intent charts, 4 lenses, and reports.',
    classicBehavior: 'Single general-purpose Executive Dashboard without domain-specific pack detection.',
    newBehavior: '14 domain Analytics Packs with auto-detection banner, role mapping, pack dashboards, and zero-data template downloads.'
  },
  {
    key: 'designSystemV3',
    label: 'Design System v3 (Typography, PageHeader & Simple/Pro Nav)',
    category: 'ui',
    description: 'Enables sentence-case display typography scale (>=12px min, 14px body), shared PageHeader & ActionBar, Simple/Pro navigation toggle, guided workflow stepper, and universal Ctrl+K command palette.',
    classicBehavior: 'Classic per-page headers and navigation lists.',
    newBehavior: 'Unified sentence-case typography, shared PageHeader & ActionBar, Simple/Pro navigation, and guided stepper.'
  },
  {
    key: 'analystFeatures',
    label: 'Data Analyst Workbench (Targets, Period Compare, Tools & Pivot)',
    category: 'engine',
    description: 'Adds per-KPI targets & quota lines, global MoM/QoQ/YoY period comparison, interactive Analysis Tools (Cohort, Funnel, A/B Test, What-If, Pareto, RFM), Calculated Fields, and Pivot Table.',
    classicBehavior: 'Standard KPI cards and statistical charts.',
    newBehavior: 'Interactive KPI targets, period comparison deltas, 7 Analysis Tools, custom formula builder, and pivot matrix.'
  },
  {
    key: 'dataEngineerFeatures',
    label: 'Data Engineering Suite v2 (Multi-Table, Drift, Persistence & Live Proxy)',
    category: 'engine',
    description: 'Adds multi-file upload/join/union, IndexedDB persistence with dataset versioning, schema drift report, real executed ETL pipeline timings/tests, and SSRF-hardened live database proxy.',
    classicBehavior: 'Single-file session memory and static pipeline preview.',
    newBehavior: 'Persistent datasets with version diff, schema drift detection, multi-table joins, and live data tests.'
  },
  {
    key: 'southAsiaLocale',
    label: 'South Asia & Pakistan Localisation (Urdu RTL & PKR/Lakh/Crore)',
    category: 'ui',
    description: 'Adds English / Urdu (RTL) / Roman-Urdu localisation, PKR currency option, lakh/crore number grouping (12,34,567), DD/MM/YYYY dates, and RTL presentation exports.',
    classicBehavior: 'Standard US/Western number grouping and LTR English labels.',
    newBehavior: 'Full English/Urdu RTL switch, Roman-Urdu hints, and PKR lakh/crore formatting across UI and exports.'
  },
  {
    key: 'productQuality',
    label: 'Product Quality & Onboarding Guardrails (In-App Help, PWA & Problem Reporter)',
    category: 'core',
    description: 'Adds real completion-tracked onboarding checklist, contextual "?" page guides, opt-in privacy-safe telemetry, Report a Problem modal, and offline PWA support.',
    classicBehavior: 'Static help documentation tab only.',
    newBehavior: 'Live onboarding progress tracker, per-page "?" guides, problem diagnostics, and installable PWA shell.'
  },
  {
    key: 'chartStudio',
    label: 'Chart Studio, Offline Geo Maps & VIP Boardroom Dashboards',
    category: 'engine',
    description: 'Enables the unified Chart Studio visual library (Compare, Trend, Part-to-Whole, Distribution, Gantt, Tables/Matrix, Cards/Gauges/Scorecard, Offline Choropleth/Bubble/Shape Maps, Key Influencers, Smart Narrative, Analytics Pane, Visual Calculations, Small Multiples, Power BI Theme JSON) and 14 Pack VIP Boardroom Dashboards.',
    classicBehavior: 'Standard Recharts visual set and classic dashboard builder.',
    newBehavior: 'Full Chart Studio visual suite, offline D3 Geo maps (World, US States, Pakistan), Analytics Pane, Key Influencers, and VIP Boardroom templates.'
  },
  {
    key: 'premiumUX',
    label: 'Premium VIP Boardroom Experience & Progressive Disclosure',
    category: 'ui',
    description: 'Opens directly on Board View after data loads, simplifies navigation to one global Ctrl+K search, limits VIP header to 4 controls with plain-language labels, and enforces minimum sample guardrails on Key Influencers.',
    classicBehavior: 'Full multi-tab analytical lens layout with catalog grid and all advanced controls visible.',
    newBehavior: 'Streamlined Board View first path, progressive disclosure, plain words, and 3-step board tour.'
  }
];

export const STORAGE_KEY_FEATURES = 'dataanalytix_features';

export const BRAND = {
  primary: 'Data Analytix',
  platformClassic: 'NexusBI',
  telemetryClassic: 'AcuityBI',
  author: 'Kamran Badar'
} as const;

export function loadFeatureFlags(): FeatureFlags {
  // 1. Start with defaults (all false)
  const flags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

  // 2. Read environment overrides (VITE_FEATURE_*)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const env = import.meta.env;
    Object.keys(DEFAULT_FEATURE_FLAGS).forEach(key => {
      const legacyEnvKey = `VITE_FEATURE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
      const cleanEnvKey = `VITE_FEATURE_${key
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .toUpperCase()}`;
      const val = env[cleanEnvKey] !== undefined ? env[cleanEnvKey] : env[legacyEnvKey];
      if (val === 'true' || val === '1') {
        (flags as any)[key] = true;
      } else if (val === 'false' || val === '0') {
        (flags as any)[key] = false;
      }
    });
  }

  // 3. Layer localStorage user preferences
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_FEATURES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          if (!('premiumUX' in parsed)) {
            flags.premiumUX = false;
          }
          Object.keys(DEFAULT_FEATURE_FLAGS).forEach(key => {
            if (typeof parsed[key] === 'boolean') {
              (flags as any)[key] = parsed[key];
            }
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse feature flags from localStorage:', e);
    }
  }

  return flags;
}

export function saveFeatureFlags(flags: FeatureFlags): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_FEATURES, JSON.stringify(flags));
      // Dispatch custom event so reactive components can update immediately
      window.dispatchEvent(new CustomEvent('dataanalytix:features-updated', { detail: flags }));
    } catch (e) {
      console.warn('Failed to save feature flags to localStorage:', e);
    }
  }
}

export function resetFeatureFlags(): FeatureFlags {
  const flags = { ...CLASSIC_FEATURE_FLAGS };
  saveFeatureFlags(flags);
  return flags;
}

export function enableDefaultFeatureFlags(): FeatureFlags {
  const flags = { ...DEFAULT_FEATURE_FLAGS };
  saveFeatureFlags(flags);
  return flags;
}

export function getBrandText(
  type: 'primary' | 'platform' | 'telemetry',
  flags: FeatureFlags = loadFeatureFlags()
): string {
  if (flags.unifiedBranding) {
    return BRAND.primary;
  }
  if (type === 'platform') return BRAND.platformClassic;
  if (type === 'telemetry') return BRAND.telemetryClassic;
  return BRAND.primary;
}
