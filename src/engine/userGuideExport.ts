import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ANALYTICS_PACKS } from '../analytics/packs/registry';
import { APP_VERSION_LABEL } from '../config/appVersion';
import { getActiveThemeTokens, hexToRgb } from '../utils/themeStudio';
import {
  estimateSlideOverflow,
  fitSlideBullets,
  PresentationSlideSpec,
} from './pptxGenerator';

export type SlideOverflowEstimate = ReturnType<typeof estimateSlideOverflow>;

export type UserGuideColorVariant = 'theme' | 'print-white';

export interface UserGuideSpec {
  title: string;
  tagline: string;
  version: string;
  date: string;
  variant: UserGuideColorVariant;
  accentHex: string;
  bgHex: string;
  cardHex: string;
  textPrimaryHex: string;
  textSecondaryHex: string;
  whatPlatformDoesBullets: string[];
  workflowSteps: {
    step: string;
    title: string;
    summary: string;
    sampleMetric: string;
  }[];
  packsList: {
    id: string;
    name: string;
    tagline: string;
    kpiCount: number;
    chartCount: number;
  }[];
  keyFeatures: {
    title: string;
    summary: string;
    proofMetric: string;
  }[];
  getStartedSteps: string[];
  footerContact: string;
  slides: PresentationSlideSpec[];
  overflowReport: SlideOverflowEstimate[];
}

export const USER_GUIDE_PDF_FILENAME = 'DATA-ANALYTIX-User-Guide.pdf';
export const USER_GUIDE_PPTX_FILENAME = 'DATA-ANALYTIX-User-Guide.pptx';

/**
 * Builds the canonical 6-section / 6-slide User Guide specification using sample data only
 * and reading colors directly from the active Theme Studio tokens (or print-friendly white variant).
 */
export function buildUserGuideSpec(
  variant: UserGuideColorVariant = 'theme'
): UserGuideSpec {
  const tokens = getActiveThemeTokens(variant === 'print-white' ? 'light' : undefined);
  const isWhiteVariant = variant === 'print-white' || tokens.resolvedMode === 'light';

  const bgHex = variant === 'print-white' ? '#FFFFFF' : tokens.bgApp;
  const cardHex = variant === 'print-white' ? '#F8FAFC' : tokens.bgCard;
  const textPrimaryHex = variant === 'print-white' ? '#0F172A' : tokens.textPrimary;
  const textSecondaryHex = variant === 'print-white' ? '#334155' : tokens.textSecondary;
  const accentHex = tokens.accent;

  const today = new Date().toISOString().slice(0, 10);

  const whatPlatformDoesBullets = [
    'Ingests CSV, Excel, JSON, or live SQL streams with instant schema understanding.',
    'Audits data quality across 4 hygiene pillars and fixes messy rows in 1 click.',
    'Auto-builds 14 domain analytics packs with 129+ formula-verified KPIs and 4 lenses.',
    'Exports editable 13-slide 16:9 PowerPoint decks with native charts and A4 PDFs.',
    'Answers natural-language questions strictly grounded in verified dataset metrics.',
  ];

  const workflowSteps = [
    {
      step: '1 Upload',
      title: 'Ingest & Understand Schema',
      summary: 'Drop any CSV/XLSX or load a sample dataset; columns and grain map automatically.',
      sampleMetric: 'Sample: 140 rows · 27 columns · 100% schema match',
    },
    {
      step: '2 Clean',
      title: 'Audit & Fix Data Hygiene',
      summary: 'Inspect quality score and remediate duplicates, nulls, and outliers in 1 click.',
      sampleMetric: 'Sample: 85% -> 98% Quality Score (+13 pts)',
    },
    {
      step: '3 Analyze',
      title: 'Explore 14 Packs & Code Labs',
      summary: 'Switch across 14 domain packs, SQL Lab, Python Lab, DAX Studio, and Star Schema.',
      sampleMetric: 'Sample: Closed-Won Revenue $4.75M · Win Rate 45.4%',
    },
    {
      step: '4 Present',
      title: 'Share Executive Decks & Reports',
      summary: 'Download editable 13-slide PPTX decks, Executive PDFs, or Power BI PBIP bundles.',
      sampleMetric: 'Sample: 13 slides · 7 native editable charts · 0 overflows',
    },
  ];

  const packsList = ANALYTICS_PACKS.map((p) => ({
    id: p.id,
    name: p.name,
    tagline: ((p as any).tagline || p.description || '').slice(0, 78),
    kpiCount: p.kpis.length,
    chartCount: p.charts.length,
  }));

  const keyFeatures = [
    {
      title: 'Data Quality Auditor',
      summary: 'Weighted 0–100% hygiene score across Completeness, Uniqueness, Validity, and Consistency.',
      proofMetric: '4 Pillars · Explainable formula trace',
    },
    {
      title: 'Data Cleaning Lab',
      summary: 'Deterministic 1-click ETL transformations with live quality score delta and full undo.',
      proofMetric: 'Reversible pipeline · Power Query .m export',
    },
    {
      title: '13-Slide Native PPTX Export',
      summary: 'Boardroom 16:9 PowerPoint generator with editable native XML charts and text-fit guardrails.',
      proofMetric: '13 slides · 14pt min font floor · 0 overflows',
    },
    {
      title: 'Grounded Ask Data AI',
      summary: 'Pack-aware analytical copilot that cites exact verified KPIs and dataset rows without guessing.',
      proofMetric: '100% grounded in calculated dataset metrics',
    },
  ];

  const getStartedSteps = [
    'Minute 1: Open Upload Data and drop a CSV/Excel file (or click any sample dataset card).',
    'Minute 2: Review the Data Quality Auditor score and click 1-Click Auto-Clean in Cleaning Lab.',
    'Minute 3: Open Executive Dashboard or Analytics Packs and click Download -> PowerPoint (.pptx).',
  ];

  const footerContact =
    'DATA ANALYTIX Enterprise BI · https://data-analytix.app · support@data-analytix.app';

  const baseQualitySummary: PresentationSlideSpec['qualitySummary'] = {
    overallScore: 98,
    grade: 'A',
    statusLabel: 'Sample Dataset Ready (98% Grade A)',
    issuesCount: 0,
    rowCount: 140,
    columnCount: 27,
    nullPercentageAvg: 0.4,
    schemaPreview: [],
  };

  const baseSlideDefaults = {
    sourceFootnote: 'DATA ANALYTIX Official Platform User Guide (Sample Telemetry)',
    altText: 'DATA ANALYTIX Platform User Guide slide',
    packId: 'sales-pipeline',
    packName: 'DATA ANALYTIX',
    accentToken: 'var(--accent)',
    gradientToToken: 'var(--accent-2)',
    audience: 'board' as const,
    hasData: true,
    kpis: [],
    unavailableKpis: [],
    roleMappings: [],
    chartTitle: '',
    chartMetricLabel: '',
    chartCategoryLabel: '',
    chartBars: [],
    lensBullets: [],
    qualitySummary: baseQualitySummary,
  };

  // Build 6 formal slide specs so we can verify zero overflow with estimateSlideOverflow
  const rawSlides: Omit<PresentationSlideSpec, 'slideNumber' | 'totalSlides'>[] = [
    {
      ...baseSlideDefaults,
      id: 'guide-slide-1',
      kind: 'cover',
      sectionId: 'cover',
      title: 'DATA ANALYTIX — Official Platform User Guide',
      subtitle: `Cover & Platform Overview (${APP_VERSION_LABEL})`,
      soWhat: 'Enterprise Autonomous BI, Domain Intelligence & Boardroom Reporting Handout.',
      bullets: whatPlatformDoesBullets,
      headlineMetrics: [
        { label: 'Domain Packs', value: '14 Packs', delta: '129+ Audited KPIs', isFavorable: true },
        { label: 'Workflow Stages', value: '4 Stages', delta: 'Upload -> Clean -> Analyze -> Present', isFavorable: true },
        { label: 'Board Exports', value: 'PPTX & PDF', delta: 'Native editable charts', isFavorable: true },
      ],
      footerText: `${footerContact} · ${today}`,
      speakerNotes: 'Cover slide for the Data Analytix Platform User Guide.',
      coverMeta: {
        datasetName: 'Enterprise Sample Telemetry (140 rows)',
        periodLabel: `Version ${APP_VERSION_LABEL} · ${today}`,
        preparedBy: 'Data Analytix Product Engineering',
        scopeLabel: '14 Analytics Packs · 4-Step Workflow · Live Theme Studio',
        qualityChipLabel: 'Verified Sample Data (98% Grade A)',
        qualityIssuesCount: 0,
      },
    },
    {
      ...baseSlideDefaults,
      id: 'guide-slide-2',
      kind: 'executive_summary',
      sectionId: 'executive_summary',
      title: 'What Data Analytix Does in 5 Core Capabilities',
      subtitle: 'Executive Platform Summary',
      soWhat: 'Turns raw spreadsheets into audited, board-ready dashboards and editable decks.',
      bullets: whatPlatformDoesBullets,
      headlineMetrics: [
        { label: 'Sample Revenue', value: '$4.75M', delta: 'Closed-Won Bookings', isFavorable: true },
        { label: 'Data Hygiene', value: '85% -> 98%', delta: '1-Click Auto-Clean', isFavorable: true },
        { label: '100k-Row Speed', value: '< 0.5 sec', delta: 'In-browser engine', isFavorable: true },
      ],
      footerText: footerContact,
      speakerNotes: 'Five core capabilities of Data Analytix.',
    },
    {
      ...baseSlideDefaults,
      id: 'guide-slide-3',
      kind: 'diagnostic',
      sectionId: 'diagnostic',
      title: 'The 4-Step Guided Workflow: Upload -> Clean -> Analyze -> Present',
      subtitle: 'End-to-End Analytical Lifecycle',
      soWhat: 'Every sidebar group matches the top workflow stepper so nothing is ever hidden.',
      bullets: workflowSteps.map((w) => `${w.step} — ${w.title}: ${w.summary}`),
      headlineMetrics: [],
      footerText: footerContact,
      speakerNotes: 'Walkthrough of the 4 workflow stages.',
    },
    {
      ...baseSlideDefaults,
      id: 'guide-slide-4',
      kind: 'kpis',
      sectionId: 'kpis',
      title: '14 Domain Analytics Packs (129+ Formula-Audited KPIs)',
      subtitle: 'Pre-Built Industry Intelligence',
      soWhat: 'Auto-detects the best domain pack from your headers and learns from your corrections.',
      bullets: packsList
        .slice(0, 5)
        .map((p) => `${p.name}: ${p.kpiCount} KPIs & ${p.chartCount} charts`),
      headlineMetrics: [],
      footerText: footerContact,
      speakerNotes: 'Directory of all 14 domain analytics packs.',
    },
    {
      ...baseSlideDefaults,
      id: 'guide-slide-5',
      kind: 'predictive',
      sectionId: 'predictive',
      title: 'Key Platform Pillars: Quality Auditor, Cleaning Lab, PPTX & AI',
      subtitle: 'Deep Analytical & Governance Capabilities',
      soWhat: 'Shared quality engine guarantees identical hygiene scores across every view and deck.',
      bullets: keyFeatures.map((f) => `${f.title}: ${f.summary}`),
      headlineMetrics: [],
      footerText: footerContact,
      speakerNotes: 'Deep dive into Quality Auditor, Cleaning Lab, PPTX Export, and Grounded AI.',
    },
    {
      ...baseSlideDefaults,
      id: 'guide-slide-6',
      kind: 'recommendations',
      sectionId: 'recommendations',
      title: 'Get Started in 3 Minutes — Quick-Start Checklist',
      subtitle: 'Onboarding & Contact Directory',
      soWhat: 'Go from raw spreadsheet to an editable 13-slide executive presentation in 3 minutes.',
      bullets: [...getStartedSteps, footerContact],
      headlineMetrics: [],
      footerText: footerContact,
      speakerNotes: '3-minute quick start and contact footer.',
    },
  ];

  const slides: PresentationSlideSpec[] = rawSlides.map((s, idx) => ({
    ...s,
    bullets: fitSlideBullets(s.bullets),
    slideNumber: idx + 1,
    totalSlides: rawSlides.length,
  }));

  const overflowReport = slides.map((s) => estimateSlideOverflow(s));

  return {
    title: 'DATA ANALYTIX — Platform User Guide & Playbook',
    tagline: 'Enterprise Autonomous BI, Domain Intelligence & Boardroom Reporting',
    version: APP_VERSION_LABEL,
    date: today,
    variant: isWhiteVariant ? 'print-white' : 'theme',
    accentHex,
    bgHex,
    cardHex,
    textPrimaryHex,
    textSecondaryHex,
    whatPlatformDoesBullets,
    workflowSteps,
    packsList,
    keyFeatures,
    getStartedSteps,
    footerContact,
    slides,
    overflowReport,
  };
}

/**
 * Generates the finished marketing handout PDF (`DATA-ANALYTIX-User-Guide.pdf`)
 * reading colors from the current Theme Studio tokens (or print-friendly white variant).
 */
export function generateUserGuidePdfDoc(
  variant: UserGuideColorVariant = 'theme'
): { doc: jsPDF; spec: UserGuideSpec; pageCount: number } {
  const spec = buildUserGuideSpec(variant);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const accentRgb = hexToRgb(spec.accentHex);
  const bgRgb = hexToRgb(spec.bgHex);
  const cardRgb = hexToRgb(spec.cardHex);
  const textPrimaryRgb = hexToRgb(spec.textPrimaryHex);
  const textSecondaryRgb = hexToRgb(spec.textSecondaryHex);

  const paintPageBackground = () => {
    doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
    doc.rect(0, 0, 210, 297, 'F');
    // Top accent bar
    doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.rect(0, 0, 210, 4, 'F');
  };

  const paintPageFooter = (pageNum: number, totalPages: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textSecondaryRgb.r, textSecondaryRgb.g, textSecondaryRgb.b);
    doc.text(spec.footerContact, 14, 289);
    doc.text(`Page ${pageNum} of ${totalPages}`, 196, 289, { align: 'right' });
  };

  // =========================================================================
  // PAGE 1: Cover, What the Platform Does (5 Bullets), 4-Step Workflow, & Get Started in 3 Minutes
  // =========================================================================
  paintPageBackground();

  // Cover Hero Banner Box
  doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
  doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 12, 182, 42, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text(`OFFICIAL PLATFORM HANDOUT  •  ${spec.version.toUpperCase()}  •  ${spec.date}`, 20, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
  doc.text('DATA ANALYTIX — User Guide', 20, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(textSecondaryRgb.r, textSecondaryRgb.g, textSecondaryRgb.b);
  doc.text(spec.tagline, 20, 44);

  // Section 1: What the Platform Does in 5 Bullets
  let y = 66;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('1. What Data Analytix Does (5 Core Capabilities)', 14, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
  spec.whatPlatformDoesBullets.forEach((bullet, idx) => {
    doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
    doc.roundedRect(14, y - 4.5, 182, 8.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text(`0${idx + 1}`, 18, y + 1);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
    doc.text(bullet, 27, y + 1);
    y += 10.5;
  });

  // Section 2: The 4-Step Workflow
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('2. The 4-Step Guided Workflow (Sample Telemetry)', 14, y);
  y += 6;

  spec.workflowSteps.forEach((ws) => {
    doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
    doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.setLineWidth(0.25);
    doc.roundedRect(14, y, 182, 18, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text(`${ws.step} — ${ws.title}`, 18, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textSecondaryRgb.r, textSecondaryRgb.g, textSecondaryRgb.b);
    doc.text(ws.sampleMetric, 192, y + 6, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
    doc.text(ws.summary, 18, y + 13);

    y += 21;
  });

  // Section 3: Get Started in 3 Minutes
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('3. Get Started in 3 Minutes', 14, y);
  y += 6;

  spec.getStartedSteps.forEach((step) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
    doc.text(`•  ${step}`, 16, y);
    y += 6.5;
  });

  paintPageFooter(1, 2);

  // =========================================================================
  // PAGE 2: The 14 Analytics Packs & Key Features (Quality, Cleaning, PPTX, AI)
  // =========================================================================
  doc.addPage();
  paintPageBackground();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('4. The 14 Domain Analytics Packs (129+ Audited KPIs)', 14, 18);

  autoTable(doc, {
    startY: 23,
    head: [['#', 'Analytics Pack', 'Domain Focus & Sample Telemetry', 'KPIs', 'Charts']],
    body: spec.packsList.map((p, i) => [
      String(i + 1).padStart(2, '0'),
      p.name,
      p.tagline,
      `${p.kpiCount} KPIs`,
      `${p.chartCount} Charts`,
    ]),
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b],
      fillColor: [cardRgb.r, cardRgb.g, cardRgb.b],
    },
    headStyles: {
      fillColor: [accentRgb.r, accentRgb.g, accentRgb.b],
      textColor: variant === 'print-white' ? [255, 255, 255] : [4, 30, 30],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [bgRgb.r, bgRgb.g, bgRgb.b],
    },
    margin: { left: 14, right: 14 },
  });

  const tableEndY = (doc as any).lastAutoTable?.finalY || 175;
  let fy = tableEndY + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('5. Key Platform Features & Governance Pillars', 14, fy);
  fy += 6;

  spec.keyFeatures.forEach((kf) => {
    doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
    doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.setLineWidth(0.25);
    doc.roundedRect(14, fy, 182, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text(kf.title, 18, fy + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textSecondaryRgb.r, textSecondaryRgb.g, textSecondaryRgb.b);
    doc.text(kf.proofMetric, 192, fy + 5.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
    doc.text(kf.summary, 18, fy + 12);

    fy += 18.5;
  });

  paintPageFooter(2, 2);

  return { doc, spec, pageCount: doc.getNumberOfPages() };
}

/**
 * Generates the finished marketing handout PowerPoint (`DATA-ANALYTIX-User-Guide.pptx`)
 * as a Base64 ZIP payload (with `PK` header) reading colors from the current Theme Studio tokens.
 */
export async function generateUserGuidePptxBase64(
  variant: UserGuideColorVariant = 'theme'
): Promise<{
  base64: string;
  slideCount: number;
  spec: UserGuideSpec;
  overflowCount: number;
}> {
  const spec = buildUserGuideSpec(variant);
  const pptxMod = await import('pptxgenjs');
  const PptxGenJS: any = (pptxMod as any).default || pptxMod;
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'DATA ANALYTIX';
  pptx.company = 'DATA ANALYTIX';
  pptx.title = spec.title;
  pptx.subject = spec.tagline;

  const strip = (h: string) => h.replace(/^#/, '').toUpperCase();
  const bgHex = strip(spec.bgHex);
  const cardHex = strip(spec.cardHex);
  const accentHex = strip(spec.accentHex);
  const textPrimaryHex = strip(spec.textPrimaryHex);
  const textSecondaryHex = strip(spec.textSecondaryHex);

  spec.slides.forEach((s) => {
    const slide = pptx.addSlide();
    slide.background = { color: bgHex };

    // Top accent bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.12,
      fill: { color: accentHex },
      line: { color: accentHex, width: 0 },
    });

    // Kicker
    slide.addText(
      `DATA ANALYTIX USER GUIDE  •  ${s.subtitle.toUpperCase()}  •  SLIDE ${s.slideNumber} OF ${s.totalSlides}`,
      {
        x: 0.6,
        y: 0.25,
        w: 12.1,
        h: 0.3,
        fontSize: 12,
        bold: true,
        color: accentHex,
        fontFace: 'Arial',
      }
    );

    // Title
    slide.addText(s.title, {
      x: 0.6,
      y: 0.6,
      w: 12.1,
      h: 0.75,
      fontSize: 26,
      bold: true,
      color: textPrimaryHex,
      fontFace: 'Arial',
    });

    // So What
    slide.addText(s.soWhat, {
      x: 0.6,
      y: 1.38,
      w: 12.1,
      h: 0.45,
      fontSize: 16,
      color: textSecondaryHex,
      fontFace: 'Arial',
    });

    // Content Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6,
      y: 2.0,
      w: 12.1,
      h: 4.65,
      rectRadius: 0.08,
      fill: { color: cardHex },
      line: { color: accentHex, width: 1 },
    });

    // Bullets (guaranteed <= 5 bullets, >= 16pt font, 0 overflow)
    const bulletItems = s.bullets.slice(0, 5).map((b, idx) => ({
      text: `${idx + 1}.  ${b}`,
      options: {
        fontSize: 18,
        color: textPrimaryHex,
        breakLine: true,
        paraSpaceAfter: 14,
      },
    }));

    slide.addText(bulletItems, {
      x: 0.95,
      y: 2.35,
      w: 11.4,
      h: 4.0,
      fontFace: 'Arial',
      valign: 'top',
    });

    // Footer
    slide.addText(`${s.footerText}  •  Slide ${s.slideNumber}/${s.totalSlides}`, {
      x: 0.6,
      y: 6.95,
      w: 12.1,
      h: 0.3,
      fontSize: 12,
      color: textSecondaryHex,
      fontFace: 'Arial',
    });
  });

  const base64Out = (await pptx.write({ outputType: 'base64' })) as string;
  const cleanBase64 = base64Out.includes('base64,')
    ? base64Out.split('base64,')[1]
    : base64Out;

  const overflowCount = spec.overflowReport.filter((r) => r.hasOverflow).length;

  return {
    base64: cleanBase64,
    slideCount: spec.slides.length,
    spec,
    overflowCount,
  };
}

export async function downloadUserGuideFile(
  format: 'pdf' | 'pptx',
  variant: UserGuideColorVariant = 'theme'
): Promise<string> {
  if (format === 'pdf') {
    const { doc } = generateUserGuidePdfDoc(variant);
    doc.save(USER_GUIDE_PDF_FILENAME);
    return USER_GUIDE_PDF_FILENAME;
  }

  const { base64 } = await generateUserGuidePptxBase64(variant);
  const binStr = atob(base64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = USER_GUIDE_PPTX_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
  return USER_GUIDE_PPTX_FILENAME;
}
