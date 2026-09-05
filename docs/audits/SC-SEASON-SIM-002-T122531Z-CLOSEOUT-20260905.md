# SC-SEASON-SIM-002 — Closeout `SEASON-SIM-2027-20260905T122531Z-athlete1`

**Date:** 2026-09-05  
**Backlog:** SC-SEASON-SIM-002  
**Base:** Production `appn84sqPw03zEbTT`  
**Status:** **COMPLETE** — execute + cascade reconcile + cleanup + formula restore verified

---

## Identity

| Item | Value |
|---|---|
| Run ID | `SEASON-SIM-2027-20260905T122531Z-athlete1` |
| Athlete | `recMuAvqA0zH1eGFj` (Athlete 1) — **deleted** |
| Enrollment | `recmImoXTlKb5NWSY` — **deleted** |
| Email | `schmidt@fairfieldbasketballclub.com` only (`--enable-email-delivery`) |
| Git at execute | `origin/master` @ `3cf3b568` (execute branch `feat/sc-season-sim-002-execute`) |

---

## Stage results

### Writer

- `writer_status`: **complete**
- Intended writes: 335 · errors: 0
- Submissions: **58** countable / **0** future / **57** same-day
- Total Shots Counted: **13906**
- Homework Completions: **18** · Video Feedback creates: **4**
- Perfect Week Eligible: **0** (expected)

### Email (allowlist PASS)

| Event | Count | Status | Recipient |
|---|---:|---|---|
| DAILY_SUBMISSION | 58 | Accepted | schmidt@fairfieldbasketballclub.com |
| WELCOME | 1 | Accepted | same (parent + athlete) |
| HOMEWORK_FEEDBACK | 9 | Accepted | same |
| ZOOM_RECORDING_APPROVAL | 1 | Accepted | same |
| **Total** | **69** | **Accepted** | **allowlist only** |

No non-allowlisted recipient at any time.

### XP / streaks (pre-cleanup)

| Prefix | Count |
|---|---:|
| SUBMISSION_XP | 59 rows / **58** unique keys (1 duplicate row) |
| STREAK_XP | 16 |
| WEEKLY_THRESHOLD | 11 |
| HOMEWORK_XP | 9 |
| VIDEO_SUBMISSION | 4 |
| SHOT_MILESTONE | 4 |
| ZOOM_ATTEND_BASE | 1 |
| ZOOM_RECORDING_CREDIT | 1 |
| **XP total** | **105** |
| Streak Occurrences | **18** |
| Athlete Achievement Unlocks | **0** |

### Discrepancies (documented before delete)

See [`SC-SEASON-SIM-002-T122531Z-DISCREPANCIES-BEFORE-CLEANUP-20260905.md`](./SC-SEASON-SIM-002-T122531Z-DISCREPANCIES-BEFORE-CLEANUP-20260905.md):

1. One duplicate SUBMISSION_XP row (59 vs 58 unique)
2. No WEEKLY parent email handoffs observed for this enrollment
3. Unlocks = 0

None blocked cleanup.

---

## Cleanup

| Pass | Result |
|---|---|
| Registry cleanup | **123** records deleted (VF 4, HC 18, Assets 27, Zoom Attendance 2, Zoom Meetings 2, WAS 10, Submissions 58, Enrollment 1, Athlete 1) |
| Extras pass 1 | Email Handoff Queue **69** deleted; XP/streaks already unlinked after enrollment delete |
| Extras pass 2 | XP Events **105** deleted by Source Key / submission keys; Zoom leftover **0**; streak query **0** after enrollment delete |
| Athlete / Enrollment fetch | **gone** |
| Athlete 1 search | **empty** |
| Email handoffs for enrollment | **0** |
| XP with enroll in Source Key | **0** |

Evidence (gitignored reports dir):

- `tools/season_simulation/reports/execute-SEASON-SIM-2027-20260905T122531Z-athlete1.json`
- `tools/season_simulation/reports/reconcile-cascade-counts-SEASON-SIM-2027-20260905T122531Z-athlete1.json`
- `tools/season_simulation/reports/cleanup-SEASON-SIM-2027-20260905T122531Z-athlete1-20260905T185711Z.json`
- `tools/season_simulation/reports/cleanup-extras-SEASON-SIM-2027-20260905T122531Z-athlete1.json`
- `tools/season_simulation/reports/cleanup-extras-pass2-SEASON-SIM-2027-20260905T122531Z-athlete1.json`

---

## Formula restore (Stage Z) — independently verified

MCP `get_table_schema` after restore:

| Field | Gate | Result type | Refs |
|---|---|---|---|
| Activity Date Is Future? | Production `NOW()` only — **no** Season Sim | number | Activity Date |
| Submitted Same Day? | Submitted At vs Activity Date — **no** Season Sim | number | Submitted At, Activity Date |
| Perfect Week Grace Eligible? | Manual Exception / TODAY() / Submitted At — **no** Season Sim | number | Manual Exception, Count This Submission?, Activity Date, Submitted At |

Preflight after restore: `sufficient_for_final_run=False` (expected Production-normal). Season Sim gate reported **not** active.

Season Sim helper fields (`Season Sim Test Record?`, Clock Now, Test Submitted At) remain on the table unused (unchecked) — intentional.

---

## Production normal checks

- Temporary Season Sim formulas: **restored**
- Disposable Athlete 1 / Enrollment / sim Zoom Meetings: **gone**
- Automations 010 / 114 / 073: unchanged (already v10.13 / v6.2 / v4.6 with dual gate) — no paste this run
- Website / payment / registration / FUT-029: **not touched**
- Next Season Sim execute: **NOT authorized** until Mike re-authorizes + re-pastes temporary formulas (manual UI only; never Omni generation)

---

## Verdict

**SC-SEASON-SIM-002 run T122531Z CLOSED.** Writer complete, email allowlist verified, cascade reconciled with noted discrepancies, cleanup complete, Production formulas restored and schema-verified.
