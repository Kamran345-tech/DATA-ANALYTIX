/**
 * Single Source of Truth — TypeScript Mirror of CSS Semantic Theme Tokens
 * Must stay 100% synchronized with :root and html.theme-light in src/index.css.
 * Enforced by tests/design-tokens-sync.test.ts.
 */

export interface SemanticTokenSet {
  '--bg-app': string;
  '--bg-sidebar': string;
  '--bg-card': string;
  '--bg-card-hover': string;
  '--bg-input': string;
  '--bg-elevated': string;
  '--border-subtle': string;
  '--border-strong': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--text-on-accent': string;
  '--accent': string;
  '--accent-soft': string;
  '--accent-2': string;
  '--success': string;
  '--warning': string;
  '--danger': string;
  '--info': string;
  '--focus-ring': string;
  '--shadow-card': string;
  '--chart-1': string;
  '--chart-2': string;
  '--chart-3': string;
  '--chart-4': string;
  '--chart-5': string;
  '--chart-6': string;
  '--chart-7': string;
  '--chart-8': string;
  '--chart-grid': string;
  '--chart-axis': string;
  '--chart-tooltip-bg': string;
}

export const DARK_TOKENS: SemanticTokenSet = {
  '--bg-app': '#0B1120',
  '--bg-sidebar': '#0E1629',
  '--bg-card': '#111A2E',
  '--bg-card-hover': '#17233D',
  '--bg-input': '#0D1526',
  '--bg-elevated': '#17233D',
  '--border-subtle': '#1E293B',
  '--border-strong': '#64748B',
  '--text-primary': '#E6ECF7',
  '--text-secondary': '#B4BFD3',
  '--text-muted': '#9AA7BD',
  '--text-on-accent': '#042F2E',
  '--accent': '#2DD4BF',
  '--accent-soft': 'rgba(45, 212, 191, 0.14)',
  '--accent-2': '#818CF8',
  '--success': '#34D399',
  '--warning': '#F59E0B',
  '--danger': '#F87171',
  '--info': '#38BDF8',
  '--focus-ring': 'rgba(45, 212, 191, 0.45)',
  '--shadow-card': '0 12px 32px -8px rgba(2, 6, 23, 0.55)',
  '--chart-1': '#2DD4BF',
  '--chart-2': '#818CF8',
  '--chart-3': '#38BDF8',
  '--chart-4': '#F59E0B',
  '--chart-5': '#F472B6',
  '--chart-6': '#A78BFA',
  '--chart-7': '#34D399',
  '--chart-8': '#FB7185',
  '--chart-grid': 'rgba(148, 163, 184, 0.16)',
  '--chart-axis': '#9AA7BD',
  '--chart-tooltip-bg': '#0E1629',
};

export const LIGHT_TOKENS: SemanticTokenSet = {
  '--bg-app': '#F6F8FC',
  '--bg-sidebar': '#FFFFFF',
  '--bg-card': '#FFFFFF',
  '--bg-card-hover': '#F1F5F9',
  '--bg-input': '#FFFFFF',
  '--bg-elevated': '#F8FAFC',
  '--border-subtle': '#D5DCE8',
  '--border-strong': '#64748B',
  '--text-primary': '#0F172A',
  '--text-secondary': '#334155',
  '--text-muted': '#5B6B82',
  '--text-on-accent': '#FFFFFF',
  '--accent': '#0F766E',
  '--accent-soft': 'rgba(15, 118, 110, 0.10)',
  '--accent-2': '#4F46E5',
  '--success': '#047857',
  '--warning': '#B45309',
  '--danger': '#B91C1C',
  '--info': '#0369A1',
  '--focus-ring': 'rgba(15, 118, 110, 0.35)',
  '--shadow-card': '0 8px 24px -6px rgba(15, 23, 42, 0.08)',
  '--chart-1': '#0F766E',
  '--chart-2': '#4F46E5',
  '--chart-3': '#0369A1',
  '--chart-4': '#B45309',
  '--chart-5': '#BE185D',
  '--chart-6': '#6D28D9',
  '--chart-7': '#047857',
  '--chart-8': '#BE123C',
  '--chart-grid': 'rgba(15, 23, 42, 0.10)',
  '--chart-axis': '#5B6B82',
  '--chart-tooltip-bg': '#FFFFFF',
};

export const SOP_PRINT_PALETTE = {
  bgPaper: '#FFFFFF',
  bgCard: '#F8FAFC',
  bgHeader: '#0F172A',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#5B6B82',
  borderSubtle: '#D5DCE8',
  accent: '#0F766E',
  accent2: '#4F46E5',
  warning: '#B45309',
  success: '#047857',
  danger: '#B91C1C',
} as const;

export const DESIGN_TOKENS = {
  version: '2.4.0',
  dark: DARK_TOKENS,
  light: LIGHT_TOKENS,
  brand: {
    name: 'Data Analytix',
    version: '2.4.0',
    groundDark: '#0B1120',
    cardDark: '#111A2E',
    textDark: '#E6ECF7',
    accentDark: '#2DD4BF',
    accent2Dark: '#818CF8',
    warningDark: '#F59E0B',
    groundLight: '#F6F8FC',
    cardLight: '#FFFFFF',
    textLight: '#0F172A',
    accentLight: '#0F766E',
    accent2Light: '#4F46E5',
    warningLight: '#B45309',
  },
  fonts: {
    heading: 'Space Grotesk',
    body: 'Inter',
    mono: 'JetBrains Mono',
  },
  printLayout: {
    format: 'a4' as const,
    marginMm: 20,
    minBodyPt: 11,
    minContrastRatio: 4.5,
  },
} as const;

export interface RuntimeChartPalette {
  bgApp: string;
  bgCard: string;
  bgElevated: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accent2: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chart6: string;
  chart7: string;
  chart8: string;
  chartSeries: string[];
  chartGrid: string;
  chartAxis: string;
  chartTooltipBg: string;
}

/**
 * Reads semantic CSS tokens at render time for D3 / SVG / Canvas charts.
 */
export function readRuntimeThemeTokens(isLightFallback = false): RuntimeChartPalette {
  const fallback = isLightFallback ? LIGHT_TOKENS : DARK_TOKENS;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      bgApp: fallback['--bg-app'],
      bgCard: fallback['--bg-card'],
      bgElevated: fallback['--bg-elevated'],
      borderSubtle: fallback['--border-subtle'],
      textPrimary: fallback['--text-primary'],
      textSecondary: fallback['--text-secondary'],
      textMuted: fallback['--text-muted'],
      accent: fallback['--accent'],
      accent2: fallback['--accent-2'],
      success: fallback['--success'],
      warning: fallback['--warning'],
      danger: fallback['--danger'],
      info: fallback['--info'],
      chart1: fallback['--chart-1'],
      chart2: fallback['--chart-2'],
      chart3: fallback['--chart-3'],
      chart4: fallback['--chart-4'],
      chart5: fallback['--chart-5'],
      chart6: fallback['--chart-6'],
      chart7: fallback['--chart-7'],
      chart8: fallback['--chart-8'],
      chartSeries: [
        fallback['--chart-1'],
        fallback['--chart-2'],
        fallback['--chart-3'],
        fallback['--chart-4'],
        fallback['--chart-5'],
        fallback['--chart-6'],
        fallback['--chart-7'],
        fallback['--chart-8'],
      ],
      chartGrid: fallback['--chart-grid'],
      chartAxis: fallback['--chart-axis'],
      chartTooltipBg: fallback['--chart-tooltip-bg'],
    };
  }

  const cs = window.getComputedStyle(document.documentElement);
  const get = (key: keyof SemanticTokenSet): string => {
    const val = cs.getPropertyValue(key).trim();
    return val || fallback[key];
  };

  const c1 = get('--chart-1');
  const c2 = get('--chart-2');
  const c3 = get('--chart-3');
  const c4 = get('--chart-4');
  const c5 = get('--chart-5');
  const c6 = get('--chart-6');
  const c7 = get('--chart-7');
  const c8 = get('--chart-8');

  return {
    bgApp: get('--bg-app'),
    bgCard: get('--bg-card'),
    bgElevated: get('--bg-elevated'),
    borderSubtle: get('--border-subtle'),
    textPrimary: get('--text-primary'),
    textSecondary: get('--text-secondary'),
    textMuted: get('--text-muted'),
    accent: get('--accent'),
    accent2: get('--accent-2'),
    success: get('--success'),
    warning: get('--warning'),
    danger: get('--danger'),
    info: get('--info'),
    chart1: c1,
    chart2: c2,
    chart3: c3,
    chart4: c4,
    chart5: c5,
    chart6: c6,
    chart7: c7,
    chart8: c8,
    chartSeries: [c1, c2, c3, c4, c5, c6, c7, c8],
    chartGrid: get('--chart-grid'),
    chartAxis: get('--chart-axis'),
    chartTooltipBg: get('--chart-tooltip-bg'),
  };
}

/**
 * Sanitizes a segment for SOP filenames (lowercase alphanumeric + hyphens, no spaces).
 */
export function slugifySopSegment(input: string, fallback = 'general'): string {
  const cleaned = (input || '')
    .replace(/\.[a-zA-Z0-9]+$/, '') // strip file extension if present
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

/**
 * Enforces DESIGN-SOP.md file naming convention:
 * data-analytix-<type>-<dataset>-YYYY-MM-DD.<ext> (zero spaces).
 */
export function buildSopFileName(
  type: string,
  datasetName?: string | null,
  ext = 'pdf',
  date: Date = new Date()
): string {
  const safeType = slugifySopSegment(type, 'export');
  const safeDataset = slugifySopSegment(datasetName || 'workspace', 'workspace');
  const safeExt = ext.replace(/^\.+/, '').toLowerCase();
  const yyyyMmDd = date.toISOString().slice(0, 10);
  return `data-analytix-${safeType}-${safeDataset}-${yyyyMmDd}.${safeExt}`;
}

export interface SopExportMetadata {
  brand: string;
  brandName: string;
  appVersion: string;
  generatedDate: string;
  generatedIso: string;
  datasetName: string;
  rowCount: number;
  columnCount: number;
  source: string;
}

export function buildSopMetadata(params: {
  datasetName?: string | null;
  rowCount?: number;
  columnCount?: number;
  source?: string | null;
  date?: Date;
}): SopExportMetadata {
  const now = params.date || new Date();
  return {
    brand: DESIGN_TOKENS.brand.name,
    brandName: DESIGN_TOKENS.brand.name,
    appVersion: DESIGN_TOKENS.brand.version,
    generatedDate: now.toISOString().slice(0, 10),
    generatedIso: now.toISOString(),
    datasetName: params.datasetName?.trim() || 'No dataset loaded (Template / Reference)',
    rowCount: typeof params.rowCount === 'number' ? params.rowCount : 0,
    columnCount: typeof params.columnCount === 'number' ? params.columnCount : 0,
    source: params.source?.trim() || 'Data Analytix In-Browser Engine',
  };
}

/**
 * Generates a standardized header comment block for SQL, DAX, Python, and PowerQuery files.
 */
export function buildSopCodeHeaderComment(
  language: 'sql' | 'dax' | 'python' | 'm',
  title: string,
  meta: SopExportMetadata
): string {
  const prefix = language === 'python' ? '#' : '--';
  return [
    `${prefix} ============================================================================`,
    `${prefix} ${meta.brandName} — ${title}`,
    `${prefix} Generated Date : ${meta.generatedDate} (${meta.generatedIso})`,
    `${prefix} App Version    : v${meta.appVersion}`,
    `${prefix} Dataset Name   : ${meta.datasetName}`,
    `${prefix} Row Count      : ${meta.rowCount.toLocaleString()}`,
    `${prefix} Source         : ${meta.source}`,
    `${prefix} ============================================================================`,
    '',
  ].join('\n');
}

/**
 * Produces a theme-aware translucent CSS color using color-mix() on a semantic variable.
 */
export function colorWithAlpha(cssVarExpr: string, alphaRatio: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(alphaRatio) ? alphaRatio : 0.5));
  const pct = Math.round(clamped * 100);
  return `color-mix(in srgb, ${cssVarExpr} ${pct}%, transparent)`;
}

export const DASHBOARD_THEME_PALETTES: Record<
  string,
  {
    name: string;
    trendActual: string;
    trendSma: string;
    trendAreaGrad: string;
    donutColors: { stroke: string; dot: string }[];
    barColors: string[];
  }
> = {
  cyber_emerald: {
    name: 'Azure Blue',
    trendActual: 'var(--chart-1)',
    trendSma: 'var(--chart-2)',
    trendAreaGrad: 'var(--chart-2)',
    donutColors: [
      { stroke: 'var(--chart-1)', dot: 'bg-sky-600' },
      { stroke: 'var(--chart-3)', dot: 'bg-sky-400' },
      { stroke: 'var(--chart-2)', dot: 'bg-indigo-500' },
      { stroke: 'var(--chart-6)', dot: 'bg-purple-500' },
      { stroke: 'var(--chart-5)', dot: 'bg-pink-500' },
      { stroke: 'var(--chart-4)', dot: 'bg-amber-500' },
    ],
    barColors: ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-2)', 'var(--chart-6)'],
  },
  wall_street: {
    name: 'Wall St',
    trendActual: 'var(--chart-7)',
    trendSma: 'var(--chart-4)',
    trendAreaGrad: 'var(--chart-4)',
    donutColors: [
      { stroke: 'var(--chart-7)', dot: 'bg-emerald-500' },
      { stroke: 'var(--chart-1)', dot: 'bg-emerald-600' },
      { stroke: 'var(--chart-4)', dot: 'bg-amber-500' },
      { stroke: 'var(--warning)', dot: 'bg-amber-600' },
      { stroke: 'var(--accent)', dot: 'bg-teal-600' },
      { stroke: 'var(--chart-axis)', dot: 'bg-teal-500' },
    ],
    barColors: ['var(--chart-7)', 'var(--chart-1)', 'var(--chart-4)', 'var(--warning)'],
  },
  power_bi: {
    name: 'Power BI',
    trendActual: 'var(--chart-4)',
    trendSma: 'var(--chart-3)',
    trendAreaGrad: 'var(--chart-3)',
    donutColors: [
      { stroke: 'var(--chart-4)', dot: 'bg-amber-400' },
      { stroke: 'var(--chart-3)', dot: 'bg-blue-600' },
      { stroke: 'var(--chart-6)', dot: 'bg-purple-700' },
      { stroke: 'var(--chart-8)', dot: 'bg-orange-600' },
      { stroke: 'var(--chart-7)', dot: 'bg-green-700' },
      { stroke: 'var(--chart-1)', dot: 'bg-cyan-600' },
    ],
    barColors: ['var(--chart-4)', 'var(--chart-3)', 'var(--chart-6)', 'var(--chart-8)'],
  },
  sunset_royal: {
    name: 'Royal',
    trendActual: 'var(--chart-6)',
    trendSma: 'var(--chart-5)',
    trendAreaGrad: 'var(--chart-5)',
    donutColors: [
      { stroke: 'var(--chart-6)', dot: 'bg-purple-500' },
      { stroke: 'var(--chart-5)', dot: 'bg-pink-500' },
      { stroke: 'var(--chart-8)', dot: 'bg-rose-500' },
      { stroke: 'var(--chart-2)', dot: 'bg-violet-500' },
      { stroke: 'var(--chart-3)', dot: 'bg-sky-400' },
      { stroke: 'var(--chart-4)', dot: 'bg-amber-500' },
    ],
    barColors: ['var(--chart-6)', 'var(--chart-5)', 'var(--chart-8)', 'var(--chart-2)'],
  },
  nordic_light: {
    name: 'Frost',
    trendActual: 'var(--chart-3)',
    trendSma: 'var(--chart-1)',
    trendAreaGrad: 'var(--chart-1)',
    donutColors: [
      { stroke: 'var(--chart-3)', dot: 'bg-sky-400' },
      { stroke: 'var(--chart-1)', dot: 'bg-teal-400' },
      { stroke: 'var(--info)', dot: 'bg-sky-500' },
      { stroke: 'var(--accent)', dot: 'bg-teal-500' },
      { stroke: 'var(--chart-2)', dot: 'bg-blue-400' },
      { stroke: 'var(--chart-axis)', dot: 'bg-indigo-400' },
    ],
    barColors: ['var(--chart-3)', 'var(--chart-1)', 'var(--info)', 'var(--accent)'],
  },
};

