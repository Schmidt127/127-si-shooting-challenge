# Active automation unloadData runtime compatibility — PROD paste pack

| Field | Value |
|-------|--------|
| Date | 2026-08-05 |
| Status | **Built in Repository** — Airtable paste Pending; Live test Not Tested |
| Pattern | Same as Automation **001 v5.2** / **002 v8.2**: `unloadQuerySafe()` + `finally` |
| Offline suite | `node tests/airtable-runtime/active-automation-unload-compat.test.js` (67 passed) |

## Defect

Bare `QueryResult.unloadData()` is not reliably available in the current Airtable automation runtime. Unsupported cleanup already caused live PROD failures in Automations **001** and **002**. This package hardens every remaining active canonical script known to call bare `.unloadData()`.

## Compatibility table

| Automation | Canonical file | Old version | New version | Bare calls before | Safe cleanup after | Airtable paste status | Live test status |
| ---------- | -------------- | ----------: | ----------: | ----------------: | ------------------ | --------------------- | ---------------- |
| 031 | `031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js` | v3.1 | **v3.2** | 1 (`xpQuery`) | `unloadQuerySafe` + `finally` | Pending | Not Tested |
| 035 | `035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js` | v1.2 | **v1.3** | 3 (`recheck`, `rulesQuery`, `xpQuery`) | `unloadQuerySafe` + `finally` | Pending | Not Tested |
| 042 | `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` | 3.1 | **3.2** | 2 (`zmQuery`, `zaQuery`) | `unloadQuerySafe` + `finally` | Pending | Not Tested |
| 057 | `057-achievements-and-milestones-calculate-perfect-week-eligibility.js` | 1.4 | **1.5** | 1 (`zaQuery`) | `unloadQuerySafe` + `finally` | Pending | Not Tested |
| 114 | `114-video-review-and-xp-create-or-update-video-xp-event.js` | v5.8 | **v5.9** | 1 (`xpQuery`) | `unloadQuerySafe` + `finally` | Pending | Not Tested |
| 117 | `117-zoom-recording-credit-orchestrator.js` | v1.1.1 | **v1.1.2** | 1 (`xpQuery`) | `unloadQuerySafe` + `finally` | Pending | Not Tested |
| 117a | `117a-zoom-recording-normalize-recording-quiz-submission.js` | v1.1.0 | **v1.1.1** | 1 (`query`) | `unloadQuerySafe` + `finally` | Pending | Not Tested |
| 117c | `117c-zoom-recording-create-zoom-xp-event.js` | v1.1.0 | **v1.1.1** | 1 (`xpQuery`) | `unloadQuerySafe` + `finally` | Pending | Not Tested |
| 118 | `118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js` | v1.5 | **v1.6** | 3 (`enrollmentsQuery`, `weeksQuery`, `wasQuery`) | `unloadQuerySafe` + `finally` | Pending | Not Tested |
| 119 | `119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js` | v1.5 | **v1.6** | 3 (`enrQuery`, `weeksQuery`, `wasQuery`) | `unloadQuerySafe` + `finally` | Pending | Not Tested |

GitHub base path for every file:

`airtable/automations/shooting-challenge/<file>`

## Exclusions (do not paste / do not rewrite in this package)

| Path | Reason |
|------|--------|
| `_superseded/117a-s16-…SUPERSEDED.js` | Superseded S16 homework path; not deployed |
| `_superseded/117b-…SUPERSEDED.js` | Superseded |
| Automations **001**, **002** | Already fixed (v5.2 / v8.2); not modified here |

## Paste order (dependency-safe)

Paste all in one operator session if desired, but **save and syntax-check each script separately** before the next.

1. **031** — WAS find/create from submission  
2. **035** — Weekly Threshold XP (depends on WAS)  
3. **042** — Level assignment / gate blocking  
4. **057** — Perfect Week eligibility  
5. **114** — Video XP  
6. **117** — Zoom recording orchestrator (owns combined Stage 17 path when used)  
7. **117a** — Normalize recording quiz (modular path; do not dual-ON with overlapping writers)  
8. **117c** — Create Zoom XP (modular; mutually exclusive ownership with 117 for XP writes)  
9. **118** — Schedule weekly email build  
10. **119** — Schedule weekly email send  

### Special caution: 117 / 117a / 117c

- This package does **not** change triggers, ownership, or enable overlapping writers.
- If PROD uses orchestrator **117**, keep modular **117c** OFF (or vice versa) per existing Stage 17 operating rules.
- **117a** normalize may run as part of orchestrator or modular chain — do not invent a second credit path.

## Per-automation paste notes

### 031 — Find or Create Weekly Athlete Summary from Submission
- Airtable name: `031 - Weekly Summary and Goal Logic - Find or Create Weekly Athlete Summary from Submission`
- Confirm header **v3.2** / **2026-08-05**
- Trigger: counted Submission with empty WAS link
- Safe test: Schmidt counted submission → find/create WAS; rerun must not duplicate WAS
- Expected: success / linked WAS; no `unloadData is not a function`

### 035 — Create Weekly Threshold XP Events
- Airtable name: `035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events`
- Confirm **v1.3**
- Trigger: WAS `Threshold XP Ready? = 1` (automation may be OFF until enable approved)
- Safe test: dry controlled WAS with Goal Completion ≥ 100%; rerun must skip existing Source Keys
- Expected: create/skip counts; no duplicate Weekly Threshold XP

### 042 — Assign Current and Next Level with Gate Blocking
- Airtable name: `042 - Levels and Progression - Assign Current and Next Level with Gate Blocking`
- Confirm **3.2**
- Trigger: Enrollment enters `042 - Needs Level Assignment` (or equivalent)
- Safe test: Schmidt enrollment with `Level Recalc Needed?`; rerun must not invent invalid level transition
- Expected: Current/Next Level + gate status outputs; no unload crash

### 057 — Calculate Perfect Week Eligibility
- Airtable name: `057 - Achievements and Milestones - Calculate Perfect Week Eligibility`
- Confirm **1.5**
- Trigger: WAS Perfect Week recalc path
- Safe test: Schmidt WAS for a known week; verify helper fields only (no Test Override work in this package)
- Expected: eligibility helpers updated; Sunday–Saturday / Denver date logic unchanged

### 114 — Create or Update Video XP Event
- Airtable name: `114 - Video Review and XP - Create or Update Video XP Event`
- Confirm **v5.9**
- Trigger: Video Feedback ready for XP
- Safe test: one Schmidt video feedback with XP > 0; rerun updates same Source Key (no steal)
- Expected: one XP Event; Awarded status

### 117 — Zoom Recording Credit Orchestrator
- Airtable name: `117 - Zoom Recording Credit - Orchestrator`
- Confirm **v1.1.2**
- Trigger: Zoom Attendance recording quiz path
- Safe test: dryRun=true first if available; then controlled approved recording credit
- Expected: normalize + XP create/soft-void; never writes Zoom Meetings.Attendees

### 117a — Normalize Recording Quiz Submission
- Airtable name: `117a - Zoom Recording Credit - Normalize Recording Quiz Submission`
- Confirm **v1.1.1**
- Safe test: recording quiz row → Needs Review when blank; duplicate pair skip

### 117c — Create Zoom XP Event
- Airtable name: `117c - Zoom Recording Credit - Create Zoom XP Event`
- Confirm **v1.1.1**
- Safe test: only if modular path is the active PROD writer (not dual with 117)
- Expected: Source Key `ZOOM_CREDIT|…` idempotent

### 118 — Schedule Weekly Summary Email Build
- Airtable name: `118 - Email - Schedule Weekly Summary Email Build`
- Confirm **v1.6**
- Trigger: Sunday 05:00 America/Denver
- Safe test: `dryRun=true` manual run; confirm counts only
- Expected: arms `Build Weekly Email Now?`; no Make POST

### 119 — Schedule Weekly Summary Email Send
- Airtable name: `119 - Email - Schedule Weekly Summary Email Send`
- Confirm **v1.6**
- Trigger: Sunday 10:00 America/Denver
- Safe test: `dryRun=true` manual run
- Expected: arms `Send to Make?` for Ready packages only; no Make POST

## Paste steps (each script)

1. Open GitHub file on merged `master`.
2. Copy from production docblock through EOF (skip GitHub-only header).
3. Paste into Airtable automation script editor.
4. Save → confirm no syntax error in Airtable.
5. Confirm version string in header.
6. Proceed to next script.

## Rollback

Re-paste the prior version from git history (parent of this merge) for the single failing automation. Do not leave a half-pasted script.

## Live-test evidence

Leave blank until Mike pastes and supplies Airtable run outputs. Do not mark Live Tested / Complete from repository work alone.
