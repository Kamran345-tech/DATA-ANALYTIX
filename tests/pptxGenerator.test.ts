import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  buildPresentationSlides,
  generatePresentationPptxBlob,
  estimateSlideOverflow,
} from '../src/engine/pptxGenerator';
import {
  ANALYTICS_PACKS,
  getPackById,
  computeKpis,
  mapRoles,
  pickBestPackForDataset,
  evaluateKpiDelta,
  validateChartTitleAndSeries,
} from '../src/analytics';
import { DEMO_DATASETS } from '../src/data/demoDatasets';
import { inferTypes } from '../src/engine/dataParser';
import { profileDataset } from '../src/engine/dataProfiler';
import { evaluateDataQuality } from '../src/engine/dataQuality';

function buildColumnsForRows(rows: Record<string, any>[]) {
  if (!rows.length) return [];
  const colNames = Object.keys(rows[0]);
  const types = inferTypes(colNames, rows);
  return profileDataset(colNames, rows, types);
}

describe('Phase 4 & Part A1-A9: 13-Slide 16:9 PPTX Presentation Generator, Overflow Engine & Native Editable Charts', () => {
  for (const pack of ANALYTICS_PACKS) {
    it(`builds a valid 13-slide .pptx zip with native charts, zero overflow (A1), non-duplicated Slide 1/2 (A3), and formula-free Slide 11 (A2) for pack "${pack.id}" (${pack.name})`, async () => {
      const rows = pack.sampleDataset();
      const columns = buildColumnsForRows(rows);

      const previewSlides = buildPresentationSlides({
        datasetName: `${pack.name} Sample Dataset`,
        companyName: 'DATA ANALYTIX',
        department: 'Executive Intelligence',
        scope: 'pack',
        packId: pack.id,
        audience: 'manager',
        rows,
        columns,
      });

      // Full 13-slide spec when full pack data exists:
      // 1 cover, 2 executive_summary, 3 kpis, 4-8 (5 key charts), 9 diagnostic, 10 predictive, 11 recommendations, 12 data_quality, 13 appendix
      expect(previewSlides.length).toBe(13);
      expect(previewSlides[0].kind).toBe('cover');
      // Part A3: Slide 1 (cover) has NO stat cards (headlineMetrics is empty) and has coverMeta
      expect(previewSlides[0].headlineMetrics.length).toBe(0);
      expect(previewSlides[0].coverMeta).toBeDefined();

      // Part A3: Slide 2 (executive_summary) has ONE headline and 3 stat cards, and no repeated bullets from Slide 1
      expect(previewSlides[1].kind).toBe('executive_summary');
      expect(previewSlides[1].headlineMetrics.length).toBe(3);
      const slide1Bullets = new Set(previewSlides[0].bullets);
      for (const b of previewSlides[1].bullets) {
        expect(slide1Bullets.has(b)).toBe(false);
      }

      expect(previewSlides[2].kind).toBe('kpis');
      expect(previewSlides[2].kpis.length).toBeGreaterThanOrEqual(6);
      expect(previewSlides[2].kpis.length).toBeLessThanOrEqual(8);
      expect(previewSlides[2].kpis.every((k) => k.status === 'available')).toBe(true);

      // Slides 4-8: one slide per key chart
      for (let i = 3; i <= 7; i++) {
        const chartSlide = previewSlides[i];
        expect(chartSlide.kind).toBe('charts');
        expect(chartSlide.chartBars.length).toBeGreaterThan(0);
        expect(chartSlide.nativeChart).toBeDefined();

        // Part A5: If title mentions "vs" or "and", nativeChart must include >= 2 series
        const titleCheck = validateChartTitleAndSeries(
          chartSlide.chartTitle,
          chartSlide.nativeChart!.series.map((s) => s.name)
        );
        expect(titleCheck.isValid).toBe(true);

        // Part A6: Bar charts always start at zero
        if (chartSlide.nativeChart!.chartType === 'bar') {
          expect(chartSlide.nativeChart!.valAxisMinVal).toBe(0);
        }

        // Part A6: Average/ratio measures never claim "% Share" in bullets or soWhat
        if (chartSlide.measureType === 'average' || chartSlide.measureType === 'ratio') {
          expect(chartSlide.soWhat).not.toMatch(/%\s*share/i);
          for (const b of chartSlide.bullets) {
            expect(b).not.toMatch(/%\s*share/i);
          }
        }
      }

      expect(previewSlides[8].kind).toBe('diagnostic');
      expect(previewSlides[9].kind).toBe('predictive');
      expect(previewSlides[9].nativeChart?.chartType).toBe('line');

      // Part A2: Slide 11 (Recommendations) has 3-5 bullets, <= 110 chars each, contains Owner & Impact, and zero raw formulas
      const recSlide = previewSlides[10];
      expect(recSlide.kind).toBe('recommendations');
      expect(recSlide.bullets.length).toBeGreaterThanOrEqual(3);
      expect(recSlide.bullets.length).toBeLessThanOrEqual(5);
      for (const b of recSlide.bullets) {
        expect(b.length).toBeLessThanOrEqual(110);
        expect(b).toContain('Owner:');
        expect(b).toContain('Impact:');
        expect(b).not.toMatch(/\b(SUM|AVG|COUNT)\s*\(/i);
      }

      expect(previewSlides[11].kind).toBe('data_quality');
      expect(previewSlides[12].kind).toBe('appendix');

      // Part A1: Overflow check for EVERY slide of EVERY pack (0 overflows allowed)
      for (const s of previewSlides) {
        const overflowReport = estimateSlideOverflow(s);
        expect(overflowReport.overflowCount).toBe(0);
        expect(s.title.length).toBeGreaterThan(10);
        expect(s.soWhat).toMatch(/^So what:/);
        expect(s.sourceFootnote).toContain('Source:');
        expect(s.altText.length).toBeGreaterThan(10);
        expect(s.speakerNotes.length).toBeGreaterThan(15);
        expect(s.bullets.length).toBeGreaterThan(0);
        expect(s.bullets.length).toBeLessThanOrEqual(5);
      }

      const { blob, slideCount, slides } = await generatePresentationPptxBlob({
        datasetName: `${pack.name} Sample Dataset`,
        companyName: 'DATA ANALYTIX',
        department: 'Executive Intelligence',
        scope: 'pack',
        packId: pack.id,
        audience: 'manager',
        rows,
        columns,
      });

      // Slide count matches preview panel
      expect(slideCount).toBe(previewSlides.length);
      expect(slides.length).toBe(previewSlides.length);
      expect(blob.size).toBeGreaterThan(25000);

      // Verify valid ZIP structure, slides XMLs, and NATIVE PowerPoint charts (ppt/charts/chart*.xml)
      const arrayBuffer = await blob.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const fileNames = Object.keys(zip.files);

      expect(zip.file('ppt/presentation.xml')).not.toBeNull();
      const slideXmlFiles = fileNames.filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
      expect(slideXmlFiles.length).toBe(previewSlides.length);

      const chartXmlFiles = fileNames.filter((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f));
      expect(chartXmlFiles.length).toBeGreaterThanOrEqual(6);

      // Verify no empty slide XML and verify font sizes (titles sz="2800" = 28pt)
      for (const sFile of slideXmlFiles) {
        const xml = await zip.file(sFile)!.async('string');
        expect(xml.length).toBeGreaterThan(1000);
        expect(xml).toContain('sz="2800"');
      }
    });
  }

  it('Part A4: evaluateKpiDelta enforces goodDirection + sign + neutral band (|delta| < 0.5%) consistently', () => {
    // Neutral band: |delta| < 0.5% is always neutral (never green for -0.1%)
    const smallNegative = evaluateKpiDelta(-0.1, 'up');
    expect(smallNegative.state).toBe('neutral');
    expect(smallNegative.direction).toBe('down');
    expect(smallNegative.textLabel).toBe('down 0.1%');

    const zeroDelta = evaluateKpiDelta(0, 'up');
    expect(zeroDelta.state).toBe('neutral');
    expect(zeroDelta.direction).toBe('flat');
    expect(zeroDelta.textLabel).toBe('flat 0.0%');

    const smallPositiveDownGood = evaluateKpiDelta(0.3, 'down');
    expect(smallPositiveDownGood.state).toBe('neutral');
    expect(smallPositiveDownGood.direction).toBe('up');
    expect(smallPositiveDownGood.textLabel).toBe('up 0.3%');

    // Good direction = 'up'
    const upGoodPositive = evaluateKpiDelta(12.4, 'up');
    expect(upGoodPositive.state).toBe('favorable');
    expect(upGoodPositive.direction).toBe('up');
    expect(upGoodPositive.textLabel).toBe('up 12.4%');

    const upGoodNegative = evaluateKpiDelta(-4.8, 'up');
    expect(upGoodNegative.state).toBe('unfavorable');
    expect(upGoodNegative.direction).toBe('down');
    expect(upGoodNegative.textLabel).toBe('down 4.8%');

    // Good direction = 'down' (e.g. Churn Rate, CPA, Cycle Time)
    const downGoodNegative = evaluateKpiDelta(-3.2, 'down');
    expect(downGoodNegative.state).toBe('favorable');
    expect(downGoodNegative.direction).toBe('down');
    expect(downGoodNegative.textLabel).toBe('down 3.2%');

    const downGoodPositive = evaluateKpiDelta(6.5, 'down');
    expect(downGoodPositive.state).toBe('unfavorable');
    expect(downGoodPositive.direction).toBe('up');
    expect(downGoodPositive.textLabel).toBe('up 6.5%');
  });

  it('Part A7: Slide 12 (Data Quality) never prints "Certified" or "100%" when quality issues exist', () => {
    const noisyRows = [
      { date: '2025-01-01', revenue: 100000, region: 'North America' },
      { date: '2025-01-01', revenue: 100000, region: 'North America' }, // exact duplicate
      { date: '2025-02-01', revenue: null, region: '  EMEA  ' }, // null + whitespace
      { date: '2025-03-01', revenue: 150000, region: 'APAC' },
      { date: '2025-04-01', revenue: 99999999, region: 'LATAM' }, // extreme outlier
    ];
    const columns = buildColumnsForRows(noisyRows);
    const qualityReport = evaluateDataQuality(columns, noisyRows);

    expect(qualityReport.issues.length).toBeGreaterThan(0);
    expect(qualityReport.overallScore).toBeLessThan(100);
    expect(qualityReport.grade).not.toBe('A+');

    const slides = buildPresentationSlides({
      datasetName: 'Noisy Sales Dataset',
      scope: 'pack',
      packId: 'sales',
      rows: noisyRows,
      columns,
      qualityReport,
    });

    const dqSlide = slides.find((s) => s.kind === 'data_quality')!;
    expect(dqSlide).toBeDefined();
    expect(dqSlide.qualitySummary.issuesCount).toBeGreaterThan(0);
    expect(dqSlide.qualitySummary.overallScore).toBeLessThan(100);
    expect(dqSlide.title).not.toContain('Certified (0 Findings)');
    expect(dqSlide.title).not.toContain('100%');
  });

  it('skips Unavailable KPIs on the KPI Scorecard slide and lists them once on the Data Quality & Assumptions slide with their missing column', () => {
    const partialRows = [
      { date: '2025-01-01', revenue: 120000, region: 'North America' },
      { date: '2025-02-01', revenue: 145000, region: 'EMEA' },
      { date: '2025-03-01', revenue: 162000, region: 'APAC' },
      { date: '2025-04-01', revenue: 180000, region: 'North America' },
    ];
    const columns = buildColumnsForRows(partialRows);

    const slides = buildPresentationSlides({
      datasetName: 'Partial Sales Slice',
      scope: 'pack',
      packId: 'sales',
      rows: partialRows,
      columns,
    });

    const kpiSlide = slides.find((s) => s.kind === 'kpis');
    expect(kpiSlide).toBeDefined();
    expect(kpiSlide!.kpis.every((k) => k.status === 'available')).toBe(true);
    expect(kpiSlide!.kpis.some((k) => k.formattedValue.includes('Unavailable'))).toBe(false);

    const dqSlide = slides.find((s) => s.kind === 'data_quality');
    expect(dqSlide).toBeDefined();
    expect(dqSlide!.unavailableKpis.length).toBeGreaterThan(0);
    expect(dqSlide!.unavailableKpis[0].missingColumn).toBeTruthy();
  });

  it('builds a clean zero-data template deck with zero empty chart slides and zero blank KPI tiles when rows is empty', () => {
    const slides = buildPresentationSlides({
      datasetName: 'Empty Workspace',
      scope: 'pack',
      packId: 'hr',
      audience: 'board',
      rows: [],
      columns: [],
    });

    expect(slides.length).toBe(4);
    expect(slides.some((s) => s.kind === 'kpis')).toBe(false);
    expect(slides.some((s) => s.kind === 'charts')).toBe(false);
    for (const s of slides) {
      expect(s.hasData).toBe(false);
      expect(s.bullets.length).toBeGreaterThan(0);
    }
  });

  it('FIX 3: Global Enterprise Technology Sales & Margin Telemetry sample computes 100% active KPIs for Sales & Pipeline CRM', () => {
    const globalEnterpriseDemo = DEMO_DATASETS[0];
    const rows = globalEnterpriseDemo.generateData();
    const columns = buildColumnsForRows(rows);

    const salesPack = getPackById('sales');
    const roleMap = mapRoles(rows, salesPack);
    const kpis = computeKpis(salesPack, rows, roleMap);

    const unavailable = kpis.filter((k) => k.status === 'unavailable');
    expect(unavailable).toEqual([]);
    expect(kpis.every((k) => k.status === 'available')).toBe(true);

    const bestPackId = pickBestPackForDataset(columns, rows);
    expect(bestPackId).toBe('sales');
  });

  it('Phase 2.1 (A8/A9): renders dark and light variant decks across all 14 packs (28 decks total) with 13 slides, native charts, and 0 text overflows', async () => {
    const deckReport: {
      Pack: string;
      Variant: 'dark' | 'light';
      Slides: number;
      NativeCharts: number;
      Overflows: number;
      SizeKB: number;
    }[] = [];

    for (const pack of ANALYTICS_PACKS) {
      const rows = pack.sampleDataset();
      const columns = buildColumnsForRows(rows);

      for (const themeMode of ['dark', 'light'] as const) {
        const { blob, slideCount, slides } = await generatePresentationPptxBlob({
          datasetName: `${pack.name} (${themeMode})`,
          companyName: 'DATA ANALYTIX',
          department: 'Executive Intelligence',
          scope: 'pack',
          packId: pack.id,
          audience: 'manager',
          themeMode,
          rows,
          columns,
        });

        expect(slideCount).toBe(13);
        expect(slides.length).toBe(13);
        expect(blob.size).toBeGreaterThan(25000);

        let totalOverflows = 0;
        for (const s of slides) {
          const overflow = estimateSlideOverflow(s);
          totalOverflows += overflow.overflowCount;
          expect(overflow.overflowCount).toBe(0);
        }

        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const fileNames = Object.keys(zip.files);
        const slideXmls = fileNames.filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
        const chartXmls = fileNames.filter((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f));
        expect(slideXmls.length).toBe(13);
        expect(chartXmls.length).toBeGreaterThanOrEqual(6);

        if (themeMode === 'light') {
          const slide1Xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
          expect(slide1Xml).toContain('F8FAFC');
        }

        deckReport.push({
          Pack: `${pack.id} (${pack.name})`,
          Variant: themeMode,
          Slides: slideXmls.length,
          NativeCharts: chartXmls.length,
          Overflows: totalOverflows,
          SizeKB: Math.round(blob.size / 1024),
        });
      }
    }

    console.table(deckReport);
    expect(deckReport.length).toBe(28);
  });
});

