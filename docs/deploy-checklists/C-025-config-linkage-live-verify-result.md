# C-025 — Live precedence verification result (DEV)

**Run:** 2026-07-14 ~06:03 MDT  
**Command:** `python tools/airtable/_c025_config_linkage_verify.py live --confirm-write`  
**Base:** `appTetnuCZlCZdTCT`  
**Raw:** `tools/airtable/_preview/c025_config_linkage_verify_live.json`

---

## Pre-test snapshot

Config `recq14M5hEv3TIGEj`:

| Field | Value |
|---|---|
| Zoom Recording XP Percent of Live | 50 |
| Recording Gives Full Zoom Gate Credit? | true |

Zoom Meetings `rech5YbJNUzBRY6LQ`:

| Field | Value |
|---|---|
| Recording XP Percentage — Meeting Override | null |
| Full Gate Credit — Meeting Override | null |
| Config (Program Scope) | [recq14M5hEv3TIGEj] |
| Config (Global Scope) | [recq14M5hEv3TIGEj] |

Effectives confirmed still editable (not formula) before run. Draft formulas present and read-only during run.

---

## Precedence results

| # | Test | Result |
|---|---|---|
| 1 | Meeting Override wins over Program Config | **PASS** (draft 10 vs Config 40) |
| 2 | Program Config when Override blank | **PASS** (draft 40) |
| 3 | Global Config when Program link absent | **PASS** (draft 40; prog link null; glob rollup 40) |
| 4 | Safe fallback when both links absent | **PASS** (draft 50) |
| — | Checkbox Config unchecked ≠ fallback true | **FAIL** (gate_draft stayed 1) |
| 5 | Config restored = pretest | **PASS** |
| 6 | Meeting restored = pretest | **PASS** |
| 7 | Schmidt credit 4/4 after restore | **PASS** |
| 8 | Deadline true date | **PASS** |
| 9 | Effectives remain editable | **PASS** |
| 10 | No XP/email/PROD/Make/Vercel/AWS/117/C-027 | **PASS** (scope confirms) |

**Score:** 11 pass / 1 fail (checkbox unchecked path)

---

## Failed assertion detail

`checkbox_config_unchecked_not_fallback`: after setting Config `Recording Gives Full Zoom Gate Credit?` = false and clearing gate override, draft gate formula still returned **1**.

**Root cause (verified read-only after restore):** Program/Global `Full Gate Credit` rollups have **no aggregation formula** in Meta options (`referencedFieldIds: []`, no `formula`). Default checkbox→number rollup behavior returns **1 whenever a Config row is linked**, even if the checkbox is unchecked. Number/select rollups still carry usable scalar values (XP% path passed).

Restoration completed successfully before/through finally; Config gate restored to **true**, XP% to **50**.

---

## Restoration

All six snapshotted fields restored OK (`restoration_ok: true`).

---

## Recommendation

- **Number / select precedence via draft formulas is proven** — safe evidence to proceed toward Effective→formula UI convert for those settings.
- **Do not convert checkbox Effectives yet** until Program/Global checkbox rollups are repaired to the design aggregation:

  `IF(COUNTA(values) = 0, BLANK(), OR(values))`

  (or equivalent that returns false when Config checkbox is unchecked).
- Then re-run the checkbox assertion before UI conversion of gate / PW / coach / makeup / email-enabled Effectives.

**Stop:** awaiting Mike approval for rollup formula repair (schema write) and/or UI Effective conversion.
