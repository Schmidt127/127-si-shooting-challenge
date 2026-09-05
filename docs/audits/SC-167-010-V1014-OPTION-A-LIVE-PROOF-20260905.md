# SC-167 — Automation 010 v10.14 Option A live proof (2026-09-05)

**Backlog:** SC-167  
**Authorization:** Mike — Option A only (bounded disposable proof; no full Season Simulation)  
**Production base:** `appn84sqPw03zEbTT`  
**Live automation:** `wflJUkUJYTtRWJCyH` — **010 v10.14**  
**Status:** **COMPLETE / Live Tested**

---

## Formula snapshot (pre-gate)

Exact Production `Activity Date Is Future?` (`fldyFAjhbfaC4LlPb`):

```
IF(
  {fldpkkSBsx8kQRZos},
  IF({fldpkkSBsx8kQRZos} > NOW(), 1, 0),
  BLANK()
)
```

MCP `get_table_schema` pre-gate:
- `isValid`: **true**
- `result.type`: **number**
- `referencedFieldIds`: `["fldpkkSBsx8kQRZos"]` (nonempty)
- Contains **`NOW()`**
- No Season Sim branch
- No "Unable to generate formula."

---

## Temporary gate (MCP `update_field`)

Installed documented `GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA` only (did **not** change Submitted Same Day? or Perfect Week Grace Eligible?).

MCP verify while gated:
- `isValid`: **true**
- `result.type`: **number**
- `referencedFieldIds`: 4 ids (test record, Video Upload Note, Season Sim Clock Now, Activity Date)
- Safety: Season Sim Test Record? + `SEASON-SIM|` marker + Clock Now + `NOW()` fallback
- No "Unable to generate formula."

---

## Disposable proof

| Item | Value |
|---|---|
| Enrollment | Athlete1 Schmidt `recZEwkkXTJanDlG6` (allowlisted Athlete Email) |
| Submission | `recsDWizt4kD7dXR8` |
| Week | Week 1 `rec2Rewxt21z7dI9f` |
| WAS | `recNEeoot6gc41zcs` (pre-existing; not deleted) |
| Activity Date | `2027-05-05` (inside Week) |
| Season Sim Clock Now | `2027-05-08` |
| Marker | `SEASON-SIM\|SC167-OPT-A\|20260905T201605Z` |
| Email arms | **Off** (no Build Daily / weekly send) |

### Create
- `Count This Submission?=1`, `Activity Date Is Future?=0`, `Total Shots Counted=25`
- Exactly **one** Active? XP Event `recEywgydqkh9JI2H`
- Source Key: `SUBMISSION_XP|recsDWizt4kD7dXR8`
- Enrollment linked: `recZEwkkXTJanDlG6`
- XP Reason Debug: **v10.14 Action: created** for that Source Key (20 XP)

### Retry
- Cleared `Last Reconciled Signature` only
- Exactly **one** Active? XP Event remained — **same id** `recEywgydqkh9JI2H`
- XP Reason Debug: **v10.14 Action: reactivated_or_repaired** (deterministic same-event ownership; no second create)
- Enrollment still linked once

### Cleanup
- Deleted XP `recEywgydqkh9JI2H` and Submission `recsDWizt4kD7dXR8`
- Leftover marker scan: **0**

---

## Restore + independent verify

Restored exact Production formula. MCP post-restore:
- `isValid`: **true**
- `result.type`: **number**
- `referencedFieldIds`: `["fldpkkSBsx8kQRZos"]`
- **`NOW()`** Production path restored
- No Season Sim branch
- No "Unable to generate formula."

---

## Preflight

`python -m season_simulation preflight` → **PASS**, **Errors: (none)**.  
Warnings correctly note Season Sim gate is **not** active (Production-normal). Report: `tools/season_simulation/reports/preflight-20260905T201710Z.*`

---

## Safeguards

- Full Season Simulation **not** run  
- Omni **not** used  
- Submitted Same Day? / Perfect Week Grace Eligible? **unchanged**  
- No email / Hub send arms  
- No real-family athlete records  
- XP amounts unchanged  
- Unrelated automations untouched  
