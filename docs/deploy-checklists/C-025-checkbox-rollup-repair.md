# C-025 — Checkbox Config rollup repair + reverify (DEV)

**Date:** 2026-07-14  
**Result:** Checkbox precedence **7/7 PASS** · Restore **OK** · Schmidt **4/4** · Deadline **PASS** · Effectives still editable

---

## Pre-write inventory (checkbox only)

Requested aggregation:

`IF(COUNTA(values)=0, BLANK(), OR(values))`

| Table | Field | ID | Current agg | Proposed |
|---|---|---|---|---|
| Zoom Meetings | Program Config: Full Gate Credit | fldErkg4mbk91xH1a (then replaced) | null (Meta) | COUNTA/OR |
| Zoom Meetings | Global Config: Full Gate Credit | fldaYc5Pc0Z0sL361 | null | COUNTA/OR |
| Zoom Meetings | Program Config: Perfect Week Credit | fldMuSSdKQ4UnPqoa | null | COUNTA/OR |
| Zoom Meetings | Global Config: Perfect Week Credit | fldCUG40Uf5bA8BgR | null | COUNTA/OR |
| Zoom Meetings | Program Config: Coach Approval Required | fldx2vYJlA1z7K2yA | null | COUNTA/OR |
| Zoom Meetings | Global Config: Coach Approval Required | fldQKf9OARsLGWEsG | null | COUNTA/OR |
| Zoom Meetings | Program Config: Makeup Enabled | fldx5OoDjuzf9CgJO | null | COUNTA/OR |
| Zoom Meetings | Global Config: Makeup Enabled | fldU4KuxP9X2ySgWj | null | COUNTA/OR |
| Zoom Meetings | Program Config: Approval Email Enabled | fldQQVXD2XWtjKhyF | null | COUNTA/OR |
| Zoom Meetings | Global Config: Approval Email Enabled | fldQknOoi6Hdw3n34 | null | COUNTA/OR |

**Non-checkbox rollups untouched (10):** Recording XP %, Makeup Window Days, Deadline Mode, Approval Email Timing, Approval Email Template Key (Program + Global each).

---

## What Meta API allowed

- **PATCH rollup `options.formula`:** always **422**
- **CREATE rollup with formula:** accepted HTTP 200 but formula **never stored** (Meta readback has no `formula`)
- Therefore the design COUNTA/OR aggregation **cannot be installed via Meta API**

### Equivalent repair applied (blank-safe)

1. **Config** — add Yes/No formula companions (`* YN`) = `IF({checkbox}, "Yes", "No")` for 5 checkbox settings  
2. **Zoom Meetings** — rename broken checkbox rollups/lookups aside; create **Lookups of YN** with original Program/Global names  
3. **Draft checkbox formulas** — Yes/No chain for Override → Program → Global → fallback  
4. Number/select/text rollups **not modified**

This preserves the design intent: linked+unchecked ≠ missing link.

---

## Checkbox precedence results (after repair)

| Test | Result |
|---|---|
| Meeting Override Yes wins | **PASS** |
| Meeting Override No wins | **PASS** |
| Program checked, override blank | **PASS** |
| Program unchecked, override blank | **PASS** |
| Global checked, Program absent | **PASS** |
| Global unchecked, Program absent | **PASS** |
| Fallback when both links absent | **PASS** |
| Restoration | **PASS** (`restoration_ok: true`) |
| Schmidt 4/4 | **PASS** |
| Deadline true date | **PASS** |
| Effectives remain editable | **PASS** |

Raw: `tools/airtable/_preview/c025_checkbox_yn_repair_verify.json`

---

## Leftovers (not deleted this task)

- `* — legacy rollup` / `* — pre-YN` renamed fields on Zoom Meetings  
- `C025 Checkbox Rollup Probe` (`fldvkxmFANd3KI2uQ`) — Meta delete returned 404 earlier  
- Draft formula helpers retained  

---

## Recommendation

**All Effective fields are now safe to convert** in Airtable UI (same field IDs), using:

- number/select/text: existing draft formulas (rollup path already proven)
- checkbox: Yes/No draft formulas wired to Program/Global YN lookups

Still do UI convert carefully; Meta cannot change Effective type in place. No 117a–f / C-027 until Mike authorizes.
