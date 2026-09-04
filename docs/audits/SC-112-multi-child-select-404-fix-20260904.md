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
| Code complete | Yes (this change) |
| Production deployed | Pending merge/deploy |
| Multi-child production verified | Pending Mike after deploy |
| Season Sim / Airtable / protected automations | Not touched |

## Mike action after deploy

1. Open Family Dashboard → sign in with parent email that has three athletes.
2. Select each child → confirm `/shoot/dashboard` (not Page Not Found).
3. Switch children; sign out; confirm dashboard protected again.
4. Confirm no `rec…` IDs in the address bar.
