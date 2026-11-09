#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const ALLOWLIST_PATH = path.join(__dirname, 'color-allowlist.json');

/**
 * Step 4 — Guard Against Theme Color Regression
 *
 * Scans all .tsx files under src/ for:
 *   - text-white
 *   - text-gray-*
 *   - text-slate-*
 *   - bg-slate-*
 *   - inline hex literals (#RGB / #RRGGBB / #RRGGBBAA)
 *   - inline rgb() / rgba() literals
 *
 * Fails with exit code 1 if any file exceeds its recorded baseline in
 * scripts/color-allowlist.json (e.g., classic fallback branches when unifiedTheme is off)
 * or if a new .tsx file introduces unapproved hardcoded colors.
 */

const PATTERNS = {
  textWhite: /\btext-white(?:\/[0-9]+)?\b/g,
  textGray: /\btext-gray-[0-9]{2,3}(?:\/[0-9]+)?\b/g,
  textSlate: /\btext-slate-[0-9]{2,3}(?:\/[0-9]+)?\b/g,
  bgSlate: /\bbg-slate-[0-9]{2,3}(?:\/[0-9]+)?\b/g,
  inlineHex: /#[0-9a-fA-F]{3,8}\b/g,
  inlineRgb: /\brgba?\s*\([^)]+\)/g,
};

const SEMANTIC_TOKENS_REGEX =
  /\b(?:bg-app|bg-sidebar|bg-card|bg-card-hover|bg-input|bg-elevated|border-subtle|border-strong|text-primary|text-secondary|text-muted|text-on-accent|text-accent|bg-accent)\b|var\(--(?:bg-|text-|border-|accent|chart-|success|warning|danger|info)/g;

function walkTsxFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsxFiles(full, out);
    } else if (entry.isFile() && full.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out.sort();
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const counts = {};
  for (const [key, regex] of Object.entries(PATTERNS)) {
    const matches = content.match(regex);
    counts[key] = matches ? matches.length : 0;
  }
  const semanticMatches = content.match(SEMANTIC_TOKENS_REGEX);
  const semanticCount = semanticMatches ? semanticMatches.length : 0;
  return { counts, semanticCount };
}

const args = process.argv.slice(2);
const updateBaseline = args.includes('--update-baseline');

const files = walkTsxFiles(SRC_DIR);
const currentReport = {};
let totalSemanticUsages = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const { counts, semanticCount } = scanFile(file);
  currentReport[rel] = counts;
  totalSemanticUsages += semanticCount;
}

if (updateBaseline || !fs.existsSync(ALLOWLIST_PATH)) {
  fs.writeFileSync(ALLOWLIST_PATH, JSON.stringify(currentReport, null, 2) + '\n', 'utf8');
  console.log(`Updated color baseline allow-list at ${path.relative(ROOT, ALLOWLIST_PATH)} (${files.length} files scanned, ${totalSemanticUsages} semantic token usages).`);
  process.exit(0);
}

const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
const violations = [];

for (const [rel, counts] of Object.entries(currentReport)) {
  const allowed = allowlist[rel] || {
    textWhite: 0,
    textGray: 0,
    textSlate: 0,
    bgSlate: 0,
    inlineHex: 0,
    inlineRgb: 0,
  };

  for (const [category, count] of Object.entries(counts)) {
    const maxAllowed = allowed[category] ?? 0;
    if (count > maxAllowed) {
      violations.push(
        `${rel}: "${category}" count increased from ${maxAllowed} to ${count} (+${count - maxAllowed}). Use semantic tokens (--bg-*, --text-*, --border-*, --accent, --chart-*) instead.`
      );
    }
  }
}

if (totalSemanticUsages < 500) {
  violations.push(
    `Expected at least 500 semantic token usages across src/**/*.tsx, found ${totalSemanticUsages}.`
  );
}

if (violations.length > 0) {
  console.error('❌ Theme color regression check failed:\n');
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log(
  `✅ Theme color check passed across ${files.length} .tsx files (${totalSemanticUsages} semantic token usages, 0 new unapproved hardcoded colors).`
);
