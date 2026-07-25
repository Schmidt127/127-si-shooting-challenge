# Sent-Field Ownership — Make Live Writeback

**Verified:** 2026-07-24  
**Scenario:** `Weekly Athlete Summary - Bulk Email - May 18` (ON)  
**Evidence:** make-blueprint-user (uploaded Live update module) + Live run PASS

---

## What Make Live writes (authoritative)

| Field | Value written |
|-------|---------------|
| `Weekly Email Sent?` | `true` |
| `Make Send Status` | `Sent` |
| `Weekly Summary Sent At` | `now` |

## What Make Live does **not** write (per blueprint)

| Field | Ownership |
|-------|-----------|
| `Weekly Email Sent At` | **Not Make-owned** — no Live module write |
| `Weekly Summary Email Status` | **Not Make-owned** — no Live module write |

074 must never clear `Weekly Email Sent?`. Test branch delivers email without Sent? writeback (by design).

---

## Recommended authoritative model (no rename/delete yet)

| Role | Field |
|------|-------|
| Sent flag | `Weekly Email Sent?` |
| Send status | `Make Send Status` |
| Sent timestamp | `Weekly Summary Sent At` |

**Hide from ops views:** `Weekly Email Sent At`, `Weekly Summary Email Status` until a writer is proven.

---

## Safe migration (views only first)

1. OMNI: hide non-authoritative fields from WAS Email Ops view.  
2. Confirm one Live send: Sent?=checked, Make Send Status=Sent, Weekly Summary Sent At populated, Weekly Email Sent At blank/ignored.  
3. Later (approved ticket): optional formula `Effective Sent At` = Weekly Summary Sent At; still no deletes.
