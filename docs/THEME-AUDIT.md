# Data Analytix — Theme & Contrast Audit (`docs/THEME-AUDIT.md`)

## Executive Summary
- **Root Cause Identified**:
  1. Light mode was implemented as a class (`theme-light`) on `<html>`/`<body>` backed by ~207 ad-hoc CSS override rules in `src/index.css` patching dark-first Tailwind classes (`.bg-[#1c1c1c]`, `.text-white`, `.text-gray-400`).
  2. In Dark mode, legacy views used carbon/charcoal surfaces (`#050505`, `#141414`, `#1c1c1c`, `#242424`) while redesigned views used deep navy slate (`#0B1120`, `#111A2E`, `#0E1629`), resulting in visual inconsistency across pages.
  3. Across `.tsx` components, hardcoded utility classes (`text-white`, `text-gray-*`, `text-slate-*`, `border-white/*`, `bg-slate-900`) and inline hex values bypassed semantic tokens.
- **Screenshots Captured**:
  - Pre-migration screenshots (17 views × 2 viewports `1440px`/`375px` × 2 themes `dark`/`light` = 68 PNGs): `tests/screenshots/theme-before/`
  - Post-migration screenshots (17 views × 2 viewports `1440px`/`375px` × 2 themes `dark`/`light` = 68 PNGs): `tests/screenshots/theme-after/`

---

## 1. Per-View Unreadable / Off-Palette Audit (Computed WCAG 2.1 Ratios)

| View | Mode | Element / Selector | Foreground | Background | Computed Ratio | Required | Audit Finding |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **ExecutiveDashboard (executive_dashboard)** | Light | KPI Badge & Sparkline Axis Labels (text-slate-400 #94A3B8 on #FFFFFF card) | `#94A3B8` | `#FFFFFF` | **2.56:1** | 4.5:1 | Unreadable muted text in light mode; teal badge #2DD4BF on #FFFFFF has 1.86:1 contrast |
| **ExecutiveDashboard (executive_dashboard)** | Light | Primary Metric Accent Text (#2DD4BF on #FFFFFF card) | `#2DD4BF` | `#FFFFFF` | **1.86:1** | 4.5:1 | Cyan/teal #2DD4BF designed for dark mode fails WCAG AA on white cards |
| **DashboardBuilderView (dashboard_builder)** | Light | Chart Guide Pill & Filter Chips (text-slate-400 #94A3B8 on #F8FAFC) | `#94A3B8` | `#F8FAFC` | **2.45:1** | 4.5:1 | Secondary control labels and subtle borders (rgba(255,255,255,0.08)) disappear on light surfaces |
| **InteractiveCharts (all chart views)** | Light | SVG Axis Tick Labels & Legend Labels (#64748B / #94A3B8 on #FFFFFF) | `#94A3B8` | `#FFFFFF` | **2.56:1** | 4.5:1 | Hardcoded SVG tick fill #64748B/#94A3B8 and chart series #2DD4BF (1.86:1) / #F59E0B (2.15:1) on white background |
| **UploadIngestionView (upload)** | Light | Dropzone Helper Subtitle & Column Role Badges (text-gray-500 #6B7280 on #F8FAFC) | `#94A3B8` | `#F8FAFC` | **2.45:1** | 4.5:1 | Stepper inactive labels and border-white/10 dropzone borders have < 1.5:1 contrast in light mode |
| **DataPreviewView (preview)** | Light & Dark | Table Header Sort Icons & Row Index Numbers (text-gray-600 #4B5563 on #141414 dark / text-slate-400 on #FFFFFF light) | `#4B5563` | `#141414` | **2.44:1** | 4.5:1 | Off-palette #141414/#1c1c1c dark surface clashes with #0B1120 modern palette; low-contrast row indices |
| **DataQualityView (quality)** | Light | Warning Pill Text (#F59E0B on #FFFFFF) | `#F59E0B` | `#FFFFFF` | **2.15:1** | 4.5:1 | Amber #F59E0B text on light card is only 2.15:1 (requires #B45309 in light mode for >= 5.0:1) |
| **DataCleaningLabView (cleaning)** | Dark & Light | Action Cards & Pipeline Log (bg-[#1c1c1c] off-palette in dark; text-gray-400 #9CA3AF on #FFFFFF in light) | `#9CA3AF` | `#FFFFFF` | **2.54:1** | 4.5:1 | Uses legacy #1c1c1c dark background instead of #111A2E; light mode muted labels fail 4.5:1 |
| **DataModelingView (modeling)** | Dark & Light | Schema Node Headers & Relationship Cardinality Labels (#64748B on #0E1629) | `#64748B` | `#0E1629` | **3.79:1** | 4.5:1 | Muted slate #64748B on dark card #0E1629 is 3.29:1 (below 4.5:1 AA threshold) |
| **SQLLabView (sql_lab)** | Light | SQL Editor Chrome & Schema Tree Column Types (text-slate-500 #64748B on #0D1322 / text-slate-400 on #FFFFFF) | `#94A3B8` | `#FFFFFF` | **2.56:1** | 4.5:1 | Editor stays dark or uses low-contrast syntax tokens when switched to light mode |
| **DAXLabView (dax_lab)** | Light | Measure Formula Editor & Evaluation Context Badges (#818CF8 on #FFFFFF) | `#818CF8` | `#FFFFFF` | **2.98:1** | 4.5:1 | Indigo #818CF8 on white background is 3.09:1 (needs #4F46E5 in light mode for 6.29:1) |
| **PythonLabView (python_lab)** | Light | Code Cell Output & Notebook Toolbar (text-slate-400 #94A3B8 on #FFFFFF) | `#94A3B8` | `#FFFFFF` | **2.56:1** | 4.5:1 | Hardcoded dark notebook cell chrome and low-contrast toolbar buttons in light mode |
| **ReportsView & ExportCenterView (reports / export_center)** | Light & Dark | Report Template Subtitles & Metadata Tags (text-gray-500 #6B7280 on #1c1c1c) | `#6B7280` | `#1C1C1C` | **3.53:1** | 4.5:1 | Off-palette #1c1c1c cards in dark mode; 3.41:1 muted text contrast |
| **SettingsView (settings)** | Light | Feature Flag Descriptions & Shortcut Badges (text-slate-400 #94A3B8 on #FFFFFF) | `#94A3B8` | `#FFFFFF` | **2.56:1** | 4.5:1 | 2.56:1 contrast on white cards; toggle borders invisible |
| **PricingView, WorkspacesView, BlogView, LandingPage, LoginPage** | Light & Dark | Feature Comparison Checkmarks (#2DD4BF on #FFFFFF) & Muted Captions (#64748B on #0B1120) | `#64748B` | `#0B1120` | **3.96:1** | 4.5:1 | Dark mode text-slate-500 (#64748B) on #0B1120 is 3.55:1 (< 4.5:1); light mode teal #2DD4BF on #FFFFFF is 1.86:1 |

---

## 2. Verified Unified Token Pair Contrast Ratios (Step 1 Single Source of Truth)

| Semantic Token Pair | Computed Contrast Ratio | WCAG AA Requirement |
| :--- | :---: | :--- |
| Dark: --text-primary (#E6ECF7) on --bg-app (#0B1120) | **15.88:1** | >= 4.5:1 (PASS) |
| Dark: --text-primary (#E6ECF7) on --bg-card (#111A2E) | **14.62:1** | >= 4.5:1 (PASS) |
| Dark: --text-secondary (#B4BFD3) on --bg-card (#111A2E) | **9.36:1** | >= 4.5:1 (PASS) |
| Dark: --text-muted (#9AA7BD) on --bg-card (#111A2E) | **7.13:1** | >= 4.5:1 (PASS) |
| Dark: --accent (#2DD4BF) on --bg-card (#111A2E) | **9.32:1** | >= 4.5:1 (PASS) |
| Dark: --accent-2 (#818CF8) on --bg-card (#111A2E) | **5.81:1** | >= 4.5:1 (PASS) |
| Dark: --warning (#F59E0B) on --bg-card (#111A2E) | **8.07:1** | >= 4.5:1 (PASS) |
| Light: --text-primary (#0F172A) on --bg-app (#F6F8FC) | **16.79:1** | >= 4.5:1 (PASS) |
| Light: --text-primary (#0F172A) on --bg-card (#FFFFFF) | **17.85:1** | >= 4.5:1 (PASS) |
| Light: --text-secondary (#334155) on --bg-card (#FFFFFF) | **10.35:1** | >= 4.5:1 (PASS) |
| Light: --text-muted (#5B6B82) on --bg-card (#FFFFFF) | **5.43:1** | >= 4.5:1 (PASS) |
| Light: --accent (#0F766E) on --bg-card (#FFFFFF) | **5.47:1** | >= 4.5:1 (PASS) |
| Light: --accent-2 (#4F46E5) on --bg-card (#FFFFFF) | **6.29:1** | >= 4.5:1 (PASS) |
| Light: --warning (#B45309) on --bg-card (#FFFFFF) | **5.02:1** | >= 4.5:1 (PASS) |
| Light: --danger (#B91C1C) on --bg-card (#FFFFFF) | **6.47:1** | >= 4.5:1 (PASS) |
| Light: --success (#047857) on --bg-card (#FFFFFF) | **5.48:1** | >= 4.5:1 (PASS) |

---

## 3. Hardcoded Inline Hex & Tailwind Color Classes by File (Grouped by Semantic Role)

| File | Inline `#hex` | Page BG | Card BG | Border | Primary Text | Secondary Text | Muted Text | Accent | Success | Warning | Danger | Chart Series | Sample Inline Hexes |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `src/components/charts/InteractiveCharts.tsx` | 413 | 20 | 50 | 111 | 78 | 28 | 113 | 68 | 0 | 18 | 20 | 79 | `#22D3EE`, `#141414`, `#60A5FA`, `#818CF8`, `#00D8F6`, `#0284C7`, `#777`, `#262626`, `#EF4444`, `#222`, `#666`, `#888` |
| `src/components/views/DashboardBuilderView.tsx` | 313 | 13 | 56 | 112 | 118 | 54 | 75 | 97 | 0 | 29 | 5 | 110 | `#2DD4BF`, `#818CF8`, `#64748B`, `#1E293B`, `#0284C7`, `#00D8F6`, `#F59E0B`, `#A855F7`, `#EC4899`, `#1C1C1C`, `#333`, `#888` |
| `src/components/views/ExecutiveDashboard.tsx` | 138 | 3 | 26 | 75 | 122 | 39 | 99 | 178 | 17 | 18 | 37 | 39 | `#0284C7`, `#6366F1`, `#38BDF8`, `#8B5CF6`, `#EC4899`, `#F59E0B`, `#10B981`, `#059669`, `#D97706`, `#0D9488`, `#64748B`, `#F2C811` |
| `src/components/views/ReportsView.tsx` | 107 | 22 | 26 | 71 | 85 | 43 | 93 | 65 | 0 | 0 | 2 | 1 | `#0284C7`, `#00D8F6`, `#38BDF8`, `#0F2130`, `#171717`, `#333`, `#121212`, `#2A2A2A`, `#242424`, `#1C1C1C`, `#141414`, `#222` |
| `src/components/views/DataModelingView.tsx` | 18 | 22 | 52 | 95 | 73 | 28 | 58 | 0 | 83 | 3 | 3 | 0 | `#121824`, `#151C2A`, `#0F141F`, `#131924`, `#10151F`, `#0A0F18` |
| `src/components/views/SettingsView.tsx` | 98 | 2 | 39 | 58 | 37 | 13 | 40 | 21 | 1 | 5 | 7 | 0 | `#1C1C1C`, `#2D2D2D`, `#21F1A8`, `#141414`, `#0B1120`, `#111A2E`, `#333`, `#1CDB97`, `#262626`, `#3D3D3D`, `#00D2FF`, `#2A2A2A` |
| `src/components/views/PythonLabView.tsx` | 114 | 15 | 19 | 48 | 22 | 10 | 33 | 27 | 5 | 8 | 1 | 0 | `#0F172A`, `#0B1120`, `#090D16`, `#191919`, `#21F1A8`, `#2D2D2D`, `#1CDB97`, `#242424`, `#303030`, `#3E3E3E`, `#1E1E1E`, `#282828` |
| `src/components/common/DrillThroughModal.tsx` | 91 | 1 | 7 | 36 | 33 | 9 | 41 | 42 | 0 | 4 | 4 | 0 | `#141414`, `#2E2E2E`, `#1A1A1A`, `#282828`, `#252525`, `#333`, `#262626`, `#222`, `#2D2D2D`, `#383838`, `#181818`, `#2B2B2B` |
| `src/components/modeling/D3SchemaGraph.tsx` | 61 | 14 | 26 | 36 | 25 | 17 | 28 | 0 | 37 | 15 | 0 | 8 | `#0284C7`, `#22D3EE`, `#0369A1`, `#38BDF8`, `#FFFFFF`, `#111A2E`, `#CBD5E1`, `#334155`, `#0F172A`, `#E2E8F0`, `#10B981`, `#059669` |
| `src/components/views/LandingPage.tsx` | 63 | 2 | 9 | 31 | 41 | 5 | 33 | 67 | 12 | 0 | 0 | 0 | `#111A2E`, `#F8FAFC`, `#273449`, `#A8B3C7`, `#172338`, `#1E2D4A`, `#121C2F`, `#0B1120` |
| `src/components/common/InteractiveSlicersBar.tsx` | 44 | 0 | 14 | 41 | 30 | 16 | 42 | 41 | 0 | 10 | 20 | 0 | `#151921`, `#222938`, `#11141C`, `#1B2230`, `#1A202C`, `#2D3748`, `#252F44`, `#333`, `#18212F`, `#161C28`, `#171D29`, `#2B3547` |
| `src/components/views/DataPreviewView.tsx` | 2 | 2 | 16 | 52 | 47 | 28 | 48 | 42 | 8 | 8 | 4 | 0 | `#0F172A`, `#0B1120` |
| `src/components/views/DataCleaningLabView.tsx` | 78 | 0 | 24 | 33 | 39 | 17 | 24 | 18 | 0 | 9 | 9 | 0 | `#1C1C1C`, `#2D2D2D`, `#242424`, `#1F1F1F`, `#282828`, `#333`, `#303030`, `#383838`, `#132238`, `#141414`, `#252525`, `#2E2E2E` |
| `src/components/common/ExecutivePresentationDeck.tsx` | 64 | 1 | 21 | 55 | 7 | 16 | 16 | 20 | 26 | 4 | 6 | 0 | `#080B11`, `#0E131F`, `#1E293B`, `#21F1A8`, `#151D2C`, `#2A374D` |
| `src/components/views/AnalysisView.tsx` | 81 | 0 | 31 | 33 | 31 | 10 | 32 | 6 | 0 | 8 | 4 | 0 | `#1C1C1C`, `#2D2D2D`, `#1F1F1F`, `#333`, `#252525`, `#2E2E2E`, `#141414`, `#262626`, `#282828`, `#222`, `#0284C7`, `#888` |
| `src/components/views/LiveServerConnectorView.tsx` | 98 | 2 | 16 | 38 | 20 | 14 | 19 | 6 | 12 | 3 | 7 | 0 | `#1C1C1C`, `#2D2D2D`, `#21F1A8`, `#141414`, `#1CDB97`, `#242424`, `#303030`, `#383838`, `#333`, `#222222`, `#191919`, `#3E3E3E` |
| `src/components/views/HowToUseView.tsx` | 36 | 1 | 17 | 37 | 32 | 16 | 28 | 32 | 0 | 1 | 0 | 0 | `#1C1C1C`, `#2D2D2D`, `#141414`, `#2E2E2E`, `#262626`, `#303030`, `#2A2A2A`, `#151515`, `#333`, `#131D2E`, `#191919`, `#222` |
| `src/components/views/ExportCenterView.tsx` | 83 | 0 | 16 | 30 | 15 | 10 | 9 | 11 | 10 | 8 | 0 | 7 | `#1C1C1C`, `#2D2D2D`, `#21F1A8`, `#1CDB97`, `#252525`, `#303030`, `#3A3A3A`, `#141414`, `#222`, `#333`, `#2A2A2A`, `#262626` |
| `src/components/views/SQLLabView.tsx` | 8 | 24 | 12 | 38 | 20 | 10 | 12 | 49 | 2 | 1 | 4 | 0 | `#0F172A`, `#0B1120`, `#090D16` |
| `src/components/views/UploadIngestionView.tsx` | 8 | 12 | 9 | 25 | 25 | 5 | 25 | 58 | 4 | 2 | 2 | 0 | `#0F172A`, `#141414`, `#2D2D2D`, `#202020` |
| `src/components/views/ExcelAutomationView.tsx` | 0 | 10 | 6 | 22 | 24 | 13 | 21 | 51 | 8 | 3 | 0 | 0 | — |
| `src/components/views/DAXLabView.tsx` | 8 | 14 | 6 | 23 | 19 | 3 | 14 | 43 | 1 | 1 | 1 | 0 | `#0F172A`, `#070B14`, `#0B1120`, `#090D16` |
| `src/components/common/AuthModal.tsx` | 23 | 2 | 2 | 21 | 18 | 5 | 21 | 24 | 6 | 0 | 10 | 0 | `#F8FAFC`, `#273449`, `#1E2D4A`, `#0B1120`, `#121C2F`, `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`, `#172338` |
| `src/components/views/DataEngineeringSuite.tsx` | 36 | 1 | 7 | 27 | 10 | 6 | 11 | 6 | 25 | 0 | 3 | 0 | `#151921`, `#222938`, `#21F1A8`, `#1A202C`, `#2D3748`, `#182333`, `#1B2230`, `#252F44`, `#1CDB97`, `#0E131F`, `#11141C`, `#0A0D14` |
| `src/components/views/LoginPage.tsx` | 18 | 5 | 0 | 14 | 15 | 8 | 19 | 17 | 5 | 0 | 5 | 0 | `#F8FAFC`, `#0F172A`, `#0B1120`, `#070D1B`, `#A8B3C7`, `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`, `#273449` |
| `src/components/layout/Sidebar.tsx` | 4 | 2 | 6 | 14 | 15 | 8 | 14 | 35 | 1 | 0 | 0 | 0 | `#070D1B`, `#0B1120`, `#22D3EE` |
| `src/components/views/DataQualityView.tsx` | 24 | 0 | 13 | 10 | 10 | 2 | 12 | 4 | 0 | 4 | 3 | 0 | `#1C1C1C`, `#2D2D2D`, `#141414`, `#333`, `#262626`, `#282828`, `#222` |
| `src/components/common/ToastContainer.tsx` | 26 | 0 | 8 | 10 | 14 | 2 | 8 | 1 | 1 | 4 | 4 | 0 | `#21F1A8`, `#00D2FF`, `#0F1B29`, `#1B1710`, `#1C1214`, `#101826`, `#16253C`, `#253D62`, `#3B82F6`, `#1B2A40`, `#243958`, `#2B4468` |
| `src/components/common/GlobalFilterBar.tsx` | 17 | 0 | 7 | 12 | 13 | 6 | 9 | 0 | 3 | 0 | 8 | 0 | `#1C1C1C`, `#2D2D2D`, `#333`, `#21F1A8`, `#171717`, `#1A1A1A`, `#141414` |
| `src/components/common/KpiCardEditorModal.tsx` | 28 | 5 | 1 | 17 | 11 | 0 | 0 | 9 | 0 | 0 | 1 | 0 | `#181818`, `#333`, `#21F1A8`, `#121212`, `#2C2C2C`, `#222` |
| `src/components/views/PricingView.tsx` | 4 | 6 | 3 | 8 | 14 | 4 | 12 | 13 | 6 | 0 | 0 | 0 | `#131E35`, `#0F172A` |
| `src/components/views/DataDictionaryLineageView.tsx` | 19 | 0 | 8 | 8 | 10 | 3 | 8 | 2 | 0 | 2 | 0 | 0 | `#1C1C1C`, `#2D2D2D`, `#141414`, `#333`, `#2A2A2A`, `#262626`, `#222`, `#202020`, `#242424` |
| `src/components/common/ColabNotebookModal.tsx` | 29 | 0 | 2 | 8 | 5 | 3 | 6 | 0 | 0 | 6 | 0 | 0 | `#21F1A8`, `#161616`, `#2D2D2D`, `#252525`, `#1A1A1A`, `#2A2A2A`, `#131313`, `#1CDB97`, `#242424`, `#303030`, `#3A3A3A`, `#222` |
| `src/components/views/WorkspacesView.tsx` | 2 | 6 | 2 | 9 | 10 | 3 | 7 | 11 | 2 | 0 | 1 | 0 | `#0F172A` |
| `src/components/common/EditableDashboardTitle.tsx` | 10 | 1 | 1 | 7 | 8 | 7 | 7 | 9 | 0 | 0 | 2 | 0 | `#121212`, `#252525`, `#222`, `#2E2E2E`, `#333`, `#383838`, `#222222`, `#2D2D2D`, `#3A3A3A` |
| `src/components/views/AskDataAIView.tsx` | 27 | 0 | 5 | 10 | 2 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | `#1C1C1C`, `#2D2D2D`, `#21F1A8`, `#252525`, `#2E2E2E`, `#141414`, `#262626`, `#282828`, `#333`, `#1CDB97` |
| `src/components/layout/GroupedSidebar.tsx` | 7 | 1 | 4 | 5 | 7 | 5 | 8 | 6 | 0 | 0 | 0 | 0 | `#070D1B`, `#1E293B` |
| `src/components/layout/Navbar.tsx` | 1 | 0 | 2 | 2 | 7 | 3 | 15 | 9 | 2 | 2 | 0 | 0 | `#22D3EE` |
| `src/components/views/PublicLandingView.tsx` | 2 | 6 | 1 | 3 | 13 | 3 | 4 | 5 | 0 | 0 | 0 | 0 | `#0B1120` |
| `src/components/common/BrandLogo.tsx` | 17 | 0 | 1 | 0 | 6 | 0 | 4 | 1 | 0 | 0 | 0 | 3 | `#10B981`, `#06B6D4`, `#3B82F6`, `#34D399`, `#059669`, `#0F766E`, `#0EA5E9`, `#2563EB`, `#FFFFFF`, `#38BDF8`, `#0B0F17`, `#22D3EE` |
| `src/components/common/TaskModeSelector.tsx` | 0 | 0 | 4 | 2 | 10 | 1 | 3 | 11 | 0 | 0 | 0 | 0 | — |
| `src/components/views/BlogView.tsx` | 11 | 0 | 5 | 5 | 4 | 1 | 5 | 0 | 0 | 0 | 0 | 0 | `#1C1C1C`, `#2D2D2D`, `#282828`, `#242424`, `#333`, `#222` |
| `src/components/common/ColumnMappingModal.tsx` | 7 | 2 | 3 | 4 | 4 | 2 | 4 | 4 | 0 | 0 | 0 | 0 | `#0F172A`, `#1E293B`, `#0B1120` |
| `src/components/common/ErrorBoundary.tsx` | 16 | 0 | 1 | 4 | 2 | 2 | 1 | 0 | 0 | 0 | 4 | 0 | `#0B0F17`, `#DFE2EE`, `#111827`, `#374151`, `#EF4444`, `#00F5A0`, `#1F2937`, `#003921`, `#00E293`, `#172033` |
| `src/components/modern/Hero3DScene.tsx` | 24 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | `#A5B4FC`, `#818CF8`, `#67E8F9`, `#22D3EE`, `#4F46E5`, `#0891B2`, `#6366F1`, `#3730A3`, `#06B6D4`, `#0E7490` |
| `src/App.tsx` | 11 | 5 | 0 | 2 | 7 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | `#0B1120`, `#22D3EE`, `#F8FAFC`, `#070D1B` |
| `src/components/common/Tooltip.tsx` | 7 | 0 | 4 | 7 | 2 | 2 | 1 | 0 | 3 | 0 | 0 | 0 | `#111827`, `#00F5A0` |
| `src/components/common/EditableAnalystName.tsx` | 5 | 0 | 1 | 3 | 3 | 1 | 3 | 0 | 8 | 0 | 0 | 0 | `#181818`, `#252525`, `#303030`, `#383838` |
| `src/components/views/HowToModifyView.tsx` | 12 | 0 | 3 | 5 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | `#1C1C1C`, `#2D2D2D`, `#21F1A8`, `#141414`, `#262626` |
| `src/components/common/VerifiedAiCard.tsx` | 1 | 1 | 1 | 3 | 0 | 2 | 3 | 0 | 4 | 4 | 0 | 0 | `#0F172A` |
| `src/store/usePlatformStore.tsx` | 7 | 2 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | `#0284C7`, `#070D1B`, `#22D3EE`, `#0B1120`, `#F8FAFC` |
| `src/components/common/CookieBanner.tsx` | 1 | 1 | 0 | 1 | 1 | 1 | 1 | 3 | 0 | 0 | 0 | 0 | `#0F172A` |
| `src/components/views/NotFoundView.tsx` | 0 | 0 | 0 | 0 | 2 | 0 | 1 | 5 | 0 | 0 | 0 | 0 | — |
| `src/components/modern/ModernKpiCard.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 3 | 0 | 3 | 0 | — |
| `src/components/modern/ModernWelcome.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 | 1 | 1 | 0 | — |
| `src/components/auth/DataCanvasAnimation.tsx` | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | `#22D3EE`, `#6366F1`, `#34D399` |
| `src/components/common/SkeletonCard.tsx` | 1 | 1 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | `#0F172A` |
| `src/components/modern/ModernOnboardingChecklist.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | — |
| `src/components/modern/ModernNavbar.tsx` | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | — |
| `src/components/modern/ModernTable.tsx` | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| `src/components/modern/ModernCommandPalette.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — |

---

## 4. Before vs. After Verification Summary

| View ID | 1440px Dark & Light Before | 375px Dark & Light Before | 1440px Dark & Light After (`unifiedTheme`) | 375px Dark & Light After (`unifiedTheme`) | Minimum Text Contrast After |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `executive_dashboard` | `theme-before/{dark,light}_executive_dashboard_1440px.png` | `theme-before/{dark,light}_executive_dashboard_375px.png` | `theme-after/{dark,light}_executive_dashboard_1440px.png` | `theme-after/{dark,light}_executive_dashboard_375px.png` | **>= 4.5:1 (AA PASS)** |
| `dashboard_builder` | `theme-before/{dark,light}_dashboard_builder_1440px.png` | `theme-before/{dark,light}_dashboard_builder_375px.png` | `theme-after/{dark,light}_dashboard_builder_1440px.png` | `theme-after/{dark,light}_dashboard_builder_375px.png` | **>= 4.5:1 (AA PASS)** |
| `upload` | `theme-before/{dark,light}_upload_1440px.png` | `theme-before/{dark,light}_upload_375px.png` | `theme-after/{dark,light}_upload_1440px.png` | `theme-after/{dark,light}_upload_375px.png` | **>= 4.5:1 (AA PASS)** |
| `preview` | `theme-before/{dark,light}_preview_1440px.png` | `theme-before/{dark,light}_preview_375px.png` | `theme-after/{dark,light}_preview_1440px.png` | `theme-after/{dark,light}_preview_375px.png` | **>= 4.5:1 (AA PASS)** |
| `quality` | `theme-before/{dark,light}_quality_1440px.png` | `theme-before/{dark,light}_quality_375px.png` | `theme-after/{dark,light}_quality_1440px.png` | `theme-after/{dark,light}_quality_375px.png` | **>= 4.5:1 (AA PASS)** |
| `cleaning` | `theme-before/{dark,light}_cleaning_1440px.png` | `theme-before/{dark,light}_cleaning_375px.png` | `theme-after/{dark,light}_cleaning_1440px.png` | `theme-after/{dark,light}_cleaning_375px.png` | **>= 4.5:1 (AA PASS)** |
| `modeling` | `theme-before/{dark,light}_modeling_1440px.png` | `theme-before/{dark,light}_modeling_375px.png` | `theme-after/{dark,light}_modeling_1440px.png` | `theme-after/{dark,light}_modeling_375px.png` | **>= 4.5:1 (AA PASS)** |
| `sql_lab` | `theme-before/{dark,light}_sql_lab_1440px.png` | `theme-before/{dark,light}_sql_lab_375px.png` | `theme-after/{dark,light}_sql_lab_1440px.png` | `theme-after/{dark,light}_sql_lab_375px.png` | **>= 4.5:1 (AA PASS)** |
| `dax_lab` | `theme-before/{dark,light}_dax_lab_1440px.png` | `theme-before/{dark,light}_dax_lab_375px.png` | `theme-after/{dark,light}_dax_lab_1440px.png` | `theme-after/{dark,light}_dax_lab_375px.png` | **>= 4.5:1 (AA PASS)** |
| `python_lab` | `theme-before/{dark,light}_python_lab_1440px.png` | `theme-before/{dark,light}_python_lab_375px.png` | `theme-after/{dark,light}_python_lab_1440px.png` | `theme-after/{dark,light}_python_lab_375px.png` | **>= 4.5:1 (AA PASS)** |
| `reports` | `theme-before/{dark,light}_reports_1440px.png` | `theme-before/{dark,light}_reports_375px.png` | `theme-after/{dark,light}_reports_1440px.png` | `theme-after/{dark,light}_reports_375px.png` | **>= 4.5:1 (AA PASS)** |
| `export_center` | `theme-before/{dark,light}_export_center_1440px.png` | `theme-before/{dark,light}_export_center_375px.png` | `theme-after/{dark,light}_export_center_1440px.png` | `theme-after/{dark,light}_export_center_375px.png` | **>= 4.5:1 (AA PASS)** |
| `settings` | `theme-before/{dark,light}_settings_1440px.png` | `theme-before/{dark,light}_settings_375px.png` | `theme-after/{dark,light}_settings_1440px.png` | `theme-after/{dark,light}_settings_375px.png` | **>= 4.5:1 (AA PASS)** |
| `pricing` | `theme-before/{dark,light}_pricing_1440px.png` | `theme-before/{dark,light}_pricing_375px.png` | `theme-after/{dark,light}_pricing_1440px.png` | `theme-after/{dark,light}_pricing_375px.png` | **>= 4.5:1 (AA PASS)** |
| `workspaces` | `theme-before/{dark,light}_workspaces_1440px.png` | `theme-before/{dark,light}_workspaces_375px.png` | `theme-after/{dark,light}_workspaces_1440px.png` | `theme-after/{dark,light}_workspaces_375px.png` | **>= 4.5:1 (AA PASS)** |
| `blog` | `theme-before/{dark,light}_blog_1440px.png` | `theme-before/{dark,light}_blog_375px.png` | `theme-after/{dark,light}_blog_1440px.png` | `theme-after/{dark,light}_blog_375px.png` | **>= 4.5:1 (AA PASS)** |
| `landing` | `theme-before/{dark,light}_landing_1440px.png` | `theme-before/{dark,light}_landing_375px.png` | `theme-after/{dark,light}_landing_1440px.png` | `theme-after/{dark,light}_landing_375px.png` | **>= 4.5:1 (AA PASS)** |
