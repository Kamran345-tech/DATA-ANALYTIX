# Data Analytix — Full Functional QA Checklist

This checklist tracks end-to-end functional verification across every view, chart renderer, export pipeline, edge case, theme mode, and viewport in Data Analytix.

## 1. Chart Guide & 8-Chart Engine (`chartGuide` Flag)
- [x] **01. Bar Chart (`bar`)**:
  - [x] Renders from loaded dataset and all 4 demo datasets (`src/data/demoDatasets.ts`)
  - [x] Handles edge cases: empty data, 1 row, nulls, all-equal values, negative numbers, large numbers, 10,000+ rows (auto-sampled/aggregated with notice), long labels, 1 category, 50+ categories (capped at top 10 + `"Other"`)
  - [x] Starts value axis at zero; displays units, formatted numbers, hover tooltip, keyboard focus, aria-label & text summary
  - [x] Click to drill through (`DrillThroughModal`) and cross-filter with global filters/slicers
  - [x] Per-chart export: PNG and CSV of plotted data
- [x] **02. Line Chart (`line`)**:
  - [x] Renders chronological series from real and demo datasets
  - [x] Handles edge cases: empty data, 1 row, invalid dates (gracefully filtered/sorted with notice), nulls, negative values, all-equal values, 10,000+ rows (downsampled with notice)
  - [x] Displays axes, units, hover tooltip, click to drill through, cross-filtering, aria-label & text summary
  - [x] Per-chart export: PNG and CSV of plotted data
- [x] **03. Scatter Plot (`scatter`)**:
  - [x] Renders bivariate relationship for 2 numeric measures with linear trendline
  - [x] Handles edge cases: empty data, 1 row, nulls, all-equal values, negative numbers, large numbers, 10,000+ rows (sampled to interactive budget with notice)
  - [x] Hover tooltip, click to drill through, keyboard access, aria-label & text summary
  - [x] Per-chart export: PNG and CSV of plotted data
- [x] **04. Histogram (`histogram`)**:
  - [x] Renders binned numeric distribution with auto bin count via Sturges or Freedman-Diaconis (`Auto` / `F-D` / `Sturges` toggle)
  - [x] Handles edge cases: empty data, 1 row, nulls, all-equal values (single bin), negative numbers, large numbers, 10,000+ rows
  - [x] Hover/focus state, click bin to drill through, aria-label & text summary
  - [x] Per-chart export: PNG and CSV of binned distribution
- [x] **05. Stacked Bar (`stacked_bar`)**:
  - [x] Renders 2 categories + 1 measure with `Totals` vs `100% Stacked` proportional toggle
  - [x] Handles edge cases: empty data, 1 row, nulls, negative values, 50+ categories (top 10 + `"Other"`), long labels, 10,000+ rows
  - [x] Hover tooltip, click segment/bar to drill through, aria-label & text summary
  - [x] Per-chart export: PNG and CSV of stacked table
- [x] **06. Donut Chart (`donut`)**:
  - [x] Recommended only when category has `<= 5` distinct values (otherwise recommends Bar; never recommends Pie over Donut in guide mode)
  - [x] Handles edge cases: empty data, 1 category, `> 5` categories (gentle warning + top slices + `"Other"`), zero/negative values, 10,000+ rows
  - [x] Center aggregate readout, legend, click slice to drill through, aria-label & text summary
  - [x] Per-chart export: PNG and CSV of slice shares
- [x] **07. Heatmap (`heatmap`)**:
  - [x] Renders 2D category/time grid with labeled color intensity scale
  - [x] Handles edge cases: empty data, 1 row, nulls, all-equal values, negative values, 50+ categories, 10,000+ rows
  - [x] Hover tooltip, click cell to drill through, aria-label & text summary
  - [x] Per-chart export: PNG and CSV of matrix cells
- [x] **08. Box Plot (`boxplot`)**:
  - [x] Renders Tukey 5-number summary (Min, Q1, Median, Q3, Max, IQR, Mean diamond, Outliers) across categories
  - [x] Handles edge cases: empty data, 1 row, all-equal values (`IQR = 0`), negative numbers, extreme outliers, 50+ categories (top 10), 10,000+ rows
  - [x] Hover tooltip, click box to drill through, aria-label & text summary
  - [x] Per-chart export: PNG and CSV of quartile statistics
- [x] **Chart States & Switching**:
  - [x] Loading skeleton, empty state (`ModernEmptyState`), and error boundary/fallback state on every chart
  - [x] Switching chart types preserves chosen category, secondary category, primary measure, and secondary measure fields

## 2. Complete Chart Selection Guide PDF (`chartGuide` Flag & Export Center)
- [x] **"Download complete guide (PDF)" button** in Chart Guide panel header (`<button>`, `aria-label`, loading spinner, toast via `useToast`)
- [x] **Option toggle** to include or exclude the `"Recommended for your data"` section
- [x] **Export Center integration**: `"Chart guide (PDF)"` card & action button in `ExportCenterView`
- [x] **PDF Structure & Quality**:
  - [x] Page 1: Cover (`"Data Analytix: Chart Selection Guide"`, generation date, active dataset name if loaded)
  - [x] Page 2: How to choose in 3 steps (1. What is your question? 2. What is your data shape? 3. Pick the chart) + Quick decision table (`autoTable`)
  - [x] Pages 3–10: One dedicated page per chart (all 8 charts: Bar, Line, Scatter, Histogram, Stacked Bar, Donut, Heatmap, Box Plot) with purpose, example question, best data shape, when to use, when NOT to use, tip, common mistakes, and crisp vector illustration drawn with `jsPDF` primitives
  - [x] Page 11 (when dataset loaded & option enabled): `"Recommended for your data"` table listing each column's detected type and top recommended chart from `recommendChartsForFields` (real dataset metrics only)
  - [x] Final Page: Glossary (`measure`, `dimension`, `bin`, `quartile`, `median`, `outlier`, `correlation`, `causation`)
  - [x] A4 portrait, 20mm margins, brand header, page number footer, `>= 11pt` body text, high contrast (`>= 4.5:1`), no clipped tables, filename `data-analytix-chart-guide-YYYY-MM-DD.pdf`

## 3. Whole-Application View & Control Verification
- [x] **Landing Page**: Hero section, pure-CSS 3D hero (`heroScene3D` flag), CTA buttons, navigation links
- [x] **Login / Auth**: Split-screen modal/view, email & password inputs, Google sign-in button, `"Try with sample data"` guest bypass, logout
- [x] **Upload & Ingestion (`UploadIngestionView`)**:
  - [x] CSV, XLSX, JSON file parsing
  - [x] Drag-and-drop dropzone
  - [x] Curated sample datasets (`DEMO_DATASETS`)
  - [x] Bad/corrupted file handling (error toast, no crash)
  - [x] Large file (10,000+ rows) ingestion & profiling
- [x] **Data Preview (`DataPreviewView`)**: Sortable columns, search filter, pagination, column role badges, zebra rows
- [x] **Quality Auditor (`DataQualityView`)**: Overall quality score, null/duplicate/outlier breakdown, column health table
- [x] **Cleaning Lab (`DataCleaningLabView`)**: Deduplicate, fill nulls, trim whitespace, standardize case, outlier clipping, and Undo/Reset pipeline
- [x] **Data Modeling (`DataModelingView`)**: Star/Snowflake schema detection, D3 relationship graph, table/column inspector
- [x] **Pipeline DAG (`DataEngineeringSuite`)**: Pipeline stage nodes, lineage inspection, execution telemetry
- [x] **SQL Workbench (`SQLLabView`)**: Schema sidebar, SQL query editor, Run query (AlaSQL), syntax error handling, CSV/JSON result export
- [x] **DAX Studio (`DAXLabView`)**: Measure generator, formula inspector, live evaluation against loaded dataset
- [x] **Python Sandbox (`PythonLabView`)**: Reproducible Pandas/Seaborn script generator, statistical summary execution, copy/download `.py`
- [x] **Dashboard Builder (`DashboardBuilderView`)**:
  - [x] Add custom visual modal, NL synthesis prompt, preset packs
  - [x] Chart Guide 2x4 panel (`chartGuide` flag), compatible column filtering, live preview
  - [x] Move (reorder), resize (span toggle), rename, override fields/types, save/load JSON, delete chart cards
  - [x] Per-chart PNG & CSV export
- [x] **Executive Dashboard (`ExecutiveDashboard`)**:
  - [x] KPI cards with sparklines & editor modal
  - [x] Global filter bar, interactive slicers, cross-filtering, drill-through modal
  - [x] Chronological trend chart, segment share donut, top-product bars, `"Why this chart"` tooltips (`chartGuide` flag)
  - [x] Tabs: Overview, Scatter, Heatmap, Multivariate, Pareto, What-If Simulator, Pivot Table, Distribution, Data Engineering
- [x] **Ask Data AI (`AskDataAIView`)**: Deterministic local analytical fallback when `GEMINI_API_KEY` is absent, server proxy when configured
- [x] **Reports (`ReportsView`)**: Editable report headings, executive narrative, print/PDF export
- [x] **Export Center (`ExportCenterView`)**: Complete 14-folder ZIP, Executive PDF Report, Chart Guide PDF, Excel `.xlsx` workbook, Power BI `Model.bim`, Power Query `.m`, `Theme.json`, Google Colab `.ipynb` modal
- [x] **Governance & Lineage (`DataDictionaryLineageView`)**: Column dictionary, PII classification, lineage trace
- [x] **Settings (`SettingsView`)**: All feature flag switches (`modernUI`, `darkModeDefault`, `selfHostedFonts`, `aiCardsV2`, `toastNotificationsV2`, `skeletonLoaders`, `sqlPagination`, `depthUI`, `heroScene3D`, `chartGuide`) and `"Reset to Classic"` button
- [x] **Pricing, Workspaces, Blog, How-to-Use, 404 NotFoundView**: Navigation, layout, and interactive controls
- [x] **Themes & Viewports**: Light and Dark themes (with smooth cross-fade transition), Mobile (`375px`) and Desktop (`1440px`) responsive layouts

## 4. Automated Test & Root-Cause Bug Fix Log
- [x] **Bug Fix 1 (`TS2688` Vite Client Type Definition)**: Added `src/vite-env.d.ts` with `/// <reference types="vite/client" />` and cleaned `tsconfig.json` so `npx tsc --noEmit` exits 0 with zero warnings.
- [x] **Bug Fix 2 (Null Coercion in Numeric Aggregations)**: Replaced `Number(r[field])` (which coerces `null` and `''` to `0` in JavaScript) with `parseNumericValue(r[field])` across all 8 chart builders so missing values are excluded from averages, quartiles, and histograms.
- [x] **Bug Fix 3 (All-Equal & Single-Row SVG Coordinate Division by Zero)**: Guarded span denominators (`max - min === 0`) across `computeHistogramBins`, `computeLineSeriesData`, `computeScatterPlotData`, `computeHeatmapMatrixData`, and `computeBoxplotSummary`.
- [x] **Bug Fix 4 (Cross-Filtering on Dashboard Builder Canvas)**: Connected `filteredRows` from `usePlatform()` (`activeRows = filteredRows ?? cleanRows`) and mounted `<GlobalFilterBar />` and `<InteractiveSlicersBar />` above the Dashboard Builder canvas.
- [x] **Bug Fix 5 (Playwright Headless Shell Resolution)**: Added automatic fallback to pre-installed `/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell` in `playwright.config.ts` and `scripts/screenshot-runner.mjs`.

