# Canonical Table Map — Shooting Challenge

**Evidence:** `schema-snapshot` PROD post-TS export 2026-07-23 (`schema_doc_appn84sqPw03zEbTT_20260723_152229.md`)  
**Base:** `appn84sqPw03zEbTT` · **Tables in export:** 30 (+ Testing Scenarios created post-export, included in post-ts snapshot)

> Do not invent tables. Names below are exactly as exported.

---

## Inventory (verified table names)

| Table | Table ID | Primary field | Role |
|-------|----------|---------------|------|
| Automations | `tbl…` (see snapshot) | Automation inventory / ops | Admin |
| Enrollments | `tbl3PFmwbRoabu1YV` | Full Athlete Name - Backward (formula) | Hub |
| Athletes | `tblTluxBr3DcVrh6h` | Athlete identity | Person |
| Level Gate Rules | — | Gate rule definitions | Config |
| Grade Bands | `tblOhHrIqpjcsk2WG` | Band labels | Config |
| Target Goal Shots | `tbleCfuAt3rY8unU3` | Season shot goals | Config |
| Submissions | `tblEVjVpGGlPTsYSt` | Shot log | Intake |
| Submission Assets | — | Files / upload pipeline | Intake |
| XP Events | `tblmGSiNA1akW8KnU` | Append-only XP ledger | XP |
| Athlete Achievement Unlocks | `tblyT2AQo1JbvmvZS` | Unlock ledger | Achievements |
| Streak Occurrences | `tbl9VxLdBiNcev4He` | Streak runs | Achievements |
| Achievements | `tblrADEQbvH9kBfMZ` | Badge definitions | Config |
| Weeks | `tblcsKugv1cla36A6` | Week Name (text) | Calendar |
| Program Instance - Synced | `tblMfALZa4YYUy70P` | Name - Program Instance | Season |
| School - Synced | `tblyAJ36QvA7Wa2gU` | School name | Reference |
| Weekly Athlete Summary | `tbl9520d72adxlAKQ` | Weekly Athlete Summary - Display (formula) | Summary / email |
| Levels | `tblU6EWmc1jCpgRHe` | Level definitions | Config |
| Shot Milestones | `tbl5C4TsQpOigIyRz` | Milestone rules | Config |
| FBC Curriculum - SYNC | `tblUuxwYlX4EQ9MKE` | Homework assignments | Curriculum |
| Homework Completions | `tblv58ppTFDBXb3nv` | HC records | Homework |
| Video Feedback | `tblOV6pJDxQFBSQ3q` | Coach video review | Video |
| Tutorials | — | Content catalog | Web |
| Tutorials & Assets | — | Legacy/content bridge | Content |
| XP Reward Rules | — | XP amounts by source/band | Config |
| Config | `tblRB6sh77NxjS568` | Active School Year | Season settings |
| Awards | — | Award definitions | Awards |
| Award Recipients | — | Award instances | Awards |
| Final Reflection Quiz Submissions | — | Quiz path | Homework |
| Zoom Meetings | `tblWcSHEm8vNNIxyB` | Meetings | Zoom |
| Zoom Attendance | — | Attendance / recording credit | Zoom |
| Testing Scenarios | `tblagI7Q5wXQm2XGS` | ETF harness | Testing |

---

## Per-table ownership map (major tables)

### Enrollments

| Aspect | Value |
|--------|--------|
| Purpose | One athlete × one school year participation hub |
| Primary | `Full Athlete Name - Backward` (formula: Last, First - School Year) |
| Key fields | `Enrollment Key` = `{Athlete ID Lookup}\|{School Year}` (**formula**) |
| Linked | Athlete, Program Instance, School, Grade Band, Current/Next Level, Level Gate Rule, Submissions, WAS, XP Events, HC, VF, Zoom Attendance, Streak Occurrences, Unlocks, … |
| Lookups / rollups / formulas | Heavy (75+ computed): gates, FG%, emails cleaned, XP totals |
| Automation-written | Current/Next Level (**042**), Level Status, Level Recalc Needed?, Active? (ops), match status (**001/002**) |
| User / Fillout | Names, emails, grade, school, Active? |
| External | Parent/Athlete emails → Make |
| Status | Athlete Match Status, Level Status |
| Legacy / noise | `Registratioin Referrer` (typo), duplicate gate summary formulas |

### Weeks

| Aspect | Value |
|--------|--------|
| Purpose | Sunday–Saturday challenge week anchors (`America/Denver` Start/End dateTime) |
| Primary | `Week Name` (**singleLineText**, not formula) |
| Key fields | `Week Key` = `RECORD_ID()` (**formula**) — **not** `2026-2027\|Week N` |
| Linked | Program Instance, Submissions, WAS, XP Events, HC, Zoom Meetings, Unlocks, Streak Occurrences, FBC Curriculum, Awards |
| Text-only stubs | `Homework 2`, `Video Feedback`, `Submission Assets`, `XP Events copy` (not links) |
| Automation | **005** assigns Week to Submission from Activity Date |
| Season display pattern | Ops/seed often use Week Name values like `Week 0`…`Week 9`, `Post-Challenge`; year comes from Config / Program Instance / Enrollment School Year — see [ANNUAL-CONFIG-WEEK-AUDIT.md](./ANNUAL-CONFIG-WEEK-AUDIT.md) |

### Config

| Aspect | Value |
|--------|--------|
| Purpose | Year-specific settings (XP, video limits, Zoom recording policy, Drive roots) |
| Primary | `Active School Year` (e.g. `2026-2027`) |
| Key fields | Primary year string; no separate Config Key formula in snapshot |
| Linked | Zoom Meetings (Global Config / Program Config), Zoom Attendance |
| User | Season operators |
| Note | Multiple Config rows by year — do not collapse (`lib/config-selection`, tests/config-selection) |

### Submissions

| Aspect | Value |
|--------|--------|
| Purpose | Shot activity log |
| Links | Enrollment (required path), Week (**005**), Athlete, Submission Assets, WAS, XP Events, HC, VF |
| User / Fillout / 115 | Activity Date, shot counts, Duplicate Review Status |
| Automation | Week assign **005**; XP **010**; WAS link **031**; assets **009** |
| Status | Duplicate Review Status, XP Award Status, Daily Email Status |

### Submission Assets

| Aspect | Value |
|--------|--------|
| Purpose | File intake → Drive/S3 → HC / VF destinations |
| Links | Submission - Linked, Enrollment - Linked, Homework Completions, Video Feedback |
| External | Make / Lambda: Canonical File URL, Storage Key, hash, Upload Status |
| Status | Upload Status, Duplicate File Status, Ready to Send to Make? (formula) |
| Legacy | Google Drive File URL / ID bridge until S3 cutover verified |

### Homework Completions

| Aspect | Value |
|--------|--------|
| Purpose | One completion per Enrollment + Week + Homework (formula key) |
| Key | `Homework Completion Key` = Enrollment\|Week\|Homework (**formula**, uses linked primary displays) |
| Links | Enrollment, Week, Homework (FBC), Submission Assets, Grade Band, WAS Link, XP Events |
| Writers | **020** create; coach review; **065** XP; quiz path **067** risk |
| Status | Satisfactory?, review fields, XP statuses |

### XP Events

| Aspect | Value |
|--------|--------|
| Purpose | Append-only XP ledger |
| Writable key | `Source Key` (text) — scripts write |
| Formula keys | `XP Dedupe Key`, `XP Dedupe Key Normalized`, `Event Identity ID`, `Weekly Summary Key` — **never write** |
| Links | Enrollment, Week, Submission, HC, VF, Unlock, Streak Occurrence, Zoom Meeting, Shot Milestones, WAS |
| Status | Processed, Active?, Award Mode, XP Bucket |

### Athlete Achievement Unlocks

| Aspect | Value |
|--------|--------|
| Purpose | Unlock ledger (Perfect Week, Shot Milestone, streaks → XP via **059**) |
| Writable key | `Milestone Source Key` (text; shot milestones) |
| Formula key | `Unlock Key` — **never write** |
| Links | Enrollment, Achievement, Week, Shot Milestone, WAS, XP Events |
| Status | Source Status, XP Award Status |

### Streak Occurrences

| Aspect | Value |
|--------|--------|
| Purpose | Streak run instances feeding **054** XP |
| Links | Enrollment, Achievement, Week, XP Events |
| Keys | Streak occurrence identity used in Source Key `STREAK_XP\|…` (**repo-script** 054) |

### Weekly Athlete Summary

| Aspect | Value |
|--------|--------|
| Purpose | One Enrollment + one Week rollup + weekly email package |
| Primary | Display formula (name - week - grade band) |
| Identity formula | `Summary Key` = `{Enrollment Key - Lkp}\|{Week Key - Lkp}` |
| Alternate formula | `Weekly Summary Key` = Enrollment link & Week link (display-based — see key audit) |
| Links | Enrollment, Week, Grade Band, Goal Record, Submissions, HC Link, XP Events, Perfect Week Unlock, Homework |
| Rollups | XP Earned This Week, Total Shots/Makes, Days Logged, Homework counts |
| Email fields | Build Weekly Email Now?, Weekly Email Ready?, Send to Make?, Weekly Email Sent?, Make Send Status, sendMode, subject/HTML/recipients/payload, timestamps |
| Writers | **031/101/118** create; **034** chain calcs; **072** package; **119** arm; **074** clear Send; Make Live writeback Sent? |

### Levels / Level Gate Rules / Shot Milestones / XP Reward Rules / Target Goal Shots / Grade Bands / Achievements

| Aspect | Value |
|--------|--------|
| Purpose | Configuration / rules — human-edited; scripts read |
| Writers | Ops + **042** (enrollment level links only) |
| Note | Shot milestones are grade-band scoped via Target Goal Shots |

### Video Feedback

| Aspect | Value |
|--------|--------|
| Purpose | Coach video review + XP source |
| Key | `Video Feedback Key` (canonical `VIDEO_FEEDBACK\|{assetId}` via **013**) |
| Links | Enrollment, Submission, Submission Asset, Grade Band, XP Events |
| Writers | **013** create; **112** legacy OFF; **114** XP; **073** email |

### Zoom Meetings / Zoom Attendance

| Aspect | Value |
|--------|--------|
| Purpose | Live attendance XP (**101**); recording credit (**117** XOR **117c**); approval email (**117f**) |
| Critical | Never write `Zoom Meetings.Attendees` from recording path |
| Config | Global Config + Program Config links + effective override formulas |

### Testing Scenarios

| Aspect | Value |
|--------|--------|
| Purpose | End-to-end test framework only |
| Rule | Framework fields stay here — no pipeline test flags on business tables |

### Automations / Awards / Award Recipients / Final Reflection Quiz / Tutorials*

Supporting / admin / content tables — see snapshot for full field lists. Not Team Shot Tracker.

---

## Conceptual hub (Enrollment-centric — current truth)

```
Config (by Active School Year)
Program Instance - Synced ── Weeks
Athletes ── Enrollments ──┬── Submissions ── Submission Assets ──┬── Homework Completions
                          │                                     └── Video Feedback
                          ├── Weekly Athlete Summary ← Weeks
                          ├── XP Events (append-only)
                          ├── Athlete Achievement Unlocks / Streak Occurrences
                          ├── Zoom Attendance ← Zoom Meetings
                          └── Levels / Level Gate Rules (via Current Level)
```

**Conflict with stale hand map:** `airtable/schema/current/table-map.md` still describes an Athlete-centric hub. Correct hub for SC V2 is **Enrollment** (`schema-snapshot` + foundation matrix).
