# Athlete Authentication Decision — SC-112

**Agent 6 overnight groundwork** · 2026-07-23 · **Decision owner: Mike** (unchanged)

Purpose: give Mike everything needed to pick an auth approach for real athlete
dashboards/profiles. Nothing in this doc changes runtime behavior; the site
still serves clearly-labelled demo data on `/dashboard` and `/athletes/[slug]`.

---

## Context and constraints

- Users are **minors** (K–12 athletes); parents are the actual account holders for younger athletes.
- Family reality: shared devices, siblings in the same program, parents managing multiple athletes.
- Data at stake if auth is broken: name, school, grade, XP/progress, homework/video activity, weekly summaries. No payment data. Parent emails/phones exist in Airtable but are **never** fetched by the web app today, and should stay server-side even post-auth.
- The web app is read-only; submissions flow through Fillout/Make/Lambda. First auth slice only needs **read access to one family's athletes**.
- No user database exists; Airtable is the system of record.

## Options compared

| Criterion | A. Magic-link email (parent) | B. Parent/athlete shared access code | C. Password accounts | D. PIN + identity pick | E. External provider (Clerk/Auth.js+provider) |
|---|---|---|---|---|---|
| How it works | Parent enters known enrollment email → tokenized link → session cookie scoped to their athletes | Program hands each family a private code/URL (like `SITE_ACCESS_TOKEN` per family) | Email+password accounts with reset flows | Athlete picks name from list + enters PIN | Hosted auth UI; sessions managed by provider; map identity → enrollment |
| Privacy for minors | Strong — parent-mediated, no child credentials | Medium — code sharing risk; codes leak in group chats | Weak-medium — kids' passwords, COPPA-ish concerns | **Weak — public name list is itself a data exposure; PINs guessable** | Strong if parent-mediated |
| Implementation effort | Medium — token issue/verify + email send (Make or Resend) + session cookie; no DB if tokens are signed/stateless with Airtable lookup | **Low** — extends the existing site-access middleware pattern per family | High — password store, hashing, resets → really means adopting a framework anyway | Low-medium but unacceptable exposure | Medium — SDK integration, but identity→Airtable mapping still needs building |
| Maintenance | Low — no passwords to reset; email deliverability is the main risk | Low tech / **high human** — rotating leaked codes manually | High | Low | Low-medium; vendor dependency + free-tier limits |
| Account recovery | "Send me a new link" (self-service) | Ask Mike for new code (manual) | Reset emails (must build) | Ask Mike | Provider handles |
| Data-exposure blast radius | One family per token; tokens expire | One family per code; codes long-lived → larger window | Per account | Everyone in list visible pre-auth | Per account |
| Cost | ~free (email sends only) | Free | Free but time-expensive | Free | Free tier likely OK at this scale (<100 families) |

## Recommendation (engineering view — Mike decides)

**Option A: parent magic-link email**, with **Option B as an interim bridge** if
Mike wants family access before email infrastructure is wired.

Reasons:

1. Parent email is already the verified identity anchor in Enrollments — no new identity data collected, aligning with the minors constraint.
2. No passwords for children, no reset burden, no third-party PII processor.
3. Reuses proven pieces: server-side Airtable lookups, httpOnly session cookie exactly like the existing site-access middleware, Make (or Resend) for the send.
4. Clean upgrade path: if requirements grow (roles, staff admin login), the session layer can later be swapped for Clerk/Auth.js without redoing the enrollment mapping.

Rejected outright: **Option D (PIN + pick-your-name)** — the athlete picker itself
leaks the roster and PINs offer no real security for a child's progress data.

## Safe abstractions implemented / already in place (no false security claims)

- `web/lib/security/` — token read/compare + cookie helpers (deployment gate today; the session-cookie pattern a magic-link flow would reuse).
- `middleware.ts` — request gate with API 401 / page 401 split; a protected-route matcher for `/dashboard` + `/athletes/*` can extend this.
- `NON_CUTOVER_READY_ROUTES` in `lib/release/public-surface.ts` — release tests assert these stay demo/gated.
- Mock views badge themselves "Demo data" so nobody mistakes current pages for authenticated ones.

Deliberately **not** built tonight: fake login forms, placeholder "sign in" buttons,
or half-wired session logic — anything that could look authenticated without being so.

## What Mike needs to decide

1. Approach (A recommended; B interim acceptable; E if he prefers hosted).
2. Email sender for magic links (Make scenario vs Resend/Postmark from Vercel).
3. Session length (suggest 30 days, same as current site-access cookie).
4. Whether athletes get their own view or families share one dashboard listing all their athletes (recommend the latter first).

After the decision: implementation is SC-111/SC-112 work — enrollment slug/token
fields need Mike-authorized schema additions before any build.
