# Web Security / Privacy Audit — `/shoot`

**Agent 6 overnight audit** · 2026-07-23 · Scope: `web/` only (no backend systems)

---

## Findings summary

| # | Area | Finding | Severity | Status |
|---|------|---------|----------|--------|
| 1 | Error rendering | Raw `error.message` (incl. full Airtable API response bodies — base/table/view internals) rendered to public visitors on 15 catalog pages | Medium (info disclosure, no credentials) | **FIXED this session** — `publicErrorMessage()` helper in `lib/airtable/errors.ts`; all 15 pages updated; unit tests assert no body leakage |
| 2 | Env vars | `AIRTABLE_API_TOKEN` / `AIRTABLE_BASE_ID` / `SITE_ACCESS_TOKEN` are server-only; only `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_LANDING_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GAME_MANUAL_URL` reach the client (all non-sensitive) | — | PASS |
| 3 | Browser Airtable calls | None — all fetches in Server Components / route handlers via `lib/airtable/client.ts`; verified no `api.airtable.com` reference outside that module | — | PASS |
| 4 | Exposed tokens in repo | No secrets committed; `.env*` ignored; `.env.example` contains placeholders + base ID only (base IDs are not secrets) | — | PASS |
| 5 | Private fields | Public queries request only presentation-safe fields (enforced by unit tests for leaderboard; catalog field lists contain no contact fields) | — | PASS |
| 6 | Email exposure | No email-like fields fetched or rendered; Playwright privacy spec asserts no rendered email addresses on standings/profile/dashboard/admin | — | PASS (spec pending first CI run — see PLAYWRIGHT-COVERAGE.md) |
| 7 | Predictable record IDs | Detail routes use Airtable `rec…` IDs. IDs are validated (`/^rec[a-zA-Z0-9]{14}$/`) and every detail query re-applies the publish filter (`Published?` / `OK to Publish on Softr` / not-Cancelled), so guessing an ID cannot expose unpublished records | Low (acceptable) | PASS |
| 8 | Caching of private data | Only publish-filtered public data is cached (ISR/revalidate). Health endpoint is `force-dynamic`. No per-user data exists to cache | — | PASS |
| 9 | Auth bypass | No real auth exists to bypass: dashboard/profile are labelled mock data; admin is a static placeholder; `SITE_ACCESS_TOKEN` middleware gate is deployment privacy, not user auth, and fails closed when set | — | PASS (by design; see ATHLETE-AUTH-DECISION.md) |
| 10 | Public API routes | Single route `GET /api/airtable` — config/token health only, no record payloads, 401 without site token when gate enabled | — | PASS |
| 11 | Logging | No `console.log` of tokens or PII in `web/lib` / `web/app`; Airtable errors carry response bodies internally (server logs only after fix #1) | — | PASS |
| 12 | Middleware token echo | Query-param site token is exchanged for an httpOnly cookie and stripped from the URL (avoids token lingering in history/referrers). Bearer/cookie comparison is non-constant-time string equality — acceptable for a low-value preview gate; note for future real auth | Info | Accepted |

## Fix detail (finding 1)

- `publicErrorMessage(error)` returns:
  - `AirtableApiError` → "Live data is temporarily unavailable. Please try again soon."
  - Missing-config `Error` → original operator hint (names public env var only)
  - anything else → generic message
- Applied to: leaderboard, public-display, achievements, homework (+detail), levels (+detail), tutorials (+detail), shoutouts (+detail), articles (+detail), zoom-meetings (+detail).
- Tests: `lib/airtable/errors.test.ts` — asserts base ID / error type strings cannot reach visitors.

## Residual risks / recommendations

1. **PAT scope hygiene:** keep the Vercel `AIRTABLE_API_TOKEN` scoped to `data.records:read` on the Shooting Challenge base only (cannot be verified from repo — Mike checks at airtable.com/create/tokens).
2. **`app/error.tsx`** (global boundary) still shows `error.message` — Next.js production builds redact server error messages to a digest automatically, so exposure is dev-only. No change made.
3. When real athlete auth lands (SC-112), revisit finding 12 (constant-time compare, rate limiting) — see ATHLETE-AUTH-DECISION.md.
4. Consider a repo-level secret scanner in CI (SC-145 follow-up).
