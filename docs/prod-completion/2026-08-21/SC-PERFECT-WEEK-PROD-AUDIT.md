# Perfect Week Test — Production Readiness Audit

**Date:** 2026-08-21  
**Environment:** Production Airtable `appn84sqPw03zEbTT`  
**Scope:** Read-only verification for enrollment `rec93mAfo5jKqP3g5` (“Testing, Perfect Week - 2026-2027”), week `recT3EXo4Tz7BKFIb` (“Perfect Testing Week”, 2026-08-16 through 2026-08-22 America/Denver).

> **Evidence method:** Production `Automations` table columns **Name / Status / Automation Code** (authority per CURRENT-TRUTH 2026-08-20) plus REST record reads. No writes, deletes, or automation toggles performed.

---

## Test anchors

| Role | Record ID |
|------|-----------|
| Enrollment | `rec93mAfo5jKqP3g5` |
| Primary submission (latest large entry) | `recaxgOnpULYSSvXs` |
| Week | `recT3EXo4Tz7BKFIb` |
| Canonical WAS (this enrollment + week) | `reczxTIpVI8ZJLex0` |
| HW1 completion | `recpuUEXGlVve9tRN` |
| HW2 completion | `recRqpUYx9FOucIup` |
| Video Feedback (3) | `recKXkDt8xE2GxLPq`, `recniuL8DMXaPsy2b`, `recFPg2abXgwxxSNA` |
| Shot-milestone unlocks | `rec2WsNdGWymWeUDr` (10 XP), `reclavsWAO2aEZq0m` (15 XP), `recnYqTfPw5HzUaF9` (20 XP) |
| Shot-milestone XP Events | `rectp2SlA4uejjTPM`, `recM9CiCCJwaZ2IQx`, `recV0DWe2CPfGCvE9` |
| Zoom base XP (this enrollment) | `recL8orq6Lgka6YHG` |

---

## Production automation versions (Automations table poll 2026-08-21)

| # | Production Code version | Status | GitHub `SCRIPT.version` | Match |
|---|-------------------------|--------|---------------------------|-------|
| 005 | **v5.5** | Live | v5.5 | MATCH |
| 009 | **v1.2** | Live | v1.2 | MATCH |
| 020 | **v3.7** | Live | v3.7 (v3.6 logic; structure-only delta) | MATCH (PROD paste is v3.7, not v3.6) |
| 033 | **v4.4** | Live | v4.4 | MATCH |
| 059 | **v3.6** | Live | v3.6 | MATCH |
| 066 | **v3.8** | Live | v3.8 | MATCH |
| 070a | **v4.7** | Live | v4.6 | **DRIFT — GitHub behind PROD** |
| 070b | **v4.7** | Live | v4.6 | **DRIFT — GitHub behind PROD** |
| 101 | **v6.6** | Live | v6.6 | MATCH (task brief cited v6.7; live Code parses as v6.6) |

All nine use `input.config().recordId` from the triggering record in GitHub source (no hardcoded production IDs in script bodies).

**After testing, restore every manually hardcoded `recordId` to the dynamic triggering-record ID.**

---

## Verified production records (API read 2026-08-21)

### Submission assets (`recaxgOnpULYSSvXs`) — five assets, all **Uploaded**

| Asset | Slot | Destination | AWS fields | Linked child |
|-------|------|-------------|------------|--------------|
| `rec94yqw5w7tqtJgc` | HW1 | Homework Completions | Canonical URL + Storage Key set | HC `recpuUEXGlVve9tRN` |
| `recYVZDPIuC9noc3T` | HW2 | Homework Completions | Canonical URL + Storage Key set | HC `recRqpUYx9FOucIup` |
| `rectoB0Zy6PcgOTM1` | VIDEO | Video Feedback | Canonical URL + Storage Key set | VF `recKXkDt8xE2GxLPq` |
| `rec5Pl8GAQduPGSAu` | VIDEO | Video Feedback | Canonical URL + Storage Key set | VF `recniuL8DMXaPsy2b` |
| `rec7ExrPzFcQMzjPj` | VIDEO | Video Feedback | Canonical URL + Storage Key set | VF `recFPg2abXgwxxSNA` |

### Homework completions — two linked, **Upload Status = Uploaded**

Both link to enrollment + week; `Homework XP Reconciliation Needed? = 0`; **no `HOMEWORK_XP|{HC}` XP Events yet** (064/065 path not proven on this enrollment).

### Video Feedback — three linked, **Upload Status = Uploaded**, **Writeback Complete? = 1**

| VF | Total Video XP Awarded | `VIDEO_SUBMISSION` XP Event |
|----|------------------------|----------------------------|
| `recKXkDt8xE2GxLPq` | **0** | **none** |
| `recniuL8DMXaPsy2b` | 38 | `recBIpzVzMvdQvZgw` |
| `recFPg2abXgwxxSNA` | 37 | `recIKbNYLemQE7nG2` |

### Zoom XP — meeting produced five base events (multi-enrollment test meeting)

For **this enrollment**, `recL8orq6Lgka6YHG` is active (60 XP), Source Key `ZOOM_ATTEND_BASE|recxtpMu4ONbdDD45|rec93mAfo5jKqP3g5`, linked to WAS `reczxTIpVI8ZJLex0`.

### Shot milestones — three unlocks **Awarded**, each linked to exactly one XP Event (10 + 15 + 20 = 45 XP)

No duplicate Source Keys on enrollment-linked XP Events.

### Enrollment lifetime XP — **378** (field `Lifetime XP Total`)

Breakdown from linked XP Events: prior-week video `recgeZjh0nhik7grT` (138) + two current videos (37+38) + weekly thresholds (10+20+30) + Zoom (60) + milestones (45) = 378.

### Weekly Athlete Summary `reczxTIpVI8ZJLex0`

- **Days Logged This Week:** 2  
- **Total Shots This Week:** 9281  
- **XP Earned This Week:** 378  
- **Perfect Week Eligible?:** 0  
- **Perfect Week homework / zoom requirement status:** Not Calculated  
- **Summary Calculation Status:** Complete  
- Linked submissions: `rec8Qrt5dn0denguA`, `recv8a0SieH75Zzgu`, `recaxgOnpULYSSvXs`

### Level / gate (Enrollment)

- **Current Level:** Beginner; **Next Level:** Rookie Shooter  
- **Level Status:** Gate Blocked  
- **Gate Debug Summary:** `Sub 3/10 | HW 3/0 | Vid 8/6 | Zoom 1/0 | Streak 0/0`  
- **Current Shooting Streak:** 2 (Active)  
- **Meets Gate: Streak:** 1 (formula) vs gate minimum streak 0  

### Submission daily XP (010) — **not yet proven**

All three WAS-linked submissions show `Reconciliation Needed? = 1` and **no** `SHOOTING_BASE|{submission}` XP Events. This is outside Mike’s verified automation list for this session but blocks full participation proof.

---

## Repository drift and stale docs (safe fixes applied separately)

| Item | Issue |
|------|--------|
| `docs/automation-index.md` | Still listed 005/033 as paste-pending and 070a/b as v4.6; updated in companion commit |
| `docs/CURRENT-TRUTH.md` §8–10 | Still said 070a PROD OFF and older 005/070b version rows; updated in companion commit |
| GitHub 070a/070b | v4.6 in repo vs **v4.7** live — needs Mike-approved paste-back or GitHub pull from PROD |
| Deploy checklists with hardcoded `recordId` | Retained only where labeled controlled-test inputs; all include dynamic-trigger reminder |

### Hardcoded test record IDs in repo

No production script bodies contain the Perfect Week test IDs. The only in-repo reference to week `recT3EXo4Tz7BKFIb` is the historical 2026-08-16 reconciliation packet (explicit test context). Deploy-checklist hardcoded IDs remain **labeled controlled-test inputs only**.

### Automation 063

Repo `063-*.js` throws at runtime (“retired”); not referenced as an upload owner. Upload path remains **070a/070b + 022**.

---

## Remaining functional review matrix

| Area | Proven | Ready to test | Blocked | Mike must do |
|------|--------|---------------|---------|--------------|
| Streak calc + XP (053/054) | Streak count = 2 on enrollment; gate formula sees streak | Add qualifying submissions on distinct dates; confirm Streak Occurrence + 054 XP | Need ≥3 distinct shooting dates for streak XP proof | Future-dated daily submissions through Sat 8/22 |
| Level recalc (041/042) | Gate Blocked state visible; Beginner assigned | Trigger 041 schedule or enrollment XP change after more XP | Gate requires 10 submissions (3/10 now) | Review gate after week fills; no forced recalc |
| Level gate fields | Gate Enabled, rule `reccFKwOVHZ3hn36i`, debug summary populated | Continue accumulating gate counters | Cannot pass gate until minimums met | Interpret gate after test week |
| WAS calculations | WAS complete; shots/XP rollups match 378 | Re-run after each new submission day | Perfect Week fields not calculated until eligibility | Submit remaining days |
| Lifetime XP totals | 378 reconciles to linked events | Reconcile after 010/065/114 runs | Missing submission + homework + 1 video XP | Approve coach review paths if needed |
| XP dedupe / Source Keys | No duplicate keys on enrollment | Re-run 059/066/101 after edits | — | Restore dynamic `recordId` after manual tests |
| Perfect Week readiness | Zoom + homework assets exist | 057/058/059 after 7 dates + 3 videos | **Cannot certify before Sat 2026-08-22** | Seven distinct dates + final Mike confirmation |
| End-to-end reconciliation | Intake + upload + milestone + Zoom | 010, 064/065, 113/114 on current submission set | Third video XP missing | Run or verify 113/114 trigger for `recKXkDt8xE2GxLPq` |

---

## Repository tests (2026-08-21)

- **Pass:** 022, 042-school-year-gate-rules, 066-create-records-batch, 066-milestone-crossing-harness, and most lib harness tests when run sequentially.
- **Pre-existing fail:** `041-042-reconciled-signature-contract.test.js` (top-level await in 041 script), `072-074-email-helpers.test.js` (expects 072 v4.1; script version moved on).

These failures are test-harness drift, not regressions in the verified Perfect Week automations.
