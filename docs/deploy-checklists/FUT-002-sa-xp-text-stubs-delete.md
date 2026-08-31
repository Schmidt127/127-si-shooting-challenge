# FUT-002 — Submission Assets XP text stubs deleted

**Date:** 2026-08-31  
**Base:** Production `appn84sqPw03zEbTT`  
**Table:** Submission Assets (`tblhMLKxQK77agtME`)  
**Operator:** Mike (Airtable UI)

## Deleted

| Former name | Field ID | Former type | Status |
|-------------|----------|-------------|--------|
| XP Events | `fldwOklyDaW3nN2Kz` | singleLineText | **DELETED** |
| XP Events copy | `fld5Emwipb3UjAMz9` | singleLineText | **DELETED** |

These were unused **text stubs**, not linked-record fields. Live homework XP writeback is **Homework Completions ↔ XP Events** (Automation 065). The website Game Log does not read Submission Assets for XP.

## Live verify (Meta API)

Evidence: [`docs/testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json`](../testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json)

- Both field IDs **absent**
- Submission Assets field count: **90**
- Base: **1363** fields / **35** tables

## Do not confuse with

- Real **XP Events** link fields on Homework Completions, Enrollments, Submissions, Weeks, etc. — **keep**
- Text stubs named `XP Events copy` on **other** tables (e.g. Athlete Achievement Unlocks, Weeks) — **not** deleted in this pass

## Follow-up

- Historical Make blueprints / schema snapshots may still list these names — leave as historical
- Regenerate FUT-002 live inventory when convenient: `python tools/airtable/_fut002_live_pass.py`
