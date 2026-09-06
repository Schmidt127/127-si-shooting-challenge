# Zoom Attendance primary field — formula conversion

**Status:** Supporting fields **LIVE** (2026-09-06); primary convert still **Mike UI required**  
**Production base:** `appn84sqPw03zEbTT`  
**Table:** Zoom Attendance — `tblg8DPRu3j0dbuwi`  
**Current primary:** `Id` — `fldXHFpB3MrOVevYL` (autoNumber) — **unchanged**

**Rule:** MCP / Meta API cannot convert an autoNumber primary field to a formula. Mike must convert in the Airtable UI.

---

## Live field IDs (2026-09-06)

| Field | Field ID | Type | Status |
|-------|----------|------|--------|
| **Id** (primary) | `fldXHFpB3MrOVevYL` | autoNumber | Still primary — Mike UI convert pending |
| **Athlete Name** | `fld7nVhauRqRAWxq4` | lookup | **Created live** |
| **Meeting Name** | `fld819uQNx6BcoMjk` | lookup | **Created live** |
| **Meeting Date** | `fld96KGsXVst9UGNx` | lookup | **Created live** |
| **Attendance Label** | `fldVILeOyW1jepScv` | formula | **Created live** (`isValid` true) |

**RecordId** (existing formula `RECORD_ID()`) remains the stable identity for automations / links. Automations address Zoom Attendance by **record ID** (`rec…`), not by the primary display value.

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

## Exact Mike UI step (primary convert)

1. Open **Zoom Attendance** → customize primary field **Id** (`fldXHFpB3MrOVevYL`).
2. Change field type from **Autonumber** → **Formula**.
3. Paste the formula from **Attendance Label** (`fldVILeOyW1jepScv`) — or copy the formula text from that field — so primary display matches Attendance Label.
4. Optionally delete the duplicate **Attendance Label** field after the primary formula is confirmed.
5. Spot-check Automation **117** still receives ZA `rec…` IDs; confirm **RecordId** still matches `RECORD_ID()`.

---

## Attendance Label / proposed primary formula shape

Display shape: `Athlete Name - Meeting Name - Meeting Date` (America/Denver date segment). Prefer copying the live **Attendance Label** formula text rather than re-authoring from memory.

---

## Rollback

If the supporting-field creates need revert, Airtable `revert_action` IDs (2026-09-06):

| Action ID | Use |
|-----------|-----|
| `actTBXer96T8FZM66` | Revert supporting create (as applicable) |
| `actIrT5IajKwmvv6k` | Revert supporting create (as applicable) |
| `actiZj2x7HgdYRwgN` | Revert supporting create (as applicable) |
| `actSsbDl3kzzAtnBV` | Revert supporting create (as applicable) |

Primary convert rollback (after Mike UI):

1. Convert primary back to **autoNumber** named `Id` (or restore prior primary type in UI).
2. **Note:** Prior autoNumber values are **not recoverable** after conversion away from autoNumber. New numbers will restart / renumber.
3. Keep **RecordId** = `RECORD_ID()` as the stable identity for automations, queue rows, and evidence.

---

## Execution notes

1. Lookups + Attendance Label are **already live** — do not recreate.
2. MCP/`create_field` cannot convert autoNumber → formula primary; **Mike UI conversion required**.
3. After conversion: confirm Automation 117 inputs still pass ZA `rec…` IDs.
