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
  it('builds complete User Guide specification with 5 value bullets, 4 workflow steps with real sample-data screenshots, 14 Analytics Packs, key features, 3-minute checklist, and zero ellipsis cut text', () => {
    const spec = buildUserGuideSpec('theme');
    expect(spec.title).toContain('DATA');
    expect(spec.whatPlatformDoesBullets).toHaveLength(5);
    expect(spec.workflowSteps).toHaveLength(4);
    for (const step of spec.workflowSteps) {
      expect(step.screenshotDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(step.screenshotDataUrl.length).toBeGreaterThan(10000);
    }
    expect(spec.packsList).toHaveLength(14);
    expect(spec.keyFeatures.length).toBeGreaterThanOrEqual(4);
    expect(spec.getStartedSteps.length).toBeGreaterThanOrEqual(3);
    expect(spec.slides.length).toBeGreaterThanOrEqual(6);
    expect(spec.overflowReport.filter((r) => r.hasOverflow)).toHaveLength(0);

    // Verify no ellipsis cut text ("..." or "…") anywhere across slides, bullets, packs, features, or steps
    const allTexts: string[] = [
      spec.title,
      spec.tagline,
      ...spec.whatPlatformDoesBullets,
      ...spec.workflowSteps.flatMap((w) => [w.title, w.summary, w.sampleMetric]),
      ...spec.packsList.flatMap((p) => [p.name, p.tagline]),
      ...spec.keyFeatures.flatMap((f) => [f.title, f.summary, f.proofMetric]),
      ...spec.getStartedSteps,
      ...spec.slides.flatMap((s) => [s.title, s.subtitle, s.soWhat, ...s.bullets]),
    ];

    const cutTexts = allTexts.filter((t) => t.includes('...') || t.includes('…'));
    expect(cutTexts).toEqual([]);
  });

  it('generates >= 6-page PDF document starting with %PDF header in active theme and white print-friendly variants', () => {
    const { doc, spec, pageCount } = generateUserGuidePdfDoc('theme');
    expect(pageCount).toBeGreaterThanOrEqual(6);
    expect(spec.overflowReport.filter((r) => r.hasOverflow)).toHaveLength(0);
    const pdfOutput = doc.output();
    expect(pdfOutput.startsWith('%PDF')).toBe(true);
    expect(pdfOutput.length).toBeGreaterThan(25000);

    const lightResult = generateUserGuidePdfDoc('print-white');
    expect(lightResult.pageCount).toBeGreaterThanOrEqual(6);
    expect(lightResult.spec.bgHex).toBe('#FFFFFF');
    expect(lightResult.doc.output().startsWith('%PDF')).toBe(true);
  });

  it('generates non-empty >= 6-slide PPTX deck starting with PK zip header in active theme and white print-friendly variants, 0 slide overflows, no ellipsis cut text, and no double-numbered bullets', async () => {
    const { base64, slideCount, overflowCount, spec, formattedBulletItems } =
      await generateUserGuidePptxBase64('theme');
    expect(slideCount).toBeGreaterThanOrEqual(6);
    expect(overflowCount).toBe(0);
    for (const slide of spec.slides) {
      expect(slide.title).not.toMatch(/\.{3}|…/);
      expect(slide.soWhat).not.toMatch(/\.{3}|…/);
      for (const bullet of slide.bullets) {
        expect(bullet).not.toMatch(/\.{3}|…/);
      }
    }

    // Verify no double numbering in PPTX bullets (e.g. "1.  1 Upload", "3.  3 Analyze", "1.  Minute 1:")
    expect(formattedBulletItems.length).toBeGreaterThan(0);
    for (const item of formattedBulletItems) {
      expect(item).not.toMatch(/^\d+\.\s+\d+\s/);
      expect(item).not.toMatch(/^\d+\.\s+(Step|Stage|Minute)\s+\d+/i);
    }

    const rawBuffer = Buffer.from(base64, 'base64');
    expect(rawBuffer.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(rawBuffer.byteLength).toBeGreaterThan(25000);

    // Also verify white print-friendly PPTX variant ("print-white")
    const whitePptx = await generateUserGuidePptxBase64('print-white');
    expect(whitePptx.slideCount).toBeGreaterThanOrEqual(6);
    expect(whitePptx.overflowCount).toBe(0);
    expect(whitePptx.spec.variant).toBe('print-white');
    expect(whitePptx.spec.bgHex).toBe('#FFFFFF');
    expect(whitePptx.spec.cardHex).toBe('#F8FAFC');
    expect(whitePptx.spec.textPrimaryHex).toBe('#0F172A');
    const whiteBuffer = Buffer.from(whitePptx.base64, 'base64');
    expect(whiteBuffer.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(whiteBuffer.byteLength).toBeGreaterThan(25000);
    for (const item of whitePptx.formattedBulletItems) {
      expect(item).not.toMatch(/^\d+\.\s+\d+\s/);
      expect(item).not.toMatch(/^\d+\.\s+(Step|Stage|Minute)\s+\d+/i);
    }
  });
});
