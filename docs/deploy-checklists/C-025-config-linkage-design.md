# C-025 — Config linkage design (meeting override → Program Config → Global Config → safe fallback)

**Status:** DESIGN ONLY — no DEV schema changes made by this document.
**Author:** Agent A (overnight Lead subagent), 2026-07-13
**Base inspected (read-only Meta API):** DEV `appTetnuCZlCZdTCT` — token from `tools/airtable/.env` (`AIRTABLE_API_TOKEN` / `AIRTABLE_BASE_ID`), **GET only**. No POST/PATCH/DELETE issued.
**Depends on / do not repeat:** [C-025-Zoom-Recording-Manual-Airtable-Repair.md](./C-025-Zoom-Recording-Manual-Airtable-Repair.md) and [C-025-Zoom-Recording-Formula-Repair.md](./C-025-Zoom-Recording-Formula-Repair.md) — the seven credit formulas are **already applied and correct**. This document does **not** touch them; it only replaces how the `Effective *` **inputs** to those formulas get their values.
**Catalog authority:** [C-025-C-027-configuration-catalog-stage16.md](./C-025-C-027-configuration-catalog-stage16.md) — owner-approved 2026-07-13 (`CONTROL.json` → `c025-c027-owner-config-decisions` COMPLETE).

---

## 0. What this fixes

Today, the nine `Effective Recording *` fields on **Zoom Meetings** are plain editable fields (Checkbox / Number / Single select) that Mike (or a script) must set **by hand on every meeting**. Zoom Attendance only ever sees a lookup of whatever is sitting on the meeting — there is no Config table involvement at all. That is the "manually maintained Effective\*" problem this design replaces.

Target end state: each `Effective *` field on Zoom Meetings becomes a **formula** that resolves, in order:

1. **Meeting override** (blank = not set, use next tier)
2. **Program Config** row (the Config row for the meeting's season / program instance)
3. **Global Config** row (one designated default Config row)
4. **Safe fallback constant** (hardcoded in the formula, matches the approved list below)

Zoom Attendance's lookups of `Effective *` are **unchanged in name and field type** — they keep pointing at the same Zoom Meetings field (same field ID), so nothing downstream (the seven credit formulas, `Zoom Credit Debug`, any views) needs to be touched once the Zoom Meetings side is converted correctly. This is verified below field-by-field with live field IDs.

---

## 1. Live inventory (verified 2026-07-13, read-only Meta API GET)

### 1.1 Config table (`tblRB6sh77NxjS568`) — today

No C-025 fields exist yet. Current fields are all pre-existing season/app settings:

`Active School Year`, `Root Google Drive Folder ID`, `Root Google Drive Folder Link`, `Max Videos Per Submission`, `File`, `File Naming Pattern`, `Detailed Stat Tracking Enabled?`, `Require Detailed Stats?`, `HW Review Enabled?`, `Video Review Enabled?`, `Submission Base XP`, `Shot XP Per Shot`, `Submission XP Active?`, `Submission XP Notes`, `Challenge Week Count`, `Active XP Rule Set`.

**Confirms catalog note "Config linkage: still not complete" — literally zero C-025 fields present in Config today.**

### 1.2 Zoom Meetings (`tblWcSHEm8vNNIxyB`) — the nine manually maintained fields (live, verified)

| Field | Field ID | Type today |
|---|---|---|
| `Effective Recording XP Percentage` | `fldgBdBIDvjMELY3o` | `number` |
| `Effective Recording Counts for Level Gate?` | `fldswwnnpWpiKSIL4` | `checkbox` |
| `Effective Recording Counts for Perfect Week?` | `fldEfs9Xk4cIm7sqA` | `checkbox` |
| `Effective Recording Quiz Requires Coach Approval?` | `fldkKRtkzO4AkNyED` | `checkbox` |
| `Effective Recording Makeup Enabled?` | `fldppA7JHEbYNu3bR` | `checkbox` |
| `Effective Recording Makeup Window Days` | `fldfDKHOn54ZbH7XL` | `number` |
| `Effective Recording Deadline Mode` | `fldnwzUITHTzEeR5n` | `singleSelect` (`Days After Recording Available`, `End of Program Week`, `Later of Both`, `Earlier of Both`) |
| `Effective Recording Approval Email Enabled?` | `fldqPzKXweQISK4ZR` | `checkbox` |
| `Effective Recording Approval Email Timing` | `fldT2SG7GRc7sT32u` | `singleSelect` |
| `Effective Recording Approval Email Template Key` | `fldQtvxkRPGCJ7pq8` | `singleLineText` |

**New finding, not in prior checklists:** the email-config trio (`Effective Recording Approval Email Enabled?`, `... Timing`, `... Template Key`) already exists on Zoom Meetings as per-meeting fields — the catalog only described the Config-table side of these. In-scope for this design: they get the same 4-tier treatment as the other seven.

Also confirmed present and needed for the join: `Recording Available At` (`fld2AzW975HGKDsEG`, dateTime), `Week` (`fldOi0gQkrvoBiuHs`, link → Weeks). **No `Week End Date` lookup exists yet on Zoom Meetings** — required for [C-025-deadline-repair-design.md](./C-025-deadline-repair-design.md), noted here because the deadline formula is one of the nine consumers.

### 1.3 Zoom Attendance (`tblfwbt6aCDCM5gUz`) — unaffected by this design

The nine `Effective *` names appear again on Zoom Attendance as `multipleLookupValues` (true Lookup fields), each bound by field ID to the Zoom Meetings field of the same name. Confirmed live: `Effective Recording XP Percentage`, `Effective Recording Counts for Level Gate?`, `Effective Recording Counts for Perfect Week?`, `Effective Recording Quiz Requires Coach Approval?`, `Effective Recording Makeup Enabled?`, `Effective Recording Makeup Window Days`, `Effective Recording Deadline Mode`, plus `Zoom Meeting RID`, `Enrollment RID`, `Calculated Recording Quiz Deadline` (all lookups). **Do not edit these lookups** — converting the Zoom Meetings source field's formula (not its field ID) is sufficient; Airtable lookups follow the field ID automatically.

**Unrelated finding (report only, out of scope for this design):** Zoom Meetings also carries a set of legacy same-named fields — `Attendance Method`, `Zoom Credit Approved?`, `Zoom XP Percentage`, `Zoom XP Amount`, `Zoom Gate Credit Earned?`, `Zoom Credit Key`, `Zoom Credit Conflict?`, `Zoom Credit Debug`, `Recording Quiz Deadline` (dateTime), `Recording XP Percentage` (number), etc. — that predate the Zoom Attendance junction table split and appear to be dead/legacy. They are **not** referenced by the seven authoritative Zoom Attendance formulas. Recommend owner review for cleanup in a separate ticket; **not touched here** (avoid deletes per overnight policy).

### 1.4 Join path already available for Program scope

`Enrollments.Program Instance` (link → `tblMfALZa4YYUy70P`) and `Weeks.Program Instance` (link → same table) already exist, and `Zoom Meetings.Week` links to `Weeks`. `Enrollments.School Year` is a single select: `2025-2026`, `2026-2027`, `2027-2028`. Config's only season key today is the free-text `Active School Year`. See §3 for how this is used.

---

## 2. Config table — new fields (proposed, not yet created)

All names match the owner-approved Stage 16 catalog exactly, plus one addition (`Recording Path Enabled?`, marked proposed/unconfirmed) and the email-timing/template pair the catalog already specified.

| # | Config field (new) | Type | Fallback if row/field unresolved | Feeds Zoom Meetings field |
|---|---|---|---|---|
| 1 | `Zoom Recording XP Percent of Live` | Number (0–100, integer) | **50** | `Effective Recording XP Percentage` |
| 2 | `Recording Gives Full Zoom Gate Credit?` | Checkbox | **Checked (true)** | `Effective Recording Counts for Level Gate?` |
| 3 | `Recording Makeup Counts for Perfect Week?` | Checkbox | **Checked (true)** | `Effective Recording Counts for Perfect Week?` |
| 4 | `Recording Quiz Requires Coach Approval?` | Checkbox | **Checked (true)** | `Effective Recording Quiz Requires Coach Approval?` |
| 5 | `Recording Makeup Enabled?` **(new — not in Stage 16 catalog; propose add)** | Checkbox | **Checked (true)** — *proposed default, confirm with owner; not on the Lead's pre-approved fallback list* | `Effective Recording Makeup Enabled?` |
| 6 | `Zoom Recording Makeup Window Days` | Number (≥0 integer) | **7** | `Effective Recording Makeup Window Days` |
| 7 | `Zoom Recording Deadline Mode` | Single select (`Days After Recording Available` · `End of Program Week` · `Later of Both` · `Earlier of Both`) | **Later of Both** | `Effective Recording Deadline Mode` |
| 8 | `Recording Approval Email Enabled?` | Checkbox | **Unchecked (false)** — *missing config ⇒ do not send* | `Effective Recording Approval Email Enabled?` |
| 9 | `Recording Approval Email Timing` | Single select (`On Satisfactory` for v1) | **On Satisfactory** | `Effective Recording Approval Email Timing` |
| 10 | `Recording Approval Email Template Key` | Single line text | (blank ⇒ skip send, `missing_template_key`) | `Effective Recording Approval Email Template Key` |
| 11 | `Recording Path Enabled?` **(new, optional master switch — proposed)** | Checkbox | **Checked (true)** | *No live Zoom Meetings field yet.* The existing `Zoom Credit Pre-Approved?` formula already treats this as `OR(blank, checked)` when computing recording pre-approval — see Formula Repair doc §4.2. Create `Effective Recording Path Enabled?` on Zoom Meetings only if the owner wants a per-meeting kill switch; otherwise this stays Config-only and the formula's existing "blank = enabled" clause is the safe fallback already. |

### 2.1 Scope fields (new, on Config)

| Field (new) | Type | Purpose |
|---|---|---|
| `Program Instance` | Link → Program Instance (`tblMfALZa4YYUy70P`) | Optional. Lets a Config row declare which program instance(s) it governs. Leave blank on the current single active row; only needed once >1 concurrent program instance carries different Zoom Recording settings. |
| `Is Global Default?` | Checkbox | Exactly one Config row should have this checked. That row is the tier-3 "Global Config" fallback for every meeting, regardless of season/program match. |

---

## 3. Program / Global scope resolution model

**Current reality (2026-07-13): Config has exactly one row conceptually in play per season, and the catalog itself says "same row when only one active season."** The design below is deliberately the simplest thing that is still honestly 4-tier and doesn't require a new automation:

1. **Meeting override** — a small set of new fields on Zoom Meetings (§4) that hold the value **only when someone deliberately set it for that one meeting**. Blank = not set.
2. **Program Config** — resolved via a manually maintained link field `Zoom Meetings → Config (Program Scope)`. Bulk-set once per season: select all Zoom Meetings rows for a season's Weeks, set the link to that season's Config row. Because seasons don't change meeting-by-meeting, this is a one-time per-season maintenance action, not per-meeting.
3. **Global Config** — resolved via a second manually maintained link field `Zoom Meetings → Config (Global Scope)`, bulk-set once to whichever Config row has `Is Global Default?` checked. In the common case (one active season) tiers 2 and 3 point at the **same row** — this is expected and matches the catalog note.
4. **Safe fallback** — the hardcoded constant in the formula (§2 table), used only when both links are blank or the linked row's field is blank.

### 3.1 Why not fully automatic (documented honestly)

A fully automatic join (Zoom Meetings → Week → Program Instance → Config, with no manual link) is possible using chained Lookup fields at each hop (Program Instance would need lookups pulling from its linked Config row via the inverse of Config's new `Program Instance` link; Weeks would need lookups from Program Instance; Zoom Meetings would need lookups from Week). That removes all manual link maintenance but adds ~9 fields × 2 extra hop-tables of lookup plumbing. **Recommended only if/when a second concurrent program instance needs different Zoom Recording settings.** For the current single-season reality, the two-manual-link design above is simpler, equally correct, and easier for Mike to audit in the UI. Flagging this as the scale-up path rather than building it now (no evidence it's needed yet).

### 3.2 Bulk-link maintenance checklist (when implemented)

- [ ] Create the Config row(s) with C-025 fields populated (§2).
- [ ] Check `Is Global Default?` on exactly one Config row.
- [ ] On Zoom Meetings, filter by season (via `Week` → season), select all, bulk-set `Config (Program Scope)` to that season's Config row.
- [ ] On Zoom Meetings, select all rows, bulk-set `Config (Global Scope)` to the `Is Global Default?` row.
- [ ] New meetings created after this point need the same two links set — **document as a manual step in the meeting-creation runbook** until/unless a future automation sets them automatically. Not building that automation here (design-only, no automation edits).

---

## 4. Zoom Meetings — new fields required

### 4.1 Meeting-override fields (new, one per setting)

Airtable Checkbox fields **cannot be blank** (always true/false) — so a plain checkbox cannot represent "no override." Number/date/single-select fields *can* be blank natively. This changes the override field type per setting:

| Setting | Override field (new) | Type | Blank means |
|---|---|---|---|
| Recording XP % | `Recording XP Percentage — Meeting Override` | Number (0–100) | no override |
| Full gate credit | `Full Gate Credit — Meeting Override` | Single select: `Yes` / `No` | no override |
| Perfect Week credit | `Perfect Week Credit — Meeting Override` | Single select: `Yes` / `No` | no override |
| Coach approval required | `Coach Approval Required — Meeting Override` | Single select: `Yes` / `No` | no override |
| Makeup enabled | `Makeup Enabled — Meeting Override` | Single select: `Yes` / `No` | no override |
| Makeup window days | `Makeup Window Days — Meeting Override` | Number (≥0) | no override |
| Deadline mode | `Deadline Mode — Meeting Override` | Single select (same 4 choices) | no override |
| Approval email enabled | `Approval Email Enabled — Meeting Override` | Single select: `Yes` / `No` | no override |
| Approval email timing | `Approval Email Timing — Meeting Override` | Single select (`On Satisfactory`) | no override |
| Approval email template key | `Approval Email Template Key — Meeting Override` | Single line text | no override |

**Migration note:** the *current* values sitting in the live `Effective *` fields today are, in practice, exactly these per-meeting overrides (that's what "manually maintained" means). Migration step order is in §6 — copy current values into the new Override fields **before** converting `Effective *` to formulas, so no existing meeting-level decision is silently lost.

### 4.2 Config value rollups (new, two per setting: Program + Global)

Use **Rollup**, not Lookup, so a single linked Config row collapses cleanly to a scalar and "no link" is unambiguous even for checkboxes:

| Value type | Rollup aggregation formula | Why |
|---|---|---|
| Number | `IF(COUNTA(values) = 0, BLANK(), SUM(values))` | `SUM` of one linked number = that number; `COUNTA(values)=0` only when the link itself is blank (distinguishes "no Config row" from "Config value is 0"). |
| Checkbox | `IF(COUNTA(values) = 0, BLANK(), OR(values))` | Checkbox rollup entries are always counted whether true or false, so `COUNTA(values)=0` still only fires when the link is blank — **not** when Config's checkbox happens to be unchecked. This is the key trick that avoids the "checkbox can never be blank" trap. |
| Single select / text | `IF(COUNTA(values) = 0, BLANK(), ARRAYJOIN(values))` | Collapses to plain text; blank only when no link. |

Two rollups per setting (Program-scope link source, Global-scope link source) × 10 settings = 20 new rollup fields, e.g. `Program Config: Recording XP %`, `Global Config: Recording XP %`, etc.

### 4.3 Effective* — convert from editable field to Formula (same field ID)

For each setting, replace the current field's contents with a formula implementing the 4-tier precedence. Example — `Effective Recording XP Percentage` (`fldgBdBIDvjMELY3o`):

```airtable
IF(
  {Recording XP Percentage — Meeting Override} != BLANK(),
  {Recording XP Percentage — Meeting Override},
  IF(
    {Program Config: Recording XP %} != BLANK(),
    {Program Config: Recording XP %},
    IF(
      {Global Config: Recording XP %} != BLANK(),
      {Global Config: Recording XP %},
      50
    )
  )
)
```

Example — `Effective Recording Counts for Level Gate?` (`fldswwnnpWpiKSIL4`), a checkbox-typed override chain resolved through the `Yes`/`No` select:

```airtable
IF(
  {Full Gate Credit — Meeting Override} = "Yes", TRUE(),
  IF(
    {Full Gate Credit — Meeting Override} = "No", FALSE(),
    IF(
      {Program Config: Full Gate Credit} != BLANK(),
      {Program Config: Full Gate Credit},
      IF(
        {Global Config: Full Gate Credit} != BLANK(),
        {Global Config: Full Gate Credit},
        TRUE()
      )
    )
  )
)
```

Deadline Mode and Makeup Enabled and the email trio follow the same two patterns (number-style for days/text; select-style for the rest). Full formula text for all ten fields should be generated at implementation time using this template — not duplicated ten times here to avoid drift; the two patterns above are the complete template set.

**Airtable API type-conversion caveat (why this stays design-only):** converting a field from Checkbox/Number/Single-select to Formula is not reliably supported as a plain Meta API `PATCH` on `type` for all source types — Airtable's own UI field editor ("Edit field" → change type dropdown) is the reliable path and preserves the field ID (so the Zoom Attendance lookup keeps working with zero changes on that side). **Recommend doing this conversion in the Airtable UI, not via API**, even once schema-write is authorized. Do the copy-to-Override step (§4.1) first so no data is lost when the type changes out from under the old values.

---

## 5. Migration plan (from current editable/lookup Effective fields)

1. **Snapshot current values.** Export/duplicate the nine `Effective *` fields on Zoom Meetings before any change (Airtable "Duplicate field" keeps data; or export a CSV). This is the audit trail if something needs to roll back.
2. **Create Override fields (§4.1).** New fields only — purely additive, zero risk.
3. **Copy current Effective\* values into the matching Override field.** Per meeting, whatever value is currently set on `Effective Recording XP Percentage` becomes that meeting's `Recording XP Percentage — Meeting Override`. (Airtable does not have a native "copy field A into field B" bulk action across mixed types in one click for select-from-checkbox conversions — for the `Yes`/`No` select overrides, this is a manual per-record pass, or a short one-time script using write access, run against DEV only, with `CONFIRM_WRITE`.)
4. **Create Config fields (§2) and scope fields (§2.1, §3).**
5. **Create the two Config link fields on Zoom Meetings** (`Config (Program Scope)`, `Config (Global Scope)`) and bulk-link per §3.2.
6. **Create the 20 Rollup fields (§4.2).**
7. **Convert each `Effective *` field's type to Formula in the Airtable UI** (not API) and paste the formula from §4.3's template, referencing that setting's Override + two Rollups + the approved fallback constant.
8. **Validate (§7)** before considering the migration complete.
9. **Zoom Attendance needs zero edits** — its lookups already point at these field IDs.

### 5.1 Rollback

1. If a converted `Effective *` formula misbehaves, use Airtable field history / undo, or manually re-enter the same field as the prior type and paste back the value that is now sitting in that setting's Override field (which still holds the pre-migration value untouched).
2. Override, Rollup, and Config scope fields are additive and harmless to leave in place even if the Effective* conversion is rolled back — they just won't be read by anything yet.
3. Do not delete Zoom Attendance or Zoom Meetings records at any point in this migration.
4. No PROD base is touched by this design or its future implementation — DEV (`appTetnuCZlCZdTCT`) only.

---

## 6. DEV validation checklist (after implementation — not yet run, no schema exists yet)

- [ ] With Program + Global links blank and no override: each Effective* field shows the exact fallback constant from §2 (50 / true / true / true / true / 7 / "Later of Both" / false / "On Satisfactory" / blank).
- [ ] Link `Config (Global Scope)` only (Program still blank), set `Zoom Recording XP Percent of Live` = 40 on that Config row → `Effective Recording XP Percentage` becomes 40 on that meeting.
- [ ] Additionally link `Config (Program Scope)` to a *different* Config row with `Zoom Recording XP Percent of Live` = 25 → `Effective Recording XP Percentage` becomes 25 (Program beats Global).
- [ ] Set `Recording XP Percentage — Meeting Override` = 10 on that same meeting → `Effective Recording XP Percentage` becomes 10 (Override beats both Config tiers).
- [ ] Clear the override → value returns to the Program Config value (25), not the fallback.
- [ ] Repeat the same four-step check for at least one checkbox setting (e.g. Full Gate Credit) and confirm `COUNTA(values)=0` correctly distinguishes "no linked Config row" from "linked Config row's checkbox is unchecked" (link a Config row with the checkbox **unchecked** and confirm the Effective field shows **false**, not the true fallback).
- [ ] Zoom Attendance's `Effective Recording XP Percentage` lookup (and the other eight) reflect the new formula output automatically with no edits on Zoom Attendance.
- [ ] The seven Zoom Attendance credit formulas (`Zoom Credit Approved?`, `Zoom XP Percentage`, `Zoom XP Amount`, `Zoom Gate Credit Earned?`, `Zoom Credit Key`, `Zoom Credit Conflict?`, `Zoom Credit Debug`) still produce the same Schmidt fixture results documented in [C-025-Zoom-Recording-Manual-Airtable-Repair.md](./C-025-Zoom-Recording-Manual-Airtable-Repair.md) § Applied verification (4/4) — re-run those four fixtures after migration as a regression check.
- [ ] No PROD changes made.

---

## 7. Summary of what this document does and does not authorize

- **Does:** Specify exact new field names/types, the 4-tier precedence formulas, the rollup-blank trick for checkboxes, and a lossless migration order.
- **Does not:** Create any Config or Zoom Meetings field. `C-025-dev-omni-implementation` in `CONTROL.json` remains `BLOCKED_AIRTABLE` / `auth: explicit_mike` — this design is the input to that gated task, not a substitute for it.
- **Live schema changed by this document:** none. Only `GET` calls were made against DEV Meta API to verify field names/types/IDs.
