# Athlete dashboard auth — parent magic-link (SC-112)

**Status:** Built in repository (single-child + multi-child via merged PR **#373**) · Vercel-gated (`ATHLETE_AUTH_ENABLED`) · Magic-link **works** in Production · Multi-child **PARTIAL / NEEDS-MIKE** (evidence **#380**: ≥2 disposable Active enrollments present; authenticated select → switch → sign-out walkthrough still incomplete). Do not treat multi-child as **PRODUCTION-VERIFIED** from unit/Playwright coverage alone.

Authority: [ATHLETE-AUTH-DECISION.md](../../docs/overnight/web-integration/ATHLETE-AUTH-DECISION.md) (Option A — parent magic-link email) · Ops checklist: [SC-112 Preview and Production](../../docs/deploy-checklists/SC-112-athlete-auth-preview-and-production.md)

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

Behavior shipped in PR **#373** (`feature/sc-112-multi-child-auth`). One parent magic-link session can authorize every **active** Enrollment whose `Parent Email - Cleaned` matches the signed-in email.

**Verification status:** Repository + offline/Playwright coverage exist. Second disposable Active enrollment **present** (PR **#380**). Magic-link **works**. Multi-child remains **PARTIAL / NEEDS-MIKE** until Mike completes magic-link verify → `/dashboard/select` → switch → sign-out with no `enrollmentId=rec…` in the address bar. Do not mark multi-child PRODUCTION-VERIFIED from docs or unit tests alone.

### 1. One parent email, multiple children

Identity is the **parent email**, not the athlete. Magic-link issue and verify look up Enrollments with:

`AND({Active?}, LOWER({Parent Email - Cleaned}) = LOWER(signed-in email))`

All matching active rows become `session.enrollmentIds`. Siblings who share that cleaned parent email are one authorized family set under a single httpOnly `athlete_session` cookie (`v:2`).

### 2. Single-child automatic routing

If verify finds **exactly one** active enrollment:

- Session is written with `selectedEnrollmentId` set to that enrollment
- Browser redirects straight to `/dashboard` (no selection step)

If a multi-child session later shrinks to one live active enrollment (intersect), `/dashboard/select` auto-redirects to `/dashboard` for that remaining child.

### 3. Multiple-child selection (`/dashboard/select`)

If verify finds **two or more** active enrollments:

- Session is written with `selectedEnrollmentId: null` and the full grant in `enrollmentIds`
- Browser redirects to `/dashboard/select` (“Choose athlete”)
- UI lists each child with program/season labels and an **opaque selection key** (never an Airtable id)
- Parent POSTs the chosen key to `/api/auth/select-enrollment`; server binds `selectedEnrollmentId` and redirects to `/dashboard` with a **clean URL** (no enrollment query param)
- **JSON clients** receive app-relative `redirectTo: "/dashboard"` for `router.push` (Next.js prepends `/shoot`). Returning `/shoot/dashboard` here caused Production 404s at `/shoot/shoot/dashboard`.
- **HTML form POSTs** (no JS) still get an absolute `303` Location via `buildAbsoluteAuthRedirectUrl` (`…/shoot/dashboard`)

### 4. Active versus inactive enrollments

| Rule | Behavior |
|------|----------|
| Magic-link lookup | Only enrollments with `Active?` checked |
| Every private load / switch | Re-fetches live Active? rows for the parent email, then **intersects** with `session.enrollmentIds` |
| Selected child becomes inactive | Selection no longer matches; parent is sent to `/dashboard/select` (or empty state if none remain) |
| Inactive / past-season rows | Not granted at sign-in and not restorable via URL or cookie alone |

### 5. Multiple programs or seasons

Distinct Enrollment rows (different Program Instances, School Years, or duplicate athlete rows) are **separate selectable options**. The select UI and family switcher show `Program Instance Name Only` and `School Year` when present so parents can tell siblings or seasons apart. The app does not collapse duplicates; prefer Airtable dedupe over UI heuristics.

### 6. Secure switching

After a child is selected, the dashboard family switcher can change children without a new magic link:

1. Client POSTs another opaque `selectionKey` to `/api/auth/select-enrollment`
2. Server resolves the key against the **session grant only** (HMAC recompute)
3. Server re-checks **live** Active? + parent-email match + membership in `session.enrollmentIds`
4. On success, rewrites the httpOnly cookie with the new `selectedEnrollmentId` (same `exp` / grant)
5. On failure, returns forbidden / redirects back to select — raw `rec…` bodies are rejected

### 7. No enrollment IDs in URLs

Hard rule for parent UX:

- `/dashboard` and `/dashboard/select` never put Airtable `rec…` IDs in path or query
- Switcher/select forms use opaque keys only; `POST /api/auth/select-enrollment` rejects raw enrollment IDs
- Legacy `?enrollmentId=` bookmarks are **ignored** for authorization and stripped (clean `/dashboard`)
- Browser history / share / screenshots therefore do not leak enrollment record IDs

Selection lives only in the signed httpOnly cookie (`selectedEnrollmentId` is server-side).

### 8. Session expiration and sign-out

| Mechanism | Behavior |
|-----------|----------|
| Session TTL | `ATHLETE_AUTH_SESSION_TTL_DAYS` (default **30**). Cookie carries HMAC payload with `exp`; expired tokens fail verify and require a new magic link |
| Magic-link TTL | `ATHLETE_AUTH_TOKEN_TTL_MINUTES` (default **15**), single-use; separate from session lifetime |
| Sign-out | `POST /api/auth/sign-out` clears the `athlete_session` cookie. Next `/dashboard` visit requires sign-in again |
| Mid-session revoke | If all authorized enrollments go inactive, dashboard/select show empty / no-active state; cookie may still exist until expiry or sign-out but cannot load private athlete data |

### 9. Shared parent-email policy

| Situation | Policy |
|-----------|--------|
| Two adults share one inbox / one `Parent Email - Cleaned` | Treated as **one principal**. Same authorized enrollment set; whoever opens the magic link can select any active child for that email |
| Same athlete listed under two different parent emails | Each signed-in email only sees enrollments where **their** `Parent Email - Cleaned` matches — no cross-parent spill |
| Operational note | Shared inboxes are a family choice, not a product multi-user ACL. Do not invent per-adult accounts on top of cleaned parent email without a new Master Future Work List decision |

### 10. Future alumni policy (open decision)

**Not implemented.** Auth grants only **active** enrollments today. Whether graduated / inactive athletes (alumni) should keep read-only dashboard access, season archives, or a separate alumni login is an **open product decision** — do not imply alumni access in parent copy or ops runbooks until SC-112 (or a follow-on ID) records an approved policy and implementation.

### Opaque selection (how it works)

1. Server mints `selectionKey = HMAC-SHA256(ATHLETE_AUTH_SECRET, "sel|v1|" + parentEmail + "|" + enrollmentId)` (base64url).
2. Client only ever sees/posts that opaque key (never the Airtable id).
3. `POST /api/auth/select-enrollment` resolves the key by recomputing HMACs for the session’s enrollment grant, re-checks live Active? + email match, then rewrites the httpOnly session cookie with `selectedEnrollmentId`.
4. Dashboard loaders use session selection only — URL params cannot authorize a different child.

### Behavior matrix (quick reference)

| Situation | Behavior |
|-----------|----------|
| **One active enrollment** | Verify sets `selectedEnrollmentId` → `/dashboard` |
| **Multiple active enrollments** | Verify → `/dashboard/select` → opaque key POST → `/dashboard` |
| **Switching children** | Family switcher POSTs opaque key; live Active? + email + grant re-check |
| **Back button / bookmarks** | No `rec…` in URLs; legacy `?enrollmentId=` stripped / ignored |
| **Inactive enrollments** | Excluded from lookup and live intersect; lost selection → select or empty |
| **Duplicate / multi-season rows** | Separate selectable rows labeled by program/season |
| **Shared parent email** | One principal, shared authorized set |
| **Multiple parents on one athlete** | Each parent sees only their cleaned-email enrollments |
| **Alumni / inactive past seasons** | Open decision — not granted today |

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
4. Complete Preview proof with `ATHLETE_AUTH_TEST_MODE=true` and schmidt@ delivery only.
5. **Multi-child proof (required before claiming Production multi-child):** parent email with ≥2 **active** enrollments → magic-link → `/dashboard/select` → switch → sign-out; confirm no `enrollmentId=rec…` in the address bar. Disposable multi Active data is present (**#380**); signed-in walkthrough still **NEEDS-MIKE**. Do not claim PRODUCTION-VERIFIED multi-child without that live evidence.
6. Enable `ATHLETE_AUTH_ENABLED=true` in Production only after Preview evidence and Mike approval.
7. Do **not** set `ATHLETE_AUTH_TEST_MODE=false` or send real family magic links until a separate approved cutover.
