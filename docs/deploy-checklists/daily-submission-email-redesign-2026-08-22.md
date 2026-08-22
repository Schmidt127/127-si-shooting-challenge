# Daily Submission email redesign — promotion checklist

Status: **Repository-ready / promotion pending**
Production change: **Not applied by Cursor**

## Scope

Full React Email redesign for `DAILY_SUBMISSION` in Communications Hub, plus
Automation **076 v8.8** payload enrichment for the new template fields.

## Communications Hub (Vercel)

Repo: `127si-communications-hub` (`communications`)

1. Merge/push to `main` (auto-deploys `communications-two-blue.vercel.app`).
2. Confirm Vercel build succeeds.
3. Controlled test: send one `DAILY_SUBMISSION` ingest with `testMode: true`.
4. Verify Message subject:
   `Daily Submission for {Athlete Name} – Check Your Progress`
5. Verify HTML includes: logo, `Great Job, {Athlete Name}!`, scoreboard cards,
   homework section, `View My XP Page`, footer links, no weekly totals block.

## Airtable — Automation 076 v8.8

Repo: `127-si-shooting-challenge`

1. Open Production Automation **076 - Daily Submission Communications Hub Handoff**.
2. Paste committed **v8.9** source (docblock through end; skip GitHub header).
   v8.9 includes the 057-aligned goal settlement fix required for settled
   10,000 / 1,111… weeks (see `docs/deploy-checklists/076-v8.9-goal-settlement-fix.md`).
3. Confirm input `recordId` mapping unchanged.
4. Trigger one Schmidt test Submission through 031 → 076 → 079.
5. Confirm queue payload includes:
   - `weekDateRange`
   - `shootingPercentage`
   - `homeworkItems[]` (when PHA exists)
   - `xpPageUrl`
   - `landingPageUrl`, `shootPageUrl`, `dailySubmissionFormUrl`

## Notes

- Sunday summary copy in the daily email says **7:00 a.m. Sunday** per product
  request. Automation **119** weekly email schedule remains **Sunday 10:00 AM
  America/Denver** until intentionally changed.
- Homework status labels: Complete, In progress, Not submitted, Pending review.
- `xpPageUrl` uses `/shoot/athletes/{slug}` when Public Profile Enabled + slug;
  otherwise `/shoot/dashboard`.
