# Promotion steps — C-028 Tremendous sandbox award send

**Status:** Sandbox send **validated** (Mike 2026-08-19). Production Tremendous API **pending approval**. Make scenario **OFF**. v2 is the current implementation snapshot, not production-live.  
**Backlog:** C-028  
**Airtable:** Production `appn84sqPw03zEbTT` / Award Recipients `tblTyQXl8aEP93ubK`  
**Tremendous:** Sandbox only until production API access is approved  
**Current state:** [`docs/integrations/tremendous-award-fulfillment.md`](../integrations/tremendous-award-fulfillment.md)

This is not a DEV→prod copy. Fields were added on Production because that is the live operating base.

The 2026-08-18 checklist below is retained as historical setup evidence. It is not a claim that every unchecked UI box is still incomplete. The sandbox send used the later v2-style process.

---

## What changed

| Artifact | Location | Notes |
|----------|----------|--------|
| Award Recipients fields | Production table | New Tremendous + recipient fields. Existing fields reused. |
| Field plan | `airtable/schema/current/C-028-award-recipients-tremendous-fields.md` | Includes Ready to Send? formula |
| Make blueprint (historical) | `make/blueprints/awards-send-tremendous-sandbox-reward-v1.json` | First design. Preserve. Do not use as current. |
| Make blueprint (current snapshot) | `make/blueprints/awards-send-tremendous-sandbox-reward-v2.json` | v2-style snapshot. Scenario stays OFF. Not production-live. |
| Make docs | `make/documentation/awards-send-tremendous-sandbox-reward-v2.md` | Current snapshot notes; v1 doc is historical |

---

## Remaining Airtable UI steps (Production)

Historical 2026-08-18 setup list. Not re-polled. The sandbox send later succeeded, so the send-path pieces required for that test were in place. Unchecked boxes here are **not** current blockers unless Mike reports a missing field.

| # | Action | 2026-08-18 list |
|---|--------|------|
| 1 | Award Status: add options `Sending` and `Failed`. Keep Pending, Approved, Sent, Delivered, Cancelled, In Amazon Cart. | recorded as then-required |
| 2 | Tremendous Environment default = Sandbox | recorded as then-required |
| 3 | Tremendous Delivery Status default = Not Sent | recorded as then-required |
| 4 | Add Last modified time field named `Last Modified` | recorded as then-required |
| 5 | Create view `AWARDS - Tremendous Ready` with the filters in the field plan | recorded as then-required |

---

## Make steps

| # | Action | Done |
|---|--------|------|
| 1 | Use v2-style scenario (Get a Record, parent/guardian email, safety filters). Keep v1 as historical. | [x] sandbox path |
| 2 | HTTP to `https://testflight.tremendous.com/api/v2/orders` only (not api.tremendous.com) | [x] sandbox path |
| 3 | API key stays in Make only. Never commit the key. | [x] |
| 4 | Scenario OFF, limit 1, no auto-retry, no bulk module | [x] remains OFF |
| 5 | Sandbox one-record send + reward email received | [x] Mike 2026-08-19 |
| 6 | Production Tremendous API approval | [ ] pending |
| 7 | Controlled live test after production access | [ ] blocked on 6 |

---

## Smoke test

| Check | Result |
|-------|--------|
| Sandbox reward send | **Pass** — sandbox reward sent; reward email received (Mike 2026-08-19) |
| Destination | Parent/guardian email (v2-style). Not the v1 Recipient Email design. |
| Second send of the same row | Duplicate protection remains required; do not re-enable scheduling |
| Production send | **Not run.** Blocked on Tremendous production API approval |

---

## Risk / rollback

- New fields are additive. Existing Amazon-cart / Sent rows are unchanged until someone checks **Send to Tremendous?**.
- Rollback: uncheck **Send to Tremendous?**, keep the scenario OFF, do not delete fields.
- If a sandbox send is wrong, cancel in Tremendous Sandbox and leave Award Status = Failed until reviewed.
- Do not use the native Make Tremendous app. HTTP goes to testflight only.

---

## Later review

After the first complete challenge and award cycle, decide whether to keep Make.com or move the integration to Vercel. Do not migrate now.
