# Daily Submission email fix — 2026-08-22

## Scope

End-to-end Daily Submission email improvements:

- Communications Hub template (copy, layout, conditional shooting stats, logo, level graphics, homework)
- Automation **076 v8.10** payload (homework PHA grade filter, `submissionStatMode`, `shootingDetails`, level image URLs)
- Web route aliases → `/shoot`

## Production promotion

### 1. Communications Hub (`127si-communications-hub`)

1. Merge/push `main` with template + `public/email/brand/logo-v1-blue-orange.png`.
2. Confirm Vercel production deploy at `https://communications-two-blue.vercel.app`.
3. Verify logo URL loads: `/email/brand/logo-v1-blue-orange.png`.

### 2. Shooting Challenge web (`127-si-shooting-challenge` / `web`)

1. Merge/push `master` with `web/vercel.json` redirect aliases.
2. Confirm Vercel production deploy for project `127-si-shooting-challenge`.
3. Smoke-test redirects (if domain mounts this project at root):
   - `/shooting` → `/shoot`
   - `/shootingchallenge` → `/shoot`
   - `/shootchallenge` → `/shoot`
   - `/challengeshooting` → `/shoot`

**Note:** If Fairfield landing owns the apex domain and only mounts this app at `/shoot`, apex aliases may require a matching landing-project redirect. Test on production after deploy.

### 3. Airtable Production — **076 v8.10** (required)

Paste from GitHub (docblock through end; skip GitHub header):

`airtable/automations/shooting-challenge/076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js`

Automation name in Airtable: **076 - Daily Submission Communications Hub Handoff**

**Do not paste until Hub deploy is live** — template expects new optional payload fields but remains backward compatible.

### 4. Controlled send proof

1. Re-arm Curtis test submission (`recwofzVvYsAYMibR`) or Schmidt test submission.
2. Confirm queue payload includes:
   - `submissionStatMode`
   - `homeworkItems` for Perfect Testing Week (7-8 band)
   - `currentLevelImageUrl` / `nextLevelImageUrl` when Levels cover images exist
   - athlete-specific `xpPageUrl`
3. Confirm received email: logo, session details first, correct shot display mode, homework list, updated copy.

## Homework root cause (code fix)

PHA filter previously excluded rows with **blank Grade Band** when enrollment had a grade band. Legacy Homework Library path already allowed blank grade; PHA path now matches (`072`/legacy parity).

No Production data change required if PHA rows are active and linked correctly.
