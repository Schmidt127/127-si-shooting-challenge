# Tremendous award fulfillment — current state

**Backlog:** C-028  
**Status:** Current (Mike evidence 2026-08-19)  
**Airtable:** Production Award Recipients (`appn84sqPw03zEbTT` / `tblTyQXl8aEP93ubK`)  
**Tremendous:** Sandbox HTTP only (`https://testflight.tremendous.com/api/v2/orders`)

This is the current-state document for Tremendous gift-card send. Older Make notes remain as evidence. They must not override this file.

Make may still run **non-email** HTTP (this sandbox award API). That is not Shooting Challenge parent-email handling. Gift-card mail is sent by **Tremendous**, not Resend.

---

## Current truth (2026-08-19)

| Item | State |
|------|--------|
| Sandbox send | **Validated.** A sandbox reward was successfully sent. The reward email was received during testing. |
| Process used | Later **v2-style**: Airtable Get a Record, parent/guardian email, production-style safety filters, external ID, success write-back, and failure handling |
| Production Tremendous API | **Pending** Tremendous approval. Do not point Make at `https://api.tremendous.com`. |
| Make scenario | **OFF.** Do not schedule it. Do not turn it on until production API access is approved **and** a controlled live test succeeds. |
| v1 blueprint | **Historical evidence.** Preserve. Do not use as the current implementation. |
| v2 blueprint | **Current implementation snapshot** (dated 2026-08-18 export). Not production-live. |
| API keys | Stay in Make only. **Never commit** a live or sandbox key. |

---

## Authority

| Concern | Authority |
|---------|-----------|
| Current Tremendous status | This file (Mike-dated evidence) |
| v2 implementation snapshot | [`make/blueprints/awards-send-tremendous-sandbox-reward-v2.json`](../../make/blueprints/awards-send-tremendous-sandbox-reward-v2.json) and [`make/documentation/awards-send-tremendous-sandbox-reward-v2.md`](../../make/documentation/awards-send-tremendous-sandbox-reward-v2.md) |
| v1 historical blueprint | [`make/blueprints/awards-send-tremendous-sandbox-reward-v1.json`](../../make/blueprints/awards-send-tremendous-sandbox-reward-v1.json) and [`make/documentation/awards-send-tremendous-sandbox-reward.md`](../../make/documentation/awards-send-tremendous-sandbox-reward.md) |
| Award Recipients fields | [`airtable/schema/current/C-028-award-recipients-tremendous-fields.md`](../../airtable/schema/current/C-028-award-recipients-tremendous-fields.md) |
| Operator checklist | [`docs/deploy-checklists/C-028-tremendous-sandbox-schema-promotion.md`](../deploy-checklists/C-028-tremendous-sandbox-schema-promotion.md) |

---

## Validated sandbox behavior (v2-style)

Do **not** use the native Make Tremendous app. HTTP POST goes to Tremendous **testflight** only.

| Control | v2-style behavior |
|---------|-------------------|
| Email destination | Parent/guardian email (`Parent Email`) |
| Reward name / greeting | Athlete display name |
| Get a Record | Reloads the Award Recipients row so newer field mappings are available |
| Safety filter | Approved sandbox row, gift card needed, parent email present, amount greater than 0, environment Sandbox, Order ID and Reward ID empty, Send to Tremendous? checked |
| Duplicate protection | `external_id` = `AWARD|{Award Recipient Unique Key}`; filter blocks send when Order ID or Reward ID is already populated; scenario limit 1 |
| Success write-back | Award Status Sent plus Tremendous order/reward IDs and delivery status |
| Failure handling | Failed write-back; no automatic retry |

The Airtable **Ready to Send?** formula still uses **Recipient Email** as documented in the field plan. That formula is a schema snapshot. The validated Make send used **Parent Email**. Do not silently change the formula.

---

## Not proven

- Tremendous **production** API access
- A production-live Make scenario
- A live (non-sandbox) gift-card send to a family
- That the checked-in v2 JSON is bit-for-bit identical to the Make scenario that sent the sandbox reward (it is the current repository snapshot of that design)

---

## Next gate

1. Tremendous approves production API access.  
2. Keep the scenario **OFF**.  
3. Controlled live test with production credentials.  
4. Only then may docs call the scenario production-live.

Until that gate, keep calling v2 an **implementation snapshot**.
