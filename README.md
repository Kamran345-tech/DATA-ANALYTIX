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

#### Turning Flags Off or Customizing on Vercel (`https://data-analytix-flax.vercel.app/`)
- **Default New Visitor Experience**: Because `depthUI`, `heroScene3D`, `chartGuide`, and `unifiedTheme` default to `true` in `src/config/features.ts`, new visitors on Vercel see the unified theme, 3D hero scene, depth UI, and 8-chart guide out of the box without requiring extra environment variables.
- **Turning Individual Flags Off via Environment Variables**: Set any `VITE_FEATURE_<FLAG_NAME>=false` (or `0`) in `.env` or **Vercel Project Settings → Environment Variables** to disable that feature at build time:
```env
VITE_FEATURE_DEPTH_UI=false
VITE_FEATURE_HERO_SCENE_3D=false
VITE_FEATURE_CHART_GUIDE=false
VITE_FEATURE_UNIFIED_THEME=false
```
- **Runtime Override & Persistence**: Any visitor can click **"Switch to Classic"** in the top navbar or toggle individual flags in **Settings → Experiments & Alternatives**. User preferences are saved to `localStorage['dataanalytix_features']`, which takes precedence over build-time defaults and displays a live session banner in Settings showing which flags are currently `ON`.

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
