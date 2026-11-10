# Data Analytix — Design & Export Standard Operating Procedure (DESIGN-SOP)

This document is the single authoritative specification for visual tokens, typography, print geometry, metadata headers, and file naming across **Data Analytix** (`src/config/designTokens.ts` and `src/index.css`). Every UI surface and every downloaded deliverable must comply with this SOP.

---

## 1. Brand Identity & Color Tokens

- **Brand Name**: `Data Analytix`
- **App Version**: `2.4.0`
- **Single Source of Truth**:
  - CSS Custom Properties in `src/index.css` (`:root` for Dark default, `html.theme-light` for Light).
  - TypeScript mirror in `src/config/designTokens.ts` (`DARK_TOKENS`, `LIGHT_TOKENS`, `DESIGN_TOKENS`).
  - Synchronized and enforced by `tests/design-tokens-sync.test.ts`.

### Core Semantic Palette

| Semantic Token | Dark Theme (`:root`) | Light / Print-Safe (`html.theme-light`) | Role |
| :--- | :--- | :--- | :--- |
| `--bg-app` | `#0B1120` | `#F6F8FC` | Primary application ground canvas |
| `--bg-sidebar` | `#0E1629` | `#FFFFFF` | Navigation sidebar & header surface |
| `--bg-card` | `#111A2E` | `#FFFFFF` | Card, modal, and container surface |
| `--bg-card-hover` | `#17233D` | `#F1F5F9` | Interactive hover elevation |
| `--bg-input` | `#0D1526` | `#FFFFFF` | Form inputs, selects, code editors |
| `--bg-elevated` | `#17233D` | `#F8FAFC` | Secondary badges, toolbars, popovers |
| `--border-subtle` | `#1E293B` | `#D5DCE8` | Hairline card and table borders |
| `--border-strong` | `#64748B` | `#64748B` | Emphasized input/control borders |
| `--text-primary` | `#E6ECF7` | `#0F172A` | Primary headings, KPI values, body copy |
| `--text-secondary` | `#B4BFD3` | `#334155` | Supporting descriptions and table cells |
| `--text-muted` | `#9AA7BD` | `#5B6B82` | Captions, axis labels, metadata (`>= 4.5:1`) |
| `--text-on-accent` | `#042F2E` | `#FFFFFF` | High-contrast text on primary accent buttons |
| `--accent` | `#2DD4BF` | `#0F766E` | Primary brand teal accent |
| `--accent-2` | `#818CF8` | `#4F46E5` | Secondary indigo analytical accent |
| `--success` | `#34D399` | `#047857` | Positive variance / passing checks |
| `--warning` | `#F59E0B` | `#B45309` | Caution / threshold alerts |
| `--danger` | `#F87171` | `#B91C1C` | Critical anomalies / errors |
| `--info` | `#38BDF8` | `#0369A1` | Informational callouts |

### 8-Series Chart Palette

| Series Token | Dark Mode | Light / Print-Safe |
| :--- | :--- | :--- |
| `--chart-1` | `#2DD4BF` | `#0F766E` |
| `--chart-2` | `#818CF8` | `#4F46E5` |
| `--chart-3` | `#38BDF8` | `#0369A1` |
| `--chart-4` | `#F59E0B` | `#B45309` |
| `--chart-5` | `#F472B6` | `#BE185D` |
| `--chart-6` | `#A78BFA` | `#6D28D9` |
| `--chart-7` | `#34D399` | `#047857` |
| `--chart-8` | `#FB7185` | `#BE123C` |

---

## 2. Typography Hierarchy

Self-hosted WOFF2 fonts (`public/fonts/`):
1. **Space Grotesk (`--font-heading`)**: Display titles, section headers, and KPI numbers (`tabular-nums`).
2. **Inter (`--font-sans`)**: Body prose, UI controls, descriptions, and narratives.
3. **JetBrains Mono (`--font-mono`)**: Data tables, SQL/DAX/Python editors, column labels, and metric badges.

---

## 3. Document Layout & Print Geometry (PDF & Printable Deliverables)

- **Paper Size**: ISO `A4` (`210 mm × 297 mm`).
- **Margins**: `20 mm` on all four sides (top, right, bottom, left).
- **Running Header**: Brand wordmark (`Data Analytix`) + document title + subtle hairline rule.
- **Running Footer**: Generated date (`YYYY-MM-DD`), dataset name, and `Page X of Y` right-aligned.
- **Minimum Font Size**: Body copy `>= 11 pt`; table cells `>= 10 pt`; headings `14 pt – 22 pt`.
- **Contrast**: Print-safe light palette (`#0F172A` text on `#FFFFFF` / `#F6F8FC` ground, `#0F766E` primary accent, `#4F46E5` secondary accent) with WCAG AA contrast `>= 4.5:1`.
- **Table Pagination**: Never clip tables horizontally or vertically; enable automatic page breaks (`pageBreak: 'auto'`) and repeat table headers on every overflow page.

---

## 4. Standardized File Naming Convention

Every generated download must use `buildSopFileName(type, dataset, ext)` from `src/config/designTokens.ts`:

```text
data-analytix-<type>-<dataset>-YYYY-MM-DD.<ext>
```

- **Lowercase kebab-case only**; zero spaces or special characters.
- Examples:
  - `data-analytix-executive-report-global-retail-sales-2026-11-09.pdf`
  - `data-analytix-chart-guide-workspace-2026-11-09.pdf`
  - `data-analytix-workbook-global-retail-sales-2026-11-09.xlsx`
  - `data-analytix-powerbi-theme-workspace-2026-11-09.json`
  - `data-analytix-project-bundle-global-retail-sales-2026-11-09.zip`

---

## 5. Mandatory File Provenance & Metadata

Every downloaded file must embed provenance metadata (`buildSopMetadata`):
- **Generated Date**: ISO date (`YYYY-MM-DD`) and timestamp
- **App Version**: `v2.4.0`
- **Dataset Name**: Active dataset name or `'No dataset loaded (Template / Reference)'`
- **Row Count**: Audited row count (`0` when exporting a blank template or reference guide)
- **Source**: Source filename or connection identifier

### Format-Specific Rules
1. **Executive Report PDF & Chart Guide PDF**: Cover metadata block, 20 mm margins, print-safe light palette, `>= 11 pt` body text, running headers/footers, and vector illustrations.
2. **Excel Workbook (`.xlsx`)**: Styled header fill (`#0F766E` with `#FFFFFF` bold text), auto-fitted column widths, explicit number/currency/percentage formats, frozen top header row (`views: [{ state: 'frozen', ySplit: 1 }]`), and a dedicated `00_Metadata` sheet.
3. **Power BI Theme (`.json`)**: Uses exact `DESIGN_TOKENS` colors (`dataColors` from `--chart-1..8`, background, foreground, tableAccent).
4. **Standalone Dashboard (`.html`)**: 100% offline-capable (no external CDN requests), embeds `:root` and `@media (prefers-color-scheme: light)` CSS variables from `DESIGN_TOKENS`, and includes provenance metadata.
5. **Project Bundle (`.zip`)**: Contains the complete 14-folder enterprise structure, `README.md`, and `export_manifest.json` with full metadata.
6. **Code Scripts (`.sql`, `.dax`, `.py`, `.pq`)**: Prefixed with the standardized `buildSopCodeHeaderComment` metadata block.
7. **Per-Chart Exports (`.png`, `.csv`)**: Named via `buildSopFileName`, with high-DPI canvas rendering for PNG and clean RFC-4180 escaping for CSV.
