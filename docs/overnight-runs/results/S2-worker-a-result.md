# Worker A result — S2 C-024 dedupe field inventory

**Worker:** A  
**Task:** Overnight V2 Stage 2 — C-024 dedupe field + automation dependency inventory  
**Branch:** `overnight/v2-run/worker-a-s2-c024-inventory`  
**Base SHA:** `c59dca80723f281a7aa3f26a5f6ec03643c62b93`  
**Environment:** Repo documentation only — **no PROD**, **no lambda edits**, **no automation logic edits**  
**Finished (UTC):** 2026-07-13T02:00:00Z (approx)

---

## Status

**COMPLETE**

| Gate | Result |
|------|--------|
| Table/field inventory (Submissions, Submission Assets, HC, XP Events, Unlocks) | **DONE** |
| Writer matrix for 007, 009, 010, 054, 058, 059, 065, 066, 101, 114, 116, 070a/b/c | **DONE** |
| Source Key pattern + recheck-before-create evidence per writer | **DONE** |
| Gaps flagged for Stage 3 audit script | **DONE** (8 items G-01–G-08) |
| Schema cited from `airtable/schema/current/**` + snapshot + docblocks | **DONE** |
| PROD / lambda / automations logic | **Not touched** (required) |
| `_live-status-update.md` | **Not edited** (required) |

---

## Files changed

| File | Action |
|------|--------|
| `docs/deploy-checklists/C-024-dedupe-field-inventory-stage2.md` | **Created** — comprehensive inventory + writer matrix + dependency graph |
| `docs/overnight-runs/results/S2-worker-a-result.md` | **Created** — this result |

**Not edited (forbidden / out of scope):**

- `lambda/**`, `airtable/automations/**` (read-only for docblocks)
- `docs/overnight-runs/_live-status-update.md`
- Other workers' deliverables (B retry audit, C tests, D contract)

---

## Tests run

**N/A** — documentation-only task. Field names and types verified against:

- `airtable/schema/current/field-map.md`, `automation-trigger-map.md`, `schema-notes.md`
- `airtable/schema/snapshots/schema_doc_appn84sqPw03zEbTT_20260629_045741.md`
- Automation docblocks under `airtable/automations/shooting-challenge/`

---

## Key findings

1. **Two dedupe layers:** C-023 (file hash / `Asset Reuse Decision` / Lambda) vs C-024 (automation **Source Key** on XP Events and **Milestone Source Key** / unlock **Source Key**).
2. **Nine XP Source Key families** documented across **010, 054, 059, 065, 101, 114** (+ **116** read-only for consequences).
3. **Strongest recheck:** **114** explicit `10a - Last-Chance XP Event Recheck Before Create`; **116** idempotent consequence re-fire.
4. **Race-window gap:** **010** and **065** query-first but lack **114**-style second lookup before create (G-01).
5. **Intake dedupe:** **009** uses **Source Attachment ID** per submission only; **007** uses formula **Duplicate Key** (not Source Key).
6. **Upload dedupe:** **070a/b** block legacy Drive URL/ID duplicates; **070c** idempotent writeback verify — separate from XP Source Keys (Worker B owns retry matrix).

---

## Blockers

None for Worker A scope. Stage 3 should implement `audit-dedupe-key-coverage.js` checks per G-01–G-08 in inventory doc §5.

---

## Commit

| Item | Value |
|------|--------|
| Commit SHA | `7502510` |
| Push | `overnight/v2-run/worker-a-s2-c024-inventory` → `origin` |
| PR | **No PR** — worker branch per overnight rules |

---

*Worker A · Overnight V2 Stage 2 · `overnight/v2-run/worker-a-s2-c024-inventory`*
