/**
 * WCAG 2.1 Relative Luminance & Contrast Ratio Utilities
 * Plus the single source of truth token definitions for Dark and Light themes.
 */

export interface ThemeTokenPalette {
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
  textOnAccent: string;
  accent: string;
  accentSoft: string;
  accent2: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  focusRing: string;
  shadowCard: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chart6: string;
  chart7: string;
  chart8: string;
  chartGrid: string;
  chartAxis: string;
  chartTooltipBg: string;
}

export const UNIFIED_THEME_TOKENS: Record<'dark' | 'light', ThemeTokenPalette> = {
  dark: {
    bgApp: '#0B1120',
    bgSidebar: '#0E1629',
    bgCard: '#111A2E',
    bgCardHover: '#17233D',
    bgInput: '#0D1526',
    bgElevated: '#17233D',
    borderSubtle: '#1E293B',
    borderStrong: '#64748B',
    textPrimary: '#E6ECF7',
    textSecondary: '#B4BFD3',
    textMuted: '#9AA7BD',
    textOnAccent: '#042F2E',
    accent: '#2DD4BF',
    accentSoft: 'rgba(45, 212, 191, 0.14)',
    accent2: '#818CF8',
    success: '#34D399',
    warning: '#F59E0B',
    danger: '#F87171',
    info: '#38BDF8',
    focusRing: 'rgba(45, 212, 191, 0.45)',
    shadowCard: '0 12px 32px -8px rgba(2, 6, 23, 0.55)',
    chart1: '#2DD4BF',
    chart2: '#818CF8',
    chart3: '#38BDF8',
    chart4: '#F59E0B',
    chart5: '#F472B6',
    chart6: '#A78BFA',
    chart7: '#34D399',
    chart8: '#FB7185',
    chartGrid: 'rgba(148, 163, 184, 0.16)',
    chartAxis: '#9AA7BD',
    chartTooltipBg: '#0E1629',
  },
  light: {
    bgApp: '#F6F8FC',
    bgSidebar: '#FFFFFF',
    bgCard: '#FFFFFF',
    bgCardHover: '#F1F5F9',
    bgInput: '#FFFFFF',
    bgElevated: '#F8FAFC',
    borderSubtle: '#D5DCE8',
    borderStrong: '#64748B',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#5B6B82',
    textOnAccent: '#FFFFFF',
    accent: '#0F766E',
    accentSoft: 'rgba(15, 118, 110, 0.10)',
    accent2: '#4F46E5',
    success: '#047857',
    warning: '#B45309',
    danger: '#B91C1C',
    info: '#0369A1',
    focusRing: 'rgba(15, 118, 110, 0.35)',
    shadowCard: '0 8px 24px -6px rgba(15, 23, 42, 0.08)',
    chart1: '#0F766E',
    chart2: '#4F46E5',
    chart3: '#0369A1',
    chart4: '#B45309',
    chart5: '#BE185D',
    chart6: '#6D28D9',
    chart7: '#047857',
    chart8: '#BE123C',
    chartGrid: 'rgba(15, 23, 42, 0.10)',
    chartAxis: '#5B6B82',
    chartTooltipBg: '#FFFFFF',
  },
};

export function parseColorToRgb(color: string): [number, number, number] {
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    const clean = trimmed.slice(1);
    const full =
      clean.length === 3
        ? clean
            .split('')
            .map((c) => c + c)
            .join('')
        : clean.slice(0, 6);
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) {
      throw new Error(`Invalid hex color: ${color}`);
    }
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return [
      Number.parseInt(rgbMatch[1], 10),
      Number.parseInt(rgbMatch[2], 10),
      Number.parseInt(rgbMatch[3], 10),
    ];
  }

  throw new Error(`Unsupported color format: ${color}`);
}

export function srgbChannelToLinear(channel8Bit: number): number {
  const s = channel8Bit / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: string | [number, number, number]): number {
  const [r, g, b] = Array.isArray(color) ? color : parseColorToRgb(color);
  const R = srgbChannelToLinear(r);
  const G = srgbChannelToLinear(g);
  const B = srgbChannelToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(
  foreground: string | [number, number, number],
  background: string | [number, number, number]
): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function passesWCAG_AA(
  foreground: string,
  background: string,
  mode: 'normalText' | 'largeText' | 'uiComponent' = 'normalText'
): boolean {
  const ratio = contrastRatio(foreground, background);
  const threshold = mode === 'normalText' ? 4.5 : 3.0;
  return ratio >= threshold;
}
