# NexusBI (data-analytix) — Review & Improvement Plan

Repo reviewed: Kamran345-tech/data-analytix (commit e0008c8). Method: read the code, installed it, ran `tsc` and `vite build`, and ran the analytics engine on small datasets where the correct answer is known. Every bug marked **[confirmed]** was reproduced by running code. I did not look at the rendered UI visually (only code), so the design section is based on code, not screenshots.

Overall: it type-checks and builds, and the feature set is wide. But several numbers it shows are wrong or invented, the AI/live-data features will not work on Vercel as deployed, and the "verified / anti-hallucination" labels overstate what the app does.

---

## 1. Accuracy problems (fix first)

| # | Problem | Where | Effect |
|---|---------|-------|--------|
| A1 **[confirmed]** | Margin KPI defaults to a hard-coded `44.2` when the data has no margin/profit/cost column, then shows "Above Target". | analyticsEngine.ts:209 | A made-up KPI is shown as real. |
| A2 **[confirmed]** | Any numeric column whose values are all different is flagged as a primary key and excluded from KPIs and stats. Per-transaction revenue/price is usually all-unique. | dataProfiler.ts:96 + analyticsEngine.ts:83 | Revenue can silently drop out of analysis. |
| A3 **[confirmed]** | Nulls are counted as 0 in averages (`Number(null) === 0`). Margin of [40, 40, null, null] shows 20%, correct is 40%. | analyticsEngine.ts:123, 133 | Rate/average KPIs are understated whenever data has blanks. |
| A4 **[confirmed]** | Forecast confidence band has zero width (lower = upper = forecast). Residuals are measured against the same values they came from. | analyticsEngine.ts:495 | Forecast looks far more certain than it is. |
| A5 | Forecast is labelled "Holt-Winters" but is Holt linear trend only (no seasonality). Uses mean absolute error as "std error". Projections are named "Projection +1" instead of real dates. | analyticsEngine.ts:476-514 | Mislabelled method. |
| A6 **[confirmed]** | Columns with `id` anywhere in the name are dropped (`paid_amount`, `width`, `provider`, `video`...). | analyticsEngine.ts:83, 85 | Valid measures are ignored. |
| A7 **[confirmed]** | Dates are shifted by one day in time zones ahead of UTC (e.g. Pakistan): `03/04/2024` becomes `2024-03-03`. Cause: parsed as local midnight, then `toISOString()`. Also affects Excel dates. | dataParser.ts:184-187 | Wrong dates, wrong periods. |
| A8 **[confirmed]** | Number parsing breaks common formats: `1.234,56` becomes `1.23456` (1000x error); `00123` becomes `123`; `12%`, `(500)` and `PKR 1,000` stay as text. Failed numbers become `null` silently. | dataParser.ts:137, 179 | Silent wrong or missing values. |
| A9 | `DD/MM` vs `MM/DD` is never resolved; `05/06/2024` is always read as May 6. | dataParser.ts:202 | Wrong months for DD/MM users. |
| A10 | Revenue column is picked by one big regex, first matching column wins, so `amount` can beat `net_revenue`. If nothing matches, the first numeric column (possibly an ID or quantity) is used as revenue. Unit is always "USD ($)". Definition text always says "after trade discounts". | analyticsEngine.ts:97, 168 | Wrong column, wrong currency, wrong definition. |
| A11 | Profit KPI: when profit is derived from revenue − cost, the change % and status are calculated on revenue, not profit. | analyticsEngine.ts:175-184 | Wrong trend/status. |
| A12 | "Prior vs current" splits rows in half after sorting dates as text. Non-ISO dates sort wrongly; uneven rows per day make unequal periods. | analyticsEngine.ts:108 | Growth % unreliable. |
| A13 | Margin display guesses: value ≤ 1 is multiplied by 100, so a real 0.5% margin shows as 50%. | analyticsEngine.ts:225 | Wrong % for low margins. |
| A14 | Quality score can't go low: validity is floored at 70 and consistency at 75. | dataQuality.ts:84, 114 | Bad data still scores well. |
| A15 | Type inference uses only the first 100 rows; JSON/Excel column list comes from the first row only; Excel reads only the first sheet. Quartiles are not interpolated (differs slightly from Excel/pandas). Correlation uses only the first 6 numeric columns. | dataParser.ts:115, 97; analyticsEngine.ts:735, 768 | Edge-case differences. |

### Honesty problems (accuracy of claims)

- **Fake live database.** "Test connection" for Postgres/MySQL etc. never connects; it returns success with a random latency. "Fetch" returns randomly generated sales rows labelled as the live DB. If a REST call fails, it silently falls back to random data (server.ts:85, 167-172, 267+). Users may analyse random numbers believing they are real.
- **"Anti-Hallucination Active" / "Calculations verified"** are static labels. When the AI call fails, the fallback message still says "Verified Calculation Engine Response" and ignores the user's question (AskDataAIView.tsx:90-97). The server marks `grounded: true` even for the local fallback.

### How to make it accurate

1. Delete the `44.2` default; if margin can't be computed, show "Not available — needs profit or cost column".
2. Mark a column as a key only if it is text/integer-like AND name looks like an ID, never for decimals or measures. Use word-boundary matching (`/(^|_)id$/`) instead of `includes('id')`.
3. Treat `null` as missing: `r[c] == null ? skip : Number(...)`.
4. Compute forecast residuals against one-step-ahead fitted values; use proper standard error; label the method honestly (or add real seasonality); show real future dates.
5. Parse dates without `toISOString()` (build `YYYY-MM-DD` from local parts); add a DD/MM vs MM/DD setting/detector.
6. Add a robust number parser (thousand/decimal separators, `%`, `(x)` negatives, currency codes) and keep ID-like text (leading zeros) as text. Report how many values failed to parse.
7. Let the user confirm which column is Revenue / Profit / Cost / Date and the currency; remember it.
8. Show on each KPI: rows used, nulls skipped, date range, and the exact formula.
9. Remove the quality-score floors.
10. Add unit tests with known answers (I used small ones; keep them as regression tests).
11. Label the live connector as "Demo data" unless a real connector is built, and never silently fall back to random data.

---

## 2. Deployment & security

- **No `vercel.json`, and the backend (`server.ts`) can't run on Vercel as a static Vite site.** `/api/ai/interpret`, `/api/live-data/*` will not exist there, so Ask Data AI and Live Server will not work on the deployed site. Fix: move the 3 endpoints into Vercel Functions (`/api/*.ts`), or host the Express server elsewhere (Render/Railway/Cloud Run). Add `GEMINI_API_KEY` as an environment variable on the host.
- **`npm install` fails** (ERESOLVE): `esbuild ^0.25` conflicts with Vite 8's peer requirement (`^0.27 || ^0.28`). There is no lockfile. Fix: remove the `esbuild` devDependency (not needed), commit `package-lock.json`.
- **SSRF:** `/api/live-data/test-connection` and `/fetch` make the server request any URL and headers the visitor supplies (server.ts:59, 120), including internal/cloud-metadata addresses. Fix: allow only https, block private/loopback IP ranges, or remove the endpoint.
- **No protection on the AI endpoint:** anyone can call `/api/ai/interpret` and use up your Gemini quota. Add rate limiting and a request size cap (currently 50 MB JSON body).
- **`xlsx@0.18.5`:** `npm audit` reports 1 high-severity vulnerability, no fix on npm. Use SheetJS's official 0.20.x build, or ExcelJS.
- Minor: package name is still `react-example`; `@types/jszip` is a deprecated stub; `vite.config.ts` uses `__dirname` (warning); `.env.example` has AI Studio boilerplate; a stray 64 KB file `public/assets/aistudio/Paste_October_20__2026_-_4_01PM_...` (an HTML paste, no extension) is shipped to every visitor — delete it.

---

## 3. Making it faster and more attractive

Performance
- Single JS bundle of 2.3 MB (640 KB gzipped); no `React.lazy`/code-splitting. Lazy-load each view and the heavy libraries (jspdf, xlsx, html2canvas, alasql) only when used. Target under ~300 KB gzipped for first load.
- Large files are parsed on the main thread; use PapaParse `worker: true` and show a progress bar.
- Fonts: two Google Fonts stylesheets including the full Material Symbols icon font. You already use `lucide-react`, so drop Material Symbols; self-host Inter with `font-display: swap`.

Look and feel
- Landing page: one clear headline, one "Try with sample data" button, a short screenshot/demo above the fold; show a sample dashboard without requiring upload.
- Consistent chart style (same palette, readable labels, colour-blind-safe colours, units on axes).
- Loading skeletons and step progress during analysis; friendly empty states and error messages.
- Keep spacing/typography tokens consistent; check text contrast on the dark theme (small gray text on `#1c1c1c`).
- Mobile: verify the 11+ sidebar items collapse into a menu and tables scroll horizontally.
- Add a "Data used / assumptions" panel on dashboards so numbers are trustworthy at a glance.

Accessibility
- 189 buttons but only 6 `aria-` attributes and no `alt=` text anywhere; add labels to icon-only buttons, focus outlines, keyboard navigation for charts/modals, and `prefers-reduced-motion`.

SEO / sharing
- Title is 62 characters (keep ≤ 60): "NexusBI | AI Data Analyst & BI Platform".
- Meta description is ~290 characters (keep ~155): "Upload raw data and get cleaned datasets, KPIs, dashboards, SQL/DAX code and Power BI exports in minutes."
- Missing: `og:image` (1200×630), `og:url`, `twitter:image`, canonical, favicon, `robots.txt`, sitemap.
- Content is rendered only by JavaScript, so search engines and link previews see an empty page; add pre-rendering for the landing page.
- Brand mismatch: site says NexusBI, URL says data-analytix.

---

## 4. Suggested order of work

1. A1, A2, A3, A7, A8 (wrong or invented numbers) — about a day.
2. Deployment fix (Vercel Functions or separate backend), npm install fix, lockfile.
3. SSRF + rate limit, replace `xlsx`.
4. Honest labels (live connector, "verified"), forecast fix (A4, A5).
5. Code-splitting, fonts, accessibility, landing page polish, SEO tags.
6. Add tests for the engines.
