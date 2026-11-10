#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const ALLOWLIST_PATH = path.join(__dirname, 'color-allowlist.json');

/**
 * Real Guard Against Hardcoded Colors in src/**\/*.tsx
 *
 * Scans all .tsx files under src/ for:
 *   - text-white
 *   - text-gray-*
 *   - text-slate-*
 *   - bg-slate-*
 *   - inline hex literals (#RGB / #RRGGBB / #RRGGBBAA, excluding HTML numeric entities like &#123;)
 *   - inline rgb() / rgba() literals
 *   - legacy dark surface hex codes (#141414, #1c1c1c, #242424)
 *
 * Every entry in scripts/color-allowlist.json MUST include a non-empty `reason` string
 * explaining why the brand logo or illustration requires those colors.
 * Any file outside scripts/color-allowlist.json has a strict 0 allowance across all categories.
 */

const PATTERNS = {
  textWhite: /\btext-white(?:\/[0-9]+)?\b/g,
  textGray: /\btext-gray-[0-9]{2,3}(?:\/[0-9]+)?\b/g,
  textSlate: /\btext-slate-[0-9]{2,3}(?:\/[0-9]+)?\b/g,
  bgSlate: /\bbg-slate-[0-9]{2,3}(?:\/[0-9]+)?\b/g,
  inlineHex: /(?<![&a-zA-Z0-9_/])#[0-9a-fA-F]{3,8}\b/g,
  inlineRgb: /\brgba?\s*\([^)]+\)/g,
};

const LEGACY_SURFACE_REGEX = /#(?:141414|1c1c1c|242424)\b/gi;

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
  const legacyMatches = content.match(LEGACY_SURFACE_REGEX);
  const legacyCount = legacyMatches ? legacyMatches.length : 0;
  const semanticMatches = content.match(SEMANTIC_TOKENS_REGEX);
  const semanticCount = semanticMatches ? semanticMatches.length : 0;
  return { counts, legacyCount, semanticCount };
}

const files = walkTsxFiles(SRC_DIR);
const currentReport = {};
let totalSemanticUsages = 0;
const violations = [];

if (!fs.existsSync(ALLOWLIST_PATH)) {
  console.error(`❌ Missing ${path.relative(ROOT, ALLOWLIST_PATH)}`);
  process.exit(1);
}

const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));

// Validate that every allowlist entry has a documented reason
for (const [rel, entry] of Object.entries(allowlist)) {
  if (!entry || typeof entry.reason !== 'string' || entry.reason.trim().length < 10) {
    violations.push(
      `Allow-list entry "${rel}" is missing a valid "reason" field explaining why it is exempted.`
    );
  }
}

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const { counts, legacyCount, semanticCount } = scanFile(file);
  currentReport[rel] = counts;
  totalSemanticUsages += semanticCount;

  if (legacyCount > 0) {
    violations.push(
      `${rel}: Found ${legacyCount} legacy surface color(s) (#141414, #1c1c1c, or #242424). All legacy surfaces must be removed from .tsx.`
    );
  }

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
        `${rel}: "${category}" count is ${count} (max allowed: ${maxAllowed}). Use semantic tokens (--bg-*, --text-*, --border-*, --accent, --chart-1..8) instead.`
      );
    }
  }
}

if (totalSemanticUsages < 1500) {
  violations.push(
    `Expected at least 1500 semantic token usages across src/**/*.tsx, found ${totalSemanticUsages}.`
  );
}

if (violations.length > 0) {
  console.error('❌ Theme color regression guard failed:\n');
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log(
  `✅ Theme color guard passed across ${files.length} .tsx files (${Object.keys(allowlist).length} allow-listed brand/illustration files with reasons, ${totalSemanticUsages} semantic token usages, 0 legacy surfaces, 0 unapproved hardcoded colors).`
);
