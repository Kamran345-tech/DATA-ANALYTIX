import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  DARK_TOKENS,
  LIGHT_TOKENS,
  DESIGN_TOKENS,
  buildSopFileName,
  buildSopMetadata,
  buildSopCodeHeaderComment,
  SemanticTokenSet,
} from '../src/config/designTokens';

function extractCssBlockVariables(cssText: string, selectorMarker: string): Record<string, string> {
  const idx = cssText.indexOf(selectorMarker);
  if (idx === -1) {
    throw new Error(`Could not find selector marker "${selectorMarker}" in src/index.css`);
  }
  const openBrace = cssText.indexOf('{', idx);
  let depth = 0;
  let endBrace = openBrace;
  for (let i = openBrace; i < cssText.length; i++) {
    if (cssText[i] === '{') depth++;
    else if (cssText[i] === '}') {
      depth--;
      if (depth === 0) {
        endBrace = i;
        break;
      }
    }
  }
  const block = cssText.slice(openBrace + 1, endBrace);
  const vars: Record<string, string> = {};
  const regex = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(block)) !== null) {
    vars[match[1].trim()] = match[2].trim();
  }
  return vars;
}

describe('DESIGN-SOP & designTokens.ts synchronization with src/index.css', () => {
  const cssPath = path.resolve(__dirname, '../src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('keeps DARK_TOKENS in src/config/designTokens.ts 100% synced with :root in src/index.css', () => {
    const rootVars = extractCssBlockVariables(cssContent, ':root {');
    for (const [tokenName, expectedVal] of Object.entries(DARK_TOKENS)) {
      expect(
        rootVars[tokenName],
        `Mismatch for dark token ${tokenName} between src/index.css and src/config/designTokens.ts`
      ).toBe(expectedVal);
    }
  });

  it('keeps LIGHT_TOKENS in src/config/designTokens.ts 100% synced with html.theme-light in src/index.css', () => {
    const lightVars = extractCssBlockVariables(cssContent, 'html.theme-light,\n.theme-light');
    for (const [tokenName, expectedVal] of Object.entries(LIGHT_TOKENS)) {
      expect(
        lightVars[tokenName],
        `Mismatch for light token ${tokenName} between src/index.css and src/config/designTokens.ts`
      ).toBe(expectedVal);
    }
  });

  it('defines identical keys in DARK_TOKENS and LIGHT_TOKENS', () => {
    const darkKeys = Object.keys(DARK_TOKENS as SemanticTokenSet).sort();
    const lightKeys = Object.keys(LIGHT_TOKENS as SemanticTokenSet).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  it('formats filenames strictly as data-analytix-<type>-<dataset>-YYYY-MM-DD.<ext> with zero spaces', () => {
    const fixedDate = new Date('2026-11-09T12:00:00Z');
    const name = buildSopFileName('Executive Report', 'Global Retail Sales.csv', 'pdf', fixedDate);
    expect(name).toBe('data-analytix-executive-report-global-retail-sales-2026-11-09.pdf');
    expect(name).not.toContain(' ');
  });

  it('builds complete SOP metadata and code header comments', () => {
    const fixedDate = new Date('2026-11-09T12:00:00Z');
    const meta = buildSopMetadata({
      datasetName: 'Global Retail Sales',
      rowCount: 1500,
      source: 'global_retail_sales.csv',
      date: fixedDate,
    });
    expect(meta.brandName).toBe(DESIGN_TOKENS.brand.name);
    expect(meta.generatedDate).toBe('2026-11-09');
    expect(meta.rowCount).toBe(1500);

    const sqlHeader = buildSopCodeHeaderComment('sql', 'Enterprise SQL Library', meta);
    expect(sqlHeader).toContain('-- Data Analytix — Enterprise SQL Library');
    expect(sqlHeader).toContain('-- Dataset Name   : Global Retail Sales');
    expect(sqlHeader).toContain('-- Row Count      : 1,500');
  });
});
