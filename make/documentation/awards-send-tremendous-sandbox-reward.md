# 127 - Awards - Send Tremendous Sandbox Reward (v1)

> **HISTORICAL — superseded by v2.** Preserve this file and the v1 blueprint as evidence of the first Make design. Do **not** treat this as the current implementation. Current state: [`docs/integrations/tremendous-award-fulfillment.md`](../../docs/integrations/tremendous-award-fulfillment.md). Current snapshot: [awards-send-tremendous-sandbox-reward-v2.md](./awards-send-tremendous-sandbox-reward-v2.md).
>
> v1 sent to **Recipient Email** and did not use Get a Record. The validated sandbox send used the later **v2-style** process (parent/guardian email + Get a Record). A sandbox reward **was** later sent; that send is not described by this v1 document.
>
> Do not commit an API key.

**Backlog:** C-028  
**Scenario:** `Integration Airtable, Tremendous`  
**Blueprint:** [../blueprints/awards-send-tremendous-sandbox-reward-v1.json](../blueprints/awards-send-tremendous-sandbox-reward-v1.json)  
**Airtable field plan:** [../../airtable/schema/current/C-028-award-recipients-tremendous-fields.md](../../airtable/schema/current/C-028-award-recipients-tremendous-fields.md)

Airtable is Production. Tremendous is **Sandbox HTTP** (`https://testflight.tremendous.com/api/v2/orders`).

The native Make Tremendous app has no environment / base-URL field. A `TEST_` key against that app returns 401. Do **not** use `tremendous:sendReward` / Send an Email Reward for this test.

Keep the live Make scenario **OFF**. Do not put the API key in GitHub.

After the first complete challenge and award cycle, review whether to keep Make.com or move this integration to Vercel. Do not migrate now.

---

## 1. Module order

| Make id | Module | App | What it does |
|---------|--------|-----|----------------|
| 2 | Watch Records | Airtable | Limit 1. Switch the view to `AWARDS - Tremendous Ready` before any later run. |
| 7 | Update a Record | Airtable | Filter **Approved sandbox awards only**, then mark Sending and write `Tremendous External ID`. |
| 3 | Make a request | HTTP | `POST https://testflight.tremendous.com/api/v2/orders` |
| 4 | Update a Record | Airtable | Success writeback. |
| 6 | Update a Record (error handler on 3) | Airtable | Failed writeback. No auto-retry. |

No native Tremendous module. No bulk-send module.

---

## 2. Connection required for each module

| Module | Connection |
|--------|------------|
| 2, 7, 4, 6 | Airtable `4_14_2026_New_Shooting_APP` (Production base `appn84sqPw03zEbTT`) |
| 3 | **None.** HTTP Make a request. No Tremendous app connection. |

---

## 3. Fields to select / paste in Make after import

Do this in Make. Do not paste secrets into the repo.

**Module 3 — HTTP Make a request**

| Setting | Value |
|---------|--------|
| URL | `https://testflight.tremendous.com/api/v2/orders` |
| Method | POST |
| Header `Authorization` | `Bearer ` then paste the Sandbox `TEST_` key in Make only |
| Header `Content-Type` | `application/json` |
| Body type | Raw |
| Content type | JSON |
| Parse response | Yes |
| Evaluate all states as errors | Yes (so 4xx/5xx go to module 6) |

In the JSON body, paste your sandbox **campaign_id** into `"campaign_id": ""`. Leave funding source as `"BALANCE"`.

If `{{first(2.\`Award Amount\`)}}` does not resolve to a number, remap denomination to the first Award Amount array item.

If the parsed success bundle does not use `3.order.id`, remap Order ID / Reward ID / delivery status from the HTTP output inspector. Do not run the module to discover this; open the module and check the expected JSON shape:

```json
{
  "order": {
    "id": "…",
    "rewards": [
      {
        "id": "…",
        "delivery": { "status": "PENDING" }
      }
    ]
  }
}
```

**Do not** point this URL at `https://api.tremendous.com`.

**Watch Records (module 2)** currently uses Grid view and trigger field Award Status Sort. Before any later run, change:

- View → `AWARDS - Tremendous Ready`
- Trigger field → `Last Modified` (create that field in Airtable if it is still missing)

**Award Status** must include options `Sending` and `Failed` before writeback can save those values.

---

## 4. Fields that must be tested with your sandbox email

| Field | Test value |
|-------|------------|
| Recipient Email | Your sandbox inbox |
| Recipient Name | Your tester name |
| Tremendous Test Record? | Checked |
| Tremendous Environment | Sandbox |
| Send to Tremendous? | Checked last |

Do not use a parent email.

---

## 5. One-record test procedure

Leave the scenario **OFF**. Do not run until you are ready for the sandbox send. This package only builds the HTTP module.

When you later test, still run **once** on one Tremendous Test Record row. After a successful sandbox send, uncheck Send to Tremendous? and confirm a second run does not create a second order.

---

## 6. Duplicate-send checklist

- [ ] Filter requires blank Tremendous Order ID and Tremendous Reward ID.
- [ ] HTTP body `external_id` is `AWARD|{Award Recipient Unique Key}`, never a Make execution number.
- [ ] Pre-send update (module 7) runs before HTTP.
- [ ] Success writes Order ID and Reward ID.
- [ ] HTTP errors go to module 6 (Failed) with no auto-retry.
- [ ] Limit = 1. No bulk module.
- [ ] Authorization header is Sandbox `TEST_` only, stored in Make, not in git.
- [ ] URL is testflight, not api.tremendous.com.

---

## 7. Make vs Vercel later

Keep Make.com for this first complete challenge and award cycle. After that, review Make vs Vercel. Do not migrate now.
