# Asset & Accessibility Audit — Shooting Challenge Web

**Date:** 2026-07-15  
**Auditor lane:** Agent 2 (Assets, Accessibility, Responsive Quality)  
**App root:** `web/`  
**Scope:** Code-review audit (no live browser). Agent 1 owns most view/layout UI files — findings in those files are listed for Lead reconciliation, not repaired here.

---

## 1. Asset inventory

### 1.1 Local brand logos — present

| File | Path | Status |
|------|------|--------|
| Circle stamp | `public/brand/logo-circle-blue-orange.png` | Present (~67 KB) |
| Horizontal V1 | `public/brand/logo-v1-blue-orange.png` | Present |
| Stacked lockup | — | **Not in repo** — do not invent |

Constants: `lib/brand.ts` → `BRAND_LOGOS`. Component: `components/brand/brand-logo.tsx`.

### 1.2 Empty / placeholder public folders

| Folder | Contents | Notes |
|--------|----------|--------|
| `public/images/` | `.gitkeep` only | Empty by design |
| `public/icons/` | `.gitkeep` only | Empty by design |
| `public/logos/` | `.gitkeep` only | Empty — brand logos live under `public/brand/` |
| `public/brand/` | Two official PNGs | Canonical |

No broken `/images/`, `/icons/`, or `/logos/` imports found in app code. Hub/product icons use SVG components in `components/icons/shoot-icons.tsx` (`aria-hidden` — correct when adjacent text labels the control).

### 1.3 `/brand/` imports — resolve

All `BrandLogo` / `BRAND_LOGOS` usages point at:

- `/brand/logo-circle-blue-orange.png`
- `/brand/logo-v1-blue-orange.png`

Call sites (Agent 1 / layout — do not edit from this lane unless Lead requests):

- `components/layout/product-shell.tsx` — horizontal
- `components/home/home-page-view.tsx` — horizontal
- `components/leaderboard/leaderboard-view.tsx` — circle
- `components/public-display/public-display-view.tsx` — circle

### 1.4 Favicon / app icon

| Asset | Path | Status |
|-------|------|--------|
| App icon (Next metadata file) | `app/icon.png` | Circle logo copy |
| Public favicon PNG | `public/favicon.png` | Copied from circle logo |
| Public favicon ICO | `public/favicon.ico` | PNG bytes renamed as `.ico` (browsers accept; true multi-size ICO optional later) |
| Metadata | `app/layout.tsx` → `icons.icon` / `icons.apple` | Points at `/favicon.png` |
| Middleware exclusions | `favicon.ico`, `favicon.png`, `brand/` | Bypass site-access gate |

### 1.5 Remote images (Airtable)

Attachment URLs come from Airtable REST (`mapAttachments` in `lib/data/*`). Hosts are not hard-coded in source, but Airtable attachments typically serve from:

- `https://v5.airtableusercontent.com/...`
- legacy `https://dl.airtable.com/...`
- other `*.airtableusercontent.com` CDN hosts

**`next.config.ts` `images.remotePatterns`** (updated this pass):

- `v5.airtableusercontent.com`
- `*.airtableusercontent.com`
- `dl.airtable.com`

Current UI uses `next/image` with **`unoptimized`** for Airtable URLs (avatar, covers, thumbnails), so the optimizer is not required today. Patterns are future-proof for removing `unoptimized`.

**Not added:** Make/S3 brand source URLs (`BRAND_LOGO_SOURCES`) — logos are local. Do not invent attachment S3 prefixes without a live URL sample.

### 1.6 PDF / external document links

`lib/formatters/external-media.ts` correctly forces Adobe/PDF URLs to open externally (no iframe embed). No broken static PDF assets in `public/`.

### 1.7 Placeholder / broken paths

- No `example.com` / lorem placeholders in image `src`.
- `components/shared/placeholder-page.tsx` is a route scaffold (text only), not a broken asset.
- Case-sensitive path issues: none found for `/brand/` (lowercase).

### 1.8 Assets that could not be verified in this pass

- Live Airtable attachment host strings (no committed fixture URLs with full CDN hosts in tests).
- Production S3 brand kit re-download freshness vs local PNGs.
- True multi-resolution `.ico` rendering quality in older Windows browsers.
- Runtime contrast with real screenshots (WCAG calculator not run; ratios estimated from tokens).

---

## 2. BrandLogo (this lane — repaired)

| Rule | Status |
|------|--------|
| `alt={BRAND_ORG_NAME}` (“127 Sports Intensity”) | Yes |
| Variants documented: `horizontal` \| `circle` | Yes |
| Stacked unavailable — documented in component + `lib/brand.ts` | Yes |
| Default `object-contain` (no stretch/distort) | Yes — always applied |
| No CSS filters / recolor | Yes |

---

## 3. Accessibility repairs made (Agent 2 exclusive)

| File | Change |
|------|--------|
| `components/brand/brand-logo.tsx` | Docs + forced `object-contain` |
| `next.config.ts` | `images.remotePatterns` for Airtable CDN hosts |
| `app/error.tsx` | `role="alert"`, `aria-live="assertive"`, clear `h1`, decorative rule `aria-hidden`, **min 44px** retry + home controls |
| `app/not-found.tsx` | Clear `h1`, decorative “404” `aria-hidden`, metadata title, **min 44px** home link |
| `app/(program)/leaderboard/loading.tsx` | `aria-busy` / `aria-live`, decorative spinner `aria-hidden` |
| `app/layout.tsx` | `metadata.icons` → `/favicon.png` |
| `middleware.ts` | Exclude `favicon.png` + `brand/` from access gate |
| `public/favicon.png` / `favicon.ico` | From circle logo |

---

## 4. Accessibility findings (Agent 1 / Lead — deferred)

### 4.1 Alt text gaps (decorative vs informative)

Empty `alt=""` is acceptable when the adjacent title conveys the content; still recommend meaningful alts when the image itself is the subject:

| File | Issue |
|------|--------|
| `tutorials/tutorials-grid-view.tsx` | Thumbnail `alt=""` — prefer tutorial title |
| `tutorial-media/tutorial-media-views.tsx` | Thumbnail `alt=""` |
| `homework/homework-catalog-view.tsx` | Cover `alt=""` |
| `homework/homework-detail-view.tsx` | Cover `alt=""` |
| `zoom-meetings/zoom-meetings-views.tsx` | Cover `alt=""` (card + detail `<img>`) |
| `levels/levels-ladder-view.tsx` | Cover `alt=""` |
| `levels/level-detail-view.tsx` | Cover `alt=""` |

**Good:** `AthleteAvatar` uses `alt={name}`; tutorial detail / tutorial-media headshots use athlete name.

### 4.2 Heading order risks

`ProductShell` renders a page-level `<h1>` (product name). Several destinations also render an `<h1>` inside the view (home hero, leaderboard title, catalog empty/error states, public display). Result: **two `h1`s per page** on many routes.

**Recommendation for Lead/Agent 1:**

- Keep shell title as `h1` OR demote shell to a labeled banner and let the view own `h1`.
- Empty/error states that currently use `h1` should use `h2` when shell already provides `h1`.
- Athlete profile / dashboard use `h2`/`h3` under shell — better pattern.

### 4.3 Contrast — brand blue on dark

Token: `#0034B7` on `#0A0A0A` (`text-brand-blue` eyebrows/labels at ~10–11px).

Estimated contrast for pure `#0034B7` on `#0A0A0A` is **well below WCAG AA (4.5:1)** for small text. Large/bold may still fail AA for normal text.

**Recommendations (Lead / globals):**

1. Prefer `text-accent-soft` / white / lightened blue for small labels on dark.
2. Or bump label blue to a lighter tint (e.g. `#4C7CFF` / `#6B8CFF`) for dark-theme text only, keep `#0034B7` for fills/headers on light or solid blue chrome (`.sc-table thead` white-on-blue is fine).
3. Avoid `text-brand-blue` below ~14px on near-black.

Current heavy users (Agent 1): `page-frame` eyebrow, `display-heading`, home/public-display/dashboard/achievements/tutorials chips, product-shell product label.

### 4.4 Invalid Tailwind color tokens (Agent 1)

`text-si-blue` / `text-si-orange` appear in:

- `components/athlete/athlete-profile-view.tsx`
- `components/dashboard/athlete-dashboard-view.tsx`

These are **not** defined in `globals.css` / `@theme`. Links may render as default/inherit. Replace with `text-brand-blue` / `text-brand-orange` or `text-accent` (after contrast fix).

### 4.5 Keyboard focus

Lead added global `:focus-visible` orange ring in `globals.css` — good. Forms/utilities use `.sc-input:focus-visible`. No skip-to-content link yet (optional enhancement).

### 4.6 Form labels

No live `<input>` / `<select>` catalog filters found using native form controls in components (grade band uses buttons with `aria-pressed` + `role="group"` — good). `.sc-field label` pattern exists in CSS for future forms.

### 4.7 Semantic tables

`leaderboard-table.tsx`: desktop `<table>` with `<thead>`/`<th>` — good. Mobile switches to card list (`md:hidden`) — good responsive pattern. Does not yet wrap table in `.sc-table-scroll` (may be fine because table is `hidden` below `md` and cards replace it).

### 4.8 Touch targets

| Control | Finding |
|---------|---------|
| `.btn-primary` / `.btn-secondary` | `min-height: 2.75rem` — pass |
| `BackToHubLink` | `min-h-[2.75rem]` — pass |
| Product nav links | `px-3 py-2` — ~36px; borderline; consider `min-h-11` |
| Grade band filter buttons | `px-3 py-2 text-xs` — borderline for 44×44 |
| Error/not-found CTAs (this lane) | `min-h-11` — pass |

### 4.9 Loading UX

| File | Status |
|------|--------|
| `athletes/[slug]/loading.tsx` | `aria-busy` + `sr-only` — good |
| `leaderboard/loading.tsx` | Updated this lane |
| `dashboard/loading.tsx` | Uses `LoadingState` — visible label only; Agent 1/`ui` could add `aria-busy` |

---

## 5. Responsive checklist (code review)

Breakpoints reviewed via Tailwind classes: **1440 / 1024 / 768 / 390 / 320**.

### 5.1 Nav overflow-x

`product-nav.tsx`: `overflow-x-auto` on small screens, `sm:flex-wrap sm:overflow-visible` — **pass**. Risk: many nav items may still feel cramped at 320px; horizontal scroll is intentional.

### 5.2 Tables

Leaderboard: table hidden `< md`; card stack on small — **pass**. Global `.sc-table-scroll` exists for future denser tables.

### 5.3 Grids

Most catalogs use `sm:grid-cols-2` / `lg:grid-cols-3` with single column default — **pass** at 320/390. Home hub `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` — fine. Public display `lg:grid-cols-5` collapses to 1 then 2 — monitor dense podium at 390.

### 5.4 Image cropping risks

| Pattern | Risk |
|---------|------|
| `object-cover` + `aspect-[16/10]` cards | Expected crop for thumbs/covers |
| Avatar `object-cover` in circle | Expected |
| BrandLogo `object-contain` | Safe — no crop of mark |
| Zoom detail `object-contain` max-height | Safe |
| Shell logo `h-8 w-auto max-w-[10rem] object-contain` | Safe |

### 5.5 Viewport padding

Shell / pages typically `px-4 sm:px-6` — adequate at 320px. Error/not-found `px-6` — fine.

---

## 6. Items deferred to Lead / Agent 1

1. Fix `text-si-blue` / `text-si-orange` → brand tokens.
2. Resolve dual-`h1` between `ProductShell` and page views.
3. Improve empty `alt=""` on catalog/cover images where titles exist.
4. Soften or replace small `text-brand-blue` on `#0A0A0A` for contrast AA.
5. Optionally bump nav / grade-filter touch targets to `min-h-11`.
6. Add `aria-busy` to shared `LoadingState` if desired.
7. Optional: true multi-size favicon.ico generation; skip-link.
8. When removing `unoptimized` from Airtable images, rely on existing `remotePatterns`.

---

## 7. Agent 2 deliverable summary

**Files changed (this lane):**

- `web/next.config.ts`
- `web/components/brand/brand-logo.tsx`
- `web/app/error.tsx`
- `web/app/not-found.tsx`
- `web/app/(program)/leaderboard/loading.tsx`
- `web/app/layout.tsx` (icons metadata only)
- `web/middleware.ts` (favicon/brand exclusions)
- `web/public/favicon.png`
- `web/public/favicon.ico`
- `web/docs/asset-accessibility-audit.md` (this file)

**Broken assets repaired:** Favicon path/metadata; BrandLogo contain; Airtable image host allowlist.

**Not verified live:** Exact production attachment host hostname variants beyond standard Airtable CDN; visual contrast screenshots.
