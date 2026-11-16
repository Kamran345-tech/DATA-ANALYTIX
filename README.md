# Data Analytix - Autonomous Enterprise BI & Analytics Platform

Data Analytix is an autonomous, in-browser business intelligence and data engineering workstation built with **React 19**, **Vite 8**, **Tailwind CSS 4**, **Express (server.ts)**, **Firebase Auth & Firestore**, **AlaSQL**, and **ExcelJS / SheetJS / PapaParse**.

---

## 🏛️ Core Architectural Principle: ADDITIVE ONLY, CLASSIC PRESERVED

All enhancements are built strictly as **additive alternatives** alongside the proven Classic architecture.
- **Default State for New Visitors**: The four visual & chart guide flags (`depthUI`, `heroScene3D`, `chartGuide`, `unifiedTheme`) default to `true` in `src/config/features.ts` (`DEFAULT_FEATURE_FLAGS`) so new visitors immediately experience the unified WCAG AA theme, 20px depth cards, 3D isometric hero scene, and 8-chart selection guide. The remaining 15 optional flags default to `false`.
- **Switch to Classic Anytime**: Visitors can click **"Switch to Classic"** in the top navigation bar or in **Settings → Experiments & Alternatives** to turn all flags off (`CLASSIC_FEATURE_FLAGS`). The user's choice is persisted in `localStorage['dataanalytix_features']` and respected across reloads.
- **Zero Regressions**: No existing routes, response shapes, classic calculation heuristics, or brand identifiers have been altered or broken (`tests/classic-regression.test.ts` remains 100% green).

---

## 🚀 Dual Deployment (AI Studio & Vercel)

The application supports simultaneous execution on two deployment targets with identical behavior:

### 1. Google AI Studio / Cloud Run Dev Container
- Runs via `server.ts` on port 3000 (`npm run dev`).
- Express handles `/api/*` endpoints and mounts Vite in middleware mode.

### 2. Vercel Serverless Functions
- Configured via `vercel.json` with SPA rewrites that preserve `/api/*`.
- Handlers in `/api/` (`health.ts`, `ai/interpret.ts`, `live-data/test-connection.ts`, `live-data/fetch.ts`) import the shared, standalone logic from `/server-lib/`.
- Zero duplicated code between Express and Vercel functions.

### Environment Variables & Live Feature Flag Status (Local & Vercel)
| Variable | Required In | Value in `.env.example` | Code Default (`src/config/features.ts`) | How to Turn Off | Description |
|---|---|---|---|---|---|
| `GEMINI_API_KEY` | Optional | `"MY_GEMINI_API_KEY"` | unset | Omit or leave empty | API key for Gemini 2.5 Flash model grounding |
| `APP_URL` | AI Studio | `"MY_APP_URL"` | unset | Omit | Host application base URL |
| `FIREBASE_PROJECT_ID` | Vercel / Local | `"mercurial-amphora-3lxdt"` | `"mercurial-amphora-3lxdt"` | Set custom ID | Firebase project ID |
| `FIREBASE_DATABASE_ID` | Vercel / Local | `"ai-studio-nexusbiautonomou-..."` | `"ai-studio-nexusbiautonomou-..."` | Set custom DB | Firestore database instance name |
| `REQUIRE_AUTH_FOR_AI` | Optional | `"false"` | `"false"` | `REQUIRE_AUTH_FOR_AI=false` | When `true`, enforces Firebase bearer tokens on `/api/ai/interpret` |
| `VITE_FEATURE_DEPTH_UI` | Vercel / Local | `"true"` | `true` | `VITE_FEATURE_DEPTH_UI=false` | Enables 20px depth cards, top highlight, and hover lift |
| `VITE_FEATURE_HERO_SCENE_3D` | Vercel / Local | `"true"` | `true` | `VITE_FEATURE_HERO_SCENE_3D=false` | Enables the pure-CSS 3D 5-pillar hero scene |
| `VITE_FEATURE_CHART_GUIDE` | Vercel / Local | `"true"` | `true` | `VITE_FEATURE_CHART_GUIDE=false` | Enables the 8-chart selection guide and PDF download |
| `VITE_FEATURE_UNIFIED_THEME` | Vercel / Local | `"true"` | `true` | `VITE_FEATURE_UNIFIED_THEME=false` | Enables the WCAG AA unified semantic theme token system |
| `VITE_FEATURE_ANALYTICS_PACKS` | Vercel / Local | `"true"` | `true` | `VITE_FEATURE_ANALYTICS_PACKS=false` | Enables the 14 data-driven domain Analytics Packs, KPIs, lenses & reports |

#### Turning Flags Off or Customizing on Vercel (`https://data-analytix-flax.vercel.app/`)
- **Default New Visitor Experience**: Because `depthUI`, `heroScene3D`, `chartGuide`, `unifiedTheme`, and `analyticsPacks` default to `true` in `src/config/features.ts`, new visitors on Vercel see the unified theme, 3D hero scene, depth UI, 8-chart guide, and 14 Analytics Packs out of the box without requiring extra environment variables.
- **Turning Individual Flags Off via Environment Variables**: Set any `VITE_FEATURE_<FLAG_NAME>=false` (or `0`) in `.env` or **Vercel Project Settings → Environment Variables** to disable that feature at build time:
```env
VITE_FEATURE_DEPTH_UI=false
VITE_FEATURE_HERO_SCENE_3D=false
VITE_FEATURE_CHART_GUIDE=false
VITE_FEATURE_UNIFIED_THEME=false
VITE_FEATURE_ANALYTICS_PACKS=false
```
- **Runtime Override & Persistence**: Any visitor can click **"Switch to Classic"** in the top navbar or toggle individual flags in **Settings → Experiments & Alternatives**. User preferences are saved to `localStorage['dataanalytix_features']`, which takes precedence over build-time defaults and displays a live session banner in Settings showing which flags are currently `ON`.

---

## 📦 Analytics Packs (14 Domain Configurations)

When `analyticsPacks` is enabled, Data Analytix provides 14 domain-specific analytics packs under `src/analytics/packs/`:
1. **Financial & FP&A** (`financial`) — Revenue, Gross/Operating/EBITDA/Net Margin, Current/Quick/D-to-E Ratios, ROE/ROA, FCF, Burn/Runway, Budget Variance, DSO/DPO, Break-Even.
2. **Sales & Pipeline** (`sales`) — Quota Attainment, Win Rate, Sales Velocity, Pipeline Coverage, Weighted Pipeline, Deal Cycle.
3. **Marketing & Growth** (`marketing`) — ROAS, CAC, LTV:CAC, CPL, CTR, Funnel CVR, Channel Attribution.
4. **Customer & Retention** (`customer`) — Logo/Net Revenue Churn, NRR, GRR, LTV, ARPU, NPS, CSAT, Cohort Retention, RFM.
5. **Product & SaaS** (`product`) — DAU/MAU Stickiness, Activation Rate, Feature Adoption, Time-to-Value, Retention D1/D7/D30.
6. **Web, App & E-Commerce** (`web`) — Sessions, Bounce Rate, Conversion Rate, AOV, Cart Abandonment, Revenue per Visitor.
7. **Operations & Supply Chain** (`operations`) — OTIF, Lead Time, Inventory Turnover, Stockout Rate, Fill Rate, Defect Rate, Cost/Unit.
8. **HR & People** (`hr`) — Headcount, Voluntary/Involuntary Attrition, Time-to-Hire, Cost-per-Hire, Offer Acceptance, Revenue/Employee, Compa-Ratio, Absenteeism.
9. **Risk, Fraud & Compliance** (`risk-fraud`) — Fraud Rate, False Positive Rate, Chargeback Rate, VaR, Loss Rate, High-Risk Exposure, SLA Breach.
10. **Healthcare & Clinical** (`healthcare`) — Bed Occupancy, ALOS, 30-Day Readmission, Wait Time, Cost/Encounter, No-Show Rate, Mortality Index.
11. **Retail & Store** (`retail`) — Same-Store Sales Growth, Sales/SqFt, GMROI, Basket Size, Units/Transaction, Shrinkage, Sell-Through.
12. **Manufacturing & Quality** (`manufacturing`) — OEE (Availability × Performance × Quality), First-Pass Yield, Scrap Rate, Cycle Time, MTBF, MTTR, Capacity Utilization.
13. **Banking & Insurance** (`banking-insurance`) — NIM, Cost-to-Income, NPL Ratio, Loss Ratio, Combined Ratio, Claims Frequency/Severity, Capital Adequacy.
14. **Education & Learning** (`education`) — Enrollment, Completion Rate, Dropout Rate, Pass Rate, Avg Score, Attendance, Student-to-Instructor Ratio, Placement Rate.

### How to Add a New Pack (15th Pack in 1 Config File)
Because the Analytics Packs architecture uses **one generic renderer** (`src/components/views/AnalyticsPacksView.tsx`) and **one declarative engine** (`src/analytics/engine.ts`), adding a 15th pack requires **only a new config file** (no hardcoded UI changes):
1. Create `src/analytics/packs/<my-pack>.ts` exporting an `AnalyticsPackConfig` object (`id`, `name`, `category`, `icon`, `description`, `detect`, `kpis`, `charts`, `lenses`, `reportSections`, `sampleDataset`).
2. Add the pack ID to `PackId` in `src/analytics/packs/types.ts` and register the config in `RAW_PACKS` inside `src/analytics/packs/registry.ts`.
3. Run `npm test` — the generic catalog grid, search/category filter, auto-detection engine, role mapper, KPI cards with `"i"` formula tooltips, 4 lenses, charts, and PDF/ZIP/Excel/CSV template exporters automatically include the new pack.

### Real-Data Hardening & KPI Formula Assumptions
Every KPI across all 14 packs defines `formulaText` (plain-English definition), `source` (standard mathematical formula), and explicit edge-case guards (divide-by-zero, negative values, all-null columns, and decimal-to-percent unit normalization):
- **Quick Ratio (`financial`)**: `(Current Assets − Inventory) / Current Liabilities`. If `inventory` is not mapped, Inventory is assumed to be `0` (Quick Ratio = Current Ratio).
- **ROE % (`financial`)**: `(Net Income / Shareholders' Equity) × 100`. Returns `Unavailable` when `Shareholders' Equity <= 0` to prevent false positive ROE when both Net Income and Equity are negative.
- **DSO & DPO (`financial`)**: Uses a `365-day` annualized convention (`(AR / Total Revenue) × 365` and `(AP / Total COGS) × 365`).
- **CLV (`customer`)**: Averages reported cohort `clv` values when mapped, ignoring null or non-positive records.
- **Stickiness DAU/MAU % (`product`)**: `(DAU / MAU) × 100`. Returns `Unavailable` if `DAU > MAU` (unit/aggregation mismatch) or `MAU <= 0`.
- **Inventory Turnover (`operations`)**: Computes `COGS / Average Inventory` when both `cogs` and `inventory_units` are mapped; otherwise averages reported `inventory_turnover`.
- **Attrition Rate % (`hr`)**: Computes `(Σ Leavers / Σ Headcount) × 100` when `leavers` and `headcount` are mapped; otherwise averages reported `attrition_pct`.
- **Bed Occupancy % (`healthcare`)**: Computes `(Occupied Beds / Total Beds) × 100` when bed counts are mapped; otherwise averages reported `bed_occupancy_pct` (auto-normalizing decimals like `0.84` → `84.0%`).
- **Sell-Through Rate % (`retail`)**: Computes `[Units Sold / (Units Sold + On-Hand Units)] × 100` when `on_hand_units` is mapped; otherwise averages reported `sell_through_pct`.
- **OEE % (`manufacturing`)**: Computes `Availability (%) × Performance (%) × Quality (%)` when component ratios are mapped; otherwise averages reported `oee_pct`.

---

## ⚙️ Experiments & Alternatives (Feature Flags)

All feature flags can be toggled through the **Settings -> "Experiments & Alternatives"** panel or pre-configured using environment variables.

| Feature Flag Key | Category | Classic Behavior (Default) | Additive Alternative |
|---|---|---|---|
| `unifiedBranding` | Core | Retains NexusBI & AcuityBI | Displays "Data Analytix" everywhere |
| `modernTheme` | UI | Standard Light/Dark theme | Deep Slate theme (`#0B1120`, `#111A2E`) |
| `groupedSidebar` | UI | Flat operational menu | 5-Stage Collapsible Workflow Sidebar |
| `enhancedEngine` | Engine | Heuristic v1 engine | V2 engine with DD/MM inference & audit trace |
| `columnMapping` | Engine | Automatic role assignment | Pre-flight interactive column role modal |
| `demoBadges` | Core | Subtle simulation text | Prominent yellow "[DEMO DATA]" badges |
| `verifiedAI` | Engine | Standard anti-hallucination | Validates cited numbers against context |
| `publicLanding` | UI | Direct login page gate | Unauthenticated public showcase at `/welcome` |
| `hashRouting` | UI | In-memory tab navigation | Browser back/forward URL hash synchronization |
| `pricing` | SaaS | Open community access | Free, Pro, and Team plan tiers with checkout |
| `workspaces` | SaaS | Single user scope | Multi-member team workspace & audit log |
| `workerParsing` | Engine | Main-thread parsing | Off-main-thread Web Worker CSV parsing |
| `xlsxSafe` | Security | Standard SheetJS | Hardened ExcelJS adapter with formula sanitization |
| `showAllErrors` | Security | Suppresses harmless noise | Strict error boundary routing mode |
| `selfHostedFonts` | UI | External Google Fonts | Self-hosted WOFF2 fonts (Space Grotesk, Inter, JetBrains Mono) |
| `depthUI` | UI | Standard card borders | 20px depth cards, top specular highlight, 4px hover lift |
| `heroScene3D` | UI | Classic hero layout | Pure-CSS 3D isometric 5-pillar hero scene |
| `chartGuide` | Engine | Standard chart recommendations | 8-chart decision guide, rules engine, and PDF guide |
| `unifiedTheme` | UI | Classic theme CSS rules | Single semantic token system across Dark & Light |
| `analyticsPacks` | Engine | Standard single-domain dashboard | 14 domain-driven Analytics Packs with auto-detection, KPIs, 4 lenses & reports |

---

## 🔒 Security & Sandboxing Features

1. **SSRF Guard**: Asynchronous DNS resolution check (`server-lib/ssrfValidator.ts`) blocking loopback (`127.0.0.1`), RFC 1918 private subnets, Carrier-Grade NAT (`100.64.0.0/10`), and Cloud Metadata (`169.254.169.254`, `metadata.google.internal`).
2. **Safe Fetch**: Enforces `redirect: 'manual'` (validates up to 3 hops individually) and caps responses at 5MB.
3. **Sliding Rate Limiter**: Per-IP in-memory rate limiting with automatic 60-second pruning of expired entries to prevent memory exhaustion.
4. **Security Headers**: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP Report-Only, and frame-ancestors allowing AI Studio iframe execution.
5. **Firestore RBAC**: Strict owner-isolated Firestore rules deployed for user documents and dashboards.

---

## 🧪 Testing & Verification

Run the comprehensive automated test suite and type check:

```bash
# Run Vitest unit & regression tests
npm test

# Verify TypeScript types
npx tsc --noEmit

# Compile production Vite bundle
npm run build
```

---

## 📋 Comprehensive QA Checklist

- [x] **Classic Regression**: Tested that Classic mode passes all 4 golden output snapshots (`npm test`).
- [x] **SSRF Protection**: Verified blocking of `127.0.0.1`, `169.254.169.254`, and private subnets (`tests/ssrf-validator.test.ts`).
- [x] **V2 Engine**: Verified DD/MM inference, unfloored quality scores, and KPI audit traces (`tests/v2-engine.test.ts`).
- [x] **Build & Bundle**: Verified `vite build` code-splitting and vendor chunking with zero errors.
- [x] **Settings Panel**: "Experiments & Alternatives" panel correctly persists flags to `dataanalytix_features` in `localStorage` and provides 1-click "Reset to Classic".
- [x] **Accessibility**: Added landmark roles (`role="main"`), accessible focus outlines, and keyboard operable controls.
