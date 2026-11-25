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
import { USER_GUIDE_STEP_SCREENSHOTS } from './userGuideScreenshots';

export type SlideOverflowEstimate = ReturnType<typeof estimateSlideOverflow>;

export type UserGuideColorVariant = 'theme' | 'print-white';

export interface UserGuideWorkflowStep {
  step: string;
  key: 'upload' | 'clean' | 'analyze' | 'present';
  title: string;
  summary: string;
  sampleMetric: string;
  screenshotDataUrl: string;
}

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
  workflowSteps: UserGuideWorkflowStep[];
  packsList: Array<{
    id: string;
    name: string;
    tagline: string;
    kpiCount: number;
    chartCount: number;
  }>;
  keyFeatures: Array<{
    title: string;
    summary: string;
    proofMetric: string;
  }>;
  getStartedSteps: string[];
  footerContact: string;
  slides: PresentationSlideSpec[];
  overflowReport: SlideOverflowEstimate[];
}

export const USER_GUIDE_PDF_FILENAME = 'DATA-ANALYTIX-User-Guide.pdf';
export const USER_GUIDE_PPTX_FILENAME = 'DATA-ANALYTIX-User-Guide.pptx';

/**
 * Cleanly formats a sentence without ever cutting mid-word or adding "..." / "…" ellipsis.
 */
function cleanSentenceWithinLimit(text: string, maxLen = 104): string {
  const cleaned = String(text || '')
    .replace(/\.{2,}|…/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  const slice = cleaned.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > maxLen * 0.55 ? slice.slice(0, lastSpace) : slice;
  return base.replace(/[.,;:\-–—]+$/, '');
}

/**
 * Builds the canonical 6-page / 7-slide User Guide specification using sample data only,
 * zero ellipsis cut text, real sample-data screenshots, and active Theme Studio tokens
 * (or print-friendly white variant).
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

  // Every bullet is <= 95 chars so it never gets cut with "..." or "…"
  const whatPlatformDoesBullets = [
    'Ingests CSV, Excel, JSON, or live SQL streams with instant schema understanding.',
    'Audits data quality across 4 hygiene pillars and fixes messy rows in 1 click.',
    'Auto-builds 14 domain analytics packs with 129+ formula-verified KPIs and 4 lenses.',
    'Exports editable 13-slide 16:9 PowerPoint decks with native charts and A4 PDFs.',
    'Answers natural-language questions strictly grounded in verified dataset metrics.',
  ];

  const workflowSteps: UserGuideWorkflowStep[] = [
    {
      step: '1 Upload',
      key: 'upload',
      title: 'Ingest & Understand Schema',
      summary: 'Drop any CSV or XLSX file or load a sample dataset; columns map automatically.',
      sampleMetric: 'Sample: 140 rows · 27 columns · 100% schema match',
      screenshotDataUrl: USER_GUIDE_STEP_SCREENSHOTS.upload,
    },
    {
      step: '2 Clean',
      key: 'clean',
      title: 'Audit & Fix Data Hygiene',
      summary: 'Inspect the 4-pillar quality score and fix duplicates or outliers in 1 click.',
      sampleMetric: 'Sample: 85% to 98% Quality Score (+13 pts)',
      screenshotDataUrl: USER_GUIDE_STEP_SCREENSHOTS.clean,
    },
    {
      step: '3 Analyze',
      key: 'analyze',
      title: 'Explore 14 Packs & Code Labs',
      summary: 'Switch across 14 domain packs, SQL Lab, Python Lab, DAX Studio, and Star Schema.',
      sampleMetric: 'Sample: Closed-Won Revenue $4.75M · Win Rate 45.4%',
      screenshotDataUrl: USER_GUIDE_STEP_SCREENSHOTS.analyze,
    },
    {
      step: '4 Present',
      key: 'present',
      title: 'Share Executive Decks & Reports',
      summary: 'Download editable 13-slide PPTX decks, Executive PDFs, or Power BI PBIP bundles.',
      sampleMetric: 'Sample: 13 slides · 7 native editable charts · 0 overflows',
      screenshotDataUrl: USER_GUIDE_STEP_SCREENSHOTS.present,
    },
  ];

  const packsList = ANALYTICS_PACKS.map((p) => ({
    id: p.id,
    name: cleanSentenceWithinLimit(p.name, 48),
    tagline: cleanSentenceWithinLimit((p as any).tagline || p.description || p.name, 74),
    kpiCount: p.kpis.length,
    chartCount: p.charts.length,
  }));

  const keyFeatures = [
    {
      title: 'Data Quality Auditor',
      summary: 'Weighted 0-100% hygiene score across Completeness, Uniqueness, and Validity.',
      proofMetric: '4 Pillars · Explainable formula trace',
    },
    {
      title: 'Data Cleaning Lab',
      summary: 'Deterministic 1-click ETL fixes with live quality score delta and full undo.',
      proofMetric: 'Reversible pipeline · Power Query .m export',
    },
    {
      title: '13-Slide Native PPTX Export',
      summary: 'Boardroom 16:9 PowerPoint generator with editable native XML charts.',
      proofMetric: '13 slides · 14pt min font floor · 0 overflows',
    },
    {
      title: 'Grounded Ask Data AI',
      summary: 'Pack-aware analytical copilot that cites exact verified KPIs and dataset rows.',
      proofMetric: '100% grounded in calculated dataset metrics',
    },
  ];

  const getStartedSteps = [
    'Minute 1: Open Upload Data and drop a CSV/Excel file or load a sample card.',
    'Minute 2: Review the Data Quality score and click 1-Click Auto-Clean in Cleaning Lab.',
    'Minute 3: Open Executive Dashboard and click Download to export PowerPoint or PDF.',
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

  // Build 7 formal slide specs (all bullets <= 98 chars so zero "..." / "…" ellipsis cut text)
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
      title: 'Guided Workflow Stages 1 & 2: Upload Data and Clean Hygiene',
      subtitle: 'Stage 1 (Upload) & Stage 2 (Clean)',
      soWhat: 'Auto-detects schema grain on upload and resolves messy records in one click.',
      bullets: [
        `1 Upload (${workflowSteps[0].title}): ${workflowSteps[0].summary}`,
        workflowSteps[0].sampleMetric,
        `2 Clean (${workflowSteps[1].title}): ${workflowSteps[1].summary}`,
        workflowSteps[1].sampleMetric,
      ],
      headlineMetrics: [],
      footerText: footerContact,
      speakerNotes: 'Walkthrough of Workflow Stages 1 (Upload) and 2 (Clean) with real screenshots.',
    },
    {
      ...baseSlideDefaults,
      id: 'guide-slide-4',
      kind: 'diagnostic',
      sectionId: 'diagnostic',
      title: 'Guided Workflow Stages 3 & 4: Analyze Packs and Present Decks',
      subtitle: 'Stage 3 (Analyze) & Stage 4 (Present)',
      soWhat: 'Explore 14 domain packs and export editable 13-slide decks with native charts.',
      bullets: [
        `3 Analyze (${workflowSteps[2].title}): ${workflowSteps[2].summary}`,
        workflowSteps[2].sampleMetric,
        `4 Present (${workflowSteps[3].title}): ${workflowSteps[3].summary}`,
        workflowSteps[3].sampleMetric,
      ],
      headlineMetrics: [],
      footerText: footerContact,
      speakerNotes: 'Walkthrough of Workflow Stages 3 (Analyze) and 4 (Present) with real screenshots.',
    },
    {
      ...baseSlideDefaults,
      id: 'guide-slide-5',
      kind: 'kpis',
      sectionId: 'kpis',
      title: '14 Domain Analytics Packs (129+ Formula-Audited KPIs)',
      subtitle: 'Pre-Built Industry Intelligence',
      soWhat: 'Auto-detects the best domain pack from your headers and learns from corrections.',
      bullets: packsList
        .slice(0, 5)
        .map((p) => `${p.name}: ${p.kpiCount} KPIs & ${p.chartCount} charts`),
      headlineMetrics: [],
      footerText: footerContact,
      speakerNotes: 'Directory of all 14 domain analytics packs.',
    },
    {
      ...baseSlideDefaults,
      id: 'guide-slide-6',
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
      id: 'guide-slide-7',
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
    bullets: fitSlideBullets(s.bullets.map((b) => cleanSentenceWithinLimit(b, 104))),
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
 * Generates the finished 6-page marketing handout PDF (`DATA-ANALYTIX-User-Guide.pdf`)
 * with real sample-data app screenshots for every workflow step, all 14 Analytics Packs,
 * key platform features, 3-minute quick-start checklist, and active Theme Studio tokens
 * (or white print-friendly variant).
 */
export function generateUserGuidePdfDoc(
  variant: UserGuideColorVariant = 'theme'
): { doc: jsPDF; spec: UserGuideSpec; pageCount: number } {
  const spec = buildUserGuideSpec(variant);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const TOTAL_PAGES = 6;

  const accentRgb = hexToRgb(spec.accentHex);
  const bgRgb = hexToRgb(spec.bgHex);
  const cardRgb = hexToRgb(spec.cardHex);
  const textPrimaryRgb = hexToRgb(spec.textPrimaryHex);
  const textSecondaryRgb = hexToRgb(spec.textSecondaryHex);

  const paintPageBackground = () => {
    doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.rect(0, 0, 210, 4, 'F');
  };

  const paintPageHeaderBar = (sectionLabel: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text(`DATA ANALYTIX USER GUIDE (${spec.version.toUpperCase()})  •  ${sectionLabel}`, 14, 12);
    doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.setLineWidth(0.25);
    doc.line(14, 14.5, 196, 14.5);
  };

  const paintPageFooter = (pageNum: number) => {
    doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.setLineWidth(0.2);
    doc.line(14, 283, 196, 283);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textSecondaryRgb.r, textSecondaryRgb.g, textSecondaryRgb.b);
    doc.text(spec.footerContact, 14, 289);
    doc.text(`Page ${pageNum} of ${TOTAL_PAGES}`, 196, 289, { align: 'right' });
  };

  // =========================================================================
  // PAGE 1: Cover, Executive Value Summary (5 Core Capabilities), & Hero Screenshot
  // =========================================================================
  paintPageBackground();

  doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
  doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 12, 182, 42, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text(
    `OFFICIAL PLATFORM MARKETING HANDOUT  •  ${spec.version.toUpperCase()}  •  ${spec.date}`,
    20,
    22
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
  doc.text('DATA ANALYTIX — User Guide & Playbook', 20, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(textSecondaryRgb.r, textSecondaryRgb.g, textSecondaryRgb.b);
  doc.text(spec.tagline, 20, 44);

  // 3 Proof Metric Cards on Cover
  const coverMetrics = [
    { label: 'DOMAIN INTELLIGENCE', value: '14 Analytics Packs', sub: '129+ Formula-Audited KPIs' },
    { label: 'GUIDED LIFECYCLE', value: '4 Workflow Stages', sub: 'Upload -> Clean -> Analyze -> Present' },
    { label: 'IN-BROWSER ENGINE', value: '< 0.5s for 100k Rows', sub: 'Privacy-First · Zero Row Leakage' },
  ];
  coverMetrics.forEach((m, idx) => {
    const mx = 14 + idx * 62;
    doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
    doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.setLineWidth(0.3);
    doc.roundedRect(mx, 60, 58, 24, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text(m.label, mx + 4, 66.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
    doc.text(m.value, mx + 4, 74.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textSecondaryRgb.r, textSecondaryRgb.g, textSecondaryRgb.b);
    doc.text(m.sub, mx + 4, 80.5);
  });

  // Section 1: What the Platform Does in 5 Bullets
  let y = 95;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('1. What Data Analytix Does (5 Core Capabilities)', 14, y);
  y += 7;

  spec.whatPlatformDoesBullets.forEach((bullet, idx) => {
    doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
    doc.roundedRect(14, y - 4.5, 182, 9.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text(`0${idx + 1}`, 18, y + 1.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
    doc.text(bullet, 27, y + 1.5);
    y += 11.5;
  });

  // Real App Screenshot Preview on Cover Page (Sample Executive Dashboard)
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('Live Workspace Preview (Sample Dataset: Global Enterprise Technology Sales)', 14, y);
  y += 4;
  doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, 182, 108, 3, 3, 'D');
  try {
    doc.addImage(USER_GUIDE_STEP_SCREENSHOTS.present, 'PNG', 15, y + 1, 180, 106);
  } catch {
    // Fallback if image decode skipped
  }

  paintPageFooter(1);

  // =========================================================================
  // PAGE 2: 4-Step Workflow — Step 1 (Upload) & Step 2 (Clean) with Real Screenshots
  // =========================================================================
  doc.addPage();
  paintPageBackground();
  paintPageHeaderBar('4-STEP GUIDED WORKFLOW (STAGES 1 & 2)');

  let wy = 24;
  [spec.workflowSteps[0], spec.workflowSteps[1]].forEach((ws) => {
    doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
    doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.setLineWidth(0.35);
    doc.roundedRect(14, wy, 182, 122, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text(`${ws.step} — ${ws.title}`, 19, wy + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(textSecondaryRgb.r, textSecondaryRgb.g, textSecondaryRgb.b);
    doc.text(ws.sampleMetric, 191, wy + 9, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
    doc.text(ws.summary, 19, wy + 17);

    try {
      doc.addImage(ws.screenshotDataUrl, 'PNG', 19, wy + 22, 172, 96);
    } catch {
      // Fallback
    }

    wy += 128;
  });

  paintPageFooter(2);

  // =========================================================================
  // PAGE 3: 4-Step Workflow — Step 3 (Analyze) & Step 4 (Present) with Real Screenshots
  // =========================================================================
  doc.addPage();
  paintPageBackground();
  paintPageHeaderBar('4-STEP GUIDED WORKFLOW (STAGES 3 & 4)');

  wy = 24;
  [spec.workflowSteps[2], spec.workflowSteps[3]].forEach((ws) => {
    doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
    doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.setLineWidth(0.35);
    doc.roundedRect(14, wy, 182, 122, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text(`${ws.step} — ${ws.title}`, 19, wy + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(textSecondaryRgb.r, textSecondaryRgb.g, textSecondaryRgb.b);
    doc.text(ws.sampleMetric, 191, wy + 9, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
    doc.text(ws.summary, 19, wy + 17);

    try {
      doc.addImage(ws.screenshotDataUrl, 'PNG', 19, wy + 22, 172, 96);
    } catch {
      // Fallback
    }

    wy += 128;
  });

  paintPageFooter(3);

  // =========================================================================
  // PAGE 4: The 14 Domain Analytics Packs Directory (with KPI & Chart Counts)
  // =========================================================================
  doc.addPage();
  paintPageBackground();
  paintPageHeaderBar('14 DOMAIN ANALYTICS PACKS DIRECTORY');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('The 14 Domain Analytics Packs (129+ Formula-Audited KPIs)', 14, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(textSecondaryRgb.r, textSecondaryRgb.g, textSecondaryRgb.b);
  doc.text(
    'Every domain pack auto-maps your dataset columns to semantic roles and computes verified KPIs and 4 analytical lenses.',
    14,
    30
  );

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Analytics Pack', 'Domain Focus & Sample Telemetry', 'KPIs', 'Charts']],
    body: spec.packsList.map((p, i) => [
      String(i + 1).padStart(2, '0'),
      p.name,
      p.tagline,
      `${p.kpiCount} KPIs`,
      `${p.chartCount} Charts`,
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 3.2,
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

  paintPageFooter(4);

  // =========================================================================
  // PAGE 5: Key Platform Features & Governance Pillars
  // =========================================================================
  doc.addPage();
  paintPageBackground();
  paintPageHeaderBar('KEY PLATFORM FEATURES & GOVERNANCE PILLARS');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('Deep Analytical, Quality & Presentation Capabilities', 14, 24);

  let fy = 32;
  const extendedFeatures = [
    ...spec.keyFeatures,
    {
      title: 'Theme Studio (Single Source of Truth)',
      summary: 'Live accent presets, custom HEX picker with WCAG AA auto-contrast, glass intensity, radius, and accessible chart palettes.',
      proofMetric: '6 Presets · Okabe-Ito Accessible Mode',
    },
    {
      title: 'Self-Training Schema & Pack Learning',
      summary: 'Remembers column-to-role corrections in local browser storage without ever transmitting raw customer row values.',
      proofMetric: '100% Top-1 accuracy after 1 correction',
    },
  ];

  extendedFeatures.forEach((kf) => {
    doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
    doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, fy, 182, 34, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text(kf.title, 20, fy + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(textSecondaryRgb.r, textSecondaryRgb.g, textSecondaryRgb.b);
    doc.text(kf.proofMetric, 190, fy + 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
    const wrapped = doc.splitTextToSize(kf.summary, 170);
    doc.text(wrapped, 20, fy + 19);

    fy += 39;
  });

  paintPageFooter(5);

  // =========================================================================
  // PAGE 6: Get Started in 3 Minutes (Quick-Start Checklist) & Contact Directory
  // =========================================================================
  doc.addPage();
  paintPageBackground();
  paintPageHeaderBar('QUICK-START CHECKLIST & CONTACT DIRECTORY');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('Get Started in 3 Minutes — Step-by-Step Checklist', 14, 26);

  let gy = 35;
  spec.getStartedSteps.forEach((step, idx) => {
    doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
    doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.setLineWidth(0.35);
    doc.roundedRect(14, gy, 182, 26, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text(`STEP 0${idx + 1}`, 20, gy + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
    doc.text(step, 20, gy + 19);

    gy += 32;
  });

  // Contact & Enterprise Support Directory Box
  gy += 10;
  doc.setFillColor(cardRgb.r, cardRgb.g, cardRgb.b);
  doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.setLineWidth(0.45);
  doc.roundedRect(14, gy, 182, 70, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('Enterprise Support, Documentation & Contact Directory', 20, gy + 14);

  const contactLines = [
    'Product Portal: https://data-analytix.app',
    'Support & Engineering Desk: support@data-analytix.app',
    'Security & Privacy Architecture: 100% client-side dataset processing by default',
    'Export Formats: Native 16:9 PowerPoint (.pptx), Executive A4 PDF (.pdf), Clean CSV, Power BI (.pbip)',
  ];
  contactLines.forEach((line, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(textPrimaryRgb.r, textPrimaryRgb.g, textPrimaryRgb.b);
    doc.text(`•  ${line}`, 22, gy + 28 + idx * 10);
  });

  paintPageFooter(6);

  return { doc, spec, pageCount: doc.getNumberOfPages() };
}

/**
 * Generates the finished marketing handout PowerPoint (`DATA-ANALYTIX-User-Guide.pptx`)
 * as a Base64 ZIP payload (with `PK` header) reading colors from the current Theme Studio tokens,
 * with zero ellipsis cut text and visual cards + real sample-data screenshots on every slide.
 */
export async function generateUserGuidePptxBase64(
  variant: UserGuideColorVariant = 'theme'
): Promise<{
  base64: string;
  slideCount: number;
  spec: UserGuideSpec;
  overflowCount: number;
  formattedBulletItems: string[];
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

  const slideScreenshots: Record<string, string> = {
    'guide-slide-1': USER_GUIDE_STEP_SCREENSHOTS.present,
    'guide-slide-2': USER_GUIDE_STEP_SCREENSHOTS.upload,
    'guide-slide-3': USER_GUIDE_STEP_SCREENSHOTS.clean,
    'guide-slide-4': USER_GUIDE_STEP_SCREENSHOTS.analyze,
    'guide-slide-5': USER_GUIDE_STEP_SCREENSHOTS.analyze,
    'guide-slide-6': USER_GUIDE_STEP_SCREENSHOTS.clean,
    'guide-slide-7': USER_GUIDE_STEP_SCREENSHOTS.present,
  };

  const formattedBulletItems: string[] = [];

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
        fontSize: 11,
        bold: true,
        color: accentHex,
        fontFace: 'Arial',
      }
    );

    // Title
    slide.addText(s.title, {
      x: 0.6,
      y: 0.58,
      w: 12.1,
      h: 0.65,
      fontSize: 23,
      bold: true,
      color: textPrimaryHex,
      fontFace: 'Arial',
    });

    // So What
    slide.addText(s.soWhat, {
      x: 0.6,
      y: 1.25,
      w: 12.1,
      h: 0.4,
      fontSize: 14,
      color: textSecondaryHex,
      fontFace: 'Arial',
    });

    if (s.id === 'guide-slide-5') {
      // Slide 5: 2-column grid of all 14 Analytics Packs with KPI & Chart counts (fills the slide completely)
      spec.packsList.forEach((p, idx) => {
        const col = idx < 7 ? 0 : 1;
        const row = idx % 7;
        const px = 0.6 + col * 6.15;
        const py = 1.8 + row * 0.71;

        slide.addShape(pptx.ShapeType.roundRect, {
          x: px,
          y: py,
          w: 5.95,
          h: 0.62,
          rectRadius: 0.06,
          fill: { color: cardHex },
          line: { color: accentHex, width: 0.75 },
        });

        slide.addText(`${String(idx + 1).padStart(2, '0')}  ${p.name}`, {
          x: px + 0.15,
          y: py + 0.08,
          w: 3.9,
          h: 0.25,
          fontSize: 12,
          bold: true,
          color: textPrimaryHex,
          fontFace: 'Arial',
        });

        slide.addText(`${p.kpiCount} KPIs · ${p.chartCount} Charts`, {
          x: px + 4.05,
          y: py + 0.08,
          w: 1.75,
          h: 0.25,
          fontSize: 11,
          bold: true,
          color: accentHex,
          align: 'right',
          fontFace: 'Arial',
        });

        slide.addText(p.tagline, {
          x: px + 0.15,
          y: py + 0.33,
          w: 5.65,
          h: 0.24,
          fontSize: 10,
          color: textSecondaryHex,
          fontFace: 'Arial',
        });
      });
    } else {
      // Split layout: Left structured narrative card (w: 6.3"), Right visual screenshot + metric badges card (w: 5.55")
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.6,
        y: 1.85,
        w: 6.3,
        h: 4.85,
        rectRadius: 0.08,
        fill: { color: cardHex },
        line: { color: accentHex, width: 1 },
      });

      const bulletItems = s.bullets.slice(0, 5).map((b, idx) => {
        const trimmed = b.trim();
        const alreadyNumberedOrLabeled =
          /^\d+[\s.)]/.test(trimmed) ||
          /^(Step|Stage|Minute|Sample:)\s/i.test(trimmed);
        const text = alreadyNumberedOrLabeled ? trimmed : `${idx + 1}.  ${trimmed}`;
        formattedBulletItems.push(text);
        return {
          text,
          options: {
            fontSize: 15.5,
            color: textPrimaryHex,
            breakLine: true,
            paraSpaceAfter: 12,
          },
        };
      });

      slide.addText(bulletItems, {
        x: 0.85,
        y: 2.1,
        w: 5.8,
        h: 4.35,
        fontFace: 'Arial',
        valign: 'top',
      });

      // Right Visual Card with Real App Screenshot (Sample Data Only)
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 7.15,
        y: 1.85,
        w: 5.55,
        h: 4.85,
        rectRadius: 0.08,
        fill: { color: cardHex },
        line: { color: accentHex, width: 1 },
      });

      slide.addText('LIVE WORKSPACE SCREENSHOT (SAMPLE DATA)', {
        x: 7.35,
        y: 2.0,
        w: 5.15,
        h: 0.3,
        fontSize: 10.5,
        bold: true,
        color: accentHex,
        fontFace: 'Arial',
      });

      const screenshotData = slideScreenshots[s.id] || USER_GUIDE_STEP_SCREENSHOTS.present;
      try {
        slide.addImage({
          data: screenshotData,
          x: 7.35,
          y: 2.38,
          w: 5.15,
          h: 3.22,
        });
      } catch {
        // Fallback if image embedding skipped
      }

      // Bottom proof strip inside Right Visual Card
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 7.35,
        y: 5.75,
        w: 5.15,
        h: 0.75,
        rectRadius: 0.06,
        fill: { color: bgHex },
        line: { color: accentHex, width: 0.75 },
      });

      slide.addText(
        'Verified Sample Telemetry: 140 rows · 98% Grade A Hygiene · 14 Domain Packs',
        {
          x: 7.5,
          y: 5.92,
          w: 4.85,
          h: 0.4,
          fontSize: 11.5,
          bold: true,
          color: textPrimaryHex,
          fontFace: 'Arial',
        }
      );
    }

    // Footer
    slide.addText(`${s.footerText}  •  Slide ${s.slideNumber}/${s.totalSlides}`, {
      x: 0.6,
      y: 6.95,
      w: 12.1,
      h: 0.3,
      fontSize: 11.5,
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
    formattedBulletItems,
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
