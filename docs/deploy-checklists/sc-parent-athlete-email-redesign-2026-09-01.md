# Shooting Challenge parent/athlete email redesign — promotion checklist

Status: **Production closeout complete (2026-09-01)** — Hub deployed; SC docs merged; live `testMode` ingest pending Mike credential check
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
- SC cross-repo: `node --test tests/email/homework-video-feedback-email.test.mjs` — 8/8 pass (CI on PR #334)
- Hub production build: `npm run build` — pass
- Sample renders: `node tools/render-email-samples.mjs`

## Production closeout (2026-09-01)

### Merges

| Repo | PR | Branch | Feature commit | Merge commit |
|---|---|---|---|---|
| `Schmidt127/communications` | [#46](https://github.com/Schmidt127/communications/pull/46) | `cursor/sc-email-redesign-7dc2` | `793e990` | `ffa97bf` |
| `Schmidt127/127-si-shooting-challenge` | [#334](https://github.com/Schmidt127/127-si-shooting-challenge/pull/334) | `cursor/sc-email-redesign-7dc2` | `2aa6cef0` | `bf40c9cf` |

### Vercel (Communications Hub)

- Auto-deploy triggered by merge to `main` at 2026-09-01T20:59:45Z
- GitHub commit status: **success** — “Deployment has completed” for `ffa97bf`
- Production URL: `https://communications-two-blue.vercel.app`
- `/api/health`: `{ "status": "ready", "provider": "RESEND", "missing": [] }`

### Post-deploy template verification (merged `main` code)

Ran `node tools/render-email-samples.mjs` on commit `ffa97bf`. All four template keys render with brand blue `#0034B7`, orange `#FF8B00`, and **no navy** (`#0B1F4A` / `#0E2E78`).

| Template | Render sample | Content checks |
|---|---|---|
| `DAILY_SUBMISSION` | `daily-submission-with-extra-credit` | Session Details stat rows, separate Current Day Streak card, full month `weekDateRange` — **pass** |
| `VIDEO_FEEDBACK` | `video-feedback-custom-filename` | Mike reviewed your video, Next Video Challenge, custom filename precedence — **pass** |
| `HOMEWORK_FEEDBACK` | `homework-feedback-with-coach-feedback` | `assignmentTitle`, coach feedback quote, brand footer — **pass** |
| `WEEKLY_ATHLETE_SUMMARY` | `weekly-summary-with-achievements` | Your Weekly Mission Report, full month date range, Video Feedback touchpoint — **pass** |

### Controlled production `testMode: true` ingest (four templates)

**Status: pending Mike manual run.** Cursor closeout could not POST to `/api/events/ingest` because Vercel encrypts `SHOOTING_CHALLENGE_INGRESS_SECRET` and `HUB_DELIVERY_SECRET` (not injectable via `vercel env pull` / `vercel env run` in this session).

**Mike step:** From an environment with `SHOOTING_CHALLENGE_INGRESS_SECRET`, send one allowlisted ingest per template (`mschmidt@fairfield.k12.mt.us`, `testMode: true`) to `https://communications-two-blue.vercel.app/api/events/ingest`. Confirm one Hub Delivery per template with Resend provider id.

### Automations — not changed

- **071** v4.3 — **not re-pasted**
- **076** v8.12 — **not re-pasted**
- **147** / SC-147 — **not created**

### Optional follow-up (separate scope)

- Weekly video payload enrichment — **not marked complete** (handled separately)
