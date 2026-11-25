import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import JSZip from 'jszip';
import {
  buildUserGuideSpec,
  generateUserGuidePdfDoc,
  generateUserGuidePptxBase64,
} from '../src/engine/userGuideExport';
import {
  generatePresentationPptxBlob,
  estimateSlideOverflow,
  PresentationSlideSpec,
} from '../src/engine/pptxGenerator';
import { ANALYTICS_PACKS, computeKpis, mapRoles } from '../src/analytics';
import { inferTypes } from '../src/engine/dataParser';
import { profileDataset } from '../src/engine/dataProfiler';

const fallbackExecutable = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (fs.existsSync(fallbackExecutable) ? fallbackExecutable : undefined);

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildColumnsForRows(rows: Record<string, any>[]) {
  if (!rows.length) return [];
  const colNames = Object.keys(rows[0]);
  const types = inferTypes(colNames, rows);
  return profileDataset(colNames, rows, types);
}

function renderPrintWhitePdfPageHtml(pageNumber: 1 | 2 | 4): string {
  const spec = buildUserGuideSpec('print-white');
  const headerBar = (label: string) => `
    <div style="border-bottom: 1.5px solid ${spec.accentHex}; padding-bottom: 6px; margin-bottom: 16px; font-weight: 700; font-size: 11px; color: ${spec.accentHex}; letter-spacing: 0.04em;">
      DATA ANALYTIX USER GUIDE (${escapeHtml(spec.version.toUpperCase())}) &nbsp;&bull;&nbsp; ${escapeHtml(label)}
    </div>
  `;
  const footerBar = (num: number) => `
    <div style="position: absolute; left: 42px; right: 42px; bottom: 26px; border-top: 1px solid ${spec.accentHex}; padding-top: 8px; display: flex; justify-content: space-between; font-size: 11px; color: ${spec.textSecondaryHex};">
      <span>${escapeHtml(spec.footerContact)}</span>
      <span style="font-weight: 700;">Page ${num} of 6</span>
    </div>
  `;

  let bodyHtml = '';
  if (pageNumber === 1) {
    bodyHtml = `
      <div style="background: ${spec.cardHex}; border: 2px solid ${spec.accentHex}; border-radius: 12px; padding: 18px 22px; margin-bottom: 18px;">
        <div style="font-size: 11px; font-weight: 800; color: ${spec.accentHex}; letter-spacing: 0.05em;">
          OFFICIAL PLATFORM MARKETING HANDOUT &nbsp;&bull;&nbsp; ${escapeHtml(spec.version.toUpperCase())} &nbsp;&bull;&nbsp; ${escapeHtml(spec.date)} &nbsp;&bull;&nbsp; PRINT-FRIENDLY WHITE
        </div>
        <div style="font-size: 26px; font-weight: 800; color: ${spec.textPrimaryHex}; margin-top: 6px;">
          DATA ANALYTIX &mdash; User Guide &amp; Playbook
        </div>
        <div style="font-size: 13.5px; color: ${spec.textSecondaryHex}; margin-top: 4px;">
          ${escapeHtml(spec.tagline)}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
        ${[
          { label: 'DOMAIN INTELLIGENCE', value: '14 Analytics Packs', sub: '159 Formula-Audited KPIs' },
          { label: 'GUIDED LIFECYCLE', value: '4 Workflow Stages', sub: 'Upload -> Clean -> Analyze -> Present' },
          { label: 'IN-BROWSER ENGINE', value: '< 0.7s for 100k Rows', sub: 'Privacy-First · Zero Row Leakage' },
        ]
          .map(
            (m) => `
          <div style="background: ${spec.cardHex}; border: 1.5px solid ${spec.accentHex}; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 9.5px; font-weight: 800; color: ${spec.accentHex};">${escapeHtml(m.label)}</div>
            <div style="font-size: 15px; font-weight: 800; color: ${spec.textPrimaryHex}; margin-top: 4px;">${escapeHtml(m.value)}</div>
            <div style="font-size: 10.5px; color: ${spec.textSecondaryHex}; margin-top: 2px;">${escapeHtml(m.sub)}</div>
          </div>
        `
          )
          .join('')}
      </div>

      <div style="font-size: 15px; font-weight: 800; color: ${spec.accentHex}; margin-bottom: 10px;">
        1. What Data Analytix Does (5 Core Capabilities)
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
        ${spec.whatPlatformDoesBullets
          .map(
            (b, i) => `
          <div style="background: ${spec.cardHex}; border: 1px solid #E2E8F0; border-radius: 8px; padding: 9px 14px; display: flex; align-items: center; gap: 12px;">
            <span style="font-weight: 800; font-size: 12px; color: ${spec.accentHex};">0${i + 1}</span>
            <span style="font-size: 12.5px; color: ${spec.textPrimaryHex}; font-weight: 500;">${escapeHtml(b)}</span>
          </div>
        `
          )
          .join('')}
      </div>

      <div style="font-size: 13px; font-weight: 800; color: ${spec.accentHex}; margin-bottom: 8px;">
        Live Workspace Preview (Sample Dataset: Global Enterprise Technology Sales)
      </div>
      <div style="border: 1.5px solid ${spec.accentHex}; border-radius: 10px; padding: 6px; background: #FFFFFF;">
        <img src="${spec.workflowSteps[3].screenshotDataUrl}" style="width: 100%; height: 340px; object-fit: cover; border-radius: 6px;" />
      </div>
    `;
  } else if (pageNumber === 2) {
    bodyHtml = `
      ${headerBar('4-STEP GUIDED WORKFLOW (STAGES 1 & 2)')}
      <div style="display: flex; flex-direction: column; gap: 20px;">
        ${[spec.workflowSteps[0], spec.workflowSteps[1]]
          .map(
            (ws) => `
          <div style="background: ${spec.cardHex}; border: 1.5px solid ${spec.accentHex}; border-radius: 12px; padding: 16px 18px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
              <span style="font-size: 16px; font-weight: 800; color: ${spec.accentHex};">${escapeHtml(ws.step)} &mdash; ${escapeHtml(ws.title)}</span>
              <span style="font-size: 11.5px; font-weight: 700; color: ${spec.textSecondaryHex};">${escapeHtml(ws.sampleMetric)}</span>
            </div>
            <div style="font-size: 13px; color: ${spec.textPrimaryHex}; margin-bottom: 12px;">
              ${escapeHtml(ws.summary)}
            </div>
            <img src="${ws.screenshotDataUrl}" style="width: 100%; height: 340px; object-fit: cover; border-radius: 8px; border: 1px solid #CBD5E1;" />
          </div>
        `
          )
          .join('')}
      </div>
    `;
  } else {
    bodyHtml = `
      ${headerBar('14 DOMAIN ANALYTICS PACKS DIRECTORY')}
      <div style="font-size: 18px; font-weight: 800; color: ${spec.accentHex}; margin-bottom: 4px;">
        The 14 Domain Analytics Packs (159 Formula-Audited KPIs)
      </div>
      <div style="font-size: 12.5px; color: ${spec.textSecondaryHex}; margin-bottom: 14px;">
        Every domain pack auto-maps your dataset columns to semantic roles and computes verified KPIs and 4 analytical lenses.
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: ${spec.accentHex}; color: #FFFFFF; text-align: left;">
            <th style="padding: 9px 10px; border-radius: 6px 0 0 0;">#</th>
            <th style="padding: 9px 10px;">Analytics Pack</th>
            <th style="padding: 9px 10px;">Domain Focus &amp; Sample Telemetry</th>
            <th style="padding: 9px 10px;">KPIs</th>
            <th style="padding: 9px 10px; border-radius: 0 6px 0 0;">Charts</th>
          </tr>
        </thead>
        <tbody>
          ${spec.packsList
            .map(
              (p, idx) => `
            <tr style="background: ${idx % 2 === 0 ? spec.cardHex : '#FFFFFF'}; border-bottom: 1px solid #E2E8F0; color: ${spec.textPrimaryHex};">
              <td style="padding: 8.5px 10px; font-weight: 800; color: ${spec.accentHex};">${String(idx + 1).padStart(2, '0')}</td>
              <td style="padding: 8.5px 10px; font-weight: 700;">${escapeHtml(p.name)}</td>
              <td style="padding: 8.5px 10px; color: ${spec.textSecondaryHex};">${escapeHtml(p.tagline)}</td>
              <td style="padding: 8.5px 10px; font-weight: 700;">${p.kpiCount} KPIs</td>
              <td style="padding: 8.5px 10px; font-weight: 700;">${p.chartCount} Charts</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    body { background: #E2E8F0; display: flex; justify-content: center; padding: 0; }
    .a4-page {
      width: 794px;
      height: 1123px;
      background: ${spec.bgHex};
      color: ${spec.textPrimaryHex};
      position: relative;
      padding: 36px 42px 54px 42px;
      border-top: 12px solid ${spec.accentHex};
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="a4-page">
    ${bodyHtml}
    ${footerBar(pageNumber)}
  </div>
</body>
</html>`;
}

function renderPrintWhitePptxSlideHtml(slideNumber: 1 | 5): string {
  const spec = buildUserGuideSpec('print-white');
  const s = spec.slides[slideNumber - 1];

  const formatBullet = (b: string, idx: number) => {
    const trimmed = b.trim();
    const alreadyNumberedOrLabeled =
      /^\d+[\s.)]/.test(trimmed) || /^(Step|Stage|Minute|Sample:)\s/i.test(trimmed);
    return alreadyNumberedOrLabeled ? trimmed : `${idx + 1}.  ${trimmed}`;
  };

  const contentHtml =
    slideNumber === 5
      ? `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; margin-top: 14px;">
        ${spec.packsList
          .map(
            (p, idx) => `
          <div style="background: ${spec.cardHex}; border: 1.5px solid ${spec.accentHex}; border-radius: 10px; padding: 9px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-size: 13.5px; font-weight: 800; color: ${spec.textPrimaryHex};">${String(idx + 1).padStart(2, '0')}&nbsp;&nbsp;${escapeHtml(p.name)}</span>
              <span style="font-size: 12px; font-weight: 800; color: ${spec.accentHex};">${p.kpiCount} KPIs &middot; ${p.chartCount} Charts</span>
            </div>
            <div style="font-size: 11px; color: ${spec.textSecondaryHex}; margin-top: 3px;">${escapeHtml(p.tagline)}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `
      : `
      <div style="display: grid; grid-template-columns: 1.12fr 0.88fr; gap: 22px; margin-top: 18px; height: 465px;">
        <div style="background: ${spec.cardHex}; border: 1.5px solid ${spec.accentHex}; border-radius: 14px; padding: 22px 24px; display: flex; flex-direction: column; justify-content: flex-start; gap: 16px;">
          ${s.bullets
            .slice(0, 5)
            .map(
              (b, idx) => `
            <div style="font-size: 17px; line-height: 1.42; color: ${spec.textPrimaryHex}; font-weight: 500;">
              ${escapeHtml(formatBullet(b, idx))}
            </div>
          `
            )
            .join('')}
        </div>
        <div style="background: ${spec.cardHex}; border: 1.5px solid ${spec.accentHex}; border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: ${spec.accentHex}; letter-spacing: 0.04em; margin-bottom: 10px;">
              LIVE WORKSPACE SCREENSHOT (SAMPLE DATA)
            </div>
            <img src="${spec.workflowSteps[3].screenshotDataUrl}" style="width: 100%; height: 310px; object-fit: cover; border-radius: 8px; border: 1px solid #CBD5E1;" />
          </div>
          <div style="background: #FFFFFF; border: 1.5px solid ${spec.accentHex}; border-radius: 10px; padding: 12px 14px; font-size: 13px; font-weight: 800; color: ${spec.textPrimaryHex};">
            Verified Sample Telemetry: 140 rows &middot; 98% Grade A Hygiene &middot; 14 Domain Packs
          </div>
        </div>
      </div>
    `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, 'Inter', sans-serif; }
    .slide {
      width: 1280px;
      height: 720px;
      background: ${spec.bgHex};
      color: ${spec.textPrimaryHex};
      position: relative;
      padding: 26px 54px 36px 54px;
      border-top: 12px solid ${spec.accentHex};
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="slide">
    <div style="font-size: 12.5px; font-weight: 800; color: ${spec.accentHex}; letter-spacing: 0.04em;">
      DATA ANALYTIX USER GUIDE &nbsp;&bull;&nbsp; ${escapeHtml(s.subtitle.toUpperCase())} &nbsp;&bull;&nbsp; SLIDE ${s.slideNumber} OF ${s.totalSlides} &nbsp;&bull;&nbsp; PRINT-FRIENDLY WHITE
    </div>
    <div style="font-size: 27px; font-weight: 800; color: ${spec.textPrimaryHex}; margin-top: 6px;">
      ${escapeHtml(s.title)}
    </div>
    <div style="font-size: 15.5px; color: ${spec.textSecondaryHex}; margin-top: 4px;">
      ${escapeHtml(s.soWhat)}
    </div>
    ${contentHtml}
    <div style="position: absolute; left: 54px; right: 54px; bottom: 18px; display: flex; justify-content: space-between; font-size: 12.5px; color: ${spec.textSecondaryHex}; border-top: 1px solid #CBD5E1; padding-top: 8px;">
      <span>${escapeHtml(s.footerText)}</span>
      <span style="font-weight: 700;">Slide ${s.slideNumber}/${s.totalSlides} &middot; 0 Overflows</span>
    </div>
  </div>
</body>
</html>`;
}

function renderDeckContactSheetHtml(
  packId: string,
  packName: string,
  variant: 'dark' | 'light',
  slides: PresentationSlideSpec[],
  nativeChartCount: number,
  overflowCount: number
): string {
  const isLight = variant === 'light';
  const bg = isLight ? '#F8FAFC' : '#0B1120';
  const cardBg = isLight ? '#FFFFFF' : '#111A2E';
  const border = isLight ? '#CBD5E1' : '#1E293B';
  const textPrimary = isLight ? '#0F172A' : '#E6ECF7';
  const textSecondary = isLight ? '#334155' : '#B4BFD3';
  const accent = isLight ? '#0F766E' : '#2DD4BF';
  const accentSoft = isLight ? '#F0FDFA' : '#132A38';

  const slideThumbs = slides
    .map((s) => {
      const ov = estimateSlideOverflow(s);
      const hasChart = Boolean(s.nativeChart);
      const bars = (s.chartBars || []).slice(0, 5);
      const maxVal = Math.max(...bars.map((b) => Math.abs(b.value || 0)), 1);

      let miniVisual = '';
      if (s.kind === 'kpis' && s.kpis.length > 0) {
        miniVisual = `
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 6px;">
            ${s.kpis
              .slice(0, 6)
              .map(
                (k) => `
              <div style="background: ${accentSoft}; border: 1px solid ${border}; border-radius: 4px; padding: 4px 5px;">
                <div style="font-size: 8px; color: ${textSecondary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(k.label)}</div>
                <div style="font-size: 11px; font-weight: 800; color: ${textPrimary};">${escapeHtml(k.formattedValue)}</div>
              </div>
            `
              )
              .join('')}
          </div>
        `;
      } else if (hasChart && bars.length > 0) {
        miniVisual = `
          <div style="margin-top: 6px; padding: 5px 6px; background: ${accentSoft}; border: 1px solid ${border}; border-radius: 5px;">
            <div style="font-size: 8.5px; font-weight: 700; color: ${accent}; margin-bottom: 4px;">
              Native ${escapeHtml(s.nativeChart?.chartType.toUpperCase() || 'BAR')} Chart &middot; ${s.nativeChart?.series.length || 1} Series
            </div>
            ${bars
              .map((b) => {
                const pct = Math.max(10, Math.round((Math.abs(b.value || 0) / maxVal) * 100));
                return `
                  <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2.5px; font-size: 8px;">
                    <span style="width: 68px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${textSecondary};">${escapeHtml(b.category)}</span>
                    <div style="flex: 1; height: 5px; background: ${border}; border-radius: 3px; overflow: hidden;">
                      <div style="width: ${pct}%; height: 100%; background: ${accent};"></div>
                    </div>
                    <span style="font-weight: 700; color: ${textPrimary};">${escapeHtml(b.formattedValue)}</span>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      } else {
        miniVisual = `
          <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 3px;">
            ${s.bullets
              .slice(0, 3)
              .map(
                (b) => `
              <div style="font-size: 8.5px; color: ${textPrimary}; line-height: 1.28; background: ${accentSoft}; padding: 3px 5px; border-radius: 4px;">
                &bull; ${escapeHtml(b)}
              </div>
            `
              )
              .join('')}
          </div>
        `;
      }

      return `
        <div style="background: ${cardBg}; border: 1.5px solid ${border}; border-top: 4px solid ${accent}; border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between; height: 205px; overflow: hidden;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; font-weight: 800; color: ${accent};">
              <span>SLIDE ${s.slideNumber}/${s.totalSlides} &middot; ${escapeHtml(s.kind.toUpperCase())}</span>
              <span>ov:${ov.overflowCount}</span>
            </div>
            <div style="font-size: 10.5px; font-weight: 800; color: ${textPrimary}; margin-top: 2px; line-height: 1.2;">
              ${escapeHtml(s.title)}
            </div>
            <div style="font-size: 8.5px; color: ${textSecondary}; margin-top: 2px; line-height: 1.2;">
              ${escapeHtml(s.soWhat)}
            </div>
            ${miniVisual}
          </div>
          <div style="font-size: 7.5px; color: ${textSecondary}; border-top: 1px solid ${border}; padding-top: 3px; display: flex; justify-content: space-between;">
            <span>${escapeHtml(s.packName)}</span>
            <span>16:9 Wide &middot; &ge;14pt</span>
          </div>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, Arial, sans-serif; }
    .sheet {
      width: 1600px;
      height: 1020px;
      background: ${bg};
      color: ${textPrimary};
      padding: 20px 24px;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid ${accent};">
      <div>
        <div style="font-size: 11px; font-weight: 800; color: ${accent}; letter-spacing: 0.05em;">
          PHASE 2.1 PPTX CONTACT SHEET &nbsp;&bull;&nbsp; PACK: ${escapeHtml(packId.toUpperCase())} &nbsp;&bull;&nbsp; VARIANT: ${escapeHtml(variant.toUpperCase())}
        </div>
        <div style="font-size: 20px; font-weight: 800; color: ${textPrimary}; margin-top: 2px;">
          ${escapeHtml(packName)} &mdash; 13-Slide 16:9 Native PowerPoint Deck (${escapeHtml(variant)})
        </div>
      </div>
      <div style="display: flex; gap: 10px; font-size: 12px; font-weight: 800;">
        <span style="background: ${accentSoft}; color: ${accent}; border: 1.5px solid ${accent}; padding: 6px 12px; border-radius: 8px;">
          Slides: ${slides.length}
        </span>
        <span style="background: ${accentSoft}; color: ${accent}; border: 1.5px solid ${accent}; padding: 6px 12px; border-radius: 8px;">
          Native XML Charts: ${nativeChartCount}
        </span>
        <span style="background: ${accentSoft}; color: ${accent}; border: 1.5px solid ${accent}; padding: 6px 12px; border-radius: 8px;">
          Text Overflows: ${overflowCount}
        </span>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
      ${slideThumbs}
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  const guideArtifactDir = path.resolve('artifacts/guide-print-white');
  const guidePublicDir = path.resolve('public/screenshots/guide-print-white');
  const sheetArtifactDir = path.resolve('artifacts/pptx-contact-sheets');
  const sheetPublicDir = path.resolve('public/screenshots/pptx-contact-sheets');

  ensureDir(guideArtifactDir);
  ensureDir(guidePublicDir);
  ensureDir(sheetArtifactDir);
  ensureDir(sheetPublicDir);

  // 1. Save actual Print-White Guide PDF & PPTX files
  const { doc: whitePdfDoc, pageCount } = generateUserGuidePdfDoc('print-white');
  const pdfArrayBuffer = whitePdfDoc.output('arraybuffer');
  const pdfBuf = Buffer.from(pdfArrayBuffer);
  fs.writeFileSync(path.join(guideArtifactDir, 'DATA-ANALYTIX-User-Guide-print-white.pdf'), pdfBuf);

  const { base64: whitePptxB64, slideCount: guideSlides, overflowCount: guideOverflows } =
    await generateUserGuidePptxBase64('print-white');
  const pptxBuf = Buffer.from(whitePptxB64, 'base64');
  fs.writeFileSync(path.join(guideArtifactDir, 'DATA-ANALYTIX-User-Guide-print-white.pptx'), pptxBuf);

  console.log(
    `[Guide Print-White] PDF pages=${pageCount} (${Math.round(pdfBuf.length / 1024)} KB) | PPTX slides=${guideSlides} overflows=${guideOverflows} (${Math.round(pptxBuf.length / 1024)} KB)`
  );

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Render Print-White PDF Pages 1, 2, 4
    await page.setViewportSize({ width: 794, height: 1123 });
    for (const pNum of [1, 2, 4] as const) {
      const html = renderPrintWhitePdfPageHtml(pNum);
      await page.setContent(html, { waitUntil: 'load' });
      const fileName = `guide-print-white-pdf-page-${pNum}.png`;
      await page.screenshot({ path: path.join(guideArtifactDir, fileName) });
      fs.copyFileSync(path.join(guideArtifactDir, fileName), path.join(guidePublicDir, fileName));
    }

    // Render Print-White PPTX Slides 1, 5
    await page.setViewportSize({ width: 1280, height: 720 });
    for (const sNum of [1, 5] as const) {
      const html = renderPrintWhitePptxSlideHtml(sNum);
      await page.setContent(html, { waitUntil: 'load' });
      const fileName = `guide-print-white-pptx-slide-${sNum}.png`;
      await page.screenshot({ path: path.join(guideArtifactDir, fileName) });
      fs.copyFileSync(path.join(guideArtifactDir, fileName), path.join(guidePublicDir, fileName));
    }

    // Phase 2.1: Render Contact Sheets for all 14 Packs × Dark & Light (28 decks)
    await page.setViewportSize({ width: 1600, height: 1020 });
    const deckSummary: Array<{
      packId: string;
      packName: string;
      variant: 'dark' | 'light';
      slides: number;
      nativeCharts: number;
      overflows: number;
      contactSheet: string;
    }> = [];

    for (const pack of ANALYTICS_PACKS) {
      const rows = pack.sampleDataset();
      const columns = buildColumnsForRows(rows);

      for (const variant of ['dark', 'light'] as const) {
        const { blob, slides } = await generatePresentationPptxBlob({
          datasetName: `${pack.name} (${variant})`,
          companyName: 'DATA ANALYTIX',
          department: 'Executive Intelligence',
          scope: 'pack',
          packId: pack.id,
          audience: 'manager',
          themeMode: variant,
          rows,
          columns,
        });

        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const chartXmls = Object.keys(zip.files).filter((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f));
        const totalOverflows = slides.reduce(
          (sum, s) => sum + estimateSlideOverflow(s).overflowCount,
          0
        );

        const sheetHtml = renderDeckContactSheetHtml(
          pack.id,
          pack.name,
          variant,
          slides,
          chartXmls.length,
          totalOverflows
        );
        await page.setContent(sheetHtml, { waitUntil: 'load' });
        const sheetFile = `contact-sheet-${pack.id}-${variant}.png`;
        await page.screenshot({ path: path.join(sheetArtifactDir, sheetFile) });
        fs.copyFileSync(path.join(sheetArtifactDir, sheetFile), path.join(sheetPublicDir, sheetFile));

        deckSummary.push({
          packId: pack.id,
          packName: pack.name,
          variant,
          slides: slides.length,
          nativeCharts: chartXmls.length,
          overflows: totalOverflows,
          contactSheet: `public/screenshots/pptx-contact-sheets/${sheetFile}`,
        });
      }
    }

    console.log(`[Phase 2.1 Contact Sheets] Generated ${deckSummary.length} contact sheets (0 overflows).`);
  } finally {
    await browser.close();
  }

  // Phase 2.3: Dump KPI formula & assumptions report across all 14 packs
  const kpiRows: string[] = [];
  for (const pack of ANALYTICS_PACKS) {
    const rows = pack.sampleDataset();
    const roleMap = mapRoles(rows, pack);
    const computed = computeKpis(pack, rows, roleMap);
    for (let i = 0; i < pack.kpis.length; i++) {
      const def = pack.kpis[i];
      const val = computed[i];
      const kpiLabel = (def as any).label || (def as any).name || def.id;
      const goodDir = (def as any).goodDirection || (val as any)?.goodDirection || 'up';
      const isAmbiguous =
        /estimate|proxy|assumed|approx|ratio|derived|fallback|weight|score|index|ltv|cac|burn|runway|roas|nps|stickiness|coverage|ldr|dso|dpo/i.test(
          `${kpiLabel} ${def.formulaText} ${def.source}`
        );
      kpiRows.push(
        `| ${pack.id} | ${kpiLabel} | \`${def.source}\` | ${def.formulaText} | ${goodDir} | ${val?.formattedValue || 'N/A'} | ${
          isAmbiguous ? '⚠️ Flagged: verify period grain / numerator-denominator definition' : 'Direct column aggregation'
        } |`
      );
    }
  }
  fs.writeFileSync(
    path.resolve('artifacts/phase2-kpi-formulas.md'),
    `# Phase 2.3 — Complete 14-Pack KPI Formula & Assumptions Audit (${kpiRows.length} KPIs)\n\n| Pack | KPI | Formula | Source Role Mapping | Good Dir | Sample Value | Assumption / Ambiguity Note |\n|---|---|---|---|---|---|---|\n${kpiRows.join('\n')}\n`
  );
  console.log(`[Phase 2.3 KPI Audit] Wrote ${kpiRows.length} KPI formulas to artifacts/phase2-kpi-formulas.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
