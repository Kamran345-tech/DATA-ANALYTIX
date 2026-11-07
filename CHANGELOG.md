# Changelog - Data Analytix Enterprise Improvements

All improvements across Phases 1 through 8 strictly adhere to the **ADDITIVE ONLY, CLASSIC STAYS** architecture. The existing Classic platform behavior remains the uncompromised default when flags are OFF.

## [2.4.0] - Additive Enterprise Architecture Release

### Phase 1: Dual-Deployment (AI Studio & Vercel)
- **Added**:
  - `server-lib/`: Shared modular handlers (`handlers.ts`), database telemetry helpers (`dbHelpers.ts`), AI service wrapper (`aiService.ts`), SSRF guard (`ssrfValidator.ts`), rate limiter with automatic pruning (`rateLimiter.ts`), and security headers (`securityHeaders.ts`).
  - `/api/`: Dedicated Vercel serverless function entry points (`/api/health.ts`, `/api/ai/interpret.ts`, `/api/live-data/test-connection.ts`, `/api/live-data/fetch.ts`).
  - `vercel.json`: Single Page Application (SPA) rewrite rule preserving `/api/*` routes with security headers.
  - `.env.example`: Documented Vercel and Firebase environment variables without deleting existing configuration.
- **Maintained**: `server.ts` remains active and functional for AI Studio dev container on port 3000.

### Phase 2: Security & Hardened Sandboxing
- **Added**:
  - In-memory rate limiting on `/api/*` with automatic 60-second pruning of expired client records.
  - Express `trust proxy` enabled for reverse proxy and containerized client IP fidelity.
  - Per-route body size limitations (1MB for test connections, 2MB for live data fetch, 2.5MB for AI contexts, 5MB max fallback).
  - Security headers: CSP Report-Only, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `frame-ancestors` permissions for AI Studio.
  - Hardened SSRF validator with asynchronous DNS resolution, private IP / CGNAT / Cloud metadata blocking, and 3-hop manual redirect inspection.
  - Hardened ExcelJS adapter alternative (`src/engine/xlsxSafeAdapter.ts`) with formula injection sanitization.
  - Flag-controlled strict error routing (`showAllErrors`) in `index.html`.

### Phase 3: Accuracy & Honesty Alternatives
- **Added**:
  - V2 Engine Suite:
    - `src/engine/v2/dataParserV2.ts`: DD/MM vs MM/DD date boundary inference, up to 1,000-row sampling, and multi-sheet Excel parsing.
    - `src/engine/v2/dataQualityV2.ts`: Raw unfloored data quality score with full penalty audit trail.
    - `src/engine/v2/analyticsEngineV2.ts`: Per-KPI audit traces (`rowsUsed`, `nullsSkipped`, `formulaExpression`) and calendar-extended forecast periods.
  - Interactive Pre-Flight Column Mapping modal (`src/components/common/ColumnMappingModal.tsx`).
  - Verified AI Citation validator card (`src/components/common/VerifiedAiCard.tsx`).
  - Automated CI workflow (`.github/workflows/ci.yml`).
  - Regression snapshot tests (`tests/classic-regression.test.ts`, `tests/ssrf-validator.test.ts`, `tests/v2-engine.test.ts`).

### Phase 4: Performance & Optimization
- **Added**:
  - `React.lazy` and `Suspense` code splitting across all 20+ view modules in `src/App.tsx`.
  - Manual vendor chunking in `vite.config.ts` (`vendor-react`, `vendor-export`, `vendor-sql`, `vendor-core`).
  - Off-main-thread Web Worker CSV parser (`src/workers/parseWorker.ts`).
  - System font cascade stylesheet (`src/styles/fonts.css`) for zero-latency font loading when enabled.

### Phase 5: Routing & Search Engine Optimization
- **Added**:
  - Deep-linkable Hash URL routing (`src/utils/routing.ts`) with browser forward/back synchronization.
  - Public pre-login landing view (`src/components/views/PublicLandingView.tsx`) with "Try with Sample Data".
  - Not Found / 404 recovery view (`src/components/views/NotFoundView.tsx`).

### Phase 6: UI & UX Modernization Alternatives
- **Added**:
  - Deep Slate Modern Theme tokens (`#0B1120`, `#111A2E`, `#1E293B`, 4.5:1 WCAG contrast) in `src/index.css`.
  - Grouped Workflow Sidebar (`src/components/layout/GroupedSidebar.tsx`) with 5 collapsible workflow stages: Ingest Data -> Audit & Prepare -> Model & Code -> Analyze & Build -> Export & Settings.
  - Shimmering skeleton loader cards (`src/components/common/SkeletonCard.tsx`).
  - `prefers-reduced-motion` compliance media queries.

### Phase 7: Accessibility & Inclusivity
- **Added**:
  - Explicit `role="main"`, `aria-label` attributes on icon actions and landmarks.
  - Focus outlines and keyboard navigable controls.
  - Contextual cookies and telemetry privacy consent banner (`src/components/common/CookieBanner.tsx`).

### Phase 8: SaaS Features & Experiments Panel
- **Added**:
  - Centralized feature flag management (`src/config/features.ts`) with 15 typed flags persisted in localStorage (`dataanalytix_features`).
  - SaaS Pricing & Plan Quotas view (`src/components/views/PricingView.tsx`) with simulated Stripe checkout.
  - Multi-user Workspaces & RBAC view (`src/components/views/WorkspacesView.tsx`) with invite tokens and audit log.
  - New Firestore subcollection rule `saved_dashboards_v2` in `firestore.rules` deployed to Firebase project.
  - Settings -> "Experiments & Alternatives" panel: toggles for all 15 flags with live reactive state updates and 1-click "Reset to Classic".
