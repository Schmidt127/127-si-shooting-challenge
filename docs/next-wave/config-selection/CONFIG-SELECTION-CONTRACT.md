# Config Selection Contract

Agent 10 · Year-aware Config selection · 2026-07-24

## Intent

The Config table holds **one intentional row per school year**. Four rows today is correct, not a defect:

| Active School Year | Max Videos Per Submission | PROD record id (evidence) |
|---|---|---|
| 2025–2026 | 4 | `recq14M5hEv3TIGEj` |
| 2026–2027 | 6 | `rechc1f9f4kVM1tHP` |
| 2027–2028 | 5 | `rectmrnvo9a79wgq3` |
| 2028–2029 | 4 | `recXwc19BtG1L2PzW` |

**Do not** collapse, archive, or delete Config rows merely because multiple years exist.
**Do not** treat “first Config record” as the active season.
**Do not** infer school year from the calendar year.

The defect is **ambiguous selection**, not multi-row existence.

## Deterministic hierarchy

Resolve exactly one Config row in this order:

1. **Explicit Config record ID** (`explicitConfigRecordId`) when provided and non-blank.
2. **Program Instance school-year key** (`programInstanceSchoolYear` / Program Instance `School Year - Linked`).
3. **Enrollment School Year** (`enrollmentSchoolYear`).
4. **Test-season override** (`testSeasonOverride`) **only when the caller explicitly provides the property**.

Then:

- Normalize the chosen school-year key.
- Match Config rows where normalized `Active School Year` equals that key.
- **Fail closed** if zero matches.
- **Fail closed** if more than one match (duplicate year rows).
- **Fail closed** if Program Instance year and Enrollment year are both present and disagree after normalize.

## Normalization rules

Accepted forms (after trim):

- `2025-2026` (ASCII hyphen)
- `2025–2026` (en dash U+2013)
- `2025—2026` (em dash)
- Surrounding whitespace: `  2026-2027  `

Rejected:

- blank / null / whitespace-only
- non `YYYY-YYYY` shapes (`2026`, `2026/2027`, `abc-def`)
- non-consecutive years (`2026-2028`)

Canonical key always uses ASCII hyphen: `YYYY-YYYY`.

## Forbidden behaviors

| Forbidden | Why |
|---|---|
| `configQuery.records[0]` | Order-dependent; picks wrong year |
| “Any row with Active XP Rule Set set” | Collapses multi-year intentionally sparse fields |
| Calendar-year inference (`new Date().getFullYear()`) | Silent wrong season near year boundaries |
| Soft-pick when PI/Enrollment mismatch | Masks data integrity bugs |
| Deleting “extra” year rows to make first-record work | Destroys intentional year config |

## Structured result

Success:

```json
{
  "ok": true,
  "config": { "id": "rec…", "activeSchoolYear": "2026-2027", "fields": {} },
  "configRecordId": "rec…",
  "schoolYearKey": "2026-2027",
  "selectionSource": "program_instance_school_year",
  "debug": {
    "calendarYearUsed": false,
    "firstRecordFallbackUsed": false,
    "availableYears": ["2025-2026", "2026-2027", "2027-2028", "2028-2029"]
  }
}
```

Failure:

```json
{
  "ok": false,
  "error": { "code": "config_year_not_found", "message": "…" },
  "debug": { "…" }
}
```

### Error codes

| Code | Meaning |
|---|---|
| `blank_school_year` | Empty year input or Config row year |
| `malformed_school_year` | Unparseable / non-consecutive |
| `missing_school_year` | No year source after hierarchy |
| `duplicate_school_year` | Two+ Config rows share a year |
| `config_year_not_found` | No Config for resolved year |
| `enrollment_program_instance_mismatch` | PI vs Enrollment disagree |
| `explicit_config_not_found` | Override id missing from rows |
| `invalid_explicit_config_id` | Override not `rec…` |
| `invalid_config_rows` | Non-array input |

## Reference implementation

- `lib/config-selection/index.js` — pure Node module
- `tests/config-selection/resolve-config.test.js` — assert suite

Airtable automation scripts should copy or require this logic (paste-compatible excerpt) rather than inventing per-script selection.

## Relationship to Zoom Effective Config

Stage 17 already resolves **meeting override → Program Config → Global Config** for Zoom recording flags (`resolveEffectiveConfigValue` in `c025-stage17-zoom-attendance.js`). That layer answers “which linked Config value wins for a meeting.”

This contract answers the prior question: **which Config record should be linked / selected for a given school year.** Both layers are required; Effective Config cannot fix a wrong year linkage.
