# SC-112 — Multi-child select 404 fix (2026-09-04)

## Problem

Production: Family Dashboard → parent email → child-selection → select athlete → **Page Not Found**.

## Root cause

JSON success from `POST /api/auth/select-enrollment` returned `redirectTo: "/shoot/dashboard"` via `withBasePath`. The client then called `router.push(redirectTo)`. Next.js `basePath` (`/shoot`) is applied again by the App Router → navigation to **`/shoot/shoot/dashboard`** → 404.

The same latent bug existed on sign-out (`redirectTo: "/shoot/dashboard/sign-in"`).

HTML form POST (no JS) was unaffected: absolute `303` Location via `buildAbsoluteAuthRedirectUrl` already included `/shoot` correctly.

## Fix

- JSON `redirectTo` is **app-relative** (`/dashboard`, `/dashboard/sign-in`) for `router.push` / `Link`.
- Client uses `toAppRouterHref()` to strip any accidental `/shoot` prefix(es).
- Absolute redirects for HTML/verify paths unchanged.
- Regression tests: unit + Playwright (`/shoot/shoot/dashboard` is not a valid route).

## Status

| Gate | Status |
|------|--------|
| Code complete | **Yes** — fix commit `e3bb7e45` |
| Merged to `master` | **Yes** — PR **#388** merge SHA **`78208ffc`** |
| Production deployed | **Yes** — Vercel Production `dpl_8TLH6uQAvLXUoQGDrGQ4NrFnWcVG` · URL https://www.fairfieldbasketballclub.com/shoot |
| Multi-child production verified | **Yes — COMPLETE — PRODUCTION VERIFIED BY MIKE** (2026-09-04) |
| Season Sim / Airtable / protected automations | Not touched |
| Further SC-112 action | **None** — do not reopen unless new contradictory evidence |

## Mike production verification (authoritative)

Mike personally verified in Production:

* Parent email correctly presented all three associated athletes.
* Each athlete could be selected successfully.
* The correct athlete dashboard loaded.
* The family’s athlete choices displayed correctly at the top after login.
* Switching among athletes worked correctly.
* Sign-out worked.
* No Page Not Found error occurred.
* No duplicated `/shoot/shoot/` path appeared.
* No Airtable `rec…` record IDs appeared in URLs.

Pre-verify automated gates (repo): lint passed (pre-existing warnings only); typecheck passed; Vitest 650 passed; Playwright multi-child/auth/dashboard privacy 15 passed / 4 skipped; production build passed.

## Completion ledger (SC-112)

| Item | Authoritative status | Evidence | Documentation location | Follow-up |
|------|---------------------|----------|------------------------|-----------|
| SC-112 magic-link + private dashboard | **COMPLETE — PRODUCTION VERIFIED BY MIKE** | PRs **#350–#357**; Production auth on | Master Future Work List · this audit · deploy checklist | None for SC-112 core |
| SC-112 multi-child opaque select | **COMPLETE — PRODUCTION VERIFIED BY MIKE** | PR **#373** + Mike three-child walkthrough | Master Future Work List · architecture doc | None |
| Select→dashboard `/shoot/shoot` 404 | **COMPLETE — FIXED + DEPLOYED + VERIFIED** | Fix `e3bb7e45` · merge `78208ffc` · PR **#388** · deploy `dpl_8TLH6uQAvLXUoQGDrGQ4NrFnWcVG` | This audit | None |
| Optional Hub `DASHBOARD_MAGIC_LINK` template | Open product/ops preference | Not required for SC-112 close | Deploy checklist “Remaining” | Optional only |
| Alumni / inactive enrollment access | Open product decision | Architecture §10 | Architecture doc | Separate future ID if pursued |

**Do not reopen, reimplement, or retest SC-112** unless new contradictory evidence is discovered.
