# Weekly Athlete Summary email redesign — promotion checklist

Status: **Repository-ready / promotion pending**
Production change: **Not applied by Cursor**

## Scope

Full React Email redesign for `WEEKLY_ATHLETE_SUMMARY` in Communications Hub.
Hub owns subject, HTML, plain text, branding, and delivery. Automation **074**
continues to build the queue payload; **072** inline HTML writeback is legacy
reference only once Hub send is confirmed.

## Communications Hub (Vercel)

Repo: `127si-communications-hub` (`communications`)

1. Merge/push to `main` (auto-deploys `communications-two-blue.vercel.app`).
2. Confirm Vercel build succeeds.
3. Controlled test: send one `WEEKLY_ATHLETE_SUMMARY` ingest with `testMode: true`.
4. Verify subject:
   `Weekly Shooting Challenge Summary - {Athlete Name} - {Week Label}`
   (empty week: `Shooting Challenge Weekly Reminder - ...`).
5. Verify HTML includes: logo, `Your weekly progress is in!`, scoreboard cards,
   shooting progress, XP/level, homework when present, `View My XP Page`,
   Sunday morning schedule copy, condensed footer links.
6. Verify empty-week package (`packageKind: short_no_activity`) renders quiet-week
   encouragement without XP CTA.

## Airtable — no paste required for template-only deploy

Current production path is already Hub-owned:

```text
118 (Sun 5:00 AM Denver) → 072 build
119 (Sun 10:00 AM Denver) → 074 handoff → 079 → Hub → Resend
```

**Do not change** automations 118/119 schedule unless intentionally approved.

### Optional future payload enrichment (074)

Template also accepts optional fields when added later:

- `weekDateRange`, `makes`, `shootingPercentage`
- `totalXp` / `currentXp`, `xpPageUrl`
- `homeworkItems[]`, `assignments[]`, `homework[]`, `xpLines[]`
- `shootingRows[]`, `videoFeedbackStatus`, `zoomAttendanceStatus`
- `perfectWeekStatus`, `achievements[]`, `coachNote`, `closingMessage`
- `landingPageUrl`, `shootPageUrl`, `dailySubmissionFormUrl`, `homeworkPageUrl`
- `currentLevelImageUrl`, `nextLevelImageUrl`

- Optional `videosSubmittedThisWeek[]` with `{ activityDate, fileName }` — **072 v4.9 / 074 v3.4** (GitHub; Production paste pending)

## Notes

- Schedule copy in the email says **Sunday morning** (not 7:00 AM).
- Automation **119** weekly send remains **Sunday 10:00 AM America/Denver**.
- Daily Submission email behavior is unchanged.
