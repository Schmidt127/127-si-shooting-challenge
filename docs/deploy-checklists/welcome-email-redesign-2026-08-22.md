# Welcome Email redesign — promotion checklist

Status: **Repository-ready / promotion pending**
Production change: **Not applied by Cursor**

## Scope

Full React Email redesign for `WELCOME` in Communications Hub, plus Automation
**078A v1.4** payload enrichment for the new template fields.

## Communications Hub (Vercel)

Repo: `127si-communications-hub` (`communications`)

1. Merge/push to `main` (auto-deploys `communications-two-blue.vercel.app`).
2. Confirm Vercel build succeeds.
3. Controlled test: send one `WELCOME` ingest with `testMode: true`.
4. Verify Message subject: `Welcome, {Athlete Name}! — {Program Name}`
5. Verify HTML includes: logo on white container, branded header, Start Here,
   How Daily Submissions Work, How You Earn XP, Your Weekly Challenge,
   Homework and Feedback, Important Links, `Start Your First Submission` CTA,
   condensed footer links.

## Airtable — Automation 078A v1.4

Repo: `127-si-shooting-challenge`

1. Open Production Automation **078A - Enrollment -> Create WELCOME Email Handoff**.
2. Paste committed **v1.4** source (docblock through end; skip GitHub header).
3. Confirm input `recordId` mapping unchanged.
4. Trigger one allowlisted test Enrollment through 078A → 079.
5. Confirm queue Payload JSON includes:
   - `athleteName`, `programName`, `programInstanceName`
   - `parentFirstName`, `grade`, `gradeBand`, `schoolYear`, `school` (when present)
   - `welcomeIntro`, `programDescription`, `whyThisMatters` (when present on PI)
   - `dailySubmissionFormUrl`, `landingPageUrl`, `shootPageUrl`, `homeworkPageUrl`
   - `programInstanceUrl` (when PI Welcome - Website URL is set)

## Notes

- Daily Submission email behavior is unchanged.
- Participant-wide welcome sends remain **Test Mode? + allowlist only** until Mike approves.
- Optional `zoomInfo` and `weeklyGoal` render only when present in payload.
