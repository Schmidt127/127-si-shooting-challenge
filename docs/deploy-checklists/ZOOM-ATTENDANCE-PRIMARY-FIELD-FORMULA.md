# Zoom Attendance primary field — formula conversion (docs only)

**Status:** Documentation / Mike UI required — **not executed in this PR**  
**Production base:** `appn84sqPw03zEbTT`  
**Table:** Zoom Attendance — `tblg8DPRu3j0dbuwi`  
**Current primary:** `Id` — `fldXHFpB3MrOVevYL` (autoNumber)

**Rule:** MCP / Meta API cannot convert an autoNumber primary field to a formula. Mike must convert in the Airtable UI, **or** create the supporting lookups first and have a coordinator attempt `create_field` for non-primary helpers only.

---

## Current identity fields

| Field | Field ID | Type | Role |
|-------|----------|------|------|
| **Id** (primary) | `fldXHFpB3MrOVevYL` | autoNumber | Current primary display |
| **RecordId** | (existing) | formula `RECORD_ID()` | Stable identity for automations / links |

Automations and scripts address Zoom Attendance by **record ID** (`rec…`), not by the primary `Id` display value. Do not treat autoNumber as an operational key.

---

## Dependency audit (safe for display change)

| Consumer | How ZA is referenced | Impact of primary rename/formula |
|----------|----------------------|----------------------------------|
| Automation 117 (Hub handoff) | `recordId` / Source Record ID = ZA `rec…` | None — uses record IDs |
| Stage 17 / Zoom credit scripts | ZA record ID in links and Source Keys | None |
| Email Handoff Queue | Source Record ID = ZA record ID | None |
| Linked records from Enrollment / Zoom Meeting | Link field stores `rec…` | None |

**Conclusion:** Changing the primary field to a human-readable formula does not break automation identity as long as **RecordId** remains `RECORD_ID()` and scripts continue to use record IDs.

---

## Required lookups (create if missing)

Create these **lookup** fields on Zoom Attendance before (or with) the primary formula so the formula can read display values:

| Proposed field name | From | Source field |
|---------------------|------|--------------|
| **Athlete Name** | Enrollment | Full Athlete Name |
| **Meeting Name** | Zoom Meeting | Meeting Name |
| **Meeting Start** | Zoom Meeting | Start Time |

If any of these already exist under equivalent names, reuse them — do not duplicate.

---

## Proposed primary formula

Replace primary `Id` (autoNumber) with a formula primary (hyphen-spaced):

```
CONCATENATE(
  {Athlete Name},
  " - ",
  {Meeting Name},
  " - ",
  DATETIME_FORMAT(
    SET_TIMEZONE({Meeting Start}, "America/Denver"),
    "MMMM D, YYYY"
  )
)
```

Display shape: `Athlete Name - Meeting Name - Meeting Date`  
Timezone for the date segment: **America/Denver**.

---

## Rollback

1. Convert primary back to **autoNumber** named `Id` (or restore prior primary type in UI).
2. **Note:** Prior autoNumber values are **not recoverable** after conversion away from autoNumber. New numbers will restart / renumber.
3. Keep **RecordId** = `RECORD_ID()` as the stable identity for automations, queue rows, and evidence.

---

## Execution notes (Mike / coordinator)

1. **Docs-only in this PR** — no live schema change from GitHub agents.
2. MCP/`create_field` cannot convert autoNumber → formula primary; **Mike UI conversion required**.
3. Optional path: create lookups via UI or API first; then Mike converts primary; coordinator may attempt `create_field` only for missing non-primary lookups (not for converting the primary).
4. After conversion: spot-check Automation 117 inputs still pass ZA `rec…` IDs; confirm RecordId still matches `RECORD_ID()`.
