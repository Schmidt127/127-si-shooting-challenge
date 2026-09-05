# SC-SEASON-SIM-002 — Execution Manifest (READY FOR AUTHORIZATION)

| | |
|---|---|
| **Backlog** | SC-SEASON-SIM-002 |
| **Preflight date** | 2026-09-05 |
| **Package** | `tools/season_simulation/` |
| **Base** | Production `appn84sqPw03zEbTT` (no DEV base) |
| **Master SHA at preflight** | `58663cfdef1c4ae74ad63ae5f998dccdd0f22474` |
| **Authorize command** | Mike says exactly: `RUN SEASON SIMULATION` |
| **This document does NOT authorize execute** | Preflight only — no Production writes performed |

---

## 0. Single entrypoint after authorization

From repo `tools/` (PowerShell), after Stage A temporary controls are live:

```powershell
cd tools

# 1) Reconfirm Production-readiness (must show formula gates active)
python -m season_simulation preflight

# 2) Live dry-run (read-only planner)
python -m season_simulation dry-run

# 3) EXECUTE — generate a NEW run id (never reuse cleaned Sept 2 IDs)
$RUN = "SEASON-SIM-2027-$(Get-Date -Format 'yyyyMMddTHHmmssZ')-athlete1"
python -m season_simulation execute `
  --execute `
  --simulation-id $RUN `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-disposable "CONFIRM-DISPOSABLE-SEASON-SIM" `
  --acknowledge-clock-override

# Optional email phase (allowlist only) — add only when intended:
#   ...same flags... --enable-email-delivery
```

**Default:** email off. Recipient allowlist always: `schmidt@fairfieldbasketballclub.com` only.

**Resume (same run):** re-run the identical `execute` command with the **same** `--simulation-id`. Registry dedupe keys prevent duplicates; paused runs continue.

**Cleanup (after cascade review):**

```powershell
python -m season_simulation cleanup --run-id $RUN
python -m season_simulation cleanup `
  --run-id $RUN `
  --execute `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-cleanup "CONFIRM-CLEANUP-SEASON-SIM"
```

Then delete any out-of-registry dependents for **that enrollment only** (XP Events / Email Handoff Queue / Streak Occurrences / Unlocks) if present — never Weeks / PHAs / real athletes.

---

## 1. Pre-run snapshot (2026-09-05 read-only)

### Production-normal mode — CONFIRMED

| Check | Evidence |
|---|---|
| `Activity Date Is Future?` | Live formula = `IF({Activity Date}, IF({Activity Date} > NOW(), 1, 0), BLANK())` — **no Season Sim gate** (MCP `get_table_schema` fldyFAjhbfaC4LlPb) |
| `Submitted Same Day?` | Uses `Submitted At` vs `Activity Date` only — **no Season Sim branch** |
| `Perfect Week Grace Eligible?` | Uses Manual Exception / `Submitted At` / `TODAY()` — **no Season Sim branch** |
| Season Sim fields | **Present** on Submissions: `Season Sim Test Record?`, `Season Sim Clock Now`, `Season Sim Test Submitted At` (unused while unchecked) |
| Prior sim Athlete/Enrollment IDs | Deleted (`recLxhYwSWmlwyHQr`, `recLlFgEVhhiCWSRY`, etc. → 0 records) |
| Leftover "Athlete 1" search | Empty |
| Preflight write guard | `blocked_as_expected` |
| Reference graph | Grade band 9–12 `rec75ruo3XT5nSvaK`; goal 12000 `recHE7FhreD1jqfXm`; **18** active PHA; **10** weeks covering window; Zoom non-cancelled ≥1 |

### Automations (Automations table — Name / Status / Automation Code)

| Code | Live status | Version in Automation Code | Season Sim gate helpers |
|---|---|---|---|
| **010** | Live | **v10.13** | Yes (`isSeasonSimRecord`) |
| **114** | Live | **v6.2** | Yes |
| **073** | Live | **v4.6** | Yes |
| **072** | Live | **v4.9.1** | N/A (weekly package); **no hardcoded recordId** |

GitHub copies match these versions. **Do not paste 013 / 067 / 122** as part of this package.

### Hub / email

| Check | Evidence |
|---|---|
| Hub Test Allowlist | `recLxwQnjM6gpfVc9` Active for `schmidt@fairfieldbasketballclub.com` (Hub base `appYG1t5DBRimHBCT`) |
| Harness allowlist | `SAFE_EMAIL_RECIPIENT` only; execute email off by default |

### Offline / read-only commands (this preflight)

| Command | Result |
|---|---|
| `python -m unittest season_simulation.tests.test_offline …` (full suite under `tests/`) | **PASS** — 124 tests |
| `python -m season_simulation preflight` | **PASS** connectivity; `sufficient_for_final_run=False` (expected — formula gates off) |
| `python -m season_simulation dry-run --offline-fixture` | **PASS** — 61 days / 13906 shots |
| `python -m season_simulation dry-run` (live read) | **PASS** — same plan; write readiness countable 58/58, HW 18/18, weekly_arms 6 |
| Write block (`allow_writes=False`) | **PASS** `WriteBlockedError` |

---

## 2. Previous simulation evidence (Sept 2, 2026)

| Run ID | Outcome | Cleanup |
|---|---|---|
| `…T162925Z` | Early / aborted | Cleaned |
| `…T171918Z` | Failed (010/114 date gate + writer gaps) | Cleaned — checklist COMPLETE |
| `…T181332Z` | Writer complete; streak/email arms incomplete | Cleaned |
| `…T202049Z` | Intermediate | Cleaned |
| `…T213135Z` | **Final controlled success** under temporary formulas | Writer complete; cascade verified; **formulas restored**; registry cleanup executed (`cleanup-…T215109Z.json`) |

Local gitignored evidence still on Mike’s machine under `tools/season_simulation/reports/` and `run_registries/` (historical; **do not reuse those run IDs**). Package on master is **reusable** with a **new** `--simulation-id`.

Prior fixtures / formula overrides are **gone** — do not assume gated formulas or leftover Athlete 1 rows exist.

---

## 3. Exact simulation identity

| Item | Value |
|---|---|
| Athlete | **Athlete 1** (First=`Athlete`, Last=`1`), Grade **12** |
| Parent / athlete email | `schmidt@fairfieldbasketballclub.com` only |
| Program Instance | Resolved at runtime from Airtable (Enrollment link) |
| School Year | Runtime resolve (prefer **2026–2027** active config row) |
| Grade Band | Runtime: **9–12** (`rec75ruo3XT5nSvaK` as of preflight) |
| Shot goal | Highest for band: **12000** (`recHE7FhreD1jqfXm`) |
| Window | **2027-05-01 → 2027-06-30** inclusive (**61** days) |
| Scenario seed | `athlete1-2027-v1` |
| Miss days | 15, 36, 50 |
| Perfect Week Eligible | **Expected 0** (negative scenario by design) |
| Disposable only | New Athlete + Enrollment created by this run; never real families |

---

## 4. Planned fixture / result counts

| Artifact | Planned count | Notes |
|---|---:|---|
| Simulation days | 61 | Inclusive window |
| Submissions (submit) | **58** | 61 − 3 misses |
| Miss days | 3 | 15 / 36 / 50 |
| Planned shots | **13906** | ≥ goal 12000 |
| Same-day submissions | 57 | Day 8 same-day probe |
| Backdated submissions | 1 | Write day 22 / activity day 20 |
| Weekly Athlete Summary | ~10 | One per covering Week + Grade Band + Goal at create |
| Homework Completions | **18** | Early Bird + Weeks 1–8 × 2; Week 9 = 0 PHA |
| Needs Revision HW | 9 | Incl. gate probe day 28 |
| Video Feedback | 4 | Days 5, 19, 33, 47 |
| Zoom Meetings (disposable) | 2 | Live day 12 + Recording day 40 |
| Zoom Attendance | 2 | Live Attendees patch; recording quiz + Satisfactory |
| Submission Assets | ~27 | HW + video assets |
| XP / Streaks / Unlocks / Levels | Automation cascade | Not harness-created |
| Email handoffs | 0 unless `--enable-email-delivery` | Allowlist only if enabled |
| Perfect Week Eligible | **0** | Expected for athlete1 design |

---

## 5. Temporary changes required for the authorized run (Stage A)

Paste via **OMNI / Mike only** immediately before execute. Leave restore formulas ready.

1. **`Activity Date Is Future?`** → temporary gated formula (`FORMULAS-TO-PASTE.txt` / operator checklist)  
2. **`Submitted Same Day?`** → temporary Season Sim branch (`same_day_contracts.SUBMITTED_SAME_DAY_TEMPORARY`)  
3. **`Perfect Week Grace Eligible?`** → temporary Season Sim branch (`PERFECT_WEEK_GRACE_TEMPORARY`)  
4. Confirm Season Sim fields remain available (already present)  
5. Optional ops: pause Automation **056** during the run window (wall-clock yesterday refresh can zero 2027 streaks)  
6. Do **not** change registration/payment flows; do **not** broaden email beyond allowlist  

**Already satisfied (no paste required for Season Sim date gate):** Live **010 v10.13 / 114 v6.2 / 073 v4.6**.

**Mandatory after run (Stage Z):** restore all three formulas to Production NOW()/TODAY()/CREATED_TIME paths; confirm no leftover gated Submissions; cleanup this run only.

---

## 6. Ordered simulation stages

| Stage | Action | Expected | Monitor / stop |
|---|---|---|---|
| **A** | Paste temporary formulas; re-run `preflight` until `sufficient_for_final_run=True` (or knowingly accept with `--acknowledge-clock-override` after gates confirmed) | Formula gate detected; same-day readiness true | **STOP** if ordinary athlete path would weaken (gate missing Season Sim markers) |
| **B** | `dry-run` live | Counts match §4 | **STOP** if PHA ≠ 18 or weeks gap |
| **C** | `execute` (email off default) | Registry `status=complete`; Athlete+Enrollment+58 subs+18 HC+… | **STOP** on first writer error → registry `paused`; fix; resume same run id |
| **D** | Cascade settle | Poll 010 / 064→065 / 113→114 / 101 / 053→054 / 057 / 076→079 | **STOP** if Ready=1 stuck Pending >30 min without progress |
| **E** | Reconcile | Countable ≈58; XP Source Keys present; streaks created; PW Eligible=0 | **STOP** if countable ≪58 (formula gate missing) |
| **F** | Optional `--enable-email-delivery` | Handoffs → Hub Accepted/Sent allowlist only | **STOP** on non-allowlisted recipient |
| **G** | Evidence | `python -m season_simulation evidence --simulation-id $RUN` | Archive reports |
| **H** | Cleanup | Registry-scoped delete + enrollment-scoped XP/email extras | **STOP** if target not in registry / not this enrollment |
| **Z** | Restore formulas + Production-normal verify | Formulas match §1 Production restore; control submission still counts via NOW() | **STOP** if formulas still gated after cleanup |

---

## 7. Stop conditions

1. Non-allowlisted email recipient detected  
2. Writer attempts touch Weeks / PHA / Homework Library / real athletes  
3. `Activity Date Is Future?` still Production NOW-only after Stage A claimed complete → countable will be 0  
4. Automation cascade mass-skip on sim rows after gates pasted  
5. Payment / registration / Fillout / public campaign paths activated  
6. Any request to paste **013 / 067 / 122** or implement **FUT-029** mid-run  
7. Interrupted run with formulas still gated → **immediate Stage Z restore** even if cleanup deferred  

---

## 8. Retry / resumability / interrupted-run safety

- **Resume:** same `--simulation-id` + registry; dedupe keys `SEASON-SIM|<run_id>|…`  
- **Do not** invent a second Athlete mid-run  
- **Interrupted before cleanup:** registry preserved; resume or cleanup that run id only  
- **Interrupted with temporary formulas live:** restore Production formulas **first** (Stage Z) so Production never remains in simulated-time mode — even if disposable records remain briefly  

---

## 9. Cleanup ownership rules

Cleanup deletes **only**:

1. Record IDs listed in `tools/season_simulation/run_registries/<run_id>.json` for this run  
2. Plus enrollment-scoped dependents created by automations for **that** Enrollment (XP Events, Email Handoff Queue, Streak Occurrences, Athlete Achievement Unlocks) when confirmed linked  

Never delete: Weeks, PHAs, Homework Library, Grade Bands, Goals, Levels, Achievements, XP Reward Rules, Config, other athletes, Mike retained evidence outside this run, AWS/S3 objects, automations, schemas.

---

## 10. Rollback

| Control | Rollback |
|---|---|
| `Activity Date Is Future?` | Production NOW()-only (checklist §2) |
| `Submitted Same Day?` | `SUBMITTED_SAME_DAY_ROLLBACK` |
| `Perfect Week Grace Eligible?` | `PERFECT_WEEK_GRACE_ROLLBACK` |
| Disposable records | `cleanup --execute` for this run id |
| Season Sim fields | Leave in place (unchecked) |

---

## 11. Final Production-normal verification checklist

- [ ] Three formulas restored (MCP/schema inspect or OMNI)  
- [ ] No leftover Athlete 1 / this-run Enrollment  
- [ ] No open Season Sim checkbox rows with `SEASON-SIM|` markers  
- [ ] Normal Schmidt control submission still counts (`Activity Date Is Future?` via NOW())  
- [ ] Hub allowlist unchanged except intentional ops  

---

## 12. Authorization gate

**Mike authorizes execute only by saying:** `RUN SEASON SIMULATION`

Until then: dry-run / preflight / offline tests only. No Production writes, no email sends, no payment changes, no FUT-029, no paste of 013/067/122.
