# Agent 2 Final Report — Airtable Data Model & Field Cleanup

**Date:** 2026-07-24  
**Branch:** `agent2/airtable-data-model-cleanup`  
**Base checkpoint pulled:** `a8f3b00` (includes `adfabc5` + 074 Live writeback docs)

---

## Executive summary

Built a canonical Shooting Challenge data-model pack from the **2026-07-23 PROD schema snapshot**, reconciled it with Agent 9 key/ownership registries and verified weekly-email architecture, and added machine-checked field-contract tests. No production Airtable/Make changes were made. Critical correction: **`Week Key` = `RECORD_ID()`**, not `2026-2027|Week N` (that string is a Week Name + Config year ops convention).

---

## Work completed

1. Pulled latest `master` (`a8f3b00`).  
2. Inventoried schema snapshot + ownership/key docs (reused Agent 9; did not fork XP registry).  
3. Produced table map, field ownership matrix, relationship map, unique-key audit, formula/rollup audit, annual Config/Week audit, cleanup classification, safe migration plan, Mike actions.  
4. Retargeted stale `airtable/schema/current/*` and `docs/data-model.md` as pointers to canonical pack.  
5. Added `tests/data-model/field-contracts.test.js`.  
6. Ran field-contract tests (+ related existing contract suites listed below).

---

## Important findings

| ID | Finding | Evidence class |
|----|---------|----------------|
| F1 | Enrollment is the operational hub (not Athletes) | schema-snapshot |
| F2 | Week Key formula is `RECORD_ID()`; Week Name is human label | schema-snapshot |
| F3 | `2026-2027\|Week 0` pattern is ops/seed convention, not Week Key | architecture doc vs schema |
| F4 | No Weeks.`Week End Key` / `Config - Lnk` in snapshot; End Date Denver + Program Instance used instead | schema + WAS-GUARANTEE |
| F5 | Summary Key = Enrollment Key \| Week Key (RID); live shape includes year inside Enrollment Key | overnight + schema |
| F6 | WAS has overlapping send status fields (Sent? / Make Send Status / Summary Email Status / dual timestamps) | schema + verified-prod Live writeback |
| F7 | HC Completion Key and WAS Weekly Summary Key are display-sensitive | schema formulas |
| F8 | Weekly Threshold XP writer missing in repo | Agent 9 registry |
| F9 | PROD 074 must remain Live (not forced Test) | verified-prod user/architecture |

---

## Problems discovered

| Priority | Problem |
|----------|---------|
| P1 | Doc conflict: Week unique id wording vs actual Week Key formula |
| P1 | Dual WAS sent-status/timestamp fields — Make writeback ownership of Summary* fields **Unknown** until Mike attests |
| P1 | WAS create race (031/101/118) still open — documented by Agent 9 |
| P1 | 117 vs 117c dual ZOOM_CREDIT writers — attestation still required |
| P2 | Weeks text stubs pretend to be relationships |
| P2 | Gate Failure Summary formula likely wrong vs Gate Summary |
| P3 | Stale Athlete-hub language in old schema/current (corrected via pointers) |
| — | Team Shot Tracker inactivity alerts correctly absent — keep out |

---

## Files changed

- `docs/next-wave/data-model/*` (new pack)
- `tests/data-model/field-contracts.test.js` (new)
- `airtable/schema/current/table-map.md`
- `airtable/schema/current/field-map.md`
- `airtable/schema/current/schema-notes.md`
- `docs/data-model.md`

---

## Tests added or updated

- **Added:** `tests/data-model/field-contracts.test.js`

---

## Exact tests run and results

| Command | Result |
|---------|--------|
| `node tests/data-model/field-contracts.test.js` | **14 passed, 0 failed** |
| `node tests/was-email-contracts/run-all.js` | all passed |
| `node tests/config-selection/resolve-config.test.js` | all passed |
| `node tests/automation-ownership/test-contract-harness.mjs` | **7 passed, 0 failed** |

See also `RESULTS.json`.

---

## Commit SHA

See git tip of `agent2/airtable-data-model-cleanup` after push.

---

## Production changes made

**None.**

---

## Production changes still required

1. Keep 074 `sendMode=Live` (ops confirmation).  
2. Mike attest Make Live writeback field list vs WAS Summary* fields.  
3. OMNI view hygiene (hide confusing fields) — optional, no schema rename.  
4. No field deletes/renames until migration tickets approved.

---

## Risks / unresolved questions

- Does Make write `Weekly Summary Sent At` / `Weekly Summary Email Status`, or only Email Sent* + Make Send Status?  
- Should WAS `Level Number` formula be retired in favor of Levels table?  
- HC RID-based key migration timing?  
- Fillout default Config year for 2026–2027?

---

## Conflicts with repository documentation

| Doc | Conflict | Resolution in this pack |
|-----|----------|-------------------------|
| `WAS-WEEKLY-EMAIL-ARCHITECTURE.md` Week unique id + Config - Lnk | Overstates as Week Key / missing field | Clarified in UNIQUE-KEY + ANNUAL audits; architecture left intact (still useful as seed pattern) |
| `docs/data-flow/weekly-summary-flow.md` Week End Key | Field absent | Noted; schedulers use End Date |
| Old `airtable/schema/current/table-map.md` Athlete hub | Wrong hub | Replaced with pointer |

---

## Recommended next actions

1. **P0** Confirm 074 PROD sendMode remains Live.  
2. **P0** Confirm 118/119 season inputs: `dryRun=false`; 118 `sendMode=Live` (paste **118 v1.5** if still v1.4). Schedules stay **ON** — do not disable.  
3. **P1** Mike attest Make writeback fields; hide non-authoritative WAS status columns in ops views.  
4. **P1** Attest 117 XOR 117c.  
5. **P2** Inventory Weeks text stubs before hide/retire.  
6. **P3** Optional HC RID key additive migration ticket.  
7. **P3** Hunt Weekly Threshold XP writer in Airtable UI.

> **Superseded:** “Keep 118/119 OFF” — schedules are **ON** (verified_prod 2026-07-24). See `docs/next-wave/go-live/MIKE-ACTIONS.md`.
