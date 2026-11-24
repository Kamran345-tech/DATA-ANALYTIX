import { FeatureFlags, loadFeatureFlags } from '../config/features';
import { ResolvedTheme, STORAGE_KEY_THEME, STORAGE_KEY_THEME_PREF, getSystemTheme } from './theme';

export const STORAGE_KEY_THEME_STUDIO = 'dataanalytix_theme_studio_v1';

export type AccentPresetId = 'lime' | 'ocean' | 'violet' | 'sunset' | 'rose' | 'mono' | 'custom';
export type GlassIntensity = 'low' | 'medium' | 'high';
export type RadiusPreset = 'sharp' | 'rounded' | 'pill';
export type DensityPreset = 'comfortable' | 'compact';

export interface ThemeStudioConfig {
  mode: 'light' | 'dark' | 'system';
  accentPreset: AccentPresetId;
  customAccentHex: string;
  glassIntensity: GlassIntensity;
  radius: RadiusPreset;
  density: DensityPreset;
  accessiblePalette: boolean;
}

export interface AccentPresetMeta {
  id: Exclude<AccentPresetId, 'custom'>;
  label: string;
  darkHex: string;
  lightHex: string;
  swatchHex: string;
}

export const ACCENT_PRESETS: readonly AccentPresetMeta[] = [
  {
    id: 'lime',
    label: 'Lime',
    darkHex: '#A3E635',
    lightHex: '#3F6212',
    swatchHex: '#84CC16',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    darkHex: '#2DD4BF',
    lightHex: '#0F766E',
    swatchHex: '#14B8A6',
  },
  {
    id: 'violet',
    label: 'Violet',
    darkHex: '#A78BFA',
    lightHex: '#5B21B6',
    swatchHex: '#8B5CF6',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    darkHex: '#FB923C',
    lightHex: '#9A3412',
    swatchHex: '#F97316',
  },
  {
    id: 'rose',
    label: 'Rose',
    darkHex: '#FB7185',
    lightHex: '#9F1239',
    swatchHex: '#F43F5E',
  },
  {
    id: 'mono',
    label: 'Mono',
    darkHex: '#E2E8F0',
    lightHex: '#1E293B',
    swatchHex: '#64748B',
  },
] as const;

export const DEFAULT_THEME_STUDIO_CONFIG: ThemeStudioConfig = {
  mode: 'dark',
  accentPreset: 'ocean',
  customAccentHex: '#14B8A6',
  glassIntensity: 'medium',
  radius: 'rounded',
  density: 'comfortable',
  accessiblePalette: false,
};

export interface GeneratedThemeTokens {
  resolvedMode: ResolvedTheme;
  rawAccentHex: string;
  accent: string;
  accentSoft: string;
  accent2: string;
  textOnAccent: string;
  wasContrastAdjusted: boolean;
  contrastRatioOnCard: number;
  onAccentContrastRatio: number;
  bgApp: string;
  bgSidebar: string;
  bgCard: string;
  bgCardHover: string;
  bgInput: string;
  bgElevated: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  glassBg: string;
  glassBorder: string;
  glassBlur: string;
  glassActiveBg: string;
  glassActiveFg: string;
  radiusCard: string;
  radiusControl: string;
  densityPad: string;
  chartPalette: [string, string, string, string, string, string, string, string];
}

// --- Color Math Helpers ---

export function normalizeHex(input: string, fallback = '#2DD4BF'): string {
  const cleaned = (input || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return (
      '#' +
      cleaned
        .split('')
        .map((c) => c + c)
        .join('')
        .toUpperCase()
    );
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return '#' + cleaned.toUpperCase();
  }
  return fallback.toUpperCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const norm = normalizeHex(hex).slice(1);
  return {
    r: parseInt(norm.slice(0, 2), 16),
    g: parseInt(norm.slice(2, 4), 16),
    b: parseInt(norm.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;

  if (sn === 0) {
    const val = Math.round(ln * 255);
    return rgbToHex(val, val, val);
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const r = hue2rgb(p, q, hn + 1 / 3);
  const g = hue2rgb(p, q, hn);
  const b = hue2rgb(p, q, hn - 1 / 3);
  return rgbToHex(r * 255, g * 255, b * 255);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (c: number) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Ensures the chosen accent color meets WCAG AA >= 4.5:1 against the active surface
 * (and >= 3:1 for graphics), automatically adjusting lightness if needed.
 */
export function ensureReadableAccent(
  rawHex: string,
  resolvedMode: ResolvedTheme,
  bgCardHex: string,
  bgAppHex: string
): {
  accentHex: string;
  textOnAccentHex: string;
  wasAdjusted: boolean;
  contrastOnCard: number;
  onAccentContrast: number;
} {
  const normalized = normalizeHex(rawHex, resolvedMode === 'light' ? '#0F766E' : '#2DD4BF');
  const initialContrastCard = contrastRatio(normalized, bgCardHex);
  const initialContrastApp = contrastRatio(normalized, bgAppHex);

  const { r, g, b } = hexToRgb(normalized);
  const { h, s } = rgbToHsl(r, g, b);
  let currentL = rgbToHsl(r, g, b).l;
  let candidate = normalized;
  let wasAdjusted = false;

  const minRequired = 4.55;
  if (initialContrastCard < minRequired || initialContrastApp < minRequired) {
    wasAdjusted = true;
    // In dark mode, lighten the accent until >= 4.55:1 against bgCard and bgApp.
    // In light mode, darken the accent until >= 4.55:1 against bgCard and bgApp.
    const step = resolvedMode === 'dark' ? 2 : -2;
    for (let i = 0; i < 45; i++) {
      currentL = Math.max(12, Math.min(90, currentL + step));
      candidate = hslToHex(h, Math.max(s, resolvedMode === 'dark' ? 40 : 50), currentL);
      const cCard = contrastRatio(candidate, bgCardHex);
      const cApp = contrastRatio(candidate, bgAppHex);
      if (cCard >= minRequired && cApp >= minRequired) {
        break;
      }
    }
  }

  // Pick --text-on-accent with >= 4.5:1 contrast against candidate
  const darkInk = '#041E1E';
  const whiteInk = '#FFFFFF';
  let cDark = contrastRatio(candidate, darkInk);
  let cWhite = contrastRatio(candidate, whiteInk);

  if (Math.max(cDark, cWhite) < 4.55) {
    wasAdjusted = true;
    const step = resolvedMode === 'dark' ? 2 : -2;
    for (let i = 0; i < 30; i++) {
      currentL = Math.max(10, Math.min(92, currentL + step));
      candidate = hslToHex(h, s, currentL);
      cDark = contrastRatio(candidate, darkInk);
      cWhite = contrastRatio(candidate, whiteInk);
      if (
        Math.max(cDark, cWhite) >= 4.55 &&
        contrastRatio(candidate, bgCardHex) >= 4.5
      ) {
        break;
      }
    }
  }

  const textOnAccentHex = cDark >= cWhite ? darkInk : whiteInk;
  const onAccentContrast = Math.round(Math.max(cDark, cWhite) * 100) / 100;
  const contrastOnCard = Math.round(contrastRatio(candidate, bgCardHex) * 100) / 100;

  return {
    accentHex: candidate,
    textOnAccentHex,
    wasAdjusted,
    contrastOnCard,
    onAccentContrast,
  };
}

/**
 * Generates an 8-color chart palette (--chart-1 .. --chart-8) led by the active accent.
 * When `accessiblePalette` is enabled, uses an Okabe-Ito color-blind-safe sequence.
 */
export function buildChartPalette(
  accentHex: string,
  resolvedMode: ResolvedTheme,
  accessiblePalette: boolean
): [string, string, string, string, string, string, string, string] {
  if (accessiblePalette) {
    // Color-blind-safe Okabe-Ito inspired palette tuned for dark/light readability
    if (resolvedMode === 'light') {
      return [
        accentHex,
        '#0072B2', // Blue
        '#D55E00', // Vermilion
        '#009E73', // Bluish green
        '#CC79A7', // Reddish purple
        '#E69F00', // Orange
        '#56B4E9', // Sky blue
        '#332288', // Indigo
      ];
    }
    return [
      accentHex,
      '#56B4E9', // Sky blue
      '#E69F00', // Orange
      '#009E73', // Bluish green
      '#CC79A7', // Reddish purple
      '#F0E442', // Yellow
      '#38BDF8', // Cyan
      '#FB7185', // Coral
    ];
  }

  const { r, g, b } = hexToRgb(accentHex);
  const { h, s } = rgbToHsl(r, g, b);
  const baseSat = s < 15 ? 68 : Math.max(62, Math.min(88, s));
  const targetL = resolvedMode === 'light' ? 42 : 64;
  const offsets = [0, 45, 95, 145, 195, 240, 285, 325];

  const colors = offsets.map((offset, idx) => {
    if (idx === 0) return accentHex;
    const hue = (h + offset) % 360;
    const lightness =
      resolvedMode === 'light'
        ? targetL + (idx % 2 === 0 ? -4 : 4)
        : targetL + (idx % 2 === 0 ? 4 : -4);
    return hslToHex(hue, baseSat, lightness);
  });

  return colors as [string, string, string, string, string, string, string, string];
}

export function generateThemeTokens(
  config: ThemeStudioConfig = loadThemeStudioConfig(),
  overrideMode?: ResolvedTheme
): GeneratedThemeTokens {
  const resolvedMode: ResolvedTheme =
    overrideMode ||
    (config.mode === 'system' ? getSystemTheme() : config.mode === 'light' ? 'light' : 'dark');

  const isLight = resolvedMode === 'light';

  // Base surfaces
  const bgApp = isLight ? '#F8FAFC' : '#0B1120';
  const bgSidebar = isLight ? '#F1F5F9' : '#0E1629';
  const bgCard = isLight ? '#FFFFFF' : '#111A2E';
  const bgCardHover = isLight ? '#F1F5F9' : '#17233D';
  const bgInput = isLight ? '#F1F5F9' : '#0D1526';
  const bgElevated = isLight ? '#E2E8F0' : '#17233D';
  const borderSubtle = isLight ? '#CBD5E1' : '#1E293B';
  const borderStrong = isLight ? '#64748B' : '#64748B';
  const textPrimary = isLight ? '#0F172A' : '#E6ECF7';
  const textSecondary = isLight ? '#334155' : '#B4BFD3';
  const textMuted = isLight ? '#475569' : '#9AA7BD';

  // Determine raw accent from preset or custom hex
  const presetObj = ACCENT_PRESETS.find((p) => p.id === config.accentPreset);
  const rawAccentHex =
    config.accentPreset === 'custom'
      ? normalizeHex(config.customAccentHex, isLight ? '#0F766E' : '#2DD4BF')
      : presetObj
      ? isLight
        ? presetObj.lightHex
        : presetObj.darkHex
      : isLight
      ? '#0F766E'
      : '#2DD4BF';

  const {
    accentHex,
    textOnAccentHex,
    wasAdjusted,
    contrastOnCard,
    onAccentContrast,
  } = ensureReadableAccent(rawAccentHex, resolvedMode, bgCard, bgApp);

  const { r, g, b } = hexToRgb(accentHex);
  const accentSoft = `rgba(${r}, ${g}, ${b}, ${isLight ? 0.12 : 0.15})`;

  const chartPalette = buildChartPalette(accentHex, resolvedMode, config.accessiblePalette);
  const accent2 = chartPalette[1];

  // Glass intensity tokens
  const glassAlphaMap: Record<GlassIntensity, { bg: number; border: number; blur: string }> = {
    low: { bg: isLight ? 0.94 : 0.88, border: isLight ? 0.16 : 0.12, blur: '12px' },
    medium: { bg: isLight ? 0.86 : 0.76, border: isLight ? 0.24 : 0.2, blur: '20px' },
    high: { bg: isLight ? 0.76 : 0.64, border: isLight ? 0.34 : 0.3, blur: '28px' },
  };
  const gSpec = glassAlphaMap[config.glassIntensity] || glassAlphaMap.medium;
  const glassBg = isLight
    ? `rgba(255, 255, 255, ${gSpec.bg})`
    : `rgba(15, 23, 42, ${gSpec.bg})`;
  const glassBorder = `rgba(${r}, ${g}, ${b}, ${gSpec.border})`;

  // Radius tokens
  const radiusMap: Record<RadiusPreset, { card: string; control: string }> = {
    sharp: { card: '10px', control: '6px' },
    rounded: { card: '24px', control: '14px' },
    pill: { card: '32px', control: '9999px' },
  };
  const rSpec = radiusMap[config.radius] || radiusMap.rounded;

  // Density tokens
  const densityPad = config.density === 'compact' ? '16px' : '24px';

  return {
    resolvedMode,
    rawAccentHex,
    accent: accentHex,
    accentSoft,
    accent2,
    textOnAccent: textOnAccentHex,
    wasContrastAdjusted: wasAdjusted,
    contrastRatioOnCard: contrastOnCard,
    onAccentContrastRatio: onAccentContrast,
    bgApp,
    bgSidebar,
    bgCard,
    bgCardHover,
    bgInput,
    bgElevated,
    borderSubtle,
    borderStrong,
    textPrimary,
    textSecondary,
    textMuted,
    glassBg,
    glassBorder,
    glassBlur: gSpec.blur,
    glassActiveBg: accentHex,
    glassActiveFg: textOnAccentHex,
    radiusCard: rSpec.card,
    radiusControl: rSpec.control,
    densityPad,
    chartPalette,
  };
}

export function loadThemeStudioConfig(): ThemeStudioConfig {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_THEME_STUDIO_CONFIG };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_THEME_STUDIO);
    const legacyMode =
      (window.localStorage.getItem(STORAGE_KEY_THEME_PREF) as ThemeStudioConfig['mode'] | null) ||
      (window.localStorage.getItem(STORAGE_KEY_THEME) as ThemeStudioConfig['mode'] | null);

    if (!raw) {
      return {
        ...DEFAULT_THEME_STUDIO_CONFIG,
        mode:
          legacyMode === 'light' || legacyMode === 'dark' || legacyMode === 'system'
            ? legacyMode
            : DEFAULT_THEME_STUDIO_CONFIG.mode,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      mode:
        parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'system'
          ? parsed.mode
          : legacyMode === 'light' || legacyMode === 'dark' || legacyMode === 'system'
          ? legacyMode
          : DEFAULT_THEME_STUDIO_CONFIG.mode,
      accentPreset:
        parsed.accentPreset &&
        ['lime', 'ocean', 'violet', 'sunset', 'rose', 'mono', 'custom'].includes(parsed.accentPreset)
          ? parsed.accentPreset
          : DEFAULT_THEME_STUDIO_CONFIG.accentPreset,
      customAccentHex: normalizeHex(
        parsed.customAccentHex || DEFAULT_THEME_STUDIO_CONFIG.customAccentHex
      ),
      glassIntensity: ['low', 'medium', 'high'].includes(parsed.glassIntensity)
        ? parsed.glassIntensity
        : DEFAULT_THEME_STUDIO_CONFIG.glassIntensity,
      radius: ['sharp', 'rounded', 'pill'].includes(parsed.radius)
        ? parsed.radius
        : DEFAULT_THEME_STUDIO_CONFIG.radius,
      density: ['comfortable', 'compact'].includes(parsed.density)
        ? parsed.density
        : DEFAULT_THEME_STUDIO_CONFIG.density,
      accessiblePalette: Boolean(parsed.accessiblePalette),
    };
  } catch {
    return { ...DEFAULT_THEME_STUDIO_CONFIG };
  }
}

export function applyThemeStudioTokensToDOM(
  config: ThemeStudioConfig = loadThemeStudioConfig(),
  overrideMode?: ResolvedTheme,
  flags: FeatureFlags = loadFeatureFlags()
): GeneratedThemeTokens {
  const tokens = generateThemeTokens(config, overrideMode);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-accent-preset', config.accentPreset);
    root.setAttribute('data-glass-intensity', config.glassIntensity);
    root.setAttribute('data-radius-preset', config.radius);
    root.setAttribute('data-density-preset', config.density);
    root.setAttribute('data-accessible-palette', config.accessiblePalette ? 'true' : 'false');

    // Only apply dynamic token overrides when unifiedTheme is active (keep Classic untouched)
    if (flags.unifiedTheme) {
      root.style.setProperty('--accent', tokens.accent);
      root.style.setProperty('--accent-soft', tokens.accentSoft);
      root.style.setProperty('--accent-2', tokens.accent2);
      root.style.setProperty('--text-on-accent', tokens.textOnAccent);
      root.style.setProperty('--glass-bg', tokens.glassBg);
      root.style.setProperty('--glass-border', tokens.glassBorder);
      root.style.setProperty('--glass-blur', tokens.glassBlur);
      root.style.setProperty('--glass-active-bg', tokens.glassActiveBg);
      root.style.setProperty('--glass-active-fg', tokens.glassActiveFg);
      root.style.setProperty('--surface-app', tokens.bgApp);
      root.style.setProperty('--surface-sidebar', tokens.bgSidebar);
      root.style.setProperty('--surface-card', tokens.bgCard);
      root.style.setProperty('--surface-elevated', tokens.bgElevated);
      root.style.setProperty('--radius-card', tokens.radiusCard);
      root.style.setProperty('--radius-control', tokens.radiusControl);
      root.style.setProperty('--density-pad', tokens.densityPad);

      tokens.chartPalette.forEach((hex, idx) => {
        root.style.setProperty(`--chart-${idx + 1}`, hex);
      });
    } else {
      // Remove custom properties in Classic mode
      [
        '--accent',
        '--accent-soft',
        '--accent-2',
        '--text-on-accent',
        '--glass-bg',
        '--glass-border',
        '--glass-blur',
        '--glass-active-bg',
        '--glass-active-fg',
        '--surface-app',
        '--surface-sidebar',
        '--surface-card',
        '--surface-elevated',
        '--radius-card',
        '--radius-control',
        '--density-pad',
        '--chart-1',
        '--chart-2',
        '--chart-3',
        '--chart-4',
        '--chart-5',
        '--chart-6',
        '--chart-7',
        '--chart-8',
      ].forEach((prop) => root.style.removeProperty(prop));
    }
  }

  return tokens;
}

export function saveThemeStudioConfig(
  config: ThemeStudioConfig,
  overrideMode?: ResolvedTheme
): GeneratedThemeTokens {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_THEME_STUDIO, JSON.stringify(config));
      window.localStorage.setItem(STORAGE_KEY_THEME_PREF, config.mode);
      const resolved =
        overrideMode ||
        (config.mode === 'system' ? getSystemTheme() : config.mode === 'light' ? 'light' : 'dark');
      window.localStorage.setItem(STORAGE_KEY_THEME, resolved);
    } catch {
      // ignore storage errors
    }
  }
  const tokens = applyThemeStudioTokensToDOM(config, overrideMode);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('dataanalytix:theme-studio-updated', { detail: { config, tokens } })
    );
  }
  return tokens;
}

export function resetThemeStudioConfig(): GeneratedThemeTokens {
  return saveThemeStudioConfig({ ...DEFAULT_THEME_STUDIO_CONFIG });
}

/**
 * Returns the live active theme tokens for charts, KPI sparklines, PPTX exports, PDF exports,
 * and the Download Center so changing the theme recolours the entire product and exports.
 */
export function getActiveThemeTokens(overrideVariant?: 'dark' | 'light'): GeneratedThemeTokens {
  const cfg = loadThemeStudioConfig();
  return generateThemeTokens(cfg, overrideVariant);
}
