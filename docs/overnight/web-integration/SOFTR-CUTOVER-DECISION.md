# Softr Cutover Decision — SC-114

**Agent 6 overnight** · 2026-07-23 · **Decision owner: Mike** · No cutover action taken tonight.

Authoritative operational checklist: `docs/deploy-checklists/SOFTR-CUTOVER-READINESS.md`
(2026-07-18). This doc updates the *decision picture* with overnight findings; the
checklist remains the execution runbook.

---

## Current Softr usage (best repo knowledge)

- Softr historically served the participant catalogs/leaderboard; the Next.js app at `/shoot` was built as its replacement and runs in **dual-run** mode (both alive, `/shoot` noindexed).
- The Softr dependency that survives in *data* is naming only: `OK to Publish on Softr` (Tutorials publish flag) and `Level Sort Order - For Softr` (Enrollments) — both consumed by the web app and renamable only in a coordinated wave (SC-144).
- The verified Softr page inventory in the readiness checklist is still **TBD — Mike must export it from the Softr dashboard**. Repo cannot see Softr.

## Replacement readiness after tonight

| Surface | Ready? | Change tonight |
|---------|--------|----------------|
| Home, leaderboard, homework, tutorials, shoutouts, articles, levels, achievements, zoom, public display | **Yes** — live Airtable, designed empty/error states verified against empty PROD behavior | Error messages hardened (no Airtable internals) |
| Game manual | **Yes, improved** — now renders live XP rules + level ladder from config in addition to the Adobe link | New this session |
| Athlete dashboard / profiles | **No** — demo data pending SC-112 auth decision | Decision doc written (`ATHLETE-AUTH-DECISION.md`) |
| Admin | Placeholder (out of cutover scope) | Roadmap doc updated |

**Parity gaps that gate hard cutover:** real athlete profiles/dashboard (only if
Softr actually served equivalents — Mike confirms from inventory), and any
Softr page not on the route map.

## Cutover checklist (condensed decision view)

1. Mike fills the Softr inventory table in the readiness doc.
2. Soft cutover: point landing/email links to `/shoot/...`; keep Softr alive.
3. Redirect map for old Softr URLs (implement on landing or in Softr).
4. Parent communication about new links.
5. 48-hour monitor (Vercel errors + Airtable API usage), Softr untouched.
6. noindex removal is a **separate decision** (see `INDEXING-SEO-DECISION.md`) — can happen at soft cutover or later.
7. Softr decommission only after Mike's written approval; never in the first window.

**Rollback:** restore Softr links, promote previous Vercel deployment, re-add
noindex if flipped — full path in readiness doc §7.

## DNS / deployment considerations

- `/shoot` is mounted via landing Vercel rewrite on `hoopchallenges.com` — cutover requires **no DNS change**; it is a link-and-redirect exercise.
- Vercel project root `web`, production branch `master`; env vars already set in Vercel dashboard.

## Recommendation

Proceed to **soft cutover** (links + redirects, Softr alive, noindex still on)
once Mike: (a) fills the Softr inventory, (b) spot-checks catalogs on a real
deploy against rebuilt PROD data. Real-data seeding (Weeks, Levels, Achievements
— manual per confirmed direction) makes that spot-check meaningful. Hard cutover
and indexing remain separate later decisions.
