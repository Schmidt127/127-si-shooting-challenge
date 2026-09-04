# SC-152 / SC-153 — Independent Perfect Week verification (2026-09-04)

**Agent:** A4 Independent Verification (`verify/sc-152-157-pw-verify-a4`)  
**Base:** Production `appn84sqPw03zEbTT`  
**A1 gate:** PR [#402](https://github.com/Schmidt127/127-si-shooting-challenge/pull/402) — `COORDINATOR_IMPLEMENTATION_GATE: READY`  
**Live automations:** 057 `wflVRPhgunsosFjWS` · 058 `wflDinFz6FBIGEOMg`  
**Evidence dir:** [`docs/testing/evidence/sc-152-153/`](../testing/evidence/sc-152-153/)

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | Independent verification |
| Priority | P0 |
| Backlog | SC-152 (SF-01), SC-153 (SF-02) |
| Phase | 5 Close (verify) |
| Correct tool | Cursor + Airtable MCP |
| Repo | `127-si-shooting-challenge` |

---

## Executive verdict (independent)

| Item | Verdict |
|------|---------|
| A1 before-state model (SF-01 sticky Queue; SF-02 positive-only 058) | **CONFIRMED live** via MCP `get_automation` (2026-09-04) |
| SF-01 / SF-02 DoD met on Production? | **NOT MET** — live still 057 **v2.3** formula-only Queue trigger; 058 **v1.5** positive-only conditions |
| Full Perfect Week scenario matrix | **BLOCKED** — awaits A2 paste of remediation + disposable proof (A2 WIP in worktree only) |
| Trust implementer conclusions? | **No** — this report uses A4 MCP + sibling artifact review only |

---

## Independent live baseline (pre-remediation)

MCP `get_automation` with `includeDeployedVersion=true` (draft == deployed; `deployedVersion` null):

### 057

| Check | Independent result |
|-------|-------------------|
| deploymentStatus | `deployed` |
| Script Version | **2.3** |
| Trigger | `recordMatchesConditions` on WAS |
| Condition | `Perfect Week Calculation Queue?` (`fldNvOVO3WidABUXS`) **= 1** only |
| Writable re-arm field `Perfect Week Recalc Needed?` | **Absent** from live WAS schema (list_tables scan) |

Matches A1 rollback [`057-trigger.json`](../../airtable/rollbacks/20260904-pre-sc152-153/057-trigger.json) and silent-miss class **A6/A7**.

### 058

| Check | Independent result |
|-------|-------------------|
| deploymentStatus | `deployed` |
| Script Version | **1.5** |
| Trigger | `recordMatchesConditions` on WAS |
| Conditions (AND) | Eligible?=1 **and** Unlock **isEmpty** **and** Status=Ready |
| Script body | Contains deactivate/restore branches (unreachable under live UI conditions) |

Matches A1 rollback [`058-trigger.json`](../../airtable/rollbacks/20260904-pre-sc152-153/058-trigger.json) and silent-miss class **B4**.

JSON snapshot: [`docs/testing/evidence/sc-152-153/live-057-058-baseline-20260904.json`](../testing/evidence/sc-152-153/live-057-058-baseline-20260904.json).

---

## A2 remediation status (sibling worktree — not live)

Observed under `a2-remediate` (uncommitted / not Production-pasted at verify time):

| Artifact | Observation |
|----------|-------------|
| 057 script | Bumped toward **2.4** — clears proposed `Perfect Week Recalc Needed?`; Queue formula redesign claimed in docblock |
| 058 script | Bumped toward **1.6** — lifecycle `recordUpdated` contract; no-op-safe deactivate/restore |
| Tests | Contract / lifecycle runtime tests touched |
| Rollbacks | `airtable/rollbacks/20260904-sc152-153/` present |
| Live paste | **Not observed** — MCP still returns 2.3 / 1.5 + old triggers |
| Schema dependency | New WAS checkbox **not live yet** — 057 v2.4 alone cannot satisfy SC-152 without field + Queue formula update + paste |

**A4 note:** 057 worktree still had leftover `version: "2.3"` console paths mid-edit — treat A2 as **in progress**, not ready for DoD close.

---

## Perfect Week scenario matrix

Labels only (Enrollment-Test / WAS-Test / Unlock-Test). No record IDs.

| # | Scenario | Expected | Independent result | Notes |
|---|----------|----------|--------------------|-------|
| 1 | Seven-day pass | Unlock + XP path | **BLOCKED** | Needs post-remediation disposable fixture |
| 2 | Six-day fail | No unlock | **BLOCKED** | |
| 3 | One-day high-volume fail | No unlock (distinct days) | **BLOCKED** | |
| 4 | Insufficient videos | Video Met?=0; no unlock | **BLOCKED** | |
| 5 | Zoom required+satisfied | Zoom Met?=1 | **BLOCKED** | |
| 6 | Zoom required+missing | Zoom Met?=0; no unlock | **BLOCKED** | |
| 7 | No Zoom meeting | Zoom Met?=1 (vacuous) | **BLOCKED** | |
| 8 | Late submission | Not countable / fail | **BLOCKED** | |
| 9 | Backdated submission | Same-day gate | **BLOCKED** | |
| 10 | Duplicate automation execution | Idempotent | **BLOCKED** | |
| 11 | Changed summary inputs after Ready | 057 re-runs (SF-01) | **FAIL live baseline** / **BLOCKED post-fix** | Sticky Queue proven by A1; A4 MCP confirms trigger still formula-only |
| 12 | XP retry / no duplicate XP | One PERFECT_WEEK XP | **BLOCKED** | |
| 13 | Visible failed/incomplete | Observable Error/Skipped | **PARTIAL** | Error path exists when 057 runs; silent miss is non-run |
| 14 | Reconciliation catches stranded | Operator flag/view | **BLOCKED** | Recalc field not live |
| 15 | Eligibility loss withdraws unlock (SF-02) | Unlock Active?=false via 058 | **FAIL live baseline** / **BLOCKED post-fix** | Positive-only trigger still live |
| 16 | Eligibility restore same unlock | No second unlock row | **BLOCKED** | |

---

## SF-01 / SF-02 DoD vs independent evidence

### SC-152 (SF-01) acceptance (from A1 gate)

| Criterion | Independent status |
|-----------|-------------------|
| 057 trigger not solely sticky formula for re-entry | **FAIL** — still Queue?=1 only |
| After Ready, input/re-arm causes 057 re-run | **Not proven** (blocked) |
| Queue? formula retained | **PASS** (still present) |
| Rollback packet present | **PASS** (A1 + A2 snapshots) |
| Disposable proof logged | **FAIL** — none post-remediation |

### SC-153 (SF-02) acceptance

| Criterion | Independent status |
|-----------|-------------------|
| Live 058 lifecycle (not positive-only) | **FAIL** — still Eligible∧empty Unlock∧Ready |
| Eligibility loss deactivates unlock via 058 | **Not proven** (blocked) |
| Restore same Milestone Source Key | **Not proven** (blocked) |
| Positive create still works | **Not re-proven this wave** |

**DoD met?** **No** for SF-01 and SF-02 on Production.

---

## Constraints honored

- No Season Simulation. No broad email.  
- Disposable/synthetic only when running fixtures (none executed by A4 this pass beyond read-only MCP).  
- Record IDs redacted in this report.  
- SC-109/112/147/148/149/151/FUT-025/SEO left closed.  
- Did not implement 057/058 remediations (A2 ownership).

---

## Follow-up for A4 (when A2 gate+impl appear live)

1. Re-MCP 057/058 versions + triggers after paste.  
2. Confirm WAS checkbox + Queue formula change live.  
3. Execute disposable matrix rows 1–16; write evidence JSON under `docs/testing/evidence/sc-152-153/`.  
4. Re-judge SF-01/SF-02 DoD from A4 evidence only.
