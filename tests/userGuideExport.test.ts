import { describe, it, expect } from 'vitest';
import {
  DEFAULT_THEME_STUDIO_CONFIG,
  generateThemeTokens,
  contrastRatio,
  ensureReadableAccent,
  type AccentPresetId,
} from '../src/utils/themeStudio';
import {
  buildUserGuideSpec,
  generateUserGuidePdfDoc,
  generateUserGuidePptxBase64,
} from '../src/engine/userGuideExport';

describe('Theme Studio Engine & Token Generation', () => {
  it('generates full token sets and 8 chart colors for all 6 presets in dark and light modes', () => {
    const presetIds: AccentPresetId[] = ['lime', 'ocean', 'violet', 'sunset', 'rose', 'mono'];
    for (const accentPreset of presetIds) {
      for (const mode of ['dark', 'light'] as const) {
        const tokens = generateThemeTokens(
          {
            ...DEFAULT_THEME_STUDIO_CONFIG,
            accentPreset,
            mode,
          },
          mode
        );
        expect(tokens.accent).toMatch(/^#[0-9A-F]{6}$/i);
        expect(tokens.chartPalette).toHaveLength(8);
        tokens.chartPalette.forEach((hex) => {
          expect(hex).toMatch(/^#[0-9A-F]{6}$/i);
        });
        expect(contrastRatio(tokens.accent, tokens.bgCard)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('auto-adjusts low-contrast custom accent colours to meet >= 4.5:1 contrast and flags wasContrastAdjusted', () => {
    // Very dark navy on dark surface #111A2E fails 4.5:1 contrast
    const darkCheck = ensureReadableAccent('#111827', 'dark', '#111A2E', '#0B1120');
    expect(darkCheck.wasAdjusted).toBe(true);
    expect(darkCheck.contrastOnCard).toBeGreaterThanOrEqual(4.5);

    // Very pale yellow on light surface #FFFFFF fails 4.5:1 contrast
    const lightCheck = ensureReadableAccent('#FEF9C3', 'light', '#FFFFFF', '#F8FAFC');
    expect(lightCheck.wasAdjusted).toBe(true);
    expect(lightCheck.contrastOnCard).toBeGreaterThanOrEqual(4.5);

    const tokens = generateThemeTokens(
      {
        ...DEFAULT_THEME_STUDIO_CONFIG,
        accentPreset: 'custom',
        customAccentHex: '#151922',
      },
      'dark'
    );
    expect(tokens.wasContrastAdjusted).toBe(true);
    expect(tokens.contrastRatioOnCard).toBeGreaterThanOrEqual(4.5);
  });

  it('supports colour-blind-safe Accessible Palette mode', () => {
    const tokens = generateThemeTokens(
      {
        ...DEFAULT_THEME_STUDIO_CONFIG,
        accentPreset: 'ocean',
        accessiblePalette: true,
      },
      'dark'
    );
    expect(tokens.chartPalette).toHaveLength(8);
    expect(tokens.chartPalette[1]).toBe('#56B4E9');
  });
});

describe('How to Use: Downloadable User Guide (PDF & PPTX)', () => {
  it('builds complete User Guide specification with 5 value bullets, 4 workflow steps, 14 Analytics Packs, key features, and 3-minute checklist', () => {
    const spec = buildUserGuideSpec('theme');
    expect(spec.title).toContain('DATA');
    expect(spec.whatPlatformDoesBullets).toHaveLength(5);
    expect(spec.workflowSteps).toHaveLength(4);
    expect(spec.packsList).toHaveLength(14);
    expect(spec.keyFeatures.length).toBeGreaterThanOrEqual(4);
    expect(spec.getStartedSteps.length).toBeGreaterThanOrEqual(3);
    expect(spec.overflowReport.filter((r) => r.hasOverflow)).toHaveLength(0);
  });

  it('generates non-empty PDF document starting with %PDF header in active and print-friendly light modes', () => {
    const { doc, spec } = generateUserGuidePdfDoc('theme');
    expect(spec.overflowReport.filter((r) => r.hasOverflow)).toHaveLength(0);
    const pdfOutput = doc.output();
    expect(pdfOutput.startsWith('%PDF')).toBe(true);
    expect(pdfOutput.length).toBeGreaterThan(5000);

    const lightResult = generateUserGuidePdfDoc('print-white');
    expect(lightResult.doc.output().startsWith('%PDF')).toBe(true);
  });

  it('generates non-empty 6-slide PPTX deck starting with PK zip header and 0 slide overflows', async () => {
    const { base64, slideCount, overflowCount } = await generateUserGuidePptxBase64('theme');
    expect(slideCount).toBe(6);
    expect(overflowCount).toBe(0);
    const rawBuffer = Buffer.from(base64, 'base64');
    expect(rawBuffer.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(rawBuffer.byteLength).toBeGreaterThan(15000);
  });
});
