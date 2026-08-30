# Operator packet — Automation 065 `recordId` input remapping (NO script paste)

**Date:** 2026-08-30  
**Backlog:** SC-015 / SC-016 / MRW-F02 / MRW-F04 / SC-MULTI-ASSET-HW  
**Status (2026-08-30):** Mike corrected **065** `recordId` to dynamic trigger Record ID in Airtable UI. **Final XP proof pending** — run harness per [`MULTI-ASSET-HW-OPERATOR-RUNBOOK.md`](../testing/core-workflow/MULTI-ASSET-HW-OPERATOR-RUNBOOK.md).  
**Do NOT:** Repaste Automation 065 script body (v10.4 code is already Live)

---

## Finding (MCP live read)

Automation **065** (`wfllkhzl3R6OlClzy`) script action input is a **literal string**, not the trigger Record ID:

| Automation | `recordId` input (MCP `get_automation`) | Status |
|---|---|---|
| **020** `wfl5bUBHJGLVFWuQA` | `{ "$ref": "trigger", "path": ["id"] }` | Correct (dynamic) |
| **065** `wfllkhzl3R6OlClzy` | `"reccYReUfSId2MH1S"` (plain string) | **Broken** |

`reccYReUfSId2MH1S` is **not** a live Homework Completion (MCP list returns 0). Live 065 therefore cannot operate on new HCs.

Evidence: multi-asset apply `docs/testing/evidence/sc-multi-asset-homework/apply-2026-08-30T191216579Z.json` — **064** armed `Total Homework XP Awarded=35` + `Award Status=Pending` + `Homework XP Reconciliation Needed?=1`, but **no** `HOMEWORK_XP|{hcId}` row was created and HC `Automation Error` stayed blank (065 never targeted the disposable HC).

Prior closeout [`2026-08-24-065-066-dynamic-trigger-closeout.md`](./2026-08-24-065-066-dynamic-trigger-closeout.md) claimed dynamic mapping; **live MCP now contradicts that for 065**.

---

## Exact Mike steps (UI only — ~2 minutes)

1. Open Production base → **Automations**.
2. Open **065 - Homework Review and XP - Create or Update Homework XP Event** (keep **ON**).
3. Open the **Run a script** action.
4. Under **Input variables**, find `recordId`.
5. Change the value from any hardcoded `rec…` literal to:
   - **Airtable record ID** of the **triggering Homework Completions record**  
   - Same pattern as **020**: blue dynamic chip / “Record ID” from trigger (not a pasted test ID).
6. Click **Done** / save. Confirm the automation remains **ON** and still shows version **v10.4** in script header (do **not** replace the script text).
7. Optional UI check: Automations run history should show future runs using the triggering HC id, not `reccYReUfSId2MH1S`.

### Do not

- Paste a new script body for 065 / 064 / 020 / 022 / 057 / 072 / 073.
- Hardcode `recAhHF7j6OyznARO` or any other test HC into the input.
- Turn 065 OFF for longer than needed to edit the input.
- Restore Automation 075.

---

## Safe verification after remap (disposable Testing3 only)

**065 remap is complete.** Run the final proof:

```bash
node tools/testing/sc-multi-asset-homework.mjs --apply
```

Full operator steps: [`docs/testing/core-workflow/MULTI-ASSET-HW-OPERATOR-RUNBOOK.md`](../testing/core-workflow/MULTI-ASSET-HW-OPERATOR-RUNBOOK.md)

Use enrollment **Testing3** `recNu6fcBpF1GG3u5` — not real athletes.

1. Optional prior fixture cleanup: `node tools/testing/sc-multi-asset-homework.mjs --cleanup`
2. Run `--apply` (creates disposable multi-asset HC, grades, polls XP)
3. Expect exactly one XP Event:
   - Source Key = `HOMEWORK_XP|{HomeworkCompletionID}`
   - XP Bucket / Source = Homework Completion
   - Points = Total Homework XP Awarded (35 for Early Bird HW1 rule)
4. Replay review fields → still **one** XP Event.
5. Confirm **no** Email Handoff Queue row and **Parent Feedback Ready?** remains unchecked unless intentionally set later.

Harness (exact command):

```bash
node tools/testing/sc-multi-asset-homework.mjs --apply
```

---

## Stop / rollback

| Signal | Action |
|---|---|
| Input still shows a plain `rec…` string in MCP / UI | Do not proceed; remap again |
| Two `HOMEWORK_XP\|…` rows | Stop; investigate before more reviews |
| Need undo | Airtable automation revision history — restore prior input mapping only |

---

## Related evidence

- Apply: [`docs/testing/evidence/sc-multi-asset-homework/apply-2026-08-30T191216579Z.json`](../testing/evidence/sc-multi-asset-homework/apply-2026-08-30T191216579Z.json)
- Core workflow RESULTS note: multi-asset **020** path **PASS**; XP blocked by this packet
