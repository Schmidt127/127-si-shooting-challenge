# C-022 — Presentation fields audit (Stage 14)

**Status:** COMPLETE (repo audit)  
**Package:** `C-022-presentation-fields-audit`  
**Base SHA:** `cd5ddc0`  
**Date:** 2026-07-13  
**Scope:** Repo analysis + offline contract — **no Airtable / PROD paste**

---

## 0. Owner rule (from backlog)

Parents / emails / web must use **short Presentation labels only** — never primary-field / `record.name` fallbacks when a Presentation field exists.

Example: homework email column 2 → **Assignment Title**, not **Assignment Full Name** formula / primary name.

Related: **V2-003** (**071**), **V2-004** (**072**).

---

## 1. Recommended Presentation contract

| Entity | Preferred public field | Do not use for parents/web |
|--------|------------------------|----------------------------|
| Homework | `Assignment Title` | `Assignment Full Name`, `record.name`, primary formula |
| Weeks | `Week Label - Public` (verify exact name in DEV) | Long internal week name / primary |
| Video assignments | Public/short title field (inventory) | Primary long name |
| Zoom meetings | Public meeting title if present | Internal ops key alone as email headline |

**Selection algorithm (emails/web):**

```text
display = firstNonBlank(presentationField)
if empty → omit / placeholder "(Untitled)" — do NOT fall back to record.name
```

Audit mode may log missing Presentation values for ops repair.

---

## 2. Repo findings

### 2.1 High priority (parent-facing automations)

| Script | Finding | Severity |
|--------|---------|----------|
| **071** | `homeworkTitle = firstNonBlank(Assignment Title, homeworkRecord.name)` — **explicit primary fallback** | **High** — V2-003 target |
| **072** | Homework display prefers `Assignment Title` then `Assignment Full Name` (~1147) | **High** — V2-004; Full Name is formula/long |
| **072** | Week uses `CONFIG.weekFields.name` for weekName | Medium — confirm Public week label field |
| **076** | References assignment title/full name; also `record.name` elsewhere | Medium — daily package path |
| **033** | Falls back to `record.name` when assigning HW to WAS | Low for parents (internal), still train bad habit |

### 2.2 Web (`/shoot`)

| File | Finding |
|------|---------|
| `web/lib/data/homework.ts` | `title` prefers `Assignment Title` then **falls back to Assignment Full Name** |
| `web/lib/data/homework.ts` | Display string uses `Assignment Full Name - Display` then Full Name |
| `web/lib/airtable/queries.ts` | Fetches Title + Full Name + Display |

Web is closer to Presentation-aware but still falls back to Full Name formulas.

### 2.3 Extension / audit scripts

Multiple audits/backfills use `\|\| record.name` for operator diagnostics — acceptable for **ops tools**, not for parent payload builders. Keep ops fallbacks labeled “debug only.”

---

## 3. Gap matrix → follow-on packages

| Gap ID | Fix package | Change |
|--------|-------------|--------|
| G-071 | V2-003 | Remove `homeworkRecord.name` fallback; require `Assignment Title` or skip/placeholder |
| G-072 | V2-004 | Weekly homework column uses Title only; stop Full Name fallback |
| G-WEB | C-022 web slice | Prefer Title / Public display; never Full Name formula as public title |
| G-WEEK | C-022 + OMNI | Confirm `Week Label - Public` exists; wire **072**/**074** |
| G-VID/ZOOM | later | Inventory public title fields before email surfaces expand |

**This stage does not implement those script edits** (keeps review surface small; implementation needs Phase 3 ticket + DEV test).

---

## 4. Offline tests

`tools/airtable/tests/test_c022_presentation_label_contract.py` encodes:

- Prefer Presentation title
- Reject primary-name fallback when Presentation empty (strict public mode)
- Allow ops/debug mode to use primary name

---

## 5. Owner / OMNI actions waiting

1. Confirm Week public field exact name in DEV/PROD.
2. Confirm every Homework row has non-blank `Assignment Title` (data repair if not).
3. Approve V2-003 / V2-004 implementation after this audit.

---

## 6. Definition of done (audit package)

- [x] Inventory of parent-facing fallbacks
- [x] Presentation selection contract
- [x] Gap map to V2-003 / V2-004 / web
- [x] Offline tests
- [x] No Airtable schema changes in S14
