# SC-MULTI-ASSET-HW — Desktop operator runbook

**Status:** **COMPLETE** 2026-08-31 — exactly one `HOMEWORK_XP|rec8E94Jg7mpmuMW9` (`recwpzl8pkXecUqRK`, 35 XP, no duplicate).  
**Lesson:** After 065 dynamic `recordId` remap, stuck HCs at Reconcile=1 with empty Last Signature needed **manual trigger re-entry** before 065 fired.

**Purpose (historical):** Disposable live run on Testing3 to prove Automation **065** awards exactly one `HOMEWORK_XP|{HomeworkCompletionID}` after the **065 `recordId` dynamic remap**.

**Do not:** Run `--apply` twice without cleanup · repaste automations · send email · run season simulation · change the 18-assignment design.

Evidence: [`../evidence/sc-multi-asset-homework/closeout-2026-08-31-065-xp.json`](../evidence/sc-multi-asset-homework/closeout-2026-08-31-065-xp.json) · [`MULTI-ASSET-HW-RESULTS.md`](./MULTI-ASSET-HW-RESULTS.md)

---

## Preconditions (verify before you start)

| # | Check | How |
|---|--------|-----|
| 1 | Repo branch | `master` or PR #306 merged; harness at `tools/testing/sc-multi-asset-homework.mjs` |
| 2 | PAT | `AIRTABLE_API_TOKEN` in `web/.env.local` (or `.env.local`) with **create/update** on Submissions, Submission Assets, Homework Completions, XP Events read |
| 3 | Base | Production Shooting Challenge `appn84sqPw03zEbTT` (default) |
| 4 | Automations ON | **020**, **064**, **065** Live — **075 retired** |
| 5 | **065 `recordId`** | Run script input = **dynamic Record ID from trigger** (same pattern as 020). **Not** a hardcoded `rec…` literal. |
| 6 | Enrollment | Testing3 only: `recNu6fcBpF1GG3u5` — never real athletes |
| 7 | Prior fixture | If last run left records, run cleanup first (below) |
| 8 | Duplicate WAS | If Testing3 has **two** Early Bird WAS rows, harness tries to delete `recb1hq4wJKfBcy6z`; PAT may 403 — delete duplicate in Airtable UI if 065 blocks on WAS ambiguity |

### Live fixture IDs (2026-08-30 audit — do not change)

| Role | Record ID |
|------|-----------|
| Testing3 Enrollment | `recNu6fcBpF1GG3u5` |
| Early Bird Week | `recBrZ1sV8byWEHZU` |
| PHA HW1 / HW2 | `recgj8dPk4ouTwCOj` / `recXXZErbjxxGxWw2` |
| Library HW1 / HW2 | `rechVLOeyEVIqmy2v` / `rec6WmXjpLtIWDERo` |
| Shared WAS (kept) | `recIwx50zhNsUqV1L` |
| Template attachment asset | `rec94yqw5w7tqtJgc` |

---

## Step 1 — Offline smoke (no Airtable writes)

From repo root:

```bash
node tools/testing/tests/test_sc_multi_asset_hw_offline.mjs
node tools/testing/sc-007-008/idempotency-proof-pack.test.js
node tests/workflow-contracts/season-calendar.test.js
```

All must exit 0.

---

## Step 2 — Optional cleanup (if prior disposable run exists)

```bash
node tools/testing/sc-multi-asset-homework.mjs --cleanup
```

- Reads manifest: `docs/testing/core-workflow/fixtures/_sc-multi-asset-hw-last.json`
- Deletes XP → HC → Assets → Submissions (manifest ids only)
- **Does not** delete Early Bird Week, shared WAS, or PHA rows

If cleanup returns `"status": "error"` with 403 on DELETE, use Airtable UI or MCP to delete manifest ids listed in the evidence JSON.

---

## Step 3 — Final live apply (THE command)

```bash
node tools/testing/sc-multi-asset-homework.mjs --apply
```

This is the **only** live apply command for this proof. No flags beyond `--apply`.

### What the harness does (disposable)

1. Creates Submission + **two** HW1 assets → waits for **020** → **one** HC, both assets linked
2. Grades HC Satisfactory + Review Complete → waits for **064/065** → polls `HOMEWORK_XP|{hcId}`
3. Re-arms review → confirms **still one** XP (idempotency)
4. Creates HW2 asset → **separate** HC (slot isolation)
5. Creates asset without PHA → **020 fail-safe** (`Upload Status=Error`)
6. Clears **Send to Make Trigger** on all test assets
7. Asserts **no** Email Handoff Queue rows for created ids
8. Writes evidence JSON + manifest for cleanup

**Never sends email.** Never restores 075.

---

## Step 4 — Read the result

### PASS

Terminal JSON ends with `"passed": true` and **every** check `"status": "PASS"`.

Critical checks:

| Check id | Meaning |
|----------|---------|
| `065.xp_event_count` | Exactly **1** XP row (not 0, not 2+) |
| `065.xp_source_key_exact` | Source Key = `HOMEWORK_XP|{hcId}` for the multi-asset HC |
| `065.exactly_one_homework_xp` | Composite pass |
| `065.idempotent_rerun` | Still 1 XP after review replay |
| `hc.no_duplicate_for_enrollment_pha` | One HC for Enrollment+HW1 PHA |
| `020.other_slot_separate_hc` | HW2 HC ≠ HW1 HC |
| `email.no_handoff_queue` | No outbound email queued |

Exit code **0**.

### FAIL

Exit code **1**. Inspect `"checks"` for `"status": "FAIL"`.

| Failure pattern | Likely cause |
|-----------------|--------------|
| `065.xp_event_count` zeroEvents | 065 still wrong `recordId`, 065 OFF, or 064 did not arm Total XP |
| `065.xp_event_count` multipleEvents | Duplicate XP — **stop**; do not grade more HCs |
| `065.xp_source_key_exact` | Wrong Source Key pattern or wrong HC id in key |
| `065.xp_wrong_homework_completion` | XP tied to a different HC |
| `hc.no_duplicate_for_enrollment_pha` | 020 created duplicate HC — investigate before prod |
| `020.missing_assignment_fails_safe` | 020 regressed — missing PHA should Error, not create HC |
| `email.no_handoff_queue` | Unexpected email arm — stop |

Evidence path is printed as `"evidence": "docs/testing/evidence/sc-multi-asset-homework/apply-….json"`.

---

## Step 5 — Record evidence

1. Copy the apply JSON path into [`MULTI-ASSET-HW-RESULTS.md`](./MULTI-ASSET-HW-RESULTS.md) (Final XP proof row).
2. Fill [`../evidence/sc-multi-asset-homework/EVIDENCE-TEMPLATE.json`](../evidence/sc-multi-asset-homework/EVIDENCE-TEMPLATE.json) fields from the apply JSON (optional archive copy).

---

## Step 6 — Cleanup after proof

```bash
node tools/testing/sc-multi-asset-homework.mjs --cleanup
```

### Cleanup safety

| Kept (never deleted) | Deleted (manifest only) |
|---------------------|-------------------------|
| Early Bird Week `recBrZ1sV8byWEHZU` | Test Submissions, Assets, HCs, XP from manifest |
| Shared WAS `recIwx50zhNsUqV1L` | |
| All 18 PHA rows | |
| Real athlete data | |

### PAT limitations

| Operation | Typical PAT | Fallback |
|-----------|-------------|----------|
| DELETE XP Events | Often **403** | Harness tries `Active?=false`; else MCP/UI delete |
| DELETE HC / Submissions / Assets | Sometimes **403** | MCP or Airtable UI using manifest ids |
| DELETE duplicate WAS | Often **403** | Manual delete `recb1hq4wJKfBcy6z` if still present |

Cleanup evidence: `docs/testing/evidence/sc-multi-asset-homework/cleanup-*.json`

---

## Quick reference

| Item | Value |
|------|--------|
| **Exact command** | `node tools/testing/sc-multi-asset-homework.mjs --apply` |
| **Expected XP Source Key** | `HOMEWORK_XP|{HomeworkCompletionID}` (exactly one) |
| **Expected XP Points** | 35 (Early Bird HW1 rule via 064) |
| **Evidence dir** | `docs/testing/evidence/sc-multi-asset-homework/` |
| **Manifest** | `docs/testing/core-workflow/fixtures/_sc-multi-asset-hw-last.json` |
| **065 remap doc** | [`docs/deploy-checklists/065-recordId-dynamic-remap-operator-packet.md`](../../deploy-checklists/065-recordId-dynamic-remap-operator-packet.md) |

---

## Stop conditions

- Two or more `HOMEWORK_XP|…` rows for one HC
- Email Handoff Queue row created for test ids
- Any real (non-Testing3) enrollment touched
- Need to repaste 065 script — use UI input remap only; escalate if script body drifted
