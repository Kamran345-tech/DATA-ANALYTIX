import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  buildPresentationSlides,
  generatePresentationPptxBlob,
} from '../src/engine/pptxGenerator';
import {
  ANALYTICS_PACKS,
  getPackById,
  computeKpis,
  mapRoles,
  pickBestPackForDataset,
} from '../src/analytics';
import { DEMO_DATASETS } from '../src/data/demoDatasets';
import { inferTypes } from '../src/engine/dataParser';
import { profileDataset } from '../src/engine/dataProfiler';

function buildColumnsForRows(rows: Record<string, any>[]) {
  if (!rows.length) return [];
  const colNames = Object.keys(rows[0]);
  const types = inferTypes(colNames, rows);
  return profileDataset(colNames, rows, types);
}

describe('Phase 4 & FIX 2: 13-Slide 16:9 PPTX Presentation Generator & Native Editable Charts', () => {
  for (const pack of ANALYTICS_PACKS) {
    it(`builds a valid 13-slide .pptx zip with native charts (ppt/charts/chart*.xml) and zero empty slides for pack "${pack.id}" (${pack.name})`, async () => {
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
      expect(previewSlides[1].kind).toBe('executive_summary');
      expect(previewSlides[1].headlineMetrics.length).toBe(3);
      expect(previewSlides[2].kind).toBe('kpis');
      expect(previewSlides[2].kpis.length).toBeGreaterThanOrEqual(6);
      expect(previewSlides[2].kpis.length).toBeLessThanOrEqual(8);
      expect(previewSlides[2].kpis.every((k) => k.status === 'available')).toBe(true);

      // Slides 4-8: one slide per key chart
      for (let i = 3; i <= 7; i++) {
        expect(previewSlides[i].kind).toBe('charts');
        expect(previewSlides[i].chartBars.length).toBeGreaterThan(0);
        expect(previewSlides[i].nativeChart).toBeDefined();
      }

      expect(previewSlides[8].kind).toBe('diagnostic');
      expect(previewSlides[9].kind).toBe('predictive');
      expect(previewSlides[9].nativeChart?.chartType).toBe('line');
      expect(previewSlides[10].kind).toBe('recommendations');
      expect(previewSlides[10].bullets.length).toBeGreaterThanOrEqual(3);
      expect(previewSlides[10].bullets.length).toBeLessThanOrEqual(5);
      expect(previewSlides[11].kind).toBe('data_quality');
      expect(previewSlides[12].kind).toBe('appendix');

      // Every slide must have action title, 1-2 line So what, source footnote, alt text, speaker notes, and <= 5 bullets
      for (const s of previewSlides) {
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

      // Verify no empty slide XML and verify font sizes (titles sz="2800" = 28pt, body sz="1800" = 18pt)
      for (const sFile of slideXmlFiles) {
        const xml = await zip.file(sFile)!.async('string');
        expect(xml.length).toBeGreaterThan(1000);
        expect(xml).toContain('sz="2800"');
        expect(xml).toContain('sz="1800"');
      }
    });
  }

  it('skips Unavailable KPIs on the KPI Scorecard slide and lists them once on the Data Quality & Assumptions slide with their missing column', async () => {
    // Provide partial columns for Sales pack (only date and revenue, missing deals_won, opportunities, pipeline_value)
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
    // KPI Scorecard tiles must contain ONLY available KPIs, never "Unavailable"
    expect(kpiSlide!.kpis.every((k) => k.status === 'available')).toBe(true);
    expect(kpiSlide!.kpis.some((k) => k.formattedValue.includes('Unavailable'))).toBe(false);

    // Unavailable KPIs are listed once on the Data Quality & Assumptions slide with their missing column
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

    // Only non-empty template slides appear (cover, executive_summary, data_quality, appendix)
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
});
