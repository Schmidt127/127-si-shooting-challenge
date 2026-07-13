# Worker A result — S2 C-024 dedupe field inventory

**Worker:** A  
**Task:** Overnight V2 Stage 2 — C-024 dedupe field + automation dependency inventory  
**Branch:** `overnight/v2-run/worker-a-s2-c024-inventory`  
**Base SHA:** `c59dca8`  
**Environment:** Repo documentation only — **no PROD**, **no Airtable API**, **no automations edited**  
**Finished (UTC):** 2026-07-13T02:15:00Z (approx)

---

## Status

**COMPLETE**

| Gate | Result |
|------|--------|
| Table-per-table dedupe field inventory (5 tables) | **DONE** |
| Writer matrix (13 automations) with Source Key + recheck evidence | **DONE** |
| Citations to `airtable/schema/current/**` + automation docblocks | **DONE** |
| Gaps flagged for Stage 3 audit script | **DONE** (8 items) |
| C-023 byte layer distinguished from C-024 record keys | **DONE** |
| PROD / lambda / make / automations | **Not touched** (required) |

---

## Files changed

| File | Action |
|------|--------|
| `docs/deploy-checklists/C-024-dedupe-field-inventory-stage2.md` | **Created** — field inventory §1–5, writer matrix §6, Source Key registry §7, gaps §8 |
| `docs/overnight-runs/results/S2-worker-a-result.md` | **Created** — this result |

**Not edited (forbidden / out of scope):**

- `lambda/**`, `make/**`, `airtable/automations/**`
- `docs/overnight-runs/_live-status-update.md`, `queue.json`, `agent-status.json`
- `overnight/lead-integration`, Worker B/C/D deliverables

---

## Tests run

**N/A** — documentation task. Field names and formula keys cited from:

- `airtable/schema/current/field-map.md`, `table-map.md`, `automation-trigger-map.md`, `schema-notes.md`
- `airtable/schema/snapshots/schema_doc_appn84sqPw03zEbTT_20260629_045741.md` (prod formula detail)
- Automation docblocks: **007**, **009**, **010**, **054**, **058**, **059**, **065**, **066**, **101**, **114**, **116**, **070a**, **070b**, **070c**
- `docs/v2-change-backlog.md` § Engine principles; `docs/upload-workflow-homework-video.md` §020 dedupe key

---

## Summary

### Tables inventoried

| Table | Key dedupe fields | Primary writers |
|-------|-------------------|-----------------|
| **Submissions** | `Duplicate Key`, `Duplicate Review Status`, `Count This Submission?` | **007**, **010** |
| **Submission Assets** | `Source Attachment ID`; C-023 hash/review fields; upload transport fields | **009**, **070a/b/c**, Lambda, **116** |
| **Homework Completions** | `Homework Completion Key` (Enrollment \| Week \| Homework) | **020**, **065** |
| **XP Events** | `Source Key`, `XP Dedupe Key`, `XP Dedupe Key Normalized` | **010**, **054**, **059**, **065**, **101**, **114** |
| **Athlete Achievement Unlocks** | `Source Key`, `Milestone Source Key`, `Unlock Key` (formula) | **058**, **066**, **059** |

### Writer matrix highlights

- **XP create path:** All six XP writers (**010**, **054**, **059**, **065**, **101**, **114**) query by `Source Key` before create; **114** adds explicit last-chance recheck (Step 10a).
- **Unlock create path:** **058** and **066** guard on writable Source Key / Milestone Source Key; **059** consumes unlock → XP with dual match (Source Key + Achievement Unlock link).
- **Intake path:** **007** reads formula `Duplicate Key`; **009** dedupes `Source Attachment ID` per submission only.
- **Upload path:** **070a/b** block on legacy Drive URL/ID — separate from C-024 Source Key layer; **070c** idempotent writeback verify.
- **Consequence path:** **116** looks up XP by `VIDEO_SUBMISSION\|` / `HOMEWORK_XP\|` — reactivates same row on reversal (DEV S5 validated per automation-trigger-map).

### Stage 3 handoff (gaps)

Eight gaps documented in inventory §8 — top priority: **G2** (Homework Completion Key vs **020** match dimensions), **G1** (**009** vs byte hash), **G4** (**065** missing **114**-style last-chance recheck).

### Lead integration

Deliverable for D → A → B → C merge order: **field inventory aligns with Worker D contract** when D lands canonical Source Key patterns + `audit-dedupe-key-coverage.js` requirements.

---

## Commit

| Item | Value |
|------|--------|
| Commit SHA | `37b5cac8ecedfe057fb61a35b81b0a054d742a3a` (`37b5cac`) |
| Push | `overnight/v2-run/worker-a-s2-c024-inventory` |
| PR | **No PR** — worker branch per overnight rules |

---

## Escalations

None. All assigned automation docblocks present on branch at `c59dca8`. Schema current docs are sparse for XP/Homework field detail — prod snapshot used for formula citations (read-only, not committed).

---

*Worker A · Overnight V2 Stage 2 · `overnight/v2-run/worker-a-s2-c024-inventory`*
