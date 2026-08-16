# PKG-038 — Before / after evidence checklist

**Test athlete enrollment:** `recCyFEPeATOVNlr9` (verify before test)  
**Program Instance:** `rec5mEM0YPqPqq0hZ` (verify on enrollment)  
**Instructions:** Fill **Before** before paste/enable. Fill **After withdrawal** after Phase C. Fill **After restoration** after Phase D. Use **record IDs** in every cell; if a cell is empty at baseline, write `NONE` explicitly.

---

## A — Enrollment and config

| Inspect | Field / question | Before | After withdrawal | After restoration |
|---|---|---|---|---|
| `recCyFEPeATOVNlr9` | `Active?` | | | |
| `recCyFEPeATOVNlr9` | `Grade Band` → record ID | | | |
| `recCyFEPeATOVNlr9` | `Program Instance` → must be `rec5mEM0YPqPqq0hZ` | | | |
| `recCyFEPeATOVNlr9` | `Run Shot Milestone Check?` | | | |
| `recCyFEPeATOVNlr9` | Lifetime XP rollup (number) | | | |
| `recCyFEPeATOVNlr9` | `Level Recalc Needed?` | | | |
| `recCyFEPeATOVNlr9` | Current Level → record ID | | | |

---

## B — Controlled submission (`SUB_TEST`)

| Inspect | Field / question | Before | After withdrawal | After restoration |
|---|---|---|---|---|
| `SUB_TEST` = `rec________` | Submission record ID chosen | | | |
| `SUB_TEST` | `Enrollment` → `recCyFEPeATOVNlr9` | | | |
| `SUB_TEST` | `Week` → record ID | | | |
| `SUB_TEST` | `Count This Submission?` (0 or 1) | | | |
| `SUB_TEST` | `Total Shots Counted` | | | |
| `SUB_TEST` | `Duplicate Review Status` | | | |
| `SUB_TEST` | Linked Submission Base XP → event ID | | | |
| `SUB_TEST` | XP `Source Key` = `SUBMISSION_XP\|SUB_TEST` | | | |
| `SUB_TEST` | XP `Active?` | | | |

---

## C — Weekly Athlete Summary (per affected week)

Repeat section for each Week ID touched by `SUB_TEST` and streak/milestone dates.

| Inspect | Field / question | Before | After withdrawal | After restoration |
|---|---|---|---|---|
| WAS `rec________` | Canonical WAS for Enrollment + Week | | | |
| WAS | `Summary Key` (formula text) | | | |
| WAS | Weekly XP total (rollup/formula) | | | |
| WAS | Duplicate WAS count for same pair (must be 0 extra) | | | |

---

## D — Streak occurrences (all for enrollment)

List **every** Streak Occurrence linked to `recCyFEPeATOVNlr9` at baseline; add rows if 053 creates new.

| Occurrence ID | `Active?` | `Source Status` | `Streak End Date` | `Achievement` ID | Linked XP event ID(s) | `STREAK_XP` Source Key |
|---|---|---|---|---|---|---|
| | | | | | | |
| | | | | | | |

**Checks:**

- [ ] No duplicate `STREAK_XP` keys across active events
- [ ] Withdrawal: unsupported rows `Active?` = false; XP `Active?` = false — **same IDs**
- [ ] Restoration: same IDs `Active?` = true

---

## E — Shot milestone unlocks (all `SHOT_MILESTONE|` for enrollment)

Baseline expectation: **8** unlocks on `recCyFEPeATOVNlr9` (2026-08-08) — **re-list actual IDs**.

| Unlock ID | `Shot Milestone` ID | `Milestone Source Key` | `Active?` | `XP Award Status` | XP event ID | `SHOT_MILESTONE` Source Key on XP |
|---|---|---|---|---|---|---|
| | | | | | | |
| | | | | | | |

**Checks:**

- [ ] One unlock per `SHOT_MILESTONE|enrollment|milestone` key
- [ ] Withdrawal: below-threshold unlocks inactive; XP inactive — same IDs
- [ ] Restoration: same unlock + XP IDs reactivated; `XP Award Status` coherent

---

## F — XP Events (complete inventory for test athlete)

| XP event ID | `Source Key` | `XP Bucket` | `Active?` | `XP Points` | `Streak Occurrence` / `Achievement Unlock` link |
|---|---|---|---|---|---|
| | | | | | |

**Must not appear:** second active row with identical Source Key as an existing row.

---

## G — Automations (attestation)

| Automation ID | Editor version | ON/OFF before | ON/OFF after paste | Trigger attestation screenshot file |
|---|---|---|---|---|
| `recgH5hQgJA9IfLQE` (053) | | | | |
| `recb8cKBqAPjh1A2J` (054) | | | | |
| `rec0qiy0iXVqrU3c2` (066) | | | | |
| `recxDRvpiuvCeeAhC` (059) | | | | |

---

## H — Audit JSON

| Artifact | Path / filename | Before timestamp | After withdrawal | After restoration |
|---|---|---|---|---|
| Achievement XP pipeline audit v2.1 | | | | |
| Finding count | | 0 required | 0 required | 0 required |

---

## I — Progression observation (read-only)

| Inspect | Before | After withdrawal | After restoration |
|---|---|---|---|
| 041 run IDs (if any) | | | |
| 042 run IDs (if any) | | | |
| `Progression Last Queued Signature` on enrollment | | | |
| Standings / leaderboard readback (optional) | | | |

---

## J — Sign-off

| Role | Name | Date | PKG-038 test result |
|---|---|---|---|
| Operator | Mike | | PASS / FAIL / BLOCKED |
| Reviewer | Cursor / ChatGPT | | |

**FAIL:** attach rollback evidence per [PKG-038-ROLLBACK-PLAN.md](./PKG-038-ROLLBACK-PLAN.md).
