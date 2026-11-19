import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  buildPresentationSlides,
  generatePresentationPptxBlob,
} from '../src/engine/pptxGenerator';
import { getPackById } from '../src/analytics';
import { inferTypes } from '../src/engine/dataParser';
import { profileDataset } from '../src/engine/dataProfiler';

function buildColumnsForRows(rows: Record<string, any>[]) {
  if (!rows.length) return [];
  const colNames = Object.keys(rows[0]);
  const types = inferTypes(colNames, rows);
  return profileDataset(colNames, rows, types);
}

describe('Phase 4: 16:9 PPTX Presentation Generator & Slide Specification Engine', () => {
  it('builds accurate computed slides for Operations & Supply Chain sample data', () => {
    const opsPack = getPackById('operations');
    const rows = opsPack.sampleDataset();
    const columns = buildColumnsForRows(rows);

    const slides = buildPresentationSlides({
      datasetName: 'Operations & Supply Chain Sample Dataset',
      companyName: 'DATA ANALYTIX',
      department: 'Supply Chain Intelligence',
      scope: 'pack',
      packId: 'operations',
      audience: 'manager',
      rows,
      columns,
    });

    expect(slides.length).toBeGreaterThanOrEqual(5);
    expect(slides[0].kind).toBe('cover');
    expect(slides[0].hasData).toBe(true);
    expect(slides[0].packId).toBe('operations');
    expect(slides[0].headlineMetrics[0].value).toBe('95.4%');

    const kpiSlide = slides.find((s) => s.kind === 'kpis');
    expect(kpiSlide).toBeDefined();
    expect(kpiSlide!.kpis.some((k) => k.id === 'otif_rate' && k.formattedValue === '95.4%')).toBe(
      true
    );

    const chartSlide = slides.find((s) => s.kind === 'charts');
    expect(chartSlide).toBeDefined();
    expect(chartSlide!.chartBars.length).toBeGreaterThan(0);
    expect(chartSlide!.lensBullets.length).toBe(4);
  });

  it('adapts slide count and depth by audience template (board vs manager vs analyst)', () => {
    const finPack = getPackById('financial');
    const rows = finPack.sampleDataset();
    const columns = buildColumnsForRows(rows);

    const boardSlides = buildPresentationSlides({
      datasetName: 'Financial Sample',
      scope: 'pack',
      packId: 'financial',
      audience: 'board',
      rows,
      columns,
    });
    const managerSlides = buildPresentationSlides({
      datasetName: 'Financial Sample',
      scope: 'pack',
      packId: 'financial',
      audience: 'manager',
      rows,
      columns,
    });
    const analystSlides = buildPresentationSlides({
      datasetName: 'Financial Sample',
      scope: 'pack',
      packId: 'financial',
      audience: 'analyst',
      rows,
      columns,
    });

    expect(boardSlides.length).toBeLessThan(managerSlides.length);
    expect(managerSlides.length).toBeLessThan(analystSlides.length);
    expect(analystSlides.some((s) => s.kind === 'appendix')).toBe(true);
  });

  it('builds a clean zero-data template deck with instructions and zero fake numbers when rows is empty', () => {
    const slides = buildPresentationSlides({
      datasetName: 'Empty Workspace',
      scope: 'pack',
      packId: 'hr',
      audience: 'board',
      rows: [],
      columns: [],
    });

    expect(slides.length).toBeGreaterThanOrEqual(3);
    for (const s of slides) {
      expect(s.hasData).toBe(false);
    }
    expect(slides[0].title).toContain('Blank Presentation Template');
    expect(slides[0].headlineMetrics.every((m) => m.value === 'Template (No Data)')).toBe(true);
  });

  it('compiles a valid OpenXML .pptx binary archive containing presentation.xml and slide XMLs', async () => {
    const opsPack = getPackById('operations');
    const rows = opsPack.sampleDataset();
    const columns = buildColumnsForRows(rows);

    const { blob, slideCount, slides } = await generatePresentationPptxBlob({
      datasetName: 'Operations & Supply Chain Sample Dataset',
      companyName: 'DATA ANALYTIX',
      scope: 'pack',
      packId: 'operations',
      audience: 'manager',
      rows,
      columns,
    });

    expect(slideCount).toBe(slides.length);
    expect(blob.size).toBeGreaterThan(10000);

    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    expect(zip.file('ppt/presentation.xml')).not.toBeNull();
    expect(zip.file('ppt/slides/slide1.xml')).not.toBeNull();
    expect(zip.file('ppt/slides/slide2.xml')).not.toBeNull();
    expect(zip.file('ppt/slides/slide3.xml')).not.toBeNull();

    const slide1Xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(slide1Xml).toContain('Operations &amp; Supply Chain');
    expect(slide1Xml).toContain('95.4%');
  });
});
