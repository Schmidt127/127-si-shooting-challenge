# Parent-email + magic-link Live cutover — Mike operator checklist

**Date:** 2026-09-03  
**Mode:** Mike UI only — Cursor does **not** change secrets, Airtable inputs, or Vercel env through code.  
**Do not** run season simulation. **Do not** modify 003 / 067 / 101 / 117 / SC-147 / create 121.

---

## Pre-change safety audit (Production read-only — 2026-09-03)

| Check | Result |
|-------|--------|
| Active enrollments | **1** |
| Real-family enrollments | **0** |
| VERIFY / PELC / disposable-named enrollments | **0** |
| Remaining enrollment | **Athlete1 Schmidt** (authorized operator fixture) |
| Parent Email - Cleaned | Mike-controlled school domain only (not enumerated here) |
| Athlete Email / Athlete Email - Cleaned | Approved disposable club domain only |
| Real-family recipient before Live? | **None found — Live disable of test modes is allowed** |

If any future real-family enrollment appears before Mike flips Live, **stop**.

---

## Two separate test modes (do not confuse)

| Setting | Where | What it controls when set to Live / false |
|---------|--------|---------------------------------------------|
| Automation `testMode` / `dryRun` / `sendMode` | Airtable Automations UI | **Transactional** parent/athlete emails (Welcome, Daily, Homework, Video, Weekly, Zoom approval) via Hub → Resend |
| `ATHLETE_AUTH_TEST_MODE` | Vercel env | **Magic-link** dashboard sign-in email delivery routing |
| `ATHLETE_AUTH_TEST_RECIPIENT` | Vercel env | Used **only** when `ATHLETE_AUTH_TEST_MODE=true` to redirect magic links |

When `ATHLETE_AUTH_TEST_MODE=false`, magic links go to the **actual enrollment email** used for sign-in (Parent Email path).  
When automation `testMode=false`, transactional emails go to **Parent Email - Cleaned** / configured athlete recipients on the triggering record.

Mike authorized disabling **both**. Keep `ATHLETE_AUTH_TEST_RECIPIENT` unchanged until Mike explicitly wants to remove it (unused when test mode is false).

---

## Email plane (unchanged architecture)

- Dispatcher: **Automation 079** → Communications Hub → **Resend** only  
- Make / Gmail parent-email scenarios: remain **OFF** / retired  
- Do **not** send a broad verification blast — optional single disposable Athlete1 proof only after Live

---

## Path checklist (set Live only after safety audit)

### WELCOME

| Item | Value |
|------|--------|
| Trigger | Enrollment matches Athlete + Cleaned email + Program Instance |
| Automation | **078A** → **079** |
| Template key | `WELCOME` |
| Required inputs | `recordId` (Enrollment); `testMode` = **false** |
| Recipient source | Parent Email - Cleaned |
| Duplicate protection | Handoff Key / producer recheck |
| Rollback | `testMode` = **true** (or omit → script default true on older builds) |
| Verify without real family | One Athlete1 enrollment handoff → Queue Status Accepted + Hub delivery; no other enrollments |

**Note:** Paste **078A v1.5** if Production is still v1.3 (hardcoded testMode).

### DAILY_SUBMISSION

| Item | Value |
|------|--------|
| Trigger | Submission gates + Build Daily Email Now? |
| Automation | **076** → **079** |
| Template key | `DAILY_SUBMISSION` |
| Required inputs | `recordId` (Submission); `testMode` = **false** |
| Recipient source | Parent Email - Cleaned |
| Duplicate protection | Handoff Key |
| Rollback | `testMode` = **true** |
| Verify | One disposable countable submission → Accepted queue row |

### HOMEWORK_FEEDBACK

| Item | Value |
|------|--------|
| Trigger | Homework Completion parent-feedback ready path |
| Automation | **071** → **079** |
| Template key | `HOMEWORK_FEEDBACK` |
| Required inputs | `recordId` (Homework Completion); `testMode` = **false** |
| Recipient source | Parent Email - Cleaned |
| Duplicate protection | Handoff Key |
| Rollback | `testMode` = **true** |
| Verify | One Athlete1 HC Ready → Accepted |

### VIDEO_FEEDBACK

| Item | Value |
|------|--------|
| Trigger | Manual Parent Feedback Ready? on Video Feedback |
| Automation | **073** → **079** |
| Template key | `VIDEO_FEEDBACK` |
| Required inputs | `recordId` (Video Feedback); `testMode` = **false** |
| Recipient source | Parent Email - Cleaned |
| Duplicate protection | Handoff Key |
| Rollback | `testMode` = **true** |
| Verify | One disposable VF Ready → Accepted |

### WEEKLY_ATHLETE_SUMMARY

| Item | Value |
|------|--------|
| Trigger | Cron **118** → **072** → Cron **119** → **074** → **079** |
| Template key | `WEEKLY_ATHLETE_SUMMARY` |
| Required inputs | **118:** `dryRun`=**false**, `sendMode`=**Live**, `includeSchmidt`=**false**; **119:** `dryRun`=**false**; **074:** `testMode`=**false**; **072:** `sendModeInput`=**live** when arming Live |
| Recipient source | Cleaned parent (072 may fall back — confirm Cleaned populated) |
| Duplicate protection | WAS Sent? / Handoff Key |
| Rollback | **118/119** `dryRun`=**true**; **074** `testMode`=**true**; **072** sendMode **test** |
| Verify | Arm one Athlete1 WAS only; confirm single queue row |

### ZOOM_RECORDING_APPROVAL

| Item | Value |
|------|--------|
| Trigger | Zoom Attendance conditions |
| Automation | **117** → **079** |
| Template key | `ZOOM_RECORDING_APPROVED` |
| Required inputs | `recordId`, `enrollmentRid`, `zoomMeetingRid`; `testMode` = **false** |
| Recipient source | Parent Email - Cleaned |
| Duplicate protection | Handoff Key |
| Rollback | `testMode` = **true** |
| Verify | Disposable attendance only; **do not** modify 101 / SC-147 |

---

## Exact Airtable settings Mike must change (manual)

| Automation | Setting name | Live value |
|------------|--------------|------------|
| 078A | `testMode` | **false** (after v1.5 paste if needed) |
| 076 | `testMode` | **false** |
| 071 | `testMode` | **false** |
| 073 | `testMode` | **false** |
| 074 | `testMode` | **false** |
| 117 | `testMode` | **false** |
| 118 | `dryRun` | **false** |
| 118 | `sendMode` | **Live** |
| 118 | `includeSchmidt` | **false** |
| 119 | `dryRun` | **false** |
| 119 | `includeSchmidt` | **false** |
| 072 | `sendModeInput` / `sendMode` | **live** for Live weekly packages |
| 079 | — | Remain ON; Hub dispatcher; `ingressSecret` configured |

---

## Exact Vercel settings Mike must change (manual)

| Env name | Live value | Notes |
|----------|------------|-------|
| `ATHLETE_AUTH_TEST_MODE` | **false** | Magic links deliver to actual enrollment email |
| `ATHLETE_AUTH_TEST_RECIPIENT` | **leave unchanged** | Unused while test mode is false |
| `ATHLETE_AUTH_ENABLED` | leave **true** | Separate from test mode |
| Resend / Hub secrets | leave unchanged | Do not rotate in this cutover |

---

## Post-change verification (config name only — no broad sends)

Confirm by setting name in UI / Vercel (do not print secrets or emails):

1. Parent-email producers: `testMode=false` on 071 / 073 / 074 / 076 / 078A / 117  
2. Schedulers: 118 `dryRun=false` + `sendMode=Live`; 119 `dryRun=false`  
3. `ATHLETE_AUTH_TEST_MODE=false`  
4. `ATHLETE_AUTH_TEST_RECIPIENT` not used for routing while test mode false  
5. 079 remains Hub dispatcher; Make/Gmail parent-email OFF  
6. Optional: **one** Athlete1 disposable proof only — confirm no unintended queue rows for other enrollments  

**Live cutover is not complete until Mike verifies Production settings after changes.**

---

## Rollback

1. Set all producer `testMode` back to **true**.  
2. Set 118/119 `dryRun` **true** (and 118 `sendMode` **Test**).  
3. Set `ATHLETE_AUTH_TEST_MODE` back to **true** in Vercel.  
4. Do not delete queue history unless Mike classifies rows.
