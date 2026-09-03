# Athlete dashboard auth — parent magic-link (SC-112)

**Status:** Implementation in repository · **Not enabled in Production until Mike configures Vercel**

Authority: [ATHLETE-AUTH-DECISION.md](../../docs/overnight/web-integration/ATHLETE-AUTH-DECISION.md) (Option A — parent magic-link email)

## Selected approach

| Decision | Choice | Why |
|----------|--------|-----|
| Identity | `Parent Email - Cleaned` on Enrollments | Already verified at registration; parent-mediated; no child passwords |
| Session | HMAC-signed httpOnly cookie (`v:2`) | Parent email + authorized enrollment IDs + optional `selectedEnrollmentId` (server-only) |
| Child selection | Opaque HMAC selection keys + `/dashboard/select` | Never puts Airtable `rec…` IDs in URLs or switcher hrefs |
| Magic-link token | 32-byte random, SHA-256 hash stored server-side, single-use, 15-minute TTL (configurable) | Meets single-use + no plaintext storage requirements |
| Token store | In-memory (dev/tests) or **Upstash Redis (required in Production)** | Serverless-safe invalidation; no Airtable writes |
| Email delivery | Direct Resend API from Vercel route handler | See bypass note below |
| Feature gate | `ATHLETE_AUTH_ENABLED` must be `true` | Preserves coming-soon dashboard until Mike enables auth |

## Email plane — Hub bypass (documented)

Program transactional email (welcome, weekly, homework, etc.) flows:

`Airtable automation → Email Handoff Queue → Automation 079 → Communications Hub → Resend`

Magic-link auth email is **web-initiated, synchronous, and single-recipient**. It does not originate from an Airtable automation row and must be sent immediately after the parent submits the sign-in form. Routing through Email Handoff Queue + 079 would add latency, require Airtable write scope from the web app, and need a new Hub template/event registration before first use.

**Therefore:** the web app sends magic-link mail via **Resend directly** when configured, with **test mode** forcing delivery only to `schmidt@fairfieldbasketballclub.com`. A future Hub template (`DASHBOARD_MAGIC_LINK`) may be added if Mike wants all outbound mail unified in Hub audit logs.

## Security controls

- Uniform success response for known/unknown parent emails (no enumeration)
- Rate limits by normalized email and client IP (in-memory; Redis-backed optional)
- Blocks personal Gmail / Googlemail addresses at validation
- Session determines authorized enrollments; URL `enrollmentId` is **ignored** (legacy bookmarks redirect to a clean `/dashboard`)
- Child switching uses opaque selection keys posted to `/api/auth/select-enrollment` — raw `rec…` IDs are rejected
- Every private load re-fetches active enrollments for the parent email and intersects with `session.enrollmentIds`
- No Airtable record IDs, tokens, or internal errors in browser-facing copy
- `ATHLETE_AUTH_DEV_BYPASS` only honored when `NODE_ENV !== "production"` and explicit env set

## Multi-child parent authentication

One parent email may authorize multiple **active** enrollments (`Active?` + matching `Parent Email - Cleaned`).

| Situation | Behavior |
|-----------|----------|
| **One active enrollment** | After magic-link verify, session sets `selectedEnrollmentId` and redirects to `/dashboard` |
| **Multiple active enrollments** | Verify redirects to `/dashboard/select`. Parent chooses a child via opaque key POST. Session stores `selectedEnrollmentId`; `/dashboard` has no enrollment query param |
| **Switching children** | Family switcher POSTs the opaque key again; server re-checks live Active? + email + session membership before rewriting selection |
| **Back button** | `/dashboard` and `/dashboard/select` never carry `rec…` in the URL, so history does not leak enrollment IDs. Legacy `?enrollmentId=` bookmarks are stripped |
| **Inactive enrollments** | Excluded from magic-link lookup and from live intersect. If the selected child becomes inactive, selection is cleared and the parent is sent to select (or empty when none remain) |
| **Duplicate enrollments** | Treated as separate selectable rows (labeled by program/season). Prefer Airtable dedupe over app heuristics |
| **Shared parent email** | Two adults sharing one inbox are one principal and see the same authorized set |
| **Multiple parents on one athlete** | Each parent only sees enrollments whose `Parent Email - Cleaned` matches **their** signed-in email |
| **Different seasons/programs** | Selection and switcher UI show `Program Instance Name Only` and `School Year` when present |

### Opaque selection (how it works)

1. Server mints `selectionKey = HMAC-SHA256(ATHLETE_AUTH_SECRET, "sel|v1|" + parentEmail + "|" + enrollmentId)` (base64url).
2. Client only ever sees/posts that opaque key (never the Airtable id).
3. `POST /api/auth/select-enrollment` resolves the key by recomputing HMACs for the session’s enrollment grant, re-checks live Active? + email match, then rewrites the httpOnly session cookie with `selectedEnrollmentId`.
4. Dashboard loaders use session selection only — URL params cannot authorize a different child.

## Required environment variables (names only)

| Variable | Purpose |
|----------|---------|
| `ATHLETE_AUTH_ENABLED` | Master switch (`true` to require sign-in for `/dashboard`) |
| `ATHLETE_AUTH_SECRET` | HMAC secret for session cookies and selection keys (≥32 chars) |
| `ATHLETE_AUTH_TOKEN_TTL_MINUTES` | Magic-link lifetime (default 15) |
| `ATHLETE_AUTH_SESSION_TTL_DAYS` | Session cookie lifetime (default 30) |
| `ATHLETE_AUTH_TEST_MODE` | When `true`, all sends go to test recipient only |
| `ATHLETE_AUTH_TEST_RECIPIENT` | Default `schmidt@fairfieldbasketballclub.com` |
| `RESEND_API_KEY` | Resend API key for magic-link sends |
| `RESEND_FROM_EMAIL` | Verified sender address in Resend |
| `UPSTASH_REDIS_REST_URL` | **Required in Production** — shared token store across Vercel instances |
| `UPSTASH_REDIS_REST_TOKEN` | **Required in Production** — pairs with URL above |
| `ATHLETE_AUTH_DEV_BYPASS` | Non-production only — skip email, log magic link to server console |

Existing vars unchanged: `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`, `SITE_ACCESS_TOKEN`, `NEXT_PUBLIC_*`.

## Routes

| Path | Role |
|------|------|
| `/dashboard/sign-in` | Request access form |
| `/api/auth/magic-link` | POST — issue token + send email |
| `/api/auth/verify` | GET — consume token, set session, redirect to `/dashboard` or `/dashboard/select` |
| `/api/auth/select-enrollment` | POST — bind opaque selection key into session, redirect to `/dashboard` |
| `/api/auth/sign-out` | POST — clear session |
| `/dashboard/select` | Multi-child secure selection (auth required) |
| `/dashboard` | Protected when auth enabled; session-selected child only |

Public catalog routes (`/leaderboard`, `/athletes/[slug]`, etc.) are unchanged. Staff `/dashboard/preview` remains behind `SITE_ACCESS_TOKEN` and is not part of parent UX.

## Mike manual steps before Production

See **[SC-112 Preview and Production checklist](../deploy-checklists/SC-112-athlete-auth-preview-and-production.md)** for Preview setup, test procedure, Production enablement, and rollback.

Summary:

1. Set Vercel Preview env vars (names in table above).
2. Confirm Resend sender domain and `RESEND_FROM_EMAIL`.
3. Optionally provision Upstash Redis for token store in Production.
4. Complete Preview proof with `ATHLETE_AUTH_TEST_MODE=true` and schmidt@ delivery only — include a multi-child parent email when available.
5. Enable `ATHLETE_AUTH_ENABLED=true` in Production only after Preview evidence and Mike approval.
6. Do **not** set `ATHLETE_AUTH_TEST_MODE=false` or send real family magic links until a separate approved cutover.
