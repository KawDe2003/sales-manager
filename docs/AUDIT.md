# Sales Management System: Audit Report

**Target:** salesmgr.seynextech.com · **Date:** 3 Oct 2026
**Severity tags:** Critical · High · Medium · Low. Per your request, every performance item is tagged **Critical**; an order column ranks them within that tier.

---

## 0. Scope and honesty note (read first)

I could fetch `/login` with a plain HTTP GET. I could **not** sign in (that needs a real browser session), run Lighthouse, or see network waterfalls, console output or response headers. So:

- **Observed** = seen directly on the login page.
- **Hypothesis** = the usual cause of this symptom in a slow SPA, plus how to confirm it. Nothing below is a measured timing. Run the test plan in section 1 before refactoring.
- Sections 4 and 5 are a rule set plus likely candidates, because I haven't seen your forms or menus.

### Observed findings

| Tag | Finding | Fix |
|---|---|---|
| **Critical** (security) | The admin login you shared is guessable (`adminpassword123`) and was pasted in plain text. If it works on production, treat it as exposed. | Rotate now. Enforce 12+ char passwords, rate limit and lockout on `/login`, 2FA for admin. Never ship default credentials. |
| **Critical** (perf) | `/login` returned an empty HTML shell: only `<head>` metadata, no rendered content. Consistent with a client-rendered SPA where nothing paints until the JS bundle downloads and executes (confirm with View Source). | Inline critical CSS and static login markup in the HTML so FCP doesn't wait on JS. Serve the login route from its own tiny bundle (see P-3, P-9). |
| **High** | Viewport tag has `maximum-scale=1.0, user-scalable=no`. This blocks pinch-zoom and fails WCAG 1.4.4. | Use `width=device-width, initial-scale=1, viewport-fit=cover`. |
| **Medium** | `theme-color` is hardcoded dark (`#0d1218`), so light-mode users get a dark browser bar. | Add two `<meta name="theme-color" media="(prefers-color-scheme: …)">` tags. |
| **Low** | `viewport-fit=cover` is set. Without `env(safe-area-inset-*)` padding, headers and bottom nav collide with notches. | Pad fixed headers and bottom nav with the safe-area insets. |

---

## 1. Performance profiling and speed (all **Critical**)

### Test plan (about 30 minutes, gives real numbers)

```bash
curl -sI https://salesmgr.seynextech.com/login          # cache-control, content-encoding, HSTS, CSP
curl -s -o /dev/null -w "TTFB %{time_starttransfer}s total %{time_total}s size %{size_download}B\n" https://salesmgr.seynextech.com/login
npx lighthouse https://salesmgr.seynextech.com/login --form-factor=mobile --view
```

In DevTools: Network → Disable cache + "Fast 4G"; Performance → record a dashboard load; Coverage → % unused JS; Application → service worker and cache storage. Also run WebPageTest from Mumbai and Singapore.

**Budgets:** TTFB < 0.8 s · FCP < 1.8 s · LCP < 2.5 s · INP < 200 ms · CLS < 0.1 · initial JS < 170 KB gzip · API p95 < 300 ms · list responses < 50 KB.

### Recommendations

| Order | Tag | Recommendation | How | Confirm with |
|---|---|---|---|---|
| P-1 | **Critical** | Server region and edge | Host in the region closest to users (Mumbai/Singapore for Sri Lanka). Put Cloudflare in front: Brotli, HTTP/3, edge-cached static assets. | TTFB from `curl` |
| P-2 | **Critical** | Compression and caching headers | Hashed assets: `Cache-Control: public, max-age=31536000, immutable`. `index.html`: `no-cache`. Enable Brotli. | `curl -sI` on a JS file |
| P-3 | **Critical** | Route-level code-splitting | `React.lazy`/dynamic `import()` per route. Login must not load dashboard code. | Bundle visualizer, Coverage tab |
| P-4 | **Critical** | Lazy-load heavy libraries | Charts, date pickers, rich-text editors, PDF/Excel export load on first use only. Import icons per icon, not the whole pack. | Bundle visualizer |
| P-5 | **Critical** | Server-side pagination, sort, filter | Leads table: 25–50 rows per page, keyset/cursor pagination, return only displayed columns. Virtualize if rows exceed ~100 (TanStack Virtual). | Network tab payload size |
| P-6 | **Critical** | Fix slow queries | Indexes on filter/sort columns (`status`, `owner_id`, `created_at`, phone). Run `EXPLAIN ANALYZE`; remove N+1 queries; select only needed columns. | API p95, DB slow-query log |
| P-7 | **Critical** | One aggregate endpoint per dashboard widget group | Compute totals in SQL, never in the browser. Cache aggregates 30–60 s (Redis or materialized views). | Waterfall: count of `/api` calls |
| P-8 | **Critical** | Client data cache | TanStack Query/SWR: `staleTime` 30–60 s, dedupe identical requests, keep previous data while refetching, prefetch on hover/touchstart. Add ETag → 304 on GETs. | Navigate A→B→A; no repeat fetch |
| P-9 | **Critical** | Slim the login and first paint | No API calls before sign-in except one session check. Preload the one font file you actually use. | Lighthouse FCP/LCP |
| P-10 | **Critical** | Fonts and images | Self-host WOFF2 subsets, `font-display: swap`. Images in AVIF/WebP with `width`/`height`, `loading="lazy"` below the fold. | Lighthouse diagnostics |
| P-11 | **Critical** | Cut main-thread work | Debounce search (300 ms), memoize row components, replace polling with refetch-on-focus, drop decorative animated backgrounds/blur. | Performance panel long tasks |
| P-12 | **Critical** | Service worker (the meta tags suggest PWA intent) | Workbox: precache the app shell, stale-while-revalidate for GETs. Audit any existing worker; a bad one causes slow or stale loads. | Application tab |

---

## 2. UI/UX, design system and responsiveness

### 2.1 Colour system (CSS variables; follows `prefers-color-scheme` plus a manual toggle)

| Token | Light | Dark | Notes |
|---|---|---|---|
| Primary (filled buttons, white text) | `#2563EB` | `#2563EB` | Same fill in both modes keeps white text readable |
| Primary hover | `#1D4ED8` | `#3B7BF5` | |
| Primary text/links/icons | `#2563EB` | `#7CA6FF` | Lighter on dark for contrast |
| Secondary (teal) | `#0F766E` | `#2DD4BF` | Secondary actions, positive trends |
| Background | `#F6F8FB` | `#0D1218` | Off-white and near-black reduce glare |
| Surface (cards) | `#FFFFFF` | `#151C25` | |
| Surface raised/hover | `#EEF2F7` | `#1E2733` | |
| Border | `#E3E8EF` | `#2A3544` | |
| Text primary | `#0F172A` | `#E6EDF5` | Avoid pure `#000`/`#FFF` |
| Text secondary | `#475569` | `#A3B1C2` | |
| Text muted | `#64748B` | `#7D8CA0` | |
| Success | `#15803D` | `#4ADE80` | |
| Warning | `#B45309` | `#FBBF24` | |
| Danger | `#B91C1C` | `#F87171` | |
| Info | `#0369A1` | `#38BDF8` | |

Rules: text pairs are chosen to target WCAG AA (4.5:1), so verify in your tooling. Badges use a 12% tint of the semantic colour with full-colour text. Never rely on colour alone (add icon and label). Chart series: `#2563EB #0F766E #D97706 #7C3AED #DB2777`.

### 2.2 Responsiveness

| Tag | Item |
|---|---|
| **High** | Tables under 768 px become **cards** (name, status badge, value, next action; tap to expand). Tablet: horizontal scroll with sticky first column and a column chooser. |
| **High** | Touch targets at least 44×44 px with 8 px spacing. Row actions go into a "⋯" menu, not three tiny icons. |
| **High** | Mobile: bottom nav (max 5 items), a floating "Add lead" button, filters in a bottom sheet. Desktop: collapsible sidebar. |
| **Medium** | Inputs at 16 px font (prevents iOS zoom on focus), correct `inputmode`/`type` (`tel`, `email`, `numeric`). |
| **Medium** | Test at 360, 390, 768, 1024, 1440 px and with 200% browser zoom. |

### 2.3 Perceived performance

| Tag | Item |
|---|---|
| **Critical** | Render the app shell instantly and show **skeletons that match final layout** (not spinners). Each widget loads independently. |
| **Critical** | Optimistic updates for stage changes, task completion, and notes: update the UI immediately, roll back with a toast on failure. |
| **High** | Route transitions of 150–200 ms (opacity/translate only), persistent layout so the sidebar never re-renders, keep old page visible until new data arrives. |
| **Medium** | Reserve space for images/charts to avoid layout shift; `content-visibility: auto` on long lists. |

---

## 3. Dashboard (simple, insightful, customizable)

**Principle:** one screen, at most 7 default widgets, each answering one question. Default date range is *this month*, never all-time.

```
[ Revenue vs target ] [ Weighted pipeline ] [ Conversion ] [ Speed-to-lead ] [ Overdue follow-ups ]
[ Revenue pace line vs target (60%) ]      [ Funnel by stage (40%)                              ]
[ Needs attention: stale leads, today's tasks (60%) ]   [ Recent activity / leaderboard (40%)   ]
```

### Front-and-centre KPIs

1. **Revenue vs target (MTD, pace-adjusted):** e.g. "62% of target at 70% of month".
2. **Weighted pipeline and coverage:** sum of value × stage probability; pipeline ÷ remaining target (aim ≥ 3×).
3. **Lead → customer conversion rate** (for gyms: lead → member, trial → member), with the weakest stage highlighted.
4. **Speed-to-lead:** median time to first contact. This is the cheapest lever for conversion.
5. **Overdue follow-ups / stale leads:** count of leads with no activity in 7+ days (clickable to the list).

### Customizability architecture

- **Widget registry:** `{ id, title, lazyComponent, defaultSize, minSize, filtersSchema, roles }`. Unpinned widgets cost zero (no code, no query).
- **Layout JSON per user:** `[{ id, x, y, w, h, config }]` on a 12-column grid, stored in a `dashboard_layouts` table. Debounced save, "Reset to default", role-based defaults (Admin, Manager, Rep).
- **Edit mode:** drag and resize only after tapping "Customize" (avoids accidental drags and extra listeners). Use `react-grid-layout` or `dnd-kit` + CSS grid; sizes S/M/L.
- **Mobile:** single column, reorder and pin/unpin only, no resize.
- **Per-widget filters:** date range (global with override), owner/team, pipeline/stage, source, product/plan.
- **Catalogue:** KPI tile, revenue pace, funnel, pipeline by stage, leaderboard, today's tasks, stale leads, lead sources (use a bar chart, not a donut), activity feed, forecast.

---

## 4. The cut list (validate against your analytics; I haven't seen your forms or menus)

**Rule:** if no filter, report, or automation used a field/page in the last 60 days, delete or hide it.

### Form fatigue

| Tag | Action |
|---|---|
| **High** | Lead form minimum: **name, phone (WhatsApp, +94 default), source**, optional estimated value. Everything else is optional. |
| **High** | **Automate:** owner (current user), stage ("New"), created date, source (from `?ref=`/UTM), phone normalisation (`07X`, `+94`, `0094` all become one format), duplicate warning on phone. |
| **Medium** | Move to an **Advanced** section: address, secondary phone, company, DOB, tags, social links, internal notes. |
| **Medium** | Quick-add (name + phone) inline from any list; the full form is only for editing. |

### Navigation and clutter

| Tag | Action |
|---|---|
| **High** | Keep 5 primary items: Dashboard, Pipeline/Leads, Customers, Tasks, Reports. |
| **High** | Move to the **Settings** gear: users/roles, products/plans, lead sources, stage config, templates, import/export, integrations, audit log. |
| **High** | **Consolidate:** Leads + Deals into one Pipeline with a table/kanban toggle; multiple report pages into one Reports page with tabs. |
| **Critical** (perf) | **Remove:** charts showing the same data twice, decorative animations/blur, polling timers, all-time default queries. |
| **Critical** (perf) | **Defer DOM:** render tab and modal contents only when opened; cap tables at 25–50 rows. |

---

## 5. Functionality, security and bug hunt

I could not test authenticated flows. This is the checklist to run, with severity.

### Security

| Tag | Check |
|---|---|
| **Critical** | Server-side authorization on **every** endpoint. Test IDOR: change the ID in `/api/leads/123` as a low-privilege user. |
| **Critical** | `/login`: rate limit, lockout/backoff, generic error ("Invalid email or password", no user enumeration), no default credentials. |
| **Critical** | Session storage: prefer `HttpOnly; Secure; SameSite=Lax` cookies. Tokens in `localStorage` are stealable via any XSS. |
| **High** | Headers: HSTS, CSP, `X-Content-Type-Options: nosniff`, `frame-ancestors`/`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. Check with `curl -sI` and securityheaders.com. |
| **High** | CSRF: if cookie auth, require CSRF token or SameSite plus Origin check on state-changing requests. (Not applicable with Bearer-header-only auth.) |
| **High** | XSS: escape lead names and notes; avoid `dangerouslySetInnerHTML`/`v-html`; sanitize rich text (DOMPurify); guard CSV import/export against formula injection (`=`, `+`, `-`, `@`). |
| **High** | Password field: `type="password"`, `autocomplete="current-password"`, show/hide toggle, allow paste, 12+ chars with no composition rules, 2FA for admins, expiring reset tokens. |
| **Medium** | Disable or restrict production source maps; no stack traces in API errors; no wildcard CORS; run `npm audit`; idle session timeout. |

### Validation and edge-case matrix

| Tag | Test |
|---|---|
| **High** | Empty/whitespace-only required fields; 10k-character strings; negative, zero and huge amounts; LKR formatting and decimals. |
| **High** | Sinhala/Tamil/emoji names; phone formats `+94 77 123 4567`, `0771234567`, `0094…`; duplicate phone. |
| **High** | Double-click submit (disable button, idempotency key); session expiry mid-form (don't lose input); back button after submit. |
| **Medium** | Payloads: `<img src=x onerror=alert(1)>` and `' OR 1=1--` in every text field. |
| **Medium** | Dates stored in UTC, displayed in Asia/Colombo (UTC+5:30); pagination boundaries; zero-result and error states. |
| **Medium** | Error UX: inline field-level messages, preserve input, focus the first invalid field, `aria-live` announcements. |

### Workflow dead-ends to check

Deep link while logged out should return to the target page after login · 404 and error-boundary pages with a way back · empty states with a primary action · logout clears cached data · offline/slow-network retry.

---

## 6. Suggested rollout

| When | Do |
|---|---|
| **Day 1** | Rotate the admin password. Run the section 1 test plan and record baselines. Fix cache/compression headers (P-2) and the viewport tag. |
| **Week 1** | Code-split routes (P-3, P-4), paginate and index the leads endpoint (P-5, P-6), add skeletons. |
| **Weeks 2–3** | Client cache (P-8), aggregate dashboard endpoints (P-7), Cloudflare/region move (P-1), security headers, mobile card tables. |
| **Later** | Customizable dashboard, the cut list, service worker. |
