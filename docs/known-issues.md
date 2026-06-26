# Known issues — Shooting Challenge

## Active

### Web app

- **Root URL 404** — `www.hoopchallenges.com/` 404 until landing hub exists or `vercel.json` redirect `/` → `/shoot` is deployed. `/shoot` works.
- **Achievements page** — Shell only; Airtable reads not wired yet.
- **Athlete profiles** — Route exists; slug resolution and data not complete.
- **Pre-launch SEO** — `noindex` on sensitive routes until Softr cutover.

### Airtable / ops

- **Automation header placeholders** — Many scripts still say *confirm in Airtable* for trigger text in GitHub headers. Verify live trigger in Airtable UI when debugging.
- **Stage I/J** — Achievement XP and legacy field cleanup in progress. See [airtable/stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md).
- **`OK to Publish on Softr`** — Still used as public publish gate in web queries despite Softr replacement in progress.

### Documentation

- **JR Ref docs in repo** — Some `docs/jr-ref/` and `web/docs/jr-ref/` paths may remain from earlier monorepo work; JR Ref production app is `127-si-jr-ref`.

## Resolved

- Hub and multi-program routes removed (2026 rebuild → `/shoot` only; routes under `web/app/(program)/`).
- Stale `/shooting-challenge` back-links in components updated to `/`.
- Stages F–H pipeline audits clean after backfill pass (re-run after bulk imports).
- Broken `STRUCTURE.md` link removed from docs index (replaced by `PROJECT_STATE.md`).

## Accepted data exceptions

- Video / homework `not_ready_for_xp` rows — retakes, pending review, do-not-award, testing (not bugs).
- Riley W8 video XP at 25 points — correct per program rules.
