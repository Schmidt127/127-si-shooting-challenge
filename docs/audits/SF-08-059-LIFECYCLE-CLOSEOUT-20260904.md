# SF-08 — Automation 059 lifecycle closeout — 2026-09-04

**Agent:** A3 · Branch `final/a3-sf08-059-lifecycle-20260904` · Start SHA `2c113c10`  
**Base:** `appn84sqPw03zEbTT` · Automation **059** `wfltDo4HZxpYlbqn8`  
**Script:** `059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` **v3.8** (GitHub)  
**IDs:** redacted in narrative; disposable records deleted at end of run.

---

## Task Classification

| Field | Value |
|-------|--------|
| Type | Automation lifecycle reliability (SF-08) |
| Priority | P2 |
| Phase | 3 Implementation + 5 Close |
| Correct tool | Cursor + Airtable MCP (disposable records) |
| Repo | `127-si-shooting-challenge` |
| Backlog | SF-08 → **SC-159** (SC-158 is SF-07 / 006 retire) |

---

## Defect (proven live)

| Item | Finding |
|------|---------|
| Live trigger | `recordMatchesConditions` **AND** (`XP Award Status`=Pending, `Active?`=true) |
| Script version live | **v3.7** (matches pre-fix GitHub; notes field = Trigger Context) |
| Silent miss | Clearing `Active?` on Awarded Shot Milestone unlock **does not** match trigger → 059 never runs → linked XP stays **Active?** |
| Observable | Inactive unlock + Awarded status + Active XP Event; Trigger Context unchanged |
| Script capability | Withdraw/restore logic **already present** for Shot Milestone only; unreachable under positive-only trigger |

**Evidence (pre-fix):** Disposable Awarded SM unlock + Active XP → clear `Active?` → after wait, unlock still Awarded, XP still Active, no withdraw note.

---

## Fix (smallest reliable)

1. **Trigger OR** (UI — MCP cannot edit `customScript` automations):
   - `(Pending AND Active?)` **OR** `(Active? = false AND Shot Milestone not empty)`
2. **GitHub v3.8:** align unlock notes → `Trigger Context`; Milestone Source Key alias; document OR trigger; add `lifecycleOut` for visible reconciliation (`award` / `withdraw` / `restore` / `skip` / `error`).
3. **Mike paste + Update** per [`docs/deploy-checklists/059-sf08-lifecycle-trigger-or.md`](../deploy-checklists/059-sf08-lifecycle-trigger-or.md).

057 / 058 / 070a **not** modified (no new regression evidence).

---

## Test matrix (disposable Schmidt fixtures)

| Case | Result |
|------|--------|
| New eligible unlock (Pending+Active SM) | **PASS** — live 059 v3.7 created one XP (30 pts, Shot Milestone bucket/source, unique Source Key, Awarded) |
| Missing Enrollment | **PASS** — status **Error**, Trigger Context `059 error: Missing Enrollment.` |
| Duplicate WAS on award (Early Bird) | **PASS** (visible failure) — status **Error**, message lists multiple WAS for Enrollment+Week |
| Existing XP / restore (Pending+Active re-entry) | **PASS** — XP reactivated Active; unlock Awarded; note `059 skipped: XP Event already linked.` |
| Duplicate execution (re-arm Pending) | **PASS** — still **exactly one** XP Event for Source Key |
| Active? clear while Awarded (live trigger) | **FAIL / SF-08 proven** — silent miss (XP remains Active) |
| Script-contract withdraw (MCP same writes as 059) | **PASS** — XP Active cleared; unlock Skipped + withdraw note |
| Perfect Week Active? lifecycle | **N/A by design** — SM link required for withdraw branch |
| 057/058/070a | Untouched |

---

## GitHub ↔ live sync

| Surface | Status |
|---------|--------|
| GitHub | **v3.8** on this branch |
| Live script body | Still **v3.7** until Mike paste |
| Live trigger | Still Pending+Active-only until Mike OR + Update |
| MCP limitation | `update_automation` / `create_automation` reject `customScript` (`readOnlyNodeType`) |

---

## Cleanup

Deleted this run’s disposable Athlete Achievement Unlocks and XP Events (award, missing-enrollment, lifecycle probe). Enrollment / Weeks / Achievements / Shot Milestone definitions untouched. No Season Simulation. No field deletion. No broad email.

---

## Closure

| Gate | Status |
|------|--------|
| Silent miss proven | **YES** |
| Script withdraw/restore/award/dedupe proven | **YES** (live award/restore/dedupe; withdraw via script-contract + trigger gap documented) |
| GitHub fix | **v3.8** |
| Live OR trigger + v3.8 paste | **Mike publish gate** — checklist above |
| SF-08 / SC-159 | **COMPLETE for Agent 3 deliverable**; live trigger promotion is the remaining operator step |

**Do not** treat SF-08 as “live closed” until Mike publishes the OR trigger and a disposable withdraw re-test shows XP deactivated automatically.
