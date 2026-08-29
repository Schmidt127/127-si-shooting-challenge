# Retire legacy Enrollment welcome-email fields

**Date:** 2026-08-29  
**Base:** 127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026 (`appn84sqPw03zEbTT`)  
**Table:** Enrollments (`tbl3PFmwbRoabu1YV`)  
**Repo branch:** `chore/retire-legacy-welcome-email-fields`

## Live verification (2026-08-29, Airtable MCP)

| Check | Result |
|-------|--------|
| Automation **075** in live Automations list | **Absent** — do not restore (Automations data table: 0 rows matching `075`) |
| Automation **078A** | Present / deployed — `078A — Enrollment → Create WELCOME Email Handoff` |
| Automation **079** | Present / deployed — `079 – Send to Communications Hub - NEW` |
| Automation **101** | Present / deployed — `101 - Zoom / Attendance XP - Award Meeting XP` |
| Automation **066** trigger | **`fldwsuKGoypFBn2w4` (`Run Shot Milestone Check?`) = true** — unchanged |
| Protected fields still on Enrollments | **Yes** — Run Shot Milestone Check? + Public Missing Homework/Zoom/Streak (formulas `isValid: true`) |
| Field deletion (post-Mike UI) | **5/6 deleted** — see agent completion status below |

## Authority

Live welcome path (do not change):

```text
078A → Email Handoff Queue → 079 → Communications Hub → Resend
```

- Automation **075** does **not** exist in the live Automations table — do not restore it.
- Automation **101** is Zoom/Attendance XP — leave untouched.
- Automation **078A** and **079** do **not** read or write the fields below.
- Airtable MCP in this session **cannot delete fields** (`update_field` only). Complete Steps 1–6 manually in the Airtable UI (or Metadata API with delete-field permission).
- Do not edit records and do not send email as part of this cleanup.

## Proposed mutation plan (manual — not executed by agent)

1. Delete formula **Welcome Email Ready?** first (breaks dependency on Subject/HTML).
2. Delete the five writable legacy fields in any order after step 1.
3. Do **not** delete **Welcome Email To**, **Run Shot Milestone Check?**, or any **Public Missing\*** field.
4. Re-open Enrollments field list and confirm six targets gone + protected fields present.
5. Spot-check one public-profile Enrollment: Public Missing\* still compute.
6. Confirm Automations **078A**, **079**, **101**, **066** unchanged.

## Exact fields to remove

| Order | Field name | Field ID | Type | Notes |
|------:|------------|----------|------|-------|
| 1 | **Welcome Email Ready?** | `fldoXWryfQ32rsx3x` | formula | Delete **first** — depends on Parent Email Subject + Parent Email HTML |
| 2 | Parent Email Subject | `fldWYUYAOudslfXa0` | singleLineText | Legacy 075 writer |
| 3 | Parent Email HTML | `fldt3egwi2fqgpDY8` | multilineText | Legacy 075 writer |
| 4 | Welcome Email Status | `fld8q4102HlqFssGt` | singleSelect | Legacy 075 writer |
| 5 | Welcome Email Sent At | `fldOtPlE3QeBTkua0` | dateTime | Legacy send writeback |
| 6 | Welcome Email Error | `fldlTvIjixfP4bfvL` | multilineText | Legacy 075 writer |

### Formula to remove first (`Welcome Email Ready?`)

```airtable
AND(
  {Athlete},
  {Full Athlete Name},
  {School Year},
  {Program Instance},
  {Welcome Email To},
  {Parent Email Subject},
  {Parent Email HTML}
)
```

## Do not delete

| Field name | Field ID | Type | Why keep |
|------------|----------|------|----------|
| Welcome Email To | `fldj7JuUQiiRUqo5j` | formula | Not in retirement set |
| **Run Shot Milestone Check?** | `fldwsuKGoypFBn2w4` | checkbox | Automation **066** trigger |
| **Public Missing Homework** | `fldozKoW3osO7eORu` | formula | Public profile / gate copy |
| **Public Missing Zoom** | `fldcMl1TtIyCo0Vtn` | formula | Public profile / gate copy |
| **Public Missing Streak** | `fld4N3ueITBuxqkNA` | formula | Public profile / gate copy |

Also leave Public Missing Submissions, Public Missing Videos, and Public Gate Missing Reason alone.

## Verification steps

1. Enrollments field list: all six retirement targets are gone.
2. All protected fields above still present.
3. Open one Enrollment used by public profile — Public Missing\* formulas still compute.
4. Confirm **066** still keys off `Run Shot Milestone Check?` (do not fire a live XP run unless intentionally testing).
5. Confirm **078A** / **079** still create/dispatch WELCOME queue rows without referencing deleted fields.
6. Confirm Automation **101** script and trigger unchanged.

## Rollback limitations

- Field deletion is not undoable like record deletion; historical values on the five writable fields are permanently lost.
- Re-creating fields creates **new field IDs**; views/interfaces/filters pointing at old IDs stay broken until repaired.
- Do **not** “rollback” by re-enabling Automation **075**.

## Repo expectations after this packet

- No active probe, contract, or web query may require `Welcome Email Ready?` or the five legacy writers.
- Historical snapshots under `airtable/schema/snapshots/` and evidence JSON may still mention the fields — treat those as archive.
- Automation **075** source file remains in GitHub labeled **LEGACY / RETIRED** for audit only.

## Agent completion status

| Layer | Status |
|-------|--------|
| Repository references / probes / indexes | **MERGED** — PR **#274** → `master` @ `1b15d37f` (2026-08-29) |
| Vercel Production deploy | **SUCCESS** — deployment `6160903963` for `1b15d37f`; `/shoot` 200; `/shoot/api/airtable` `ok:true` `tokenValid:true` |
| Airtable field deletion | **PARTIAL** — deleted: Welcome Email Ready?, Parent Email Subject, Welcome Email Status, Welcome Email Sent At, Welcome Email Error. **Still present:** Parent Email HTML (`fldt3egwi2fqgpDY8`) — Mike delete remaining field in UI |
| Automation **075** | Remains **absent** — do not restore |
| App runtime | Live welcome path does not need deleted fields; remaining Parent Email HTML is inert |
