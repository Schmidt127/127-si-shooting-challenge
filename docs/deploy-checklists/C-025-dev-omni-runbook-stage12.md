# C-025 — DEV OMNI implementation runbook (Stage 12)

**Status:** Proposal runbook (no Airtable execution in S12)  
**Package:** `C-025-zoom-recording-design`  
**Base:** DEV only (`appTetnuCZlCZdTCT` per PROJECT_STATE — confirm before any OMNI work)  
**Prerequisite:** Owner answers OD-1…OD-6 in [C-025-zoom-recording-design-stage12.md](./C-025-zoom-recording-design-stage12.md) §10

---

## Hard stops

- Do **not** create/rename/delete fields in PROD.
- Do **not** paste automation code to PROD unattended.
- Do **not** change Tutorials tables.
- Do **not** implement Learning Activities schema under this runbook.
- Prefer OMNI for in-base field creation after Mike authorizes Airtable work.

---

## Phase 0 — Verify current Zoom surface (read-only)

In DEV, confirm actual field names for:

1. Zoom Meetings: `Attendees`, `Zoom Meeting Key`, `Create XP Events`, `XP Award Status`, recording URL field (if any).
2. Enrollment: `Total Zoom Attendances`, `Zoom Meetings`, `Progress Processing Enabled?` (C-010).
3. Existing XP Events Source Keys for a sample live award (`ZOOM_ATTEND_BASE|…` expected today).
4. XP Reward Rules row for `ZOOM_ATTEND_BASE` amount.

Record findings in a short DEV note before creating anything.

---

## Phase 1 — Schema (OMNI / Mike) after OD answers

1. Create `Zoom Recording Claims` table with fields from design §4.2.
2. Add Zoom Meetings fields from design §4.1 (`Recording Attendees` required).
3. Add XP Reward Rule `ZOOM_ATTEND_RECORDING` at **50%** of live base (explicit integer).
4. Update Enrollment `Total Zoom Attendances` to distinct-meeting count across live Attendees ∪ Recording Attendees (formula/rollup). **Test on Schmidt enrollment first.**
5. Add Testing views (pair with C-019 when available): Pending claims, Approved-not-awarded, Skipped-live-exists.

---

## Phase 2 — Automation (GitHub → DEV paste)

1. Implement sibling script (recommended `101r`) or extend **101** with recording mode — GitHub first.
2. Inputs: claim `recordId`.
3. Outputs: `statusOut`, `actionOut`, `errorOut`, `debugStep`.
4. Enforce exclusivity helpers including legacy `ZOOM_ATTEND_BASE`.
5. Honor C-010 `Progress Processing Enabled?`.
6. Paste to DEV only after offline tests pass.

---

## Phase 3 — DEV acceptance checklist

| # | Scenario | Expect |
|---|----------|--------|
| 1 | Live attendee only | Live XP; gate +1; no recording XP |
| 2 | Recording approved, no live | Recording XP at 50%; gate +1; Recording Attendees linked |
| 3 | Live then recording approve | Recording skipped; claim reason live-exists |
| 4 | Recording then live award attempt | Live skipped; recording retained |
| 5 | Double approve same claim | Idempotent skip |
| 6 | Progress disabled enrollment | Skip award |
| 7 | Legacy live key only | Treated as live for exclusivity |
| 8 | Past deadline (if OD-2 set) | New claims rejected |

---

## Phase 4 — Promotion (later)

Use `docs/deploy-checklists/` promotion pattern: DEV evidence → Mike approval → PROD paste + CHANGELOG. Not part of S12.

---

## Rollback

1. Turn off recording-claim automation.
2. Stop accepting new claims (uncheck `Recording Available?` or close form).
3. Leave awarded XP Events intact unless a dedicated repair audit says otherwise.
4. Revert Enrollment attendance formula only if gate counts regress (restore prior formula from schema snapshot).
