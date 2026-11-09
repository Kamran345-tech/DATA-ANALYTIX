import { describe, it, expect } from 'vitest';
import {
  UNIFIED_THEME_TOKENS,
  contrastRatio,
  passesWCAG_AA,
  parseColorToRgb,
  relativeLuminance,
} from '../src/utils/contrast';

describe('WCAG 2.1 Contrast Utility & Unified Theme Token Verification', () => {
  it('computes accurate relative luminance and contrast ratio for black and white', () => {
    expect(parseColorToRgb('#000000')).toEqual([0, 0, 0]);
    expect(parseColorToRgb('#FFFFFF')).toEqual([255, 255, 255]);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBe(21);
  });

  describe('Dark Theme Token Pairs (WCAG AA >= 4.5:1 normal text, >= 3.0:1 large text & UI)', () => {
    const dark = UNIFIED_THEME_TOKENS.dark;
    const surfaces = [
      { name: 'bgApp', value: dark.bgApp },
      { name: 'bgSidebar', value: dark.bgSidebar },
      { name: 'bgCard', value: dark.bgCard },
      { name: 'bgCardHover', value: dark.bgCardHover },
      { name: 'bgInput', value: dark.bgInput },
      { name: 'bgElevated', value: dark.bgElevated },
    ];

    const textTokens = [
      { name: 'textPrimary', value: dark.textPrimary },
      { name: 'textSecondary', value: dark.textSecondary },
      { name: 'textMuted', value: dark.textMuted },
    ];

    for (const surface of surfaces) {
      for (const txt of textTokens) {
        it(`ensures ${txt.name} (${txt.value}) on ${surface.name} (${surface.value}) >= 4.5:1`, () => {
          const ratio = contrastRatio(txt.value, surface.value);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
          expect(passesWCAG_AA(txt.value, surface.value, 'normalText')).toBe(true);
        });
      }
    }

    it('ensures semantic status & accent tokens pass >= 4.5:1 on dark card & app surfaces', () => {
      expect(contrastRatio(dark.accent, dark.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(dark.accent2, dark.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(dark.success, dark.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(dark.warning, dark.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(dark.danger, dark.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(dark.info, dark.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(dark.textOnAccent, dark.accent)).toBeGreaterThanOrEqual(4.5);
    });

    it('ensures strong UI border and all 8 chart series pass >= 3.0:1 on dark card', () => {
      expect(contrastRatio(dark.borderStrong, dark.bgCard)).toBeGreaterThanOrEqual(3.0);
      expect(contrastRatio(dark.chartAxis, dark.bgCard)).toBeGreaterThanOrEqual(4.5);
      const series = [
        dark.chart1,
        dark.chart2,
        dark.chart3,
        dark.chart4,
        dark.chart5,
        dark.chart6,
        dark.chart7,
        dark.chart8,
      ];
      for (const color of series) {
        expect(contrastRatio(color, dark.bgCard)).toBeGreaterThanOrEqual(3.0);
      }
    });
  });

  describe('Light Theme Token Pairs (WCAG AA >= 4.5:1 normal text, >= 3.0:1 large text & UI)', () => {
    const light = UNIFIED_THEME_TOKENS.light;
    const surfaces = [
      { name: 'bgApp', value: light.bgApp },
      { name: 'bgSidebar', value: light.bgSidebar },
      { name: 'bgCard', value: light.bgCard },
      { name: 'bgCardHover', value: light.bgCardHover },
      { name: 'bgInput', value: light.bgInput },
      { name: 'bgElevated', value: light.bgElevated },
    ];

    const textTokens = [
      { name: 'textPrimary', value: light.textPrimary },
      { name: 'textSecondary', value: light.textSecondary },
      { name: 'textMuted', value: light.textMuted },
    ];

    for (const surface of surfaces) {
      for (const txt of textTokens) {
        it(`ensures ${txt.name} (${txt.value}) on ${surface.name} (${surface.value}) >= 4.5:1`, () => {
          const ratio = contrastRatio(txt.value, surface.value);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
          expect(passesWCAG_AA(txt.value, surface.value, 'normalText')).toBe(true);
        });
      }
    }

    it('ensures semantic status & accent tokens pass >= 4.5:1 on light card & app surfaces', () => {
      expect(contrastRatio(light.accent, light.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(light.accent2, light.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(light.success, light.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(light.warning, light.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(light.danger, light.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(light.info, light.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(light.textOnAccent, light.accent)).toBeGreaterThanOrEqual(4.5);
    });

    it('ensures strong UI border and all 8 chart series pass >= 3.0:1 on light card', () => {
      expect(contrastRatio(light.borderStrong, light.bgCard)).toBeGreaterThanOrEqual(3.0);
      expect(contrastRatio(light.chartAxis, light.bgCard)).toBeGreaterThanOrEqual(4.5);
      const series = [
        light.chart1,
        light.chart2,
        light.chart3,
        light.chart4,
        light.chart5,
        light.chart6,
        light.chart7,
        light.chart8,
      ];
      for (const color of series) {
        expect(contrastRatio(color, light.bgCard)).toBeGreaterThanOrEqual(3.0);
      }
    });
  });
});
