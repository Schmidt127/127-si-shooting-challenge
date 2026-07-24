# Weekly Athlete Summary email — final architecture (verified PROD)

**Verified:** 2026-07-24  
**Base:** PROD `appn84sqPw03zEbTT`  
**Schmidt Enrollment:** `recgP9qZYjAhE7NXm`  
**Authority:** Controlled end-to-end proof (empty-week `send_short`)

---

## Final flow

```text
118 → 072 → 119 → 074 → Make.com → Gmail → Make.com writeback
```

| Step | Owner | Does | Does not |
|------|-------|------|----------|
| **118** | Schedule (Sun 5:00 AM Denver) | Find Week; create/find WAS; arm `Build Weekly Email Now?` | Build HTML; call Make; send Gmail |
| **072** | WAS trigger (`Build Weekly Email Now?`) | Build recipients/subject/HTML/text/payload; set Ready?; enforce `emptyWeekPolicy` | Call Make; send Gmail |
| **119** | Schedule (Sun 10:00 AM Denver) | Find Ready && !Sent packages; check `Send to Make?` | Call Make; send Gmail |
| **074** | WAS trigger (`Send to Make?` + Ready package) | POST package to existing Make webhook; clear `Send to Make?` on success | Mark Sent?; write final sent timestamp |
| **Make** | Scenario `Weekly Athlete Summary - Bulk Email - May 18` | Route Test/Live; send Gmail; Live writeback Sent? | — |

**No additional Airtable automation or Make scenario was created for this path.**

---

## Verified Schmidt empty-week proof (2026-07-24)

| Item | Value |
|------|--------|
| Week End Key | `2026-07-18` |
| Week record ID | `recWeVrSabnsYaHc2` |
| WAS record ID | `recu4X8m6rWlEWoNy` |
| Enrollment ID | `recgP9qZYjAhE7NXm` |
| `emptyWeekPolicy` | `send_short` |
| `weekIsEmpty` | `true` |
| `packageKind` | `short_no_activity` |
| `sendMode` | `test` |
| 072 action | `built_short_empty_week` |
| 119 action | `send_armed` (`armed=1`, `skipped=0`, `notReady=0`, `errors=0`) |
| Delivered subject | `127 Sports Intensity Weekly Check-In \| Testing Schmidt \| Testing Week` |
| Test Gmail | `mschmidt@fairfield.k12.mt.us` |

---

## Automations (current)

### 118 — Schedule Weekly Summary Email Build

| Field | Value |
|-------|--------|
| Name | `118 - Email - Schedule Weekly Summary Email Build` |
| Repo version | **v1.5** |
| Schedule | Sunday **5:00 AM** America/Denver |
| PROD schedule state | **ON** — Sunday 5:00 AM America/Denver (**verified_prod** 2026-07-24; older “OFF until auth” notes are historical) |
| Season inputs | `dryRun=false`, `sendMode=Live`, `includeSchmidt=false`, `emptyWeekPolicy=send_short` |
| Script defaults (safe paste) | `dryRun=true`, `sendMode=Test` — must override for season Sundays |

### 072 — Build Weekly Summary Email Package

| Field | Value |
|-------|--------|
| Name | `072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package` |
| Repo / PROD version | **v4.0** |
| Required inputs | `recordId`, `emptyWeekPolicy` |
| Controlled test | `allowSchmidtInput=true` |
| Normal safety | `allowSchmidtInput=false` |
| Default policy | `send_short` |

| Policy | Empty week | Non-empty week |
|--------|------------|----------------|
| `send_short` | Concise Weekly Check-In; send-ready | Full summary |
| `send_normal` | Full zero-activity summary | Full summary |
| `suppress` | Not send-ready | Full summary |

**072 owns empty-week policy enforcement.**

### 119 — Schedule Weekly Summary Email Send

| Field | Value |
|-------|--------|
| Name | `119 - Email - Schedule Weekly Summary Email Send` |
| Repo version | **v1.4** |
| Schedule | Sunday **10:00 AM** America/Denver |
| PROD schedule state | **ON** — Sunday 10:00 AM America/Denver (**verified_prod** 2026-07-24; older “OFF until auth” notes are historical) |
| Defaults | Confirm live inputs in UI; `emptyWeekPolicy=send_short` |

**119 only arms `Send to Make?`. It does not post the webhook.**

### 074 — Send Weekly Summary Email Package to Make

| Field | Value |
|-------|--------|
| Name | `074 - Email, Notifications, and External Handoffs - Send Weekly Summary Email Package to Make` |
| Repo SoT | **v2.1** (eventId + never clears `Weekly Email Sent?`) |
| Trigger | WAS matches: Ready? checked, Sent? unchecked, Send to Make? checked, Subject/Recipients/HTML not empty |
| Required inputs | `recordId`, `makeWebhookUrl` |
| Optional | `sendMode` / `sendModeInput`, `testRecipientEmail`, `replyTo` |
| Controlled test only | `sendMode=Test` + `testRecipientEmail=mschmidt@fairfield.k12.mt.us` |
| PROD state | **ON** (automatic handoff when conditions match) |

**074 posts the webhook. Make owns final Gmail-success writeback (`Weekly Email Sent?`, status, timestamp) on the Live branch.**

#### Production sendMode rule (verified 2026-07-24)

A fixed Airtable automation input **`sendMode = Test`** on 074 forced every handoff onto Make’s Test branch (email delivered, **no** Sent? writeback).

After changing 074 to **`sendMode = Live`**, Make used the Live branch and completed writeback:

- `Weekly Email Sent?` = checked  
- `Make Send Status` = Sent  
- sent timestamp populated  
- email delivered  

**PROD 074 must not be forced to Test.** Use one of:

1. **`sendMode` / `sendModeInput` = Live**, or  
2. **Leave the input blank** and inherit from the WAS `sendMode` field (ensure WAS is Live for production parents).

Resolution order in script: input → WAS.`sendMode` → payloadJson.`sendMode` → default `test`.

---

## Make.com (existing WAS email sender)

| Item | Value |
|------|--------|
| Scenario | **`Weekly Athlete Summary - Bulk Email - May 18`** |
| Webhook | **`Weekly Athlete Summary - Email - May 18`** |
| State | **ON** |

**Not the email sender:** Make scenario `Weekly Athlete Summary Updated` (creates/updates WAS calculation records).

### Payload fields (074 → Make)

`sendMode`, `weeklySummaryRecordId`, `subject`, `html`, `text`, `csvemail`, `payloadJson`, `weekLabel`, `revision` (plus related diagnostics as implemented).

### Routing

| Branch | Condition | Behavior |
|--------|-----------|----------|
| **Test** | `sendMode=test` | Sends only to `mschmidt@fairfield.k12.mt.us`; webhook subject + Raw HTML. **No Airtable Sent? writeback** (by design of this Make branch). |
| **Live** | `sendMode=live` | Sends to split `csvemail`; CC `mschmidt@fairfield.k12.mt.us`; Raw HTML; after Gmail success updates WAS: `Weekly Email Sent?=true`, `Make Send Status=Sent`, sent timestamp. **Verified PASS 2026-07-24.** |

---

## 2026–2027 Week records

Week unique identifier = Config primary value + Week Name (year derived from `Config - Lnk`, not typed):

`2026-2027|Week 0` … `2026-2027|Week 9`, `2026-2027|Post-Challenge`

---

## Current verified PROD safety state (2026-07-24)

| Component | Setting |
|-----------|---------|
| **072** | **ON**; prefer `allowSchmidtInput=false` for season traffic |
| **118** | **ON** — Sunday 5:00 AM America/Denver |
| **119** | **ON** — Sunday 10:00 AM America/Denver |
| **074** | **ON**; **`sendMode=Live`** (or blank + WAS Live) — **never fixed Test in PROD** |
| Make WAS email scenario | **ON** (`Weekly Athlete Summary - Bulk Email - May 18`) |

### Season input posture (required for parent Live Sundays)

| Automation | Input | Season value | Why |
|------------|-------|--------------|-----|
| **118** | `dryRun` | **`false`** | Default `true` only counts — no WAS create/arm |
| **118** | `sendMode` | **`Live`** | **v1.5** writes WAS `sendMode` from this input (v1.4 hardcoded Test + refused Live+!dryRun) |
| **118** | `includeSchmidt` | **`false`** | Never combine with Live |
| **119** | `dryRun` | **`false`** | Default `true` only counts — no Send arm |
| **074** | `sendMode` / `sendModeInput` | **`Live`** (or blank if WAS Live) | Fixed Test forces Make Test branch (no Sent? writeback) |

> Historical note: Pre-activation docs recommended keeping 118/119 **OFF**. That guidance is **superseded** by verified PROD activation.

---

## Related docs

- Paste/test runbook: [`EMPTY-WEEK-072-PROD-PASTE-RUNBOOK.md`](./EMPTY-WEEK-072-PROD-PASTE-RUNBOOK.md)
- Install runbook: [`WEEKLY-EMAIL-PROD-INSTALL-RUNBOOK.md`](./WEEKLY-EMAIL-PROD-INSTALL-RUNBOOK.md)
- Empty-week decision: [`EMPTY-WEEK-EMAIL-DECISION.md`](./EMPTY-WEEK-EMAIL-DECISION.md)
- Activation checklist: [`../../deploy-checklists/C-011-weekly-email-schedule-activation-checklist.md`](../../deploy-checklists/C-011-weekly-email-schedule-activation-checklist.md)
