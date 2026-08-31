# Operator packet — Automation 065 `recordId` input remapping (NO script paste)

**Date:** 2026-08-30  
**Closeout:** 2026-08-31 — **COMPLETE**  
**Backlog:** SC-015 / SC-016 / MRW-F02 / MRW-F04 / SC-MULTI-ASSET-HW  
**Severity (historical):** Blocked new Homework XP awards via live **065** until remap + trigger re-entry  
**Do NOT:** Repaste Automation 065 script body (v10.4 code is already Live)

---

## Closeout (2026-08-31)

| Item | Result |
|---|---|
| Live 065 `recordId` | Dynamic `{ "$ref": "trigger", "path": ["id"] }` (MCP confirmed) |
| Trigger | `Homework XP Reconciliation Needed? = 1` |
| Post-remap apply | Still failed until **manual trigger re-entry** — HC stayed at Reconcile=1 with empty Last Signature (`recordMatchesConditions` does not re-fire while already matching) |
| XP Event | Exactly one `HOMEWORK_XP\|rec8E94Jg7mpmuMW9` = `recwpzl8pkXecUqRK` (35 XP, Active) |
| Duplicates | **None** |
| HC writeback | Award Status **Awarded**; Reconcile **0**; Last Signature set |
| Evidence | [`../testing/evidence/sc-multi-asset-homework/closeout-2026-08-31-065-xp.json`](../testing/evidence/sc-multi-asset-homework/closeout-2026-08-31-065-xp.json) |
| Results | [`../testing/core-workflow/MULTI-ASSET-HW-RESULTS.md`](../testing/core-workflow/MULTI-ASSET-HW-RESULTS.md) |
| Runbook | [`../testing/core-workflow/MULTI-ASSET-HW-OPERATOR-RUNBOOK.md`](../testing/core-workflow/MULTI-ASSET-HW-OPERATOR-RUNBOOK.md) |
| PR | [#312](https://github.com/Schmidt127/127-si-shooting-challenge/pull/312) MERGED `f8a7365f` (follow-up to [#306](https://github.com/Schmidt127/127-si-shooting-challenge/pull/306)) |

**Operator lesson:** After remapping a stuck automation input, force Reconcile `1 → 0 → 1` (set Last Signature = Current, wait for 0, clear Last / change signature inputs) so `recordMatchesConditions` re-enters. Remap alone does not wake records already matching.

---

## Finding (MCP live read) — historical 2026-08-30

Automation **065** (`wfllkhzl3R6OlClzy`) script action input **was** a **literal string**, not the trigger Record ID:

| Automation | `recordId` input (MCP `get_automation`) | Status |
|---|---|---|
| **020** `wfl5bUBHJGLVFWuQA` | `{ "$ref": "trigger", "path": ["id"] }` | Correct (dynamic) |
| **065** `wfllkhzl3R6OlClzy` | `"reccYReUfSId2MH1S"` (plain string) | **Broken (fixed 2026-08-31)** |

`reccYReUfSId2MH1S` was **not** a live Homework Completion. Live 065 therefore could not operate on new HCs until remapped.

Evidence: multi-asset apply `docs/testing/evidence/sc-multi-asset-homework/apply-2026-08-30T191216579Z.json` — **064** armed `Total Homework XP Awarded=35` + `Award Status=Pending` + `Homework XP Reconciliation Needed?=1`, but **no** `HOMEWORK_XP|{hcId}` row was created and HC `Automation Error` stayed blank (065 never targeted the disposable HC).

Prior closeout [`2026-08-24-065-066-dynamic-trigger-closeout.md`](./2026-08-24-065-066-dynamic-trigger-closeout.md) claimed dynamic mapping; **2026-08-30 live MCP contradicted that for 065** (since remapped).

---

## Exact Mike steps (UI only — ~2 minutes) — completed

1. Open Production base → **Automations**.
2. Open **065 - Homework Review and XP - Create or Update Homework XP Event** (keep **ON**).
3. Open the **Run a script** action.
4. Under **Input variables**, find `recordId`.
5. Change the value from any hardcoded `rec…` literal to:
   - **Airtable record ID** of the **triggering Homework Completions record**  
   - Same pattern as **020**: blue dynamic chip / “Record ID” from trigger (not a pasted test ID).
6. Click **Done** / save. Confirm the automation remains **ON** and still shows version **v10.4** in script header (do **not** replace the script text).
7. If an HC is already stuck at Reconcile=1 with empty Last Signature: force **trigger re-entry** (Last Signature = Current → wait Reconcile=0 → clear Last → Reconcile=1) so 065 runs once.

### Do not

- Paste a new script body for 065 / 064 / 020 / 022 / 057 / 072 / 073.
- Hardcode any test HC into the input.
- Turn 065 OFF for longer than needed to edit the input.
- Restore Automation 075.

---

## Safe verification after remap (disposable Testing3 only)

Use enrollment **Testing3** `recNu6fcBpF1GG3u5` — not real athletes.

**Proven** on HC `rec8E94Jg7mpmuMW9`:

1. Exactly one XP Event: Source Key `HOMEWORK_XP|rec8E94Jg7mpmuMW9`, points 35, Bucket/Source Homework Completion.
2. Award Status Awarded; Reconcile Needed 0.
3. No second `HOMEWORK_XP|…` row for that HC.

---

## Stop / rollback

| Signal | Action |
|---|---|
| Input still shows a plain `rec…` string in MCP / UI | Do not proceed; remap again |
| Two `HOMEWORK_XP\|…` rows | Stop; investigate before more reviews |
| Need undo | Airtable automation revision history — restore prior input mapping only |

---

## Related evidence

- Apply (blocked): [`docs/testing/evidence/sc-multi-asset-homework/apply-2026-08-30T191216579Z.json`](../testing/evidence/sc-multi-asset-homework/apply-2026-08-30T191216579Z.json)
- Apply (post-remap, pre re-entry fail): [`docs/testing/evidence/sc-multi-asset-homework/apply-2026-08-31T122146465Z.json`](../testing/evidence/sc-multi-asset-homework/apply-2026-08-31T122146465Z.json)
- Closeout: [`docs/testing/evidence/sc-multi-asset-homework/closeout-2026-08-31-065-xp.json`](../testing/evidence/sc-multi-asset-homework/closeout-2026-08-31-065-xp.json)
- Core workflow RESULTS: multi-asset **020** + **065** XP **COMPLETE**
