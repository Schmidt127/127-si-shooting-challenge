# C-028 — Award Recipients Tremendous fields

**Base:** Production `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` (`appn84sqPw03zEbTT`)  
**Table:** Award Recipients (`tblTyQXl8aEP93ubK`)  
**Date:** 2026-08-18 (fields) · **Current send status:** 2026-08-19 (Mike)  
**Make:** v2 snapshot [awards-send-tremendous-sandbox-reward-v2.md](../../../make/documentation/awards-send-tremendous-sandbox-reward-v2.md) (v1 is historical)  
**Current state:** [tremendous-award-fulfillment.md](../../../docs/integrations/tremendous-award-fulfillment.md)

Airtable is Production. Sandbox HTTP (`TEST_` key / testflight) is the only approved Tremendous endpoint until production API access is granted. Do not point Make at `https://api.tremendous.com`.

The validated sandbox send used **Parent Email** (v2-style), not the v1 **Recipient Email** destination. The **Recipient Email** field still exists on this table. The **Ready to Send?** formula below still checks Recipient Email — that is the 2026-08-18 schema snapshot, not the Make send mapping.

No existing fields were renamed or deleted.

---

## Reused fields (do not duplicate)

| Requested name | Existing Production field | ID | Notes |
|----------------|---------------------------|----|--------|
| Award Status | **Award Status** | `fldFOsYD5HxeUHq3M` | Already exists. Current options: Pending, Approved, Sent, Delivered, Cancelled, In Amazon Cart. Add **Sending** and **Failed** in the Airtable UI. Keep **Cancelled** (do not add a second “Canceled” option). |
| Award Amount | **Award Amount** | `fld48LJbn67iHmk3c` | Lookup from Awards → Prize Value. |
| Gift Card Needed? | **Gift Card Needed?** | `fldEbMMnLKr9nuYdh` | Formula returns `1` when Prize Type contains `Amazon Gift Card` and Award Status is not `Sent`. Unchanged. |
| Unique Award Key | **Award Recipient Unique Key** | `fldFIQFTR3Szj4nsV` | Permanent key. Tremendous External ID = `AWARD\|{Award Recipient Unique Key}`. |
| Athlete | **Enrollment** + **Athlete Name - Display** | `fldscYvriHP3DH8HO` / `fldzV0vh3NJARcTS0` | There is no Athlete link on this table. |
| Award Type | **Prize Type Lookup** | `fldOgUlU1yl7l6dBG` | Unchanged. |
| Recipient email (source) | **Parent Email** | `fldVd9S7mc12hnvJe` | Lookup. **Validated sandbox send destination** (v2-style). |

---

## Fields added 2026-08-18

| Field | ID | Type | Purpose |
|-------|----|------|---------|
| Recipient Name | `fld4ljQqUiSbPKrqW` | Single line text | Tremendous recipient name. Sandbox test: tester name only. |
| Recipient Email | `fldvUE03KmxYPbJJJ` | Email | v1 destination field. Still on the table. **Not** the validated v2 send destination. |
| Tremendous Environment | `fldZET6wLeLHlvJuI` | Single select: Sandbox, Production | First test = Sandbox. Set UI default to Sandbox. |
| Tremendous External ID | `fldeuceZLbtjWqD9M` | Single line text | Idempotency key written by Make before send. |
| Tremendous Order ID | `fldzCsQGaEfgkMc7W` | Single line text | If populated, never send again. |
| Tremendous Reward ID | `fldgJ924l1O7HuPx4` | Single line text | If populated, never send again. |
| Tremendous Delivery Status | `fldfpNmRYpXFhql8z` | Single select: Not Sent, Pending, Scheduled, Succeeded, Failed, Canceled, Flagged | Set UI default to Not Sent. |
| Tremendous Sent At | `flduq9jpAmcrM7bhg` | Date and time (America/Denver) | Written on successful Make send. |
| Tremendous Delivered At | `flds70ShV19aHCamu` | Date and time (America/Denver) | Later delivery confirmation. |
| Tremendous Error Message | `fldPRzXswLQRZEaLV` | Long text | Failed-send review. |
| Tremendous Response | `fldLEHVGRLu9S0z3F` | Long text | Make / Tremendous diagnostic payload. |
| Send to Tremendous? | `fldJhiZOoS0azZ1mq` | Checkbox | Manual approval switch. |
| Tremendous Test Record? | `fldxTF8ZEj7gwVJN8` | Checkbox | Marks the sandbox test row. |
| Ready to Send? | `fldoKPpxMYk44EqUA` | Formula (number 1/0) | Approved + email + amount + not already sent. |

### Ready to Send? formula

```
IF(
  AND(
    {Award Status} = "Approved",
    LEN(TRIM({Recipient Email} & "")) > 0,
    {Award Amount},
    LEN(TRIM({Tremendous Order ID} & "")) = 0,
    LEN(TRIM({Tremendous Reward ID} & "")) = 0
  ),
  IF(VALUE(SUBSTITUTE(ARRAYJOIN({Award Amount}) & "", "$", "")) > 0, 1, 0),
  0
)
```

This formula does **not** include `Send to Tremendous?`. That checkbox is a separate manual gate on the Make view and filter.

The formula still keys off **Recipient Email**. The validated Make v2 send uses **Parent Email**. Do not change this formula here unless Mike authorizes an Airtable schema edit.

---

## Still required in the Airtable UI

Historical 2026-08-18 setup list. The sandbox send later succeeded, so the send-path pieces required for that test were in place. This list is not a fresh Airtable poll.

1. **Award Status** — add options `Sending` and `Failed`. Do not rename or delete existing options.
2. **Tremendous Environment** — default value = Sandbox.
3. **Tremendous Delivery Status** — default value = Not Sent.
4. **Last Modified** — add a Last modified time field. Make Watch Records requires it.
5. View **AWARDS - Tremendous Ready** (grid) with filters:
   - `Send to Tremendous?` is checked
   - `Award Status` is `Approved`
   - `Parent Email` is not empty (Recipient Email is optional override)
   - `Award Amount` is greater than 0
   - `Tremendous Order ID` is empty
   - `Tremendous Reward ID` is empty
   - `Tremendous Environment` is `Sandbox`
   - First test only: also `Tremendous Test Record?` is checked

Optional: add `Sending` / `Failed` to **Award Status Sort**. Not required for the send path.
