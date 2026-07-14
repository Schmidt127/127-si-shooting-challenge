# C-025 — Effective→Formula postconversion result (DEV)

**Date:** 2026-07-14 ~06:52 MDT  
**Base:** `appTetnuCZlCZdTCT`  
**Command:** `python tools/airtable/_c025_effective_postconversion_verify.py --confirm-write`  
**Raw:** `tools/airtable/_preview/c025_effective_postconversion_verify.json`

---

## Schema (10/10)

| Effective field | Field ID (unchanged) | Type | Result type |
|---|---|---|---|
| Effective Recording XP Percentage | `fldgBdBIDvjMELY3o` | formula | number |
| Effective Recording Makeup Window Days | `fldfDKHOn54ZbH7XL` | formula | number |
| Effective Recording Deadline Mode | `fldnwzUITHTzEeR5n` | formula | singleLineText |
| Effective Recording Approval Email Timing | `fldT2SG7GRc7sT32u` | formula | singleLineText |
| Effective Recording Approval Email Template Key | `fldQtvxkRPGCJ7pq8` | formula | singleLineText |
| Effective Recording Counts for Level Gate? | `fldswwnnpWpiKSIL4` | formula | number |
| Effective Recording Counts for Perfect Week? | `fldEfs9Xk4cIm7sqA` | formula | number |
| Effective Recording Quiz Requires Coach Approval? | `fldkKRtkzO4AkNyED` | formula | number |
| Effective Recording Makeup Enabled? | `fldppA7JHEbYNu3bR` | formula | number |
| Effective Recording Approval Email Enabled? | `fldqPzKXweQISK4ZR` | formula | number |

- **IDs:** same as preconversion manifest  
- **Formulas:** match approved paste set (loose compare; Airtable may rewrite names → field IDs)  
- **ZA lookups:** still bound to the same ZM field IDs (`za_lookups_ok: true`)  
- **Airtable formatting forced:** all five checkbox Effectives → formula **number** (1/0), not checkbox — accepted

Exact formulas: see `docs/deploy-checklists/C-025-effective-to-formula-conversion.md` and live Meta on each field.

---

## Precedence matrix (against Effectives)

| Test | Result |
|---|---|
| Program Config when Override blank | **PASS** (40) |
| Meeting Override wins | **PASS** (10) |
| Clear override → Program | **PASS** (40) |
| Global when Program link absent | **PASS** (40) |
| Safe fallback both links absent | **PASS** (50) |
| Checkbox Config checked | **PASS** |
| Checkbox Config unchecked ≠ fallback | **PASS** |
| Checkbox Override Yes wins | **PASS** |
| Checkbox Override No wins | **PASS** |
| Restore Config + Meeting | **PASS** (`restoration_ok: true`) |

**Score:** 13/13 PASS (matrix + Schmidt + deadline + ZA lookups)

---

## Schmidt / deadline / lookups

| Check | Result |
|---|---|
| Schmidt credit | **4/4** |
| Recording XP % / Amount / Gate | 50 / 20 / 1 |
| Calculated Recording Quiz Deadline | true date (**PASS**) |
| ZA Effective lookups populate | **PASS** (`eff_xp: [50]`) |

---

## Untouched

PROD · Make · Vercel · AWS · emails · XP Event creates · 117a–f · C-027 · draft helpers / legacy / probe fields (not deleted)

---

## Next

Cleanup of temporary/legacy fields (separate task), then **117a–f** package paste in DEV — still no PROD.
