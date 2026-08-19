# 127 - Awards - Send Tremendous Sandbox Reward (v2)

> **CURRENT IMPLEMENTATION SNAPSHOT — not production-live.**  
> Current-state owner: [`docs/integrations/tremendous-award-fulfillment.md`](../../docs/integrations/tremendous-award-fulfillment.md).  
> v1 blueprint is historical: [awards-send-tremendous-sandbox-reward.md](./awards-send-tremendous-sandbox-reward.md).

**Backlog:** C-028  
**Scenario:** `Integration Airtable, Tremendous Sandbox v2`  
**Blueprint:** [../blueprints/awards-send-tremendous-sandbox-reward-v2.json](../blueprints/awards-send-tremendous-sandbox-reward-v2.json)  
**Prior version:** [awards-send-tremendous-sandbox-reward.md](./awards-send-tremendous-sandbox-reward.md) (v1, historical)  
**Airtable field plan:** [../../airtable/schema/current/C-028-award-recipients-tremendous-fields.md](../../airtable/schema/current/C-028-award-recipients-tremendous-fields.md)

Airtable is Production (`appn84sqPw03zEbTT`). Tremendous is **Sandbox HTTP** only (`https://testflight.tremendous.com/api/v2/orders`).

**Mike evidence 2026-08-19:** A sandbox reward was successfully sent and the reward email was received. That test used this v2-style process (Get a Record, parent/guardian email, safety filters, external ID, success write-back, failure handling). Production Tremendous API access is still **pending approval**. The Make scenario remains **OFF**. Do not schedule it. Do not call this blueprint production-live until production access is approved and a controlled live test succeeds. Do not put the API key in GitHub.

The line “no reward was sent while creating or correcting this blueprint” was true of the earlier blueprint-edit session. It is **not** current status.

Do **not** use the native Make Tremendous app (`TEST_` keys return 401 against production).

---

## Business rule — who receives the email

| Role | Field | Make mapping |
|------|--------|--------------|
| Email destination (parent) | Parent Email | `{{first(2.Parent Email)}}` |
| Reward recipient name + greeting (athlete) | Athlete Name - Display | `{{first(9.Athlete Name - Display)}}` |

Do **not** send to Recipient Email. Parent receives the gift card email; the message addresses the athlete.

---

## Why Get a Record was added

Airtable **Watch Records** freezes its field interface when the module is created or last refreshed. New Award Recipients columns (for example **Coach Feedback - Awards** and **Award - Display**) often do **not** appear as mapping pills on Watch Records.

**Get a Record** (module 9) loads the current full record by ID from Watch Records. Use module **9** for award copy fields and amount. Use module **2** for `first(Parent Email)` (Watch already exposes Parent Email).

---

## Module order

| Make id | Module | App | What it does |
|---------|--------|-----|----------------|
| 2 | Watch Records | Airtable | Limit 1. Trigger = Last Modified. View = Make.com / AWARDS - Tremendous Ready (`viwCArBlCaoedt4GL`). Source of Parent Email. |
| 9 | Get a Record | Airtable | Reloads the Award Recipients row so new field pills are available. |
| 10 | Update a Record | Airtable | Filter **Approved Sandbox Award**, then mark Sending + External ID + clear error. |
| 8 | Make a request | HTTP | `POST https://testflight.tremendous.com/api/v2/orders` |
| 11 | Update a Record | Airtable | Success writeback (Sent + Order/Reward IDs). |
| 12 | Update a Record (error handler on 8) | Airtable | Failed writeback. No auto-retry. |

---

## Connections

| Module | Connection |
|--------|------------|
| 2, 9, 10, 11, 12 | Existing Airtable connection placeholder (`4_14_2026_New_Shooting_APP`). Re-select in Make after import if needed. |
| 8 | Make **API key** credential only. Must send `Authorization: Bearer TEST_[Sandbox key]`. Never commit the key. Do **not** switch to No authentication. Do **not** put the key in a visible manual header or the JSON body. |

---

## How to refresh the Airtable field schema (Get a Record)

1. Open **Get Award Recipient** (module 9).
2. Re-select Base + **Award Recipients** table. Save.
3. Confirm mapping pills for:
   - Athlete Name - Display
   - Award - Display
   - Coach Feedback - Awards
   - Award Recipient Unique Key
   - Award Amount
   - Parent Email (if Make exposes it on Get a Record; Watch Records already has it)
4. Do **not** run the full scenario just to refresh schema.

**Coach Feedback - Awards** and **Award - Display** mapping pills come from module **9**.

---

## Filter — Approved Sandbox Award (on module 10)

| Condition | Value |
|-----------|--------|
| Send to Tremendous? | true (`9`) |
| Award Status | Approved (`9`) |
| Gift Card Needed? | `1` (`9`) |
| Parent Email | exists (`{{2.Parent Email[]}}`) |
| Award Amount | `{{first(9.Award Amount)}}` greater than 0 |
| Tremendous Environment | Sandbox (`9`) |
| Tremendous Order ID | empty (`9`) |
| Tremendous Reward ID | empty (`9`) |

Do **not** gate only on Recipient Email.

---

## Pre-send update (module 10)

| Field | Value |
|-------|--------|
| Award Status | `Sending` |
| Tremendous Delivery Status | `Pending` |
| Tremendous External ID | `AWARD\|{{9.Award Recipient Unique Key}}` |
| Tremendous Error Message | blank (`emptystring`) |

Award Status must already include options `Sending` and `Failed` in Airtable.

---

## HTTP body

### Preferred: Data structure (Make UI)

Switch Body input method to **Data structure** so Coach Feedback can contain line breaks, quotes, and apostrophes.

### Importable fallback: JSON string

The blueprint ships a single-line JSON string with **single** `\n` escapes (not `\\n`). Sources:

| Body field | Source |
|------------|--------|
| external_id | `AWARD\|{{9.Award Recipient Unique Key}}` |
| denomination | `{{first(9.Award Amount)}}` |
| message athlete name | `{{first(9.Athlete Name - Display)}}` |
| Award - Display | `{{9.Award - Display}}` |
| Coach Feedback - Awards | `{{9.Coach Feedback - Awards}}` |
| recipient.name | `{{first(9.Athlete Name - Display)}}` |
| recipient.email | `{{first(2.Parent Email)}}` |

**Required Data structure hierarchy (live Make HTTP may be Module 14):**

```
Reward
  Campaign ID
  Value
  Delivery
  Recipient
    Name
    Email
```

Recipient must sit **inside** Reward. Do not leave Recipient at the top level next to Reward.

Rules: singular `reward`; `delivery.method` = `EMAIL`; `delivery.meta.sender_name`; campaign `HYNKRMGH3QQR`; URL `https://testflight.tremendous.com/api/v2/orders`.

---

## Success update (module 11)

| Field | Value |
|-------|--------|
| Award Status | `Sent` (literal) |
| Tremendous Delivery Status | `{{capitalize(lower(8.data.order.rewards[1].delivery.status))}}` |
| Tremendous Order ID | `{{8.data.order.id}}` |
| Tremendous Reward ID | `{{8.data.order.rewards[1].id}}` |
| Tremendous Sent At | `{{now}}` |
| Tremendous Error Message | blank |
| Tremendous Response | `{{toString(8.data)}}` |

---

## Error route (module 12)

| Field | Value |
|-------|--------|
| Award Status | `Failed` |
| Tremendous Delivery Status | `Failed` |
| Tremendous Error Message | `{{ifempty(error.message; error.detail)}}` (error-handler token, not `8.error.message`) |
| Tremendous Response | `{{toString(error)}}` |

No automatic retry.

---

## Duplicate protection

- Filter blocks send when Order ID or Reward ID is populated.
- `external_id` is always `AWARD|{Award Recipient Unique Key}`.
- Limit = 1. Scenario stays **OFF**.

---

## Safe one-record test

**Sandbox one-record send: already validated (Mike 2026-08-19).** Keep this procedure for a later production-API live test. Until then the scenario stays **OFF**.

1. Keep scenario **OFF**.
2. One test row: Parent Email = the intended inbox, athlete display name set, Award Amount > 0, Order/Reward IDs empty, Send to Tremendous? checked last.
3. Confirm the API-key credential matches the approved environment (`TEST_` / testflight until production access exists).
4. Prefer Data structure body before Run once.
5. **Run once**, confirm one order + Airtable Sent.
6. Uncheck Send to Tremendous?; confirm no second order on another Run once.

Do not turn scheduling ON until that production-live pass is clean. Do not use production Tremendous credentials before approval.

---

## Import / live-scenario checklist

Sandbox send is **validated** (Mike 2026-08-19). Keep the scenario **OFF**. Production-live remains blocked on Tremendous production API approval plus a controlled live test.

- [x] v2-style mappings used for the sandbox send (Get a Record, parent/guardian email, filters, external ID, success/failure write-back)
- [ ] Production Tremendous API approved
- [ ] Controlled live test with production credentials
- [ ] Scenario still OFF until that live test is complete
- [ ] API-key credential stays in Make only (never commit)
