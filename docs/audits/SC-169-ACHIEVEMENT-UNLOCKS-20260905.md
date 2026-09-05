# SC-169 — Achievement Unlocks (Season Sim T122531Z discrepancy)

**Date:** 2026-09-05  
**Backlog:** SC-169  
**Branch:** `fix/sc-169-achievement-unlocks`  
**Production base:** `appn84sqPw03zEbTT`  
**Source run:** `SEASON-SIM-2027-20260905T122531Z-athlete1`  
**Enrollment:** `recmImoXTlKb5NWSY` (deleted in sim cleanup)  
**Classification:** **Expectation / observability false negative** — award path worked; cascade count was wrong; cleanup missed automation-created unlocks.

---

## Task Classification

| Field | Value |
|---|---|
| Type | Discrepancy investigation + expectation/cleanup fix |
| Priority | P0 (sim truth) |
| Difficulty | Medium |
| Owner | Cursor Agent 3 |
| Dependencies | SC-SEASON-SIM-002 closeout evidence |
| Backlog ID | **SC-169** |
| Estimated Scope | Expectations + unlock query + cleanup hook + orphan delete |
| Phase | 3 Implementation / 5 Close |
| Correct tool | Cursor (repo) + MCP read/delete disposable orphans |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Review PR; no automation paste required |

---

## 1. Expected achievement calculation (evidence)

### Athlete context
- Grade 12 → Grade Band **9-12** (`rec75ruo3XT5nSvaK`)
- Total Shots Counted **13906**
- Perfect Week Eligible **0** (expected)
- Streak Occurrences **18** / STREAK_XP **16** (053→054 path)

### Shot milestones (active 9-12, threshold ≤ 13906)

| Threshold | Label | Milestone ID | Points |
|---:|---|---|---:|
| 3000 | 9-12 - 12000 shots - 25% | `recjHsGxBGVoZ1Atb` | 10 |
| 6000 | 9-12 - 12000 shots - 50% | `recbUUwpAA6M91mH6` | 15 |
| 9000 | 9-12 - 12000 shots - 75% | `recuLqXBSyB7PE7jC` | 20 |
| 12000 | 9-12 - 12000 shots - 100% | `recSiWHRSsdjKytFU` | 30 |

Next active threshold **14400** (120%) was **not** crossed.

**Expected Athlete Achievement Unlocks = 4** (shot milestones only).

### What does *not* create Athlete Achievement Unlocks
| Rule | Writer path | Unlock table? |
|---|---|---|
| Streak | 053 occurrences → 054 `STREAK_XP\|…` | **No** |
| Perfect Week (when Eligible=0) | 057/058 | **No** (0 expected) |
| Shot milestone | 066 unlock → 059 `SHOT_MILESTONE\|…` | **Yes** |

### Live proof (pre-cleanup orphans, 2026-09-05)

Automation **066 + 059 succeeded** for this enrollment. Four Awarded unlocks existed with empty Enrollment (enrollment already deleted):

| Unlock ID | Milestone Source Key | Status | Created (UTC) |
|---|---|---|---|
| `recO8meY2AZBTKaAJ` | `SHOT_MILESTONE\|recmImoXTlKb5NWSY\|recjHsGxBGVoZ1Atb` | Awarded | 18:27:10 |
| `rechwK9LfdKdbfrNR` | `SHOT_MILESTONE\|recmImoXTlKb5NWSY\|recbUUwpAA6M91mH6` | Awarded | 18:27:10 |
| `recRQMHIgydYGiWRv` | `SHOT_MILESTONE\|recmImoXTlKb5NWSY\|recuLqXBSyB7PE7jC` | Awarded | 18:28:12 |
| `rec5vOZXsIm9YLm75` | `SHOT_MILESTONE\|recmImoXTlKb5NWSY\|recSiWHRSsdjKytFU` | Awarded | 18:29:01 |

Matches reconcile `SHOT_MILESTONE` XP count **4**.  
These four orphans were **deleted** 2026-09-05 after evidence capture (`acth7dbsah2hyF6E4`).

---

## 2. Root-cause classification

| Hypothesis | Verdict |
|---|---|
| Thresholds / grade band blocked awards | **Rejected** — 4 Awarded unlocks + 4 SHOT_MILESTONE XP |
| PW=0 by design | **Confirmed** — expect 0 PW unlocks |
| Streaks should create unlock rows | **Wrong expectation** — streaks use Streak Occurrences + STREAK_XP only |
| Automation 066/059 defect | **Rejected** — path produced correct keys + Awarded status |
| Cascade count bug | **Confirmed** — `_count_cascade_full.py` requested `Enrollment Record ID` on Unlocks (field **does not exist**); both formula attempts failed → `unlocks=0` |
| Cleanup gap | **Confirmed** — unlocks are automation-created (not writer registry); extras pass used the false 0 count and left orphans |

**Root cause:** Observability/cleanup false negative, not a missing-award defect.

---

## 3. Fix / expectation correction

### Done in this PR
1. `tools/season_simulation/expectations_achievements.py` — authoritative expected unlock calc (shot milestones + PW; streaks explicitly excluded from unlock table).
2. `tools/season_simulation/unlock_cascade_query.py` — safe Unlocks queries via `Milestone Source Key` / `Enrollment` (never Enrollment Record ID).
3. `tools/season_simulation/cleanup.py` — when `client` + `enrollment_id` present, merge automation unlocks into delete plan via Source Key scan.
4. Offline tests `tools/season_simulation/tests/test_sc169_achievement_unlocks.py` (10 passing), including scenario must cross ≥1 milestone.
5. Deleted the four T122531Z orphan unlocks.

### Not changed
- Award thresholds / XP amounts / Perfect Week rules
- Automations 053/054/057/058/059/066 script bodies (no paste)
- No full Season Sim re-run

### Sim expectation revision (coordinator)
Discrepancy “Athlete Achievement Unlocks = 0” for T122531Z should be revised to:
- **Expected unlocks = 4** (shot milestones)
- **Actual unlocks = 4** (false count reported 0)
- Streak/PW unlock expectations remain 0 on the Unlocks table

---

## 4. Paste needs

**None.** No automation paste for SC-169.

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| Other historical sim unlock orphans (prior enrollments) | Out of SC-169 delete scope; coordinator may schedule hygiene FIND on deleted enrollments |
| Cleanup without `client` still misses unlocks | Documented; Source Key merge requires client in `build_cleanup_plan` |
| Confusion that STREAK_XP implies unlock rows | Expectations module documents separation |

---

## 6. Files

- `tools/season_simulation/expectations_achievements.py` (new)
- `tools/season_simulation/unlock_cascade_query.py` (new)
- `tools/season_simulation/tests/test_sc169_achievement_unlocks.py` (new)
- `tools/season_simulation/cleanup.py` (SC-169 Source Key merge)
- `docs/audits/SC-169-ACHIEVEMENT-UNLOCKS-20260905.md` (this file)
- `docs/deploy-checklists/SC-169-achievement-unlocks.md`
- `docs/127-SI-MASTER-FUTURE-WORK-LIST.md` (SC-169 narrative only)

---

## Coordinator return summary

- **Classification:** False-negative count + cleanup gap (awards correct)
- **Expected unlocks:** 4 shot milestones; 0 PW; streaks not on Unlocks table
- **Root cause:** Unlocks queried with non-existent Enrollment Record ID; registry cleanup missed 066 rows
- **Fix:** Expectations + safe query + cleanup Source Key merge + orphan delete
- **Paste:** none
- **Tests:** 10/10 offline SC-169
- **Live proof:** 4 Awarded orphans matched expected keys; deleted after capture
