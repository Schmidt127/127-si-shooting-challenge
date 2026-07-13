# C-019 — Testing views repo verification (Stage 5)

**Date:** 2026-07-13  
**Worker:** B — Stage 5  
**Branch:** `overnight/v2-run/worker-b-s5-c019-testing-views`  
**Base SHA:** `38b92cb`  
**Status:** **COMPLETE** (repo tooling + checklist supplement)

---

## 1. Scope

Schmidt test enrollment isolation via **Testing** views on 8 pipeline tables. Complements [C-019-testing-views-verification-checklist.md](./C-019-testing-views-verification-checklist.md) (manual UI).

| Table | Filter field | Required view name |
|-------|--------------|-------------------|
| Submissions | Enrollment | `Testing` |
| Submission Assets | Enrollment - Linked | `Testing` |
| Homework Completions | Enrollment | `Testing` |
| Video Feedback | Enrollment | `Testing` |
| XP Events | Enrollment | `Testing` |
| Weekly Athlete Summary | Enrollment | `Testing` |
| Streak Occurrences | Enrollment | `Testing` |
| Athlete Achievement Unlocks | Enrollment | `Testing` |

**Schmidt enrollment:** `recgP9qZYjAhE7NXm`  
**Forbidden filters:** `Active?`, `Is Test Record?`, date/status gates

---

## 2. Repo probe command

```powershell
cd <repo-root>
python tools/airtable/_probe_c019_testing_views.py
```

**Output:** `tools/airtable/_preview/c019-testing-views-probe.json` (when credentials present)

| Probe result | Meaning |
|--------------|---------|
| `testing_view_exists: true` | View named `Testing` on table |
| `testing_view_exists: false` | **Mike/OMNI must create in UI** |
| `schmidt_row_count` | Rows visible through view (if view exists) |

**Limitation:** API cannot read filter definitions — UI verification still required per C-019 checklist.

---

## 3. Owner-approved Schmidt rules (C-019 + owner #7)

- `Active?` = **false** for standings  
- **Full pipeline** runs — no `Is Test Record` on pipeline tables  
- Filter by **Enrollment link** only in Testing views  
- Exclude from public web and real-family comms (pairs with C-010 S5-40–42)

---

## 4. DEV verification steps (Mike / OMNI)

1. Run probe script (read-only).  
2. For each table missing `Testing` view → create in Airtable UI per C-019 checklist.  
3. Confirm filter: Enrollment = `Schmidt, Testing - 2025-2026` (`recgP9qZYjAhE7NXm`).  
4. Re-run probe; save JSON to `docs/audits/` with date stamp.

---

## 5. Integration with C-020

After **115** test scenarios run on Schmidt enrollment, use Testing views to inspect pipeline rows without polluting production operator views.

*Worker B · C-019 repo verification · COMPLETE*
