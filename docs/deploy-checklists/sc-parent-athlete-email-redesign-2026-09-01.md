# Shooting Challenge parent/athlete email redesign — promotion checklist

Status: **Repository-ready / Hub deploy pending Mike approval**
Production Airtable change: **Not required** (071 v4.3 and 076 v8.12 already Live)

## Scope

Full cohesive React Email redesign for four parent/athlete templates in Communications Hub:

| Template | Hub key | SC automation (payload only — already Live) |
|---|---|---|
| Daily Submission | `DAILY_SUBMISSION` | **076** v8.12 |
| Video Feedback | `VIDEO_FEEDBACK` | **073** v4.4 |
| Homework Feedback | `HOMEWORK_FEEDBACK` | **071** v4.3 |
| Weekly Athlete Summary | `WEEKLY_ATHLETE_SUMMARY` | **072** / **074** |

## Design system changes (Hub)

- Brand palette: `#0034B7`, `#FF8B00`, `#262626`, white, light gray, light blue/orange accents — **no navy**
- Shared components: `SectionCard`, `StatPairRow`, `Badge`, `Divider`, `EmailHeader`, `EmailFooter`, `VideosSubmittedThisWeekSection`, `CoachFeedbackQuote`
- Card variants: blue (activity/progress), orange (accomplishments/missions), gray (reference)
- Subtle header gradient: `#0034B7` → `#1A52D4`
- Footer: brand-blue background; Video Feedback first line exactly `127 Sports Intensity - Fairfield Basketball Club - Shooting Challenge`

## Template-specific verification

### Daily Submission

- Session Details stat rows: Activity Date / Week Date Range, Shots Submitted / XP Earned, Extra Credit XP / Shooting %
- Separate orange **Current Day Streak** card
- No standalone **Shot Submitted** card

### Video Feedback

- Header: **Mike reviewed your video** + **Read my comments and feedback.**
- Video Details: **Reviewed On:** (bold), Video XP inline — no Review Status, no standalone Video XP card
- **Next Video Challenge** mission block after coach feedback
- **Videos Submitted This Week** when payload includes `videosSubmittedThisWeek` (optional — no automation change required)
- Filename precedence: `customVideoFileName` → `originalFileName`

### Homework Feedback

- Prefers `assignmentTitle` over Assignment Full Name
- Coach feedback quotation block when present
- Distinct homework purpose (assignment, result, next steps)

### Weekly Athlete Summary

- Structure: Your Weekly Mission Report → This Week's Results → Current Streak → Progress Toward Next Level → Achievements → Coach's Message → Next Week's Mission
- Official Sunday–Saturday `weekDateRange` with full month names
- Coach Touchpoints: Video Feedback + Zoom Participation

## Communications Hub deploy

Repo: `Schmidt127/communications` (`127si-communications-hub`)

1. Merge PR to `main` (auto-deploys `communications-two-blue.vercel.app`).
2. Confirm Vercel build succeeds.
3. Controlled `testMode: true` ingest for each of the four template keys.
4. Verify render artifacts under `/opt/cursor/artifacts/email-renders/` (or re-run `node tools/render-email-samples.mjs`).

## What NOT to change

- Do **not** re-paste automations **071** or **076** (Production complete 2026-09-01).
- Do **not** create Automation **147** / SC-147.
- Do **not** change webhook payload contracts or Airtable schema.

## Tests run (2026-09-01)

- Communications Hub: `npm test` — 167/167 pass
- SC cross-repo: `node --test tests/email/homework-video-feedback-email.test.mjs` — 8/8 pass
- Hub production build: `npm run build` — pass
- Sample renders: `node tools/render-email-samples.mjs`
