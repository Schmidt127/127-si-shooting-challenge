# SC-112 — Multi-child parent authentication design

**Status:** Design only (documentation) · **Not implemented**  
**Branch intent:** `docs/sc-112-multi-child-auth-design`  
**Authority:** [web/docs/athlete-auth-architecture.md](../../web/docs/athlete-auth-architecture.md) · [ATHLETE-AUTH-DECISION.md](../overnight/web-integration/ATHLETE-AUTH-DECISION.md) · [web/docs/public-data-rules.md](../../web/docs/public-data-rules.md)  
**Related backlog:** SC-112 (Built in Repository — parent magic-link); deploy checklist notes remaining “multi-enrollment family picker”

---

## Task Classification

| Field | Value |
|-------|--------|
| Type | Design / architecture documentation |
| Priority | P2 (unlocks correct multi-sibling private dashboard UX) |
| Difficulty | Medium |
| Owner | Cursor (doc) → Mike (decisions) → Cursor (future implementation) |
| Dependencies | SC-112 parent magic-link already in repo; Production `ATHLETE_AUTH_*` enablement separate |
| Backlog ID | SC-112 (extension of existing auth work) |
| Estimated Scope | Documentation only this pass |
| Phase | Phase 2 planning / Phase 3 prep (no code) |
| Correct tool | Cursor (repo docs) |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Review open decisions; approve before implementation |

---

## 1. Current state (how single-child / multi-enrollment works today)

Inspected on `origin/master` (worktree start SHA at design time). SC-112 parent magic-link is **built in repository** and feature-gated by `ATHLETE_AUTH_ENABLED` + `ATHLETE_AUTH_SECRET`.

### Auth flow today

1. Parent opens `/shoot/dashboard/sign-in` and submits parent email.
2. `POST /api/auth/magic-link` validates email (blocks personal Gmail), rate-limits, looks up **active** enrollments via `Parent Email - Cleaned` + `Active?`.
3. Uniform success message whether or not matches exist (no email enumeration).
4. If matches exist: opaque single-use token stored (hash only; Upstash Redis required in Production), magic-link email sent via Resend (test-mode may redirect delivery).
5. `GET /api/auth/verify?token=…` consumes token once, re-queries active enrollments, sets HMAC-signed httpOnly `athlete_session` cookie.
6. Session payload `v:1` contains `{ parentEmail, enrollmentIds[], exp }` — **not** a selected-child pointer.
7. `/dashboard` requires session when auth is configured; loads private data for one enrollment via `loadAuthorizedEnrollmentForSession`.
8. `POST /api/auth/sign-out` clears the session cookie.

### Multi-child behavior today (gap)

- Session already stores **all** authorized enrollment IDs for that parent email at verify time.
- Dashboard already loads `familyEnrollments` and renders a “Family athletes” switcher when `length > 1`.
- **Gap / security debt:** the switcher uses query param `?enrollmentId=<Airtable rec…>` and passes raw `enrollmentId` into the client as `enrollmentToken`. That violates the product rule “no Airtable/enrollment IDs in URL” and is weaker than opaque selection.
- Selection defaults to `enrollmentIds[0]` (Airtable list order), not an explicit child-selection page.
- Authorization re-check on load is good: server re-queries `findActiveEnrollmentsByParentEmail`, intersects with session `enrollmentIds`, and rejects URL IDs not in the session (`forbidden`).
- Public routes (`/leaderboard`, `/athletes/[slug]`, catalogs) remain unauthenticated; private panels (homework coach notes, video feedback, awards detail, enrollment details) load only through authenticated dashboard loaders.

### Identity and Airtable assumptions in use

| Concept | Current implementation |
|---------|------------------------|
| Parent identity | Normalized `Parent Email - Cleaned` on **Enrollments** |
| Authorization unit | Enrollment record (`rec…`), not Athlete person record alone |
| Active gate | `{Active?}` must be true to issue magic link and to remain selectable |
| Cap | `maxRecords: 25` on parent-email lookup |
| Program / season labels | Loaded later from enrollment fields (`Program Instance Name Only`, `School Year`) for dashboard chrome |
| Opaque keys elsewhere | `opaqueDashboardKey()` hashes record IDs for some dashboard list item keys — **not** yet used for family switching |

---

## 2. Architecture proposal

### Goals

Parents with one or many children share one magic-link identity (parent email). Authentication proves “this browser is that parent.” **Authorization** to view a child’s private dashboard is a separate, server-enforced binding that must never trust client-supplied Airtable IDs.

### Recommended model: parent session + selected enrollment binding

```text
┌─────────────┐   magic link    ┌──────────────────┐
│ Parent email│ ───────────────►│ athlete_session  │  parentEmail + enrollmentIds[]
└─────────────┘   verify once   │ (httpOnly HMAC)  │  + selectedEnrollmentId? (server-only)
                                └────────┬─────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              1 child               N children            0 active
           open dashboard      /dashboard/select        empty state
                                         │
                                         ▼ POST select (opaque ref)
                               re-bind selectedEnrollmentId
                               in session cookie (or companion cookie)
                                         │
                                         ▼
                              /dashboard (no enrollmentId in URL)
                              load ONLY that child’s private records
```

### Session shape (proposed v2)

Keep HMAC-signed cookie; bump version for clarity:

```ts
type AthleteSessionPayloadV2 = {
  v: 2;
  parentEmail: string;
  /** Authorized enrollment IDs at last successful verify / refresh (server-only). */
  enrollmentIds: string[];
  /**
   * Currently selected enrollment. Absent/null means:
   * - if enrollmentIds.length === 1 → treat as that one
   * - if length > 1 → force child-selection page
   */
  selectedEnrollmentId?: string | null;
  exp: number;
};
```

**Alternative (also acceptable):** keep `v:1` payload and store selection in a second signed httpOnly cookie `athlete_selection` with `{ selectedEnrollmentId, exp }`. Prefer **one cookie** (v2) to avoid split-brain expiry.

### Opaque client identifiers (required)

Never put `rec…` in URLs, HTML `href`s, or browser history for private switching.

| Mechanism | Recommendation |
|-----------|----------------|
| **A. Signed selection token (preferred for links/forms)** | Server issues short opaque tokens: HMAC(`enrollmentId|parentEmail|exp|nonce`) or AES-GCM of enrollmentId keyed by `ATHLETE_AUTH_SECRET`. Client posts token; server verifies signature + membership in session `enrollmentIds` + live Active? re-check. |
| **B. Session-only selection (preferred for steady state)** | After successful select, rewrite session cookie with `selectedEnrollmentId`. Dashboard URLs stay `/dashboard` with no query. Switcher is a form/POST or server action, not a GET with IDs. |
| **C. Hash map only** | `opaqueDashboardKey("enr", recId)` alone is **not enough** for authorization — hashes are guessable/stable and do not prove session binding. Use only as display keys **after** server maps them inside an authorized response. |

**Recommendation:** **B for steady state + A for the select POST body** (opaque token in form field). No enrollment IDs in query strings, path segments, or `localStorage`.

### Authorization pipeline (every private load)

1. Read and verify session cookie (signature + expiry).
2. Re-query Airtable: active enrollments for `session.parentEmail`.
3. Intersect with `session.enrollmentIds` (drop any that are no longer active or no longer match email).
4. Resolve selected child:
   - If one authorized → auto-select.
   - If many and no valid `selectedEnrollmentId` → redirect to selection page.
   - If `selectedEnrollmentId` not in live authorized set → clear selection, redirect to selection (or empty).
5. Load private dashboard payload **only** for that enrollment ID (server-side).
6. Never accept `searchParams.enrollmentId` / `slug` as an authorization source for private data.

### What does **not** change

- Magic-link email plane (Resend direct; Hub bypass documented).
- Uniform known/unknown email responses.
- Public leaderboard / athlete profile / catalogs.
- Web remains read-only for submissions (Fillout/Make/Lambda).

---

## 3. User flow (covers required behaviors 1–15)

### 1. Parent requests magic link with parent email

Unchanged: `/dashboard/sign-in` → `POST /api/auth/magic-link` with parent email. Validate format; block personal Gmail/Googlemail; rate-limit; uniform confirmation copy.

### 2. System finds all authorized active enrollments for that email

Unchanged lookup: `AND({Active?}, LOWER({Parent Email - Cleaned})=LOWER("…"))`.  
At **verify** time, freeze authorized set into `enrollmentIds[]`. Optionally include display metadata only in server memory for redirect decision (not required in cookie).

### 3. Magic link authenticates parent but does not authorize arbitrary enrollment IDs

Verify sets parent session only. Client cannot invent an enrollment ID and gain access: loaders must intersect session list ∩ live Active? ∩ matching parent email. Reject foreign IDs with generic forbidden/empty UX (no leakage of whether the ID exists).

### 4. One child → open that child’s dashboard

After verify: if `enrollmentIds.length === 1`, set `selectedEnrollmentId` to that ID and redirect to `/dashboard`. No selection UI.

### 5. Multiple children → secure child-selection page

After verify: if `enrollmentIds.length > 1`, redirect to `/dashboard/select` (name TBD). Page lists **only** authorized children’s display names (+ program/season labels), each with opaque select controls. No raw `rec` IDs in markup attributes that appear in View Source as Airtable IDs (use opaque tokens or POST-only forms).

### 6. Selection uses server-side authorization

`POST /api/auth/select-child` (or server action) accepts opaque token → verifies → re-checks live authorization → rewrites session with `selectedEnrollmentId` → redirects to `/dashboard`.

### 7. No Airtable/enrollment IDs in URL

Remove `?enrollmentId=` from family switcher. Dashboard, select, and switch routes use path-only private URLs (`/dashboard`, `/dashboard/select`). Public profile links may still use **public slug** (`/athletes/[slug]`) — that is public-surface data, not private authorization.

### 8. Opaque signed server-validated identifier OR secure session state

Recommended: session-held `selectedEnrollmentId` (server-only) + opaque tokens only inside POST bodies for selection/switch. Do not rely on URL query tokens that linger in history/Referer.

### 9. Each dashboard shows only that child’s records

`loadPrivateAthleteDashboardPayload(enrollment)` already scopes homework, video feedback, awards, XP, weekly summaries to one enrollment. Keep that invariant; never merge siblings’ private rows into one payload.

### 10. Switching children re-checks authorization server-side

Switcher on dashboard posts to the same select endpoint (or dedicated switch). Always re-run live Active? + email match + session membership before rewriting selection.

### 11. Inactive / ended enrollment policy (recommendation)

| Situation | Recommended behavior |
|-----------|----------------------|
| Inactive at magic-link request | Exclude from lookup; no email if zero active (still uniform success). |
| Became inactive after session issued | Drop from live intersect; if was selected, clear selection and send to select page or empty state. |
| All enrollments inactive | Empty state: “No active enrollment found” + sign-out CTA; do not show historical private data in v1 of this design. |
| Mike wants alumni view later | Separate product decision — optional “past seasons (read-only)” gated list; **default off**. |

**Recommendation for v1:** **active-only** private dashboard access. Inactive enrollments are not listed on the child-selection page.

### 12. Different programs / seasons clearly separated

On selection and switcher UI, show:

- Athlete display name  
- Program label (`Program Instance Name Only` or equivalent)  
- Season / school year (`School Year`)  
- Optional status badge: Active  

If the same athlete person has two enrollments (e.g. consecutive seasons, both Active? — uncommon), treat them as **two selectable rows**, clearly labeled by season/program — never silently merge.

### 13. Sign-out clears session

`POST /api/auth/sign-out` clears `athlete_session` (and any companion selection cookie). After sign-out, `/dashboard` redirects to sign-in. Selection state must not survive in `localStorage` or URL.

### 14. Public leaderboard / athlete pages remain without login

No change to public-data rules. Leaderboard, public display, published athlete profiles, homework catalog, etc. stay anonymous.

### 15. Private homework, video feedback, parent details, coach notes, private awards remain protected

Continue to load only via authenticated dashboard loaders (`private-dashboard-loader`, XP activity loader). Middleware / page gates require session when `ATHLETE_AUTH_ENABLED`. Public profiles must continue to strip coach feedback, file URLs, parent email, phones, and record IDs per `public-data-rules.md`.

---

## 4. Authorization rules (normative)

1. **Identity principal** = normalized parent email from magic-link verify.
2. **Capability** = set of enrollment IDs where `Active?` is true AND `Parent Email - Cleaned` matches principal (case-insensitive).
3. **Session grant** = snapshot of capability at verify (and optionally refreshed on each private request by re-intersecting).
4. **Selected subject** = one enrollment ID from the live grant; required when grant size > 1.
5. **Private data access** requires (session valid) ∧ (enrollment ∈ live grant) ∧ (enrollment === selected subject).
6. **URL/query enrollment IDs are never authoritative**; ignore or hard-reject if present during migration.
7. **Slug is not an authz key** for private data (public profile only).
8. **Errors are non-enumerating:** forbidden vs empty should not reveal whether a guessed enrollment ID exists outside the family.
9. **Sign-out / expiry** removes all private capability in that browser.

---

## 5. Airtable relationship assumptions

```text
Athlete (person)
    │
    └──< Enrollments (per program instance / school year)
              │  Parent Email / Parent Email - Cleaned
              │  Active?
              │  Public Profile Slug
              │  Program Instance, School Year
              ├── Submissions, Homework Completions, Video Feedback
              ├── Weekly Athlete Summaries, XP Events
              └── Award Recipients, Achievement Unlocks
```

- **Authz attaches to Enrollment**, because private progress is enrollment-scoped and parent email lives on the enrollment.
- Multiple enrollments may share one parent email (siblings) or one athlete across seasons.
- There is **no separate Parents table** in the current web auth path; two adults sharing one inbox share one principal.
- Secondary parent emails / athlete emails are **not** used for SC-112 magic-link today (`Welcome Email To` may prefer parent then athlete — out of scope unless Mike expands identity).

---

## 6. Security requirements

| Control | Requirement |
|---------|-------------|
| Session cookie | httpOnly, Secure (prod), SameSite=Lax, Path=/, HMAC integrity |
| Magic-link token | 32-byte random; store SHA-256 hash only; single-use consume; short TTL (default 15m) |
| Token store | Upstash Redis in Production (cross-instance) |
| Enumeration | Uniform magic-link success; generic verify errors |
| Rate limits | Per email + per IP |
| Gmail block | Keep unless Mike changes registration policy |
| No secrets in client | No API tokens, raw magic links in HTML, or private Airtable fields in public bundles |
| No rec IDs in private URLs | Enforce in UI + tests |
| CSRF | Prefer SameSite cookie + POST for selection; Next.js server actions with origin checks if used |
| Cache | Private dashboard responses must not be CDN-cached as public (`noindex` + private cache headers) |
| Referer leakage | Avoid putting tokens in query strings that third parties might log |
| Minors | Parent-mediated identity only; no child passwords |

---

## 7. UI recommendation

### Sign-in

Keep current calm parent form. No roster preview before authentication.

### Child selection (`/dashboard/select`)

- One job: choose which athlete dashboard to open.
- List rows: **first name / full athlete name**, program, season.
- Primary CTA per row: “Open dashboard” (POST).
- Sign-out in header.
- Empty / all-inactive: clear explanation + request new link / contact support copy (no technical IDs).
- Privacy: do not show other families; do not show school-wide roster; do not show parent email on the page body (optional masked “Signed in as parent” is OK if product wants confirmation — Mike decision).

### Dashboard (single child view)

- Title = selected athlete name.
- Compact family switcher when >1 authorized: names only; switching via POST/server action.
- Show program · season in meta line (already present).
- Sign-out always available.
- Remove GET `?enrollmentId=` links.

### Anti-patterns to avoid

- Card-grid “family hub” that loads every child’s private homework/feedback into one page.
- Dropdown that encodes `rec…` in the value attribute visible in HTML.
- Auto-playing through siblings’ private coach notes.

---

## 8. Edge cases

| Edge case | Recommended handling |
|-----------|----------------------|
| **One parent email, multiple children** | Select page → session selection → one-child dashboard; switcher re-auths. |
| **Two parents sharing one email** | Treated as one principal; both see the same authorized set. Operational guidance: prefer unique parent emails when possible. |
| **One child, multiple enrollments** | Separate selectable rows labeled by program/season; never merge private datasets. |
| **Inactive enrollments** | Excluded from authz grant and selection list (v1). |
| **Multiple seasons** | Separate by School Year / Program Instance labels on select UI. |
| **Wrong / changed parent email** | Magic link only matches current `Parent Email - Cleaned`. Changed email → no link content (uniform success); ops update Airtable. Old sessions expire by TTL or fail live intersect. |
| **Duplicate enrollments** | If two Active? rows truly duplicate the same athlete+season, both may appear until data cleanup; selection still per enrollment ID. Prefer Airtable dedupe over app heuristics. |
| **Child-selection privacy** | Only names/program/season for **authorized** enrollments; no cross-family discovery; page `noindex`. |
| **Browser back-button** | After select, `/dashboard` has no ID in URL so back from public pages is safe. Back to `/dashboard/select` is OK. If user had old `?enrollmentId=` bookmarks, ignore param and use session selection (optionally strip via redirect). |
| **Magic-link reuse** | Second consume → `used` error; must request new link. Session cookie remains until expiry/sign-out if already established. |
| **Session expiration** | Expired HMAC → redirect sign-in; selection cleared with cookie. |
| **Enrollment removed from family mid-session** | Live intersect drops it; if selected, force re-select or empty. |
| **maxRecords 25 exceeded** | Unlikely; if hit, document support path and consider pagination — open decision if families can exceed. |

---

## 9. Test plan (for future implementation)

### Unit / Vitest

- Session v2 encode/verify; selection absent vs present.
- Opaque select token forge rejected; expired token rejected.
- `loadAuthorizedEnrollmentForSession` ignores URL enrollment IDs (or rejects migration param).
- Intersect drops inactive / email-mismatched IDs.
- Private loader never called with unauthorized enrollment.

### Playwright / privacy

- One-child family: verify → lands on dashboard; no select page; no `rec` in URL.
- Multi-child: verify → select page → choose child → dashboard for that child only.
- Switch sibling: POST switch → other child’s private sections; previous child’s coach notes absent from DOM.
- Forged opaque token / foreign enrollment → access denied / re-select; no private data.
- Sign-out → dashboard redirects; select page redirects.
- Magic-link reuse rejected.
- Anonymous `/leaderboard` and `/athletes/[slug]` still work.
- Authenticated HTML/JSON must not contain `Parent Email`, phones, Stripe/Fillout IDs, or raw `rec` in switcher hrefs.
- `?enrollmentId=rec…` must not authorize or appear in new switcher links.

### Manual Preview (Mike)

- Use known multi-athlete parent email in test mode.
- Confirm Resend test recipient only while `ATHLETE_AUTH_TEST_MODE=true`.

---

## 10. Open decisions Mike must make

1. **Inactive / alumni access:** Confirm **active-only** for v1, or allow read-only past enrollments?
2. **Selection UX:** Dedicated `/dashboard/select` page (recommended) vs inline-only switcher after landing on first child?
3. **Default when multi-child and no selection:** Always force select page (recommended) vs remember last child across sessions?
4. **Remember last child:** Persist `selectedEnrollmentId` for full session TTL (recommended) vs clear selection every new magic-link verify?
5. **Show “Signed in as …”** with masked email on select/dashboard?
6. **Same athlete, multiple active enrollments:** Confirm show as separate season/program rows (recommended).
7. **Expand identity beyond `Parent Email - Cleaned`?** (e.g. secondary parent, athlete email) — default **no** for this design.
8. **Shared inbox policy:** Accept two parents / one email as one principal, or require unique emails operationally?
9. **Remove vs ignore legacy `?enrollmentId=`:** Hard reject (403 UI) vs silent ignore + strip (recommended during transition: **ignore + redirect clean URL**).
10. **Hub template later:** Keep Resend-direct for magic links, or schedule `DASHBOARD_MAGIC_LINK` Hub work?
11. **Production enablement timing:** Multi-child hardening before or after flipping `ATHLETE_AUTH_ENABLED` in Production?
12. **Backlog ID:** Track as SC-112 follow-on vs new Master Future Work List ID (e.g. SC-15x)?

---

## 11. Proposed code changes (LIST ONLY — do not implement in this pass)

1. Extend `AthleteSessionPayload` to v2 with optional `selectedEnrollmentId` (or companion signed cookie).
2. Update `createSignedAthleteSessionToken` / verify helpers and unit tests for v2.
3. Change `verifyMagicLinkToken` redirect: 0 → error/empty path; 1 → select in session + `/dashboard`; N → `/dashboard/select`.
4. Add `/dashboard/select` page (server component) listing authorized children with program/season labels.
5. Add `POST /api/auth/select-child` (or server action) with opaque token validation + live re-authz + session rewrite.
6. Remove family switcher `href` query `enrollmentId=rec…` in `athlete-dashboard-view.tsx`; replace with POST switcher.
7. Stop accepting `urlEnrollmentId` as authz input in `loadAuthorizedEnrollmentForSession` / dashboard page (migrate to session selection only).
8. Ensure client props use opaque keys (`opaqueDashboardKey` or signed tokens), never raw `enrollmentId`, for switcher identity.
9. Update middleware / protected-path docs if `/dashboard/select` needs the same gate as `/dashboard`.
10. Add privacy Playwright cases for multi-child URL cleanliness and sibling isolation.
11. Update `web/docs/athlete-auth-architecture.md` routes table and SC-112 deploy checklist “Remaining work” once implemented.
12. Optionally refresh session `enrollmentIds` on each private request from live Airtable intersect (recommended hardening).

**Out of scope for that implementation slice:** Airtable schema changes, automations 003/101/117/SC-147, Hub/Resend production cutover, Softr, public leaderboard changes.

---

## 12. Mapping to the 15 required behaviors

| # | Behavior | Design section |
|---|----------|----------------|
| 1 | Parent requests magic link with parent email | §3.1 |
| 2 | Find all authorized active enrollments | §3.2, §5 |
| 3 | Auth ≠ arbitrary enrollment authorization | §3.3, §4 |
| 4 | One child → that dashboard | §3.4 |
| 5 | Multiple → secure selection page | §3.5, §7 |
| 6 | Server-side authorization on select | §3.6, §4 |
| 7 | No Airtable IDs in URL | §3.7, §2 |
| 8 | Opaque signed ID or session selection | §2, §3.8 |
| 9 | Dashboard = one child’s records | §3.9 |
| 10 | Switch re-checks server-side | §3.10 |
| 11 | Inactive/ended policy | §3.11 |
| 12 | Programs/seasons separated | §3.12 |
| 13 | Sign-out clears session | §3.13 |
| 14 | Public pages stay public | §3.14 |
| 15 | Private panels stay protected | §3.15, `public-data-rules.md` |

---

## 13. Summary recommendation

Ship a **parent-authenticated session** that lists authorized enrollments, force an explicit **child selection** when more than one is active, bind the choice in the **signed httpOnly session** (no `rec` in URLs), and **re-validate Active? + email match** on every private load and every switch. Keep public surfaces unchanged and private coach/homework/feedback data enrollment-scoped.

This closes the current multi-child gap where the UI already lists siblings but switches via raw Airtable enrollment IDs in the query string.
