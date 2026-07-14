# S20 Agent B — retirement review + 117 orchestrator contracts

**Role:** Agent B (readonly + tests)  
**Date:** 2026-07-14  
**Branch:** `overnight/lead-integration`  
**Orchestrator reviewed:** `airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js` **v1.0.0**  
**Slot plan:** `docs/deploy-checklists/C-025-s20-orchestrator-slot-plan.md`  
**PROD:** untouched · **Push:** none · **Disables performed:** none

---

## Verdict

**Orchestrator PASS** on required safeguards (Recording Quiz–only XP, conflict deactivate, gate/PW independent flags, email skip paths, A→F order, no hardcoded webhook).  
**Retirement candidates remain Mike-gated** — recommend 112 delete / 043 retire only with explicit approval.  
**Offline tests:** 34/34 OK.

---

## Task Classification

| Field | Value |
|-------|--------|
| Type | Readonly review + offline contract tests |
| Priority | P0 (S20 pair with Agent A) |
| Difficulty | Medium |
| Owner | Agent B |
| Dependencies | Agent A orchestrator (now present) |
| Backlog ID | C-025 / S20 |
| Phase | 3 |
| Correct tool | Cursor |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Approve any disable; paste one DEV orchestrator OFF→wire→smoke |

---

## 1) Retirement / OFF candidates (Mike must approve any disable)

Repo evidence only — **no Airtable changes by Agent B.**

### P0 Category F (Wave 2A Mike decisions 2026-07-05 — **not executed**)

| # | Status in docs | Keep | Recommendation |
|---|----------------|------|----------------|
| **112** | automation-index **OFF — monitor before delete**; Cat **F**; duplicate of **013** | **013** | Delete in next **Mike-approved** maintenance window. Do not re-enable. |
| **043** | Cat **F** Retire; **042** owns gate | **042** (`…with-gate-blocking.js`) | Disable/retire after Mike confirms 042 assigns Level Gate Rule live. |

Sources: `docs/automation-index.md`, `docs/v2-014-automation-modernization-roadmap.md`, `docs/v2-014-wave-2a-classification.md`, Agent A `C-025-s20-orchestrator-slot-plan.md`.

### Already done

| # | Notes |
|---|--------|
| **008** | Removed → **116** same slot (net 0) |
| **012** | Deleted (+1 historically) |

### Not retirement (operational OFF)

| # | Notes |
|---|--------|
| **070a** | Idle OFF / PROD OFF — keep for intentional homework tests |
| **070c** | Optional async path only — do not auto-delete |

### Capacity

| Metric | Value |
|--------|------:|
| GitHub `shooting-challenge/*.js` | **57** (incl. orchestrator + 117a–f library) |
| Airtable cap | **50** |
| Live DEV count | **UNKNOWN** (Mike: at limit) |
| S20 paste need | **+1** (orchestrator) — not +6 |

**Align with Agent A:** freeing **112** and/or **043** is optional if ≥1 free slot exists; still **Mike approval** either way.

---

## 2) Orchestrator script review (R1–R8)

File: `117-zoom-recording-credit-orchestrator.js` · SCRIPT `117-zoom-recording-credit-orchestrator` · v1.0.0

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| R1 | Step order A→B→C→D→E→F | **PASS** | `main()` calls `stepA`…`stepF` sequentially; defs ordered; reload after B before C |
| R2 | Recording Quiz–only XP | **PASS** | `stepC` skips non–Recording Quiz; Live left to **101** |
| R3 | Conflict deactivate | **PASS** | `deactivated_on_conflict` when !approved/conflict/amount≤0 and Active XP exists |
| R4 | Gate / PW independent + idempotent | **PASS** | Separate applied fields; `skipped_already_applied` / conflict skips |
| R5 | Email `skipped_no_webhook` / `skipped_not_approved` | **PASS** | Blank webhook before fetch; conflict/!approved before send; stamp only after 2xx |
| R6 | No PROD / no hardcoded webhook | **PASS** | `webhookUrl` from `input.config()` only; soft test asserts no `https://hook…` literal |
| R7 | Standard outputs | **PASS** | `statusOut`, `errorOut`, `debugStep`, composite `actionOut`, `actionAOut`–`actionFOut` |
| R8 | Slot plan | **PASS** (design) | Option 1 = one automation; 117a–f library-only; Mike gate on any disable |

### Additional positives

- Reload after B so formula credit fields see `Satisfactory?` before XP/gate/PW/email (important coalesce win vs six separate triggers).  
- Early abort on A hard skips (`not_recording_quiz` / `missing_links` / `duplicate_pair`).  
- Zero-amount distinguishes `skipped_zero_amount` (matches 117c v1.0.1).

### Defects / risks (non-blocking)

| ID | Severity | Finding | Notes |
|----|----------|---------|-------|
| D1 | Low | `skipped_no_webhook` returns computed `sendKey` in output (not stamped) | Same family as 117f debug outs; does **not** write Send Key field — OK |
| D2 | Low | `deactivated_on_conflict` also covers zero-amount deactivation | Matches 117c naming; slightly overloaded |
| D3 | Info | Full XP Events `selectRecordsAsync` each run | Same pattern as standalone 117c; watch DEV noise if automation fires often |
| D4 | Info | Broad “matches conditions” trigger may re-fire often | Self-gates mitigate; Mike can tighten if noisy (per slot plan) |
| D5 | Doc | Index / S19 sheets still describe six paste slots | Superseded by S20 Option 1 — Lead should update automation-index when activating |
| D6 | Fixed (tests) | Soft source assert expected literal `ZOOM_CREDIT\|` | Orchestrator correctly reads formula field `Zoom Credit Key` — assertion updated |

**No PROD concerns** in script defaults. Paste into **DEV only**; leave `webhookUrl` blank until intentional email test.

---

## 3) Tests

| File | Role |
|------|------|
| `tools/airtable/tests/test_c025_117_orchestrator.py` | Step order, skip paths, gate/PW, email, JS presence + A→F def order + no hardcoded webhook |
| `tools/airtable/tests/test_c025_117_contracts.py` | Extended 117c conflict/zero-amount; 117d/e idempotent; 117f not-approved; stub zero-amount fix |

```text
python -m unittest tools.airtable.tests.test_c025_117_orchestrator tools.airtable.tests.test_c025_117_contracts
→ Ran 34 tests in 0.005s · OK
```

---

## 4) Mike next (activation — not Agent B)

1. Do **not** disable 112/043 unless you choose to free a slot.  
2. Create **one** DEV automation: `117 - Zoom Recording Credit - Orchestrator` — paste Option 1 script **OFF**.  
3. Map `recordId` + optional blank `webhookUrl`.  
4. ON → smoke Schmidt recording fixture; expect credit steps; email `skipped_no_webhook`.  
5. Do **not** paste 117a–f as six slots.

---

## Deliverables

- `docs/overnight-runs/results/S20-agent-b-result.md` (this file)  
- `tools/airtable/tests/test_c025_117_orchestrator.py`  
- `tools/airtable/tests/test_c025_117_contracts.py` (extended)
