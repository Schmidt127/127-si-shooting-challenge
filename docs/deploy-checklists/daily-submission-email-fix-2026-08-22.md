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

Not used for apex shoot aliases — those live on the landing hub (below).

### 3. Landing hub (`127si-landing-page` / `hoopchallenges-landing`)

1. Merge/push `master` with `web/next.config.ts` shoot alias redirects.
2. Confirm Vercel production deploy for project `hoopchallenges-landing`.
3. Live-verify on https://www.fairfieldbasketballclub.com:
   - `/shooting` → `/shoot`
   - `/shootingchallenge` → `/shoot`
   - `/shootchallenge` → `/shoot`
   - `/challengeshooting` → `/shoot`

### 4. Airtable Production — **076 v8.11** (required)

Paste from GitHub (docblock through end; skip GitHub header):

`airtable/automations/shooting-challenge/076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js`

Automation name in Airtable: **076 - Daily Submission Communications Hub Handoff**

Payload must include `homeworkPageUrl`:
`https://www.fairfieldbasketballclub.com/shoot/homework`

**Do not paste until Hub deploy is live** — template expects new optional payload fields but remains backward compatible.

### 5. Controlled send proof

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
